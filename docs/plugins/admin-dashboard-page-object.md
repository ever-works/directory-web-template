---
id: admin-dashboard-page-object
title: E2E Admin Dashboard Page Object (apps/web-e2e/page-objects/admin/dashboard.page.ts)
sidebar_label: E2E Admin Dashboard Page Object
sidebar_position: 405
---

# E2E Admin Dashboard Page Object — `apps/web-e2e/page-objects/admin/dashboard.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin dashboard** driver paired with
[`apps/web-e2e/page-objects/admin/dashboard.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/dashboard.page.ts).
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
`data-export.page.ts`, `featured-items.page.ts`,
`item-form.page.ts`, `items.page.ts`,
`notifications.page.ts`, `reports.page.ts`,
`roles.page.ts`, `settings.page.ts`,
`sponsorships.page.ts`, `surveys.page.ts`,
`tags.page.ts`).

This page is the **sixth per-source-file reference** the
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
**HeroUI-Modal-based delete confirmation surface** (a
`[role="dialog"]` overlay rather than the browser-native
`confirm()` dialog the collections driver documents, and
rather than the custom-React `deleteConfirmModal` overlay
the clients driver documents), and the fifth
[`admin-companies-page-object.md`](admin-companies-page-object.md)
which extended the rollout with the **bare
`.fixed.inset-0.z-50` Tailwind-overlay form modal +
text-filtered Tailwind-overlay delete-confirmation modal**
posture (a positional-selector + text-filter
disambiguation pair distinct from the named-class /
`[role="dialog"]` / browser-native `confirm()` postures
the four prior admin-tree drivers document). The
dashboard driver continues the rollout of the remaining
eleven admin-tree page-object docs (one per source file)
and is the **first** admin-tree driver in the rollout
that documents a **`getByRole('tablist')`-anchored
multi-tab navigation surface** with a per-tab
`selectTab(tabName)` helper that closes over a
case-insensitive substring-match accessible-name regex
(distinct from the form-modal / row-action postures the
five prior admin-tree drivers document, and distinct from
every public-tree driver in the suite which has no tab-
based navigation surface today).

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
driver boundary** at `/admin/companies`, this page
documents the **suite's admin dashboard-landing driver
boundary** at `/admin` — the smallest possible page
object that lets a spec drive the admin dashboard's
landing page end-to-end (navigate to `/admin`, locate
the main content region via the `#main-content` id-
selector, locate the tab navigation via the
accessibility-tree-canonical `getByRole('tablist')`
locator, locate the refresh trigger via the case-
insensitive `/refresh/i` accessible-name regex, and
select a per-tab navigation target by case-insensitive
substring-match accessible-name filter via the
`selectTab(tabName)` helper).

