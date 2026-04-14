---
id: collection-repository
title: Repository della raccolta
sidebar_label: Repository della raccolta
sidebar_position: 20
---

# Repository della raccolta

`CollectionRepository` gestisce raccolte curate di articoli. Fornisce operazioni CRUD per raccolte archiviate in un repository supportato da Git e gestisce la relazione bidirezionale tra raccolte ed elementi, inclusa l'assegnazione di elementi batch con supporto di rollback.

**File sorgente:** `template/lib/repositories/collection.repository.ts`

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

## Definizione di classe

```ts
export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();
}
```

### Dipendenze

|Importa|Scopo|
|--------|---------|
|`Collection`, `CreateCollectionRequest`, `UpdateCollectionRequest`|Definizioni di tipo|
|`CollectionListOptions`, `COLLECTION_VALIDATION`|Opzioni e costanti di validazione|
|`createCollectionGitService` / `CollectionGitService`|Spazio di archiviazione Git per le raccolte|
|`ItemRepository`|Operazioni su elementi tra entità|
|`ItemData`, `UpdateItemRequest`|Tipi di elementi per l'assegnazione|

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

Restituisce raccolte impaginate utilizzando la suddivisione in memoria dopo aver applicato i filtri `findAll`.

```ts
async findAllPaginated(options?: CollectionListOptions): Promise<{
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Impostazioni predefinite: `page = 1`, `limit = 10`.

---

### `findById(id): Promise<Collection | null>`

Retrieves a single collection by its unique ID, enriched with `item_count`.

```ts
async findById(id: string): Promise<Collection | null>
```

---

### `getAssignedItems(collectionId): Promise<ItemSummary[]>`

Restituisce un elenco leggero di elementi non eliminati assegnati a una raccolta.

```ts
async getAssignedItems(
  collectionId: string
): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>>
```

Carica tutti gli elementi (compresi quelli eliminati), filtra quelli il cui array `collections` contiene l'ID specificato, esclude gli elementi eliminati temporaneamente e restituisce solo `id`, `name` e `slug`.

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

Aggiorna una raccolta esistente. L'oggetto `data` deve includere il campo `id`.

```ts
async update(data: UpdateCollectionRequest): Promise<Collection>
```

Convalida i vincoli di lunghezza del nome e della descrizione se tali campi vengono forniti.

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

L'operazione più complessa: assegna un insieme di elementi a una raccolta con gestione degli errori in stile transazionale.

```ts
async assignItems(
  collectionId: string,
  itemSlugs: string[]
): Promise<{ collection: Collection; updatedItems: number }>
```

**Flusso di elaborazione:**

1. **Trova raccolta** -- lancia se non viene trovata
2. **Deduplica** gli slug in entrata
3. **Calcolo delle differenze**: confronta gli elementi correnti con quelli nuovi per identificare gli slug da aggiungere e gli slug da rimuovere
4. **Caricamento batch**: carica solo gli elementi che necessitano di modifiche tramite `findManyBySlugs`
5. **Aggiornamenti build** -- per gli elementi aggiunti, aggiunge l'ID della raccolta all'array `collections`; per gli elementi rimossi, li unisce
6. **Raccolta persistente**: scrive prima la raccolta aggiornata
7. **Elementi di aggiornamento batch** -- chiama `itemRepository.batchUpdate` per tutti gli elementi modificati
8. **Rollback in caso di errore**: se gli aggiornamenti degli elementi falliscono, tenta di ripristinare lo stato precedente della raccolta

Restituisce la raccolta persistente e il numero di elementi effettivamente modificati.

---

## Singleton Export

```ts
export const collectionRepository = new CollectionRepository();
```

A pre-instantiated singleton is exported for convenience.

---

## Costanti di validazione

Il repository fa riferimento a `COLLECTION_VALIDATION` da `@/types/collection`:

|Costante|Scopo|
|----------|---------|
|`ID_MIN_LENGTH`|Lunghezza minima dell'ID raccolta|
|`ID_MAX_LENGTH`|Lunghezza massima dell'ID raccolta|
|`NAME_MIN_LENGTH`|Lunghezza minima del nome della raccolta|
|`NAME_MAX_LENGTH`|Lunghezza massima del nome della raccolta|
|`DESCRIPTION_MAX_LENGTH`|Lunghezza massima della descrizione|

---

## Error Handling

- **Validation errors** throw immediately with descriptive messages
- **Not-found errors** throw `Error("Collection with ID ... not found")`
- **Assignment rollback** -- if `batchUpdate` fails after the collection was already saved, the repository attempts to restore the collection to its previous state; if the rollback itself fails, the error is logged

---

## Esempio di utilizzo

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
