# AGENTS.md — Cross-cutting rules for AI agents

> **Audience:** every AI coding agent that operates in this monorepo —
> Claude Code, Cursor, GitHub Copilot, Codex, Gemini Code Assist, Aider,
> Continue, Cline, Roo, etc. **Human contributors should follow the same
> rules** for consistency.
>
> The web app lives at [`apps/web/`](apps/web/). The Playwright suite
> lives at [`apps/web-e2e/`](apps/web-e2e/). The Docusaurus docs site
> lives at [`apps/docs/`](apps/docs/). Shared configs live in
> [`packages/`](packages/).

## 1. Source of truth

These files form the **canonical** rule set for this repo:

- [`.specify/memory/constitution.md`](.specify/memory/constitution.md) —
  durable principles. **Every plan must pass the Constitution Check.**
- [`.specify/README.md`](.specify/README.md) — Spec Kit workflow.
- [`docs/spec/README.md`](docs/spec/README.md) — feature spec index.
- [`docs/index.md`](docs/index.md) — full documentation index.
- [`docs/log.md`](docs/log.md) — running log of changes.
- [`docs/questions.md`](docs/questions.md) — open questions and chosen
  defaults awaiting maintainer review.
- [`CLAUDE.md`](CLAUDE.md) — Claude-specific guidance (commands, env
  vars, conventions). Most of it applies to every agent.
- [`README.md`](README.md) — repo overview.

If a rule below conflicts with the constitution, **the constitution
wins**.

## 2. Spec-Driven Development (Spec Kit)

Almost every change goes through Spec Kit:

1. **Spec** (`docs/spec/NNN-feature-slug/spec.md`) — describe **what** and
   **why**, not how.
2. **Plan** (`docs/spec/NNN-feature-slug/plan.md`) — design the **how**.
   Includes a Constitution Check section.
3. **Tasks** (`docs/spec/NNN-feature-slug/tasks.md`) — break the plan into
   verifiable, parallelisable items.
4. **Implement** the tasks one by one. Each task ends in a verification
   step.
5. **Document** the change in `docs/`, link the spec, and append a line
   to [`docs/log.md`](docs/log.md).

Trivial fixes (typos, broken links, dependency bumps without API
changes) may skip directly to step 5 with a `docs/log.md` line.

## 3. Plugin-First architecture

Almost everything is a **plugin** or **adapter**:

- New features default to a new package under `packages/<name>/`
  that implements an interface from `@ever-works/plugin-sdk` (see
  [Spec 002](docs/spec/002-plugin-architecture/spec.md)).
- Core code (router shell, theme provider, i18n loader, plugin
  registry, CMS schema) is the only thing that lives outside packages.
- **Core must not import from plugin packages** — plugins are wired in
  through the runtime registry. ESLint enforces this once the SDK
  ships.
- Every UI feature should be expressible as a **slot** so end users can
  toggle / replace it without editing layouts.
- Every plugin must declare a **Zod config schema** and validate at
  boot. Config precedence: env vars < DB row < explicit override.
- Plugins must be **enable / disable / swap / replace**-able.

## 4. TypeScript only

- All production source is `.ts` / `.tsx`.
- Scripts use `tsx`. No new `.js`, `.cjs`, `.mjs` files unless required
  by tooling and documented in `docs/architecture/`.
- No Python or Bash beyond simple CI glue.
- `any` is allowed only with an inline comment explaining why and a
  TODO link to a follow-up spec.

## 5. Performance budget

- LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 on representative public pages.
- Public routes ≤ 250 KB gzip first-load JS.
- Admin lists with ≥ 200 rows must virtualise.
- DB access goes through a repository in
  [`apps/web/lib/repositories/**`](apps/web/lib/repositories). N+1 is a
  blocker.
- Default to React Server Components; opt into client components only
  when interactivity is required.

## 6. Latest stable frameworks

- Next.js, React, TypeScript, Tailwind CSS, ESLint, Drizzle, Playwright,
  Docusaurus, HeroUI, Auth.js, next-intl, Turborepo, pnpm — all on
  **latest stable** unless a spec documents the exception.
- Major upgrades land via `docs/spec/NNN-upgrade-<framework>/` with a
  migration plan.

## 7. Reuse before build

- Check [`packages/`](packages/) before authoring a new utility.
- Check the npm ecosystem before authoring a new internal package.
- Prefer popular, well-maintained, TypeScript-first, ESM libraries.
- Document the choice in the relevant `plan.md`.

## 8. No removal without migration

- Move and improve, don’t delete. Renaming is fine.
- Hard-deleting a feature requires
  `docs/spec/NNN-deprecate-<feature>/spec.md` with impact, replacement,
  deprecation timeline, and migration steps.
- Existing e2e specs that document behaviour stay until a deprecation
  spec ships.

## 9. Test coverage bar

- Every user-visible change ships with at least one Playwright spec
  under `apps/web-e2e/tests/<area>/`.
