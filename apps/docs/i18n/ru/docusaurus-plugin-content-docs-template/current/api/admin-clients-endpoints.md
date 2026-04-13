---
id: admin-clients-endpoints
title: 管理客户端 API 端点
sidebar_label: 管理客户端
sidebar_position: 38
---

# 管理客户端 API 端点

客户端 API 提供用于管理客户端配置文件的端点，包括创建、更新、高级搜索、批量操作、仪表板分析和综合统计。客户端代表链接到身份验证帐户的最终用户配置文件。所有端点都需要管理员身份验证。

## 基本路径

```
/api/admin/clients
```

## 路线概要

|方法|路径|授权|描述|
| -------- | --------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/clients`|管理员|获取分页客户列表|
|`POST`|`/api/admin/clients`|管理员|创建新的客户资料|
|`GET`|`/api/admin/clients/stats`|管理员|获取全面的客户统计数据|
|`GET`|`/api/admin/clients/dashboard`|管理员|获取合并的仪表板数据|
|`GET`|`/api/admin/clients/advanced-search`|管理员|高级多重过滤搜索|
|`PUT`|`/api/admin/clients/bulk`|管理员|批量更新客户资料|
|`DELETE`|`/api/admin/clients/bulk`|管理员|批量删除客户资料|
|`GET`|`/api/admin/clients/{clientId}`|管理员|通过ID获取客户端|
|`PUT`|`/api/admin/clients/{clientId}`|管理员|更新客户资料|
|`DELETE`|`/api/admin/clients/{clientId}`|管理员|删除客户资料|

---

## List Clients

```
GET /api/admin/clients
```

Returns a paginated list of client profiles with basic filtering.

**Query Parameters:**

| Parameter     | Type    | Default | Description                                            |
| ------------- | ------- | ------- | ------------------------------------------------------ |
| `page`        | integer | `1`     | Page number (minimum: 1)                                |
| `limit`       | integer | `10`    | Results per page (1--100)                               |
| `search`      | string  | --      | Search by name or email                                 |
| `status`      | string  | --      | Filter: `active`, `inactive`, `suspended`, `trial`      |
| `plan`        | string  | --      | Filter: `free`, `standard`, `premium`                   |
| `accountType` | string  | --      | Filter: `individual`, `business`, `enterprise`          |
| `provider`    | string  | --      | Filter by authentication provider                       |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client_123abc",
        "displayName": "John Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "company": "Tech Corp Inc",
        "status": "active",
        "plan": "premium",
        "accountType": "business",
        "joinedAt": "2024-01-15T10:30:00.000Z",
        "lastActiveAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10
  }
}
```

---

## 创建客户端

```
POST /api/admin/clients
```

创建新的客户资料。如果所提供的电子邮件不存在用户帐户，则会自动使用临时密码创建新用户。启用后触发 CRM 同步。

**请求正文：**

|领域|类型|必填|描述|
| ---------------- | ------- | -------- | -------------------------------------------- |
|`email`|字符串|是的|客户电子邮件地址|
|`displayName`|字符串|否|显示名称（默认为电子邮件前缀）|
|`username`|字符串|否|唯一的用户名|
|`bio`|字符串|否|客户简介|
|`jobTitle`|字符串|否|职称|
|`company`|字符串|否|公司名称|
|`industry`|字符串|否|工业部门|
|`phone`|字符串|否|电话号码|
|`website`|字符串|否|网站网址|
|`location`|字符串|否|地点|
|`accountType`|字符串|否|`individual`（默认）、`business`、`enterprise`|
|`status`|字符串|否|`active`（默认）、`inactive`、`suspended`、`trial`|
|`plan`|字符串|否|`free`（默认）、`standard`、`premium`|

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "id": "client_789ghi",
    "displayName": "John Doe",
    "email": "john.doe@example.com",
    "status": "active",
    "plan": "premium",
    "accountType": "business",
    "createdAt": "2024-01-20T16:45:00.000Z"
  },
  "message": "Client created successfully"
}
```

---

## Get Client Statistics

```
GET /api/admin/clients/stats
```

Returns comprehensive analytics across all clients, grouped by overview, growth, plans, account types, engagement, demographics, and authentication providers.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalClients": 1247,
      "activeClients": 1156,
      "inactiveClients": 67,
      "suspendedClients": 24,
      "trialClients": 89
    },
    "growth": {
      "newClientsToday": 3,
      "newClientsThisWeek": 18,
      "newClientsThisMonth": 45,
      "growthRate": 3.8
    },
    "plans": {
      "free": 856,
      "standard": 267,
      "premium": 124,
      "conversionRate": 31.4
    },
    "accountTypes": {
      "individual": 789,
      "business": 356,
      "enterprise": 102
    },
    "engagement": {
      "averageSubmissions": 12.5,
      "totalSubmissions": 15587,
      "activeThisWeek": 892,
      "activeThisMonth": 1034
    },
    "demographics": {
      "topCountries": [{ "country": "United States", "count": 456 }],
      "topCompanies": [{ "company": "Tech Corp Inc", "count": 25 }],
      "topIndustries": [{ "industry": "Technology", "count": 234 }]
    },
    "providers": { "google": 567, "github": 234, "email": 446 }
  }
}
```

