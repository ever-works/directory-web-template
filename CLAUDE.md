# CLAUDE.md  Ever Works Directory Web Template

This file gives Claude Code (and other AI coding tools) project-specific instructions for working in this monorepo. The main web application lives at `apps/web/`.

## 1. Environment & tooling

- This project uses a **Turborepo monorepo** with **pnpm workspaces**. Run commands from the **monorepo root** (where `turbo.json` lives) unless noted otherwise. The web app source lives in `apps/web/`.
- Node.js: **>= 20.19.0** (see `package.json.engines`).
- Primary package manager: **pnpm** (lockfile: `pnpm-lock.yaml`).
- Scripts in `package.json` should not call `yarn` or `npm`; invoking them via `pnpm` is correct.

## 2. Install dependencies

Prefer these commands:

```bash
pnpm install
```

- Run from the monorepo root. This installs dependencies for all workspace packages.
- Avoid re-running `pnpm install` if `node_modules/` already exists, unless dependencies changed.
- Do **not** add new dependencies without an explicit request; prefer using existing libraries.

## 3. Required environment variables

Before `dev`, `build`, or `start`, ensure a `.env.local` file exists in `apps/web/`. The minimal local setup looks like:

```bash
NODE_ENV=development

# Auth / NextAuth
AUTH_SECRET=...          # openssl rand -base64 32

# Cookies
COOKIE_SECRET=...        # openssl rand -base64 32
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# Database
DATABASE_URL=file:./dev.db   # SQLite for local dev, or Postgres URL

# Content repository
DATA_REPOSITORY=https://github.com/ever-works/awesome-time-tracking-data
```

- `apps/web/scripts/check-env.js` validates env vars; most scripts call it automatically.
- `apps/web/scripts/clone.cjs` clones the Git-based CMS repo into `.content/` based on `DATA_REPOSITORY`.

See `.env.example` and `README.md` for full variable list.

## 4. Common commands

Use these as the default for build / run / "tests":

```bash
# From monorepo root - runs for all apps
pnpm run dev
pnpm run build
pnpm run lint

# Filter to web app only
pnpm run --filter @ever-works/web dev
pnpm run --filter @ever-works/web build

# App-specific commands (run from apps/web/)
cd apps/web
pnpm dev
pnpm build
pnpm start
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```

- Treat `pnpm lint`, `pnpm tsc --noEmit`, and `pnpm build` as the main "test suite" (there is currently no Jest/Vitest setup). These can be run from the monorepo root or filtered to the web app with `--filter @ever-works/web`.
- For non-trivial code changes, run at least `pnpm lint` and `pnpm tsc --noEmit`; for infra-level changes, also run `pnpm build`.

## 5. Code organization

- **`apps/web/app/`**  Next.js App Router routes.
    - `apps/web/app/[locale]/**`  localized pages (EN/FR/ES/DE/AR/ZH).
    - `apps/web/app/api/**`  API route handlers; many are documented via Swagger/JSDoc.
- **`apps/web/components/`**  React components (UI, layout, feature-specific).
- **`apps/web/lib/`**  Core logic and services:
    - `apps/web/lib/db/**`  Drizzle schema, DB helpers, migrations.
    - `apps/web/lib/repositories/**`  data-access layer.
    - `apps/web/lib/services/**`  business logic.
    - `apps/web/lib/analytics`, `apps/web/lib/payment`, `apps/web/lib/newsletter`, etc.  integration-specific logic.
- **`apps/web/hooks/`**  Custom React hooks, often wrapping React Query or specialized logic.
- **`docs/`**  Documentation content (Markdown files & assets). The Docusaurus app shell lives in `apps/docs/`. The docs for Ever Works platform available at <https://github.com/ever-works/ever-works-docs/tree/develop/website/docs>
- **`apps/web/.content/`**  Git-based CMS content cloned from `DATA_REPOSITORY` (do not edit manually in production).

Shared configurations live in `packages/tsconfig/` and `packages/eslint-config/`. E2E tests are in `apps/web-e2e/`. Documentation site (Docusaurus) lives in `apps/docs/` with content sourced from root `docs/`.

When adding features:

- Prefer placing business logic in `apps/web/lib/services` or `apps/web/lib/repositories`, not in components.
- Keep components mostly presentational and data-fetching, delegating heavy logic to `apps/web/lib/**`.
- Reuse existing hooks and services when possible instead of duplicating logic.

## 6. Coding style & conventions

- Use **TypeScript** everywhere; avoid introducing plain `.js` files.
- Follow the existing **Prettier** config in `package.json.prettier` (tabs, 4-space tabWidth, 120-char printWidth).
- Prefer `async/await` over raw Promise chains.
- Validate input with **Zod** where appropriate; see existing schemas in `lib/validations`.
- For forms, prefer `react-hook-form` + Zod; follow patterns in existing auth/profile forms.
- For API routes:
    - Put shared logic in `lib/services` or `lib/repositories`.
    - Keep handlers thin; do validation, call service, map result to HTTP response.
- Keep i18n-friendly: avoid hard-coded English strings in logic; use `next-intl` messages where relevant.

## 7. Safe command & editing guidelines for Claude

- It is safe to run:
    - `pnpm lint`
    - `pnpm tsc --noEmit`
    - `pnpm build`
    - `pnpm dev` / `pnpm start` (for manual verification)
- Avoid:
    - Changing `.env.example` semantics without clear instructions.
    - Running destructive scripts like `scripts/clean-database.js` unless explicitly asked.
    - Installing new global tools or modifying system-level config.

When in doubt, ask the user before:

- Adding new dependencies.
- Running migration or seeding scripts against production-like databases.
- Changing auth, payments, or analytics integrations.

## 8. Related documentation

Before large changes, consult:

- `README.md` (monorepo root)  high-level overview and monorepo setup.
- `apps/web/README.md`  web app environment setup and local project notes.
- `docs` folder with all documentation for template
- Central docs repository at <https://github.com/ever-works/ever-works-docs/tree/develop/website/docs>  architecture, auth, payments, theming, translations, API reference, and other feature documentation for the Ever Works platform.

<!-- autoskills:start -->

Summary generated by `autoskills`. Check the full files inside `.claude/skills`.

## Accessibility (a11y)

Audit and improve web accessibility following WCAG 2.2 guidelines. Use when asked to "improve accessibility", "a11y audit", "WCAG compliance", "screen reader support", "keyboard navigation", or "make accessible".

- `.claude/skills/accessibility/SKILL.md`
- `.claude/skills/accessibility/references/A11Y-PATTERNS.md`: Practical, copy-paste-ready patterns for common accessibility requirements. Each pattern is self-contained and linked from the main [SKILL.md](../SKILL.md).
- `.claude/skills/accessibility/references/WCAG.md`

