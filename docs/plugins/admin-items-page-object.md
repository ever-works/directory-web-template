---
id: admin-items-page-object
title: E2E Admin Items Page Object (apps/web-e2e/page-objects/admin/items.page.ts)
sidebar_label: E2E Admin Items Page Object
sidebar_position: 409
---

# E2E Admin Items Page Object — `apps/web-e2e/page-objects/admin/items.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin items-management** driver paired with
[`apps/web-e2e/page-objects/admin/items.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/items.page.ts).
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
`notifications.page.ts`, `reports.page.ts`,
`roles.page.ts`, `settings.page.ts`,
`sponsorships.page.ts`, `surveys.page.ts`,
`tags.page.ts`).

This page is the **tenth per-source-file reference** the
docs tree publishes for any file under
`apps/web-e2e/page-objects/admin/` — the first being
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
which established the template for the admin-tree
rollout, the second
[`admin-clients-page-object.md`](admin-clients-page-object.md)
which extended the rollout with the multi-step add-form
modal + nested delete-confirmation modal posture, the
third
[`admin-collections-page-object.md`](admin-collections-page-object.md)
which extended the rollout with the named-row helper API
(`getCollectionByName(name)`, `editCollection(name)`,
`deleteCollection(name)`) on top of the per-page Locator
fields plus a per-form fill helper, the fourth
[`admin-comments-page-object.md`](admin-comments-page-object.md)
which extended the rollout with the
**HeroUI-Modal-based delete confirmation surface**, the
fifth
[`admin-companies-page-object.md`](admin-companies-page-object.md)
which extended the rollout with the **bare
`.fixed.inset-0.z-50` Tailwind-overlay form modal +
text-filtered Tailwind-overlay delete-confirmation
modal** posture, the sixth
[`admin-dashboard-page-object.md`](admin-dashboard-page-object.md)
which extended the rollout with the
**`getByRole('tablist')`-anchored multi-tab navigation
surface**, the seventh
[`admin-featured-items-page-object.md`](admin-featured-items-page-object.md)
which extended the rollout with the **`#active-only`
id-selector toggle** and the search-input helper pair,
the eighth
[`admin-data-export-page-object.md`](admin-data-export-page-object.md)
which extended the rollout with the **`/admin` co-tenant
widget** posture, and the ninth
[`admin-item-form-page-object.md`](admin-item-form-page-object.md)
which extended the rollout with the **per-tab
multi-step admin-item form driver**.

The items driver continues the rollout of the
remaining seven admin-tree page-object docs (one per
source file) and is the **first** admin-tree driver in
the rollout that documents:

- An **eleven-`readonly`-Locator-field surface** — the
  largest per-page Locator inventory of any admin-tree
  driver to date. The fields cover the page chrome
  (`heading`, `addItemButton`, `searchBar`,
  `itemsList`, `pagination`), per-row selection
  (`selectAllCheckbox`), and the bulk-action toolbar
  (`bulkActionBar`, `bulkApproveButton`,
  `bulkRejectButton`, `bulkDeleteButton`,
  `bulkDeselectButton`). Distinct from every prior
  admin-tree driver's smaller Locator inventories
  (the next-largest is the clients driver's seven
  Locator fields, below the items driver's eleven).
- A **nine-method helper API** — the largest
  per-driver method count of any admin-tree driver to
  date. The methods cover navigation
  (`navigate()`), per-status-tab filtering
  (`selectStatusTab(status)` with a five-element
  TypeScript union), search-flow mutators
  (`searchItems(term)`, `clearSearch()`), per-row
  resolution (`getItemByName(name)`), per-row action-
  menu interactions (`openActionsMenu(itemName)`,
  `clickAction(actionName)`), and per-row selection
  (`selectItem(itemName)`). Distinct from every prior
  admin-tree driver's smaller method counts.
- A **two-modal-getter posture** —
  (`rejectModal`, `bulkConfirmDialog`) — both pinned
  to the `[role="dialog"][aria-modal="true"]`
  composite-attribute selector with a `hasText`
  filter. The first modal targets the per-row reject
  flow (`/reject item/i`); the second targets the
  bulk-action confirm flow with a multi-action
  alternation regex (`/approve items|reject items|delete items/i`)
  that lets the same getter resolve to whichever bulk
  modal is currently mounted. Distinct from every
  prior admin-tree driver's single-modal-getter
  posture.
- A **`<input>`-id-bound modal-scoped input getter**
  — `rejectionReasonInput` resolves via
  `this.rejectModal.locator('#rejectionReason')` —
  the **first** admin-tree driver to scope an `id`-
  selector through a parent modal-Locator getter. The
  posture composes the modal getter's late-binding
  contract (the modal mounts only after the reject
  trigger fires) with the id-selector's production-
  source-stable hook.
- A **`<h4>`-tag-anchored named-row resolver
  (`getItemByName(name)`)** — uses
  `this.page.locator('h4').filter({ hasText: name }).first().locator('..').locator('..')`
  to find the item row by walking up two parents
  from the per-item `<h4>` heading. The double
  `..` walk is **the first** admin-tree driver
  posture to document a multi-level DOM-traversal
  resolution; distinct from the named-row helpers
  the collections driver documents
  (`getCollectionByName(name)` walks one parent
  level), and distinct from every other admin-tree
  driver's `getByRole('row')` accessibility-tree-
  canonical posture.
- A **multi-attribute composite OR-selector for the
  pagination Locator** — `pagination` resolves via
  `nav[aria-label*="pagination"], nav[aria-label*="Pagination"]`,
  a comma-separated CSS selector that matches both
  lowercase and capitalised `aria-label` values
  (defending against the production-source's
  inconsistent capitalisation between the lowercase
  HeroUI default and the capitalised English
  translation). Distinct from every prior admin-tree
  driver's single-attribute-anchored posture.
- A **partial-`aria-label`-substring-anchored
  toolbar selector** — `bulkActionBar` resolves via
  `[role="toolbar"][aria-label*="ulk"]`, a
  case-sensitive substring match on the `ulk`
  fragment that survives both `Bulk` and `bulk`
  capitalisation drift while remaining strict
  enough to disambiguate against any other
  toolbar (e.g. a pagination toolbar). The
  three-letter `ulk` substring is the **first**
  admin-tree driver posture to document a sub-
  word substring anchor.

Where [`base-page-object.md`](base-page-object.md)
documents the **page-object inheritance root**, this
page documents the **suite's admin items-management
driver boundary** at `/admin/items` — the smallest
possible page object that lets a spec drive the admin
items page end-to-end.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-items` driver is consumed today by four
distinct spec files — the largest spec-fan-out of any
admin-tree driver to date:

- [`apps/web-e2e/tests/admin/items.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items.spec.ts)
  — three baseline flows over the items management
  surface (admin can access items management page,
  items page displays items list or empty state,
  items page has add item button).
- [`apps/web-e2e/tests/admin/items-crud.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-crud.spec.ts)
  — the per-item CRUD lifecycle flows (create / edit
  / delete items) consumed via the `getItemByName(name)`
  resolver and the `openActionsMenu` /
  `clickAction(...)` action-menu helpers.
- [`apps/web-e2e/tests/admin/items-filter.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-filter.spec.ts)
  — the status-tab filter flows (All / Approved /
  Pending / Draft / Rejected) consumed via the
  `selectStatusTab(status)` helper and the search-
  flow exercises consumed via `searchItems(term)` /
  `clearSearch()`.
- [`apps/web-e2e/tests/admin/items-review.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-review.spec.ts)
  — the per-row review flows (approve / reject /
  bulk approve / bulk reject / bulk delete) consumed
  via the bulk-action toolbar Locators and the
  `rejectModal` / `bulkConfirmDialog` getters.

A spec that drives the admin items surface inline
(via `await page.goto('/admin/items')` then
`await page.getByRole('button', { name: /add item/i }).first().click()`
or any of the dozens of inline equivalents)
is a **drift** that this page object is the canonical
replacement for; new specs that touch the admin
items management surface must reach for
`AdminItemsPage` instead.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The admin-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root — see [`base-page-object.md`](base-page-object.md). Required because `extends BasePage` evaluates the symbol at class-declaration time. | Anchors the items driver to the canonical page-object base. |
| `export class AdminItemsPage extends BasePage` | named export | Single class declaration with `extends BasePage` — inherits the page-object base. Adds eleven per-page Locator fields, nine methods, and two getters on top. | The class is the canonical driver for the admin items-management surface today; every spec that drives the page instantiates this class, never a bespoke inline driver. |
| `readonly heading: Locator` | field | `page.getByRole('heading').first()` — the **first** heading on the page, regardless of level. | Symmetric with every other admin-tree driver's heading getter. |
| `readonly addItemButton: Locator` | field | `page.getByRole('button', { name: /add item\|create item/i }).first()` — the **first** button whose accessible name matches either "Add Item" or "Create Item" (case-insensitive). | The OR-of-two-substrings regex tolerates the production-source rephrasing between `Add Item` (the current label) and `Create Item` (a plausible future label after a UX rename). The `.first()` pin defends against multi-button pages. |
| `readonly searchBar: Locator` | field | `page.getByRole('searchbox').first()` — the **first** `<searchbox>` on the page. | The accessibility-tree-canonical `searchbox` role posture is more stable than the `textbox` role used by the featured-items driver because the items page emits `<input type="search">` (which gets the `searchbox` role automatically) rather than `<input type="text">` (which gets the `textbox` role). |
| `readonly itemsList: Locator` | field | `page.locator('.space-y-4').first()` — the **first** `.space-y-4` Tailwind-utility-anchored container. | The items list mounts as a `<div class="space-y-4">` flex column today. The `.first()` pin defends against multi-list pages. The Tailwind-utility selector is the production-source-stable hook today; a future migration to a `[role="list"]` ARIA-tagged container would let the driver adopt the accessibility-tree-canonical posture without breaking the existing positional fallback. |
| `readonly pagination: Locator` | field | `page.locator('nav[aria-label*="pagination"], nav[aria-label*="Pagination"]')` — a multi-attribute OR-selector that matches both lowercase and capitalised `aria-label` values. | The HeroUI Pagination component emits `<nav aria-label="pagination">` (lowercase) by default, but the localised English translation may capitalise the label to `Pagination`. The OR-selector lets the driver tolerate both. |
| `readonly selectAllCheckbox: Locator` | field | `page.getByRole('checkbox', { name: /select all/i })` — the per-page "Select all" checkbox. | The accessible name matches the production-source label "Select all" (case-insensitive). The checkbox is rendered above the items list and toggles the per-row selection state for every item on the current page. |
| `readonly bulkActionBar: Locator` | field | `page.locator('[role="toolbar"][aria-label*="ulk"]')` — the bulk-action toolbar, scoped via the `[role="toolbar"]` role plus the `[aria-label*="ulk"]` substring match. | The toolbar appears below the items list when at least one item is selected. The `ulk` substring matches both `Bulk` and `bulk` capitalisation drift. The case-sensitive partial substring `ulk` is more permissive than `Bulk` but more strict than the empty-string default — a deliberate trade-off between case tolerance and selector specificity. |
| `readonly bulkApproveButton: Locator` | field | `this.bulkActionBar.getByRole('button', { name: /^approve$/i })` — the bulk-approve trigger, scoped through the `bulkActionBar` Locator. | The exact-match `^approve$` anchored regex is required because a substring posture (`/approve/i`) would match accidentally on a future `Approve & notify` button or any other approve-related trigger. The toolbar-scope is the second-line defence. |
| `readonly bulkRejectButton: Locator` | field | `this.bulkActionBar.getByRole('button', { name: /^reject$/i })` — the bulk-reject trigger. | Symmetric with `bulkApproveButton`. |
| `readonly bulkDeleteButton: Locator` | field | `this.bulkActionBar.getByRole('button', { name: /^delete$/i })` — the bulk-delete trigger. | Symmetric with `bulkApproveButton` / `bulkRejectButton`. |
| `readonly bulkDeselectButton: Locator` | field | `this.bulkActionBar.getByRole('button', { name: /deselect/i })` — the bulk-deselect-all trigger. | Substring (not exact-match) because the production-source label is `Deselect all`, but a future shortened label like `Deselect` is plausible. The substring posture tolerates both. |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds all eleven per-page Locators in a single pass. The toolbar-scoped Locators (`bulkApproveButton`, `bulkRejectButton`, `bulkDeleteButton`, `bulkDeselectButton`) are constructed by chaining `.getByRole(...)` on the already-bound `bulkActionBar` field. | The chained-Locator construction is the canonical Playwright pattern for scoping a Locator through a parent Locator at constructor time. |
| `async navigate()` | method | `await this.goto('/admin/items')` — navigates to the admin items management route via the inherited `goto()` from `BasePage`. | The single canonical entry-point for every consuming spec. |
| `async selectStatusTab(status)` | method | `await this.page.getByRole('tab', { name: new RegExp(`^${status}`, 'i') }).click()` — clicks a status-tab by its accessible name prefix. The `status` parameter has a five-element TypeScript union: `'All' \| 'Approved' \| 'Pending' \| 'Draft' \| 'Rejected'`. | The TypeScript union narrows the parameter to the five canonical status-tab labels, preventing typo-driven misuses (e.g. `selectStatusTab('Active')` would be a TypeScript error). The `^${status}` prefix-anchor regex matches the tab whose label starts with the status name (e.g. `Approved (123)` matches `^Approved`); the `i` flag tolerates case drift. |
| `async searchItems(term)` | method | `await this.searchBar.fill(term)` — types `term` into the search bar. | Symmetric with the featured-items driver's `search(term)` helper. |
| `async clearSearch()` | method | `await this.searchBar.clear()` — clears the search bar via Playwright's `Locator.clear()` helper. | Symmetric with the featured-items driver's `clearSearch()` helper. |
| `getItemByName(name): Locator` | method | `this.page.locator('h4').filter({ hasText: name }).first().locator('..').locator('..')` — finds the item row by walking up two parents from the per-item `<h4>` heading. | The double-`..` walk is the **first** admin-tree driver posture to document a multi-level DOM-traversal resolution. The `<h4>` tag-anchor is the production-source-stable hook today (the items list emits each item's name as a `<h4>` heading); the two-parent walk lifts the resolution from the heading element up to the row container that wraps the per-row action menu and selection checkbox. |
| `async openActionsMenu(itemName)` | method | `await itemRow.getByRole('button', { name: /actions/i }).click()` — opens the actions menu for a specific item by name. The method composes `getItemByName(itemName)` then drives the per-row actions trigger. | The substring `/actions/i` regex matches both `Actions` and `actions` capitalisation drift while remaining strict enough to disambiguate against any other button on the row. |
| `async clickAction(actionName)` | method | `await this.page.getByRole('menuitem', { name: new RegExp(actionName, 'i') }).click()` — clicks an action from an open dropdown menu by its accessible-name regex. | The `RegExp(actionName, 'i')` constructor builds the regex at call time so the helper accepts any action name (e.g. `clickAction('Edit')`, `clickAction('Delete')`, `clickAction('View')`). The `i` flag tolerates case drift. The `[role="menuitem"]` role-anchor disambiguates against any other element on the page. |
| `async selectItem(itemName)` | method | `await checkbox.click()` — clicks the per-row selection checkbox by its accessible-name suffix. | The accessible-name regex `select ${itemName}` matches the production-source pattern (e.g. `Select Awesome Tool`). |
| `get rejectModal()` | getter | `this.page.locator('[role="dialog"][aria-modal="true"]').filter({ hasText: /reject item/i })` — the per-row reject modal. | The `[role="dialog"][aria-modal="true"]` composite-attribute selector pins to the WAI-ARIA `dialog` role plus the `aria-modal="true"` attribute (which marks the dialog as modal). The `/reject item/i` text filter disambiguates against the bulk-action confirm modal. |
| `get rejectionReasonInput()` | getter | `this.rejectModal.locator('#rejectionReason')` — the rejection-reason textarea, scoped through the reject modal. | The id-selector is the production-source-stable hook today (the textarea emits `<textarea id="rejectionReason">`). The modal-scope is the second-line defence against any other element with the same id. |
| `get bulkConfirmDialog()` | getter | `this.page.locator('[role="dialog"][aria-modal="true"]').filter({ hasText: /approve items\|reject items\|delete items/i })` — the bulk-action confirm dialog. | The multi-action alternation regex (`/approve items\|reject items\|delete items/i`) lets the same getter resolve to whichever bulk modal is currently mounted (the confirm dialog's heading text changes based on which bulk action triggered it). |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminItemsPage extends BasePage {
	readonly heading: Locator;
	readonly addItemButton: Locator;
	readonly searchBar: Locator;
	readonly itemsList: Locator;
	readonly pagination: Locator;
	readonly selectAllCheckbox: Locator;
	readonly bulkActionBar: Locator;
	readonly bulkApproveButton: Locator;
	readonly bulkRejectButton: Locator;
	readonly bulkDeleteButton: Locator;
	readonly bulkDeselectButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.addItemButton = page.getByRole('button', { name: /add item|create item/i }).first();
		this.searchBar = page.getByRole('searchbox').first();
		this.itemsList = page.locator('.space-y-4').first();
		this.pagination = page.locator('nav[aria-label*="pagination"], nav[aria-label*="Pagination"]');
		this.selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i });
		this.bulkActionBar = page.locator('[role="toolbar"][aria-label*="ulk"]');
		this.bulkApproveButton = this.bulkActionBar.getByRole('button', { name: /^approve$/i });
		this.bulkRejectButton = this.bulkActionBar.getByRole('button', { name: /^reject$/i });
		this.bulkDeleteButton = this.bulkActionBar.getByRole('button', { name: /^delete$/i });
		this.bulkDeselectButton = this.bulkActionBar.getByRole('button', { name: /deselect/i });
	}

	async navigate() {
		await this.goto('/admin/items');
	}

	/** Click a status tab to filter items. Pass empty string for "All". */
	async selectStatusTab(status: 'All' | 'Approved' | 'Pending' | 'Draft' | 'Rejected') {
		await this.page.getByRole('tab', { name: new RegExp(`^${status}`, 'i') }).click();
	}

	/** Search items using the search bar. */
	async searchItems(term: string) {
		await this.searchBar.fill(term);
	}

	/** Clear the search bar. */
	async clearSearch() {
		await this.searchBar.clear();
	}

	/** Get an item row by its name text. */
	getItemByName(name: string): Locator {
		return this.page.locator('h4').filter({ hasText: name }).first().locator('..').locator('..');
	}

	/** Open the actions menu (three-dot) for a specific item by name. */
	async openActionsMenu(itemName: string) {
		const itemRow = this.getItemByName(itemName);
		await itemRow.getByRole('button', { name: /actions/i }).click();
	}

	/** Click an action from an open dropdown menu. */
	async clickAction(actionName: string) {
		await this.page.getByRole('menuitem', { name: new RegExp(actionName, 'i') }).click();
	}

	/** Select an item's checkbox by name. */
	async selectItem(itemName: string) {
		const checkbox = this.page.getByRole('checkbox', { name: new RegExp(`select ${itemName}`, 'i') });
		await checkbox.click();
	}

	/** Get the reject modal. */
	get rejectModal() {
		return this.page.locator('[role="dialog"][aria-modal="true"]').filter({ hasText: /reject item/i });
	}

	/** Get the rejection reason textarea. */
	get rejectionReasonInput() {
		return this.rejectModal.locator('#rejectionReason');
	}

	/** Get the bulk confirm dialog. */
	get bulkConfirmDialog() {
		return this.page.locator('[role="dialog"][aria-modal="true"]').filter({ hasText: /approve items|reject items|delete items/i });
	}
}
```

## Why `AdminItemsPage` extends `BasePage`

Three load-bearing reasons the admin-tree items driver
inherits from
[`base-page-object.md`](base-page-object.md):

- **Page-route navigation via the inherited `goto`
  method.** The items driver targets a navigable URL
  (`/admin/items`). The `navigate()` shortcut closes
  over the inherited `goto()` which participates in
  `BasePage`'s post-navigation `waitForPageReady()`
  discipline.
- **Global header / footer / nav-link chrome surfaced
  for free.** The admin shell renders the same global
  header / footer / nav-link chrome on
  `/admin/items` as on every other admin route.
- **Post-navigation `waitForPageReady` stabiliser.**
  Every items flow that touches the items list /
  bulk-action toolbar / per-row action menu starts
  with `await itemsPage.navigate(); await itemsPage.waitForPageReady();`
  — the consuming specs at
  [`items.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items.spec.ts),
  [`items-crud.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-crud.spec.ts),
  [`items-filter.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-filter.spec.ts),
  and
  [`items-review.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-review.spec.ts)
  use this exact two-call shape in every flow.

## Why `searchBar` uses `getByRole('searchbox')` (and not `getByRole('textbox')`)

Three reasons the search-bar getter uses Playwright's
`getByRole('searchbox')` accessibility-tree selector
instead of the `getByRole('textbox')` posture the
featured-items driver uses:

- **The items page emits `<input type="search">`.** The
  production source uses an HTML5 `<input type="search">`
  element, which gets the `searchbox` role automatically
  via the user-agent stylesheet's role-mapping (see
  the WAI-ARIA in HTML 1.0 spec). The `getByRole('searchbox')`
  posture is the production-source-stable hook for
  search-typed inputs.
- **The featured-items driver emits `<input type="text">`.**
  The featured-items page uses an HTML5 `<input type="text">`
  element, which gets the `textbox` role. The role
  divergence is intentional — search-flow inputs get
  the `searchbox` role, free-text-flow inputs get the
  `textbox` role.
- **The `searchbox` role surfaces a screen-reader-
  accessible "search" announcement.** Screen readers
  announce a `<input type="search">` with the localised
  "search edit text" announcement, distinct from the
  `<input type="text">` "edit text" announcement. The
  e2e suite drives the UI the same way an assistive-
  technology user does — `getByRole('searchbox')` is
  the canonical posture for that contract.

## Why `getItemByName(name)` uses a double-`..` parent walk

Three reasons the named-row resolver uses
`this.page.locator('h4').filter({ hasText: name }).first().locator('..').locator('..')`
instead of a single-parent walk or a
`getByRole('row')` accessibility-tree-canonical
posture:

- **The items list is not `<table>`-rendered.** The
  production source emits the items list as a flex
  column of `<div>`-wrapped item cards, not a
  `<table>`. The `getByRole('row')` posture would
  resolve to zero elements because the list has no
  row semantics. The `<h4>` tag-anchor is the
  production-source-stable hook today.
- **The per-row container is two parents up from the
  per-item `<h4>` heading.** The DOM shape is
  approximately
  `<div class="row-container"><div class="row-content"><h4>Item Name</h4>…</div>…</div>`
  — the per-item `<h4>` heading sits inside a `row-
  content` wrapper, which sits inside the `row-
  container`. Walking up two parents lifts the
  resolution from the heading element up to the row
  container that wraps the per-row action menu and
  selection checkbox. A single-parent walk would
  resolve to the `row-content` wrapper, which is too
  shallow to scope the action-menu trigger.
- **The double-`..` walk is robust against future
  production-source changes.** A future refactor
  that wraps the `<h4>` in an additional layer would
  break the resolution; the docs entry on this driver
  is the contract that flags such a regression. A
  future migration to a `<table>`-rendered items list
  would let the driver adopt the
  `getByRole('row', { name })` posture without
  breaking the existing tag-anchor fallback.

## Why `selectStatusTab(status)` uses a five-element TypeScript union

Three reasons the status-tab helper uses a
`'All' | 'Approved' | 'Pending' | 'Draft' | 'Rejected'`
TypeScript union instead of a bare `string` parameter:

- **The five status-tab labels are the only canonical
  values.** The production-source `ItemStatusFilter`
  union type emits exactly five status values (the
  four real statuses plus the `All` meta-filter). A
  bare `string` parameter would let a consumer pass
  any string, including typos like `'Aproved'` or
  unsupported values like `'Active'`. The TypeScript
  union narrows the parameter to exactly the five
  canonical labels.
- **Type-narrowing surfaces typos at compile time.**
  A consumer who passes `selectStatusTab('Aproved')`
  gets a TypeScript error at compile time, not a
  runtime failure when the regex fails to resolve a
  matching tab. The compile-time check is the same
  guarantee the production-source's union type
  provides.
- **Future status additions are explicit.** A future
  contributor who adds a new status (e.g. `Archived`)
  must update the helper's union type in lockstep.
  Forgetting to update the union would surface as a
  TypeScript error at every call site that tries to
  pass the new status — a strong signal that the
  helper needs to be updated.

## Why `pagination` uses a multi-attribute OR-selector

Three reasons the pagination getter uses
`nav[aria-label*="pagination"], nav[aria-label*="Pagination"]`
instead of a single-attribute posture:

- **The HeroUI Pagination emits the lowercase
  `aria-label="pagination"` by default.** The HeroUI
  default `aria-label` is the lowercase string. A
  single-attribute posture pinned to the lowercase
  variant would resolve correctly today.
- **The localised English translation may capitalise
  the label.** The `next-intl` translation chain may
  emit the capitalised `aria-label="Pagination"` for
  the English locale. A single-attribute posture
  pinned to the lowercase variant would silently
  resolve to zero elements after a translation
  change.
- **The OR-selector tolerates both.** The comma-
  separated CSS selector matches whichever variant
  the production source emits at any given time.
  Distinct from a `[aria-label*="agination"]`
  substring posture (which would tolerate both but
  would also match accidentally on any other
  `aria-label` containing the substring).

## Why `bulkActionBar` uses a `[aria-label*="ulk"]` partial substring

Three reasons the bulk-action toolbar getter uses a
case-sensitive partial-substring `[aria-label*="ulk"]`
selector instead of an exact-match or case-insensitive
posture:

- **Capitalisation drift tolerance.** The production
  source emits `aria-label="Bulk actions"` (capital
  B) today, but a future refactor that switches to
  the lowercase `bulk actions` would not break this
  driver. The three-letter `ulk` substring matches
  both variants without any case-insensitivity flag.
- **Disambiguation against other toolbars.** The
  partial substring `ulk` is strict enough to
  disambiguate against any other toolbar on the page
  (e.g. a future pagination toolbar with
  `aria-label="page navigation"` would not match).
  Distinct from a `[aria-label*="actions"]` posture
  (which would match accidentally on any actions-
  themed toolbar).
- **No production-source change required.** The
  `[role="toolbar"]` plus `[aria-label*="ulk"]`
  composite selector pins to the production-source-
  stable contract. A `data-testid` posture would
  force a production-source change purely for the
  e2e suite.

## Why `bulkApprove` / `bulkReject` / `bulkDelete` use exact-match `^…$` regexes

Three reasons the per-action bulk triggers use
exact-match `^…$`-anchored regexes instead of the
substring posture every other admin-tree driver's
button getter uses:

- **The per-action accessible names are short single-
  word tokens.** The production source emits
  `<button>Approve</button>`, `<button>Reject</button>`,
  `<button>Delete</button>` as the per-action triggers.
  A substring regex (`/approve/i`) would match
  accidentally on any future "Approve and notify"
  button or any other approve-related trigger. The
  exact-match `^approve$` regex resolves to the
  canonical bulk-approve trigger exclusively.
- **The toolbar-scope is the second-line defence.**
  Even if a substring regex would otherwise match
  multiple buttons, the toolbar-scope (via
  `this.bulkActionBar.getByRole(...)`) limits the
  Locator to buttons inside the bulk-action toolbar
  exclusively. The exact-match regex is the first-
  line defence; the toolbar-scope is the second-line
  defence.
- **Symmetric with the data-export driver's
  `^CSV$` / `^JSON$` posture.** The data-export
  driver uses the same exact-match `^…$`-anchored
  posture for its `csvButton` / `jsonButton`
  Locators. The items driver follows the same
  convention so a future contributor can lift the
  existing pattern from either driver without
  surprise.

## Why `bulkDeselectButton` uses a substring (not exact-match) regex

Three reasons the bulk-deselect trigger uses a
substring `/deselect/i` regex instead of the exact-
match posture every other bulk-action trigger uses:

- **The production-source label is `Deselect all`.**
  The current label is `Deselect all` (two words)
  rather than the single-word `Deselect`. An exact-
  match `^deselect$` regex would silently resolve to
  zero elements.
- **A future shortened label is plausible.** A future
  UX revision might shorten the label to just
  `Deselect`. The substring posture tolerates both
  the current `Deselect all` and a future `Deselect`
  label.
- **The toolbar-scope is the second-line defence.**
  The toolbar-scope (via
  `this.bulkActionBar.getByRole(...)`) limits the
  Locator to buttons inside the bulk-action toolbar
  exclusively. The substring regex is permissive
  enough to tolerate label drift; the toolbar-scope
  is strict enough to prevent accidental matches.

## Why `rejectModal` and `bulkConfirmDialog` are getters (and not `readonly` fields)

Three reasons the modal-Locators are exposed as
getters instead of `readonly` fields pre-bound in the
constructor:

- **Late-binding against modal mount/unmount
  lifecycle.** Both modals are mounted only after
  the user clicks a triggering action (the per-row
  Reject menu item or any of the three bulk-action
  triggers). Pinning the Locators at constructor
  time would still work (Playwright Locators are
  declarative), but the getter posture surfaces the
  late-binding intent more clearly.
- **Symmetric with the modal-getter posture across
  the admin-tree page-object directory.** The
  companies / comments / clients / featured-items
  drivers expose their modal Locators as getters
  today.
- **The two getters share an underlying selector
  prefix.** Both getters resolve via
  `this.page.locator('[role="dialog"][aria-modal="true"]').filter({ hasText: ... })`
  — only the `hasText` regex differs. The getter
  posture lets the two share the resolution path
  without restating the dialog selector at each call
  site.

## What it does not contain

The items driver intentionally omits a number of
helpers that future contributors might be tempted to
add:

- **No `getByTestId` selectors.** The driver uses
  accessibility-tree-canonical posture (`getByRole`,
  `id`-selector) plus the positional Tailwind-utility
  selector exclusively.
- **No per-row Locator-factory beyond
  `getItemByName(name)`.** The driver does not
  expose a per-row "by-id" or "by-status" resolver.
  Future specs that need such resolvers must add
  them in step with the spec they add.
- **No `clickReject(itemName, reason)` composite
  flow helper.** The driver exposes the per-row
  `openActionsMenu` / `clickAction` helpers and the
  `rejectModal` / `rejectionReasonInput` Locators,
  but no helper closes over the full reject flow
  because the consuming spec at `items-review.spec.ts`
  drives the flow inline.
- **No `assertItemPresent(name)` /
  `assertItemAbsent(name)` invariant helpers.** The
  driver does not assert on the items list's
  contents. Future specs that want to assert on
  per-item visibility must derive the assertion
  inline.
- **No `clickPaginationPage(page)` / `nextPage()` /
  `prevPage()` pagination helpers.** The driver
  exposes the `pagination` Locator but does not
  expose pagination-flow helpers. Future specs that
  drive pagination must derive the per-page
  Locators inline via
  `itemsPage.pagination.getByRole('button', { name: '2' })`.

These omissions keep the driver minimal — every
property and method on the class is consumed by at
least one spec today. New specs that need additional
Locators or helpers must extend the driver in step
with the spec they add, never speculatively.

## Cross-references

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root every page object in
  `apps/web-e2e/page-objects/admin/` extends.
- [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
  — the **first** admin-tree page-object reference.
  Documents the **bulk-actions toolbar surface** at
  `/admin/items` (the same route this driver targets
  but a more focused per-toolbar driver, distinct
  from the page-level driver this page documents).
- [`admin-clients-page-object.md`](admin-clients-page-object.md)
  — the **second** admin-tree page-object reference.
  Documents the **multi-step add-form modal + nested
  delete-confirmation modal posture** at
  `/admin/clients`.
- [`admin-collections-page-object.md`](admin-collections-page-object.md)
  — the **third** admin-tree page-object reference.
  Documents the **named-row helper API + per-form
  fill helper posture** at `/admin/collections`. The
  collections driver's `getCollectionByName(name)`
  helper is the precedent for this driver's
  `getItemByName(name)` resolver, but with a single-
  parent walk instead of the double-`..` walk this
  driver uses.
- [`admin-comments-page-object.md`](admin-comments-page-object.md)
  — the **fourth** admin-tree page-object reference.
  Documents the **HeroUI-Modal-based delete
  confirmation surface** at `/admin/comments`.
- [`admin-companies-page-object.md`](admin-companies-page-object.md)
  — the **fifth** admin-tree page-object reference.
  Documents the **bare `.fixed.inset-0.z-50`
  Tailwind-overlay form modal + text-filtered
  Tailwind-overlay delete-confirmation modal
  posture** at `/admin/companies`.
- [`admin-dashboard-page-object.md`](admin-dashboard-page-object.md)
  — the **sixth** admin-tree page-object reference.
  Documents the **`getByRole('tablist')`-anchored
  multi-tab navigation surface** at `/admin`.
- [`admin-data-export-page-object.md`](admin-data-export-page-object.md)
  — the **eighth** admin-tree page-object reference.
  Documents the **`/admin` co-tenant widget**
  posture and the **composite-or `progressBar`
  selector chain**.
- [`admin-featured-items-page-object.md`](admin-featured-items-page-object.md)
  — the **seventh** admin-tree page-object reference.
  Documents the **`#active-only` id-selector toggle**
  at `/admin/featured-items`.
- [`admin-item-form-page-object.md`](admin-item-form-page-object.md)
  — the **ninth** admin-tree page-object reference.
  Documents the **per-tab multi-step admin-item form
  driver**. Distinct from this driver's items-list
  page-level surface.
- [`signin-page-object.md`](signin-page-object.md) —
  the auth-tree authentication driver.

The four
[`apps/web-e2e/tests/admin/items.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items.spec.ts),
[`apps/web-e2e/tests/admin/items-crud.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-crud.spec.ts),
[`apps/web-e2e/tests/admin/items-filter.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-filter.spec.ts),
and
[`apps/web-e2e/tests/admin/items-review.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-review.spec.ts)
spec files are the consumers of this driver today;
new specs that touch the admin items management
surface must reach for `AdminItemsPage` instead of
inlining `page.goto('/admin/items')` /
`page.getByRole('button', { name: /add item/i })` /
`page.getByRole('tab', { name: /^Approved/i })` calls.
