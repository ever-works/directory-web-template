---
id: tasks-001-monorepo-conversion
title: 'Tasks 001 — Monorepo Conversion'
sidebar_label: '001 Monorepo Conversion Tasks'
---

# Tasks — `001-monorepo-conversion`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)
>
> **Note — retroactive task list.** The conversion shipped before
> Spec Kit adoption, so every task below is recorded as completed
> from the start. This file exists to make the
> spec → plan → tasks trio uniform across `docs/spec/**` and to give
> AI agents a single auditable checklist for the conversion. The
> in-flight history lives in
> [`docs/plans/2026-03-08-monorepo-conversion.md`](../../plans/2026-03-08-monorepo-conversion.md).

Conventions:

- `[P]` after a task ID means it could in principle be done in parallel
  with other `[P]` tasks (no shared dependencies). Recorded for
  retrospective parity with the rest of the spec backlog.
- `[seq]` means the task must be done after the previous numbered task.
- Each task ends with a **Verification** line: how it was verified at
  ship time.

## Phase A — Workspace foundation

### T-001 [P] [done] — Stand up `pnpm-workspace.yaml`

- Files: [`pnpm-workspace.yaml`](../../../pnpm-workspace.yaml).
- Steps:
  1. Create `pnpm-workspace.yaml` listing `apps/*` and `packages/*`.
  2. Bump root `package.json` to `private: true` and remove app-specific
     dependencies.
- Verification: `pnpm install` from a clean checkout resolves every
  workspace and produces a single root `pnpm-lock.yaml`.

### T-002 [seq] [done] — Author `turbo.json`

- Files: [`turbo.json`](../../../turbo.json).
- Steps:
  1. Define a top-level `tasks` block with `dev`, `build`, `lint`,
     `test`, `typecheck`, `start`.
  2. Mark `dev` as persistent and `build` as cacheable with the
     correct `outputs` globs (`apps/web/.next/**`, `apps/docs/build/**`).
  3. Configure `globalDependencies` to invalidate the cache on env
     and config changes.
- Verification: `pnpm run lint` runs once for each app and rehydrates
  from cache on the next invocation.

### T-003 [P] [done] — Create `packages/tsconfig`

- Files: [`packages/tsconfig/`](../../../packages/tsconfig/).
- Steps:
  1. Add `base.json`, `nextjs.json`, and `react-library.json`.
  2. Set `composite` and `strict` everywhere.
  3. Wire `apps/web/tsconfig.json`, `apps/web-e2e/tsconfig.json`, and
     `apps/docs/tsconfig.json` to `extends` from this package.
- Verification: `pnpm --filter @ever-works/web tsc --noEmit` succeeds.

### T-004 [P] [done] — Create `packages/eslint-config`

- Files: [`packages/eslint-config/`](../../../packages/eslint-config/).
- Steps:
  1. Author the shared flat-config base used by every app.
  2. Move `.eslintrc` rules out of `apps/web/` into the package.
- Verification: `pnpm run lint` from the repo root reports no errors
  on a clean checkout.

## Phase B — App relocation

### T-005 [seq] [done] — Move existing source under `apps/web/`

- Files: every previously top-level source directory
  (`app/`, `components/`, `lib/`, `hooks/`, `messages/`,
  `public/`, `scripts/`, etc.) → `apps/web/<same>`.
- Steps:
  1. `git mv` each directory to preserve history.
  2. Update import aliases (`@/*` resolves under `apps/web/`).
  3. Move `apps/web/.env.example` and update `scripts/check-env.js`
     to read from the new location.
- Verification: `pnpm --filter @ever-works/web build` succeeds and
  `git log --follow` still resolves history for moved files.

### T-006 [seq] [done] — Extract `apps/web-e2e`

- Files: [`apps/web-e2e/`](../../../apps/web-e2e/).
- Steps:
  1. Move the existing `e2e/` tree out of `apps/web/` into a new
     workspace package `@ever-works/web-e2e` with its own
     `package.json`, `tsconfig.json`, and Playwright config.
  2. Configure `playwright.config.ts` `webServer.command` to run
     `pnpm --filter @ever-works/web dev`.
  3. Add `apps/web-e2e/E2E-TESTS.md` to track every spec added.
