---
id: collection-queries-deep-dive
title: استعلامات المجموعة (الشركة) الغوص العميق
sidebar_label: استعلامات المجموعة، الغوص العميق
sidebar_position: 65
---

# استعلامات المجموعة (الشركة) الغوص العميق

مرجع شامل لجميع عمليات الشركة/المجموعة CRUD، وارتباطات شركة العناصر، والبحث، وترقيم الصفحات، ووظائف الاستعلام عن الإحصائيات.

## نظرة عامة

تدير طبقة استعلام المجموعة الشركات وارتباطاتها بالعناصر:

- **`company.queries.ts`** - CRUD كامل للشركة، والبحث باستخدام الصفحات، وربط العناصر بالشركة (علاقة 1:1)، والإحصائيات، وقائمة العناصر حسب الشركة

تمثل الشركات في هذا النظام المنظمات التي تقف وراء العناصر المدرجة. يمكن أن ينتمي كل عنصر إلى شركة واحدة على الأكثر (يتم فرضه بواسطة قيد فريد على `itemSlug`).

## ملف المصدر

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

الحصول على شركة حسب المجال باستخدام مطابقة غير حساسة لحالة الأحرف.

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

تحديث حقول الشركة. تطبيع `domain` و`slug` إذا تم توفيره.

```typescript
async function updateCompany(
  id: string,
  data: Partial<Omit<NewCompany, 'id'>>
): Promise<Company | null>
```

**ملاحظة:** يزيل قيم `undefined` من حمولة التحديث لتجنب الكتابة فوق الحقول بقيمة خالية.

---

#### `deleteCompany`

Permanently deletes a company.

```typescript
async function deleteCompany(id: string): Promise<boolean>
```

**Returns:** `true` if a record was deleted, `false` if company not found.

---

### قائمة الشركة والبحث

#### `listCompanies`

يسرد الشركات مع ترقيم الصفحات والبحث والتصفية والفرز.

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

** سلوك البحث: ** يستخدم `ILIKE` في كل من الحقول `name` و`domain` مع الهروب المناسب.

**بيانات إضافية:** تُرجع عمومًا `activeCount` و`inactiveCount` بغض النظر عن عوامل التصفية المطبقة.

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

يسرد الشركات مع عدد العناصر المرتبطة بكل منها، مع دعم الفرز حسب عدد العناصر.

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

** نمط SQL: **

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

الاسم المستعار المتوافق مع الإصدارات السابقة لـ `linkItemToCompany`. إرجاع كائن الاقتران فقط.

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

يزيل ارتباط شركة العنصر. غير فعال - يعد إلغاء ربط التعيين غير الموجود أمرًا محظورًا.

```typescript
async function unlinkItemFromCompany(
  itemSlug: string
): Promise<{ success: boolean; deleted: boolean }>
```

**المرتجعات:**
- `success`: دائمًا `true` (عاجز)
- `deleted`: `true` إذا تمت إزالة الارتباط بالفعل

---

#### `removeCompanyFromItem`

Backward-compatible alias for `unlinkItemFromCompany`. Returns `boolean`.

```typescript
async function removeCompanyFromItem(itemSlug: string): Promise<boolean>
```

---

#### `getCompanyByItemSlug`

الحصول على الشركة المرتبطة بالعنصر.

```typescript
async function getCompanyByItemSlug(itemSlug: string): Promise<Company | null>
```

** نمط SQL: **

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

يتحقق مما إذا كان العنصر لديه شركة معينة.

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

الاسم المستعار المتوافق مع الإصدارات السابقة لـ `listItemsByCompany`.

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
