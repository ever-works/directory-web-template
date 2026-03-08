---
id: filter-system
title: Filter System Components
sidebar_label: Filter System
sidebar_position: 0
---

# Filter System Components

The filter system is a comprehensive set of components, hooks, and utilities that power the directory listing filtering experience. It supports multi-select tags and categories, text search, location-based filtering, URL synchronization, and sort controls.

## Architecture Overview

```
template/components/filters/
  components/
    active-filters/      # Displays currently applied filters with remove actions
    categories/          # Category list, section, and item components
    controls/            # Search input, sort dropdown, filter bar
    location/            # Near Me, City, Country, Radius filters
    pagination/          # Standard and infinite scroll pagination
    tags/                # Tag list, section, and item components
  context/
    filter-context.tsx         # React Context provider for filter state
    location-distance-context.tsx  # Context for item distance data
  hooks/
    use-filter-state.ts        # Core state management hook
    use-filter-url-sync.ts     # URL synchronization hook
    use-sticky-header.ts       # Scroll-based sticky behavior
    use-tag-visibility.ts      # Show more/less tag toggling
  constants.ts                 # Configuration constants
  filter-url-parser.tsx        # Client-side URL-to-state parser
  index.ts                     # Barrel exports
  types.ts                     # TypeScript type definitions
  utils/
    style-utils.ts             # CSS class helpers
    tag-utils.ts               # Tag data transformation helpers
    text-utils.ts              # Text truncation and formatting
```

## Core Types

The filter system defines a central `FilterContextType` interface that all components consume:

| Property | Type | Description |
|----------|------|-------------|
| `searchTerm` | `string` | Current text search query |
| `selectedTags` | `TagId[]` | Array of selected tag identifiers |
| `selectedCategories` | `CategoryId[]` | Array of selected category identifiers |
| `sortBy` | `SortOption` | Current sort mode |
| `isFiltersLoading` | `boolean` | Loading indicator during filter updates |
| `locationFilter` | `LocationFilterState` | Active location filter state |
| `selectedTag` | `TagId \| null` | Single selected tag for navigation mode |
| `selectedCategory` | `CategoryId \| null` | Single selected category for navigation mode |

### Sort Options

Defined in `constants.ts`, the five sort options are:

| Constant | Value | Label Key |
|----------|-------|-----------|
| `POPULARITY` | `'popularity'` | `POPULARITY` |
| `NAME_ASC` | `'name-asc'` | `NAME_A_Z` |
| `NAME_DESC` | `'name-desc'` | `NAME_Z_A` |
| `DATE_DESC` | `'date-desc'` | `NEWEST` |
| `DATE_ASC` | `'date-asc'` | `OLDEST` |

### Location Filter State

```typescript
interface LocationFilterState {
  nearMe?: NearMeCoordinates;  // { latitude, longitude, radius }
  city?: string;
  country?: string;
  sortByDistance?: boolean;
}
```

## FilterProvider

The `FilterProvider` component wraps any page section that needs filter capabilities. It initializes state from route parameters and provides context to all child components.

```tsx
import { FilterProvider } from '@/components/filters';

<FilterProvider
  initialTag="open-source"
  initialCategory="productivity"
  initialSortBy="popularity"
>
  <Tags tags={tags} />
  <Categories categories={categories} total={total} />
  <SharedCard items={items} {...props} />
</FilterProvider>
```

### FilterProvider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Child components |
| `initialTag` | `string \| null` | `null` | Pre-selected tag from route |
| `initialCategory` | `string \| null` | `null` | Pre-selected category from route |
| `initialSortBy` | `string` | `'popularity'` | Initial sort order |

## Filter Components

### Categories

The category system provides two rendering modes:

| Mode | Behavior |
|------|----------|
| `"navigation"` | Links to `/categories/[slug]` routes |
| `"filter"` | Toggles category selection in filter context |

```tsx
<Categories total={218} categories={categories} />
```

#### CategoriesListProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `categories` | `Category[]` | required | Array of category objects |
| `mode` | `"navigation" \| "filter"` | `"navigation"` | Rendering behavior |
| `selectedCategories` | `string[]` | `[]` | Currently selected IDs |
| `onCategoryToggle` | `(id: string) => void` | - | Toggle callback for filter mode |

### Tags

Tags support sticky header behavior, visibility limiting, and both navigation and filter modes.

```tsx
<Tags
  tags={tags}
  enableSticky={true}
  maxVisibleTags={8}
  mode="filter"
  total={218}
/>
```

#### TagsProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tags` | `Tag[]` | required | Array of tag objects |
| `enableSticky` | `boolean` | `false` | Enable sticky scroll behavior |
| `maxVisibleTags` | `number` | `8` | Tags shown before "Show More" |
| `mode` | `"navigation" \| "filter"` | `"navigation"` | Rendering behavior |
| `total` | `number` | - | Total item count for display |