The file is the **only driver** in the suite for the
admin dashboard-landing surface today. Like
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
[`admin-clients-page-object.md`](admin-clients-page-object.md),
[`admin-collections-page-object.md`](admin-collections-page-object.md),
[`admin-comments-page-object.md`](admin-comments-page-object.md),
[`admin-companies-page-object.md`](admin-companies-page-object.md),
[`signin-page-object.md`](signin-page-object.md),
[`item-detail-page-object.md`](item-detail-page-object.md),
[`discover-page-object.md`](discover-page-object.md),
[`map-page-object.md`](map-page-object.md), and
[`public-pages-page-object.md`](public-pages-page-object.md),
the `AdminDashboardPage` class **does extend `BasePage`**
— see "Why `AdminDashboardPage` extends `BasePage`"
below for the load-bearing reasons — so it inherits
`header` / `footer` / `navLinks` / `goto` / `gotoLocalized`
/ `waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and only
adds three per-page `readonly` Locator fields
(`mainContent`, `tabList`, `refreshButton`) and two
methods (`navigate()`, `selectTab(tabName)`) on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-dashboard` driver is consumed today by
[`apps/web-e2e/tests/admin/dashboard.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/dashboard.spec.ts),
which covers four flows over the admin-shell dashboard-
landing surface:

- **Authenticated admin can access admin panel** — a
  baseline navigation + visibility assertion against the
  inherited `body` Locator and the per-page
  `mainContent` Locator after a `navigate()` call. The
  flow pins the authenticated `/admin` route as
  reachable and the `#main-content` region as the
  canonical anchor for the dashboard's body chrome.
- **Admin dashboard displays tab navigation** — a tab-
  surface visibility assertion against the per-page
  `tabList` Locator after a `navigate()` /
  `waitForPageReady()` two-call. The flow pins the
  `getByRole('tablist')` accessibility-tree-canonical
  posture for the per-section tab nav and the post-
  navigation `waitForPageReady()` discipline that lets
  the dashboard's React Query hydration storm settle
  before the tablist is asserted.
- **Non-admin client is redirected from admin** — a
  middleware-shape assertion that drives the
  unauthenticated-but-`clientPage`-authenticated session
  to `/admin` and asserts the URL no longer matches
  `/\/admin$/` after the redirect. The flow pins the
  middleware-or-route-guard contract that non-admin
  authenticated sessions must NOT land on `/admin`
  (regardless of which route the redirect target is —
  `/unauthorized`, `/auth/signin`, or the client area).
- **Unauthenticated user cannot access admin** — a
  middleware-shape assertion that drives an anonymous
  `page` to `/admin` and asserts the URL ends up
  matching `/\/(auth\/signin|unauthorized)/`. The flow
  pins the route-guard contract that anonymous sessions
  must land on `/auth/signin` or `/unauthorized` (and
  not on a fabricated 404 / 500 / dashboard-with-blank-
  data shell).

A spec that drives the admin dashboard surface inline
(via
`await page.goto('/admin')` then
`await page.locator('#main-content')`
or
`await page.getByRole('tablist').getByRole('tab', { name: 'Items' }).click()`)
is a **drift** that this page object is the canonical
replacement for; new specs that touch the admin
dashboard-landing surface must reach for
`AdminDashboardPage` instead.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The admin-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports the dashboard driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root — see [`base-page-object.md`](base-page-object.md). Required because `extends BasePage` evaluates the symbol at class-declaration time. | Anchors the dashboard driver to the canonical page-object base — the same `header` / `footer` / `navLinks` Locators every other page object in the suite has, the same `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` helpers. |
| `export class AdminDashboardPage extends BasePage` | named export | Single class declaration with `extends BasePage` — inherits the page-object base. Adds three per-page Locator fields, the `navigate()` shortcut, and the `selectTab(tabName)` helper on top. | See "Why `AdminDashboardPage` extends `BasePage`" below. The class is the canonical driver for the admin dashboard-landing surface today; every spec that drives the dashboard instantiates this class, never a bespoke inline driver. |
| `readonly mainContent: Locator` | field | `page.locator('#main-content')` — locates the dashboard's main-content region via the `#main-content` id-selector. | The id-selector posture is distinct from every other admin-tree driver's `getByRole('heading')` page-anchor posture — the dashboard's body chrome is a region wrapper, not a heading element. The id-selector is production-source-stable today (the admin shell renders `<main id="main-content">` as the canonical body wrapper for every admin route, but the dashboard is the only route the e2e suite asserts the id-region on directly). A regression that renames the id (e.g. to `dashboard-content`) would surface immediately as a Locator-not-visible error. |
| `readonly tabList: Locator` | field | `page.getByRole('tablist')` — accessibility-tree-canonical Locator for the dashboard's per-section tab nav. | The dashboard renders a tab nav today (Overview / Items / Users / Categories / etc.) that uses the WAI-ARIA `tablist` role. The `getByRole('tablist')` posture is the canonical accessibility-tree anchor — distinct from a positional `nav.tabs` selector, distinct from a `data-testid` posture. The accessibility-tree posture also doubles as an a11y assertion: a regression that breaks the WAI-ARIA `tablist` role binding would surface immediately as a Locator-not-visible error. |
| `readonly refreshButton: Locator` | field | `page.getByRole('button', { name: /refresh/i }).first()` — the **first** button whose accessible name matches the case-insensitive `/refresh/i` substring. | The dashboard renders a refresh trigger today that re-fetches the per-section stats. The `.first()` pin defends against multi-button pages (e.g. a future per-card "Refresh" button in addition to the page-level one). The case-insensitive `/refresh/i` regex tolerates production-source rephrasing between `Refresh`, `refresh`, `Refresh stats`, `Force refresh`. The button is exposed as a per-page Locator field even though no current spec asserts on it, so future per-section / per-stats refresh-flow specs can pick it up without re-deriving the selector. |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds all three per-page Locators in a single pass. | Single constructor signature with the `super(page)` call (because the class extends `BasePage`). Every spec instantiates `new AdminDashboardPage(adminPage)` against the authenticated admin fixture (no fixture-bound auto-instantiation today). |
| `async navigate()` | method | `await this.goto('/admin')` — navigates to the admin dashboard-landing route via the inherited `goto()` from `BasePage`. | The single canonical entry-point for every consuming spec. The `goto()` inheritance lets the driver participate in `BasePage`'s post-navigation `waitForPageReady()` discipline without restating the network-idle wait at every call site. |
| `async selectTab(tabName: string)` | method | `await this.tabList.getByRole('tab', { name: tabName, exact: false }).click()` — selects a per-section tab in the dashboard's tab nav by case-insensitive substring-match accessible name. | The per-tab navigation helper. The `tabList`-scoped selector guarantees the helper only resolves a tab inside the per-section tab nav (and not a stray button elsewhere on the page that happens to share an accessible name with a tab). The `exact: false` posture is the canonical Playwright shortcut for case-insensitive substring-match — distinct from a regex posture, distinct from a strict `exact: true` posture. The per-tab helper is exposed as an `async` method (rather than a per-tab Locator getter) because consuming specs always click the resolved tab — exposing a Locator getter would force every call site to add the `.click()` on top. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminDashboardPage extends BasePage {
	readonly mainContent: Locator;
	readonly tabList: Locator;
	readonly refreshButton: Locator;

	constructor(page: Page) {
		super(page);
		this.mainContent = page.locator('#main-content');
		this.tabList = page.getByRole('tablist');
		this.refreshButton = page.getByRole('button', { name: /refresh/i }).first();
	}

	async navigate() {
		await this.goto('/admin');
	}

	async selectTab(tabName: string) {
		await this.tabList.getByRole('tab', { name: tabName, exact: false }).click();
	}
}
```

## Why `AdminDashboardPage` extends `BasePage`

Three load-bearing reasons the admin-tree dashboard
driver inherits from
[`base-page-object.md`](base-page-object.md) instead of
standing alone (the posture
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md)
and the other public-tree widget drivers take):

- **Page-route navigation via the inherited `goto`
  method.** The dashboard driver targets a navigable URL
  (`/admin`) — it is a "page object" in the URL sense,
  not a global widget. The single `navigate()` shortcut
  closes over the inherited `await this.goto('/admin')`,
  which in turn participates in `BasePage`'s post-
  navigation `waitForPageReady()` discipline (network-
  idle wait, locale-prefix resolution against the
  configured `baseURL`, authenticated-cookie carry-
  through). A standalone class would have to restate
  every one of these concerns inline.
- **Global header / footer / nav-link chrome surfaced
  for free.** The admin shell renders the same global
  header / footer / nav-link chrome on `/admin` as on
  every other admin route. The inherited `header` /
  `footer` / `navLinks` Locators let a spec drive the
  dashboard surface **and** assert on the surrounding
  admin shell (e.g. "the user-menu link is present in
  the header" / "the sidebar contains the Items link")
  in the same flow, without wiring a second base-class
  composition primitive.
- **Post-navigation `waitForPageReady` stabiliser.** Every
  dashboard flow that touches the tab nav starts with
  `await dashboard.navigate(); await dashboard.waitForPageReady();`
  — the consuming spec at
  [`apps/web-e2e/tests/admin/dashboard.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/dashboard.spec.ts)
  uses this exact two-call shape in the
  "admin dashboard displays tab navigation" flow.
  The `waitForPageReady` inheritance is what makes the
  second call meaningful — it's the same discipline
  `bulk-actions.spec.ts`, `clients.spec.ts`,
  `collections.spec.ts`, `comments.spec.ts`,
  `companies.spec.ts`, `items-crud.spec.ts`,
  `items-filter.spec.ts`, `items-review.spec.ts`, and
  every other admin-tree spec rely on for the post-
  navigation network-idle wait against the admin shell's
  React Query hydration storm.

