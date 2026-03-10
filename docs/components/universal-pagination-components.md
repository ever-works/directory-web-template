---
id: universal-pagination-components
title: "Universal Pagination Reference"
sidebar_label: "Universal Pagination"
sidebar_position: 52
---

# Universal Pagination

## Overview

The `UniversalPagination` component provides a themed, responsive pagination control built on top of HeroUI's `Pagination` primitive. It displays the current page number, total pages, and navigation controls with a glassmorphic container and glow effect. The component is used across multiple listing pages including items, categories, and tags.

## Import

```typescript
import { UniversalPagination } from "@/components/universal-pagination";
// or
import UniversalPagination from "@/components/universal-pagination";
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `page` | `number` | Yes | - | The current active page number (1-indexed). |
| `totalPages` | `number` | Yes | - | The total number of pages available. |
| `onPageChange` | `(page: number) => void` | Yes | - | Callback fired when the user clicks a page number or navigation arrow. |
| `className` | `string` | No | `""` | Additional CSS classes for the outer container `div`. |

## Usage Examples

### Basic Usage

```tsx
const [page, setPage] = useState(1);
const totalPages = Math.ceil(items.length / PAGE_SIZE);

<UniversalPagination
  page={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```

### With Custom Styling

```tsx
<UniversalPagination
  page={currentPage}
  totalPages={total}
  onPageChange={handlePageChange}
  className="mt-16 mb-8"
/>
```

### Conditional Rendering

The component automatically returns `null` when `totalPages <= 1`, so you can render it unconditionally:

```tsx
{/* Safe to render always - hides itself when only one page */}
<UniversalPagination
  page={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```

## Anatomy

The pagination control consists of three layers:

1. **Page info text** - "Page X of Y" with themed number highlighting.
2. **Background glow** - A blurred gradient div (`bg-linear-to-r from-primary-500/10`) that intensifies on hover.
3. **Pagination bar** - Glassmorphic container (`bg-white/80 dark:bg-gray-900/80 backdrop-blur-xs`) holding the HeroUI `Pagination` component with previous/next controls.

## Styling

The component applies extensive custom `classNames` to HeroUI's `Pagination`:

| Element | Styling |
|---------|---------|
| **Wrapper** | Centered flex container with `gap-2`. |
| **Page items** | `min-w-10 h-10` with hover scale (`hover:scale-105`) and active scale (`active:scale-95`). Hover background transitions to theme primary. |
| **Active cursor** | `bg-theme-primary! text-white font-semibold` with a `shadow-lg` in theme primary color and a 2px border. |
| **Prev/Next buttons** | Gradient background `from-gray-50 to-gray-100` (light) / `from-gray-800 to-gray-700` (dark) with themed hover border. Disabled state at `opacity-50`. |

The outer container uses responsive horizontal padding: `px-4 sm:px-8 lg:px-16`.

## Accessibility

- HeroUI's `Pagination` provides built-in ARIA attributes including `role="navigation"` and `aria-label` on page buttons.
- Previous and next controls include `aria-disabled` when at the first or last page.
- The `showControls` prop enables dedicated previous/next arrow buttons for users who prefer sequential navigation.
- All interactive elements are keyboard-focusable with visible focus indicators.
- The page info text provides a screen-reader-friendly summary of the current position.

## Related Components

- [Categories Grid](/template/components/categories-grid-components) - Uses UniversalPagination in standard pagination mode.
- [Shared Card Components](/template/components/shared-card-components) - Main item listing that integrates UniversalPagination.
- [Pagination Components](/template/components/pagination-components) - Additional pagination utilities and hooks.
