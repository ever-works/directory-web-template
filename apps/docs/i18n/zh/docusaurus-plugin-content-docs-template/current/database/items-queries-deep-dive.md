---
id: items-queries-deep-dive
title: 项目查询深入探讨
sidebar_label: 项目查询深入探讨
sidebar_position: 60
---

# 项目查询深入探讨

所有与项目相关的数据库查询功能的综合参考，包括项目识别、slug 规范化、视图跟踪和视图聚合。

## 概述

项目查询层分为两个模块：

- **`item.queries.ts`** -- 物品识别和 slug 标准化实用程序
- **`item-view.queries.ts`** -- 通过每日重复数据删除和聚合进行项目视图跟踪

Ever Works 模板中的项目作为 YAML 文件存储在基于 Git 的 CMS 存储库中。数据库存储由项目段而不是项目内容本身键入的**参与数据**（投票、评论、视图、收藏夹）。

## 源文件

```
lib/db/queries/item.queries.ts
lib/db/queries/item-view.queries.ts
```

---

## Function Reference: item.queries.ts

### `normalizeItemSlug`

Normalizes an item slug to ensure consistency across the system.

```typescript
function normalizeItemSlug(slug: string): string
```

**Parameters:**

| Parameter | Type     | Required | Description          |
|-----------|----------|----------|----------------------|
| `slug`    | `string` | Yes      | Raw slug input       |

**Returns:** `string` -- Normalized slug (lowercase, trimmed)

**Throws:**
- `Error` if slug is falsy, not a string, empty after trimming, or contains invalid characters

**Validation Rules:**
- Must be a non-empty string
- After normalization: lowercase and trimmed
- Must match regex `/^[a-zA-Z0-9_-]+$/` (alphanumeric, hyphens, underscores only)

**Usage Example:**

```typescript
import { normalizeItemSlug } from '@/lib/db/queries';

const slug = normalizeItemSlug('My-Cool-Tool');
// Returns: 'my-cool-tool'

normalizeItemSlug(''); // Throws Error
normalizeItemSlug('invalid slug!'); // Throws Error
```

---

### `getItemIdFromSlug`

将项目 slug 映射到 itemId 以进行数据库操作。在这个系统中，itemId 是标准化的 slug。

```typescript
function getItemIdFromSlug(slug: string): string
```

**参数：**

|参数|类型|必填|描述|
|-----------|----------|----------|-------------|
|`slug`|`string`|是的|物品子弹|

**返回：** `string` -- 规范化的 slug 作为 itemId

**SQL 模式：** 无数据库查询——委托给`normalizeItemSlug`。

---

### `validateItemExists`

Validates if a slug exists in the content system. Currently a placeholder that validates slug format only.

```typescript
async function validateItemExists(slug: string): Promise<boolean>
```

**Parameters:**

| Parameter | Type     | Required | Description            |
|-----------|----------|----------|------------------------|
| `slug`    | `string` | Yes      | Item slug to validate  |

**Returns:** `Promise<boolean>` -- `true` if slug format is valid, `false` otherwise

**Note:** This function currently only validates format. It does not check against the actual Git-based content system.

---

## 函数参考：item-view.queries.ts

### `recordItemView`

记录每日重复数据删除的项目视图。使用 `ON CONFLICT DO NOTHING` 以静默方式忽略同一项目、查看器和 UTC 日期的重复视图。

```typescript
async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean>
```

**参数：**

|参数|类型|必填|描述|
|---------------------|----------|----------|------------------------------------|
|`view.itemId`|`string`|是的|物品子弹|
|`view.viewerId`|`string`|是的|查看者标识符（用户/匿名）|
|`view.viewedDateUtc`|`string`|是的|UTC 日期字符串 (YYYY-MM-DD)|

**返回：** `Promise<boolean>` -- `true`（如果录制了新视图），`false`（如果是重复视图）

**SQL 模式：**

```sql
INSERT INTO item_views (item_id, viewer_id, viewed_date_utc)
VALUES (?, ?, ?)
ON CONFLICT DO NOTHING
RETURNING id;
```

**性能说明：**
- 使用 `ON CONFLICT DO NOTHING` 进行幂等插入
- `(itemId, viewerId, viewedDateUtc)` 的唯一约束确保每日重复数据删除
- 无需往返检查重复项

