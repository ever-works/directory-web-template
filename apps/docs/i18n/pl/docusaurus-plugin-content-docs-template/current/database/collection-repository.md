---
id: collection-repository
title: Repozytorium kolekcji
sidebar_label: Repozytorium kolekcji
sidebar_position: 20
---

# Repozytorium kolekcji

`CollectionRepository` zarządza wyselekcjonowanymi kolekcjami przedmiotów. Zapewnia operacje CRUD dla kolekcji przechowywanych w repozytorium opartym na Git i obsługuje dwukierunkową relację między kolekcjami i elementami, w tym przypisywanie elementów wsadowych z obsługą wycofywania zmian.

**Plik źródłowy:** `template/lib/repositories/collection.repository.ts`

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

## Definicja klasy

```ts
export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();
}
```

### Zależności

|Importuj|Cel|
|--------|---------|
|`Collection`, `CreateCollectionRequest`, `UpdateCollectionRequest`|Definicje typów|
|`CollectionListOptions`, `COLLECTION_VALIDATION`|Opcje i stałe walidacyjne|
|`createCollectionGitService` / `CollectionGitService`|Git do przechowywania kolekcji|
|`ItemRepository`|Operacje na elementach między podmiotami|
|`ItemData`, `UpdateItemRequest`|Typy elementów do przypisania|

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

Zwraca kolekcje podzielone na strony przy użyciu dzielenia w pamięci po zastosowaniu filtrów `findAll`.

```ts
async findAllPaginated(options?: CollectionListOptions): Promise<{
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Wartości domyślne: `page = 1`, `limit = 10`.

---

### `findById(id): Promise<Collection | null>`

Retrieves a single collection by its unique ID, enriched with `item_count`.

```ts
async findById(id: string): Promise<Collection | null>
```

---

### `getAssignedItems(collectionId): Promise<ItemSummary[]>`

Zwraca uproszczoną listę nieusuniętych elementów przypisanych do kolekcji.

```ts
async getAssignedItems(
  collectionId: string
): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>>
```

Ładuje wszystkie elementy (w tym usunięte), filtruje te, których tablica `collections` zawiera podany identyfikator, wyklucza elementy usunięte nietrwało i zwraca tylko `id`, `name` i `slug`.

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

Aktualizuje istniejącą kolekcję. Obiekt `data` musi zawierać pole `id`.

```ts
async update(data: UpdateCollectionRequest): Promise<Collection>
```

Sprawdza ograniczenia długości nazwy i opisu, jeśli podano te pola.

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

Najbardziej złożona operacja — przypisuje zestaw elementów do kolekcji z obsługą błędów w stylu transakcyjnym.

```ts
async assignItems(
  collectionId: string,
  itemSlugs: string[]
): Promise<{ collection: Collection; updatedItems: number }>
```

**Przebieg przetwarzania:**

1. **Znajdź kolekcję** – rzuca, jeśli nie zostanie znaleziona
2. **Deduplikuj** przychodzące ślimaki
3. **Obliczenia różnicowe** — porównuje bieżące elementy z nowymi elementami, aby zidentyfikować ślimaki do dodania i elementy do usunięcia
4. **Ładowanie wsadowe** — ładuje tylko te elementy, które wymagają zmian poprzez `findManyBySlugs`
5. **Twórz aktualizacje** — w przypadku dodawanych elementów dołącza identyfikator kolekcji do tablicy `collections`; w przypadku usuwanych elementów łączy je
6. **Trwała kolekcja** — zapisuje najpierw zaktualizowaną kolekcję
7. **Elementy aktualizacji zbiorczej** — wywołuje `itemRepository.batchUpdate` dla wszystkich zmienionych elementów
8. **Wycofywanie w przypadku niepowodzenia** — jeśli aktualizacja elementu się nie powiedzie, próbuje przywrócić kolekcję do poprzedniego stanu

Zwraca utrwaloną kolekcję i liczbę elementów, które zostały faktycznie zmodyfikowane.

---

## Singleton Export

```ts
export const collectionRepository = new CollectionRepository();
```

A pre-instantiated singleton is exported for convenience.

---

## Stałe walidacyjne

Repozytorium odwołuje się do `COLLECTION_VALIDATION` z `@/types/collection`:

|Stała|Cel|
|----------|---------|
|`ID_MIN_LENGTH`|Minimalna długość identyfikatora kolekcji|
|`ID_MAX_LENGTH`|Maksymalna długość identyfikatora kolekcji|
|`NAME_MIN_LENGTH`|Minimalna długość nazwy kolekcji|
|`NAME_MAX_LENGTH`|Maksymalna długość nazwy kolekcji|
|`DESCRIPTION_MAX_LENGTH`|Maksymalna długość opisu|

---

## Error Handling

- **Validation errors** throw immediately with descriptive messages
- **Not-found errors** throw `Error("Collection with ID ... not found")`
- **Assignment rollback** -- if `batchUpdate` fails after the collection was already saved, the repository attempts to restore the collection to its previous state; if the rollback itself fails, the error is logged

---

## Przykład użycia

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
