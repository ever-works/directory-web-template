---
id: use-user-location-reference
title: useUserLocation
sidebar_label: useUserLocation
sidebar_position: 88
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useUserLocation

A React hook that combines browser geolocation with the user's saved profile location to provide the best available coordinates. Uses browser location as the primary source with profile location as a fallback. Supports saving, clearing, and updating the user's stored location via API mutations.

## Import

```typescript
import { useUserLocation } from '@/template/hooks/use-user-location';
import type { UserLocationProfile, UseUserLocationReturn } from '@/template/hooks/use-user-location';
```

## API Reference

### Parameters

```typescript
function useUserLocation(): UseUserLocationReturn;
```

This hook takes no parameters.

### Return Value

#### `UseUserLocationReturn`

| Property | Type | Description |
|---|---|---|
| `coordinates` | `Coordinates \| null` | Best available coordinates. Browser location takes priority over profile location. `null` if neither is available. |
| `source` | `'browser' \| 'profile' \| null` | Indicates where the current coordinates came from. `null` if no coordinates are available. |
| `profileLocation` | `UserLocationProfile \| null` | The user's saved profile location data from the database, or `null` if not yet loaded. |
| `isLoading` | `boolean` | `true` while either the profile fetch or browser geolocation request is in progress. |
| `requestBrowserLocation` | `() => Promise<Coordinates \| null>` | Requests the user's current location via the browser Geolocation API. Returns coordinates on success, `null` on failure. |
| `saveProfileLocation` | `(data: Partial<UserLocationProfile>) => Promise<UserLocationProfile>` | Saves location data to the user's profile via PATCH to `/api/user/profile/location`. Returns the updated profile location. |
| `clearProfileLocation` | `() => Promise<UserLocationProfile>` | Clears all saved location fields (latitude, longitude, city, country) from the user's profile. |
| `isSaving` | `boolean` | Whether a save or clear mutation is currently in progress. |
| `error` | `Error \| null` | Error from the profile location fetch, or `null`. |

### Types

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface UserLocationProfile {
  defaultLatitude: number | null;
  defaultLongitude: number | null;
  defaultCity: string | null;
  defaultCountry: string | null;
  locationPrivacy: LocationPrivacy;
}

type LocationPrivacy = 'public' | 'approximate' | 'private';

interface UseUserLocationReturn {
  coordinates: Coordinates | null;
  source: 'browser' | 'profile' | null;
  profileLocation: UserLocationProfile | null;
  isLoading: boolean;
  requestBrowserLocation: () => Promise<Coordinates | null>;
  saveProfileLocation: (data: Partial<UserLocationProfile>) => Promise<UserLocationProfile>;
  clearProfileLocation: () => Promise<UserLocationProfile>;
  isSaving: boolean;
  error: Error | null;
}
```

### Constants

```typescript
const USER_LOCATION_QUERY_KEY = ['user', 'profile', 'location'] as const;
```

Exported query key for external cache management.

## Usage Examples

### Basic Location Display

```tsx
import { useUserLocation } from '@/template/hooks/use-user-location';

