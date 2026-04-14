---
id: tag-types
title: Definiciones de tipos de etiquetas
sidebar_label: Tipos de etiquetas
sidebar_position: 20
---

# Definiciones de tipos de etiquetas

**Fuente:** `lib/types/tag.ts`

Las etiquetas proporcionan un sistema de etiquetado plano para artículos. Se administran a través de la interfaz de administración y se almacenan en el sistema de contenido basado en archivos.

## Interfaces

### `TagData`

La estructura de datos de la etiqueta base.

```typescript
interface TagData {
  id: string;         // Unique tag identifier
  name: string;       // Display name
  isActive: boolean;  // Whether the tag is publicly visible
}
```

|campo|Tipo|Descripción|
|-------|------|-------------|
|`id`|`string`|Identificador estable utilizado en archivos YAML de elementos|
|`name`|`string`|Etiqueta legible por humanos que se muestra en la interfaz de usuario, de 2 a 50 caracteres|
|`isActive`|`boolean`|Las etiquetas inactivas están ocultas de los filtros públicos pero se conservan en los datos|

### `TagWithCount`

Datos de etiquetas ampliados con estadísticas de uso.

```typescript
interface TagWithCount extends TagData {
  count?: number;  // Number of items using this tag
}
```

### `CreateTagRequest`

Carga útil para crear una nueva etiqueta.

```typescript
interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}
```

### `UpdateTagRequest`

Carga útil para actualizar una etiqueta. El `id` no se puede cambiar.

```typescript
type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;
```

### `TagListOptions`

Parámetros de consulta para etiquetas de listado.

```typescript
interface TagListOptions {
  includeInactive?: boolean;           // Default: false
  sortBy?: 'name' | 'id';             // Default: 'name'
  sortOrder?: 'asc' | 'desc';         // Default: 'asc'
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
}
```

## Tipos de respuesta

### `TagListResponse`

Respuesta de lista de etiquetas paginada.

```typescript
interface TagListResponse {
  tags: TagWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `TagResponse`

Resultado de la operación de etiqueta única.

```typescript
interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}
```

## Reglas de validación

```typescript
const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

|campo|regla|
|-------|------|
|`name`|2-50 caracteres|
|`id`|Debe ser único en todas las etiquetas.|

## Etiquetas en el sistema de contenido

Se hace referencia a las etiquetas por ID en los archivos YAML de elementos:

```yaml
# .content/items/my-tool.yml
name: My Tool
tags:
  - open-source
  - productivity
  - saas
```

El repositorio de etiquetas lee las definiciones de etiquetas del repositorio de contenido y las proporciona a la interfaz de usuario del administrador y a los componentes de filtro.

## Integración de filtros

Las etiquetas se integran con el sistema de filtrado del lado del cliente a través de estos componentes:

- `components/filters/components/tags/` -- interfaz de usuario de filtro de etiquetas
- `components/filters/hooks/use-tag-visibility.ts` -- controla qué etiquetas aparecen
- `components/filters/utils/tag-utils.ts` -- funciones auxiliares para el filtrado de etiquetas

## Ejemplo de uso

```typescript
import type {
  TagData,
  CreateTagRequest,
  TagListOptions,
} from '@/lib/types/tag';

// Create a new tag
const newTag: CreateTagRequest = {
  id: 'ai-powered',
  name: 'AI Powered',
  isActive: true,
};

// List active tags sorted by name
const options: TagListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

## Tipos relacionados

- [Tipos de colección](./collection-types.md) -- colecciones como modelo de agrupación alternativo
- [Tipos de elementos](./item-types.md): elementos que hacen referencia a etiquetas
- [Tipos de permiso](./permission-types.md) -- `tags:read`, `tags:create`, etc.
