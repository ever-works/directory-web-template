import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, before, beforeEach, describe, it } from 'node:test';

import { findUnpushedWork, saveUnpushedWork } from '../unpushed-work';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `findUnpushedWork` tells the content sync (lib/repository.ts) what a fresh clone would throw away:
 * changes in the work tree and commits that no remote-tracking ref holds, such as an item edit whose
 * push was rejected. The sync read only `statusMatrix`, so a committed but unpushed edit counted as no
 * change and the re-clone after a conflicting pull dropped it (T-2923). `saveUnpushedWork` commits the
 * pending changes and pushes, normally or to a recovery branch. These run on a real isomorphic-git
 * repository in a temporary folder; the remote-tracking ref is set with `git.writeRef` and the push is
 * a spy, since isomorphic-git has no file transport.
 */
type Git = typeof import('isomorphic-git').default;

const AUTHOR = { name: 'Spec', email: 'spec@example.com' };
const NOW = new Date('2026-11-28T12:34:56.789Z');

let git: Git;
let dir: string;
let seed: string;

function writeFile(filepath: string, content: string) {
	fs.mkdirSync(path.dirname(path.join(dir, filepath)), { recursive: true });
	fs.writeFileSync(path.join(dir, filepath), content);
}

async function commit(files: Record<string, string>, message = 'Update item') {
	for (const [filepath, content] of Object.entries(files)) writeFile(filepath, content);
	await git.add({ fs, dir, filepath: Object.keys(files) });
	return git.commit({ fs, dir, message, author: AUTHOR, committer: AUTHOR });
}

function track(oid: string, branch = 'main') {
	return git.writeRef({ fs, dir, ref: `refs/remotes/origin/${branch}`, value: oid, force: true });
}

async function head() {
	return git.resolveRef({ fs, dir, ref: 'HEAD' });
}

/** A push spy: records the HEAD commit and the remote ref of each call, and fails the calls `fail` names. */
function spyPush(fail: (remoteRef: string | undefined) => boolean = () => false) {
	const calls: { remoteRef: string | undefined; oid: string }[] = [];
	const push = async (remoteRef?: string) => {
		calls.push({ remoteRef, oid: await head() });
		if (fail(remoteRef)) throw new Error('HTTP Error: 403 Forbidden');
	};
	return { calls, push };
}

before(async () => {
	git = (await import('isomorphic-git')).default;
});

beforeEach(async () => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unpushed-work-'));
	await git.init({ fs, dir, defaultBranch: 'main' });
	seed = await commit({ 'data/foo/foo.yml': 'name: Foo\n', 'data/bar/bar.yml': 'name: Bar\n' }, 'Seed');
	await track(seed);
});

afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

