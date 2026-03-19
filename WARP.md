# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is the **Ever Works Directory Web Template**, a full-stack Next.js 16 application within the **Ever Works Turborepo monorepo** with App Router. It's a versatile directory/listing platform featuring:

- Git-based CMS for content management
- Multi-provider authentication (Auth.js)
- Multi-provider payment processing (Stripe, LemonSqueezy, Polar)
- PostgreSQL/SQLite database with Drizzle ORM
- Multi-language support (21 languages via next-intl)
- Role-based access control (RBAC)
- Analytics integrations (PostHog, Sentry)
- Email notifications (Resend, Novu)
- Background job scheduling (Trigger.dev)
- CRM integration (Twenty CRM)

### Monorepo Structure

This web app is part of a Turborepo monorepo:

- `apps/web/` - This Next.js application
- `apps/web-e2e/` - Playwright E2E tests
- `apps/docs/` - Docusaurus documentation site (app shell, config, themes)
- `docs/` - Documentation content (Markdown files & assets, served by `apps/docs/`)
- `packages/tsconfig/` - Shared TypeScript configurations
- `packages/eslint-config/` - Shared ESLint configurations

## Essential Commands

All commands below should be run from `apps/web/` unless noted. For monorepo-wide commands, run from the repository root.

### Monorepo Root Commands

```bash
# From the monorepo root
pnpm run dev          # Start all dev servers
pnpm run build        # Build all packages
pnpm run lint         # Lint all packages
pnpm run --filter @ever-works/web dev   # Start only web app
```

### Development

```bash
# Start dev server (http://localhost:3000)
pnpm dev

# Start dev with full env validation
pnpm dev:check

# Watch and regenerate OpenAPI docs
pnpm docs:watch
```

### Build & Deploy

```bash
# Production build with env validation
pnpm build

# CI build (silent mode)
pnpm build:ci

# Start production server
pnpm start
```

### Code Quality

```bash
# Lint code (ESLint)
pnpm lint

# Type-check (without build)
pnpm tsc --noEmit
```

### Database Operations

```bash
# Generate migrations from schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Open Drizzle Studio (GUI)
pnpm db:studio

# Seed database with initial data
pnpm db:seed
```

### Environment & Content

```bash
# Validate environment variables
pnpm check-env

# Quick validation (skip non-critical checks)
pnpm check-env:quick

# Generate OpenAPI documentation
pnpm generate-docs
```

### Running Single Tests

There is currently **no formal test suite** (no Jest/Vitest). The verification workflow is:

1. `pnpm lint` for code style
2. `pnpm tsc --noEmit` for type checking
3. `pnpm build` for production verification

## Architecture Overview

### High-Level Structure

#### App Router Organization

- **`apps/web/app/[locale]/`** - Internationalized pages (supports 21 languages)
    - Main user-facing routes with i18n support
    - Dynamic routing for categories, items, profiles
- **`apps/web/app/api/`** - API route handlers
    - RESTful endpoints documented with Swagger/JSDoc
    - Organized by feature domain (auth, items, payments, admin, etc.)
- **`apps/web/app/auth/`** - Authentication pages
- **`apps/web/app/unauthorized/`** - Access denied pages

#### Business Logic Layer (`apps/web/lib/`)

- **`apps/web/lib/services/`** - Business logic and operations
    - Service classes handle complex workflows
    - Examples: `sync-service.ts`, `subscription.service.ts`, `user-db.service.ts`
- **`apps/web/lib/repositories/`** - Data access layer
    - Abstracts database queries with Drizzle ORM
    - Examples: `user.repository.ts`, `item.repository.ts`, `category.repository.ts`
- **`apps/web/lib/db/`** - Database infrastructure
    - `schema.ts` - Complete Drizzle schema definition
    - `migrations/` - Version-controlled database migrations
- **`apps/web/lib/auth/`** - Authentication system
    - Next-auth configuration and utilities
    - Middleware for protected routes
- **`apps/web/lib/payment/`** - Payment processing
    - Multi-provider support (Stripe, LemonSqueezy, Polar)
    - Unified payment service interface
