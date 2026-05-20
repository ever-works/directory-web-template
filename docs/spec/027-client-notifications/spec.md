---
id: spec-027-client-notifications
title: 'Spec 027 — Client Notifications System'
sidebar_label: '027 Client Notifications'
---

# Feature spec — `027-client-notifications`

> **Status:** in-progress.
>
> **Owner:** Template maintainers.
>
> **Parent spec:** [`013-notifications-system`](../013-notifications-system/spec.md) — this spec delivers the client-facing surface (AC-3 onward).
>
> **Constitution articles invoked:** III (Spec Before Code), V (Performance Budget — partial index + virtualized list), IX (Test Coverage Bar — Definition of Done).

## 1. Summary

Build the **client-facing** notifications experience that
[`013-notifications-system`](../013-notifications-system/spec.md)
sketched but only delivered for admins. Concretely:

- A header **bell + dropdown** (tabs: All / Unread / Mentions / System) with badge, optimistic mark-read, mobile sheet.
- A dedicated **`/client/notifications`** inbox with filters, search, bulk actions, day-section grouping, infinite scroll.
- A **`/client/notifications/preferences`** page with a per-type × per-channel matrix, email digest cadence, and quiet hours.
- A **real-time** delivery channel via SSE with an in-memory pub/sub (multi-pod ready when `REDIS_URL` is set).
- A **service-layer `dispatch()`** that resolves recipient preferences, applies group-key deduplication, and writes rows + fans them out.
- Additive schema: enum expansion (16 new types), `priority` / `category` / `actorId` / `groupKey` / `archivedAt` / `deliveredChannels` columns, partial unread index, and a new `notification_preferences` table.

The existing admin `NotificationService.create()` path and `/api/admin/notifications/*` routes are **untouched** so this lands without regressing admin behavior.

## 2. Motivation

- Spec 013 set the direction but only the admin surface shipped. End-users still have no way to see follower / comment / review / lifecycle events.
- The `notifications` table already exists; the gap is preference resolution, dispatching, real-time, and client UI.
- Without preferences, any future feature that wants to notify users would either flood inboxes or hard-code its own opt-outs. `dispatch()` consolidates that.

## 3. Out of scope

- **Web Push** in v1 — column reserved, UI flagged off (matches 013 §4).
- **SMS** channel — column reserved, no provider.
- **Email digest job** — `notification_deliveries` table is reserved for the retry/audit layer that the digest worker will populate; the worker itself is deferred to a follow-up.
- **Migrating the admin UI** onto the new shared `components/notifications/*` primitives — separate follow-up (current admin UI stays as-is).
- **Cross-tenant fan-out** — every dispatch is tenant-scoped (uses `getTenantId()`).
- **Web Push permission UX** — out of scope; preference UI displays the column disabled with a "coming soon" tooltip.

## 4. User stories

```text
As an authenticated user, I want to see a bell badge with my unread count so I
know when there's something new without checking each page.

As an authenticated user, I want to open the dropdown and skim recent events
grouped under Today / Earlier, marking individual rows or all-at-once as read.

As an authenticated user, I want a full inbox page where I can filter, search,
multi-select, archive, and delete notifications.

As an authenticated user, I want to choose which event types reach me on which
channels, set quiet hours, and pick an email digest cadence.

As an authenticated user, I want a new notification to appear instantly in the
bell without refreshing the page.

As a feature developer, I want a single `dispatch(event)` call that handles
preferences, dedupe, idempotency, and fan-out so I never have to write
notification logic in feature code.
```

## 5. Acceptance criteria

### Schema & types

- [ ] **AC-1** Drizzle migration adds `priority`, `category`, `actorId`, `groupKey`, `archivedAt`, `deliveredChannels` to the existing `notifications` table without breaking any existing admin code path.
- [ ] **AC-2** `notifications` enum is extended with 8 new values (see §6) — every existing value remains valid.
- [ ] **AC-3** A `notifications_user_unread_idx` partial index exists on `(user_id, created_at DESC) WHERE is_read = false AND archived_at IS NULL`; unread-count query uses it (verified via `EXPLAIN`).
- [ ] **AC-4** A new `notification_preferences` table holds one JSONB matrix row per user with `emailDigest`, `quietHoursStart`, `quietHoursEnd`, `timezone`, `pushEnabled`, `pushTokens`.
- [ ] **AC-5** `NotificationEvent` is a discriminated TypeScript union; every event variant pins its `data` shape so call-sites cannot pass the wrong payload.

### Service

- [ ] **AC-6** `NotificationService.dispatch(event)` resolves recipient preferences, applies a 5-minute group-key window (collapses repeat reactions on the same target), and inserts rows in a single transaction.
- [ ] **AC-7** `dispatch()` failures **never** propagate to the originating action (errors are logged via Sentry; the caller receives `{ success: false }` or the call is fire-and-forget at the call site).
- [ ] **AC-8** Locked categories (`security_alert`, `password_changed`, `payment_failed`) bypass user preferences for the `in_app` channel.