- Every new API route ships with at least one Playwright API spec
  under `apps/web-e2e/tests/api/`.
- Authenticated flows reuse the storage states from
  [`global-setup.ts`](apps/web-e2e/global-setup.ts).
- Tests assert on roles / labels / `data-testid`, not on copy that
  changes with content.

## 10. Documentation as a first-class citizen

- Every feature has a page under [`docs/`](docs/) that is reachable
  from [`docs/index.md`](docs/index.md).
- Every plugin ships with a `README.md` inside its package and a
  feature page under `docs/features/` or `docs/plugins/`.
- Open questions go to [`docs/questions.md`](docs/questions.md) with a
  chosen default so work is not blocked.
- Significant changes append a line to [`docs/log.md`](docs/log.md).
- Docs are lint-clean: frontmatter present, no broken internal links,
  no orphan files.

## 11. Modular packages

- Each package fits in a developer’s head (typically ≤ ~2k lines).
- Public surface declared via `package.json#exports`.
- Cross-package coupling goes through public exports only.
- Cross-cutting concerns (logging, telemetry, errors) live in
  dedicated packages, not duplicated.

## 12. Build, dev, and verification

Use these commands (see [`CLAUDE.md`](CLAUDE.md) for the full list):

- `pnpm run dev` – start all dev servers (from monorepo root).
- `pnpm run --filter @ever-works/web dev` – start only the web app.
- `pnpm run build` – build all packages.
- `pnpm run lint` – lint all packages.
- `pnpm tsc --noEmit` – TypeScript type-check (run from `apps/web/`).
- `pnpm --filter @ever-works/web-e2e exec playwright test` – run e2e
  suite locally.

Treat as the main verification steps:

- For quick checks: `pnpm lint` and `pnpm tsc --noEmit`.
- For larger changes: also `pnpm build` and a relevant Playwright
  spec.

Run commands from the **monorepo root**. App-specific commands
(`pnpm db:migrate` etc.) can be run from `apps/web/`.

## 13. Environment & data

- Assume `.env.local` already exists and is correctly configured.
- Do **not** create, modify, or print env secrets unless the user
  explicitly asks.
- Content is loaded from the Git-based CMS repo pointed to by
  `DATA_REPOSITORY` ([Spec 006](docs/spec/006-git-cms/spec.md)).

## 14. Safety & side effects

**Always safe to run:**

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- `pnpm dev` / `pnpm start` (local verification)
- `pnpm --filter @ever-works/web-e2e exec playwright test`

**Ask the user first before:**

- Adding new dependencies (`pnpm add`).
- Running migrations or seeds against any non-local DB.
- Modifying `.env*` semantics.
- Changing auth, payments, analytics integrations beyond what a spec
  authorises.
- Pushing to `main` (always go via PR).

**Never do:**

- Skip git hooks (`--no-verify`).
- Force-push to `main` / `develop`.
- Delete branches, tags, or files outside the documented scope.
- Modify or commit secrets (`.env.local`, API keys).

## 15. Code organization

- Next.js App Router under `apps/web/app/[locale]/**` and
  `apps/web/app/api/**`.
- Shared business logic in `apps/web/lib/services/**` and
  `apps/web/lib/repositories/**`.
- Database schema and helpers in `apps/web/lib/db/**` (Drizzle ORM).
- UI and layout components in `apps/web/components/**`.
- Custom React hooks in `apps/web/hooks/**`.

When implementing features:

- Put domain / business logic in `lib/**`.
- Keep React components focused on rendering and wiring.
- Put cross-cutting code into a `packages/<name>/` package.

## 16. Per-task: continual improvement runs

Some scheduled tasks (see `.claude/scheduled-tasks/full-template/`)
operate on this monorepo every hour with a continuous-improvement
charter. **Within this monorepo only**, those runs may:

- Add or improve docs and specs.
- Add or improve e2e tests.
- Plan plugin / adapter refactors and document them in
  `docs/spec/NNN-<slug>/`.
- Open questions in [`docs/questions.md`](docs/questions.md) with a
  chosen default.
- Append a [`docs/log.md`](docs/log.md) line.
- Commit and push to the template repo.

Those runs **must not**:

- Modify anything outside `directory-web-template/`.
- Delete features, specs, or docs (Article VIII of the constitution).
- Bypass git hooks.
- Land code without a spec/plan/tasks trio (Article III).

## 17. Quick links

- [`README.md`](README.md) — repo overview.
- [`CLAUDE.md`](CLAUDE.md) — Claude-specific guidance.
- [`apps/web/README.md`](apps/web/README.md) — web app setup.
- [`apps/web-e2e/E2E-TESTS.md`](apps/web-e2e/E2E-TESTS.md) — coverage
  matrix.
- [`packages/`](packages/) — shared configs and (eventually) plugin
  packages.
- External docs repo (platform-wide):
  <https://github.com/ever-works/ever-works-docs/tree/develop/website/docs>.
