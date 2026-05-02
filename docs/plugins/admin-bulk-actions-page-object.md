---
id: admin-bulk-actions-page-object
title: E2E Admin Bulk-Actions Page Object (apps/web-e2e/page-objects/admin/bulk-actions.page.ts)
sidebar_label: E2E Admin Bulk-Actions Page Object
sidebar_position: 400
---

# E2E Admin Bulk-Actions Page Object — `apps/web-e2e/page-objects/admin/bulk-actions.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin items bulk-operations** driver paired with
[`apps/web-e2e/page-objects/admin/bulk-actions.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/bulk-actions.page.ts).
Sits inside the `admin/` page-object subtree, alongside the
sixteen sibling admin-surface page objects (`clients.page.ts`,
`collections.page.ts`, `comments.page.ts`,
`companies.page.ts`, `dashboard.page.ts`,
`data-export.page.ts`, `featured-items.page.ts`,
`item-form.page.ts`, `items.page.ts`,
`notifications.page.ts`, `reports.page.ts`,
`roles.page.ts`, `settings.page.ts`,
`sponsorships.page.ts`, `surveys.page.ts`, `tags.page.ts`).

This page is the **first per-source-file reference** the docs
tree publishes for any file under
`apps/web-e2e/page-objects/admin/` — every prior admin-tree
page-object source has only been transitively covered by
[`base-page-object.md`](base-page-object.md) (the inheritance
root every admin-tree class extends) and the consuming spec
files. The reference closes that gap for the bulk-operations
driver and establishes the template the remaining sixteen
admin-tree page-object docs (one per source file) will
mirror.

Where [`base-page-object.md`](base-page-object.md) documents
the **page-object inheritance root** — the smallest possible
class every concrete page object under
`apps/web-e2e/page-objects/admin/`,
`apps/web-e2e/page-objects/auth/`,
`apps/web-e2e/page-objects/client/`, and
`apps/web-e2e/page-objects/public/` extends — and
[`signin-page-object.md`](signin-page-object.md) documents the
**suite's auth-form driver boundary** under
`apps/web-e2e/page-objects/auth/`, this page documents the
**suite's admin items bulk-operations driver boundary** —
the smallest possible page object that lets a spec drive the
full admin-shell items-listing bulk surface end-to-end
(navigate to `/admin/items`, locate the page heading, locate
the **first** select-all checkbox via the bilingual
`aria-label*="Select all" i, aria-label*="SELECT_ALL" i`
substring OR-of-two-paths, locate the bulk action toolbar via
the canonical `[role="toolbar"]` selector once a row selection
has triggered it, locate each of the four action buttons —
approve, reject, delete, clear-selection — by their
case-insensitive `name` regex, locate the modal confirmation
dialog via the canonical `[role="dialog"][aria-modal="true"]`
selector once a destructive action has been clicked, and
expose every individual non-select-all checkbox via the
filtered `itemCheckboxes` getter for per-row selection flows).

The file is the **only driver** in the suite for the admin
items bulk-operations surface today. Like
[`signin-page-object.md`](signin-page-object.md),
[`item-detail-page-object.md`](item-detail-page-object.md),
[`discover-page-object.md`](discover-page-object.md),
[`map-page-object.md`](map-page-object.md), and
[`public-pages-page-object.md`](public-pages-page-object.md),
the `AdminBulkActionsPage` class **does extend `BasePage`** —
see "Why `AdminBulkActionsPage` extends `BasePage`" below for
the load-bearing reasons — so it inherits `header` / `footer`
/ `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` /
`getTitle` from [`base-page-object.md`](base-page-object.md)
and only adds the eight per-page Locators (`heading`,
`selectAllCheckbox`, `bulkActionBar`, `approveButton`,
`rejectButton`, `deleteButton`, `clearSelectionButton`,
`confirmDialog`), the `itemCheckboxes` getter, and the
single-route `navigate()` shortcut on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-bulk-actions` driver is consumed today by
[`apps/web-e2e/tests/admin/bulk-actions.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/bulk-actions.spec.ts),
which covers five flows over the admin-shell items-listing
bulk surface:

- The **select-all checkbox is visible** on the items page —
  a baseline visibility assertion against the `selectAllCheckbox`
  Locator that auto-`test.skip()`s on tenants where the
  bilingual `aria-label*="Select all" i, aria-label*="SELECT_ALL" i`
  substring resolves to no element (e.g. an empty items page or
  a tenant whose admin shell hasn't yet shipped the
  bulk-action UI).
- **Clicking select-all shows the bulk action bar** — the
  per-row selection state-flip trigger that surfaces the
  `bulkActionBar` (`[role="toolbar"]`) Locator only after at
  least one row is selected; the spec auto-`test.skip()`s on
  tenants without the select-all checkbox to keep the suite
  green on the smoke shape.
- **Bulk action bar has approve, reject, and delete
  buttons** — the four-button surface assertion against
  the `approveButton` / `rejectButton` / `deleteButton` /
  `clearSelectionButton` Locators; the spec asserts that at
  least one of approve / reject / delete is visible (the
  three are workflow-state-dependent — approve and reject only
  surface for items with the `pending` state; delete surfaces
  for every state).
- **Clicking bulk delete opens the confirmation dialog** —
  the destructive-action-confirmation surface assertion
  against the `confirmDialog` (`[role="dialog"][aria-modal="true"]`)
  Locator; the spec presses `Escape` to dismiss the dialog
  without performing the actual deletion to keep the test
  side-effect-free against the shared admin database.
- **Clear selection removes the bulk action bar** — the
  selection-state-clear surface assertion that pins the
  `bulkActionBar` Locator's `isHidden()` posture after
  either the `clearSelectionButton` is clicked or the
  `selectAllCheckbox` is re-clicked to uncheck.

A spec that drives the admin items bulk-operations surface
inline (via `await page.locator('[aria-label*="Select all" i]').click()`
or `await page.getByRole('button', { name: /approve/i }).click()`)
is a **drift** that this page object is the canonical
replacement for; new specs that touch the admin bulk-action
toolbar must reach for `AdminBulkActionsPage` instead.

## At a glance

| Element                                  | Type           | What it is                                                                                                                                                                                                                                                              | Why it matters                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`          | typed import   | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                                  | The admin-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports the bulk-actions driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root — see [`base-page-object.md`](base-page-object.md). Required because `extends BasePage` evaluates the symbol at class-declaration time. | Anchors the bulk-actions driver to the canonical page-object base — the same `header` / `footer` / `navLinks` Locators every other page object in the suite has, the same `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` helpers. |
| `export class AdminBulkActionsPage extends BasePage` | named export   | Single class declaration with `extends BasePage` — inherits the page-object base. Adds eight per-page Locators, one `itemCheckboxes` getter, and one `navigate()` shortcut on top.                                                                                  | See "Why `AdminBulkActionsPage` extends `BasePage`" below. The class is the canonical driver for the admin items bulk-operations surface today; every spec that drives the bulk-action toolbar instantiates this class, never a bespoke inline driver. |
| `readonly heading: Locator`              | field          | `page.getByRole('heading').first()` — locates the **first** heading on `/admin/items` as the page title anchor for the post-navigation visibility assertion.                                                                                                            | The accessibility-tree-canonical posture for "the page heading" in a way that survives the production source switching from `<h1>` to `<h2>` (e.g. when the admin shell wraps the page in a card-titled layout). The `.first()` pin defends against a future regression that mounts a second heading (e.g. an admin breadcrumb that uses `<h1>`-shaped marketing chrome). |
| `readonly selectAllCheckbox: Locator`    | field          | `page.locator('[aria-label*="Select all" i], [aria-label*="SELECT_ALL" i]').first()` — bilingual OR-of-two-paths substring selector that locates the **first** select-all checkbox on the page.                                                                         | The OR-of-two-paths defends against the production source's bilingual posture: the canonical `aria-label="Select all"` (English-locale, lowercase phrase) and the i18n-key fallback `aria-label="SELECT_ALL"` (some tenants ship the raw t-key as the `aria-label` until the message catalogue catches up). The `i` flag makes the substring match case-insensitive, the `.first()` pin defends against per-row select-all duplicates. |
| `readonly bulkActionBar: Locator`        | field          | `page.locator('[role="toolbar"]').first()` — locates the **first** ARIA toolbar on the page, which materialises only after a row is selected.                                                                                                                            | The `role="toolbar"` selector is the accessibility-tree-canonical surface for the bulk-action toolbar. The `.first()` pin defends against a future second toolbar mounting (e.g. a shared admin-shell command palette that wraps every admin route in its own toolbar). The bar is hidden when no row is selected; the `isVisible()` / `isHidden()` assertions pin the per-row selection state-flip. |
| `readonly approveButton: Locator`        | field          | `page.getByRole('button', { name: /approve/i }).first()` — the **first** button on the page whose accessible name matches the case-insensitive `/approve/i` regex.                                                                                                       | The accessibility-tree-canonical posture for "the approve button". The `i` regex flag tolerates the production source's casing variants (`Approve`, `APPROVE`, `approve`). The `.first()` pin defends against multi-button surfaces (e.g. a bulk-action toolbar that mounts both an "Approve selected" and a per-row "Approve item" button). |
| `readonly rejectButton: Locator`         | field          | `page.getByRole('button', { name: /reject/i }).first()` — symmetric to `approveButton` for the reject action.                                                                                                                                                            | Same shape as `approveButton`; surfaces the second of the three pending-item-state actions. |
| `readonly deleteButton: Locator`         | field          | `page.getByRole('button', { name: /delete/i }).first()` — symmetric to `approveButton` for the delete action.                                                                                                                                                            | Same shape as `approveButton`; surfaces the destructive bulk-action that opens the `confirmDialog`. The `/delete/i` regex tolerates both `Delete` (singular) and `Delete selected` (plural) phrasings. |
| `readonly clearSelectionButton: Locator` | field          | `page.getByRole('button', { name: /deselect|clear/i }).first()` — alternation regex that matches either "deselect" or "clear" in the accessible name.                                                                                                                    | The production source's clear-selection button has historically been labelled "Clear selection", "Deselect all", or "Clear" depending on the admin shell's design iteration; the alternation regex tolerates all three without per-version drift. The `.first()` pin defends against a future second clear-selection control (e.g. a per-row clear button). |
| `readonly confirmDialog: Locator`        | field          | `page.locator('[role="dialog"][aria-modal="true"]').first()` — locates the **first** modal dialog on the page, which materialises only after a destructive bulk action is clicked.                                                                                       | The accessibility-tree-canonical posture for "the confirmation modal". The `[aria-modal="true"]` attribute filter pins to **modal** dialogs only (excluding non-modal popovers like a tooltip-positioned overflow menu). The `.first()` pin defends against a future toast / non-modal alert that gets the same role mounted in parallel. |
| `constructor(page: Page)`                | constructor    | Stores the `page` via `super(page)` and pre-binds all eight per-page Locators in a single pass.                                                                                                                                                                          | Single constructor signature with the `super(page)` call (because the class extends `BasePage`). Every spec instantiates `new AdminBulkActionsPage(adminPage)` against the authenticated admin fixture (no fixture-bound auto-instantiation today). |
| `async navigate()`                       | method         | `await this.goto('/admin/items')` — navigates to the admin items listing route via the inherited `goto()` from `BasePage`.                                                                                                                                              | The single canonical entry-point for every consuming spec. The `goto()` inheritance lets the driver participate in `BasePage`'s post-navigation `waitForPageReady()` discipline without restating the network-idle wait at every call site. |
| `get itemCheckboxes(): Locator`          | getter         | `this.page.locator('[aria-label*="Select" i]').filter({ hasNotText: /all/i })` — substring-OR'd `Select` Locator filtered to exclude any element whose accessible name contains "all".                                                                                  | The "all individual non-select-all checkboxes" surface for per-row selection flows. The substring `Select` matches both `Select item`, `Select row`, and the i18n-key fallback `SELECT_ITEM`; the `hasNotText: /all/i` filter defends against the select-all checkbox bleeding into the per-row Locator collection. The result is a Locator collection (multiple matches) — consuming specs can iterate via `.nth(i)` or count via `.count()`. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for admin items bulk operations.
 */
export class AdminBulkActionsPage extends BasePage {
	readonly heading: Locator;
	readonly selectAllCheckbox: Locator;
	readonly bulkActionBar: Locator;
	readonly approveButton: Locator;
	readonly rejectButton: Locator;
	readonly deleteButton: Locator;
	readonly clearSelectionButton: Locator;
	readonly confirmDialog: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.selectAllCheckbox = page.locator('[aria-label*="Select all" i], [aria-label*="SELECT_ALL" i]').first();
		this.bulkActionBar = page.locator('[role="toolbar"]').first();
		this.approveButton = page.getByRole('button', { name: /approve/i }).first();
		this.rejectButton = page.getByRole('button', { name: /reject/i }).first();
		this.deleteButton = page.getByRole('button', { name: /delete/i }).first();
		this.clearSelectionButton = page.getByRole('button', { name: /deselect|clear/i }).first();
		this.confirmDialog = page.locator('[role="dialog"][aria-modal="true"]').first();
	}

	async navigate() {
		await this.goto('/admin/items');
	}

	/** Get all individual item checkboxes */
	get itemCheckboxes(): Locator {
		return this.page.locator('[aria-label*="Select" i]').filter({ hasNotText: /all/i });
	}
}
```

## Why `AdminBulkActionsPage` extends `BasePage`

Three load-bearing reasons the admin-tree bulk-actions driver
inherits from [`base-page-object.md`](base-page-object.md)
instead of standing alone (the posture
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md)
and the other public-tree widget drivers take):

- **Page-route navigation via the inherited `goto` method.**
  The bulk-actions driver targets a navigable URL
  (`/admin/items`) — it is a "page object" in the URL sense,
  not a global widget. The single `navigate()` shortcut
  closes over the inherited `await this.goto('/admin/items')`,
  which in turn participates in `BasePage`'s post-navigation
  `waitForPageReady()` discipline (network-idle wait, locale-
  prefix resolution against the configured `baseURL`,
  authenticated-cookie carry-through). A standalone class
  would have to restate every one of these concerns inline.
- **Global header / footer / nav-link chrome surfaced for
  free.** The admin shell renders the same global header /
  footer / nav-link chrome on `/admin/items` as on every
  other admin route. The inherited `header` / `footer` /
  `navLinks` Locators let a spec drive the bulk-action
  toolbar **and** assert on the surrounding admin shell
  (e.g. "the user-menu link is present in the header" /
  "the sidebar contains the Items link") in the same flow,
  without wiring a second base-class composition primitive.
- **Post-navigation `waitForPageReady` stabiliser.** Every
  bulk-action flow starts with `await bulkPage.navigate(); await bulkPage.waitForPageReady();`
  — the consuming spec at
  [`apps/web-e2e/tests/admin/bulk-actions.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/bulk-actions.spec.ts)
  uses this exact two-call shape five times. The
  `waitForPageReady` inheritance is what makes the second call
  meaningful — it's the same discipline `dashboard.spec.ts`,
  `items-crud.spec.ts`, `items-filter.spec.ts`,
  `items-review.spec.ts`, and every other admin-tree spec
  rely on for the post-navigation network-idle wait against
  the admin shell's React Query hydration storm.

