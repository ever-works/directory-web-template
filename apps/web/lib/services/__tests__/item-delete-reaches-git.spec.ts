import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import Module from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, before, beforeEach, describe, it, mock } from 'node:test';

import type { ItemGitService as ItemGitServiceType } from '@/lib/services/item-git.service';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * An admin delete (DELETE /api/admin/items/{id}, the bulk delete) and a report resolved as
 * `content_removed` end in `ItemGitService.deleteItem`, which removes `data/<slug>/<slug>.yml`
 * and commits. The commit staged with `git.add` on '.', and isomorphic-git's `add` stages only
 * files that exist, so the `Delete item` commit still held the file, the push sent that tree
 * upstream, and every fresh clone of the content repository (a new instance, a pod restart)
 * showed the item again. `commitAndPush`, `pushPendingChanges` and the content sync's save before a
 * re-clone (lib/git/unpushed-work.ts `saveUnpushedWork`, which replaced lib/repository.ts
 * `tryPushLocalChanges` in T-2923) now stage through `stageWorkTreeChanges`, which also stages
 * deletions. See T-2904.
 *
 * The real ItemGitService works in a real isomorphic-git repository in a temporary folder. CI=true
 * skips the push; where a test needs the push, `git.push` is a spy that records the files of the
 * commit it would send. The location index sync is stubbed, as in item-create-exclusive.spec.ts.
 * The three call sites' staging is also checked in their source; the helpers have their own specs
 * (lib/git/__tests__/stage-work-tree-changes.spec.ts, lib/git/__tests__/unpushed-work.spec.ts).
 */
const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (request === 'server-only') return {};
	return originalLoad.call(this, request, ...rest);
};
const { ItemGitService } = require('../item-git.service') as { ItemGitService: typeof ItemGitServiceType };
loader._load = originalLoad;

type Git = typeof import('isomorphic-git').default;

const AUTHOR = { name: 'Spec', email: 'spec@example.com' };
const FOO = 'data/foo/foo.yml';
const BAR = 'data/bar/bar.yml';

let git: Git;
let dir: string;
let service: ItemGitServiceType;
let locationSyncs: string[];
let backgroundSyncs: number;
let savedEnv: { CI?: string; CONTENT_GIT_OFFLINE?: string };

function itemYaml(name: string, description: string) {
	return [`name: ${name}`, `description: ${description}`, 'category: [tools]', 'status: approved', ''].join('\n');
}

function writeFile(filepath: string, content: string) {
	fs.mkdirSync(path.dirname(path.join(dir, filepath)), { recursive: true });
	fs.writeFileSync(path.join(dir, filepath), content);
}

async function headFiles(ref = 'HEAD') {
	return (await git.listFiles({ fs, dir, ref })).sort();
}

async function headBlob(filepath: string) {
	const oid = await git.resolveRef({ fs, dir, ref: 'HEAD' });
	const { blob } = await git.readBlob({ fs, dir, oid, filepath });
	return Buffer.from(blob).toString('utf8');
}

/** Paths whose work tree or index differs from HEAD: what a commit failed to record. */
async function uncommitted() {
	return (await git.statusMatrix({ fs, dir }))
		.filter(([, head, workdir, stage]) => head !== workdir || head !== stage)
		.map(([filepath]) => filepath);
}

/** Replaces `git.push` with a spy; each call records the files of the HEAD commit it would send. */
function spyOnPush() {
	const pushed: string[][] = [];
	mock.method(git, 'push', async (args: { dir: string }) => {
		assert.equal(args.dir, dir);
		pushed.push(await headFiles());
		return { ok: true, error: null, refs: {} };
	});
	return pushed;
}

before(async () => {
	git = (await import('isomorphic-git')).default;
});

beforeEach(async () => {
	savedEnv = { CI: process.env.CI, CONTENT_GIT_OFFLINE: process.env.CONTENT_GIT_OFFLINE };
	process.env.CI = 'true';
	delete process.env.CONTENT_GIT_OFFLINE;

	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'item-delete-reaches-git-'));
	await git.init({ fs, dir, defaultBranch: 'main' });
	writeFile(FOO, itemYaml('Foo', 'The item an admin deletes.'));
	writeFile(BAR, itemYaml('Bar', 'The item that stays.'));
	await git.add({ fs, dir, filepath: [FOO, BAR] });
	await git.commit({ fs, dir, message: 'Seed items', author: AUTHOR, committer: AUTHOR });

	service = new ItemGitService({ owner: 'o', repo: 'r', token: '', branch: 'main', dataDir: dir, itemsDir: 'data' });
	locationSyncs = [];
	backgroundSyncs = 0;
	const stubbed = service as unknown as {
		indexLocationAsync: (item: { slug: string }) => void;
		removeLocationIndexAsync: (slug: string) => void;
		scheduleBackgroundSync: () => void;
	};
	stubbed.indexLocationAsync = (item) => {
		locationSyncs.push(`index ${item.slug}`);
	};
	stubbed.removeLocationIndexAsync = (slug) => {
		locationSyncs.push(`remove ${slug}`);
	};
	// A failed git step schedules a retry 30 s later; count it instead, so a failure cannot keep the run alive
	stubbed.scheduleBackgroundSync = () => {
		backgroundSyncs++;
	};
});

