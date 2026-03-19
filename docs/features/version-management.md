---
id: version-management
title: Version Management
sidebar_label: Version Management
sidebar_position: 15
---

# Version Management

The Ever Works Template includes a version management system that tracks the data repository version, displays version information to administrators, and provides automatic synchronization detection. This system monitors the Git-based CMS content repository and presents version details through configurable UI components.

## Architecture Overview

| Component | Path | Purpose |
|---|---|---|
| `useVersionInfo` | `hooks/use-version-info.ts` | React Query hook for fetching version data from the API |
| `useVersionInfoUtils` | `hooks/use-version-info.ts` | Utility hook for cache management |
| `VersionDisplay` | `components/version/version-display.tsx` | Configurable version display component |
| `VersionTooltip` | `components/version/version-tooltip.tsx` | Hover tooltip showing detailed version info |
| `/api/version` | `app/api/version/route.ts` | API endpoint returning current version data |

## Version Info Data Structure

The version system tracks the following data from the content repository:

| Field | Type | Description |
|---|---|---|
| `commit` | `string` | Short commit hash of the current data version |
| `date` | `string` | ISO date string of the commit |
| `author` | `string` | Commit author name |
| `message` | `string` | Commit message |
| `repository` | `string` | Repository URL |
| `lastSync` | `string` | Timestamp of the last data synchronization |

## The `useVersionInfo` Hook

### Interface

```tsx
interface UseVersionInfoOptions {
  refreshInterval?: number;    // Auto-refresh interval in ms (default: 5 min)
  retryOnError?: boolean;      // Retry on failures (default: true)
  enabled?: boolean;           // Enable/disable the query (default: true)
}

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

### Usage

```tsx
import { useVersionInfo } from '@/hooks/use-version-info';

function VersionIndicator() {
  const { versionInfo, isLoading, error } = useVersionInfo({
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    retryOnError: true
  });

  if (isLoading) return <span>Loading...</span>;
  if (error) return <span>Version unavailable</span>;

  return <span>v{versionInfo?.commit}</span>;
}
```

### Caching Strategy

| Setting | Value | Description |
|---|---|---|
| `staleTime` | 5 minutes | Data considered fresh for 5 minutes |
| `gcTime` | 30 minutes | Garbage collection after 30 minutes |
| `refetchOnWindowFocus` | `false` | No refetch on tab switch |
| `refetchOnReconnect` | `true` | Refetch when network reconnects |
| `refetchOnMount` | `false` | Skip refetch if cache has data |

### Retry Logic

The hook implements intelligent retry with exponential backoff:

- Does not retry on client errors (4xx status codes)
- Retries network and server errors up to 2 times
- Uses exponential backoff: `min(1000 * 2^attempt, 30000ms)`

## Version Display Component

The `VersionDisplay` component supports three visual variants:

### Inline Variant (Default)

A compact inline display showing the commit hash and relative time:

```tsx
<VersionDisplay variant="inline" />
// Output: v abc1234 . 2h ago .
```

### Badge Variant

A pill-shaped badge with gradient background:

```tsx
<VersionDisplay variant="badge" />
// Output: [git-icon] v abc1234 . 2h ago
```

### Detailed Variant

A card with full version information:

```tsx
<VersionDisplay
  variant="detailed"
  showDetails={true}
  refreshInterval={10 * 60 * 1000}
/>
```

The detailed variant shows:
- Commit hash and relative time
- Author name
- Commit message (first line, quoted)
- Last update timestamp (when `showDetails` is true)
- Last sync timestamp
- Repository name

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` | `""` | Additional CSS classes |
| `variant` | `"inline" \| "badge" \| "detailed"` | `"inline"` | Display style |
| `showDetails` | `boolean` | `false` | Show extended details (detailed variant only) |
| `refreshInterval` | `number` | `300000` (5 min) | Auto-refresh interval in milliseconds |

### Access Control

The component respects user roles:
- **Regular users**: Component is hidden when version info is unavailable
- **Dev/Admin users**: Error state is shown with "Version unavailable" message

```tsx
const isDevOrAdmin = useIsDevOrAdmin();

if (error || !versionInfo) {
  if (!isDevOrAdmin) return null;  // Hide for regular users
  return <span>Version unavailable</span>;  // Show error for admins
}
```

## Version Tooltip

The `VersionTooltip` wraps any element with a hover tooltip displaying detailed version information:

```tsx
import { VersionTooltip } from '@/components/version/version-tooltip';

function Footer() {
  return (
    <VersionTooltip delay={300}>
      <span>Data v1.0</span>
    </VersionTooltip>
  );
}
```

### Tooltip Features

| Feature | Description |
|---|---|
| Delayed show | Configurable delay before tooltip appears (default: 300ms) |
| Quick hide | 100ms delay on mouse leave for smooth interaction |
| Tooltip hover | Tooltip stays visible when hovering over it |
| Keyboard support | Escape key dismisses the tooltip |
| Accessibility | ARIA attributes (`role="tooltip"`, `aria-describedby`) |
| Graceful degradation | Returns children without tooltip when data is unavailable |

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | required | The trigger element |
| `className` | `string` | `""` | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disable tooltip entirely |
| `delay` | `number` | `300` | Show delay in milliseconds |

## Cache Utilities

The `useVersionInfoUtils` hook provides cache management functions:

```tsx
import { useVersionInfoUtils } from '@/hooks/use-version-info';

function AdminPanel() {
  const {
    prefetchVersionInfo,
    invalidateVersionInfo,
    getVersionInfoFromCache,
    setVersionInfoInCache
  } = useVersionInfoUtils();

  // Prefetch version data before it is needed
  useEffect(() => {
    prefetchVersionInfo();
  }, []);

  // Force refresh
  const handleRefresh = () => invalidateVersionInfo();

  // Read directly from cache
  const cached = getVersionInfoFromCache();
}
```

## Date Formatting

The `VersionDisplay` component includes memoized date formatting utilities:

| Function | Example Output |
|---|---|
| `formatDate` | "Jan 15, 2025, 02:30 PM" |
| `getRelativeTime` | "Just now", "3h ago", "2d ago", "Jan 15" |
| `getRepositoryName` | "ever-works/awesome-time-tracking-data" |

## Key Files

| File | Path |
|---|---|
| Version Info Hook | `hooks/use-version-info.ts` |
| Version Display | `components/version/version-display.tsx` |
| Version Tooltip | `components/version/version-tooltip.tsx` |
| Version API Route | `app/api/version/route.ts` |
