import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import Module from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import type { ItemGitService as ItemGitServiceType } from '@/lib/services/item-git.service';
import type { ItemData } from '@/lib/types/item';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * readItems lists the content data folder, then stats every entry. The stat ran outside the
 * per-entry try, so one entry it could not stat threw into the outer catch and the whole read
 * answered no items: the admin list was empty, and update, review, soft delete, restore and
 * delete of any other item answered "not found". Two ways to get there: a hard delete (the
 * admin delete, a report resolved as content removed) removes a folder between the listing and
 * the stat, or a dangling symlink sits in the data folder, and then every read is empty until
 * someone removes it. readItemsRaw (the item export) read the folder the same way. Both now skip
 * such an entry with a warning and return the others; a failure of the listing itself still
 * answers []. See T-2873.
 *
 * The real ItemGitService reads a temporary content directory; git commit/push and the location
 * index sync are stubbed, as in item-create-exclusive.spec.ts.
 */
// The module object itself: the service reads it through the import, so a mock on it reaches readItems
const fsp = require('node:fs/promises') as typeof import('node:fs/promises');
const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (request === 'server-only') return {};
	return originalLoad.call(this, request, ...rest);
};
const { ItemGitService } = require('../item-git.service') as { ItemGitService: typeof ItemGitServiceType };
loader._load = originalLoad;

let dir: string;
let git: ItemGitServiceType;
let commits: number;

function writeItem(slug: string) {
	fs.mkdirSync(path.join(dir, 'data', slug), { recursive: true });
	fs.writeFileSync(
		path.join(dir, 'data', slug, `${slug}.yml`),
		[`name: ${slug}`, `description: The ${slug} item.`, 'category: [tools]', 'status: approved', ''].join('\n')
	);
}

/** A symlink in the data folder to a folder that does not exist. Returns false where none can be made. */
function linkToNothing(name: string): boolean {
	const link = path.join(dir, 'data', name);
	const target = path.join(dir, 'no-such-folder');
	// 'dir' is a symlink everywhere; Windows without Developer Mode refuses it, so try a junction next
	for (const type of ['dir', 'junction'] as const) {
		try {
			fs.symlinkSync(target, link, type);
			return true;
		} catch {
			// try the next type
		}
	}
	return false;
}

function slugs(items: ItemData[]) {
	return items.map((item) => item.slug).sort();
}

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'item-read-unreadable-'));
	fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
	git = new ItemGitService({ owner: 'o', repo: 'r', token: '', branch: 'main', dataDir: dir, itemsDir: 'data' });
	commits = 0;
	const stubbed = git as unknown as {
		commitAndPush: () => Promise<void>;
		indexLocationAsync: () => void;
		removeLocationIndexAsync: () => void;
	};
	stubbed.commitAndPush = async () => {
		commits++;
	};
	stubbed.indexLocationAsync = () => undefined;
	stubbed.removeLocationIndexAsync = () => undefined;
	writeItem('alpha');
	writeItem('beta');
});

afterEach(() => {
	mock.restoreAll();
	fs.rmSync(dir, { recursive: true, force: true });
});

describe('the item reads skip a data folder entry they cannot stat (T-2873)', () => {
	it('returns both items when a dangling symlink sits in the data folder', async (t) => {
		if (!linkToNothing('ghost')) {
			t.skip('symlinks cannot be created here');
			return;
		}
		assert.throws(
			() => fs.statSync(path.join(dir, 'data', 'ghost')),
			{ code: 'ENOENT' },
			'the link is not dangling'
		);

		assert.deepEqual(slugs(await git.readItems()), ['alpha', 'beta']);
		assert.deepEqual(slugs(await git.readItems(true)), ['alpha', 'beta']);
	});

	it('exports both items through readItemsRaw when a dangling symlink sits in the data folder', async (t) => {
		if (!linkToNothing('ghost')) {
			t.skip('symlinks cannot be created here');
			return;
		}

		const exported = await git.readItemsRaw();

		assert.deepEqual(exported.map((item) => item.slug).sort(), ['alpha', 'beta']);
	});

	it('still reviews an unrelated item while the dangling symlink is there', async (t) => {
		if (!linkToNothing('ghost')) {
			t.skip('symlinks cannot be created here');
			return;
		}

		const reviewed = await git.reviewItem('alpha', { status: 'rejected', review_notes: 'not a fit' });

		assert.equal(reviewed.status, 'rejected');
		assert.match(fs.readFileSync(path.join(dir, 'data', 'alpha', 'alpha.yml'), 'utf8'), /status: rejected/);
		assert.equal(commits, 1);
	});

	it('returns the other items when a folder is removed between the listing and its stat', async () => {
		writeItem('gone');
		const readdir = fsp.readdir;
		mock.method(fsp, 'readdir', async (...args: Parameters<typeof fsp.readdir>) => {
			const entries = await readdir(...args);
			// A hard delete of "gone" runs while this read is between its listing and its stats
			if (path.resolve(String(args[0])) === path.resolve(dir, 'data')) {
				fs.rmSync(path.join(dir, 'data', 'gone'), { recursive: true, force: true });
			}
			return entries;
		});

		assert.deepEqual(slugs(await git.readItems()), ['alpha', 'beta']);
	});

	it('still answers [] when the data folder itself cannot be listed', async () => {
		fs.rmSync(path.join(dir, 'data'), { recursive: true, force: true });
		// A file where the folder should be: access passes, the listing throws ENOTDIR
		fs.writeFileSync(path.join(dir, 'data'), 'not a folder');

		assert.deepEqual(await git.readItems(), []);
	});
});
