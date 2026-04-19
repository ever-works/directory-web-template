---
id: collections-api-endpoints
title: נקודות קצה של API של אוספים
sidebar_label: API של אוספים
sidebar_position: 57
---

# נקודות קצה של API של אוספים

ה-API של Collections מספק נקודת קצה ציבורית כדי לבדוק אם קיימים אוספים פעילים במסד הנתונים. אוספים הם קבוצות אצרות של פריטים המנוהלות דרך פאנל הניהול ומאוחסנות במסד הנתונים דרך מאגר האוסף.

**מקור:** `template/app/api/collections/exists/route.ts`

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
