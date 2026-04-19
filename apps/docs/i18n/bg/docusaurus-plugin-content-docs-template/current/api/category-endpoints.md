---
id: category-endpoints
title: "Крайни точки на API за категория"
sidebar_label: "Категории"
sidebar_position: 10
---

# Крайни точки на API за категория

API за категории предоставя лека публична крайна точка за проверка дали категориите съществуват в системата. Категориите се извличат от слоя със съдържание (базиран на Git CMS), а не от база данни, което прави тази крайна точка достъпна дори без връзка с база данни.

**Изходен файл:** `template/app/api/categories/exists/route.ts`

## Крайна точка Резюме

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|ВЗЕМЕТЕ|`/api/categories/exists`|Няма|Проверете дали съществуват категории|

---

## GET `/api/categories/exists`

Checks whether any categories are available in the content repository. Returns a boolean `exists` flag along with the total count. This endpoint is useful for conditional UI rendering -- for example, hiding a category filter when no categories are defined.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `locale` | string | No | `"en"` | Locale code for fetching localized categories |

### How It Works

The handler calls `fetchItems` from the content layer with the requested locale, then inspects the returned `categories` array:

```ts
const locale = request?.nextUrl?.searchParams?.get('locale') || 'en';
const { categories } = await fetchItems({ lang: locale });

const hasCategories = Array.isArray(categories) && categories.length > 0;

return NextResponse.json({
  exists: hasCategories,
  count: categories?.length || 0
});
```

### Response Shape

#### 200 -- Categories Found

```json
{
  "exists": true,
  "count": 12
}
```

#### 200 -- No Categories

```json
{
  "exists": false,
  "count": 0
}
```

#### Error Handling

On any error the endpoint returns a safe fallback rather than a 500. This ensures that consumers can always rely on the response shape:

```json
{
  "exists": false,
  "count": 0
}
```

Errors are only logged in development mode (`NODE_ENV === 'development'`).

### Authentication

This is a **public endpoint** -- no authentication is required.

### Usage Example

```ts
// Check if categories exist before rendering filter UI
const res = await fetch('/api/categories/exists?locale=fr');
const { exists, count } = await res.json();

if (exists) {
  console.log(`Found ${count} categories`);
  // Render category filter
}
```

### Notes

- Categories come from the Git-based CMS content layer, not the database.
- The endpoint is locale-aware, so different locales may have different category counts.
- Errors are silently handled to avoid breaking the UI -- the endpoint always returns valid JSON.
- No caching headers are set by the handler; caching is managed at the infrastructure level.

### Related Source Files

| File | Purpose |
|------|---------|
| `template/app/api/categories/exists/route.ts` | Route handler |
| `template/lib/content.ts` | `fetchItems` function that resolves categories |
