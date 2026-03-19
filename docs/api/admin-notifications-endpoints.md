---
id: admin-notifications-endpoints
title: Admin Notifications API Endpoints
sidebar_label: Admin Notifications
sidebar_position: 33
---

# Admin Notifications API Endpoints

The Admin Notifications API manages in-app notifications for admin users. It supports listing notifications with unread counts, creating new notifications for specific users, and marking notifications as read (individually or in bulk). Notifications are stored in the database and scoped to individual users.

## Route Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/notifications` | Admin | List notifications for current admin |
| `POST` | `/api/admin/notifications` | Authenticated | Create a new notification |
| `PATCH` | `/api/admin/notifications/{id}/read` | Authenticated | Mark a single notification as read |
| `PATCH` | `/api/admin/notifications/mark-all-read` | Authenticated | Mark all notifications as read |

## Authentication

The notification endpoints use two levels of authentication:

**Admin-only (GET list):** Requires both authentication and admin role.

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
if (!session.user.isAdmin) {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}
```

**Authenticated user (POST, PATCH):** Requires a valid session but does not require admin role. The mark-as-read endpoints are scoped to the authenticated user's own notifications.

## Endpoints

### GET `/api/admin/notifications`

Retrieves the latest 50 notifications for the authenticated admin user, sorted by creation date (newest first). Also returns the total count of unread notifications.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123abc",
        "userId": "user_456def",
        "type": "item_approved",
        "title": "Item Approved",
        "message": "Your item 'Awesome Tool' has been approved and is now live.",
        "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\"}",
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "unreadCount": 3
  }
}
```

**Behavior Details:**
- Maximum of 50 notifications are returned per request
- Results are ordered by `createdAt` descending (newest first)
- `unreadCount` is calculated separately by counting notifications where `isRead = false`
- Notifications are scoped to the authenticated user's ID

### POST `/api/admin/notifications`

Creates a new notification for a specified user. The `data` field accepts an object that will be JSON-stringified before storage. This endpoint does not require admin privileges -- any authenticated user can create notifications (typically called by the system internally).

**Request Body:**

```json
{
  "type": "item_approved",
  "title": "Item Approved",
  "message": "Your item 'Awesome Tool' has been approved and is now live.",
  "userId": "user_456def",
  "data": {
    "itemId": "item_789ghi",
    "itemName": "Awesome Tool",
    "action": "approved"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Notification type identifier (e.g., `"item_approved"`, `"comment_received"`) |
| `title` | string | Yes | Short notification title |
| `message` | string | Yes | Full notification message |
| `userId` | string | Yes | Target user ID to receive the notification |
| `data` | object | No | Additional metadata (JSON-stringified on storage) |

**Response (200):**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "userId": "user_456def",
    "type": "item_approved",
    "title": "Item Approved",
    "message": "Your item 'Awesome Tool' has been approved and is now live.",
    "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\", \"action\": \"approved\"}",
    "isRead": false,
    "readAt": null,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### PATCH `/api/admin/notifications/{id}/read`

Marks a specific notification as read. Sets `isRead` to `true`, records the current timestamp in `readAt`, and updates `updatedAt`. Only the notification owner can mark their own notifications -- the query filters by both notification ID and authenticated user ID.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Notification unique identifier |

**Response (200):**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "userId": "user_456def",
    "type": "item_approved",
    "title": "Item Approved",
    "message": "Your item 'Awesome Tool' has been approved and is now live.",
    "isRead": true,
    "readAt": "2024-01-20T16:45:00.000Z",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### PATCH `/api/admin/notifications/mark-all-read`

Marks all unread notifications for the authenticated user as read in a single bulk operation. Updates `isRead`, `readAt`, and `updatedAt` for every matching notification. Returns the count of notifications that were updated.

**Response (200):**

```json
{
  "success": true,
  "updatedCount": 5
}
```

**Behavior Details:**
- Only updates notifications where `isRead = false` for the current user
- `updatedCount` may be `0` if there are no unread notifications
- All matching notifications are updated in a single database query

## Notification Data Model

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string | No | Unique notification identifier |
| `userId` | string | No | ID of the user who receives the notification |
| `type` | string | No | Notification type (e.g., `"item_approved"`, `"comment_received"`) |
| `title` | string | No | Short display title |
| `message` | string | No | Full notification message |
| `data` | string | Yes | JSON-stringified additional metadata |
| `isRead` | boolean | No | Whether the notification has been read |
| `readAt` | datetime | Yes | Timestamp when marked as read |
| `createdAt` | datetime | No | Creation timestamp |
| `updatedAt` | datetime | Yes | Last update timestamp |

## Error Codes

| Status | Error | Cause |
|--------|-------|-------|
| `400` | Missing required fields | POST missing type, title, message, or userId |
| `400` | Notification ID is required | PATCH with empty ID parameter |
| `401` | Unauthorized | No active session |
| `403` | Forbidden | Non-admin user on GET list endpoint |
| `404` | Notification not found | Invalid ID or notification belongs to another user |
| `500` | Internal server error | Database or server failure |

## Common Notification Types

The `type` field is a free-form string, but the application commonly uses these values:

| Type | Description |
|------|-------------|
| `item_approved` | An item has been approved by an admin |
| `item_rejected` | An item has been rejected |
| `comment_received` | A new comment was posted on an item |
| `submission_received` | A new item submission was received |

## Related Documentation

- [Admin Endpoints Overview](./admin-endpoints.md)
- [Response Patterns](./response-patterns.md)
- [Request Validation](./request-validation.md)
