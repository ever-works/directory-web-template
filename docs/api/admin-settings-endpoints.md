---
id: admin-settings-endpoints
title: Admin Settings Endpoints
sidebar_label: Admin Settings
sidebar_position: 23
---

# Admin Settings Endpoints

The admin settings API provides endpoints for reading and modifying site configuration stored in `config.yml`. This includes general settings and map provider status. All endpoints require admin authentication.

## Overview

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/admin/settings` | GET | Admin | Get all settings |
| `/api/admin/settings` | PATCH | Admin | Update a specific setting |
| `/api/admin/settings/map-status` | GET | Admin | Get map provider configuration status |

## Get Settings

```
GET /api/admin/settings
```

Retrieves the complete `settings` section from the site's `config.yml` file.

**Authentication:** Admin required (via `getCachedApiSession`)

**Success Response (200):**

```json
{
  "settings": {
    "theme": "light",
    "itemsPerPage": 20,
    "enableComments": true,
    "enableVoting": true,
    "enableNewsletter": true,
    "mapProvider": "mapbox",
    "defaultLanguage": "en"
  }
}
```

The exact shape of the `settings` object depends on the site's `config.yml` configuration. The endpoint returns whatever is stored under the `settings` key.

| Status | Condition |
|---|---|
| 401 | Not authenticated as admin |
| 500 | Failed to read configuration |

**Source:** `template/app/api/admin/settings/route.ts`

## Update a Setting

```
PATCH /api/admin/settings
```

Updates a single setting value within the `settings` section of `config.yml`. The key is automatically scoped to the `settings` namespace (e.g., providing key `"theme"` updates `settings.theme` in the configuration file).

**Authentication:** Admin required

**Request Body:**

```json
{
  "key": "itemsPerPage",
  "value": 30
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | string | Yes | The setting key to update (relative to `settings.`) |
| `value` | any | Yes | The new value for the setting |

**Success Response (200):**

```json
{
  "success": true,
  "key": "itemsPerPage",
  "value": 30
}
```

The update is persisted via `configManager.updateNestedKey()`, which modifies the underlying `config.yml` file. The key is automatically prefixed with `settings.` before being passed to the config manager.

**Error Responses:**

| Status | Condition |
|---|---|
| 400 | Missing `key` field in request body |
| 401 | Not authenticated as admin |
| 500 | Failed to write configuration |

**Source:** `template/app/api/admin/settings/route.ts`

## Map Provider Status

### Get Map Status

```
GET /api/admin/settings/map-status
```

Returns the configuration status of supported map providers without exposing actual API keys. This allows the admin dashboard to show which map providers are available for use.

**Authentication:** Admin required

**Success Response (200):**

```json
{
  "status": {
    "mapbox": {
      "isConfigured": true,
      "isPreviewAvailable": true,
      "name": "Mapbox"
    },
    "google": {
      "isConfigured": false,
      "isPreviewAvailable": false,
      "name": "Google Maps"
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `mapbox.isConfigured` | boolean | Whether `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is set |
| `mapbox.isPreviewAvailable` | boolean | Same as `isConfigured` -- preview requires the token |
| `google.isConfigured` | boolean | Whether `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set |
| `google.isPreviewAvailable` | boolean | Same as `isConfigured` |

The endpoint checks for the presence of environment variables:

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` for Mapbox
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for Google Maps

No actual key values are exposed in the response.

| Status | Condition |
|---|---|
| 401 | Not authenticated as admin |
| 500 | Internal server error |

**Source:** `template/app/api/admin/settings/map-status/route.ts`

## Configuration Architecture

The settings system is built on the `configManager` singleton from `lib/config-manager`:

- **Storage:** Settings are stored in a YAML configuration file (`config.yml`)
- **Access:** The `configManager.getConfig()` method reads the full configuration
- **Updates:** The `configManager.updateNestedKey()` method modifies specific nested keys
- **Caching:** Sessions are cached via `getCachedApiSession()` for performance

All settings updates are scoped under the `settings` namespace in the configuration file. This prevents accidental modification of top-level configuration keys through the settings API.
