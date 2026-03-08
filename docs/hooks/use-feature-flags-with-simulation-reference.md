---
id: use-feature-flags-with-simulation-reference
title: useFeatureFlagsWithSimulation Hook Reference
sidebar_label: useFeatureFlagsWithSimulation
sidebar_position: 98
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useFeatureFlagsWithSimulation

Hooks that extend the base feature flag system with database simulation mode support. When simulation mode is disabled, all database-dependent features are hidden regardless of their actual server configuration.

**Source file:** `template/hooks/use-feature-flags-with-simulation.ts`

## Overview

This file exports two hooks that layer simulation mode awareness on top of the server-fetched feature flags from `useFeatureFlags`. The simulation mode setting comes from the `LayoutThemeContext` and allows users to preview how the site appears without database features -- useful for demos, testing, and development scenarios.

When the database simulation mode is set to `'disabled'`, features like ratings, comments, favorites, featured items, and surveys are all forced to `false`, regardless of their actual server-side configuration.

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useFeatureFlagsWithSimulation` | All feature flags with simulation mode overlay |
| `useFeatureEnabledWithSimulation` | Single feature check with simulation awareness |

---

## useFeatureFlagsWithSimulation

```ts
function useFeatureFlagsWithSimulation(): UseFeatureFlagsWithSimulationResult
```

### Parameters

None.

### Return Value

```ts
interface UseFeatureFlagsWithSimulationResult {
  features: FeatureFlags;
  isPending: boolean;
  simulationMode: 'enabled' | 'disabled';
  isSimulationActive: boolean;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `features` | `FeatureFlags` | Feature availability flags, adjusted for simulation mode |
| `isPending` | `boolean` | `true` while flags are loading with no cached data |
| `simulationMode` | `'enabled' \| 'disabled'` | Current simulation mode setting from LayoutThemeContext |
| `isSimulationActive` | `boolean` | `true` when simulation mode is actively hiding features |

### FeatureFlags Interface

```ts
interface FeatureFlags {
  ratings: boolean;       // User ratings and reviews functionality
  comments: boolean;      // User comments on items
  favorites: boolean;     // User favorite items collection
  featuredItems: boolean;  // Admin-managed featured items display
  surveys: boolean;       // User surveys and feedback collection
}
```

### Behavior by Simulation Mode

| Simulation Mode | `isInitialized` | Behavior |
|----------------|-----------------|----------|
| `'enabled'` | `true` | Returns actual server feature flags unchanged |
| `'disabled'` | `true` | All features forced to `false` |
| Any | `false` | Returns raw server flags (hydration not yet complete) |
| Any | pending | Returns raw server flags (data still loading) |

### When Simulation is Active

All database-dependent features are set to `false`:

```ts
{
  ratings: false,
  comments: false,
  favorites: false,
  featuredItems: false,
  surveys: false,
}
```

### Hydration Safety

The hook waits for `isInitialized` from `useLayoutTheme()` before applying simulation mode. This prevents a flash of incorrect state during server-side rendering or hydration. Until the layout theme context is initialized, the raw server feature flags are passed through unchanged.

---

## useFeatureEnabledWithSimulation

A convenience hook for checking a single feature with simulation awareness.

```ts
function useFeatureEnabledWithSimulation(featureName: keyof FeatureFlags): {
  enabled: boolean;
  isPending: boolean;
  isSimulationActive: boolean;
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `featureName` | `keyof FeatureFlags` | The feature to check (`'ratings'`, `'comments'`, `'favorites'`, `'featuredItems'`, or `'surveys'`) |

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether the feature is enabled (considering simulation mode) |
| `isPending` | `boolean` | `true` while flags are loading |
| `isSimulationActive` | `boolean` | `true` when simulation mode is hiding features |

## Usage Examples

### Conditionally show database features

```tsx
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

function ItemPage({ item }) {
  const { features, isSimulationActive } = useFeatureFlagsWithSimulation();

  return (
    <div>
      <ItemDetails item={item} />

      {features.comments ? (
        <CommentsSection itemId={item.id} />
      ) : isSimulationActive ? (
        <Notice>Database features are disabled in settings</Notice>
      ) : null}

      {features.ratings && <RatingDisplay itemId={item.id} />}
      {features.favorites && <FavoriteButton itemId={item.id} />}
    </div>
  );
}
```

### Single feature check with simulation notice

```tsx
import { useFeatureEnabledWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

function FavoriteButton({ itemId }) {
  const { enabled, isPending, isSimulationActive } =
    useFeatureEnabledWithSimulation('favorites');

  if (isPending) return <ButtonSkeleton />;

  if (!enabled) {
    return isSimulationActive
      ? <p className="text-sm text-muted">Favorites disabled in demo mode</p>
      : null;
  }

  return <button>Add to Favorites</button>;
}
```

### Differentiating simulation from real config

```tsx
function FeatureStatusBadge({ feature }: { feature: keyof FeatureFlags }) {
  const { enabled, isSimulationActive } =
    useFeatureEnabledWithSimulation(feature);

  if (enabled) {
    return <Badge variant="success">Active</Badge>;
  }

  if (isSimulationActive) {
    return <Badge variant="warning">Disabled (simulation)</Badge>;
  }

  return <Badge variant="muted">Not configured</Badge>;
}
```

### Using all flags at once

```tsx
function DashboardSidebar() {
  const { features, isPending } = useFeatureFlagsWithSimulation();

  if (isPending) return <SidebarSkeleton />;

  return (
    <nav>
      <NavItem href="/dashboard">Overview</NavItem>
      {features.ratings && <NavItem href="/dashboard/ratings">Ratings</NavItem>}
      {features.comments && <NavItem href="/dashboard/comments">Comments</NavItem>}
      {features.favorites && <NavItem href="/dashboard/favorites">Favorites</NavItem>}
      {features.surveys && <NavItem href="/dashboard/surveys">Surveys</NavItem>}
    </nav>
  );
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `@/hooks/use-feature-flags` | Base `useFeatureFlags` hook for server-fetched flags |
| `@/components/context/LayoutThemeContext` | `useLayoutTheme` for simulation mode state and initialization |
| `@/lib/config/feature-flags` | `FeatureFlags` type definition |

## Related Hooks

- [`useFeatureFlags`](/docs/template/hooks/use-feature-flags-reference) -- Base server-fetched feature flags (without simulation)
- [`useFeatureFlag`](/docs/template/hooks/use-feature-flag-reference) -- Single analytics-provider feature flag (different mechanism)
- [`useTheme`](/docs/template/hooks/use-theme-reference) -- Theme settings managed in the same LayoutThemeContext
