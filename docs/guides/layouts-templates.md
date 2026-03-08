---
id: layouts-templates
title: Layouts & Page Templates
sidebar_label: Layouts & Templates
sidebar_position: 12
---

# Layouts & Page Templates

The Ever Works template includes a flexible layout system that controls how directory items are displayed. Layouts can be switched at runtime through settings, and the system supports both public-facing content layouts and structural page layouts.

## Content Layouts

Content layouts determine how items are rendered on the discover/browse pages. Located in `components/layouts/`, four layouts are available:

### Available Layouts

| Layout | Component | Description |
|--------|-----------|-------------|
| **Classic** | `LayoutClassic` | Traditional list view with item cards stacked vertically |
| **Grid** | `LayoutGrid` | Responsive grid of equal-sized item cards |
| **Cards** | `LayoutCards` | Card-based layout with larger visual emphasis |
| **Masonry** | `LayoutMasonry` | Pinterest-style masonry grid with variable card heights |

### Layout Registry

Layouts are registered in `components/layouts/index.ts`:

```typescript
export type LayoutKey = 'classic' | 'grid' | 'cards' | 'masonry';

export const layoutComponents: Record<LayoutKey, Component> = {
  grid: LayoutGrid,
  cards: LayoutCards,
  classic: LayoutClassic,
  masonry: LayoutMasonry,
};
```

### Layout Switching

The active layout can be configured through:

1. **Admin Settings** -- Set the default layout in `/admin/settings`
2. **User Preference** -- Users can switch layouts via the view toggle component on the discover page
3. **URL Parameter** -- Layout can be specified via query parameters

The layout selector UI is provided by `components/ui/select-layout.tsx`, which renders a dropdown or toggle group for switching between available layouts.

## Conditional Layout

The `ConditionalLayout` component (`components/layout/conditional-layout.tsx`) wraps public pages with the standard header, footer, and scroll-to-top button. It conditionally hides these elements for special pages:

```typescript
export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const isAuthDemoPage = pathname.includes("/auth-demo/");

  return (
    <>
      {!isAuthDemoPage && <Header />}
      <main className="flex-1">{children}</main>
      {!isAuthDemoPage && <Footer />}
      {!isAuthDemoPage && <ScrollToTopButton />}
    </>
  );
}
```

This pattern allows certain pages (like auth demo screens) to render without the standard chrome.

## Page Layout Structure

The application uses Next.js App Router layouts at multiple levels:

```
app/[locale]/
  layout.tsx              # Root locale layout (providers, fonts, metadata)
  |
  +-- page.tsx            # Home page
  +-- discover/
  |     layout.tsx        # Discover-specific layout (search, filters)
  +-- admin/
  |     layout.tsx        # Admin layout (sidebar, restricted access)
  +-- client/
  |     layout.tsx        # Client dashboard layout
  +-- auth/
        layout.tsx        # Auth pages layout (centered, minimal)
```

### Root Layout

The root locale layout provides:

- Theme provider (dark/light mode)
- Internationalization provider (`next-intl`)
- Font loading and CSS variables
- Analytics providers (PostHog, Sentry)
- Toast notifications
- Top loading bar

### Admin Layout

The admin layout is separate from the public layout and includes:

- Admin sidebar navigation
- Responsive mobile menu
- Permission checks (redirects unauthorized users)
- Admin-specific header with user menu

## UI Configuration Components

Several UI components allow admins to configure layout and display settings:

| Component | File | Purpose |
|-----------|------|---------|
| `SelectLayout` | `components/ui/select-layout.tsx` | Choose default content layout |
| `SelectContainerWidth` | `components/ui/select-container-width.tsx` | Set content container width |
| `SelectPaginationType` | `components/ui/select-pagination-type.tsx` | Choose pagination style |
| `SelectDatabaseMode` | `components/ui/select-database-mode.tsx` | Configure database mode |
| `SelectCheckoutProvider` | `components/ui/select-checkout-provider.tsx` | Select payment provider |

## Custom Navigation

The `CustomNavigationManager` component (`components/admin/settings/CustomNavigationManager.tsx`) allows admins to configure custom navigation links that appear in the header. This enables adding links to external resources, documentation, or custom pages without code changes.

## Responsive Design

All layouts are built with responsive design principles:

- **Mobile-first** -- Base styles target mobile, with progressive enhancement for larger screens
- **Breakpoints** -- Standard Tailwind breakpoints (sm, md, lg, xl, 2xl)
- **Container queries** -- Some components use the `ResponsiveContainer` component for element-level responsiveness
- **Grid adaptation** -- Grid and masonry layouts automatically adjust column counts based on viewport width

## Related Files

- `components/layouts/` -- Content layout components (Classic, Grid, Cards, Masonry)
- `components/layout/conditional-layout.tsx` -- Conditional header/footer wrapper
- `components/ui/select-layout.tsx` -- Layout selector dropdown
- `components/ui/select-container-width.tsx` -- Container width selector
- `components/admin/settings/CustomNavigationManager.tsx` -- Navigation editor
- `app/[locale]/layout.tsx` -- Root application layout
- `app/[locale]/admin/layout.tsx` -- Admin-specific layout
