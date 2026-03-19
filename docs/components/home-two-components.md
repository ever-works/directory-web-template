---
id: home-two-components
title: Home Two Components
sidebar_label: Home Two Components
sidebar_position: 36
---

# Home Two Components

The "Home Two" layout components live in `components/home-two/` and implement an alternative homepage design with a sticky filter bar, category carousel, search, sorting, and tag selection.

## File Structure

```
components/home-two/
  index.ts                      # Barrel exports
  home-two-layout.tsx           # Main layout orchestrator
  home-two-search-bar.tsx       # Search input
  home-two-filters.tsx          # Responsive filter bar
  home-two-categories.tsx       # Category carousel with visibility detection
  home-two-sort-selector.tsx    # Sort dropdown
  home-two-tags-selector.tsx    # Tag selection pills
```

## Exports

```ts
export { HomeTwoFilters } from "./home-two-filters";
export { HomeTwoSearchBar } from "./home-two-search-bar";
export { HomeTwoTagsSelector } from "./home-two-tags-selector";
export { HomeTwoSortSelector } from "./home-two-sort-selector";
export { useHomeTwoLogic } from "@/hooks/use-home-two-logic";
export { HomeTwoLayout } from "./home-two-layout";
export { HomeTwoCategories } from "./home-two-categories";
```

Note that `useHomeTwoLogic` is re-exported from `hooks/` for convenience.

---

## HomeTwoLayout

The main layout component that assembles the filter bar and listing into a cohesive page.

### Props

```ts
type Home2LayoutProps = {
    total: number;
    start: number;
    page: number;
    basePath: string;
    categories?: Category[];
    tags: Tag[];
    items: ItemData[];
    filteredAndSortedItems: ItemData[];
    searchEnabled?: boolean;
};
```

### Sticky Filter Bar

The layout uses the `useStickyState` hook to detect when the filter bar reaches the top of the viewport. Two style states are applied:

- **Inactive:** Transparent background, no shadow.
- **Active (sticky):** Blurred white/dark background, shadow, visible border, and padding.

```tsx
const { isSticky, sentinelRef, targetRef } = useStickyState({
    threshold: 0,
    rootMargin: "-20px 0px 0px 0px",
});
```

A sentinel div is placed above the filter bar. When it scrolls out of view, `isSticky` becomes true and the filter bar receives the active sticky styles.

### Listing Integration

The layout passes `filteredAndSortedItems` to `ListingClient` with the `CardPresets.homeTwoListing` configuration, which disables stats, view toggle, and filters (since those are handled by the Home Two filter bar), but keeps pagination and sorting enabled.

---

## HomeTwoSearchBar

A simple search input connected to the shared filter context.

```tsx
export function HomeTwoSearchBar() {
    const { searchTerm, setSearchTerm } = useFilters();

    return (
        <div className="relative w-full">
            <div className="absolute left-0 top-0 p-2 pointer-events-none">
                <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
                type="text"
                placeholder="Search any product you need..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full ..."
            />
            {searchTerm && (
                <button onClick={() => setSearchTerm("")}>
                    &times;
                </button>
            )}
        </div>
    );
}
```

The search bar uses the `useFilters` hook to read and write the shared search term, providing real-time filtering across the listing.

---

## HomeTwoFilters

A responsive filter bar that adapts its layout across breakpoints.

### Props

```ts
type Home2FiltersProps = {
    categories: Category[];
    tags: Tag[];
    layoutKey: LayoutKey;
    setLayoutKey: (key: LayoutKey) => void;
    onFilterChange?: () => void;
    totalCount?: number;
    filteredCount?: number;
    searchEnabled?: boolean;
    isSticky?: boolean;
};
```

The filter bar includes:

- **Search bar** (when `searchEnabled` is true)
- **Category carousel** (`HomeTwoCategories`)
- **Tag selector** (`HomeTwoTagsSelector`)
- **Sort selector** (`HomeTwoSortSelector`)
- **Layout/view switcher**

On mobile, the filter components collapse into a more compact arrangement. The `isSticky` prop adjusts spacing when the bar is in sticky mode.

---

## HomeTwoCategories

A horizontally scrollable category carousel that handles overflow with navigation arrows and "show all" behavior.

### Props

```ts
type Home2CategoriesProps = {
    categories: Category[];
    basePath?: string;
    resetPath?: string;
    mode?: "link" | "filter";
    selectedCategories?: string[];
    onCategoryToggle?: (category: string) => void;
    totalItems?: number;
    showAllCategories?: boolean;
};
```

This is the largest component in the Home Two directory (over 1100 lines). It features:

- **Visibility detection:** Uses `IntersectionObserver` to track which category pills are visible within the scrollable container, showing navigation arrows when items overflow.
- **Two modes:** `"link"` mode renders categories as navigation links; `"filter"` mode renders them as toggleable filter buttons.
- **Responsive design:** Adapts between a full carousel on desktop and a simplified list on mobile.
- **Icon support:** Categories can display associated icons alongside their labels.

---

## HomeTwoSortSelector

A dropdown for selecting sort order.

### Types

```ts
type SortValue = "popular" | "newest" | "oldest" | "a-z" | "z-a";

interface ISortSelector {
    sortBy?: SortValue;
    setSortBy?: (sort: SortValue) => void;
    className?: string;
}
```

---

## HomeTwoTagsSelector

A tag selection component displaying tags as toggleable pills.

### Props

```ts
interface HomeTwoTagsSelectorProps {
    tags: Tag[];
    selectedTags?: string[];
    onTagToggle?: (tagId: string) => void;
}
```

Selected tags are visually highlighted. When connected to the filter context, toggling a tag updates the shared filter state and triggers listing re-filtering.

---

## Key Dependencies

- **Filter Context:** Search, tag, and sort state are managed via the shared filter context (`useFilters` hook)
- **LayoutTheme Context:** Layout key and items per page from `useLayoutTheme`
- **useStickyState:** Custom hook using `IntersectionObserver` for sticky detection
- **ListingClient / SharedCard:** The actual item grid is rendered by the shared card system
- **clsx:** Class string composition for conditional sticky styles
