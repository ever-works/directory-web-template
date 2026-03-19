import 'server-only';

import git, { GitAuth, Errors } from "isomorphic-git";
import * as http from "isomorphic-git/http/node";
import * as path from "node:path";
import * as fs from "node:fs";
import { fsExists } from "./lib";
import { coreConfig } from "@/lib/config/config-service";

function getGitAuth(token?: string): GitAuth {
  if (!token) {
    return {};
  }
  return { username: "x-access-token", password: token };
}

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
 * Check if there are uncommitted local changes in the repository
 */
async function checkForLocalChanges(dir: string): Promise<boolean> {
  try {
    const status = await git.statusMatrix({ fs, dir });
    // Status matrix: [filepath, HEAD, WORKDIR, STAGE]
    // If HEAD !== WORKDIR or HEAD !== STAGE, there are changes
    return status.some(([, head, workdir, stage]) =>
      head !== workdir || head !== stage
    );
  } catch (error) {
    console.error("[SYNC] Failed to check local changes:", error);
    return false; // Assume no changes on error
  }
}

/**
 * Attempt to commit and push local changes
 */
async function tryPushLocalChanges(
  dir: string,
  url: string,
  auth: GitAuth
): Promise<boolean> {
  try {
    // Stage all changes
    await git.add({ fs, dir, filepath: '.' });

    // Commit
    const author = {
      name: 'Website Bot',
      email: 'bot@ever.works'
    };
    await git.commit({
      fs,
      dir,
      message: `[Auto] Save local changes before sync - ${new Date().toISOString()}`,
      author,
      committer: author,
    });

    // Push
    await withTimeout(
      git.push({ onAuth: () => auth, fs, http, dir, url }),
      60000 // 1 minute timeout for push
    );

    return true;
  } catch (error) {
    console.error("[SYNC] Failed to push local changes:", error);
    return false;
  }
}

export async function pullChanges(url: string, dest: string, auth: GitAuth) {
  try {
    const author = { name: "website" }; // required for git pull for some reason
    await withTimeout(
      git.pull({
        onAuth: () => auth,
        fs,
        http,
        url,
        dir: dest,
        author,
        singleBranch: true,
      })
    );
  } catch (err) {
    // Handle all conflict types
    const isConflictError =
      err instanceof Errors.MergeConflictError ||
      err instanceof Errors.MergeNotSupportedError ||
      err instanceof Errors.CheckoutConflictError;

    const isBranchError = err instanceof Error &&
      err.message.includes("Could not find master");

    if (isConflictError) {
      console.error("[SYNC] Conflict detected, checking for local changes...");

      // Check if there are uncommitted local changes
      const hasLocalChanges = await checkForLocalChanges(dest);

      if (hasLocalChanges) {
        console.log("[SYNC] Found local changes, attempting to push first...");
        const pushSuccess = await tryPushLocalChanges(dest, url, auth);

        if (pushSuccess) {
          // Push succeeded, retry pull
          console.log("[SYNC] Push succeeded, retrying pull...");
          try {
            const author = { name: "website" };
            await withTimeout(
              git.pull({
                onAuth: () => auth,
                fs,
                http,
                url,
                dir: dest,
                author,
                singleBranch: true,
              })
            );
            return;
          } catch (retryErr) {
            console.error("[SYNC] Retry pull failed after push, proceeding with reset...", retryErr);
            // Fall through to reset logic below
          }
        } else {
          console.warn("[SYNC] Push failed, local changes will be lost. Proceeding with reset...");
        }
      }

      // Reset: delete and re-clone
      console.log("[SYNC] Resetting repository...");
      await fs.promises.rm(dest, { recursive: true });
      await fs.promises.mkdir(dest, { recursive: true });
      await withTimeout(
        git.clone({
          onAuth: () => auth,
          fs,
          http,
          url,
          dir: dest,
          singleBranch: true,
        })
      );
    } else if (isBranchError) {
      console.error("Repository branch issue detected, trying to clone fresh...");
      await fs.promises.rm(dest, { recursive: true });
      await fs.promises.mkdir(dest, { recursive: true });
      await withTimeout(
        git.clone({
          onAuth: () => auth,
          fs,
          http,
          url,
          dir: dest,
          singleBranch: true,
        })
      );
    } else {
      throw err;
    }
  }
}

export async function trySyncRepository() {
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

    // Create a minimal config.yml file if it doesn't exist
    const configPath = path.join(dest, "config.yml");
    if (!(await fsExists(configPath))) {
      await fs.promises.writeFile(configPath, DEFAULT_CONFIG);
    }

    return;
  }

  // Note: Each container clones directly from Git (no copy from build)
  // This ensures all containers get the latest content from the repository
  const { getContentPath } = await import('./lib');
  const dest = getContentPath();
  const auth = getGitAuth(token);

  const exists = await fsExists(path.join(dest, ".git"));
  try {
    if (exists && !shouldSync()) {
      return;
    }
    if (exists) {
      console.log("Pulling repository data...");
      lastSynced = Date.now();
      await pullChanges(url, dest, auth);
      return;
    }
  } catch (error) {
    console.error("Error during repository sync check:", error);
    // Continue with cloning as fallback
  }

  try {
    console.log("Clonning repository...");
    await fs.promises.mkdir(dest, { recursive: true });
    await withTimeout(
      git.clone({
        onAuth: () => auth,
        fs,
        http,
        url,
        dir: dest,
        singleBranch: true,
      })
    );
  } catch (error) {
    console.error("Failed to clone repository:", error);
    console.warn("Continuing with local content only...");

    // Ensure content directory exists with minimal config
    await fs.promises.mkdir(dest, { recursive: true });
    
    // Create data directory for items (prevents ENOENT errors)
    await fs.promises.mkdir(path.join(dest, 'data'), { recursive: true });
    
    const configPath = path.join(dest, "config.yml");
    if (!(await fsExists(configPath))) {
      await fs.promises.writeFile(configPath, DEFAULT_CONFIG);
    }
  }

  return;
}
