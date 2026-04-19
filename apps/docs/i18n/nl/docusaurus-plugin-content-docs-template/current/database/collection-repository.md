---
id: collection-repository
title: Collectieopslagplaats
sidebar_label: Collectieopslagplaats
sidebar_position: 20
---

# Collectieopslagplaats

De `CollectionRepository` beheert samengestelde verzamelingen items. Het biedt CRUD-bewerkingen voor collecties die zijn opgeslagen in een door Git ondersteunde repository en verzorgt de bidirectionele relatie tussen collecties en items, inclusief batch-itemtoewijzing met rollback-ondersteuning.

**Bronbestand:** `template/lib/repositories/collection.repository.ts`

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

## Klasse definitie

```ts
export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();
}
```

### Afhankelijkheden

|Importeren|Doel|
|--------|---------|
|`Collection`, `CreateCollectionRequest`, `UpdateCollectionRequest`|Typedefinities|
|`CollectionListOptions`, `COLLECTION_VALIDATION`|Opties en validatieconstanten|
|`createCollectionGitService` / `CollectionGitService`|Git-opslag voor collecties|
|`ItemRepository`|Artikelbewerkingen tussen entiteiten|
|`ItemData`, `UpdateItemRequest`|Artikeltypen voor toewijzing|

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

Retourneert gepagineerde verzamelingen met behulp van in-memory slicing na het toepassen van `findAll`-filters.

```ts
async findAllPaginated(options?: CollectionListOptions): Promise<{
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Standaardwaarden: `page = 1`, `limit = 10`.

---

### `findById(id): Promise<Collection | null>`

Retrieves a single collection by its unique ID, enriched with `item_count`.

```ts
async findById(id: string): Promise<Collection | null>
```

---

### `getAssignedItems(collectionId): Promise<ItemSummary[]>`

Retourneert een lichtgewicht lijst met niet-verwijderde items die aan een collectie zijn toegewezen.

```ts
async getAssignedItems(
  collectionId: string
): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>>
```

Laadt alle items (inclusief verwijderde), filtert op de items waarvan de `collections` array de opgegeven ID bevat, sluit voorlopig verwijderde items uit en retourneert alleen `id`, `name` en `slug`.

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

Werkt een bestaande collectie bij. Het `data`-object moet het veld `id` bevatten.

```ts
async update(data: UpdateCollectionRequest): Promise<Collection>
```

Valideert de lengtebeperkingen voor naam en beschrijving als deze velden zijn opgegeven.

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

De meest complexe bewerking: wijst een reeks items toe aan een verzameling met foutafhandeling in transactionele stijl.

```ts
async assignItems(
  collectionId: string,
  itemSlugs: string[]
): Promise<{ collection: Collection; updatedItems: number }>
```

**Verwerkingsstroom:**

1. **Zoek verzameling** -- gooit indien niet gevonden
2. **Ontdubbel** inkomende slugs
3. **Verschilberekening** - vergelijkt huidige items met nieuwe items om slugs te identificeren die moeten worden toegevoegd en slugs die moeten worden verwijderd
4. **Batch laden** -- laadt alleen de items die moeten worden gewijzigd via `findManyBySlugs`
5. **Build-updates** -- voor items die worden toegevoegd, wordt de collectie-ID toegevoegd aan hun `collections` array; voor items die worden verwijderd, splitst deze eruit
6. **Persist collection** - schrijft eerst de bijgewerkte verzameling
7. **Batch-update items** -- roept `itemRepository.batchUpdate` op voor alle gewijzigde items
8. **Terugdraaien bij mislukking**: als itemupdates mislukken, wordt geprobeerd de verzameling terug te zetten naar de vorige staat

Retourneert de blijvende verzameling en het aantal items dat daadwerkelijk is gewijzigd.

---

## Singleton Export

```ts
export const collectionRepository = new CollectionRepository();
```

A pre-instantiated singleton is exported for convenience.

---

## Validatieconstanten

De repository verwijst naar `COLLECTION_VALIDATION` van `@/types/collection`:

|Constant|Doel|
|----------|---------|
|`ID_MIN_LENGTH`|Minimale lengte van verzamelings-ID|
|`ID_MAX_LENGTH`|Maximale lengte van verzamelings-ID|
|`NAME_MIN_LENGTH`|Minimale lengte van de collectienaam|
|`NAME_MAX_LENGTH`|Maximale lengte van de collectienaam|
|`DESCRIPTION_MAX_LENGTH`|Maximale beschrijvingslengte|

---

## Error Handling

- **Validation errors** throw immediately with descriptive messages
- **Not-found errors** throw `Error("Collection with ID ... not found")`
- **Assignment rollback** -- if `batchUpdate` fails after the collection was already saved, the repository attempts to restore the collection to its previous state; if the rollback itself fails, the error is logged

---

## Gebruiksvoorbeeld

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