---

### `getTotalViewsCount`

Gets the total view count for a set of items.

```typescript
async function getTotalViewsCount(itemSlugs: string[]): Promise<number>
```

**Parameters:**

| Parameter   | Type       | Required | Description               |
|-------------|------------|----------|---------------------------|
| `itemSlugs` | `string[]` | Yes      | Array of item slugs       |

**Returns:** `Promise<number>` -- Total view count across all specified items

**SQL Pattern:**

```sql
SELECT count(*) FROM item_views WHERE item_id IN (...);
```

**Edge Case:** Returns `0` if `itemSlugs` is empty (no DB query executed).

---

### `getRecentViewsCount`

获取过去 N 天内项目的查看次数。

```typescript
async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number>
```

**参数：**

|参数|类型|必填|默认|描述|
|-------------|------------|----------|---------|--------------------------|
|`itemSlugs`|`string[]`|是的| --      |物品块数组|
|`days`|`number`|否| `7`     |回顾天数|

**返回：** `Promise<number>` -- 期间的查看计数

**SQL 模式：**

```sql
SELECT count(*) FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?;
```

**性能说明：**
- 使用 UTC 日期字符串进行与时区无关的过滤
- 当 `viewedDateUtc` 列被索引时高效

---

### `getDailyViewsData`

Returns a Map of daily view counts keyed by date string (YYYY-MM-DD) for the last N days.

```typescript
async function getDailyViewsData(
  itemSlugs: string[],
  days: number = 7
): Promise<Map<string, number>>
```

**Parameters:**

| Parameter   | Type       | Required | Default | Description              |
|-------------|------------|----------|---------|--------------------------|
| `itemSlugs` | `string[]` | Yes      | --      | Array of item slugs      |
| `days`      | `number`   | No       | `7`     | Number of days to look back |

**Returns:** `Promise<Map<string, number>>` -- Map of `YYYY-MM-DD` date string to view count

**SQL Pattern:**

```sql
SELECT viewed_date_utc, count(*)
FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?
GROUP BY viewed_date_utc;
```

---

### `getViewsPerItem`

获取顶部项目显示的每个项目的查看计数。

```typescript
async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**参数：**

|参数|类型|必填|描述|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|是的|物品块数组|

**返回：** `Promise<Map<string, number>>` -- 项目 slug 的地图以查看计数

**SQL 模式：**

```sql
SELECT item_id, count(*) FROM item_views
WHERE item_id IN (...)
GROUP BY item_id;
```

---

## Helper Functions (Internal)

### `getUtcDateString`

Internal helper that returns a UTC date string for N days ago. Uses UTC methods to avoid timezone-related off-by-one errors.

```typescript
function getUtcDateString(daysAgo: number = 0): string
// Returns: 'YYYY-MM-DD' format
```

---

## 性能说明

1. **空数组防护** -- 当传递空 `itemSlugs` 数组时，所有聚合函数立即返回零/空结果，避免不必要的数据库查询。

2. **每日重复数据删除** -- `recordItemView` 使用唯一约束，`ON CONFLICT DO NOTHING` 可以实现高效、无锁的重复数据删除，无需预先检查。

3. **基于 UTC 的日期** -- 查看日期过滤使用 UTC 日期字符串 (`YYYY-MM-DD`)，确保跨服务器时区的行为一致。

4. **Slug 标准化** - `getItemIdFromSlug` 在整个参与层（投票、评论）中调用，以确保一致的项目标识。

## 使用示例

### 记录页面视图

```typescript
import { recordItemView } from '@/lib/db/queries';

const isNew = await recordItemView({
  itemId: 'clockify',
  viewerId: 'user-123',
  viewedDateUtc: '2025-06-15',
});

if (isNew) {
  console.log('New unique view recorded');
}
```

### 构建仪表板视图图表

```typescript
import { getDailyViewsData, getViewsPerItem } from '@/lib/db/queries';

const itemSlugs = ['clockify', 'toggl', 'harvest'];

// Daily trend data
const dailyViews = await getDailyViewsData(itemSlugs, 14);

// Per-item breakdown
const perItemViews = await getViewsPerItem(itemSlugs);
```
