---
id: admin-items-endpoints
title: Admin Items API Endpoints
sidebar_label: Admin Items
sidebar_position: 37
---

# Admin Items API Endpoints

The Items API provides endpoints for managing directory listings including creation, updates, review workflows (approve/reject), audit history, bulk operations, and statistics. Items progress through a lifecycle of `draft`, `pending`, `approved`, and `rejected` statuses. All endpoints require admin authentication.

## Base Path

```
/api/admin/items
```

## Route Summary

| Method   | Path                                  | Auth  | Description                          |
| -------- | ------------------------------------- | ----- | ------------------------------------ |
| `GET`    | `/api/admin/items`                    | Admin | Get paginated items list             |
| `POST`   | `/api/admin/items`                    | Admin | Create a new item                    |
| `GET`    | `/api/admin/items/stats`              | Admin | Get item statistics                  |
| `POST`   | `/api/admin/items/bulk`               | Admin | Bulk approve, reject, or delete      |
| `GET`    | `/api/admin/items/{id}`               | Admin | Get item by ID                       |
| `PUT`    | `/api/admin/items/{id}`               | Admin | Update item                          |
| `DELETE` | `/api/admin/items/{id}`               | Admin | Delete item permanently              |
| `POST`   | `/api/admin/items/{id}/review`        | Admin | Approve or reject an item            |
| `GET`    | `/api/admin/items/{id}/history`       | Admin | Get item audit history               |

---

## List Items

```
GET /api/admin/items
```

Returns a paginated list of items with search, filtering by status/category/tags, and sorting.

**Query Parameters:**

| Parameter    | Type    | Default      | Description                                              |
| ------------ | ------- | ------------ | -------------------------------------------------------- |
| `page`       | integer | `1`          | Page number (minimum: 1)                                  |
| `limit`      | integer | `10`         | Results per page (1--100)                                 |
| `search`     | string  | --           | Search items by name or description                       |
| `status`     | string  | --           | Filter: `draft`, `pending`, `approved`, `rejected`        |
| `categories` | string  | --           | Comma-separated category slugs                            |
| `tags`       | string  | --           | Comma-separated tag slugs                                 |
| `sortBy`     | string  | `updated_at` | Sort field: `name`, `updated_at`, `status`, `submitted_at`|
| `sortOrder`  | string  | `desc`       | Sort direction: `asc` or `desc`                           |

**Response (200):**

