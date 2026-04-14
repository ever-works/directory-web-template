---
id: category-repository
title: Repositorio de categorías
sidebar_label: Repositorio de categorías
sidebar_position: 21
---

# Repositorio de categorías

El `CategoryRepository` gestiona el ciclo de vida de las categorías de artículos. Las categorías se almacenan como datos YAML en el repositorio de contenido respaldado por Git y proporcionan la taxonomía organizacional principal para los elementos.

**Archivo fuente:** `template/lib/repositories/category.repository.ts`

---

## Architecture Overview

```
Admin Category UI
        |
  API Route / Server Action
        |
  CategoryRepository
        |
  CategoryGitService
        |
  GitHub Repository (categories.yml)
```

> **Note:** This file uses the `'server-only'` import guard to prevent accidental client-side usage.

---

## Definición de clase

```ts
export class CategoryRepository {
  private gitService: any = null;
}
```

### Dependencias

|Importar|Propósito|
|--------|---------|
|`CategoryData`, `CategoryWithCount`|Tipos de categorías base y enriquecidas|
|`CreateCategoryRequest`, `UpdateCategoryRequest`|DTO de mutación|
|`CategoryListOptions`|Opciones de filtrado, clasificación y paginación.|
|`CATEGORY_VALIDATION`|Constantes de restricción de validación|
|`createCategoryGitService`|Fábrica para el servicio de almacenamiento Git|
|`coreConfig`|Configuración centralizada|

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub repository URL
2. Parsing the URL to extract `owner` and `repo`
3. Using `coreConfig.content.ghToken` for authentication
4. Using `coreConfig.content.githubBranch` (default: `"main"`) for the target branch

Throws descriptive errors if configuration is missing or malformed.

---

## Métodos de consulta

### `findAll(options?): Promise<CategoryWithCount[]>`

Devuelve todas las categorías con clasificación opcional.

```ts
async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]>
```

**Comportamiento:**
- Todas las categorías se tratan como activas (el campo `isActive` ha sido eliminado)
- La opción `includeInactive` se acepta por compatibilidad con versiones anteriores, pero no tiene efecto de filtrado.
- Aplica la clasificación a través del método privado `sortCategories`

**Opciones de clasificación:**

|`sortBy`|`sortOrder`|Comportamiento|
|----------|-------------|----------|
|`'name'` (predeterminado)|`'asc'` (predeterminado)|Alfabético AZ|
|`'name'`|`'desc'`|Alfabético Z-A|

---

### `findAllPaginated(options?): Promise<PaginatedResult>`

Returns a paginated subset of categories.

```ts
async findAllPaginated(options?: CategoryListOptions): Promise<{
  categories: CategoryWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Defaults: `page = 1`, `limit = 10`. Applies all filters and sorting from `findAll` before slicing.

---

### `findById(id): Promise<CategoryData | null>`

Recupera una sola categoría por su ID único.

```ts
async findById(id: string): Promise<CategoryData | null>
```

---

### `findBySlug(slug): Promise<CategoryData | null>`

Retrieves a category by slug. Currently delegates to `findById` since the category ID serves as the slug.

```ts
async findBySlug(slug: string): Promise<CategoryData | null>
```

---

## Métodos de mutación

### `create(data): Promise<CategoryData>`

Crea una nueva categoría después de la validación y la verificación de nombres duplicados.

```ts
async create(data: CreateCategoryRequest): Promise<CategoryData>
```

**Pasos de procesamiento:**

1. Valida la entrada a través de `validateCategoryData`
2. Comprueba si hay nombres duplicados a través de `checkDuplicateName`
3. Crea a través de `gitService.createCategory`

**Reglas de validación:**
- `name` debe tener entre `CATEGORY_VALIDATION.NAME_MIN_LENGTH` y `NAME_MAX_LENGTH` caracteres
- `id` debe tener entre 3 y 50 caracteres
- `id` debe coincidir con `/^[a-z0-9-]+$/` (minúsculas, números, guiones únicamente)

---

### `update(data): Promise<CategoryData>`

Updates an existing category. The `data` object must include the `id` field.

```ts
async update(data: UpdateCategoryRequest): Promise<CategoryData>
```

**Processing steps:**

1. Validates update data (ID required, name constraints if provided)
2. If name is changing, checks for duplicate names excluding the current category
3. Updates through `gitService.updateCategory`

---

### `delete(id): Promise<void>`

Realiza una eliminación completa de una categoría del repositorio de Git.

```ts
async delete(id: string): Promise<void>
```

Delegados a `hardDelete(id)`.

---

### `hardDelete(id): Promise<void>`

Permanently removes a category from the Git repository.

```ts
async hardDelete(id: string): Promise<void>
```

---

### `reorder(categoryIds): Promise<void>`

Reordena las categorías según la matriz de ID proporcionada.

```ts
async reorder(categoryIds: string[]): Promise<void>
```

**Pasos de procesamiento:**

1. Lee todas las categorías actuales
2. Los reordena para que coincidan con la secuencia de identificación proporcionada
3. Agrega cualquier categoría no incluida en la lista de reorden
4. Escribe la lista reordenada a través de `gitService.writeCategories`

---

## Private Helper Methods

### `validateCategoryData(data: CreateCategoryRequest): void`

Validates creation data:
- Name length within `CATEGORY_VALIDATION` bounds
- ID between 3 and 50 characters
- ID matches lowercase alphanumeric with hyphens pattern

### `validateUpdateData(data: UpdateCategoryRequest): void`

Validates update data:
- ID is required
- Name constraints enforced if name is provided

### `checkDuplicateName(name, excludeId?): Promise<void>`

Performs a case-insensitive duplicate check across all existing categories. Throws `Error('Category with name "..." already exists')` if a duplicate is found. Optionally excludes a specific category ID (for updates).

### `sortCategories(categories, options): CategoryData[]`

Sorts categories by the specified field and order. Currently supports sorting by `name` only.

---

## Exportación única

```ts
export const categoryRepository = new CategoryRepository();
```

---

## Usage Example

```ts
import { categoryRepository } from '@/lib/repositories/category.repository';

// List all categories sorted alphabetically
const categories = await categoryRepository.findAll({
  sortBy: 'name',
  sortOrder: 'asc',
});

// Create a new category
const newCat = await categoryRepository.create({
  id: 'developer-tools',
  name: 'Developer Tools',
  description: 'Tools for software developers',
});

// Paginated listing
const page = await categoryRepository.findAllPaginated({
  page: 1,
  limit: 20,
});

// Reorder categories
await categoryRepository.reorder([
  'developer-tools',
  'productivity',
  'design',
]);
```

---

## Archivos relacionados

|Archivo|relación|
|------|-------------|
|`lib/services/category-git.service.ts`|backend de almacenamiento de Git|
|`lib/types/category.ts`|Definiciones de tipos y constantes de validación|
|`lib/config/config-service.ts`|Configuración para URL y tokens del repositorio|
|`lib/repositories/item.repository.ts`|Categorías de referencia de artículos|
