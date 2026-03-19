---
id: use-version-info-reference
title: useVersionInfo Hook Reference
sidebar_label: useVersionInfo
sidebar_position: 93
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useVersionInfo

Hooks for fetching and managing application version information from the `/api/version` endpoint. Includes the primary data-fetching hook and a utility hook for cache management.

**Source file:** `template/hooks/use-version-info.ts`

## Overview

`useVersionInfo` provides real-time version information about the deployed application, including the latest commit hash, date, author, and repository details. It uses TanStack Query for caching with configurable refresh intervals and intelligent retry logic. The companion `useVersionInfoUtils` hook offers cache management utilities for prefetching, invalidating, and directly reading/writing version data in the query cache.

## Exported Members

| Export | Kind | Purpose |
|--------|------|---------|
| `useVersionInfo` | Function (hook) | Primary hook for fetching version info with auto-refresh |
| `useVersionInfoUtils` | Function (hook) | Cache management utilities (prefetch, invalidate, get/set cache) |
| `VERSION_INFO_QUERY_KEY` | Constant | TanStack Query key: `['version-info']` |

---

## useVersionInfo

```ts
function useVersionInfo(options?: UseVersionInfoOptions): UseVersionInfoReturn
```

### Options

```ts
interface UseVersionInfoOptions {
  refreshInterval?: number;   // Auto-refresh interval in ms (default: 300000 / 5 min)
  retryOnError?: boolean;     // Enable retry on failure (default: true)
  enabled?: boolean;          // Enable/disable the query (default: true)
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `refreshInterval` | `number` | `300000` (5 min) | Interval for automatic refetching. Set to `0` to disable. |
| `retryOnError` | `boolean` | `true` | Whether to retry on network/server errors |
| `enabled` | `boolean` | `true` | Whether the query should execute |

### Return Value

```ts
interface UseVersionInfoReturn {
  versionInfo: VersionInfo | null;
  isLoading: boolean;
  isError: boolean;
  error: UseVersionInfoError | null;
  refetch: () => Promise<any>;
  isStale: boolean;
  dataUpdatedAt: number;
  invalidateVersionInfo: () => Promise<void>;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `versionInfo` | `VersionInfo \| null` | The version data, or `null` if not yet loaded |
| `isLoading` | `boolean` | `true` while the initial fetch is in progress |
| `isError` | `boolean` | `true` if the query has errored |
| `error` | `UseVersionInfoError \| null` | Error details including message and optional HTTP status |
| `refetch` | `() => Promise<any>` | Manually trigger a refetch |
| `isStale` | `boolean` | Whether the cached data is considered stale |
| `dataUpdatedAt` | `number` | Timestamp of when data was last successfully fetched |
| `invalidateVersionInfo` | `() => Promise<void>` | Invalidate the cache, triggering a refetch |

### VersionInfo Type

```ts
interface VersionInfo {
  commit: string;
  date: string;
  message: string;
  author: string;
  repository: string;
  lastSync: string;
  branch?: string;
}
```

### Error Type

```ts
interface UseVersionInfoError {
  message: string;
  status?: number;
}
```

### Cache Configuration

| Setting | Value |
|---------|-------|
| Query key | `['version-info']` |
| `staleTime` | 5 minutes |
| `gcTime` | 30 minutes |
| `refetchOnWindowFocus` | `false` |
| `refetchOnReconnect` | `true` |
| `refetchOnMount` | `false` |
| Retry | Up to 2 attempts for server/network errors; no retry for 4xx client errors |
| Retry delay | Exponential backoff, capped at 30 seconds |

### Data Validation

The hook validates the API response, requiring that `commit`, `date`, and `author` fields are present. If validation fails, a `422` status error is thrown.

---

## useVersionInfoUtils

Utility hook for managing the version info query cache across the application.

```ts
function useVersionInfoUtils(): {
  prefetchVersionInfo: () => Promise<void>;
  invalidateVersionInfo: () => Promise<void>;
  getVersionInfoFromCache: () => VersionInfo | undefined;
  setVersionInfoInCache: (versionInfo: VersionInfo) => void;
}
```

### Return Value

| Method | Description |
|--------|-------------|
| `prefetchVersionInfo` | Prefetch version info into the query cache (respects `staleTime`) |
| `invalidateVersionInfo` | Invalidate the cached version data, triggering a background refetch |
| `getVersionInfoFromCache` | Synchronously read the current version info from the cache |
| `setVersionInfoInCache` | Directly set version info in the cache (useful for optimistic updates) |

## Usage Examples

### Display version info in a footer

```tsx
import { useVersionInfo } from '@/hooks/use-version-info';

function AppFooter() {
  const { versionInfo, isLoading } = useVersionInfo();

  if (isLoading || !versionInfo) {
    return <span>Loading version...</span>;
  }

  return (
    <footer>
      <p>
        Version: {versionInfo.commit.slice(0, 7)} |
        Last updated: {new Date(versionInfo.date).toLocaleDateString()} |
        By: {versionInfo.author}
      </p>
    </footer>
  );
}
```

### With custom refresh interval

```tsx
const { versionInfo } = useVersionInfo({
  refreshInterval: 60 * 1000, // Refresh every minute
  retryOnError: true,
});
```

### Disable auto-fetching

```tsx
const { versionInfo, refetch } = useVersionInfo({
  enabled: false,
});

// Manually fetch when needed
const handleRefresh = () => refetch();
```

### Prefetch on layout mount

```tsx
import { useVersionInfoUtils } from '@/hooks/use-version-info';

function AppLayout({ children }) {
  const { prefetchVersionInfo } = useVersionInfoUtils();

  useEffect(() => {
    prefetchVersionInfo();
  }, [prefetchVersionInfo]);

  return <main>{children}</main>;
}
```

### Read version from cache without triggering a fetch

```tsx
import { useVersionInfoUtils } from '@/hooks/use-version-info';

function DebugPanel() {
  const { getVersionInfoFromCache } = useVersionInfoUtils();
  const cached = getVersionInfoFromCache();

  return cached
    ? <pre>{JSON.stringify(cached, null, 2)}</pre>
    : <p>No version info in cache</p>;
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | Query caching, refetching, and retry logic |
| `@/lib/api/server-api-client` | `serverClient` for making API requests, `apiUtils` for response handling |
| `/api/version` | Server endpoint that returns `VersionInfo` data |

## Related Hooks

- [`useCurrentUser`](/template/hooks/use-current-user-reference) -- Similar TanStack Query pattern for user data
- [`useFeatureFlags`](/template/hooks/use-feature-flags-reference) -- Similar server-fetched config pattern
