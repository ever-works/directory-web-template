---
id: collection-types
title: Definiciones de tipos de colección
sidebar_label: Tipos de colección
sidebar_position: 15
---

# Definiciones de tipos de colección

**Fuente:** `types/collection.ts`

Las colecciones son grupos seleccionados de artículos organizados por tema. Permiten a los administradores crear listas cuidadosamente seleccionadas, como "Mejores opciones", "Novedades de esta semana" o "Lo mejor para empresas".

## Interfaces

### `Collection`

La estructura de datos de recopilación primaria.

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

|campo|Tipo|Descripción|
|-------|------|-------------|
|`id`|`string`|Identificador único, de 3 a 50 caracteres|
|`slug`|`string`|Versión segura para URL del nombre|
|`name`|`string`|Nombre para mostrar, entre 2 y 100 caracteres|
|`description`|`string`|Descripción en texto plano, máximo 500 caracteres|
|`icon_url`|`string?`|URL a un icono o imagen de portada|
|`item_count`|`number`|Recuento calculado de elementos asignados|
|`items`|`string[]?`|ID de artículos; sólo se completa cuando se solicita|
|`isActive`|`boolean`|Controla la visibilidad pública|

### `CreateCollectionRequest`

Carga útil para crear una nueva colección.

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

Carga útil para actualizar una colección existente. Todos los campos excepto `id` son opcionales.

```typescript
interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}
```

### `AssignCollectionItemsRequest`

Carga útil para asignar elementos a una colección.

```typescript
interface AssignCollectionItemsRequest {
  itemIds: string[];  // Array of item IDs to assign
}
```

### `CollectionListOptions`

Parámetros de consulta para enumerar colecciones.

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

## Tipos de respuesta

### `CollectionsResponse`

Se devuelve al enumerar varias colecciones.

```typescript
interface CollectionsResponse {
  collections: Collection[];
  total: number;            // Total matching collections
}
```

### `CollectionDetailResponse`

Devuelto al buscar una sola colección con sus artículos.

```typescript
interface CollectionDetailResponse {
  collection: Collection;
  items: any[];             // Item objects matching collection.items
  total: number;            // Total items in collection
}
```

## Reglas de validación

```typescript
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
```

|campo|regla|
|-------|------|
|`id`|3-50 caracteres, debe ser único|
|`name`|2-100 caracteres|
|`description`|Máximo 500 caracteres|

## Ejemplo de uso

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

## Tipos relacionados

- [Tipos de elementos](./item-types.md): elementos que pertenecen a colecciones
- [Tipos de etiquetas](./tag-types.md): etiquetas como modelo organizativo alternativo
