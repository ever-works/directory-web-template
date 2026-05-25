---
id: spec-033-client-profile-security-billing
title: 'Spec 033 — Client Profile Security & Billing blocks'
sidebar_label: '033 Profile Security & Billing'
---

# Feature spec — `033-client-profile-security-billing`

> **Status:** proposed.
>
> **Owner:** Template maintainers.
>
> **Jira:** [EW-648](https://evertech.atlassian.net/browse/EW-648).
>
> **Constitution articles invoked:** III (Spec Before Code),
> VII (Plugin-First / Reuse-What-Exists),
> IX (Test Coverage Bar — Definition of Done).

## 1. Summary

The client profile page `/[locale]/client/profile/[username]` renders a
two-column dashboard (profile panel + headline/secondary stats + About +
Recent Activity + Skills + Portfolio) but exposes **nothing about the
account's security posture or billing/plan**. Both are account-private
and only meaningful to the profile owner.

This spec adds two **owner-only** read-only blocks near the top of the
page, directly under the breadcrumb / own-profile actions row (above the
two-column dashboard):

1. **Security & Status** — email verification, two-factor, account
   lifecycle status, and member-since, with a link into security
   settings.
2. **Billing & Plans** — current plan, account type, and currency, with
   links into billing settings and pricing (plus an Upgrade CTA on the
   free plan).

## 2. Motivation

- **At-a-glance account health.** The owner currently has no summary of
  whether their email is verified, whether 2FA is on, or what plan they
  are on without navigating into separate settings pages. The profile
  dashboard is the natural home for that overview.
- **Reuse what exists.** Every value these blocks display is **already
  on the client profile row** and already loaded by the page. No new
  queries, services, or client hooks are needed — the blocks are pure
  presentation over data in hand.
- **Privacy by construction.** `toPublicClientProfile` exists precisely
  to strip account-private columns at the server/client boundary. These
  blocks consume the *unprojected* row and are gated to the owner, so
  the public projection stays untouched and nothing private leaks to
  visitors.

## 3. Goals

- An authenticated user viewing **their own** profile sees a Security &
  Status block and a Billing & Plans block near the top of the page,
  directly under the breadcrumb / own-profile actions row and above the
  two-column dashboard, laid out as a responsive two-up grid (stacked on
  small screens).
- Non-owners never see either block; the owner does not see them in
  **public-preview** mode (`?preview=public`).
- **Security & Status** shows:
  - Email verification — Verified / Unverified (tone: good / warning).
  - Two-factor authentication — Enabled / Disabled (good / warning).
  - Account status — Active / Inactive / Suspended / Banned / Trial
    (good / neutral / warning / danger / neutral).
  - Member since — localized account creation date.
  - A "Manage security" link to `/client/settings/security`.
- **Billing & Plans** shows:
  - Current plan — Free / Standard / Premium, with an Active/Free badge
    and a plan icon (filled when paid).
  - Account type — Individual / Business / Enterprise.
  - Currency — the ISO code from the profile.
  - "Manage billing" → `/client/settings/profile/billing` and
    "View plans" → `/pricing`; an Upgrade CTA shown only on the free
    plan.
- All copy is i18n'd under the existing `profile` namespace.

## 4. Non-goals

- No new billing/subscription fetching. Live subscription data (renewal
  dates, payment history) stays on the dedicated billing settings page,
  which already uses `useProviderPayment`. This block reflects only the
  plan/account fields stored on the profile.
- No mutations. Both blocks are read-only; changing 2FA, password, or
  plan happens on the existing settings pages they link to.
- No schema changes — all fields already exist on `client_profiles`.
- No new dependencies.

## 5. Design / implementation

- **Components** (new, in `apps/web/components/profile/sections/`):
  - `security-status-section.tsx` — async server component, props
    `{ emailVerified, twoFactorEnabled, status, memberSince }`.
  - `billing-plans-section.tsx` — async server component, props
    `{ plan, accountType, currency }`.
  - Both reuse the existing section card styling (`CARD` constant,
    `theme-primary` accents, `react-icons/fi` glyphs) and are exported
    from the `components/profile` barrel.
- **Page wiring** (`app/[locale]/client/profile/[username]/page.tsx`):
  the blocks render inside an `effectiveIsOwn` guard, sourced from the
  unprojected `rawProfile` (`status`, `plan`, `accountType`,
  `twoFactorEnabled`, `currency`) with sensible fallbacks
  (`'active'` / `'free'` / `'individual'` / `'USD'`). `memberSince`
  reuses the value already computed for the `Profile` object.
- **i18n:** new keys under `profile` in `messages/en.json`. Other
  locales inherit via the `deepmerge(en, locale)` fallback in
  `i18n/request.ts`, so no per-locale edits are required for
  correctness.

## 6. Acceptance criteria

- Owner sees both blocks; non-owners and public-preview do not.
- Status / plan / account-type / verification / 2FA values render with
  the correct labels and tones for every enum value.
- Links navigate to the security settings, billing settings, and
  pricing routes respectively.
- `pnpm lint` and `pnpm tsc --noEmit` pass; no new dependencies.

## 7. Open questions

- Should the blocks eventually move into the left profile panel for
  closer adjacency to the avatar/identity? Deferred — current placement
  keeps the left column sticky and uncluttered.
- A future iteration could surface live renewal/seat data here once a
  server-side subscription read is available; out of scope for this UI
  pass.
