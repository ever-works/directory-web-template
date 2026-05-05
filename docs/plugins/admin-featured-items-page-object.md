---
id: admin-featured-items-page-object
title: E2E Admin Featured Items Page Object (apps/web-e2e/page-objects/admin/featured-items.page.ts)
sidebar_label: E2E Admin Featured Items Page Object
sidebar_position: 406
---

# E2E Admin Featured Items Page Object — `apps/web-e2e/page-objects/admin/featured-items.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin featured-items management** driver paired with
[`apps/web-e2e/page-objects/admin/featured-items.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/featured-items.page.ts).
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
`data-export.page.ts`, `item-form.page.ts`, `items.page.ts`,
`notifications.page.ts`, `reports.page.ts`,
`roles.page.ts`, `settings.page.ts`,
`sponsorships.page.ts`, `surveys.page.ts`,
`tags.page.ts`).

This page is the **seventh per-source-file reference** the
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
**HeroUI-Modal-based delete confirmation surface**
(a `[role="dialog"]` overlay rather than the browser-
native `confirm()` dialog the collections driver
documents, and rather than the custom-React
`deleteConfirmModal` overlay the clients driver
documents), the fifth
[`admin-companies-page-object.md`](admin-companies-page-object.md)
which extended the rollout with the **bare
`.fixed.inset-0.z-50` Tailwind-overlay form modal +
text-filtered Tailwind-overlay delete-confirmation
modal** posture, and the sixth
[`admin-dashboard-page-object.md`](admin-dashboard-page-object.md)
which extended the rollout with the
**`getByRole('tablist')`-anchored multi-tab navigation
surface** with a per-tab `selectTab(tabName)` helper.
The featured-items driver continues the rollout of the
remaining ten admin-tree page-object docs (one per
source file) and is the **first** admin-tree driver in
the rollout that documents an
**`#active-only` id-selector toggle** (a positional
`<input id="active-only">` checkbox surface, distinct
from every other admin-tree driver's `getByRole('button')`
or `getByRole('heading')` posture) **plus** a pair of
**search-input helpers** (`search(term)` /
`clearSearch()` — composable mutators on the same
underlying `getByRole('textbox').first()` Locator,
distinct from the form-modal-bound input mutators every
other admin-tree driver documents) **plus** a
**`statsCards` Locator getter** that pins to the
positional `.grid` selector (a CSS-utility-class anchor,
distinct from the `[role="dialog"]` / `.fixed.inset-0.z-50`
overlay primitives every other admin-tree driver's
modal-Locator getters use).

Where [`base-page-object.md`](base-page-object.md)
documents the **page-object inheritance root** — the
smallest possible class every concrete page object under
`apps/web-e2e/page-objects/admin/`,
`apps/web-e2e/page-objects/auth/`,
`apps/web-e2e/page-objects/client/`, and
`apps/web-e2e/page-objects/public/` extends — and
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
documents the **suite's admin items bulk-operations
driver boundary** at `/admin/items` and
[`admin-clients-page-object.md`](admin-clients-page-object.md)
documents the **suite's admin clients-management driver
boundary** at `/admin/clients` and
[`admin-collections-page-object.md`](admin-collections-page-object.md)
documents the **suite's admin collections-management
driver boundary** at `/admin/collections` and
[`admin-comments-page-object.md`](admin-comments-page-object.md)
documents the **suite's admin comments-management driver
boundary** at `/admin/comments` and
[`admin-companies-page-object.md`](admin-companies-page-object.md)
documents the **suite's admin companies-management
driver boundary** at `/admin/companies` and
[`admin-dashboard-page-object.md`](admin-dashboard-page-object.md)
documents the **suite's admin dashboard-landing driver
boundary** at `/admin`, this page documents the
**suite's admin featured-items-management driver
boundary** at `/admin/featured-items` — the smallest
possible page object that lets a spec drive the admin
featured-items page end-to-end (navigate to
`/admin/featured-items`, locate the page heading via the
inherited-default `getByRole('heading').first()` posture,
locate the **first** "Add Featured Item" trigger button
by its case-insensitive `/add featured item/i`
accessible-name regex, locate the search input as the
first `<textbox>` on the page, locate the active-only
filter toggle by its `#active-only` id-selector, locate
the per-row featured-item modal via the
`[role="dialog"]` accessibility-tree-canonical posture,
locate the per-stats grid via the positional `.grid`
CSS-utility selector, and run the search / clear-search
mutators that close over `fill(term)` / `.clear()` on the
shared search-input Locator).

