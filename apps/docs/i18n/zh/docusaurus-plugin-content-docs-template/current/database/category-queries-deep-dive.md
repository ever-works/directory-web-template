---
id: category-queries-deep-dive
title: 类别和位置索引查询深入探讨
sidebar_label: 类别查询深入探讨
sidebar_position: 66
---

# 类别和位置索引查询深入探讨

所有位置索引和项目审核查询功能的综合参考，包括地理空间查找、边界框查询、批量索引、审核日志记录和项目历史跟踪。

## 概述

类别/位置查询层管理两个相关的索引系统：

- **`location-index.queries.ts`** -- 用于快速基于位置的项目查询（城市、国家、边界框、远程项目）的地理空间索引，具有批量更新插入和元数据跟踪
- **`item-audit.queries.ts`** -- 项目审核跟踪，用于跟踪项目的所有更改、状态转换和管理操作

位置索引表充当快速地理查询的**二级索引**。项目位置数据的真实来源保留在基于 Git 的 CMS 中的 YAML 文件中。

## 源文件

```
lib/db/queries/location-index.queries.ts
lib/db/queries/item-audit.queries.ts
```

---

## Function Reference: location-index.queries.ts

### Types

```typescript
interface UpsertLocationIndexParams {
  itemSlug: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  serviceArea?: string | null;
  isRemote?: boolean;
}

interface LocationQueryParams {
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  city?: string;
  country?: string;
  isRemote?: boolean;
  limit?: number;
  offset?: number;
}

interface LocationIndexStats {
  totalIndexed: number;
  lastIndexedAt: Date | null;
  lastRebuildAt?: Date | null;
  citiesCount: number;
  countriesCount: number;
  remoteCount: number;
}
```

### Write Operations

#### `upsertLocationIndex`

Creates or updates a location index entry. Uses `ON CONFLICT DO UPDATE` on `itemSlug` for idempotent upserts.

```typescript
async function upsertLocationIndex(
  params: UpsertLocationIndexParams
): Promise<ItemLocationIndex>
```

**SQL Pattern:**

```sql
INSERT INTO item_location_index (item_slug, latitude, longitude, ...)
VALUES (?, ?, ?, ...)
ON CONFLICT (item_slug) DO UPDATE SET
  latitude = ?, longitude = ?, ...
RETURNING *;
```

**Normalization:** City and country values are stored in both original and normalized (lowercased, trimmed) forms. The normalized columns are indexed for fast case-insensitive queries.

---

#### `batchUpsertLocationIndex`

批量更新插入 100 个块中的多个位置条目，以避免查询大小限制。

```typescript
async function batchUpsertLocationIndex(
  entries: UpsertLocationIndexParams[]
): Promise<number>
```

**参数：**

|参数|类型|必填|描述|
|-----------|--------------------------------|----------|------------------------|
|`entries`|`UpsertLocationIndexParams[]`|是的|位置数据数组|

**返回：** `number` -- 处理的条目数

**SQL 模式：** 使用`excluded.*` 语法进行批量更新插入：

```sql
INSERT INTO item_location_index (...)
VALUES (...), (...), (...)
ON CONFLICT (item_slug) DO UPDATE SET
  latitude = excluded.latitude,
  longitude = excluded.longitude, ...;
```

**性能说明：**
- 以 100 个为一组进行处理，以保持在 PostgreSQL 查询大小限制之内
- 使用 `excluded.*` 引用来高效解决批量冲突
- 将`indexedAt` 设置为每个条目的当前时间戳

---

#### `removeFromLocationIndex`

Removes a single item from the location index.

```typescript
async function removeFromLocationIndex(itemSlug: string): Promise<boolean>
```

---

#### `batchRemoveFromLocationIndex`

从位置索引中删除多个项目。

```typescript
async function batchRemoveFromLocationIndex(
  itemSlugs: string[]
): Promise<number>
```

---

#### `clearLocationIndex`

Clears the entire location index. Used during full rebuilds.

```typescript
async function clearLocationIndex(): Promise<number>
```

**Returns:** Number of entries deleted.

---

### 读操作

#### `getLocationBySlug`

通过 item slug 获取位置条目。

```typescript
async function getLocationBySlug(
  itemSlug: string
): Promise<ItemLocationIndex | null>
```