## Why the bilingual `aria-label` OR-of-two-paths on `selectAllCheckbox`

Three reasons the field uses the
`[aria-label*="Select all" i], [aria-label*="SELECT_ALL" i]`
substring OR-of-two-paths instead of a single
exact-match selector or a single substring selector:

- **Production source bilingualism.** The host app's admin
  shell wraps the select-all checkbox in a `next-intl`-driven
  `t('SELECT_ALL')` / `t('Select all')` pair on most tenants,
  but a tenant whose message catalogue has not yet been
  populated will surface the **raw t-key** (`SELECT_ALL`) as
  the `aria-label` value. The OR-of-two-paths matches both
  postures so the e2e suite is invariant to the catalogue's
  per-tenant population state. A single exact-match selector
  on `"Select all"` would silently `test.skip()` on
  catalogue-incomplete tenants; a single substring selector
  on `"select"` would over-match against any per-row
  "Select item" checkbox.
- **Substring tolerance for casing variants.** The
  case-insensitive `i` flag on both branches of the OR
  tolerates the production source switching from
  `aria-label="Select All"` (title case) to `aria-label="select all"`
  (lowercase) without per-version drift. Both casings hit
  the same Locator under the `i` flag; an exact-match
  selector would have to enumerate every casing the
  production source has shipped.
