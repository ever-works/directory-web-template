---
id: featured-items-endpoints
title: "特色项目 API 端点"
sidebar_label: "特色商品"
sidebar_position: 18
---

# 特色项目 API 端点

特色项目 API 提供了一个公共端点，用于检索已突出显示以在网站上突出显示的项目。特色项目支持订购、到期日期和活动/非活动状态。

**源文件：** `template/app/api/featured-items/route.ts`

## 端点摘要

|方法|路径|授权|描述|
|--------|------|------|-------------|
|获取|`/api/featured-items`|无|获取活跃的特色项目以供公开展示|

---

## GET `/api/featured-items`

Returns a list of active featured items for public display. Automatically filters out inactive items and optionally excludes expired items based on their `featuredUntil` date. Items are sorted by featured order (descending) and featured date (descending) for optimal presentation.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 6 | Maximum items to return (1-50) |
| `includeExpired` | boolean | No | `false` | Whether to include items past their `featuredUntil` date |

### Database Requirement

The endpoint checks database availability before processing. If the database is not configured, the `checkDatabaseAvailability()` check returns an appropriate error response.

### How It Works

The query builds conditions dynamically based on parameters:

```ts
// Always filter for active items
const conditions = [eq(featuredItems.isActive, true)];

// Optionally exclude expired items
if (!includeExpired) {
  const currentDate = new Date();
  const expirationCondition = or(
    isNull(featuredItems.featuredUntil),
    gte(featuredItems.featuredUntil, currentDate)
  );
  conditions.push(expirationCondition);
}

const featuredItemsList = await db
  .select()
  .from(featuredItems)
  .where(and(...conditions))
  .orderBy(
    desc(featuredItems.featuredOrder),
    desc(featuredItems.featuredAt)
  )
  .limit(limit);
```

### Sorting Logic

Items are sorted by two fields in descending order:

1. **`featuredOrder`** -- Higher values appear first (admin-controlled priority)
2. **`featuredAt`** -- More recently featured items appear first (tiebreaker)

### Response Shape

#### 200 -- Featured Items Retrieved

```json
{
  "success": true,
  "data": [
    {
      "id": "featured_123abc",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemDescription": "Boost your productivity with this amazing tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemImageUrl": "https://example.com/featured/tool-banner.jpg",
      "featuredOrder": 10,
      "isActive": true,
      "featuredAt": "2024-01-20T10:30:00.000Z",
      "featuredUntil": "2024-02-20T10:30:00.000Z",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    },
    {
      "id": "featured_456def",
      "itemSlug": "great-design-app",
      "itemName": "Great Design App",
      "itemDescription": "Create stunning designs effortlessly",
      "itemIconUrl": "https://example.com/icons/design.png",
      "itemImageUrl": "https://example.com/featured/design-banner.jpg",
      "featuredOrder": 8,
      "isActive": true,
      "featuredAt": "2024-01-19T15:20:00.000Z",
      "featuredUntil": null,
      "createdAt": "2024-01-19T15:20:00.000Z",
      "updatedAt": "2024-01-19T15:20:00.000Z"
    }
  ],
  "count": 2
}
```

#### 200 -- No Featured Items

```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

#### 500 -- Server Error

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### Data Model

Each featured item record contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique featured item record ID |
| `itemSlug` | string | Slug of the featured item |
| `itemName` | string | Display name |
| `itemDescription` | string (nullable) | Description for featured display |
| `itemIconUrl` | string (nullable) | Item icon URL |
| `itemImageUrl` | string (nullable) | Featured banner image URL |
| `featuredOrder` | integer | Display priority (higher = more prominent) |
| `isActive` | boolean | Whether currently featured |
| `featuredAt` | datetime | When the item was featured |
| `featuredUntil` | datetime (nullable) | Expiration date (null means no expiration) |
| `createdAt` | datetime | Record creation timestamp |
| `updatedAt` | datetime (nullable) | Last update timestamp |

### Expiration Behavior

- Items with `featuredUntil: null` never expire and are always included.
- Items with a `featuredUntil` date in the past are excluded by default.
- Setting `includeExpired=true` bypasses expiration filtering (useful for admin views).

### Usage Example

```ts
// Fetch top 3 featured items for homepage hero section
const res = await fetch('/api/featured-items?limit=3');
const { data, count } = await res.json();

if (count > 0) {
  data.forEach(item => {
    console.log(`Featured: ${item.itemName} (order: ${item.featuredOrder})`);
  });
}
```

### Notes

- Errors are only logged in development mode (`NODE_ENV === 'development'`).
- This is a **public endpoint** -- no authentication is required.
- Featured items are managed by admins through the admin panel (see Admin Endpoints).

---

## 相关源文件

|文件|目的|
|------|---------|
|`template/app/api/featured-items/route.ts`|公共特色项目端点|
|`template/lib/db/schema.ts`|`featuredItems` 表定义|
|`template/lib/utils/database-check.ts`|数据库可用性检查|
