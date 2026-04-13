---
id: admin-users-endpoints
title: 管理员用户 API 端点
sidebar_label: 管理员用户
sidebar_position: 36
---

# 管理员用户 API 端点

用户 API 提供用于管理用户帐户的端点，包括创建、更新、状态更改、角色分配和验证实用程序。除非另有说明，所有端点都需要管理员身份验证。

## 基本路径

```
/api/admin/users
```

## 路线概要

|方法|路径|授权|描述|
| -------- | ----------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/users`|管理员|获取分页用户列表|
|`POST`|`/api/admin/users`|管理员|创建一个新用户|
|`GET`|`/api/admin/users/stats`|管理员|获取用户统计数据|
|`POST`|`/api/admin/users/check-email`|管理员|检查电子邮件可用性|
|`POST`|`/api/admin/users/check-username`|管理员|检查用户名可用性|
|`GET`|`/api/admin/users/{id}`|管理员|通过ID获取用户|
|`PUT`|`/api/admin/users/{id}`|管理员|更新用户|
|`DELETE`|`/api/admin/users/{id}`|管理员|删除用户|

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

## 创建用户

```
POST /api/admin/users
```

创建具有全面验证的新用户。该角色必须存在于系统中（根据角色表进行验证）。

**请求正文：**

|领域|类型|必填|描述|
| ---------- | ------ | -------- | ---------------------------------------------------------- |
|`username`|字符串|是的|3--30 个字符，字母数字加 `-` 和 `_`|
|`email`|字符串|是的|有效的电子邮件格式|
|`name`|字符串|是的|全名（2--100 个字符）|
|`password`|字符串|是的|至少 8 个字符（由 Zod `passwordSchema` 验证）|
|`role`|字符串|是的|必须引用现有角色 ID|
|`title`|字符串|否|职位名称（最多 100 个字符）|
|`avatar`|字符串|否|头像 URL（最多 500 个字符）|

**示例：**

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

**回复（201）：**

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

## 检查电子邮件可用性

```
POST /api/admin/users/check-email
```

检查电子邮件地址是否已被使用。支持 `excludeId` 参数用于更新场景，其中当前用户的电子邮件应从重复检查中排除。

**请求正文：**

```json
{
  "email": "john.doe@example.com",
  "excludeId": "user_123abc"
}
```

**回复 (200)：**

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

## 获取/更新/删除用户

### 获取用户

```
GET /api/admin/users/{id}
```

返回单个用户的完整个人资料信息。

### 更新用户

```
PUT /api/admin/users/{id}
```

部分更新——仅修改提供的字段。验证电子邮件格式、用户名长度 (3--50)、名称长度 (2--100) 以及该角色是否存在于系统中。

**请求正文（所有字段可选）：**

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

### 删除用户

```
DELETE /api/admin/users/{id}
```

永久删除用户。包括自我删除保护：管理员无法删除自己的帐户。

**回复 (200)：**

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
