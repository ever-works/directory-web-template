import 'server-only';

import git, { Errors } from "isomorphic-git";
import * as http from "isomorphic-git/http/node";
import * as path from "node:path";
import * as fs from "node:fs";
import { fsExists, replaceDirectoryAtomically } from "./lib";
import { coreConfig } from "@/lib/config/config-service";
import { getPrimaryContentConfigPath, hasContentConfigFile } from "./content-config-file";
import { siteGitAuthCallbacks, type SiteGitAuthCallbacks } from "@/lib/git/site-git-token";
import { saveUnpushedWork, type PushHead } from "@/lib/git/unpushed-work";

/**
 * isomorphic-git `onAuth` / `onAuthFailure` for the data repo: the platform's
 * per-site broker token when configured (refreshed before it expires), else
 * the static `GH_TOKEN`. Spread into every network call.
 */
function getGitAuth(token?: string): SiteGitAuthCallbacks {
  return siteGitAuthCallbacks(token);
}

/**
 * Makes the callbacks for ONE git network call. `siteGitAuthCallbacks` allows one
 * forced refresh per object (per git operation): a single object shared by the
 * pull, push, retried pull and clone of one sync would let the first 401 spend the
 * refresh for all of them.
 */
type GitAuthFactory = () => SiteGitAuthCallbacks;

/**
 * Wraps a promise with a timeout to prevent indefinite hangs
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 2 minutes)
 * @returns Promise that rejects if timeout is reached
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 120000): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

let lastSynced: number;
const syncInterval = 10 * 1000;

/* 
    Improve build time and development experience (in dev mode Next.js serves ISR pages dynamically).
*/
function shouldSync() {
  if (!lastSynced) return true;

  if (Date.now() - lastSynced >= syncInterval) return true;

  return false;
}

/**
 * Returns true when the runtime cannot meaningfully push back to the data
 * repository (read-only / ephemeral filesystems like Vercel Lambda). In those
 * environments the working tree in /tmp is per-instance and contains stale
 * state from prior cold starts, so attempting `git add`/`git push` produces
 * spurious "NotFoundError" failures and never reaches the upstream.
 */
function isReadOnlyContentRuntime(): boolean {
  if (coreConfig.DISABLE_AUTO_SYNC) return true;
  if (process.env.VERCEL === '1') return true;
  return false;
}

/**
 * The push `saveUnpushedWork` makes: HEAD to the branch's upstream, or with `remoteRef` to that ref (a
 * recovery branch).
 */
function pushHead(dir: string, url: string, auth: GitAuthFactory): PushHead {
  return (remoteRef) =>
    withTimeout(
      git.push({ ...auth(), fs, http, dir, url, ...(remoteRef ? { ref: "HEAD", remoteRef } : {}) }),
      60000 // 1 minute timeout for push
    );
}

/**
 * Before a fresh clone replaces the checkout at `dest`: pushes its unpushed work (changes in the work
 * tree, commits the remote does not have, such as an item edit whose push was rejected), normally or to
 * a recovery branch. A re-clone used to drop that work, although the API had reported the edit saved
 * (T-2923). A read-only runtime pushes nothing and clones, as before.
 *
 * `tipBeforePull` is where the branch was before a pull that failed. A pull that fast-forwarded the
 * branch and then could not check out (CheckoutConflictError) leaves the branch on the remote's commit
 * and the work tree on the old one; the branch is put back first, so the pending changes are committed
 * onto the commit they were made on and not as a commit that reverts the remote's changes.
 *
 * @returns `keep` when the work could not be pushed (keep the checkout, the next sync retries),
 *          `pushed` after the normal push, else `clone`.
 */
async function saveCheckoutBeforeClone(
  dest: string,
  url: string,
  auth: GitAuthFactory,
  tipBeforePull?: BranchTip | null
): Promise<"keep" | "pushed" | "clone"> {
  if (isReadOnlyContentRuntime()) {
    return "clone";
  }
  if (tipBeforePull) {
    const tip = await readBranchTip(dest);
    if (tip?.ref === tipBeforePull.ref && tip.oid !== tipBeforePull.oid) {
      try {
        await git.writeRef({ fs, dir: dest, ref: tipBeforePull.ref, value: tipBeforePull.oid, force: true });
      } catch (error) {
        console.error("[SYNC] Keeping the content checkout: could not move its branch back after the failed pull:", error);
        return "keep";
      }
    }
  }
  const saved = await saveUnpushedWork({ fs, dir: dest, push: pushHead(dest, url, auth) });
  if (saved.status === "failed") {
    console.error("[SYNC] Keeping the content checkout: its unpushed work could not be pushed. The next sync retries.");
    return "keep";
  }
  return saved.status === "pushed" ? "pushed" : "clone";
}

interface BranchTip {
  ref: string;
  oid: string;
}

/** The branch HEAD is on and its commit, or null when HEAD is detached or has no commit. */
async function readBranchTip(dir: string): Promise<BranchTip | null> {
  try {
    const ref = await git.currentBranch({ fs, dir, fullname: true });
    if (!ref) return null;
    return { ref, oid: await git.resolveRef({ fs, dir, ref }) };
  } catch {
    return null;
  }
}