```json
{
  "success": true,
  "items": [
    {
      "id": "item_123abc",
      "name": "Awesome Productivity Tool",
      "slug": "awesome-productivity-tool",
      "description": "A powerful tool to boost your productivity",
      "source_url": "https://example.com/tool",
      "category": ["productivity", "business"],
      "tags": ["saas", "productivity"],
      "featured": true,
      "icon_url": "https://example.com/icon.png",
      "status": "approved",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## Create Item

```
POST /api/admin/items
```

Creates a new item with duplicate checks on both ID and slug. Triggers CRM sync (if enabled) and location indexing (if enabled).

**Request Body:**

| Field        | Type     | Required | Description                                    |
| ------------ | -------- | -------- | ---------------------------------------------- |
| `id`         | string   | Yes      | Unique item identifier                         |
| `name`       | string   | Yes      | Item name                                      |
| `slug`       | string   | Yes      | URL-friendly slug (must be unique)             |
| `description`| string   | Yes      | Item description                               |
| `source_url` | string   | Yes      | Source URL of the item                          |
| `category`   | string[] | No       | Array of category slugs                        |
| `tags`       | string[] | No       | Array of tag slugs                             |
| `brand`      | string   | No       | Brand name (used for CRM company sync)         |
| `featured`   | boolean  | No       | Featured flag (default: `false`)               |
| `icon_url`   | string   | No       | Icon URL                                       |
| `status`     | string   | No       | Initial status (default: `draft`)              |
| `location`   | object   | No       | Location data for geo-indexing                 |

**Response (201):**

```json
{
  "success": true,
  "item": {
    "id": "item_123abc",
    "name": "Awesome Productivity Tool",
    "slug": "awesome-productivity-tool",
    "status": "draft",
    "created_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Item created successfully"
}
```

---

## Get Item Statistics

```
GET /api/admin/items/stats
```

Returns counts by status. Supports optional filters to scope the statistics.

**Query Parameters:**

| Parameter    | Type   | Description                        |
| ------------ | ------ | ---------------------------------- |
| `search`     | string | Filter stats by search term        |
| `categories` | string | Comma-separated category slugs     |
| `tags`       | string | Comma-separated tag slugs          |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "total": 1247,
    "draft": 45,
    "pending": 23,
    "approved": 1156,
    "rejected": 23
  }
}
```

---

## Bulk Actions

```
POST /api/admin/items/bulk
```

Performs bulk approve, reject, or delete on up to 100 items. Each item is processed individually; partial failures do not abort the entire operation. Sends email notifications to submitters on approve/reject.

**Request Body:**

| Field    | Type     | Required           | Description                                          |
| -------- | -------- | ------------------ | ---------------------------------------------------- |
| `action` | string   | Yes                | `approve`, `reject`, or `delete`                     |
| `ids`    | string[] | Yes                | Item IDs to process (1--100, no duplicates)          |
| `reason` | string   | Yes (for `reject`) | Rejection reason (minimum 10 characters)             |

**Response (200):**

```json
{
  "success": true,
  "message": "Bulk approve completed: 3 approved, 0 failed",
  "results": [
    { "id": "item_1", "success": true },
    { "id": "item_2", "success": true },
    { "id": "item_3", "success": false, "error": "Item not found" }
  ],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Get / Update / Delete Item

### Get Item

```
GET /api/admin/items/{id}
```

Returns complete item details including metadata, categories, tags, review notes, and engagement metrics.

### Update Item

```
PUT /api/admin/items/{id}
```

Partial update -- only provided fields are modified. Triggers CRM sync when `brand` is provided and location re-indexing when location data changes.

**Request Body (all fields optional):**

```json
{
  "name": "Updated Tool Name",
  "slug": "updated-tool-name",
  "description": "Updated description",
  "source_url": "https://example.com/updated",
  "category": ["productivity", "automation"],
  "tags": ["saas", "ai"],
  "brand": "Acme Corp",
  "featured": true,
  "icon_url": "https://example.com/new-icon.png",
  "status": "approved"
}
```

### Delete Item

```
DELETE /api/admin/items/{id}
```

Permanently deletes an item and removes it from the location index (if enabled). This action cannot be undone.

**Response (200):**

```json
{ "success": true, "message": "Item deleted successfully" }
```

---

## Review Item

```
POST /api/admin/items/{id}/review
```

Approves or rejects an item. Records the review decision with optional notes. Sends an email notification to the original submitter (if the submitter is a registered user).

**Request Body:**

| Field          | Type   | Required | Description                          |
| -------------- | ------ | -------- | ------------------------------------ |
| `status`       | string | Yes      | `approved` or `rejected`             |
| `review_notes` | string | No       | Explanation of the review decision   |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "item_123abc",
    "status": "approved",
    "review_notes": "Great tool, approved for listing.",
    "reviewed_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Item approved successfully"
}
```

---

## Get Item Audit History

```
GET /api/admin/items/{id}/history
```

Returns the complete audit trail for an item, including creation, updates, status changes, reviews, deletions, and restorations.

**Query Parameters:**

| Parameter | Type    | Default | Description                                                            |
| --------- | ------- | ------- | ---------------------------------------------------------------------- |
| `page`    | integer | `1`     | Page number                                                             |
| `limit`   | integer | `20`    | Results per page (max 100)                                              |
| `action`  | string  | --      | Comma-separated filter: `created`, `updated`, `status_changed`, `reviewed`, `deleted`, `restored` |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_abc123",
        "itemId": "awesome-tool",
        "action": "reviewed",
        "previousStatus": "pending",
        "newStatus": "approved",
        "performedByName": "Admin User",
        "notes": "Approved for listing",
        "createdAt": "2024-01-20T16:45:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## Validation Rules

| Field        | Rule                                                       |
| ------------ | ---------------------------------------------------------- |
| `id`         | Required; must be unique across all items                  |
| `name`       | Required for creation                                      |
| `slug`       | Required; must be unique across all items                  |
| `description`| Required for creation                                      |
| `source_url` | Required for creation; valid URL format                    |
| `status`     | Must be `draft`, `pending`, `approved`, or `rejected`      |
| `reason`     | Required for bulk reject; minimum 10 characters            |
| `ids`        | Bulk: 1--100 non-empty unique strings                      |
| `action`     | History filter: valid audit action types only              |

## Error Codes

| Status | Meaning                                                  |
| ------ | -------------------------------------------------------- |
| `400`  | Validation error, invalid parameters, missing fields     |
| `401`  | Authentication required                                   |
| `403`  | Admin privileges required                                 |
| `404`  | Item not found                                            |
| `409`  | Duplicate item ID or slug                                 |
| `500`  | Internal server error                                     |

## Related Documentation

- [Admin Roles API](./admin-roles-endpoints.md) -- manage roles assigned to users
- [Admin Users API](./admin-users-endpoints.md) -- user account management
- [Authentication](../features/authentication.md) -- session management and guards
