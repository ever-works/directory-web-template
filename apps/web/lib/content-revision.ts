import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Commit the content checkout's HEAD points at, or `null` when it cannot be
 * read (no `.git`, unborn branch, unreadable ref).
 *
 * Handles a detached HEAD, a loose ref (`.git/refs/heads/<branch>`) and a
 * packed ref (`.git/packed-refs`). Kept free of Next.js and `server-only`
 * imports so the sync service and `lib/content.ts` can share it and it can be
 * unit tested (`lib/__tests__/content-revision.spec.ts`).
 */
export async function readGitHeadRevision(contentPath: string): Promise<string | null> {
	const gitDir = path.join(contentPath, '.git');
	let head: string;
	try {
		head = (await fsp.readFile(path.join(gitDir, 'HEAD'), 'utf8')).trim();
	} catch {
		return null;
	}

	if (!head.startsWith('ref:')) {
		return head || null;
	}

	const ref = head.slice('ref:'.length).trim();
	// HEAD is local, but never follow a ref outside `.git`.
	const refPath = path.resolve(gitDir, ref);
	if (!refPath.startsWith(path.resolve(gitDir) + path.sep)) {
		return null;
	}

	try {
		const sha = (await fsp.readFile(refPath, 'utf8')).trim();
		if (sha) return sha;
	} catch {
		// Not a loose ref: look in packed-refs below.
	}

	try {
		const packed = await fsp.readFile(path.join(gitDir, 'packed-refs'), 'utf8');
		for (const line of packed.split('\n')) {
			const [sha, name] = line.trim().split(/\s+/);
			if (name === ref && sha && !sha.startsWith('#') && !sha.startsWith('^')) {
				return sha;
			}
		}
	} catch {
		// No packed-refs file.
	}
	return null;
}
