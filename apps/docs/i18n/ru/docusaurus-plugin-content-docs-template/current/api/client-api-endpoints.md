---
id: client-api-endpoints
title: 客户端 API 端点
sidebar_label: 客户端API
sidebar_position: 58
---

# 客户端 API 端点

客户端 API 为注册用户提供经过身份验证的端点，以管理其提交的项目、查看仪表板统计数据和访问地理数据。所有端点都需要通过`requireClientAuth()`进行基于会话的身份验证。

**源码目录：** `template/app/api/client/`

---

## Authentication

Every endpoint in this group requires a valid user session. Unauthenticated requests receive:

**Status 401**
```json
{
  "success": false,
  "error": "Unauthorized. Please sign in to continue."
}
```

---

## 仪表板统计

### 获取仪表板统计数据

返回经过身份验证的用户的全面仪表板统计信息。

|财产|价值|
|----------|-------|
|**方法**|`GET`|
|**路径**|`/api/client/dashboard/stats`|
|**授权**|会话（用户）|
|**来源**|`client/dashboard/stats/route.ts`|

#### 回应

**状态 200**

```json
{
  "success": true,
  "totalSubmissions": 23,
  "totalViews": 0,
  "totalVotesReceived": 156,
  "totalCommentsReceived": 89,
  "viewsAvailable": false,
  "recentActivity": {
    "newSubmissions": 3,
    "newViews": 0
  },
  "uniqueItemsInteracted": 45,
  "totalActivity": 237,
  "activityChartData": [
    { "date": "Mon", "submissions": 1, "views": 0, "engagement": 5 }
  ],
  "engagementChartData": [
    { "name": "Votes", "value": 156, "color": "#8884d8" }
  ],
  "submissionTimeline": [
    { "month": "Mar", "submissions": 5 }
  ],
  "engagementOverview": [
    { "week": "W1", "votes": 10, "comments": 3 }
  ],
  "statusBreakdown": [
    { "status": "Approved", "value": 15, "color": "#22c55e" },
    { "status": "Pending", "value": 5, "color": "#f59e0b" },
    { "status": "Rejected", "value": 3, "color": "#ef4444" }
  ],
  "topItems": [
    { "id": "item_1", "title": "My Tool", "views": 100, "votes": 25, "comments": 8 }
  ]
}
```

#### 卷曲示例

```bash
curl -s http://localhost:3000/api/client/dashboard/stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Get Geographic Stats

Returns geographic coverage statistics for the authenticated user's items.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/client/geo-stats` |
| **Auth** | Session (user) |
| **Source** | `client/geo-stats/route.ts` |

#### Response

**Status 200**

```json
{
  "success": true,
  "total_items": 10,
  "items_with_location": 7,
  "items_remote": 2,
  "service_area_breakdown": [
    { "area": "local", "count": 3 },
    { "area": "regional", "count": 2 }
  ],
  "top_cities": [
    { "city": "New York", "count": 3 }
  ],
  "top_countries": [
    { "country": "United States", "count": 5 }
  ]
}
```

#### curl Example

```bash
curl -s http://localhost:3000/api/client/geo-stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### 获取物品坐标

返回具有位置数据的所有用户项的坐标，适合地图渲染。

|财产|价值|
|----------|-------|
|**方法**|`GET`|
|**路径**|`/api/client/items/coordinates`|
|**授权**|会话（用户）|
|**来源**|`client/items/coordinates/route.ts`|

#### 回应

**状态 200**

```json
{
  "success": true,
  "coordinates": [
    {
      "slug": "my-item",
      "name": "My Item",
      "latitude": 40.7128,
      "longitude": -74.006
    }
  ]
}
```

#### 卷曲示例

```bash
curl -s http://localhost:3000/api/client/items/coordinates \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Items Management

### List User Items

Returns a paginated list of items submitted by the authenticated user.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/client/items` |
| **Auth** | Session (user) |
| **Source** | `client/items/route.ts` |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | `integer` | No | `1` | Page number (min: 1) |
| `limit` | `integer` | No | `10` | Items per page (1-100) |
| `status` | `string` | No | -- | Filter: `all`, `pending`, `approved`, `rejected` |
| `search` | `string` | No | -- | Search by item name or description |
| `sortBy` | `string` | No | -- | Sort field |
| `sortOrder` | `string` | No | -- | Sort direction |
| `deleted` | `boolean` | No | `false` | If `true`, returns soft-deleted items |

#### Response

**Status 200**

```json
{
  "success": true,
  "items": [ /* item objects */ ],
  "total": 23,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "stats": {
    "total": 20,
    "pending": 3,
    "approved": 15,
    "rejected": 2,
    "deleted": 1
  }
}
```

#### curl Example

```bash
# List approved items, page 2
curl -s "http://localhost:3000/api/client/items?status=approved&page=2&limit=10" \
  -H "Cookie: next-auth.session-token=<session_token>"

# Search for items
curl -s "http://localhost:3000/api/client/items?search=productivity" \
  -H "Cookie: next-auth.session-token=<session_token>"

# List deleted items
curl -s "http://localhost:3000/api/client/items?deleted=true" \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### 创建项目

创建一个新的项目提交。该项目设置为 `pending` 状态以供管理员审核。

|财产|价值|
|----------|-------|
|**方法**|`POST`|
|**路径**|`/api/client/items`|
|**授权**|会话（用户）|
|**来源**|`client/items/route.ts`|

#### 请求正文

