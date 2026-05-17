---
id: spec-026-ew627-client-dashboard-wiring
title: 'Spec 026 — EW-627: /client/dashboard UI ↔ API wiring fixes'
sidebar_label: '026 Client Dashboard Wiring'
---

# Feature spec — `026-ew627-client-dashboard-wiring`

> **Status:** in-progress.
>
> **Owner:** Template maintainers.
>
> **Constitution articles invoked:** III (Spec Before Code), V (Performance Budget — small follow-ups), IX (Test Coverage Bar — Definition of Done).
>
> **Tracking issue:** [EW-627](https://evertech.atlassian.net/browse/EW-627).

## 1. Summary

Audit of `/client/dashboard` (page `apps/web/app/[locale]/client/dashboard/page.tsx`, repository
`apps/web/lib/repositories/client-dashboard.repository.ts`) found seven concrete gaps between the
rendered UI and the backing `GET /api/client/dashboard/stats` + map/geo endpoints. The data plumbing
is overall sound — a single `useDashboardStats` query feeds most of the page — but a handful of
fields are hardcoded, two cards swallow fetch errors, and a couple of headings bypass i18n.

Spec 026 fixes those wiring gaps without changing the dashboard layout or the underlying data
model.

## 2. Motivation

The dashboard ships data the user expects to be live. Specific problems found during the audit
filed as EW-627:

1. The engagement pie chart shows a "Shares" slice that is hardcoded to `0` because shares
   aren't tracked anywhere in the system. The slice is meaningless and misleading — it always
   renders as an invisible 0% wedge.
2. `viewsAvailable` is hardcoded to `true` in both the populated and empty stats paths. Its
   intent is to signal "view tracking is meaningful for this user"; the flag is currently a lie.
3. `ItemsMapCard` and `GeoStatsCard` return `null` on a fetch error. The cards silently vanish
   instead of telling the user something failed.
4. When `locationSettings.enabled === false`, the whole location section disappears with no
   explanation. Users with location features disabled at the directory level don't realise the
   section exists.
5. The engagement chart heading (`"Community Engagement"`) and the top-items heading
   (`"Top Performing Items"`) are hardcoded English. Every other chart heading uses
   `useTranslations()`.
6. `StatsCard.value` is typed `string | number` even though every call site passes a number,
   and `.toLocaleString()` only works correctly on the number branch.
7. `engagementOverview` always returns exactly 12 weeks (W1…W12) regardless of how much real
   data the user has. Users with sparse activity see a chart full of leading empty bars.

## 3. Out of scope

- Implementing share tracking. Spec 026 removes the placeholder slice; bringing it back requires
  a separate spec for share-event ingestion.
- Reworking the engagement chart visualisation. The pie chart, colours, and layout are unchanged.
- Adding new dashboard data sources. The only API contract change is the `engagementChartData`
  shape (see §4 AC-1) — every other endpoint is unchanged.
- A UI control to toggle `locationSettings.enabled`. The placeholder added in AC-4 points to the
  directory settings page; the toggle itself already exists there.
- Backfilling 21 locales for unrelated dashboard strings flagged in the wider audit. The 10 new
  keys introduced here are translated to all locales; pre-existing English-only strings on
  `/client/dashboard` are out of scope for this PR.

## 4. Acceptance criteria

- **AC-1:** `engagementChartData` items are `{ key: 'views' | 'votesReceived' | 'commentsReceived',
  value: number, color: string }`. The legacy `name` field is gone, and the `Shares` slice is no
  longer emitted. The OpenAPI swagger JSDoc for `GET /api/client/dashboard/stats` reflects the
  new shape.
- **AC-2:** `viewsAvailable` is `true` when the authenticated user owns at least one item
  (`userItems.length > 0`) and `false` otherwise. The empty-stats branch returns `false`.
- **AC-3:** `ItemsMapCard` and `GeoStatsCard` render an inline error UI when their fetch fails:
  card chrome, the card title, an `AlertTriangle` icon, the localized "Failed to load…" copy,
  and the `error.message` body. The cards no longer return `null` on error.
- **AC-4:** When `locationSettings.enabled === false`, `dashboard-content.tsx` renders a small
  dashed-border placeholder explaining that location insights are disabled, instead of emitting
  no node at all.
- **AC-5:** The engagement-chart title and the top-items title are rendered through
  `useTranslations()` against new `client.dashboard.ENGAGEMENT_CHART.*` and
  `client.dashboard.TOP_ITEMS.*` namespaces. Each pie slice's display name is also translated.
- **AC-6:** `StatsCardProps.value` is typed `number`; the formatter calls `.toLocaleString()`
  unconditionally.
- **AC-7:** `engagementOverview` returns an empty array when the user has zero submissions, and
  is trimmed to drop trailing all-zero weeks (the oldest end) when the user does have items
  but no activity in the oldest weeks. The full 12-week window is preserved for users with
  activity that far back.
- **AC-8:** All 10 new strings (`LOCATION_DISABLED_TITLE`, `LOCATION_DISABLED_DESC`,
  `ENGAGEMENT_CHART.{TITLE, VIEWS, VOTES_RECEIVED, COMMENTS_RECEIVED}`,
  `TOP_ITEMS.{TITLE, ID, NO_DATA, NO_DATA_DESC}`) live under `client.dashboard.*` in all 21
  supported locale files with real translations (no English-identical entries for non-English
  locales).
- **AC-9:** `pnpm lint` and `pnpm tsc --noEmit` pass for `@ever-works/web`.

## 5. Open questions

- Should `viewsAvailable` also factor in whether the deployment has view tracking configured at
  the DB layer (e.g. derived from the presence of `DATABASE_URL`)? Default: **no** — the current
  signal (`userItems.length > 0`) is the most meaningful one available without leaking server
  config into client state. If view tracking is ever made opt-in per directory, revisit.
- Should the trimmed `engagementOverview` always keep a minimum of 4 weeks for visual stability?
  Default: **no** — the consumers (`EngagementOverview`, `EngagementRateChart`,
  `PeriodComparison`) all handle short / empty arrays cleanly. Padding would re-introduce the
  empty-bars problem AC-7 fixes.
- Should the disabled-location placeholder include a deep link to the location settings page?
  Default: **no for this PR** — the settings route is admin-only; a non-admin user can't act on
  the link. A help-doc link can be added when the docs page exists.

## 6. Layout v2 — header / quick actions / alerts / mobile summary / tabs

Spec extended after the initial wiring fixes landed: the page was reshaped into a richer
landing surface with a personalized header (avatar + greeting), a quick-actions row, a
dismissible alert banner, a sticky mobile KPI bar, and four content tabs
(Overview / Content / Engagement / Geographic). `StatsCard` gained per-card trend deltas
(derived from `periodComparison`) and zero-state CTAs.

### 6.1 Acceptance criteria (additive)

- **AC-10:** `<DashboardHeader>` renders the user's avatar via `<Avatar>`, a greeting (Good
  morning / afternoon / evening) keyed off the local hour, a one-line subtitle, and Refresh +
  New Submission actions. Mobile collapses to icon-only buttons.
