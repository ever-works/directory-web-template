---
id: collection-endpoints
title: "集合 API 端点"
sidebar_label: "收藏"
sidebar_position: 11
---

# 集合 API 端点

Collections API 提供了一个公共端点来检查系统中是否存在活动集合。集合存储在数据库中并通过集合存储库层进行管理。

**源文件：** `template/app/api/collections/exists/route.ts`

## 端点摘要

|方法|路径|授权|描述|
|--------|------|------|-------------|
|获取|`/api/collections/exists`|无|检查活动集合是否存在|

---

## GET `/api/collections/exists`

Checks whether any active collections are available. Returns a boolean `exists` flag along with the count of active collections. This is a public endpoint primarily used by the frontend to decide whether to render collection-related UI elements.

### Query Parameters

None.

### How It Works

The handler uses the `collectionRepository` to fetch all active collections, then checks if the result is a non-empty array:

```ts
const collections = await collectionRepository.findAll({
  includeInactive: false
});

const hasCollections =
  Array.isArray(collections) && collections.length > 0;

return NextResponse.json({
  exists: hasCollections,
  count: collections?.length || 0
});
```

### Response Shape

#### 200 -- Collections Found

```json
{
  "exists": true,
  "count": 5
}
```

#### 200 -- No Collections

```json
{
  "exists": false,
  "count": 0
}
```

#### 500 -- Server Error

On failure, the endpoint returns a 500 status with a generic error message. Detailed error information is logged server-side only:

```json
{
  "exists": false,
  "count": 0,
  "error": "Failed to check collections existence"
}
```

### Authentication

This is a **public endpoint** -- no authentication is required.

### Usage Example

```ts
// Check if collections exist before rendering collection section
const res = await fetch('/api/collections/exists');
const data = await res.json();

if (data.exists) {
  console.log(`${data.count} active collections available`);
  // Render collection navigation
}
```

### Differences from Categories Endpoint

| Aspect | Categories | Collections |
|--------|-----------|-------------|
| Data source | Git-based CMS content | Database via repository layer |
| Error behavior | Returns 200 with `exists: false` | Returns 500 with error message |
| Filter support | Locale parameter | Active-only filter (hardcoded) |
| Requires database | No | Yes |

### Notes

- Only **active** collections are counted. Inactive collections are excluded by the `includeInactive: false` filter.
- Detailed errors are logged server-side and never exposed to the client (to avoid information disclosure).
- The endpoint requires a working database connection since collections are database-backed.

### Related Source Files

| File | Purpose |
|------|---------|
| `template/app/api/collections/exists/route.ts` | Route handler |
| `template/lib/repositories/collection.repository.ts` | Collection data access layer |
