---
id: collection-queries-deep-dive
title: שאילתות אוסף (חברה) Deep Dive
sidebar_label: שאילתות אוסף Deep Dive
sidebar_position: 65
---

# שאילתות אוסף (חברה) Deep Dive

התייחסות מקיפה לכל פעולות ה-CRUD של החברה/אוסף, אסוציאציות של פריט-חברה, פונקציות חיפוש, עימוד ושאילתות סטטיסטיקות.

## סקירה כללית

שכבת שאילתות האיסוף מנהלת חברות והקשרים שלהן עם פריטים:

- **`company.queries.ts`** -- CRUD של חברה מלאה, חיפוש עם עימוד, קישור בין פריט לחברה (יחס 1:1), סטטיסטיקות ורישום פריטים לפי חברה

חברות במערכת זו מייצגות את הארגונים שמאחורי הפריטים הרשומים. כל פריט יכול להיות שייך לכל היותר לחברה אחת (נאכפת על ידי אילוץ ייחודי על `itemSlug`).

## קובץ מקור

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

מקבל חברה לפי דומיין באמצעות התאמה לא תלוית רישיות.

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

מעדכן את שדות החברה. מנרמל `domain` ו-`slug` אם מסופקים.

```typescript
async function updateCompany(
  id: string,
  data: Partial<Omit<NewCompany, 'id'>>
): Promise<Company | null>
```

**הערה:** מסיר את ערכי `undefined` מטעינת העדכון כדי למנוע החלפת שדות ב-null.

---

#### `deleteCompany`

Permanently deletes a company.

```typescript
async function deleteCompany(id: string): Promise<boolean>
```

**Returns:** `true` if a record was deleted, `false` if company not found.

---

### רישום חברות וחיפוש

#### `listCompanies`

מפרט חברות עם עימוד, חיפוש, סינון ומיון.

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

**התנהגות חיפוש:** משתמש ב-`ILIKE` גם בשדות `name` וגם ב-`domain` עם אסקייפ מתאים.

**נתונים נוספים:** מחזירה עולמית `activeCount` ו-`inactiveCount` ללא קשר למסננים שהוחלו.

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

מפרט חברות עם ספירת הפריטים המשויכים לכל אחת מהן, תומך במיון לפי ספירת פריטים.

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

**דפוס SQL:**

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

כינוי תואם אחורה עבור `linkItemToCompany`. מחזירה רק את אובייקט השיוך.

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

מסיר שיוך פריט-חברה. Idempotent -- ביטול הקישור למיפוי לא קיים הוא חוסר פעולה.

```typescript
async function unlinkItemFromCompany(
  itemSlug: string
): Promise<{ success: boolean; deleted: boolean }>
```

**מחזירה:**
- `success`: תמיד `true` (אימפוטנטי)
- `deleted`: `true` אם שיוך הוסר בפועל

---

#### `removeCompanyFromItem`

Backward-compatible alias for `unlinkItemFromCompany`. Returns `boolean`.

```typescript
async function removeCompanyFromItem(itemSlug: string): Promise<boolean>
```

---

#### `getCompanyByItemSlug`

מקבל את החברה משויכת לפריט.

```typescript
async function getCompanyByItemSlug(itemSlug: string): Promise<Company | null>
```

**דפוס SQL:**

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

בודק אם לפריט הוקצתה חברה.

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

כינוי תואם אחורה עבור `listItemsByCompany`.

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
