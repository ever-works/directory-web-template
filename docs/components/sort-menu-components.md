---
id: sort-menu-components
title: "Sort Menu Reference"
sidebar_label: "Sort Menu"
sidebar_position: 50
---

# Sort Menu

## Overview

The `SortMenu` component renders a dropdown menu for selecting sort order from a list of options. Built on top of Radix UI's `DropdownMenu` primitives, it provides an accessible, animated dropdown with radio-group selection semantics and a checkmark indicator for the currently active sort option.

## Import

```typescript
import SortMenu from "@/components/sort-menu";
// Types
import type { SortOption, SortMenuProps } from "@/components/sort-menu";
```

## Types

```typescript
export type SortOption = {
  value: string;
  label: string;
};
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `options` | `SortOption[]` | Yes | - | Array of sort options. Each option has a `value` (machine identifier) and `label` (display text). |
| `value` | `string` | Yes | - | The currently selected sort value. Must match one of the option values. |
| `onSortChange` | `(value: string) => void` | Yes | - | Callback fired when the user selects a different sort option. |
| `ariaLabel` | `string` | No | `"Sort items"` | Accessible label for the trigger button. |
| `className` | `string` | No | `undefined` | Additional CSS classes applied to the trigger button. |
| `label` | `string` | No | `undefined` | Optional visible label text (currently not rendered in the UI but available for extension). |

## Usage Examples

### Basic Usage

```tsx
import SortMenu from "@/components/sort-menu";

const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
];

const [sortBy, setSortBy] = useState("newest");

<SortMenu
  options={sortOptions}
  value={sortBy}
  onSortChange={setSortBy}
/>
```

### With Custom Configuration

```tsx
<SortMenu
  options={[
    { value: "popularity", label: "Most Popular" },
    { value: "rating", label: "Highest Rated" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
  ]}
  value={currentSort}
  onSortChange={handleSortChange}
  ariaLabel="Sort products"
  className="w-48"
/>
```

## Behavior

1. **Trigger button** displays the label of the currently selected option (or "Sort" as fallback).
2. **Chevron icon** rotates 180 degrees when the dropdown is open via `group-data-[state=open]:rotate-180`.
3. **Radio group** ensures only one option can be selected at a time using Radix `RadioGroup` / `RadioItem`.
4. **Check indicator** appears next to the active option as a theme-colored checkmark.
5. The dropdown is rendered via a **portal** (`DropdownMenu.Portal`) to avoid overflow clipping issues.
6. The `modal={false}` prop on `DropdownMenu.Root` allows interaction with the rest of the page while the menu is open.

## Styling

- **Trigger button**: Minimum width of `min-w-36`, uses `bg-gray-100 dark:bg-gray-900/50` with a `border-gray-300 dark:border-gray-600/50` border. Text is themed with `text-theme-primary-600 dark:text-theme-primary-400`.
- **Dropdown content**: `w-36` with `rounded-lg`, `shadow-lg`, and entrance animation (`animate-in fade-in zoom-in-95`).
- **Menu items**: `px-3 py-1.5` with `hover:bg-gray-100 dark:hover:bg-gray-800` backgrounds.
- **Check icon**: `text-theme-primary-500 dark:text-theme-primary-400` from Lucide's `Check` icon.
- **Arrow**: Rendered via `DropdownMenu.Arrow` with fill matching the dropdown background.

## Accessibility

- The trigger button includes `aria-label`, `aria-haspopup="menu"`, and `aria-controls` linking to the dropdown.
- Uses Radix UI's `RadioGroup` pattern which provides full keyboard navigation:
  - **Arrow Up/Down**: Navigate between options.
  - **Enter/Space**: Select the focused option.
  - **Escape**: Close the dropdown.
- Focus management is handled automatically by Radix primitives.
- The `focus:ring-2 focus:ring-theme-primary-500` outline ensures keyboard focus visibility.

## Related Components

- [Filter System](/template/components/filter-system) - Sort menus are often used alongside filter components.
- [Shared Card Components](/template/components/shared-card-components) - Item listing that consumes sort state.
