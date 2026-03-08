# CLAUDE.md  Ever Works Directory Website Template

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
