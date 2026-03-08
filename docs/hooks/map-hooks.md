---
id: map-hooks
title: Map & Location Hooks
sidebar_label: Map & Location Hooks
sidebar_position: 9
---

# Map & Location Hooks

Hooks for map provider abstraction, fetching item coordinates, and managing user geolocation with profile persistence.

## useMapCoordinates

Fetches all item coordinates from the location index API for rendering markers on a map view. Uses React Query for caching.

```
useMapCoordinates(enabled?: boolean): UseMapCoordinatesReturn
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Whether to fetch coordinates. Set to `false` when the map view is not active. |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `coordinates` | `CoordinateEntry[]` | Array of coordinate entries for map markers |
| `isLoading` | `boolean` | Whether coordinates are being fetched |
| `error` | `Error \| null` | Fetch error |

### CoordinateEntry Shape

| Field | Type | Description |
|-------|------|-------------|
| `slug` | `string` | Item slug for linking |
| `latitude` | `number` | Latitude coordinate |
| `longitude` | `number` | Longitude coordinate |
| `city` | `string \| null` | City name |
| `country` | `string \| null` | Country name |

### Query Configuration

| Setting | Value |
|---------|-------|
| Query key | `['map-coordinates']` |
| Stale time | 5 minutes |
| GC time | 10 minutes |
| Endpoint | `GET /api/location/coordinates` |

```tsx
import { useMapCoordinates } from '@/hooks/use-map-coordinates';

function MapView() {
  const { coordinates, isLoading } = useMapCoordinates();

  if (isLoading) return <MapSkeleton />;

  return (
    <Map>
      {coordinates.map((coord) => (
        <Marker
          key={coord.slug}
          lat={coord.latitude}
          lng={coord.longitude}
          label={coord.city ?? coord.slug}
        />
      ))}
    </Map>
  );
}
```

---

## useMapProvider

Loads and initializes the configured map provider (Mapbox or Google Maps) based on location settings. Handles script loading, environment variable checking, and error states.

```
useMapProvider(): UseMapProviderResult & { providerInstance: IMapProvider | null }
```

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `provider` | `'mapbox' \| 'google'` | The configured provider name |
| `providerInstance` | `IMapProvider \| null` | The loaded provider instance |
| `isConfigured` | `boolean` | Whether the required API key env var is set |
| `isLoading` | `boolean` | Whether the provider script is loading |
| `error` | `Error \| null` | Error during provider initialization |
| `mapStyle` | `string` | The configured map style |

### Provider Detection

The hook checks environment variables to determine if a provider is configured:

| Provider | Environment Variable |
|----------|---------------------|
| Mapbox | `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |

### Provider Loading Flow

1. Reads provider setting from `useLocationSettings()`
2. Checks if the required env var is present
3. Dynamically imports the provider implementation
4. Calls `provider.loadScript()` to pre-load external SDK
5. Returns the ready provider instance

```tsx
import { useMapProvider } from '@/hooks/use-map-provider';

function MapContainer() {
  const { provider, providerInstance, isConfigured, isLoading, error } =
    useMapProvider();

  if (!isConfigured) return <p>Map provider not configured</p>;
  if (isLoading) return <Spinner />;
  if (error) return <p>Failed to load map: {error.message}</p>;

  return <div ref={(el) => providerInstance?.createMap(el, options)} />;
}
```

### useMapProviderInstance

A convenience wrapper that returns only the instance-related properties.

```
useMapProviderInstance(): {
  provider: IMapProvider | null;
  isLoading: boolean;
  error: Error | null;
}
```

```tsx
const { provider, isLoading } = useMapProviderInstance();

if (provider) {
  provider.createMap(containerRef.current, { center, zoom });
}
```

---

## useUserLocation

Combines browser geolocation with the user's saved profile location. Browser coordinates take priority over profile coordinates. Includes mutations for saving and clearing the profile location.

```
useUserLocation(): UseUserLocationReturn
```

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `coordinates` | `Coordinates \| null` | Best available coordinates (browser or profile) |
| `source` | `'browser' \| 'profile' \| null` | Where the coordinates came from |
| `profileLocation` | `UserLocationProfile \| null` | Saved profile location data |
| `isLoading` | `boolean` | Whether profile fetch or browser geo is pending |
| `requestBrowserLocation` | `() => Promise<Coordinates \| null>` | Prompt browser geolocation |
| `saveProfileLocation` | `(data) => Promise<UserLocationProfile>` | Save location to user profile |
| `clearProfileLocation` | `() => Promise<UserLocationProfile>` | Clear saved profile location |
| `isSaving` | `boolean` | Whether a save/clear operation is in progress |
| `error` | `Error \| null` | Profile fetch error |

### UserLocationProfile Shape

| Field | Type | Description |
|-------|------|-------------|
| `defaultLatitude` | `number \| null` | Saved latitude |
| `defaultLongitude` | `number \| null` | Saved longitude |
| `defaultCity` | `string \| null` | Saved city name |
| `defaultCountry` | `string \| null` | Saved country name |
| `locationPrivacy` | `LocationPrivacy` | Privacy setting for location sharing |

### Coordinate Priority

1. **Browser coordinates** (from `useGeolocation`) -- highest priority
2. **Profile coordinates** (from database) -- fallback when browser geo is unavailable

### Query Configuration

| Setting | Value |
|---------|-------|
| Query key | `['user', 'profile', 'location']` |
| Stale time | 10 minutes |
| GC time | 30 minutes |
| Retry | Up to 2 times; skips on "Unauthorized" errors |

```tsx
import { useUserLocation } from '@/hooks/use-user-location';

function LocationDisplay() {
  const {
    coordinates,
    source,
    requestBrowserLocation,
    saveProfileLocation,
    isSaving,
  } = useUserLocation();

  const handleSave = async () => {
    if (coordinates) {
      await saveProfileLocation({
        defaultLatitude: coordinates.latitude,
        defaultLongitude: coordinates.longitude,
      });
    }
  };

  return (
    <div>
      {coordinates ? (
        <p>
          Location ({source}): {coordinates.latitude.toFixed(4)},{' '}
          {coordinates.longitude.toFixed(4)}
        </p>
      ) : (
        <button onClick={requestBrowserLocation}>
          Share Location
        </button>
      )}
      <button onClick={handleSave} disabled={isSaving || !coordinates}>
        Save to Profile
      </button>
    </div>
  );
}
```

---

## Summary Table

| Hook | Purpose | Source File |
|------|---------|-------------|
| `useMapCoordinates` | Fetch item coordinates for map markers | `use-map-coordinates.ts` |
| `useMapProvider` | Load and initialize map provider | `use-map-provider.ts` |
| `useMapProviderInstance` | Convenience wrapper for provider instance | `use-map-provider.ts` |
| `useUserLocation` | Browser + profile geolocation with CRUD | `use-user-location.ts` |
