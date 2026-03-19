---
id: comment-endpoints
title: Comment Endpoints
sidebar_label: Comments
sidebar_position: 24
---

# Comment Endpoints

The comments system provides endpoints for creating, reading, updating, and deleting comments on items. Comments include a 1-5 star rating and support both public access (reading) and authenticated operations (creating/editing/deleting). Admin endpoints provide moderation capabilities.

## Overview

### Public Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/items/[slug]/comments` | GET | Public | List comments for an item |
| `/api/items/[slug]/comments/rating` | GET | Public | Get aggregate rating statistics |
| `/api/items/[slug]/comments/rating/[commentId]` | GET | Public | Get a single comment's rating |

### Authenticated Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/items/[slug]/comments` | POST | User | Create a new comment |
| `/api/items/[slug]/comments/[commentId]` | PUT | Owner | Update own comment |
| `/api/items/[slug]/comments/[commentId]` | DELETE | Owner | Delete own comment |
| `/api/items/[slug]/comments/rating/[commentId]` | PATCH | User | Update a comment's rating |

### Admin Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/admin/comments` | GET | Admin | List all comments with pagination |
| `/api/admin/comments/[id]` | GET | Admin | Get comment by ID |
| `/api/admin/comments/[id]` | PUT | Admin | Update comment content |
| `/api/admin/comments/[id]` | DELETE | Admin | Soft-delete a comment |

## Public Endpoints

### List Item Comments

```
GET /api/items/[slug]/comments
```

Returns all comments for a specific item including user profile information. No authentication is required.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `slug` | string | Item slug |

**Success Response (200):**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool!",
      "rating": 5,
      "userId": "client_456def",
      "itemId": "item_123abc",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "deletedAt": null,
      "user": {
        "id": "client_456def",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "avatar": "https://example.com/avatars/john.jpg"
      }
    }
  ]
}
```

**Source:** `template/app/api/items/[slug]/comments/route.ts`

### Get Rating Statistics

```
GET /api/items/[slug]/comments/rating
```

Returns the average rating and total number of ratings for an item. Only counts non-deleted comments.

**Success Response (200):**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

Returns `averageRating: 0` and `totalRatings: 0` when no ratings exist.

**Source:** `template/app/api/items/[slug]/comments/rating/route.ts`

## Authenticated Endpoints

### Create Comment

```
POST /api/items/[slug]/comments
```

Creates a new comment with a rating on an item. Requires authentication and a valid client profile. Blocked users are prevented from commenting.

**Authentication:** Required

**Request Body:**

```json
{
  "content": "This is an amazing tool! Really helped boost my productivity.",
  "rating": 5
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `content` | string | Yes | Must be non-empty after trimming |
| `rating` | integer | Yes | Must be between 1 and 5 inclusive |

**Success Response (200):**

```json
{
  "success": true,
  "comment": {
    "id": "comment_123abc",
    "content": "This is an amazing tool!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "item_123abc",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

| Status | Condition |
|---|---|
| 400 | Empty content or invalid rating |
| 401 | Not authenticated |
| 403 | User is suspended or banned |
| 404 | Client profile not found |

**Source:** `template/app/api/items/[slug]/comments/route.ts`

### Update Comment

```
PUT /api/items/[slug]/comments/[commentId]
```

Updates the content and/or rating of an existing comment. Only the comment author can update their own comment. At least one of `content` or `rating` must be provided.

**Authentication:** Required (must be comment owner)

**Request Body:**

```json
{
  "content": "Updated review text",
  "rating": 4
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `content` | string | No | 1-1000 characters |
| `rating` | integer | No | Must be between 1 and 5 |

The response includes the updated comment with an `editedAt` timestamp.

| Status | Condition |
|---|---|
| 400 | No fields provided, content too long, or invalid rating |
| 401 | Not authenticated |
| 404 | Comment not found or user is not the author |

**Source:** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### Delete Comment

```
DELETE /api/items/[slug]/comments/[commentId]
```

Soft-deletes a comment. Only the comment author can delete their own comment. The comment is marked with a `deletedAt` timestamp rather than being permanently removed.

**Authentication:** Required (must be comment owner)

**Success Response:** 204 No Content

| Status | Condition |
|---|---|
| 401 | Not authenticated |
| 404 | Comment not found, already deleted, or not owned by user |

**Source:** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### Update Comment Rating

```
PATCH /api/items/[slug]/comments/rating/[commentId]
```

Updates only the rating of a specific comment.

**Request Body:**

```json
{
  "rating": 4
}
```

**Source:** `template/app/api/items/[slug]/comments/rating/[commentId]/route.ts`

## Admin Endpoints

All admin endpoints require `session.user.isAdmin` to be true.

### List All Comments

```
GET /api/admin/comments
```

Returns a paginated list of all comments (excluding soft-deleted ones) with user information. Supports search across comment content, user name, and user email.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number |
| `limit` | integer | 10 | Results per page (1-100) |
| `search` | string | - | Search in content, user name, or email |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "Great product!",
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

**Source:** `template/app/api/admin/comments/route.ts`

### Get Comment by ID

```
GET /api/admin/comments/[id]
```

Retrieves a specific comment with full user information.

**Source:** `template/app/api/admin/comments/[id]/route.ts`

### Admin Update Comment

```
PUT /api/admin/comments/[id]
```

Allows administrators to update the content of any comment, regardless of ownership.

**Request Body:**

```json
{
  "content": "This content has been moderated by an administrator."
}
```

**Source:** `template/app/api/admin/comments/[id]/route.ts`

### Admin Delete Comment

```
DELETE /api/admin/comments/[id]
```

Soft-deletes any comment. The comment must exist and not already be deleted.

**Success Response (200):**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

| Status | Condition |
|---|---|
| 403 | Not an admin |
| 404 | Comment not found or already deleted |

**Source:** `template/app/api/admin/comments/[id]/route.ts`

## Key Implementation Details

- **Soft Deletion:** All deletes set `deletedAt` rather than removing records. Queries filter out deleted comments via `isNull(comments.deletedAt)`.
- **Ownership Verification:** User endpoints verify the authenticated user's client profile ID matches the comment's `userId` field.
- **Blocked User Prevention:** The `isUserBlocked()` check prevents suspended or banned users from creating comments.
- **Search (Admin):** Uses ILIKE for case-insensitive search with proper escaping of SQL wildcards (`%` and `_`).
