---
id: shared-card-components
title: Shared Card Components
sidebar_label: Shared Card Components
sidebar_position: 39
---

# Shared Card Components

The `components/shared-card/` directory contains the reusable card listing system that powers every item grid across the template. It orchestrates filtering, sorting, pagination, layout switching, map views, and empty states through a composable, SOLID-compliant architecture.

## Architecture Overview

```
components/shared-card/
  index.tsx                    # Main SharedCard component, types, presets, exports
  shared-card-grid.tsx         # Grid renderer with staggered animations
  shared-card-header.tsx       # Header with stats, filter badges, view toggle
  shared-card-pagination.tsx   # Standard pagination and infinite scroll
  listing-client.tsx           # Client wrapper with route-aware config
  hooks/
    use-item-filtering.ts      # Memoized search + tag filtering
    use-item-sorting.ts        # Memoized sort by name, date, popularity
    use-pagination-logic.ts    # Page slicing and filter-change detection
  utils/
    sort-utils.ts              # Sort functions and popularity scoring algorithm
    filter-utils.ts            # Search, tag, and combined filter functions
```

The data flows through a pipeline: **raw items -> filter -> sort -> paginate -> render**. Each stage is a memoized hook, so the component only recalculates when its specific inputs change.

## Key Interfaces

```ts
interface BaseCardProps {
  total: number;
  start: number;
  page: number;
  basePath: string;
  categories: Category[];
  tags: Tag[];
  items: ItemData[];
  totalCount?: number;
}

interface CardConfigOptions {
  showStats?: boolean;          // Display filtered/total count
  showViewToggle?: boolean;     // Grid/list/compact layout switcher
  showFilters?: boolean;        // Results header with filter summary
  showPagination?: boolean;     // Enable pagination controls
  showEmptyState?: boolean;     // Show empty state when no results
  enableSearch?: boolean;       // Enable text search filtering
  enableTagFilter?: boolean;    // Enable tag-based filtering
  enableSorting?: boolean;      // Enable sort dropdown
  customEmptyMessage?: string;  // Override empty state title
  customEmptyDescription?: string;
  perPage?: number;             // Items per page (default from PER_PAGE)
  defaultLayout?: LayoutKey;    // Initial layout variant
}

interface ExtendedCardProps extends BaseCardProps {
  config?: CardConfigOptions;
  className?: string;
  onItemClick?: (item: ItemData) => void;
  renderCustomItem?: (item: ItemData, index: number) => React.ReactNode;
  renderCustomEmpty?: () => React.ReactNode;
  headerActions?: React.ReactNode;
}
```

## Preset Configurations

Six presets cover common use cases. Pass them via the `config` prop.

| Preset | Stats | View Toggle | Filters | Pagination | Search | Tags | Sorting |
|---|---|---|---|---|---|---|---|
| `fullListing` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `showViewToggle` | Yes | No | Yes | Yes | Yes | Yes | Yes |
| `homeTwoListing` | No | No | No | Yes | No | No | Yes |
| `simple` | No | No | No | No | No | No | No |
| `productGrid` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `searchResults` | Yes | No | Yes | Yes | Yes | Yes | Yes |

## Usage Examples

```tsx
import { SharedCard, CardPresets, SimpleCard } from "@/components/shared-card";

// Full-featured listing page
<SharedCard
  items={items}
  tags={tags}
  categories={categories}
  total={total}
  start={0}
  page={1}
  basePath="/items"
  config={CardPresets.fullListing}
  onItemClick={(item) => router.push(`/items/${item.slug}`)}
/>

// Minimal card grid with no controls
<SimpleCard {...props} preset="simple" />

// Custom item rendering
<SharedCard
  {...props}
  config={CardPresets.productGrid}
  renderCustomItem={(item, index) => <ProductTile key={item.slug} item={item} />}
  renderCustomEmpty={() => <CustomEmptyState />}
/>
```

## Sorting Algorithm

The popularity sort uses a logarithmic scoring system designed to scale to millions of items:

- **Featured items**: +10,000 points
- **Views** (log10 scale, weight 1000): 10 views = 1000pts, 1M views = 6000pts
- **Votes** (log10 scale, weight 1200): Higher weight for active engagement
- **Rating** (linear, 500 per star): Max 2500pts for 5-star items
- **Favorites** (log10 scale, weight 1100): Strong interest signal
- **Comments** (log10 scale, weight 1000): Discussion indicator
- **Recency decay**: Items within 30 days get up to 1000pts, decaying to zero at 180 days

When engagement data is unavailable, a fallback heuristic scores items by tag count, name quality, icon presence, and promo code status.

## Pagination Modes

The component supports two pagination strategies, controlled by the `paginationType` value from `LayoutThemeContext`:

- **Standard**: Traditional page-based navigation with `UniversalPagination`. The `usePaginationLogic` hook manages page state and scrolls to top on page change.
- **Infinite scroll**: Uses `react-intersection-observer` to detect when a sentinel element enters the viewport. A 100px root margin triggers pre-loading before the user reaches the bottom.

Filter changes (search term, tags, sort option) automatically reset pagination to page one via the `useFilterChangeDetection` hook.

## Map View Integration

When location settings are enabled and a Mapbox or Google Maps API key is configured, the header displays a map toggle button. Activating map view replaces the card grid with a `LayoutMap` component that renders items geographically. Switching back to any card layout automatically exits map view.

## Sub-Components

| Component | File | Responsibility |
|---|---|---|
| `SharedCardGrid` | `shared-card-grid.tsx` | Renders items with staggered fade-in animations (capped at 200ms). Shows `ItemSkeletonGrid` while loading. |
| `SharedCardHeader` | `shared-card-header.tsx` | Filter stats, active filter badges, view toggle, and custom header actions. |
| `FilterStats` | `shared-card-header.tsx` | Displays "Showing X of Y" with filter indicator badges. |
| `EmptyState` | `shared-card-header.tsx` | Full empty state with search icon, message, description, and active filter pills. |
| `SharedCardPagination` | `shared-card-pagination.tsx` | Delegates to `StandardPagination` or `InfiniteScrollPagination` based on type. |
| `ListingClient` | `listing-client.tsx` | Route-aware wrapper that adjusts config for category pages. |

## Accessibility

- The grid container uses `suppressHydrationWarning` to handle layout mismatch during SSR hydration.
- Empty state icons include descriptive heading text for screen readers.
- Filter badges use semantic `<span>` elements with readable text content.
- Pagination controls delegate to `UniversalPagination`, which provides full keyboard navigation and ARIA labels.
- Infinite scroll loading indicators use `role="status"` and descriptive text.

## Configuration Tips

- Set `perPage` to control items per page independently of the global `PER_PAGE` constant.
- Use `renderCustomItem` to replace the default `Item` component while keeping all filtering and pagination logic.
- Combine `headerActions` with `showViewToggle: false` to provide your own toolbar.
- The `ListingClient` wrapper automatically enables tag filtering and pagination on category pages.

## Related Documentation

- [Filter System](/docs/template/components/filter-system) -- Filter context and URL sync
- [Layout Components](/docs/template/components/layout-components) -- Grid, list, and compact layouts
- [Pagination Components](/docs/template/components/pagination-components) -- Universal pagination
- [Maps Components](/docs/template/components/maps-components) -- Map view integration