- **`apps/web/lib/analytics/`** - Analytics integrations (PostHog, Sentry)
- **`apps/web/lib/middleware/`** - Request middleware
- **`apps/web/lib/utils/`** - Shared utility functions
- **`apps/web/lib/validations/`** - Zod schemas for input validation

#### Component Organization (`apps/web/components/`)

Components are organized by feature domain:

- `admin/` - Admin dashboard components
- `auth/` - Authentication UI (login, register, password reset)
- `dashboard/` - User dashboard components
- `directory/` - Item listing and browsing
- `item-detail/` - Individual item pages
- `profile/` - User profile management
- `payment/` - Checkout and billing UI
- `settings/` - User settings panels
- `shared/` - Reusable components across features
- `ui/` - Base UI components (buttons, inputs, cards)
- `layout/` - Page layout components

#### Custom Hooks (`apps/web/hooks/`)

React Query-powered hooks for:

- Data fetching (`use-admin-*.ts`, `use-current-user.ts`)
- Feature flags (`use-feature-flags.ts`)
- Payment flows (`use-payment-flow.ts`, `use-subscription.ts`)
- Form management (`use-multi-step-form.ts`)
- Analytics (`use-analytics.ts`)

### Key Architectural Patterns

#### Git-Based CMS

Content lives in a separate Git repository (defined by `DATA_REPOSITORY` env var):

- **`.content/`** directory is cloned/synced at build/runtime
- Structure:
    - `data/` - Item data (markdown files)
    - `posts/` - Blog posts (MDX)
    - `categories/` - Category definitions (YAML)
    - `config.yml` - Site configuration
- **Sync mechanism**:
    - `scripts/clone.cjs` - Initial clone during prebuild/predev
    - `lib/repository.ts` - Pull/sync logic with conflict resolution
    - `lib/services/sync-service.ts` - Background sync every 5 minutes
    - Automatic retry with exponential backoff
    - Handles merge conflicts by pushing local changes first

#### Multi-Provider Payment System

Unified payment abstraction supporting three providers:

- **`lib/payment/lib/payment-service-manager.ts`** - Provider switching logic
- **`lib/payment/lib/payment-service.ts`** - Unified API
- Provider-specific implementations:
    - Stripe (via `@stripe/stripe-js`)
    - LemonSqueezy (via `@lemonsqueezy/lemonsqueezy.js`)
    - Polar (via `@polar-sh/sdk`)
- Configuration in `.content/config.yml` determines active provider
- Webhooks handled in `app/api/stripe/`, `app/api/lemonsqueezy/`, `app/api/polar/`

#### Authentication Architecture

- **Next-auth v5 (beta)** with custom configuration
- Multiple auth strategies:
    - Credentials (email/password with bcrypt)
    - OAuth providers (Google, GitHub, Facebook, Twitter, Microsoft, LinkedIn)
    - Provider availability controlled via `.content/config.yml`
- **Session management**: Database-backed sessions
- **Middleware**: `lib/auth/middleware.ts` for protected routes
- **ReCAPTCHA v2** integration on auth forms

#### Role-Based Access Control (RBAC)

Full RBAC system with flexible permissions:

- **Database schema** (`lib/db/schema.ts`):
    - `roles` - Role definitions (admin flag, status)
    - `permissions` - Permission keys
    - `rolePermissions` - Many-to-many relationship
    - `userRoles` - User role assignments
- **Service layer**: `lib/services/role-db.service.ts`
- **Repository layer**: `lib/repositories/role.repository.ts`
- **Hooks**: `use-role-permissions.ts`, `use-active-roles.ts`
- Middleware checks permissions for admin routes

#### Internationalization (i18n)

- **21 supported languages**: en, es, fr, de, ar, zh, ja, ko, ru, pt, it, nl, pl, bg, he, hi, id, th, tr, uk, vi
- **Translation files**: `messages/*.json`
- **Integration**: next-intl with App Router
- **Configuration**: `i18n/request.ts`
- **Sync script**: `scripts/sync-translations.js`

#### API Documentation

Auto-generated OpenAPI/Swagger documentation:

