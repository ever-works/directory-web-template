import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import Module from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * An admin edit or delete is committed in the content checkout, then pushed (ItemGitService
 * commitAndPush). When the push is rejected, because another replica pushed or someone edited the data
 * repository, the commit exists only in the checkout and the API still reports success. The next sync
 * (lib/repository.ts) pulled, the merge conflicted on the same file, `checkForLocalChanges` saw a clean
 * work tree (it reads only `statusMatrix`) and the checkout was replaced by a fresh clone: the edit was
 * gone. A pull that failed for another reason (a timeout, a 401) reached the fallback clone of
 * `trySyncRepository` with no check at all. Before any re-clone the sync now pushes the unpushed work:
 * the normal push, else HEAD to a `sync-recovery/<time>-<commit>` branch, and it keeps the checkout when
 * both pushes fail. See T-2923.
 *
 * A real isomorphic-git repository in a temporary folder is the checkout. isomorphic-git has no file
 * transport, so `git.pull`, `git.push` and `git.clone` are replaced: the pull "fetches" by writing the
 * remote's commit to `refs/remotes/origin/main` and then merges and checks out as `git.pull` does; the
 * push applies isomorphic-git's fast-forward rule to a simulated remote; the clone records the call
 * and leaves an empty repository. The sync's `withTimeout` timers and `Date` are mocked, so no 2-minute
 * timer outlives a test and `trySyncRepository`'s 10-second sync interval passes between tests.
 */
const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (request === 'server-only') return {};
	return originalLoad.call(this, request, ...rest);
};
process.env.DATA_REPOSITORY = 'https://github.com/example/content-data';
delete process.env.VERCEL;
delete process.env.DISABLE_AUTO_SYNC;
const repository = require('../repository') as typeof import('../repository');
loader._load = originalLoad;

type Git = typeof import('isomorphic-git').default;
type Auth = Parameters<typeof repository.pullChanges>[2];

const AUTHOR = { name: 'Spec', email: 'spec@example.com' };
const DATA_URL = 'https://github.com/example/content-data';
const FOO = 'data/foo/foo.yml';
const BAR = 'data/bar/bar.yml';
const RECOVERY_REF = /^refs\/heads\/sync-recovery\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f]{7}$/;

let git: Git;
let root: string;
let dir: string;
let r0: string;
let clock = Date.UTC(2026, 10, 28, 12);
const originalCwd = process.cwd();

/** The data repository the checkout syncs with: the tip of its `main`, and what fails. */
let remote: { main: string; pushError?: () => Error; pullError?: () => Error };
/** Network calls in order: `pull`, `push <remote ref>`, `clone`. */
let calls: string[];
/** What each accepted push sent: the commit, its parents and the two item files in it, read at push time. */
let pushed: { remoteRef: string; oid: string; parents: string[]; foo: string; bar: string }[];

function writeFile(filepath: string, content: string) {
	fs.mkdirSync(path.dirname(path.join(dir, filepath)), { recursive: true });
	fs.writeFileSync(path.join(dir, filepath), content);
}

function readFile(filepath: string) {
	return fs.readFileSync(path.join(dir, filepath), 'utf8');
}

async function blobAt(oid: string, filepath: string) {
	const { blob } = await git.readBlob({ fs, dir, oid, filepath });
	return Buffer.from(blob).toString('utf8');
}

/** A commit another replica pushed to the remote's `main`; the checkout's branch and work tree are untouched. */
async function remoteCommit(files: Record<string, string>) {
	await git.branch({ fs, dir, ref: 'upstream', object: remote.main, checkout: true });
	for (const [filepath, content] of Object.entries(files)) writeFile(filepath, content);
	await git.add({ fs, dir, filepath: Object.keys(files) });
	const oid = await git.commit({ fs, dir, message: 'Remote edit', author: AUTHOR, committer: AUTHOR });
	await git.checkout({ fs, dir, ref: 'main' });
	await git.deleteBranch({ fs, dir, ref: 'upstream' });
	remote.main = oid;
	return oid;
}

/** An item write ItemGitService committed but could not push. */
async function localCommit(files: Record<string, string>) {
	for (const [filepath, content] of Object.entries(files)) writeFile(filepath, content);
	await git.add({ fs, dir, filepath: Object.keys(files) });
	return git.commit({ fs, dir, message: 'Update item: Foo', author: AUTHOR, committer: AUTHOR });
}

