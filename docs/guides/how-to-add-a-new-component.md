---
id: how-to-add-a-new-component
title: "How to Add a New Component"
sidebar_label: "Add a New Component"
sidebar_position: 10
---

# How to Add a New Component

This guide covers component development best practices: file structure, props design, styling with Tailwind CSS, accessibility, dark mode support, and integration with the template's UI system.

## Prerequisites

- Familiarity with React and TypeScript
- Understanding of Tailwind CSS utility classes
- Knowledge of the `components/` directory organization
- Development server running (`pnpm dev`)

---

## Architecture Overview

Components are organized by purpose and feature:

```
components/
  ui/                          # Primitive UI components (button, card, input, etc.)
    button.tsx
    card.tsx
    input.tsx
    modal.tsx
    ...
  admin/                       # Admin panel components
    shared/                    # Shared admin components (search, filters, tabs)
    items/                     # Item management components
    ...
  auth/                        # Authentication components
  billing/                     # Billing and payment components
  dashboard/                   # Dashboard widgets
  directory/                   # Directory listing components
  favorites/                   # Favorites feature components
  header/                      # Header and navigation
  footer/                      # Footer components
  layout/                      # Layout wrappers
  settings/                    # Settings panel components
  shared/                      # Shared components used across features
  providers/                   # React context providers
```

---

## Step 1: Choose the Right Location

| Type | Directory | Examples |
|------|-----------|---------|
| Primitive UI element | `components/ui/` | Button, Input, Card, Modal |
| Feature-specific | `components/{feature}/` | `components/bookmarks/bookmark-button.tsx` |
| Admin section | `components/admin/{section}/` | `components/admin/coupons/coupon-form.tsx` |
| Shared across features | `components/shared/` | StatusBadge, EmptyState |
| Layout wrapper | `components/layout/` | PageContainer, SidebarLayout |

---

## Step 2: Create the Component File

### Basic Component Structure

```tsx
// components/bookmarks/bookmark-card.tsx

'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bookmark, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

// --- Types ---
interface BookmarkCardProps {
  /** The bookmarked item's display name */
  title: string;
  /** Short description of the item */
  description: string;
  /** URL slug for navigation */
  slug: string;
  /** When the bookmark was created */
  createdAt: string;
  /** Callback when the remove button is clicked */
  onRemove?: (slug: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// --- Component ---
export function BookmarkCard({
  title,
  description,
  slug,
  createdAt,
  onRemove,
  className,
}: BookmarkCardProps) {
  const t = useTranslations('bookmarks');

  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md',
        className,
      )}
    >
      <CardContent className="flex items-start gap-4 p-4">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
          <Bookmark className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
          <time className="mt-2 block text-xs text-gray-400 dark:text-gray-500">
            {new Date(createdAt).toLocaleDateString()}
          </time>
        </div>

        {/* Actions */}
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(slug)}
            aria-label={t('REMOVE_BOOKMARK')}
            className="shrink-0 text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Step 3: Define Props with TypeScript

### Prop Design Conventions

```tsx
interface ComponentProps {
  // Required props -- no default, no ?
  title: string;

  // Optional props -- use ?
  description?: string;

  // Callback props -- prefix with on
  onClick?: () => void;
  onRemove?: (id: string) => void;

  // Boolean props -- use is/has prefix
  isLoading?: boolean;
  hasError?: boolean;

  // Variant props -- use union types
  variant?: 'default' | 'compact' | 'detailed';
  size?: 'sm' | 'md' | 'lg';

  // Style override -- always accept className
  className?: string;

  // Children -- when component is a wrapper
  children?: React.ReactNode;
}
```

### Use JSDoc for Prop Documentation

```tsx
interface BookmarkCardProps {
  /** The bookmarked item's display name */
  title: string;
  /** Maximum 200 characters; truncated with ellipsis */
  description: string;
  /** Called when the user clicks the remove button */
  onRemove?: (slug: string) => void;
}
```

---

## Step 4: Style with Tailwind CSS

### Use the `cn()` Utility for Conditional Classes

The template provides a `cn()` helper (from `lib/utils`) that merges Tailwind classes cleanly:

```tsx
import { cn } from '@/lib/utils';

