---
id: use-location-settings-reference
title: useLocationSettings Hook Reference
sidebar_label: useLocationSettings
sidebar_position: 89
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useLocationSettings

A lightweight client-side hook that provides access to the application's location settings. Reads from the server-rendered `SettingsProvider` context for instant, synchronous access with no loading delay.

**Source file:** `template/hooks/use-location-settings.ts`

## Overview

`useLocationSettings` is a thin wrapper around the `SettingsProvider` context that extracts and returns the `locationSettings` object. Since the settings are injected server-side during rendering, this hook returns data immediately without any fetch or loading state -- the `loading` field is always `false` and `error` is always `null`.

Use this hook in any client component that needs to read location configuration such as the map provider, distance filtering options, default radius, or map style.

## Signature

```ts
function useLocationSettings(): {
  settings: LocationSettings;
  loading: boolean;
  error: Error | null;
}
```

## Parameters

None. This hook takes no arguments.

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `settings` | `LocationSettings` | The complete location settings object from the application configuration |
| `loading` | `boolean` | Always `false`. Included for API consistency with other settings hooks. |
| `error` | `Error \| null` | Always `null`. Included for API consistency with other settings hooks. |

## Types

### LocationSettings

```ts
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

### MapProvider

```ts
type MapProvider = 'mapbox' | 'google';
```

### MapStyle

```ts
type MapStyle = 'streets' | 'satellite';
```

### Default Values

When location settings are not configured, the following defaults are used:

| Property | Default Value |
|----------|---------------|
| `enabled` | `false` |
| `provider` | `'mapbox'` |
| `mapStyle` | `'streets'` |
| `distanceFilterEnabled` | `true` |
| `distanceSortEnabled` | `true` |
| `defaultRadiusKm` | `50` |
| `showExactAddress` | `false` |
| `requireLocationOnSubmit` | `false` |
| `defaultCenter` | `{ latitude: 0, longitude: 0 }` |

## Implementation Details

### No Loading State

Unlike hooks that fetch data from an API, `useLocationSettings` reads directly from the `SettingsProvider` React context. This context is populated during server-side rendering from the application's `config.yml` file, so the data is available on first render. The `loading: false` and `error: null` return values exist for API parity with other settings hooks (e.g., `useHeaderSettings`, `useFooterSettings`), allowing consumers to use a consistent pattern.

### Settings Source

The settings originate from the `settings.location` section of `config.yml`, which is parsed from snake_case YAML keys (e.g., `distance_filter_enabled`) into camelCase runtime properties (e.g., `distanceFilterEnabled`) by the `mapLocationConfigToRuntime` utility.

## Usage Examples

### Checking if location features are enabled

```tsx
import { useLocationSettings } from '@/hooks/use-location-settings';

function LocationFeatureGate({ children }) {
  const { settings } = useLocationSettings();

  if (!settings.enabled) {
    return null;
  }

  return <>{children}</>;
}
```

### Configuring map defaults

```tsx
import { useLocationSettings } from '@/hooks/use-location-settings';

function MapContainer() {
  const { settings } = useLocationSettings();

  return (
    <Map
      provider={settings.provider}
      style={settings.mapStyle}
      center={[settings.defaultCenter.latitude, settings.defaultCenter.longitude]}
      zoom={10}
    />
  );
}
```

### Conditional distance filter UI

```tsx
import { useLocationSettings } from '@/hooks/use-location-settings';

function LocationFilters() {
  const { settings } = useLocationSettings();

  return (
    <div>
      {settings.distanceFilterEnabled && (
        <RadiusSlider defaultRadius={settings.defaultRadiusKm} />
      )}

      {settings.distanceSortEnabled && (
        <SortByDistanceToggle />
      )}
    </div>
  );
}
```

### Controlling address display

```tsx
import { useLocationSettings } from '@/hooks/use-location-settings';

function ItemLocationDisplay({ address, city, country }) {
  const { settings } = useLocationSettings();

  if (settings.showExactAddress) {
    return <p>{address}</p>;
  }

  return <p>{city}, {country}</p>;
}
```

### Form submission with location requirement

```tsx
import { useLocationSettings } from '@/hooks/use-location-settings';

function SubmissionForm() {
  const { settings } = useLocationSettings();

  return (
    <form>
      <TextInput name="title" label="Title" required />
      <TextInput name="description" label="Description" required />

      <LocationPicker
        required={settings.requireLocationOnSubmit}
        showMap={settings.enabled}
      />

      {settings.requireLocationOnSubmit && (
        <p className="text-sm text-muted">
          Location is required for this submission.
        </p>
      )}

      <button type="submit">Submit</button>
    </form>
  );
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `@/components/providers/settings-provider` | `useSettings` context hook providing `locationSettings` |
| `@/lib/types/location` | `LocationSettings` type definition |

## Related Hooks

- [`useMapProvider`](/docs/template/hooks/use-map-provider-reference) -- Loads the map provider implementation based on these settings
- [`useMapCoordinates`](/docs/template/hooks/use-map-coordinates-reference) -- Fetches item coordinates for map markers
- [`useUserLocation`](/docs/template/hooks/use-user-location-reference) -- User location with browser geolocation and profile fallback
- [`useGeolocation`](/docs/template/hooks/use-geolocation-reference) -- Browser Geolocation API wrapper
- [`useHeaderSettings`](/docs/template/hooks/use-header-settings-reference) -- Similar pattern for header configuration
- [`useFooterSettings`](/docs/template/hooks/use-footer-settings-reference) -- Similar pattern for footer configuration
