---
id: geocoding-service
title: "Geocoding Service"
sidebar_label: "Geocoding"
sidebar_position: 29
---

# Geocoding Service

The Geocoding Service provides address-to-coordinate (forward geocoding) and coordinate-to-address (reverse geocoding) functionality with support for multiple providers, built-in caching, and automatic provider fallback.

**Source:** `lib/services/geocoding/`

## Architecture

The geocoding module follows a **provider pattern** with a unified service layer:

```
GeocodingService (main service + cache)
  |-- IGeocodingProvider (interface)
      |-- GoogleGeocodingProvider
      |-- MapboxGeocodingProvider
```

The `GeocodingService` handles provider selection, caching, and fallback logic. Individual providers implement the `IGeocodingProvider` interface and handle API-specific details.

## Provider Interface

All geocoding providers must implement the `IGeocodingProvider` interface:

```ts
interface IGeocodingProvider {
  readonly name: string;

  geocode(
    address: string,
    options?: GeocodingOptions
  ): Promise<GeocodingResult | null>;

  reverseGeocode(
    latitude: number,
    longitude: number,
    options?: GeocodingOptions
  ): Promise<ReverseGeocodingResult | null>;

  isConfigured(): boolean;
}
```

## Result Types

### GeocodingResult (Forward)

Returned when converting an address to coordinates:

```ts
interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;    // ISO 3166-1 alpha-2
  postalCode?: string;
  confidence?: number;     // 0-1 score
  rawResponse?: unknown;   // Provider's raw API response
}
```

### ReverseGeocodingResult

Returned when converting coordinates to an address:

```ts
interface ReverseGeocodingResult {
  formattedAddress: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
  rawResponse?: unknown;
}
```

### GeocodingOptions

Options available for both forward and reverse geocoding:

```ts
interface GeocodingOptions {
  countryCodes?: string[];    // Restrict to specific countries (ISO alpha-2)
  proximity?: {               // Bias results toward a location
    latitude: number;
    longitude: number;
  };
  language?: string;          // Language code for results (e.g., 'en', 'es')
  limit?: number;             // Maximum number of results
}
```

## GeocodingService (Main Service)

### Configuration

```ts
import { getGeocodingService } from '@/lib/services/geocoding';

// Get singleton instance (default configuration)
const geocoding = getGeocodingService();

// Or create with custom configuration
import { GeocodingService } from '@/lib/services/geocoding';

const customGeocoding = new GeocodingService({
  cacheTtlMs: 30 * 60 * 1000,  // 30 minutes
  maxCacheSize: 2000,
});
```

Configuration options:

| Option            | Default      | Description                        |
|-------------------|--------------|------------------------------------|
| `defaultProvider` | From settings| Provider to use by default         |
| `cacheTtlMs`     | 15 minutes   | Cache entry time-to-live           |
| `maxCacheSize`    | 1000 entries | Maximum cached results             |

### Forward Geocoding

Convert an address string to coordinates:

```ts
const result = await geocoding.geocodeAddress(
  '1600 Amphitheatre Parkway, Mountain View, CA',
  { language: 'en' }
);

if (result) {
  console.log(result.latitude, result.longitude);
  // 37.4224764, -122.0842499
}
```

You can specify a particular provider:

```ts
const result = await geocoding.geocodeAddress(
  '10 Downing Street, London',
  { countryCodes: ['GB'] },
  'google'  // Force Google provider
);
```

### Reverse Geocoding

Convert coordinates to an address:

```ts
const result = await geocoding.reverseGeocode(48.8566, 2.3522);

if (result) {
  console.log(result.formattedAddress);
  // "Paris, France"
  console.log(result.city);    // "Paris"
  console.log(result.country); // "France"
}
```

Coordinates are rounded to 5 decimal places (approximately 1.1 meter precision) to improve cache hit rates for nearby lookups.

### Provider Management

```ts
// Check if any provider is configured
const ready = geocoding.isConfigured();

// Check specific provider
const hasGoogle = geocoding.isProviderConfigured('google');
const hasMapbox = geocoding.isProviderConfigured('mapbox');

// Get a specific provider instance
const googleProvider = geocoding.getProvider('google');
```

### Provider Fallback

The `getDefaultProvider` method implements automatic fallback:

1. Read the configured default provider from application settings
2. If that provider is configured (has API key), use it
3. If not, try any other configured provider
4. If none are configured, return the default provider anyway (calls will return `null`)

### Caching

The service maintains an in-memory cache with TTL-based expiration:

- **Cache keys** include the query type, address/coordinates, provider, and all options that affect results
- **Null results are cached** to prevent repeated failed lookups from hitting the API
- **Cache eviction** removes the oldest 10% of entries when the cache reaches maximum size

```ts
// View cache statistics
const stats = geocoding.getCacheStats();
// { size: 42, maxSize: 1000, ttlMs: 900000 }

// Clear the entire cache
geocoding.clearCache();
```

### Singleton Management

```ts
import { getGeocodingService, resetGeocodingService } from '@/lib/services/geocoding';

// Get/create singleton
const service = getGeocodingService();

// Reset singleton (useful for testing)
resetGeocodingService();
```

## Google Geocoding Provider

**Source:** `lib/services/geocoding/google-geocoding.provider.ts`

Uses the Google Maps Geocoding API.

### Configuration

Requires a Google Maps API key via:
- Constructor parameter: `new GoogleGeocodingProvider('your-api-key')`
- Environment variable: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Country Restriction

Google uses the `components` parameter for country filtering:

```ts
// The provider converts country codes to Google's format
// ['US', 'CA'] becomes "country:US|country:CA"
```

### Confidence Scoring

Google's `location_type` is mapped to a confidence score:

| Location Type        | Confidence |
|----------------------|------------|
| `ROOFTOP`            | 1.0        |
| `RANGE_INTERPOLATED` | 0.8        |
| `GEOMETRIC_CENTER`   | 0.6        |
| `APPROXIMATE`        | 0.4        |

### Address Component Parsing

The provider extracts structured data from Google's `address_components` array:

- `locality` maps to city
- `administrative_area_level_1` maps to state
- `country` provides country name and country code
- `postal_code` provides ZIP/postal code
- Falls back to `sublocality` or `administrative_area_level_2` if `locality` is not present

## Mapbox Geocoding Provider

**Source:** `lib/services/geocoding/mapbox-geocoding.provider.ts`

Uses the Mapbox Geocoding API (v5).

### Configuration

Requires a Mapbox access token via:
- Constructor parameter: `new MapboxGeocodingProvider('your-token')`
- Environment variable: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

### Context Parsing

Mapbox returns structured data in a `context` array with prefixed IDs:

| Context ID Prefix | Maps To      |
|-------------------|--------------|
| `place.`          | City         |
| `region.`         | State        |
| `country.`        | Country      |
| `postcode.`       | Postal Code  |

### Confidence Scoring

Mapbox provides a `relevance` score (0-1) for each result, which maps directly to the `confidence` field.

### Coordinate Order

Mapbox uses `[longitude, latitude]` order (GeoJSON convention), which the provider automatically converts to the standard `latitude, longitude` order used by the interface.

## Module Exports

The geocoding module re-exports everything from a single entry point:

```ts
import {
  // Service
  GeocodingService,
  getGeocodingService,
  resetGeocodingService,
  type GeocodingServiceConfig,

  // Providers
  GoogleGeocodingProvider,
  MapboxGeocodingProvider,

  // Types
  type IGeocodingProvider,
  type GeocodingResult,
  type ReverseGeocodingResult,
  type GeocodingOptions,
} from '@/lib/services/geocoding';
```
