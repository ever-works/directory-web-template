---
id: use-feature-items-section-reference
title: useFeaturedItemsSection Hook Reference
sidebar_label: useFeaturedItemsSection
sidebar_position: 110
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useFeaturedItemsSection

Provides a filtered, sorted, and limited list of active featured items for display in homepage or landing page sections. Wraps the lower-level `useFeaturedItems` hook and adds client-side filtering by active status, ordering, and configurable limits.

**Source:** `template/hooks/use-feature-items-section.ts`

## Signature

```ts
function useFeaturedItemsSection(props?: UseFeaturedItemsSectionProps): UseFeaturedItemsSectionReturn;
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | `number` | `6` | Maximum number of featured items to return |
| `enabled` | `boolean` | `true` | Reserved for future use; currently accepted but not passed to the underlying query |

```ts
interface UseFeaturedItemsSectionProps {
  limit?: number;
  enabled?: boolean;
}
```

## Return Value

```ts
const {
  featuredItems,              // FeaturedItem[] -- Active items sorted by featuredOrder, capped at limit
  isLoading,                  // boolean -- True while the initial fetch is in progress
  isError,                    // boolean -- True if the fetch failed
  error,                      // string | null -- Error message if fetch failed
  refetch,                    // () => void -- Manually refetch featured items from the server
  invalidateFeaturedItems,    // () => void -- Alias for refetch
  prefetchFeaturedItems,      // () => Promise<void> -- No-op placeholder for prefetching
  isStale,                    // boolean -- Always false (reserved for future use)
  dataUpdatedAt,              // number -- Timestamp of the last data update
} = useFeaturedItemsSection();
```

### FeaturedItem Type

```ts
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  itemDescription?: string;
  featuredOrder: number;
  featuredUntil?: string;
  isActive: boolean;
  featuredBy: string;
}
```

## Implementation Details

1. **Data source** -- Delegates data fetching entirely to the `useFeaturedItems` hook from `use-featured-items-client`.
2. **Active filtering** -- Only items with `isActive === true` are included in the result.
3. **Sort order** -- Items are sorted in ascending order by `featuredOrder`.
4. **Limit enforcement** -- After filtering and sorting, only the first `limit` items are returned (default 6).
5. **Memoization** -- The filtered list is wrapped in `useMemo` keyed on the raw `featuredItems` array and the `limit` value, avoiding unnecessary re-computation on unrelated re-renders.

## Usage Examples

### Basic Featured Section

```tsx
function FeaturedSection() {
  const { featuredItems, isLoading, isError } = useFeaturedItemsSection();

  if (isLoading) return <FeaturedSkeleton />;
  if (isError) return <ErrorBanner message="Could not load featured items." />;
  if (featuredItems.length === 0) return null;

  return (
    <section>
      <h2>Featured</h2>
      <div className="grid grid-cols-3 gap-4">
        {featuredItems.map((item) => (
          <FeaturedCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
```

### Custom Limit

```tsx
function TopThreeFeatured() {
  const { featuredItems } = useFeaturedItemsSection({ limit: 3 });

  return (
    <div className="flex gap-4">
      {featuredItems.map((item) => (
        <CompactCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### Manual Refresh

```tsx
function AdminFeaturedPreview() {
  const { featuredItems, refetch } = useFeaturedItemsSection({ limit: 10 });

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {featuredItems.map((item) => (
          <li key={item.id}>
            {item.featuredOrder}. {item.itemName}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Related Hooks

- [`useFeaturedItems`](/docs/template/hooks/use-featured-items-client-reference) -- Lower-level hook that fetches all featured items from the API
- [`useAdminFeaturedItems`](/docs/template/hooks/use-admin-featured-items-reference) -- Admin CRUD operations for featured items
- [`useFeaturedItemForm`](/docs/template/hooks/use-featured-item-form-reference) -- Form state management for creating/editing featured items