- **Script**: `scripts/generate-openapi.ts`
- **Annotations**: JSDoc comments in API routes
- **Viewer**: Scalar API reference at `/reference`
- **Generated on**: Every dev start, before build

#### Background Jobs

Supports two modes:

1. **Development**: Local in-memory scheduling
2. **Production**: Trigger.dev integration

- Configuration: `TRIGGER_DEV_ENABLED` env var
- Jobs defined in `lib/background-jobs/`
- Examples: Analytics processing, scheduled reports, CRM sync

#### Database Patterns

- **ORM**: Drizzle with PostgreSQL dialect
- **Schema**: Single comprehensive file (`lib/db/schema.ts`)
- **Migrations**: Versioned in `lib/db/migrations/`
- **Seeding**: `scripts/cli-seed.ts` with Faker.js for test data
- **Indexes**: Comprehensive indexing on foreign keys, timestamps, status fields
- **Soft deletes**: `deletedAt` timestamps (not hard deletes)

### Request Flow Examples

#### User Registration Flow

1. Client submits form → `app/api/auth/register/route.ts`
2. Validate with Zod schema + ReCAPTCHA
3. Hash password with bcrypt
4. Create user via `lib/services/user-db.service.ts`
5. Create profile via repository layer
6. Send welcome email via `lib/services/email-notification.service.ts`
7. Return session token

#### Item Listing with Filters

1. Client requests → `app/api/items/route.ts`
2. Parse query params (category, tags, search, pagination)
3. Call `lib/repositories/item.repository.ts`
4. Drizzle builds SQL with joins, filters, pagination
5. Transform results with mappers
6. Cache with Next.js caching
7. Return JSON response

#### Payment Checkout Flow

1. User selects plan → Client calls `use-create-checkout` hook
2. Hook calls `/api/payment/checkout/route.ts`
3. Service manager determines active provider (Stripe/LemonSqueezy/Polar)
4. Create checkout session via provider SDK
5. Return checkout URL
6. Webhook receives payment confirmation → Update subscription in DB
7. Send confirmation email

## Development Guidelines

### Adding New Features

**Pages**: Add to `apps/web/app/[locale]/` with i18n support

- Use `useTranslations()` hook for text
- Respect existing layout patterns

**API Endpoints**: Add to `apps/web/app/api/`

- Document with JSDoc for OpenAPI generation
- Use Zod for input validation
- Keep thin - delegate to services
- Handle errors consistently

**Business Logic**: Add to `apps/web/lib/services/`

- Pure business logic, no direct HTTP handling
- Testable and reusable
- Use repositories for data access

**Database Changes**:

1. Modify `apps/web/lib/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Review generated SQL in `apps/web/lib/db/migrations/`
4. Run `pnpm db:migrate` to apply
5. Update seeding script if needed

**Components**: Add to appropriate `apps/web/components/` subdirectory

- Use existing UI components from `apps/web/components/ui/`
- Follow HeroUI design system
- Keep presentational components separate from data-fetching

### Code Style & Best Practices

**TypeScript**:

- Strict mode enabled
- No `any` types (use `unknown` with type guards)
- Prefer interfaces for public APIs, types for internal use

**Formatting** (Prettier):

- Tabs for indentation (tabWidth: 4)
- Single quotes
- 120 character line width
- Semicolons required
- YAML/SCSS: 2 spaces

**Validation**:

- All user inputs validated with Zod
- Schemas in `lib/validations/`
- Reuse existing schemas when possible

**Error Handling**:

- Use `lib/utils/error-handler.ts` utilities
- Log errors to configured exception tracker
- Return user-friendly messages (no stack traces to client)

**Authentication**:

- Use `auth()` from `lib/auth` to get session
- Check permissions with hooks/utils
- Protect API routes with middleware

**Data Fetching**:

- Use React Query (TanStack Query) for client-side
- Server components fetch directly via services
- Implement proper loading/error states

### Environment Variables

**Required** (see `.env.example` for full list):

- `DATA_REPOSITORY` - Git repo URL for content
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret (generate with `openssl rand -base64 32`)
- `COOKIE_SECRET` - Cookie encryption secret

**Optional but Recommended**:

- `GH_TOKEN` - For private content repositories
- OAuth provider credentials (Google, GitHub, etc.)
- Payment provider keys (Stripe, LemonSqueezy, Polar)
- `POSTHOG_*` or `SENTRY_*` for analytics
- `RESEND_API_KEY` or `NOVU_API_KEY` for emails

**Environment Validation**:

- `scripts/check-env.js` runs automatically before dev/build
- Use `--quick` flag to skip non-critical checks
- Use `--silent` flag to suppress output in production

### Database Notes

**SQLite Support**: For local development only

- Set `DATABASE_URL=file:./dev.db`
- PostgreSQL required for production

**Seeding**:

- Admin user: Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`
- Default password `Passw0rd123!` rejected in production
- Fake users: `SEED_FAKE_USER_COUNT` (default: 10)

