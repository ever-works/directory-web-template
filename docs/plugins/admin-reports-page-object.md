---
id: admin-reports-page-object
title: E2E Admin Reports Page Object (apps/web-e2e/page-objects/admin/reports.page.ts)
sidebar_label: E2E Admin Reports Page Object
sidebar_position: 411
---

# E2E Admin Reports Page Object — `apps/web-e2e/page-objects/admin/reports.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin reports-management** driver paired with
[`apps/web-e2e/page-objects/admin/reports.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/reports.page.ts).
Sits inside the `admin/` page-object subtree, alongside
the sixteen sibling admin-surface page objects
(`bulk-actions.page.ts` — see
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
`clients.page.ts` — see
[`admin-clients-page-object.md`](admin-clients-page-object.md),
`collections.page.ts` — see
[`admin-collections-page-object.md`](admin-collections-page-object.md),
`comments.page.ts` — see
[`admin-comments-page-object.md`](admin-comments-page-object.md),
`companies.page.ts` — see
[`admin-companies-page-object.md`](admin-companies-page-object.md),
`dashboard.page.ts` — see
[`admin-dashboard-page-object.md`](admin-dashboard-page-object.md),
`data-export.page.ts` — see
[`admin-data-export-page-object.md`](admin-data-export-page-object.md),
`featured-items.page.ts` — see
[`admin-featured-items-page-object.md`](admin-featured-items-page-object.md),
`item-form.page.ts` — see
[`admin-item-form-page-object.md`](admin-item-form-page-object.md),
`items.page.ts` — see
[`admin-items-page-object.md`](admin-items-page-object.md),
`notifications.page.ts` — see
[`admin-notifications-page-object.md`](admin-notifications-page-object.md),
`roles.page.ts`, `settings.page.ts`,
`sponsorships.page.ts`, `surveys.page.ts`,
`tags.page.ts`).

This page is the **twelfth per-source-file reference**
the docs tree publishes for any file under
`apps/web-e2e/page-objects/admin/` and the **first**
admin-tree driver in the rollout that documents:

- A **`<button>`-anchored status-tab navigation
  surface** (rather than the
  `getByRole('tab')`-anchored navigation surface every
  prior status-tab driver uses). The reports page
  emits the status filter as a row of `<button>`
  elements — not as a `[role="tablist"]` /
  `[role="tab"]` accessibility-tree-canonical surface.
  The `selectStatusTab(status)` helper resolves via
  `page.getByRole('button', { name: new RegExp(`^${status}`, 'i') }).first()`,
  distinct from the items driver's
  `selectStatusTab(status)` posture which uses
  `page.getByRole('tab', { name: ... })` against the
  items page's `[role="tab"]`-emitting status-filter
  surface.
- A **five-element status-tab TypeScript union**
  (`'All' | 'Pending' | 'Reviewed' | 'Resolved' | 'Dismissed'`)
  — distinct from the items driver's union shape
  (`'All' | 'Approved' | 'Pending' | 'Draft' | 'Rejected'`)
  and reflecting the report lifecycle's distinct
  state machine (Pending → Reviewed → Resolved /
  Dismissed) rather than the items lifecycle (Draft
  → Pending → Approved / Rejected).
- A **`.border-l-4` Tailwind-utility-anchored card-
  list selector** (`reportCards`) — the **first**
  admin-tree driver to pin per-row resolution to a
  Tailwind border-utility class rather than a
  semantic role (`row` / `listitem`) or a structural
  element (`<h4>` / `<table>`). The `border-l-4`
  utility renders the per-card left-border accent
  that the production source emits as the visual
  anchor for each report card; pinning the Locator
  to the utility class is the production-source-
  stable hook today.
- A **broad `/review/i` substring `reviewButtons`
  Locator** that intentionally resolves to a multi-
  element match — the consuming spec at
  [`apps/web-e2e/tests/admin/reports.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/reports.spec.ts)
  uses the `.first()` chained element to drive the
  per-card review flow. Distinct from the items
  driver's `getItemByName(name)` per-row resolver
  posture because the reports page does not emit a
  per-card heading suitable for tag-anchored
  resolution; the `.first()` of the broad-name
  `reviewButtons` Locator is the canonical resolver
  for the first card's review trigger.
