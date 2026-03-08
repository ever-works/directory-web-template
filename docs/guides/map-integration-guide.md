---
id: map-integration-guide
title: "Map Integration Guide"
sidebar_label: "Map Integration"
sidebar_position: 36
---

# Map Integration Guide

The template ships a full-featured map system with components in `components/maps/`. Maps are provider-agnostic -- the same components work with either Mapbox GL JS or Google Maps depending on your configuration.

## Component Inventory

| Export | File | Description |
|--------|------|-------------|
| `Map` | `map.tsx` | Main interactive map with markers and clustering |
| `LocationPicker` | `location-picker.tsx` | Address input with autocomplete, map preview, and geolocation |
| `MapMarkerInternal` | `map-marker.tsx` | Renders a marker on an existing map instance |
| `MapMarkerDisplay` | `map-marker.tsx` | Standalone marker preview for lists/legends |
| `ClusterDisplay` | `map-cluster.tsx` | Cluster badge for use outside the map |
| `ClusterList` | `map-cluster.tsx` | Cluster list with click handlers |
| `createClusterElement` | `map-cluster.tsx` | Creates an HTML element for custom cluster markers |
| `MapItemPopup` | `map-item-popup.tsx` | Item preview popup anchored to a marker |
| `MapItemCard` | `map-item-popup.tsx` | Standalone item card for sidebars |
| `MapErrorBoundary` | `map-error-boundary.tsx` | Error boundary with retry button |

All components and types are re-exported from `components/maps/index.ts`.

## The Map Component

The primary component for displaying an interactive map:

```tsx
import { Map } from '@/components/maps';

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
| `markers` | `MapMarkerData[]` | `[]` | Array of marker data objects |
| `center` | `Coordinates` | From settings | Map center point |
| `zoom` | `number` | `12` | Initial zoom level |
| `height` | `number \| string` | `400` | Map container height |
| `width` | `number \| string` | `'100%'` | Map container width |
| `controls` | `object` | See below | Control visibility flags |
| `enableClustering` | `boolean` | `true` | Group nearby markers into clusters |
| `clusterOptions` | `object` | -- | Cluster radius, maxZoom, minPoints |
| `isLoading` | `boolean` | `false` | Show loading overlay externally |
| `isDisabled` | `boolean` | `false` | Render disabled state |
| `error` | `string \| null` | `null` | Display error message |
| `onMarkerClick` | `(marker) => void` | -- | Called when a marker is clicked |
| `onClusterClick` | `(cluster) => void` | -- | Called when a cluster is clicked |
| `onViewportChange` | `(viewport) => void` | -- | Called after pan/zoom |
| `onReady` | `() => void` | -- | Fires when map initialisation completes |
| `onError` | `(error) => void` | -- | Fires on map errors |
| `ariaLabel` | `string` | `'Interactive map'` | Accessibility label |

### Controls Object

```typescript
{
  showZoomControls: true,
  showFullscreenControl: true,
  showScaleControl: false,
}
```

### State Management

The Map component uses the provider abstraction layer (`useMapProviderInstance`) which returns the active provider and its loading/error states. Center and zoom are tracked internally with `useEffect` hooks that update when props change.

### Clustering

When `enableClustering` is `true` (default), markers are grouped using the provider's clustering implementation. Cluster appearance is based on marker count:

| Count | Size | Colour |
|-------|------|--------|
| 1 -- 9 | Small (`w-8 h-8`) | Blue |
| 10 -- 49 | Medium (`w-10 h-10`) | Yellow |
| 50+ | Large (`w-12 h-12`) | Pink |

## LocationPicker

A form-integrated component for selecting locations with address autocomplete:

```tsx
import { LocationPicker } from '@/components/maps';

<LocationPicker
  value={formData.location}
  onChange={(location) => setFormData({ ...formData, location })}
  showServiceArea
  showRemoteOption
/>
```

### Features

- **Address autocomplete** using the configured map provider's geocoding API.
- **Map preview** with a draggable marker for fine-tuning position.
- **"Use My Location" button** that calls the browser geolocation API.
- **Service area dropdown** with four options: Local, Regional, National, Global.
- **Remote/online checkbox** for services without a physical location.
- **Error display** for address and coordinate validation errors.

### LocationPicker Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `LocationPickerValue` | -- | Current location state |
| `onChange` | `(value) => void` | -- | Called on any change |
| `errors` | `object` | -- | Validation errors for address/coordinates |
| `showMap` | `boolean` | `true` | Show the map preview |
| `showServiceArea` | `boolean` | `true` | Show the service area dropdown |
| `showRemoteOption` | `boolean` | `true` | Show the remote checkbox |
| `mapHeight` | `number \| string` | `200` | Height of the map preview |
| `isDisabled` | `boolean` | `false` | Disable all interactions |

### LocationPickerValue

```typescript
interface LocationPickerValue {
  address?: string;
  latitude?: number;
  longitude?: number;
  serviceArea?: 'local' | 'regional' | 'national' | 'global';
  isRemote?: boolean;
}
```

## MapErrorBoundary

Wrap map components in `MapErrorBoundary` to catch rendering errors:

```tsx
import { MapErrorBoundary } from '@/components/maps';

<MapErrorBoundary onRetry={() => refetch()}>
  <Map markers={items} />
</MapErrorBoundary>
```

If the map throws, the boundary shows an error message with a "Try Again" button. You can provide a custom `fallback` node instead.

## MapItemPopup

Displays item details in a popup anchored to a map marker:

```tsx
<MapItemPopup
  item={{ slug: 'example', name: 'Example', category: 'Tools' }}
  isOpen={isPopupOpen}
  position={{ latitude: 40.7128, longitude: -74.0060 }}
  onClose={() => setIsPopupOpen(false)}
  locale="en"
/>
```

The popup includes:
- Item icon, name, and category badge
- Truncated description (max 120 characters)
- "View Details" link to the item page
- Close button with keyboard (Escape) and click-outside support
- Focus management for accessibility

## Hooks

### useMapProviderInstance

Returns the active map provider, loading state, and any initialisation error. Used internally by Map and LocationPicker.

### useLocationSettings

Reads location configuration from the `SettingsProvider` context:

```tsx
import { useLocationSettings } from '@/hooks/use-location-settings';

const { settings } = useLocationSettings();
// settings.enabled, settings.provider, settings.defaultCenter, etc.
```

### useGeolocation

Browser geolocation API wrapper used by LocationPicker for the "Use My Location" feature. Returns `{ isLoading, requestLocation, permission }`.

## Related Pages

- [Map Configuration](../configuration/map-config.md) -- provider keys and YAML settings
- [Location Configuration](../configuration/location-config.md) -- location settings reference
- [Maps and Location Feature](../features/maps-location.md) -- feature overview
- [Provider Setup](../guides/provider-setup.md) -- how SettingsProvider delivers location settings