- **`.first()` pin against per-row duplicates.** The
  admin-shell items table has been shipped in two iterations:
  one where the per-row checkboxes have `aria-label="Select item N"`
  (no collision with the select-all checkbox under the
  substring search) and one where they have
  `aria-label="Select all metadata for item N"` (which **does**
  collide). The `.first()` pin defends against the second
  iteration by always picking the first match — which is
  always the global select-all checkbox, because it is
  rendered above the per-row checkboxes in DOM order.

## Why `[role="toolbar"]` for `bulkActionBar`

Three reasons the field uses the canonical ARIA `role="toolbar"`
selector for the bulk-action bar instead of a more specific
selector like `[data-testid="bulk-actions"]` or a substring
`aria-label*="bulk action" i`:

- **Accessibility-tree-canonical posture.** The host app's
  bulk-action bar is rendered as an ARIA `role="toolbar"`
  region — the canonical accessibility primitive for a
  "collection of action buttons grouped in a single
  surface". A spec that pins to the accessibility role
  surfaces the same Locator that an assistive technology
  surfaces.
- **Production-source-first selector posture.** Pinning to a
  `data-testid` would force a production-source change purely
  for the e2e suite (the production source today does not
  emit `data-testid` attributes on the bulk-action bar). The
  ARIA role selector reads from a primitive the production
  source already emits for accessibility reasons.
