---
id: category-repository
title: Archivio di categorie
sidebar_label: Archivio di categorie
sidebar_position: 21
---

# Archivio di categorie

`CategoryRepository` gestisce il ciclo di vita delle categorie di articoli. Le categorie vengono archiviate come dati YAML nel repository di contenuti supportato da Git e forniscono la tassonomia organizzativa primaria per gli elementi.

**File sorgente:** `template/lib/repositories/category.repository.ts`

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

## Definizione di classe

```ts
export class CategoryRepository {
  private gitService: any = null;
}
```

### Dipendenze

|Importa|Scopo|
|--------|---------|
|`CategoryData`, `CategoryWithCount`|Tipi di categorie base e arricchite|
|`CreateCategoryRequest`, `UpdateCategoryRequest`|DTO di mutazione|
|`CategoryListOptions`|Opzioni di filtraggio, ordinamento e impaginazione|
|`CATEGORY_VALIDATION`|Costanti del vincolo di validazione|
|`createCategoryGitService`|Factory per il servizio di archiviazione Git|
|`coreConfig`|Configurazione centralizzata|

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub repository URL
2. Parsing the URL to extract `owner` and `repo`
3. Using `coreConfig.content.ghToken` for authentication
4. Using `coreConfig.content.githubBranch` (default: `"main"`) for the target branch

Throws descriptive errors if configuration is missing or malformed.

---

## Metodi di interrogazione

### `findAll(options?): Promise<CategoryWithCount[]>`

Restituisce tutte le categorie con ordinamento facoltativo.

```ts
async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]>
```

**Comportamento:**
- Tutte le categorie sono trattate come attive (il campo `isActive` è stato rimosso)
- L'opzione `includeInactive` è accettata per compatibilità con le versioni precedenti ma non ha effetto di filtro
- Applica l'ordinamento tramite il metodo privato `sortCategories`

**Opzioni di ordinamento:**

|`sortBy`|`sortOrder`|Comportamento|
|----------|-------------|----------|
|`'name'` (predefinito)|`'asc'` (predefinito)|Alfabetico dalla A alla Z|
|`'name'`|`'desc'`|Alfabetico Z-A|

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

Recupera una singola categoria in base al relativo ID univoco.

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

## Metodi di mutazione

### `create(data): Promise<CategoryData>`

Crea una nuova categoria dopo la convalida e il controllo del nome duplicato.

```ts
async create(data: CreateCategoryRequest): Promise<CategoryData>
```

**Fasi di elaborazione:**

1. Convalida l'input tramite `validateCategoryData`
2. Verifica la presenza di nomi duplicati tramite `checkDuplicateName`
3. Crea tramite `gitService.createCategory`

**Regole di convalida:**
- `name` deve essere compreso tra i caratteri `CATEGORY_VALIDATION.NAME_MIN_LENGTH` e `NAME_MAX_LENGTH`
- `id` deve contenere da 3 a 50 caratteri
- `id` deve corrispondere a `/^[a-z0-9-]+$/` (solo lettere minuscole, numeri e trattini)

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

Esegue l'eliminazione definitiva di una categoria dal repository Git.

```ts
async delete(id: string): Promise<void>
```

Delegati a `hardDelete(id)`.

---

### `hardDelete(id): Promise<void>`

Permanently removes a category from the Git repository.

```ts
async hardDelete(id: string): Promise<void>
```

---

### `reorder(categoryIds): Promise<void>`

Riordina le categorie in base all'array di ID fornito.

```ts
async reorder(categoryIds: string[]): Promise<void>
```

**Fasi di elaborazione:**

1. Legge tutte le categorie attuali
2. Li riordina in modo che corrispondano alla sequenza ID fornita
3. Aggiunge tutte le categorie non incluse nell'elenco di riordino
4. Riscrive l'elenco riordinato tramite `gitService.writeCategories`

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

## Esportazione singleton

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

## File correlati

|Archivio|Relazione|
|------|-------------|
|`lib/services/category-git.service.ts`|Backend di archiviazione Git|
|`lib/types/category.ts`|Definizioni di tipo e costanti di convalida|
|`lib/config/config-service.ts`|Configurazione per URL e token del repository|
|`lib/repositories/item.repository.ts`|Categorie di riferimento degli articoli|
