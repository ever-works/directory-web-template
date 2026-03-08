---
id: use-map-provider-reference
title: useMapProvider
sidebar_label: useMapProvider
sidebar_position: 87
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useMapProvider

A React hook that dynamically loads and initializes the configured map provider (Mapbox or Google Maps). Reads the provider setting from location settings, verifies configuration via environment variables, and lazy-loads the appropriate provider implementation. Also exports a convenience `useMapProviderInstance` wrapper.

## Import

```typescript
import { useMapProvider, useMapProviderInstance } from '@/template/hooks/use-map-provider';
```

## API Reference

### `useMapProvider`

```typescript
function useMapProvider(): UseMapProviderResult & { providerInstance: IMapProvider | null };
```

#### Return Value

| Property | Type | Description |
|---|---|---|
| `provider` | `string` | The configured provider name from location settings (e.g., `'mapbox'` or `'google'`). |
| `providerInstance` | `IMapProvider \| null` | The loaded map provider instance, or `null` if not yet loaded or not configured. |
| `isConfigured` | `boolean` | Whether the required environment variable for the provider is set (`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` for Mapbox, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for Google). |
| `isLoading` | `boolean` | Whether the provider script is currently being loaded. |
| `error` | `Error \| null` | Error if provider loading failed, otherwise `null`. |
| `mapStyle` | `string` | The configured map style from location settings. |

### `useMapProviderInstance`

```typescript
function useMapProviderInstance(): {
  provider: IMapProvider | null;
  isLoading: boolean;
  error: Error | null;
};
```

A convenience wrapper that returns only the instance-related properties from `useMapProvider`.

| Property | Type | Description |
|---|---|---|
| `provider` | `IMapProvider \| null` | The loaded map provider instance, or `null` if not configured or still loading. |
| `isLoading` | `boolean` | Whether the provider is currently loading. |
| `error` | `Error \| null` | Error object if loading failed. |

### Types

```typescript
// From @/lib/maps/providers/map-provider.interface
interface IMapProvider {
  loadScript(): Promise<void>;
  // Additional map provider methods (createMap, addMarker, etc.)
}

// From @/lib/maps/types
interface UseMapProviderResult {
  provider: string;
  isConfigured: boolean;
  isLoading: boolean;
  error: Error | null;
  mapStyle: string;
}
```

## Usage Examples

### Rendering a Map with the Active Provider

```tsx
import { useMapProvider } from '@/template/hooks/use-map-provider';
import { useMapCoordinates } from '@/template/hooks/use-map-coordinates';

function MapView() {
  const { providerInstance, isConfigured, isLoading, error, mapStyle } = useMapProvider();
  const { coordinates } = useMapCoordinates();

  if (!isConfigured) {
    return (
      <div className="p-8 text-center text-gray-500">
        Map provider is not configured. Set the required environment variable.
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center">Loading map...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Failed to load map: {error.message}</div>;
  }

  if (!providerInstance) {
    return null;
  }

  return (
    <MapRenderer
      provider={providerInstance}
      style={mapStyle}
      markers={coordinates}
    />
  );
}
```

### Using the Convenience Instance Hook

```tsx
import { useMapProviderInstance } from '@/template/hooks/use-map-provider';
import { useEffect, useRef } from 'react';

function SimpleMap() {
  const { provider, isLoading, error } = useMapProviderInstance();
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (provider && mapContainerRef.current) {
      // Initialize the map using the provider instance
      // provider.createMap(mapContainerRef.current, options);
    }
  }, [provider]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!provider) return <div>No map provider available.</div>;

  return <div ref={mapContainerRef} className="w-full h-96" />;
}
```

### Checking Provider Configuration

```tsx
import { useMapProvider } from '@/template/hooks/use-map-provider';

function MapSettings() {
  const { provider, isConfigured } = useMapProvider();

  return (
    <div className="space-y-2">
      <div>
        <span className="font-medium">Provider:</span> {provider}
      </div>
      <div>
        <span className="font-medium">Status:</span>{' '}
        {isConfigured ? (
          <span className="text-green-600">Configured</span>
        ) : (
          <span className="text-red-600">
            Not configured. Set{' '}
            {provider === 'mapbox'
              ? 'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN'
              : 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'}{' '}
            in your environment.
          </span>
        )}
      </div>
    </div>
  );
}
```

## Implementation Details

- **Dynamic Import**: The provider implementation is loaded via `await import()` to keep the initial bundle size small. `MapboxMapProvider` and `GoogleMapProvider` are only loaded when the corresponding provider is selected.
- **Script Pre-Loading**: After importing the provider module, the hook calls `instance.loadScript()` to pre-load the external map library script (Mapbox GL JS or Google Maps JavaScript API). This ensures the script is ready before any map rendering attempt.
- **Environment Variable Check**: The `isConfigured` flag checks `process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (for Mapbox) or `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (for Google) using `Boolean()`. If the required key is not set, the provider instance is set to `null` and no loading occurs.
- **Settings Integration**: The hook reads the provider name and map style from `useLocationSettings()`, which manages location-related application settings. Changing the provider in settings triggers a re-load of the corresponding provider module.
- **Cleanup on Unmount**: The `useEffect` uses an `isMounted` flag to prevent state updates after the component unmounts, avoiding the "setState on unmounted component" warning during async provider loading.
- **Provider Change Handling**: When the `provider` setting changes (e.g., switching from Mapbox to Google Maps), the effect re-runs, loading the new provider and discarding the old instance.

## Edge Cases and Gotchas

- **Missing Environment Variables**: If the required environment variable is not set, `isConfigured` is `false` and `providerInstance` remains `null`. The hook does not throw or log errors in this case -- it is a valid unconfigured state.
- **Unsupported Providers**: The hook currently only supports `'mapbox'` and `'google'`. If a different provider name is returned from settings, `isConfigured` will be `false`.
- **Script Loading Failures**: Network issues or invalid API keys can cause `loadScript()` to fail. The error is captured in the `error` state. Common causes include expired API keys, domain restrictions, or CSP (Content Security Policy) blocking.
- **First Render**: On the first render, `providerInstance` is always `null` because the dynamic import is async. Always check for `null` before using the instance.
- **Multiple Instances**: Each component that calls `useMapProvider` gets its own provider instance. If you need a shared instance across components, consider lifting the provider to a React context.

## Related Hooks

- [useMapCoordinates](./use-map-coordinates-reference.md) -- Fetches item coordinates to display as markers on the map.
- [useUserLocation](./use-user-location-reference.md) -- Provides user coordinates for centering the map.
- [useGeolocation](./use-geolocation-reference.md) -- Browser geolocation that works with any map provider.
- [useLocationItems](./use-location-items-reference.md) -- Location-filtered items that can be highlighted on the map.