The file is the **only driver** in the suite for the
admin featured-items-management surface today. Like
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
[`admin-clients-page-object.md`](admin-clients-page-object.md),
[`admin-collections-page-object.md`](admin-collections-page-object.md),
[`admin-comments-page-object.md`](admin-comments-page-object.md),
[`admin-companies-page-object.md`](admin-companies-page-object.md),
[`admin-dashboard-page-object.md`](admin-dashboard-page-object.md),
[`signin-page-object.md`](signin-page-object.md),
[`item-detail-page-object.md`](item-detail-page-object.md),
[`discover-page-object.md`](discover-page-object.md),
[`map-page-object.md`](map-page-object.md), and
[`public-pages-page-object.md`](public-pages-page-object.md),
the `AdminFeaturedItemsPage` class **does extend
`BasePage`** — see "Why `AdminFeaturedItemsPage` extends
`BasePage`" below for the load-bearing reasons — so it
inherits `header` / `footer` / `navLinks` / `goto` /
`gotoLocalized` / `waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and only
adds four per-page `readonly` Locator fields
(`heading`, `addButton`, `searchInput`,
`activeOnlyToggle`), three methods (`navigate()`,
`search(term)`, `clearSearch()`), and two getters
(`featuredItemModal`, `statsCards`) on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-featured-items` driver is consumed today by
[`apps/web-e2e/tests/admin/featured-items.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/featured-items.spec.ts),
which covers five flows over the admin featured-items
management surface:

- **Admin can access featured items page** — a baseline
  navigation + visibility assertion against the per-page
  `heading` and `addButton` Locators after a
  `navigate()` / `waitForPageReady()` two-call. The flow
  pins the authenticated `/admin/featured-items` route as
  reachable, the page heading as visible, and the
  "Add Featured Item" trigger as the canonical anchor
  for the page's create-flow surface.
- **Featured items page displays stats cards** — a
  stats-surface visibility assertion against the per-page
  `statsCards` Locator with a 10-second timeout to
  tolerate the React Query hydration storm that the
  per-tenant featured-items count populates the cards
  with. The flow pins the four canonical stats slots
  (Total / Active / Inactive / Available Items) as a
  single grid layout primitive that the spec asserts on
  via the `.grid` positional selector.
- **Admin can open add featured item modal** — a
  modal-mount assertion that drives the add-flow trigger
  click then waits for the `[role="dialog"]` overlay to
  appear with a 5-second timeout. The flow asserts on
  two production-source-stable id-selectors inside the
  modal (`#featuredOrder` for the display-order input,
  `#itemName` for the item-name input), then dismisses
  the modal via the `Cancel` button. The
  modal-dismissal assertion (`modal.toBeHidden`) then
  closes the loop on the modal's mount/unmount lifecycle
  contract.
- **Search input filters featured items** — a
  search-flow exercise that types a no-match term
  (`zzz-nonexistent-xyz`) into the search input via the
  `search(term)` helper, waits 1 second for the React
  Query refetch storm to settle, then clears the search
  via the `clearSearch()` helper and waits another 1
  second. The flow uses a `test.skip(true, ...)` guard
  on the `searchInput.isVisible().catch(() => false)`
  check — a defensive posture that lets the test pass
  even if a future spec moves the search input to a
  per-section panel that is not visible on the default
  view.
- **Active-only toggle filters items** — an active-
  filter exercise that clicks the `#active-only`
  toggle, waits 1 second for the refetch storm, then
  clicks again to disable. The flow uses the same
  `test.skip(true, ...)` guard pattern on
  `toggle.isVisible().catch(() => false)` so the test
  remains green even if a future refactor moves the
  toggle to a different DOM location.

