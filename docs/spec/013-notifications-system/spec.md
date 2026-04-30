---
id: spec-013-notifications-system
title: 'Spec 013 — Notifications System'
sidebar_label: '013 Notifications'
---

# Feature spec — `013-notifications-system`

> **Status:** Proposed (Novu integration partially in place via
> `@novu/api`). Retroactive + forward-looking spec.

## 1. Summary

Unify in-app, email, and push notifications behind a `NotificationsProvider`
adapter. The first concrete provider is **Novu**; further providers (Knock,
Courier, custom SMTP) can ship later as plugins.

## 2. Motivation

- Notifications are a fragmented domain (email, in-app bell, push,
  in-product banners). One adapter keeps the rest of the codebase happy.
- Admin notifications bell is already in the UI
  ([Spec 009](../009-admin-dashboard/spec.md)), but there is no unified
  pipeline yet.

## 3. Goals

- `NotificationsProvider` interface (subscribe, unsubscribe, send,
  mark-read).
- Novu adapter as the default.
- In-app bell wired to provider.
- Per-event preferences (item approved, comment received, report
  filed).
- Localised templates via `next-intl`.

## 4. Non-Goals

- Push notifications via the Web Push API in v1 (future plugin).
- SMS as a first-class channel (future plugin).

## 5. User Stories

```text
As a client, I want to be notified when my submission is approved.

As an admin, I want to be notified when a new submission arrives so I
can triage it quickly.

As a fork maintainer, I want to swap Novu for our internal email service
without changing the UI.
```

## 6. Acceptance Criteria

- [ ] AC-1: `NotificationsProvider` interface in
  `apps/web/lib/notifications/types.ts` (or in
  `@ever-works/plugin-sdk` once 002 ships).
- [ ] AC-2: Novu adapter under
  `packages/plugin-notifications-novu/`.
- [ ] AC-3: Admin bell badge updates with unread count.
- [ ] AC-4: Client bell badge similarly works.
- [ ] AC-5: Settings → Notifications lets users opt out of categories.
- [ ] AC-6: E2E:
  `apps/web-e2e/tests/admin/notifications.spec.ts` (already exists),
  `apps/web-e2e/tests/client/notifications.spec.ts` (gap).

## 7. Out-of-Scope Considerations

- Real-time WebSocket push (future spec).

## 8. UX Notes

- Bell uses `aria-live="polite"` for new-item announcements.
- Localised templates and time formatting.

## 9. Data & API Surface

- `notifications` table + `notification_preferences` table.
- API: `GET /api/notifications`, `POST /api/notifications/:id/read`.

## 10. Plugin / Adapter Impact

This is a plugin from day one. Depends on
[`002`](../002-plugin-architecture/spec.md) for the SDK.

## 11. Risks & Open Questions

- **Open:** persist notifications in our DB or rely on provider as
  source of truth? Default: **mirror in DB for offline reads**.

## 12. Acceptance Test Plan

E2E specs above + manual round trip via Novu sandbox.

## 13. References

- Novu: <https://novu.co>
- Constitution Articles I, II, III, IV, IX.
