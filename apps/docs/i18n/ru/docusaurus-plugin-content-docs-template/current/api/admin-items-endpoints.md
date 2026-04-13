---
id: admin-items-endpoints
title: 管理项目 API 端点
sidebar_label: 管理项目
sidebar_position: 37
---

# 管理项目 API 端点

Items API 提供用于管理目录列表的端点，包括创建、更新、审核工作流程（批准/拒绝）、审核历史记录、批量操作和统计。项目在`draft`、`pending`、`approved` 和`rejected` 状态的生命周期中进展。所有端点都需要管理员身份验证。

## 基本路径

```
/api/admin/items
```

## 路线概要

|方法|路径|授权|描述|
| -------- | ------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/items`|管理员|获取分页的项目列表|
|`POST`|`/api/admin/items`|管理员|创建一个新项目|
|`GET`|`/api/admin/items/stats`|管理员|获取项目统计信息|
|`POST`|`/api/admin/items/bulk`|管理员|批量批准、拒绝或删除|
|`GET`|`/api/admin/items/{id}`|管理员|通过ID获取物品|
|`PUT`|`/api/admin/items/{id}`|管理员|更新项目|
|`DELETE`|`/api/admin/items/{id}`|管理员|永久删除项目|
|`POST`|`/api/admin/items/{id}/review`|管理员|批准或拒绝项目|
|`GET`|`/api/admin/items/{id}/history`|管理员|获取项目审核历史记录|

---

## List Items

```
GET /api/admin/items
```

Returns a paginated list of items with search, filtering by status/category/tags, and sorting.

**Query Parameters:**

| Parameter    | Type    | Default      | Description                                              |
| ------------ | ------- | ------------ | -------------------------------------------------------- |
| `page`       | integer | `1`          | Page number (minimum: 1)                                  |
| `limit`      | integer | `10`         | Results per page (1--100)                                 |
| `search`     | string  | --           | Search items by name or description                       |
| `status`     | string  | --           | Filter: `draft`, `pending`, `approved`, `rejected`        |
| `categories` | string  | --           | Comma-separated category slugs                            |
| `tags`       | string  | --           | Comma-separated tag slugs                                 |
| `sortBy`     | string  | `updated_at` | Sort field: `name`, `updated_at`, `status`, `submitted_at`|
| `sortOrder`  | string  | `desc`       | Sort direction: `asc` or `desc`                           |

**Response (200):**

```json
{
  "success": true,
  "items": [
    {
      "id": "item_123abc",
      "name": "Awesome Productivity Tool",
      "slug": "awesome-productivity-tool",
      "description": "A powerful tool to boost your productivity",
      "source_url": "https://example.com/tool",
      "category": ["productivity", "business"],
      "tags": ["saas", "productivity"],
      "featured": true,
      "icon_url": "https://example.com/icon.png",
      "status": "approved",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## 创建项目

```
POST /api/admin/items
```

创建一个新项目，并对 ID 和 slug 进行重复检查。触发 CRM 同步（如果启用）和位置索引（如果启用）。

**请求正文：**

|领域|类型|必填|描述|
| ------------ | -------- | -------- | ---------------------------------------------- |
|`id`|字符串|是的|唯一的项目标识符|
|`name`|字符串|是的|商品名称|
|`slug`|字符串|是的|URL 友好的 slug（必须是唯一的）|
|`description`|字符串|是的|物品描述|
|`source_url`|字符串|是的|项目的来源 URL|
|`category`|字符串[]|否|类别 slug 的数组|
|`tags`|字符串[]|否|标签段数组|
|`brand`|字符串|否|品牌名称（用于 CRM 公司同步）|
|`featured`|布尔值|否|特色标志（默认：`false`）|
|`icon_url`|字符串|否|图标网址|
|`status`|字符串|否|初始状态（默认：`draft`）|
|`location`|对象|否|用于地理索引的位置数据|

**回复（201）：**

```json
{
  "success": true,
  "item": {
    "id": "item_123abc",
    "name": "Awesome Productivity Tool",
    "slug": "awesome-productivity-tool",
    "status": "draft",
    "created_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Item created successfully"
}
```

---

## Get Item Statistics

```
GET /api/admin/items/stats
```

Returns counts by status. Supports optional filters to scope the statistics.

**Query Parameters:**

| Parameter    | Type   | Description                        |
| ------------ | ------ | ---------------------------------- |
| `search`     | string | Filter stats by search term        |
| `categories` | string | Comma-separated category slugs     |
| `tags`       | string | Comma-separated tag slugs          |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "total": 1247,
    "draft": 45,
    "pending": 23,
    "approved": 1156,
    "rejected": 23
  }
}
```

---

## 批量操作

```
POST /api/admin/items/bulk
```

对最多 100 个项目执行批量批准、拒绝或删除。每件商品均单独处理；部分失败不会中止整个操作。向提交者发送有关批准/拒绝的电子邮件通知。

**请求正文：**

|领域|类型|必填|描述|
| -------- | -------- | ------------------ | ---------------------------------------------------- |
|`action`|字符串|是的|`approve`、`reject` 或 `delete`|
|`ids`|字符串[]|是的|要处理的项目 ID（1--100，无重复）|
|`reason`|字符串|是（`reject`）|拒绝原因（至少 10 个字符）|

**回复 (200)：**

```json
{
  "success": true,
  "message": "Bulk approve completed: 3 approved, 0 failed",
  "results": [
    { "id": "item_1", "success": true },
    { "id": "item_2", "success": true },
    { "id": "item_3", "success": false, "error": "Item not found" }
  ],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Get / Update / Delete Item

### Get Item

```
GET /api/admin/items/{id}
```

Returns complete item details including metadata, categories, tags, review notes, and engagement metrics.

### Update Item

```
PUT /api/admin/items/{id}
```

Partial update -- only provided fields are modified. Triggers CRM sync when `brand` is provided and location re-indexing when location data changes.

**Request Body (all fields optional):**

```json
{
  "name": "Updated Tool Name",
  "slug": "updated-tool-name",
  "description": "Updated description",
  "source_url": "https://example.com/updated",
  "category": ["productivity", "automation"],
  "tags": ["saas", "ai"],
  "brand": "Acme Corp",
  "featured": true,
  "icon_url": "https://example.com/new-icon.png",
  "status": "approved"
}
```

### Delete Item

```
DELETE /api/admin/items/{id}
```

Permanently deletes an item and removes it from the location index (if enabled). This action cannot be undone.

**Response (200):**

```json
{ "success": true, "message": "Item deleted successfully" }
```

---

## 评论项目

```
POST /api/admin/items/{id}/review
```

批准或拒绝项目。使用可选注释记录审核决定。向原始提交者发送电子邮件通知（如果提交者是注册用户）。

**请求正文：**

|领域|类型|必填|描述|
| -------------- | ------ | -------- | ------------------------------------ |
|`status`|字符串|是的|`approved` 或 `rejected`|
|`review_notes`|字符串|否|审查决定的说明|

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "id": "item_123abc",
    "status": "approved",
    "review_notes": "Great tool, approved for listing.",
    "reviewed_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Item approved successfully"
}
```

---

## Get Item Audit History

```
GET /api/admin/items/{id}/history
```

Returns the complete audit trail for an item, including creation, updates, status changes, reviews, deletions, and restorations.

**Query Parameters:**

| Parameter | Type    | Default | Description                                                            |
| --------- | ------- | ------- | ---------------------------------------------------------------------- |
| `page`    | integer | `1`     | Page number                                                             |
| `limit`   | integer | `20`    | Results per page (max 100)                                              |
| `action`  | string  | --      | Comma-separated filter: `created`, `updated`, `status_changed`, `reviewed`, `deleted`, `restored` |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_abc123",
        "itemId": "awesome-tool",
        "action": "reviewed",
        "previousStatus": "pending",
        "newStatus": "approved",
        "performedByName": "Admin User",
        "notes": "Approved for listing",
        "createdAt": "2024-01-20T16:45:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## 验证规则

|领域|规则|
| ------------ | ---------------------------------------------------------- |
|`id`|必填；所有项目中必须是唯一的|
|`name`|创建时需要|
|`slug`|必填；所有项目中必须是唯一的|
|`description`|创建时需要|
|`source_url`|创作所需；有效的网址格式|
|`status`|必须是 `draft`、`pending`、`approved` 或 `rejected`|
|`reason`|批量拒绝时需要；最少 10 个字符|
|`ids`|批量：1--100 个非空唯一字符串|
|`action`|历史过滤器：仅有效的审核操作类型|

## 错误代码

|状态|含义|
| ------ | -------------------------------------------------------- |
| `400`  |验证错误、参数无效、字段缺失|
| `401`  |需要身份验证|
| `403`  |需要管理员权限|
| `404`  |未找到项目|
| `409`  |重复的项目 ID 或 slug|
| `500`  |服务器内部错误|

## 相关文档

- [Admin Roles API](./admin-roles-endpoints.md) -- 管理分配给用户的角色
- [Admin Users API](./admin-users-endpoints.md) -- 用户账户管理
- [Authentication](../architecture/nextauth-configuration.md) -- 会话管理和防护
