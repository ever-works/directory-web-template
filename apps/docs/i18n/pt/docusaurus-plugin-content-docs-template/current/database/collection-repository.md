---
id: collection-repository
title: Repositório de Coleções
sidebar_label: Repositório de Coleções
sidebar_position: 20
---

# Repositório de Coleções

O `CollectionRepository` gerencia coleções selecionadas de itens. Ele fornece operações CRUD para coleções armazenadas em um repositório apoiado por Git e lida com o relacionamento bidirecional entre coleções e itens, incluindo atribuição de itens em lote com suporte para reversão.

**Arquivo fonte:** `template/lib/repositories/collection.repository.ts`

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

## Definição de classe

```ts
export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();
}
```

### Dependências

|Importar|Objetivo|
|--------|---------|
|`Collection`, `CreateCollectionRequest`, `UpdateCollectionRequest`|Definições de tipo|
|`CollectionListOptions`, `COLLECTION_VALIDATION`|Opções e constantes de validação|
|`createCollectionGitService` / `CollectionGitService`|Armazenamento Git para coleções|
|`ItemRepository`|Operações de itens entre entidades|
|`ItemData`, `UpdateItemRequest`|Tipos de itens para atribuição|

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

Retorna coleções paginadas usando fatiamento na memória após aplicar filtros `findAll`.

```ts
async findAllPaginated(options?: CollectionListOptions): Promise<{
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Padrões: `page = 1`, `limit = 10`.

---

### `findById(id): Promise<Collection | null>`

Retrieves a single collection by its unique ID, enriched with `item_count`.

```ts
async findById(id: string): Promise<Collection | null>
```

---

### `getAssignedItems(collectionId): Promise<ItemSummary[]>`

Retorna uma lista leve de itens não excluídos atribuídos a uma coleção.

```ts
async getAssignedItems(
  collectionId: string
): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>>
```

Carrega todos os itens (incluindo os excluídos), filtra aqueles cuja matriz `collections` contém o ID fornecido, exclui itens excluídos de forma reversível e retorna apenas `id`, `name` e `slug`.

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

Atualiza uma coleção existente. O objeto `data` deve incluir o campo `id`.

```ts
async update(data: UpdateCollectionRequest): Promise<Collection>
```

Valida restrições de comprimento de nome e descrição se esses campos forem fornecidos.

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

A operação mais complexa – atribui um conjunto de itens a uma coleção com tratamento de erros no estilo transacional.

```ts
async assignItems(
  collectionId: string,
  itemSlugs: string[]
): Promise<{ collection: Collection; updatedItems: number }>
```

**Fluxo de processamento:**

1. **Encontrar coleção** -- lança se não for encontrado
2. **Desduplicar** slugs recebidos
3. **Cálculo de diferenças** - compara os itens atuais com os novos itens para identificar slugs a serem adicionados e slugs a serem removidos
4. **Carregamento em lote** – carrega apenas os itens que precisam de alterações via `findManyBySlugs`
5. **Atualizações de compilação** -- para itens sendo adicionados, anexa o ID da coleção ao array `collections`; para itens sendo removidos, emenda-os
6. **Persistir coleção** – escreve a coleção atualizada primeiro
7. **Itens de atualização em lote** – chama `itemRepository.batchUpdate` para todos os itens alterados
8. **Reversão em caso de falha** – se as atualizações do item falharem, tenta reverter a coleção ao seu estado anterior

Retorna a coleção persistida e o número de itens que foram realmente modificados.

---

## Singleton Export

```ts
export const collectionRepository = new CollectionRepository();
```

A pre-instantiated singleton is exported for convenience.

---

## Constantes de validação

O repositório faz referência a `COLLECTION_VALIDATION` de `@/types/collection`:

|Constante|Objetivo|
|----------|---------|
|`ID_MIN_LENGTH`|Comprimento mínimo do ID da coleção|
|`ID_MAX_LENGTH`|Comprimento máximo do ID da coleção|
|`NAME_MIN_LENGTH`|Comprimento mínimo do nome da coleção|
|`NAME_MAX_LENGTH`|Comprimento máximo do nome da coleção|
|`DESCRIPTION_MAX_LENGTH`|Comprimento máximo da descrição|

---

## Error Handling

- **Validation errors** throw immediately with descriptive messages
- **Not-found errors** throw `Error("Collection with ID ... not found")`
- **Assignment rollback** -- if `batchUpdate` fails after the collection was already saved, the repository attempts to restore the collection to its previous state; if the rollback itself fails, the error is logged

---

## Exemplo de uso

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
