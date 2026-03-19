---
id: config-feature-endpoints
title: "Config & Feature Flags API Reference"
sidebar_label: "Config & Features"
sidebar_position: 53
---

# Config & Feature Flags API Reference

## Overview

The Config Features endpoint exposes the current feature availability flags for the application. These flags indicate which database-dependent features are active, allowing the frontend to gracefully degrade when features are unavailable. This is a public, cached endpoint designed for high-frequency consumption.

## Endpoints

### GET /api/config/features

Returns the current feature availability based on system configuration and database availability.

**Request**

No parameters or body required.

**Response**
```typescript
{
  ratings: boolean;         // Whether the ratings feature is available
  comments: boolean;        // Whether the comments feature is available
  favorites: boolean;       // Whether the favorites feature is available
  featuredItems: boolean;   // Whether the featured items feature is available
  surveys: boolean;         // Whether the surveys feature is available
}
```

**Example**
```typescript
const response = await fetch('/api/config/features');
const features = await response.json();

if (features.ratings) {
  // Render rating component
}

if (!features.surveys) {
  // Hide survey section
}
```

## Authentication

This endpoint is **public** -- no authentication is required. It is designed to be consumed by the frontend on initial page load to determine which UI features should be rendered.

## Error Responses

| Status | Description |
|--------|-------------|
| 200 | Feature flags retrieved successfully |
| 500 | Internal error -- returns all flags as `false` for safety with `no-cache` header |

On error, the endpoint returns all features as `false` to ensure the application fails safely rather than exposing broken functionality.

## Rate Limiting

Responses are cached with the following headers:
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- Effectively cached for 5 minutes at the CDN level with a 10-minute stale-while-revalidate window.

Error responses use `Cache-Control: no-cache` to prevent caching of degraded state.

## Related Endpoints

- [Health Endpoints](./health-endpoints) -- Database connectivity health check