function mockNetwork() {
	mock.method(git, 'pull', async (args: { dir: string }) => {
		calls.push('pull');
		if (remote.pullError) throw remote.pullError();
		// The fetch: the remote-tracking ref takes the remote's tip. Then merge and checkout, as git.pull does.
		await git.writeRef({ fs, dir: args.dir, ref: 'refs/remotes/origin/main', value: remote.main, force: true });
		await git.merge({ fs, dir: args.dir, ours: 'main', theirs: 'refs/remotes/origin/main', author: AUTHOR });
		await git.checkout({ fs, dir: args.dir, ref: 'main' });
	});
	mock.method(git, 'push', async (args: { dir: string; ref?: string; remoteRef?: string }) => {
		const remoteRef = args.remoteRef ?? 'refs/heads/main';
		calls.push(`push ${remoteRef}`);
		if (remote.pushError) throw remote.pushError();
		const oid = await git.resolveRef({ fs, dir: args.dir, ref: args.ref ?? 'HEAD' });
		if (remoteRef === 'refs/heads/main') {
			const fastForward =
				oid === remote.main ||
				(await git.isDescendent({ fs, dir: args.dir, oid, ancestor: remote.main, depth: -1 }));
			if (!fastForward) throw new git.Errors.PushRejectedError('not-fast-forward');
			remote.main = oid;
		}
		// isomorphic-git writes the remote-tracking ref of a pushed branch.
		const tracking = remoteRef.replace('refs/heads/', 'refs/remotes/origin/');
		await git.writeRef({ fs, dir: args.dir, ref: tracking, value: oid, force: true });
		const { commit } = await git.readCommit({ fs, dir: args.dir, oid });
		pushed.push({
			remoteRef,
			oid,
			parents: commit.parent,
			foo: await blobAt(oid, FOO),
			bar: await blobAt(oid, BAR)
		});
		return { ok: true, error: null, refs: {} };
	});
	mock.method(git, 'clone', async (args: { dir: string }) => {
		calls.push('clone');
		await git.init({ fs, dir: args.dir, defaultBranch: 'main' });
	});
}

async function head() {
	return git.resolveRef({ fs, dir, ref: 'HEAD' });
}

function pull() {
	return repository.pullChanges(DATA_URL, dir, (() => ({})) as unknown as Auth);
}

before(async () => {
	git = (await import('isomorphic-git')).default;
});

beforeEach(async () => {
	// trySyncRepository syncs `<cwd>/.content` and skips a sync within 10 s of the last one.
	clock += 60_000;
	mock.timers.enable({ apis: ['setTimeout', 'Date'], now: clock });
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'content-sync-unpushed-work-'));
	process.chdir(root);
	dir = path.join(root, '.content');
	fs.mkdirSync(dir);
	await git.init({ fs, dir, defaultBranch: 'main' });
	writeFile(FOO, 'name: Foo\ndescription: Seed\n');
	writeFile(BAR, 'name: Bar\ndescription: Seed\n');
	await git.add({ fs, dir, filepath: '.' });
	r0 = await git.commit({ fs, dir, message: 'Seed', author: AUTHOR, committer: AUTHOR });
	// What a clone leaves: the remote-tracking ref on the remote's tip.
	await git.writeRef({ fs, dir, ref: 'refs/remotes/origin/main', value: r0 });
	remote = { main: r0 };
	calls = [];
	pushed = [];
	mockNetwork();
});

afterEach(() => {
	mock.restoreAll();
	mock.timers.reset();
	delete process.env.VERCEL;
	process.chdir(originalCwd);
	fs.rmSync(root, { recursive: true, force: true });
});

after(() => {
	delete process.env.DATA_REPOSITORY;
});

