---
id: shared-components
title: Shared Utility Components
sidebar_label: Shared Utilities
sidebar_position: 7
---

# Shared Utility Components

The shared components provide reusable UI elements used across many parts of the application, including decorative backgrounds, pagination displays, site logos, and the core listing card system with filtering, sorting, and layout management.

## Architecture Overview

```
template/components/shared/
  decorative-bg.tsx                # Background patterns and decorative effects
  pagination-display/
    index.ts                       # Barrel export
    pagination-display.tsx         # Pagination count display component
    types.ts                       # TypeScript interfaces
    use-pagination-counts.ts       # Count calculation hook
  site-logo/
    index.ts                       # Barrel export
    site-logo.tsx                  # Dynamic site logo component

template/components/shared-card/
  hooks/
    use-item-filtering.ts          # Client-side item filtering
    use-item-sorting.ts            # Client-side item sorting
    use-pagination-logic.ts        # Pagination state management
  index.tsx                        # SharedCard main component + presets
  listing-client.tsx               # Client listing wrapper
  shared-card-grid.tsx             # Grid renderer with layout adapters
  shared-card-header.tsx           # Header with stats, filters, view toggle
  shared-card-pagination.tsx       # Pagination controls (standard + infinite)
  utils/
    filter-utils.ts                # Tag/category filtering helpers
    sort-utils.ts                  # Sort comparison functions
```

## Decorative Backgrounds

### DecorativeBg

A visual background pattern used in hero sections, featuring a dot pattern image with a radial gradient orb.

```tsx
import DecorativeBg from '@/components/shared/decorative-bg';

<DecorativeBg reverse={false} className="custom-class" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional CSS classes |
| `reverse` | `boolean` | `false` | Flip vertically (for bottom placement) |

### GridBackground

A grid pattern background with animated floating stars, used for page hero sections and form headers.

```tsx
import { GridBackground } from '@/components/shared/decorative-bg';

<GridBackground className="w-full h-[300px]">
  {/* Optional children rendered above the grid */}
</GridBackground>
```

Features:
- CSS grid pattern with fade mask
- `StarsBackground` overlay with configurable color and glow
- Radial gradient orb for depth
- 20 randomly positioned stars with staggered upward animation

### DotBgsible

A variation of `DecorativeBg` that uses container-width awareness for fluid layouts.

### StarsBackground

Animated star particles rising from bottom to top with randomized positions, delays, and durations.

```tsx
<StarsBackground
  className="z-20"
  color="#6209bb"
  glow={true}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `string` | `"#fff"` | Star color (25% are always white) |
| `glow` | `boolean` | `false` | Add box-shadow glow effect |

## Pagination Display

### PaginationDisplay

Displays item count information with filter-aware messaging.

```tsx
import { PaginationDisplay } from '@/components/shared/pagination-display';

<PaginationDisplay
  totalCount={218}
  filteredCount={45}
  currentPage={0}
  perPage={12}
  hasActiveFilters={true}
  isInfinite={false}
  sortBy="name-asc"
/>
```

#### Display Logic

| Condition | Output |
|-----------|--------|
| No filters active | "Showing 218 items" |
| Filters active | "Showing 45 of 218 items" |
| Sorted (non-default) | Appends "(sorted by Name A-Z)" |

### PaginationDisplayProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `totalCount` | `number` | required | Total unfiltered items |
| `filteredCount` | `number` | required | Items after filtering |
| `currentPage` | `number` | required | Current page (0-indexed) |
| `perPage` | `number` | required | Items per page |
| `hasActiveFilters` | `boolean` | required | Whether filters are applied |
| `isInfinite` | `boolean` | `false` | Infinite scroll mode |
| `sortBy` | `SortOption` | - | Current sort option |

### usePaginationCounts Hook

Calculates display values from pagination parameters. Returns:

| Property | Type | Description |
|----------|------|-------------|
| `start` | `number` | 0-indexed start position |
| `startDisplay` | `number` | 1-indexed display start |
| `endDisplay` | `number` | 1-indexed display end |
| `hasResults` | `boolean` | Whether results exist |
| `countText` | `string` | Formatted count string |
| `rangeText` | `string` | Formatted range string |

## SiteLogo

A dynamic logo component that supports multiple display modes based on site configuration.

```tsx
import { SiteLogo } from '@/components/shared/site-logo';

<SiteLogo size="md" showText={true} linkToHome={true} />
```

### SiteLogoProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Logo size preset |
| `className` | `string` | `''` | Additional CSS classes |
| `showText` | `boolean` | `true` | Show company name text |
| `linkToHome` | `boolean` | `true` | Wrap in home link |

### Display Modes

The logo renders in one of two modes based on site configuration:

| Mode | Condition | Behavior |
|------|-----------|----------|
| **Image Logo** | `config.logo.logo_image` is set | Renders the image, with dark variant support |
| **Text + Icon** | No logo image configured | Shows favicon (or default icon) + company name |

Dark mode: When `logo_image_dark` is configured and the resolved theme is `'dark'`, the dark variant image is used automatically.

## SharedCard (Listing System)

The `SharedCard` is the primary component for rendering filtered, sorted, paginated lists of directory items. It orchestrates filtering, sorting, pagination, layout switching, and map view.

```tsx
import { SharedCard, CardPresets } from '@/components/shared-card';

<SharedCard
  items={items}
  categories={categories}
  tags={tags}
  total={218}
  start={0}
  page={1}
  basePath="/directory"
  config={CardPresets.fullListing}
/>
```

### ExtendedCardProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `ItemData[]` | required | Array of directory items |
| `categories` | `Category[]` | required | Available categories |
| `tags` | `Tag[]` | required | Available tags |
| `total` | `number` | required | Total count |
| `config` | `CardConfigOptions` | defaults | Feature configuration |
| `onItemClick` | `(item) => void` | - | Item click handler |
| `renderCustomItem` | `(item, index) => ReactNode` | - | Custom item renderer |
| `renderCustomEmpty` | `() => ReactNode` | - | Custom empty state |
| `headerActions` | `ReactNode` | - | Extra header content |

### CardConfigOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showStats` | `boolean` | `true` | Show item count statistics |
| `showViewToggle` | `boolean` | `true` | Show layout view switcher |
| `showFilters` | `boolean` | `true` | Show filter info header |
| `showPagination` | `boolean` | `true` | Show pagination controls |
| `showEmptyState` | `boolean` | `true` | Show empty state when no items |
| `enableSearch` | `boolean` | `true` | Enable text search filtering |
| `enableTagFilter` | `boolean` | `true` | Enable tag-based filtering |
| `enableSorting` | `boolean` | `true` | Enable sort controls |
| `perPage` | `number` | `PER_PAGE` | Items per page |
| `defaultLayout` | `LayoutKey` | `"classic"` | Initial layout view |

### Configuration Presets

| Preset | Stats | ViewToggle | Filters | Pagination | Search | Sort |
|--------|-------|------------|---------|------------|--------|------|
| `fullListing` | Yes | Yes | Yes | Yes | Yes | Yes |
| `simple` | No | No | No | No | No | No |
| `productGrid` | Yes | Yes | Yes | Yes | Yes | Yes |
| `searchResults` | Yes | No | Yes | Yes | Yes | Yes |
| `homeTwoListing` | No | No | No | Yes | No | Yes |

### SharedCardGrid

Renders items in the current layout with staggered entrance animations.

```tsx
<SharedCardGrid
  items={displayedItems}
  LayoutComponent={LayoutComponent}
  layout="grid"
  onItemClick={handleClick}
  animationDelay={30}
/>
```

Each item receives an `animate-fade-in-up-subtle` animation with a delay capped at 200ms.

### SharedCardHeader

Orchestrates the header row with pagination display, filter badges, view toggle, and map toggle.

### SharedCardPagination

Renders either standard page controls or infinite scroll sentinel based on `paginationType`.

## Integration Example

```tsx
import { FilterProvider, Tags, Categories } from '@/components/filters';
import { SharedCard, CardPresets } from '@/components/shared-card';
import { SiteLogo } from '@/components/shared/site-logo';

function DirectoryPage({ items, categories, tags }) {
  return (
    <div>
      <SiteLogo size="lg" />
      <FilterProvider>
        <Categories total={items.length} categories={categories} />
        <Tags tags={tags} mode="filter" />
        <SharedCard
          items={items}
          categories={categories}
          tags={tags}
          total={items.length}
          start={0}
          page={1}
          basePath="/directory"
          config={CardPresets.fullListing}
        />
      </FilterProvider>
    </div>
  );
}
```
