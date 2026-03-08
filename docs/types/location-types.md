---
id: location-types
title: Location Type Definitions
sidebar_label: Location Types
sidebar_position: 7
---

# Location Type Definitions

**Source:** `lib/types/location.ts`

The location module provides comprehensive type definitions for geolocation features, including map provider configuration, location settings, geo queries, and location data storage. It supports both Mapbox and Google Maps providers.

## Enum Types

### `MapProvider`

Supported map provider options:

```typescript
type MapProvider = 'mapbox' | 'google';
```

### `MapStyle`

Map rendering style options:

```typescript
type MapStyle = 'streets' | 'satellite';
```

## Settings Types

### `LocationConfigSettings`

Configuration settings as stored in `config.yml` using `snake_case` naming. Used when parsing the `settings.location` section of the config file.

```typescript
interface LocationConfigSettings {
  enabled?: boolean;
  provider?: MapProvider;
  map_style?: MapStyle;
  distance_filter_enabled?: boolean;
  distance_sort_enabled?: boolean;
  default_radius_km?: number;
  show_exact_address?: boolean;
  require_location_on_submit?: boolean;
  default_center?: [number, number]; // [latitude, longitude]
}
```

### `LocationSettings`

Runtime location settings using `camelCase` naming. Used throughout the application for type-safe access.

```typescript
interface LocationSettings {
  enabled: boolean;
  provider: MapProvider;
  mapStyle: MapStyle;
  distanceFilterEnabled: boolean;
  distanceSortEnabled: boolean;
  defaultRadiusKm: number;
  showExactAddress: boolean;
  requireLocationOnSubmit: boolean;
  defaultCenter: {
    latitude: number;
    longitude: number;
  };
}
```

**Key differences from `LocationConfigSettings`:**
- All fields are required (non-optional) because defaults are applied
- Uses `camelCase` naming instead of `snake_case`
- `default_center` tuple is converted to a named `{ latitude, longitude }` object

## Default Values

### `DEFAULT_LOCATION_SETTINGS`

Default values applied when settings are not configured:

```typescript
const DEFAULT_LOCATION_SETTINGS: LocationSettings = {
  enabled: false,
  provider: 'mapbox',
  mapStyle: 'streets',
  distanceFilterEnabled: true,
  distanceSortEnabled: true,
  defaultRadiusKm: 50,
  showExactAddress: false,
  requireLocationOnSubmit: false,
  defaultCenter: { latitude: 0, longitude: 0 },
};
```

## Data Types

### `LocationData`

Location data for items stored in the `item_location_index` table. This is an index-only structure; the source of truth remains in YAML files.

```typescript
interface LocationData {
  item_slug: string;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  service_area: string | null;
  is_remote: boolean;
  indexed_at: Date;
}
```

## API Status Types

### `MapProviderStatus`

Status information for a single map provider, used in the admin UI to show configured/unconfigured state without exposing API keys.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Response from the `map-status` API endpoint, reporting configuration status for both providers.

```typescript
interface MapStatusResponse {
  mapbox: {
    isConfigured: boolean;
    isPreviewAvailable: boolean;
    name: string;
  };
  google: {
    isConfigured: boolean;
    isPreviewAvailable: boolean;
    name: string;
  };
}
```

## Geo Query Types

### `GeoBoundingBox`

Bounding box for geospatial queries, defining a rectangular region on the map.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

### `LocationQueryOptions`

Options for location-based item queries. Supports radius search, city/country filtering, and remote item inclusion.

```typescript
interface LocationQueryOptions {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  city?: string;
  country?: string;
  includeRemote?: boolean;
}
```

### `LocationQueryResult`

Result of a location-based item query, including distance calculation.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Functions

### `mapLocationConfigToRuntime`

Maps `snake_case` config settings from YAML to `camelCase` runtime settings. Applies defaults for any missing fields.

```typescript
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

**Example:**

```typescript
import { mapLocationConfigToRuntime } from '@/lib/types/location';

// From config.yml
const yamlConfig = {
  enabled: true,
  provider: 'mapbox' as const,
  default_radius_km: 25,
  default_center: [40.7128, -74.006] as [number, number],
};

const settings = mapLocationConfigToRuntime(yamlConfig);
// Result:
// {
//   enabled: true,
//   provider: 'mapbox',
//   mapStyle: 'streets',           // default applied
//   distanceFilterEnabled: true,   // default applied
//   distanceSortEnabled: true,     // default applied
//   defaultRadiusKm: 25,
//   showExactAddress: false,       // default applied
//   requireLocationOnSubmit: false, // default applied
//   defaultCenter: { latitude: 40.7128, longitude: -74.006 },
// }
```

## Usage Examples

### Querying items by location

```typescript
import type { LocationQueryOptions } from '@/lib/types/location';

const query: LocationQueryOptions = {
  latitude: 40.7128,
  longitude: -74.006,
  radiusKm: 25,
  includeRemote: true,
};
```

### Checking map provider status

```typescript
import type { MapStatusResponse } from '@/lib/types/location';

async function checkMapStatus(): Promise<MapStatusResponse> {
  const res = await fetch('/api/admin/map-status');
  return res.json();
}

// Usage
const status = await checkMapStatus();
if (status.mapbox.isConfigured) {
  console.log('Mapbox is ready');
}
```

### Using bounding box for viewport queries

```typescript
import type { GeoBoundingBox } from '@/lib/types/location';

function getViewportBounds(
  center: { lat: number; lng: number },
  radiusKm: number
): GeoBoundingBox {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(center.lat * (Math.PI / 180)));

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}
```

## Design Notes

### Config vs. Runtime Pattern

The location module uses a two-layer type system:

1. **Config types** (`LocationConfigSettings`) use `snake_case` to match YAML file conventions
2. **Runtime types** (`LocationSettings`) use `camelCase` for idiomatic TypeScript
3. The `mapLocationConfigToRuntime()` function bridges the two, applying defaults

This pattern ensures YAML files remain human-readable while application code follows TypeScript conventions.

### Index-Only Location Data

`LocationData` is stored in the `item_location_index` database table for fast geo queries, but the source of truth for item locations remains in the YAML content files. The index is rebuilt when items are updated.

### Privacy Considerations

The `showExactAddress` setting (default: `false`) controls whether precise addresses are displayed. When disabled, only city/country-level information is shown to users.

## Related Types

- [`ItemLocationData`](./item-types.md) - Location data embedded in item YAML files
- [`ItemListOptions`](./item-types.md) - Item filtering supports `city`, `country`, and `includeRemote` fields
