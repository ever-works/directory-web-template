---
id: item-repository
title: Репозиторий предметов
sidebar_label: Репозиторий предметов
sidebar_position: 16
---

# Репозиторий предметов

Класс `ItemRepository` обеспечивает основной уровень доступа к данным для управления элементами (списками/отправлениями) в шаблоне. Он делегирует хранилище службе, поддерживаемой Git, и добавляет проверку, фильтрацию, разбиение на страницы, ведение журнала аудита и поддержку обратимого удаления.

**Исходный файл:** `template/lib/repositories/item.repository.ts`

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

## Определение класса

```ts
export class ItemRepository {
  private gitService: ItemGitService | null = null;
}
```

### Зависимости

|Импорт|Цель|
|--------|---------|
|`ItemData`, `CreateItemRequest`, `UpdateItemRequest`, `ReviewRequest`, `ItemListOptions`|Определения типов из `@/lib/types/item`|
|`createItemGitService` / `ItemGitService`|Служба хранения данных на базе Git|
|`getContentPath`|Разрешает локальный каталог содержимого по сравнению с каталогом содержимого Vercel.|
|`coreConfig`|Служба централизованной настройки|
|`itemAuditService` / `AuditUser`|Ведение журнала аудита|

---

## Private Methods

### `getGitService(): Promise<ItemGitService>`

Lazily creates and caches the Git service singleton. Reads `coreConfig.content.dataRepository` and `coreConfig.content.ghToken`, parses the GitHub URL to extract `owner` and `repo`, and calls `createItemGitService` with a configuration object containing branch, data directory, and items directory paths.

Throws an `Error` if `DATA_REPOSITORY` or `GH_TOKEN` is missing or the URL format is invalid.

---

## Методы запроса

### `findAll(options?: ItemListOptions): Promise<ItemData[]>`

Возвращает все элементы, соответствующие предоставленным фильтрам. Применяет следующую цепочку фильтров по порядку:

1. **статус** – точное совпадение с `item.status`
2. **категории** -- логика ИЛИ; элемент должен содержать хотя бы одну из запрошенных категорий
3. **теги** -- логика ИЛИ; элемент должен содержать хотя бы один из запрошенных тегов
4. **submitBy** – точное совпадение с `item.submitted_by`
5. **поиск** — совпадение подстроки без учета регистра в `item.name` или `item.description`

```ts
async findAll(options: ItemListOptions = {}): Promise<ItemData[]>
```

|Параметр|Тип|По умолчанию|Описание|
|-----------|------|---------|-------------|
|`options.status`|`string`| -- |Фильтровать по статусу товара|
|`options.categories`|`string[]`| -- |Фильтровать по слогам категории (ИЛИ)|
|`options.tags`|`string[]`| -- |Фильтровать по именам тегов (ИЛИ)|
|`options.submittedBy`|`string`| -- |Фильтровать по идентификатору отправителя|
|`options.search`|`string`| -- |Свободный текстовый поиск|
|`options.includeDeleted`|`boolean`|`false`|Включить обратимо удаленные элементы|

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

Ищет отдельный элемент по его уникальному идентификатору.

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

Пакетный поиск нескольких элементов по их слагам. Возвращает пустой массив, если входные данные пусты.

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

Обновляет существующий элемент. Фиксирует предыдущее состояние для регистрации различий аудита.

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

Просматривает элемент (утвердить или отклонить). Проверяет, что `reviewData.status` является либо `"approved"`, либо `"rejected"`.

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

Отмечает элемент как удаленный (устанавливает `deleted_at`) без удаления файла.

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

## Служебные методы

### `checkDuplicateId(id): Promise<boolean>`

Возвращает `true`, если какой-либо элемент (включая удаленный) имеет указанный идентификатор.

### `checkDuplicateSlug(slug): Promise<boolean>`

Возвращает `true`, если какой-либо элемент (включая удаленный) разделяет данный пул.

### `getStats(options?): Promise<StatsObject>`

Возвращает счетчики состояний, отфильтрованные необязательными ограничениями `submittedBy`, `search`, `categories` и `tags`.

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

Элементы с отметкой времени `deleted_at` учитываются отдельно от активных элементов.

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

## Пример использования

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