## Deploy to Vercel

Deploy applications and websites to Vercel. Use when the user requests deployment actions like "deploy my app", "deploy and give me the link", "push this live", or "create a preview deployment".

- `.claude/skills/deploy-to-vercel/SKILL.md`

## Drizzle ORM

Type-safe SQL ORM for TypeScript with zero runtime overhead

- `.claude/skills/drizzle-orm/SKILL.md`
- `.claude/skills/drizzle-orm/references/advanced-schemas.md`: Deep dive into complex schema patterns, custom types, and database-specific features in Drizzle ORM.
- `.claude/skills/drizzle-orm/references/performance.md`: Connection pooling, query optimization, edge runtime integration, and performance best practices.
- `.claude/skills/drizzle-orm/references/query-patterns.md`: Advanced querying techniques, subqueries, CTEs, and raw SQL in Drizzle ORM.
- `.claude/skills/drizzle-orm/references/vs-prisma.md`: Feature comparison, migration guide, and decision framework for choosing between Drizzle and Prisma.

## Design Thinking

Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beaut...

- `.claude/skills/frontend-design/SKILL.md`

## Next.js Best Practices

Next.js best practices - file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers, image/font optimization, bundling

- `.claude/skills/next-best-practices/SKILL.md`
- `.claude/skills/next-best-practices/async-patterns.md`: In Next.js 15+, `params`, `searchParams`, `cookies()`, and `headers()` are asynchronous.
- `.claude/skills/next-best-practices/bundling.md`: Fix common bundling issues with third-party packages.
- `.claude/skills/next-best-practices/data-patterns.md`: Choose the right data fetching pattern for each use case.
- `.claude/skills/next-best-practices/debug-tricks.md`: Tricks to speed up debugging Next.js applications.
- `.claude/skills/next-best-practices/directives.md`: These are React directives, not Next.js specific.
- `.claude/skills/next-best-practices/error-handling.md`: Handle errors gracefully in Next.js applications.
- `.claude/skills/next-best-practices/file-conventions.md`: Next.js App Router uses file-based routing with special file conventions.
- `.claude/skills/next-best-practices/font.md`: Use `next/font` for automatic font optimization with zero layout shift.
- `.claude/skills/next-best-practices/functions.md`: Next.js function APIs.
- `.claude/skills/next-best-practices/hydration-error.md`: Diagnose and fix React hydration mismatch errors.
- `.claude/skills/next-best-practices/image.md`: Use `next/image` for automatic image optimization.
- `.claude/skills/next-best-practices/metadata.md`: Add SEO metadata to Next.js pages using the Metadata API.
- `.claude/skills/next-best-practices/parallel-routes.md`: Parallel routes render multiple pages in the same layout. Intercepting routes show a different UI when navigating from within your app vs direct URL access. Together they enable modal patterns.
- `.claude/skills/next-best-practices/route-handlers.md`: Create API endpoints with `route.ts` files.
- `.claude/skills/next-best-practices/rsc-boundaries.md`: Detect and prevent invalid patterns when crossing Server/Client component boundaries.
- `.claude/skills/next-best-practices/runtime-selection.md`: Use the default Node.js runtime for new routes and pages. Only use Edge runtime if the project already uses it or there's a specific requirement.
- `.claude/skills/next-best-practices/scripts.md`: Loading third-party scripts in Next.js.
- `.claude/skills/next-best-practices/self-hosting.md`: Deploy Next.js outside of Vercel with confidence.
- `.claude/skills/next-best-practices/suspense-boundaries.md`: Client hooks that cause CSR bailout without Suspense boundaries.

## Cache Components (Next.js 16+)

Next.js 16 Cache Components - PPR, use cache directive, cacheLife, cacheTag, updateTag

- `.claude/skills/next-cache-components/SKILL.md`

## Upgrade Next.js

Upgrade Next.js to the latest version following official migration guides and codemods

- `.claude/skills/next-upgrade/SKILL.md`

## Node.js Backend Patterns

Build production-ready Node.js backend services with Express/Fastify, implementing middleware patterns, error handling, authentication, database integration, and API design best practices. Use when creating Node.js servers, REST APIs, GraphQL backends, or microservices architectures.

- `.claude/skills/nodejs-backend-patterns/SKILL.md`
- `.claude/skills/nodejs-backend-patterns/references/advanced-patterns.md`: Advanced patterns for dependency injection, database integration, authentication, caching, and API response formatting.

## Node.js Best Practices

Node.js development principles and decision-making. Framework selection, async patterns, security, and architecture. Teaches thinking, not copying.

- `.claude/skills/nodejs-best-practices/SKILL.md`

## Playwright Best Practices

Use when writing Playwright tests, fixing flaky tests, debugging failures, implementing Page Object Model, configuring CI/CD, optimizing performance, mocking APIs, handling authentication or OAuth, testing accessibility (axe-core), file uploads/downloads, date/time mocking, WebSockets, geolocatio...