A spec that drives the admin featured-items surface
inline (via
`await page.goto('/admin/featured-items')` then
`await page.getByRole('button', { name: /add featured item/i }).first().click()`
or
`await page.locator('#active-only').click()`)
is a **drift** that this page object is the canonical
replacement for; new specs that touch the admin
featured-items management surface must reach for
`AdminFeaturedItemsPage` instead.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The admin-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). The type-only posture prevents the same three failure modes the dashboard driver documents: bundle-size cost, circular-import risk against the runner's `test` export, ambient drift between `import type` and the runner's runtime. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root — see [`base-page-object.md`](base-page-object.md). Required because `extends BasePage` evaluates the symbol at class-declaration time. | Anchors the featured-items driver to the canonical page-object base — the same `header` / `footer` / `navLinks` Locators every other page object in the suite has, the same `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` helpers. |
| `export class AdminFeaturedItemsPage extends BasePage` | named export | Single class declaration with `extends BasePage` — inherits the page-object base. Adds four per-page Locator fields, the `navigate()` shortcut, the `search(term)` / `clearSearch()` helpers, and the `featuredItemModal` / `statsCards` getters on top. | See "Why `AdminFeaturedItemsPage` extends `BasePage`" below. The class is the canonical driver for the admin featured-items-management surface today; every spec that drives the page instantiates this class, never a bespoke inline driver. |
| `readonly heading: Locator` | field | `page.getByRole('heading').first()` — the **first** heading on the page, regardless of level. | The `getByRole('heading').first()` accessibility-tree-canonical posture matches the heading getter on every other admin-tree page object that has a `heading` field today (clients, collections, comments, companies). The `.first()` pin defends against multi-heading pages (e.g. a future per-section heading on top of the page-level one). |
| `readonly addButton: Locator` | field | `page.getByRole('button', { name: /add featured item/i }).first()` — the **first** button whose accessible name matches the case-insensitive `/add featured item/i` substring. | The featured-items page renders a single "Add Featured Item" trigger today (the production source uses the exact label "Add Featured Item"). The `.first()` pin defends against multi-button pages (e.g. a future per-card "Add" button in addition to the page-level one). The `/add featured item/i` regex tolerates production-source rephrasing between `Add featured item`, `add featured item`, `Add Featured Item`, `+ Add Featured Item`. |
| `readonly searchInput: Locator` | field | `page.getByRole('textbox').first()` — the **first** `<textbox>` on the page. | The featured-items page renders a single search input today as the only `<textbox>` on the page. The accessibility-tree-canonical `getByRole('textbox')` posture is the most stable Locator for the search field — distinct from a `getByPlaceholder('Search...')` posture (placeholder text changes between locales) and distinct from a `data-testid` posture (which would force a production-source change). The `.first()` pin defends against any future spec that adds a second textbox to the page (e.g. a per-row inline-edit input). |
| `readonly activeOnlyToggle: Locator` | field | `page.locator('#active-only')` — the active-only filter toggle, located via the `#active-only` id-selector. | The featured-items page renders the active-only filter as a `<input id="active-only" type="checkbox">` today. Pinning to the id-selector is more stable than `getByRole('checkbox')` (which would resolve too broadly if the page renders multiple checkboxes for per-row selection) and more stable than `getByLabel('Active only')` (label text changes between locales). The id-selector is the production-source-stable hook the toggle's `<label htmlFor="active-only">` already binds to. |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds all four per-page Locators in a single pass. | Single constructor signature with the `super(page)` call (because the class extends `BasePage`). Every spec instantiates `new AdminFeaturedItemsPage(adminPage)` against the authenticated admin fixture (no fixture-bound auto-instantiation today). |
| `async navigate()` | method | `await this.goto('/admin/featured-items')` — navigates to the admin featured-items management route via the inherited `goto()` from `BasePage`. | The single canonical entry-point for every consuming spec. The `goto()` inheritance lets the driver participate in `BasePage`'s post-navigation `waitForPageReady()` discipline without restating the network-idle wait at every call site. |
| `async search(term: string)` | method | `await this.searchInput.fill(term)` — types `term` into the search input. | The single canonical search-flow mutator. Wraps `Locator.fill(term)` so consuming specs do not need to re-derive the search-input Locator. The helper is exposed as an `async` method (rather than the bare `searchInput` Locator) because consuming specs always type into the input — exposing a Locator alone would force every call site to add the `.fill(term)` on top. |
| `async clearSearch()` | method | `await this.searchInput.clear()` — clears the search input via Playwright's `Locator.clear()` helper. | The single canonical search-flow reset mutator. Symmetric with the `search(term)` helper — both operate on the same underlying `searchInput` Locator. The `Locator.clear()` posture is distinct from `searchInput.fill('')` (which would dispatch a `change` event with the empty string) — the `Locator.clear()` posture also dispatches the platform-canonical `clear` interaction. |
| `get featuredItemModal()` | getter | `this.page.locator('[role="dialog"]').first()` — the featured-item modal, located via the WAI-ARIA `dialog` role plus a `.first()` strict-mode pin. | The featured-items page mounts the add / edit modal as a HeroUI `<dialog role="dialog">` overlay today. The accessibility-tree-canonical `[role="dialog"]` posture matches the comments driver's modal selector — distinct from the clients / companies drivers' `.fixed.inset-0.z-50` Tailwind-overlay primitive and distinct from the collections driver's browser-native `confirm()` dialog. The `.first()` pin defends against multi-modal pages (e.g. a future delete-confirmation modal on top of the add-form modal). The getter (rather than a `readonly` field) is the late-binding posture every modal-Locator driver in the admin tree uses, so the Locator resolution fires after the modal has been mounted, not at constructor time. |
| `get statsCards()` | getter | `this.page.locator('.grid').first()` — the per-stats grid layout primitive, located via the positional `.grid` Tailwind-utility selector plus a `.first()` strict-mode pin. | The featured-items page renders a four-card stats summary at the top of the page (Total / Active / Inactive / Available Items) inside a single `<div class="grid …">` layout primitive. The `.grid` positional selector is the production-source-stable hook today — distinct from a `[role="region"]` posture (the production source does not emit the `region` role on the grid wrapper) and distinct from a `data-testid` posture (which would force a production-source change). The `.first()` pin defends against multi-grid pages (e.g. a future per-row grid layout on top of the page-level one). |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminFeaturedItemsPage extends BasePage {
	readonly heading: Locator;
	readonly addButton: Locator;
	readonly searchInput: Locator;
	readonly activeOnlyToggle: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.addButton = page.getByRole('button', { name: /add featured item/i }).first();
		this.searchInput = page.getByRole('textbox').first();
		this.activeOnlyToggle = page.locator('#active-only');
	}

	async navigate() {
		await this.goto('/admin/featured-items');
	}

	/** Search featured items. */
	async search(term: string) {
		await this.searchInput.fill(term);
	}

	/** Clear search. */
	async clearSearch() {
		await this.searchInput.clear();
	}

	/** Get the featured item modal. */
	get featuredItemModal() {
		return this.page.locator('[role="dialog"]').first();
	}

	/** Get featured item count from stats. */
	get statsCards() {
		return this.page.locator('.grid').first();
	}
}
```

## Why `AdminFeaturedItemsPage` extends `BasePage`

Three load-bearing reasons the admin-tree featured-
items driver inherits from
[`base-page-object.md`](base-page-object.md) instead of
standing alone (the posture
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md)
and the other public-tree widget drivers take):

- **Page-route navigation via the inherited `goto`
  method.** The featured-items driver targets a
  navigable URL (`/admin/featured-items`) — it is a
  "page object" in the URL sense, not a global widget.
  The single `navigate()` shortcut closes over the
  inherited `await this.goto('/admin/featured-items')`,
  which in turn participates in `BasePage`'s post-
  navigation `waitForPageReady()` discipline (network-
  idle wait, locale-prefix resolution against the
  configured `baseURL`, authenticated-cookie carry-
  through). A standalone class would have to restate
  every one of these concerns inline.
- **Global header / footer / nav-link chrome surfaced
  for free.** The admin shell renders the same global
  header / footer / nav-link chrome on
  `/admin/featured-items` as on every other admin
  route. The inherited `header` / `footer` / `navLinks`
  Locators let a spec drive the featured-items surface
  **and** assert on the surrounding admin shell
  (e.g. "the user-menu link is present in the header" /
  "the sidebar contains the Featured Items link") in
  the same flow, without wiring a second base-class
  composition primitive.
- **Post-navigation `waitForPageReady` stabiliser.** Every
  featured-items flow that touches the stats grid /
  add-modal / search-input / active-only-toggle starts
  with
  `await featuredPage.navigate(); await featuredPage.waitForPageReady();`
  — the consuming spec at
  [`apps/web-e2e/tests/admin/featured-items.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/featured-items.spec.ts)
  uses this exact two-call shape in every flow. The
  `waitForPageReady` inheritance is what makes the
  second call meaningful — it's the same discipline
  every other admin-tree spec relies on for the post-
  navigation network-idle wait against the admin
  shell's React Query hydration storm.

