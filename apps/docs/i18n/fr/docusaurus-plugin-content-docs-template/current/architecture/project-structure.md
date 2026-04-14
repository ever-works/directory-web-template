---
id: project-structure
title: Référence de la structure du projet
sidebar_label: Structure du projet
sidebar_position: 4
---

# Référence de la structure du projet

Ce document fournit une référence complète de la structure du répertoire des modèles Ever Works. Le modèle est un **Turborepo monorepo** géré avec des espaces de travail pnpm. L'application principale est une application Next.js 16 utilisant App Router, TypeScript, Drizzle ORM et Tailwind CSS, située dans `apps/web/`.

## Présentation de niveau supérieur (racine Monorepo)

```
template/
├── apps/
│   ├── web/                # Next.js 16 main application
│   ├── web-e2e/            # Playwright E2E tests
│   └── docs/               # Docusaurus v3 documentation site
├── packages/
│   ├── tsconfig/           # Shared TypeScript configurations
│   └── eslint-config/      # Shared ESLint 9 flat config
├── turbo.json              # Turborepo pipeline configuration
├── pnpm-workspace.yaml     # pnpm workspace definition
├── package.json            # Root workspace package
├── CLAUDE.md               # AI coding tool instructions
├── AGENTS.md               # Cursor agent instructions
├── WARP.md                 # Warp terminal instructions
└── AUGMENT.md              # Augment Code instructions
```

### apps/web/ -- Application Next.js

L'application principale réside dans `apps/web/`. Tous les répertoires sources qui se trouvaient auparavant à la racine du référentiel résident désormais ici.

```
apps/web/
├── app/                    # Next.js App Router - pages and API routes
├── components/             # React components (feature, shared, UI)
├── constants/              # Application-wide constants
├── hooks/                  # Custom React hooks
├── i18n/                   # Internationalization configuration
├── lib/                    # Core logic, services, and utilities
├── messages/               # i18n translation files
├── public/                 # Static assets (images, icons, OpenAPI spec)
├── scripts/                # Build and utility scripts
├── styles/                 # Global styles
├── templates/              # Email and notification templates
├── types/                  # Global TypeScript type definitions
├── .content/               # Git-based CMS content
├── auth.config.ts          # NextAuth.js base configuration
├── drizzle.config.ts       # Drizzle ORM / Kit configuration
├── env-config.ts           # Environment variable configuration
├── instrumentation.ts      # Server-side instrumentation (DB init)
├── middleware.ts            # Next.js middleware (via next-intl)
├── next.config.ts          # Next.js configuration
├── sentry.config.ts        # Sentry error tracking configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration (extends packages/tsconfig)
```

## Outillage Monorepo

Le modèle utilise **Turborepo** pour l'orchestration de build et **espaces de travail pnpm** pour la gestion des dépendances dans le monorepo.

|Outil|Objectif|Configuration|
|------|---------|---------------|
|Turborepo|Orchestration des tâches, mise en cache, builds parallèles|`turbo.json`|
|espaces de travail pnpm|Gestion des dépendances, liaison des espaces de travail|`pnpm-workspace.yaml`|
|`packages/tsconfig`|Configurations de base TypeScript partagées|Étendu par chaque application|
|`packages/eslint-config`|Préréglages de configuration plats ESLint 9 partagés|Importé par chaque application|

### Applications d'espace de travail

- **`apps/web`** -- L'application principale Next.js 16 (liste des répertoires, panneau d'administration, routes API).
- **`apps/web-e2e`** -- Tests de bout en bout du dramaturge ciblant `apps/web`. Séparé dans son propre espace de travail pour les dépendances isolées et les exécutions de CI indépendantes.
- **`apps/docs`** -- Site de documentation Docusaurus v3 pour le modèle lui-même.

---

## apps/web/app/ -- Pages and API Routes

The `apps/web/app/` directory follows the Next.js App Router convention with internationalization support via a `[locale]` dynamic segment.

```
apps/web/app/
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

## apps/web/components/ -- React Components

Components are organized by feature domain, with shared and UI components separated.

```
apps/web/components/
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

## apps/web/hooks/ -- Custom React Hooks

The `apps/web/hooks/` directory contains over 100 custom React hooks, organized as flat files with consistent naming. Each hook wraps React Query (TanStack Query), Zustand, or specialized logic.

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

## apps/web/lib/ -- Core Logic and Services

The `apps/web/lib/` directory is the backbone of the application, containing business logic, data access, and integrations.

```
apps/web/lib/
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

## apps/web-e2e/ -- End-to-End Tests

End-to-end tests live in their own workspace (`apps/web-e2e/`) and use Playwright with the Page Object Model pattern. This separation allows independent dependency management and CI runs.

```
apps/web-e2e/
├── fixtures/               # Test fixtures and setup
├── helpers/                # Test helper utilities
├── page-objects/           # Page Object Model classes
├── tests/                  # Test specifications
├── global-setup.ts         # Global test setup
├── global-teardown.ts      # Global test teardown
├── playwright.config.ts    # Playwright configuration
└── tsconfig.json           # E2E TypeScript configuration
```

## Other Directories (under apps/web/)

### apps/web/types/
Global TypeScript declarations including Next.js module augmentations and shared interfaces.

### apps/web/public/
Static assets including logos, background images, country flag icons, and the OpenAPI specification (`openapi.json`).

### apps/web/i18n/
Internationalization configuration for `next-intl`, supporting 6 locales: English, French, Spanish, German, Arabic, and Chinese.

### apps/web/messages/
Translation message files for each supported locale, used by the `next-intl` library.

### apps/web/scripts/
Build and utility scripts including environment validation (`check-env.js`), content repository cloning (`clone.cjs`), and database management tools.

### apps/web/styles/
Global CSS and SCSS stylesheets for the application.

### apps/web/templates/
Email and notification templates used by the mail service.

### apps/web/.content/
Git-based CMS content directory, managed by the content repository system.

## Shared Packages

### packages/tsconfig/
Shared TypeScript base configurations extended by all apps in the monorepo. Provides consistent compiler options, path aliases, and strictness settings across workspaces.

### packages/eslint-config/
Shared ESLint 9 flat config presets. Each app imports and extends these presets, ensuring consistent linting rules across the entire monorepo.
