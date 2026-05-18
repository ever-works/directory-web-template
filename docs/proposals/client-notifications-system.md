# Client Notifications System — Design Proposal

> Status: **Draft proposal — no code changes yet.** This document is the design contract; implementation will follow in subsequent PRs once we agree on scope.

## 0. Why this proposal exists

We already have a working **admin** notification flow in this repo:

- Drizzle table `notifications` (`apps/web/lib/db/schema.ts` ~line 615), with enum `type`, `isRead`, `data`, `tenantId`.
- `NotificationService` (`apps/web/lib/services/notification.service.ts`) — DB CRUD.
- `EmailNotificationService` (`apps/web/lib/services/email-notification.service.ts`) — email dispatch via Novu (`apps/web/lib/mail/novu.ts`).
- Admin UI: `components/admin/admin-notifications.tsx` + `useAdminNotifications` hook.
- Admin API routes: `/api/admin/notifications`, `/api/admin/notifications/mark-all-read`, `/api/admin/notifications/[id]/read`.

The **client** (end-user) side has nothing yet — no inbox, no dropdown, no preferences, no real-time. This proposal extends the existing skeleton instead of starting fresh: same table, same service patterns, same UI primitives. It only adds what is genuinely missing.

What is intentionally **out of scope** for this proposal: changing the admin UX, replacing Novu, introducing a new ORM or websocket stack, building a hosted inbox. Anything that would invalidate existing work.

---

## 1. Notification Types

The current enum has 7 values, mostly admin-targeted. We expand it so the same table serves both audiences and supports the events the user asked for. **Adding a value** is a Drizzle migration; we group them by category for clarity.

| Category | `type` value | Audience | Priority | Icon (lucide) | Default channels |
|---|---|---|---|---|---|
| **Social** | `user_followed` | recipient | low | `UserPlus` | in_app, email (daily digest) |
| | `user_mentioned` | mentioned user | high | `AtSign` | in_app (instant), email, push |
| | `comment_received` | item owner / parent author | medium | `MessageSquare` | in_app, email (digest) |
| | `comment_reply` | parent comment author | medium | `CornerDownRight` | in_app, email |
| | `reaction_received` | comment / item author | low | `Heart` | in_app (batched) |
| | `review_received` | item owner | medium | `Star` | in_app, email |
| | `rating_received` | item owner | low | `Star` | in_app (batched) |
| **Item lifecycle** | `item_submitted` *(existing: `item_submission`)* | admins | medium | `Inbox` | in_app, email |
| | `item_approved` | submitter | high | `CheckCircle2` | in_app, email, push |
| | `item_rejected` | submitter | high | `XCircle` | in_app, email |
| | `item_featured` | item owner | medium | `Sparkles` | in_app, email |
| | `item_published` | followers of submitter | low | `Globe` | in_app, email (digest) |
| **Moderation** | `comment_reported` *(existing)* | admins / author | medium | `Flag` | in_app, email |
| | `item_reported` *(existing)* | admins / owner | medium | `Flag` | in_app, email |
| | `content_removed` | author | high | `ShieldAlert` | in_app, email |
| **Billing** | `payment_failed` *(existing)* | account owner | critical | `AlertOctagon` | in_app, email, push |
| | `payment_succeeded` | account owner | low | `BadgeCheck` | email only (in_app off by default) |
| | `subscription_renewed` | account owner | low | `RefreshCw` | email only |
| | `subscription_expiring` | account owner | high | `Clock` | in_app, email |
| | `subscription_cancelled` | account owner | medium | `XCircle` | in_app, email |
| **Sponsorship** | `sponsor_ad_approved` | sponsor | medium | `Megaphone` | in_app, email |
| | `sponsor_ad_rejected` | sponsor | high | `Megaphone` | in_app, email |
| | `sponsor_ad_expiring` | sponsor | high | `Clock` | in_app, email |
| **Account & system** | `user_registered` *(existing)* | admins | low | `UserPlus` | in_app |
| | `security_alert` | user | critical | `ShieldAlert` | in_app, email, push — non-disableable |
| | `password_changed` | user | high | `KeyRound` | in_app, email — non-disableable |
| | `new_login` | user | medium | `LogIn` | in_app, email |
| | `system_alert` *(existing)* | targeted users | high | `AlertTriangle` | in_app |
| | `admin_announcement` | targeted users / segments | medium | `Megaphone` | in_app, email |

