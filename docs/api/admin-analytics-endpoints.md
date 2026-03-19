---
id: admin-analytics-endpoints
title: Admin Analytics Endpoints
sidebar_label: Admin Analytics
sidebar_position: 22
---

# Admin Analytics Endpoints

The admin analytics API provides geographic analytics data for the admin dashboard, including coverage statistics, distribution breakdowns, and map visualization data. All endpoints require admin authentication.

## Overview

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/admin/geo-analytics` | GET | Admin | Get geographic analytics data |

## Get Geographic Analytics

```
GET /api/admin/geo-analytics
```

Returns comprehensive geographic distribution analytics including coverage stats, country/city/service area distributions, location coordinates for map markers, and heatmap data. This endpoint aggregates data from both the location index and the item repository.

**Authentication:** Admin required (via `checkAdminAuth()`)

**Caching:** Disabled -- uses `force-dynamic`, `revalidate: 0`, and `force-no-store` to ensure fresh data for the admin dashboard.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalIndexed": 450,
      "totalItems": 500,
      "itemsWithLocation": 420,
      "itemsRemote": 30,
      "coveragePercent": 84.0,
      "indexHealth": {
        "synced": true,
        "indexCount": 390,
        "expectedCount": 390
      },
      "citiesCount": 85,
      "countriesCount": 25,
      "remoteCount": 30,
      "lastIndexedAt": "2024-01-20T10:30:00.000Z",
      "lastRebuildAt": "2024-01-15T08:00:00.000Z"
    },
    "distributions": {
      "byCountry": [
        { "name": "United States", "count": 150 },
        { "name": "United Kingdom", "count": 80 },
        { "name": "Germany", "count": 45 }
      ],
      "byCity": [
        { "name": "San Francisco", "count": 35 },
        { "name": "London", "count": 28 },
        { "name": "Berlin", "count": 20 }
      ],
      "byServiceArea": [
        { "area": "North America", "count": 200 },
        { "area": "Europe", "count": 180 }
      ]
    },
    "locations": [
      {
        "itemSlug": "example-tool",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "city": "San Francisco",
        "country": "United States",
        "isRemote": false
      }
    ],
    "heatmapData": [
      { "lat": 37.7749, "lng": -122.4194 },
      { "lat": 51.5074, "lng": -0.1278 }
    ]
  }
}
```

### Response Fields

#### Stats Object

| Field | Type | Description |
|---|---|---|
| `totalIndexed` | integer | Total entries in the location index |
| `totalItems` | integer | Total items in the repository |
| `itemsWithLocation` | integer | Items that have location data or are marked as remote |
| `itemsRemote` | integer | Items marked as remote/distributed |
| `coveragePercent` | number | Percentage of items with location data (rounded to 1 decimal) |
| `indexHealth.synced` | boolean | Whether the index count matches the expected count |
| `indexHealth.indexCount` | integer | Non-remote entries in the index |
| `indexHealth.expectedCount` | integer | Expected non-remote entries based on source data |
| `citiesCount` | integer | Number of distinct cities in the index |
| `countriesCount` | integer | Number of distinct countries in the index |
| `remoteCount` | integer | Number of remote entries in the index |
| `lastIndexedAt` | string or null | ISO timestamp of last index update |
| `lastRebuildAt` | string or null | ISO timestamp of last full rebuild |

#### Distributions Object

| Field | Description |
|---|---|
| `byCountry` | Array of country names with counts, sorted by count descending |
| `byCity` | Top 20 cities with counts, sorted by count descending |
| `byServiceArea` | Service areas with counts, sorted by count descending |

#### Locations Array

Each location object provides data for map markers. Remote items at coordinates `(0, 0)` are filtered out to avoid misleading map displays.

#### Heatmap Data

Array of latitude/longitude pairs for non-remote entries only, suitable for rendering density heatmaps.

### Data Sources

The endpoint aggregates data from three parallel queries:

1. **Location Index Service** (`getLocationIndexService().getIndexStats()`) -- provides index statistics
2. **Location Index Entries** (`getAllLocationEntries()`) -- provides all indexed locations for distribution calculations
3. **Item Repository** (`itemRepository.findAll()`) -- provides source item data for coverage calculations

### Coverage Calculation

Coverage percentage is calculated as:

```
coveragePercent = round((itemsWithLocation / totalItems) * 100, 1)
```

An item is counted as "having location" if it has a latitude coordinate or is marked as remote (`is_remote: true`).

### Index Health

Index health compares the number of non-remote entries in the location index against the expected count derived from source data:

```
expectedCount = itemsWithLocation - itemsRemote
indexCount = totalIndexed - remoteCount
synced = (indexCount === expectedCount)
```

When `synced` is false, administrators should consider rebuilding the location index via the `/api/admin/location-index` endpoint.

| Status | Condition |
|---|---|
| 401 | Not authenticated as admin |
| 500 | Internal server error |

**Source:** `template/app/api/admin/geo-analytics/route.ts`
