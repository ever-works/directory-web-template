---
id: breadcrumbs
title: Navigation par fil d'Ariane
sidebar_label: Fil d'Ariane
sidebar_position: 26
---

# Navigation par fil d'Ariane

The template provides a breadcrumb navigation system with reusable UI components, page-specific breadcrumbs, and internationalization support. Breadcrumbs improve both user navigation and SEO by displaying the current page hierarchy.

## Architecture Overview

Breadcrumbs are implemented at three levels:

| Layer | File | Purpose |
|-------|------|---------|
| **Reusable UI** | `components/ui/breadcrumb.tsx` | Generic breadcrumb component accepting an array of items |
| **Item Detail** | `components/item-detail/breadcrumb.tsx` | Item-specific breadcrumb with category awareness |
| **Collections** | `app/[locale]/collections/components/collections-breadcrumb.tsx` | Collections page breadcrumb with i18n |

## Reusable Breadcrumb Component

The base breadcrumb component lives at `components/ui/breadcrumb.tsx` and accepts a typed array of breadcrumb items.

### BreadcrumbItem Interface

```ts
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

Each item has a `label` to display and an optional `href` for linking. The last item in the array is automatically rendered as plain text (the current page) rather than a link.

### Breadcrumb Props

```ts
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
}
```

- **items** -- Array of breadcrumb segments to display after the Home link
- **homeLabel** -- Label for the home link (defaults to `'Home'`)
- **className** -- Additional CSS classes to apply to the nav element

### Basic Usage

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

function MyPage() {
  return (
    <Breadcrumb
      items={[
        { label: 'Categories', href: '/categories' },
        { label: 'Productivity', href: '/categories/productivity' },
        { label: 'Current Tool' },
      ]}
    />
  );
}
```

### Rendering Behavior

The component renders an accessible `nav` element with an ordered list:

1. **Home link** -- Always displayed first with a house icon SVG and the `homeLabel` text
2. **Intermediate items** -- Rendered as clickable `Link` elements (from `next/link`) with chevron separators
3. **Last item** -- Rendered as a plain `span` with `aria-current="page"` for accessibility

```tsx
<nav className={cn('flex mb-8', className)} aria-label="Breadcrumb">
  <ol className="inline-flex items-center space-x-1 md:space-x-3">
    {/* Home link with icon */}
    <li className="inline-flex items-center text-black dark:text-white">
      <Link href="/">
        <HomeIcon />
        {homeLabel}
      </Link>
    </li>
    {/* Dynamic breadcrumb items with chevron separators */}
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <li key={index} aria-current={isLast ? 'page' : undefined}>
          <div className="flex items-center">
            <ChevronIcon />
            {item.href && !isLast ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span>{item.label}</span>
            )}
          </div>
        </li>
      );
    })}
  </ol>
</nav>
```

## Item Detail Breadcrumb

The `ItemBreadcrumb` component at `components/item-detail/breadcrumb.tsx` is specifically designed for item detail pages. It automatically integrates with the category system.

### Props

```ts
interface BreadcrumbProps {
  name: string;
  category: string | { id?: string } | null | undefined;
  categoryName: string | null | undefined;
}
```

### Category-Aware Navigation

The item breadcrumb uses the `useCategoriesEnabled` hook to conditionally render the category segment. When categories are enabled, the breadcrumb shows:

**Home** > **Category Name** > **Item Name**

When categories are disabled, it simplifies to:

**Home** > **Item Name**

```tsx
import { ItemBreadcrumb } from '@/components/item-detail/breadcrumb';

function ItemDetailPage({ item }) {
  return (
    <ItemBreadcrumb
      name={item.name}
      category={item.category}
      categoryName={item.categoryName}
    />
  );
}
```

### Slug Generation

The component processes category identifiers through the `slugify` utility to generate URL-safe paths:

```ts
const rawCategoryId =
  typeof firstCategory === 'string'
    ? firstCategory
    : (firstCategory as { id?: string })?.id || String(firstCategory);
const encodedCategory = encodeURIComponent(slugify(rawCategoryId));
```

Category links follow the pattern `/categories/{encoded-slug}`.

### Text Truncation

The item name is truncated to 200px maximum width using the `truncate max-w-[200px]` Tailwind classes, preventing long item names from breaking the layout.

## Collections Breadcrumb

The `CollectionsBreadcrumb` component at `app/[locale]/collections/components/collections-breadcrumb.tsx` demonstrates the i18n-aware pattern.

### Internationalization

This component uses `next-intl` for translating the breadcrumb labels:

```tsx
import { useTranslations } from 'next-intl';

export function CollectionsBreadcrumb() {
  const t = useTranslations('common');

  return (
    <nav className="flex mb-8 justify-center" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li>
          <Link href="/">{t('HOME')}</Link>
        </li>
        <li>
          <span>{t('COLLECTION')}</span>
        </li>
      </ol>
    </nav>
  );
}
```

Translation keys are defined in the `messages/` directory for each supported locale.

## Styling and Dark Mode

All breadcrumb components support dark mode through Tailwind's `dark:` prefix classes:

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Text | `text-black` | `dark:text-white` |
| Links | `text-gray-800` | `dark:text-white/50` |
| Chevron icons | `text-dark--theme-800` | `dark:text-white/50` |
| Hover state | `hover:text-gray-900` | `dark:hover:text-white` |

Transitions are applied with `transition-colors duration-300` for smooth hover effects.

## Accessibility

The breadcrumb components follow WAI-ARIA breadcrumb navigation best practices:

- **`aria-label="Breadcrumb"`** on the `nav` element identifies the landmark
- **`aria-current="page"`** on the last breadcrumb item marks the current page
- **`aria-hidden="true"`** on decorative SVG icons (home and chevron) hides them from screen readers
- **Semantic HTML** uses `nav > ol > li` structure for proper document outline

## Adding Custom Breadcrumbs

To create a new breadcrumb for a specific page, use the reusable `Breadcrumb` component:

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

export function SettingsBreadcrumb() {
  return (
    <Breadcrumb
      items={[
        { label: 'Dashboard', href: '/client/dashboard' },
        { label: 'Settings' },
      ]}
      homeLabel="Home"
      className="mb-6"
    />
  );
}
```

For pages that need translated labels, wrap the component and pass translated strings:

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useTranslations } from 'next-intl';

export function LocalizedBreadcrumb() {
  const t = useTranslations('common');
  return (
    <Breadcrumb
      items={[
        { label: t('DASHBOARD'), href: '/client/dashboard' },
        { label: t('SETTINGS') },
      ]}
      homeLabel={t('HOME')}
    />
  );
}
```

## Related Files

| File | Description |
|------|-------------|
| `components/ui/breadcrumb.tsx` | Reusable generic breadcrumb component |
| `components/item-detail/breadcrumb.tsx` | Item detail page breadcrumb |
| `app/[locale]/collections/components/collections-breadcrumb.tsx` | Collections page breadcrumb |
| `hooks/use-categories-enabled.ts` | Hook to check if categories feature is active |
| `lib/utils/slug.ts` | Slug generation utilities (`slugify`, `deslugify`) |