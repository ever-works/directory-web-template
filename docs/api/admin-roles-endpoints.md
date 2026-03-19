---
id: admin-roles-endpoints
title: Admin Roles API Endpoints
sidebar_label: Admin Roles
sidebar_position: 35
---

# Admin Roles API Endpoints

The Roles API provides endpoints for managing user roles and their associated permissions. Roles control access levels across the application and can be assigned to users through the [Admin Users API](./admin-users-endpoints.md).

## Base Path

```
/api/admin/roles
```

## Route Summary

| Method   | Path                              | Auth     | Description                          |
| -------- | --------------------------------- | -------- | ------------------------------------ |
| `GET`    | `/api/admin/roles`                | Admin    | Get paginated roles list             |
| `POST`   | `/api/admin/roles`                | Admin    | Create a new role                    |
| `GET`    | `/api/admin/roles/active`         | Public   | Get all active roles                 |
| `GET`    | `/api/admin/roles/stats`          | Admin    | Get role statistics                  |
| `GET`    | `/api/admin/roles/{id}`           | Admin    | Get a single role by ID              |
| `PUT`    | `/api/admin/roles/{id}`           | Admin    | Update a role                        |
| `DELETE` | `/api/admin/roles/{id}`           | Admin    | Delete a role (soft or hard)         |
| `GET`    | `/api/admin/roles/{id}/permissions` | Admin  | Get permissions for a role           |
| `PUT`    | `/api/admin/roles/{id}/permissions` | Admin  | Update permissions for a role        |

---

## List Roles

```
GET /api/admin/roles
```

Returns a paginated list of roles with optional filtering and sorting.

**Query Parameters:**

| Parameter   | Type    | Default  | Description                                   |
| ----------- | ------- | -------- | --------------------------------------------- |
| `page`      | integer | `1`      | Page number (minimum: 1)                       |
| `limit`     | integer | `10`     | Results per page (1--100)                      |
| `status`    | string  | --       | Filter by `active` or `inactive`               |
| `sortBy`    | string  | `name`   | Sort field: `name`, `id`, `created_at`         |
| `sortOrder` | string  | `asc`    | Sort direction: `asc` or `desc`                |

**Response (200):**

```json
{
  "success": true,
  "roles": [
    {
      "id": "admin",
      "name": "Administrator",
      "description": "Full system administrator with all permissions",
      "status": "active",
      "isAdmin": true,
      "permissions": ["users.read", "users.write", "roles.read", "roles.write"],
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

## Create Role

```
POST /api/admin/roles
```

Creates a new role. The role ID is automatically generated from the name by normalizing, stripping diacritics, and converting to a URL-safe slug (max 64 characters). Duplicate names (including soft-deleted records) are rejected.

**Request Body:**

| Field         | Type    | Required | Description                        |
| ------------- | ------- | -------- | ---------------------------------- |
| `name`        | string  | Yes      | Role name (3--100 characters)      |
| `description` | string  | Yes      | Role description (max 500 chars)   |
| `status`      | string  | No       | `active` (default) or `inactive`   |
| `isAdmin`     | boolean | No       | Admin privileges flag (default: `false`) |

**Example:**

```json
{
  "name": "Content Moderator",
  "description": "Responsible for moderating user-generated content",
  "status": "active",
  "isAdmin": false
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "content-moderator",
    "name": "Content Moderator",
    "description": "Responsible for moderating user-generated content",
    "status": "active",
    "isAdmin": false,
    "permissions": [],
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Role created successfully"
}
```

---

## Get Active Roles

```
GET /api/admin/roles/active
```

Returns all roles with `active` status. Commonly used to populate role dropdowns in user management forms. No authentication required.

**Response (200):**

```json
{
  "roles": [
    { "id": "admin", "name": "Administrator", "status": "active", "isAdmin": true, "permissions": [...] },
    { "id": "moderator", "name": "Moderator", "status": "active", "isAdmin": false, "permissions": [...] }
  ]
}
```

---

## Get Role Statistics

```
GET /api/admin/roles/stats
```

Returns aggregate statistics about roles. Requires admin session.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "total": 25,
    "active": 20,
    "inactive": 5,
    "averagePermissions": 4.2
  }
}
```

---

## Get / Update / Delete Role

### Get Role

```
GET /api/admin/roles/{id}
```

Returns full details for a single role including permissions, status, and timestamps.

### Update Role

```
PUT /api/admin/roles/{id}
```

Partial update -- only provided fields are changed. Validates name length (3--100) and description length (max 500).

**Request Body (all fields optional):**

```json
{
  "name": "Senior Moderator",
  "description": "Senior content moderator with enhanced permissions",
  "status": "active",
  "isAdmin": false
}
```

### Delete Role

```
DELETE /api/admin/roles/{id}?hard=false
```

| Parameter | Type   | Default | Description                              |
| --------- | ------ | ------- | ---------------------------------------- |
| `hard`    | string | `false` | `true` for permanent removal, `false` for soft delete (marks inactive) |

---

## Role Permissions

### Get Permissions

```
GET /api/admin/roles/{id}/permissions
```

Returns the permissions array and basic role metadata.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "permissions": ["users.read", "users.write", "roles.read"],
    "role": { "id": "moderator", "name": "Moderator", "description": "..." }
  }
}
```

### Update Permissions

```
PUT /api/admin/roles/{id}/permissions
```

Replaces the entire permissions array. Each permission string is validated against the system permission definitions. Invalid permissions are returned in the error response.

**Request Body:**

```json
{
  "permissions": ["users.read", "items.read", "items.moderate", "comments.moderate"]
}
```

---

## Validation Rules

| Field         | Rule                                                    |
| ------------- | ------------------------------------------------------- |
| `name`        | 3--100 characters; used to derive a unique slug ID      |
| `description` | Maximum 500 characters                                  |
| `status`      | Must be `active` or `inactive`                          |
| `permissions` | Array of strings; each must be a valid system permission |

## Error Codes

| Status | Meaning                                          |
| ------ | ------------------------------------------------ |
| `400`  | Validation error (invalid params, missing fields) |
| `401`  | Authentication required                           |
| `403`  | Admin privileges required                         |
| `404`  | Role not found                                    |
| `409`  | Duplicate role name / ID conflict                 |
| `500`  | Internal server error                             |

## Related Documentation

- [Admin Users API](./admin-users-endpoints.md) -- assign roles to users
- [Authentication](../architecture/nextauth-configuration.md) -- session and admin guard details
- [Permissions System](../architecture/permissions-system.md) -- permission definitions and validation