describe('findUnpushedWork (T-2923)', () => {
	it('reports nothing on a fresh clone or when the remote is ahead', async () => {
		assert.deepEqual(await findUnpushedWork({ fs, dir }), { changedPaths: [], commits: [] });

		await commit({ 'data/foo/foo.yml': 'name: Foo remote\n' }, 'Remote edit');
		await track(await head());
		await git.writeRef({ fs, dir, ref: 'refs/heads/main', value: seed, force: true });
		await git.checkout({ fs, dir, ref: 'main', force: true });

		assert.deepEqual(await findUnpushedWork({ fs, dir }), { changedPaths: [], commits: [] });
	});

	it('finds a commit whose push failed, and not the commits the remote has', async () => {
		const first = await commit({ 'data/foo/foo.yml': 'name: Foo local\n' });
		const second = await commit({ 'data/bar/bar.yml': 'name: Bar local\n' });

		const work = await findUnpushedWork({ fs, dir });

		assert.deepEqual(work.changedPaths, []);
		assert.deepEqual([...work.commits].sort(), [first, second].sort());
	});

	it('finds the local commit when the remote moved on (the conflicting pull)', async () => {
		const local = await commit({ 'data/foo/foo.yml': 'name: Foo local\n' });
		await git.branch({ fs, dir, ref: 'upstream', object: seed, checkout: true });
		const remote = await commit({ 'data/foo/foo.yml': 'name: Foo remote\n' }, 'Remote edit');
		await git.checkout({ fs, dir, ref: 'main' });
		await git.deleteBranch({ fs, dir, ref: 'upstream' });
		await track(remote);

		assert.deepEqual(await findUnpushedWork({ fs, dir }), { changedPaths: [], commits: [local] });
	});

	it('reports uncommitted edits and deletions', async () => {
		writeFile('data/foo/foo.yml', 'name: Foo edited\n');
		fs.rmSync(path.join(dir, 'data', 'bar'), { recursive: true });

		const work = await findUnpushedWork({ fs, dir });

		assert.deepEqual(work.changedPaths.sort(), ['data/bar/bar.yml', 'data/foo/foo.yml']);
		assert.deepEqual(work.commits, []);
	});

	it('counts a commit on any remote-tracking ref as pushed, and every commit when there is none', async () => {
		const local = await commit({ 'data/foo/foo.yml': 'name: Foo local\n' });
		await track(local, 'sync-recovery/2026-11-28T12-00-00-000Z-abcdef0');

		assert.deepEqual((await findUnpushedWork({ fs, dir })).commits, []);

		for (const branch of await git.listBranches({ fs, dir, remote: 'origin' })) {
			await git.deleteRef({ fs, dir, ref: `refs/remotes/origin/${branch}` });
		}

		assert.deepEqual([...(await findUnpushedWork({ fs, dir })).commits].sort(), [local, seed].sort());
	});
});

describe('saveUnpushedWork (T-2923)', () => {
	it('does not push when there is nothing to save', async () => {
		const spy = spyPush();

		assert.deepEqual(await saveUnpushedWork({ fs, dir, push: spy.push, now: NOW }), { status: 'nothing-to-save' });
		assert.deepEqual(spy.calls, []);
	});

	it('commits the pending changes, deletions included, and pushes them', async () => {
		writeFile('data/foo/foo.yml', 'name: Foo edited\n');
		fs.rmSync(path.join(dir, 'data', 'bar'), { recursive: true });
		const spy = spyPush();

		const result = await saveUnpushedWork({ fs, dir, push: spy.push, now: NOW });

		const saved = await head();
		assert.notEqual(saved, seed, 'the pending changes were not committed');
		assert.deepEqual(result, { status: 'pushed', commits: [saved] });
		assert.deepEqual(spy.calls, [{ remoteRef: undefined, oid: saved }]);
		assert.deepEqual(await git.listFiles({ fs, dir, ref: 'HEAD' }), ['data/foo/foo.yml']);
		const { commit: savedCommit } = await git.readCommit({ fs, dir, oid: saved });
		assert.deepEqual(savedCommit.parent, [seed]);
	});

	it('pushes HEAD to a recovery branch when the normal push fails', async () => {
		const local = await commit({ 'data/foo/foo.yml': 'name: Foo local\n' });
		const spy = spyPush((remoteRef) => remoteRef === undefined);

		const result = await saveUnpushedWork({ fs, dir, push: spy.push, now: NOW });

		const branch = `sync-recovery/2026-11-28T12-34-56-789Z-${local.slice(0, 7)}`;
		assert.deepEqual(result, { status: 'recovery-branch', branch, commits: [local] });
		assert.deepEqual(spy.calls, [
			{ remoteRef: undefined, oid: local },
			{ remoteRef: `refs/heads/${branch}`, oid: local }
		]);
	});

	it('reports a failure and leaves the commit in place when both pushes fail', async () => {
		const local = await commit({ 'data/foo/foo.yml': 'name: Foo local\n' });
		const spy = spyPush(() => true);

		const result = await saveUnpushedWork({ fs, dir, push: spy.push, now: NOW });

		assert.equal(result.status, 'failed');
		assert.equal(spy.calls.length, 2);
		assert.equal(await head(), local);
	});
});
