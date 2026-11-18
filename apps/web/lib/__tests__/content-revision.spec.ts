import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { readGitHeadRevision } from '../content-revision';

/**
 * Spec 061: the sync service only invalidates content caches when the
 * content checkout's HEAD moved, so reading HEAD must work for loose,
 * packed and detached refs.
 *
 * Run with: `npx tsx --test apps/web/lib/__tests__/content-revision.spec.ts`
 */

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

let root: string;

async function git(file: string, content: string) {
	const target = path.join(root, '.git', file);
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, content);
}

beforeEach(async () => {
	root = await fs.mkdtemp(path.join(os.tmpdir(), 'content-revision-'));
});

afterEach(async () => {
	await fs.rm(root, { recursive: true, force: true });
});

describe('readGitHeadRevision', () => {
	it('returns null when the folder is not a git checkout', async () => {
		assert.equal(await readGitHeadRevision(root), null);
	});

	it('reads a loose branch ref', async () => {
		await git('HEAD', 'ref: refs/heads/main\n');
		await git('refs/heads/main', `${SHA_A}\n`);
		assert.equal(await readGitHeadRevision(root), SHA_A);
	});

	it('reads a packed branch ref', async () => {
		await git('HEAD', 'ref: refs/heads/main\n');
		await git('packed-refs', `# pack-refs with: peeled fully-peeled sorted\n${SHA_B} refs/heads/develop\n${SHA_A} refs/heads/main\n^${SHA_B}\n`);
		assert.equal(await readGitHeadRevision(root), SHA_A);
	});

	it('reads a detached HEAD', async () => {
		await git('HEAD', `${SHA_B}\n`);
		assert.equal(await readGitHeadRevision(root), SHA_B);
	});

	it('returns null for an unborn branch', async () => {
		await git('HEAD', 'ref: refs/heads/main\n');
		assert.equal(await readGitHeadRevision(root), null);
	});

	it('does not follow a ref outside .git', async () => {
		// `.git/../outside` exists and holds a sha, but is not inside `.git`.
		await git('HEAD', 'ref: ../outside\n');
		await fs.writeFile(path.join(root, 'outside'), SHA_A);
		assert.equal(await readGitHeadRevision(root), null);
	});
});
