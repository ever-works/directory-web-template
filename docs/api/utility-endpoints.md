---
id: utility-endpoints
title: Utility API Endpoints
sidebar_label: Utility Endpoints
sidebar_position: 5
---

# Utility API Endpoints

Utility endpoints provide infrastructure services including health checks, version information, feature configuration, geocoding, reCAPTCHA verification, URL extraction, location data, and internal operations.

## Health Check (`/api/health`)

### Database Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health/database` | Check database connectivity |

Returns the database connection status. Used by monitoring systems and deployment health checks.

**Response (healthy):**

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Response (unhealthy):**

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Connection refused",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Authentication:** Public (no auth required). This endpoint should be accessible by load balancers and monitoring services.

## Version (`/api/version`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/version` | Get application version info |
| `GET` | `/api/version/sync` | Get version and sync status |

### Version Response

Returns the application version, build information, and runtime environment:

```json
{
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Version + Sync Status

The `/api/version/sync` endpoint extends version info with the content repository sync status, useful for debugging content freshness.

**Authentication:** Public.

## Feature Configuration (`/api/config`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/config/features` | Get enabled feature flags |

Returns the current feature flag configuration for the client-side application. This allows the frontend to conditionally render features based on server-side configuration.

**Response:**

```json
{
  "features": {
    "payments": true,
    "sponsorAds": true,
    "surveys": false,
    "map": true,
    "newsletter": true
  }
}
```

**Authentication:** Public. Feature flags are not sensitive data.

## URL Extraction (`/api/extract`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/extract` | Extract metadata from a URL |

Fetches a URL and extracts metadata including title, description, image, and favicon. Used by the item submission form to auto-populate fields from a URL.

**Request:**

```json
{
  "url": "https://example.com/product"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "title": "Product Name",
    "description": "Product description from meta tags",
    "image": "https://example.com/og-image.png",
    "favicon": "https://example.com/favicon.ico",
    "siteName": "Example.com"
  }
}
```

**Authentication:** Required. Prevents abuse of server-side URL fetching.

## Geocoding (`/api/geocode`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/geocode` | Geocode an address to coordinates |

Converts a text address into geographic coordinates (latitude/longitude) using an external geocoding service.

**Request:**

```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "lat": 37.4224764,
    "lng": -122.0842499,
    "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA"
  }
}
```

**Authentication:** Required.

## Location Data (`/api/location`)

Endpoints for location search and reference data.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/location/countries` | List all countries |
| `GET` | `/api/location/cities` | List cities (with country filter) |
| `GET` | `/api/location/coordinates` | Get coordinates for a location |
| `GET` | `/api/location/search` | Search locations by query string |

### Countries

Returns a list of countries with ISO codes, names, and optional metadata.

### Cities

Supports filtering by country code:

```
GET /api/location/cities?country=US
```

### Location Search

Full-text location search:

```
GET /api/location/search?q=San Francisco
```

**Authentication:** Public.

## reCAPTCHA Verification (`/api/verify-recaptcha`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/verify-recaptcha` | Verify a reCAPTCHA token |

Server-side verification of Google reCAPTCHA tokens. Used by forms that require bot protection.

**Request:**

```json
{
  "token": "recaptcha-response-token"
}
```

**Response:**

```json
{
  "success": true,
  "score": 0.9,
  "action": "submit"
}
```

**Authentication:** Public (reCAPTCHA is typically on public forms).

## Reference Data (`/api/reference`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/reference` | Get reference data for form dropdowns |

Returns reference data used to populate dropdown menus and selection fields in the application, such as pricing models, license types, and platform categories.

**Authentication:** Public.

## Internal Operations (`/api/internal`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/internal/db-init` | Initialize database schema and seed data |

### Database Initialization

The `/api/internal/db-init` endpoint triggers database migration and optional seed data insertion. This is typically called once during initial deployment or when resetting a development environment.

**Authentication:** This endpoint should be secured via environment-specific access controls or a shared secret. It is not intended for regular use.

## Security Considerations

### Public Endpoints

The following utility endpoints are intentionally public:
- Health checks (needed by monitoring/load balancers)
- Version info (non-sensitive)
- Feature flags (non-sensitive configuration)
- Location data (reference data)
- reCAPTCHA verification (public form protection)
- Reference data (dropdown values)

### Protected Endpoints

These endpoints require authentication to prevent abuse:
- URL extraction (prevents server-side request forgery abuse)
- Geocoding (rate-limited external API calls)
- Database initialization (destructive operation)
