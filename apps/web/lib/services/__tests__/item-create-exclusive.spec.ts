import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import Module from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test';

import type { ItemGitService as ItemGitServiceType } from '@/lib/services/item-git.service';
import type { LocationIndexService } from '@/lib/services/location/location-index.service';
import type { ItemData } from '@/lib/types/item';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * createItem (single create: the client submit form and POST /api/admin/items) reads every item,
 * checks the slug, then writes. A CSV import or an admin create that writes the same slug while
 * createItem is still reading used to be replaced: createItem wrote with 'w', both requests
 * reported success, and the first item, submitter included, was gone. createItem now writes with
 * 'wx' (as the import path does since T-2527) and turns EEXIST into the "already exists" error,
 * which both routes answer with 409. See T-2609.
 *
 * The real ItemGitService writes into a temporary content directory; git commit/push is replaced
 * by a counter. The routes import `next/server` and `server-only` and cannot be loaded under
 * `tsx --test`, so the 409 wiring is checked in their source.
 *
 * createItem also syncs the new item's location index row when the content config turns location
 * on (`settings.location.enabled` in process.cwd()/.content). That sync reaches the database: every
 * location index query starts with the tenant lookup. With a developer's location-on content folder
 * this spec waited seconds on that lookup, which loads lib/auth, and the process then never exited,
 * so `test:unit` hung after every test had passed (T-2854). The spec now runs in a content folder
 * of its own with location on, so its result no longer depends on the developer's one. The real
 * location index and the tenant lookup are spies: a test fails if createItem reaches either.
 */
let tenantLookups = 0;
const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (request === 'server-only') return {};
	if (request === '@/lib/auth/tenant') {
		return {
			getTenantId: async () => {
				tenantLookups++;
				return null;
			}
		};
	}
	return originalLoad.call(this, request, ...rest);
};
const { ItemGitService } = require('../item-git.service') as { ItemGitService: typeof ItemGitServiceType };
const { getLocationIndexService } = require('../location/location-index.service') as {
	getLocationIndexService: () => LocationIndexService;
};
loader._load = originalLoad;

const FIRST_YAML = [
	'name: Foo',
	'description: The item another request created first.',
	'source_url: https://first.example.com',
	'category: [tools]',
	'status: pending',
	'submitted_by: first-user',
	''
].join('\n');

let dir: string;
let git: ItemGitServiceType;
let commits: number;
let contentRoot: string;
let previousCwd: string;
/** Location index syncs createItem asked for, through the stub. */
let locationSyncs: string[];
/** Calls that reached the real location index (the database behind it). */
const locationIndexCalls: string[] = [];

function itemFile(slug: string) {
	return path.join(dir, 'data', slug, `${slug}.yml`);
}

function writeFirstItem(slug: string) {
	fs.mkdirSync(path.join(dir, 'data', slug), { recursive: true });
	fs.writeFileSync(itemFile(slug), FIRST_YAML);
}

function createRequest(slug: string, id = slug) {
	return {
		id,
		slug,
		name: 'Foo',
		description: 'The item the later request tries to create.',
		source_url: 'https://second.example.com',
		category: ['tools'],
		tags: [],
		status: 'pending' as const,
		submitted_by: 'second-user'
	};
}

before(() => {
	// Location on, as a developer's content folder for the /map checks has it
	contentRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'item-create-exclusive-content-'));
	fs.mkdirSync(path.join(contentRoot, '.content', '.works'), { recursive: true });
	fs.writeFileSync(
		path.join(contentRoot, '.content', '.works', 'works.yml'),
		['settings:', '  location:', '    enabled: true', ''].join('\n')
	);
	previousCwd = process.cwd();
	process.chdir(contentRoot);

	const locationIndex = getLocationIndexService();
	mock.method(locationIndex, 'indexItem', async (item: ItemData) => {
		locationIndexCalls.push(`indexItem ${item.slug}`);
		return { slug: item.slug, success: false, geocoded: false };
	});
	mock.method(locationIndex, 'removeFromIndex', async (slug: string) => {
		locationIndexCalls.push(`removeFromIndex ${slug}`);
		return false;
	});
});

