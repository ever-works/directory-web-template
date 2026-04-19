---
id: category-repository
title: Repozytorium kategorii
sidebar_label: Repozytorium kategorii
sidebar_position: 21
---

# Repozytorium kategorii

`CategoryRepository` zarządza cyklem życia kategorii elementów. Kategorie są przechowywane jako dane YAML w repozytorium treści opartym na Git i zapewniają podstawową taksonomię organizacyjną dla elementów.

**Plik źródłowy:** `template/lib/repositories/category.repository.ts`

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

## Definicja klasy

```ts
export class CategoryRepository {
  private gitService: any = null;
}
```

### Zależności

|Importuj|Cel|
|--------|---------|
|`CategoryData`, `CategoryWithCount`|Podstawowe i wzbogacone typy kategorii|
|`CreateCategoryRequest`, `UpdateCategoryRequest`|Mutacja DTO|
|`CategoryListOptions`|Opcje filtrowania, sortowania i paginacji|
|`CATEGORY_VALIDATION`|Stałe ograniczeń walidacyjnych|
|`createCategoryGitService`|Fabryka usługi przechowywania Git|
|`coreConfig`|Scentralizowana konfiguracja|

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub repository URL
2. Parsing the URL to extract `owner` and `repo`
3. Using `coreConfig.content.ghToken` for authentication
4. Using `coreConfig.content.githubBranch` (default: `"main"`) for the target branch

Throws descriptive errors if configuration is missing or malformed.

---

## Metody zapytań

### `findAll(options?): Promise<CategoryWithCount[]>`

Zwraca wszystkie kategorie z opcjonalnym sortowaniem.

```ts
async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]>
```

**Zachowanie:**
- Wszystkie kategorie traktowane są jako aktywne (pole `isActive` zostało usunięte)
- Opcja `includeInactive` jest akceptowana ze względu na kompatybilność wsteczną, ale nie ma efektu filtrowania
- Stosuje sortowanie za pomocą prywatnej metody `sortCategories`

**Opcje sortowania:**

|`sortBy`|`sortOrder`|Zachowanie|
|----------|-------------|----------|
|`'name'` (domyślnie)|`'asc'` (domyślnie)|Alfabetycznie A–Z|
|`'name'`|`'desc'`|Alfabetycznie Z-A|

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

Pobiera pojedynczą kategorię według jej unikalnego identyfikatora.

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

## Metody mutacji

### `create(data): Promise<CategoryData>`

Tworzy nową kategorię po sprawdzeniu poprawności i zduplikowaniu nazwy.

```ts
async create(data: CreateCategoryRequest): Promise<CategoryData>
```

**Etapy przetwarzania:**

1. Sprawdza wprowadzone dane poprzez `validateCategoryData`
2. Sprawdza duplikaty nazw poprzez `checkDuplicateName`
3. Tworzy poprzez `gitService.createCategory`

**Zasady walidacji:**
- `name` musi zawierać się pomiędzy znakami `CATEGORY_VALIDATION.NAME_MIN_LENGTH` i `NAME_MAX_LENGTH`
- `id` musi mieć od 3 do 50 znaków
- `id` musi pasować do `/^[a-z0-9-]+$/` (tylko małe litery, cyfry i łączniki)

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

Wykonuje trwałe usunięcie kategorii z repozytorium Git.

```ts
async delete(id: string): Promise<void>
```

Delegaci do `hardDelete(id)`.

---

### `hardDelete(id): Promise<void>`

Permanently removes a category from the Git repository.

```ts
async hardDelete(id: string): Promise<void>
```

---

### `reorder(categoryIds): Promise<void>`

Zmienia kolejność kategorii w oparciu o dostarczoną tablicę identyfikatorów.

```ts
async reorder(categoryIds: string[]): Promise<void>
```

**Etapy przetwarzania:**

1. Czyta wszystkie aktualne kategorie
2. Zmienia ich kolejność, aby dopasować je do podanej sekwencji identyfikatorów
3. Dołącza wszelkie kategorie, które nie znajdują się na liście ponownego zamówienia
4. Zapisuje ponownie uporządkowaną listę za pośrednictwem `gitService.writeCategories`

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

## Eksport Singletona

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

## Powiązane pliki

|Plik|Związek|
|------|-------------|
|`lib/services/category-git.service.ts`|Zaplecze pamięci masowej Git|
|`lib/types/category.ts`|Definicje typów i stałe walidacyjne|
|`lib/config/config-service.ts`|Konfiguracja adresu URL repozytorium i tokenów|
|`lib/repositories/item.repository.ts`|Kategorie referencyjne elementów|