- **Strict-mode safety from the per-route single-instance
  shape.** `/admin/items` mounts exactly one bulk-action
  toolbar today (it is a row-selection-triggered floating
  surface — a second instance would be a UX bug). The
  `.first()` pin defends against a future shared admin-shell
  command palette being mounted as a `role="toolbar"` peer
  on every admin route; without it the strict-mode resolver
  would fail with `Locator resolved to N elements` instead
  of picking the bulk-action bar.

## Why `getByRole('button', { name: /…/i })` for the four action buttons

Three reasons each of the four action buttons (`approveButton`,
`rejectButton`, `deleteButton`, `clearSelectionButton`)
uses Playwright's `getByRole('button', { name: /…/i })`
locator instead of a CSS selector or a `data-testid`:

- **Accessibility-tree-canonical posture.** The four action
  buttons are rendered as `<button>` elements with
  human-readable text content (e.g. "Approve selected",
  "Reject selected", "Delete selected", "Clear selection").
  The `getByRole('button', { name: ... })` locator reads the
  computed accessible name (the text content for a
  text-content button, or the `aria-label` for an
  icon-only button) — the same surface a screen reader
  reads.
- **Locale-tolerant via the case-insensitive regex.** The
  `i` flag on every regex tolerates per-locale casing
  variants the production source has shipped. The simple
  word-stem regexes (`approve`, `reject`, `delete`, plus the
  `deselect|clear` alternation for the clear button) are
  invariant to the surrounding "selected" / "all" /
  "items" suffixes the production source has used across
  iterations.
