---
id: tasks-002-plugin-architecture
title: 'Tasks 002 — Plugin Architecture'
sidebar_label: '002 Plugin Architecture Tasks'
---

# Tasks — `002-plugin-architecture`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

## Phase A — Foundations (no user-visible change)

### T-001 [P] [done 2026-04-30] — Scaffold `@ever-works/plugin-sdk`

- Files: `packages/plugin-sdk/{package.json,tsconfig.json,README.md,src/{capabilities,slots,manifest,providers,plugin,index}.ts}`.
- Steps:
  1. Create the package skeleton, `name: "@ever-works/plugin-sdk"`.
  2. Add `zod` as a dependency, `react` as a peer.
  3. Author the interfaces and `defineDirectoryPlugin` factory per
     `plan.md` §4.
  4. Export everything from `src/index.ts`.
- Verification: `pnpm --filter @ever-works/plugin-sdk typecheck` passes
  cleanly.

### T-002 [P] [done 2026-04-30] — Scaffold `@ever-works/plugin-runtime`

- Files: `packages/plugin-runtime/{package.json,tsconfig.json,README.md,src/{registry,loader,SlotHost,testing,index}.{ts,tsx}}`.
- Steps:
  1. Add as a workspace package depending on `plugin-sdk`.
  2. Implement `PluginRegistry` with `register`, `enable`, `disable`,
     `isEnabled`, `get`, `list`, `slotsFor`.
  3. Implement `<SlotHost slotId="…" registry={…} />` React component.
  4. Add `loadPlugins(registry, [{ plugin, sources }])` with shallow
     env+db+override merge and Zod validation.
- Verification: `pnpm --filter @ever-works/plugin-runtime typecheck`
  passes cleanly.

### T-003 [seq T-001,T-002] [done 2026-04-30] — Demo plugin

- Files: `packages/plugin-demo/{package.json,tsconfig.json,README.md,src/{config.ts,Header.tsx,index.tsx}}`.
- Steps:
  1. Author a small plugin that renders a "Demo plugin loaded" badge in
     the `header.right` slot, gated by config.
- Verification: `pnpm --filter @ever-works/plugin-demo typecheck`
  passes cleanly; the plugin is importable as
  `import demoPlugin from '@ever-works/plugin-demo'`.

## Phase B — Wire-up in `apps/web`

### T-004 [seq T-002] — Boot integration

- Files: `apps/web/lib/plugins/registry.ts`,
  `apps/web/lib/plugins/loader.ts`,
  `apps/web/instrumentation.ts` (or boot equivalent).
- Steps:
  1. Create the singleton registry.
  2. Read `directory.config.ts` + env to determine which plugins to
     register.
  3. Validate every plugin’s config via its Zod schema.
- Verification: server boots; registry exposes the demo plugin.

### T-005 [seq T-004] — Public layout slot

- Files: `apps/web/components/plugins/SlotHost.tsx`,
  `apps/web/app/[locale]/layout.tsx`.
- Steps:
  1. Add a `<SlotHost slotId="header.right" />` placement in the public
     layout.
  2. Confirm the demo plugin renders.
- Verification: visit `/`; demo badge visible.

### T-006 [seq T-004] — Admin layout slot

- Files: `apps/web/app/[locale]/admin/(dashboard)/settings/page.tsx`,
  `apps/web/components/admin/plugins/PluginsTable.tsx`.
- Steps:
  1. Render `<SlotHost slotId="admin.settings.section" />`.
  2. Add a Plugins admin table that lists registered plugins.
- Verification: admin can see the demo plugin row.

## Phase C — Persisted state & API

### T-007 [seq T-006] — DB schema for plugin settings

- Files: `apps/web/lib/db/schema/plugin-settings.ts`,
  `apps/web/lib/db/migrations/<timestamp>_plugin_settings.sql`.
- Steps:
  1. Add the Drizzle table.
  2. `pnpm db:generate` and commit migration.
  3. Backfill on boot if missing rows for bundled plugins.
- Verification: `pnpm db:migrate` clean.

### T-008 [seq T-007] — Admin REST endpoints

- Files: `apps/web/app/api/admin/plugins/route.ts`,
  `apps/web/app/api/admin/plugins/[name]/enable/route.ts`,
  `apps/web/app/api/admin/plugins/[name]/disable/route.ts`,
  `apps/web/app/api/admin/plugins/[name]/config/route.ts`.
- Steps:
  1. Implement endpoints; reuse the existing admin auth guard.
  2. Validate config payloads with the plugin’s Zod schema.
- Verification: requests authenticated as admin succeed; others 401/403.

## Phase D — Tests & docs

### T-009 [P, seq T-006] — E2E: registry & slots

- Files: `apps/web-e2e/tests/plugins/registry.spec.ts`,
  `apps/web-e2e/tests/plugins/slots.spec.ts`,
  `apps/web-e2e/tests/plugins/admin-toggle.spec.ts`.
- Steps:
  1. Cover the three scenarios in the acceptance criteria.
- Verification: all three Playwright specs green locally and in CI.

### T-010 [P, seq T-002] — Documentation

- Files: `docs/architecture/plugin-system.md`,
  `docs/plugins/authoring-a-plugin.md`,
  `docs/plugins/lifecycle.md`,
  `docs/plugins/packages.md`,
  `docs/plugins/testing-a-plugin.md`,
  `docs/index.md`,
  `docs/log.md`.
- Steps:
  1. Author the four `docs/plugins/**` pages (authoring,
     lifecycle, packages, testing).
  2. Add them to `docs/index.md`.
  3. Append a `YYYY-MM-DD plugin-architecture: …` line in `docs/log.md`.
- Verification: links resolve; frontmatter present; included in
  Docusaurus sidebar; testing guide references
  `@ever-works/plugin-runtime/testing` (`createTestRegistry`) so the
  doc and `packages/plugin-runtime/src/testing.ts` cannot drift.

### T-011 [seq T-010] — Migrate analytics as reference

- Files: `packages/plugin-analytics-posthog/**`,
  `apps/web/lib/analytics/**` (delegate to plugin),
  `docs/spec/008-analytics-providers/plan.md` (update with migration note).
- Steps:
  1. Move PostHog wiring into a plugin package implementing
     `AnalyticsProvider`.
  2. Keep the legacy code untouched until the new path proves out
     (Article VIII).
  3. Add an env flag to switch between old and new wiring; default to
     new in the next minor release.
- Verification: existing analytics e2e/manual checks still pass; new
  e2e in `apps/web-e2e/tests/plugins/analytics.spec.ts`.

### T-012 [seq T-011] — Constitution Check

- Re-read `plan.md` §11 and confirm every box still ticks.
- Update `docs/log.md` with shipping date.

## Acceptance Criteria → Task Map

| AC    | Tasks            |
| ----- | ---------------- |
| AC-1  | T-001            |
| AC-2  | T-002            |
| AC-3  | T-004            |
| AC-4  | T-001, T-004     |
| AC-5  | T-005, T-006     |
| AC-6  | T-009            |
| AC-7  | T-001 (ESLint config)|
| AC-8  | T-010            |
| AC-9  | T-009            |

## Notes

- Migration of remaining providers (auth, payments, search, maps,
  newsletter, notifications) is **not** in scope for this tasks list. Each
  is a separate spec in `docs/spec/`.
- Each phase ends in a checkpoint commit; do not bundle phases.
