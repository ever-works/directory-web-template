---
id: item-repository
title: מאגר פריטים
sidebar_label: מאגר פריטים
sidebar_position: 16
---

# מאגר פריטים

המחלקה `ItemRepository` מספקת את שכבת הגישה הראשית לנתונים לניהול פריטים (רישומים/הגשות) בתבנית. הוא מאציל אחסון לשירות המגובה Git ומוסיף אימות, סינון, עימוד, רישום ביקורת ותמיכה במחיקה רכה למעלה.

**קובץ מקור:** `template/lib/repositories/item.repository.ts`

---

## Architecture Overview

```
API Route / Server Action
        |
  ItemRepository          <-- validation, filtering, audit
        |
  ItemGitService          <-- Git read/write via GitHub API
        |
  GitHub Repository       <-- .content/data/*.yml files
```

The repository lazily initializes an `ItemGitService` instance by parsing the `DATA_REPOSITORY` environment variable for the GitHub owner/repo pair and authenticating with `GH_TOKEN`.

---

## הגדרת כיתה

```ts
export class ItemRepository {
  private gitService: ItemGitService | null = null;
}
```

### תלות

|ייבוא|מטרה|
|--------|---------|
|`ItemData`, `CreateItemRequest`, `UpdateItemRequest`, `ReviewRequest`, `ItemListOptions`|הקלד הגדרות מ-`@/lib/types/item`|
|`createItemGitService` / `ItemGitService`|שירות אחסון בגיבוי Git|
|`getContentPath`|פותר את ספריית התוכן המקומית לעומת Vercel|
|`coreConfig`|שירות תצורה מרכזי|
|`itemAuditService` / `AuditUser`|רישום שבילי ביקורת|

---

## Private Methods

### `getGitService(): Promise<ItemGitService>`

Lazily creates and caches the Git service singleton. Reads `coreConfig.content.dataRepository` and `coreConfig.content.ghToken`, parses the GitHub URL to extract `owner` and `repo`, and calls `createItemGitService` with a configuration object containing branch, data directory, and items directory paths.

Throws an `Error` if `DATA_REPOSITORY` or `GH_TOKEN` is missing or the URL format is invalid.

---

## שיטות שאילתה

### `findAll(options?: ItemListOptions): Promise<ItemData[]>`

מחזירה את כל הפריטים התואמים למסננים שסופקו. מחיל את שרשרת הסינון הבאה לפי הסדר:

1. **סטטוס** -- התאמה מדויקת ב-`item.status`
2. **קטגוריות** -- OR היגיון; הפריט חייב להכיל לפחות אחת מהקטגוריות המבוקשות
3. **תגים** -- OR היגיון; הפריט חייב להכיל לפחות אחד מהתגים המבוקשים
4. **הוגש מאת** -- התאמה מדויקת ב-`item.submitted_by`
5. **חיפוש** -- התאמת מחרוזת משנה לא תלוית רישיות ב-`item.name` או `item.description`

```ts
async findAll(options: ItemListOptions = {}): Promise<ItemData[]>
```

|פרמטר|הקלד|ברירת מחדל|תיאור|
|-----------|------|---------|-------------|
|`options.status`|`string`| -- |סנן לפי מצב פריט|
|`options.categories`|`string[]`| -- |סינון לפי קטגוריות שבלולים (OR)|
|`options.tags`|`string[]`| -- |סינון לפי שמות תגים (OR)|
|`options.submittedBy`|`string`| -- |סנן לפי מזהה משתמש של שולח|
|`options.search`|`string`| -- |חיפוש טקסט חופשי|
|`options.includeDeleted`|`boolean`|`false`|כלול פריטים שנמחקו ברכות|

---

### `findAllPaginated(page?, limit?, options?): Promise<PaginatedResult>`

Server-side paginated query that delegates to `gitService.getItemsPaginated`. Supports the same filter options as `findAll` plus `sortBy` and `sortOrder`.