- **Strict-mode safety from the `.first()` pin against
  multi-button surfaces.** The bulk-action toolbar may
  surface both a primary action button and a secondary
  "split-button" caret menu of additional actions in a
  future iteration. The `.first()` pin defends against the
  caret menu items mounting their own `role="button"` peers
  with names that happen to contain the same word stem
  (e.g. a "Delete and notify" submenu item that contains
  "delete" in its accessible name).

## Why `[role="dialog"][aria-modal="true"]` for `confirmDialog`

Three reasons the field uses the **two-attribute** selector
combining the canonical `role="dialog"` with the explicit
`[aria-modal="true"]` filter:

- **Modal vs non-modal disambiguation.** The accessibility
  spec distinguishes between modal dialogs (which trap
  focus and disable interaction with the rest of the
  document) and non-modal dialogs (which do not). The
  bulk-delete confirmation is **always** modal — it must
  block any further admin-action input until the user
  confirms or dismisses the deletion. The `[aria-modal="true"]`
  filter pins to that semantic, defending against a future
  regression that surfaces a non-modal popover with the same
  role.
- **Strict-mode safety against tooltips and toasts.** Some
  tooltip / toast libraries mount their elements with
  `role="dialog"` (specifically `role="alertdialog"`'s
  cousin shape). The explicit `[aria-modal="true"]` filter
  excludes those non-modal surfaces from the strict-mode
  resolver's match set, so a flaky toast does not steal the
  Locator from the canonical confirmation dialog.
- **`.first()` pin against potential parallel modals.** A
  future iteration that surfaces a secondary modal (e.g. a
  "first-time bulk action" onboarding modal that wraps the
  confirmation in a tutorial overlay) would mount a second
  modal in the DOM. The `.first()` pin picks the topmost
  / first-rendered modal, which is always the confirmation
  in today's flow.

## Why `itemCheckboxes` is a getter and not a `readonly` field

Three reasons the per-row checkboxes surface is a `get itemCheckboxes(): Locator`
getter instead of a pre-bound `readonly itemCheckboxes: Locator`
field on the constructor:

- **Late-binding against pagination state.** The per-row
  checkboxes mount and unmount on every page-change /
  filter-change / sort-change in the admin-shell items
  listing. A pre-bound Locator field would have to be
  re-resolved on every state-change for the strict-mode
  resolver to walk the current DOM — but Playwright's
  Locators are already lazy / re-resolved on every action,
  so the getter shape adds no per-call cost while making
  the late-binding explicit.
- **Symmetric with the per-call `filter()` invocation.** The
  getter body invokes `.filter({ hasNotText: /all/i })` on
  every read — a pre-bound field would pin the filter
  result at constructor time (which is fine for filters
  that don't depend on state, but the getter shape leaves
  room for a future filter that does, e.g. a
  `filter({ hasText: this.currentSearchQuery })` shape).
- **Documentation-by-convention.** Other admin-tree page
  objects use the same getter posture for "collection of
  matching elements" surfaces (vs `readonly` for "single
  canonical element" surfaces). Keeping the convention
  consistent across the admin-tree page-object directory
  makes the tree scannable for a new contributor.

## Why `aria-label*="Select" i` and not `getByRole('checkbox', { name: /select/i })` for `itemCheckboxes`

Three reasons the getter uses the CSS-attribute substring
locator instead of Playwright's `getByRole('checkbox', { name: ... })`:

