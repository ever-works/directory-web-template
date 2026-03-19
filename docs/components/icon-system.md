---
id: icon-system
title: Icon System
sidebar_label: Icons
sidebar_position: 9
---

# Icon System

The icon system provides a centralized collection of SVG icon components and brand logo variants used throughout the application. It includes social/auth provider icons, layout view switcher icons, brand identity logos, and contextual logo wrappers for headers, footers, and navigation.

## Architecture Overview

```
template/components/icons/
  Icons.tsx       # All SVG icon components
  Logo.tsx        # Logo wrapper components with size/variant presets
  index.ts        # Barrel re-exports from Icons and Logo
```

## Barrel Exports

The `index.ts` provides a single import point for all icons and logos:

```typescript
export * from './Icons';
export * from './Logo';
```

Usage:

```tsx
import { IconGithub, IconGoogle, Logo, NavLogo } from '@/components/icons';
```

## SVG Icon Components

All icon components are defined in `Icons.tsx` as named exports. Each is a functional component rendering an inline SVG element.

### Authentication Provider Icons

Icons used on OAuth/social login buttons:

| Component | Platform | Size | Color |
|-----------|----------|------|-------|
| `IconGithub` | GitHub | `h-5 w-5` | `currentColor` |
| `IconGoogle` | Google | `h-5 w-5` | `text-red-500` |
| `IconMicrosoft` | Microsoft | `h-5 w-5` | `currentColor` |
| `IconsMicrosoft` | Microsoft (alt) | `h-5 w-5` | `currentColor` |
| `IconX` | X (Twitter) | `h-5 w-5` | `dark:fill-white fill-black` |
| `IconFacebook` | Facebook | `h-5 w-5` | `text-blue-600` |

```tsx
import { IconGithub, IconGoogle, IconFacebook } from '@/components/icons';

<button className="flex items-center gap-2">
  <IconGithub /> Sign in with GitHub
</button>
```

#### Dark Mode Support

The `IconX` component automatically adapts to dark mode using Tailwind's `dark:` prefix, switching between `fill-black` (light) and `fill-white` (dark).

### Layout View Icons

Icons used in the layout/view toggle switcher within the `SharedCard` header:

| Component | Layout | Size | Color |
|-----------|--------|------|-------|
| `IconClassic` | Classic list view | `w-5 h-5` | `dark:text-white text-gray-800` |
| `IconGrid` | Grid view | `w-5 h-5` | `text-gray-600 dark:text-gray-400` |
| `IconCard` | Card view | `w-5 h-5` | `text-gray-600 dark:text-gray-400` |
| `IconMasonry` | Masonry view | `w-5 h-5` | `text-gray-600 dark:text-gray-400` |
| `IconMap` | Map view | `w-5 h-5` | `currentColor` |

```tsx
import { IconClassic, IconGrid, IconCard, IconMasonry, IconMap } from '@/components/icons';

const layoutIcons = {
  classic: <IconClassic />,
  grid: <IconGrid />,
  card: <IconCard />,
  masonry: <IconMasonry />,
  map: <IconMap />,
};
```

All layout icons use the `inline` display class and support dark mode through Tailwind variants.

### Utility Icons

| Component | Purpose | Size |
|-----------|---------|------|
| `IconDirectory` | Directory/folder representation | `w-4 h-4` |

### Brand Identity Icons

The Ever Works brand icons support customizable dimensions and CSS classes:

| Component | Description | Default Dimensions | Props Interface |
|-----------|-------------|-------------------|-----------------|
| `IconEverworks` | Full brand logo with wordmark | `166 x 61` | `IconEverworksSimpleProps` |
| `IconEverworksSimple` | Icon-only logo (no wordmark) | `134 x 134` | `IconEverworksSimpleProps` |

#### IconEverworksSimpleProps

```typescript
interface IconEverworksSimpleProps extends SVGProps<SVGSVGElement> {
  width?: string;
  height?: string;
}
```

Both brand icons accept all standard SVG props via the `SVGProps<SVGSVGElement>` extension, plus explicit `width` and `height` overrides. The `className` prop is merged with default classes using the `cn()` utility from `@/lib/utils`.

```tsx
import { IconEverworks, IconEverworksSimple } from '@/components/icons';

// Full logo with custom dimensions
<IconEverworks width="200" height="73" className="opacity-80" />

// Simple icon with default sizing
<IconEverworksSimple className="w-10 h-10" />
```

#### Visual Design

| Icon | Fill | Gradient |
|------|------|----------|
| `IconEverworks` | White wordmark + gradient geometric shape | `#FF1CF7` to `#00F0FF` (pink to cyan) |
| `IconEverworksSimple` | Gradient geometric shape only | `#D542FD` to `#39C1FE` (purple to blue) |

Both icons use SVG `linearGradient` definitions for the geometric logo shape.

