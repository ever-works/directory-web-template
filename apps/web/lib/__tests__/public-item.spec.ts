import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import Module from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { after, before, describe, it } from 'node:test';

import type * as PublicItemModule from '../public-item';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The per-item engagement routes key their rows by the slug in the URL: `POST
 * /api/items/[slug]/views`, `GET` and `POST .../comments`, `GET .../comments/rating`, `GET` and
 * `POST .../votes`. They answered, and stored rows, for any slug, so anyone could tell that a
 * draft, pending or rejected slug exists and inflate its views, a signed-in user could comment
 * on it and vote for it, and the comments of a rejected item could still be read. Each route now
 * asks `findPublicItem` first and answers for an unpublished item as for an unknown one (T-2853).
 *
 * The real content module reads a temporary content folder (process.cwd()/.content);
 * `server-only` is stubbed so it loads under `tsx --test`.
 */
const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (request === 'server-only') return {};
	return originalLoad.call(this, request, ...rest);
};
const { findPublicItem } = require('../public-item') as typeof PublicItemModule;
loader._load = originalLoad;

const PUBLIC = ['approved-item', 'blank-status-item', 'no-status-item'];
const HIDDEN = ['draft-item', 'pending-item', 'rejected-item', 'deleted-item', 'unknown-status-item'];

/** Extra YAML lines per item: everything else is the same for all. */
const ITEMS: Record<string, string[]> = {
	'approved-item': ['status: approved', 'submitted_by: owner-user-id'],
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

before(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'public-item-'));
	write('.works/works.yml', ['company_name: Test', 'item_name: Item', 'items_name: Items']);
	write('categories.yml', ['- id: tools', '  name: Tools']);
	write('tags.yml', ['- id: shared', '  name: Shared']);
	for (const [slug, extra] of Object.entries(ITEMS)) {
		write(`data/${slug}/${slug}.yml`, [
			`name: ${slug}`,
			`description: The ${slug} fixture`,
			`source_url: https://example.com/${slug}`,
			'category: tools',
			'tags:',
			'  - shared',
			"updated_at: '2026-11-01 10:00'",
			...extra
		]);
	}
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

describe('findPublicItem', () => {
	for (const slug of PUBLIC) {
		it(`returns the public item ${slug}`, async () => {
			const item = await findPublicItem(slug);
			assert.equal(item?.slug, slug);
			assert.equal(item?.name, slug);
		});
	}

	it("keeps the submitter, which the views route needs to skip the owner's own views", async () => {
		assert.equal((await findPublicItem('approved-item'))?.submitted_by, 'owner-user-id');
	});

	for (const slug of HIDDEN) {
		it(`returns null for ${slug}`, async () => {
			assert.equal(await findPublicItem(slug), null);
		});
	}

	it('returns null for a slug with no item', async () => {
		assert.equal(await findPublicItem('no-such-item'), null);
	});

	// fetchItem keeps only the last path segment, so `../approved-item` would read approved-item,
	// and it throws for any other character outside [a-zA-Z0-9_-]
	for (const slug of ['', '../approved-item', 'x/../approved-item', 'approved-item.yml', 'approved item', '%2e%2e']) {
		it(`returns null, without throwing, for the slug ${JSON.stringify(slug)}`, async () => {
			assert.equal(await findPublicItem(slug), null);
		});
	}
});

// An item is `data/<slug>/<slug>.yml`, and a file name is at most 255 bytes. Linux answers
// ENAMETOOLONG for a longer one, which fetchItem throws as a read error, so the views route
// answered 500 instead of 404. Windows answers ENOENT, so realpath answers here as Linux does.
describe('findPublicItem with a slug too long to name a file', () => {
	const promises = fs.promises as unknown as {
		realpath: (target: fs.PathLike, ...rest: unknown[]) => Promise<string>;
	};
	const realpath = promises.realpath;

	before(() => {
		promises.realpath = async (target, ...rest) => {
			const segments = String(target).split(/[\\/]/);
			if (segments.some((segment) => segment.length > 255)) {
				throw Object.assign(new Error(`ENAMETOOLONG: name too long, realpath '${String(target)}'`), {
					code: 'ENAMETOOLONG',
					syscall: 'realpath',
					path: String(target)
				});
			}
			return realpath(target, ...rest);
		};
	});

	after(() => {
		promises.realpath = realpath;
	});

	for (const length of [251, 252, 255, 256, 5000]) {
		it(`returns null, without throwing, for a ${length}-character slug`, async () => {
			assert.equal(await findPublicItem('a'.repeat(length)), null);
		});
	}
});
