---
id: architecture
title: Architecture Overview
sidebar_label: Overview
sidebar_position: 0
---

# Architecture Overview

This page provides a high-level map of the Ever Works template architecture. Use it as a starting point before diving into the detailed pages that follow.

## Technology Foundation

The template is a **Next.js 16** application using the **App Router** with **React 19**. It produces a `standalone` output for containerized deployments and applies several framework-level optimizations in `next.config.ts`:

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server and client rendering, routing, API routes |
| **UI** | React 19, HeroUI, Radix UI, Tailwind CSS 4 | Component library, primitives, styling |
| **Database** | Drizzle ORM + PostgreSQL (or SQLite locally) | Schema management, migrations, queries |
| **Authentication** | NextAuth.js v5 (beta) | Multi-provider auth with session caching |
| **Internationalization** | next-intl | Locale-aware routing and message bundles |
| **Payments** | Stripe, Polar, LemonSqueezy, Solidgate | Subscription and one-time payment flows |
| **Content** | Git-based CMS (`.content/` directory) | Markdown/YAML content cloned from a data repository |
| **Monitoring** | Sentry, PostHog, Vercel Analytics | Error tracking, product analytics, performance |
| **Email** | Resend | Transactional email delivery |
| **Rich Text** | Tiptap | WYSIWYG editor for admin content |

## Project Structure

The template follows a layered, feature-based organization. Here are the top-level directories and their responsibilities:

```text
template/
  app/              # Next.js App Router -- routes and layouts
    [locale]/       # Locale-prefixed pages (i18n)
      admin/        # Admin dashboard pages
      auth/         # Authentication flows
      dashboard/    # Client dashboard
      items/        # Item detail pages
      categories/   # Category browsing
      ...
    api/            # API route handlers
  components/       # Shared React components (UI, layout, features)
  lib/              # Core logic -- the heart of the application
    auth/           # Authentication providers, guards, session caching
    db/             # Drizzle schema, migrations, seed, queries
    middleware/     # Permission checks and middleware utilities
    repositories/  # Data-access layer (database queries)
    services/      # Business logic services
    payment/       # Payment provider integrations
    mail/           # Email templates and sending
    analytics/     # Analytics tracking layer
    config/        # Centralized configuration service
    validations/   # Zod schemas for input validation
    utils/         # General utility functions
    ...
  hooks/            # Custom React hooks (React Query wrappers, UI logic)
  constants/        # Application-wide constants
  types/            # Shared TypeScript type definitions
  i18n/             # Internationalization setup and locale request config
  messages/         # Translation message files (JSON per locale)
  e2e/              # Playwright end-to-end tests
  scripts/          # Build, seed, migration, and utility scripts
  public/           # Static assets
```

For a full directory walkthrough, see the [Project Structure](/docs/architecture/project-structure) page.

## Layered Architecture

The codebase enforces a clear separation of concerns across three layers:

### Presentation Layer

React components in `components/` and page files in `app/[locale]/` handle rendering and user interaction. Server Components fetch data directly; Client Components use React Query hooks from `hooks/` for client-side state.

### Business Logic Layer

Services in `lib/services/` contain the core business rules. The template ships with over 30 service files covering analytics, subscriptions, moderation, CRM sync, geocoding, notifications, and more. Services are called by API route handlers and server components but never directly by UI code in the browser.

### Data Access Layer

Repositories in `lib/repositories/` encapsulate all database queries using Drizzle ORM. Each domain entity (items, categories, collections, users, roles, tags, sponsor ads) has its own repository file. This keeps SQL-level details out of the service layer.

For a deeper look at the data flow between these layers, see [Data Flow](/docs/architecture/data-flow).

## Next.js App Router and Routing

All user-facing routes live under `app/[locale]/`, which enables locale-prefixed URLs out of the box via `next-intl`. The application uses several App Router features:

- **Layouts** -- nested `layout.tsx` files for admin, client dashboard, and public areas.
- **Route Groups** -- the `(listing)` group handles the main directory listing and tag browsing without affecting the URL structure.
- **Dynamic Routes** -- `[page]`, `[...tag]`, and named segments for items, categories, and collections.
- **Rewrites** -- defined in `next.config.ts` to redirect bare category paths to their paginated discover view.

See [Routing](/docs/architecture/routing) for the full route map.

## Authentication System

Authentication is built on **NextAuth.js v5** with a provider configuration system in `lib/auth/`. The `auth.config.ts` file at the project root orchestrates:

