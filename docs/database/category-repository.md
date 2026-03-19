---
id: category-repository
title: Category Repository
sidebar_label: Category Repository
sidebar_position: 21
---

# Category Repository

The `CategoryRepository` manages the lifecycle of item categories. Categories are stored as YAML data in the Git-backed content repository and provide the primary organizational taxonomy for items.

**Source file:** `template/lib/repositories/category.repository.ts`

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

## Class Definition

```ts
export class CategoryRepository {
  private gitService: any = null;
}
```

### Dependencies

| Import | Purpose |
|--------|---------|
| `CategoryData`, `CategoryWithCount` | Base and enriched category types |
| `CreateCategoryRequest`, `UpdateCategoryRequest` | Mutation DTOs |
| `CategoryListOptions` | Filtering, sorting, and pagination options |
| `CATEGORY_VALIDATION` | Validation constraint constants |
| `createCategoryGitService` | Factory for the Git storage service |
| `coreConfig` | Centralized configuration |

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub repository URL
2. Parsing the URL to extract `owner` and `repo`
3. Using `coreConfig.content.ghToken` for authentication
4. Using `coreConfig.content.githubBranch` (default: `"main"`) for the target branch

Throws descriptive errors if configuration is missing or malformed.

---

## Query Methods

### `findAll(options?): Promise<CategoryWithCount[]>`

Returns all categories with optional sorting.

```ts
async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]>
```

**Behavior:**
- All categories are treated as active (the `isActive` field has been removed)
- `includeInactive` option is accepted for backward compatibility but has no filtering effect
- Applies sorting via the private `sortCategories` method

**Sort options:**

| `sortBy` | `sortOrder` | Behavior |
|----------|-------------|----------|
| `'name'` (default) | `'asc'` (default) | Alphabetical A-Z |
| `'name'` | `'desc'` | Alphabetical Z-A |

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

Retrieves a single category by its unique ID.

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

## Mutation Methods

### `create(data): Promise<CategoryData>`

Creates a new category after validation and duplicate name checking.

```ts
async create(data: CreateCategoryRequest): Promise<CategoryData>
```

**Processing steps:**

1. Validates input via `validateCategoryData`
2. Checks for duplicate names via `checkDuplicateName`
3. Creates through `gitService.createCategory`

**Validation rules:**
- `name` must be between `CATEGORY_VALIDATION.NAME_MIN_LENGTH` and `NAME_MAX_LENGTH` characters
- `id` must be between 3 and 50 characters
- `id` must match `/^[a-z0-9-]+$/` (lowercase, numbers, hyphens only)

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

Performs a hard delete of a category from the Git repository.

```ts
async delete(id: string): Promise<void>
```

Delegates to `hardDelete(id)`.

---

### `hardDelete(id): Promise<void>`

Permanently removes a category from the Git repository.

```ts
async hardDelete(id: string): Promise<void>
```

---

### `reorder(categoryIds): Promise<void>`

Reorders categories based on the provided array of IDs.

```ts
async reorder(categoryIds: string[]): Promise<void>
```

**Processing steps:**

1. Reads all current categories
2. Reorders them to match the provided ID sequence
3. Appends any categories not included in the reorder list
4. Writes the reordered list back via `gitService.writeCategories`

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

## Singleton Export

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

## Related Files

| File | Relationship |
|------|-------------|
| `lib/services/category-git.service.ts` | Git storage backend |
| `lib/types/category.ts` | Type definitions and validation constants |
| `lib/config/config-service.ts` | Configuration for repository URL and tokens |
| `lib/repositories/item.repository.ts` | Items reference categories |
