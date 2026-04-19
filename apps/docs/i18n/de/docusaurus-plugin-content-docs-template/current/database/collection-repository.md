---
id: collection-repository
title: Sammlungs-Repository
sidebar_label: Sammlungs-Repository
sidebar_position: 20
---

# Sammlungs-Repository

Das `CollectionRepository` verwaltet kuratierte Objektsammlungen. Es stellt CRUD-Operationen für Sammlungen bereit, die in einem Git-gestützten Repository gespeichert sind, und verwaltet die bidirektionale Beziehung zwischen Sammlungen und Elementen, einschließlich der Zuweisung von Batch-Elementen mit Rollback-Unterstützung.

**Quelldatei:** `template/lib/repositories/collection.repository.ts`

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

## Klassendefinition

```ts
export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();
}
```

### Abhängigkeiten

|Importieren|Zweck|
|--------|---------|
|`Collection`, `CreateCollectionRequest`, `UpdateCollectionRequest`|Typdefinitionen|
|`CollectionListOptions`, `COLLECTION_VALIDATION`|Optionen und Validierungskonstanten|
|`createCollectionGitService` / `CollectionGitService`|Git-Speicher für Sammlungen|
|`ItemRepository`|Entitätsübergreifende Artikeloperationen|
|`ItemData`, `UpdateItemRequest`|Elementtypen für die Zuweisung|

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

Gibt paginierte Sammlungen mithilfe von In-Memory-Slicing zurück, nachdem `findAll`-Filter angewendet wurden.

```ts
async findAllPaginated(options?: CollectionListOptions): Promise<{
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Standardwerte: `page = 1`, `limit = 10`.

---

### `findById(id): Promise<Collection | null>`

Retrieves a single collection by its unique ID, enriched with `item_count`.

```ts
async findById(id: string): Promise<Collection | null>
```

---

### `getAssignedItems(collectionId): Promise<ItemSummary[]>`

Gibt eine übersichtliche Liste nicht gelöschter Elemente zurück, die einer Sammlung zugewiesen sind.

```ts
async getAssignedItems(
  collectionId: string
): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>>
```

Lädt alle Elemente (einschließlich gelöschter Elemente), filtert nach denen, deren `collections`-Array die angegebene ID enthält, schließt vorläufig gelöschte Elemente aus und gibt nur `id`, `name` und `slug` zurück.

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

Aktualisiert eine vorhandene Sammlung. Das Objekt `data` muss das Feld `id` enthalten.

```ts
async update(data: UpdateCollectionRequest): Promise<Collection>
```

Überprüft Namens- und Beschreibungslängenbeschränkungen, wenn diese Felder bereitgestellt werden.

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

Der komplexeste Vorgang besteht darin, einer Sammlung eine Reihe von Elementen mit Fehlerbehandlung im Transaktionsstil zuzuweisen.

```ts
async assignItems(
  collectionId: string,
  itemSlugs: string[]
): Promise<{ collection: Collection; updatedItems: number }>
```

**Verarbeitungsablauf:**

1. **Sammlung finden** – wird ausgeführt, wenn sie nicht gefunden wird
2. **Deduplizieren** eingehende Slugs
3. **Diff-Berechnung** – vergleicht aktuelle Elemente mit neuen Elementen, um hinzuzufügende Slugs und zu entfernende Slugs zu identifizieren
4. **Batch-Laden** – lädt nur die Elemente, die geändert werden müssen, über `findManyBySlugs`
5. **Build-Updates** – für hinzugefügte Elemente wird die Sammlungs-ID an ihr `collections`-Array angehängt; Bei zu entfernenden Gegenständen wird es ausgespleißt
6. **Sammlung beibehalten** – schreibt zuerst die aktualisierte Sammlung
7. **Batch-Aktualisierungselemente** – ruft `itemRepository.batchUpdate` für alle geänderten Elemente auf
8. **Rollback bei Fehler** – wenn Elementaktualisierungen fehlschlagen, wird versucht, die Sammlung auf ihren vorherigen Zustand zurückzusetzen

Gibt die persistente Sammlung und die Anzahl der tatsächlich geänderten Elemente zurück.

---

## Singleton Export

```ts
export const collectionRepository = new CollectionRepository();
```

A pre-instantiated singleton is exported for convenience.

---

## Validierungskonstanten

Das Repository verweist auf `COLLECTION_VALIDATION` von `@/types/collection`:

|Konstant|Zweck|
|----------|---------|
|`ID_MIN_LENGTH`|Mindestlänge der Sammlungs-ID|
|`ID_MAX_LENGTH`|Maximale Länge der Sammlungs-ID|
|`NAME_MIN_LENGTH`|Mindestlänge des Sammlungsnamens|
|`NAME_MAX_LENGTH`|Maximale Länge des Sammlungsnamens|
|`DESCRIPTION_MAX_LENGTH`|Maximale Beschreibungslänge|

---

## Error Handling

- **Validation errors** throw immediately with descriptive messages
- **Not-found errors** throw `Error("Collection with ID ... not found")`
- **Assignment rollback** -- if `batchUpdate` fails after the collection was already saved, the repository attempts to restore the collection to its previous state; if the rollback itself fails, the error is logged

---

## Anwendungsbeispiel

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
