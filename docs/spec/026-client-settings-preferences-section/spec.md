---
id: spec-026-client-settings-preferences-section
title: 'Spec 026 — Client Settings: Preferences Section (settings-modal contents on /client/settings)'
sidebar_label: '026 Settings Preferences'
---

# Feature spec — `026-client-settings-preferences-section`

> **Status:** proposed.
>
> **Owner:** Template maintainers.
>
> **Constitution articles invoked:** III (Spec Before Code),
> IX (Test Coverage Bar — Definition of Done).

## 1. Summary

The visual-preference controls (Layout, Container Width, Pagination
Style, plus the demo-only Database Mode, Checkout Provider, and
Database Status Warning) currently live **only** inside the
`SettingsModal` opened from the header gear icon and the floating
button. The dedicated `/client/settings` hub — the surface a user
naturally navigates to when looking for their settings — does not
expose these controls at all.

Spec 026 makes those same controls reachable directly from
`/client/settings` by adding a new **Preferences** section to the hub
that mounts the existing block components inline. The modal continues
to exist unchanged for users who prefer the quick-access surface.

## 2. Motivation

- Discoverability: users browsing the settings hub today have no way
  to find Layout / Container Width / Pagination Style without
  guessing that they live behind a separate floating button.
- Symmetry: every other user-facing preference (theme colors,
  security, billing, etc.) is reachable from `/client/settings`. The
  visual-preference block is the only outlier.
- Goal stated by the template owner: bring the `SettingsModal`
  contents into `/client/settings` while keeping the modal as a
  shortcut. This spec captures that direction.

## 3. Goals

- Authenticated, non-admin user opening `/client/settings` sees a new
  **Preferences** section that contains the same controls as the
  `SettingsModal`:
  - Layout (`SelectLayout`)
  - Container Width (`SelectContainerWidth`)
  - Pagination Style (`SelectPaginationType`)
- In demo mode (`isDemoMode()` true), the section additionally shows:
  - Database Mode (`SelectDatabaseMode`)
  - Checkout Provider (`SelectCheckoutProvider`)
  - Database Status Warning (`DatabaseStatusWarning`)
- The existing `SettingsModal` continues to render the same controls
  unchanged. The header gear button and floating button still open
  the modal. No regressions in the modal experience.
- The section uses page-local layout primitives consistent with the
  rest of `/client/settings` (label + card stack pattern that
  `settings-content.tsx` already uses for Profile / Appearance /
  Security / Content & Billing sections).
- The new section heading is translated through `next-intl`
  (`settings.PREFERENCES`).

## 4. Non-Goals

- **No new sub-route.** The contents go inline into the existing
  `/client/settings` hub page; we do not create
  `/client/settings/preferences`.
- **No deletion or refactor of `SettingsModal`,
  `SettingsModalProvider`, or `useSettingsModal`.** The modal stays
  exactly as it is today.
- **No shared `SettingsShell` / `SettingsSection` / `SettingsCard`
  primitives extracted into `apps/web/components/settings/`** —
  keeping page-local components per current convention.
- **No polish on the 7 detail pages** (basic-info, location,
  portfolio, theme-colors, security, billing, submissions trash).
  Those remain unchanged in this PR; revisit in a follow-up if
  needed.
- **No new dependencies** or design-system additions. We reuse
  `SelectLayout`, `SelectContainerWidth`, `SelectPaginationType`,
  `SelectDatabaseMode`, `SelectCheckoutProvider`, and
  `DatabaseStatusWarning` exactly as-is.

## 5. User Stories

- **As an authenticated user** browsing `/client/settings`, I see a
  **Preferences** section in addition to Profile / Appearance /
  Security / Content & Billing. The section lets me change the
  layout style, container width, and pagination type, with the same
  visual treatment and the same `sonner` toast feedback I get from
  the modal.
- **As an authenticated user** in demo mode, I additionally see the
  Database Mode and Checkout Provider controls plus the Database
  Status Warning callout inside the Preferences section.
- **As an authenticated user** clicking the header gear icon or the
  floating settings button, the existing modal still opens with the
  same controls. Choices made in either surface stay in sync because
  both surfaces consume the same `useLayoutTheme` state.

## 6. Implementation Notes (non-binding)

- Edit
  `apps/web/app/[locale]/client/settings/settings-content.tsx`:
    - Add a new `PreferencesSection` block rendered after Appearance
      and before Security (since these are visual-preference
      controls that also affect appearance).
    - Inside the block, render `<SelectLayout />`,
      `<SelectContainerWidth />`, `<SelectPaginationType />`, and
      — gated on `isDemoMode()` — `<SelectDatabaseMode />`,
      `<SelectCheckoutProvider />`, and `<DatabaseStatusWarning />`,
      stacked vertically.
    - Wrap the block in a labeled container that matches the
      `SettingsSection` pattern already in use on this page (small
      uppercase label + stacked content).
- Translation: add `settings.PREFERENCES` to `en.json`. Add the same
  key to all other locale files with the English fallback string so
  the page does not show raw keys in non-English locales until
  translators provide a localized string.
- Performance: the block-level components are already
  `'use client'` and already mounted globally inside the modal —
  rendering them on the page does not introduce new runtime cost
  beyond their own. No bundle-impact concerns.
- Accessibility: each existing block already implements proper
  semantics. The new section heading uses the same `<p>` label
  pattern already in use for the page's other sections, so screen
  readers see consistent landmarks.

## 7. Out-of-Scope Follow-ups

- Extracting shared settings primitives
  (`SettingsShell`/`SettingsSection`/`SettingsCard`) into
  `apps/web/components/settings/` once two or more pages need them.
- Translating the existing hardcoded English section labels
  (`Profile`, `Appearance`, `Security`, `Content & Billing`)
  via `next-intl`.
- Deciding whether to deprecate the modal in favor of the hub once
  user analytics show one surface dominates.
- Polishing the 7 detail pages (skeletons, empty states, unified
  toast feedback) — covered by a separate spec when prioritized.
