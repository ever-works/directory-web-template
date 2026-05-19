---
id: spec-030-client-submissions-redesign
title: 'Spec 030 — Client Submissions Page Redesign'
sidebar_label: '030 Submissions Redesign'
---

# Feature spec — `030-client-submissions-redesign`

> **Status:** proposed.
>
> **Owner:** Template maintainers.
>
> **Constitution articles invoked:** III (Spec Before Code),
> V (Performance & Accessibility budget), IX (Definition of Done).

## 1. Summary

The `/client/submissions` page is the main entry point a logged-in
directory user sees for tracking their own submissions. The existing
implementation works (search, status filter, paginate, view / edit /
delete with soft-delete to trash), but the visual layer is
**heterogeneous**: each card uses its own colour gradient, status
chips repeat per row, action buttons are three separate raw `<button>`
icons, and the list/card layout is a fixed vertical stack regardless
of viewport. The result feels noisy compared to the rest of the
template and does not scale past a few rows.

Spec 030 is a UI-only redesign that aligns the page with the rest of
the dashboard's design system, introduces a responsive
table-on-desktop / cards-on-mobile pattern, polishes the empty /
loading / error states, adds sort UX, and reuses primitives already
present in the codebase (`Card`, `Button`, `cn`, the i18n helpers, the
react-icons set).

**Hard constraint:** no functional or data-layer changes. The hook
contracts (`useClientItems`, `useClientItemFilters`), the toSubmission
mapper, all mutation flows, modals (detail / edit / delete), and the
trash sub-page remain untouched.

## 2. Motivation

- The page is the visible "I just submitted something — what
  happened?" surface. First impressions on a self-hosted instance
  should match the rest of the dashboard polish.
- Three separate, similarly-sized icon buttons per row create visual
  noise and an unclear primary action; modern SaaS rows isolate the
  destructive action and use a single accent.
- Stats cards used a centred icon + giant number that wastes vertical
  space; replacing it with a compact KPI card (label + icon + value +
  share-of-total caption) lets users scan all four stats in one
  glance.
- The current filter row only supports search; sort is exposed in the
  filter hook (`sortBy`, `sortOrder`, `toggleSortOrder`) but was never
  wired into the UI.
- Mobile rendering reused the desktop card unchanged, producing very
  tall rows with truncated content.

## 3. Goals

- Keep every existing prop and handler on every public component
  (`SubmissionList`, `SubmissionFilters`, `SubmissionStatsCards`,
  `SubmissionItem`) so the trash sub-page and any future consumer
  stay functional. Add new optional props for sort and error/retry.
- Replace the vertical card list with a true table on `md+` viewports
  and keep a polished card layout on `<md`. Both share the same
  status-badge, action-button, and skeleton components.
- Reuse the existing design tokens (`theme-primary-*`, `dark:` palette
  with `#0a0a0a` / `#111111`, `cn` utility, `Card` / `Button`
  primitives) and avoid introducing new colour scales.
- Wire the sort dropdown + asc/desc toggle through the hook, with
  proper aria-labels.
- Add explicit empty, "no results for filters", error, and skeleton
  states so the page is never silent.
- Status colour scale moves from raw `green-` / `yellow-` / `red-` to
  the more modern `emerald-` / `amber-` / `rose-` to match the rest of
  the dashboard.

## 4. Non-goals

- No backend / API changes.
- No new translation namespaces. New keys only in
  `client.submissions.*` and added in `en.json` only — other locales
  fall back to English until translated.
- The `SubmissionDetailModal`, `EditSubmissionModal`, and
  `DeleteSubmissionDialog` modals are out of scope and retain their
  existing design.

## 5. Acceptance criteria

- `/client/submissions` renders without runtime warnings on mobile
  (375 px), tablet (768 px), and desktop (1280 px) breakpoints.
- The desktop view shows a 5-column row: Submission / Status /
  Category / Metrics / Date+Actions.
- The mobile view shows one card per submission with status badge in
  the top-right.
- Search input is keyboard-accessible (`type="search"`,
  `role="searchbox"`) and has an aria-labelled clear button.
- The status tabs are wrapped in `role="tablist"` with each tab
  carrying `role="tab"` and `aria-selected`.
- The sort dropdown has a visible label-equivalent (`SORT_BY` is
  applied via `sr-only` `<label>` + native `<select>`), and the
  asc/desc toggle is a focusable button with an aria-label.
- Action icon buttons each carry both `aria-label` and `title`.
- All loading / empty / error states share the same vertical rhythm
  and use the same `cn`-composed Tailwind utilities as the rest of
  the dashboard.
- `pnpm tsc --noEmit` and `pnpm lint` pass for the touched files.

## 6. Implementation notes

Touched files:

- `apps/web/components/submissions/submission-stats-cards.tsx`
- `apps/web/components/submissions/submission-filters.tsx`
- `apps/web/components/submissions/submission-item.tsx`
- `apps/web/components/submissions/submission-list.tsx`
- `apps/web/components/submissions/index.ts` (export `StatusTabs`)
- `apps/web/app/[locale]/client/submissions/submissions-content.tsx`
- `apps/web/messages/en.json` (new `client.submissions.*` keys for
  sort labels, column headers, empty/error variants, pagination nav)

Not touched (preserves trash page + modals):

- `apps/web/components/submissions/trash-item.tsx`
- `apps/web/components/submissions/submission-detail-modal.tsx`
- `apps/web/components/submissions/edit-submission-modal.tsx`
- `apps/web/components/submissions/delete-submission-dialog.tsx`
- `apps/web/app/[locale]/client/submissions/trash/*`
- `apps/web/hooks/use-client-item-filters.ts`
- `apps/web/hooks/use-client-items.ts`
