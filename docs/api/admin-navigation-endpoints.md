---
id: admin-navigation-endpoints
title: Admin Navigation & Location Index Endpoints
sidebar_label: Admin Navigation
sidebar_position: 29
---

# Admin Navigation & Location Index Endpoints

These admin endpoints manage custom site navigation links and the geographic location index. Navigation endpoints allow configuring custom header and footer links stored in `config.yml`. Location index endpoints manage the spatial index used for geographic analytics and map features.

## Overview

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/admin/navigation` | GET | Admin | Get custom navigation configuration |
| `/api/admin/navigation` | PATCH | Admin | Update custom navigation items |
| `/api/admin/location-index` | GET | Admin | Get location index statistics |
| `/api/admin/location-index` | POST | Admin | Rebuild or clear the location index |

## Navigation Endpoints

### Get Navigation Configuration

```
GET /api/admin/navigation
```

Retrieves the `custom_header` and `custom_footer` navigation items from the site's `config.yml` file. Returns empty arrays if no custom navigation is configured.

**Authentication:** Admin required (via `getCachedApiSession`)

**Success Response (200):**

```json
{
  "custom_header": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Documentation",
      "path": "/pages/docs"
    }
  ],
  "custom_footer": [
    {
      "label": "GitHub",
      "path": "https://github.com/example"
    },
    {
      "label": "footer.PRIVACY_POLICY",
      "path": "/pages/privacy-policy"
    }
  ]
}
```

Each navigation item has two fields:

| Field | Type | Description |
|---|---|---|
| `label` | string | Display text (plain text or i18n translation key like `"footer.PRIVACY_POLICY"`) |
| `path` | string | URL path (internal route starting with `/` or external URL with `http://`/`https://`) |

| Status | Condition |
|---|---|
| 401 | Not authenticated as admin |
| 500 | Failed to read configuration |

**Source:** `template/app/api/admin/navigation/route.ts`

### Update Navigation Configuration

```
PATCH /api/admin/navigation
```

Updates the custom header or footer navigation items in `config.yml`. Validates each item's path format to prevent XSS attacks via dangerous URL schemes.

**Authentication:** Admin required

**Request Body:**

```json
{
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Blog",
      "path": "https://blog.example.com"
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | `"header"` or `"footer"` |
| `items` | array | Yes | Array of navigation items |
| `items[].label` | string | Yes | Non-empty display label |
| `items[].path` | string | Yes | Valid URL path |

**Path Validation:**

The `isValidNavigationPath()` function enforces strict path format rules:

| Path Format | Allowed | Example |
|---|---|---|
| Internal routes | Yes | `/about`, `/pages/docs` |
| HTTPS URLs | Yes | `https://example.com` |
| HTTP URLs | Yes | `http://example.com` |
| Protocol-relative URLs | No | `//evil.com` |
| JavaScript URLs | No | `javascript:alert(1)` |
| Data URLs | No | `data:text/html,...` |
| Other schemes | No | `vbscript:`, `file:` |

**Success Response (200):**

```json
{
  "success": true,
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    }
  ]
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| 400 | `type` is not `"header"` or `"footer"` |
| 400 | `items` is not an array |
| 400 | Item missing `label` or `path` string fields |
| 400 | Invalid path format (XSS prevention) |
| 401 | Not authenticated as admin |
| 500 | Failed to write configuration |

Pass an empty `items` array to clear all custom navigation for the specified type.

**Source:** `template/app/api/admin/navigation/route.ts`

## Location Index Endpoints

### Get Location Index Statistics

```
GET /api/admin/location-index
```

Returns statistics about the geographic location index including total indexed items, city and country counts, and rebuild metadata. Uses the location index service for data retrieval.

**Authentication:** Admin required (via `checkAdminAuth()`)

**Caching:** Disabled -- uses `force-dynamic`, `revalidate: 0`, and `force-no-store`.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "totalIndexed": 450,
    "citiesCount": 85,
    "countriesCount": 25,
    "remoteCount": 30,
    "lastIndexedAt": "2024-01-20T10:30:00.000Z",
    "lastRebuildAt": "2024-01-15T08:00:00.000Z"
  }
}
```

| Status | Condition |
|---|---|
| 401 | Not authenticated as admin |
| 500 | Internal server error |

**Source:** `template/app/api/admin/location-index/route.ts`

### Manage Location Index

```
POST /api/admin/location-index
```

Performs management actions on the location index. Supports rebuilding the index from scratch or clearing all entries.

**Authentication:** Admin required

**Request Body:**

```json
{
  "action": "rebuild"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `action` | string | Yes | `"rebuild"` or `"clear"` |

**Actions:**

| Action | Description |
|---|---|
| `rebuild` | Fetches all items from the repository and re-indexes their location data. Returns rebuild statistics. |
| `clear` | Removes all entries from the location index. Returns the number of cleared entries. |

**Success Response (200) -- Rebuild:**

```json
{
  "success": true,
  "data": {
    "indexed": 420,
    "skipped": 80,
    "errors": 0
  }
}
```

**Success Response (200) -- Clear:**

```json
{
  "success": true,
  "data": {
    "cleared": 450
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| 400 | Invalid action (not `"rebuild"` or `"clear"`) |
| 401 | Not authenticated as admin |
| 500 | Internal server error |

**Source:** `template/app/api/admin/location-index/route.ts`

## Key Implementation Details

- **XSS Prevention:** Navigation path validation rejects all URL schemes except `/`, `http://`, and `https://`. This blocks `javascript:`, `data:`, `vbscript:`, and protocol-relative URLs (`//evil.com`) that could be used for cross-site scripting.
- **Config Storage:** Navigation items are stored in `config.yml` under `custom_header` and `custom_footer` keys, persisted via `configManager.updateNestedKey()`.
- **i18n Labels:** Navigation labels can be either plain text or translation keys (e.g., `"footer.PRIVACY_POLICY"`). The frontend is responsible for resolving translation keys.
- **Location Index Rebuild:** The rebuild operation loads all items from the `ItemRepository` and passes them to the location index service. This can be a resource-intensive operation for large datasets.
- **Cache Busting:** Location index endpoints explicitly disable all caching to ensure the admin dashboard always displays current data.
