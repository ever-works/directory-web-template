---
id: collection-repository
title: Колекция Хранилище
sidebar_label: Колекция Хранилище
sidebar_position: 20
---

# Колекция Хранилище

`CollectionRepository` управлява подбрани колекции от елементи. Той осигурява CRUD операции за колекции, съхранявани в хранилище, поддържано от Git, и управлява двупосочната връзка между колекции и елементи, включително партидно присвояване на елементи с поддръжка за връщане назад.

**Изходен файл:** `template/lib/repositories/collection.repository.ts`

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

## Дефиниция на класа

```ts
export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();
}
```

### Зависимости

|Импортиране|Цел|
|--------|---------|
|`Collection`, `CreateCollectionRequest`, `UpdateCollectionRequest`|Типови дефиниции|
|`CollectionListOptions`, `COLLECTION_VALIDATION`|Опции и константи за валидиране|
|`createCollectionGitService` / `CollectionGitService`|Git хранилище за колекции|
|`ItemRepository`|Операции с елементи между обекти|
|`ItemData`, `UpdateItemRequest`|Видове елементи за задание|

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

Връща пагинирани колекции чрез нарязване в паметта след прилагане на `findAll` филтри.

```ts
async findAllPaginated(options?: CollectionListOptions): Promise<{
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

По подразбиране: `page = 1`, `limit = 10`.

---

### `findById(id): Promise<Collection | null>`

Retrieves a single collection by its unique ID, enriched with `item_count`.

```ts
async findById(id: string): Promise<Collection | null>
```

---

### `getAssignedItems(collectionId): Promise<ItemSummary[]>`

Връща лек списък с неизтрити елементи, присвоени на колекция.

```ts
async getAssignedItems(
  collectionId: string
): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>>
```

Зарежда всички елементи (включително изтрити), филтрира тези, чийто `collections` масив съдържа дадения идентификатор, изключва меко изтритите елементи и връща само `id`, `name` и `slug`.

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

Актуализира съществуваща колекция. Обектът `data` трябва да включва полето `id`.

```ts
async update(data: UpdateCollectionRequest): Promise<Collection>
```

Потвърждава ограниченията за дължина на името и описанието, ако тези полета са предоставени.

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

Най-сложната операция -- присвоява набор от елементи към колекция с обработка на грешки в транзакционен стил.

```ts
async assignItems(
  collectionId: string,
  itemSlugs: string[]
): Promise<{ collection: Collection; updatedItems: number }>
```

**Поток на обработка:**

1. **Намиране на колекция** -- хвърля, ако не бъде намерена
2. **Депликат** входящи охлузи
3. **Изчисляване на разликата** -- сравнява текущи елементи с нови елементи, за да идентифицира охлюви за добавяне и охлюви за премахване
4. **Пакетно зареждане** -- зарежда само елементите, които се нуждаят от промени чрез `findManyBySlugs`
5. **Компилиране на актуализации** -- за елементи, които се добавят, добавя ID на колекцията към техния `collections` масив; за предмети, които се премахват, го снажда
6. **Постоянна колекция** -- първо записва актуализираната колекция
7. **Групова актуализация на елементи** -- извиква `itemRepository.batchUpdate` за всички променени елементи
8. **Връщане при грешка** -- ако актуализациите на елемента са неуспешни, се опитва да върне колекцията в предишното й състояние

Връща постоянната колекция и броя елементи, които действително са били променени.

---

## Singleton Export

```ts
export const collectionRepository = new CollectionRepository();
```

A pre-instantiated singleton is exported for convenience.

---

## Валидиращи константи

Хранилището препраща към `COLLECTION_VALIDATION` от `@/types/collection`:

|Константа|Цел|
|----------|---------|
|`ID_MIN_LENGTH`|Минимална дължина на ID на колекцията|
|`ID_MAX_LENGTH`|Максимална дължина на ID на колекцията|
|`NAME_MIN_LENGTH`|Минимална дължина на името на колекцията|
|`NAME_MAX_LENGTH`|Максимална дължина на името на колекцията|
|`DESCRIPTION_MAX_LENGTH`|Максимална дължина на описанието|

---

## Error Handling

- **Validation errors** throw immediately with descriptive messages
- **Not-found errors** throw `Error("Collection with ID ... not found")`
- **Assignment rollback** -- if `batchUpdate` fails after the collection was already saved, the repository attempts to restore the collection to its previous state; if the rollback itself fails, the error is logged

---

## Пример за използване

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
