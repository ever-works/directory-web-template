---
id: collections-api-endpoints
title: 集合 API 端点
sidebar_label: 集合API
sidebar_position: 57
---

# 集合 API 端点

Collections API 提供了一个公共端点来检查数据库中是否存在任何活动集合。集合是通过管理面板管理的项目的策划分组，并通过集合存储库存储在数据库中。

**来源：** `template/app/api/collections/exists/route.ts`

---

## Check Collections Existence

Checks if there are any active collections available in the system.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/collections/exists` |
| **Auth** | None (public) |

### Query Parameters

None.

### Response

**Status 200** -- Collections existence checked successfully.

```json
{
  "exists": true,
  "count": 5
}
```

| Field | Type | Description |
|-------|------|-------------|
| `exists` | `boolean` | Whether any active collections exist |
| `count` | `number` | Number of active collections |

### Error Response

**Status 500** -- Internal server error.

```json
{
  "exists": false,
  "count": 0,
  "error": "Failed to check collections existence"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `exists` | `boolean` | Always `false` on error |
| `count` | `number` | Always `0` on error |
| `error` | `string` | Generic error message (detailed errors are logged server-side only) |

### curl Example

```bash
# Check if active collections exist
curl -s http://localhost:3000/api/collections/exists
```

### TypeScript Usage

```typescript
interface CollectionsExistResponse {
  exists: boolean;
  count: number;
  error?: string;
}

async function checkCollectionsExist(): Promise<CollectionsExistResponse> {
  const res = await fetch('/api/collections/exists');
  return res.json();
}

// Usage
const { exists, count } = await checkCollectionsExist();
if (exists) {
  console.log(`Found ${count} active collections`);
} else {
  console.log('No collections available');
}
```

### Implementation Notes

- Collections are fetched from the database via `collectionRepository.findAll()` with `includeInactive: false`, meaning only active collections are counted.
- Unlike the categories endpoint, this endpoint returns a proper `500` status on error rather than silently returning safe defaults.
- The error response includes a generic `error` field -- detailed error information is logged server-side to avoid information disclosure.
- This endpoint is used by the frontend to conditionally render the collections navigation section.