```ts
async findAllPaginated(
  page: number = 1,
  limit: number = 10,
  options: ItemListOptions = {}
): Promise<{
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

---

### `findById(id, includeDeleted?): Promise<ItemData | null>`

מחפש פריט בודד לפי המזהה הייחודי שלו.

```ts
async findById(id: string, includeDeleted: boolean = false): Promise<ItemData | null>
```

---

### `findBySlug(slug, includeDeleted?): Promise<ItemData | null>`

Looks up a single item by its URL slug.

```ts
async findBySlug(slug: string, includeDeleted: boolean = false): Promise<ItemData | null>
```

---

### `findManyBySlugs(slugs, includeDeleted?): Promise<ItemData[]>`

חיפוש אצווה של פריטים מרובים לפי השבלולים שלהם. מחזירה מערך ריק אם הקלט ריק.

```ts
async findManyBySlugs(slugs: string[], includeDeleted: boolean = false): Promise<ItemData[]>
```

---

## Mutation Methods

### `create(data, auditUser?): Promise<ItemData>`

Creates a new item after running `validateCreateData`. Logs the creation via `itemAuditService.logCreation` (best-effort -- failures are warned but not thrown).

```ts
async create(data: CreateItemRequest, auditUser?: AuditUser): Promise<ItemData>
```

**Validation rules** enforced by `validateCreateData`:
- `id`, `name`, `slug`, `description`, `source_url` are all required and non-empty
- `slug` must match `/^[a-z0-9-]+$/`
- `source_url` must be a valid URL (parsed via `new URL()`)

---

### `update(id, data, auditUser?): Promise<ItemData>`

מעדכן פריט קיים. לוכד את המצב הקודם עבור רישום הבדלי ביקורת.

```ts
async update(id: string, data: UpdateItemRequest, auditUser?: AuditUser): Promise<ItemData>
```

---

### `batchUpdate(updates, auditUser?): Promise<ItemData[]>`

Applies multiple updates in a single Git commit for atomicity. Pre-validates all entries before writing any. After committing, logs each change to the audit trail.

```ts
async batchUpdate(
  updates: Array<{ id: string; data: UpdateItemRequest }>,
  auditUser?: AuditUser
): Promise<ItemData[]>
```

Uses `gitService.updateItemWithoutCommit` for each item, then calls `gitService.commitAndPushBatch` once.

---

### `review(id, reviewData, auditUser?): Promise<ItemData>`

סקור פריט (אשר או דחה). מאמת ש-@@TOK000@@@ הוא `"approved"` או `"rejected"`.

```ts
async review(id: string, reviewData: ReviewRequest, auditUser?: AuditUser): Promise<ItemData>
```

---

### `delete(id, auditUser?): Promise<void>`

Hard-deletes an item permanently from the Git repository.

```ts
async delete(id: string, auditUser?: AuditUser): Promise<void>
```

---

### `softDelete(id, auditUser?): Promise<ItemData>`

מסמן פריט כנמחק (מגדיר `deleted_at`) מבלי להסיר את הקובץ.

```ts
async softDelete(id: string, auditUser?: AuditUser): Promise<ItemData>
```

---

### `restore(id, auditUser?): Promise<ItemData>`

Restores a previously soft-deleted item by clearing the `deleted_at` timestamp.

```ts
async restore(id: string, auditUser?: AuditUser): Promise<ItemData>
```

---

## שיטות שירות

### `checkDuplicateId(id): Promise<boolean>`

מחזיר `true` אם פריט כלשהו (כולל נמחק) חולק את המזהה הנתון.

### `checkDuplicateSlug(slug): Promise<boolean>`

מחזירה `true` אם פריט כלשהו (כולל נמחק) חולק את הקליע הנתון.

### `getStats(options?): Promise<StatsObject>`

מחזירה ספירות סטטוס מסוננות לפי אילוצים אופציונליים של `submittedBy`, `search`, `categories`, ו-`tags`.

```ts
async getStats(options?: {
  submittedBy?: string;
  search?: string;
  categories?: string[];
  tags?: string[];
}): Promise<{
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  deleted: number;
}>
```

פריטים עם חותמת זמן `deleted_at` נספרים בנפרד מפריטים פעילים.

---

## Audit Trail Integration

Every mutation method accepts an optional `AuditUser` parameter. When provided, the repository logs the action via `itemAuditService`:

| Method | Audit Call |
|--------|-----------|
| `create` | `logCreation(item, auditUser)` |
| `update` | `logUpdate(previousItem, updatedItem, auditUser)` |
| `batchUpdate` | `logUpdate(...)` for each changed item |
| `review` | `logReview(item, previousStatus, notes, auditUser)` |
| `delete` | `logDeletion(item, auditUser, false)` |
| `softDelete` | `logDeletion(item, auditUser, true)` |
| `restore` | `logRestoration(item, auditUser)` |

All audit calls are wrapped in try/catch and log warnings on failure -- they never cause the parent operation to fail.

---

## דוגמה לשימוש

```ts
import { ItemRepository } from '@/lib/repositories/item.repository';

const repo = new ItemRepository();

// List approved items in a category
const items = await repo.findAll({
  status: 'approved',
  categories: ['developer-tools'],
});

// Paginated query
const page = await repo.findAllPaginated(1, 20, { search: 'timer' });

// Create with audit
const newItem = await repo.create(
  { id: 'my-tool', name: 'My Tool', slug: 'my-tool', description: '...', source_url: 'https://...' },
  { id: 'user-123', email: 'admin@example.com' }
);
```
