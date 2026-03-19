---
id: admin-categories-components
title: Admin Categories Components
sidebar_label: Admin Categories
sidebar_position: 40
---

# Admin Categories Components

The categories module provides a CRUD form for managing directory categories. Categories represent the top-level classification system used to organise items in the directory.

## Component Hierarchy

```
categories/
  category-form.tsx        # Create/edit form with validation
```

The `CategoryForm` is the sole component in this module. It is rendered by the admin categories page when a user clicks **Create Category** or **Edit** on an existing category row.

## CategoryForm

A dual-mode form (create / edit) for category records. It collects an immutable machine-readable `id` and a human-readable `name`, validates both fields inline, and delegates persistence to the parent via an async `onSubmit` callback.

### Props Interface

```typescript
interface CategoryFormProps {
  /** Existing category data (populated in edit mode) */
  category?: CategoryData;
  /** Async handler called with validated form data */
  onSubmit: (data: CreateCategoryRequest | UpdateCategoryRequest) => Promise<void>;
  /** Called when the user cancels the form */
  onCancel: () => void;
  /** Disables inputs and shows a loading spinner on the submit button */
  isLoading?: boolean;
  /** Controls create vs edit behaviour (id field disabled in edit mode) */
  mode: 'create' | 'edit';
}
```

### Imported Types

| Type | Source | Purpose |
|------|--------|---------|
| `CategoryData` | `@/lib/types/category` | Shape of a persisted category |
| `CreateCategoryRequest` | `@/lib/types/category` | Payload for creating a category |
| `UpdateCategoryRequest` | `@/lib/types/category` | Payload for updating a category |
| `CATEGORY_VALIDATION` | `@/lib/types/category` | Shared validation constants (min/max lengths) |

### State Management

The component uses local `useState` for both field values and error messages:

```typescript
const [formData, setFormData] = useState({
  id: category?.id || '',
  name: category?.name || '',
});
const [errors, setErrors] = useState<Record<string, string>>({});
```

Errors are cleared field-by-field as the user types, providing immediate inline feedback.

### Validation Rules

| Field | Rule | Constant |
|-------|------|----------|
| `id` | Required, lowercase alphanumeric + hyphens, 3-50 characters | regex `/^[a-z0-9-]+$/` |
| `name` | Required, length between `NAME_MIN_LENGTH` and `NAME_MAX_LENGTH` | `CATEGORY_VALIDATION` |

The `id` field is disabled in edit mode because it serves as the primary key in the Git-based CMS content repository.

### Usage Example

```tsx
import { CategoryForm } from '@/components/admin/categories/category-form';
import { useCreateCategory } from '@/hooks/use-admin-categories';

function CreateCategoryPanel() {
  const { mutateAsync, isPending } = useCreateCategory();

  return (
    <CategoryForm
      mode="create"
      isLoading={isPending}
      onSubmit={async (data) => {
        await mutateAsync(data);
      }}
      onCancel={() => router.back()}
    />
  );
}
```

### Internationalisation

All user-visible strings are resolved through `next-intl` with the namespace `admin.CATEGORY_FORM`. This includes field labels, placeholders, error messages, and button text. The component calls `useTranslations("admin.CATEGORY_FORM")` at the top of the render function.

### UI Library Dependencies

| Dependency | Usage |
|------------|-------|
| `@heroui/react` | `Button`, `Input` |
| `lucide-react` | `Save`, `X` icons |

### Dark Mode Support

The form uses Tailwind utility classes with `dark:` variants for all surfaces, borders, and text colours. A gradient header (`bg-linear-to-r from-gray-50 to-white`) switches to `dark:from-gray-800 dark:to-gray-900` in dark mode.

### Accessibility Features

- Native `<form>` element with `onSubmit` for keyboard submission (Enter key).
- `isRequired` flag on HeroUI `Input` components adds `aria-required`.
- `isInvalid` and `errorMessage` props on inputs expose errors to assistive technology.
- Disabled state communicated via `isDisabled` prop (maps to `aria-disabled`).
- Submit button shows a loading spinner and disables interaction during async operations.
- Character count indicator below the name field gives sighted users a visual length hint.

### Styling Pattern

Class strings are extracted into top-level constants (`containerClasses`, `headerClasses`, `formClasses`, `actionsClasses`) for maintainability. The submit button uses the shared theme gradient: `from-theme-primary to-theme-accent`.

### Related Hooks and APIs

| Hook / API | Purpose |
|------------|---------|
| `useAdminCategories` | Fetches the category list with React Query |
| `useCreateCategory` | Mutation hook wrapping `POST /api/admin/categories` |
| `useUpdateCategory` | Mutation hook wrapping `PUT /api/admin/categories/:id` |
| `useDeleteCategory` | Mutation hook wrapping `DELETE /api/admin/categories/:id` |
| `POST /api/admin/categories` | REST endpoint for category creation |
| `PUT /api/admin/categories/:id` | REST endpoint for category update |

### Error Handling

Form-level errors are caught in a try/catch around `onSubmit`. Server-side errors (duplicate id, permission denied) should be handled by the parent component or the mutation hook's `onError` callback. The form itself logs errors to `console.error` and does not display server errors inline.

### Design Decisions

1. **Single-file simplicity** -- Categories have only two editable fields, so a multi-step form would add unnecessary complexity.
2. **ID immutability in edit mode** -- The `id` doubles as the filename in the Git-based CMS, so renaming it would break references from items.
3. **Async onSubmit** -- The parent can `await` the mutation and close the form only on success.

## File Reference

| File | Path |
|------|------|
| CategoryForm | `template/components/admin/categories/category-form.tsx` |
| Category types | `template/lib/types/category.ts` |
