---
id: layout-components
title: Layout Components
sidebar_label: Layout
sidebar_position: 6
---

# Layout Components

The layout components control page-level structure, providing conditional rendering of headers, footers, and scroll-to-top buttons based on the current route context.

## Architecture Overview

```
template/components/layout/
  conditional-layout.tsx    # Route-aware page wrapper
```

## ConditionalLayout

The primary layout component that wraps page content and conditionally renders the global `Header`, `Footer`, and `ScrollToTopButton` based on the current route.

```tsx
import { ConditionalLayout } from '@/components/layout/conditional-layout';

<ConditionalLayout>
  {children}
</ConditionalLayout>
```

### ConditionalLayoutProps

| Prop | Type | Description |
|------|------|-------------|
| `children` | `React.ReactNode` | Page content to render within the layout |

### Route-Based Behavior

The component uses `usePathname()` from Next.js to detect the current route and hide chrome elements on specific pages:

| Route Pattern | Header | Footer | ScrollToTop |
|---------------|--------|--------|-------------|
| `/auth-demo/*` | Hidden | Hidden | Hidden |
| All other routes | Shown | Shown | Shown |

This allows auth demo pages to render without the site navigation, providing a full-screen authentication experience.

### Component Structure

```tsx
<>
  {!isAuthDemoPage && <Header />}
  <main className="flex-1">
    {children}
  </main>
  {!isAuthDemoPage && <Footer />}
  {!isAuthDemoPage && (
    <div className="fixed bottom-6 right-6 z-50">
      <ScrollToTopButton
        variant="elegant"
        easing="easeInOut"
        showAfter={400}
        size="md"
      />
    </div>
  )}
</>
```

### ScrollToTopButton Configuration

The scroll-to-top button is configured with:

| Property | Value | Description |
|----------|-------|-------------|
| `variant` | `"elegant"` | Visual style variant |
| `easing` | `"easeInOut"` | Scroll animation easing function |
| `showAfter` | `400` | Scroll distance (px) before button appears |
| `size` | `"md"` | Button size |

The button is positioned fixed at the bottom-right corner with `z-50` to stay above all content.

### Dependencies

| Import | Source | Purpose |
|--------|--------|---------|
| `usePathname` | `next/navigation` | Route detection |
| `Header` | `@/components/header` | Site header navigation |
| `Footer` | `@/components/footer` | Site footer |
| `ScrollToTopButton` | `@/components/scroll-to-top-button` | Scroll-to-top FAB |

## Layout in the App Router

The `ConditionalLayout` component is typically used in the root layout file for a locale group:

```tsx
// app/[locale]/layout.tsx
import { ConditionalLayout } from '@/components/layout/conditional-layout';

export default function LocaleLayout({ children }) {
  return (
    <html>
      <body className="flex flex-col min-h-screen">
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
      </body>
    </html>
  );
}
```

The `flex-1` class on the `<main>` element ensures the content area expands to fill available space, pushing the footer to the bottom of the viewport on short pages.

## Related Layout Patterns

While the `layout/` directory contains only the `ConditionalLayout`, several other components contribute to the overall page layout system:

### Container Component

Found at `@/components/ui/container`, the `Container` component provides consistent content width constraints:

```tsx
<Container maxWidth="7xl" padding="default">
  {/* Content constrained to max-w-7xl */}
</Container>
```

### Layout Theme Context

The `@/components/context` module provides `useLayoutTheme()` which manages:

- `layoutKey` - Current card layout view (classic, grid, card, masonry)
- `paginationType` - Standard or infinite scroll pagination
- `isMapView` / `setIsMapView` - Map view toggle state

### Layout Components (Card Views)

The `@/components/layouts` module provides the actual card layout renderers:

| Layout Key | Description |
|------------|-------------|
| `classic` | Traditional list view with horizontal cards |
| `grid` | Grid of equal-size cards |
| `card` | Large card layout with varied sizing |
| `masonry` | Pinterest-style masonry grid |

These are consumed by the `SharedCard` component through the `layoutComponents` map and `LayoutMap` for map views.

## Extending the Layout

To add new route-based conditional rendering:

1. Add a new route pattern check in `ConditionalLayout`:

```tsx
const isAuthDemoPage = pathname.includes("/auth-demo/");
const isEmbedPage = pathname.includes("/embed/");
const hideChrome = isAuthDemoPage || isEmbedPage;
```

2. Use the `hideChrome` flag to control element visibility:

```tsx
{!hideChrome && <Header />}
```

This pattern keeps all route-based layout decisions centralized in one component rather than scattered across individual pages.