## Why `searchInput` uses `getByRole('textbox').first()` (and not `getByPlaceholder` / `data-testid`)

Three reasons the search-input getter uses Playwright's
`getByRole('textbox').first()` accessibility-tree
selector instead of a positional placeholder posture
(`getByPlaceholder('Search…')`) or a `data-testid`
posture:

- **The featured-items page renders a single
  `<textbox>` today.** The page mounts a single search
  input inside the page-level header bar; no other
  `<textbox>` element exists on the default view.
  Pinning to the role makes the Locator stable against
  any future placeholder rephrasing (`Search`, `Search
  featured…`, `Search by name…`) and against locale-
  swap (the production source uses `next-intl` to
  translate the placeholder per-locale).
- **`.first()` defends against future per-section
  textboxes.** A future spec that adds a per-row inline-
  edit input or a per-section "filter by name"
  textbox would mount a second `<textbox>`. The
  `.first()` pin guarantees the Locator resolves to the
  first textbox in DOM order — the page-level search
  input is conventionally rendered first. A future spec
  that wants to drive a per-section textbox would
  derive a different per-section Locator rather than
  reuse the page-level one.
- **A `data-testid` posture would force a production-
  source change purely for the e2e suite.** The host
  app's featured-items page does not emit `data-testid`
  attributes on the search input today. Adding them
  would couple the test surface to a production-source
  change that brings no observable benefit. The
  WAI-ARIA `textbox` role is already a production-
  source primitive — pinning to it does not require a
  host-app change.

