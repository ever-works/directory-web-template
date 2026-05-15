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
