---
id: use-filters-reference
title: useFilters Hook Reference
sidebar_label: useFilters
sidebar_position: 32
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useFilters

Provides access to the centralized filter state managed by `FilterProvider`. Supports text search, multi-tag and multi-category selection, sorting, location-based filtering, and automatic URL synchronization for shareable/bookmarkable filter states.

**Source:** `template/hooks/use-filters.ts`
**Context:** `template/components/filters/context/filter-context.tsx`
**State logic:** `template/components/filters/hooks/use-filter-state.ts`

## Usage

```tsx
import { useFilters } from '@/hooks/use-filters';

function SearchBar() {
  const { searchTerm, setSearchTerm } = useFilters();

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search items..."
    />
  );
}
```

:::caution Provider Required
`useFilters` must be called within a `<FilterProvider>`. Calling it outside the provider throws:
```
Error: useFilters must be used within a FilterProvider
```
:::

## FilterProvider Setup

```tsx
import { FilterProvider } from '@/components/filters/context/filter-context';

function ListingPage({ initialTag, initialCategory }) {
  return (
    <FilterProvider
      initialTag={initialTag}
      initialCategory={initialCategory}
      initialSortBy="popularity"
    >
      <SearchBar />
      <TagFilter />
      <CategoryFilter />
      <ItemGrid />
    </FilterProvider>
  );
}
```

### Provider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | -- | Child components |
| `initialTag` | `string \| null` | `null` | Pre-selected tag from route params |
| `initialCategory` | `string \| null` | `null` | Pre-selected category from route params |
| `initialSortBy` | `string` | `'popularity'` | Initial sort option |

## Return Values

### State

| Property | Type | Description |
|----------|------|-------------|
| `searchTerm` | `string` | Current search query |
| `selectedTags` | `TagId[]` | Array of selected tag IDs (multi-select) |
| `selectedCategories` | `CategoryId[]` | Array of selected category IDs |
| `sortBy` | `SortOption` | Current sort option |
| `selectedTag` | `TagId \| null` | Single selected tag (navigation mode) |
| `selectedCategory` | `CategoryId \| null` | Single selected category (navigation mode) |
| `isFiltersLoading` | `boolean` | True during filter URL sync transitions |
| `locationFilter` | `LocationFilterState` | Current location filter settings |

### Setters

| Method | Signature | Description |
|--------|-----------|-------------|
| `setSearchTerm` | `(term: string) => void` | Update search query and sync URL |
| `setSelectedTags` | `Dispatch<SetStateAction<TagId[]>>` | Set tag selection |
| `setSelectedCategories` | `Dispatch<SetStateAction<CategoryId[]>>` | Set category selection |
| `setSortBy` | `Dispatch<SetStateAction<SortOption>>` | Set sort option |
| `setSelectedTag` | `Dispatch<SetStateAction<TagId \| null>>` | Set single navigation tag |
| `setSelectedCategory` | `Dispatch<SetStateAction<CategoryId \| null>>` | Set single navigation category |

### Tag Actions

| Method | Signature | Description |
|--------|-----------|-------------|
| `addSelectedTag` | `(tagId: TagId) => void` | Add a tag to the selection |
| `removeSelectedTag` | `(tagId: TagId) => void` | Remove a tag from the selection |
| `toggleSelectedTag` | `(tagId: TagId) => void` | Toggle a tag on/off |

### Category Actions

| Method | Signature | Description |
|--------|-----------|-------------|
| `addSelectedCategory` | `(categoryId: string) => void` | Add a category to the selection |
| `removeSelectedCategory` | `(categoryId: string) => void` | Remove a category |
| `toggleSelectedCategory` | `(categoryId: string) => void` | Toggle a category (exclusive: selects only this one, or deselects if already active) |
| `clearSelectedCategories` | `() => void` | Clear all category selections |

### Location Actions

| Method | Signature | Description |
|--------|-----------|-------------|
| `setNearMe` | `(coords: NearMeCoordinates \| null) => void` | Set or clear geolocation-based filter |
| `setLocationRadius` | `(radius: number) => void` | Update radius for Near Me filter (km) |
| `setLocationCity` | `(city: string \| null) => void` | Filter by city name |
| `setLocationCountry` | `(country: string \| null) => void` | Filter by country |
| `clearLocationFilter` | `() => void` | Clear all location filters |

### Reset

| Method | Signature | Description |
|--------|-----------|-------------|
| `clearAllFilters` | `() => void` | Reset all filters, search, sort, and location to defaults |

## Types

```ts
type SortOption = 'popularity' | 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc';
type CategoryId = string;
type TagId = string;

interface NearMeCoordinates {
  latitude: number;
  longitude: number;
  radius: number; // kilometers
}

interface LocationFilterState {
  nearMe?: NearMeCoordinates;
  city?: string;
  country?: string;
  sortByDistance?: boolean;
}
```

## URL Synchronization

All filter changes are automatically reflected in the URL via `useFilterURLSync`. This enables:

- **Bookmarkable filter states** -- users can save filtered views
- **Shareable links** -- sending a URL preserves the exact filter configuration
- **Browser back/forward** -- navigation respects filter history

URL parameters include: `tags`, `categories`, `q` (search), `nearLat`, `nearLng`, `radius`, `city`, `country`.

## Usage: Multi-Tag Filtering

```tsx
function TagCloud({ tags }) {
  const { selectedTags, toggleSelectedTag } = useFilters();

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggleSelectedTag(tag.id)}
          className={selectedTags.includes(tag.id) ? 'bg-primary' : 'bg-gray-200'}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}
```

## Usage: Location Filtering

```tsx
function NearMeButton() {
  const { setNearMe, clearLocationFilter, locationFilter } = useFilters();

  const handleNearMe = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setNearMe({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        radius: 50,
      });
    });
  };

  return locationFilter.nearMe
    ? <button onClick={clearLocationFilter}>Clear Location</button>
    : <button onClick={handleNearMe}>Near Me</button>;
}
```

## Usage: Reset All Filters

```tsx
function ClearFiltersButton() {
  const { clearAllFilters, selectedTags, selectedCategories, searchTerm } = useFilters();
  const hasActiveFilters = selectedTags.length > 0 || selectedCategories.length > 0 || searchTerm;

  if (!hasActiveFilters) return null;

  return <button onClick={clearAllFilters}>Clear All Filters</button>;
}
```

## Related Hooks

- [`useClientItemFilters`](/docs/template/hooks/filter-hooks) - Client-side item filtering logic
- [`useAdminFilters`](/docs/template/hooks/admin-hooks) - Admin panel filter management
- [`useDebouncedSearch`](/docs/template/hooks/search-hooks) - Debounced search input