- **AC-11:** `<QuickActions>` renders four cards (New Submission, My Submissions, Billing,
  Settings) linking to existing routes under `/[locale]/`. All copy uses
  `client.dashboard.QUICK_ACTIONS.*` translation keys.
- **AC-12:** `<DashboardAlertBanner>` surfaces two alert types — pending-items (warning) and
  zero-submissions (info) — each with a CTA link and a dismiss button. Dismiss state persists
  in `localStorage` under `dashboard_dismissed_alerts`. Pending alert key includes the count
  so the banner re-shows when the count changes.
- **AC-13:** `<DashboardMobileSummary>` is a sticky top-of-viewport KPI bar visible only at
  `< sm` breakpoint. Each KPI shows an icon, the value, and a dedicated short label
  (`STATS.*_SHORT`) — **never the long label trimmed by `.split(' ').slice(-1)`**, since that
  trick produces broken labels in Russian, Arabic, Chinese, and any language where the
  meaningful word isn't the last token.
- **AC-14:** Page content is organised into four tabs (`overview`, `content`, `engagement`,
  `geographic`) using ARIA `tablist`/`tab`/`tabpanel`. Tab state is local
  (`useState<Tab>('overview')`). The Geographic tab renders the existing maps/geo cards or
  the location-disabled placeholder from AC-4.
