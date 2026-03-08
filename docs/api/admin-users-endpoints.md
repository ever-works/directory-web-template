---
id: admin-users-endpoints
title: Admin Users API Endpoints
sidebar_label: Admin Users
sidebar_position: 36
---

# Admin Users API Endpoints

The Users API provides endpoints for managing user accounts including creation, updates, status changes, role assignment, and validation utilities. All endpoints require admin authentication unless otherwise noted.

## Base Path

```
/api/admin/users
```

## Route Summary

| Method   | Path                                | Auth  | Description                          |
| -------- | ----------------------------------- | ----- | ------------------------------------ |
| `GET`    | `/api/admin/users`                  | Admin | Get paginated users list             |
| `POST`   | `/api/admin/users`                  | Admin | Create a new user                    |
| `GET`    | `/api/admin/users/stats`            | Admin | Get user statistics                  |
| `POST`   | `/api/admin/users/check-email`      | Admin | Check email availability             |
| `POST`   | `/api/admin/users/check-username`   | Admin | Check username availability          |
| `GET`    | `/api/admin/users/{id}`             | Admin | Get user by ID                       |
| `PUT`    | `/api/admin/users/{id}`             | Admin | Update user                          |
| `DELETE` | `/api/admin/users/{id}`             | Admin | Delete user                          |

---

## List Users

```
GET /api/admin/users
```

Returns a paginated list of users with search, filtering, and sorting.

**Query Parameters:**

| Parameter         | Type    | Default  | Description                                              |
| ----------------- | ------- | -------- | -------------------------------------------------------- |
| `page`            | integer | `1`      | Page number (minimum: 1)                                  |
| `limit`           | integer | `10`     | Results per page (1--100)                                 |
| `search`          | string  | --       | Search by name, email, or username (max 100 chars)        |
| `role`            | string  | --       | Filter by role ID (max 50 chars)                          |
| `status`          | string  | --       | Filter: `active` or `inactive`                            |
| `sortBy`          | string  | `name`   | Sort field: `name`, `username`, `email`, `role`, `created_at` |
| `sortOrder`       | string  | `asc`    | Sort direction: `asc` or `desc`                           |
| `includeInactive` | boolean | `false`  | Include inactive users in results                         |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "user_123abc",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "title": "Senior Developer",
      "avatar": "https://example.com/avatars/john.jpg",
      "role": "admin",
      "status": "active",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z",
      "last_login": "2024-01-20T16:20:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## Create User

```
POST /api/admin/users
```

Creates a new user with comprehensive validation. The role must exist in the system (validated against the roles table).

**Request Body:**

| Field      | Type   | Required | Description                                                |
| ---------- | ------ | -------- | ---------------------------------------------------------- |
| `username` | string | Yes      | 3--30 characters, alphanumeric plus `-` and `_`            |
| `email`    | string | Yes      | Valid email format                                         |
| `name`     | string | Yes      | Full name (2--100 characters)                              |
| `password` | string | Yes      | Minimum 8 characters (validated by Zod `passwordSchema`)   |
| `role`     | string | Yes      | Must reference an existing role ID                         |
| `title`    | string | No       | Job title (max 100 characters)                             |
| `avatar`   | string | No       | Avatar URL (max 500 characters)                            |

**Example:**

```json
{
  "username": "johndoe",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "password": "SecurePass123!",
  "role": "admin",
  "title": "Senior Developer",
  "avatar": "https://example.com/avatars/john.jpg"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "user_123abc",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "admin",
    "status": "active",
    "created_at": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## Get User Statistics

```
GET /api/admin/users/stats
```

Returns comprehensive statistics for the admin dashboard.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalUsers": 1247,
    "activeUsers": 1156,
    "inactiveUsers": 91,
    "recentRegistrations": 67,
    "roleDistribution": {
      "admin": 5,
      "moderator": 23,
      "user": 1219
    },
    "averageLoginFrequency": 12.5,
    "topActiveUsers": [
      {
        "id": "user_123abc",
        "username": "johndoe",
        "name": "John Doe",
        "loginCount": 45,
        "lastLogin": "2024-01-20T16:20:00.000Z"
      }
    ]
  }
}
```

---

## Check Email Availability

```
POST /api/admin/users/check-email
```

Checks whether an email address is already in use. Supports an `excludeId` parameter for update scenarios where the current user's email should be excluded from the duplicate check.

**Request Body:**

```json
{
  "email": "john.doe@example.com",
  "excludeId": "user_123abc"
}
```

**Response (200):**

```json
{ "available": true, "exists": false }
```

---

## Check Username Availability

```
POST /api/admin/users/check-username
```

Checks whether a username is already in use. Same `excludeId` pattern as email check.

**Request Body:**

```json
{
  "username": "johndoe",
  "excludeId": "user_123abc"
}
```

**Response (200):**

```json
{ "available": false, "exists": true }
```

---

## Get / Update / Delete User

### Get User

```
GET /api/admin/users/{id}
```

Returns complete profile information for a single user.

### Update User

```
PUT /api/admin/users/{id}
```

Partial update -- only provided fields are modified. Validates email format, username length (3--50), name length (2--100), and that the role exists in the system.

**Request Body (all fields optional):**

```json
{
  "username": "johndoe_updated",
  "email": "john.updated@example.com",
  "name": "John Updated Doe",
  "title": "Lead Developer",
  "avatar": "https://example.com/avatars/john_new.jpg",
  "role": "moderator",
  "status": "active"
}
```

### Delete User

```
DELETE /api/admin/users/{id}
```

Permanently deletes a user. Includes a self-deletion guard: an admin cannot delete their own account.

**Response (200):**

```json
{ "success": true, "message": "User deleted successfully" }
```

---

## Validation Rules

| Field      | Rule                                                        |
| ---------- | ----------------------------------------------------------- |
| `username` | 3--30 chars; regex `^[a-zA-Z0-9_-]{3,30}$` (create), 3--50 chars (update) |
| `email`    | Valid email format via `isValidEmail` utility                |
| `name`     | 2--100 characters                                           |
| `password` | Minimum 8 characters; validated by Zod `passwordSchema`     |
| `role`     | Must reference an existing role in the database              |
| `status`   | Must be `active` or `inactive`                              |
| `title`    | Maximum 100 characters                                      |
| `avatar`   | Maximum 500 characters                                      |

## Error Codes

| Status | Meaning                                           |
| ------ | ------------------------------------------------- |
| `400`  | Validation error, self-deletion, duplicate email/username |
| `401`  | Authentication required                            |
| `403`  | Admin privileges required                          |
| `404`  | User not found                                     |
| `500`  | Internal server error                              |

## Related Documentation

- [Admin Roles API](./admin-roles-endpoints.md) -- manage roles assigned to users
- [Authentication](../architecture/nextauth-configuration.md) -- session management and guards
- [Admin Clients API](./admin-clients-endpoints.md) -- client profile management
