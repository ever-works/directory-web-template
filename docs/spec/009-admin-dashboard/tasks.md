---
id: tasks-009-admin-dashboard
title: 'Tasks 009 — Admin Dashboard'
sidebar_label: '009 Admin Dashboard Tasks'
---

# Tasks — `009-admin-dashboard`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions: `[P]` parallel, `[seq]` sequential, `[done]` already shipped.

## Task list

### T-001 [done] — Sectioned admin layout

- Files: `apps/web/app/[locale]/admin/(dashboard)/layout.tsx`,
  `apps/web/components/admin/sidebar/**`.
- Verification: every primary section is reachable from the sidebar.

### T-002 [done] — Items management (CRUD + multi-step form)

- Files: `apps/web/app/[locale]/admin/(dashboard)/items/**`,
  `apps/web/app/api/admin/items/**`,
  `apps/web-e2e/tests/admin/items*.spec.ts`.
- Verification: items-crud, items-filter, items-review specs are green.

### T-003 [done] — Tags / Categories / Collections / Featured / Companies / Surveys / Sponsorships / Comments / Reports / Roles / Clients

- Files: `apps/web/app/[locale]/admin/(dashboard)/<entity>/**`,
  `apps/web/app/api/admin/<entity>/**`,
  `apps/web-e2e/tests/admin/<entity>.spec.ts`.
- Verification: all 21 admin specs are green.

### T-004 [done] — Bulk actions

- Files: `apps/web/components/admin/items/BulkActionsBar.tsx`,
  `apps/web-e2e/tests/admin/bulk-actions.spec.ts`.
- Verification: select-all triggers bulk action bar with approve / reject /
  delete buttons.

### T-005 [done] — CSV / data export

- Files: `apps/web/components/admin/data-export/**`,
  `apps/web-e2e/tests/admin/data-export.spec.ts`.
- Verification: export buttons exist; metadata checkbox toggles.

### T-006 [done] — Notifications bell in admin header

- Files: `apps/web/components/admin/notifications/**`,
  `apps/web-e2e/tests/admin/notifications.spec.ts`.
- Verification: bell visible; clicking opens dropdown.

### T-007 [done] — Settings accordion

- Files: `apps/web/app/[locale]/admin/(dashboard)/settings/**`,
  `apps/web-e2e/tests/admin/settings.spec.ts`.
- Verification: each section expands; analytics toggle persists.

### T-008 [seq] — Define admin slot ids in plugin SDK

- Files: `packages/plugin-sdk/src/slots.ts`.
- Steps:
  1. Reserve canonical ids: `admin.settings.section`,
     `admin.<entity>.row.actions`, `admin.<entity>.toolbar`,
     `admin.layout.header.right`.
  2. Document the contract under `docs/plugins/slots.md`.
- Verification: typecheck passes; doc page lists every slot.

### T-009 [seq] — Render slots from admin layout / pages

- Files: `apps/web/app/[locale]/admin/(dashboard)/**`,
  `apps/web/components/plugins/SlotHost.tsx` (from spec 002).
- Verification: a demo plugin contributes a row action visible in the
  Items table.

### T-010 [seq] — Granular RBAC (future spec)

- Files: future `docs/spec/NNN-admin-rbac/spec.md`.
- Verification: spec lands; not part of this plan.

## Acceptance Criteria → Task Map

| AC    | Tasks                          |
| ----- | ------------------------------ |
| AC-1  | T-001                          |
| AC-2  | T-002, T-003                   |
| AC-3  | T-003                          |
| AC-4  | T-006                          |
| AC-5  | T-007                          |
| AC-6  | T-002 — T-007                  |

## Notes

- The admin tree intentionally stays inside `apps/web` for v1.
- A standalone `apps/admin` would be a future spec and require shared
  packages for auth and UI.
