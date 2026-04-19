---
id: collection-repository
title: Référentiel de collections
sidebar_label: Référentiel de collections
sidebar_position: 20
---

# Référentiel de collections

Le `CollectionRepository` gère des collections d'éléments organisées. Il fournit des opérations CRUD pour les collections stockées dans un référentiel soutenu par Git et gère la relation bidirectionnelle entre les collections et les éléments, y compris l'attribution d'éléments par lots avec prise en charge de la restauration.

**Fichier source :** `template/lib/repositories/collection.repository.ts`

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

## Définition de classe

```ts
export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();
}
```

### Dépendances

|Importer|Objectif|
|--------|---------|
|`Collection`, `CreateCollectionRequest`, `UpdateCollectionRequest`|Définitions de types|
|`CollectionListOptions`, `COLLECTION_VALIDATION`|Options et constantes de validation|
|`createCollectionGitService` / `CollectionGitService`|Stockage Git pour les collections|
|`ItemRepository`|Opérations sur les éléments inter-entités|
|`ItemData`, `UpdateItemRequest`|Types d'éléments pour l'affectation|

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

Renvoie les collections paginées à l’aide du découpage en mémoire après avoir appliqué les filtres `findAll`.

```ts
async findAllPaginated(options?: CollectionListOptions): Promise<{
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Valeurs par défaut : `page = 1`, `limit = 10`.

---

### `findById(id): Promise<Collection | null>`

Retrieves a single collection by its unique ID, enriched with `item_count`.

```ts
async findById(id: string): Promise<Collection | null>
```

---

### `getAssignedItems(collectionId): Promise<ItemSummary[]>`

Renvoie une liste légère d'éléments non supprimés affectés à une collection.

```ts
async getAssignedItems(
  collectionId: string
): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>>
```

Charge tous les éléments (y compris ceux supprimés), filtre ceux dont le tableau `collections` contient l'ID donné, exclut les éléments supprimés de manière logicielle et renvoie uniquement `id`, `name` et `slug`.

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

Met à jour une collection existante. L'objet `data` doit inclure le champ `id`.

```ts
async update(data: UpdateCollectionRequest): Promise<Collection>
```

Valide les contraintes de longueur de nom et de description si ces champs sont fournis.

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

L'opération la plus complexe consiste à attribuer un ensemble d'éléments à une collection avec une gestion des erreurs de style transactionnel.

```ts
async assignItems(
  collectionId: string,
  itemSlugs: string[]
): Promise<{ collection: Collection; updatedItems: number }>
```

**Flux de traitement :**

1. **Trouver la collection** - lance si elle n'est pas trouvée
2. **Dédupliquer** les slugs entrants
3. **Calcul différentiel** : compare les éléments actuels aux nouveaux éléments pour identifier les slugs à ajouter et ceux à supprimer.
4. **Chargement par lots** -- charge uniquement les éléments qui nécessitent des modifications via `findManyBySlugs`
5. **Construire des mises à jour** -- pour les éléments ajoutés, ajoute l'ID de collection à leur tableau `collections` ; pour les éléments à supprimer, séparez-les
6. **Collection persistante** -- écrit d'abord la collection mise à jour
7. **Éléments de mise à jour par lots** -- appelle `itemRepository.batchUpdate` pour tous les éléments modifiés
8. **Rollback en cas d'échec** : si les mises à jour des éléments échouent, tente de rétablir la collection à son état précédent.

Renvoie la collection persistante et le nombre d'éléments réellement modifiés.

---

## Singleton Export

```ts
export const collectionRepository = new CollectionRepository();
```

A pre-instantiated singleton is exported for convenience.

---

## Constantes de validation

Le référentiel fait référence à `COLLECTION_VALIDATION` à partir de `@/types/collection` :

|Constante|Objectif|
|----------|---------|
|`ID_MIN_LENGTH`|Longueur minimale de l'identifiant de collection|
|`ID_MAX_LENGTH`|Longueur maximale de l'ID de collection|
|`NAME_MIN_LENGTH`|Longueur minimale du nom de collection|
|`NAME_MAX_LENGTH`|Longueur maximale du nom de collection|
|`DESCRIPTION_MAX_LENGTH`|Longueur maximale de la description|

---

## Error Handling

- **Validation errors** throw immediately with descriptive messages
- **Not-found errors** throw `Error("Collection with ID ... not found")`
- **Assignment rollback** -- if `batchUpdate` fails after the collection was already saved, the repository attempts to restore the collection to its previous state; if the rollback itself fails, the error is logged

---

## Exemple d'utilisation

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
