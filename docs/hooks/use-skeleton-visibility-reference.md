---
id: use-skeleton-visibility-reference
title: useSkeletonVisibility Hook Reference
sidebar_label: useSkeletonVisibility
sidebar_position: 91
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useSkeletonVisibility

A hook that determines whether skeleton loading placeholders should be displayed. Ensures skeletons only appear during the initial page load, not during client-side navigation.

**Source file:** `template/hooks/use-skeleton-visibility.ts`

## Overview

`useSkeletonVisibility` solves a common UX problem in Next.js applications: skeleton loaders should appear when a page first loads from the server, but they should not flash during client-side route transitions where cached data may already be available. The hook combines three conditions -- initial load state, loading state, and data availability -- to make a single boolean decision.

## Signature

```ts
function useSkeletonVisibility(isLoading: boolean, hasData?: boolean): boolean
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `isLoading` | `boolean` | -- | Current loading state from data fetching (e.g., from TanStack Query) |
| `hasData` | `boolean` | `false` | Whether data already exists (e.g., `items.length > 0`) |

## Return Value

`boolean` -- `true` if the skeleton placeholder should be shown, `false` otherwise.

## Implementation Details

The hook uses the `useNavigation` context from `@/components/providers` to determine if the current render is the initial page load. The skeleton is shown only when **all three** conditions are met:

1. `isInitialLoad` is `true` -- This is the first server-rendered page load, not a client-side navigation.
2. `isLoading` is `true` -- Data is currently being fetched.
3. `hasData` is `false` -- No data exists yet to display.

```ts
return isInitialLoad && isLoading && !hasData;
```

This prevents skeleton flicker when navigating between pages client-side, where stale data may already be available in the cache.

## Usage Examples

### Basic skeleton gating

```tsx
import { useSkeletonVisibility } from '@/hooks/use-skeleton-visibility';

function ItemList() {
  const { data: items, isLoading } = useItems();
  const showSkeleton = useSkeletonVisibility(isLoading, items.length > 0);

  if (showSkeleton) {
    return <ItemListSkeleton />;
  }

  return (
    <div>
      {items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### With TanStack Query

```tsx
import { useSkeletonVisibility } from '@/hooks/use-skeleton-visibility';
import { useQuery } from '@tanstack/react-query';

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  const showSkeleton = useSkeletonVisibility(isLoading, !!data);

  if (showSkeleton) {
    return <DashboardSkeleton />;
  }

  return <DashboardContent stats={data} />;
}
```

### Without the hasData parameter

```tsx
// When you only care about initial load + loading state
const showSkeleton = useSkeletonVisibility(isLoading);
// Equivalent to: isInitialLoad && isLoading && true
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `@/components/providers` | Provides the `useNavigation` context with `isInitialLoad` state |

## Related Hooks

- [`useFeatureFlags`](/docs/template/hooks/use-feature-flags-reference) -- Feature flags that may affect what content loads
- [`useInfiniteLoading`](/docs/template/hooks/use-infinite-loading-reference) -- Loading states for infinite scroll
- [`useClientItems`](/docs/template/hooks/use-client-items-reference) -- Client-side item fetching with loading states
