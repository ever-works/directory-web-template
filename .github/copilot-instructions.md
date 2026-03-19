# GitHub Copilot Instructions – Ever Works Website

These instructions customize **GitHub Copilot** for this repository.

This repository is a **Turborepo monorepo** with the main web application at `apps/web/`.

For full project details (build/run/test, env, architecture, docs), Copilot should treat the root `CLAUDE.md` file as the primary reference.

## Runtime & tooling

- Use **Node.js >= 20.19.0**.
- Use **pnpm** as the package manager (not npm or yarn).
- Run build/dev/lint commands from the **monorepo root**. App-specific commands (db, etc.) from `apps/web/`.

## How to run and verify

Preferred commands:

- `pnpm run dev` – start all dev servers.
- `pnpm run --filter @ever-works/web dev` – start only web app.
- `pnpm run build` – build all packages.
- `pnpm run lint` – lint all packages.

Treat the following as the main "tests":

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build` (for larger changes or when explicitly asked to ensure production readiness).

## Project structure

- Routes and pages: `apps/web/app/[locale]/**`, `apps/web/app/api/**` (Next.js App Router).
- UI components: `apps/web/components/**`.
- Business logic: `apps/web/lib/services/**`.
- Data access / repositories: `apps/web/lib/repositories/**`.
- Database schema & tooling: `apps/web/lib/db/**`, `apps/web/drizzle.config.ts`.
- E2E tests: `apps/web-e2e/`. Shared configs: `packages/`.

When generating or editing code, Copilot should:

- Prefer **TypeScript** files.
- Keep React components mostly presentational and lean.
- Put business logic and data access into `lib/services/**` and `lib/repositories/**` rather than components.

## Dependencies & commands to avoid by default

Unless explicitly requested by the user, Copilot should **avoid** suggesting or running:

- Adding new dependencies (`pnpm add`, `pnpm install` with changes).
- Database migrations or seeding against production-like databases.
- Destructive scripts that delete or rewrite data.

It is **safe** to suggest and run (for verification):

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- `pnpm dev`

## Documentation

When Copilot needs more context about architecture, auth, payments, theming, or API design, it should:

- First consult the root `CLAUDE.md`.
- Then, if needed, refer to the external docs repo at
  <https://github.com/ever-works/ever-works-docs/tree/develop/website/docs>.