async function cloneRepositoryAtomically(url: string, dest: string, auth: GitAuthFactory): Promise<void> {
  const tempDest = path.join(path.dirname(dest), `${path.basename(dest)}.${process.pid}.${Date.now()}.clone`);

  try {
    await fs.promises.rm(tempDest, { recursive: true, force: true });
    await fs.promises.mkdir(tempDest, { recursive: true });
    await withTimeout(
      git.clone({
        ...auth(),
        fs,
        http,
        url,
        dir: tempDest,
        singleBranch: true,
      })
    );
    await replaceDirectoryAtomically(dest, tempDest);
  } catch (error) {
    await fs.promises.rm(tempDest, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

/**
 * Pulls the content checkout at `dest`. After a conflicting pull it pushes the checkout's unpushed work
 * (`saveCheckoutBeforeClone`) and clones again, or keeps the checkout when that work could not be pushed.
 * Other pull errors are thrown, for `trySyncRepository`'s fallback clone.
 *
 * @returns `true` when the checkout was pulled or cloned again; `false` when it was kept as it is.
 */
export async function pullChanges(url: string, dest: string, auth: GitAuthFactory): Promise<boolean> {
  const tipBeforePull = await readBranchTip(dest);
  try {
    const author = { name: "website" }; // required for git pull for some reason
    await withTimeout(
      git.pull({
        ...auth(),
        fs,
        http,
        url,
        dir: dest,
        author,
        singleBranch: true,
      })
    );
    return true;
  } catch (err) {
    // Handle all conflict types
    const isConflictError =
      err instanceof Errors.MergeConflictError ||
      err instanceof Errors.MergeNotSupportedError ||
      err instanceof Errors.CheckoutConflictError;

    const isBranchError = err instanceof Error &&
      err.message.includes("Could not find master");

    if (isConflictError) {
      console.error("[SYNC] Conflict detected, checking for unpushed work...");

      // Push the unpushed work (uncommitted changes and commits the remote does not have) before a re-clone
      const saved = await saveCheckoutBeforeClone(dest, url, auth, tipBeforePull);

      if (saved === "keep") {
        return false;
      }

      if (saved === "pushed") {
        // Push succeeded, retry pull
        console.log("[SYNC] Push succeeded, retrying pull...");
        try {
          const author = { name: "website" };
          await withTimeout(
            git.pull({
              ...auth(),
              fs,
              http,
              url,
              dir: dest,
              author,
              singleBranch: true,
            })
          );
          return true;
        } catch (retryErr) {
          console.error("[SYNC] Retry pull failed after push, proceeding with reset...", retryErr);
          // Fall through to reset logic below
        }
      }

      // Reset: delete and re-clone (outside a read-only runtime, the unpushed work is on the remote now)
      console.log("[SYNC] Resetting repository from a fresh clone...");
      await cloneRepositoryAtomically(url, dest, auth);
      return true;
    } else if (isBranchError) {
      console.error("Repository branch issue detected, trying to clone fresh...");
      await cloneRepositoryAtomically(url, dest, auth);
      return true;
    } else {
      throw err;
    }
  }
}

/**
 * Pulls (or clones) the content repository.
 *
 * @returns `true` when this call pulled or cloned it; `false` when there is no
 *          repository, the pull was skipped (too soon after the last one) or failed.
 */
export async function trySyncRepository(): Promise<boolean> {
  const token = coreConfig.content.ghToken;
  const url = coreConfig.content.dataRepository;
  const DEFAULT_CONFIG = `site_name: Website
item_name: Item
items_name: Items
copyright_year: ${new Date().getFullYear()}
`;

  // Skip repository sync during build if no DATA_REPOSITORY is configured
  if (!url) {
    console.warn(
      "'DATA_REPOSITORY' is not defined. Content features will be limited."
    );
    // Create an empty content directory to avoid errors
    const { getContentPath } = await import('./lib');
    const dest = getContentPath();
    await fs.promises.mkdir(dest, { recursive: true });
    
    // Create data directory for items (prevents ENOENT errors)
    await fs.promises.mkdir(path.join(dest, 'data'), { recursive: true });

    // Create a minimal .works/works.yml file if no supported config file exists
    const configPath = getPrimaryContentConfigPath(dest);
    if (!(await hasContentConfigFile(dest))) {
      await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
      await fs.promises.writeFile(configPath, DEFAULT_CONFIG);
    }

    return false;
  }

  // Note: Each container clones directly from Git (no copy from build)
  // This ensures all containers get the latest content from the repository
  const { getContentPath } = await import('./lib');
  const dest = getContentPath();
  const auth: GitAuthFactory = () => getGitAuth(token);

  const exists = await fsExists(path.join(dest, ".git"));
  try {
    if (exists && !shouldSync()) {
      return false;
    }
    if (exists) {
      console.log("Pulling repository data...");
      lastSynced = Date.now();
      const updated = await pullChanges(url, dest, auth);
      return updated;
    }
  } catch (error) {
    console.error("Error during repository sync check:", error);
    // Continue with cloning as fallback, once the checkout's unpushed work is on the remote
    if (exists && (await saveCheckoutBeforeClone(dest, url, auth)) === "keep") {
      return false;
    }
  }

  try {
    console.log("Clonning repository...");
    await cloneRepositoryAtomically(url, dest, auth);
    return true;
  } catch (error) {
    console.error("Failed to clone repository:", error);
    console.warn("Continuing with local content only...");

    // Ensure content directory exists with minimal config
    await fs.promises.mkdir(dest, { recursive: true });
    
    // Create data directory for items (prevents ENOENT errors)
    await fs.promises.mkdir(path.join(dest, 'data'), { recursive: true });
    
    const configPath = getPrimaryContentConfigPath(dest);
    if (!(await hasContentConfigFile(dest))) {
      await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
      await fs.promises.writeFile(configPath, DEFAULT_CONFIG);
    }
  }

  return false;
}