<div
  className={cn(
    'rounded-lg border p-4',                      // Base styles
    isActive && 'border-blue-500 bg-blue-50',     // Conditional
    isDisabled && 'cursor-not-allowed opacity-50', // Conditional
    className,                                     // External override
  )}
/>
```

### Dark Mode Support

Always include dark mode variants for colors:

```tsx
// Text colors
<p className="text-gray-900 dark:text-gray-100">Primary text</p>
<p className="text-gray-500 dark:text-gray-400">Secondary text</p>
<p className="text-gray-400 dark:text-gray-500">Muted text</p>

// Backgrounds
<div className="bg-white dark:bg-gray-900">Card background</div>
<div className="bg-gray-50 dark:bg-gray-800">Section background</div>
<div className="bg-gray-100 dark:bg-gray-700">Nested background</div>

// Borders
<div className="border border-gray-200 dark:border-gray-700">Bordered</div>

// Hover states
<button className="hover:bg-gray-100 dark:hover:bg-gray-800">
  Hover me
</button>
```

### Responsive Design

Use Tailwind breakpoints consistently:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
</div>

<p className="text-sm md:text-base lg:text-lg">
  {/* Responsive font size */}
</p>
```

---

## Step 5: Accessibility

### Required Accessibility Patterns

```tsx
// 1. Button labels for icon-only buttons
<Button
  variant="ghost"
  size="icon"
  aria-label="Remove bookmark"  // Always provide for icon buttons
>
  <Trash2 className="h-4 w-4" />
</Button>

// 2. Form labels
<div>
  <Label htmlFor="coupon-code">Coupon Code</Label>
  <Input id="coupon-code" />
</div>

// 3. Loading states
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? <Skeleton /> : <Content />}
</div>

// 4. Keyboard navigation
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Clickable div
</div>

// 5. Images
<img src={url} alt="Descriptive text for the image" />
```

### Focus Management

```tsx
// Focus visible styling (provided by Tailwind)
<button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
  Focusable
</button>
```

---

## Step 6: Use Existing UI Primitives

The template includes a set of base UI components in `components/ui/`. Always compose with these rather than building from scratch:

### Common Primitives

```tsx
// Button -- with variants and sizes
import { Button } from '@/components/ui/button';
<Button variant="default">Primary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button size="icon"><Plus /></Button>

// Card -- for content containers
import { Card, CardContent } from '@/components/ui/card';
<Card>
  <CardContent>Content here</CardContent>
</Card>

// Input and Label -- for forms
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
<Label htmlFor="name">Name</Label>
<Input id="name" placeholder="Enter name" />

// Badge -- for status indicators
import { Badge } from '@/components/ui/badge';
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Draft</Badge>
<Badge variant="destructive">Expired</Badge>

// Skeleton -- for loading states
import { Skeleton } from '@/components/ui/skeleton';
<Skeleton className="h-4 w-[200px]" />
```

---

## Step 7: Handle Loading, Empty, and Error States

Every data-driven component should handle three states:

```tsx
interface DataListProps {
  items: Item[];
  isLoading: boolean;
  isError: boolean;
  error?: Error;
}

export function DataList({ items, isLoading, isError, error }: DataListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950">
        <p className="text-red-600 dark:text-red-400">
          {error?.message || 'Something went wrong'}
        </p>
        <Button variant="outline" size="sm" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Bookmark className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          No items found
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Get started by creating your first item.
        </p>
      </div>
    );
  }

  // Data state
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <ItemCard key={item.id} {...item} />
      ))}
    </div>
  );
}
```

---

## Step 8: Component Composition Pattern

Build complex components by composing smaller ones:

