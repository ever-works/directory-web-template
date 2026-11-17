import 'server-only';
import { coreConfig } from '@/lib/config/config-service';

// Types
export type SyncResult = {
  success: boolean;
  message: string;
  details?: string;
  duration?: number;
};

export interface SyncStatus {
  isRunning: boolean;
  lastSyncTime: Date | null;
  lastSyncResult: SyncResult | null;
  nextSyncTime: Date | null;
}

// Configuration
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SYNC_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout
const MAX_RETRIES = 3;
// Content caches are invalidated when the content HEAD moves, and at least this often.
const MAX_INVALIDATION_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Singleton sync manager that handles automatic background synchronization
 * Runs git repository sync every 5 minutes without blocking requests
 */
class SyncManager {
  private syncInProgress = false;
  private lastSyncTime: Date | null = null;
  private lastSyncResult: SyncResult | null = null;
  private retryCount = 0;
  /** Content commit the caches were last invalidated for; see performSync. */
  private lastInvalidatedRevision: string | null = null;
  /** Starts at process start: the hourly safety net first fires an hour after start-up. */
  private lastInvalidatedAt = Date.now();
  private hasSynced = false;
  /** Content commit the location index was last rebuilt for. */
  private lastIndexedRevision: string | null = null;
  /** A rebuild with failed items is retried, but at most this often (see performSync). */
  private indexRetryAt = 0;
  /** Cache tags whose revalidation was skipped (render phase / no request) and must be retried. */
  private tagsPending = false;

  /**
   * Perform a single sync operation with mutex lock and timeout
   */
  async performSync(): Promise<SyncResult> {
    // DEV-MODE FEATURE: Allow disabling auto-sync in development via environment variable
    if (coreConfig.NODE_ENV === 'development' && coreConfig.DISABLE_AUTO_SYNC) {
      console.log('[SYNC_MANAGER] Sync disabled in development mode (DISABLE_AUTO_SYNC=true)');
      return {
        success: true,
        message: 'Sync disabled in development mode',
        details: 'Background sync is skipped (DISABLE_AUTO_SYNC=true)'
      };
    }

    // Prevent concurrent syncs
    if (this.syncInProgress) {
      if (coreConfig.NODE_ENV !== 'development') {
        console.log('[SYNC_MANAGER] Sync already in progress, skipping');
      }
      return {
        success: false,
        message: 'Sync already in progress',
        details: 'Skipped to prevent concurrent sync operations'
      };
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      // DEV-MODE FEATURE: Reduce logging in development mode
      if (coreConfig.NODE_ENV !== 'development') {
        console.log('[SYNC_MANAGER] Starting background repository sync');
      }

      // Dynamic import to prevent webpack from bundling Node.js modules
      const { trySyncRepository } = await import('@/lib/repository');
      const { readGitHeadRevision } = await import('@/lib/content-revision');
      const { getContentPath } = await import('@/lib/lib');
      // HEAD before the pull: lets the first sync after start-up skip the flush when the
      // pull brought nothing (the caches were filled from this same commit).
      const revisionBefore = await readGitHeadRevision(getContentPath());

      // Timeout wrapper
      const syncPromise = trySyncRepository();
      let timeoutHandle: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Sync timeout')), SYNC_TIMEOUT_MS);
      });

      await Promise.race([syncPromise, timeoutPromise]);
      clearTimeout(timeoutHandle!);

      // Success
      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();
      this.retryCount = 0;

      const result: SyncResult = {
        success: true,
        message: 'Repository synchronized successfully',
        details: `Sync completed in ${duration}ms`,
        duration
      };

      this.lastSyncResult = result;

      // DEV-MODE FEATURE: Reduce logging in development mode
      if (coreConfig.NODE_ENV !== 'development') {
        console.log(`[SYNC_MANAGER] Sync completed successfully in ${duration}ms`);
      }

      // Invalidate content caches only when the content checkout moved to another commit
      // since the last invalidation (Spec 061). The sync runs every 5 minutes; flushing every
      // locale's caches on each run, even when the pull brought nothing, kept a 20-locale site
      // cold under crawler load. Content that is not a git checkout (no readable HEAD) is
      // invalidated on every sync, as before.
      const revision = await readGitHeadRevision(getContentPath());
      if (!this.hasSynced) {
        this.hasSynced = true;
        if (revision && revision === revisionBefore) {
          this.lastInvalidatedRevision = revision;
        }
      }
      // Safety net: an edit written to disk whose commit failed leaves HEAD unchanged,
      // so invalidate at least once an hour even when the revision did not move.
      const invalidationDue = Date.now() - this.lastInvalidatedAt >= MAX_INVALIDATION_INTERVAL_MS;
      const contentChanged = !revision || revision !== this.lastInvalidatedRevision || invalidationDue;

