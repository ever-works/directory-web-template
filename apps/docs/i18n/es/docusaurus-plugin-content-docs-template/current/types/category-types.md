---
id: category-types
title: Definiciones de tipos de categorías
sidebar_label: Tipos de categorías
sidebar_position: 3
---

# Definiciones de tipos de categorías

**Fuente:** `lib/types/category.ts`

Las categorías se utilizan para organizar elementos en grupos lógicos. La plantilla utiliza un sistema basado en archivos donde las categorías se almacenan como datos estructurados y se hace referencia a ellas mediante elementos.

## Interfaces

### `CategoryData`

La estructura de datos de categorías principales con campos mínimos.

```typescript
interface CategoryData {
  id: string;
  name: string;
}
```

- `id`: identificador único para la categoría (normalmente un slug como `"developer-tools"`)
- `name`: nombre para mostrar legible por humanos (por ejemplo, `"Developer Tools"`)

### `CategoryWithCount`

Datos de categoría extendidos que incluyen el recuento de elementos y el estado activo, utilizados en paneles de administración y listados de categorías.

```typescript
interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}
```

- `count` - Número de elementos asignados a esta categoría
- `isInactive`: si la categoría existe en la configuración pero no tiene elementos asignados

### `CreateCategoryRequest`

Carga útil para crear una nueva categoría.

```typescript
interface CreateCategoryRequest {
  id: string;
  name: string;
}
```

### `UpdateCategoryRequest`

Carga útil para actualizar una categoría existente. Extiende `Partial<CreateCategoryRequest>`, por lo que solo es necesario proporcionar los campos que se están cambiando, pero `id` siempre es obligatorio.

```typescript
interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}
```

### `CategoryListResponse`

Respuesta paginada para consultas de lista de categorías.

```typescript
interface CategoryListResponse {
  categories: CategoryWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `CategoryResponse`

Sobre de respuesta para operaciones de categoría única.

```typescript
interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}
```

### `CategoryListOptions`

Parámetros de consulta para filtrar y paginar listas de categorías.

```typescript
interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

- `includeInactive` - Cuando `true`, incluye categorías que no tienen elementos
- `sortBy` - Ordenar por nombre de categoría o ID
- El orden de clasificación predeterminado es ascendente por nombre

## Constantes

### `CATEGORY_VALIDATION`

Restricciones de validación para campos de categoría:

```typescript
const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

## Ejemplos de uso

### Creando una categoría

```typescript
import type { CreateCategoryRequest } from '@/lib/types/category';
import { CATEGORY_VALIDATION } from '@/lib/types/category';

function validateCategoryName(name: string): boolean {
  return (
    name.length >= CATEGORY_VALIDATION.NAME_MIN_LENGTH &&
    name.length <= CATEGORY_VALIDATION.NAME_MAX_LENGTH
  );
}

const newCategory: CreateCategoryRequest = {
  id: 'developer-tools',
  name: 'Developer Tools',
};
```

### Listado de categorías con opciones

```typescript
import type { CategoryListOptions } from '@/lib/types/category';

const options: CategoryListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

### Mostrando categorías con recuentos

```typescript
import type { CategoryWithCount } from '@/lib/types/category';

function renderCategoryList(categories: CategoryWithCount[]) {
  return categories
    .filter(cat => !cat.isInactive)
    .map(cat => ({
      label: `${cat.name} (${cat.count ?? 0})`,
      value: cat.id,
    }));
}
```

### Actualizar una categoría

```typescript
import type { UpdateCategoryRequest } from '@/lib/types/category';

const update: UpdateCategoryRequest = {
  id: 'developer-tools',
  name: 'Dev Tools & Utilities',
};
```

## Tipos relacionados

- [`ItemData.category`](./item-types.md) hace referencia a los ID de categoría (admite `string | string[]`)
- [`TagData`](./category-types.md) sigue un patrón similar para las etiquetas
- [`ItemListOptions.categories`](./item-types.md) acepta una serie de ID de categoría para filtrar