afterEach(() => {
	mock.restoreAll();
	for (const key of ['CI', 'CONTENT_GIT_OFFLINE'] as const) {
		if (savedEnv[key] === undefined) delete process.env[key];
		else process.env[key] = savedEnv[key];
	}
	fs.rmSync(dir, { recursive: true, force: true });
});

describe('deleting an item commits the deletion (T-2904)', () => {
	it('deleteItem leaves the file out of the Delete item commit', async () => {
		assert.deepEqual(await headFiles(), [BAR, FOO]);

		await service.deleteItem('foo');

		assert.equal(fs.existsSync(path.join(dir, FOO)), false, 'the work tree still holds the file');
		assert.deepEqual(await headFiles(), [BAR], 'the Delete item commit still holds the deleted file');
		assert.deepEqual(await uncommitted(), [], 'the deletion is left uncommitted');
		const [head] = await git.log({ fs, dir, depth: 1 });
		assert.match(head.commit.message, /^Delete item: Foo - /);
		assert.equal(backgroundSyncs, 0, 'a git step failed');
		assert.deepEqual(locationSyncs, ['remove foo']);
	});

	it('the push sends the commit without the deleted file', async () => {
		delete process.env.CI;
		const pushed = spyOnPush();

		await service.deleteItem('foo');

		assert.deepEqual(pushed, [[BAR]], 'the push would send the tree that still holds the deleted file');
		const [head, parent] = await git.log({ fs, dir, depth: 2 });
		assert.match(head.commit.message, /^Delete item: Foo - /);
		assert.deepEqual(await headFiles(parent.oid), [BAR, FOO]);
		assert.equal(backgroundSyncs, 0, 'a git step failed');
	});

	it('the background retry also commits a deletion its first commit left behind', async () => {
		delete process.env.CI;
		const pushed = spyOnPush();
		// A deletion whose commit failed: the file is gone, the change is pending a background retry
		fs.rmSync(path.join(dir, 'data', 'foo'), { recursive: true });
		(service as unknown as { pendingChanges: unknown[] | null }).pendingChanges = [];

		await (service as unknown as { pushPendingChanges: () => Promise<void> }).pushPendingChanges();

		assert.deepEqual(pushed, [[BAR]], 'the retried push would send the tree that still holds the deleted file');
		assert.deepEqual(await uncommitted(), []);
		assert.equal((service as unknown as { pendingChanges: unknown }).pendingChanges, null);
	});
});

describe('edits and creates are still committed (T-2904)', () => {
	it('updateItem commits the edited file', async () => {
		await service.updateItem('bar', { id: 'bar', description: 'The edited description.' });

		assert.deepEqual(await headFiles(), [BAR, FOO]);
		assert.match(await headBlob(BAR), /description: The edited description\./);
		assert.deepEqual(await uncommitted(), []);
		assert.equal(backgroundSyncs, 0, 'a git step failed');
	});

	it('createItem commits the new file', async () => {
		await service.createItem({
			id: 'baz',
			slug: 'baz',
			name: 'Baz',
			description: 'A new item.',
			source_url: 'https://baz.example.com',
			category: ['tools'],
			tags: [],
			status: 'pending'
		});

		assert.deepEqual(await headFiles(), [BAR, 'data/baz/baz.yml', FOO]);
		assert.match(await headBlob('data/baz/baz.yml'), /name: Baz/);
		assert.deepEqual(await uncommitted(), []);
		assert.equal(backgroundSyncs, 0, 'a git step failed');
	});
});

describe('every content commit stages deletions (T-2904)', () => {
	const source = (relative: string) => fs.readFileSync(path.join(__dirname, relative), 'utf8');

	/** The body of `name` in `file`: from its signature to the next function or method at the same indent. */
	function functionBody(file: string, signature: string) {
		const start = file.indexOf(signature);
		assert.ok(start >= 0, `${signature} not found`);
		const indent = file.slice(file.lastIndexOf('\n', start) + 1, start);
		const next = file
			.slice(start + signature.length)
			.search(new RegExp(`\\n${indent}(?:private |async |export |function |\\})`));
		return file.slice(start, next < 0 ? undefined : start + signature.length + next);
	}

	for (const [label, relative, signature, stage] of [
		[
			'ItemGitService.commitAndPush',
			'../item-git.service.ts',
			'private async commitAndPush(',
			'await stageWorkTreeChanges({ fs, dir: this.config.dataDir });'
		],
		[
			'ItemGitService.pushPendingChanges',
			'../item-git.service.ts',
			'private async pushPendingChanges(',
			'await stageWorkTreeChanges({ fs, dir: this.config.dataDir });'
		],
		[
			'lib/git/unpushed-work.ts saveUnpushedWork',
			'../../git/unpushed-work.ts',
			'export async function saveUnpushedWork(',
			'await stageWorkTreeChanges({ fs, dir });'
		]
	] as const) {
		it(`${label} stages through stageWorkTreeChanges, not git.add on '.'`, () => {
			const body = functionBody(source(relative), signature);
			assert.ok(body.includes(stage), `${label} does not stage through stageWorkTreeChanges`);
			assert.ok(!/filepath:\s*'\.'/.test(body), `${label} still stages with git.add on '.'`);
			assert.ok(body.indexOf(stage) < body.indexOf('git.commit('), `${label} stages after it commits`);
		});
	}
});
