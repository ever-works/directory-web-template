---
id: plan-027-client-notifications
title: 'Plan 027 — Client Notifications System'
sidebar_label: '027 Client Notifications Plan'
---

# Implementation Plan — `027-client-notifications`

> **Spec:** [`spec.md`](./spec.md)

## 1. Approach

Additive on top of the existing admin scaffolding. We keep
`NotificationService.create()` (admin) intact and extend the service
with `dispatch()` — the new entry point for any feature that wants to
notify a user. Tables: extend `notifications` (no breaking columns),
add `notification_preferences`. The wire-protocol mirrors the existing
admin REST shape so frontend patterns transfer.

## 2. Architecture

```mermaid
flowchart LR
  Producer["feature code: dispatch(event)"] --> Svc[NotificationService.dispatch]
  Svc --> Prefs[preferences resolver]
  Svc --> Dedupe[groupKey dedupe]
  Svc --> DB[(notifications)]
  Svc --> PubSub[in-mem / redis pub/sub]
  Svc -. async .-> Email[NovuProvider — email]
  PubSub --> SSE[/api/client/notifications/stream]
  SSE --> Provider[NotificationStreamProvider]
  Provider --> Cache[TanStack Query cache]
  Cache --> Bell[NotificationBell]
  Cache --> Inbox[/client/notifications]
```

## 3. Affected files

| Path | Change |
| --- | --- |
| `apps/web/lib/db/schema.ts` | extend `notifications` table, add `notificationPreferences` |
| `apps/web/lib/db/migrations/0037_client_notifications.sql` | new migration |
| `apps/web/lib/notifications/registry.ts` | new — single source of truth for type metadata |
| `apps/web/lib/notifications/types.ts` | new — `NotificationEvent` discriminated union |
| `apps/web/lib/notifications/pubsub.ts` | new — in-memory pubsub (Redis later) |
| `apps/web/lib/notifications/preferences.ts` | new — resolve channels for a user/type |
| `apps/web/lib/services/notification.service.ts` | extend — add `dispatch()`, `broadcastAnnouncement()` |
| `apps/web/app/api/client/notifications/route.ts` | new — list |
| `apps/web/app/api/client/notifications/stats/route.ts` | new |
| `apps/web/app/api/client/notifications/[id]/route.ts` | new |
| `apps/web/app/api/client/notifications/mark-all-read/route.ts` | new |
| `apps/web/app/api/client/notifications/bulk/route.ts` | new |
| `apps/web/app/api/client/notifications/preferences/route.ts` | new |
| `apps/web/app/api/client/notifications/stream/route.ts` | new — SSE |
| `apps/web/hooks/use-notifications.ts` | new |
| `apps/web/hooks/use-notification-stats.ts` | new |
| `apps/web/hooks/use-mark-notification.ts` | new |
| `apps/web/hooks/use-bulk-notifications.ts` | new |
| `apps/web/hooks/use-notification-preferences.ts` | new |
| `apps/web/hooks/use-notification-stream.ts` | new |
| `apps/web/components/notifications/*` | new — bell, dropdown, tabs, card, list, filters, bulk-actions, preferences-form, skeleton, empty, provider, icon-map, group-utils |
| `apps/web/app/[locale]/client/notifications/page.tsx` | new |
| `apps/web/app/[locale]/client/notifications/preferences/page.tsx` | new |
| `apps/web/app/[locale]/client/layout.tsx` | new — wraps `<NotificationStreamProvider>` |
| `apps/web/components/header/index.tsx` | modify — add `<NotificationBell />` next to `<ProfileButton />` |
| `apps/web/messages/en.json` | add `notifications` namespace |

## 4. Risks

- **Migration on a busy table** — the `notifications` ALTERs are nullable adds + default-true columns + a partial index `CREATE INDEX CONCURRENTLY`. Should be online-safe.
- **In-memory pubsub on multi-pod** — single-pod is fine; multi-pod requires `REDIS_URL` (gated). Documented in §5 spec.md.
- **EventSource per tab** — capped client-side to 1 connection per provider mount.

## 5. Rollback

Each PR phase below can revert in isolation:
1. Drop the migration (additive — no data loss except preferences rows).
2. Revert the service `dispatch()` addition.
3. Revert the API routes.
4. Revert the components + page additions.
