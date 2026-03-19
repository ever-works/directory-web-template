---
id: sync-service
title: Sync Service
sidebar_label: Sync Service
sidebar_position: 13
---

# Sync Service

The template includes a background synchronization service that keeps the local Git-based content repository in sync with the remote GitHub repository. The `SyncManager` runs periodic pulls, invalidates content caches after changes, and rebuilds the location index.

## Overview

The sync service is implemented as a singleton `SyncManager` class that provides:

- Automatic background repository synchronization
- Mutex locking to prevent concurrent syncs
- Timeout protection for long-running operations
- Retry logic with configurable limits
- Content cache invalidation after successful sync
- Location index rebuilding after content changes
- Manual sync trigger for admin API integration

```
lib/services/
  sync-service.ts    # SyncManager singleton
```

## Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| Sync interval | 5 minutes | Time between automatic sync cycles |
| Sync timeout | 5 minutes | Maximum time for a single sync operation |
| Max retries | 3 | Number of retry attempts on failure |
| Retry delay | 10 seconds | Fixed delay between retries |

## Sync Flow

Each sync operation follows this sequence:

```
1. Check dev-mode bypass (DISABLE_AUTO_SYNC)
2. Acquire mutex lock (prevent concurrent syncs)
3. Pull latest changes from GitHub via trySyncRepository()
4. Invalidate content caches
5. Rebuild location index (if location features enabled)
6. Release mutex lock
```

### Success Path

On successful sync, the service:

1. Records the sync time and duration
2. Resets the retry counter to zero
3. Calls `invalidateContentCaches()` to clear stale data
4. Rebuilds the location index by fetching all items and calling `locationIndexService.rebuildIndex()`

### Failure Path

On sync failure, the service:

1. Logs the error with duration
2. Increments the retry counter
3. Schedules a retry after 10 seconds (up to 3 retries)
4. After max retries, resets the counter and stops retrying

## Usage

### Getting Sync Status

```typescript
import { getSyncStatus } from '@/lib/services/sync-service';

const status = getSyncStatus();
// {
//   isRunning: false,
//   lastSyncTime: Date,
//   lastSyncResult: {
//     success: true,
//     message: 'Repository synchronized successfully',
//     details: 'Sync completed in 1250ms',
//     duration: 1250
//   },
//   nextSyncTime: Date
// }
```

### Manual Sync

```typescript
import { triggerManualSync } from '@/lib/services/sync-service';

const result = await triggerManualSync();
// { success: true, message: '...', details: '...', duration: 1250 }
```

Manual sync uses the same `performSync()` method as automatic sync, including all guards, timeouts, and retry logic.

### Direct Manager Access

```typescript
import { syncManager } from '@/lib/services/sync-service';

// Get status
const status = syncManager.getStatus();

// Trigger sync
const result = await syncManager.triggerManualSync();
```

## Types

### SyncResult

```typescript
interface SyncResult {
  success: boolean;
  message: string;
  details?: string;
  duration?: number;
}
```

### SyncStatus

```typescript
interface SyncStatus {
  isRunning: boolean;
  lastSyncTime: Date | null;
  lastSyncResult: SyncResult | null;
  nextSyncTime: Date | null;
}
```

## Concurrency Protection

The `syncInProgress` flag acts as a mutex lock:

- If a sync is already running when another is requested, the second request returns immediately with `{ success: false, message: 'Sync already in progress' }`
- The flag is always released in a `finally` block to prevent deadlocks
- In development mode, the "already in progress" skip is logged silently to reduce noise

## Development Mode

Two development-specific behaviors reduce noise during local development:

| Feature | Environment Check | Effect |
|---------|-------------------|--------|
| Sync disable | `DISABLE_AUTO_SYNC=true` | Skips sync entirely, returns success |
| Quiet logging | `NODE_ENV=development` | Suppresses routine sync start/complete logs |

Error logs are always printed regardless of environment.

## Post-Sync Operations

### Cache Invalidation

After every successful sync, `invalidateContentCaches()` is called to ensure the application serves fresh data. This function is dynamically imported to prevent webpack from bundling Node.js modules in client-side code.

### Location Index Rebuild

If location features are enabled (checked via `getLocationEnabled()`), the sync service:

1. Gets the `LocationIndexService` singleton
2. Fetches all items from the `ItemRepository`
3. Calls `rebuildIndex()` with the full item list
4. Logs the rebuild results (indexed, skipped, failed, duration)

Location index rebuilding is wrapped in a try-catch to prevent index errors from affecting the sync result. The rebuild runs synchronously within the sync flow (not in the background).

## Dynamic Imports

The sync service uses dynamic `import()` for all heavy dependencies:

```typescript
const { trySyncRepository } = await import('@/lib/repository');
const { invalidateContentCaches } = await import('@/lib/cache-invalidation');
const { getLocationEnabled } = await import('@/lib/utils/settings');
const { getLocationIndexService } = await import('@/lib/services/location');
const { ItemRepository } = await import('@/lib/repositories/item.repository');
```

This prevents webpack from bundling these server-only modules into client-side code and reduces the initial module load time.

## Integration with Admin API

The sync service is typically exposed through an admin API endpoint for manual triggering:

```typescript
// Example API route handler
import { triggerManualSync, getSyncStatus } from '@/lib/services/sync-service';

export async function POST() {
  const result = await triggerManualSync();
  return Response.json(result);
}

export async function GET() {
  const status = getSyncStatus();
  return Response.json(status);
}
```

## Source Files

| File | Path |
|------|------|
| Sync Service | `template/lib/services/sync-service.ts` |
| Repository Sync | `template/lib/repository.ts` |
| Cache Invalidation | `template/lib/cache-invalidation.ts` |