## Why `activeOnlyToggle` uses the `#active-only` id-selector (and not `getByRole('checkbox')` / `getByLabel`)

Three reasons the active-only filter getter uses
Playwright's `page.locator('#active-only')` id-selector
instead of `getByRole('checkbox')` or
`getByLabel('Active only')`:

- **Production-source-stable id-binding.** The
  featured-items page renders the toggle as `<input
  id="active-only" type="checkbox">` with a paired
  `<label htmlFor="active-only">Active only</label>`
  today — the id is the production-source-stable hook
  the label binding uses, so removing it would break
  the screen-reader-accessibility contract the rest of
  the admin shell honours. Pinning to the id is the
  same posture the label binding asserts on, which
  means a regression that breaks the id-binding
  surfaces in two places at once (the label binding and
  this driver's Locator).
- **`getByRole('checkbox')` would resolve too broadly.**
  The featured-items page may render multiple
  checkboxes (e.g. a per-row selection checkbox
  alongside the page-level filter toggle). The id-scope
  limits the Locator to the active-only filter
  exclusively — there is no ambiguity about which
  checkbox the helper resolves to.
- **`getByLabel('Active only')` would lock to the
  English locale.** The label text is translated per-
  locale via `next-intl` (e.g. `Active only` in EN,
  `Actifs uniquement` in FR, `Solo activos` in ES).
  Pinning to the label text would force the test to
  branch on locale, which is exactly the kind of
  fragility the id-selector posture eliminates. The
  `#active-only` id is invariant to locale.

## Why `featuredItemModal` and `statsCards` are getters (and not `readonly` fields)

Three reasons the modal-Locator and stats-grid
Locators are exposed as getters instead of `readonly`
fields pre-bound in the constructor:

- **Late-binding against modal mount/unmount
  lifecycle.** The featured-item modal is mounted only
  after the user clicks the `addButton` trigger; before
  the click, the `[role="dialog"]` selector resolves to
  zero elements. Pinning the Locator at constructor
  time would still work (Playwright Locators are
  declarative), but the getter posture surfaces the
  late-binding intent more clearly to future
  contributors who read the class declaration.
- **Symmetric with the modal-getter posture across the
  admin-tree page-object directory.** The companies /
  comments / clients drivers expose their modal
  Locators as getters today; the featured-items driver
  follows the same convention. Switching to a
  `readonly` field would diverge from the established
  pattern without any observable benefit.
- **The stats-grid Locator participates in the same
  late-binding contract.** The stats grid is rendered
  only after the per-tenant featured-items count has
  populated the cards via the React Query hydration
  storm; before the hydration completes, the `.grid`
  selector resolves to a wrapper that may not be
  visible yet. Pinning the Locator at constructor time
  is technically correct (Playwright auto-waits on
  `toBeVisible`), but the getter posture surfaces the
  late-binding intent symmetrically with the modal
  getter.

## Why `search(term)` and `clearSearch()` are async methods (and not bare Locator fields)

Three reasons the search-flow helpers are exposed as
`async` methods instead of a bare `searchInput`
Locator:

- **Consuming specs always type into / clear the
  input.** Every consuming spec call site uses the
  search-input to drive the search-flow — the input is
  never asserted on, hovered over, or read for text
  content. Exposing only the Locator would force every
  call site to add the `.fill(term)` / `.clear()` on
  top, which is boilerplate that the helpers fold in.
  The mutator-on-resolution posture matches the
  `editCollection(name)` / `deleteCollection(name)`
  helpers on the collections driver (see
  [`admin-collections-page-object.md`](admin-collections-page-object.md)).
- **The pair of helpers documents the canonical
  search-flow contract.** Exposing both `search(term)`
  and `clearSearch()` as a mutator pair makes the
  search-flow's reset contract explicit: a spec that
  calls `search(term)` is expected to call
  `clearSearch()` to reset the page state for the next
  flow. A spec that drove the search-flow via a bare
  Locator would not surface the reset contract as
  clearly.
- **The underlying `Locator.clear()` posture is the
  platform-canonical reset.** The helper closes over
  `Locator.clear()`, which dispatches the platform-
  canonical `clear` interaction (a focus + select-all +
  delete sequence) — distinct from `Locator.fill('')`,
  which dispatches a single `change` event with the
  empty string. Some search inputs that listen for the
  `clear` interaction (e.g. via the
  `onClear` callback on a HeroUI `Input`) would not
  fire on `fill('')`. Pinning to `Locator.clear()`
  preserves the production-source contract.

## What it does not contain

The featured-items driver intentionally omits a number
of helpers that future contributors might be tempted to
add:

- **No `getByTestId` selectors.** The driver uses
  accessibility-tree-canonical posture (`getByRole`,
  `id`-selector) plus the positional `.grid` /
  `[role="dialog"]` selectors exclusively. A future
  contributor who adds `data-testid` attributes to the
  production source must update this driver to consume
  them — but the default posture is the accessibility-
  tree-canonical one, and any `data-testid` migration
  must preserve the existing posture as a fallback.
- **No per-row Locator getters.** The featured-items
  page renders a per-row table of featured items today
  (the same surface the search input filters), but the
  driver does not expose per-row Locators. A future
  spec that wants to assert on a per-row state (e.g.
  "the row for `awesome-tool` is visible") must derive
  the Locator from `dashboard.page.getByRole('row',
  { name: /awesome-tool/i })` inline. The driver is the
  **smallest possible** driver for the page-level
  featured-items surface — per-row Locators would be
  added as future per-spec requirements demand them.
- **No `addFeaturedItem(...)` / `editFeaturedItem(...)`
  / `deleteFeaturedItem(...)` flow helpers.** The
  driver exposes the `addButton` trigger and the
  `featuredItemModal` Locator, but no helper closes
  over the full flow because no current spec drives a
  full add-flow. A future spec that wants to drive
  the add / edit / delete flows must add the helpers
  as part of the same spec.
- **No `assertActiveOnly` / `assertActiveAll` invariant
  helper.** The driver does not assert on the active-
  only filter's selected state. A future spec that
  wants to assert on "the toggle is checked after
  click" must derive the assertion inline —
  `expect(featuredPage.activeOnlyToggle).toBeChecked()`.
- **No `getStatsValue(label)` helper.** The driver
  exposes the `statsCards` grid Locator but does not
  expose a per-stat value-reader. A future spec that
  wants to assert on a per-stat value must derive the
  Locator inline via
  `featuredPage.statsCards.getByText(/total/i)` or a
  per-stat accessible-name regex.

These omissions keep the driver minimal — every
property and method on the class is consumed by at
least one spec today. New specs that need additional
Locators or helpers must extend the driver in step
with the spec they add, never speculatively.

## Cross-references

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root every page object in
  `apps/web-e2e/page-objects/admin/` extends. Documents
  the inherited `header` / `footer` / `navLinks` /
  `goto` / `gotoLocalized` / `waitForPageReady` /
  `getTitle` surface every admin-tree driver gets for
  free.
- [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
  — the **first** admin-tree page-object reference and
  the rollout template. Documents the **bulk-actions
  toolbar surface** at `/admin/items` (a per-row
  selection driver, distinct from the featured-items
  surface this driver documents).
- [`admin-clients-page-object.md`](admin-clients-page-object.md)
  — the **second** admin-tree page-object reference.
  Documents the **multi-step add-form modal + nested
  delete-confirmation modal posture** at
  `/admin/clients` (a custom-React `deleteConfirmModal`
  selector, distinct from the `[role="dialog"]` posture
  this driver documents).
- [`admin-collections-page-object.md`](admin-collections-page-object.md)
  — the **third** admin-tree page-object reference.
  Documents the **named-row helper API + per-form fill
  helper posture** at `/admin/collections` (a
  per-row-name resolver, distinct from the page-level
  search-input posture this driver documents).
- [`admin-comments-page-object.md`](admin-comments-page-object.md)
  — the **fourth** admin-tree page-object reference.
  Documents the **HeroUI-Modal-based delete confirmation
  surface** at `/admin/comments` (a `[role="dialog"]`
  overlay, the same posture as this driver's
  `featuredItemModal` getter).
- [`admin-companies-page-object.md`](admin-companies-page-object.md)
  — the **fifth** admin-tree page-object reference.
  Documents the **bare `.fixed.inset-0.z-50` Tailwind-
  overlay form modal + text-filtered Tailwind-overlay
  delete-confirmation modal posture** at
  `/admin/companies` (a positional-selector +
  text-filter disambiguation pair, distinct from the
  `[role="dialog"]` posture this driver uses).
- [`admin-dashboard-page-object.md`](admin-dashboard-page-object.md)
  — the **sixth** admin-tree page-object reference.
  Documents the **`getByRole('tablist')`-anchored
  multi-tab navigation surface** at `/admin` with a
  per-tab `selectTab(tabName)` helper (distinct from
  the search-input + active-only-toggle posture this
  driver documents).
- [`signin-page-object.md`](signin-page-object.md) —
  the auth-tree authentication driver. Documents the
  email / password / submit-button surface that gets
  the suite into an authenticated session before any
  admin-tree driver navigates to its route.
- [`item-detail-page-object.md`](item-detail-page-object.md),
  [`discover-page-object.md`](discover-page-object.md),
  [`map-page-object.md`](map-page-object.md),
  [`public-pages-page-object.md`](public-pages-page-object.md)
  — public-tree page-object references that document
  the unauthenticated end of the suite. Distinct from
  the admin-tree drivers in that they target
  unauthenticated routes and do not need the admin-
  shell `header` / `footer` / `navLinks` chrome.

The
[`apps/web-e2e/tests/admin/featured-items.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/featured-items.spec.ts)
spec file is the single consumer of this driver today;
new specs that touch the admin featured-items
management surface must reach for
`AdminFeaturedItemsPage` instead of inlining
`page.goto('/admin/featured-items')` /
`page.getByRole('button', { name: /add featured item/i })` /
`page.locator('#active-only')` calls.
