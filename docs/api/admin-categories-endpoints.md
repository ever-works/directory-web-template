---
id: admin-categories-endpoints
title: Admin Categories API Endpoints
sidebar_label: Admin Categories
sidebar_position: 30
---

# Admin Categories API Endpoints

The Admin Categories API provides full CRUD operations for managing content categories, including reordering and Git-based synchronization with a remote data repository. All endpoints require admin authentication via session-based auth.

## Route Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/categories` | Admin | List categories (paginated) |
| `POST` | `/api/admin/categories` | Admin | Create a new category |
| `GET` | `/api/admin/categories/all` | Admin | Get all categories (from content cache) |
| `GET` | `/api/admin/categories/{id}` | Admin | Get a single category by ID |
| `PUT` | `/api/admin/categories/{id}` | Admin | Update a category |
| `DELETE` | `/api/admin/categories/{id}` | Admin | Soft or hard delete a category |
| `PUT` | `/api/admin/categories/reorder` | Admin | Reorder categories by ID array |
| `GET` | `/api/admin/categories/git` | Admin | Get Git repo status and categories |
| `POST` | `/api/admin/categories/git` | Admin | Create category via Git commit |

## Authentication

All category management endpoints check for an active session with admin privileges:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Unauthorized. Admin access required." },
    { status: 401 }
  );
}
```

## Endpoints

### GET `/api/admin/categories`

Returns a paginated list of categories with optional filtering and sorting.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (minimum: 1) |
| `limit` | integer | `10` | Items per page (1--100) |
| `includeInactive` | string | `"false"` | Include inactive categories |
| `sortBy` | string | `"name"` | Sort field: `"name"` or `"id"` |
| `sortOrder` | string | `"asc"` | Sort direction: `"asc"` or `"desc"` |

**Response (200):**

```json
{
  "success": true,
  "categories": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 15,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### POST `/api/admin/categories`

Creates a new category. The `id` field is optional and will be auto-generated from the name if not provided. Invalidates content caches on success.

**Request Body:**

```json
{
  "id": "productivity",
  "name": "Productivity"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | No | URL-friendly slug (`^[a-z0-9-]+$`). Auto-generated if omitted. |
| `name` | string | Yes | Display name (2--100 characters) |

**Response (201):**

```json
{
  "success": true,
  "category": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 0,
    "createdAt": "2024-01-20T15:30:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  },
  "message": "Category created successfully"
}
```

### GET `/api/admin/categories/all`

Returns all categories from the content cache for a given locale. Useful for admin dropdowns and selectors.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `locale` | string | `"en"` | Locale code for content retrieval |

**Response (200):**

```json
{
  "success": true,
  "data": [
    { "id": "productivity", "name": "Productivity", "isActive": true, "itemCount": 15 }
  ]
}
```

### GET `/api/admin/categories/{id}`

Retrieves a single category by its unique identifier.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 15,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT `/api/admin/categories/{id}`

Updates the name of an existing category. Invalidates content caches on success.

**Request Body:**

```json
{ "name": "Productivity Tools" }
```

**Response (200):**

```json
{
  "success": true,
  "data": { "id": "productivity", "name": "Productivity Tools", "isActive": true },
  "message": "Category updated successfully"
}
```

### DELETE `/api/admin/categories/{id}`

Deletes a category. By default performs a soft delete (deactivation). Use the `hard=true` query parameter for permanent deletion. Invalidates content caches on success.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `hard` | string | `"false"` | Set to `"true"` for permanent deletion |

**Response (200):**

```json
{
  "success": true,
  "message": "Category deactivated successfully"
}
```

### PUT `/api/admin/categories/reorder`

Reorders categories based on an array of category IDs. The position of each ID in the array determines its new display order.

**Request Body:**

```json
{ "categoryIds": ["productivity", "design", "development", "marketing"] }
```

**Validation Rules:**
- `categoryIds` must be a non-empty array
- All values must be strings

**Response (200):**

```json
{
  "success": true,
  "message": "Categories reordered successfully"
}
```

### GET `/api/admin/categories/git`

Fetches the Git repository status and categories from the configured GitHub data repository. Requires `DATA_REPOSITORY` and `GITHUB_TOKEN` environment variables.

**Response (200):**

```json
{
  "success": true,
  "status": {
    "repository": "ever-co/awesome-time-tracking-data",
    "branch": "main",
    "lastCommit": "abc123def456",
    "lastCommitDate": "2024-01-20T10:30:00.000Z",
    "isUpToDate": true
  },
  "categories": [],
  "message": "Git repository status retrieved successfully"
}
```

### POST `/api/admin/categories/git`

Creates a new category and commits it directly to the GitHub data repository. Requires `DATA_REPOSITORY` and `GH_TOKEN` environment variables.

**Request Body:**

```json
{ "id": "productivity", "name": "Productivity" }
```

Both `id` and `name` are required for Git-based creation.

**Response (200):**

```json
{
  "success": true,
  "category": { "id": "productivity", "name": "Productivity" },
  "message": "Category created and committed to Git repository"
}
```

## Error Codes

| Status | Error | Cause |
|--------|-------|-------|
| `400` | Invalid pagination parameters | Page < 1 or limit outside 1--100 |
| `400` | Category name is required | Missing `name` in create request |
| `400` | categoryIds must be an array | Invalid reorder payload |
| `401` | Unauthorized. Admin access required. | Missing or non-admin session |
| `404` | Category not found | Invalid category ID |
| `409` | Category with this name already exists | Duplicate name on create/update |
| `500` | DATA_REPOSITORY not configured | Missing env var for Git endpoints |
| `500` | GitHub token not configured | Missing `GITHUB_TOKEN` or `GH_TOKEN` |

## Cache Invalidation

All write operations (create, update, delete, reorder) call `invalidateContentCaches()` to ensure changes are immediately visible across the application.

## Related Documentation

- [Admin Endpoints Overview](./admin-endpoints.md)
- [Category Public Endpoints](./category-endpoints.md)
- [Response Patterns](./response-patterns.md)
- [Request Validation](./request-validation.md)
