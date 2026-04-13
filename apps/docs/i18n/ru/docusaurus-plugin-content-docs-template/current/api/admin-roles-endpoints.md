---
id: admin-roles-endpoints
title: 管理员角色 API 端点
sidebar_label: 管理员角色
sidebar_position: 35
---

# 管理员角色 API 端点

角色 API 提供用于管理用户角色及其关联权限的端点。角色控制整个应用程序的访问级别，并可以通过 [Admin Users API](./admin-users-endpoints.md) 分配给用户。

## 基本路径

```
/api/admin/roles
```

## 路线概要

|方法|路径|授权|描述|
| -------- | --------------------------------- | -------- | ------------------------------------ |
|`GET`|`/api/admin/roles`|管理员|获取分页角色列表|
|`POST`|`/api/admin/roles`|管理员|创建新角色|
|`GET`|`/api/admin/roles/active`|公共|获取所有活跃角色|
|`GET`|`/api/admin/roles/stats`|管理员|获取角色统计信息|
|`GET`|`/api/admin/roles/{id}`|管理员|通过ID获取单个角色|
|`PUT`|`/api/admin/roles/{id}`|管理员|更新角色|
|`DELETE`|`/api/admin/roles/{id}`|管理员|删除角色（软或硬）|
|`GET`|`/api/admin/roles/{id}/permissions`|管理员|获取角色的权限|
|`PUT`|`/api/admin/roles/{id}/permissions`|管理员|更新角色的权限|

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

## 创建角色

```
POST /api/admin/roles
```

创建一个新角色。角色 ID 是通过规范化、去除变音符号并转换为 URL 安全的 slug（最多 64 个字符）从名称自动生成的。重复的名称（包括软删除的记录）将被拒绝。

**请求正文：**

|领域|类型|必填|描述|
| ------------- | ------- | -------- | ---------------------------------- |
|`name`|字符串|是的|角色名称（3--100个字符）|
|`description`|字符串|是的|角色描述（最多 500 个字符）|
|`status`|字符串|否|`active`（默认）或`inactive`|
|`isAdmin`|布尔值|否|管理员权限标志（默认：`false`）|

**示例：**

```json
{
  "name": "Content Moderator",
  "description": "Responsible for moderating user-generated content",
  "status": "active",
  "isAdmin": false
}
```

**回复（201）：**

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

## 获取角色统计信息

```
GET /api/admin/roles/stats
```

返回有关角色的聚合统计信息。需要管理会话。

**回复 (200)：**

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

## 角色权限

### 获取权限

```
GET /api/admin/roles/{id}/permissions
```

返回权限数组和基本角色元数据。

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "permissions": ["users.read", "users.write", "roles.read"],
    "role": { "id": "moderator", "name": "Moderator", "description": "..." }
  }
}
```

### 更新权限

```
PUT /api/admin/roles/{id}/permissions
```

替换整个权限数组。每个权限字符串都会根据系统权限定义进行验证。错误响应中返回无效权限。

**请求正文：**

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
