---
id: category-endpoints
title: "类别 API 端点"
sidebar_label: "类别"
sidebar_position: 10
---

# 类别 API 端点

类别 API 提供了一个轻量级公共端点，用于检查系统中是否存在类别。类别源自内容层（基于 Git 的 CMS）而不是数据库，因此即使没有数据库连接，该端点也可用。

**源文件：** `template/app/api/categories/exists/route.ts`

## 端点摘要

|方法|路径|授权|描述|
|--------|------|------|-------------|
|获取|`/api/categories/exists`|无|检查类别是否存在|

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
