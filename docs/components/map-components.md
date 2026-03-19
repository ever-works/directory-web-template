---
id: map-components
title: "Map Components"
sidebar_label: "Map Components"
sidebar_position: 13
---

# Map Components

The template provides a provider-abstracted mapping system supporting both **Mapbox** and **Google Maps**. UI components live in `components/maps/` while the provider abstraction resides in `lib/maps/`.

## Architecture

```
components/maps/           # React UI components
  map.tsx                  # Main interactive map
  location-picker.tsx      # Address search + map picker for forms
  map-marker.tsx           # Marker rendering (internal + standalone display)
  map-cluster.tsx          # Cluster display, list, and element factory
  map-item-popup.tsx       # Item preview popup + standalone card
  map-error-boundary.tsx   # Error boundary for map failures
  index.ts                 # Barrel export with type re-exports

lib/maps/                  # Provider abstraction layer
  providers/
    map-provider.interface.ts   # IMapProvider, IMapInstance, IMarkerInstance, etc.
    google-map-provider.ts      # Google Maps implementation
    mapbox-map-provider.ts      # Mapbox GL JS implementation
  types.ts                      # Shared types (Coordinates, MapBounds, etc.)
```

All components are exported from `components/maps/index.ts`:

```ts
export { Map } from './map';
export { MapErrorBoundary } from './map-error-boundary';
export { MapMarkerInternal, MapMarkerDisplay } from './map-marker';
export { ClusterDisplay, ClusterList, createClusterElement } from './map-cluster';
export { MapItemPopup, MapItemCard } from './map-item-popup';
export { LocationPicker } from './location-picker';
```

## Map Component

The main `Map` component (`components/maps/map.tsx`) renders an interactive map with automatic provider detection, marker display, optional clustering, and fullscreen toggle.

```tsx
<Map
  markers={items}
  center={{ latitude: 40.7128, longitude: -74.0060 }}
  zoom={12}
  onMarkerClick={(marker) => console.log('Clicked:', marker)}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `markers` | `MapMarkerData[]` | `[]` | Array of markers to display |
| `center` | `Coordinates` | Settings default | Map center (latitude/longitude) |
| `zoom` | `number` | `12` | Initial zoom level |
| `height` | `number` or `string` | `400` | Map container height |
| `width` | `number` or `string` | `'100%'` | Map container width |
| `controls` | `object` | Zoom + fullscreen | Show/hide zoom, fullscreen, scale controls |
| `enableClustering` | `boolean` | `true` | Group nearby markers into clusters |
| `clusterOptions` | `ClusterOptions` | -- | Radius, maxZoom, minPoints for clustering |
| `isLoading` | `boolean` | `false` | Show loading overlay |
| `isDisabled` | `boolean` | `false` | Show disabled state placeholder |
| `error` | `string` or `null` | `null` | Display error state |
| `onMarkerClick` | `(marker) => void` | -- | Called when a marker is clicked |
| `onClusterClick` | `(cluster) => void` | -- | Called when a cluster is clicked |
| `onViewportChange` | `(viewport) => void` | -- | Called on pan/zoom with center, zoom, bounds |
| `onReady` | `() => void` | -- | Called when map finishes loading |
| `onError` | `(error) => void` | -- | Called on map initialization errors |
| `ariaLabel` | `string` | `'Interactive map'` | Accessibility label |

### State Management

The Map component handles three visual states:

- **Disabled** -- renders a placeholder with a map pin icon and "Map is disabled" text. Triggered when `isDisabled` is true or map settings are disabled.
- **Error** -- renders an alert with the error message and an alert icon.
- **Loading** -- shows a spinner overlay while the provider initializes.

### Clustering

When `enableClustering` is true and markers are provided, the component uses the provider's `createClusterer` method:

```ts
clustererRef.current = provider.createClusterer(mapInstance, {
  radius: clusterOptions?.radius ?? 60,
  maxZoom: clusterOptions?.maxZoom ?? 16,
  minPoints: clusterOptions?.minPoints ?? 2
}, (cluster) => {
  onClusterClickRef.current?.({
    id: `cluster-${cluster.coordinates.latitude}-${cluster.coordinates.longitude}`,
    coordinates: cluster.coordinates,
    count: cluster.markerIds.length,
    markerIds: cluster.markerIds,
    expansionZoom: cluster.expansionZoom
  });
});
```

## LocationPicker

The `LocationPicker` component (`components/maps/location-picker.tsx`) provides a full location editing experience for forms.

```tsx
<LocationPicker
  value={formData.location}
  onChange={(location) => setFormData({ ...formData, location })}
  errors={errors.location}
  showServiceArea
  showRemoteOption