- Verification: `pnpm --filter @ever-works/web-e2e exec playwright
  test` runs and all green specs pass.

### T-007 [P] [done] — Create `apps/docs`

- Files: [`apps/docs/`](../../../apps/docs/).
- Steps:
  1. Scaffold a Docusaurus v3 app whose content directory points at
     the repo-root `docs/` folder.
  2. Wire its `package.json` scripts (`dev`, `build`, `serve`) into
     `turbo.json`.
  3. Add `.github/workflows/docs.yml` for docs-only CI runs.
- Verification: `pnpm --filter @ever-works/docs build` produces a
  static site that opens locally.

## Phase C — CI / deploy / docs

### T-008 [seq] [done] — Update GitHub Actions

- Files: [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml),
  [`.github/workflows/docs.yml`](../../../.github/workflows/docs.yml).
- Steps:
  1. Replace single-app build / lint / test steps with `pnpm run
     <task>` from the repo root (Turbo handles fan-out).
  2. Cache `~/.cache/pnpm` and `node_modules/.cache/turbo` per
     workflow run.
  3. Add path filters so `docs.yml` runs on `docs/**` and the new
     workflow only.
- Verification: every Actions run on `develop` and feature branches
  reports green for CI, Docs CI, and CodeQL.

### T-009 [seq] [done] — Update Vercel project

- Files: project settings (no in-repo file aside from any
  [`vercel.json`](../../../vercel.json) overrides).
- Steps:
  1. Set the production project root to the monorepo root.
  2. Build command: `pnpm install && pnpm run build --filter
     @ever-works/web`.
  3. Output directory: `apps/web/.next`.
  4. Add a separate Vercel project (or branch deploy) for `apps/docs`
     when ready.
- Verification: a fresh deploy of `develop` passes preview-build
  checks.

### T-010 [seq] [done] — Update README / AGENTS / CLAUDE / docs

- Files: [`README.md`](../../../README.md),
  [`AGENTS.md`](../../../AGENTS.md),
  [`CLAUDE.md`](../../../CLAUDE.md),
  [`apps/web/README.md`](../../../apps/web/README.md),
  [`docs/getting-started/`](../../getting-started/),
  [`docs/architecture/overview.md`](../../architecture/overview.md).
- Steps:
  1. Document the new `pnpm` + Turborepo workflow.
  2. Add an "Environment & tooling" section that says all commands
     run from the repo root.
  3. Add the canonical workspace map to the architecture overview.
- Verification: docs build clean and a fresh contributor follows
  README → green build in under 10 minutes.

### T-011 [seq] [done] — Wire Spec Kit retroactively

- Files: [`spec.md`](./spec.md), [`plan.md`](./plan.md), this file.
- Steps:
  1. Author the retroactive spec.
  2. Author the retroactive plan (this PR family).
  3. Author this retroactive task list.
  4. Append a `docs/log.md` line under `spec-001`.
- Verification: every spec under `docs/spec/**` now contains the full
  spec → plan → tasks trio, satisfying the spec-index audit.

## Acceptance Criteria → Task Map

| AC    | Tasks                          | Verified at                                        |
| ----- | ------------------------------ | -------------------------------------------------- |
| AC-1  | T-001, T-002, T-005            | `pnpm install && pnpm run build` from a fresh clone. |
| AC-2  | T-005                          | `apps/web/package.json` pinned to Next.js 16.       |
| AC-3  | T-006                          | Playwright suite runs against `apps/web` in CI.     |
| AC-4  | T-007                          | Docusaurus build green in `docs.yml`.               |
| AC-5  | T-003, T-004                   | Apps consume the shared configs via `extends`.      |
| AC-6  | T-008                          | All three workflows green on `develop`.             |
| AC-7  | T-009                          | Vercel preview + production deploys green.          |

## Notes

- This task list is recorded as fully completed at file creation
  time because the underlying work shipped under PR #644 prior to
  Spec Kit adoption. New follow-ups (remote Turbo cache, admin / API
  app extraction) belong to their own specs, not this one.
- Per Article VIII of the
  [constitution](../../../.specify/memory/constitution.md), the
  legacy plan / design documents under
  [`docs/plans/`](../../plans/) are preserved verbatim. They remain
  the source of truth for the original timeline; this trio is the
  durable Spec Kit packaging.
