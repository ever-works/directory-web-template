---
id: location-services
title: Location & Geocoding Services
sidebar_label: Location & Geocoding
sidebar_position: 5
---

# Location & Geocoding Services

The template provides a comprehensive location system with geocoding, distance calculations, and a database-backed location index. The system is organized into two modules: **geocoding** (address-to-coordinate conversion) and **location** (distance calculations and index management).

## Architecture

```
lib/services/
  geocoding/
    geocoding-provider.interface.ts   # Provider contract
    geocoding.service.ts              # Main service with caching
    google-geocoding.provider.ts      # Google Maps implementation
    mapbox-geocoding.provider.ts      # Mapbox implementation
    index.ts                          # Module exports
  location/
    location.service.ts               # Distance & geo calculations
    location-index.service.ts         # Database index management
    index.ts                          # Module exports
```

## Geocoding Provider Interface

All geocoding providers implement the `IGeocodingProvider` interface, enabling a plug-and-play architecture:

```typescript
interface IGeocodingProvider {
  readonly name: string;
  geocode(address: string, options?: GeocodingOptions): Promise<GeocodingResult | null>;
  reverseGeocode(lat: number, lng: number, options?: GeocodingOptions): Promise<ReverseGeocodingResult | null>;
  isConfigured(): boolean;
}
```

### GeocodingResult

| Field | Type | Description |
|-------|------|-------------|
| `latitude` | `number` | Latitude coordinate |
| `longitude` | `number` | Longitude coordinate |
| `formattedAddress` | `string` | Provider-formatted address |
| `city` | `string?` | City/locality |
| `state` | `string?` | State/region |
| `country` | `string?` | Country name |
| `countryCode` | `string?` | ISO 3166-1 alpha-2 code |
| `postalCode` | `string?` | Postal/ZIP code |
| `confidence` | `number?` | Confidence score (0-1) |

### GeocodingOptions

```typescript
interface GeocodingOptions {
  countryCodes?: string[];  // Restrict to countries
  proximity?: { latitude: number; longitude: number }; // Bias toward location
  language?: string;        // Result language (e.g., 'en', 'de')
  limit?: number;           // Max results
}
```

## Google Geocoding Provider

Uses the Google Maps Geocoding API with automatic address component parsing.

```typescript
const provider = new GoogleGeocodingProvider();
// Requires: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

const result = await provider.geocode('1600 Amphitheatre Pkwy, Mountain View, CA');
// Returns coordinates, parsed city/state/country, confidence score
```

### Confidence Scoring

The Google provider maps `location_type` to a confidence score:

| Location Type | Confidence |
|--------------|------------|
| `ROOFTOP` | 1.0 |
| `RANGE_INTERPOLATED` | 0.8 |
| `GEOMETRIC_CENTER` | 0.6 |
| `APPROXIMATE` | 0.4 |

## Mapbox Geocoding Provider

Uses the Mapbox Geocoding API with context-based field extraction.

```typescript
const provider = new MapboxGeocodingProvider();
// Requires: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

const result = await provider.geocode('Berlin, Germany', {
  language: 'de',
  countryCodes: ['DE'],
});
```

The Mapbox provider uses the `relevance` field from the API response as the confidence score and extracts city, state, and country from the feature's `context` array.

## GeocodingService (Main Service)

The `GeocodingService` is the primary entry point, providing provider abstraction and in-memory caching.

### Configuration

```typescript
interface GeocodingServiceConfig {
  defaultProvider?: 'mapbox' | 'google';
  cacheTtlMs?: number;     // Default: 15 minutes
  maxCacheSize?: number;    // Default: 1000 entries
}
```

### Usage

```typescript
import { getGeocodingService } from '@/lib/services/geocoding';

const geocoding = getGeocodingService();

// Forward geocoding (address -> coordinates)
const result = await geocoding.geocodeAddress('123 Main St, City, US');

// Reverse geocoding (coordinates -> address)
const address = await geocoding.reverseGeocode(40.7128, -74.0060);

// Use a specific provider
const googleResult = await geocoding.geocodeAddress('Tokyo, Japan', {}, 'google');

// Check provider availability
geocoding.isConfigured();              // Any provider ready?
geocoding.isProviderConfigured('google'); // Specific provider ready?
```

### Caching Strategy

The service caches results in memory with configurable TTL and size limits:

- **Cache key** includes query type, address/coordinates, provider, country codes, language, and proximity
- **Null results** are cached to prevent repeated failed lookups
- **Eviction** removes the oldest 10% of entries when cache is full
- **Coordinate rounding** to 5 decimal places reduces cache misses for nearby reverse-geocode queries

