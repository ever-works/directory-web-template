---
id: category-types
title: Category Type Definitions
sidebar_label: Category Types
sidebar_position: 3
---

# Category Type Definitions

**Source:** `lib/types/category.ts`

Categories are used to organize items into logical groups. The template uses a file-based system where categories are stored as structured data and referenced by items.

## Interfaces

### `CategoryData`

The core category data structure with minimal fields.

```typescript
interface CategoryData {
  id: string;
  name: string;
}
```

- `id` - Unique identifier for the category (typically a slug like `"developer-tools"`)
- `name` - Human-readable display name (e.g., `"Developer Tools"`)

### `CategoryWithCount`

Extended category data that includes item count and active state, used in admin dashboards and category listings.

```typescript
interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}
```

- `count` - Number of items assigned to this category
- `isInactive` - Whether the category exists in config but has no assigned items

### `CreateCategoryRequest`

Payload for creating a new category.

```typescript
interface CreateCategoryRequest {
  id: string;
  name: string;
}
```

### `UpdateCategoryRequest`

Payload for updating an existing category. Extends `Partial<CreateCategoryRequest>` so only the fields being changed need to be provided, but `id` is always required.

```typescript
interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}
```

### `CategoryListResponse`

Paginated response for category list queries.

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

Response envelope for single-category operations.

```typescript
interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}
```

### `CategoryListOptions`

Query parameters for filtering and paginating category lists.

```typescript
interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

- `includeInactive` - When `true`, includes categories that have zero items
- `sortBy` - Sort by category name or ID
- Default sort order is ascending by name

## Constants

### `CATEGORY_VALIDATION`

Validation constraints for category fields:

```typescript
const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

## Usage Examples

### Creating a category

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

### Listing categories with options

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

### Displaying categories with counts

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

### Updating a category

```typescript
import type { UpdateCategoryRequest } from '@/lib/types/category';

const update: UpdateCategoryRequest = {
  id: 'developer-tools',
  name: 'Dev Tools & Utilities',
};
```

## Related Types

- [`ItemData.category`](./item-types.md) references category IDs (supports `string | string[]`)
- [`TagData`](./category-types.md) follows a similar pattern for tags
- [`ItemListOptions.categories`](./item-types.md) accepts an array of category IDs for filtering