      if (contentChanged) {
        const { invalidateContentCaches } = await import('@/lib/cache-invalidation');
        // The in-memory caches are always cleared. Cache tags can be skipped: this timer
        // may run in the context of the render that started it, or outside any request.
        // Those are retried on the following syncs without clearing everything again.
        this.tagsPending = !(await invalidateContentCaches());
        this.lastInvalidatedRevision = revision;
        this.lastInvalidatedAt = Date.now();
        console.log('[SYNC_MANAGER] Content caches invalidated', revision ? `(revision ${revision.slice(0, 12)})` : '');
      } else {
        if (this.tagsPending) {
          const { revalidateContentTags } = await import('@/lib/cache-invalidation');
          this.tagsPending = !revalidateContentTags();
        }
        if (coreConfig.NODE_ENV !== 'development') {
          console.log(`[SYNC_MANAGER] Content unchanged at ${revision!.slice(0, 12)}; caches kept`);
        }
      }

      // Location Index: Rebuild index after content sync (non-blocking)
      try {
        const { getLocationEnabled } = await import('@/lib/utils/settings');
        // Rebuilt for every new commit (independent of cache invalidation). A rebuild that
        // threw is retried on the next sync; one with failed items (e.g. an address that
        // never geocodes) at most hourly, since a rebuild empties the index while it runs.
        const indexOutdated =
          contentChanged ||
          !revision ||
          revision !== this.lastIndexedRevision ||
          (this.indexRetryAt > 0 && Date.now() >= this.indexRetryAt);
        if (indexOutdated && getLocationEnabled()) {
          const { getLocationIndexService } = await import('@/lib/services/location');
          const { ItemRepository } = await import('@/lib/repositories/item.repository');

          const locationIndexService = getLocationIndexService();
          const itemRepository = new ItemRepository();
          const allItems = await itemRepository.findAll();

          const rebuildResult = await locationIndexService.rebuildIndex(allItems);
          this.lastIndexedRevision = revision;
          this.indexRetryAt = rebuildResult.failed > 0 ? Date.now() + MAX_INVALIDATION_INTERVAL_MS : 0;
          console.log('[SYNC_MANAGER] Location index rebuilt', {
            indexed: rebuildResult.indexed,
            skipped: rebuildResult.skipped,
            failed: rebuildResult.failed,
            durationMs: rebuildResult.durationMs,
          });
        }
      } catch (locationError) {
        console.error('[SYNC_MANAGER] Failed to rebuild location index', {
          error: locationError instanceof Error ? locationError.message : String(locationError),
        });
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';

      // DEV-MODE FEATURE: Always log errors regardless of environment
      console.error(`[SYNC_MANAGER] Sync failed after ${duration}ms:`, error);

      const result: SyncResult = {
        success: false,
        message: 'Repository synchronization failed',
        details: `${errorMessage} (attempt ${this.retryCount + 1}/${MAX_RETRIES})`,
        duration
      };

      this.lastSyncResult = result;

      // Retry logic
      if (this.retryCount < MAX_RETRIES) {
        this.retryCount++;
        if (coreConfig.NODE_ENV !== 'development') {
          console.log(`[SYNC_MANAGER] Scheduling retry ${this.retryCount}/${MAX_RETRIES} in 10 seconds`);
        }
        setTimeout(() => this.performSync(), 10000);
      } else {
        console.error(`[SYNC_MANAGER] Max retries (${MAX_RETRIES}) reached, giving up`);
        this.retryCount = 0;
      }

      return result;

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      isRunning: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      lastSyncResult: this.lastSyncResult,
      nextSyncTime: this.lastSyncTime
        ? new Date(this.lastSyncTime.getTime() + SYNC_INTERVAL_MS)
        : null
    };
  }

  /**
   * Manually trigger a sync (for admin API)
   */
  async triggerManualSync(): Promise<SyncResult> {
    if (coreConfig.NODE_ENV !== 'development') {
      console.log('[SYNC_MANAGER] Manual sync triggered');
    }
    return await this.performSync();
  }
}

// Singleton instance
export const syncManager = new SyncManager();

// Export convenience functions
export const getSyncStatus = (): SyncStatus => syncManager.getStatus();
export const triggerManualSync = (): Promise<SyncResult> => syncManager.triggerManualSync();
