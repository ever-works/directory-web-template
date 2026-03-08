---
id: item-utility-components
title: Item Utility Components
sidebar_label: Item Utilities
sidebar_position: 61
---

# Item Utility Components

## Overview

The item utility components handle the rendering of individual directory items across all layout modes, along with supporting components for loading states, tag display, and category navigation. The main `Item` component is a memoized card that adapts its layout based on the active view mode (classic, grid, masonry, cards) and integrates with the filter system, favorites, featured badges, distance badges, and promo codes.

**Source:** `components/item.tsx`, `components/item-skeleton.tsx`, `components/item-tags.tsx`, `components/items-categories.tsx`

## Architecture

```
components/
  item.tsx               # Main Item card + CategoryFilterButton + TagFilterButton
  item-skeleton.tsx      # Loading skeleton + ItemSkeletonGrid
  item-tags.tsx          # Detail page tag display (ItemTag, ItemTags, ItemTagsSection)
  items-categories.tsx   # Horizontal scrollable category bar
```

**Data Flow:**

1. Layout components pass `ItemData` + `layout` key to `Item`
2. `Item` reads auth session, filter context, feature flags, and distance context
3. Inline `CategoryFilterButton` and `TagFilterButton` trigger filter updates via `useFilters()`
4. `ItemsCategories` provides a standalone URL-based category navigation bar
5. `ItemTag` / `ItemTags` render on detail pages with links to tag-filtered views

## Components

### Item

The primary directory item card. Wrapped in `React.memo` for render optimization.

```tsx
import Item from "@/components/item";

<Item
  {...itemData}
  layout="grid"
  onNavigate={() => setLoading(true)}
  hideIndicatorInSimilarProducts={false}
/>
```

Internal structure:
- **CardHeader**: Icon (or fallback folder icon), title with underline animation, arrow indicator (classic only), favorite button, distance badge, featured badge
- **CardBody**: Description (with layout-aware truncation), category filter buttons, tag filter buttons, promo code section

Layout-specific behavior:
- **grid**: Fixed height `h-[320px]`, description uses `line-clamp-3`, min-height reserved for description and tags
- **classic**: Full-height, arrow indicator shown on hover, `line-clamp-3` description
- **masonry**: Variable height, description truncated to 150 characters via `createExcerpt()`
- **cards**: Natural height, `line-clamp-3` description

Sub-components defined in the same file:
- **CategoryFilterButton**: Memoized button that calls `addSelectedCategory()` from FilterContext
- **TagFilterButton**: Memoized button that calls `addSelectedTag()` from FilterContext, prefixed with `#`

### ItemSkeleton

Loading placeholder matching the Item card layout.

```tsx
import { ItemSkeleton, ItemSkeletonGrid } from "@/components/item-skeleton";

// Single skeleton
<ItemSkeleton showCategory={true} showHashtags={true} showDescription={true} />

// Grid of skeletons
<ItemSkeletonGrid count={12} />
```

Features:
- Configurable sections: `showCategory`, `showHashtags`, `showDescription`
- Uses HeroUI `Skeleton` with pulsing animation
- `ItemSkeletonGrid` renders a responsive grid of `count` skeletons

### ItemTag / ItemTags / ItemTagsSection

Tag display components for item detail pages. These render tags as linked chips that navigate to tag-filtered views.

```tsx
import { ItemTags, ItemTagsSection } from "@/components/item-tags";

// Simple tag list
<ItemTags tags={["open-source", "free", "self-hosted"]} />

// Section with heading
<ItemTagsSection title="Related Tags" tags={item.tags} />
```

`ItemTag` normalizes tag names for URLs: lowercases, replaces spaces with hyphens, removes special characters.

```tsx
// "Project Management" -> "/tags/project-management"
```

### ItemsCategories

Horizontal scrollable category bar with sticky behavior and expand/collapse toggle.

```tsx
import { ItemsCategories } from "@/components/items-categories";

<ItemsCategories
  categories={allCategories}
  basePath="/categories"
  resetPath="/"
  enableSticky={true}
  maxVisibleTags={8}
/>
```

