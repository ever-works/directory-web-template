import type { FsClient } from 'isomorphic-git';

import { stageWorkTreeChanges } from './stage-work-tree-changes';

/** What a fresh clone of the content checkout would throw away. */
export interface UnpushedWork {
	/** Paths whose work tree or index differs from HEAD. */
	changedPaths: string[];
	/** Commits reachable from HEAD that no remote-tracking ref (`refs/remotes/<remote>/*`) holds. */
	commits: string[];
}

export type SaveUnpushedWorkResult =
	| { status: 'nothing-to-save' }
	| { status: 'pushed'; commits: string[] }
	| { status: 'recovery-branch'; branch: string; commits: string[] }
	| { status: 'failed'; commits: string[]; error: unknown };

/**
 * Pushes HEAD. With no `remoteRef`, to the branch's upstream (the normal push); with one, to that ref of
 * the remote. Throws when the push is rejected or fails.
 */
export type PushHead = (remoteRef?: string) => Promise<unknown>;

export interface UnpushedWorkOptions {
	fs: FsClient;
	/** The checkout's work tree. */
	dir: string;
	/** The remote whose tracking refs (`refs/remotes/<remote>/*`) count as pushed. Default `origin`. */
	remote?: string;
}

export interface SaveUnpushedWorkOptions extends UnpushedWorkOptions {
	push: PushHead;
	/** Names the auto commit and the recovery branch. Default: now. */
	now?: Date;
}

const AUTO_COMMITTER = { name: 'Website Bot', email: 'bot@ever.works' };

/**
 * Reports the work in the repository at `dir` that exists only there: changes in the work tree, and
 * commits that no remote-tracking ref holds, such as an item edit ItemGitService committed but could
 * not push. The content sync re-clones the checkout after a conflicting or failed pull; it read only
 * `statusMatrix`, so a committed but unpushed edit counted as no change and the clone dropped it
 * (T-2923).
 *
 * A commit counts as pushed when a remote-tracking ref of `remote` holds it, the branch's upstream or a
 * recovery branch `saveUnpushedWork` pushed (isomorphic-git writes the tracking ref of a pushed ref).
 * The walk from HEAD stops at those refs and at HEAD's merge bases with them, as isomorphic-git's push
 * does when it lists the commits to send. With no remote-tracking ref every commit counts as unpushed.
 *
 * isomorphic-git is imported when this runs, as in stage-work-tree-changes.ts, and the module does not
 * import `server-only`, so specs can load it.
 */
export async function findUnpushedWork({ fs, dir, remote = 'origin' }: UnpushedWorkOptions): Promise<UnpushedWork> {
	const git = (await import('isomorphic-git')).default;
	// Rows are [filepath, HEAD, WORKDIR, STAGE]: a path differs from HEAD in the work tree or the index.
	const changedPaths = (await git.statusMatrix({ fs, dir }))
		.filter(([, head, workdir, stage]) => head !== workdir || head !== stage)
		.map(([filepath]) => filepath);

	let head: string;
	try {
		head = await git.resolveRef({ fs, dir, ref: 'HEAD' });
	} catch (error) {
		// A branch with no commit yet: only the work tree holds anything.
		if (error instanceof git.Errors.NotFoundError) return { changedPaths, commits: [] };
		throw error;
	}

	const tips = new Set<string>();
	for (const branch of await git.listBranches({ fs, dir, remote })) {
		try {
			tips.add(await git.resolveRef({ fs, dir, ref: `refs/remotes/${remote}/${branch}` }));
		} catch {
			// A symbolic ref (refs/remotes/<remote>/HEAD) whose target is gone holds nothing.
		}
	}
	if (tips.has(head)) return { changedPaths, commits: [] };

	const pushed = new Set(tips);
	for (const tip of tips) {
		for (const base of await git.findMergeBase({ fs, dir, oids: [head, tip] })) pushed.add(base);
	}

	const commits: string[] = [];
	const seen = new Set<string>();
	const pending = [head];
	for (let oid = pending.pop(); oid !== undefined; oid = pending.pop()) {
		if (seen.has(oid) || pushed.has(oid)) continue;
		seen.add(oid);
		commits.push(oid);
		const { commit } = await git.readCommit({ fs, dir, oid });
		pending.push(...commit.parent);
	}
	return { changedPaths, commits };
}

/**
 * Puts the unpushed work of the repository at `dir` on the remote before the content sync replaces the
 * checkout with a fresh clone (T-2923). It commits the pending work-tree changes, then tries the normal
 * push. When that fails (the remote moved on, so the push is not a fast-forward), it pushes HEAD to a new
 * `sync-recovery/<ISO time>-<commit>` branch and logs the branch and the commits, to be merged there.
 *
 * Returns `failed` when the work could not be read, committed or pushed: the caller must keep the
 * checkout, so the next sync tries again. Never throws.
 */
export async function saveUnpushedWork(options: SaveUnpushedWorkOptions): Promise<SaveUnpushedWorkResult> {
	const { fs, dir, push, now = new Date(), remote = 'origin' } = options;
	let commits: string[] = [];
	let head: string;
	try {
		const git = (await import('isomorphic-git')).default;
		const work = await findUnpushedWork({ fs, dir, remote });
		if (work.changedPaths.length === 0 && work.commits.length === 0) return { status: 'nothing-to-save' };

		if (work.changedPaths.length > 0) {
			// Stage all changes, deleted files included (git.add on '.' stages only files that exist)
			await stageWorkTreeChanges({ fs, dir });
			await git.commit({
				fs,
				dir,
				message: `[Auto] Save local changes before sync - ${now.toISOString()}`,
				author: AUTO_COMMITTER,
				committer: AUTO_COMMITTER
			});
		}
		head = await git.resolveRef({ fs, dir, ref: 'HEAD' });
		commits = work.changedPaths.length > 0 ? [head, ...work.commits] : work.commits;
	} catch (error) {
		console.error('[SYNC] Could not read or commit the unpushed work of the content checkout:', error);
		return { status: 'failed', commits, error };
	}

	try {
		await push();
		console.log(`[SYNC] Pushed the unpushed work of the content checkout: ${commits.join(', ')}`);
		return { status: 'pushed', commits };
	} catch (error) {
		console.warn('[SYNC] Push of the unpushed work failed, pushing it to a recovery branch:', error);
	}

	// A ref name may not hold ':' (git check-ref-format), so the time's ':' and '.' become '-'.
	const branch = `sync-recovery/${now.toISOString().replace(/[:.]/g, '-')}-${head.slice(0, 7)}`;
	try {
		await push(`refs/heads/${branch}`);
	} catch (error) {
		console.error(
			`[SYNC] Could not push the unpushed work of the content checkout (${commits.join(', ')}); keeping the checkout for the next sync to retry:`,
			error
		);
		return { status: 'failed', commits, error };
	}
	console.warn(
		`[SYNC] Saved the unpushed work of the content checkout on branch ${branch} of the content repository; merge it there. Commits: ${commits.join(', ')}`
	);
	return { status: 'recovery-branch', branch, commits };
}