/>
```

### Features

- **Address autocomplete** using the configured map provider
- **Map preview** with a draggable marker
- **"Use My Location"** button for browser geolocation
- **Service area dropdown** with four levels: Local, Regional, National, Global
- **Remote/online service checkbox** for services without physical locations
- **Form integration** with `value`/`onChange` pattern and error display

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `LocationPickerValue` | -- | Current location data |
| `onChange` | `(value) => void` | -- | Called when location changes |
| `errors` | `object` | -- | Validation errors for address, coordinates, serviceArea |
| `showMap` | `boolean` | `true` | Show the map preview |
| `showServiceArea` | `boolean` | `true` | Show service area dropdown |
| `showRemoteOption` | `boolean` | `true` | Show the remote service checkbox |
| `mapHeight` | `number` or `string` | `200` | Height of the map preview |
| `isDisabled` | `boolean` | `false` | Disable all inputs |

### LocationPickerValue

```ts
interface LocationPickerValue {
  address?: string;
  latitude?: number;
  longitude?: number;
  serviceArea?: 'local' | 'regional' | 'national' | 'global';
  isRemote?: boolean;
}
```

## MapMarker Components

### MapMarkerInternal

Used internally by the Map component. Creates a provider-native marker on an existing map instance. This component renders `null` -- the actual marker is rendered by the map library.

### MapMarkerDisplay

A standalone React component for displaying marker-like UI outside of maps (legends, lists, previews):

```tsx
<MapMarkerDisplay
  icon="/images/tool.png"
  title="My Tool"
  category="Productivity"
  size="md"
  isSelected={selectedId === 'my-tool'}
  onClick={() => handleSelect('my-tool')}
/>
```

Supports three sizes (`sm`, `md`, `lg`) with appropriate icon dimensions.

## Cluster Components

Located in `components/maps/map-cluster.tsx`:

### ClusterDisplay

A circular badge showing the marker count within a cluster. Color changes based on count thresholds:

| Count | Color | Size |
|-------|-------|------|
| Under 10 | Blue | `w-8 h-8` |
| 10--49 | Yellow | `w-10 h-10` |
| 50+ | Pink | `w-12 h-12` |

Counts over 99 are displayed as "99+".

### ClusterList

Renders a vertical list of clusters with count badges and expansion zoom information:

```tsx
<ClusterList
  clusters={clusterData}
  onClusterClick={(cluster) => map.setZoom(cluster.expansionZoom)}
  selectedClusterId={selectedId}
/>
```

### createClusterElement

Factory function that creates an `HTMLElement` for use as a custom marker in map providers:

```ts
const element = createClusterElement(42);
// Returns a styled div with "42" text, appropriate size/color
```

## MapItemPopup

The `MapItemPopup` component (`components/maps/map-item-popup.tsx`) displays an item preview when a marker is clicked.

```tsx
<MapItemPopup
  item={{ slug: 'example', name: 'Example Item', category: 'Tools' }}
  isOpen={isPopupOpen}
  position={{ latitude: 40.7128, longitude: -74.0060 }}
  onClose={() => setIsPopupOpen(false)}
  locale="en"
