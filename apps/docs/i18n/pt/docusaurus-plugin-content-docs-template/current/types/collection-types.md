---
id: collection-types
title: Definições de tipo de coleção
sidebar_label: Tipos de coleção
sidebar_position: 15
---

# Definições de tipo de coleção

**Fonte:** `types/collection.ts`

As coleções são grupos selecionados de itens organizados por tema. Eles permitem que os administradores criem listas escolhidas a dedo, como "Principais escolhas", "Novidades desta semana" ou "Melhores para empresas".

## Interfaces

### `Collection`

A estrutura de dados da coleção primária.

```typescript
interface Collection {
  id: string;              // Unique identifier (slug-friendly)
  slug: string;            // URL-safe slug
  name: string;            // Display name
  description: string;     // Collection description
  icon_url?: string;       // Optional icon/image URL
  item_count: number;      // Number of items in collection
  items?: string[];        // Array of item IDs assigned to this collection
  isActive: boolean;       // Whether the collection is publicly visible
  created_at?: string;     // ISO 8601 creation timestamp
  updated_at?: string;     // ISO 8601 last update timestamp
}
```

|Campo|Tipo|Descrição|
|-------|------|-------------|
|`id`|`string`|Identificador exclusivo, 3 a 50 caracteres|
|`slug`|`string`|Versão do nome segura para URL|
|`name`|`string`|Nome de exibição, 2 a 100 caracteres|
|`description`|`string`|Descrição em texto simples, máximo de 500 caracteres|
|`icon_url`|`string?`|URL para um ícone ou imagem de capa|
|`item_count`|`number`|Contagem computada de itens atribuídos|
|`items`|`string[]?`|IDs de itens; preenchido apenas quando solicitado|
|`isActive`|`boolean`|Controla a visibilidade pública|

### `CreateCollectionRequest`

Carga útil para criar uma nova coleção.

```typescript
interface CreateCollectionRequest {
  id: string;
  name: string;
  slug?: string;         // Auto-generated from name if omitted
  description?: string;
  icon_url?: string;
  isActive?: boolean;    // Defaults to true
}
```

### `UpdateCollectionRequest`

Carga útil para atualizar uma coleção existente. Todos os campos, exceto `id`, são opcionais.

```typescript
interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}
```

### `AssignCollectionItemsRequest`

Carga útil para atribuir itens a uma coleção.

```typescript
interface AssignCollectionItemsRequest {
  itemIds: string[];  // Array of item IDs to assign
}
```

### `CollectionListOptions`

Parâmetros de consulta para listar coleções.

```typescript
interface CollectionListOptions {
  includeInactive?: boolean;                          // Default: false
  search?: string;                                     // Filter by name
  sortBy?: 'name' | 'item_count' | 'created_at';     // Default: 'name'
  sortOrder?: 'asc' | 'desc';                         // Default: 'asc'
  page?: number;                                       // Default: 1
  limit?: number;                                      // Default: 20
}
```

## Tipos de resposta

### `CollectionsResponse`

Retornado ao listar diversas coleções.

```typescript
interface CollectionsResponse {
  collections: Collection[];
  total: number;            // Total matching collections
}
```

### `CollectionDetailResponse`

Retornado ao buscar uma única coleção com seus itens.

```typescript
interface CollectionDetailResponse {
  collection: Collection;
  items: any[];             // Item objects matching collection.items
  total: number;            // Total items in collection
}
```

## Regras de validação

```typescript
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
```

|Campo|Regra|
|-------|------|
|`id`|De 3 a 50 caracteres, deve ser exclusivo|
|`name`|2-100 caracteres|
|`description`|Máximo de 500 caracteres|

## Exemplo de uso

```typescript
import type {
  Collection,
  CreateCollectionRequest,
  CollectionListOptions,
} from '@/types/collection';

// Create a collection
const newCollection: CreateCollectionRequest = {
  id: 'top-picks-2025',
  name: 'Top Picks 2025',
  description: 'Our favourite tools this year.',
  isActive: true,
};

// List with filtering
const options: CollectionListOptions = {
  search: 'top',
  sortBy: 'item_count',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
};
```

## Tipos Relacionados

- [Tipos de item](./item-types.md) - itens que pertencem a coleções
- [Tipos de tags](./tag-types.md) – tags como um modelo organizacional alternativo
