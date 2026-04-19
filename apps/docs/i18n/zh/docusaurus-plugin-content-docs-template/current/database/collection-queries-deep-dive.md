---
id: collection-queries-deep-dive
title: 集合（公司）查询深入探究
sidebar_label: 集合查询深入探究
sidebar_position: 65
---

# 集合（公司）查询深入探究

所有公司/集合 CRUD 操作、项目-公司关联、搜索、分页和统计查询功能的综合参考。

## 概述

集合查询层管理公司及其与项目的关联：

- **`company.queries.ts`** -- 完整的公司 CRUD、分页搜索、项目-公司链接（1:1 关系）、统计数据以及按公司列出的项目

该系统中的公司代表所列项目背后的组织。每个项目最多可以属于一个公司（由 `itemSlug` 上的唯一约束强制执行）。

## 源文件

```
lib/db/queries/company.queries.ts
```

---

## Function Reference

### Company CRUD

#### `createCompany`

Creates a new company with normalized domain and slug fields.

```typescript
async function createCompany(data: {
  name: string;
  website?: string;
  domain?: string;
  slug?: string;
  status?: 'active' | 'inactive';
}): Promise<Company>
```

**Parameters:**

| Parameter | Type                         | Required | Default    | Description         |
|-----------|------------------------------|----------|------------|---------------------|
| `name`    | `string`                     | Yes      | --         | Company name        |
| `website` | `string`                     | No       | --         | Company website URL |
| `domain`  | `string`                     | No       | --         | Company domain      |
| `slug`    | `string`                     | No       | --         | URL-safe identifier |
| `status`  | `'active'` \| `'inactive'`   | No       | `'active'` | Company status      |

**Normalization:** `domain` and `slug` are automatically lowercased and trimmed. `name` is trimmed.

---

#### `getCompanyById`

```typescript
async function getCompanyById(id: string): Promise<Company | null>
```

---

#### `getCompanyBySlug`

Gets a company by slug using case-insensitive matching.

```typescript
async function getCompanyBySlug(slug: string): Promise<Company | null>
```

**SQL Pattern:**

```sql
SELECT * FROM companies WHERE lower(slug) = ? LIMIT 1;
```

---

#### `getCompanyByDomain`

使用不区分大小写的匹配按域获取公司。

```typescript
async function getCompanyByDomain(domain: string): Promise<Company | null>
```

---

#### `getCompanyByName`

Gets a company by exact name (case-insensitive).

```typescript
async function getCompanyByName(name: string): Promise<Company | null>
```

---

#### `updateCompany`

更新公司字段。标准化 `domain` 和 `slug`（如果提供）。

```typescript
async function updateCompany(
  id: string,
  data: Partial<Omit<NewCompany, 'id'>>
): Promise<Company | null>
```

**注意：** 从更新有效负载中删除 `undefined` 值，以避免用 null 覆盖字段。

---

#### `deleteCompany`

Permanently deletes a company.

```typescript
async function deleteCompany(id: string): Promise<boolean>
```

**Returns:** `true` if a record was deleted, `false` if company not found.

---

### 公司列表和搜索

#### `listCompanies`

列出具有分页、搜索、过滤和排序功能的公司。

```typescript
async function listCompanies(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  companies: Company[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  activeCount: number;
  inactiveCount: number;
}>
```

**搜索行为：** 在 `name` 和 `domain` 字段上使用 `ILIKE` 并进行适当的转义。

**附加数据：** 无论应用什么过滤器，都会返回全局 `activeCount` 和 `inactiveCount`。

---

#### `getCompaniesStats`

Gets company count statistics by status.

