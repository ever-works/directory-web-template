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
	backgroundSyncStarted: boolean;
}

function getContentInitState(): ContentInitState {
	const g = globalThis as typeof globalThis & { [CONTENT_INIT_KEY]?: ContentInitState };
	if (!g[CONTENT_INIT_KEY]) {
		g[CONTENT_INIT_KEY] = {
			initialized: false,
			promise: null,
			backgroundSyncStarted: false
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

function getBundledContentPath() {
	return path.join(process.cwd(), '.content');
}

async function seedContentFromBundledCopy(runtimeContentPath: string): Promise<boolean> {
	const bundledContentPath = getBundledContentPath();

	if (bundledContentPath === runtimeContentPath) {
		return false;
	}

	const bundledHasContent = await hasContentFiles(bundledContentPath);
	if (!bundledHasContent) {
		return false;
	}

	await fs.mkdir(runtimeContentPath, { recursive: true });
	await fs.cp(bundledContentPath, runtimeContentPath, { recursive: true, force: true });
	console.log('[CONTENT] Seeded runtime content from bundled deployment copy');
	return true;
}

function triggerBackgroundContentSync(state: ContentInitState): void {
	if (state.backgroundSyncStarted) {
		return;
	}

	state.backgroundSyncStarted = true;

	setTimeout(() => {
		void (async () => {
			try {
				const { syncManager } = await import('@/lib/services/sync-service');
				await syncManager.performSync();
			} catch (error) {
				console.error('[CONTENT] Background repository sync failed:', error);
			}
		})();
	}, 0);
}

/**
 * Ensures content directory is available at runtime.
 *
 * ARCHITECTURE (Seed Then Sync):
 * - On Vercel at runtime: Use /tmp/.content for writable content access.
 * - If /tmp/.content is empty, seed it from the bundled build-time .content copy when available.
 * - After seeding, trigger repository sync in the background for freshness.
 * - Locally: Return .content path directly.
 *
 * Benefits:
 * - Cold starts can serve content immediately without waiting on Git network operations.
 * - Containers still converge to the latest repository state shortly after startup.
 * - If no bundled content is available, the previous blocking sync fallback is preserved.
 *
 * Flow:
 * 1. First request to a cold container checks the writable runtime content directory.
 * 2. If it is empty, seed from the bundled deployment copy when available.
 * 3. Trigger background sync for freshness.
 * 4. Only fall back to blocking Git sync when no content is available at all.
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
		let hasContent = await hasContentFiles(contentPath);

		if (!hasContent) {
			const seededFromBundle = await seedContentFromBundledCopy(contentPath);

			if (seededFromBundle) {
				hasContent = true;
				triggerBackgroundContentSync(state);
			}
		}

		if (!hasContent) {
			// No bundled content is available, so keep the blocking sync fallback
			// to avoid serving an empty site on first access.
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