---

## 仪表板

```
GET /api/admin/clients/dashboard
```

返回包含分页客户端列表、聚合统计信息和分页元数据的组合响应。支持所有基本过滤器以及日期范围参数。

**查询参数（除列表参数外）：**

|参数|类型|描述|
| --------------- | ------ | ------------------------------------------ |
|`createdAfter`|字符串|ISO 日期或 `YYYY-MM-DD` -- 创建于之后|
|`createdBefore`|字符串|ISO 日期或 `YYYY-MM-DD` -- 之前创建|

---

## Advanced Search

```
GET /api/admin/clients/advanced-search
```

Performs a multi-dimensional search across client profiles. In addition to the basic list filters, supports field-specific searches, numeric ranges, boolean flags, and date ranges. Returns search metadata including applied filters and execution time.

**Additional Query Parameters:**

| Parameter          | Type    | Description                                    |
| ------------------ | ------- | ---------------------------------------------- |
| `sortBy`           | string  | `createdAt`, `updatedAt`, `name`, `email`, `company`, `totalSubmissions` |
| `sortOrder`        | string  | `asc` or `desc`                                |
| `createdAfter`     | string  | ISO date-time filter                           |
| `createdBefore`    | string  | ISO date-time filter                           |
| `emailDomain`      | string  | Filter by email domain (e.g., `example.com`)   |
| `companySearch`    | string  | Search within company names                    |
| `locationSearch`   | string  | Search within locations                        |
| `industrySearch`   | string  | Search within industries                       |
| `minSubmissions`   | integer | Minimum submission count                       |
| `maxSubmissions`   | integer | Maximum submission count                       |
| `emailVerified`    | boolean | Filter by email verification status            |
| `twoFactorEnabled` | boolean | Filter by 2FA status                          |
| `hasAvatar`        | boolean | Filter clients with/without avatar             |
| `hasWebsite`       | boolean | Filter clients with/without website            |
| `hasPhone`         | boolean | Filter clients with/without phone              |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "clients": [{ "id": "client_123abc", "..." : "..." }],
    "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 },
    "searchMetadata": {
      "appliedFilters": { "status": "active", "plan": "premium" },
      "searchTime": 45.2
    }
  }
}
```

---

## 批量操作

### 批量更新

```
PUT /api/admin/clients/bulk
```

在单个请求中更新多个客户端配置文件。每个客户端对象必须包含 `id` 字段以及要更新的字段。个别失败不会中止整个批次。

**请求正文：**

```json
{
  "clients": [
    { "id": "client_123abc", "plan": "premium", "status": "active" },
    { "id": "client_456def", "plan": "standard" }
  ]
}
```

### 批量删除

```
DELETE /api/admin/clients/bulk
```

永久删除多个客户端配置文件。数组中的每个对象都必须包含 `id` 字段。

**请求正文：**

```json
{
  "clients": [
    { "id": "client_123abc" },
    { "id": "client_456def" }
  ]
}
```

**响应 (200) -- 两个批量端点：**

```json
{
  "success": true,
  "message": "Bulk update completed: 2 successful, 1 failed",
  "results": [{ "index": 0, "success": true }],
  "errors": [{ "index": 2, "error": "Client not found" }],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Get / Update / Delete Client

### Get Client

```
GET /api/admin/clients/{clientId}
```

Returns the complete client profile including display name, company, plan, account type, and activity timestamps.

### Update Client

```
PUT /api/admin/clients/{clientId}
```

Partial update -- only provided fields are modified. Triggers CRM sync when company or profile data changes.

**Request Body (all fields optional):**

```json
{
  "displayName": "John Doe Updated",
  "username": "johndoe_updated",
  "bio": "Senior Developer",
  "jobTitle": "Lead Developer",
  "company": "Tech Corp Inc",
  "status": "active",
  "plan": "premium",
  "accountType": "business"
}
```

### Delete Client

```
DELETE /api/admin/clients/{clientId}
```

Permanently deletes a client profile. This action cannot be undone.

**Response (200):**

```json
{ "success": true, "message": "Client deleted successfully" }
```

---

## 验证规则

|领域|规则|
| ------------- | ---------------------------------------------------------- |
|`email`|创作所需；有效的电子邮件格式|
|`status`|必须是 `active`、`inactive`、`suspended` 或 `trial`|
|`plan`|必须是 `free`、`standard` 或 `premium`|
|`accountType`|必须是 `individual`、`business` 或 `enterprise`|
|`clients`|Bulk：非空数组，每个对象都需要 `id`|

## 错误代码

|状态|含义|
| ------ | ------------------------------------------------------ |
| `400`  |验证错误、缺少电子邮件、用户创建失败|
| `401`  |需要身份验证|
| `403`  |需要管理员权限|
| `404`  |找不到客户端|
| `500`  |服务器内部错误|

## 相关文档

- [Admin Users API](./admin-users-endpoints.md) -- 用户账户管理
- [Admin Roles API](./admin-roles-endpoints.md) -- 角色和权限管理
- [Authentication](../architecture/nextauth-configuration.md) -- 会话管理和防护
