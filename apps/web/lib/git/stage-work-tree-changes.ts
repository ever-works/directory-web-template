import type { FsClient } from 'isomorphic-git';

/**
 * Stages every change in the work tree of the repository at `dir`, deleted files included, the way
 * `git add --all` does.
 *
 * isomorphic-git's `add` stages only files that exist. `git.add({ filepath: '.' })` left a file the
 * app removed (an admin item delete, a report resolved as content removed) in the index, so the next
 * commit still held it, the push sent it upstream, and every fresh clone of the content repository
 * brought the item back (T-2904). This reads `statusMatrix` instead: `remove` for each path deleted
 * from the work tree, one `add` for every new or changed path. Paths the repository's `.gitignore`
 * ignores are not staged, as with `add` on '.'.
 *
 * isomorphic-git is imported when this runs, as ItemGitService does, so importing this module does
 * not load it.
 */
export async function stageWorkTreeChanges({ fs, dir }: { fs: FsClient; dir: string }): Promise<void> {
	const git = (await import('isomorphic-git')).default;
	const changed: string[] = [];
	// Rows are [filepath, HEAD, WORKDIR, STAGE]. WORKDIR 0 is a path deleted from the work tree, and
	// STAGE has the same value as WORKDIR when the index already matches the work tree.
	for (const [filepath, , workdir, stage] of await git.statusMatrix({ fs, dir })) {
		if (workdir === stage) continue;
		if (workdir === 0) {
			await git.remove({ fs, dir, filepath });
		} else {
			changed.push(filepath);
		}
	}
	if (changed.length > 0) {
		await git.add({ fs, dir, filepath: changed });
	}
}
