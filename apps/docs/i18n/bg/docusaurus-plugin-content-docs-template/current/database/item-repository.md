---
id: item-repository
title: Хранилище на артикули
sidebar_label: Хранилище на артикули
sidebar_position: 16
---

# Хранилище на артикули

Класът `ItemRepository` предоставя основния слой за достъп до данни за управление на елементи (списъци/подаване) в шаблона. Той делегира съхранение на услуга, поддържана от Git, и добавя проверка, филтриране, пагиниране, регистриране на одит и поддръжка за меко изтриване отгоре.

**Изходен файл:** `template/lib/repositories/item.repository.ts`

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

## Дефиниция на класа

```ts
export class ItemRepository {
  private gitService: ItemGitService | null = null;
}
```

### Зависимости

|Импортиране|Цел|
|--------|---------|
|`ItemData`, `CreateItemRequest`, `UpdateItemRequest`, `ReviewRequest`, `ItemListOptions`|Типови дефиниции от `@/lib/types/item`|
|`createItemGitService` / `ItemGitService`|Подкрепена от Git услуга за съхранение|
|`getContentPath`|Разрешава локална директория със съдържание на Vercel|
|`coreConfig`|Централизирана услуга за конфигуриране|
|`itemAuditService` / `AuditUser`|Регистриране на одитна пътека|

---

## Private Methods

### `getGitService(): Promise<ItemGitService>`

Lazily creates and caches the Git service singleton. Reads `coreConfig.content.dataRepository` and `coreConfig.content.ghToken`, parses the GitHub URL to extract `owner` and `repo`, and calls `createItemGitService` with a configuration object containing branch, data directory, and items directory paths.

Throws an `Error` if `DATA_REPOSITORY` or `GH_TOKEN` is missing or the URL format is invalid.

---

## Методи за заявка

### `findAll(options?: ItemListOptions): Promise<ItemData[]>`

Връща всички елементи, съответстващи на предоставените филтри. Прилага следната филтърна верига в ред:

1. **статус** -- точно съвпадение на `item.status`
2. **категории** -- ИЛИ логика; елементът трябва да съдържа поне една от заявените категории
3. **тагове** -- ИЛИ логика; елементът трябва да съдържа поне един от заявените тагове
4. **submittedBy** -- точно съвпадение на `item.submitted_by`
5. **търсене** -- съвпадение на подниз без значение за малки и големи букви на `item.name` или `item.description`

```ts
async findAll(options: ItemListOptions = {}): Promise<ItemData[]>
```

|Параметър|Тип|По подразбиране|Описание|
|-----------|------|---------|-------------|
|`options.status`|`string`| -- |Филтрирайте по състояние на артикул|
|`options.categories`|`string[]`| -- |Филтриране по категория охлюви (ИЛИ)|
|`options.tags`|`string[]`| -- |Филтриране по имена на тагове (ИЛИ)|
|`options.submittedBy`|`string`| -- |Филтрирайте по потребителски идентификатор на подателя|
|`options.search`|`string`| -- |Търсене в свободен текст|
|`options.includeDeleted`|`boolean`|`false`|Включете меко изтрити елементи|

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

Търси отделен елемент по неговия уникален идентификатор.

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

Пакетно търсене на множество елементи по техните охлюви. Връща празен масив, ако входът е празен.

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

Актуализира съществуващ елемент. Улавя предишното състояние за регистриране на разл.

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

Преглежда артикул (одобрява или отхвърля). Потвърждава, че `reviewData.status` е `"approved"` или `"rejected"`.

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

Маркира елемент като изтрит (задава `deleted_at`), без да премахва файла.

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

## Полезни методи

### `checkDuplicateId(id): Promise<boolean>`

Връща `true`, ако някой елемент (включително изтрит) споделя дадения идентификатор.

### `checkDuplicateSlug(slug): Promise<boolean>`

Връща `true`, ако някой елемент (включително изтрит) споделя дадения плужек.

### `getStats(options?): Promise<StatsObject>`

Връща броя на статусите, филтрирани по незадължителни `submittedBy`, `search`, `categories` и `tags` ограничения.

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

Елементите с клеймо за време `deleted_at` се броят отделно от активните елементи.

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

## Пример за използване

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
