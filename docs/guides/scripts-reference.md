---
id: scripts-reference
title: "Scripts Reference"
sidebar_label: "Scripts Reference"
sidebar_position: 14
---

# Scripts Reference

The template includes a collection of scripts for development, building, database management, testing, and documentation generation. Scripts are defined in `package.json` and implemented in the `scripts/` directory.

## Development Scripts

### `pnpm dev`

Starts the development server with automatic content repository cloning and environment validation.

```bash
pnpm dev
```

This command runs three stages:

1. **`predev`** -- clones the content repository (`scripts/clone.cjs`) into `.content/`
2. **`check-env --quick`** -- validates critical environment variables
3. **`generate-docs`** -- generates OpenAPI documentation from route annotations
4. **`next dev`** -- starts the Next.js development server with 8 GB memory limit

The `cross-env NODE_OPTIONS='--max-old-space-size=8192'` flag ensures the dev server has enough memory for large codebases.

### `pnpm dev:check`

Runs a full (non-quick) environment variable check before starting the dev server:

```bash
pnpm dev:check
```

Unlike `pnpm dev`, this runs the detailed environment check that reports the status of every configured provider category (auth, email, payment, analytics).

### `pnpm docs:watch`

Watches for changes in API route files and regenerates OpenAPI docs automatically:

```bash
pnpm docs:watch
```

Uses `nodemon` to monitor `app/api/**/*.ts` and re-runs `pnpm generate-docs` on changes.

## Build Scripts

### `pnpm build`

Runs the full production build pipeline:

```bash
pnpm build
```

The pipeline executes in order:

1. **`prebuild`** -- clones the content repository
2. **`check-env`** -- validates all environment variables
3. **`generate-docs --silent`** -- generates OpenAPI documentation
4. **`build-migrate.ts`** -- runs database migrations
5. **`next build`** -- builds the Next.js application

### `pnpm build:ci`

A CI-optimized build that uses a lighter environment check:

```bash
pnpm build:ci
```

Runs `check-env-ci.js` instead of the full `check-env.js`, then proceeds with `next build`. This variant skips database migrations since CI environments typically lack a production database.

### `pnpm start`

Starts the built application in production mode:

```bash
pnpm start
```

Runs a quick, silent environment check before starting `next start`.

## Environment Check Scripts

### `pnpm check-env`

Validates environment variables by loading `.env.local` (primary) and `.env` (fallback), then checking against `.env.example` for completeness.

```bash
pnpm check-env           # Full check with output
pnpm check-env:quick     # Quick check (critical vars only)
pnpm check-env:silent    # Silent mode (errors only)
```

The script categorizes variables into groups (core, database, auth, supabase, content, email, payment, analytics, storage, API, security, background-jobs) and reports the status of each group.

**Critical variables** that trigger warnings when missing:

| Variable | Purpose |
|----------|---------|
| `DATA_REPOSITORY` | Content repository URL |
| `AUTH_SECRET` | Session signing secret |
| `NEXT_PUBLIC_APP_URL` | Application URL |

The script also performs provider-specific checks:

- **OAuth providers** -- reports fully and partially configured providers
- **Supabase** -- checks that both URL and anon key are present
- **Email** -- verifies at least one email system is configured
- **Background jobs** -- reports Trigger.dev vs local scheduling status

### `scripts/check-env-ci.js`

A lighter version of the environment check designed for CI pipelines where not all services are available.

## Content Repository

### `scripts/clone.cjs`

Clones the Git-based CMS content repository into `.content/`. Runs automatically as `predev` and `prebuild`.

```bash
# Runs automatically, but can be called directly:
node scripts/clone.cjs
```

Key behaviors:

- Reads `DATA_REPOSITORY` for the repository URL and `GH_TOKEN` for authentication
- Skips cloning if `.content/.git` already exists
- Uses `isomorphic-git` for cross-platform Git operations
- Exits gracefully (exit code 0) if `DATA_REPOSITORY` is missing or cloning fails

## Database Scripts

### `pnpm db:generate`

Generates Drizzle ORM migration files from schema changes:

```bash
pnpm db:generate
```

Runs `drizzle-kit generate` to diff the current schema against the database and produce SQL migration files.

### `pnpm db:migrate`

Applies pending migrations to the database:

```bash
pnpm db:migrate
```

Runs `drizzle-kit migrate` to apply all unapplied migration files.

