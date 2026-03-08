---
id: use-location-items-reference
title: useLocationItems
sidebar_label: useLocationItems
sidebar_position: 86
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useLocationItems

A React Query-based hook that queries the location search API when a location filter is active. Returns a set of matching item slugs and a distance map for filtering and displaying proximity information on item cards.

## Import

```typescript
import { useLocationItems } from '@/template/hooks/use-location-items';
```

## API Reference

### Parameters

```typescript
function useLocationItems(locationFilter: LocationFilterState): UseLocationItemsReturn;
```

| Parameter | Type | Description |
|---|---|---|
| `locationFilter` | `LocationFilterState` | The current location filter state from the filter context. Contains optional `nearMe`, `city`, or `country` properties. |

#### `LocationFilterState`

Imported from `@/components/filters/types`. The hook checks for these properties:

| Property | Type | Description |
|---|---|---|
| `nearMe` | `{ latitude: number; longitude: number; radius: number } \| undefined` | Proximity-based filter with coordinates and search radius. |
| `city` | `string \| undefined` | Filter by city name. |
| `country` | `string \| undefined` | Filter by country name. |

### Return Value

#### `UseLocationItemsReturn`

| Property | Type | Description |
|---|---|---|
| `matchingSlugs` | `Set<string> \| null` | Set of item slugs that match the location filter. `null` when data is not yet loaded (show all items while loading). An empty `Set` means no items match. |
| `distances` | `Map<string, number>` | Map of item slug to distance in kilometers. Empty map when no distance data is available. |
| `isLoading` | `boolean` | Whether the location search query is currently fetching. |

### Types

```typescript
interface LocationSearchResponse {
  success: boolean;
  data: {
    slugs: string[];
    distances: Record<string, number>;
  };
}

interface UseLocationItemsReturn {
  matchingSlugs: Set<string> | null;
  distances: Map<string, number>;
  isLoading: boolean;
}
```

## Usage Examples

### Filtering Items by Location

```tsx
import { useLocationItems } from '@/template/hooks/use-location-items';

function ItemGrid({ items, locationFilter }: {
  items: Item[];
  locationFilter: LocationFilterState;
}) {
  const { matchingSlugs, distances, isLoading } = useLocationItems(locationFilter);

  // Filter items based on location matches
  const filteredItems = matchingSlugs
    ? items.filter((item) => matchingSlugs.has(item.slug))
    : items; // Show all items when matchingSlugs is null (loading or no filter)

  if (isLoading) {
    return <div>Searching nearby...</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {filteredItems.map((item) => (
        <ItemCard
          key={item.slug}
          item={item}
          distance={distances.get(item.slug)}
        />
      ))}
    </div>
  );
}
```

### Displaying Distance on Item Cards

```tsx
function ItemCard({ item, distance }: { item: Item; distance?: number }) {
  return (
    <div className="border rounded p-4">
      <h3>{item.title}</h3>
      {distance !== undefined && (
        <span className="text-sm text-gray-500">
          {distance < 1
            ? `${Math.round(distance * 1000)}m away`
            : `${distance.toFixed(1)}km away`}
        </span>
      )}
    </div>
  );
}
```

### Combined with Other Filters

```tsx
function FilteredItemList({ items, filters }: {
  items: Item[];
  filters: { location: LocationFilterState; category?: string; search?: string };
}) {
  const { matchingSlugs, distances } = useLocationItems(filters.location);

  const filtered = items.filter((item) => {
    // Location filter
    if (matchingSlugs && !matchingSlugs.has(item.slug)) return false;

    // Category filter
    if (filters.category && item.category !== filters.category) return false;

    // Search filter
    if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    return true;
  });

  return (
    <div>
      <p>{filtered.length} results found</p>
      {filtered.map((item) => (
        <ItemCard key={item.slug} item={item} distance={distances.get(item.slug)} />
      ))}
    </div>
  );
}
```

## Implementation Details

- **Conditional Fetching**: The query is only `enabled` when at least one location filter property is set (`nearMe`, `city`, or `country`). When no filter is active, the hook returns `{ matchingSlugs: null, distances: EMPTY_MAP, isLoading: false }` immediately without making an API call.
- **API Endpoint**: Fetches from `/api/location/search` with query parameters built from the active filter: `near_lat`, `near_lng`, `radius` for proximity; `city` for city filter; `country` for country filter.
- **Filter Priority**: The `buildSearchParams` helper checks filter types in order: `nearMe` first, then `city`, then `country`. Only the first active filter is sent to the API.
- **Memoized Return Values**: Both `matchingSlugs` (as a `Set`) and `distances` (as a `Map`) are wrapped in `useMemo` to prevent unstable references from causing cascading re-renders in consuming components.
- **Null vs Empty Set**: `matchingSlugs` being `null` means data has not loaded yet -- the consumer should show all items. An empty `Set` means the API returned zero matches -- the consumer should show no items. This distinction prevents a flash of empty results while the query loads.
- **Shared Empty Map**: An `EMPTY_MAP` constant (`new Map()`) is shared across all inactive/error states to maintain referential stability.
- **Query Caching**: Results are cached for 30 seconds (`staleTime`) and garbage collected after 5 minutes (`gcTime`).

## Edge Cases and Gotchas

- **Error Fallback**: If the location search API returns an error, the hook returns `matchingSlugs: null` (show all items) rather than an empty set (show no items). This prevents the entire listing from disappearing due to a location service failure.
- **Multiple Filter Properties**: If multiple location properties are set simultaneously (e.g., both `nearMe` and `city`), only the highest-priority one is used (`nearMe` > `city` > `country`).
- **Query Key Granularity**: The query key includes all location filter parameters. Changing the radius, coordinates, city, or country triggers a new fetch. Small coordinate changes (e.g., from GPS drift) will each produce separate cache entries.
- **Distance Units**: Distances are always in kilometers. Convert to miles in the UI if needed: `miles = km * 0.621371`.
- **SSR**: The hook uses `'use client'` directive and relies on the browser fetch API. It is not designed for server-side data fetching.

## Related Hooks

- [useGeolocation](./use-geolocation-reference.md) -- Provides browser coordinates that feed into the `nearMe` location filter.
- [useMapCoordinates](./use-map-coordinates-reference.md) -- Fetches coordinate data for map display (different from filtered item results).
- [useUserLocation](./use-user-location-reference.md) -- Combines browser and profile location for the best available coordinates.
- [useFilters](./use-filters-reference.md) -- Manages the overall filter state including the `LocationFilterState` consumed by this hook.