## Logo Wrapper Components

The `Logo.tsx` file provides higher-level wrapper components that combine brand icons with size presets, hover effects, and contextual styling.

### Logo

The base logo component with configurable size and variant:

```tsx
import { Logo } from '@/components/icons';

<Logo size="md" variant="simple" className="my-custom-class" />
```

#### LogoProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | Size preset |
| `variant` | `'full' \| 'simple'` | `'simple'` | Full logo with wordmark or icon only |
| `className` | `string` | `''` | Additional CSS classes |

#### Size Classes

| Size | Tailwind Class | Dimensions |
|------|---------------|------------|
| `xs` | `w-6 h-6` | 24px |
| `sm` | `w-8 h-8` | 32px |
| `md` | `w-10 h-10` | 40px |
| `lg` | `w-12 h-12` | 48px |
| `xl` | `w-16 h-16` | 64px |
| `full` | `w-full h-full` | Container-fill |

#### Variant Rendering

| Variant | Icon Component | Use Case |
|---------|---------------|----------|
| `full` | `IconEverworks` | Footer, about pages (includes wordmark) |
| `simple` | `IconEverworksSimple` | Navigation, compact spaces (icon only) |

### NavLogo

A navigation-optimized logo with hover scale animation:

```tsx
import { NavLogo } from '@/components/icons';

<NavLogo className="mr-4" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional CSS classes |

Uses `Logo` with `size="sm"` and `variant="simple"`. Applies `hover:scale-110` transition on hover.

### HeaderLogo

A header logo rendering the simple icon with responsive sizing and a gradient glow effect:

```tsx
import { HeaderLogo } from '@/components/icons';

<HeaderLogo className="flex-shrink-0" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional CSS classes |

Features:
- Responsive sizing: `w-8 h-8` on mobile, `w-10 h-10` on `md:` breakpoint
- Hover scale animation: `hover:scale-110`
- Gradient glow overlay: blue-to-purple gradient with blur, appears on hover

### FooterLogo

A footer logo with the full brand wordmark and group hover effects:

```tsx
import { FooterLogo } from '@/components/icons';

<FooterLogo className="mb-4" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional CSS classes |

Features:
- Uses `Logo` with `size="lg"` and `variant="full"`
- Opacity transition on group hover: `group-hover:opacity-90`
- Background glow: blue-to-purple gradient blur behind the logo, visible on hover

### FooterLogoCompact

A compact footer logo using the full `IconEverworks` component with responsive sizing:

```tsx
import { FooterLogoCompact } from '@/components/icons';

<FooterLogoCompact />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional CSS classes |

Features:
- Responsive sizing: `w-16 h-16` (mobile), `w-20 h-20` (md), `w-24 h-24` (lg)
- Group hover opacity animation
- Background glow overlay matching `FooterLogo`

## Integration Examples

### Auth Login Page

```tsx
import { IconGithub, IconGoogle, IconX } from '@/components/icons';

function LoginButtons() {
  return (
    <div className="space-y-3">
      <button className="flex items-center gap-2 w-full px-4 py-2 border rounded-lg">
        <IconGithub /> Continue with GitHub
      </button>
      <button className="flex items-center gap-2 w-full px-4 py-2 border rounded-lg">
        <IconGoogle /> Continue with Google
      </button>
      <button className="flex items-center gap-2 w-full px-4 py-2 border rounded-lg">
        <IconX /> Continue with X
      </button>
    </div>
  );
}
```

### Site Header

```tsx
import { HeaderLogo } from '@/components/icons';
import Link from 'next/link';

function SiteHeader() {
  return (
    <header className="flex items-center px-4 py-2">
      <Link href="/">
        <HeaderLogo />
      </Link>
      <nav>{/* Navigation items */}</nav>
    </header>
  );
}
```

### Layout View Switcher

```tsx
import { IconClassic, IconGrid, IconCard, IconMasonry } from '@/components/icons';

const layouts = [
  { key: 'classic', icon: <IconClassic />, label: 'List' },
  { key: 'grid', icon: <IconGrid />, label: 'Grid' },
  { key: 'card', icon: <IconCard />, label: 'Card' },
  { key: 'masonry', icon: <IconMasonry />, label: 'Masonry' },
];

function ViewToggle({ active, onChange }: { active: string; onChange: (key: string) => void }) {
  return (
    <div className="flex gap-1">
      {layouts.map(({ key, icon, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={active === key ? 'bg-gray-200 dark:bg-gray-700 rounded p-1' : 'p-1'}
          title={label}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
```

## Dependencies

| Import | Source | Purpose |
|--------|--------|---------|
| `cn` | `@/lib/utils` | Tailwind class merging for brand icons |
| `SVGProps` | `react` | TypeScript interface for SVG element props |
| `React` | `react` | Component type definitions in Logo.tsx |
