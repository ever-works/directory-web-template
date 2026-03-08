---
id: use-geolocation-reference
title: useGeolocation
sidebar_label: useGeolocation
sidebar_position: 30
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useGeolocation

A React hook for accessing browser geolocation with permission handling, loading states, error handling, and optional continuous position watching.

## Import

```typescript
import { useGeolocation } from '@/hooks/use-geolocation';
```

## API Reference

### Parameters

```typescript
function useGeolocation(options?: UseGeolocationOptions): UseGeolocationReturn;
```

#### `UseGeolocationOptions`

| Property | Type | Default | Description |
|---|---|---|---|
| `enableHighAccuracy` | `boolean` | `true` | Enable high accuracy mode (GPS). Uses more battery on mobile devices. |
| `timeout` | `number` | `10000` | Maximum time in milliseconds to wait for a position. |
| `maximumAge` | `number` | `0` | Maximum age of a cached position in milliseconds. `0` forces a fresh lookup. |
| `watchPosition` | `boolean` | `false` | Continuously watch for position changes instead of a one-time request. |

### Return Value

#### `UseGeolocationReturn`

| Property | Type | Description |
|---|---|---|
| `coordinates` | `Coordinates \| null` | Current coordinates (`{ latitude: number; longitude: number }`) or `null` if not yet obtained. |
| `error` | `GeolocationErrorType \| null` | Error type if geolocation failed: `'PERMISSION_DENIED'`, `'POSITION_UNAVAILABLE'`, `'TIMEOUT'`, or `'NOT_SUPPORTED'`. |
| `isLoading` | `boolean` | Whether a geolocation request is currently in progress. |
| `permission` | `PermissionState \| null` | Current permission status: `'granted'`, `'denied'`, `'prompt'`, or `null` if unknown. |
| `requestLocation` | `() => Promise<Coordinates \| null>` | Requests the user's current location. Returns coordinates on success or `null` on failure. |
| `isSupported` | `boolean` | Whether the Geolocation API is supported in the current browser. |
| `clearPosition` | `() => void` | Clears the current position and error state. |

### Types

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}

type GeolocationErrorType =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NOT_SUPPORTED';
```

## Usage Examples

### Basic Location Request

```tsx
function LocationButton() {
  const { coordinates, isLoading, error, requestLocation } = useGeolocation();

  const handleClick = async () => {
    const coords = await requestLocation();
    if (coords) {
      console.log(`Lat: ${coords.latitude}, Lng: ${coords.longitude}`);
    }
  };

  return (
    <div>
      <button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Getting location...' : 'Use My Location'}
      </button>
      {error && <p className="text-red-500">Error: {error}</p>}
      {coordinates && (
        <p>Location: {coordinates.latitude}, {coordinates.longitude}</p>
      )}
    </div>
  );
}
```

### Continuous Position Watching

```tsx
function LiveTracker() {
  const { coordinates, error } = useGeolocation({
    watchPosition: true,
    enableHighAccuracy: true,
  });

  return (
    <div>
      {coordinates ? (
        <p>Current position: {coordinates.latitude}, {coordinates.longitude}</p>
      ) : (
        <p>Waiting for location...</p>
      )}
      {error && <p>Tracking error: {error}</p>}
    </div>
  );
}
```

### Permission-Aware UI

```tsx
function SmartLocationPrompt() {
  const { permission, isSupported, requestLocation, coordinates } = useGeolocation();

  if (!isSupported) {
    return <p>Geolocation is not supported in your browser.</p>;
  }

  if (permission === 'denied') {
    return (
      <div className="bg-yellow-50 p-4 rounded">
        <p>Location access was denied. Please enable it in your browser settings.</p>
      </div>
    );
  }

  return (
    <button onClick={requestLocation}>
      {permission === 'granted' ? 'Update Location' : 'Allow Location Access'}
    </button>
  );
}
```

## Configuration

This hook requires no server-side configuration. It relies on the browser's native Geolocation API. For the `Coordinates` and `GeolocationState` types, they are defined in `@/lib/maps/types`.

### Browser Requirements

- The Geolocation API requires HTTPS in production (most browsers block geolocation on `http://`).
- `localhost` is treated as a secure context and works without HTTPS during development.

## Edge Cases and Gotchas

- **SSR Safety**: The hook checks for `navigator` before accessing geolocation, making it safe for server-side rendering. The `isSupported` flag returns `false` during SSR.
- **Permission State on Mount**: The hook queries `navigator.permissions` on mount to determine the initial permission state. Not all browsers support the Permissions API, in which case `permission` will be `null`.
- **High Accuracy Mode**: Setting `enableHighAccuracy: true` (the default) may use GPS on mobile devices, increasing battery consumption. Set it to `false` for coarse location that uses Wi-Fi/cell tower triangulation.
- **Watch Cleanup**: When `watchPosition` is `true`, the watcher is automatically cleaned up when the component unmounts. You do not need to manually stop watching.
- **Promise Resolution**: `requestLocation` always resolves (never rejects). On failure, it resolves to `null` and sets the `error` state. Check both the return value and the `error` state to handle failures.
- **Timeout Behavior**: If the browser cannot determine the position within the `timeout` period, the error will be `'TIMEOUT'`. Consider increasing the timeout on slow networks.

## Related Hooks

- [useIsMobile](./use-mobile-reference.md) -- Detect mobile devices where geolocation behavior may differ.
- [useDebouncedSearch](./use-debounced-search-reference.md) -- Debounce location-based search queries after coordinates change.
