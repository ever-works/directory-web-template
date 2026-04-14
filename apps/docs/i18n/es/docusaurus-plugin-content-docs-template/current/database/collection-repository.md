---
id: collection-repository
title: Repositorio de colecciones
sidebar_label: Repositorio de colecciones
sidebar_position: 20
---

# Repositorio de colecciones

El `CollectionRepository` gestiona colecciones seleccionadas de artículos. Proporciona operaciones CRUD para colecciones almacenadas en un repositorio respaldado por Git y maneja la relación bidireccional entre colecciones y elementos, incluida la asignación de elementos por lotes con soporte de reversión.

**Archivo fuente:** `template/lib/repositories/collection.repository.ts`

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

## Definición de clase

```ts
export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();
}
```

### Dependencias

|Importar|Propósito|
|--------|---------|
|`Collection`, `CreateCollectionRequest`, `UpdateCollectionRequest`|Definiciones de tipos|
|`CollectionListOptions`, `COLLECTION_VALIDATION`|Opciones y constantes de validación.|
|`createCollectionGitService` / `CollectionGitService`|Almacenamiento Git para colecciones.|
|`ItemRepository`|Operaciones de artículos entre entidades|
|`ItemData`, `UpdateItemRequest`|Tipos de elementos para asignación|

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

Devuelve colecciones paginadas usando cortes en memoria después de aplicar filtros `findAll`.

```ts
async findAllPaginated(options?: CollectionListOptions): Promise<{
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Valores predeterminados: `page = 1`, `limit = 10`.

---

### `findById(id): Promise<Collection | null>`

Retrieves a single collection by its unique ID, enriched with `item_count`.

```ts
async findById(id: string): Promise<Collection | null>
```

---

### `getAssignedItems(collectionId): Promise<ItemSummary[]>`

Devuelve una lista ligera de elementos no eliminados asignados a una colección.

```ts
async getAssignedItems(
  collectionId: string
): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>>
```

Carga todos los elementos (incluidos los eliminados), filtra aquellos cuya matriz `collections` contiene el ID proporcionado, excluye los elementos eliminados temporalmente y devuelve solo `id`, `name` y `slug`.

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

Actualiza una colección existente. El objeto `data` debe incluir el campo `id`.

```ts
async update(data: UpdateCollectionRequest): Promise<Collection>
```

Valida las restricciones de longitud del nombre y la descripción si se proporcionan esos campos.

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

La operación más compleja: asigna un conjunto de elementos a una colección con manejo de errores de estilo transaccional.

```ts
async assignItems(
  collectionId: string,
  itemSlugs: string[]
): Promise<{ collection: Collection; updatedItems: number }>
```

**Flujo de procesamiento:**

1. **Buscar colección** -- arroja si no se encuentra
2. **Deduplicar** slugs entrantes
3. **Cálculo de diferencias**: compara elementos actuales con elementos nuevos para identificar babosas que agregar y babosas que eliminar
4. **Carga por lotes**: carga solo los elementos que necesitan cambios a través de `findManyBySlugs`
5. **Actualizaciones de compilación**: para los elementos que se agregan, agrega el ID de la colección a su matriz `collections`; para los elementos que se eliminan, los empalma
6. **Colección persistente**: primero escribe la colección actualizada.
7. **Elementos de actualización por lotes**: llama a `itemRepository.batchUpdate` para todos los elementos modificados.
8. **Revertir en caso de error**: si las actualizaciones de elementos fallan, se intenta revertir la colección a su estado anterior.

Devuelve la colección persistente y la cantidad de elementos que realmente se modificaron.

---

## Singleton Export

```ts
export const collectionRepository = new CollectionRepository();
```

A pre-instantiated singleton is exported for convenience.

---

## Constantes de validación

El repositorio hace referencia a `COLLECTION_VALIDATION` de `@/types/collection`:

|constante|Propósito|
|----------|---------|
|`ID_MIN_LENGTH`|Longitud mínima del ID de colección|
|`ID_MAX_LENGTH`|Longitud máxima del ID de colección|
|`NAME_MIN_LENGTH`|Longitud mínima del nombre de la colección|
|`NAME_MAX_LENGTH`|Longitud máxima del nombre de la colección|
|`DESCRIPTION_MAX_LENGTH`|Longitud máxima de la descripción|

---

## Error Handling

- **Validation errors** throw immediately with descriptive messages
- **Not-found errors** throw `Error("Collection with ID ... not found")`
- **Assignment rollback** -- if `batchUpdate` fails after the collection was already saved, the repository attempts to restore the collection to its previous state; if the rollback itself fails, the error is logged

---

## Ejemplo de uso

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