describe('a conflicting pull pushes the unpushed work before it clones again (T-2923)', () => {
	it('pushes a committed but unpushed edit to a recovery branch, then clones', async () => {
		const r1 = await remoteCommit({ [FOO]: 'name: Foo\ndescription: Remote\n' });
		const local = await localCommit({ [FOO]: 'name: Foo\ndescription: Local\n' });

		const updated = await pull();

		assert.equal(calls.length, 4, calls.join(', '));
		assert.deepEqual(calls.slice(0, 2), ['pull', 'push refs/heads/main']);
		assert.match(calls[2] ?? '', /^push refs\/heads\/sync-recovery\//);
		assert.equal(calls[3], 'clone', 'the checkout was cloned again before its commit reached the remote');
		assert.equal(pushed.length, 1);
		assert.match(pushed[0]?.remoteRef ?? '', RECOVERY_REF);
		assert.equal(pushed[0]?.oid, local, 'the recovery branch does not hold the local commit');
		assert.equal(remote.main, r1, "the remote's main changed");
		assert.equal(updated, true);
	});

	it('keeps the checkout and its commit when neither push gets through', async () => {
		await remoteCommit({ [FOO]: 'name: Foo\ndescription: Remote\n' });
		const local = await localCommit({ [FOO]: 'name: Foo\ndescription: Local\n' });
		remote.pushError = () => new Error('HTTP Error: 403 Forbidden');

		const updated = await pull();

		assert.ok(!calls.includes('clone'), `the checkout was cloned again: ${calls.join(', ')}`);
		assert.equal(await head(), local);
		assert.equal(readFile(FOO), 'name: Foo\ndescription: Local\n');
		assert.deepEqual(calls.slice(0, 2), ['pull', 'push refs/heads/main']);
		assert.match(calls[2] ?? '', /^push refs\/heads\/sync-recovery\//);
		assert.equal(calls.length, 3, calls.join(', '));
		assert.equal(updated, false, 'a sync that kept the checkout reported an update');
	});

	it("commits a pending edit onto the commit it was made on, so the push does not revert the remote's", async () => {
		// The remote changed both files; the checkout has an uncommitted edit of FOO. git.pull fast-forwards
		// main to the remote's commit and then cannot check it out (CheckoutConflictError).
		const r1 = await remoteCommit({
			[FOO]: 'name: Foo\ndescription: Remote\n',
			[BAR]: 'name: Bar\ndescription: Remote\n'
		});
		writeFile(FOO, 'name: Foo\ndescription: Local\n');

		const updated = await pull();

		assert.equal(remote.main, r1, "a push replaced the remote's main with a commit that reverts its change");
		assert.equal(calls.at(-1), 'clone');
		const saved = pushed.find(({ remoteRef }) => RECOVERY_REF.test(remoteRef));
		assert.ok(saved, `the pending edit was not pushed: ${calls.join(', ')}`);
		assert.deepEqual(saved.parents, [r0], 'the pending edit was not committed onto the commit it was made on');
		assert.equal(saved.foo, 'name: Foo\ndescription: Local\n');
		assert.equal(saved.bar, 'name: Bar\ndescription: Seed\n');
		assert.equal(updated, true);
	});

	it('still clones without pushing on a read-only runtime (Vercel)', async () => {
		await remoteCommit({ [FOO]: 'name: Foo\ndescription: Remote\n' });
		await localCommit({ [FOO]: 'name: Foo\ndescription: Local\n' });
		process.env.VERCEL = '1';

		await pull();

		assert.deepEqual(calls, ['pull', 'clone']);
	});
});

describe('the fallback clone of trySyncRepository pushes the unpushed work first (T-2923)', () => {
	it('pushes the unpushed commit after a pull that timed out, then clones', async () => {
		const local = await localCommit({ [FOO]: 'name: Foo\ndescription: Local\n' });
		remote.pullError = () => new Error('Operation timeout after 120000ms');

		const updated = await repository.trySyncRepository();

		assert.deepEqual(calls, ['pull', 'push refs/heads/main', 'clone']);
		assert.deepEqual(
			pushed.map(({ remoteRef, oid }) => ({ remoteRef, oid })),
			[{ remoteRef: 'refs/heads/main', oid: local }]
		);
		assert.equal(updated, true);
	});

	it('keeps the checkout when the pull and both pushes fail', async () => {
		const local = await localCommit({ [FOO]: 'name: Foo\ndescription: Local\n' });
		remote.pullError = () => new Error('HTTP Error: 401 Unauthorized');
		remote.pushError = () => new Error('HTTP Error: 401 Unauthorized');

		const updated = await repository.trySyncRepository();

		assert.equal(calls[0], 'pull');
		assert.ok(!calls.includes('clone'), `the checkout was cloned again: ${calls.join(', ')}`);
		assert.equal(await head(), local);
		assert.equal(readFile(FOO), 'name: Foo\ndescription: Local\n');
		assert.equal(updated, false, 'a sync that kept the checkout reported an update');
	});
});