## Why `mainContent` uses `#main-content` (and not `getByRole('main')`)

Three reasons the main-content getter uses a
positional `#main-content` id-selector instead of
`getByRole('main')` (the WAI-ARIA accessibility-tree-
canonical posture):

- **Production-source-stable id-binding.** The admin
  shell renders the dashboard body wrapper as
  `<main id="main-content">` today — the id is the
  production-source-stable hook the skip-link target
  uses (`<a href="#main-content">Skip to content</a>`),
  so removing it would break the keyboard-accessibility
  contract the rest of the suite asserts on. Pinning to
  the id is the same posture the skip-link asserts on,
  which means a regression that breaks the id-binding
  surfaces in two places at once (the skip-link spec
  and this dashboard spec).
- **`getByRole('main')` would resolve too broadly.** The
  admin shell renders the `<main>` element as a layout
  wrapper around every admin route, so
  `getByRole('main')` would also match the `<main>` on
  every other admin route. The id-scope limits the
  Locator to the dashboard-specific body wrapper —
  although today every admin route shares the same
  id, a future per-route id (e.g. `dashboard-content`,
  `items-content`) would still resolve to the dashboard's
  wrapper as long as the `#main-content` id is stable
  on `/admin` itself. The id-selector is the more
  pinpointed of the two.