---

#### `getLocationsBySlugs`

Gets location entries for multiple items.

```typescript
async function getLocationsBySlugs(
  itemSlugs: string[]
): Promise<ItemLocationIndex[]>
```

---

#### `queryByBoundingBox`

查询地理边界框中的项目。对于精确距离计算之前的初始半径过滤很有用。

```typescript
async function queryByBoundingBox(
  params: LocationQueryParams
): Promise<ItemLocationIndex[]>
```

**参数：**

|参数|类型|必填|描述|
|--------------|----------|----------|----------------------------|
|`minLat`|`number`|否|最小纬度|
|`maxLat`|`number`|否|最大纬度|
|`minLng`|`number`|否|最小经度|
|`maxLng`|`number`|否|最大经度|
|`limit`|`number`|否|最大结果|
|`offset`|`number`|否|分页偏移量|

**SQL 模式：**

```sql
SELECT * FROM item_location_index
WHERE latitude >= ? AND latitude <= ?
  AND longitude >= ? AND longitude <= ?
LIMIT ? OFFSET ?;
```

---

#### `queryByCity`

Queries items by city name using the indexed normalized column.

```typescript
async function queryByCity(
  city: string,
  includeRemote: boolean = false
): Promise<string[]>
```

**Returns:** Array of item slugs matching the city

**SQL Pattern:**

```sql
SELECT item_slug FROM item_location_index
WHERE city_normalized = ?
  AND is_remote = false;
```

**Performance Notes:** Uses equality on the `city_normalized` indexed column (not `ILIKE`) for optimal query performance.

---

#### `queryByCountry`

使用索引标准化列按国家/地区名称查询项目。

```typescript
async function queryByCountry(
  country: string,
  includeRemote: boolean = false
): Promise<string[]>
```

---

#### `queryRemoteItems`

Queries all remote-only items.

```typescript
async function queryRemoteItems(): Promise<string[]>
```

---

#### `getAllIndexedSlugs`

获取所有索引项 slug。

```typescript
async function getAllIndexedSlugs(): Promise<string[]>
```

---

#### `getAllLocationEntries`

Gets all location entries (for distance calculations on the application layer).

```typescript
async function getAllLocationEntries(): Promise<ItemLocationIndex[]>
```

---

#### `getRemoteLocationEntries`

获取具有最少字段（slug、城市、国家/地区）的仅远程位置条目。针对半径查询进行了优化。

```typescript
async function getRemoteLocationEntries(): Promise<RemoteLocationEntry[]>
```

### 不同值查询

#### `getDistinctCities`

获取所有不同的城市名称，并按标准化形式消除重复。

```typescript
async function getDistinctCities(): Promise<string[]>
```

**SQL 模式：**

```sql
SELECT MIN(city) FROM item_location_index
WHERE city_normalized IS NOT NULL
GROUP BY city_normalized
ORDER BY MIN(city);
```

**设计说明：** 按标准化列分组，但返回原始的 `MIN()`（倾向于大写形式），提供干净的显示值。

---

#### `getDistinctCountries`

Gets all distinct country names, deduplicated by normalized form.

```typescript
async function getDistinctCountries(): Promise<string[]>
```

---

### 统计和元数据

#### `getLocationIndexStats`

获取有关位置索引的统计信息。

```typescript
async function getLocationIndexStats(): Promise<LocationIndexStats>
```

**返回：** `{ totalIndexed, lastIndexedAt, citiesCount, countriesCount, remoteCount }`

---

#### `updateLocationIndexMeta`

Updates the singleton metadata row after a rebuild. Uses upsert pattern.

```typescript
async function updateLocationIndexMeta(
  rebuildAt: Date,
  durationMs: number,
  itemCount: number
): Promise<void>
```

---

#### `getLocationIndexMeta`

获取位置索引元数据（上次重建时间、持续时间、项目计数）。

```typescript
async function getLocationIndexMeta(): Promise<LocationIndexMeta | null>
```

---

## Function Reference: item-audit.queries.ts

### Types

