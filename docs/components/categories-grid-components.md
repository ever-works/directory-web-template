---
id: categories-grid-components
title: "Categories Grid Reference"
sidebar_label: "Categories Grid"
sidebar_position: 49
---

# Categories Grid

## Overview

The `CategoriesGrid` component renders a responsive grid of category cards, each displaying a category icon, name, item count, and decorative background image. It supports both standard page-based pagination and infinite scroll loading, automatically adapting based on the `paginationType` value from `LayoutThemeContext`. Categories are sorted by item count in descending order.

## Import

```typescript
import CategoriesGrid from "@/components/categories-grid";
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `categories` | `Category[]` | Yes | - | Array of category objects to display. Each must include `id`, `name`, and optionally `count`, `image_url`, and `icon_url`. |

### Category Type

```typescript
interface Category {
  id: string;
  name: string;
  count?: number;
  image_url?: string;
  icon_url?: string;
}
```

## Usage Examples

### Basic Usage

```tsx
import CategoriesGrid from "@/components/categories-grid";

<CategoriesGrid categories={categories} />
```

### With Custom Data

```tsx
const categories = [
  { id: "design", name: "Design Tools", count: 42, icon_url: "/icons/design.svg" },
  { id: "dev", name: "Developer Tools", count: 87, icon_url: "/icons/code.svg" },
  { id: "marketing", name: "Marketing", count: 23 },
];

<CategoriesGrid categories={categories} />
```

## Behavior

### Sorting

Categories are automatically sorted by `count` in descending order using `useMemo`, so the most populated categories appear first.

### Pagination Modes

The component reads `paginationType` from the `LayoutThemeContext`:

| Mode | Behavior |
|------|----------|
| `standard` | Displays a page of categories (default `PER_PAGE` items) with `UniversalPagination` controls. Syncs page number with URL `?page=` search params. |
| `infinite` | Loads categories progressively using `useInfiniteLoading` hook. A sentinel element at the bottom triggers the next batch via `react-intersection-observer` with 150ms debounce. |

### Navigation

Clicking a category card navigates to `/?categories={categoryId}` to filter the main listing by that category. A loading spinner overlay appears on the clicked card during navigation.

### Empty State

Returns `null` if the `categories` array is empty or undefined -- no placeholder is rendered.

## Card Anatomy

Each category card includes:

1. **Item count badge** (top-left) - Shows `{count} items` in a themed pill.
2. **Background image** (top area) - Uses `category.image_url` or `category.icon_url` or falls back to `/bg-cards.png`. Rendered with `brightness-0 dark:brightness-200` filter for theme adaptation.
3. **Category icon** (center) - Displayed in a themed square container. Uses `icon_url` via `next/image` or falls back to a `FiFolder` icon.
4. **Category name** (bottom) - Styled with `font-semibold` and `group-hover:text-theme-primary`.
5. **Hover arrow** (top-right) - A directional arrow indicator that appears on hover.
6. **Glow effect** - A subtle gradient overlay from blue to purple on hover.

## Styling

- **Grid**: Uses `LayoutGrid` component for responsive columns that adapt to the active layout key.
- **Cards**: Glassmorphic design with `bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl` and `ring-1 ring-gray-200/50`.
- **Hover**: `hover:shadow-xl` and `hover:ring-theme-primary/70` border transition.
- **Loading overlay**: `bg-white/80 dark:bg-gray-900/80 backdrop-blur-xs` with a centered `Spinner`.
- **Infinite scroll loader**: Centered spinner with "Loading..." text using theme primary colors.

## Accessibility

- Each category card has `role="button"` and `tabIndex={0}` for keyboard navigation.
- `aria-label="View {name} category"` is set on each card.
- `onKeyDown` handles both `Enter` and `Space` keys for activation.
- Focus state uses `focus:ring-2 focus:ring-theme-primary` outline.

## Related Components

- [Universal Pagination](/docs/template/components/universal-pagination-components) - The pagination control rendered in standard mode.
- [Layout Components](/docs/template/components/layout-components) - `LayoutGrid` used for responsive grid rendering.
- [Context Providers](/docs/template/components/context-providers) - `LayoutThemeContext` for pagination type.