```tsx
// components/bookmarks/bookmarks-page.tsx

'use client';

import { useBookmarks } from '@/hooks/use-bookmarks';
import { BookmarkCard } from './bookmark-card';
import { BookmarksEmptyState } from './bookmarks-empty-state';
import { BookmarksHeader } from './bookmarks-header';
import { Skeleton } from '@/components/ui/skeleton';

export function BookmarksPage() {
  const { bookmarks, isLoading, toggleBookmark } = useBookmarks();

  return (
    <div className="space-y-6">
      <BookmarksHeader count={bookmarks.length} />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <BookmarksEmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {bookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              title={bookmark.itemName}
              description={bookmark.itemDescription}
              slug={bookmark.itemSlug}
              createdAt={bookmark.createdAt}
              onRemove={() => toggleBookmark(bookmark.itemSlug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Step 9: Icons

Use icons from `lucide-react`, which is already installed:

```tsx
import {
  Plus,
  Trash2,
  Bookmark,
  Search,
  Settings,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// Standard icon sizes
<Plus className="h-4 w-4" />    // Small (in buttons, inline)
<Plus className="h-5 w-5" />    // Medium (in navigation)
<Plus className="h-6 w-6" />    // Large (standalone)
<Plus className="h-12 w-12" />  // XL (empty states)

// Animated spinner
<Loader2 className="h-4 w-4 animate-spin" />
```

---

## File Structure for a Feature Component Set

```
components/
  bookmarks/
    bookmark-button.tsx         # Toggle button for item cards
    bookmark-card.tsx           # Card display for bookmark lists
    bookmarks-empty-state.tsx   # Empty state illustration
    bookmarks-header.tsx        # Header with count and actions
    bookmarks-page.tsx          # Full page composition
    index.ts                    # Barrel exports
```

The `index.ts` barrel file:

```ts
// components/bookmarks/index.ts

export { BookmarkButton } from './bookmark-button';
export { BookmarkCard } from './bookmark-card';
export { BookmarksEmptyState } from './bookmarks-empty-state';
export { BookmarksHeader } from './bookmarks-header';
export { BookmarksPage } from './bookmarks-page';
```

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Component does not render | Ensure `'use client'` is at the top if it uses hooks, state, or event handlers. |
| Dark mode looks wrong | Always pair light and dark variants: `text-gray-900 dark:text-gray-100`. |
| Tailwind classes not applying | Ensure the file path is included in `tailwind.config.ts` content paths. |
| Component too large | Split into smaller sub-components. A single file should rarely exceed 200 lines. |
| Props interface too complex | Use composition -- pass children or render props instead of dozens of config props. |
| Accessibility warnings | Run Lighthouse or axe-core. Ensure all interactive elements have labels and are keyboard accessible. |
| Layout shift on load | Use `Skeleton` components with matching dimensions for loading states. |

---

## Component Naming Conventions

| Convention | Example |
|------------|---------|
| PascalCase for component names | `BookmarkCard`, `AdminSearchBar` |
| kebab-case for file names | `bookmark-card.tsx`, `admin-search-bar.tsx` |
| Props suffix for interfaces | `BookmarkCardProps` |
| Feature directory grouping | `components/bookmarks/`, `components/admin/items/` |
| Barrel exports via `index.ts` | `export { BookmarkCard } from './bookmark-card'` |

---

## Checklist

- [ ] Component file created in the appropriate directory
- [ ] `'use client'` directive added (if using hooks/interactivity)
- [ ] Props interface defined with TypeScript (JSDoc comments for each prop)
- [ ] `className` prop accepted and merged with `cn()`
- [ ] Dark mode styles included for all colors
- [ ] Loading, empty, and error states handled
- [ ] Accessibility: `aria-label` on icon buttons, labels on inputs, keyboard support
- [ ] Responsive design with Tailwind breakpoints
- [ ] Existing UI primitives reused (`Button`, `Card`, `Input`, etc.)
- [ ] Icons from `lucide-react`
- [ ] Translations used via `useTranslations()` -- no hardcoded strings
- [ ] Component exported from barrel `index.ts` (if in a feature directory)
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm lint` passes

---

## Related Guides

- [How to Add a New Feature](./how-to-add-a-new-feature.md)
- [How to Add a New Hook](./how-to-add-a-new-hook.md)
- [How to Add Translations](./how-to-add-translations.md)
- [How to Create Admin Pages](./how-to-create-admin-pages.md)