### ActiveFilters

Displays all currently applied filters as removable chips, with a "Clear All" action.

```tsx
<ActiveFilters
  searchTerm={searchTerm}
  selectedTags={selectedTags}
  selectedCategories={selectedCategories}
  sortBy={sortBy}
  availableTags={tags}
  availableCategories={categories}
  clearAllFilters={clearAllFilters}
  {...setters}
/>
```

### FilterControls

Combines search input and sort dropdown into a single toolbar row.

### Location Components

The location subdirectory provides five specialized components:

| Component | File | Purpose |
|-----------|------|---------|
| `LocationFilter` | `LocationFilter.tsx` | Parent orchestrator for all location UI |
| `NearMeButton` | `NearMeButton.tsx` | Geolocation trigger using browser API |
| `RadiusSlider` | `RadiusSlider.tsx` | Distance radius adjustment (km) |
| `CityFilter` | `CityFilter.tsx` | City name autocomplete filter |
| `CountryFilter` | `CountryFilter.tsx` | Country selection filter |

### Pagination

```tsx
<Paginate
  basePath="/directory"
  initialPage={1}
  total={218}
  paginationType="standard"  // or "infinite"
/>
```

#### PaginateProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `basePath` | `string` | required | Base URL path for page links |
| `initialPage` | `number` | required | Starting page number |
| `total` | `number` | required | Total item count |
| `paginationType` | `"standard" \| "infinite"` | `"standard"` | Pagination strategy |
| `onLoadMore` | `(page: number) => Promise<void>` | - | Infinite scroll callback |

## Hooks

### useFilterState

The primary state management hook. Returns all filter state values and their setters, including tag/category toggle actions, location filter controls, and URL synchronization.

Key actions provided:

| Action | Signature | Description |
|--------|-----------|-------------|
| `toggleSelectedTag` | `(tagId: TagId) => void` | Add or remove a tag |
| `toggleSelectedCategory` | `(categoryId: CategoryId) => void` | Select one category (exclusive) |
| `clearAllFilters` | `() => void` | Reset all filters and URL |
| `setNearMe` | `(coords \| null) => void` | Enable/disable geolocation filter |
| `setLocationCity` | `(city \| null) => void` | Set city filter |
| `setLocationCountry` | `(country \| null) => void` | Set country filter |

### useFilterURLSync

Synchronizes filter state to URL query parameters using `window.history.replaceState`. Uses 300ms debouncing to avoid excessive history entries. Skips URL updates on `/categories/[slug]` and `/tags/[slug]` routes where the path already encodes the filter.

URL parameters managed: `tags`, `categories`, `q`, `near_lat`, `near_lng`, `radius`, `city`, `country`.

### useStickyHeader

Monitors scroll position using a RAF-throttled listener. Returns `isSticky` boolean when scroll exceeds the configured threshold (default 250px).

### useTagVisibility

Controls "Show More / Show Less" toggling for tag lists. Limits visible tags to `maxVisibleTags` (default 8) and provides toggle state.

## FilterURLParser

A client component wrapped in `Suspense` that reads URL search parameters and route path segments on navigation, then updates filter context state accordingly. It handles:

- Query parameter parsing (`?tags=a,b&categories=c`)
- Path segment parsing (`/tags/[tag]`, `/categories/[category]`)
- Location parameter parsing (`?near_lat=...&near_lng=...&radius=...`)
- Search query parsing (`?q=search+term`)
- Transition detection to prevent race conditions

## Configuration Constants

Defined in `FILTER_CONSTANTS`:

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_VISIBLE_TAGS` | `8` | Default visible tag limit |
| `TEXT_TRUNCATE_LENGTH` | `20` | Character limit for tag text |
| `SCROLL_THRESHOLD` | `250` | Pixels before sticky activates |
| `SCROLL_DURATION` | `600` | Smooth scroll animation (ms) |
| `TOOLTIP_DELAY` | `300` | Tooltip show delay (ms) |
| `TRANSITION_DURATION` | `300` | CSS transition timing (ms) |
| `MOBILE_BREAKPOINT` | `'md'` | Responsive breakpoint |

## Integration Example

```tsx
import {
  FilterProvider,
  Tags,
  Categories,
  FilterControls,
  ActiveFilters,
  Paginate,
  useFilters,
} from '@/components/filters';

export function DirectoryPage({ items, categories, tags, total }) {
  return (
    <FilterProvider>
      <FilterURLParser />
      <Categories total={total} categories={categories} />
      <Tags tags={tags} enableSticky maxVisibleTags={10} mode="filter" />
      <FilterControls {...useFilters()} />
      <ActiveFilters {...useFilters()} availableTags={tags} availableCategories={categories} />
      <SharedCard items={items} categories={categories} tags={tags} />
      <Paginate basePath="/directory" initialPage={1} total={total} />
    </FilterProvider>
  );
}
```