### `pnpm db:migrate:cli`

Runs migrations through a CLI wrapper (`scripts/cli-migrate.ts`) that loads environment variables from `.env.local` or `.env` before executing:

```bash
pnpm db:migrate:cli
```

### `pnpm db:studio`

Opens the Drizzle Studio database browser:

```bash
pnpm db:studio
```

Provides a visual interface for inspecting and editing database records.

### `pnpm db:seed`

Seeds the database with initial data using `scripts/cli-seed.ts`:

```bash
pnpm db:seed
```

The seed script loads environment variables, then calls `runSeed()` from `lib/db/seed`. This creates the initial admin user, default roles, and sample data.

### Build-Time Migrations

The `scripts/build-migrate.ts` script runs during `pnpm build` to ensure the database schema is up-to-date before deployment. It handles several scenarios:

| Environment | Behavior |
|-------------|----------|
| `SKIP_BUILD_MIGRATIONS=true` | Skips migrations entirely |
| CI (not Vercel) | Skips migrations (CI builds verify code, not DB) |
| No `DATABASE_URL` | Skips with informational message |
| Vercel production | Fails the build if migrations fail |
| Vercel preview | Allows connection errors to pass gracefully |

After running migrations, the script verifies that critical columns exist in the schema to catch incomplete migrations.

## Linting

### `pnpm lint`

Runs ESLint through a custom wrapper (`scripts/lint.js`) that bypasses Next.js 16 + ESLint 9 compatibility issues:

```bash
pnpm lint
```

The wrapper runs `npx eslint . --max-warnings=55` directly with the flat config instead of using `next lint`.

## Documentation Generation

### `pnpm generate-docs`

Generates OpenAPI documentation from `@swagger` annotations in API route files:

```bash
pnpm generate-docs
```

The `scripts/generate-openapi.ts` script:

1. Creates a backup of the existing `public/openapi.json`
2. Scans `@swagger` annotations in `app/api/**/*.ts` route files
3. Merges the generated spec with the existing spec using quality-based priority
4. Writes the merged result to `public/openapi.json`

The merge strategy preserves manually-written documentation while updating routes that have more detailed code annotations. Routes are compared on three criteria: description length, response examples, and parameter descriptions.

## Testing

### End-to-End Tests

The template uses Playwright for end-to-end testing:

```bash
pnpm test:e2e              # Run all tests
pnpm test:e2e:ui           # Open Playwright UI
pnpm test:e2e:chromium     # Run in Chromium only
pnpm test:e2e:headed       # Run with browser visible
pnpm test:e2e:debug        # Run in debug mode
```

All test commands use the config at `e2e/playwright.config.ts`.

## Additional Scripts

### Translation Sync

```bash
node scripts/sync-translations.js
```

Synchronizes translation files across locales.

### Stripe Product Seeding

```bash
tsx scripts/seed-stripe-products.ts
```

Seeds Stripe with product and price definitions matching the template's plan tiers.

### Cron Job Management

```bash
tsx scripts/update-cron.ts
```

Updates scheduled cron job configurations.

### Database Cleanup

```bash
node scripts/clean-database.js
```

Resets the database. Use with caution -- this is a destructive operation.

## Script Dependencies

| Script | Depends On |
|--------|------------|
| `dev` | `predev` (clone), `check-env`, `generate-docs` |
| `build` | `prebuild` (clone), `check-env`, `generate-docs`, `build-migrate` |
| `start` | `check-env` |
| `db:seed` | `DATABASE_URL` configured |
| `db:migrate` | `DATABASE_URL` configured |
| `generate-docs` | `swagger-jsdoc`, API route annotations |
| `test:e2e` | Application running, Playwright installed |

## Related Files

| Path | Description |
|------|-------------|
| `package.json` | Script definitions |
| `scripts/check-env.js` | Environment variable validator |
| `scripts/clone.cjs` | Content repository cloner |
| `scripts/build-migrate.ts` | Build-time database migration |
| `scripts/cli-seed.ts` | Database seeding CLI |
| `scripts/cli-migrate.ts` | Migration CLI wrapper |
| `scripts/generate-openapi.ts` | OpenAPI documentation generator |
| `scripts/lint.js` | ESLint wrapper |
| `scripts/sync-translations.js` | Translation synchronization |
| `scripts/seed-stripe-products.ts` | Stripe product seeder |
| `e2e/playwright.config.ts` | E2E test configuration |