- A **bare `[role="dialog"]` review-dialog getter**
  (`reviewDialog`) — pinned to the
  accessibility-tree-canonical posture without the
  `[aria-modal="true"]` composite attribute the
  items driver's `rejectModal` getter uses. The
  reports review dialog mounts as a HeroUI Modal that
  emits `[role="dialog"]` but does not always emit
  the `aria-modal="true"` attribute (depending on the
  HeroUI version's focus-trap implementation). The
  bare `[role="dialog"]` posture tolerates both
  variants while remaining strict enough to
  disambiguate against any other dialog-role element
  on the page.

Where [`base-page-object.md`](base-page-object.md)
documents the **page-object inheritance root**, this
page documents the **suite's admin reports-management
driver boundary** at `/admin/reports` — the smallest
possible page object that lets a spec drive the admin
reports page end-to-end (navigate to
`/admin/reports`, locate the page heading via the
inherited-default `getByRole('heading').first()`
posture, locate the search input as the first
`<searchbox>` on the page, click a status-tab by its
case-insensitive prefix-match accessible-name regex,
type into the search input via the `searchReports(term)`
helper, locate the per-card review-trigger buttons via
the broad `/review/i` substring regex, locate the
review-dialog overlay via the bare `[role="dialog"]`
selector, and locate every report-card via the
`.border-l-4` Tailwind-utility selector).

The file is the **only driver** in the suite for the
admin reports-management surface today. The
`AdminReportsPage` class **does extend `BasePage`** —
see "Why `AdminReportsPage` extends `BasePage`" below
— so it inherits `header` / `footer` / `navLinks` /
`goto` / `gotoLocalized` / `waitForPageReady` /
`getTitle` from
[`base-page-object.md`](base-page-object.md) and only
adds two per-page `readonly` Locator fields
(`heading`, `searchInput`), three methods
(`navigate()`, `selectStatusTab(status)`,
`searchReports(term)`), and three getters
(`reviewDialog`, `reviewButtons`, `reportCards`) on
top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-reports` driver is consumed today by
[`apps/web-e2e/tests/admin/reports.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/reports.spec.ts),
which covers five flows over the admin reports
management surface:

- **Admin can access reports management page** — a
  baseline navigation + visibility assertion against
  the per-page `heading` Locator after a
  `navigate()` / `waitForPageReady()` two-call.
- **Reports page displays stats cards** — a stats-
  surface visibility assertion against the page-level
  `.grid` Tailwind-utility selector (with a 10-second
  timeout to tolerate the React Query hydration storm
  that the per-tenant reports count populates the
  cards with).
- **Status tabs filter reports** — a status-tab flow
  exercise that clicks the `Pending` tab via the
  `selectStatusTab('Pending')` helper, waits 1 second
  for the React Query refetch storm to settle, then
  clicks the `All` tab to restore the no-filter
  state. The flow asserts implicitly via the absence
  of any thrown error — the per-tab navigation is a
  no-op-on-success exercise.
- **Admin can open review dialog for a report** — a
  modal-mount assertion that resolves the first
  `reviewButtons` element via the broad `/review/i`
  substring regex, clicks it, and waits for the
  `[role="dialog"]` overlay to appear with a 5-second
  timeout. The flow asserts on the modal's per-button
  Locators (`Cancel` / `Update Report`), then
  dismisses the modal via the `Cancel` button. The
  modal-dismissal assertion (`modal.toBeHidden`)
  closes the loop on the modal's mount/unmount
  lifecycle contract. The flow uses a
  `test.skip(true, ...)` guard on
  `reviewButton.isVisible().catch(() => false)` so
  the test remains green when the per-tenant database
  has no pending reports to review.
- **Reports page shows empty state for non-matching
  search** — a search-flow exercise that types a
  no-match term (`zzz-nonexistent-report-xyz`) into
  the search input via the `searchReports(term)`
  helper, waits 1 second for the React Query refetch
  storm to settle, then asserts on the empty-state
  message visibility. The flow uses a
  `test.skip(true, ...)` guard on
  `searchInput.isVisible().catch(() => false)` so
  the test remains green when the search input is
  hidden behind a future feature-flag.

