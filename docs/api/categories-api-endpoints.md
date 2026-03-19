---
id: categories-api-endpoints
title: Categories API Endpoints
sidebar_label: Categories API
sidebar_position: 56
---

# Categories API Endpoints

The Categories API provides a public endpoint to check whether any categories exist in the content system. Categories are sourced from the Git-based CMS content repository and represent the top-level taxonomy for organizing items.

**Source:** `template/app/api/categories/exists/route.ts`

---

## Check Categories Existence

Checks whether any categories are available in the system and returns the count.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/categories/exists` |
| **Auth** | None (public) |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `locale` | `string` | No | `"en"` | Locale code for fetching categories (e.g., `en`, `fr`, `de`) |

### Response

**Status 200** -- Categories existence checked successfully.

```json
{
  "exists": true,
  "count": 12
}
```

| Field | Type | Description |
|-------|------|-------------|
| `exists` | `boolean` | Whether any categories exist |
| `count` | `number` | Number of categories found |

### Error Handling

On any error, the endpoint returns a `200` response with safe defaults rather than an error status code:

```json
{
  "exists": false,
  "count": 0
}
```

This fail-safe behavior ensures that the UI can degrade gracefully when the content system is unavailable.

### curl Example

```bash
# Check if categories exist (default locale)
curl -s http://localhost:3000/api/categories/exists

# Check categories for French locale
curl -s http://localhost:3000/api/categories/exists?locale=fr
```

### TypeScript Usage

```typescript
interface CategoriesExistResponse {
  exists: boolean;
  count: number;
}

async function checkCategoriesExist(locale: string = 'en'): Promise<CategoriesExistResponse> {
  const res = await fetch(`/api/categories/exists?locale=${locale}`);
  return res.json();
}

// Usage
const { exists, count } = await checkCategoriesExist('en');
if (exists) {
  console.log(`Found ${count} categories`);
}
```

### Implementation Notes

- Categories are fetched from the Git-based CMS via `fetchItems()` from `@/lib/content`.
- The endpoint does not require authentication -- it is designed for use by the public-facing UI to conditionally render category navigation elements.
- Errors are only logged in development mode (`NODE_ENV === 'development'`).
- The `locale` parameter maps to the `lang` option in the content fetch layer.
