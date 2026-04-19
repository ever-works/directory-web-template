---
id: item-repository
title: مستودع العناصر
sidebar_label: مستودع العناصر
sidebar_position: 16
---

# مستودع العناصر

توفر فئة `ItemRepository` طبقة الوصول إلى البيانات الأساسية لإدارة العناصر (القوائم/الإرسالات) في القالب. يقوم بتفويض التخزين إلى خدمة مدعومة من Git ويضيف التحقق من الصحة والتصفية وترقيم الصفحات وتسجيل التدقيق ودعم الحذف الناعم في الأعلى.

**الملف المصدر:** `template/lib/repositories/item.repository.ts`

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

## تعريف الفئة

```ts
export class ItemRepository {
  private gitService: ItemGitService | null = null;
}
```

### التبعيات

|استيراد|الغرض|
|--------|---------|
|`ItemData`، `CreateItemRequest`، `UpdateItemRequest`، `ReviewRequest`، `ItemListOptions`|تعريفات النوع من `@/lib/types/item`|
|`createItemGitService` / `ItemGitService`|خدمة تخزين مدعومة بـ Git|
|`getContentPath`|يحل دليل المحتوى المحلي مقابل Vercel|
|`coreConfig`|خدمة التكوين المركزية|
|`itemAuditService` / `AuditUser`|تسجيل مسار التدقيق|

---

## Private Methods

### `getGitService(): Promise<ItemGitService>`

Lazily creates and caches the Git service singleton. Reads `coreConfig.content.dataRepository` and `coreConfig.content.ghToken`, parses the GitHub URL to extract `owner` and `repo`, and calls `createItemGitService` with a configuration object containing branch, data directory, and items directory paths.

Throws an `Error` if `DATA_REPOSITORY` or `GH_TOKEN` is missing or the URL format is invalid.

---

## طرق الاستعلام

### `findAll(options?: ItemListOptions): Promise<ItemData[]>`

إرجاع جميع العناصر المطابقة للمرشحات المتوفرة. يطبق سلسلة التصفية التالية بالترتيب:

1. **الحالة** -- تطابق تام على `item.status`
2. **الفئات** -- أو المنطق؛ يجب أن يحتوي العنصر على واحدة على الأقل من الفئات المطلوبة
3. **العلامات** -- أو المنطق؛ يجب أن يحتوي العنصر على واحدة على الأقل من العلامات المطلوبة
4. **مقدم بواسطة** -- تطابق تام على `item.submitted_by`
5. **بحث** - مطابقة سلسلة فرعية غير حساسة لحالة الأحرف على `item.name` أو `item.description`

```ts
async findAll(options: ItemListOptions = {}): Promise<ItemData[]>
```

|المعلمة|اكتب|الافتراضي|الوصف|
|-----------|------|---------|-------------|
|`options.status`|`string`| -- |التصفية حسب حالة العنصر|
|`options.categories`|`string[]`| -- |التصفية حسب الفئة الثابتة (OR)|
|`options.tags`|`string[]`| -- |التصفية حسب أسماء العلامات (أو)|
|`options.submittedBy`|`string`| -- |التصفية حسب معرف المستخدم الخاص بالمرسل|
|`options.search`|`string`| -- |البحث عن النص الحر|
|`options.includeDeleted`|`boolean`|`false`|تضمين العناصر المحذوفة بشكل بسيط|

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

يبحث عن عنصر واحد بواسطة المعرف الفريد الخاص به.

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

بحث دفعة من عناصر متعددة من خلال البزاقات الخاصة بهم. إرجاع مصفوفة فارغة إذا كان الإدخال فارغًا.

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

يقوم بتحديث عنصر موجود. يلتقط الحالة السابقة لتسجيل فرق التدقيق.

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

مراجعة عنصر (الموافقة أو الرفض). التحقق من أن `reviewData.status` هو إما `"approved"` أو `"rejected"`.

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

وضع علامة على عنصر كمحذوف (يعين `deleted_at`) دون إزالة الملف.

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

## طرق المنفعة

### `checkDuplicateId(id): Promise<boolean>`

يُرجع `true` إذا كان أي عنصر (بما في ذلك المحذوف) يشارك المعرف المحدد.

### `checkDuplicateSlug(slug): Promise<boolean>`

يُرجع `true` إذا كان أي عنصر (بما في ذلك المحذوف) يشارك في السلسلة الثابتة المحددة.

### `getStats(options?): Promise<StatsObject>`

إرجاع أعداد الحالة التي تمت تصفيتها بواسطة القيود الاختيارية `submittedBy` و`search` و`categories` و`tags`.

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

يتم حساب العناصر ذات الطابع الزمني `deleted_at` بشكل منفصل عن العناصر النشطة.

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

## مثال الاستخدام

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
