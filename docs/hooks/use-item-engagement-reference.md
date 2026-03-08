---
id: use-item-engagement-reference
title: "useItemEngagement Reference"
sidebar_label: "useItemEngagement"
sidebar_position: 48
---

# useItemEngagement

## Overview

`useItemEngagement` fetches engagement metrics (views, votes, favorites, comments, average rating) for a list of items and merges those metrics into the item objects. It handles batched API calls to avoid URL length limits, supports cancellation on unmount, and memoizes the enriched items for efficient re-renders. Use this hook whenever you need to display or sort items by popularity or engagement data.

## Import

```typescript
import { useItemEngagement } from "@/hooks/use-item-engagement";
```

## API Reference

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `items` | `ItemData[]` | Yes | -- | Array of items to enrich with engagement metrics. Each item must have a `slug` property. |
| `options` | `UseItemEngagementOptions` | No | `{}` | Configuration options for the hook. |

#### `UseItemEngagementOptions`

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `enabled` | `boolean` | No | `true` | Whether to fetch engagement data. Set to `false` to skip fetching. |
| `batchSize` | `number` | No | `100` | Number of item slugs per API request. Items are fetched in parallel batches of this size. |

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `items` | `ItemWithEngagement[]` | The input items enriched with an optional `engagement` property containing the metrics. If engagement data has not loaded yet, items are returned as-is. |
| `isLoading` | `boolean` | `true` while engagement data is being fetched. |
| `error` | `Error \| null` | The error object if the fetch failed, otherwise `null`. |
| `hasEngagement` | `boolean` | `true` once engagement data has been successfully loaded at least once. |

### `ItemWithEngagement` Type

```typescript
interface ItemWithEngagement extends ItemData {
  engagement?: ItemEngagementMetrics;
}
```

### `ItemEngagementMetrics` Type

```typescript
interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

## Usage Examples

### Basic Usage

```typescript
import { useItemEngagement } from "@/hooks/use-item-engagement";

function ItemList({ items }: { items: ItemData[] }) {
  const { items: enrichedItems, isLoading } = useItemEngagement(items);

  return (
    <div>
      {enrichedItems.map((item) => (
        <div key={item.slug} className="flex justify-between">
          <span>{item.name}</span>
          {isLoading ? (
            <span>Loading...</span>
          ) : (
            <span className="text-muted-foreground">
              {item.engagement?.views ?? 0} views
              {" | "}
              {item.engagement?.votes ?? 0} votes
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Advanced Usage

```typescript
import { useItemEngagement } from "@/hooks/use-item-engagement";
import { useMemo } from "react";

function PopularItems({ items }: { items: ItemData[] }) {
  const { items: enrichedItems, hasEngagement } = useItemEngagement(items, {
    batchSize: 50,
    enabled: items.length > 0,
  });

  // Sort by popularity once engagement data is available
  const sortedItems = useMemo(() => {
    if (!hasEngagement) return enrichedItems;

    return [...enrichedItems].sort((a, b) => {
      const scoreA = (a.engagement?.views ?? 0) + (a.engagement?.votes ?? 0) * 5;
      const scoreB = (b.engagement?.views ?? 0) + (b.engagement?.votes ?? 0) * 5;
      return scoreB - scoreA;
    });
  }, [enrichedItems, hasEngagement]);

  return (
    <div>
      <h2>Popular Items</h2>
      {sortedItems.map((item) => (
        <ItemCard
          key={item.slug}
          item={item}
          engagement={item.engagement}
        />
      ))}
    </div>
  );
}
```

### Displaying Ratings

```typescript
import { useItemEngagement } from "@/hooks/use-item-engagement";

function ItemRating({ items }: { items: ItemData[] }) {
  const { items: enrichedItems } = useItemEngagement(items);

  return (
    <div>
      {enrichedItems.map((item) => (
        <div key={item.slug}>
          <span>{item.name}</span>
          {item.engagement && item.engagement.avgRating > 0 && (
            <div className="flex items-center gap-1">
              <StarIcon />
              <span>{item.engagement.avgRating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({item.engagement.comments} reviews)
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Integration Patterns

The hook fetches engagement data from `/api/items/engagement` by sending comma-separated slugs as a query parameter. For large item lists, it splits slugs into batches (default size: 100) and fetches all batches in parallel using `Promise.all`. The results are stored in a `metricsMap` keyed by slug and merged into items via `useMemo`. The hook uses a cancellation flag (`cancelled`) to prevent state updates after the component unmounts. A stable `slugsKey` string is used for effect dependency tracking to avoid unnecessary refetches.

## Best Practices

- **Set `enabled: false` when items are empty or not yet loaded** to avoid unnecessary API calls with an empty slug list.
- **Adjust `batchSize` based on your URL length constraints** -- the default of 100 works well for most setups, but very long slugs may require a smaller batch size.
- **Use `hasEngagement` to gate sorting or ranking logic** -- sorting by popularity before engagement data loads would produce incorrect results.
- **Memoize derived computations** (like sorting by engagement) using `useMemo` with `hasEngagement` as a dependency.
- **Handle the `error` state gracefully** -- display items without engagement metrics rather than showing an error to the user, since engagement data is supplementary.

## Related Hooks

- [useFavorites](./use-favorites-reference.md) -- Manages user-specific favorite state, which feeds into the favorites count in engagement metrics.
- [useFilters](./use-filters-reference.md) -- Filter hook that may include sorting by engagement/popularity.
- [usePaginatedQuery](./use-paginated-query-reference.md) -- Paginated data fetching for loading the base items that this hook enriches.