```typescript
async function getCompaniesStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

---

#### `getCompaniesWithItemCount`

列出公司及其关联的项目数，支持按项目数排序。

```typescript
async function getCompaniesWithItemCount(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  sortBy?: 'name' | 'createdAt' | 'itemCount';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  companies: (Company & { itemCount: number })[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}>
```

**SQL 模式：**

```sql
SELECT companies.*, count(items_companies.item_slug) as item_count
FROM companies
LEFT JOIN items_companies ON companies.id = items_companies.company_id
WHERE ...
GROUP BY companies.id
ORDER BY item_count DESC
LIMIT ? OFFSET ?;
```

---

### Item-Company Association

#### `linkItemToCompany`

Links an item to a company. Idempotent -- returns existing association if unchanged, updates if company changed, or creates new.

```typescript
async function linkItemToCompany(
  itemSlug: string,
  companyId: string
): Promise<{
  association: ItemCompany;
  created: boolean;
  updated: boolean;
}>
```

**Parameters:**

| Parameter   | Type     | Required | Description |
|-------------|----------|----------|-------------|
| `itemSlug`  | `string` | Yes      | Item slug (normalized to lowercase) |
| `companyId` | `string` | Yes      | Company ID  |

**Behavior:**
1. Validates company exists (throws if not)
2. Checks for existing association
3. If same company: returns existing (no-op), `created: false`, `updated: false`
4. If different company: updates association, `created: false`, `updated: true`
5. If no association: creates new, `created: true`, `updated: false`

**Error Handling:**
- Throws with friendly message if company does not exist
- Handles unique constraint violations gracefully
- Handles foreign key constraint errors

---

#### `assignCompanyToItem`

`linkItemToCompany` 的向后兼容别名。仅返回关联对象。

```typescript
async function assignCompanyToItem(
  itemSlug: string,
  companyId: string
): Promise<ItemCompany>
```

---

#### `updateItemCompany`

Updates an existing item-company association to point to a different company.

```typescript
async function updateItemCompany(
  itemSlug: string,
  companyId: string
): Promise<ItemCompany | null>
```

---

#### `unlinkItemFromCompany`

删除项目-公司关联。幂等——取消链接不存在的映射是无操作的。

```typescript
async function unlinkItemFromCompany(
  itemSlug: string
): Promise<{ success: boolean; deleted: boolean }>
```

**退货：**
- `success`：始终`true`（幂等）
- `deleted`：`true`（如果关联已实际删除）

---

#### `removeCompanyFromItem`

Backward-compatible alias for `unlinkItemFromCompany`. Returns `boolean`.

```typescript
async function removeCompanyFromItem(itemSlug: string): Promise<boolean>
```

---

#### `getCompanyByItemSlug`

获取与项目关联的公司。

```typescript
async function getCompanyByItemSlug(itemSlug: string): Promise<Company | null>
```

**SQL 模式：**

```sql
SELECT companies.* FROM items_companies
INNER JOIN companies ON items_companies.company_id = companies.id
WHERE items_companies.item_slug = ?
LIMIT 1;
```

---

#### `getCompanyForItem`

Backward-compatible alias for `getCompanyByItemSlug`.

---

#### `itemHasCompany`

检查项目是否已分配公司。

```typescript
async function itemHasCompany(itemSlug: string): Promise<boolean>
```

---

#### `listItemsByCompany`

Lists items associated with a company, with pagination.

```typescript
async function listItemsByCompany(
  companyId: string,
  params?: { page?: number; limit?: number }
): Promise<{
  items: ItemCompany[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}>
```

**Default limit:** 50 items per page.

---

#### `getItemsForCompany`

`listItemsByCompany` 的向后兼容别名。

---

## Performance Notes

1. **Case-insensitive lookups** -- `getCompanyBySlug`, `getCompanyByDomain`, and `getCompanyByName` use `lower()` SQL function for case-insensitive matching. For high-volume lookups, consider adding a functional index on `lower(slug)`.

2. **Idempotent operations** -- `linkItemToCompany` and `unlinkItemFromCompany` are designed for safe retry behavior, returning consistent results regardless of how many times they are called.

3. **Search escaping** -- All `ILIKE` search patterns properly escape SQL wildcards (`%`, `_`, `\`).

4. **LEFT JOIN for item counts** -- `getCompaniesWithItemCount` uses `LEFT JOIN` to include companies with zero items in results.

5. **Slug normalization** -- All item slug parameters are lowercased and trimmed before database operations.

## Usage Examples

### Assigning a company to an item

```typescript
import { linkItemToCompany, getCompanyByDomain } from '@/lib/db/queries';

const company = await getCompanyByDomain('toggl.com');
if (company) {
  const result = await linkItemToCompany('toggl-track', company.id);
  if (result.created) {
    console.log('New association created');
  } else if (result.updated) {
    console.log('Company updated for this item');
  }
}
```

### Listing companies with item counts

```typescript
import { getCompaniesWithItemCount } from '@/lib/db/queries';

const result = await getCompaniesWithItemCount({
  page: 1,
  limit: 20,
  sortBy: 'itemCount',
  sortOrder: 'desc',
  status: 'active',
});

result.companies.forEach(c => {
  console.log(`${c.name}: ${c.itemCount} items`);
});
```
