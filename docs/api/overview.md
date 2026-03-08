---
id: overview
title: API Routes Overview
sidebar_label: Overview
sidebar_position: 0
---

# API Routes Overview

The template exposes approximately 151 API route handlers organized across 29 route groups under the `app/api/` directory. All routes use the Next.js App Router convention with `route.ts` files exporting HTTP method handlers (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

## Route Groups

| Group | Path | Description | Approx. Routes |
|-------|------|-------------|---------------|
| **admin** | `/api/admin/*` | Admin panel CRUD operations | ~60 |
| **auth** | `/api/auth/*` | NextAuth handlers + password management | 2 |
| **categories** | `/api/categories/*` | Public category queries | 1 |
| **client** | `/api/client/*` | Client dashboard and item management | ~7 |
| **collections** | `/api/collections/*` | Public collection queries | 1 |
| **config** | `/api/config/*` | Feature flag configuration | 1 |
| **cron** | `/api/cron/*` | Scheduled background jobs | 3 |
| **current-user** | `/api/current-user` | Current authenticated user info | 1 |
| **extract** | `/api/extract` | URL metadata extraction | 1 |
| **favorites** | `/api/favorites/*` | User favorite items | 2 |
| **featured-items** | `/api/featured-items` | Featured item listings | 1 |
| **geocode** | `/api/geocode` | Address geocoding | 1 |
| **health** | `/api/health/*` | System health checks | 1 |
| **internal** | `/api/internal/*` | Internal operations (DB init) | 1 |
| **items** | `/api/items/*` | Public item endpoints (comments, votes, views) | ~12 |
| **lemonsqueezy** | `/api/lemonsqueezy/*` | Lemon Squeezy payment integration | 7 |
| **location** | `/api/location/*` | Location search and data | 4 |
| **payment** | `/api/payment/*` | Generic payment/subscription management | 3 |
| **polar** | `/api/polar/*` | Polar payment integration | 5 |
| **reference** | `/api/reference` | Reference data endpoint | 1 |
| **reports** | `/api/reports` | Public report submission | 1 |
| **solidgate** | `/api/solidgate/*` | Solidgate payment integration | 2 |
| **sponsor-ads** | `/api/sponsor-ads/*` | Sponsor ad management | 7 |
| **stripe** | `/api/stripe/*` | Stripe payment integration | ~17 |
| **surveys** | `/api/surveys/*` | Survey CRUD and responses | 4 |
| **user** | `/api/user/*` | User profile and subscription | 5 |
| **verify-recaptcha** | `/api/verify-recaptcha` | reCAPTCHA verification | 1 |
| **version** | `/api/version/*` | Application version info | 2 |

## Architecture Patterns

### Route Handler Structure

Route handlers follow a consistent thin-handler pattern:

```typescript
// app/api/admin/items/route.ts
import { withAdminAuth } from '@/lib/auth/admin-guard';

export const GET = withAdminAuth(async (request: NextRequest) => {
  // 1. Parse and validate input (query params, body)
  // 2. Call service or repository
  // 3. Return JSON response
  return NextResponse.json({ success: true, data: result });
});
```

### Authentication Patterns

Routes use different authentication levels:

| Level | Method | Usage |
|-------|--------|-------|
| **Public** | No auth check | Item listings, health checks, version info |
| **Authenticated** | `auth()` or `getCachedSession()` | User profile, favorites, client endpoints |
| **Admin** | `withAdminAuth()` or `checkAdminAuth()` | All `/api/admin/*` routes |
| **Cron** | `CRON_SECRET` header check | `/api/cron/*` routes |

### Error Handling

API routes use a consistent error response format:

```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: 'Human-readable error message' }
```

HTTP status codes follow REST conventions:

| Status | Usage |
|--------|-------|
| `200` | Successful GET, PUT, PATCH |
| `201` | Successful POST (resource created) |
| `400` | Invalid request body or parameters |
| `401` | Missing or invalid authentication |
| `403` | Authenticated but insufficient permissions |
| `404` | Resource not found |
| `409` | Conflict (duplicate resource) |
| `500` | Internal server error |

### Pagination

List endpoints typically support cursor or offset-based pagination:

```
GET /api/admin/items?page=1&limit=20&sort=createdAt&order=desc
```

Common query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Page number (1-based) |
| `limit` | number | `20` | Items per page |
| `sort` | string | `createdAt` | Sort field |
| `order` | string | `desc` | Sort direction (`asc` or `desc`) |
| `search` | string | - | Full-text search query |

### Response Envelope

Paginated responses include metadata:

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

## Directory Structure

```
app/api/
  admin/               # Admin-only endpoints (19 resource groups)
  auth/                # NextAuth + password management
  categories/          # Public category data
  client/              # Client-facing dashboard + items
  collections/         # Public collection data
  config/              # Feature configuration
  cron/                # Scheduled jobs (sync, subscriptions)
  current-user/        # Current user session info
  extract/             # URL metadata extraction
  favorites/           # Favorite item management
  featured-items/      # Featured item listings
  geocode/             # Geocoding service
  health/              # Health checks (database)
  internal/            # Internal operations
  items/               # Public item interactions
  lemonsqueezy/        # Lemon Squeezy payments
  location/            # Location data (countries, cities)
  payment/             # Generic payment management
  polar/               # Polar payments
  reference/           # Reference data
  reports/             # Content reports
  solidgate/           # Solidgate payments
  sponsor-ads/         # Sponsor advertisement management
  stripe/              # Stripe payments
  surveys/             # Survey management
  user/                # User profile endpoints
  verify-recaptcha/    # reCAPTCHA verification
  version/             # App version info
```