- **AC-15:** `<StatsCard>` accepts an optional `trend` (computed from
  `periodComparison.change.*`) and an optional `emptyState` (shown when the value is `0`,
  with a CTA link to e.g. `/submit`).
- **AC-16:** `<Avatar>` (used by the header) sets `unoptimized={true}` for any external
  http/https URL so OAuth-provider avatars whose hostname isn't in
  `next.config.ts > images.remotePatterns` render via direct browser fetch instead of
  silently falling through to the gradient initials. Size is 32–48 px so the optimizer adds
  no value. Also drops the unconditional `priority` prop (Next.js warns when too many
  priority images render at once). `referrerPolicy="no-referrer"` is preserved for OAuth
  hotlink-protected images.
- **AC-17:** All 30 new strings under `client.dashboard.*` (`USER_FALLBACK`,
  `HEADER_SUBTITLE`, `NEW_SUBMISSION`, `GREETING.{MORNING, AFTERNOON, EVENING}`,
  `TABS.{LABEL, OVERVIEW, CONTENT, ENGAGEMENT, GEOGRAPHIC}`,
  `QUICK_ACTIONS.{SECTION_LABEL, NEW_SUBMISSION, NEW_SUBMISSION_DESC, MY_SUBMISSIONS,
  MY_SUBMISSIONS_DESC, BILLING, BILLING_DESC, SETTINGS, SETTINGS_DESC}`,
  `ALERTS.{REGION_LABEL, PENDING_ITEMS, VIEW_SUBMISSIONS, NO_SUBMISSIONS, SUBMIT_FIRST,
  DISMISS}`, `EMPTY.{SUBMISSIONS, SUBMIT_NOW, VIEWS, VOTES, COMMENTS}`) live in all 21
  locale files with real translations. The four
  `STATS.{TOTAL_SUBMISSIONS, TOTAL_VIEWS, VOTES_RECEIVED, COMMENTS_RECEIVED}_SHORT` short
  labels are also added to all 21 locales.

### 6.2 Out of scope for v2 (now superseded for charts by §7)

- A working period selector (`7d / 30d / 90d`). A toggle was prototyped but removed in this
  round because `useDashboardStats()` ignores the value — every period would have shown the
  same data, which is worse than not having the control. Re-adding requires plumbing
  `?days=N` through `GET /api/client/dashboard/stats` → `client-dashboard.repository.ts` →
  the date-range queries (`getRecentViewsCount`, `getDailyViewsData`, `getWeeklyEngagementData`,
  `getDailyActivityData`, `calculateRecentSubmissions`) and rethinking
  `periodComparison` semantics so the comparison matches the selected window. Tracked as a
  follow-up.
- An admin link from the location-disabled placeholder. The settings route is admin-only and
  most dashboard users can't act on the link.
- Migrating any of `<QuickActions>` / `<DashboardAlertBanner>` / `<DashboardMobileSummary>`
  to a server component. They depend on locale, session, or `localStorage` and are
  intentionally client-only.

## 7. Chart visual redesign

Round 5 redesigns the five primary analytics cards on `/client/dashboard` for a more
modern, SaaS-grade feel without changing any data flow or component props. A small
shared primitive module (`apps/web/components/dashboard/_chart-primitives.tsx`) holds
the chrome so all five cards stay visually consistent.

### 7.1 Shared primitives (`_chart-primitives.tsx`)

- `<ChartCard>` — card chrome with title, optional subtitle, optional `headerRight`
  slot, and a subtle `hover:border-neutral-300` transition. All five charts use it.
- `<ChartCardSkeleton>` — accessible skeleton with `aria-busy="true"` for the loading
  state; takes a `height` and optional `hasHeaderRight` flag.
- `<ChartEmptyState>` — dashed-border placeholder with circular icon, title, and
  description; sized to match the chart body so the card doesn't collapse.
- `<ChartLegend>` / `<ChartLegendItem>` — flexible colored-dot legend with optional
  trailing value (count or %).
