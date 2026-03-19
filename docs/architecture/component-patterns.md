---
id: component-patterns
title: Component Architecture & Patterns
sidebar_label: Component Patterns
sidebar_position: 7
---

# Component Architecture & Patterns

The Ever Works template organizes its React components using a feature-based directory structure, with clear separation between feature components, shared components, and base UI primitives.

## Directory Organization

The `components/` directory follows a feature-first organization where each major domain has its own subdirectory, alongside shared and UI-level components.

```
components/
├── admin/              # Admin panel feature components
├── auth/               # Authentication feature components
├── billing/            # Billing and payment components
├── collections/        # Collection display components
├── context/            # React context providers
├── dashboard/          # Dashboard feature components
├── directory/          # Directory listing components
├── favorites/          # Favorites feature components
├── featured-items/     # Featured items display
├── filters/            # Search and filter components
├── footer/             # Footer components
├── header/             # Header and navigation
├── home-two/           # Alternate homepage layout
├── icons/              # Custom icon components
├── item-detail/        # Item detail page components
├── layout/             # Layout wrapper components
├── layouts/            # Layout variant components
├── maps/               # Map integration components
├── newsletter/         # Newsletter components
├── payment/            # Payment flow components
├── pricing/            # Pricing display components
├── profile/            # User profile components
├── profile-button/     # Profile button dropdown
├── providers/          # Provider wrapper components
├── settings/           # Settings panel components
├── shared/             # Shared reusable components
├── shared-card/        # Shared card components
├── sponsor-ads/        # Sponsor ad components
├── sponsorships/       # Sponsorship management components
├── submissions/        # Submission form components
├── submit/             # Item submit components
├── surveys/            # Survey components
├── tracking/           # Analytics tracking components
├── ui/                 # Base UI primitives
└── version/            # Version display components
```

## Feature-Based Components

Each feature directory contains all components related to that domain. This keeps related code co-located and makes it easy to find components for a given feature.

### admin/

Contains all admin panel components including data tables, forms, modals, and management interfaces. These are client components that use admin-specific hooks from `hooks/use-admin-*.ts`.

### auth/

Authentication components including sign-in forms, sign-up forms, password reset flows, OAuth buttons, and email verification screens.

### billing/

Billing and subscription management components including plan selection, payment method forms, invoice display, and subscription status indicators.

### filters/

Search and filtering components used across the listing pages. These interact with URL search parameters and Zustand filter state to provide real-time filtering.

### pricing/

Pricing page components including plan comparison cards, feature matrices, and checkout integration.

## Shared Components

### shared/

The `shared/` directory contains reusable components used across multiple features. These are domain-agnostic building blocks that combine UI primitives into functional patterns.

### shared-card/

Shared card components used for displaying items, collections, and other content in card layouts across the application.

## Root-Level Components

Several standalone component files exist at the root of `components/`:

| Component | Purpose |
|-----------|---------|
| `categories-grid.tsx` | Grid display for categories |
| `custom-hero.tsx` | Customizable hero section |
| `error-boundary.tsx` | Error boundary with fallback UI |
| `error-provider.tsx` | Error context provider |
| `favorite-button.tsx` | Favorite toggle button |
| `hero.tsx` | Default hero section |
| `item.tsx` | Item card component |
| `items-categories.tsx` | Items organized by categories |
| `item-skeleton.tsx` | Loading skeleton for items |
| `item-tags.tsx` | Tag display for items |
| `language-switcher.tsx` | Locale switching component |
| `layout-switcher.tsx` | Grid/list layout toggle |
| `report-button.tsx` | Content report button |
| `sort-menu.tsx` | Sort options dropdown |
| `tags-cards.tsx` | Tag card display |
| `tags-items.tsx` | Items by tag display |
| `theme-toggler.tsx` | Light/dark theme toggle |
| `universal-pagination.tsx` | Reusable pagination component |
| `view-toggle.tsx` | View mode toggle |

## UI Primitives (components/ui/)

The `ui/` directory contains base-level UI components that provide the design system foundation. These are built on top of HeroUI (formerly NextUI) and Tailwind CSS.

Key UI primitives include:

| Component | Description |
|-----------|-------------|
| `button.tsx` | Button with variants (primary, secondary, ghost, etc.) |
| `card.tsx` | Card container with header, body, footer sections |
| `input.tsx` | Text input with validation support |
| `label.tsx` | Form label component |
| `modal.tsx` | Modal dialog with overlay |
| `select.tsx` | Select dropdown with search capability |
| `pagination.tsx` | Page navigation component |
| `badge.tsx` | Status badge component |
| `accordion.tsx` | Expandable content sections |
| `alert.tsx` | Alert/notification banner |
| `breadcrumb.tsx` | Breadcrumb navigation |
| `loading-spinner.tsx` | Loading indicator |
| `password-strength.tsx` | Password strength meter |
| `rating.tsx` | Star rating display/input |
| `infinity-scroll.tsx` | Infinite scroll wrapper |
| `searchable-select.tsx` | Select with search filtering |
| `animations.tsx` | Animation utility components |
| `auth-illustrations.tsx` | Auth page illustrations |

## Server vs Client Components

The template follows Next.js conventions for server and client component separation:

### Server Components

Server components are the default in the App Router. They are used for:
- Page layouts and wrappers
- Data fetching at the page level
- Static content rendering
- SEO-critical content

Server components live primarily in `app/[locale]/` page and layout files. They can directly import database query functions and repository methods.

### Client Components

Client components are marked with `'use client'` and are used for:
- Interactive UI elements (forms, buttons, toggles)
- Components that use React hooks (useState, useEffect, custom hooks)
- Components that use browser APIs
- Components that depend on React Query or Zustand

Most components in the `components/` directory are client components because they handle user interaction and state.

## Context Providers

### components/context/

React context providers for sharing state across component trees:
- Error context for error boundary state
- Feature flag context for runtime feature gating

### components/providers/

Provider wrapper components that compose multiple providers:
- Query client provider (TanStack Query)
- Theme provider
- Session provider (NextAuth)
- Toast provider

The root providers wrapper at `app/[locale]/providers.tsx` composes all necessary providers for the application.

## Component Conventions

1. **File naming**: Components use kebab-case filenames (e.g., `favorite-button.tsx`)
2. **Export pattern**: Components use named exports, barrel files (`index.ts`) in feature directories
3. **Hooks co-location**: Feature-specific hooks live in the top-level `hooks/` directory, not inside component directories
4. **Styling**: Components use Tailwind CSS utility classes; some use SCSS modules for complex styling
5. **Types**: Component prop types are defined inline or in adjacent type files within the `types/` directory
6. **Icons**: Custom icons are centralized in `components/icons/`; standard icons use `lucide-react`