/>
```

### Features

- Item icon, name, and category display
- Truncated description preview (120 characters max)
- "View Details" link to the item page
- Close button with keyboard support (Escape key)
- Click-outside-to-close behavior
- Focus management: close button is auto-focused when popup opens
- ARIA `role="dialog"` with translated label

### MapItemCard

A standalone card component for item display outside of maps:

```tsx
<MapItemCard
  slug="example"
  name="Example Item"
  icon="/images/icon.png"
  category="Tools"
  description="A great tool for productivity"
  locale="en"
/>
```

Renders as a `Link` by default, or as a `button` when an `onClick` handler is provided.

## MapErrorBoundary

A React error boundary specifically for map components (`components/maps/map-error-boundary.tsx`):

```tsx
<MapErrorBoundary
  onRetry={() => window.location.reload()}
  fallback={<div>Custom fallback UI</div>}
>
  <Map markers={items} />
</MapErrorBoundary>
```

Catches rendering errors and displays a friendly fallback with a "Try Again" button.

## Provider Interface

The `IMapProvider` interface (`lib/maps/providers/map-provider.interface.ts`) defines the contract both providers must implement:

```ts
interface IMapProvider {
  readonly name: 'mapbox' | 'google';
  isLoaded(): boolean;
  loadScript(): Promise<void>;
  createMap(container: HTMLElement, options: MapCreateOptions): Promise<IMapInstance>;
  createMarker(map: IMapInstance, options: MarkerCreateOptions): IMarkerInstance;
  createClusterer(map: IMapInstance, options: ClusterOptions, onClusterClick?): IClustererInstance;
  createAutocomplete(input: HTMLInputElement, onSelect): IAutocompleteInstance;
  getStyleUrl(style: MapStyle): string;
  isConfigured(): boolean;
}
```

### Instance Interfaces

| Interface | Methods |
|-----------|---------|
| `IMapInstance` | `setCenter`, `setZoom`, `getCenter`, `getZoom`, `getBounds`, `fitBounds`, `resize`, `on`, `off`, `destroy` |
| `IMarkerInstance` | `setPosition`, `setDraggable`, `getPosition`, `show`, `hide`, `remove`, `onClick`, `onDragEnd` |
| `IClustererInstance` | `addMarkers`, `removeMarkers`, `clearMarkers`, `refresh`, `destroy` |
| `IAutocompleteInstance` | `clear`, `destroy` |

## Shared Types

Key types from `lib/maps/types.ts`:

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

type ServiceArea = 'local' | 'regional' | 'national' | 'global';

interface MapMarkerData {
  id: string;
  coordinates: Coordinates;
  title: string;
  slug: string;
  icon?: string;
  category?: string;
  description?: string;
}
```

## Related Files

| Path | Description |
|------|-------------|
| `components/maps/index.ts` | Barrel export for all map components and types |
| `components/maps/map.tsx` | Main interactive map component |
| `components/maps/location-picker.tsx` | Form location picker with autocomplete |
| `components/maps/map-marker.tsx` | Internal and display marker components |
| `components/maps/map-cluster.tsx` | Cluster display, list, and element factory |
| `components/maps/map-item-popup.tsx` | Item popup and standalone card |
| `components/maps/map-error-boundary.tsx` | Map-specific error boundary |
| `lib/maps/providers/map-provider.interface.ts` | Provider interface contract |
| `lib/maps/providers/mapbox-map-provider.ts` | Mapbox GL JS implementation |
| `lib/maps/providers/google-map-provider.ts` | Google Maps implementation |
| `lib/maps/types.ts` | Shared map type definitions |
| `hooks/use-map-provider.ts` | Hook for accessing the map provider instance |
| `hooks/use-location-settings.ts` | Hook for map/location settings |
| `hooks/use-geolocation.ts` | Hook for browser geolocation API |