**Priority semantics** (drives UI affordances + delivery, *not* visual noise):

- `critical` — red badge, always shown at top of list, always sent in real-time on every enabled channel, cannot be muted (security/billing only).
- `high` — orange dot, real-time push, email even if user is on digest.
- `medium` — default. In-app real-time, email subject to digest preference.
- `low` — batched in-app (grouped after the first), email respects digest only.

**Admin announcement.** No new table — we use `notifications` with `type = 'admin_announcement'` and a fan-out helper: `notification.service.ts → broadcastAnnouncement({ segment, title, message, data, expiresAt? })`. Segment is `'all' | { roleIds?, userIds?, since? }`. Inserts happen in batches of 500 inside a transaction; for very large user sets we enqueue a Trigger.dev job (`apps/web/lib/background-jobs/triggers/`) so the request returns quickly.

---

## 2. UX / UI Design

### 2.1 Notification bell (header)

Lives in the existing `components/header/*`. Reuses HeroUI + Radix primitives already in the repo.

```
┌── Header ──────────────────────────────────────────────┐
│  Logo   Nav…                          🔍   🔔 [3]  👤  │
└────────────────────────────────────────────────────────┘
                                          ▼
                            ┌──────────────────────────────────┐
                            │ Notifications              ⚙ ⋯  │
                            │ ┌─────┬─────┬───────┬─────────┐ │
                            │ │ All │Unread│Mentions│ System │ │
                            │ └─────┴─────┴───────┴─────────┘ │
                            │  ───────────────────────────────│
                            │  ● Today                         │
                            │   ┌────────────────────────────┐ │
                            │   │👤 Sarah liked your review  │ │
                            │   │   on "Acme CRM"  ·  2m     │ │
                            │   └────────────────────────────┘ │
                            │   ┌────────────────────────────┐ │
                            │   │💬 3 new comments on your   │ │
                            │   │   submission · 14m         │ │
                            │   └────────────────────────────┘ │
                            │  ───────────────────────────────│
                            │  ○ Earlier                       │
                            │   …                              │
                            │  ───────────────────────────────│
                            │   [ Mark all as read ]           │
                            │   [ See all notifications →  ]   │
                            └──────────────────────────────────┘
```

- **Badge** — count of unread, capped at `99+`. Pulse animation only on the first arrival, not on every render. Hidden when count is 0.
- **Tabs**:
  - **All** — everything not deleted.
  - **Unread** — `is_read = false`.
  - **Mentions** — `type IN ('user_mentioned', 'comment_reply')`.
  - **System** — `type IN ('security_alert', 'system_alert', 'admin_announcement', 'password_changed', 'new_login', 'payment_failed', ...)` — the “important but not social” bucket.
- **Width** 380px desktop, full-width drawer on mobile (`<768px`). Closes on Esc, outside click, route change.
- **Settings gear** — links to `/client/notifications/preferences`.
- **Overflow menu** — “Mark all as read”, “Pause notifications for 1h / 4h / today”.

### 2.2 Card design

Each item is a `<NotificationCard>` — composable around a left **icon/avatar slot**, body, optional thumbnail, time.

```
┌─────────────────────────────────────────────────────────┐
│  ●  [👤 avatar / 🔔 icon]   Title text in bold          │
│                              Secondary message, 2 lines │
│                              max with line-clamp…       │
│                              [Primary action] · 14m ago │
└─────────────────────────────────────────────────────────┘
```

- **Unread state** — left border 2px accent + tiny `●` dot at top-left + slightly stronger background (`bg-muted/40`). Read state strips both.
- **Avatar slot** — user avatar for social events, icon chip (priority-tinted) for system events.
- **Hover state** — `bg-muted`, cursor pointer, action icons (mark read, dismiss, snooze) fade in on the right. On touch devices these live behind swipe gestures instead — never both, to avoid mystery-icon clutter.
- **Click** — navigates via `data.actionUrl`, optimistically marks read, closes dropdown.
- **Time** — `formatDistanceToNow` (already used in admin UI) with `addSuffix: true`, locale aware via existing `next-intl` setup.