- **A `data-testid` posture would force a production-
  source change purely for the e2e suite.** The host
  app's dashboard does not emit `data-testid` attributes
  today. Adding them would couple the test surface to a
  production-source change that brings no observable
  benefit. The `id="main-content"` attribute is already
  a production-source primitive — pinning to it does
  not require a host-app change.

## Why `tabList` uses `getByRole('tablist')` (and not a `data-testid`)

Three reasons the tab-nav getter uses Playwright's
`getByRole('tablist')` accessibility-tree selector
instead of a positional `nav.tabs` CSS selector or a
`data-testid` posture:

- **Accessibility-tree-canonical posture.** The
  WAI-ARIA `tablist` role is the canonical
  accessibility-tree anchor for any tab-nav surface.
  Pinning to it doubles as an a11y assertion — a
  regression that breaks the role binding (e.g. a
  refactor that renders a `<nav>` with `<a>` children
  instead of a `<div role="tablist">` with `<button
  role="tab">` children) would surface immediately as
  a Locator-not-visible error.
- **Production-source consistency with the per-tab
  `getByRole('tab')` posture.** The
  `selectTab(tabName)` helper resolves per-tab targets
  via `this.tabList.getByRole('tab', { name: tabName,
  exact: false })` — the same accessibility-tree posture
  as the parent `tablist`. Mixing posture (`tablist`-
  scope via id-selector + per-tab via `getByRole('tab')`)
  would mean a single-role refactor on the production
  source would have to update two separate selectors.
  The single-posture discipline is easier to maintain.
- **A `data-testid` posture would force a production-
  source change purely for the e2e suite.** The host
  app's dashboard does not emit `data-testid` attributes
  on the tab nav today. Adding them would couple the
  test surface to a production-source change that
  brings no observable benefit. The WAI-ARIA `tablist`
  role is already a production-source primitive —
  pinning to it does not require a host-app change.

