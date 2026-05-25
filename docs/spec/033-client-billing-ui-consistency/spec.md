---
id: spec-033-client-billing-ui-consistency
title: 'Spec 033 — Client Billing page UI consistency'
sidebar_label: '033 Client Billing UI Consistency'
---

# Feature spec — `033-client-billing-ui-consistency`

> **Status:** proposed.
>
> **Owner:** Template maintainers.
>
> **Jira:** [EW-649](https://evertech.atlassian.net/browse/EW-649).
>
> **Constitution articles invoked:** III (Spec Before Code),
> VII (Plugin-First / Reuse-What-Exists),
> IX (Test Coverage Bar — Definition of Done).

## 1. Summary

The billing page at `/client/settings/profile/billing` is visually
inconsistent with its sibling settings pages (`basic-info`, `location`,
`visibility`, `theme-colors`). It hardcodes its own card surface
(`bg-white dark:bg-[#111111] border … rounded-xl p-4 shadow-sm`) instead
of the shared `Card` design-system primitive, lays out its header
differently from every other settings page, and renders several
user-facing strings as raw hardcoded English that bypass the `next-intl`
translation layer.

This spec aligns the page with the rest of the project: it reuses the
shared `Card` component, adopts the canonical settings-page header
structure (back link in its own row, then an icon-tile + title block with
actions on the right), and moves the remaining hardcoded strings into the
`billing` i18n namespace. **No functional or data behaviour changes.**

## 2. Motivation

- **Visual parity.** Every other `/client/settings/profile/*` page uses
  the shared `@/components/ui/card` `Card` primitive and an identical
  header layout. The billing page diverges, producing a different card
  surface colour in dark mode and an inconsistent header.
- **Maintainability.** Hardcoded card styling drifts from the design
  system over time; using `Card` keeps it in lockstep with theme changes.
- **i18n correctness.** The project is fully internationalized
  (21 locales, `deepmerge(en, locale)` fallback). Hardcoded English
  strings ("Active"/"Free", "Renews …", "Upgrade to unlock all
  features", "Upgrade", "Nd left", "/Nd") are untranslatable.
- Primary user: the end-user (client) viewing their billing/subscription.

## 3. Goals

- Replace every hardcoded card container on the page with the shared
  `Card` primitive.
- Restructure the page header to match the sibling settings pages.
- Route all remaining hardcoded user-facing strings through the
  `billing` i18n namespace.
- Preserve light/dark parity, responsive behaviour, and all existing
  functionality (tabs, refresh, export, empty/loading states).

## 4. Non-Goals

- No changes to billing data fetching, payment providers, or the
  subscription/payment APIs.
- No redesign of the page's information architecture (tabs, stats,
  sections remain as-is).
- No refactor of the billing **sub-components** (`PaymentCard`,
  `SubscriptionCard`, `BillingStats`, `TabNavigation`, etc.) — those are
  tracked as a follow-up (see §7).

## 5. User Stories

```text
As a client, I want the billing page to look and behave like the rest of
my settings, so that the app feels coherent and trustworthy.

As a non-English user, I want the billing page's labels translated, so
that the whole settings area reads in my language.
```

## 6. Acceptance Criteria

- [ ] AC-1: The page renders all card surfaces via the shared `Card`
      component; no `dark:bg-[#111111]` hardcoded card containers remain.
- [ ] AC-2: The header matches sibling pages: a back link in its own row,
      then a row with the icon-tile + title/subtitle on the left and the
      Refresh / Export actions on the right.
- [ ] AC-3: No raw hardcoded English strings remain in the page body; the
      previously-hardcoded labels resolve through `useTranslations('billing')`.
- [ ] AC-4: New i18n keys (`FREE`, `UPGRADE`, `RENEWS_ON`,
      `UPGRADE_UNLOCK_FEATURES`, `DAYS_LEFT`, `DAYS_TOTAL`) exist in
      `messages/en.json`; non-English locales fall back to English via the
      existing `deepmerge` config until translated.
- [ ] AC-5: Light and dark modes both render correctly; layout stays
      responsive (header wraps gracefully on narrow viewports).
- [ ] AC-6: No behavioural change — tabs, refresh, export, loading and
      empty states behave exactly as before.

## 7. Out-of-Scope Considerations

- The billing **sub-components** still carry their own hardcoded card
  styling and some inline strings. Aligning them to `Card` + i18n is a
  natural follow-up but is deferred to keep this PR focused and reviewable.
- The "Export" button is currently a no-op placeholder; wiring it up is
  out of scope.

## 8. UX Notes (if applicable)

The visual result is intentionally near-identical to the previous page —
the goal is *consistency*, not a redesign. The most visible change is the
dark-mode card surface shifting from `#111111` to the design-system
`--card` token (matching `theme-colors`), and the header gaining the
standard icon-tile + title block used everywhere else.
