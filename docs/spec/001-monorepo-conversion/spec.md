---
id: spec-001-monorepo-conversion
title: 'Spec 001 — Monorepo Conversion'
sidebar_label: '001 Monorepo Conversion'
---

# Feature spec — `001-monorepo-conversion`

> **Status:** Shipped (PR #644 family).
> **Note:** Retroactive spec for an already-implemented feature.
> The original implementation plan from before Spec Kit lives at
> [`docs/plans/2026-03-08-monorepo-conversion.md`](../../plans/2026-03-08-monorepo-conversion.md)
> and the corresponding design doc at
> [`docs/plans/2026-03-08-monorepo-conversion-design.md`](../../plans/2026-03-08-monorepo-conversion-design.md).
> This spec collects them under the new Spec Kit conventions.

## 1. Summary

Convert the single-app Next.js project into a **Turborepo + pnpm monorepo**
with three apps (`apps/web`, `apps/web-e2e`, `apps/docs`) and shared
configuration packages (`packages/tsconfig`, `packages/eslint-config`).

## 2. Motivation

- E2E tests, the Docusaurus documentation site, and shared configs all
  benefit from sitting alongside `apps/web` rather than as one mixed code
  base.
- Sets up the substrate for the plugin-first architecture (Spec
  [`002`](../002-plugin-architecture/spec.md)) — every future plugin lives
  in `packages/`.
- Improves CI caching via Turborepo’s remote/local cache.

## 3. Goals

- One workspace where `pnpm install` from the root installs everything.
- `pnpm run dev` starts every app via Turborepo with proper dependency
  ordering.
- All shared TypeScript and ESLint config lives in `packages/*` and is
  consumed by every app via `extends`.
- E2E tests run from `apps/web-e2e` against `apps/web`’s dev or build
  output.
- Documentation site (`apps/docs`) builds Markdown sourced from the root
  `docs/` directory.

## 4. Non-Goals

- Publishing any package to npm (everything is `private`).
- Adding additional apps beyond the three above.
- Replacing pnpm with another package manager.

## 5. User Stories

```text
As a maintainer, I want all three apps in one repo so I can release them
together and keep them in sync.

As a contributor, I want one `pnpm install` to bootstrap the entire
project so I do not have to set up each app separately.
```

## 6. Acceptance Criteria

- [x] AC-1: Repository root contains `apps/`, `packages/`,
  `pnpm-workspace.yaml`, `turbo.json`, and a root `package.json` whose
  scripts call Turbo.
- [x] AC-2: `apps/web` is the Next.js app at version 16.
- [x] AC-3: `apps/web-e2e` is a Playwright project that runs against
  `apps/web`.
- [x] AC-4: `apps/docs` is a Docusaurus v3 app whose content is sourced
  from `docs/`.
- [x] AC-5: `packages/tsconfig` and `packages/eslint-config` exist and are
  consumed by `apps/web`, `apps/web-e2e`, `apps/docs`.
- [x] AC-6: GitHub Actions builds `apps/web` and `apps/docs` and runs
  Playwright on `apps/web`.
- [x] AC-7: Vercel deployment is configured at the monorepo level.

## 7. Out-of-Scope Considerations

- A separate `apps/admin` or `apps/api` — admin and API are part of
  `apps/web` for now.
- Remote Turbo cache configuration (would speed up CI further; future
  spec).

## 8. UX Notes

No user-visible UX change.

## 9. Data & API Surface

No data model change.

## 10. Plugin / Adapter Impact

This spec is the *substrate* for the plugin system. It does not introduce
any plugins itself.

## 11. Risks & Open Questions

Closed at ship time; see the original plan documents linked above.

## 12. Acceptance Test Plan

- CI builds (`.github/workflows/ci.yml`, `docs.yml`) green on every push.
- `pnpm run dev` works locally.
- `pnpm run build` works locally and in CI.
- Playwright suite passes against the built app.

## 13. References

- Original plan: [`docs/plans/2026-03-08-monorepo-conversion.md`](../../plans/2026-03-08-monorepo-conversion.md)
- Original design: [`docs/plans/2026-03-08-monorepo-conversion-design.md`](../../plans/2026-03-08-monorepo-conversion-design.md)
- Constitution: [`../../../.specify/memory/constitution.md`](../../../.specify/memory/constitution.md)