```typescript
// Cache management
geocoding.clearCache();
const stats = geocoding.getCacheStats();
// { size: 42, maxSize: 1000, ttlMs: 900000 }
```

### Provider Fallback

The service selects the default provider from settings. If the configured provider is not available, it falls back to any configured provider:

1. Check configured provider from `getLocationProvider()`
2. If not available, try each registered provider
3. Return the first configured provider found

## LocationService

The `LocationService` provides geographic calculations using the Haversine formula.

### Distance Calculations

```typescript
import { getLocationService } from '@/lib/services/location';

const location = getLocationService();

// Distance between two points (in kilometers)
const km = location.calculateDistance(40.7128, -74.0060, 51.5074, -0.1278);

// Using coordinate objects
const distance = location.calculateDistanceBetween(
  { latitude: 40.7128, longitude: -74.0060 },
  { latitude: 51.5074, longitude: -0.1278 }
);
```

### Filtering and Sorting

```typescript
const items = [
  { slug: 'nyc', latitude: 40.7128, longitude: -74.0060 },
  { slug: 'la', latitude: 34.0522, longitude: -118.2437 },
];
const center = { latitude: 41.8781, longitude: -87.6298 }; // Chicago

// Filter by radius (returns slugs)
const nearby = location.filterByRadius(items, center, 1500); // within 1500km

// Filter with distances
const withDist = location.filterByRadiusWithDistance(items, center, 1500);

// Sort by distance (closest first)
const sorted = location.sortByDistance(items, center);
const sortedWithDist = location.sortByDistanceWithValues(items, center);
```

### Bounding Box Calculations

Used for efficient database pre-filtering before applying precise distance calculations:

```typescript
const box = location.calculateBoundingBox(center, 100); // 100km radius
// { minLat, maxLat, minLng, maxLng }

const isInside = location.isWithinBoundingBox(point, box);
```

### Distance Formatting

```typescript
location.formatDistance(5.3);          // "5.3 km"
location.formatDistance(0.5);          // "500 m"
location.formatDistance(5.3, true);    // "3.3 mi"
location.formatDistance(0.1, true);    // "528 ft"

location.kmToMiles(10);   // 6.21371
location.milesToKm(10);   // 16.0934
```

## LocationIndexService

The `LocationIndexService` manages the sync between YAML location data and a database index for fast geographic queries. The database serves as an index -- YAML files remain the source of truth.

### Indexing Items

```typescript
import { getLocationIndexService } from '@/lib/services/location';

const indexService = getLocationIndexService();

// Index a single item (geocodes if coordinates missing)
const result = await indexService.indexItem(item);
// { slug, success, geocoded, error? }

// Remove from index
await indexService.removeFromIndex('item-slug');
```

### Index Rebuilding

Full index rebuild processes items in batches of 50 for performance:

```typescript
const result = await indexService.rebuildIndex(allItems);
// {
//   totalProcessed: 500,
//   indexed: 450,
//   skipped: 30,
//   failed: 20,
//   errors: [{ slug, error }],
//   durationMs: 12500
// }
```

### Geographic Queries

```typescript
// Query by radius (uses bounding box pre-filter + Haversine precision)
const nearby = await indexService.queryByRadius({
  latitude: 40.7128,
  longitude: -74.0060,
  radiusKm: 50,
  includeRemote: true,
  limit: 20,
});

// Query by city or country
const cityItems = await indexService.queryByCity('Berlin');
const countryItems = await indexService.queryByCountry('Germany');

// Get remote-only items
const remoteItems = await indexService.queryRemoteItems();

// Get location for specific items
const location = await indexService.getItemLocation('item-slug');
const locations = await indexService.getItemsLocations(['slug-1', 'slug-2']);
```

### Remote Items

Items marked as `is_remote: true` without coordinates are stored with default coordinates `(0, 0)` and excluded from distance calculations. They are appended after distance-sorted results when `includeRemote` is enabled.

### Feature Toggle

Location features can be enabled/disabled through application settings:

```typescript
if (indexService.isEnabled()) {
  // Location features are active
}
```

## Source Files

| File | Path |
|------|------|
| Geocoding Provider Interface | `template/lib/services/geocoding/geocoding-provider.interface.ts` |
| Geocoding Service | `template/lib/services/geocoding/geocoding.service.ts` |
| Google Provider | `template/lib/services/geocoding/google-geocoding.provider.ts` |
| Mapbox Provider | `template/lib/services/geocoding/mapbox-geocoding.provider.ts` |
| Location Service | `template/lib/services/location/location.service.ts` |
| Location Index Service | `template/lib/services/location/location-index.service.ts` |