- **Defends against role-attribute drift.** The host app's
  per-row checkboxes have shipped variously as native
  `<input type="checkbox">` (which Playwright's
  `getByRole('checkbox')` matches), as `role="checkbox"`-
  shaped `<button>` elements (also matched), and as
  `<button>`-with-icon "select chip" variants (which
  Playwright's `getByRole('checkbox')` does NOT match
  because the role attribute is missing). The CSS-attribute
  substring locator on `aria-label` matches all three
  postures — the suite is invariant to the production
  source's per-iteration role-attribute discipline.
- **Direct symmetry with `selectAllCheckbox`.** The
  select-all checkbox uses the same CSS-attribute substring
  shape; using a different shape for the per-row checkboxes
  would force a contributor reading the file to mentally
  switch between two locator strategies for "the same
  visual surface".
- **No collision risk with non-checkbox `role` elements.**
  The `aria-label*="Select" i` substring is narrow enough
  to exclude unrelated elements (no admin-shell button or
  link in `/admin/items` has "select" in its accessible
  name today, modulo the bulk-action toolbar's
  "select all" — which the `hasNotText: /all/i` filter
  excludes).

## Failure matrix

| Mistake on `bulk-actions.page.ts`                                | Layer that surfaces it                                                                                          |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Drop `import type` for `Page` / `Locator`                        | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner.                  |
| Drop the `extends BasePage` clause                                | Loses inherited `header` / `footer` / `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle`; every consuming spec must restate the network-idle wait inline. |
| Drop `super(page)` from the constructor                           | TypeScript compile error: "Constructors for derived classes must contain a 'super' call".                         |
| Drop `readonly` from any field                                   | Cross-test state-leak risk against shared driver instances.                                                       |
| Switch `selectAllCheckbox` to a single `aria-label="Select all"` exact-match | Silently `test.skip()`s on tenants whose message catalogue surfaces the raw `SELECT_ALL` t-key.                  |
| Drop the `i` flag from any substring locator                      | Per-locale casing variants flake; e.g. `aria-label="select all"` (lowercase) misses the title-case substring.    |
| Drop the `.first()` pin from `selectAllCheckbox`                  | Strict-mode failure on tenants whose per-row checkboxes have `aria-label*="Select all metadata"` or similar.    |
| Drop the `.first()` pin from `bulkActionBar`                      | Strict-mode failure on tenants whose admin shell mounts a shared command-palette `role="toolbar"` chrome.        |
| Drop the `.first()` pin from any action button                    | Strict-mode failure on tenants whose action buttons have a sibling `role="button"` peer with a colliding name.   |
| Switch `bulkActionBar` to `[data-testid="bulk-actions"]`          | Forces a production-source change purely for the e2e suite; violates the production-source-first selector posture. |
| Switch `confirmDialog` to drop the `[aria-modal="true"]` filter    | Strict-mode collision with non-modal toast / popover libraries that mount with `role="dialog"`.                  |
| Switch `itemCheckboxes` to `getByRole('checkbox', { name: /select/i })` | Loses per-row `<button>`-with-icon coverage on tenants whose admin shell uses a non-`role="checkbox"` shape.    |
| Drop the `hasNotText: /all/i` filter from `itemCheckboxes`         | Per-row Locator collection now includes the global select-all checkbox; per-row count assertions overshoot by 1.  |
| Drop the `navigate()` method                                      | Every consuming spec must restate `await bulkPage.goto('/admin/items')`; documentation-by-default is lost.        |
| Move the file out of `apps/web-e2e/page-objects/admin/`           | `Cannot find module` on every importing spec.                                                                     |
| Rename `AdminBulkActionsPage`                                     | Every importer needs a matching rename.                                                                            |
| Switch the file extension to `.tsx`                               | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks.                                      |
| Drop the trailing newline                                          | Prettier diff.                                                                                                    |
| Ship the file with CRLF line endings                              | Same as above.                                                                                                    |

## Per-line walkthrough

