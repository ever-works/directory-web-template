# Ever Works Website – Agent Instructions (Cursor)

These instructions are for **Cursor agents** (Chat/Agent) working in the Ever Works Template monorepo.  
The main web application lives at `apps/web/`.

For full project details (env vars, build/run/test commands, docs, patterns), see the root `CLAUDE.md` and `README.md`.

## Runtime & tooling

- Use **Node.js >= 20.19.0**.
- Use **pnpm** as the package manager.
- Run build/dev/lint commands from the **monorepo root** (via Turborepo). App-specific commands (e.g., `pnpm db:migrate`) can be run from `apps/web/`.

## Build, dev, and verification

Use these commands:

- `pnpm run dev` – start all dev servers (from monorepo root).
- `pnpm run --filter @ever-works/web dev` – start only the web app.
- `pnpm run build` – build all packages.
- `pnpm run lint` – lint all packages.
- `pnpm tsc --noEmit` – TypeScript type-check (run from `apps/web/`).

Treat as the main verification steps:

- For quick checks: run `pnpm lint` and `pnpm tsc --noEmit`.
- For larger or infra-level changes: also run `pnpm build`.

## Environment & data

- Assume `.env.local` already exists and is correctly configured.
- Do **not** create, modify, or print env secrets unless the user explicitly asks.
- Content is loaded from the Git-based CMS repo pointed to by `DATA_REPOSITORY`.

## Code organization

- Next.js App Router under `apps/web/app/[locale]/**` and `apps/web/app/api/**`.
- Shared business logic lives in `apps/web/lib/services/**` and `apps/web/lib/repositories/**`.
- Database schema and helpers in `apps/web/lib/db/**` (Drizzle ORM).
- UI and layout components live in `apps/web/components/**`.
- E2E tests live in `apps/web-e2e/`. Shared configs in `packages/`.
- Prefer **TypeScript** for all code.

When implementing features:

- Put domain / business logic in `lib/**`.
- Keep React components focused on rendering and wiring.

## Safety & side effects

Avoid by default (ask the user first):

- Installing new dependencies (`pnpm add`, `pnpm install` with changes).
- Running database migrations or seeding against anything other than local dev DB.
- Destructive scripts or scripts that modify production-like data.

Safe to run when needed:

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- `pnpm dev`

## Source of truth

- This file gives **high-level rules** for Cursor.
- For deeper details (scripts, env vars, docs, architecture, coding style), **refer to the root `CLAUDE.md`** file, to the "docs" folder in the root of this mono-repo and the external docs repo at <https://github.com/ever-works/ever-works-docs/tree/develop/website/docs>.