Features:
- Horizontal scroll in single-row mode with `overflow-x-auto`
- "Show all N categories" toggle to switch to flex-wrap multi-row mode
- "All Categories" button linking to reset path
- Active category highlighting based on current pathname
- Sticky positioning with background blur on scroll
- Category icons via `next/image`
- Category count badges
- Gated by `useCategoriesEnabled()` feature flag

## Props Reference

### ItemProps (extends ItemData)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | required | Item display name |
| `slug` | `string` | required | URL-safe identifier |
| `description` | `string` | required | Item description text |
| `icon_url` | `string` | `undefined` | Icon image URL |
| `category` | `string \| Category \| (string \| Category)[]` | `undefined` | Category data |
| `tags` | `(string \| Tag)[]` | `[]` | Tag array |
| `featured` | `boolean` | `false` | Whether the item is featured |
| `promo_code` | `PromoCode` | `undefined` | Promotional code data |
| `is_source_url_active` | `boolean` | `false` | Use source URL instead of detail page |
| `layout` | `string` | `undefined` | Active layout key for style adaptation |
| `onNavigate` | `() => void` | `undefined` | Callback when item link is clicked |
| `hideIndicatorInSimilarProducts` | `boolean` | `false` | Hide favorite indicator in similar products |

### ItemSkeletonProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showCategory` | `boolean` | `true` | Show category skeleton |
| `showHashtags` | `boolean` | `true` | Show tags skeleton |
| `showDescription` | `boolean` | `true` | Show description skeleton |

### ItemSkeletonGridProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `count` | `number` | `12` | Number of skeleton cards to render |

### ItemsCategoriesProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `categories` | `Category[]` | required | Array of category objects |
| `basePath` | `string` | `"/categories"` | URL base for category links |
| `resetPath` | `string` | `"/"` | URL for the "All Categories" button |
| `enableSticky` | `boolean` | `false` | Enable sticky positioning on scroll |
| `maxVisibleTags` | `number` | `8` | Max categories in single-row before toggle |

## Styling

- **Item card**: `bg-white/80 dark:bg-gray-900/80` with `ring-1 ring-gray-200/50 dark:ring-gray-700/50`, rounded-2xl
- **Featured items**: Additional `border-1 border-blue-400/40` and blue shadow
- **Icon container**: `w-12 h-12 rounded-2xl` with gradient background `from-theme-primary-10 to-indigo-100`
- **Title**: `text-base font-semibold leading-tight` with underline animation on hover
- **Description**: `text-sm leading-relaxed text-gray-600 dark:text-gray-300` with `line-clamp-3`
- **Category buttons**: `bg-theme-primary-10 rounded-full` with `text-theme-primary`, active ring styling
- **Tag buttons**: `text-xs text-gray-500 hover:text-blue-600` with hover background
- **Loading overlay**: `bg-white/80 dark:bg-gray-900/80 backdrop-blur-xs` with centered Spinner
- **ItemTag** (detail page): Gradient `from-primary-50/80 to-primary-100/80` with `FiTag` icon
- **ItemsCategories**: Theme-primary solid for active, bordered for inactive, `hide-scrollbar` for clean horizontal scroll

## Usage Examples

### Item in a grid layout

```tsx
{items.map((item) => (
  <Item
    key={item.slug}
    {...item}
    layout="grid"
    onNavigate={() => setNavigating(true)}
  />
))}
```

### Loading state

```tsx
{isLoading ? (
  <ItemSkeletonGrid count={12} />
) : (
  <LayoutGrid items={items} layout="grid" />
)}
```

### Category bar on listing page

```tsx
<ItemsCategories
  categories={categories}
  basePath="/categories"
  enableSticky={true}
  maxVisibleTags={10}
/>
```

### Tags on item detail page

```tsx
<ItemTagsSection title="Tags" tags={item.tags.map(t => t.name)} />
```

## Related Components

- **[Layouts](./layouts-components.md)** -- Layout components that render `Item` in different arrangements
- **[Filters](./filters-components.md)** -- Filter context consumed by `CategoryFilterButton` and `TagFilterButton`
- **[Featured Items](./featured-items-components.md)** -- `FeaturedBadge` displayed on featured items
- **[Profile Utilities](./profile-utility-components.md)** -- `FavoriteButton` used in item cards
- **[Sponsor Ads](./sponsor-ads-components.md)** -- `PromoCodeComponent` displayed in item cards