function LocationBanner() {
  const { coordinates, source, isLoading } = useUserLocation();

  if (isLoading) return <div>Detecting your location...</div>;

  if (!coordinates) {
    return <div>Location not available.</div>;
  }

  return (
    <div>
      <p>
        Showing results near {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
      </p>
      <span className="text-sm text-gray-500">
        Source: {source === 'browser' ? 'Your device' : 'Saved profile'}
      </span>
    </div>
  );
}
```

### Location Request and Save Flow

```tsx
import { useUserLocation } from '@/template/hooks/use-user-location';

function LocationSetup() {
  const {
    coordinates,
    source,
    requestBrowserLocation,
    saveProfileLocation,
    isSaving,
  } = useUserLocation();

  const handleDetectAndSave = async () => {
    const coords = await requestBrowserLocation();
    if (coords) {
      await saveProfileLocation({
        defaultLatitude: coords.latitude,
        defaultLongitude: coords.longitude,
      });
    }
  };

  return (
    <div className="space-y-4">
      {coordinates ? (
        <div>
          <p>Current location: {coordinates.latitude}, {coordinates.longitude}</p>
          <p className="text-sm">Using: {source}</p>
        </div>
      ) : (
        <p>No location set.</p>
      )}

      <button onClick={handleDetectAndSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Detect & Save My Location'}
      </button>
    </div>
  );
}
```

### Location Privacy Settings

```tsx
import { useUserLocation } from '@/template/hooks/use-user-location';

function LocationPrivacySettings() {
  const { profileLocation, saveProfileLocation, isSaving } = useUserLocation();

  const handlePrivacyChange = async (privacy: LocationPrivacy) => {
    await saveProfileLocation({ locationPrivacy: privacy });
  };

  return (
    <div className="space-y-2">
      <h3>Location Privacy</h3>
      {(['public', 'approximate', 'private'] as const).map((level) => (
        <label key={level} className="flex items-center gap-2">
          <input
            type="radio"
            name="privacy"
            value={level}
            checked={profileLocation?.locationPrivacy === level}
            onChange={() => handlePrivacyChange(level)}
            disabled={isSaving}
          />
          <span className="capitalize">{level}</span>
        </label>
      ))}
    </div>
  );
}
```

### Clearing Saved Location

```tsx
import { useUserLocation } from '@/template/hooks/use-user-location';

function LocationManagement() {
  const { profileLocation, clearProfileLocation, isSaving } = useUserLocation();

  const hasSavedLocation = profileLocation?.defaultLatitude != null;

  return (
    <div>
      {hasSavedLocation ? (
        <div>
          <p>
            Saved: {profileLocation.defaultCity ?? 'Unknown city'},{' '}
            {profileLocation.defaultCountry ?? 'Unknown country'}
          </p>
          <button onClick={clearProfileLocation} disabled={isSaving}>
            {isSaving ? 'Clearing...' : 'Clear Saved Location'}
          </button>
        </div>
      ) : (
        <p>No location saved to your profile.</p>
      )}
    </div>
  );
}
```

## Implementation Details

- **Coordinate Priority**: Browser coordinates always take precedence over profile coordinates. The hook checks `browserCoords` first, then falls back to `profileLocation.defaultLatitude/defaultLongitude`. This ensures the most current location is used when available.
- **Browser Geolocation Integration**: Internally uses the `useGeolocation` hook from `@/hooks/use-geolocation` for browser-based location access. The `requestBrowserLocation` function delegates to `requestLocation` from that hook.
- **Profile Data Fetching**: Profile location is fetched via React Query (`useQuery`) from `/api/user/profile/location` using `serverClient.get()`. The query has a 10-minute stale time and 30-minute garbage collection time, with automatic retry (up to 2 times) except for unauthorized errors.
- **Optimistic Cache Update**: The `saveMutation` uses `onSuccess` to immediately update the query cache with the returned data via `queryClient.setQueryData()`, avoiding an extra refetch after saving.
- **Clear Operation**: `clearProfileLocation` is implemented as a mutation that sets all location fields to `null`, effectively the same as calling `saveProfileLocation` with null values for all fields.
- **Authentication-Aware Retry**: The profile fetch does not retry on `"Unauthorized"` errors to prevent unnecessary requests when the user is not logged in.
- **Window Focus Refetch**: The profile query has `refetchOnWindowFocus: false` to prevent unnecessary refetches when the user switches tabs, since location data changes infrequently.

## Edge Cases and Gotchas

- **Unauthenticated Users**: The profile location fetch will fail for unauthenticated users. The `error` state will contain the error, and `profileLocation` will be `null`. Browser geolocation still works regardless of authentication status.
- **Private Location Privacy**: When `locationPrivacy` is `'private'`, the profile location exists in the database but the hook still provides it to the consumer. Privacy enforcement should be handled at the API layer when serving location data to other users.
- **Browser Permission Denied**: If the user denies browser geolocation, `requestBrowserLocation` returns `null`. The hook then falls back to the profile location if available.
- **Both Sources Unavailable**: If neither browser nor profile location is available, `coordinates` is `null` and `source` is `null`. Components should handle this gracefully.
- **Save Without Coordinates**: You can call `saveProfileLocation` with partial data (e.g., only `locationPrivacy`). The PATCH endpoint accepts partial updates.
- **Loading State**: `isLoading` is `true` when either the profile query or the browser geolocation request is in progress. This means the loading state can be `true` briefly even if one source has already resolved.

## Related Hooks

- [useGeolocation](./use-geolocation-reference.md) -- The underlying browser geolocation hook used internally for device location access.
- [useMapCoordinates](./use-map-coordinates-reference.md) -- Fetches all item coordinates for map display.
- [useMapProvider](./use-map-provider-reference.md) -- Provides the map rendering engine to visualize the user's location.
- [useLocationItems](./use-location-items-reference.md) -- Filters items by proximity using location data from this hook.
- [useCurrentUser](./use-current-user-reference.md) -- Provides the authenticated user context needed for profile location operations.
