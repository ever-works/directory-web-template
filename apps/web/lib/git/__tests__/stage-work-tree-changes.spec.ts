import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, before, beforeEach, describe, it } from 'node:test';

import { stageWorkTreeChanges } from '../stage-work-tree-changes';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `stageWorkTreeChanges` is how the content commits (ItemGitService.commitAndPush and
 * pushPendingChanges, lib/repository.ts tryPushLocalChanges) stage. isomorphic-git's `add` on '.'
 * stages only files that exist, so a deleted item stayed in the commit and in the pushed repository
 * (T-2904). These run it on a real isomorphic-git repository in a temporary folder.
 */
type Git = typeof import('isomorphic-git').default;

const AUTHOR = { name: 'Spec', email: 'spec@example.com' };

let git: Git;
let dir: string;

function writeFile(filepath: string, content: string) {
	fs.mkdirSync(path.dirname(path.join(dir, filepath)), { recursive: true });
	fs.writeFileSync(path.join(dir, filepath), content);
}

async function commit(message: string) {
	await git.commit({ fs, dir, message, author: AUTHOR, committer: AUTHOR });
}

async function headFiles() {
	return (await git.listFiles({ fs, dir, ref: 'HEAD' })).sort();
}

async function headBlob(filepath: string) {
	const oid = await git.resolveRef({ fs, dir, ref: 'HEAD' });
	const { blob } = await git.readBlob({ fs, dir, oid, filepath });
	return Buffer.from(blob).toString('utf8');
}

/** statusMatrix rows whose work tree or index differs from HEAD. */
async function uncommitted() {
	return (await git.statusMatrix({ fs, dir }))
		.filter(([, head, workdir, stage]) => head !== workdir || head !== stage)
		.map(([filepath]) => filepath);
}

before(async () => {
	git = (await import('isomorphic-git')).default;
});

beforeEach(async () => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage-work-tree-changes-'));
	await git.init({ fs, dir, defaultBranch: 'main' });
	writeFile('.gitignore', 'ignored/\n');
	writeFile('data/gone/gone.yml', 'name: Gone\n');
	writeFile('data/edited/edited.yml', 'name: Before\n');
	writeFile('data/kept/kept.yml', 'name: Kept\n');
	writeFile('data/staged-delete/staged-delete.yml', 'name: Staged delete\n');
	await git.add({ fs, dir, filepath: '.' });
	await commit('Seed');
});

afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

describe('stageWorkTreeChanges stages deletions as well as new and changed files (T-2904)', () => {
	it('stages a deleted folder, an edit and a new file in one call', async () => {
		fs.rmSync(path.join(dir, 'data', 'gone'), { recursive: true });
		writeFile('data/edited/edited.yml', 'name: After\n');
		writeFile('data/new/new.yml', 'name: New\n');

		await stageWorkTreeChanges({ fs, dir });
		await commit('Change items');

		assert.deepEqual(await headFiles(), [
			'.gitignore',
			'data/edited/edited.yml',
			'data/kept/kept.yml',
			'data/new/new.yml',
			'data/staged-delete/staged-delete.yml'
		]);
		assert.equal(await headBlob('data/edited/edited.yml'), 'name: After\n');
		assert.deepEqual(await uncommitted(), []);
	});

	it('keeps a deletion that is already staged and leaves ignored files out', async () => {
		fs.rmSync(path.join(dir, 'data', 'staged-delete'), { recursive: true });
		await git.remove({ fs, dir, filepath: 'data/staged-delete/staged-delete.yml' });
		writeFile('ignored/cache.json', '{}\n');

		await stageWorkTreeChanges({ fs, dir });
		await commit('Remove staged-delete');

		assert.deepEqual(await headFiles(), [
			'.gitignore',
			'data/edited/edited.yml',
			'data/gone/gone.yml',
			'data/kept/kept.yml'
		]);
		assert.deepEqual(await uncommitted(), []);
	});

	it('stages nothing when the work tree matches the index', async () => {
		const before = await git.statusMatrix({ fs, dir });

		await stageWorkTreeChanges({ fs, dir });

		assert.deepEqual(await git.statusMatrix({ fs, dir }), before);
	});
});
