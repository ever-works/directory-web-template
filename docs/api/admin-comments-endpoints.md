---
id: admin-comments-endpoints
title: Admin Comments API Endpoints
sidebar_label: Admin Comments
sidebar_position: 31
---

# Admin Comments API Endpoints

The Admin Comments API provides moderation capabilities for managing user comments. Admins can list, view, update, and soft-delete comments. All endpoints use the Node.js runtime and require database availability. Authentication checks use `403 Forbidden` for non-admin users.

## Route Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/comments` | Admin | List comments (paginated, searchable) |
| `GET` | `/api/admin/comments/{id}` | Admin | Get a single comment with user info |
| `PUT` | `/api/admin/comments/{id}` | Admin | Update comment content |
| `DELETE` | `/api/admin/comments/{id}` | Admin | Soft delete a comment |

## Authentication

Comment moderation endpoints verify admin status and return `403 Forbidden` (not `401`) for non-admin users:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}
```

## Database Requirement

The comment endpoints check database availability before processing requests:

```typescript
const dbCheck = checkDatabaseAvailability();
if (dbCheck) return dbCheck;
```

If the database is not configured, an appropriate error response is returned before any authentication check.

## Endpoints

### GET `/api/admin/comments`

Returns a paginated list of comments with associated user information. Supports full-text search across comment content, user names, and user emails. Only non-deleted comments are returned.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number for pagination |
| `limit` | integer | `10` | Comments per page (1--100) |
| `search` | string | `""` | Search in content, user name, or email |

**Search Behavior:**

The search query is matched case-insensitively (using `ILIKE`) against:
- Comment content
- User display name
- User email address

Special characters `%`, `_`, and `\` are escaped to prevent SQL pattern injection.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "This is a great product! Highly recommended.",
        "rating": 5,
        "userId": "user_456def",
        "itemId": "item_789ghi",
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z",
        "user": {
          "id": "user_456def",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "image": "https://example.com/avatar.jpg"
        }
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 10,
      "totalPages": 16
    }
  }
}
```

### GET `/api/admin/comments/{id}`

Retrieves a specific comment by its ID with complete user profile information. Includes a left join to the `clientProfiles` table for user data.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Comment unique identifier |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is a great product! Highly recommended.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "image": "https://example.com/avatar.jpg"
    }
  }
}
```

**User Fallback:** If the user profile is not found (deleted user), a placeholder object is returned:

```json
{
  "user": {
    "id": "",
    "name": "Unknown User",
    "email": "",
    "image": null
  }
}
```

### PUT `/api/admin/comments/{id}`

Updates the content of a specific comment. Only the `content` field can be modified. The comment must exist and not be soft-deleted.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Comment unique identifier |

**Request Body:**

```json
{
  "content": "This is an updated comment with more details."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | New comment text (must not be empty after trimming) |

**Validation Rules:**
- `content` is required and must not be empty or whitespace-only
- The target comment must exist and must not have a `deletedAt` timestamp

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is an updated comment with more details.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:15:00.000Z",
    "user": { "id": "user_456def", "name": "John Doe", "email": "john.doe@example.com", "image": null }
  },
  "message": "Comment updated successfully"
}
```

### DELETE `/api/admin/comments/{id}`

Performs a soft delete on a comment by setting the `deletedAt` timestamp. The comment must exist and not already be deleted. Soft-deleted comments are excluded from all list queries.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Comment unique identifier |

**Response (200):**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

## Comment Data Model

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string | No | Unique comment identifier |
| `content` | string | No | Comment text content |
| `rating` | integer | Yes | Rating value (1--5) |
| `userId` | string | No | Author user ID |
| `itemId` | string | No | Associated item ID |
| `createdAt` | datetime | Yes | Creation timestamp |
| `updatedAt` | datetime | Yes | Last update timestamp |
| `deletedAt` | datetime | Yes | Soft delete timestamp (null if active) |

## Error Codes

| Status | Error | Cause |
|--------|-------|-------|
| `400` | Content is required | Empty or missing content on update |
| `403` | Forbidden | Non-admin user attempting access |
| `404` | Comment not found | Invalid ID or already soft-deleted |
| `500` | Internal Server Error | Database or server failure |

## Implementation Notes

- Comments use **soft deletion** -- the `deletedAt` field is set rather than removing the row. This preserves data integrity and allows potential recovery.
- All list queries filter with `isNull(comments.deletedAt)` to exclude deleted comments.
- User data is fetched via a `LEFT JOIN` on `clientProfiles`, ensuring comments from deleted users are still retrievable.
- The `runtime` is set to `"nodejs"` for these routes (not Edge).

## Related Documentation

- [Admin Endpoints Overview](./admin-endpoints.md)
- [Comment Public Endpoints](./comment-endpoints.md)
- [Response Patterns](./response-patterns.md)
- [Request Validation](./request-validation.md)
