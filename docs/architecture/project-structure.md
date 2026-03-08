---
id: project-structure
title: Project Structure Reference
sidebar_label: Project Structure
sidebar_position: 4
---

# Project Structure Reference

This document provides a complete reference of the Ever Works template directory structure. The template is a Next.js 16 application using the App Router, TypeScript, Drizzle ORM, and Tailwind CSS.

## Top-Level Overview

```
template/
├── app/                    # Next.js App Router - pages and API routes
├── components/             # React components (feature, shared, UI)
├── constants/              # Application-wide constants
├── docs/                   # Internal project documentation
├── e2e/                    # End-to-end tests (Playwright)
├── hooks/                  # Custom React hooks
├── i18n/                   # Internationalization configuration
├── lib/                    # Core logic, services, and utilities
├── messages/               # i18n translation files
├── public/                 # Static assets (images, icons, OpenAPI spec)
├── scripts/                # Build and utility scripts
├── templates/              # Email and notification templates
├── types/                  # Global TypeScript type definitions
├── utils/                  # Utility functions
├── auth.config.ts          # NextAuth.js base configuration
├── drizzle.config.ts       # Drizzle ORM / Kit configuration
├── env-config.ts           # Environment variable configuration
├── instrumentation.ts      # Server-side instrumentation (DB init)
├── middleware.ts            # Next.js middleware (via next-intl)
├── next.config.ts          # Next.js configuration
├── sentry.config.ts        # Sentry error tracking configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## app/ -- Pages and API Routes

The `app/` directory follows the Next.js App Router convention with internationalization support via a `[locale]` dynamic segment.

```
app/
├── [locale]/               # Locale-wrapped pages (en, fr, es, de, ar, zh)
│   ├── (listing)/          # Route group: main listing pages
│   ├── about/              # About page
│   ├── admin/              # Admin panel pages
│   │   ├── auth/           # Admin authentication
│   │   ├── categories/     # Category management
│   │   ├── clients/        # Client management
│   │   ├── collections/    # Collection management
│   │   ├── comments/       # Comment moderation
│   │   ├── companies/      # Company management
│   │   ├── featured-items/ # Featured items management
│   │   ├── items/          # Item management
│   │   ├── reports/        # Report management
│   │   ├── roles/          # Role and permission management
│   │   ├── settings/       # Admin settings
│   │   ├── sponsorships/   # Sponsorship management
│   │   ├── surveys/        # Survey management
│   │   ├── tags/           # Tag management
│   │   └── users/          # User management
│   ├── auth/               # Authentication pages (signin, signup, etc.)
│   ├── categories/         # Category listing pages
│   ├── client/             # Client dashboard
│   ├── collections/        # Collection pages
│   ├── cookies/            # Cookie policy page
│   ├── dashboard/          # User dashboard
│   ├── docs/               # Documentation pages
│   ├── favorites/          # User favorites page
│   ├── help/               # Help center pages
│   ├── items/              # Individual item pages
│   ├── newsletter/         # Newsletter subscription
│   ├── pages/              # Static content pages
│   ├── pricing/            # Pricing and plans
│   ├── privacy-policy/     # Privacy policy page
│   ├── sponsor/            # Sponsorship pages
│   ├── submit/             # Item submission pages
│   ├── surveys/            # Survey pages
│   ├── tags/               # Tag listing pages
│   ├── terms-of-service/   # Terms of service page
│   ├── config.tsx          # Locale-specific configuration
│   ├── globals.css         # Global CSS styles
│   ├── globals.scss        # Global SCSS styles
│   ├── layout.tsx          # Root locale layout
│   └── providers.tsx       # Client-side providers wrapper
├── api/                    # API route handlers (29 groups)
│   ├── admin/              # Admin API endpoints
│   ├── auth/               # Authentication API
│   ├── categories/         # Category API
│   ├── client/             # Client API
│   ├── collections/        # Collections API
│   ├── config/             # Configuration API
│   ├── cron/               # Cron job endpoints
│   ├── current-user/       # Current user API
│   ├── extract/            # URL extraction API
│   ├── favorites/          # Favorites API
│   ├── featured-items/     # Featured items API
│   ├── geocode/            # Geocoding API
│   ├── health/             # Health check endpoint
│   ├── internal/           # Internal API endpoints
│   ├── items/              # Items API
│   ├── lemonsqueezy/       # LemonSqueezy webhook
│   ├── location/           # Location API
│   ├── payment/            # Payment API
│   ├── polar/              # Polar webhook
│   ├── reference/          # Reference data API
│   ├── reports/            # Reports API
│   ├── solidgate/          # Solidgate webhook
│   ├── sponsor-ads/        # Sponsor ads API
│   ├── stripe/             # Stripe webhook
│   ├── surveys/            # Surveys API
│   ├── user/               # User API
│   ├── verify-recaptcha/   # reCAPTCHA verification
│   └── version/            # Version info API
├── fonts.ts                # Font configuration
├── layout.tsx              # Root application layout
├── not-found.tsx           # 404 page
├── global-error.tsx        # Global error boundary
├── sitemap.ts              # Dynamic sitemap generation
├── robots.ts               # Robots.txt generation
└── opengraph-image.tsx     # Dynamic OG image generation
```

## components/ -- React Components

Components are organized by feature domain, with shared and UI components separated.

```
components/
├── admin/                  # Admin panel components
├── api/                    # API-related components
├── auth/                   # Authentication components
├── billing/                # Billing and payment components
├── collections/            # Collection display components
├── context/                # React context providers
├── dashboard/              # Dashboard components
├── directory/              # Directory listing components
├── favorites/              # Favorites components
├── featured-items/         # Featured items display
├── filters/                # Search and filter components
├── footer/                 # Footer components
├── header/                 # Header and navigation
├── home-two/               # Alternate homepage layout
├── icons/                  # Custom icon components
├── item-detail/            # Item detail page components
├── layout/                 # Layout wrapper components
├── layouts/                # Layout variant components
├── maps/                   # Map integration components
├── newsletter/             # Newsletter components
├── payment/                # Payment flow components
├── pricing/                # Pricing display components
├── profile/                # User profile components
├── profile-button/         # Profile button dropdown
├── providers/              # Provider wrapper components
├── settings/               # Settings panel components
├── shared/                 # Shared reusable components
├── shared-card/            # Shared card components
├── sponsor-ads/            # Sponsor ad components
├── sponsorships/           # Sponsorship management components
├── submissions/            # Submission form components
├── submit/                 # Item submit components
├── surveys/                # Survey components
├── tracking/               # Analytics tracking components
├── ui/                     # Base UI primitives
│   ├── button.tsx          # Button component
│   ├── card.tsx            # Card component
│   ├── input.tsx           # Input component
│   ├── modal.tsx           # Modal component
│   ├── select.tsx          # Select component
│   ├── pagination.tsx      # Pagination component
│   ├── animations.tsx      # Animation utilities
│   └── ...                 # Additional UI primitives
└── version/                # Version display components
```

## hooks/ -- Custom React Hooks

The `hooks/` directory contains over 100 custom React hooks, organized as flat files with consistent naming. Each hook wraps React Query (TanStack Query), Zustand, or specialized logic.

Key hook categories include:

| Category | Examples | Purpose |
|----------|----------|---------|
| Admin Management | `use-admin-items`, `use-admin-users`, `use-admin-categories` | CRUD operations for admin panel |
| Client Operations | `use-client-items`, `use-client-item-details`, `use-client-item-filters` | Client dashboard operations |
| Billing & Payments | `use-subscription`, `use-billing-data`, `use-checkout-button` | Payment provider integration |
| Engagement | `use-favorites`, `use-item-vote`, `use-comments`, `use-item-engagement` | User interaction features |
| UI & Navigation | `use-theme`, `use-mobile`, `use-scroll-to-top`, `use-debounced-search` | UI state and behavior |
| Feature Flags | `use-feature-flag`, `use-feature-flags`, `use-plan-guard` | Feature gating by plan |
| Geolocation | `use-geolocation`, `use-user-location`, `use-map-provider` | Location features |

## lib/ -- Core Logic and Services

The `lib/` directory is the backbone of the application, containing business logic, data access, and integrations.

```
lib/
├── analytics/              # Analytics tracking utilities
├── api/                    # API client classes and utilities
│   ├── api-client.ts       # Browser-side API client
│   ├── api-client-class.ts # API client base class
│   ├── server-api-client.ts # Server-side API client
│   └── error-handler.ts    # API error handling
├── auth/                   # Authentication system
│   ├── index.ts            # NextAuth.js configuration
│   ├── admin-guard.ts      # Admin route protection
│   ├── guards.ts           # Page-level auth guards
│   ├── middleware.ts        # Auth middleware utilities
│   ├── credentials.ts      # Credentials provider
│   ├── providers.ts        # OAuth provider configuration
│   ├── cached-session.ts   # Session caching layer
│   └── services/           # Auth service implementations
├── background-jobs/        # Background job processing
├── config/                 # Application configuration
├── constants/              # Library constants (payment plans, etc.)
├── db/                     # Database layer (Drizzle ORM)
│   ├── schema.ts           # Complete database schema (40+ tables)
│   ├── drizzle.ts          # Database connection management
│   ├── queries/            # Query modules (23+ files)
│   ├── migrations/         # SQL migration files (29+)
│   ├── seed.ts             # Database seeding
│   ├── initialize.ts       # Auto-initialization on startup
│   └── migrate.ts          # Migration runner
├── guards/                 # Access control guards
│   └── plan-features.guard.ts # Plan-based feature gating
├── mail/                   # Email sending utilities
├── mappers/                # Data mapping utilities
├── maps/                   # Map provider integrations
├── middleware/              # Request middleware
│   └── permission-check.ts # Permission verification
├── payment/                # Payment provider integrations
├── permissions/            # Permission definitions
├── repositories/           # Data access repositories (13 files)
├── services/               # Business logic services (30+ files)
├── seo/                    # SEO utilities
├── swagger/                # OpenAPI/Swagger configuration
├── types/                  # Library-specific types
├── utils/                  # Utility functions
├── validations/            # Zod validation schemas
├── config.ts               # Site configuration
├── config-manager.ts       # Dynamic config management
├── content.ts              # Git-based content management
├── query-client.ts         # TanStack Query client setup
├── react-query-config.ts   # React Query global configuration
├── repository.ts           # Base repository (Git operations)
└── utils.ts                # General utility functions
```

## e2e/ -- End-to-End Tests

End-to-end tests use Playwright with the Page Object Model pattern.

```
e2e/
├── fixtures/               # Test fixtures and setup
├── helpers/                # Test helper utilities
├── page-objects/           # Page Object Model classes
├── tests/                  # Test specifications
├── global-setup.ts         # Global test setup
├── global-teardown.ts      # Global test teardown
├── playwright.config.ts    # Playwright configuration
└── tsconfig.json           # E2E TypeScript configuration
```

## Other Directories

### types/
Global TypeScript declarations including Next.js module augmentations and shared interfaces.

### public/
Static assets including logos, background images, country flag icons, and the OpenAPI specification (`openapi.json`).

### i18n/
Internationalization configuration for `next-intl`, supporting 6 locales: English, French, Spanish, German, Arabic, and Chinese.

### messages/
Translation message files for each supported locale, used by the `next-intl` library.

### scripts/
Build and utility scripts including environment validation (`check-env.js`), content repository cloning (`clone.cjs`), and database management tools.

### templates/
Email and notification templates used by the mail service.