## Why `refreshButton` uses `getByRole('button', { name: /refresh/i }).first()`

Three reasons the refresh-button getter uses Playwright's
case-insensitive substring-match accessible-name regex
plus the `.first()` pin instead of a `data-testid` or a
strict `exact: true` posture:

- **Case-insensitive substring-match tolerates
  production-source rephrasing.** The `/refresh/i`
  regex matches `Refresh`, `refresh`, `Refresh stats`,
  `Force refresh`, and any other accessible-name that
  contains the `refresh` substring case-insensitively.
  A strict `exact: true` posture would force the test
  to update every time the production source rephrases
  the button label. The substring-match posture
  trades a small amount of disambiguation strength
  (multiple matches are possible) for a much larger
  amount of refactor-tolerance.
- **`.first()` defends against multi-button pages.** The
  dashboard may render multiple refresh triggers (e.g.
  a page-level "Refresh stats" button and a per-card
  "Refresh" button on each metric tile). The `.first()`
  pin guarantees the Locator resolves to the first
  refresh button in DOM order — the page-level one is
  conventionally rendered first. A future spec that
  wants to drive a per-card refresh would derive a
  different per-card Locator rather than reuse the
  page-level one.
- **A `data-testid` posture would force a production-
  source change purely for the e2e suite.** The host
  app's dashboard does not emit `data-testid` attributes
  on the refresh button today. Adding them would couple
  the test surface to a production-source change that
  brings no observable benefit. The accessible-name is
  already a production-source primitive (the button's
  visible label).

## Why `selectTab` is an async method (and not a per-tab Locator getter)

Three reasons the per-tab navigation helper is exposed
as an `async selectTab(tabName: string)` method instead
of a per-tab Locator getter (e.g. `getTab(tabName:
string): Locator`):

- **Consuming specs always click the resolved tab.**
  Every consuming spec call site uses the resolved tab
  to navigate to the per-section view — the resolved
  tab is never asserted on, hovered over, or read for
  text content. Exposing a Locator getter would force
  every call site to add the `.click()` on top, which
  is boilerplate that the helper folds in. The
  click-on-resolution posture matches the
  `editCollection(name)` / `deleteCollection(name)`
  helpers on the collections driver (see
  [`admin-collections-page-object.md`](admin-collections-page-object.md)).
- **The `tabList`-scoped selector is the load-bearing
  invariant.** The helper closes over
  `this.tabList.getByRole('tab', ...)` — the
  `tabList`-scope guarantees the per-tab Locator only
  resolves a tab inside the per-section tab nav (and
  not a stray button elsewhere on the page that
  happens to share an accessible name with a tab).
  Inlining the same scope at every call site
  (`await dashboard.tabList.getByRole('tab', { name:
  tabName, exact: false }).click()`) would be more
  verbose than `await dashboard.selectTab(tabName)`.
- **The `exact: false` posture is the canonical
  Playwright shortcut for case-insensitive
  substring-match.** The helper passes the raw
  `tabName` string through to Playwright's
  `getByRole('tab', { name: tabName, exact: false })`
  selector. The `exact: false` posture is Playwright's
  built-in shortcut for case-insensitive substring-
  match, distinct from a regex posture (`new RegExp(
  tabName, 'i')`) which would require the call site
  to escape regex metacharacters. The string-input
  + `exact: false` posture is the most ergonomic
  posture for the typical call site (e.g.
  `await dashboard.selectTab('Items')`).

## What it does not contain

The dashboard driver intentionally omits a number of
helpers that future contributors might be tempted to
add:

- **No `getByTestId` selectors.** The driver uses
  accessibility-tree-canonical posture (`getByRole`,
  `id`-selector) exclusively. A future contributor
  who adds `data-testid` attributes to the production
  source must update this driver to consume them — but
  the default posture is the accessibility-tree-
  canonical one, and any `data-testid` migration must
  preserve the existing `getByRole` posture as a
  fallback.