- `.claude/skills/playwright-best-practices/SKILL.md`
- `.claude/skills/playwright-best-practices/advanced/authentication-flows.md`: Intercept API responses to capture verification tokens for testing:
- `.claude/skills/playwright-best-practices/advanced/authentication.md`: **Use when**: You need authenticated tests and want to avoid logging in before every test. **Avoid when**: Tests require completely fresh sessions, or you are testing the login flow itself.
- `.claude/skills/playwright-best-practices/advanced/clock-mocking.md`
- `.claude/skills/playwright-best-practices/advanced/mobile-testing.md`
- `.claude/skills/playwright-best-practices/advanced/multi-context.md`: This file covers **single-user scenarios** with multiple browser tabs, windows, and popups. For **multi-user collaboration testing** (multiple users interacting simultaneously), see [multi-user.md](multi-user.md).
- `.claude/skills/playwright-best-practices/advanced/multi-user.md`
- `.claude/skills/playwright-best-practices/advanced/network-advanced.md`: Use `context.setOffline(true/false)` to simulate network connectivity changes.
- `.claude/skills/playwright-best-practices/advanced/third-party.md`
- `.claude/skills/playwright-best-practices/architecture/pom-vs-fixtures.md`: Use all three patterns together. Most projects benefit from a hybrid approach:
- `.claude/skills/playwright-best-practices/architecture/test-architecture.md`: **Ideal for**:
- `.claude/skills/playwright-best-practices/architecture/when-to-mock.md`: **Mock at the boundary, test your stack end-to-end.** Mock third-party services you don't own (payment gateways, email providers, OAuth). Never mock your own frontend-to-backend communication. Tests should prove YOUR code works, not that third-party APIs are available.
- `.claude/skills/playwright-best-practices/browser-apis/browser-apis.md`
- `.claude/skills/playwright-best-practices/browser-apis/iframes.md`
- `.claude/skills/playwright-best-practices/browser-apis/service-workers.md`: This section covers **offline-first apps (PWAs)** that are designed to work offline using service workers, caching, and background sync. For testing **unexpected network failures** (error recovery, graceful degradation), see [error-testing.md](error-testing.md#offline-testing).
- `.claude/skills/playwright-best-practices/browser-apis/websockets.md`
- `.claude/skills/playwright-best-practices/core/annotations.md`
- `.claude/skills/playwright-best-practices/core/assertions-waiting.md`: Auto-retry until condition is met or timeout. Always prefer these over generic assertions.
- `.claude/skills/playwright-best-practices/core/configuration.md`: **Use when**: Tests run against dev, staging, and production environments.
- `.claude/skills/playwright-best-practices/core/fixtures-hooks.md`: Created fresh for each test:
- `.claude/skills/playwright-best-practices/core/global-setup.md`: This section covers **one-time database setup** (migrations, snapshots, per-worker databases). For related topics:
- `.claude/skills/playwright-best-practices/core/locators.md`: Use locators in this order of preference:
- `.claude/skills/playwright-best-practices/core/page-object-model.md`: Page Object Model encapsulates page structure and interactions, providing:
- `.claude/skills/playwright-best-practices/core/projects-dependencies.md`: Setup projects are the recommended way to handle authentication. They run before your main test projects and can use Playwright fixtures.
- `.claude/skills/playwright-best-practices/core/test-data.md`: This file covers **reusable test data builders** (factories, Faker, data generators). For related topics:
- `.claude/skills/playwright-best-practices/core/test-suite-structure.md`: Full user journey tests through the browser.
- `.claude/skills/playwright-best-practices/core/test-tags.md`
- `.claude/skills/playwright-best-practices/debugging/console-errors.md`
- `.claude/skills/playwright-best-practices/debugging/debugging.md`: Features:
- `.claude/skills/playwright-best-practices/debugging/error-testing.md`: This section covers **unexpected network failures** and error recovery. For **offline-first apps (PWAs)** with service workers, caching, and background sync, see [service-workers.md](service-workers.md#offline-testing).
- `.claude/skills/playwright-best-practices/debugging/flaky-tests.md`: Most flaky tests fall into distinct categories requiring different remediation:
- `.claude/skills/playwright-best-practices/frameworks/angular.md`: Angular generates internal attributes (`_ngcontent-*`, `_nghost-*`, `ng-reflect-*`) that change every build. Always use semantic locators.
- `.claude/skills/playwright-best-practices/frameworks/nextjs.md`: Next.js loads `.env.test` when `NODE_ENV=test`:
- `.claude/skills/playwright-best-practices/frameworks/react.md`: **Use when**: Verifying React context (theme, auth, locale) and state management (Redux, Zustand) produce correct UI changes. **Avoid when**: You want to assert on raw state objects—test the UI, not internal state.
- `.claude/skills/playwright-best-practices/frameworks/vue.md`: Nuxt uses port 3000 and requires a build step before testing.
- `.claude/skills/playwright-best-practices/infrastructure-ci-cd/ci-cd.md`
- `.claude/skills/playwright-best-practices/infrastructure-ci-cd/docker.md`: Run tests without building a custom image:
- `.claude/skills/playwright-best-practices/infrastructure-ci-cd/github-actions.md`: **Use when**: Starting a new project or running a small test suite.
- `.claude/skills/playwright-best-practices/infrastructure-ci-cd/gitlab.md`: **Use when**: Any GitLab project with Playwright tests.
- `.claude/skills/playwright-best-practices/infrastructure-ci-cd/other-providers.md`: All platforms benefit from JUnit output for native test result display:
- `.claude/skills/playwright-best-practices/infrastructure-ci-cd/parallel-sharding.md`: **Use when**: Controlling concurrent test execution on a single machine.
- `.claude/skills/playwright-best-practices/infrastructure-ci-cd/performance.md`: Tests are distributed evenly by file. For optimal sharding:
- `.claude/skills/playwright-best-practices/infrastructure-ci-cd/reporting.md`: Build custom reporters for Slack notifications, database logging, or dashboards.
- `.claude/skills/playwright-best-practices/infrastructure-ci-cd/test-coverage.md`
- `.claude/skills/playwright-best-practices/LICENSE.md`: Copyright © 2026 Currents Software Inc.
- `.claude/skills/playwright-best-practices/README.md`: <img src="https://currents.dev/favicon-96x96.png" width="24" height="24" align="left" />by [currents.dev](https://currents.dev?utm_source=ai-skill) - The all-in-one Dashboard for Playwright Testing.
- `.claude/skills/playwright-best-practices/testing-patterns/accessibility.md`
- `.claude/skills/playwright-best-practices/testing-patterns/api-testing.md`: **Use when**: Multiple tests need an authenticated API client with shared configuration. **Avoid when**: A single test makes one-off API calls — use the built-in `request` fixture directly.
- `.claude/skills/playwright-best-practices/testing-patterns/browser-extensions.md`
- `.claude/skills/playwright-best-practices/testing-patterns/canvas-webgl.md`
- `.claude/skills/playwright-best-practices/testing-patterns/component-testing.md`
- `.claude/skills/playwright-best-practices/testing-patterns/drag-drop.md`: Some drag libraries (react-beautiful-dnd, dnd-kit) require incremental mouse movements:
- `.claude/skills/playwright-best-practices/testing-patterns/electron.md`
- `.claude/skills/playwright-best-practices/testing-patterns/file-operations.md`
- `.claude/skills/playwright-best-practices/testing-patterns/file-upload-download.md`: Drop zones always have an underlying `input[type="file"]`—target it directly instead of simulating OS-level drag events.
- `.claude/skills/playwright-best-practices/testing-patterns/forms-validation.md`: **Use when**: Testing search fields, address lookups, mention pickers, or any input that shows suggestions as the user types.
- `.claude/skills/playwright-best-practices/testing-patterns/graphql-testing.md`: All GraphQL requests go through `POST` to a single endpoint. Send `query`, `variables`, and optionally `operationName` in the JSON body.
- `.claude/skills/playwright-best-practices/testing-patterns/i18n.md`
- `.claude/skills/playwright-best-practices/testing-patterns/performance-testing.md`
- `.claude/skills/playwright-best-practices/testing-patterns/security-testing.md`
- `.claude/skills/playwright-best-practices/testing-patterns/visual-regression.md`: **Use when**: Page contains timestamps, avatars, ad slots, relative dates, random images, or A/B variants.

## SEO optimization

Optimize for search engine visibility and ranking. Use when asked to "improve SEO", "optimize for search", "fix meta tags", "add structured data", "sitemap optimization", or "search engine optimization".

- `.claude/skills/seo/SKILL.md`

## shadcn/ui

Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. A...

- `.claude/skills/shadcn/SKILL.md`
- `.claude/skills/shadcn/cli.md`: Configuration is read from `components.json`.
- `.claude/skills/shadcn/customization.md`: Components reference semantic CSS variable tokens. Change the variables to change every component.
- `.claude/skills/shadcn/mcp.md`: The CLI includes an MCP server that lets AI assistants search, browse, view, and install components from registries.
- `.claude/skills/shadcn/rules/base-vs-radix.md`: API differences between `base` and `radix`. Check the `base` field from `npx shadcn@latest info`.
- `.claude/skills/shadcn/rules/composition.md`: Never render items directly inside the content container.
- `.claude/skills/shadcn/rules/forms.md`: Always use `FieldGroup` + `Field` — never raw `div` with `space-y-*`:
- `.claude/skills/shadcn/rules/icons.md`: **Always use the project's configured `iconLibrary` for imports.** Check the `iconLibrary` field from project context: `lucide` → `lucide-react`, `tabler` → `@tabler/icons-react`, etc. Never assume `lucide-react`.
- `.claude/skills/shadcn/rules/styling.md`: See [customization.md](../customization.md) for theming, CSS variables, and adding custom colors.

## Integration routing

>-

- `.claude/skills/stripe-best-practices/SKILL.md`
- `.claude/skills/stripe-best-practices/references/billing.md`: If the user has a recurring revenue model (subscriptions, usage-based billing, seat-based pricing), use the Billing APIs to [plan their integration](https://docs.stripe.com/billing/subscriptions/design-an-integration.md) instead of a direct PaymentIntent integration.
- `.claude/skills/stripe-best-practices/references/connect.md`: For new Connect platforms, ALWAYS use the [Accounts v2 API](https://docs.stripe.com/connect/accounts-v2.md) (`POST /v2/core/accounts`). This is Stripe’s actively invested path and ensures long-term support.
- `.claude/skills/stripe-best-practices/references/payments.md`: Use the [Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions.md) (`checkout.sessions.create`) for on-session payments. It supports one-time payments and subscriptions and handles taxes, discounts, shipping, and adaptive pricing automatically.
- `.claude/skills/stripe-best-practices/references/security.md`: Never include keys in source code. You might find example code like `client = new Stripe("sk_...")` that are for illustration only. Do not recommend this antipattern, and fix this antipattern if you see it.
- `.claude/skills/stripe-best-practices/references/treasury.md`: For embedded financial accounts (bank accounts, account and routing numbers, money movement), use the [v2 Financial Accounts API](https://docs.stripe.com/api/v2/core/vault/financial-accounts.md) (`POST /v2/core/vault/financial_accounts`). This is required for new integrations.

## Supabase Postgres Best Practices

Postgres performance optimization and best practices from Supabase. Use this skill when writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations.

- `.claude/skills/supabase-postgres-best-practices/SKILL.md`
- `.claude/skills/supabase-postgres-best-practices/references/_contributing.md`: This document provides guidelines for creating effective Postgres best practice references that work well with AI agents and LLMs.
- `.claude/skills/supabase-postgres-best-practices/references/_sections.md`: This file defines the rule categories for Postgres best practices. Rules are automatically assigned to sections based on their filename prefix.
- `.claude/skills/supabase-postgres-best-practices/references/_template.md`: [1-2 sentence explanation of the problem and why it matters. Focus on performance impact.]
- `.claude/skills/supabase-postgres-best-practices/references/advanced-full-text-search.md`: LIKE with wildcards can't use indexes. Full-text search with tsvector is orders of magnitude faster.
- `.claude/skills/supabase-postgres-best-practices/references/advanced-jsonb-indexing.md`: JSONB queries without indexes scan the entire table. Use GIN indexes for containment queries.
- `.claude/skills/supabase-postgres-best-practices/references/conn-idle-timeout.md`: Idle connections waste resources. Configure timeouts to automatically reclaim them.
- `.claude/skills/supabase-postgres-best-practices/references/conn-limits.md`: Too many connections exhaust memory and degrade performance. Set limits based on available resources.
- `.claude/skills/supabase-postgres-best-practices/references/conn-pooling.md`: Postgres connections are expensive (1-3MB RAM each). Without pooling, applications exhaust connections under load.
- `.claude/skills/supabase-postgres-best-practices/references/conn-prepared-statements.md`: Prepared statements are tied to individual database connections. In transaction-mode pooling, connections are shared, causing conflicts.
- `.claude/skills/supabase-postgres-best-practices/references/data-batch-inserts.md`: Individual INSERT statements have high overhead. Batch multiple rows in single statements or use COPY.
- `.claude/skills/supabase-postgres-best-practices/references/data-n-plus-one.md`: N+1 queries execute one query per item in a loop. Batch them into a single query using arrays or JOINs.
- `.claude/skills/supabase-postgres-best-practices/references/data-pagination.md`: OFFSET-based pagination scans all skipped rows, getting slower on deeper pages. Cursor pagination is O(1).
- `.claude/skills/supabase-postgres-best-practices/references/data-upsert.md`: Using separate SELECT-then-INSERT/UPDATE creates race conditions. Use INSERT ... ON CONFLICT for atomic upserts.
- `.claude/skills/supabase-postgres-best-practices/references/lock-advisory.md`: Advisory locks provide application-level coordination without requiring database rows to lock.
- `.claude/skills/supabase-postgres-best-practices/references/lock-deadlock-prevention.md`: Deadlocks occur when transactions lock resources in different orders. Always acquire locks in a consistent order.
- `.claude/skills/supabase-postgres-best-practices/references/lock-short-transactions.md`: Long-running transactions hold locks that block other queries. Keep transactions as short as possible.
- `.claude/skills/supabase-postgres-best-practices/references/lock-skip-locked.md`: When multiple workers process a queue, SKIP LOCKED allows workers to process different rows without waiting.
- `.claude/skills/supabase-postgres-best-practices/references/monitor-explain-analyze.md`: EXPLAIN ANALYZE executes the query and shows actual timings, revealing the true performance bottlenecks.
- `.claude/skills/supabase-postgres-best-practices/references/monitor-pg-stat-statements.md`: pg_stat_statements tracks execution statistics for all queries, helping identify slow and frequent queries.
- `.claude/skills/supabase-postgres-best-practices/references/monitor-vacuum-analyze.md`: Outdated statistics cause the query planner to make poor decisions. VACUUM reclaims space, ANALYZE updates statistics.
- `.claude/skills/supabase-postgres-best-practices/references/query-composite-indexes.md`: When queries filter on multiple columns, a composite index is more efficient than separate single-column indexes.
- `.claude/skills/supabase-postgres-best-practices/references/query-covering-indexes.md`: Covering indexes include all columns needed by a query, enabling index-only scans that skip the table entirely.
- `.claude/skills/supabase-postgres-best-practices/references/query-index-types.md`: Different index types excel at different query patterns. The default B-tree isn't always optimal.
- `.claude/skills/supabase-postgres-best-practices/references/query-missing-indexes.md`: Queries filtering or joining on unindexed columns cause full table scans, which become exponentially slower as tables grow.
- `.claude/skills/supabase-postgres-best-practices/references/query-partial-indexes.md`: Partial indexes only include rows matching a WHERE condition, making them smaller and faster when queries consistently filter on the same condition.
- `.claude/skills/supabase-postgres-best-practices/references/schema-constraints.md`: PostgreSQL does not support `ADD CONSTRAINT IF NOT EXISTS`. Migrations using this syntax will fail.
- `.claude/skills/supabase-postgres-best-practices/references/schema-data-types.md`: Using the right data types reduces storage, improves query performance, and prevents bugs.
- `.claude/skills/supabase-postgres-best-practices/references/schema-foreign-key-indexes.md`: Postgres does not automatically index foreign key columns. Missing indexes cause slow JOINs and CASCADE operations.
- `.claude/skills/supabase-postgres-best-practices/references/schema-lowercase-identifiers.md`: PostgreSQL folds unquoted identifiers to lowercase. Quoted mixed-case identifiers require quotes forever and cause issues with tools, ORMs, and AI assistants that may not recognize them.
- `.claude/skills/supabase-postgres-best-practices/references/schema-partitioning.md`: Partitioning splits a large table into smaller pieces, improving query performance and maintenance operations.
- `.claude/skills/supabase-postgres-best-practices/references/schema-primary-keys.md`: Primary key choice affects insert performance, index size, and replication efficiency.
- `.claude/skills/supabase-postgres-best-practices/references/security-privileges.md`: Grant only the minimum permissions required. Never use superuser for application queries.
- `.claude/skills/supabase-postgres-best-practices/references/security-rls-basics.md`: Row Level Security (RLS) enforces data access at the database level, ensuring users only see their own data.
- `.claude/skills/supabase-postgres-best-practices/references/security-rls-performance.md`: Poorly written RLS policies can cause severe performance issues. Use subqueries and indexes strategically.

## Tailwind CSS Development Patterns

Provides comprehensive Tailwind CSS utility-first styling patterns including responsive design, layout utilities, flexbox, grid, spacing, typography, colors, and modern CSS best practices. Use when styling React/Vue/Svelte components, building responsive layouts, implementing design systems, or o...

- `.claude/skills/tailwind-css-patterns/SKILL.md`
- `.claude/skills/tailwind-css-patterns/references/accessibility.md`
- `.claude/skills/tailwind-css-patterns/references/animations.md`: Usage:
- `.claude/skills/tailwind-css-patterns/references/component-patterns.md`
- `.claude/skills/tailwind-css-patterns/references/configuration.md`: Use the `@theme` directive for CSS-based configuration:
- `.claude/skills/tailwind-css-patterns/references/layout-patterns.md`: Basic flex container:
- `.claude/skills/tailwind-css-patterns/references/performance.md`: Configure content sources for optimal purging:
- `.claude/skills/tailwind-css-patterns/references/reference.md`: Tailwind CSS is a utility-first CSS framework that generates styles by scanning HTML, JavaScript, and template files for class names. It provides a comprehensive design system through CSS utility classes, enabling rapid UI development without writing custom CSS. The framework operates at build-ti...
- `.claude/skills/tailwind-css-patterns/references/responsive-design.md`: Enable dark mode in tailwind.config.js:

## Tailwind v4 + shadcn/ui Production Stack

|

- `.claude/skills/tailwind-v4-shadcn/SKILL.md`
- `.claude/skills/tailwind-v4-shadcn/references/advanced-usage.md`: **Purpose**: Advanced customization and component patterns for experienced Tailwind v4 + shadcn/ui developers **When to Load**: User asks for custom colors beyond defaults, advanced component patterns, composition best practices, or component customization
- `.claude/skills/tailwind-v4-shadcn/references/common-gotchas.md`: ❌ **WRONG:**
- `.claude/skills/tailwind-v4-shadcn/references/dark-mode.md`: Tailwind v4 + shadcn/ui dark mode requires: 1. `ThemeProvider` component to manage state 2. `.dark` class toggling on `<html>` element 3. localStorage persistence 4. System theme detection
- `.claude/skills/tailwind-v4-shadcn/references/migration-guide.md`: This guide helps you migrate from hardcoded Tailwind colors (`bg-blue-600`) to semantic CSS variables (`bg-primary`).
- `.claude/skills/tailwind-v4-shadcn/references/plugins-reference.md`: **Purpose**: Complete guide to Tailwind v4 official plugins (Typography, Forms) **When to Load**: User mentions prose class, Typography plugin, Forms plugin, @plugin directive, or plugin installation errors

## Turborepo Skill

|

- `.claude/skills/turborepo/SKILL.md`
- `.claude/skills/turborepo/command/turborepo.md`: Load Turborepo skill for creating workflows, tasks, and pipelines in monorepos. Use when users ask to "create a workflow", "make a task", "generate a pipeline", or set up build orchestration.
- `.claude/skills/turborepo/references/best-practices/dependencies.md`: Best practices for managing dependencies in a Turborepo monorepo.
- `.claude/skills/turborepo/references/best-practices/packages.md`: How to create and structure internal packages in your monorepo.
- `.claude/skills/turborepo/references/best-practices/RULE.md`: Essential patterns for structuring and maintaining a healthy Turborepo monorepo.
- `.claude/skills/turborepo/references/best-practices/structure.md`: Detailed guidance on structuring a Turborepo monorepo.
- `.claude/skills/turborepo/references/boundaries/RULE.md`: **Experimental feature** - See [RFC](https://github.com/vercel/turborepo/discussions/9435)
- `.claude/skills/turborepo/references/caching/gotchas.md`: Generates a JSON file with all hash inputs. Compare two runs to find differences.
- `.claude/skills/turborepo/references/caching/remote-cache.md`: Share cache artifacts across your team and CI pipelines.
- `.claude/skills/turborepo/references/caching/RULE.md`: Turborepo's core principle: **never do the same work twice**.
- `.claude/skills/turborepo/references/ci/github-actions.md`: Complete setup guide for Turborepo with GitHub Actions.
- `.claude/skills/turborepo/references/ci/patterns.md`: Strategies for efficient CI/CD with Turborepo.
- `.claude/skills/turborepo/references/ci/RULE.md`: General principles for running Turborepo in continuous integration environments.
- `.claude/skills/turborepo/references/ci/vercel.md`: Turborepo integrates seamlessly with Vercel for monorepo deployments.
- `.claude/skills/turborepo/references/cli/commands.md`: Full docs: https://turborepo.dev/docs/reference/run
- `.claude/skills/turborepo/references/cli/RULE.md`: The primary command for executing tasks across your monorepo.
- `.claude/skills/turborepo/references/configuration/global-options.md`: Options that affect all tasks. Full docs: https://turborepo.dev/docs/reference/configuration
- `.claude/skills/turborepo/references/configuration/gotchas.md`: Common mistakes and how to fix them.
- `.claude/skills/turborepo/references/configuration/RULE.md`: Configuration reference for Turborepo. Full docs: https://turborepo.dev/docs/reference/configuration
- `.claude/skills/turborepo/references/configuration/tasks.md`: Full docs: https://turborepo.dev/docs/reference/configuration#tasks
- `.claude/skills/turborepo/references/environment/gotchas.md`: Common mistakes and how to fix them.
- `.claude/skills/turborepo/references/environment/modes.md`: Turborepo supports different modes for handling environment variables during task execution.
- `.claude/skills/turborepo/references/environment/RULE.md`: Turborepo provides fine-grained control over which environment variables affect task hashing and runtime availability.
- `.claude/skills/turborepo/references/filtering/patterns.md`: Practical examples for typical monorepo scenarios.
- `.claude/skills/turborepo/references/filtering/RULE.md`: **The primary way to run only changed packages is `--affected`:**
- `.claude/skills/turborepo/references/watch/RULE.md`: Full docs: https://turborepo.dev/docs/reference/watch

## TypeScript Advanced Types

Master TypeScript's advanced type system including generics, conditional types, mapped types, template literals, and utility types for building type-safe applications. Use when implementing complex type logic, creating reusable type utilities, or ensuring compile-time type safety in TypeScript pr...

- `.claude/skills/typescript-advanced-types/SKILL.md`

## Upgrading Stripe Versions

Guide for upgrading Stripe API versions and SDKs

- `.claude/skills/upgrade-stripe/SKILL.md`

## React Composition Patterns

Composition patterns for building flexible, maintainable React components. Avoid boolean prop proliferation by using compound components, lifting state, and composing internals. These patterns make codebases easier for both humans and AI agents to work with as they scale.

- `.claude/skills/vercel-composition-patterns/SKILL.md`
- `.claude/skills/vercel-composition-patterns/AGENTS.md`: **Version 1.0.0** Engineering January 2026
- `.claude/skills/vercel-composition-patterns/README.md`: A structured repository for React composition patterns that scale. These patterns help avoid boolean prop proliferation by using compound components, lifting state, and composing internals.
- `.claude/skills/vercel-composition-patterns/rules/_sections.md`: This file defines all sections, their ordering, impact levels, and descriptions. The section ID (in parentheses) is the filename prefix used to group rules.
- `.claude/skills/vercel-composition-patterns/rules/_template.md`: Brief explanation of the rule and why it matters.
- `.claude/skills/vercel-composition-patterns/rules/architecture-avoid-boolean-props.md`: Don't add boolean props like `isThread`, `isEditing`, `isDMThread` to customize component behavior. Each boolean doubles possible states and creates unmaintainable conditional logic. Use composition instead.
- `.claude/skills/vercel-composition-patterns/rules/architecture-compound-components.md`: Structure complex components as compound components with a shared context. Each subcomponent accesses shared state via context, not props. Consumers compose the pieces they need.
- `.claude/skills/vercel-composition-patterns/rules/patterns-children-over-render-props.md`: Use `children` for composition instead of `renderX` props. Children are more readable, compose naturally, and don't require understanding callback signatures.
- `.claude/skills/vercel-composition-patterns/rules/patterns-explicit-variants.md`: Instead of one component with many boolean props, create explicit variant components. Each variant composes the pieces it needs. The code documents itself.
- `.claude/skills/vercel-composition-patterns/rules/react19-no-forwardref.md`: In React 19, `ref` is now a regular prop (no `forwardRef` wrapper needed), and `use()` replaces `useContext()`.
- `.claude/skills/vercel-composition-patterns/rules/state-context-interface.md`: Define a **generic interface** for your component context with three parts: can implement—enabling the same UI components to work with completely different state implementations.
- `.claude/skills/vercel-composition-patterns/rules/state-decouple-implementation.md`: The provider component should be the only place that knows how state is managed. UI components consume the context interface—they don't know if state comes from useState, Zustand, or a server sync.
- `.claude/skills/vercel-composition-patterns/rules/state-lift-state.md`: Move state management into dedicated provider components. This allows sibling components outside the main UI to access and modify state without prop drilling or awkward refs.

## Vercel React Best Practices

React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimizati...

- `.claude/skills/vercel-react-best-practices/SKILL.md`
- `.claude/skills/vercel-react-best-practices/AGENTS.md`: **Version 1.0.0** Vercel Engineering January 2026
- `.claude/skills/vercel-react-best-practices/README.md`: A structured repository for creating and maintaining React Best Practices optimized for agents and LLMs.
- `.claude/skills/vercel-react-best-practices/rules/_sections.md`: This file defines all sections, their ordering, impact levels, and descriptions. The section ID (in parentheses) is the filename prefix used to group rules.
- `.claude/skills/vercel-react-best-practices/rules/_template.md`: **Impact: MEDIUM (optional impact description)**
- `.claude/skills/vercel-react-best-practices/rules/advanced-effect-event-deps.md`: Effect Event functions do not have a stable identity. Their identity intentionally changes on every render. Do not include the function returned by `useEffectEvent` in a `useEffect` dependency array. Keep the actual reactive values as dependencies and call the Effect Event from inside the effect...
- `.claude/skills/vercel-react-best-practices/rules/advanced-event-handler-refs.md`: Store callbacks in refs when used in effects that shouldn't re-subscribe on callback changes.
- `.claude/skills/vercel-react-best-practices/rules/advanced-init-once.md`: Do not put app-wide initialization that must run once per app load inside `useEffect([])` of a component. Components can remount and effects will re-run. Use a module-level guard or top-level init in the entry module instead.
- `.claude/skills/vercel-react-best-practices/rules/advanced-use-latest.md`: Access latest values in callbacks without adding them to dependency arrays. Prevents effect re-runs while avoiding stale closures.
- `.claude/skills/vercel-react-best-practices/rules/async-api-routes.md`: In API routes and Server Actions, start independent operations immediately, even if you don't await them yet.
- `.claude/skills/vercel-react-best-practices/rules/async-cheap-condition-before-await.md`: When a branch uses `await` for a flag or remote value and also requires a **cheap synchronous** condition (local props, request metadata, already-loaded state), evaluate the cheap condition **first**. Otherwise you pay for the async call even when the compound condition can never be true.
- `.claude/skills/vercel-react-best-practices/rules/async-defer-await.md`: Move `await` operations into the branches where they're actually used to avoid blocking code paths that don't need them.
- `.claude/skills/vercel-react-best-practices/rules/async-dependencies.md`: For operations with partial dependencies, use `better-all` to maximize parallelism. It automatically starts each task at the earliest possible moment.
- `.claude/skills/vercel-react-best-practices/rules/async-parallel.md`: When async operations have no interdependencies, execute them concurrently using `Promise.all()`.
- `.claude/skills/vercel-react-best-practices/rules/async-suspense-boundaries.md`: Instead of awaiting data in async components before returning JSX, use Suspense boundaries to show the wrapper UI faster while data loads.
- `.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md`: Import directly from source files instead of barrel files to avoid loading thousands of unused modules. **Barrel files** are entry points that re-export multiple modules (e.g., `index.js` that does `export * from './module'`).
- `.claude/skills/vercel-react-best-practices/rules/bundle-conditional.md`: Load large data or modules only when a feature is activated.
- `.claude/skills/vercel-react-best-practices/rules/bundle-defer-third-party.md`: Analytics, logging, and error tracking don't block user interaction. Load them after hydration.
- `.claude/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md`: Use `next/dynamic` to lazy-load large components not needed on initial render.
- `.claude/skills/vercel-react-best-practices/rules/bundle-preload.md`: Preload heavy bundles before they're needed to reduce perceived latency.
- `.claude/skills/vercel-react-best-practices/rules/client-event-listeners.md`: Use `useSWRSubscription()` to share global event listeners across component instances.
- `.claude/skills/vercel-react-best-practices/rules/client-localstorage-schema.md`: Add version prefix to keys and store only needed fields. Prevents schema conflicts and accidental storage of sensitive data.
- `.claude/skills/vercel-react-best-practices/rules/client-passive-event-listeners.md`: Add `{ passive: true }` to touch and wheel event listeners to enable immediate scrolling. Browsers normally wait for listeners to finish to check if `preventDefault()` is called, causing scroll delay.
- `.claude/skills/vercel-react-best-practices/rules/client-swr-dedup.md`: SWR enables request deduplication, caching, and revalidation across component instances.
- `.claude/skills/vercel-react-best-practices/rules/js-batch-dom-css.md`: Avoid interleaving style writes with layout reads. When you read a layout property (like `offsetWidth`, `getBoundingClientRect()`, or `getComputedStyle()`) between style changes, the browser is forced to trigger a synchronous reflow.
- `.claude/skills/vercel-react-best-practices/rules/js-cache-function-results.md`: Use a module-level Map to cache function results when the same function is called repeatedly with the same inputs during render.
- `.claude/skills/vercel-react-best-practices/rules/js-cache-property-access.md`: Cache object property lookups in hot paths.
- `.claude/skills/vercel-react-best-practices/rules/js-cache-storage.md`: **Incorrect (reads storage on every call):**
- `.claude/skills/vercel-react-best-practices/rules/js-combine-iterations.md`: Multiple `.filter()` or `.map()` calls iterate the array multiple times. Combine into one loop.
- `.claude/skills/vercel-react-best-practices/rules/js-early-exit.md`: Return early when result is determined to skip unnecessary processing.
- `.claude/skills/vercel-react-best-practices/rules/js-flatmap-filter.md`: **Impact: LOW-MEDIUM (eliminates intermediate array)**
- `.claude/skills/vercel-react-best-practices/rules/js-hoist-regexp.md`: Don't create RegExp inside render. Hoist to module scope or memoize with `useMemo()`.
- `.claude/skills/vercel-react-best-practices/rules/js-index-maps.md`: Multiple `.find()` calls by the same key should use a Map.
- `.claude/skills/vercel-react-best-practices/rules/js-length-check-first.md`: When comparing arrays with expensive operations (sorting, deep equality, serialization), check lengths first. If lengths differ, the arrays cannot be equal.
- `.claude/skills/vercel-react-best-practices/rules/js-min-max-loop.md`: Finding the smallest or largest element only requires a single pass through the array. Sorting is wasteful and slower.
- `.claude/skills/vercel-react-best-practices/rules/js-request-idle-callback.md`: **Impact: MEDIUM (keeps UI responsive during background tasks)**
- `.claude/skills/vercel-react-best-practices/rules/js-set-map-lookups.md`: Convert arrays to Set/Map for repeated membership checks.
- `.claude/skills/vercel-react-best-practices/rules/js-tosorted-immutable.md`: **Incorrect (mutates original array):**
- `.claude/skills/vercel-react-best-practices/rules/rendering-activity.md`: Use React's `<Activity>` to preserve state/DOM for expensive components that frequently toggle visibility.
- `.claude/skills/vercel-react-best-practices/rules/rendering-animate-svg-wrapper.md`: Many browsers don't have hardware acceleration for CSS3 animations on SVG elements. Wrap SVG in a `<div>` and animate the wrapper instead.
- `.claude/skills/vercel-react-best-practices/rules/rendering-conditional-render.md`: Use explicit ternary operators (`? :`) instead of `&&` for conditional rendering when the condition can be `0`, `NaN`, or other falsy values that render.
- `.claude/skills/vercel-react-best-practices/rules/rendering-content-visibility.md`: Apply `content-visibility: auto` to defer off-screen rendering.
- `.claude/skills/vercel-react-best-practices/rules/rendering-hoist-jsx.md`: Extract static JSX outside components to avoid re-creation.
- `.claude/skills/vercel-react-best-practices/rules/rendering-hydration-no-flicker.md`: When rendering content that depends on client-side storage (localStorage, cookies), avoid both SSR breakage and post-hydration flickering by injecting a synchronous script that updates the DOM before React hydrates.
- `.claude/skills/vercel-react-best-practices/rules/rendering-hydration-suppress-warning.md`: In SSR frameworks (e.g., Next.js), some values are intentionally different on server vs client (random IDs, dates, locale/timezone formatting). For these *expected* mismatches, wrap the dynamic text in an element with `suppressHydrationWarning` to prevent noisy warnings. Do not use this to hide r...
- `.claude/skills/vercel-react-best-practices/rules/rendering-resource-hints.md`: **Impact: HIGH (reduces load time for critical resources)**
- `.claude/skills/vercel-react-best-practices/rules/rendering-script-defer-async.md`: **Impact: HIGH (eliminates render-blocking)**
- `.claude/skills/vercel-react-best-practices/rules/rendering-svg-precision.md`: Reduce SVG coordinate precision to decrease file size. The optimal precision depends on the viewBox size, but in general reducing precision should be considered.
- `.claude/skills/vercel-react-best-practices/rules/rendering-usetransition-loading.md`: Use `useTransition` instead of manual `useState` for loading states. This provides built-in `isPending` state and automatically manages transitions.
- `.claude/skills/vercel-react-best-practices/rules/rerender-defer-reads.md`: Don't subscribe to dynamic state (searchParams, localStorage) if you only read it inside callbacks.
- `.claude/skills/vercel-react-best-practices/rules/rerender-dependencies.md`: Specify primitive dependencies instead of objects to minimize effect re-runs.
- `.claude/skills/vercel-react-best-practices/rules/rerender-derived-state-no-effect.md`: If a value can be computed from current props/state, do not store it in state or update it in an effect. Derive it during render to avoid extra renders and state drift. Do not set state in effects solely in response to prop changes; prefer derived values or keyed resets instead.
- `.claude/skills/vercel-react-best-practices/rules/rerender-derived-state.md`: Subscribe to derived boolean state instead of continuous values to reduce re-render frequency.
- `.claude/skills/vercel-react-best-practices/rules/rerender-functional-setstate.md`: When updating state based on the current state value, use the functional update form of setState instead of directly referencing the state variable. This prevents stale closures, eliminates unnecessary dependencies, and creates stable callback references.
- `.claude/skills/vercel-react-best-practices/rules/rerender-lazy-state-init.md`: Pass a function to `useState` for expensive initial values. Without the function form, the initializer runs on every render even though the value is only used once.
- `.claude/skills/vercel-react-best-practices/rules/rerender-memo-with-default-value.md`: When memoized component has a default value for some non-primitive optional parameter, such as an array, function, or object, calling the component without that parameter results in broken memoization. This is because new value instances are created on every rerender, and they do not pass strict...
- `.claude/skills/vercel-react-best-practices/rules/rerender-memo.md`: Extract expensive work into memoized components to enable early returns before computation.
- `.claude/skills/vercel-react-best-practices/rules/rerender-move-effect-to-event.md`: If a side effect is triggered by a specific user action (submit, click, drag), run it in that event handler. Do not model the action as state + effect; it makes effects re-run on unrelated changes and can duplicate the action.
- `.claude/skills/vercel-react-best-practices/rules/rerender-no-inline-components.md`: **Impact: HIGH (prevents remount on every render)**
- `.claude/skills/vercel-react-best-practices/rules/rerender-simple-expression-in-memo.md`: When an expression is simple (few logical or arithmetical operators) and has a primitive result type (boolean, number, string), do not wrap it in `useMemo`. Calling `useMemo` and comparing hook dependencies may consume more resources than the expression itself.
- `.claude/skills/vercel-react-best-practices/rules/rerender-split-combined-hooks.md`: When a hook contains multiple independent tasks with different dependencies, split them into separate hooks. A combined hook reruns all tasks when any dependency changes, even if some tasks don't use the changed value.
- `.claude/skills/vercel-react-best-practices/rules/rerender-transitions.md`: Mark frequent, non-urgent state updates as transitions to maintain UI responsiveness.
- `.claude/skills/vercel-react-best-practices/rules/rerender-use-deferred-value.md`: When user input triggers expensive computations or renders, use `useDeferredValue` to keep the input responsive. The deferred value lags behind, allowing React to prioritize the input update and render the expensive result when idle.
- `.claude/skills/vercel-react-best-practices/rules/rerender-use-ref-transient-values.md`: When a value changes frequently and you don't want a re-render on every update (e.g., mouse trackers, intervals, transient flags), store it in `useRef` instead of `useState`. Keep component state for UI; use refs for temporary DOM-adjacent values. Updating a ref does not trigger a re-render.
- `.claude/skills/vercel-react-best-practices/rules/server-after-nonblocking.md`: Use Next.js's `after()` to schedule work that should execute after a response is sent. This prevents logging, analytics, and other side effects from blocking the response.
- `.claude/skills/vercel-react-best-practices/rules/server-auth-actions.md`: **Impact: CRITICAL (prevents unauthorized access to server mutations)**
- `.claude/skills/vercel-react-best-practices/rules/server-cache-lru.md`: **Implementation:**
- `.claude/skills/vercel-react-best-practices/rules/server-cache-react.md`: Use `React.cache()` for server-side request deduplication. Authentication and database queries benefit most.
- `.claude/skills/vercel-react-best-practices/rules/server-dedup-props.md`: **Impact: LOW (reduces network payload by avoiding duplicate serialization)**
- `.claude/skills/vercel-react-best-practices/rules/server-hoist-static-io.md`: **Impact: HIGH (avoids repeated file/network I/O per request)**
- `.claude/skills/vercel-react-best-practices/rules/server-no-shared-module-state.md`: For React Server Components and client components rendered during SSR, avoid using mutable module-level variables to share request-scoped data. Server renders can run concurrently in the same process. If one render writes to shared module state and another render reads it, you can get race condit...
- `.claude/skills/vercel-react-best-practices/rules/server-parallel-fetching.md`: React Server Components execute sequentially within a tree. Restructure with composition to parallelize data fetching.
- `.claude/skills/vercel-react-best-practices/rules/server-parallel-nested-fetching.md`: When fetching nested data in parallel, chain dependent fetches within each item's promise so a slow item doesn't block the rest.
- `.claude/skills/vercel-react-best-practices/rules/server-serialization.md`: The React Server/Client boundary serializes all object properties into strings and embeds them in the HTML response and subsequent RSC requests. This serialized data directly impacts page weight and load time, so **size matters a lot**. Only pass fields that the client actually uses.

<!-- autoskills:end -->
