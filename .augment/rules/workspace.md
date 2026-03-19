# Ever Works Website – Augment Rules

These rules are for **Augment Code / Augment Agent** when working in this repository.

The web app lives at `apps/web/` within a Turborepo monorepo.

Most project details (build, run, tests, env, docs) are documented in `CLAUDE.md`. Keep this file short and treat `CLAUDE.md` as the single source of truth.

## Runtime & tooling

- Use **Node.js >= 20.19.0** (see `package.json.engines`).
- Use **pnpm** as the package manager (lockfile: `pnpm-lock.yaml`).
- Run build/dev/lint from the **monorepo root** (via Turborepo). App-specific scripts from `apps/web/`.

## Build, dev, and "tests"

From the monorepo root:

- `pnpm run dev` – start all dev servers.
- `pnpm run --filter @ever-works/web dev` – start web app only.
- `pnpm run build` – build all packages.
- `pnpm run lint` – lint all packages.

From `apps/web/`:

- `pnpm dev` – start web dev server.
- `pnpm tsc --noEmit` – type-check.

Treat as the main "tests":

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build` (for bigger or infra-level changes).

If the user asks to "run tests" or "make sure it works", run at least **lint + tsc**, and for non-trivial changes also `pnpm build`.

## Environment expectations

- Assume `.env.local` already exists and is valid.
- Do **not** create or edit `.env.local` unless explicitly asked.
- Never print secrets (auth keys, DB URLs, etc.) in responses or logs.
- Content is pulled from the Git-based CMS repo defined by `DATA_REPOSITORY` (currently `awesome-time-tracking-data`).

## Editing guidelines

- Prefer **small, localized diffs** and follow existing patterns.
- Put business logic in:
  - `apps/web/lib/services/**`
  - `apps/web/lib/repositories/**`
- Keep React components (in `apps/web/components/**` and `apps/web/app/**`) mostly presentational / wiring.
- When modifying env vars or public API contracts, also update:
  - `scripts/check-env.js` / `scripts/check-env-ci.js` if they validate them.
  - `README.md` and the external docs repo at
    <https://github.com/ever-works/ever-works-docs/tree/develop/website/docs>.
- Do **not** add new dependencies unless the user explicitly approves.

## Safe commands for Augment to run

Safe without extra confirmation:

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build` (when checking a change or when requested)
- `pnpm dev` (to start a dev server if it is not already running)

Require explicit user confirmation:

- `pnpm install`
- Database migrations or seeding against non-local URLs.
- Any script that can delete or rewrite data.

## Relationship to CLAUDE.md

- Treat this file as a **thin rules layer** for Augment.
- For full instructions (environment variables, project structure, scripts, docs, coding conventions), **always refer to the root `CLAUDE.md`**.