```typescript
type ItemAuditLogWithPerformer = ItemAuditLog & {
  performer: { id: string; email: string | null } | null;
};

interface CreateItemAuditLogParams {
  itemId: string;
  itemName: string;
  action: ItemAuditActionValues;
  previousStatus?: string | null;
  newStatus?: string | null;
  changes?: ItemAuditChanges | null;
  performedBy?: string | null;
  performedByName?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface PaginatedItemHistory {
  logs: ItemAuditLogWithPerformer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `createItemAuditLog`

Creates a new item audit log entry.

```typescript
async function createItemAuditLog(
  data: CreateItemAuditLogParams
): Promise<ItemAuditLog>
```

---

### `getItemHistory`

获取具有可选操作类型过滤的项目的分页审核历史记录。

```typescript
async function getItemHistory(params: {
  itemId: string;
  page?: number;
  limit?: number;
  actionFilter?: ItemAuditActionValues[];
}): Promise<PaginatedItemHistory>
```

**SQL 模式：**

```sql
SELECT item_audit_logs.*, users.id, users.email
FROM item_audit_logs
LEFT JOIN users ON item_audit_logs.performed_by = users.id
WHERE item_audit_logs.item_id = ?
  AND item_audit_logs.action IN (...)
ORDER BY item_audit_logs.created_at DESC
LIMIT ? OFFSET ?;
```

---

### `getLatestItemAuditLog`

Gets the most recent audit log for an item.

```typescript
async function getLatestItemAuditLog(
  itemId: string
): Promise<ItemAuditLog | null>
```

---

### `getAuditLogsByAction`

获取按操作类型过滤的审核日志。

```typescript
async function getAuditLogsByAction(
  action: ItemAuditActionValues,
  limit: number = 50
): Promise<ItemAuditLog[]>
```

---

### `getAuditLogsByPerformer`

Gets audit logs filtered by the user who performed the action.

```typescript
async function getAuditLogsByPerformer(
  performedBy: string,
  limit: number = 50
): Promise<ItemAuditLog[]>
```

---

### `getItemAuditStats`

获取项目的审核日志统计信息，按操作类型分组。

```typescript
async function getItemAuditStats(
  itemId: string
): Promise<Record<string, number>>
```

**SQL 模式：**

```sql
SELECT action, count(*) FROM item_audit_logs
WHERE item_id = ?
GROUP BY action;
```

---

## Performance Notes

1. **Normalized columns** -- Location queries use pre-normalized `city_normalized` and `country_normalized` columns with equality operators instead of `ILIKE`, providing index-friendly lookups.

2. **Batch processing** -- `batchUpsertLocationIndex` processes in chunks of 100 to avoid PostgreSQL query size limits while maintaining throughput.

3. **Singleton metadata** -- `updateLocationIndexMeta` uses upsert on a fixed `'singleton'` ID, avoiding race conditions during concurrent rebuilds.

4. **`excluded.*` references** -- Batch upserts use PostgreSQL's `excluded` pseudo-table for conflict resolution, avoiding the need to construct separate update values.

5. **LEFT JOIN for performers** -- Audit log queries use `LEFT JOIN` on users to handle cases where the performing user may have been deleted.

## Usage Examples

### Rebuilding the location index

```typescript
import {
  clearLocationIndex,
  batchUpsertLocationIndex,
  updateLocationIndexMeta,
} from '@/lib/db/queries';

const startTime = Date.now();

await clearLocationIndex();

const entries = items.map(item => ({
  itemSlug: item.slug,
  latitude: item.location.lat,
  longitude: item.location.lng,
  city: item.location.city,
  country: item.location.country,
  isRemote: item.isRemote,
}));

const processed = await batchUpsertLocationIndex(entries);

await updateLocationIndexMeta(new Date(), Date.now() - startTime, processed);
```

### Querying items near a location

```typescript
import { queryByBoundingBox } from '@/lib/db/queries';

// Find items within a bounding box around New York
const items = await queryByBoundingBox({
  minLat: 40.5,
  maxLat: 41.0,
  minLng: -74.3,
  maxLng: -73.7,
  limit: 50,
});
```

### Logging an item status change

```typescript
import { createItemAuditLog } from '@/lib/db/queries';

await createItemAuditLog({
  itemId: 'clockify',
  itemName: 'Clockify',
  action: 'status_change',
  previousStatus: 'draft',
  newStatus: 'published',
  performedBy: adminUserId,
  performedByName: 'Admin User',
  notes: 'Approved after review',
});
```
