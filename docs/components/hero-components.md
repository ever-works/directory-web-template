---
id: hero-components
title: "Hero Reference"
sidebar_label: "Hero"
sidebar_position: 45
---

# Hero

## Overview

The `Hero` component renders a full-screen hero section with an optional badge, title, description, and background effects. It serves as the primary landing area at the top of pages and supports arbitrary children rendered below the header content, outside the constrained container, allowing full-width layouts in fluid mode.

## Import

```typescript
import Hero from "@/components/hero";
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `badgeText` | `string` | No | `undefined` | Badge text displayed at the top of the hero in a rounded pill with a yellow indicator dot. |
| `title` | `string \| React.ReactNode` | No | `undefined` | Main heading rendered as an `<h1>`. Accepts plain text or JSX for rich formatting. |
| `description` | `string \| React.ReactNode` | No | `undefined` | Subtitle paragraph rendered below the title. Constrained to `max-w-2xl` / `max-w-3xl` on larger screens. |
| `className` | `string` | No | `""` | Additional CSS classes applied to the outer `<section>` element. |
| `titleClassName` | `string` | No | `""` | Additional CSS classes applied to the `<h1>` title element. |
| `descriptionClassName` | `string` | No | `""` | Additional CSS classes applied to the `<p>` description element. |
| `showBackgroundEffects` | `boolean` | No | `true` | Reserved prop for enabling gradient/blob background effects (currently unused internally). |
| `children` | `React.ReactNode` | No | `undefined` | Additional content rendered below the header section. Placed outside the `Container` to allow full-width rendering. |

## Usage Examples

### Basic Usage

```tsx
<Hero
  badgeText="New Release"
  title="Discover the Best Tools"
  description="Browse our curated directory of software and services."
/>
```

### With Custom Configuration

```tsx
<Hero
  badgeText="Featured"
  title={<>Find Your Next <span className="text-theme-primary">Favorite Tool</span></>}
  description="Search, filter, and compare hundreds of listings."
  className="min-h-[60vh]"
  titleClassName="text-center"
  descriptionClassName="text-center"
>
  <SearchBar />
  <CategoriesGrid categories={categories} />
</Hero>
```

### Minimal Hero Without Badge

```tsx
<Hero
  title="All Categories"
  description="Browse items organized by category."
  showBackgroundEffects={false}
/>
```

## Styling

The Hero component uses Tailwind CSS utility classes throughout:

- **Background**: `bg-white dark:bg-[#0b111f]` with full dark mode support.
- **Layout**: Full-width section (`w-full min-h-screen`) with a `Container` (max-width `7xl`) constraining the header content.
- **Badge**: Rendered as a centered pill using `rounded-full` with a yellow dot indicator (`bg-yellow-400`) and subtle border.
- **Title**: Responsive font sizes from `text-3xl` on mobile to `text-6xl` on desktop with `font-bold`.
- **Description**: Responsive text sizes with `max-w-2xl lg:max-w-3xl mx-auto` centering and relaxed line-height.
- **Children area**: Mounted with `mt-4 sm:mt-10` spacing outside the constrained container.

All text classes include `dark:` variants for seamless theme switching.

## Accessibility

- The outer `<section>` includes `aria-label="Hero"` for landmark identification by screen readers.
- The title is rendered as a semantic `<h1>` element, establishing the correct document heading hierarchy.
- All content is keyboard-accessible by default as it relies on standard HTML semantics.

## Related Components

- [Container](/docs/template/components/ui-primitives) - Used internally to constrain content width.
- [Home Page Components](/docs/template/components/home-page-components) - Pages that consume the Hero component.