| Line(s) | Code                                                                                                              | Purpose                                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | `import type { Page, Locator } from '@playwright/test';`                                                          | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost.                                                                                                     |
| 2       | `import { BasePage } from '../base.page';`                                                                         | Runtime import of the inheritance root; required because `extends BasePage` evaluates the symbol at class-declaration time.                                                        |
| 4–6     | `/** Page object for admin items bulk operations. */`                                                              | JSDoc summary that surfaces in IDE hover for every importer.                                                                                                                        |
| 7       | `export class AdminBulkActionsPage extends BasePage {`                                                             | Single named export, with the `extends BasePage` clause — see "Why `AdminBulkActionsPage` extends `BasePage`" above.                                                                |
| 8       | `readonly heading: Locator;`                                                                                       | Pre-bound page heading Locator.                                                                                                                                                     |
| 9       | `readonly selectAllCheckbox: Locator;`                                                                             | Pre-bound select-all checkbox Locator.                                                                                                                                              |
| 10      | `readonly bulkActionBar: Locator;`                                                                                 | Pre-bound bulk-action toolbar Locator.                                                                                                                                              |
| 11      | `readonly approveButton: Locator;`                                                                                 | Pre-bound approve button Locator.                                                                                                                                                   |
| 12      | `readonly rejectButton: Locator;`                                                                                  | Pre-bound reject button Locator.                                                                                                                                                    |
| 13      | `readonly deleteButton: Locator;`                                                                                  | Pre-bound delete button Locator.                                                                                                                                                    |
| 14      | `readonly clearSelectionButton: Locator;`                                                                          | Pre-bound clear-selection button Locator.                                                                                                                                            |
| 15      | `readonly confirmDialog: Locator;`                                                                                 | Pre-bound confirmation modal Locator.                                                                                                                                               |
| 17–27   | `constructor(page: Page) { super(page); … }`                                                                       | Stores the `page` via `super(page)` and pre-binds every Locator in a single pass.                                                                                                    |
| 19      | `this.heading = page.getByRole('heading').first();`                                                                | Accessibility-tree-canonical heading Locator with `.first()` pin.                                                                                                                   |
| 20      | `this.selectAllCheckbox = page.locator('[aria-label*="Select all" i], [aria-label*="SELECT_ALL" i]').first();`     | Bilingual OR-of-two-paths substring selector for the select-all checkbox.                                                                                                            |
| 21      | `this.bulkActionBar = page.locator('[role="toolbar"]').first();`                                                   | Canonical ARIA toolbar selector for the bulk-action bar.                                                                                                                             |
| 22      | `this.approveButton = page.getByRole('button', { name: /approve/i }).first();`                                     | Accessibility-tree-canonical approve button Locator with case-insensitive regex name.                                                                                               |
| 23      | `this.rejectButton = page.getByRole('button', { name: /reject/i }).first();`                                       | Symmetric with `approveButton`.                                                                                                                                                      |
| 24      | `this.deleteButton = page.getByRole('button', { name: /delete/i }).first();`                                       | Symmetric with `approveButton`.                                                                                                                                                      |
| 25      | `this.clearSelectionButton = page.getByRole('button', { name: /deselect|clear/i }).first();`                       | Alternation regex tolerating "Clear" / "Clear selection" / "Deselect all" phrasings.                                                                                                 |
| 26      | `this.confirmDialog = page.locator('[role="dialog"][aria-modal="true"]').first();`                                 | Two-attribute selector pinning to modal dialogs only.                                                                                                                                |
| 29–31   | `async navigate() { await this.goto('/admin/items'); }`                                                            | Single canonical entry-point; closes over `BasePage`'s `goto` for post-navigation `waitForPageReady` discipline.                                                                    |
| 33      | `/** Get all individual item checkboxes */`                                                                         | JSDoc summary for the `itemCheckboxes` getter.                                                                                                                                       |
| 34–36   | `get itemCheckboxes(): Locator { return this.page.locator('[aria-label*="Select" i]').filter({ hasNotText: /all/i }); }` | Late-bound per-row checkboxes Locator collection with the `hasNotText: /all/i` filter excluding the global select-all checkbox.                                                    |

## Read / write surface

| Caller                                                                                                                                  | Reads                                                                                              | Writes                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/web-e2e/tests/admin/bulk-actions.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/bulk-actions.spec.ts) | `heading.isVisible()`, `selectAllCheckbox.isVisible()`, `bulkActionBar.isVisible()` / `.isHidden()`, `approveButton.isVisible()`, `rejectButton.isVisible()`, `deleteButton.isVisible()`, `clearSelectionButton.isVisible()`, `confirmDialog.isVisible()` | Calls `navigate()` to reach `/admin/items`, `selectAllCheckbox.click()` to toggle the global selection state, `deleteButton.click()` to open the confirmation modal, `clearSelectionButton.click()` to clear the selection, and presses `Escape` to dismiss the confirmation modal.    |
| Future per-row selection specs                                                                                                          | `itemCheckboxes.count()` for "exactly N rows" assertions; `itemCheckboxes.nth(i).isChecked()` for per-row state assertions | `itemCheckboxes.nth(i).click()` to toggle individual row selection without going through the global select-all.                                                                                                                                                                          |
| Future bulk-approve / bulk-reject specs                                                                                                 | `approveButton.isEnabled()` / `rejectButton.isEnabled()` for state-flip assertions                  | `approveButton.click()` / `rejectButton.click()` to trigger the bulk-state-transition flow against the admin database.                                                                                                                                                                  |
| Admin items production-source components (the production source for the DOM contract)                                                  | The exact `aria-label` attributes on the select-all checkbox and per-row checkboxes; the `role="toolbar"` on the bulk-action bar; the `role="dialog"` + `aria-modal="true"` on the confirmation modal; the accessible names of the four action buttons | Mounts the bulk-action bar in the DOM only after at least one row is selected; mounts the confirmation modal in the DOM only after a destructive action is clicked; emits the four action buttons conditionally based on the selected items' workflow states.                            |
| [`base-page-object.md`](base-page-object.md)                                                                                            | The inheritance root the class extends; the `page` field, the `header` / `footer` / `navLinks` Locators, and the `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` methods. | —                                                                                                                                                                                                                                                                                       |
| [`e2e-tsconfig.md`](e2e-tsconfig.md)                                                                                                   | The `include: ["./**/*.ts"]` glob picks up this file.                                              | —                                                                                                                                                                                                                                                                                       |
| [`playwright-config.md`](playwright-config.md)                                                                                          | Resolves the relative `/admin/items` path the consuming spec navigates to via `baseURL`; supplies the authenticated admin storage state via the `adminPage` fixture. | —                                                                                                                                                                                                                                                                                       |

