---
id: featured-items-components
title: Featured Items Components
sidebar_label: Featured Items
sidebar_position: 55
---

# Featured Items Components

## Overview

The Featured Items system provides components for highlighting promoted or sponsored items in the directory. It includes a section component that fetches and displays featured items in multiple visual variants, and a badge component for marking individual items as featured. The system is gated behind the `featured_items` feature flag.

**Source:** `components/featured-items/`

## Architecture

```
components/featured-items/
  index.ts                      # Barrel exports
  featured-items-section.tsx    # Main section with fetch + display logic
  featured-badge.tsx            # Reusable badge indicator
```

The `FeaturedItemsSection` is a client component that uses TanStack React Query to fetch featured items from `/api/featured-items`. It renders a configurable section with loading skeletons, error states, and multiple layout variants. The `FeaturedBadge` is a standalone presentational component used both inside the section and on individual `Item` cards.

**Data Flow:**

1. `FeaturedItemsSection` calls `useQuery` to fetch from `/api/featured-items?limit=N`
2. On success, it renders `FeaturedItemCard` components for each item
3. Each card variant (`default`, `compact`, `hero`) has its own layout and styling
4. `FeaturedBadge` can be used independently on any item card

**Feature Flag Gating:**

The section checks `useFeatureFlagsWithSimulation()` for `featured_items`. When disabled, it renders nothing. In demo mode, it renders with simulated data.

## Components

### FeaturedItemsSection

Main container that fetches and displays featured items.

```tsx
import { FeaturedItemsSection } from "@/components/featured-items";

<FeaturedItemsSection
  variant="hero"
  limit={6}
  showViewAll={true}
  title="Featured Tools"
  description="Hand-picked tools worth checking out"
  className="my-8"
/>
```

Internally contains `FeaturedItemCard` which renders three different card layouts based on the `variant` prop:

- **default**: Standard card with icon, name, description, and category badge
- **compact**: Minimal horizontal layout with icon and name
- **hero**: Large card with gradient background, prominent icon, and full description

### FeaturedBadge

Visual indicator badge for featured items.

```tsx
import { FeaturedBadge } from "@/components/featured-items";

<FeaturedBadge
  variant="hero"
  size="sm"
  collapsible={true}
  showText={false}
  className="rounded-full"
/>
```

When `collapsible` is true, the badge collapses to icon-only and expands on `group-hover` with a width animation.

## Props Reference

### FeaturedItemsSectionProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | Additional CSS classes for the wrapper |
| `title` | `string` | `"Featured"` | Section heading text |
| `description` | `string` | `undefined` | Optional description below the title |
| `limit` | `number` | `6` | Maximum number of featured items to display |
| `showViewAll` | `boolean` | `true` | Whether to show a "View all" link |
| `variant` | `"default" \| "compact" \| "hero"` | `"default"` | Visual layout variant for the cards |

### FeaturedBadgeProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | Additional CSS classes |
| `variant` | `"default" \| "compact" \| "expiring" \| "hero"` | `"default"` | Badge visual style |
| `showIcon` | `boolean` | `true` | Whether to show the star icon |
| `showText` | `boolean` | `true` | Whether to show the "Featured" label |
| `size` | `"xs" \| "sm" \| "md" \| "lg"` | `"md"` | Badge size |
| `collapsible` | `boolean` | `false` | Enable collapse/expand animation on hover |

## Styling

- Uses Tailwind gradient backgrounds (`bg-linear-to-r`, `bg-linear-to-br`) for hero and default card variants
- Theme-aware colors via `text-theme-primary`, `bg-theme-primary-10`, `border-theme-primary-500`
- Dark mode support with `dark:` prefixed utilities throughout
- The `hero` variant uses `from-amber-50 to-orange-50` gradients (dark: `from-amber-950/30 to-orange-950/30`)
- `FeaturedBadge` uses amber/yellow color palette: `from-amber-100 to-yellow-100` with `text-amber-800`
- Collapsible badge uses `max-w-0 group-hover:max-w-[100px]` with `overflow-hidden` and `transition-all duration-300`
- Loading skeletons use HeroUI `Skeleton` with `rounded-2xl` styling

## Usage Examples

### Hero section on homepage

```tsx
<FeaturedItemsSection
  variant="hero"
  limit={3}
  title="Editor's Picks"
  description="Our top recommendations this month"
  showViewAll={true}
/>
```

### Compact sidebar widget

```tsx
<FeaturedItemsSection
  variant="compact"
  limit={5}
  showViewAll={false}
  className="px-4"
/>
```

### Badge on an item card

```tsx
{item.featured && (
  <FeaturedBadge
    variant="hero"
    size="sm"
    collapsible={true}
    showText={false}
    className="bg-linear-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-200/50 rounded-full"
  />
)}
```

## Related Components

- **[Item Component](./item-utility-components.md)** -- Uses `FeaturedBadge` to mark featured items in card listings
- **[Sponsor Ads](./sponsor-ads-components.md)** -- Complementary promotion system for paid sponsor placements
- **[Layouts](./layouts-components.md)** -- Layout components that render featured items alongside regular items
