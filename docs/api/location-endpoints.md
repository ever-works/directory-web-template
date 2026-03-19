---
id: location-endpoints
title: "Location API Reference"
sidebar_label: "Location"
sidebar_position: 51
---

# Location API Reference

## Overview

The Location endpoints provide access to the spatial location index for items in the directory. They support querying items by city, country, radius-based proximity search, and retrieving coordinate data for map rendering. All location endpoints require the location feature to be enabled in system settings.

## Endpoints

### GET /api/location/cities

Returns a list of distinct city names from the location index.

**Request**

No parameters required.

**Response**
```typescript
{
  success: true;
  data: string[];   // Array of city names, e.g. ["San Francisco", "London", "Tokyo"]
}
```

**Example**
```typescript
const response = await fetch('/api/location/cities');
const { data: cities } = await response.json();
// cities = ["San Francisco", "New York", "London", ...]
```

### GET /api/location/countries

Returns a list of distinct country names from the location index.

**Request**

No parameters required.

**Response**
```typescript
{
  success: true;
  data: string[];   // Array of country names, e.g. ["United States", "United Kingdom"]
}
```

**Example**
```typescript
const response = await fetch('/api/location/countries');
const { data: countries } = await response.json();
```

### GET /api/location/coordinates

Returns coordinates for all indexed items, with optional filtering by city or country. Used for rendering map markers. Remote items are automatically excluded.

**Request**

| Parameter | Type   | In    | Description |
|-----------|--------|-------|-------------|
| city      | string | query | Filter by city name (case-insensitive) |
| country   | string | query | Filter by country name (case-insensitive) |

**Response**
```typescript
{
  success: true;
  data: Array<{
    slug: string;        // Item slug identifier
    latitude: number;
    longitude: number;
    city: string | null;
    country: string | null;
  }>;
}
```

**Example**
```typescript
const response = await fetch('/api/location/coordinates?country=United States');
const { data: coordinates } = await response.json();
// coordinates[0] = { slug: "my-item", latitude: 37.77, longitude: -122.41, city: "San Francisco", country: "United States" }
```

### GET /api/location/search

Searches for items by geographic location using radius-based proximity, city name, or country name. Returns matching item slugs and optional distance information.

**Request**

| Parameter | Type   | In    | Description |
|-----------|--------|-------|-------------|
| near_lat  | number | query | Latitude for radius search |
| near_lng  | number | query | Longitude for radius search |
| radius    | number | query | Radius in km (default: 50) |
| city      | string | query | Filter by city name |
| country   | string | query | Filter by country name |

At least one search parameter is required: `near_lat` + `near_lng`, `city`, or `country`.

**Response**
```typescript
{
  success: true;
  data: {
    slugs: string[];                    // Array of matching item slugs
    distances: Record<string, number>;  // Slug-to-distance-km map (radius search only)
  };
}
```

**Example**
```typescript
// Radius search: items within 25km of San Francisco
const response = await fetch('/api/location/search?near_lat=37.7749&near_lng=-122.4194&radius=25');
const { data } = await response.json();
// data.slugs = ["item-a", "item-b"]
// data.distances = { "item-a": 2.3, "item-b": 15.7 }

// City search
const cityResponse = await fetch('/api/location/search?city=London');
const cityData = await cityResponse.json();
// cityData.data.slugs = ["item-c", "item-d"]
```

## Authentication

All location endpoints are **public** -- no authentication is required. However, the location feature must be enabled in the system settings. If location features are disabled, all endpoints return a `404` with `"Location features are disabled"`.

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid coordinates, invalid radius, or missing required search parameters |
| 404 | Location features are disabled in system settings |
| 500 | Internal server error -- database query failure |

## Rate Limiting

No explicit rate limiting is applied to these endpoints. Remote/virtual items are automatically excluded from coordinate results.

## Related Endpoints

- [Geocode Endpoints](./geocode-endpoints) -- Forward and reverse geocoding (admin only)
