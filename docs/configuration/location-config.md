---
id: location-config
title: "Location Configuration Reference"
sidebar_label: "Location"
sidebar_position: 13
---

# Location Configuration Reference

This page documents every location and map setting available in the template. Configuration flows from your YAML content repository through the `SettingsProvider` into React components.

## Configuration Source

Location settings are defined in the `settings.location` section of your content repository's `config.yml`:

```yaml
settings:
  location:
    enabled: true
    provider: mapbox          # 'mapbox' or 'google'
    map_style: streets        # 'streets' or 'satellite'
    distance_filter_enabled: true
    distance_sort_enabled: true
    default_radius_km: 50
    show_exact_address: false
    require_location_on_submit: false
    default_center: [40.7128, -74.0060]  # [latitude, longitude]
```

## Configuration Types

### LocationConfigSettings (YAML / snake_case)

The raw shape read from `config.yml`, defined in `lib/types/location.ts`:

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
  default_center?: [number, number];   // [latitude, longitude]
}
```

### LocationSettings (Runtime / camelCase)

The runtime shape used throughout the application:

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
  defaultCenter: { latitude: number; longitude: number };
}
```

The `mapLocationConfigToRuntime()` function converts snake_case YAML settings to the camelCase runtime format.

### Setting Descriptions

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Master switch for all location features |
| `provider` | `MapProvider` | `'mapbox'` | Map tile and geocoding provider |
| `mapStyle` | `MapStyle` | `'streets'` | Map rendering style |
| `distanceFilterEnabled` | `boolean` | `true` | Show distance radius filter in search |
| `distanceSortEnabled` | `boolean` | `true` | Allow sorting results by distance |
| `defaultRadiusKm` | `number` | `50` | Default search radius in kilometres |
| `showExactAddress` | `boolean` | `false` | Display full addresses publicly |
| `requireLocationOnSubmit` | `boolean` | `false` | Make location required for submissions |
| `defaultCenter` | `{lat, lng}` | `{0, 0}` | Fallback map center coordinates |

## Map Providers

### `MapProvider`

```typescript
type MapProvider = 'mapbox' | 'google';
```

| Provider | Env Var | Features |
|----------|---------|----------|
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | Vector tiles, geocoding, clustering |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Tiles, Places API, geocoding |

### `MapStyle`

```typescript
type MapStyle = 'streets' | 'satellite';
```

### `MapProviderStatus`

API key status for the admin UI.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Response from the `/api/map-status` endpoint.

```typescript
interface MapStatusResponse {
  mapbox: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
  google: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
}
```

## Coordinate System

### `Coordinates`

The standard geographic point type used across all map components.

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}
```

### `MapBounds`

Bounding box for viewport calculations.

```typescript
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### `GeoBoundingBox`

Alternative bounding box for database queries.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

## Location Data

### `LocationData`

Item location stored in the `item_location_index` database table.

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

### `LocationQueryOptions`

Parameters for proximity-based item searches.

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

Result of a location-based search.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Map Component Configuration

### `MapComponentProps`

Props for the main `Map` component.

```typescript
interface MapComponentProps {
  markers?: MapMarkerData[];
  center?: Coordinates;
  zoom?: number;                    // 1-20
  style?: MapStyle;
  className?: string;
  height?: string | number;
  controls?: MapControlsConfig;
  enableClustering?: boolean;
  clusterOptions?: ClusterOptions;
  isLoading?: boolean;
  onMarkerClick?: (marker: MapMarkerData) => void;
  onViewportChange?: (viewport: MapViewport) => void;
}
```

### `ClusterOptions`

Marker clustering configuration.

```typescript
interface ClusterOptions {
  radius?: number;      // Cluster radius in pixels (default: 60)
  maxZoom?: number;      // Max zoom for clustering (default: 16)
  minZoom?: number;      // Min zoom for clustering (default: 0)
  minPoints?: number;    // Min points to form cluster (default: 2)
}
```

### `MapControlsConfig`

Toggle map UI controls.

```typescript
interface MapControlsConfig {
  showZoomControls?: boolean;
  showFullscreenControl?: boolean;
  showNavigationControl?: boolean;
  showScaleControl?: boolean;
}
```

## User Location Preferences

Users can set default location preferences in their client profile (stored in `client_profiles` table):

| Column | Type | Description |
|--------|------|-------------|
| `default_latitude` | `doublePrecision` | User's default latitude |
| `default_longitude` | `doublePrecision` | User's default longitude |
| `default_city` | `text` | User's default city |
| `default_country` | `text` | User's default country |
| `location_privacy` | `text` | `'private'` (default) or `'public'` |

## Environment Variables

| Env Var | Required | Description |
|---------|----------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | For Mapbox | Mapbox GL access token |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | For Google | Google Maps API key |

## Related Pages

- [Location Types](../types/location-types.md) -- full type definitions for location features
- [Map Config](./map-config.md) -- additional map UI configuration
- [Feature Config](./feature-config.md) -- feature flag settings
