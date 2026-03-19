---
id: admin-tags-endpoints
title: Admin Tags API Endpoints
sidebar_label: Admin Tags
sidebar_position: 34
---

# Admin Tags API Endpoints

The Admin Tags API provides full CRUD operations for managing content tags. Tags are used to classify and filter items in the directory. The API supports paginated listing, creation with active/inactive states, updates, deletion, and locale-aware retrieval from the content cache. All write operations invalidate content caches for immediate visibility.

## Route Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/tags` | Admin | List tags (paginated) |
| `POST` | `/api/admin/tags` | Admin | Create a new tag |
| `GET` | `/api/admin/tags/all` | Admin | Get all tags (from content cache) |
| `GET` | `/api/admin/tags/{id}` | Admin | Get a single tag by ID |
| `PUT` | `/api/admin/tags/{id}` | Admin | Update a tag |
| `DELETE` | `/api/admin/tags/{id}` | Admin | Permanently delete a tag |

## Authentication

All tag management endpoints require admin privileges:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
```

## Endpoints

### GET `/api/admin/tags`

Returns a paginated list of all tags in the system. Pagination parameters are validated using the shared `validatePaginationParams` utility.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (minimum: 1) |
| `limit` | integer | `10` | Items per page (1--100) |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "productivity",
        "name": "Productivity",
        "isActive": true,
        "itemCount": 156,
        "created_at": "2024-01-20T10:30:00.000Z",
        "updated_at": "2024-01-20T10:30:00.000Z"
      },
      {
        "id": "design",
        "name": "Design",
        "isActive": true,
        "itemCount": 89,
        "created_at": "2024-01-19T15:20:00.000Z",
        "updated_at": "2024-01-19T15:20:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### POST `/api/admin/tags`

Creates a new tag with specified ID, name, and optional active status. Invalidates content caches on success.

**Request Body:**

```json
{
  "id": "artificial-intelligence",
  "name": "Artificial Intelligence",
  "isActive": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | URL-friendly slug identifier |
| `name` | string | Yes | Human-readable tag name (2--50 characters) |
| `isActive` | boolean | No | Whether the tag is active (default: `true`) |

**Validation Rules:**
- Both `id` and `name` are required
- Tag name must be between 2 and 50 characters
- Tag ID must be unique across all existing tags
- Tag name must be unique across all existing tags

**Response (201):**

```json
{
  "success": true,
  "tag": {
    "id": "artificial-intelligence",
    "name": "Artificial Intelligence",
    "isActive": true,
    "itemCount": 0,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

### GET `/api/admin/tags/all`

Returns all tags from the content cache for a given locale. This endpoint reads from the cached content layer rather than the database, making it suitable for populating tag selectors in the admin UI.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `locale` | string | `"en"` | Locale code for content retrieval |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 156
    }
  ]
}
```

### GET `/api/admin/tags/{id}`

Retrieves a single tag by its unique identifier with complete details including usage statistics.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tag unique identifier |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 156,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

### PUT `/api/admin/tags/{id}`

Updates a tag's name and/or active status. The tag ID cannot be changed after creation. Invalidates content caches on success.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tag unique identifier |

**Request Body:**

```json
{
  "name": "Productivity & Efficiency",
  "isActive": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Updated tag display name |
| `isActive` | boolean | No | Updated active status |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity & Efficiency",
    "isActive": true,
    "itemCount": 156,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Tag updated successfully"
}
```

### DELETE `/api/admin/tags/{id}`

Permanently deletes a tag from the system. This also removes the tag from all associated items. Invalidates content caches on success.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tag unique identifier |

**Response (200):**

```json
{
  "success": true,
  "message": "Tag deleted successfully"
}
```

:::caution
Tag deletion is permanent and cannot be undone. All item-tag associations for the deleted tag will be removed. Consider deactivating the tag (setting `isActive` to `false` via PUT) instead if you want to preserve data integrity.
:::

## Tag Data Model

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string | No | URL-friendly unique identifier |
| `name` | string | No | Human-readable display name |
| `isActive` | boolean | No | Whether the tag can be assigned to items |
| `itemCount` | integer | No | Number of items using this tag |
| `created_at` | datetime | No | Creation timestamp |
| `updated_at` | datetime | No | Last update timestamp |

## Error Codes

| Status | Error | Cause |
|--------|-------|-------|
| `400` | Tag ID and name are required | Missing required fields on create |
| `400` | Tag name is required | Missing name on update |
| `400` | Tag name must be between 2 and 50 characters | Name length validation failure |
| `400` | Invalid page/limit parameter | Pagination parameter out of range |
| `401` | Unauthorized | Missing or non-admin session |
| `404` | Tag not found | No tag with the given ID |
| `409` | Tag with ID already exists | Duplicate ID on create |
| `409` | Tag with name already exists | Duplicate name on create/update |
| `500` | Failed to fetch/create/update/delete tag | Server or database error |

## Cache Invalidation

All write operations (create, update, delete) call `invalidateContentCaches()` to ensure tag changes are immediately reflected in the public-facing content:

```typescript
await invalidateContentCaches();
```

This clears both the in-memory content cache and any CDN-level caches that may be active.

## Data Sources

The tag API uses two different data sources depending on the endpoint:

| Endpoint | Data Source | Use Case |
|----------|------------|----------|
| `GET /api/admin/tags` | `tagRepository` (database) | Admin management with pagination |
| `POST /api/admin/tags` | `tagRepository` (database) | Creating new tags |
| `GET /api/admin/tags/all` | `getCachedItems()` (content cache) | Dropdown selectors, quick lookups |
| `GET /api/admin/tags/{id}` | `tagRepository` (database) | Detailed tag view |
| `PUT /api/admin/tags/{id}` | `tagRepository` (database) | Updating tag properties |
| `DELETE /api/admin/tags/{id}` | `tagRepository` (database) | Removing tags |

## Related Documentation

- [Admin Endpoints Overview](./admin-endpoints.md)
- [Admin Categories Endpoints](./admin-categories-endpoints.md) -- Similar pattern for category management
- [Response Patterns](./response-patterns.md)
- [Request Validation](./request-validation.md)
