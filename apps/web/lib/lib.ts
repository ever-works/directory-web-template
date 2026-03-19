import 'server-only';

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

export function getContentPath() {
    const contentDir = '.content';

    // During build phase on Vercel, use source directory directly
    // At runtime, use /tmp because build artifact is read-only
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

    if (process.env.VERCEL && !isBuildPhase) {
        return path.join(os.tmpdir(), contentDir);
    }

    return path.join(process.cwd(), contentDir);
}

// Use globalThis for singleton state to persist across module reloads in serverless
const CONTENT_INIT_KEY = '__CONTENT_INIT__' as const;

interface ContentInitState {
    initialized: boolean;
    promise: Promise<string> | null;
}

function getContentInitState(): ContentInitState {
    const g = globalThis as typeof globalThis & { [CONTENT_INIT_KEY]?: ContentInitState };
    if (!g[CONTENT_INIT_KEY]) {
        g[CONTENT_INIT_KEY] = {
            initialized: false,
            promise: null
        };
    }
    return g[CONTENT_INIT_KEY];
}

/**
 * Check if content directory has actual content (not just empty directory)
 */
async function hasContentFiles(contentPath: string): Promise<boolean> {
    try {
        // Check for config.yml as indicator that content exists
        await fs.access(path.join(contentPath, 'config.yml'));
        return true;
    } catch {
        return false;
    }
}

/**
 * Ensures content directory is available at runtime.
 * 
 * ARCHITECTURE (Clone Instead of Copy):
 * - On Vercel: Returns /tmp/.content path. Content is cloned from Git on first access.
 * - Locally: Returns .content path directly.
 * - NO COPYING from build artifact - each container clones fresh from Git.
 * 
 * Benefits:
 * - All containers get latest content from Git (not stale build artifact)
 * - No slow copy operation on startup
 * - Git is the single source of truth
 * 
 * Flow:
 * 1. First request to cold container calls this function
 * 2. If content doesn't exist, triggers trySyncRepository() to clone from Git
 * 3. Subsequent requests use cached content (fast)
 * 
 * @returns Promise<string> - The content path to use
 */
export async function ensureContentAvailable(): Promise<string> {
    const state = getContentInitState();

    // If already initialized and has content, return immediately
    if (state.initialized) {
        return getContentPath();
    }

    // If initialization is in progress, wait for it
    if (state.promise) {
        return state.promise;
    }

    // Start initialization
    state.promise = (async () => {
        const contentPath = getContentPath();

        // Ensure directory exists
        try {
            await fs.mkdir(contentPath, { recursive: true });
        } catch {
            // Directory might already exist, that's fine
        }

        // Check if content actually exists (not just empty directory)
        const hasContent = await hasContentFiles(contentPath);
        
        if (!hasContent) {
            // Content doesn't exist - need to clone from Git
            // This happens on first request to a cold container
            console.log('[CONTENT] No content found, triggering repository sync...');
            
            try {
                // Dynamic import to avoid circular dependencies
                const { trySyncRepository } = await import('./repository');
                await trySyncRepository();
                console.log('[CONTENT] Repository sync completed');
            } catch (error) {
                console.error('[CONTENT] Repository sync failed:', error);
                // Don't throw - let the caller handle missing content gracefully
            }
        }

        state.initialized = true;
        return contentPath;
    })();

    return state.promise;
}

export async function fsExists(filepath: string): Promise<boolean> {
    try {
        await fs.access(filepath);
        return true;
    } catch {
        return false;
    }
}

export async function dirExists(dirpath: string) {
    try {
        const stat = await fs.stat(dirpath);
        return stat.isDirectory();
    } catch (err) {
        if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            return false;
        }
        throw err;
    }
}
