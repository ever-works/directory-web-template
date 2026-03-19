---
id: use-admin-categories-reference
title: useAdminCategories Hook Reference
sidebar_label: useAdminCategories
sidebar_position: 53
---

# useAdminCategories

## Overview

`useAdminCategories` is a React hook for managing categories in the admin panel. It provides paginated category listing with sorting, CRUD mutations (including soft and hard delete), and aggregate data. The file also exports several companion hooks: `useCategory` for single-category access, `useCategoryMutations` for mutation-only usage, `useAllCategories` for unpaginated access, and `useAllCategoriesFormatted` for a formatted variant.

**Source:** `template/hooks/use-admin-categories.ts`

## Signature / Parameters

### `useAdminCategories`

```typescript
function useAdminCategories(options?: UseAdminCategoriesOptions): UseAdminCategoriesReturn
```

#### `UseAdminCategoriesOptions`

| Property  | Type                    | Default | Description                    |
|----------|-------------------------|---------|--------------------------------|
| `params` | `CategoryListOptions`   | `{}`    | Filtering, pagination, sorting |
| `enabled`| `boolean`               | `true`  | Whether to enable the query    |

#### `CategoryListOptions`

| Parameter         | Type               | Description                                 |
|------------------|--------------------|---------------------------------------------|
| `includeInactive`| `boolean`          | Include inactive categories in results      |
| `page`           | `number`           | Current page number                         |
| `limit`          | `number`           | Items per page                              |
| `sortBy`         | `string`           | Field to sort by                            |
| `sortOrder`      | `'asc' \| 'desc'`  | Sort direction                              |

## Return Values

### `UseAdminCategoriesReturn`

#### Data

| Property      | Type                  | Description                                   |
|--------------|-----------------------|-----------------------------------------------|
| `categories` | `CategoryWithCount[]` | Array of categories with associated item counts|
| `total`      | `number`              | Total categories matching filters             |
| `page`       | `number`              | Current page (defaults to `1`)                |
| `totalPages` | `number`              | Total pages (defaults to `1`)                 |
| `limit`      | `number`              | Items per page (defaults to `10`)             |

#### Loading States

| Property       | Type      | Description                          |
|---------------|-----------|--------------------------------------|
| `isLoading`   | `boolean` | `true` on initial load               |
| `isSubmitting` | `boolean` | `true` when any mutation is pending  |

#### Actions

| Method            | Signature                                                                  | Description                                         |
|------------------|----------------------------------------------------------------------------|-----------------------------------------------------|
| `createCategory` | `(data: CreateCategoryRequest) => Promise<boolean>`                        | Create a new category                               |
| `updateCategory` | `(id: string, data: UpdateCategoryRequest) => Promise<boolean>`            | Update an existing category                         |
| `deleteCategory` | `(id: string, hard?: boolean) => Promise<boolean>`                         | Delete a category. Pass `hard=true` for permanent deletion. |

#### Utility

| Method        | Signature    | Description                                       |
|--------------|--------------|----------------------------------------------------|
| `refetch`    | `() => void` | Re-execute the categories list query               |
| `refreshData`| `() => void` | Invalidate all category queries for fresh data     |

## Companion Hooks

### `useCategory`

Fetches a single category by ID.

```typescript
function useCategory(options: UseCategoryOptions): UseCategoryReturn
```

| Option    | Type      | Description                |
|----------|-----------|----------------------------|
| `id`     | `string`  | Category ID to fetch       |
| `enabled`| `boolean` | Whether to run the query   |

Returns: `{ category: CategoryData | null, isLoading: boolean, error: Error | null, refetch: () => void }`

### `useCategoryMutations`

Provides create/update/delete mutations without fetching data.

```typescript
function useCategoryMutations(): UseCategoryMutationsReturn
```

Returns: `{ createCategory, updateCategory, deleteCategory, isSubmitting }`

### `useAllCategories`

Fetches all categories without pagination from the `/api/admin/categories/all` endpoint.

```typescript
function useAllCategories(): UseQueryResult<CategoryData[]>
```

Returns a standard TanStack `useQuery` result with `data` as `CategoryData[]`.

### `useAllCategoriesFormatted`

Wraps `useAllCategories` with a formatted response.

```typescript
function useAllCategoriesFormatted(): {
  allCategories: CategoryData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

## Implementation Details

- **Query caching:** 5-minute `staleTime`, 10-minute `gcTime`, 3 retries on failure.
- **Soft vs. hard delete:** The `deleteCategory` action supports a `hard` parameter. When `false` (default), the category is soft-deleted (deactivated). When `true`, the `?hard=true` query parameter is appended and the category is permanently removed.
- **Cache invalidation:** All mutations invalidate the entire `['admin', 'categories']` query key family, which covers the paginated list, all-categories endpoint, and individual category queries.
- **Toast notifications:** `sonner` toasts fire on mutation success and error.

### Query Keys

```typescript
const QUERY_KEYS = {
  categories: ['admin', 'categories'],
  categoriesList: (params) => ['admin', 'categories', 'list', params],
  allCategories: () => ['admin', 'categories', 'all'],
  category: (id) => ['admin', 'categories', 'detail', id],
};
```

## Usage Examples

### Category management page

```tsx
import { useAdminCategories } from '@/hooks/use-admin-categories';

function CategoriesPage() {
  const {
    categories,
    total,
    isLoading,
    createCategory,
    deleteCategory,
    isSubmitting,
  } = useAdminCategories({
    params: { includeInactive: true, sortBy: 'name', sortOrder: 'asc' },
  });

  const handleCreate = async () => {
    await createCategory({ name: 'New Category', slug: 'new-category' });
  };

  const handleSoftDelete = async (id: string) => {
    await deleteCategory(id); // soft delete
  };

  const handleHardDelete = async (id: string) => {
    await deleteCategory(id, true); // permanent delete
  };

  return (
    <div>
      <p>Total categories: {total}</p>
      <CategoryList categories={categories} />
    </div>
  );
}
```

### Loading all categories for a select dropdown

```tsx
import { useAllCategoriesFormatted } from '@/hooks/use-admin-categories';

function CategorySelect({ value, onChange }) {
  const { allCategories, isLoading } = useAllCategoriesFormatted();

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={isLoading}>
      <option value="">All Categories</option>
      {allCategories.map((cat) => (
        <option key={cat.id} value={cat.id}>{cat.name}</option>
      ))}
    </select>
  );
}
```

### Mutation-only usage in a dialog

```tsx
import { useCategoryMutations } from '@/hooks/use-admin-categories';

function EditCategoryDialog({ category, onClose }) {
  const { updateCategory, isSubmitting } = useCategoryMutations();

  const handleSave = async (data: UpdateCategoryRequest) => {
    const success = await updateCategory(category.id, data);
    if (success) onClose();
  };

  return <CategoryForm onSubmit={handleSave} isLoading={isSubmitting} />;
}
```

## Related Hooks

- [`useAdminItems`](./use-admin-items-reference.md) -- Item management; items belong to categories.
- [`useAdminFilters`](./use-admin-filters-reference.md) -- Unified filter state management including multi-select category filters.
- [`useAdminStats`](./use-admin-stats-reference.md) -- Platform-wide dashboard statistics.
