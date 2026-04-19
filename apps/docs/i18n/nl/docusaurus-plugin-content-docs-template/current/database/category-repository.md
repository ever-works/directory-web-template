---
id: category-repository
title: Categorieopslagplaats
sidebar_label: Categorieopslagplaats
sidebar_position: 21
---

# Categorieopslagplaats

De `CategoryRepository` beheert de levenscyclus van artikelcategorieën. Categorieën worden opgeslagen als YAML-gegevens in de door Git ondersteunde inhoudsopslagplaats en bieden de primaire organisatietaxonomie voor items.

**Bronbestand:** `template/lib/repositories/category.repository.ts`

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

## Klasse definitie

```ts
export class CategoryRepository {
  private gitService: any = null;
}
```

### Afhankelijkheden

|Importeren|Doel|
|--------|---------|
|`CategoryData`, `CategoryWithCount`|Basis- en verrijkte categorietypen|
|`CreateCategoryRequest`, `UpdateCategoryRequest`|Mutatie DTO's|
|`CategoryListOptions`|Opties voor filteren, sorteren en pagineren|
|`CATEGORY_VALIDATION`|Validatiebeperkingsconstanten|
|`createCategoryGitService`|Fabriek voor de Git-opslagservice|
|`coreConfig`|Gecentraliseerde configuratie|

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub repository URL
2. Parsing the URL to extract `owner` and `repo`
3. Using `coreConfig.content.ghToken` for authentication
4. Using `coreConfig.content.githubBranch` (default: `"main"`) for the target branch

Throws descriptive errors if configuration is missing or malformed.

---

## Querymethoden

### `findAll(options?): Promise<CategoryWithCount[]>`

Retourneert alle categorieën met optionele sortering.

```ts
async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]>
```

**Gedrag:**
- Alle categorieën worden als actief beschouwd (het veld `isActive` is verwijderd)
- De optie `includeInactive` wordt geaccepteerd voor achterwaartse compatibiliteit, maar heeft geen filtereffect
- Past sortering toe via de privé `sortCategories` methode

**Sorteeropties:**

|`sortBy`|`sortOrder`|Gedrag|
|----------|-------------|----------|
|`'name'` (standaard)|`'asc'` (standaard)|Alfabetisch A-Z|
|`'name'`|`'desc'`|Alfabetisch Z-A|

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

Haalt een enkele categorie op via zijn unieke ID.

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

## Mutatiemethoden

### `create(data): Promise<CategoryData>`

Creëert een nieuwe categorie na validatie en dubbele naamcontrole.

```ts
async create(data: CreateCategoryRequest): Promise<CategoryData>
```

**Verwerkingsstappen:**

1. Valideert invoer via `validateCategoryData`
2. Controleert op dubbele namen via `checkDuplicateName`
3. Creëert via `gitService.createCategory`

**Validatieregels:**
- `name` moet tussen `CATEGORY_VALIDATION.NAME_MIN_LENGTH` en `NAME_MAX_LENGTH` tekens liggen
- `id` moet tussen 3 en 50 tekens lang zijn
- `id` moet overeenkomen met `/^[a-z0-9-]+$/` (alleen kleine letters, cijfers en koppeltekens)

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

Voert een harde verwijdering uit van een categorie uit de Git-repository.

```ts
async delete(id: string): Promise<void>
```

Afgevaardigden naar `hardDelete(id)`.

---

### `hardDelete(id): Promise<void>`

Permanently removes a category from the Git repository.

```ts
async hardDelete(id: string): Promise<void>
```

---

### `reorder(categoryIds): Promise<void>`

Herschikt categorieën op basis van de opgegeven reeks ID's.

```ts
async reorder(categoryIds: string[]): Promise<void>
```

**Verwerkingsstappen:**

1. Leest alle huidige categorieën
2. Herschikt ze zodat ze overeenkomen met de opgegeven ID-reeks
3. Voegt alle categorieën toe die niet zijn opgenomen in de bestellijst
4. Schrijft de opnieuw geordende lijst terug via `gitService.writeCategories`

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

## Singleton-export

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

## Gerelateerde bestanden

|Bestand|Relatie|
|------|-------------|
|`lib/services/category-git.service.ts`|Git-opslag-backend|
|`lib/types/category.ts`|Typedefinities en validatieconstanten|
|`lib/config/config-service.ts`|Configuratie voor repository-URL en tokens|
|`lib/repositories/item.repository.ts`|Artikelreferentiecategorieën|