### 2.3 Grouping / batching

Two distinct strategies, both done at **read time** (cheap, no scheduled jobs needed). We never collapse across types.

1. **Same-actor / same-target collapse**
   - `2+` `reaction_received` for the same item within 24h → "Sarah and 4 others liked your review on *Acme CRM*".
   - Implementation: `GROUP BY type, data->>'targetId'` in the query when `aggregate=true`. The card stores the most recent actor's avatar + count.
2. **Day section headers**
   - `Today`, `Yesterday`, `This week`, `Earlier` — purely visual.

Grouping is a **view concern**. Underlying rows stay flat so a future "ungroup" toggle is trivial.

### 2.4 States

- **Loading** — skeleton: 5 card-shaped placeholders with shimmer (reuse existing `Skeleton` primitive from `@/components/ui`). No spinner.
- **Empty (all)** — illustration (lucide `BellOff`), title "You're all caught up", body "We'll let you know when something new happens." CTA to `/client/notifications/preferences`.
- **Empty (filtered, e.g. Mentions)** — softer copy: "No mentions yet."
- **Error** — inline retry banner, never blocks the dropdown from opening.
- **Offline** — banner "You're offline. Showing cached notifications." Cached set comes from TanStack Query.

### 2.5 Mobile interactions

- Tap bell → full-height sheet (`Drawer` from existing HeroUI / Radix wrappers).
- **Swipe left on a card** → reveals two actions: `Mark read` (blue) and `Delete` (red). Swipe threshold 40% width.
- **Swipe right** → archive (soft-delete `archivedAt`).
- Long-press → multi-select mode (same as desktop `Shift+click`).
- Pull-to-refresh on the `/client/notifications` page only (don't add it inside the dropdown — feels wrong in an overlay).

### 2.6 Animations (Framer Motion — already in deps)

- New row enter: `y: -8 → 0`, `opacity: 0 → 1`, 180ms ease-out.
- Mark-as-read: cross-fade left border to transparent, 120ms — *not* a slide.
- Group expand/collapse: height auto + `AnimatePresence`.
- Bell shake: only on first unread of a session, 600ms, single shake — never on every arrival.

Keep it subtle. Notifications must not feel like a slot machine.

### 2.7 Optimistic updates

- **Mark read** — flip flag in TanStack Query cache, decrement unread count, send `PATCH`. On failure, revert + toast.
- **Delete / archive** — remove from list, send `DELETE`. On failure, splice back at original index with fade-in.
- **Bulk** — same pattern with a single `POST /api/client/notifications/bulk`.

---

## 3. Information Architecture

### 3.1 Routes

```
app/[locale]/client/
  notifications/
    page.tsx                  ← inbox (full list, filters, search)
    preferences/page.tsx      ← per-type channel matrix + quiet hours
    [id]/page.tsx             ← deep-link / share view (rarely used; mostly redirects to data.actionUrl)
```

API:

```
app/api/client/notifications/
  route.ts                    GET (list, paginated) · POST (test send — dev only)
  stats/route.ts              GET unread + counts per tab
  bulk/route.ts               POST  body: { ids?, filter?, action: 'read'|'unread'|'archive'|'delete' }
  mark-all-read/route.ts      POST
  preferences/route.ts        GET · PUT
  [id]/route.ts               GET · PATCH (read/unread) · DELETE
  stream/route.ts             GET (SSE; see §4.5)
```

These mirror the existing `/api/admin/notifications/*` shape verbatim — same response envelope, same TanStack Query keys (`['client', 'notifications', ...]`).

### 3.2 `/client/notifications` page

```
┌────────────────────────────────────────────────────────────┐
│ Notifications                          [Preferences] [⋯]   │
│                                                            │
│ ┌─Tabs───────────────────────────────────────────────────┐ │
│ │ All (28)  Unread (5)  Mentions (1)  System (3)         │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─Filters bar────────────────────────────────────────────┐ │
│ │ 🔍 Search…   Type ▾   Priority ▾   Date ▾   ☑ Unread  │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ [ ] Select all (28)     [Mark read] [Archive] [Delete]    │
│                                                            │
│ ●  Today                                                   │
│   ┌──────────────────────────────────────────────────┐    │
│   │ [ ] 👤 Sarah liked your review on "Acme"     2m  │    │
│   └──────────────────────────────────────────────────┘    │
│   …                                                        │
│ ○  This week                                               │
│   …                                                        │
│                                                            │
│            [ Load more ]   (or infinite scroll)            │
└────────────────────────────────────────────────────────────┘
```

- **Filters**: type (multi-select), priority, date range (presets: today / 7d / 30d / all), read state. URL-bound (`?type=comment_reply&unread=1`) so filters are shareable / bookmarkable.
- **Search**: server-side ILIKE on `title || message`, debounced 300ms, paginated.
- **Infinite scroll** via TanStack `useInfiniteQuery` + `IntersectionObserver`. Use `@tanstack/react-virtual` (already in deps) once a list crosses ~200 rendered rows.
- **Bulk**: checkbox per row + sticky action bar. Action bar shows count and clears on success.

### 3.3 `/client/notifications/preferences`

A matrix: rows = notification categories (collapsible groups of types), columns = channels.

```
┌──────────────────────────────────────────────────────────────┐
│ Notification preferences                          [ Save ]   │
│                                                              │
│  Email digest:  ◯ Instant   ● Daily   ◯ Weekly   ◯ Off       │
│  Quiet hours:   [22:00] — [07:00]   Timezone: Europe/Berlin  │
│                                                              │
│  ─── Social ─────────────────────────────────────────────    │
│                          In-app   Email   Push   SMS         │
│  New follower             [✔]     [✔]    [ ]    [ ]          │
│  Mention                  [✔]     [✔]    [✔]   [ ]          │
│  Comment received         [✔]     [✔]    [ ]    [ ]          │
│  Reaction                 [✔]     [ ]    [ ]    [ ]          │
│  …                                                           │
│                                                              │
│  ─── Item lifecycle ────────────────────────────────────     │
│  …                                                           │
│                                                              │
│  ─── Account & security ────────────────────────────────     │
│  Security alert           [✔]     [✔]    [✔]   [ ]           │
│      (locked — required for account safety)                  │
└──────────────────────────────────────────────────────────────┘
```

- **Locked rows**: `security_alert`, `password_changed`, `payment_failed` — UI disables the checkbox + tooltip explains why.
- Saving writes the whole matrix as a JSONB blob (`notificationPreferences.preferences`) — one row per user. Simpler than a row-per-type design and cheap to read on every dispatch.

---

## 4. Backend architecture

### 4.1 Database schema changes

We extend the **existing** `notifications` table (additive only — no breaking change to admin code) and add two new tables.

```ts
// apps/web/lib/db/schema.ts

// EXISTING table — add columns:
export const notifications = pgTable('notifications', {
  // …existing columns…
  type: text('type', {
    enum: [
      // existing
      'item_submission', 'comment_reported', 'item_reported',
      'user_registered', 'user_followed', 'payment_failed', 'system_alert',
      // new
      'user_mentioned', 'comment_received', 'comment_reply',
      'reaction_received', 'review_received', 'rating_received',
      'item_approved', 'item_rejected', 'item_featured', 'item_published',
      'content_removed', 'payment_succeeded', 'subscription_renewed',
      'subscription_expiring', 'subscription_cancelled',
      'sponsor_ad_approved', 'sponsor_ad_rejected', 'sponsor_ad_expiring',
      'security_alert', 'password_changed', 'new_login', 'admin_announcement'
    ]
  }).notNull(),
  // NEW columns:
  priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] })
    .notNull().default('medium'),
  category: text('category', {
    enum: ['social', 'item', 'moderation', 'billing', 'sponsorship', 'account', 'system']
  }).notNull(),
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  // aggregation key — same (type, actorId?, targetId) within window collapses
  groupKey: text('group_key'),
  archivedAt: timestamp('archived_at', { mode: 'date' }),
  deliveredChannels: text('delivered_channels').array(), // ['in_app','email']
}, (table) => ({
  // existing indexes…
  unreadIdx: index('notifications_user_unread_idx')
    .on(table.userId, table.isRead, table.createdAt.desc())
    .where(sql`is_read = false AND archived_at IS NULL`),
  groupKeyIdx: index('notifications_group_key_idx').on(table.userId, table.groupKey),
}));
```

Two important indexes:
- `notifications_user_unread_idx` — partial index on `(userId, createdAt DESC) WHERE is_read = false AND archived_at IS NULL`. This is what the bell badge query and the Unread tab both use.
- `groupKeyIdx` — supports the de-dupe / collapse query.

```ts
// NEW
export const notificationPreferences = pgTable('notification_preferences', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  // JSONB: { 'user_mentioned': { in_app: true, email: true, push: true, sms: false }, … }
  preferences: jsonb('preferences').$type<NotificationPreferencesMap>().notNull().default({}),
  emailDigest: text('email_digest', { enum: ['instant', 'daily', 'weekly', 'off'] })
    .notNull().default('instant'),
  quietHoursStart: text('quiet_hours_start'),     // 'HH:mm'
  quietHoursEnd: text('quiet_hours_end'),
  timezone: text('timezone').notNull().default('UTC'),
  pushEnabled: boolean('push_enabled').notNull().default(false),
  pushTokens: jsonb('push_tokens').$type<WebPushSubscription[]>().notNull().default([]),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// NEW — optional, for retry/audit
export const notificationDeliveries = pgTable('notification_deliveries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  notificationId: text('notification_id').notNull()
    .references(() => notifications.id, { onDelete: 'cascade' }),
  channel: text('channel', { enum: ['in_app', 'email', 'push', 'sms', 'webhook'] }).notNull(),
  status: text('status', { enum: ['pending', 'sent', 'failed', 'skipped'] }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  notifIdx: index('notification_deliveries_notif_idx').on(t.notificationId),
}));
```

`notificationDeliveries` is **optional** for v1 — Novu already tracks email delivery on its side. We add it when we begin sending push/SMS or want a single source of truth for "did this user actually get notified".

### 4.2 Read/unread tracking

- `isRead boolean` + `readAt timestamp` already exist on `notifications`. We keep that.
- Unread count is computed by the partial index above. A single query: `SELECT count(*) FROM notifications WHERE user_id = $1 AND is_read = false AND archived_at IS NULL`.
- We **do not** maintain a denormalized counter. Premature; the partial index is fast enough into the millions.
- Mark-read endpoint flips both `isRead` and `readAt` in one update.
- `PATCH /api/client/notifications/[id]` accepts `{ isRead: true | false }` so users can mark unread too.

### 4.3 Service layer

Extend `NotificationService` rather than replace it. Add a thin dispatcher:

```ts
// apps/web/lib/services/notification.service.ts
class NotificationService {
  // existing static create(), createItemSubmissionNotification(), …

  static async dispatch(event: NotificationEvent) {
    // 1. resolve recipients (already known, or computed by event type)
    // 2. compute groupKey + dedupe within window
    // 3. apply user preferences (which channels are on, digest, quiet hours)
    // 4. write `notifications` rows in a transaction (batched insert)
    // 5. for non-in_app channels, enqueue Trigger.dev jobs
    // 6. publish realtime fan-out (see §4.5)
  }

  static async broadcastAnnouncement(opts: BroadcastOptions) { /* §1 */ }
}
```

Each call site (comments controller, follow controller, etc.) calls `NotificationService.dispatch({ type, recipientId(s), actor, target, data })` — no direct DB writes from feature code.

### 4.4 Batching & grouping

- **Reactions** are the spammiest event. We **dedupe at write time** using `groupKey = type:targetId` and a 5-minute window:
  - If a row with the same `(userId, groupKey)` exists and is unread, we update its `updatedAt` + bump `data.actorCount` instead of inserting.
  - If it's read, we insert a new one. Read state ends the window.
- **Email** uses a separate batching layer: `emailDigest` preference. The Trigger.dev `notificationDigest` job (scheduled hourly) gathers unsent notifications for `daily`/`weekly` subscribers and sends one templated email.

### 4.5 Real-time delivery

Three options, ordered by cost-to-benefit:

| Option | Setup cost | Ops cost | Fit for this repo |
|---|---|---|---|
| **(A) SSE** via Next.js route handler (`/api/client/notifications/stream`) | low | low — runs in the existing Next.js process | **Recommended.** Already supported by the Next.js runtime, no new infra, works on Vercel and on our DO clusters. |
| (B) Supabase Realtime (Postgres logical replication) | low | low — we're already on Supabase | Good fallback if we want push for other tables too. Subscribes to `notifications` row inserts directly. |
| (C) Dedicated WS server (e.g. Socket.IO) | high | needs sticky sessions + separate deployment | Overkill. |

**Recommended path:** **SSE first**, with Supabase Realtime as a future-proof secondary if multi-tab sync becomes a pain point.

SSE implementation sketch:

```ts
// app/api/client/notifications/stream/route.ts
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response('unauthorized', { status: 401 });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (evt: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`));

      // heartbeat every 25s — keeps proxies from killing the connection
      const hb = setInterval(() => send('ping', { t: Date.now() }), 25_000);

      // subscribe to in-memory pubsub keyed by userId
      const unsub = notificationPubSub.subscribe(session.user.id, (n) => send('notification', n));

      req.signal.addEventListener('abort', () => { clearInterval(hb); unsub(); controller.close(); });
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' },
  });
}
```

`notificationPubSub` is a Redis pub/sub if `REDIS_URL` is set (multi-pod safe), otherwise an in-process `EventEmitter` (single-pod fallback for self-hosted SQLite-like deployments). `dispatch()` publishes to it.

**Client side**: a single `<NotificationStreamProvider>` in `app/[locale]/client/layout.tsx` opens the EventSource and pushes events into TanStack Query cache via `queryClient.setQueryData`. Reconnect uses native EventSource backoff.

### 4.6 Rate limiting

- **Per-user write rate**: max 10 notification *inserts* per user per second across all types, enforced in `dispatch()` via a Redis token bucket. Prevents an event storm (e.g. someone scripting "follow" toggles) from filling someone's inbox.
- **Per-API**: `/api/client/notifications/*` endpoints sit behind the existing middleware rate limiter. Reads: 60/min. Writes (bulk, mark-read): 30/min.
- **Real-time**: SSE connection limit 3 per user (one per active tab is fine, beyond that we close oldest).

### 4.7 Queue + retries

We already have Trigger.dev wired up (`apps/web/lib/background-jobs/triggers/`). We add three jobs:

- `notification.deliver` — input `{ notificationId, channel }`. Idempotent. Retries 3× with exponential backoff (5s, 30s, 5min). On final failure writes `notificationDeliveries.status = 'failed'`.
- `notification.digest` — scheduled hourly. Groups due notifications per user, renders one email via existing Novu workflow.
- `notification.cleanup` — daily. Archives notifications older than 90 days, hard-deletes archived older than 1 year. Configurable via env.

The `in_app` channel is **synchronous** (write to DB + fan out via pub/sub) because users expect the bell to update instantly. Only off-platform channels (email, push, SMS) go through the queue.

### 4.8 Failure handling

- Service-layer errors **never** block the originating action. If a user posts a comment and notification dispatch throws, the comment still saves; we log via Sentry (already in the repo) and continue. `dispatch()` is wrapped in a `try/catch` at every call site, and itself swallows known transient errors.
- A dead-letter equivalent is `notificationDeliveries.status = 'failed'` after exhausted retries — visible to admins via a future panel, not user-facing.
- Idempotency keys on `dispatch()` (`type:actorId:targetId:eventTimestamp` rounded to the minute) prevent duplicate inserts on webhook replays.

---

## 5. Developer Experience

### 5.1 Folder structure

```
apps/web/
  app/
    [locale]/client/notifications/
      page.tsx
      preferences/page.tsx
      _components/
        notifications-page-shell.tsx
        notifications-empty.tsx
    api/client/notifications/...           (see §3.1)
  components/
    notifications/                         ← NEW shared module
      notification-bell.tsx                ← header trigger + badge
      notification-dropdown.tsx            ← popover content
      notification-tabs.tsx
      notification-card.tsx                ← presentational; consumes Notification
      notification-card-skeleton.tsx
      notification-list.tsx                ← virtualized list with day-group headers
      notification-filters.tsx
      notification-bulk-actions.tsx
      notification-preferences-form.tsx
      icons/                               ← lucide icon mapping per type
        index.ts                           ← getIcon(type) + getColor(priority)
      group-utils.ts                       ← collapseGroups(), sectionByDay()
      provider.tsx                         ← <NotificationStreamProvider>
      types.ts                             ← UI-facing types (re-export from lib/types)
  hooks/
    use-notifications.ts                   ← list + pagination (TanStack)
    use-notifications-stats.ts             ← unread counts
    use-mark-notification.ts               ← optimistic mark read / unread
    use-bulk-notifications.ts
    use-notification-preferences.ts
    use-notification-stream.ts             ← EventSource wrapper
  lib/
    services/notification.service.ts       ← EXTEND, don't replace
    services/notification-dispatch.ts      ← NEW: dispatch() + groupKey logic + pubsub
    notifications/
      pubsub.ts                            ← Redis or in-memory
      preferences.ts                       ← resolve channels per (user, type)
      digest-renderer.ts
    background-jobs/triggers/
      notification-deliver.ts
      notification-digest.ts
      notification-cleanup.ts
    types/notifications.ts                 ← shared types (event payloads, channel, etc.)
```

`components/notifications/*` is intentionally **audience-agnostic**. The admin UI can migrate onto it later (separate PR) — same primitives, different data hook.

### 5.2 TypeScript types

Single source of truth in `lib/types/notifications.ts`:

```ts
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationCategory = 'social' | 'item' | 'moderation' | 'billing' | 'sponsorship' | 'account' | 'system';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms' | 'webhook';

// Discriminated union — per-type payload guarantees IntelliSense at call sites.
export type NotificationEvent =
  | { type: 'user_followed';      recipientId: string; actorId: string; data: { followerUsername: string } }
  | { type: 'comment_received';   recipientId: string; actorId: string; data: { itemSlug: string; commentId: string; excerpt: string } }
  | { type: 'reaction_received';  recipientId: string; actorId: string; data: { targetType: 'comment' | 'item' | 'review'; targetId: string } }
  | { type: 'review_received';    recipientId: string; actorId: string; data: { itemSlug: string; rating: number } }
  | { type: 'item_approved';      recipientId: string; data: { itemSlug: string; itemName: string } }
  | { type: 'security_alert';     recipientId: string; data: { eventCode: 'new_device' | 'password_reset' | 'mfa_disabled'; ip?: string; ua?: string } }
  | { type: 'admin_announcement'; recipientIds: string[] | 'all'; data: { title: string; body: string; cta?: { label: string; href: string } } }
  // …one variant per type
;

export interface NotificationPreferencesMap {
  [type: string]: Partial<Record<NotificationChannel, boolean>>;
}
```

The discriminated union forces every call site to provide the right `data` shape. `dispatch(event: NotificationEvent)` cannot be called with a wrong payload.

### 5.3 Reusable components — surface API

```tsx
<NotificationBell />                              // self-contained, reads session
<NotificationDropdown align="end" />              // composable inside Bell or standalone
<NotificationList                                 // used on /client/notifications + dropdown
  filter={filter}
  groupByDay
  virtualize                                     // >200 rows
  onItemClick={…}
/>
<NotificationCard notification={n} onMarkRead={…} />  // headless-ish — uses slots for icon, body, actions
<NotificationPreferencesForm initial={prefs} onSave={…} />
```

Every component accepts a `className` and forwards refs, matching the existing repo conventions.

### 5.4 Testing strategy

- **Unit (Vitest, already configured):**
  - `dispatch()` — preference resolution, group-key dedupe, idempotency.
  - `collapseGroups()`, `sectionByDay()` — pure functions, table-driven tests.
  - Reducers inside `useNotificationStream` (event → cache mutation).
- **Integration (Vitest + test DB):**
  - All `/api/client/notifications/*` routes — auth, pagination, filters, bulk actions, ownership checks.
  - Migration runs cleanly + index presence assertion.
- **Component (React Testing Library):**
  - `NotificationCard` — read / unread / grouped / empty data variants.
  - `NotificationDropdown` — tab switching, optimistic mark-read, error retry.
- **E2E (Playwright, already in `apps/web-e2e`):**
  - `notifications.spec.ts` — sign in, receive a notification (via test API), see badge, open dropdown, mark read, badge decrements, navigate to actionUrl.
  - `preferences.spec.ts` — toggle a channel off, dispatch the event, assert no in-app row created.
- **Load test (k6, optional):** dispatch 10k notifications in 60s, verify unread query latency < 50ms p95.

### 5.5 Accessibility

- Bell button: `aria-label="Notifications, {n} unread"`, badge marked `aria-hidden` (the label is the source of truth).
- Dropdown: `role="dialog"`, focus trapped, returns focus to bell on close, Esc closes.
- Tabs: native Radix `Tabs` (already in deps) — keyboard navigation comes for free.
- Cards: `role="listitem"` inside a `role="list"`; the whole card is a single focusable anchor with descriptive accessible name (`Liked your review on Acme CRM, 2 minutes ago`).
- Live region: `<div aria-live="polite" aria-atomic="false">` announces new notifications when the dropdown is closed and the user isn't typing. Throttled to one announcement per 5s.
- Color: priority pills never rely on color alone — each has an icon + text label.
- Motion: respects `prefers-reduced-motion` — animations collapse to opacity-only fades.
- Contrast: read/unread states tested at WCAG AA against both themes (light/dark already supported via HeroUI).

---

## 6. Rollout plan

Not part of the design per se but worth pinning down so the PRs that follow can land safely.

1. **PR 1 (schema + types).** Drizzle migration: enum expansion, new columns, new tables, indexes. Zero UI. Safe to merge first.
2. **PR 2 (service layer).** `dispatch()`, preference resolution, pubsub, idempotency. Existing admin code is untouched (still calls `NotificationService.create()`).
3. **PR 3 (client API routes).** `/api/client/notifications/*` with tests.
4. **PR 4 (UI primitives).** `components/notifications/*` (presentational only, Storybook-style page in `/docs`).
5. **PR 5 (bell + dropdown).** Wire into header. Feature flag off by default.
6. **PR 6 (inbox page).** `/client/notifications`.
7. **PR 7 (preferences page).** `/client/notifications/preferences`.
8. **PR 8 (real-time).** SSE route + provider. Optional Redis pubsub.
9. **PR 9 (background jobs).** Digest + cleanup + delivery retry.
10. **PR 10 (call-site wiring).** Replace direct notification inserts in comments / follows / reviews / item lifecycle with `dispatch()`.
11. **PR 11 (admin migration, optional).** Port admin UI onto shared components.

Each PR is independently reviewable and shippable. The user-visible bell does not appear until PR 5 lands, so the system can mature behind the scenes without UX regressions.

---

## 7. Open questions

These should be settled before PR 1 lands:

1. **Push channel** — do we want browser Web Push in v1, or defer? (Doc assumes deferred; column exists, jobs exist, UI shows it but flagged off.)
2. **Multi-tenancy fan-out** — `admin_announcement` segment "all" — scoped to the current tenant only, or cross-tenant? (Doc assumes tenant-scoped.)
3. **Retention** — 90 days archive, 1 year hard delete. OK? Configurable per tenant?
4. **Mentions parsing** — do we already have `@username` parsing in TipTap somewhere we can reuse, or does this proposal need to specify it?
5. **Redis** — is `REDIS_URL` guaranteed in self-hosted deployments? If not, the in-process pubsub fallback is correct but means real-time only works single-pod.

---

*Authored as a design draft. Reviewers — please leave inline comments on anything that conflicts with current direction, especially §1 type list, §4.1 schema, and §4.5 real-time choice.*
