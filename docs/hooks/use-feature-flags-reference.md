---
id: use-feature-flags-reference
title: Feature Flag Hooks Reference
sidebar_label: useFeatureFlags
sidebar_position: 31
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Feature Flag Hooks

A family of hooks for managing feature availability in client components. Supports server-fetched flags, client-side polling, and database simulation mode for demo/testing scenarios.

**Source files:**
- `template/hooks/use-feature-flag.ts` -- Single flag via analytics polling
- `template/hooks/use-feature-flags.ts` -- Server-fetched flags via TanStack Query
- `template/hooks/use-feature-flags-with-simulation.ts` -- Flags with simulation mode overlay

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useFeatureFlag` | Check a single feature flag via the analytics provider (polling) |
| `useFeatureFlags` | Fetch all feature flags from the server API |
| `useFeatureEnabled` | Check if a specific server-side feature is enabled |
| `useFeatureFlagsWithSimulation` | Feature flags with client-side simulation mode support |
| `useFeatureEnabledWithSimulation` | Single feature check with simulation awareness |

---

## useFeatureFlag

Checks a single feature flag through the analytics/PostHog provider. Polls every 30 seconds for updates.

```ts
function useFeatureFlag(flagKey: string, defaultValue?: boolean): boolean
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `flagKey` | `string` | -- | The feature flag key to check |
| `defaultValue` | `boolean` | `false` | Value to use before the flag is resolved |

### Usage

```tsx
function BetaBanner() {
  const showBeta = useFeatureFlag('beta-features', false);

  if (!showBeta) return null;
  return <Banner>Beta features are enabled!</Banner>;
}
```

### Configuration

Requires the `analytics` module (`@/lib/analytics`) to be initialized with a provider that supports `isFeatureEnabled()` (e.g., PostHog).

---

## useFeatureFlags

Fetches feature flags from the server API endpoint (`/api/config/features`). Uses TanStack Query for caching and deduplication.

### Return Type

```ts
interface UseFeatureFlagsResult {
  features: FeatureFlags;   // Feature availability map
  isPending: boolean;       // True while loading with no cached data
  error: Error | null;      // Fetch error, if any
  refetch: () => void;      // Manually trigger a refetch
}

interface FeatureFlags {
  ratings: boolean;
  comments: boolean;
  favorites: boolean;
  featuredItems: boolean;
  surveys: boolean;
}
```

### Default Values

When the fetch fails or is still loading, all features default to `false` for safety:

```ts
{ ratings: false, comments: false, favorites: false, featuredItems: false, surveys: false }
```

### Cache Configuration

| Setting | Value |
|---------|-------|
| Query key | `['feature-flags']` |
| `staleTime` | 5 minutes |
| `gcTime` | 10 minutes |
| `refetchOnMount` | `false` |
| `refetchOnWindowFocus` | `false` |
| `retry` | 2 attempts |

### Usage

```tsx
function ItemPage() {
  const { features, isPending } = useFeatureFlags();

  if (isPending) return <Skeleton />;

  return (
    <div>
      {features.comments && <CommentsSection />}
      {features.ratings && <RatingDisplay />}
      {features.favorites && <FavoriteButton />}
    </div>
  );
}
```

---

## useFeatureEnabled

Convenience wrapper to check a single feature from the server flags.

```ts
function useFeatureEnabled(featureName: keyof FeatureFlags): {
  enabled: boolean;
  isPending: boolean;
}
```

### Usage

```tsx
function FavoriteButton() {
  const { enabled, isPending } = useFeatureEnabled('favorites');

  if (isPending || !enabled) return null;
  return <button>Add to Favorites</button>;
}
```

---

## useFeatureFlagsWithSimulation

Wraps `useFeatureFlags` to add database simulation mode support. When the simulation mode is set to `'disabled'` in the layout theme context, all database-dependent features are hidden regardless of their actual server state.

### Return Type

```ts
interface UseFeatureFlagsWithSimulationResult {
  features: FeatureFlags;                     // Adjusted flags
  isPending: boolean;                         // Loading state
  simulationMode: 'enabled' | 'disabled';     // Current mode
  isSimulationActive: boolean;                // True when features are being hidden
}
```

### Behavior

| Simulation Mode | Features Returned |
|----------------|-------------------|
| `'enabled'` (default) | Actual server feature flags |
| `'disabled'` | All features forced to `false` |

### Usage

```tsx
function FeatureSection() {
  const { features, isSimulationActive } = useFeatureFlagsWithSimulation();

  if (!features.comments) {
    if (isSimulationActive) {
      return <Notice>Database features are disabled in settings</Notice>;
    }
    return null; // Feature genuinely not configured
  }

  return <CommentsSection />;
}
```

---

## useFeatureEnabledWithSimulation

Single-feature check with simulation mode awareness.

```ts
function useFeatureEnabledWithSimulation(featureName: keyof FeatureFlags): {
  enabled: boolean;
  isPending: boolean;
  isSimulationActive: boolean;
}
```

### Usage

```tsx
function RatingStars({ itemId }) {
  const { enabled, isSimulationActive } = useFeatureEnabledWithSimulation('ratings');

  if (!enabled) {
    return isSimulationActive
      ? <p>Ratings disabled in demo mode</p>
      : null;
  }

  return <StarRating itemId={itemId} />;
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | Caching and fetching for `useFeatureFlags` |
| `@/lib/analytics` | Analytics provider for `useFeatureFlag` |
| `LayoutThemeContext` | Simulation mode state for `useFeatureFlagsWithSimulation` |
| `/api/config/features` | Server endpoint returning `FeatureFlags` |

## Error Handling

- `useFeatureFlag`: Silently falls back to `defaultValue` on analytics errors.
- `useFeatureFlags`: Retries twice, then exposes the error. Features default to `false`.
- `useFeatureFlagsWithSimulation`: Waits for hydration (`isInitialized`) before applying simulation mode to avoid flash of incorrect state.

## Related Hooks

- [`useFilters`](/docs/template/hooks/use-filters-reference) - Uses feature flags to control filter availability
- [`useFavorites`](/docs/template/hooks/use-favorites-reference) - Gated by `features.favorites`
- [`useComments`](/docs/template/hooks/use-comments-reference) - Gated by `features.comments`
- [`useItemRating`](/docs/template/hooks/use-voting-reference) - Gated by `features.ratings`