**Drizzle Studio**: Visual database browser

- `pnpm db:studio` opens in browser
- View/edit data, inspect schema
- Useful for debugging

### Testing & Verification

**Before Committing**:

1. `pnpm lint` - Must pass
2. `pnpm tsc --noEmit` - Must pass
3. `pnpm build` - For infrastructure changes

**No Formal Tests**: Project currently has no unit/integration tests

- Consider adding tests when modifying critical paths
- Focus on type safety and linting

### Common Patterns

**Server Actions**:

- Use `validatedAction()` and `validatedActionWithUser()` from `lib/auth/middleware.ts`
- Automatically validates with Zod and checks auth

**React Query Hooks**:

- Follow naming: `use-[feature]-[action].ts`
- Include loading, error, and success states
- Use `useMutation` for writes, `useQuery` for reads

**Form Handling**:

- react-hook-form + Zod resolver
- See existing auth forms as examples

**Content Files**:

- Never edit `.content/` manually (synced from Git)
- Changes should go to `DATA_REPOSITORY`
- Local changes will be overwritten on next sync

### Important Files

- **`apps/web/auth.config.ts`** - NextAuth provider configuration
- **`apps/web/drizzle.config.ts`** - Drizzle ORM settings
- **`apps/web/next.config.ts`** - Next.js configuration (standalone output, image domains)
- **`apps/web/tailwind.config.ts`** - Tailwind + HeroUI theming
- **`apps/web/middleware.ts`** - Route protection and i18n
- **`apps/web/instrumentation.ts`** - OpenTelemetry setup

## Deployment

This web app is deployed as part of the Turborepo monorepo.

**Vercel** (recommended):

- Standalone output mode configured
- Set all required environment variables
- Configure build command: `pnpm build`
- Configure cron jobs for `/api/cron/sync` (set `CRON_SECRET`)

**Database Migrations**:

- Run migrations in production: `pnpm db:migrate`
- Consider automated migration on deploy
- Always test migrations on staging first

**Content Sync**:

- Initial clone happens during build
- Background sync every 5 minutes in production
- Set `DISABLE_AUTO_SYNC=true` to disable in dev

## Troubleshooting

**Build Failures**:

- Check `scripts/check-env.js` output
- Verify `DATA_REPOSITORY` is accessible
- Ensure database is reachable

**Content Not Updating**:

- Check background sync logs
- Verify `GH_TOKEN` has repo access
- Manually trigger: Call `/api/internal/sync` (admin only)

**Database Errors**:

- Run migrations: `pnpm db:migrate`
- Check `DATABASE_URL` format
- Verify database server is running

**TypeScript Errors**:

- Delete `.next/` and `tsconfig.tsbuildinfo`
- Run `pnpm tsc --noEmit` for detailed errors
- Check for missing types in `global.d.ts`

## Additional Resources

- **Main Docs**: https://docs.ever.works
- **Architecture Docs**: https://github.com/ever-works/ever-works-docs/tree/develop/website/docs
- **Demo Site**: https://demo.ever.works
- **Next.js Docs**: https://nextjs.org/docs
- **Drizzle ORM**: https://orm.drizzle.team
- **Auth.js**: https://authjs.dev
- **HeroUI**: https://www.heroui.com