### API

- [ ] **AC-9** `GET /api/client/notifications` — paginated list with `tab`, `type`, `priority`, `q`, `dateFrom`, `dateTo`, `cursor`. Returns `{ notifications, nextCursor, unreadCount }`.
- [ ] **AC-10** `GET /api/client/notifications/stats` — returns `{ total, unread, byTab: { all, unread, mentions, system } }`.
- [ ] **AC-11** `PATCH /api/client/notifications/[id]` — toggles `isRead`; owner-only.
- [ ] **AC-12** `POST /api/client/notifications/mark-all-read` — owner-scoped UPDATE.
- [ ] **AC-13** `POST /api/client/notifications/bulk` — body `{ ids?, filter?, action: 'read'|'unread'|'archive'|'delete' }`.
- [ ] **AC-14** `GET|PUT /api/client/notifications/preferences` — returns/writes the JSONB matrix.
- [ ] **AC-15** `GET /api/client/notifications/stream` — SSE; pushes `notification` events whenever a row is dispatched for the authenticated user. Heartbeat every 25 s; aborts cleanly on client disconnect.

### UI

- [ ] **AC-16** Header **bell** with capped `99+` badge appears for authenticated users in both desktop and mobile navbars. Pulse animation only on first arrival of a session. Hidden when count is 0.
- [ ] **AC-17** Dropdown has 3 tabs (**All / Unread / System**), day-section headers (Today, Yesterday, This week, Earlier), and a "See all notifications" footer link to `/client/notifications`.
- [ ] **AC-18** Each card supports optimistic mark-read; failed mutations revert with a toast. Unread state is visually distinct (left border + dot + tinted background).
- [ ] **AC-19** Card icon and accent color are derived from `(type, priority)` via a single mapping module — no per-component conditionals.
- [ ] **AC-20** Mobile (`<768 px`): bell opens a full-height drawer; swipe-left on a card reveals Mark-read + Delete actions.
- [ ] **AC-21** `/client/notifications` page reuses the same primitives as the dropdown (`NotificationList`, `NotificationCard`); URL-bound filters round-trip (refresh restores state).
- [ ] **AC-22** Preferences page renders the matrix grouped by category (collapsible), with locked rows disabled and labeled. Save is debounced; success toasts after 400 ms.
- [ ] **AC-23** Empty state (illustration + copy + CTA), loading skeletons (5 placeholder cards), and an inline error retry banner are wired in for every list surface.

### Real-time

- [ ] **AC-24** When the user is signed in on any `[locale]/client/**` route, a single `<NotificationStreamProvider>` opens an `EventSource` to `/api/client/notifications/stream` and pushes received events into the TanStack Query cache (`['client', 'notifications', ...]`).
- [ ] **AC-25** Reconnect uses native EventSource backoff. Heartbeats keep the connection alive through proxies.

### Accessibility

- [ ] **AC-26** Bell button has `aria-label="Notifications, {n} unread"`; badge is `aria-hidden`. Dropdown is `role="dialog"` with trapped focus and Esc-to-close.
- [ ] **AC-27** A polite `aria-live` region announces new notifications when the dropdown is closed; throttled to one announcement per 5 s.
- [ ] **AC-28** All animations respect `prefers-reduced-motion` (collapse to opacity fade).

### Definition of done

- [ ] **AC-29** `pnpm lint`, `pnpm tsc --noEmit`, and `pnpm build` all pass.
- [ ] **AC-30** Spec indexed in `docs/spec/README.md`, log entry appended to `docs/log.md` referencing this PR.

## 6. Type enum additions

New values added to the `notifications.type` enum (existing 7 values are preserved). v2 trims the original 22-type proposal down to the **8 types with a clear implementation hook** in this codebase — speculative types (mentions, replies, reactions, reviews, ratings, content-lifecycle variants beyond approved/rejected, sponsor_*, subscription renew/cancel, new_login) were removed:

```
comment_received, item_approved, item_rejected,
payment_succeeded, subscription_expiring,
security_alert, password_changed, admin_announcement
```

Total notification types: **15** (7 legacy admin + 8 new). The **Mentions tab** was also dropped since no remaining type qualifies — tabs are now **All / Unread / System**.

Priority + category + default channel matrix is encoded in
`apps/web/lib/notifications/registry.ts` so a single edit changes both UI and dispatch behavior.

## 7. Real-time delivery

Recommended: **SSE** via Next.js route handler with an in-memory pubsub fallback (single-pod self-hosted deployments) and a Redis pubsub when `REDIS_URL` is set (multi-pod). Supabase Realtime is listed as a future-proof secondary; a dedicated WS server is rejected as over-engineered for this scale.

## 8. Open questions

- **Q1** Push notifications timing — v1 ships preference UI with the column disabled; provider work is a follow-up.
- **Q2** Retention — current proposal: archive at 90 days, hard-delete at 365. Configurable via env in a follow-up.
- **Q3** Mention parsing in comments — reuses TipTap mention extension when 028 lands.