- **No per-tab Locator getters.** The
  `selectTab(tabName)` helper is the canonical per-tab
  driver. A future spec that wants to assert on a
  per-tab Locator (e.g. "the Items tab is selected")
  must derive the Locator from `this.tabList.getByRole('tab',
  { name: ..., exact: false })` inline — exposing
  per-tab Locator getters would explode the surface
  with one getter per documented tab.
- **No per-stat Locators.** The dashboard renders
  per-section stats (total items, total users, total
  categories, etc.) but the driver does not expose
  per-stat Locators. A future spec that wants to assert
  on a per-stat value must derive the Locator inline
  via `dashboard.mainContent.getByText(/total items/i)`
  or a per-stat accessible-name regex. The driver is
  the **smallest possible** driver for the dashboard-
  landing surface — per-stat Locators would be added
  as future per-spec requirements demand them.
- **No `clickRefresh()` helper.** The `refreshButton`
  Locator is exposed but no helper closes over the
  `.click()` because no current spec drives the
  refresh-flow surface. A future spec that wants to
  drive the refresh-flow must add the `clickRefresh()`
  helper as part of the same spec.
- **No `assertTabSelected(tabName)` helper.** The
  driver does not assert on the per-tab selected-state
  contract. A future spec that wants to assert on
  "the X tab is selected after `selectTab(X)`" must
  derive the assertion inline — `expect(
  dashboard.tabList.getByRole('tab', { name: X, exact:
  false })).toHaveAttribute('aria-selected', 'true')`.

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
  selection driver, distinct from the per-section tab
  nav this driver documents).
- [`admin-clients-page-object.md`](admin-clients-page-object.md)
  — the **second** admin-tree page-object reference.
  Documents the **multi-step add-form modal + nested
  delete-confirmation modal posture** at
  `/admin/clients` (a custom-React `deleteConfirmModal`
  selector, distinct from the tab nav surface).
- [`admin-collections-page-object.md`](admin-collections-page-object.md)
  — the **third** admin-tree page-object reference.
  Documents the **named-row helper API + per-form fill
  helper posture** at `/admin/collections` (a
  per-row-name resolver, distinct from the tab nav
  surface).
- [`admin-comments-page-object.md`](admin-comments-page-object.md)
  — the **fourth** admin-tree page-object reference.
  Documents the **HeroUI-Modal-based delete confirmation
  surface** at `/admin/comments` (a `[role="dialog"]`
  overlay, distinct from the tab nav surface).
- [`admin-companies-page-object.md`](admin-companies-page-object.md)
  — the **fifth** admin-tree page-object reference.
  Documents the **bare `.fixed.inset-0.z-50` Tailwind-
  overlay form modal + text-filtered Tailwind-overlay
  delete-confirmation modal posture** at
  `/admin/companies` (a positional-selector + text-
  filter disambiguation pair, distinct from the tab
  nav surface).
- [`signin-page-object.md`](signin-page-object.md) —
  the auth-tree authentication driver. Documents the
  email / password / submit-button surface that gets
  the suite into an authenticated session before any
  admin-tree driver navigates to its route.
- [`item-detail-page-object.md`](item-detail-page-object.md),
  [`discover-page-object.md`](discover-page-object.md),
  [`map-page-object.md`](map-page-object.md),
  [`public-pages-page-object.md`](public-pages-page-object.md)
  — public-tree page-object references that document the
  unauthenticated end of the suite. Distinct from the
  admin-tree drivers in that they target unauthenticated
  routes and do not need the admin-shell `header` /
  `footer` / `navLinks` chrome.

The
[`apps/web-e2e/tests/admin/dashboard.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/dashboard.spec.ts)
spec file is the single consumer of this driver today;
new specs that touch the admin dashboard-landing
surface must reach for `AdminDashboardPage` instead of
inlining `page.goto('/admin')` / `page.locator('#main-content')`
/ `page.getByRole('tablist')` calls.
