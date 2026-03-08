---
id: use-feature-flag-reference
title: useFeatureFlag Hook Reference
sidebar_label: useFeatureFlag
sidebar_position: 97
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useFeatureFlag

A hook that checks a single feature flag through the analytics provider, with automatic polling for real-time flag updates.

**Source file:** `template/hooks/use-feature-flag.ts`

## Overview

`useFeatureFlag` provides a simple way to check whether a specific feature flag is enabled via the analytics provider (e.g., PostHog). It initializes with a default value, checks the flag immediately on mount, and then polls every 30 seconds for updates. This makes it suitable for feature flags that may change at runtime without requiring a page reload.

Unlike `useFeatureFlags` (which fetches server-side flags via an API endpoint), this hook communicates directly with the analytics SDK's feature flag system.

## Signature

```ts
function useFeatureFlag(flagKey: string, defaultValue?: boolean): boolean
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `flagKey` | `string` | -- | The feature flag key to check (must match the key in your analytics provider) |
| `defaultValue` | `boolean` | `false` | The value to use before the flag is resolved and as the initial state |

## Return Value

`boolean` -- `true` if the feature flag is enabled, `false` otherwise. Returns `defaultValue` until the first check completes.

## Implementation Details

### Lifecycle

1. **Initial state**: The hook initializes `isEnabled` state to `defaultValue`.
2. **Immediate check**: On mount (and when `flagKey` or `defaultValue` changes), the flag is checked via `analytics.isFeatureEnabled(flagKey, defaultValue)`.
3. **Polling**: A `setInterval` runs every 30 seconds to re-check the flag value, allowing the UI to react to flag changes without a page reload.
4. **Cleanup**: The interval is cleared when the component unmounts or when dependencies change.

### Analytics Integration

The hook delegates to `analytics.isFeatureEnabled()` from `@/lib/analytics`. This function is expected to return a boolean indicating whether the flag is enabled. The analytics module must be initialized with a provider that supports feature flags (such as PostHog).

### Polling Interval

The polling interval is hardcoded at **30 seconds** (30,000 ms). This provides a reasonable balance between responsiveness and API load.

## Usage Examples

### Basic feature gating

```tsx
import { useFeatureFlag } from '@/hooks/use-feature-flag';

function NewFeatureBanner() {
  const showBanner = useFeatureFlag('new-feature-banner', false);

  if (!showBanner) return null;

  return (
    <div className="bg-blue-100 p-4 rounded">
      Try our new feature!
    </div>
  );
}
```

### A/B testing a component variant

```tsx
import { useFeatureFlag } from '@/hooks/use-feature-flag';

function SearchBar() {
  const useNewSearch = useFeatureFlag('enhanced-search', false);

  return useNewSearch
    ? <EnhancedSearchBar />
    : <BasicSearchBar />;
}
```

### With default enabled

```tsx
// Feature defaults to enabled, can be remotely disabled
const maintenanceMode = useFeatureFlag('maintenance-mode', false);
const betaFeatures = useFeatureFlag('beta-features', true);
```

### Conditional data loading

```tsx
function AnalyticsDashboard() {
  const showAdvancedMetrics = useFeatureFlag('advanced-metrics', false);

  const { data } = useQuery({
    queryKey: ['metrics', showAdvancedMetrics],
    queryFn: () => fetchMetrics({ advanced: showAdvancedMetrics }),
  });

  return (
    <div>
      <BasicMetrics data={data} />
      {showAdvancedMetrics && <AdvancedMetrics data={data} />}
    </div>
  );
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `@/lib/analytics` | Provides the `analytics.isFeatureEnabled()` method for flag evaluation |

## Comparison with useFeatureFlags

| Aspect | `useFeatureFlag` | `useFeatureFlags` |
|--------|-----------------|------------------|
| Source | Analytics provider (e.g., PostHog) | Server API endpoint |
| Scope | Single flag | All flags at once |
| Caching | Local state with polling | TanStack Query cache |
| Update mechanism | 30-second polling interval | Cache-based with stale time |
| Best for | Analytics-driven feature flags | Server-configured feature toggles |

## Related Hooks

- [`useFeatureFlags`](/docs/template/hooks/use-feature-flags-reference) -- Server-fetched feature flags via TanStack Query
- [`useFeatureFlagsWithSimulation`](/docs/template/hooks/use-feature-flags-with-simulation-reference) -- Feature flags with database simulation mode
- [`useAnalytics`](/docs/template/hooks/use-analytics-reference) -- Analytics tracking and event management
