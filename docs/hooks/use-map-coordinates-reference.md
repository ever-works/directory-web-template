---
id: use-map-coordinates-reference
title: useMapCoordinates
sidebar_label: useMapCoordinates
sidebar_position: 86
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useMapCoordinates

A React Query hook that fetches item coordinates from the location index API for rendering markers on a map. Returns an array of coordinate entries with item slugs, latitude/longitude, and optional city/country metadata.

## Import

```typescript
import { useMapCoordinates } from '@/template/hooks/use-map-coordinates';
```

## API Reference

### Parameters

```typescript
function useMapCoordinates(enabled?: boolean): UseMapCoordinatesReturn;
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Whether to fetch coordinates. Set to `false` when the map view is not active to avoid unnecessary API calls. |

### Return Value

#### `UseMapCoordinatesReturn`

| Property | Type | Description |
|---|---|---|
| `coordinates` | `CoordinateEntry[]` | Array of item coordinates. Empty array when loading or if the fetch fails. |
| `isLoading` | `boolean` | Whether the coordinates query is currently fetching. |
| `error` | `Error \| null` | Error object if the fetch failed, otherwise `null`. |

### Types

```typescript
interface CoordinateEntry {
  slug: string;
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
}

interface CoordinatesResponse {
  success: boolean;
  data: CoordinateEntry[];
}

interface UseMapCoordinatesReturn {
  coordinates: CoordinateEntry[];
  isLoading: boolean;
  error: Error | null;
}
```

## Usage Examples

### Basic Map with Markers

```tsx
import { useMapCoordinates } from '@/template/hooks/use-map-coordinates';

function ItemMap() {
  const { coordinates, isLoading, error } = useMapCoordinates();

  if (isLoading) return <div>Loading map data...</div>;
  if (error) return <div>Failed to load map markers: {error.message}</div>;

  return (
    <MapContainer>
      {coordinates.map((entry) => (
        <Marker
          key={entry.slug}
          position={[entry.latitude, entry.longitude]}
          title={entry.slug}
        />
      ))}
    </MapContainer>
  );
}
```

### Conditional Fetching with View Toggle

```tsx
import { useState } from 'react';
import { useMapCoordinates } from '@/template/hooks/use-map-coordinates';

function ListingPage() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const { coordinates, isLoading } = useMapCoordinates(viewMode === 'map');

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setViewMode('list')}>List View</button>
        <button onClick={() => setViewMode('map')}>Map View</button>
      </div>

      {viewMode === 'list' ? (
        <ItemListView />
      ) : (
        <div>
          {isLoading ? (
            <div>Loading map...</div>
          ) : (
            <MapView coordinates={coordinates} />
          )}
        </div>
      )}
    </div>
  );
}
```

### Grouping Markers by City

```tsx
import { useMemo } from 'react';
import { useMapCoordinates } from '@/template/hooks/use-map-coordinates';

function CityGroupedMap() {
  const { coordinates } = useMapCoordinates();

  const groupedByCity = useMemo(() => {
    const groups = new Map<string, CoordinateEntry[]>();
    coordinates.forEach((entry) => {
      const city = entry.city ?? 'Unknown';
      const group = groups.get(city) ?? [];
      group.push(entry);
      groups.set(city, group);
    });
    return groups;
  }, [coordinates]);

  return (
    <MapContainer>
      {Array.from(groupedByCity.entries()).map(([city, entries]) => (
        <ClusterMarker
          key={city}
          label={`${city} (${entries.length})`}
          position={[entries[0].latitude, entries[0].longitude]}
          items={entries}
        />
      ))}
    </MapContainer>
  );
}
```

## Implementation Details

- **API Endpoint**: Fetches from `/api/location/coordinates` using the browser `fetch` API. The endpoint returns all item coordinates from the location index.
- **Conditional Fetching**: The React Query `enabled` option is controlled by the `enabled` parameter. When `false`, no network request is made and the query remains in an idle state.
- **Caching Strategy**: Coordinates are cached with a 5-minute `staleTime` and 10-minute `gcTime`. Since coordinate data changes infrequently (only when items are added or their locations updated), the longer stale time reduces unnecessary refetches.
- **Default Empty Array**: When data is not yet loaded or the response is missing, `coordinates` defaults to an empty array (`data?.data ?? []`) rather than `null`, making it safe to iterate without null checks.
- **Error Typing**: The `error` is cast to `Error | null` from React Query's generic error type for a cleaner consumer API.

## Edge Cases and Gotchas

- **Large Datasets**: If the directory contains thousands of items with coordinates, this endpoint returns all of them in a single response. Consider pagination or viewport-based loading for very large datasets.
- **Missing Coordinates**: Items without latitude/longitude in the database are not included in the response. The `coordinates` array only contains items that have location data.
- **Null City/Country**: The `city` and `country` fields on `CoordinateEntry` can be `null` if the item has coordinates but no reverse-geocoded metadata. Handle this in the UI with a fallback label.
- **Stale Data on Item Updates**: If an item's location is updated, the cached coordinates remain stale for up to 5 minutes. Call `queryClient.invalidateQueries({ queryKey: ['map-coordinates'] })` after location updates to force a refetch.
- **No Filtering**: This hook fetches all available coordinates. It does not apply location filters. Use `useLocationItems` for filtered results based on proximity, city, or country.

## Related Hooks

- [useLocationItems](./use-location-items-reference.md) -- Fetches filtered item slugs and distances based on active location filters.
- [useMapProvider](./use-map-provider-reference.md) -- Provides the map rendering engine (Mapbox or Google Maps) to display these coordinates.
- [useUserLocation](./use-user-location-reference.md) -- Gets the user's location to center the map.
- [useGeolocation](./use-geolocation-reference.md) -- Provides browser-based coordinates for centering the map on the user's position.