### Read / write surface — failure modes

| Drift                                                                                                  | Surfaces as                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production-source rename of the `aria-label` from `"Select all"` to `"Toggle all"`                     | The first branch of the OR-of-two-paths fails; the second branch (`SELECT_ALL`) holds only on catalogue-incomplete tenants. The select-all checkbox visibility assertion silently `test.skip()`s. |
| Production-source switch from `role="toolbar"` to `role="region"` on the bulk-action bar               | The `bulkActionBar` Locator fails to find the bar; every "bar appears after select-all" assertion times out.                                                                                       |
| Production-source switch from `role="dialog"` to a custom-element confirmation modal                   | The `confirmDialog` Locator fails to find the modal; the destructive-action confirmation assertion times out.                                                                                       |
| Production-source switch from text-content buttons to icon-only buttons without `aria-label`           | The `getByRole('button', { name: /…/i })` Locators fail to compute an accessible name; every action-button visibility assertion fails.                                                              |
| Production-source switch from a single bulk-action toolbar to a per-row inline action menu             | The `[role="toolbar"]` Locator never resolves; every "bar appears" assertion times out.                                                                                                              |
| Database seeding regression that empties the admin items listing                                        | The select-all checkbox is hidden (no rows to select); every spec auto-`test.skip()`s via the visibility precondition check.                                                                         |
| Authentication regression that breaks the `adminPage` fixture                                           | Every spec fails with a 302 redirect to the sign-in page or a 401/403 from the admin route guard.                                                                                                    |
| Middleware change that disables JavaScript on `/admin/items`                                             | The bulk-action bar never mounts (the React state hook never fires on row selection); every "bar appears" assertion times out.                                                                       |
| `playwright.config.ts` `baseURL` change                                                                | The relative `/admin/items` resolves to a different host; the route either 404s or redirects.                                                                                                       |
| `next-intl` message-catalogue change that drops the canonical English `aria-label`                     | The first branch of the OR-of-two-paths fails on every locale where the catalogue holds a localised override; the second branch (`SELECT_ALL`) holds only on catalogue-incomplete fallback paths.   |

## Change checklist

Any change to `bulk-actions.page.ts` must:

- Audit every spec under `apps/web-e2e/tests/admin/bulk-actions.spec.ts`
  for compatibility with the new shape.
- Cross-check [`base-page-object.md`](base-page-object.md) for the
  `BasePage` posture — if the new shape inherits from `BasePage`,
  document the why; if it does not (a future widget-style refactor),
  document the why-not against the standalone-class precedent set by
  [`scroll-to-top-page-object.md`](scroll-to-top-page-object.md).
- Cross-check the production source for the admin items bulk-action
  toolbar for the canonical `aria-label="Select all"` /
  `SELECT_ALL` t-key on the select-all checkbox, the `role="toolbar"`
  on the bulk-action bar, the `role="dialog"` + `aria-modal="true"`
  on the confirmation modal, and the four action button accessible
  names.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for the
  `include: ["./**/*.ts"]` glob coverage.
- Cross-check [`playwright-config.md`](playwright-config.md) for
  the `baseURL` posture and the `adminPage` fixture binding the
  consuming spec relies on.
- Cross-check [`fixtures-index.md`](fixtures-index.md) — today the
  driver is instantiated inline by the consuming spec via the
  `adminPage` fixture, but a future fixture-bound bulk-actions
  driver would surface here.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the bulk-actions
  spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Bulk Operations"`).
- Add a [`docs/log.md`](../log.md) entry describing the change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that affects test
  authoring.
- Reviewer pass.