after(() => {
	mock.restoreAll();
	process.chdir(previousCwd);
	fs.rmSync(contentRoot, { recursive: true, force: true });
});

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'item-create-exclusive-'));
	fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
	git = new ItemGitService({ owner: 'o', repo: 'r', token: '', branch: 'main', dataDir: dir, itemsDir: 'data' });
	commits = 0;
	(git as unknown as { commitAndPush: () => Promise<void> }).commitAndPush = async () => {
		commits++;
	};
	// The location index sync is stubbed the same way: this spec checks the YAML write, not the index
	locationSyncs = [];
	const sync = git as unknown as {
		indexLocationAsync: (item: ItemData) => void;
		removeLocationIndexAsync: (slug: string) => void;
	};
	sync.indexLocationAsync = (item) => {
		locationSyncs.push(`index ${item.slug}`);
	};
	sync.removeLocationIndexAsync = (slug) => {
		locationSyncs.push(`remove ${slug}`);
	};
	locationIndexCalls.length = 0;
	tenantLookups = 0;
});

afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

describe('single item create never replaces an item file written after its read (T-2609)', () => {
	it('rejects with the slug error and leaves the file another request wrote after the read alone', async () => {
		const readItems = git.readItems.bind(git);
		git.readItems = async (includeDeleted?: boolean) => {
			const items = await readItems(includeDeleted);
			// An import or an admin create writes the same slug while createItem is between its read and its write.
			writeFirstItem('foo');
			return items;
		};

		await assert.rejects(git.createItem(createRequest('foo')), {
			name: 'DuplicateItemError',
			message: "Item with slug 'foo' already exists"
		});

		assert.equal(fs.readFileSync(itemFile('foo'), 'utf8'), FIRST_YAML);
		assert.equal(commits, 0);
	});

	it('rejects with DuplicateItemError when the read finds the item (client shape: id = slug)', async () => {
		writeFirstItem('foo');

		await assert.rejects(git.createItem(createRequest('foo')), {
			name: 'DuplicateItemError',
			message: "Item with ID 'foo' already exists"
		});

		assert.equal(fs.readFileSync(itemFile('foo'), 'utf8'), FIRST_YAML);
		assert.equal(commits, 0);
	});

	it('rejects with DuplicateItemError when the read finds the slug under another id (admin shape)', async () => {
		writeFirstItem('foo');

		await assert.rejects(git.createItem(createRequest('foo', 'item_foo')), {
			name: 'DuplicateItemError',
			message: "Item with slug 'foo' already exists"
		});

		assert.equal(fs.readFileSync(itemFile('foo'), 'utf8'), FIRST_YAML);
		assert.equal(commits, 0);
	});

	it('still writes and commits a new slug', async () => {
		const item = await git.createItem(createRequest('fresh'));

		assert.equal(item.slug, 'fresh');
		assert.match(fs.readFileSync(itemFile('fresh'), 'utf8'), /submitted_by: second-user/);
		assert.equal(commits, 1);
	});
});

describe('createItem stays off the location index and the database when location is on (T-2854)', () => {
	it('creates a located item without reaching the real location index or the tenant lookup', async () => {
		assert.equal(getLocationIndexService().isEnabled(), true, 'location is off, so this test proves nothing');

		const item = await git.createItem({
			...createRequest('located'),
			status: 'approved',
			location: { city: 'Testville', country: 'Testland', latitude: 48.85, longitude: 2.35 }
		});

		assert.equal(item.slug, 'located');
		assert.equal(commits, 1);
		assert.deepEqual(locationIndexCalls, [], 'createItem called the real location index');
		assert.equal(tenantLookups, 0, 'createItem looked the tenant up in the database');
		assert.deepEqual(locationSyncs, ['index located']);
	});
});

describe('POST item routes answer 409 for DuplicateItemError (T-2609)', () => {
	const source = (relative: string) =>
		fs.readFileSync(path.join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

	for (const [label, relative, create, fallback] of [
		[
			'POST /api/admin/items',
			'../../../app/api/admin/items/route.ts',
			'const item = await itemRepository.create({',
			"return safeErrorResponse(error, 'Failed to create item');"
		],
		[
			'POST /api/client/items',
			'../../../app/api/client/items/route.ts',
			'await clientItemRepository.createAsClient(userId, createData);',
			"return serverErrorResponse(error, 'Failed to create item');"
		]
	] as const) {
		it(label, () => {
			const route = source(relative);
			const created = route.indexOf(create);
			const caught = route.indexOf('if (error instanceof DuplicateItemError) {', created);
			const conflict = route.indexOf('409', caught);
			const fallen = route.indexOf(fallback, created);
			assert.ok(created > 0, `${label} does not create the item`);
			assert.ok(caught > created, `${label} does not catch DuplicateItemError`);
			assert.ok(conflict > caught && conflict < fallen, `${label} does not answer DuplicateItemError with 409`);
		});
	}
});
