---
id: item-categories
title: Catégories d'éléments
sidebar_label: Catégories d'éléments
sidebar_position: 24
---

# Catégories d'éléments

Categories provide a hierarchical way to organize items in the directory. The template includes a full category management system with admin CRUD operations, a public-facing category navigation bar, and filtering integration.

## Architecture Overview

```
components/
  items-categories.tsx              -- Public category navigation bar
  categories-grid.tsx               -- Grid layout for category cards
  admin/categories/                 -- Admin CRUD components
  filters/components/categories/    -- Filter integration components

hooks/
  use-admin-categories.ts           -- Admin CRUD hook (React Query)
  use-categories-enabled.ts         -- Feature flag check
  use-categories-exists.ts          -- Data availability check

app/api/admin/categories/           -- API routes for category management
```

## Category Data Model

Categories are represented with the following interface from the content layer:

```tsx
interface Category {
  id: string;
  name: string;
  icon_url?: string;
  count?: number;
}
```

The admin interface uses an extended type:

```tsx
// lib/types/category.ts
interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryWithCount extends CategoryData {
  itemCount: number;
}
```

## Public Category Navigation

The `ItemsCategories` component at `components/items-categories.tsx` renders a horizontal scrollable category bar with optional sticky behavior:

```tsx
// components/items-categories.tsx
export function ItemsCategories(props: {
  categories: Category[];
  basePath?: string;
  resetPath?: string;
  enableSticky?: boolean;
  maxVisibleTags?: number;
}) {
  const { categoriesEnabled } = useCategoriesEnabled();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const pathname = usePathname();

  if (!categoriesEnabled) return null;
  if (!props.categories?.length) return null;

  const MAX_VISIBLE = props.maxVisibleTags || 8;
  const hasMore = props.categories.length > MAX_VISIBLE;

  // Render logic...
}
```

### Key Features

- **Feature flag gating**: the component checks `useCategoriesEnabled()` and returns `null` if categories are disabled
- **Responsive overflow**: in single-row mode, categories scroll horizontally with hidden scrollbar styling
- **Expand/collapse**: a toggle button switches between single-row scrolling and wrapped multi-row layout
- **Active state detection**: compares the current pathname against the category URL to highlight the active filter
- **"All Categories" button**: always rendered first, acts as a reset filter with the total count
- **Sticky header**: when `enableSticky` is true, the bar becomes sticky after scrolling past 250px, adding a blur backdrop

### Usage Example

```tsx
<ItemsCategories
  categories={categories}
  basePath="/categories"
  resetPath="/"
  enableSticky={true}
  maxVisibleTags={10}
/>
```

## Admin Category Management

### useAdminCategories Hook

The `hooks/use-admin-categories.ts` hook provides full CRUD operations:

```tsx
// hooks/use-admin-categories.ts
export function useAdminCategories(options = {}) {
  const { params = {}, enabled = true } = options;

  const { data, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEYS.categoriesList(params),
    queryFn: () => fetchCategories(params),
    staleTime: 5 * 60 * 1000,
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });

  return {
    categories: data?.categories || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 1,
    isLoading,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    createCategory: handleCreateCategory,
    updateCategory: handleUpdateCategory,
    deleteCategory: handleDeleteCategory,
    refetch,
    refreshData,
  };
}
```

### Query Key Factory

Categories use a structured query key hierarchy for precise cache invalidation:

```tsx
const QUERY_KEYS = {
  categories: ['admin', 'categories'] as const,
  categoriesList: (params) =>
    [...QUERY_KEYS.categories, 'list', params] as const,
  allCategories: () =>
    [...QUERY_KEYS.categories, 'all'] as const,
  category: (id: string) =>
    [...QUERY_KEYS.categories, 'detail', id] as const,
};
```

### Single Category Hook

```tsx
export function useCategory({ id, enabled = true }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.category(id),
    queryFn: () => fetchCategory(id),
    enabled: enabled && !!id,
  });

  return { category: data || null, isLoading, error, refetch };
}
```

### Mutation-Only Hook

For components that only need write operations without the list query:

```tsx
export function useCategoryMutations() {
  return {
    createCategory: handleCreate,
    updateCategory: handleUpdate,
    deleteCategory: handleDelete,
    isSubmitting: anyMutationPending,
  };
}
```

## Category List Options

The admin list endpoint supports filtering and pagination:

```tsx
interface CategoryListOptions {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/categories` | List categories with pagination |
| GET | `/api/admin/categories/all` | Get all categories without pagination |
| GET | `/api/admin/categories/:id` | Get a single category |
| POST | `/api/admin/categories` | Create a new category |
| PUT | `/api/admin/categories/:id` | Update an existing category |
| DELETE | `/api/admin/categories/:id` | Soft-delete a category |
| DELETE | `/api/admin/categories/:id?hard=true` | Permanently delete a category |

## Filter Integration

Categories integrate with the filter system through the `filters/` module:

```tsx
// components/filters/index.ts
export { Categories } from './components/categories/categories-section';
export { CategoriesList, CategoryItem } from './components/categories';
```

The filter context tracks the selected category and applies it to item queries automatically.

## Feature Flag

Categories can be enabled or disabled globally via the `useCategoriesEnabled` hook, which reads from the feature flags system:

```tsx
const { categoriesEnabled } = useCategoriesEnabled();
```

When disabled, both the navigation bar and filter components return `null`.

## File Reference

| File | Purpose |
|------|---------|
| `components/items-categories.tsx` | Public category navigation bar |
| `components/categories-grid.tsx` | Grid layout for category display |
| `components/admin/categories/` | Admin CRUD components |
| `components/filters/components/categories/` | Filter integration |
| `hooks/use-admin-categories.ts` | Admin CRUD hook with React Query |
| `hooks/use-categories-enabled.ts` | Feature flag check |
| `hooks/use-categories-exists.ts` | Data availability check |
| `app/api/admin/categories/` | Backend API routes |