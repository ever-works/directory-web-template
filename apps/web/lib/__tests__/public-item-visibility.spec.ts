import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import Module from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { after, before, describe, it } from 'node:test';

import type * as ContentModule from '../content';
import { isPubliclyVisibleItem } from '../item-visibility';
import type { ItemGitService as ItemGitServiceType } from '../services/item-git.service';
import { isLocationIndexable } from '../utils/location-indexable';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `fetchItems` and `fetchItem` (lib/content.ts) feed every public surface: the home listing,
 * /map, the item page, category, tag and collection pages, similar items, the sitemap, the
 * feeds, items.json and llms-full.txt. They copied every item YAML in the content data folder,
 * and client submissions (`pending`), admin drafts, rejected items and soft-deleted items
 * (`deleted_at`) are written to that same folder, so an anonymous visitor saw them all. Only an
 * approved item, or one with no status (as ItemGitService reads it), is public now, and the
 * category, tag and collection counts hold public items only. See T-2846.
 *
 * The location index (spec 063, `isLocationIndexable`) reads the same YAML through ItemGitService,
 * which turns a missing status into `approved`; the last test checks that both keep the same items.
 *
 * The real content module and ItemGitService read a temporary content folder
 * (process.cwd()/.content); `server-only` is stubbed so they load under `tsx --test`.
 */
const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (request === 'server-only') return {};
	return originalLoad.call(this, request, ...rest);
};
const content = require('../content') as typeof ContentModule;
const { ItemGitService } = require('../services/item-git.service') as { ItemGitService: typeof ItemGitServiceType };
loader._load = originalLoad;

const PUBLIC = ['approved-item', 'blank-status-item', 'no-status-item'];
const HIDDEN = ['draft-item', 'pending-item', 'rejected-item', 'deleted-item', 'unknown-status-item'];

/** Extra YAML lines per item: everything else (category, tags, collection) is the same for all. */
const ITEMS: Record<string, string[]> = {
	'approved-item': ['status: approved'],
	'no-status-item': [],
	'blank-status-item': ["status: ''"],
	'draft-item': ['status: draft'],
	'pending-item': ['status: pending', 'submitted_by: client-user'],
	'rejected-item': ['status: rejected', 'review_notes: Not a fit'],
	'deleted-item': ['status: approved', "deleted_at: '2026-11-20 10:00'"],
	'unknown-status-item': ['status: archived']
};

let root: string;
let previousCwd: string;
let previousDataRepository: string | undefined;

function write(file: string, lines: string[]) {
	const target = path.join(root, '.content', file);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, `${lines.join('\n')}\n`);
}

function writeItem(slug: string, extra: string[]) {
	const hidden = HIDDEN.includes(slug);
	write(`data/${slug}/${slug}.yml`, [
		`name: ${slug}`,
		`description: The ${slug} fixture`,
		`source_url: https://example.com/${slug}`,
		'category:',
		'  - tools',
		// A category and a tag that only hidden items use: they must not appear on the public site
		...(hidden ? ['  - hidden-only-category'] : []),
		'tags:',
		'  - shared',
		...(hidden ? ['  - hidden-only-tag'] : []),
		'collections:',
		'  - picks',
		'location:',
		'  city: Testville',
		'  country: Testland',
		'  latitude: 48.85',
		'  longitude: 2.35',
		"updated_at: '2026-11-01 10:00'",
		...extra
	]);
}

before(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'public-item-visibility-'));
	write('.works/works.yml', ['company_name: Test', 'item_name: Item', 'items_name: Items']);
	write('categories.yml', ['- id: tools', '  name: Tools']);
	write('tags.yml', ['- id: shared', '  name: Shared']);
	// As the admin "assign items" action writes it: every slug it was given, unpublished ones
	// included, with their count. `hidden-picks` holds only unpublished items.
	write('collections.yml', [
		'- id: picks',
		'  name: Picks',
		'  item_count: 3',
		'  items: [approved-item, draft-item, deleted-item]',
		'- id: hidden-picks',
		'  name: Hidden picks',
		'  item_count: 2',
		'  items: [pending-item, rejected-item]'
	]);
	for (const [slug, extra] of Object.entries(ITEMS)) writeItem(slug, extra);
	// A translation cannot publish an item: the base YAML decides
	write('data/draft-item/draft-item.fr.yml', ['name: Brouillon', 'status: approved']);

	previousCwd = process.cwd();
	previousDataRepository = process.env.DATA_REPOSITORY;
	// No repository to sync: the temporary folder is the whole content
	delete process.env.DATA_REPOSITORY;
	process.chdir(root);
});

