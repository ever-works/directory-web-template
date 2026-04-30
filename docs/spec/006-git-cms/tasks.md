---
id: tasks-006-git-cms
title: 'Tasks 006 — Git-based CMS'
sidebar_label: '006 Git CMS Tasks'
---

# Tasks — `006-git-cms`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions: `[P]` parallel, `[seq]` sequential, `[done]` already shipped.

## Task list

### T-001 [done] — Bootstrap clone script

- Files: `apps/web/scripts/clone.cjs`.
- Verification: setting `DATA_REPOSITORY` clones into `.content/`.

### T-002 [done] — Typed content read API

- Files: `apps/web/lib/content.ts`,
  `apps/web/lib/db/schema/{items,categories,tags,collections}.ts`.
- Verification: typecheck passes; runtime parses YAML / Markdown
  fixtures.

### T-003 [done] — Cache invalidation

- Files: `apps/web/lib/cache-invalidation.ts`.
- Verification: revalidating an item slug refreshes the cached payload.

### T-004 [done] — PR #690 hardening

- Files: `apps/web/scripts/check-env.js`, related auth/CMS bootstrap.
- Verification: missing `AUTH_SECRET` aborts boot; CMS fixtures still
  load when the secret is correct.

### T-005 [P] — Migrate clone bootstrap from `.cjs` to `.ts`

- Files: `apps/web/scripts/clone.ts` (new), `apps/web/package.json`.
- Steps:
  1. Rewrite `clone.cjs` in TypeScript using `tsx` invocation.
  2. Wire it into `prebuild` / `predev` scripts.
  3. Keep `clone.cjs` as a deprecated wrapper that prints a warning and
     forwards to the new script for one minor version.
- Verification: `pnpm --filter @ever-works/web prebuild` clones content
  via the TS path.

### T-006 [seq] — Define `ContentSource` interface in plugin SDK

- Files: `packages/plugin-sdk/src/content-source.ts`.
- Verification: typecheck passes; builds reference the interface from
  SDK only.

### T-007 [seq] — Wrap Git clone path as `plugin-content-git`

- Files: `packages/plugin-content-git/**`.
- Verification: replacing the inlined Git path with the plugin produces
  identical content reads (snapshot-tested).

### T-008 [seq] — Optional Hygraph adapter

- Files: `packages/plugin-content-hygraph/**`.
- Verification: an item with a Hygraph slug renders identically to a
  Git-sourced one.

## Acceptance Criteria → Task Map

| AC    | Tasks                          |
| ----- | ------------------------------ |
| AC-1  | T-001                          |
| AC-2  | T-002                          |
| AC-3  | T-002                          |
| AC-4  | T-002                          |
| AC-5  | T-002, T-003                   |
| AC-6  | T-004                          |

## Notes

- The Git clone is shallow by design.
- Plugin-content packages must keep zero runtime imports from
  `apps/web/` to enable independent versioning.