```json
{
  "name": "Awesome Tool",
  "description": "A great productivity tool that helps teams collaborate.",
  "source_url": "https://example.com",
  "category": "Productivity",
  "tags": ["collaboration", "remote-work"],
  "icon_url": "https://example.com/icon.png"
}
```

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`name`|`string`|是的|商品名称（3-100个字符）|
|`description`|`string`|是的|物品描述（10-500 个字符）|
|`source_url`|`string`（URI）|是的|该项目的主要 URL/链接|
|`category`|`字符串\|字符串[]`|否|类别名称或类别数组|
|`tags`|`string[]`|否|标签字符串数组|
|`icon_url`|`string`（URI）|否|项目图标的 URL|

#### 回应

**状态 201**

```json
{
  "success": true,
  "item": { /* created item object */ },
  "message": "Item submitted successfully. It will be reviewed by our team before being published."
}
```

**状态 400** -- 验证错误

```json
{
  "success": false,
  "error": "Name must be at least 3 characters"
}
```

#### 卷曲示例

```bash
curl -s -X POST http://localhost:3000/api/client/items \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{
    "name": "Awesome Tool",
    "description": "A great productivity tool that helps teams collaborate effectively.",
    "source_url": "https://example.com",
    "category": "Productivity",
    "tags": ["collaboration"]
  }'
```

---

### Get Single Item

Returns details of a specific item owned by the authenticated user.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/client/items/{id}` |
| **Auth** | Session (user, owner) |
| **Source** | `client/items/[id]/route.ts` |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Item ID |

#### Response

**Status 200**

```json
{
  "success": true,
  "item": { /* item object */ },
  "engagement": {
    "views": 150,
    "likes": 23
  }
}
```

| Status | Description |
|--------|-------------|
| 400 | Invalid item ID |
| 401 | Unauthorized |
| 403 | Not the item owner |
| 404 | Item not found |

---

### 更新项目

更新经过身份验证的用户拥有的项目。如果该项目之前已获得批准，则更新它会将其状态更改为 `pending` 以重新审核。

|财产|价值|
|----------|-------|
|**方法**|`PUT`|
|**路径**|`/api/client/items/{id}`|
|**授权**|会话（用户、所有者）|
|**来源**|`client/items/[id]/route.ts`|

#### 请求正文

所有字段都是可选的。必须至少提供一个字段。

```json
{
  "name": "Updated Tool Name",
  "description": "Updated description with more details.",
  "source_url": "https://example.com/v2",
  "category": ["Productivity", "Developer Tools"],
  "tags": ["collaboration", "ai"],
  "icon_url": "https://example.com/new-icon.png"
}
```

#### 回应

**状态 200**

```json
{
  "success": true,
  "item": { /* updated item object */ },
  "statusChanged": true,
  "previousStatus": "approved",
  "message": "Item updated successfully. Since it was previously approved, it has been moved to pending for re-review."
}
```

|领域|类型|描述|
|-------|------|-------------|
|`statusChanged`|`boolean`|`true` 如果状态从已批准更改为待处理|
|`previousStatus`|`string`|更新前的项目状态|

#### 卷曲示例

```bash
curl -s -X PUT http://localhost:3000/api/client/items/item_123 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "name": "Updated Tool Name" }'
```

---

### Delete Item (Soft Delete)

Soft-deletes an item owned by the authenticated user. The item is hidden but can be restored later.

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/client/items/{id}` |
| **Auth** | Session (user, owner) |
| **Source** | `client/items/[id]/route.ts` |

#### Response

**Status 200**

```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

| Status | Description |
|--------|-------------|
| 400 | Item is already deleted |
| 401 | Unauthorized |
| 403 | Not the item owner |
| 404 | Item not found |

---

### 恢复项目

恢复以前软删除的项目。

|财产|价值|
|----------|-------|
|**方法**|`POST`|
|**路径**|`/api/client/items/{id}/restore`|
|**授权**|会话（用户、所有者）|
|**来源**|`client/items/[id]/restore/route.ts`|

#### 回应

**状态 200**

```json
{
  "success": true,
  "item": { /* restored item object */ },
  "message": "Item restored successfully"
}
```

|状态|描述|
|--------|-------------|
| 400 |项目未删除（无法恢复活动项目）|
| 401 |未经授权|
| 403 |不是物品所有者|
| 404 |未找到项目|

#### 卷曲示例

```bash
curl -s -X POST http://localhost:3000/api/client/items/item_123/restore \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Get Submission Statistics

Returns statistics about the authenticated user's submissions grouped by status.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/client/items/stats` |
| **Auth** | Session (user) |
| **Source** | `client/items/stats/route.ts` |

#### Response

**Status 200**

```json
{
  "success": true,
  "stats": {
    "total": 12,
    "draft": 2,
    "pending": 3,
    "approved": 5,
    "rejected": 2,
    "deleted": 1
  }
}
```

#### curl Example

```bash
curl -s http://localhost:3000/api/client/items/stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## TypeScript 用法

```typescript
import type { ClientCreateItemResponse } from '@/lib/types/client-item';

// Fetch dashboard stats
const dashboardRes = await fetch('/api/client/dashboard/stats');
const dashboard = await dashboardRes.json();

// Create a new item submission
const createRes = await fetch('/api/client/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My New Tool',
    description: 'A detailed description of what this tool does.',
    source_url: 'https://mytool.com',
    category: 'Productivity',
  }),
});
const created: ClientCreateItemResponse = await createRes.json();

// Update an item
const updateRes = await fetch(`/api/client/items/${itemId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Updated Name' }),
});
const updated = await updateRes.json();
if (updated.statusChanged) {
  console.log('Item moved back to pending for re-review');
}
```

## 错误响应模式

所有客户端 API 端点都遵循一致的错误形状：

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

错误响应使用 `serverErrorResponse()` 实用程序，该实用程序在服务器端记录详细的错误信息，同时仅向客户端返回通用消息以防止信息泄露。
