---
id: geocode-endpoints
title: "Geocode API Reference"
sidebar_label: "Geocode"
sidebar_position: 50
---

# Geocode API Reference

## Overview

The Geocode endpoints provide forward geocoding (address to coordinates) and reverse geocoding (coordinates to address) capabilities. Results are cached for 15 minutes to reduce external API calls. These endpoints require admin authentication to prevent cost abuse of underlying Mapbox/Google geocoding services.

## Endpoints

### POST /api/geocode

Converts an address to coordinates (forward geocoding) or coordinates to an address (reverse geocoding). The request body determines which operation is performed based on whether `address` or `latitude`/`longitude` fields are provided.

#### Forward Geocoding (address to coordinates)

**Request**
```typescript
{
  address: string;          // 1-500 characters, required
  options?: {
    countryCodes?: string[];  // ISO 3166-1 alpha-2 codes, e.g. ["US", "CA"]
    language?: string;        // ISO 639-1 language code, e.g. "en"
    proximity?: {
      latitude: number;       // -90 to 90
      longitude: number;      // -180 to 180
    };
  };
}
```

**Response**
```typescript
{
  success: true;
  data: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
    confidence: number;       // 0 to 1
  };
}
```

**Example**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '1600 Amphitheatre Parkway, Mountain View, CA',
    options: {
      countryCodes: ['US'],
      language: 'en'
    }
  })
});
const data = await response.json();
```

#### Reverse Geocoding (coordinates to address)

**Request**
```typescript
{
  latitude: number;         // -90 to 90, required
  longitude: number;        // -180 to 180, required
  options?: {
    language?: string;        // ISO 639-1 language code
  };
}
```

**Response**
```typescript
{
  success: true;
  data: {
    formattedAddress: string;
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
  };
}
```

**Example**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 37.4224764,
    longitude: -122.0842499,
    options: { language: 'en' }
  })
});
const data = await response.json();
```

### GET /api/geocode

Returns the status of the geocoding service including which providers are configured and cache statistics.

**Request**

No request body required. Authentication via session cookie.

**Response**
```typescript
{
  success: true;
  data: {
    enabled: boolean;         // Whether location features are enabled
    configured: boolean;      // Whether any geocoding provider is configured
    providers: {
      mapbox: boolean;
      google: boolean;
    };
    cache: {
      size: number;           // Current cache size
      maxSize: number;        // Maximum cache size (1000)
      ttlMs: number;          // Cache TTL in milliseconds (900000 = 15 min)
    };
  };
}
```

**Example**
```typescript
const response = await fetch('/api/geocode');
const status = await response.json();
// status.data.providers.mapbox === true
```

## Authentication

- **GET /api/geocode**: Requires authenticated session (any user).
- **POST /api/geocode**: Requires authenticated session with **admin role**. Non-admin users receive a `403 Forbidden` response. This restriction prevents API cost abuse.

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid request data -- malformed address, invalid coordinates, or schema validation failure |
| 401 | Unauthorized -- no authenticated session |
| 403 | Forbidden -- admin access required (POST only) |
| 404 | No geocoding results found for the given address or coordinates |
| 503 | Location features are disabled in settings, or geocoding service is not configured |

## Rate Limiting

Results are cached for 15 minutes (TTL 900,000ms) with a maximum cache size of 1,000 entries. All geocoding requests are audit-logged for cost tracking purposes.

## Related Endpoints

- [Location Endpoints](./location-endpoints) -- Location search, cities, countries, and coordinates
