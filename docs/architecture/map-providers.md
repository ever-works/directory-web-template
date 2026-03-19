---
id: map-providers
title: Map Providers
sidebar_label: Map Providers
sidebar_position: 34
---

# Map Providers

The template implements a provider abstraction layer for interactive maps, supporting both Google Maps and Mapbox GL JS through a unified interface. This allows switching map providers without changing component code.

## File Structure

```
lib/maps/
  index.ts                              # Re-exports types and providers
  types.ts                              # All map-related TypeScript types
  providers/
    index.ts                            # Re-exports provider interface and implementations
    map-provider.interface.ts           # IMapProvider contract and related interfaces
    google-map-provider.ts              # Google Maps implementation
    mapbox-map-provider.ts              # Mapbox GL JS implementation
```

## Provider Interface (`IMapProvider`)

Every map provider implements the `IMapProvider` interface, which defines the contract for map creation, markers, clustering, and address autocomplete:

```ts
export interface IMapProvider {
  readonly name: 'mapbox' | 'google';

  isLoaded(): boolean;
  loadScript(): Promise<void>;
  createMap(container: HTMLElement, options: MapCreateOptions): Promise<IMapInstance>;
  createMarker(map: IMapInstance, options: MarkerCreateOptions): IMarkerInstance;
  createClusterer(
    map: IMapInstance,
    options: ClusterOptions,
    onClusterClick?: (cluster: ClusterClickData) => void
  ): IClustererInstance;
  createAutocomplete(
    input: HTMLInputElement,
    onSelect: (suggestion: AddressSuggestion) => void
  ): IAutocompleteInstance;
  getStyleUrl(style: MapStyle): string;
  isConfigured(): boolean;
}
```

### Instance Interfaces

Each provider wraps its native objects behind abstract interfaces:

```ts
// Map instance - wraps google.maps.Map or mapboxgl.Map
interface IMapInstance {
  setCenter(coordinates: Coordinates): void;
  setZoom(zoom: number): void;
  getCenter(): Coordinates;
  getZoom(): number;
  getBounds(): MapBounds | null;
  fitBounds(bounds: MapBounds, padding?: number): void;
  resize(): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler?: (...args: unknown[]) => void): void;
  destroy(): void;
}

// Marker instance
interface IMarkerInstance {
  setPosition(coordinates: Coordinates): void;
  setDraggable(draggable: boolean): void;
  getPosition(): Coordinates;
  show(): void;
  hide(): void;
  remove(): void;
  onClick(handler: () => void): void;
  onDragEnd(handler: (coordinates: Coordinates) => void): void;
}

// Clusterer instance
interface IClustererInstance {
  addMarkers(markers: MapMarkerData[]): void;
  removeMarkers(markerIds: string[]): void;
  clearMarkers(): void;
  refresh(): void;
  destroy(): void;
}

// Autocomplete instance
interface IAutocompleteInstance {
  clear(): void;
  destroy(): void;
}
```

## Google Maps Provider

The `GoogleMapProvider` class uses the `@googlemaps/js-api-loader` for dynamic script loading and `@googlemaps/markerclusterer` for clustering.

### Key Characteristics

- Uses `AdvancedMarkerElement` for markers (requires a Map ID)
- Loads the `maps`, `marker`, and `places` libraries
- Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and optionally `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- Script loading is idempotent with a module-level promise guard

```ts
import { GoogleMapProvider } from '@/lib/maps';

const provider = new GoogleMapProvider();

if (provider.isConfigured()) {
  await provider.loadScript();
  const map = await provider.createMap(containerElement, {
    center: { latitude: 40.7128, longitude: -74.006 },
    zoom: 12,
    style: 'streets',
    controls: { showZoomControls: true },
  });

  const marker = provider.createMarker(map, {
    data: {
      id: '1',
      coordinates: { latitude: 40.7128, longitude: -74.006 },
      title: 'New York',
      slug: 'new-york',
    },
  });
}
```

### Style Mapping

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite' ? 'satellite' : 'roadmap';
}
```

## Mapbox Provider

The `MapboxMapProvider` class dynamically imports `mapbox-gl` and uses its native GeoJSON source-based clustering.

### Key Characteristics

- Uses native Mapbox GL JS markers
- Clustering is implemented with GeoJSON sources and circle/symbol layers
- Autocomplete is built with the Mapbox Geocoding API
- Requires `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Script loading is idempotent with a module-level promise guard

```ts
import { MapboxMapProvider } from '@/lib/maps';

const provider = new MapboxMapProvider();

if (provider.isConfigured()) {
  await provider.loadScript();
  const map = await provider.createMap(containerElement, {
    center: { latitude: 51.5074, longitude: -0.1278 },
    zoom: 10,
    style: 'streets',
    controls: {
      showZoomControls: true,
      showFullscreenControl: true,
      showScaleControl: true,
    },
  });
}
```

### Style Mapping

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12';
}
```

## Core Types

### Coordinates and Bounds

```ts
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### Marker Data

```ts
interface MapMarkerData {
  id: string;
  coordinates: Coordinates;
  title: string;
  icon?: string;
  category?: string;
  slug: string;
  description?: string;
}
```

### Cluster Options

```ts
interface ClusterOptions {
  radius?: number;     // Cluster radius in pixels (default: 60)
  maxZoom?: number;    // Maximum zoom for clustering (default: 16)
  minZoom?: number;    // Minimum zoom for clustering (default: 0)
  minPoints?: number;  // Minimum points per cluster (default: 2)
}
```

### Map Component Props

The `MapComponentProps` interface is the standard props contract for map React components:

```ts
interface MapComponentProps {
  markers?: MapMarkerData[];
  center?: Coordinates;
  zoom?: number;
  style?: MapStyle;
  className?: string;
  height?: string | number;
  width?: string | number;
  controls?: MapControlsConfig;
  enableClustering?: boolean;
  clusterOptions?: ClusterOptions;
  isLoading?: boolean;
  isDisabled?: boolean;
  error?: string | null;
  onMarkerClick?: (marker: MapMarkerData) => void;
  onClusterClick?: (cluster: MapClusterData) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  ariaLabel?: string;
}
```

### Location Picker

The `LocationPickerProps` and `LocationPickerValue` types support the location picker form component:

```ts
interface LocationPickerValue {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  serviceArea?: 'local' | 'regional' | 'national' | 'global';
  isRemote?: boolean;
}
```

## Environment Variables

| Variable | Provider | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google | Google Maps JavaScript API key (HTTP-referrer restricted) |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Google | Map ID for Advanced Markers |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox | Mapbox public access token (`pk.*` only) |

:::caution Security
Only use browser-exposed API keys with proper domain restrictions. Never use server/secret keys (`sk.*` for Mapbox) in client-side code.
:::

## Provider Selection

Provider selection is typically handled at the configuration level based on which API keys are present:

```ts
interface MapProviderConfig {
  provider: MapProvider;    // 'mapbox' | 'google'
  accessToken?: string;
  mapId?: string;
}
```

## Related Files

- `lib/maps/providers/map-provider.interface.ts` - Provider interface contract
- `lib/maps/providers/google-map-provider.ts` - Google Maps implementation
- `lib/maps/providers/mapbox-map-provider.ts` - Mapbox implementation
- `lib/maps/types.ts` - All map-related TypeScript types
- `lib/types/location.ts` - Location-related shared types
