---
id: collection-repository
title: Collection Repository
sidebar_label: Collection Repository
sidebar_position: 20
---

# Collection Repository

The `CollectionRepository` manages curated collections of items. It provides CRUD operations for collections stored in a Git-backed repository and handles the bidirectional relationship between collections and items, including batch item assignment with rollback support.

**Source file:** `template/lib/repositories/collection.repository.ts`

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

## Class Definition

```ts
export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();
}
```

### Dependencies

| Import | Purpose |
|--------|---------|
| `Collection`, `CreateCollectionRequest`, `UpdateCollectionRequest` | Type definitions |
| `CollectionListOptions`, `COLLECTION_VALIDATION` | Options and validation constants |
| `createCollectionGitService` / `CollectionGitService` | Git storage for collections |
| `ItemRepository` | Cross-entity item operations |
| `ItemData`, `UpdateItemRequest` | Item types for assignment |

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

Returns paginated collections using in-memory slicing after applying `findAll` filters.

```ts
async findAllPaginated(options?: CollectionListOptions): Promise<{
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Defaults: `page = 1`, `limit = 10`.

---

### `findById(id): Promise<Collection | null>`

Retrieves a single collection by its unique ID, enriched with `item_count`.

```ts
async findById(id: string): Promise<Collection | null>
```

---

### `getAssignedItems(collectionId): Promise<ItemSummary[]>`

Returns a lightweight list of non-deleted items assigned to a collection.

```ts
async getAssignedItems(
  collectionId: string
): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>>
```

Loads all items (including deleted), filters to those whose `collections` array contains the given ID, excludes soft-deleted items, and returns only `id`, `name`, and `slug`.

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

Updates an existing collection. The `data` object must include the `id` field.

```ts
async update(data: UpdateCollectionRequest): Promise<Collection>
```

Validates name and description length constraints if those fields are provided.

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

The most complex operation -- assigns a set of items to a collection with transactional-style error handling.

```ts
async assignItems(
  collectionId: string,
  itemSlugs: string[]
): Promise<{ collection: Collection; updatedItems: number }>
```

**Processing flow:**

1. **Find collection** -- throws if not found
2. **Deduplicate** incoming slugs
3. **Diff computation** -- compares current items vs. new items to identify slugs to add and slugs to remove
4. **Batch load** -- loads only the items that need changes via `findManyBySlugs`
5. **Build updates** -- for items being added, appends the collection ID to their `collections` array; for items being removed, splices it out
6. **Persist collection** -- writes the updated collection first
7. **Batch update items** -- calls `itemRepository.batchUpdate` for all changed items
8. **Rollback on failure** -- if item updates fail, attempts to revert the collection to its previous state

Returns the persisted collection and the number of items that were actually modified.

---

## Singleton Export

```ts
export const collectionRepository = new CollectionRepository();
```

A pre-instantiated singleton is exported for convenience.

---

## Validation Constants

The repository references `COLLECTION_VALIDATION` from `@/types/collection`:

| Constant | Purpose |
|----------|---------|
| `ID_MIN_LENGTH` | Minimum collection ID length |
| `ID_MAX_LENGTH` | Maximum collection ID length |
| `NAME_MIN_LENGTH` | Minimum collection name length |
| `NAME_MAX_LENGTH` | Maximum collection name length |
| `DESCRIPTION_MAX_LENGTH` | Maximum description length |

---

## Error Handling

- **Validation errors** throw immediately with descriptive messages
- **Not-found errors** throw `Error("Collection with ID ... not found")`
- **Assignment rollback** -- if `batchUpdate` fails after the collection was already saved, the repository attempts to restore the collection to its previous state; if the rollback itself fails, the error is logged

---

## Usage Example

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