- **OAuth providers** -- Google and GitHub, configured through environment variables and enabled/disabled dynamically.
- **Credentials provider** -- email/password authentication with bcrypt hashing.
- **Supabase adapter** -- optional Supabase-backed session storage.
- **Session caching** -- `lib/auth/cached-session.ts` reduces redundant session lookups.
- **Guard system** -- `lib/auth/guards.ts` and `lib/guards/` enforce role-based access at the route level.

For details on the guard system and role-based permissions, see [Guards System](/docs/architecture/guards-system) and [Permissions System](/docs/architecture/permissions-system).

## Drizzle ORM and Database

The database layer uses **Drizzle ORM** with the schema defined in `lib/db/schema.ts`. Key aspects:

- **Migrations** are generated with `drizzle-kit generate` and applied with `drizzle-kit migrate`.
- **Seeding** scripts in `lib/db/seed.ts` and `scripts/cli-seed.ts` populate initial data including roles.
- **Configuration** lives in `drizzle.config.ts` at the project root.
- PostgreSQL is required for production; SQLite is supported for local development.

See [Repository Patterns](/docs/architecture/repository-patterns) for how the data access layer is structured.

## Middleware Chain

The template uses Next.js middleware (via the `next-intl` plugin applied in `next.config.ts`) combined with custom permission checks in `lib/middleware/permission-check.ts`. The middleware pipeline handles:

- Locale detection and routing
- Authentication state verification
- Role-based route protection
- Security headers (HSTS, CSP, X-Frame-Options, and more -- configured in `next.config.ts`)

For a detailed breakdown, see [Middleware](/docs/architecture/middleware) and [Middleware Deep Dive](/docs/architecture/middleware-deep-dive).

## Configuration and Security

The `next.config.ts` file sets several security and performance defaults:

- **Standalone output** for Docker-friendly deployments.
- **Security headers** including Content-Security-Policy, HSTS, X-Content-Type-Options, and X-Frame-Options.
- **Image optimization** with remote pattern support and SVG safety policies.
- **Sentry integration** applied as the outermost config wrapper for error tracking.
- **Package optimization** for HeroUI and Lucide React to reduce bundle size.

## Detailed Architecture Pages

Explore these pages for deeper coverage of individual systems:

| Page | What It Covers |
|---|---|
| [Tech Stack](/docs/architecture/tech-stack) | Full dependency inventory and version details |
| [Project Structure](/docs/architecture/project-structure) | Directory-by-directory walkthrough |
| [Data Flow](/docs/architecture/data-flow) | Request lifecycle from browser to database |
| [Routing](/docs/architecture/routing) | App Router structure and URL patterns |
| [Component Patterns](/docs/architecture/component-patterns) | Server vs. client components, composition patterns |
| [State Management](/docs/architecture/state-management) | React Query, Zustand, and server state |
| [API Layer](/docs/architecture/api-layer) | REST API design and route handler patterns |
| [Middleware](/docs/architecture/middleware) | Middleware pipeline and request processing |
| [Guards System](/docs/architecture/guards-system) | Role-based access control at the route level |
| [Permissions System](/docs/architecture/permissions-system) | Fine-grained permission definitions |
| [Repository Patterns](/docs/architecture/repository-patterns) | Data access layer conventions |
| [Validation Patterns](/docs/architecture/validation-patterns) | Zod schemas and input validation |
| [Theme System](/docs/architecture/theme-system) | Theming architecture and color management |
| [Color System](/docs/architecture/color-system) | Dynamic color generation pipeline |
| [SEO System](/docs/architecture/seo-system) | Metadata, sitemaps, and structured data |
| [Payment Library](/docs/architecture/payment-library) | Multi-provider payment integration |
| [Content Library](/docs/architecture/content-library) | Git-based CMS content pipeline |
| [Editor System](/docs/architecture/editor-system) | Tiptap rich-text editor integration |
| [Mapper Patterns](/docs/architecture/mapper-patterns) | Data transformation between layers |
| [Error Boundaries](/docs/architecture/error-boundaries) | Error handling and recovery |
| [Analytics Layer](/docs/architecture/analytics-layer) | Event tracking and analytics pipeline |
| [Swagger System](/docs/architecture/swagger-system) | OpenAPI documentation generation |

## Where to Go Next

- **New to the project?** Start with [Getting Started](/docs/getting-started) to install and run the template.
- **Ready to customize?** Jump to the [Guides](/docs/guides) section for step-by-step tutorials.
- **Want the full tech inventory?** See [Tech Stack](/docs/architecture/tech-stack).

---

Understanding the architecture will help you make informed decisions when extending the template. Start with the areas most relevant to your use case and explore outward from there.
