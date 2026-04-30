---
id: plan-013-notifications-system
title: 'Plan 013 — Notifications System'
sidebar_label: '013 Notifications Plan'
---

# Implementation Plan — `013-notifications-system`

> **Spec:** [`spec.md`](./spec.md)
>
> **Status.** Partly shipped (admin notifications bell, Novu API
> integration); the unified pipeline is the forward direction.

## 1. High-Level Approach

Define a `NotificationsProvider` adapter and route every produced
notification through it. Today's `@novu/api` use migrates into a
**Novu adapter** (`packages/plugin-notifications-novu/`). Notifications
are mirrored to a local `notifications` table for offline reads and
per-event preferences. Admin and client bell components subscribe to a
small `useNotifications()` hook that reads the mirror and reconciles
with the provider in the background.

## 2. Architecture Diagram

```mermaid
flowchart LR
  Producer[code: notify('item.approved', {...})] --> Iface[NotificationsProvider]
  Iface --> Novu[Novu adapter]
  Iface --> DBMirror[(notifications)]
  AdminBell[admin bell] --> Hook[useNotifications]
  ClientBell[client bell] --> Hook
  Hook --> DBMirror
  Hook -. "background sync" .-> Novu
  subgraph Future
    Knock[plugin-notifications-knock]
    Courier[plugin-notifications-courier]
  end
  Knock -. "future" .-> Iface
  Courier -. "future" .-> Iface
```

## 3. Affected Packages & Files

| Path                                                  | Change       | Notes                                       |
| ----------------------------------------------------- | ------------ | ------------------------------------------- |
| `apps/web/lib/notifications/{types,index,novu}.ts`    | new / modify | Adapter + Novu impl.                        |
| `apps/web/lib/db/schema/notifications.ts`             | new          | Local mirror table.                         |
| `apps/web/lib/db/schema/notification-preferences.ts`  | new          | Per-event opt-out.                          |
| `apps/web/components/admin/notifications/**`          | maintain     | Existing bell.                              |
| `apps/web/components/client/notifications/**`         | new          | Client bell + dropdown.                     |
| `apps/web/app/api/notifications/**`                   | new          | List, mark-read endpoints.                  |
| `apps/web-e2e/tests/admin/notifications.spec.ts`      | maintain     | Existing.                                   |
| `apps/web-e2e/tests/client/notifications.spec.ts`     | **new**      | Per spec 010 AC-9.                          |
| `packages/plugin-notifications-novu/`                 | future       | Migration target (002).                     |
| `docs/spec/013-notifications-system/{plan,tasks}.md`  | **this PR**  | Catch up Spec Kit artefacts.                |

## 4. Public API / Plugin Manifest

```ts
export interface NotificationsProvider {
  id: string;
  send(input: NotificationInput): Promise<void>;
  list(userId: string, opts?: ListOpts): Promise<NotificationView[]>;
  markRead(userId: string, ids: string[]): Promise<void>;
  unreadCount(userId: string): Promise<number>;
}
```

## 5. Data Model

```ts
notifications(
  id, userId, kind, payload, providerNotificationId,
  readAt, createdAt
);
notification_preferences(userId, kind, enabled);
```

## 6. UX & A11y Plan

- Bells use `aria-live="polite"` for new arrivals.
- Dropdown trapped focus + Escape close.
- Localised templates and time formatting.

## 7. Performance Plan

- DB mirror queried with a small SWR cache; provider sync runs in the
  background.
- Bell badge is a server component on first render to avoid layout
  shift.

## 8. Security Plan

- Per-user authorisation enforced server-side: a user can only mark
  their own notifications as read.
- Provider webhook signatures verified.

## 9. Test Plan

- E2E (existing): `tests/admin/notifications.spec.ts`.
- E2E (new): `tests/client/notifications.spec.ts` covers receiving an
  approval and seeing the badge increment.
- Manual: trigger an approval; verify email + bell badge.

## 10. Rollout & Migration Plan

- Land the local mirror first; keep Novu calls as today.
- Move the Novu calls into the plugin once spec 002 ships.
- Add per-event preferences UI under Settings → Notifications.

## 11. Constitution Check

- [x] **I — Plugin-First** — adapter + plugin migration plan.
- [x] **II — TypeScript Everywhere** — TS throughout.
- [x] **III — Spec Before Code** — this plan.
- [x] **IV — Documentation First-Class** — feature page + integration
  doc.
- [x] **V — Performance Budget** — DB-first reads.
- [x] **VI — Latest Stable Frameworks** — Novu SDK on latest.
- [x] **VII — Reuse Before Build** — Novu API reused.
- [x] **VIII — No Removal Without Migration** — additive.
- [x] **IX — Test Coverage Bar** — existing + new client spec.
- [x] **X — Modular Packages** — future plugin packages outlined.

## 12. Complexity Tracking

None.

## 13. Open Questions

Mirrored to [`docs/questions.md`](../../questions.md):

- `Q-013a` Notifications source of truth — **default: mirror in DB**.

## 14. References

- Spec: `./spec.md`
- Novu: <https://novu.co>
- Constitution Articles: I, II, III, IV, IX.
