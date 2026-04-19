---
id: collection-repository
title: Репозиторий коллекций
sidebar_label: Репозиторий коллекций
sidebar_position: 20
---

# Репозиторий коллекций

`CollectionRepository` управляет тщательно подобранными коллекциями предметов. Он обеспечивает операции CRUD для коллекций, хранящихся в репозитории, поддерживаемом Git, и обрабатывает двунаправленные отношения между коллекциями и элементами, включая пакетное назначение элементов с поддержкой отката.

**Исходный файл:** `template/lib/repositories/collection.repository.ts`

---

## Architecture Overview

```
Admin Collection UI
        |
  API Route / Server Action
        |
  CollectionRepository
        |
  +-----+-----+
  |             |
CollectionGitService   ItemRepository
  (collections.yml)    (item files)
```

Collections are stored in a YAML file within the Git repository. Each collection maintains a list of item slugs. When items are assigned or removed, both the collection record and the individual item records are updated.

> **Note:** This file uses the `'server-only'` import guard to prevent accidental client-side usage.

---

## Определение класса

```ts
export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();
}
```

### Зависимости

|Импорт|Цель|
|--------|---------|
|`Collection`, `CreateCollectionRequest`, `UpdateCollectionRequest`|Определения типов|
|`CollectionListOptions`, `COLLECTION_VALIDATION`|Опции и константы проверки|
|`createCollectionGitService` / `CollectionGitService`|Git-хранилище для коллекций|
|`ItemRepository`|Операции с элементами между сущностями|
|`ItemData`, `UpdateItemRequest`|Типы элементов для назначения|

---

## Query Methods

### `findAll(options?): Promise<Collection[]>`

Returns all collections with optional filtering and sorting.

```ts
async findAll(options: CollectionListOptions = {}): Promise<Collection[]>
```

**Behavior:**
- Computes `item_count` from the items array length on each collection
- Filters out inactive collections unless `options.includeInactive` is true
- Applies case-insensitive search across `name`, `slug`, and `description`
- Supports sorting by `name` (default), `item_count`, or `created_at`
- Supports `asc` (default) or `desc` sort order

---

### `findAllPaginated(options?): Promise<PaginatedResult>`

Возвращает коллекции с разбивкой на страницы с использованием срезов в памяти после применения фильтров `findAll`.

```ts
async findAllPaginated(options?: CollectionListOptions): Promise<{
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

По умолчанию: `page = 1`, `limit = 10`.

---

### `findById(id): Promise<Collection | null>`

Retrieves a single collection by its unique ID, enriched with `item_count`.

```ts
async findById(id: string): Promise<Collection | null>
```

---

### `getAssignedItems(collectionId): Promise<ItemSummary[]>`

Возвращает упрощенный список неудаленных элементов, назначенных коллекции.

```ts
async getAssignedItems(
  collectionId: string
): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>>
```

Загружает все элементы (включая удаленные), фильтрует те, чей массив `collections` содержит заданный идентификатор, исключает обратимо удаленные элементы и возвращает только `id`, `name` и `slug`.

---

## Mutation Methods

### `create(data): Promise<Collection>`

Creates a new collection after validation.

```ts
async create(data: CreateCollectionRequest): Promise<Collection>
```

**Validation rules** (from `COLLECTION_VALIDATION` constants):
- `id` must be between `ID_MIN_LENGTH` and `ID_MAX_LENGTH` characters
- `id` must match `/^[a-z0-9-]+$/`
- `name` must be between `NAME_MIN_LENGTH` and `NAME_MAX_LENGTH` characters
- `description` must not exceed `DESCRIPTION_MAX_LENGTH` characters

---

### `update(data): Promise<Collection>`

Обновляет существующую коллекцию. Объект `data` должен включать поле `id`.

```ts
async update(data: UpdateCollectionRequest): Promise<Collection>
```

Проверяет ограничения длины имени и описания, если эти поля указаны.

---

### `delete(id): Promise<void>`

Deletes a collection and removes its ID from all items that reference it.

```ts
async delete(id: string): Promise<void>
```

**Processing steps:**

1. Loads all items (including deleted) from the item repository
2. For each item whose `collections` array contains this collection ID, removes the reference and saves the update
3. Deletes the collection record from Git

---

### `assignItems(collectionId, itemSlugs): Promise<AssignResult>`

Самая сложная операция — назначение набора элементов коллекции с обработкой ошибок в транзакционном стиле.

```ts
async assignItems(
  collectionId: string,
  itemSlugs: string[]
): Promise<{ collection: Collection; updatedItems: number }>
```

**Последовательность обработки:**

1. **Найти коллекцию** — выдается, если не найдена.
2. **Дедублировать** входящие пули
3. **Вычисление различий** — сравнение текущих и новых элементов для определения слизней, которые нужно добавить, и слизней, которые нужно удалить.
4. **Пакетная загрузка** – загружаются только те элементы, которые необходимо изменить, через `findManyBySlugs`.
5. **Обновления сборки** — для добавляемых элементов добавляет идентификатор коллекции в их массив `collections`; для удаляемых элементов соедините их
6. **Сохранять коллекцию** — сначала записывает обновленную коллекцию.
7. **Пакетное обновление элементов** — вызывает `itemRepository.batchUpdate` для всех измененных элементов.
8. **Откат при сбое** – если обновление элемента завершается неудачей, попытка вернуть коллекцию в предыдущее состояние.

Возвращает сохраненную коллекцию и количество элементов, которые были фактически изменены.

---

## Singleton Export

```ts
export const collectionRepository = new CollectionRepository();
```

A pre-instantiated singleton is exported for convenience.

---

## Константы проверки

В репозитории ссылки `COLLECTION_VALIDATION` от `@/types/collection`:

|Константа|Цель|
|----------|---------|
|`ID_MIN_LENGTH`|Минимальная длина идентификатора коллекции|
|`ID_MAX_LENGTH`|Максимальная длина идентификатора коллекции|
|`NAME_MIN_LENGTH`|Минимальная длина имени коллекции|
|`NAME_MAX_LENGTH`|Максимальная длина имени коллекции|
|`DESCRIPTION_MAX_LENGTH`|Максимальная длина описания|

---

## Error Handling

- **Validation errors** throw immediately with descriptive messages
- **Not-found errors** throw `Error("Collection with ID ... not found")`
- **Assignment rollback** -- if `batchUpdate` fails after the collection was already saved, the repository attempts to restore the collection to its previous state; if the rollback itself fails, the error is logged

---

## Пример использования

```ts
import { collectionRepository } from '@/lib/repositories/collection.repository';

// List active collections sorted by item count
const collections = await collectionRepository.findAll({
  sortBy: 'item_count',
  sortOrder: 'desc',
});

// Assign items to a collection
const result = await collectionRepository.assignItems(
  'featured-2025',
  ['item-slug-1', 'item-slug-2', 'item-slug-3']
);
console.log(`Updated ${result.updatedItems} items`);

// Get items in a collection
const items = await collectionRepository.getAssignedItems('featured-2025');
```

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/services/collection-git.service.ts` | Git storage backend |
| `lib/repositories/item.repository.ts` | Item CRUD and batch operations |
| `@/types/collection.ts` | Type definitions and validation constants |
