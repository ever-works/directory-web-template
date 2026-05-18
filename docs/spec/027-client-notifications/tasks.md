---
id: tasks-027-client-notifications
title: 'Tasks 027 — Client Notifications System'
sidebar_label: '027 Client Notifications Tasks'
---

# Tasks — `027-client-notifications`

> **Spec:** [`spec.md`](./spec.md) · **Plan:** [`plan.md`](./plan.md)
>
> `[P]` parallel, `[seq]` sequential, `[done]` shipped in this PR.

### T-001 [seq] — Schema + migration

Extend `notifications` (enum + columns + partial index), add `notificationPreferences`. Generate migration `0037_client_notifications.sql`. ACs: AC-1..AC-4.

### T-002 [seq] — Notification registry + types

`lib/notifications/registry.ts` + `lib/notifications/types.ts`. Single map of `(type → category, priority, icon, defaultChannels, locked)`. Discriminated union for `NotificationEvent`. AC: AC-5.

### T-003 [seq] — Preferences + pubsub

`lib/notifications/preferences.ts` + `lib/notifications/pubsub.ts`. Locked types bypass preferences for in-app. AC: AC-8.

### T-004 [seq] — Service `dispatch()`

Extend `NotificationService` with `dispatch(event)` (preferences, groupKey dedupe, transactional insert, publish). AC: AC-6, AC-7.

### T-005 [P] — Client API routes

`/api/client/notifications/*` × 7 routes (list, stats, [id], mark-all-read, bulk, preferences, stream). AC: AC-9..AC-15.

### T-006 [P] — Hooks

6 TanStack Query hooks for list / stats / mark / bulk / preferences / stream. AC: feeds AC-16..AC-25.

### T-007 [P] — UI primitives

`components/notifications/*` (bell, dropdown, tabs, card, list, filters, bulk-actions, preferences-form, skeleton, empty, provider, icon-map, group-utils, types). AC: AC-17..AC-23, AC-26..AC-28.

### T-008 [P] — Pages

`/client/notifications` + `/client/notifications/preferences`. AC: AC-21, AC-22.

### T-009 [seq] — Wire into header + client layout

Header bell next to ProfileButton; client `layout.tsx` wraps `<NotificationStreamProvider>`. AC: AC-16, AC-24.

### T-010 [seq] — i18n

Add `notifications` namespace to `en.json`. Other locales fall back to English at runtime — translation pass to follow in spec 014.

### T-011 [seq] — Build + lint + typecheck green

`pnpm lint && pnpm tsc --noEmit && pnpm build`. AC: AC-29.

### T-012 [seq] — Docs + log

Spec indexed in `docs/spec/README.md`; this PR linked from `docs/log.md`. AC: AC-30.
