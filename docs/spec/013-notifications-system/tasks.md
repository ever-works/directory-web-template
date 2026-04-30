---
id: tasks-013-notifications-system
title: 'Tasks 013 — Notifications System'
sidebar_label: '013 Notifications Tasks'
---

# Tasks — `013-notifications-system`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions: `[P]` parallel, `[seq]` sequential, `[done]` already shipped.

## Task list

### T-001 [done] — Admin notifications bell UI

- Files: `apps/web/components/admin/notifications/**`,
  `apps/web-e2e/tests/admin/notifications.spec.ts`.
- Verification: bell visible; dropdown opens; refresh button works.

### T-002 [done] — Novu API integration baseline

- Files: `apps/web/lib/notifications/novu.ts` (or equivalent).
- Verification: a manual test event posts via `@novu/api`.

### T-003 [seq] — Define `NotificationsProvider` interface

- Files: `apps/web/lib/notifications/types.ts` (eventually
  `packages/plugin-sdk/src/notifications.ts`).
- Verification: typecheck passes; adapter shape documented.

### T-004 [seq] — Local mirror tables

- Files: `apps/web/lib/db/schema/notifications.ts`,
  `apps/web/lib/db/schema/notification-preferences.ts`.
- Verification: `pnpm db:generate` + `pnpm db:migrate` produces tables.

### T-005 [seq] — `useNotifications()` hook

- Files: `apps/web/hooks/useNotifications.ts`.
- Verification: hook reads from DB-first, syncs to provider in
  background.

### T-006 [seq] — Client bell + dropdown

- Files: `apps/web/components/client/notifications/**`.
- Verification: badge increments when an approval triggers a
  notification.

### T-007 [seq] — Settings → Notifications preferences

- Files: `apps/web/app/[locale]/client/settings/notifications/**`.
- Verification: opting out of `comment.received` suppresses that kind.

### T-008 [P] — Client notifications e2e (closes 010 AC-9)

- Files: `apps/web-e2e/tests/client/notifications.spec.ts`.
- Steps:
  1. As admin, approve a client submission.
  2. Switch to client storage state, navigate, assert the bell badge
     shows ≥ 1 unread.
- Verification: spec passes locally.

### T-009 [seq] — Migrate Novu integration to plugin

- Files: `packages/plugin-notifications-novu/**`.
- Verification: removing the package falls back to a stub provider
  without crashing.

### T-010 [seq] — Knock / Courier adapters

- Files: `packages/plugin-notifications-{knock,courier}/**`.
- Verification: alternative provider can be enabled in admin.

## Acceptance Criteria → Task Map

| AC    | Tasks               |
| ----- | ------------------- |
| AC-1  | T-003               |
| AC-2  | T-009               |
| AC-3  | T-001               |
| AC-4  | T-006               |
| AC-5  | T-007               |
| AC-6  | T-001, T-008        |

## Notes

- Provider source of truth: DB mirror per `Q-013a`.
- Push notifications and SMS are explicit non-goals for v1.
