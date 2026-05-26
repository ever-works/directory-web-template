---
id: spec-034-client-billing-ui-consistency
title: 'Spec 034 — Client Billing page UI consistency'
sidebar_label: '034 Client Billing UI Consistency'
---

# Feature spec — `034-client-billing-ui-consistency`

> **Status:** in-progress.
>
> **Owner:** Template maintainers.
>
> **Jira:** [EW-649](https://evertech.atlassian.net/browse/EW-649).
>
> **Constitution articles invoked:** III (Spec Before Code),
> VII (Plugin-First / Reuse-What-Exists),
> IX (Test Coverage Bar — Definition of Done).

## 1. Summary

The billing page at `/client/settings/profile/billing` and its
sub-components used a different visual language from the rest of the
client area: gradient KPI cards, `theme-primary`-tinted icon tiles,
`slate`/`gray` text palettes, a boxed multi-line tab bar, and
gradient/`theme-primary` buttons.

This spec realigns the page with the **client dashboard**
(`/client/dashboard`), which is the canonical design system for the
client area (`components/dashboard/styles.ts`, `stats-card.tsx`,
`dashboard-header.tsx`, `quick-actions.tsx`): a **neutral** palette,
`bg-white dark:bg-white/3` card surfaces with
`border-neutral-200 dark:border-white/8`, **monochrome** icon tiles
(`p-2 bg-neutral-100 dark:bg-white/8` + `text-neutral-500`),
`neutral-900 / white` primary CTAs, and a minimal underline tab bar.
**No functional or data behaviour changes.**

## 2. Motivation

- **Visual parity with the dashboard.** The dashboard is the reference
  for client-area "blocks, buttons, icons". The billing page diverged on
  every axis, so it looked like a different product.
- **Monochrome / neutral system.** The dashboard KPIs are monochrome
  (neutral icon tiles, neutral values); status colour lives on small
  badges, not on whole cards. The old billing KPIs were full-colour
  gradient cards.
- **Maintainability.** Centralising on the dashboard token set keeps the
  page in lockstep with theme changes.
- Primary user: the end-user (client) viewing billing / subscription.

## 3. Goals

- Card surfaces use `bg-white dark:bg-white/3` +
  `border-neutral-200 dark:border-white/8` (the dashboard
  `CARD_BASE_STYLES`), not bespoke `dark:bg-[#111111]` / shadcn `bg-card`.
- KPI tiles mirror the dashboard `StatsCard`: neutral card, monochrome
  icon tile, `text-xl font-semibold` value, neutral label — no gradients
  or hover-scale.
- Header mirrors `DashboardHeader`: icon tile + title on the left,
  `Button` (outline) + neutral-900/white primary CTA on the right.
- Tab bar mirrors the dashboard underline tabs (neutral, animated active
  underline, neutral count badge).
- Palette is **neutral** end-to-end (no `slate`, no `theme-primary`
  accents); primary buttons are `bg-neutral-900 dark:bg-white`.
- Remaining hardcoded strings on the page route through the `billing`
  i18n namespace.
- Preserve light/dark parity, responsiveness, and all functionality.

## 4. Non-Goals

- No changes to billing data fetching, payment providers, or the
  subscription/payment APIs.
- No change to the page's information architecture (plan card → stats →
  tabs → sections).
- No new dependencies.

## 5. User Stories

```text
As a client, I want the billing page to look and behave like my
dashboard, so that the client area feels like one coherent product.

As a non-English user, I want the billing page's page-level labels
translated, so that the settings area reads in my language.
```

## 6. Acceptance Criteria

- [ ] AC-1: No `dark:bg-[#111111]`, `slate-*`, or `theme-primary-*`
      classes remain in `components/settings/billing/**` or the page.
- [ ] AC-2: KPI cards (`billing-stats.tsx`) render as neutral
      dashboard-style `StatsCard`s (monochrome tile, neutral value), not
      gradient cards.
- [ ] AC-3: Header matches `DashboardHeader` (icon tile + title left,
      outline `Button` + neutral-900/white primary CTA right).
- [ ] AC-4: Tab bar matches the dashboard underline tabs with neutral
      count badges and i18n labels.
- [ ] AC-5: New i18n keys (`FREE`, `UPGRADE`, `RENEWS_ON`,
      `UPGRADE_UNLOCK_FEATURES`, `DAYS_LEFT`, `DAYS_TOTAL`) exist in
      `messages/en.json`; non-English locales fall back via the existing
      `deepmerge` config.
- [ ] AC-6: Light and dark modes both render correctly; layout stays
      responsive.
- [ ] AC-7: No behavioural change — tabs, refresh, export, manage-plan,
      loading and empty states behave exactly as before.

## 6b. Action wiring (follow-up, same PR)

Previously-dead placeholder controls were connected to real behaviour:

- **Export** (header) and **Export Results** (search) → client-side CSV
  download via `lib/utils/billing-csv.ts` (`exportPaymentsCsv`), exporting
  all / filtered payments respectively. No new endpoint.
- **View History** (KPI block) → switches to the Payment History tab
  (`onViewHistory` → `setActiveTab('payments')`).
- **Status filter checkboxes** were selected but never applied; lifted to
  the page (`selectedStatuses`/`onStatusChange`) and now filter the list.
- **Date Range** → opens the advanced-filters panel (no longer inert).
- **Download** (payment card) → downloads `invoiceUrl` (shown only when an
  invoice URL exists).
- **Cancel Plan** (LemonSqueezy) → real `POST /api/lemonsqueezy/cancel`
  via the existing `useSubscriptionActions` hook (confirm + toast +
  refresh); removed the `console.log` placeholder and the orphaned
  `isModifyModalOpen` state.
- **Modify Plan** (LemonSqueezy) → links to `/pricing` (canonical
  plan-change surface; no in-card plan picker existed).
- **View Details** (payment + subscription-history cards) → toggles a
  details disclosure.
- **Contact Support** → `mailto:` the configured support address with a
  context-bearing subject.

## 7. Out-of-Scope Considerations

- Descriptive sub-line copy inside `billing-stats.tsx` (e.g.
  "Successfully processed") stays in English as before; full i18n of
  those strings is a follow-up.
- A dedicated date-range/amount filter UI (the advanced panel still says
  "coming soon") and server-side invoice/PDF generation are future work.

## 8. UX Notes (if applicable)

The result intentionally looks like a billing-flavoured dashboard page:
same neutral cards, same monochrome icon tiles, same underline tabs and
button treatments. Status/brand colour is retained only on small badges
(active plan = emerald, payment provider = orange/violet) and on the
renewal/days-left indicators, consistent with the dashboard's use of
semantic colour.