after(() => {
	process.chdir(previousCwd);
	if (previousDataRepository !== undefined) process.env.DATA_REPOSITORY = previousDataRepository;
	fs.rmSync(root, { recursive: true, force: true });
});

describe('isPubliclyVisibleItem', () => {
	it('accepts an approved item and an item with no status', () => {
		assert.equal(isPubliclyVisibleItem({ status: 'approved' }), true);
		assert.equal(isPubliclyVisibleItem({}), true);
		assert.equal(isPubliclyVisibleItem({ status: null }), true);
		assert.equal(isPubliclyVisibleItem({ status: '' }), true);
	});

	it('rejects draft, pending, rejected and unknown statuses', () => {
		for (const status of ['draft', 'pending', 'rejected', 'archived', 'Approved', true, 1]) {
			assert.equal(isPubliclyVisibleItem({ status }), false, String(status));
		}
	});

	it('rejects a soft-deleted item, whatever its status', () => {
		assert.equal(isPubliclyVisibleItem({ status: 'approved', deleted_at: '2026-11-20 10:00' }), false);
		assert.equal(isPubliclyVisibleItem({ deleted_at: '2026-11-20T10:00:00.000Z' }), false);
		assert.equal(isPubliclyVisibleItem({ status: 'approved', deleted_at: null }), true);
	});
});

describe('fetchItems lists public items only', () => {
	for (const lang of ['en', 'fr']) {
		it(`returns the approved and no-status items, with matching counts (${lang})`, async () => {
			const result = await content.fetchItems({ lang });

			assert.deepEqual(result.items.map((item) => item.slug).sort(), PUBLIC);
			assert.equal(result.total, PUBLIC.length);

			assert.deepEqual(
				result.categories.map((category) => [category.id, category.count]),
				[['tools', PUBLIC.length]]
			);
			assert.deepEqual(
				result.tags.map((tag) => [tag.id, tag.count]),
				[['shared', PUBLIC.length]]
			);
			assert.deepEqual(
				result.collections.map((collection) => [
					collection.id,
					collection.item_count,
					[...(collection.items ?? [])].sort()
				]),
				[
					['picks', PUBLIC.length, PUBLIC],
					['hidden-picks', 0, []]
				]
			);
			// An item's own collections are the same objects: no hidden slug through them either
			for (const item of result.items) {
				for (const collection of item.collections ?? []) {
					if (typeof collection === 'string') continue;
					assert.deepEqual([...(collection.items ?? [])].sort(), PUBLIC, `${item.slug} collections`);
				}
			}
		});
	}

	it('keeps hidden items out of the category and tag filters', async () => {
		assert.deepEqual((await content.fetchByCategory('tools')).items.map((item) => item.slug).sort(), PUBLIC);
		assert.deepEqual((await content.fetchByTag('shared')).items.map((item) => item.slug).sort(), PUBLIC);
		assert.deepEqual((await content.fetchByCategory('hidden-only-category')).items, []);
		assert.deepEqual((await content.fetchByTag('hidden-only-tag')).items, []);
	});
});

describe('fetchItem answers only for public items', () => {
	for (const slug of PUBLIC) {
		it(`returns ${slug}`, async () => {
			const result = await content.fetchItem(slug);
			assert.equal(result?.meta.slug, slug);
		});
	}

	for (const slug of HIDDEN) {
		it(`returns null for ${slug}`, async () => {
			assert.equal(await content.fetchItem(slug), null);
			assert.equal(await content.fetchItem(slug, { lang: 'fr' }), null);
		});
	}
});

describe('the public listing and the location index agree', () => {
	it('keeps the same items as isLocationIndexable over ItemGitService', async () => {
		const git = new ItemGitService({
			owner: 'o',
			repo: 'r',
			token: '',
			branch: 'main',
			dataDir: path.join(root, '.content'),
			itemsDir: 'data'
		});
		const indexed = (await git.readItems(true)).filter(isLocationIndexable).map((item) => item.slug);
		const listed = (await content.fetchItems()).items.map((item) => item.slug);

		assert.deepEqual(indexed.sort(), PUBLIC);
		assert.deepEqual(listed.sort(), PUBLIC);
	});
});