- `<ChartKpi>` — right-aligned header KPI with optional change indicator.
- `<ChartTooltip>` — custom Recharts tooltip with backdrop blur, semi-transparent
  surface, colored series dots, and pluggable formatters; replaces the boxy default.
- `useChartAxisProps()` — theme-aware axis/grid colours and shared tick props.
- `formatCompactNumber(n)` — axis-tick formatter (1.2k / 3.4M).

### 7.2 Per-chart redesigns

- **Submission Timeline (`submission-timeline.tsx`)** — gradient-filled bars (using
  `SEMANTIC_COLORS.submissions`), rounded `[6,6,0,0]` corners, peak-month highlighted
  via fill opacity; new "Total" KPI in the header; custom tooltip; peak-month hint
  line below the chart; empty state when total is zero.
- **Submission Status (`status-breakdown.tsx`)** — replaced the cramped 3-slice pie
  with a horizontal stacked bar (h-3, rounded) over a per-status row list. Each row
  has a tinted icon chip (`CheckCircle2`/`Clock`/`XCircle`), count, and percentage,
  with hover-row affordance. Total KPI in the header. Stacked bar carries an
  `aria-label` summarising the split.
- **Weekly Activity (`activity-chart.tsx`)** — switched to a `ComposedChart` so
  "Views" renders as a soft area in the back while "Submissions" and "Engagement"
  render as crisp lines; custom legend in the header on desktop (and above the chart
  on mobile); custom tooltip; all three series labels now flow through
  `useTranslations()` (previously hard-coded English).
- **Community Engagement (`engagement-chart.tsx`)** — converted from a flat pie
  with overlapping labels to a donut with the total in the centre, plus a side
  legend with per-slice value and percent. Donut + legend stack vertically below
  `sm`, side-by-side above.
- **Approval Rate Trend (`approval-trend.tsx`)** — switched from the neutral grey
  palette to `SEMANTIC_COLORS.success`; trend-direction icon
  (`TrendingUp`/`TrendingDown`) next to the change value; 50% reference line for
  context; reformatted tooltip; new footer split (`Approved` / `Total`) replacing
  the previous one-line summary; richer empty state.

### 7.3 Acceptance criteria (additive)

- **AC-18:** All five chart components consume `<ChartCard>`, `<ChartCardSkeleton>`,
  `<ChartEmptyState>`, and `<ChartTooltip>` from `_chart-primitives.tsx`. No chart
  imports the raw `getTooltipStyles` helper from `styles.ts`.
- **AC-19:** Every chart renders an empty state via `<ChartEmptyState>` when its
  underlying data is all zeros / empty array.
- **AC-20:** Every chart-card body is responsive: charts use `ResponsiveContainer`,
  the engagement donut + side legend stack on `< sm`, and the activity legend moves
  from the header to above the chart on `< sm`.
- **AC-21:** All chart titles, subtitles, axis tooltips, legend labels, and empty
  states are sourced from next-intl keys under `client.dashboard.*` — no hard-coded
  English in any of the five components.
- **AC-22:** New i18n keys (29) are present in all 21 locale files with real
  translations: `SUBMISSION_TIMELINE.*` (7), `ACTIVITY_CHART.*` (7),
  `STATUS_BREAKDOWN.*` (7 additional beyond `TITLE`), `ENGAGEMENT_CHART.*` (4
  additional beyond the existing slice labels). `APPROVAL_TREND.*` already covered
  all needed keys from a prior round.
- **AC-23:** `pnpm tsc --noEmit` and `pnpm lint` pass for `@ever-works/web` with no
  new warnings in `components/dashboard/**` or the touched components.

### 7.4 Out of scope for §7

- Reskinning the secondary cards (`<PeriodComparison>`, `<CategoryPerformance>`,
  `<EngagementOverview>`, `<EngagementRateChart>`, `<EngagementDistribution>`,
  `<SubmissionCalendar>`, `<TopItems>`). They are not in the user's focus list and
  the same primitives are available for a follow-up pass when needed.
- Replacing Recharts with a different chart library. The primitives keep the
  rendering layer pluggable but no migration is in scope here.
- A user-facing toggle to choose chart density (compact / comfortable). The single
  density chosen here matches the rest of the dashboard surface.