A spec that drives the admin reports surface inline
(via `await page.goto('/admin/reports')` then
`await page.getByRole('button', { name: /^Pending/i }).first().click()`
or `await page.getByRole('searchbox').first().fill('term')`)
is a **drift** that this page object is the canonical
replacement for; new specs that touch the admin
reports management surface must reach for
`AdminReportsPage` instead.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The admin-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root. | Anchors the reports driver to the canonical page-object base. |
| `export class AdminReportsPage extends BasePage` | named export | Single class declaration with `extends BasePage`. Adds two per-page Locator fields, three methods, and three getters on top. | The class is the canonical driver for the admin reports-management surface today. |
| `readonly heading: Locator` | field | `page.getByRole('heading').first()` — the **first** heading on the page, regardless of level. | Symmetric with every other admin-tree driver's heading getter. |
| `readonly searchInput: Locator` | field | `page.getByRole('searchbox').first()` — the **first** `<searchbox>` on the page. | Symmetric with the items driver's `searchBar` field. The accessibility-tree-canonical `searchbox` role posture pins to `<input type="search">` elements automatically; distinct from the featured-items driver's `getByRole('textbox').first()` posture which pins to `<input type="text">` elements. |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds all two per-page Locators in a single pass. | Single constructor signature with the `super(page)` call. |
| `async navigate()` | method | `await this.goto('/admin/reports')` — navigates to the admin reports management route via the inherited `goto()` from `BasePage`. | The single canonical entry-point for every consuming spec. |
| `async selectStatusTab(status)` | method | `await this.page.getByRole('button', { name: new RegExp(`^${status}`, 'i') }).first().click()` — clicks a status-button by its prefix-match accessible-name regex. The `status` parameter has a five-element TypeScript union: `'All' \| 'Pending' \| 'Reviewed' \| 'Resolved' \| 'Dismissed'`. | The `<button>` resolution is distinct from the items driver's `[role="tab"]` resolution because the reports page emits the status filter as `<button>` elements rather than `[role="tab"]` elements. The TypeScript union narrows the parameter to exactly the five canonical status values. |
| `async searchReports(term)` | method | `await this.searchInput.fill(term)` — types `term` into the search input. | Symmetric with the items driver's `searchItems(term)` helper and the featured-items driver's `search(term)` helper. |
| `get reviewDialog()` | getter | `this.page.locator('[role="dialog"]').first()` — the review-dialog overlay, located via the WAI-ARIA `dialog` role plus a `.first()` strict-mode pin. | The bare `[role="dialog"]` posture tolerates HeroUI's per-version `aria-modal="true"` attribute drift while remaining strict enough to disambiguate against any other dialog-role element on the page. |
| `get reviewButtons()` | getter | `this.page.getByRole('button', { name: /review/i })` — every button whose accessible name matches the case-insensitive `/review/i` substring. | The reports page emits a per-card `Review` button below each report card. Unlike most admin-tree driver Locator postures, this Locator intentionally resolves to a **multi-element match** so the consuming spec can drive the first card's review flow via `reviewButtons.first().click()`. |
| `get reportCards()` | getter | `this.page.locator('.border-l-4')` — every report card, located via the `.border-l-4` Tailwind border-utility selector. | The production source emits each report card as a `<div class="… border-l-4 …">` with a per-card left-border accent that visually anchors each report. Pinning to the Tailwind utility class is the production-source-stable hook today; a future migration to a `[role="article"]` or `[role="listitem"]` ARIA-tagged container would let the driver adopt the accessibility-tree-canonical posture. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminReportsPage extends BasePage {
	readonly heading: Locator;
	readonly searchInput: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.searchInput = page.getByRole('searchbox').first();
	}

	async navigate() {
		await this.goto('/admin/reports');
	}

	/** Select a status tab. */
	async selectStatusTab(status: 'All' | 'Pending' | 'Reviewed' | 'Resolved' | 'Dismissed') {
		await this.page.getByRole('button', { name: new RegExp(`^${status}`, 'i') }).first().click();
	}

	/** Search reports. */
	async searchReports(term: string) {
		await this.searchInput.fill(term);
	}

	/** Get the review dialog. */
	get reviewDialog() {
		return this.page.locator('[role="dialog"]').first();
	}

	/** Get all review buttons. */
	get reviewButtons() {
		return this.page.getByRole('button', { name: /review/i });
	}

	/** Get report cards. */
	get reportCards() {
		return this.page.locator('.border-l-4');
	}
}
```

## Why `AdminReportsPage` extends `BasePage`

Three load-bearing reasons the admin-tree reports
driver inherits from
[`base-page-object.md`](base-page-object.md):

- **Page-route navigation via the inherited `goto`
  method.** The reports driver targets a navigable
  URL (`/admin/reports`).
- **Global header / footer / nav-link chrome surfaced
  for free.** The admin shell renders the same global
  header / footer / nav-link chrome on
  `/admin/reports` as on every other admin route.
- **Post-navigation `waitForPageReady` stabiliser.**
  Every reports flow that touches the status tabs /
  search input / review dialog starts with
  `await reportsPage.navigate(); await reportsPage.waitForPageReady();`.

## Why `selectStatusTab(status)` uses `getByRole('button')` (and not `getByRole('tab')`)

Three reasons the status-tab helper uses Playwright's
`getByRole('button')` accessibility-tree selector
instead of `getByRole('tab')`:

- **The reports page emits the status filter as
  `<button>` elements.** The production source
  renders each status filter as a regular `<button>`
  inside a flex row, not as a `[role="tab"]` /
  `[role="tablist"]` accessibility-tree-canonical
  pair. Pinning to the button role is the
  production-source-stable hook today.
- **Symmetric with the bulk-action toolbar's button
  posture.** The items driver's bulk-action triggers
  (`bulkApproveButton`, etc.) use the same
  `getByRole('button')` posture (scoped through the
  `bulkActionBar` Locator). The reports driver
  follows the same convention.
- **A future migration to `[role="tab"]` would be a
  production-source change.** Adopting the
  accessibility-tree-canonical tab pattern would
  make the production source more screen-reader-
  friendly, but it requires a per-component refactor.
  The current `<button>` posture is the production-
  source contract today; this driver pins to it
  without a production-source concession to the e2e
  suite.

## Why `selectStatusTab(status)` uses a prefix-match `^${status}` regex

Three reasons the status-tab helper uses a prefix-
match `^${status}` regex (built dynamically via
`new RegExp(...)`) instead of an exact-match `^…$`
posture or a substring posture:

- **The status-tab labels include per-tab counts.** The
  production source renders each status tab with a
  per-tab badge (e.g. `Pending (12)` instead of just
  `Pending`). An exact-match `^pending$` regex would
  silently resolve to zero elements because the tab's
  accessible name includes the badge. The prefix
  match `^pending` matches the tab regardless of the
  per-tab count.
- **Disambiguation against future per-action
  buttons.** A substring regex (`/pending/i`) would
  match accidentally on any future button whose
  label includes the word `pending` (e.g. a
  `Mark as pending` action button). The `^pending`
  prefix-anchor pins to buttons whose label *starts*
  with the status name.
- **Symmetric with the items driver's
  `selectStatusTab(status)` posture.** The items
  driver uses the same prefix-match `^${status}`
  regex with `getByRole('tab')`. The reports driver
  follows the same regex convention but switches the
  role anchor from `tab` to `button` to match the
  production-source contract.

## Why `reviewDialog` uses a bare `[role="dialog"]` selector

Three reasons the review-dialog getter uses the bare
`[role="dialog"]` selector instead of the composite
`[role="dialog"][aria-modal="true"]` selector the
items driver uses:

- **HeroUI's per-version `aria-modal` drift.** The
  HeroUI Modal component's emitted `aria-modal`
  attribute varies between major versions — some
  emit `aria-modal="true"` consistently, others omit
  it when the modal is rendered via React Portal.
  The bare `[role="dialog"]` posture tolerates both
  variants.
- **`.first()` is the strict-mode-correctness
  defence.** A future spec that mounts a second
  dialog (e.g. a confirm-dismiss prompt on top of
  the review dialog) would still resolve to the
  outer review dialog via the `.first()` pin in DOM
  order.
- **No production-source change required.** The
  production source emits `[role="dialog"]` on every
  modal today. Pinning to the bare role posture is
  the production-source-stable hook; a future
  refactor that adds the `aria-modal="true"`
  attribute would not break this driver.

## Why `reviewButtons` is a multi-resolution Locator (and not `.first()`-pinned)

Three reasons the review-buttons getter intentionally
resolves to a multi-element match instead of pinning
to the `.first()` element:

- **The reports page renders a per-card review
  trigger.** The production source emits one
  `<button>Review</button>` per report card. Pinning
  to `.first()` would force consumers to call
  `.first()` again on every iteration; the multi-
  resolution Locator lets the consuming spec assert
  on `count()` then drive a specific card's review
  flow via `reviewButtons.first().click()`.
- **The consuming spec drives the first card.** The
  [`apps/web-e2e/tests/admin/reports.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/reports.spec.ts)
  spec drives the first card's review flow via
  `reportsPage.reviewButtons.first()` — symmetric
  with the data-export driver's `exportButtons`
  multi-resolution Locator posture (see
  [`admin-data-export-page-object.md`](admin-data-export-page-object.md#why-exportbuttons-is-a-multi-resolution-locator-and-not-firstpinned)).
- **Composable filtering / iteration in future
  specs.** A future spec that wants to assert on a
  specific report's review trigger (e.g. "the review
  button for report X is visible") can derive a per-
  card Locator by chaining `.filter({ hasText: ... })`
  on top.

## Why `reportCards` uses a `.border-l-4` Tailwind-utility selector

Three reasons the report-cards getter uses the
`.border-l-4` Tailwind border-utility selector
instead of a `[role="article"]` /
`[role="listitem"]` accessibility-tree-canonical
posture:

- **The production source does not emit ARIA roles
  on report cards.** The current production source
  renders each report card as a generic
  `<div class="border-l-4 …">` without a `role`
  attribute. Pinning to a non-emitted role would
  resolve to zero elements.
- **The `border-l-4` utility is the per-card visual
  anchor.** Each report card carries a per-status
  left-border colour (red for Pending, green for
  Resolved, etc.) rendered via the `border-l-4`
  Tailwind class plus a per-status `border-{color}`
  modifier. The base `.border-l-4` class is invariant
  across statuses, so pinning to it resolves every
  card regardless of status.
- **Future migration to a `[role="article"]` is a
  production-source change.** Adopting the
  accessibility-tree-canonical role would make each
  report card more screen-reader-discoverable, but
  it requires a per-component refactor.

## What it does not contain

The reports driver intentionally omits a number of
helpers that future contributors might be tempted to
add:

- **No `getByTestId` selectors.** The driver uses
  accessibility-tree-canonical posture (`getByRole`)
  plus the positional Tailwind-utility selector
  exclusively.
- **No per-card Locator-factory beyond the
  `reviewButtons` multi-resolution Locator.** The
  driver does not expose a per-card "by-id" or "by-
  reporter" resolver. Future specs that need per-
  card resolution must derive the Locator inline.
- **No `clickReview(reportId)` /
  `dismissReport(reportId)` /
  `resolveReport(reportId, notes)` flow helpers.**
  The driver exposes the `reviewDialog` Locator and
  the `reviewButtons` multi-resolution Locator, but
  no helper closes over the full review flow because
  the consuming spec at
  [`reports.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/reports.spec.ts)
  drives the flow inline.
- **No `assertCardCount(n)` /
  `assertEmptyState()` invariant helpers.** The
  driver does not assert on the report-cards count
  or the empty-state surface visibility.
- **No `clearSearch()` reset helper.** The driver
  exposes `searchReports(term)` but not a paired
  `clearSearch()` helper. Future specs that need to
  reset the search state must derive the call inline
  via `await reportsPage.searchInput.clear()`.

These omissions keep the driver minimal — every
property and method on the class is consumed by at
least one spec today.

## Cross-references

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root every page object in
  `apps/web-e2e/page-objects/admin/` extends.
- [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
  — the **first** admin-tree page-object reference.
- [`admin-clients-page-object.md`](admin-clients-page-object.md)
  — the **second** admin-tree page-object reference.
- [`admin-collections-page-object.md`](admin-collections-page-object.md)
  — the **third** admin-tree page-object reference.
- [`admin-comments-page-object.md`](admin-comments-page-object.md)
  — the **fourth** admin-tree page-object reference.
- [`admin-companies-page-object.md`](admin-companies-page-object.md)
  — the **fifth** admin-tree page-object reference.
- [`admin-dashboard-page-object.md`](admin-dashboard-page-object.md)
  — the **sixth** admin-tree page-object reference.
  Documents the **`getByRole('tablist')`-anchored
  multi-tab navigation surface** at `/admin` (a
  `[role="tab"]`-emitting tab-list, distinct from
  this driver's `<button>`-emitting status-button
  filter posture).
- [`admin-data-export-page-object.md`](admin-data-export-page-object.md)
  — the **eighth** admin-tree page-object reference.
  The data-export driver's `exportButtons` multi-
  resolution Locator posture is the precedent for
  this driver's `reviewButtons` posture.
- [`admin-featured-items-page-object.md`](admin-featured-items-page-object.md)
  — the **seventh** admin-tree page-object reference.
- [`admin-item-form-page-object.md`](admin-item-form-page-object.md)
  — the **ninth** admin-tree page-object reference.
- [`admin-items-page-object.md`](admin-items-page-object.md)
  — the **tenth** admin-tree page-object reference.
  The items driver's `selectStatusTab(status)` posture
  is the precedent for this driver's
  `selectStatusTab(status)` posture, but with a
  `getByRole('tab')` resolver instead of
  `getByRole('button')`.
- [`admin-notifications-page-object.md`](admin-notifications-page-object.md)
  — the **eleventh** admin-tree page-object reference.
- [`signin-page-object.md`](signin-page-object.md) —
  the auth-tree authentication driver.

The
[`apps/web-e2e/tests/admin/reports.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/reports.spec.ts)
spec file is the single consumer of this driver
today; new specs that touch the admin reports
management surface must reach for `AdminReportsPage`
instead of inlining `page.goto('/admin/reports')` /
`page.getByRole('button', { name: /^Pending/i })` /
`page.getByRole('searchbox').first()` calls.
