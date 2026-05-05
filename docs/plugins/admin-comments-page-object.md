---
id: admin-comments-page-object
title: E2E Admin Comments Page Object (apps/web-e2e/page-objects/admin/comments.page.ts)
sidebar_label: E2E Admin Comments Page Object
sidebar_position: 403
---

# E2E Admin Comments Page Object — `apps/web-e2e/page-objects/admin/comments.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin comments management** driver paired with
[`apps/web-e2e/page-objects/admin/comments.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/comments.page.ts).
Sits inside the `admin/` page-object subtree, alongside the
sixteen sibling admin-surface page objects (`bulk-actions.page.ts`
— see [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
`clients.page.ts` — see
[`admin-clients-page-object.md`](admin-clients-page-object.md),
`collections.page.ts` — see
[`admin-collections-page-object.md`](admin-collections-page-object.md),
`companies.page.ts`, `dashboard.page.ts`,
`data-export.page.ts`, `featured-items.page.ts`,
`item-form.page.ts`, `items.page.ts`,
`notifications.page.ts`, `reports.page.ts`,
`roles.page.ts`, `settings.page.ts`,
`sponsorships.page.ts`, `surveys.page.ts`, `tags.page.ts`).

This page is the **fourth per-source-file reference** the docs
tree publishes for any file under
`apps/web-e2e/page-objects/admin/` — the first being
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
which established the template for the admin-tree rollout, the
second [`admin-clients-page-object.md`](admin-clients-page-object.md)
which extended the rollout with the multi-step add-form modal +
nested delete-confirmation modal posture, and the third
[`admin-collections-page-object.md`](admin-collections-page-object.md)
which extended the rollout with the named-row helper API
(`getCollectionByName(name)`, `editCollection(name)`,
`deleteCollection(name)`) on top of the per-page Locator fields,
plus a per-form fill helper. The comments driver continues the
rollout of the remaining thirteen admin-tree page-object docs
(one per source file) and is the **first** admin-tree driver in
the rollout that documents a **HeroUI-Modal-based delete
confirmation surface** (a `[role="dialog"]` overlay rather than
the browser-native `confirm()` dialog the collections driver
documents, and rather than the custom-React `deleteConfirmModal`
overlay the clients driver documents).

Where [`base-page-object.md`](base-page-object.md) documents
the **page-object inheritance root** — the smallest possible
class every concrete page object under
`apps/web-e2e/page-objects/admin/`,
`apps/web-e2e/page-objects/auth/`,
`apps/web-e2e/page-objects/client/`, and
`apps/web-e2e/page-objects/public/` extends — and
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
documents the **suite's admin items bulk-operations driver
boundary** at `/admin/items` and
[`admin-clients-page-object.md`](admin-clients-page-object.md)
documents the **suite's admin clients-management driver boundary**
at `/admin/clients` and
[`admin-collections-page-object.md`](admin-collections-page-object.md)
documents the **suite's admin collections-management driver
boundary** at `/admin/collections`, this page documents the
**suite's admin comments-management driver boundary** at
`/admin/comments` — the smallest possible page object that
lets a spec drive the admin comments listing end-to-end
(navigate to `/admin/comments`, locate the page heading via the
inherited accessibility-tree-canonical heading Locator, locate
the search input via the `[role="searchbox"]` ARIA role, drive
the search input via `searchComments(term)` / `clearSearch()`
helpers, and locate both the deletion-confirmation HeroUI Modal
and every per-row delete trigger via the
`deleteCommentDialog` / `deleteButtons` getters).

The file is the **only driver** in the suite for the admin
comments-management surface today. Like
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
[`admin-clients-page-object.md`](admin-clients-page-object.md),
[`admin-collections-page-object.md`](admin-collections-page-object.md),
[`signin-page-object.md`](signin-page-object.md),
[`item-detail-page-object.md`](item-detail-page-object.md),
[`discover-page-object.md`](discover-page-object.md),
[`map-page-object.md`](map-page-object.md), and
[`public-pages-page-object.md`](public-pages-page-object.md),
the `AdminCommentsPage` class **does extend `BasePage`** —
see "Why `AdminCommentsPage` extends `BasePage`" below for the
load-bearing reasons — so it inherits `header` / `footer` /
`navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` /
`getTitle` from [`base-page-object.md`](base-page-object.md)
and only adds two per-page Locator fields (`heading`,
`searchInput`), two per-action methods (`searchComments(term)`,
`clearSearch()`), two per-element getters
(`deleteCommentDialog`, `deleteButtons`), and the single-route
`navigate()` shortcut on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-comments` driver is consumed today by
[`apps/web-e2e/tests/admin/comments.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/comments.spec.ts),
which covers four flows over the admin-shell comments-
management surface:

- **Admin can access comments management page** — a
  baseline navigation + visibility assertion against the
  `heading` Locator after a `navigate()` /
  `waitForPageReady()` two-call. The flow pins the
  authenticated `/admin/comments` route as reachable and
  the page heading as the canonical anchor for the page
  identity.
- **Comments page displays comment list** — a baseline
  visibility assertion against `<main>` plus an OR-shaped
  visibility check against either the comments-list
  `.divide-y, .space-y-4` Tailwind container or the
  `getByText(/no comments/i)` empty-state node. The flow
  pins the production source's "always render exactly one
  of list-or-empty-state" invariant.
- **Admin can search comments** — a `test.skip()`-guarded
  search-flow that fills the search input via
  `searchComments('zzz-nonexistent-comment-xyz')`, then
  clears the input via `clearSearch()`. The flow pins the
  search-input shape on the page; the spec auto-skips on
  tenants where the search input is hidden (e.g. an
  empty-database-shell variant where the production source
  hides the search input by design).
- **Admin can open delete comment dialog** — a
  `test.skip()`-guarded delete-flow that resolves the first
  per-row delete trigger (a HeroUI `<Button>` containing a
  red-tinted `svg`), clicks it, asserts a `[role="dialog"]`
  HeroUI Modal opens, asserts the modal contains a
  `Cancel` button, clicks `Cancel`, and asserts the modal
  closes. The flow pins both the delete-trigger shape (an
  `svg.text-red-600 / svg.text-red-400`-children button)
  and the deletion-confirmation modal posture (a HeroUI
  Modal, NOT the browser-native `confirm()` dialog the
  collections driver pins, NOT the custom-React
  `deleteConfirmModal` overlay the clients driver pins).

A spec that drives the admin comments-management surface
inline (via `await page.getByRole('searchbox').first().fill(…)`
or `await page.locator('[role="dialog"]').first().getByRole('button', { name: /cancel/i }).click()`)
is a **drift** that this page object is the canonical
replacement for; new specs that touch the admin
comments-management surface must reach for `AdminCommentsPage`
instead.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The admin-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports the comments driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root — see [`base-page-object.md`](base-page-object.md). Required because `extends BasePage` evaluates the symbol at class-declaration time. | Anchors the comments driver to the canonical page-object base — the same `header` / `footer` / `navLinks` Locators every other page object in the suite has, the same `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` helpers. |
| `export class AdminCommentsPage extends BasePage` | named export | Single class declaration with `extends BasePage` — inherits the page-object base. Adds two per-page Locator fields, two per-action methods, two per-element getters, and one `navigate()` shortcut on top. | See "Why `AdminCommentsPage` extends `BasePage`" below. The class is the canonical driver for the admin comments-management surface today; every spec that drives the comments listing instantiates this class, never a bespoke inline driver. |
| `readonly heading: Locator` | field | `page.getByRole('heading').first()` — locates the **first** heading on `/admin/comments` as the page title anchor. | The accessibility-tree-canonical posture for "the page heading" in a way that survives the production source switching from `<h1>` to `<h2>`. The `.first()` pin defends against future per-row comment-content `<h4>` / `<h3>` headings being picked up by mistake — though comments are rendered as paragraphs today, not headings. |
| `readonly searchInput: Locator` | field | `page.getByRole('searchbox').first()` — the **first** ARIA-`role="searchbox"` element on the page. | Accessibility-tree-canonical posture for the search input. Distinct from the collections driver's `getByPlaceholder(...)` posture because the comments page's search input is rendered with the canonical `role="searchbox"` ARIA role (HeroUI's `<Input type="search">` lights up the role automatically), where the collections form's inputs use the role-less HeroUI `<Input>` component. The `.first()` pin defends against multi-search-input pages (e.g. a future "search in user names" + "search in comment content" pair). |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds both per-page Locators in a single pass. | Single constructor signature with the `super(page)` call (because the class extends `BasePage`). Every spec instantiates `new AdminCommentsPage(adminPage)` against the authenticated admin fixture (no fixture-bound auto-instantiation today). |
| `async navigate()` | method | `await this.goto('/admin/comments')` — navigates to the admin comments listing route via the inherited `goto()` from `BasePage`. | The single canonical entry-point for every consuming spec. The `goto()` inheritance lets the driver participate in `BasePage`'s post-navigation `waitForPageReady()` discipline without restating the network-idle wait at every call site. |
| `async searchComments(term: string)` | method | `await this.searchInput.fill(term)` — fills the search input with `term`. | The canonical "drive a search" entry-point. The `fill` is faster than a per-character `type` and matches Playwright's recommended posture for setting input values in a single shot. |
| `async clearSearch()` | method | `await this.searchInput.clear()` — clears the search input. | The canonical "reset the search" entry-point. Every consuming spec that fills the input must clear it before assertions on the unfiltered state, or the next assertion will run against the filtered list. |
| `get deleteCommentDialog(): Locator` | getter | `this.page.locator('[role="dialog"]').filter({ hasText: /delete/i })` — late-bound positional selector that locates the **first** `[role="dialog"]` element whose text contains the case-insensitive `/delete/i` substring. | The HeroUI Modal that confirms deletion. Distinct from the collections driver's browser-native `confirm()` posture (which the spec drives via `page.on('dialog', dialog => dialog.accept())`) and from the clients driver's custom-React `deleteConfirmModal` posture (which uses the `.fixed.inset-0.z-50` Tailwind-overlay primitive). The `[role="dialog"]` ARIA role + `/delete/i` text filter is the canonical "find the delete confirmation" pattern for HeroUI Modal-based confirmations on this page. |
| `get deleteButtons(): Locator` | getter | `this.page.locator('button[color="danger"], button.text-red-600')` — late-bound positional selector for every per-row delete trigger button. | The per-row delete-trigger collection. The dual-selector `button[color="danger"], button.text-red-600` matches HeroUI's `color="danger"` prop variant **or** the Tailwind utility-class fallback. The selector returns a multi-element Locator (one per visible row) — consuming specs use `.first()` to drive the first row, or iterate over the collection for per-row assertions. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminCommentsPage extends BasePage {
	readonly heading: Locator;
	readonly searchInput: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.searchInput = page.getByRole('searchbox').first();
	}

	async navigate() {
		await this.goto('/admin/comments');
	}

	/** Search comments. */
	async searchComments(term: string) {
		await this.searchInput.fill(term);
	}

	/** Clear search. */
	async clearSearch() {
		await this.searchInput.clear();
	}

	/** Get the delete comment dialog. */
	get deleteCommentDialog() {
		return this.page.locator('[role="dialog"]').filter({ hasText: /delete/i });
	}

	/** Get all delete buttons for comments. */
	get deleteButtons() {
		return this.page.locator('button[color="danger"], button.text-red-600');
	}
}
```

## Why `AdminCommentsPage` extends `BasePage`

Three load-bearing reasons the admin-tree comments driver
inherits from [`base-page-object.md`](base-page-object.md)
instead of standing alone (the posture
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md)
and the other public-tree widget drivers take):

- **Page-route navigation via the inherited `goto` method.**
  The comments driver targets a navigable URL
  (`/admin/comments`) — it is a "page object" in the URL
  sense, not a global widget. The single `navigate()`
  shortcut closes over the inherited
  `await this.goto('/admin/comments')`, which in turn
  participates in `BasePage`'s post-navigation
  `waitForPageReady()` discipline (network-idle wait,
  locale-prefix resolution against the configured
  `baseURL`, authenticated-cookie carry-through). A
  standalone class would have to restate every one of
  these concerns inline.
- **Global header / footer / nav-link chrome surfaced for
  free.** The admin shell renders the same global header /
  footer / nav-link chrome on `/admin/comments` as on
  every other admin route. The inherited `header` /
  `footer` / `navLinks` Locators let a spec drive the
  comments-management surface **and** assert on the
  surrounding admin shell (e.g. "the user-menu link is
  present in the header" / "the sidebar contains the
  Comments link") in the same flow, without wiring a
  second base-class composition primitive.
- **Post-navigation `waitForPageReady` stabiliser.** Every
  comments-management flow starts with
  `await commentsPage.navigate(); await commentsPage.waitForPageReady();`
  — the consuming spec at
  [`apps/web-e2e/tests/admin/comments.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/comments.spec.ts)
  uses this exact two-call shape four times. The
  `waitForPageReady` inheritance is what makes the second
  call meaningful — it's the same discipline
  `bulk-actions.spec.ts`, `clients.spec.ts`,
  `collections.spec.ts`, `dashboard.spec.ts`,
  `items-crud.spec.ts`, `items-filter.spec.ts`,
  `items-review.spec.ts`, and every other admin-tree spec
  rely on for the post-navigation network-idle wait
  against the admin shell's React Query hydration storm.

## Why `getByRole('searchbox')` for the search input

Three reasons the search-input field uses Playwright's
`getByRole('searchbox')` locator instead of
`getByPlaceholder(...)` (the collections driver's posture)
or a `data-testid`:

- **HeroUI's `<Input type="search">` lights up the
  `role="searchbox"` automatically.** The comments page
  uses HeroUI's `<Input type="search">` component, which
  emits an underlying `<input type="search">` element with
  the canonical `role="searchbox"` ARIA role. The
  accessibility-tree-canonical posture matches the
  screen-reader path; switching to a placeholder match
  would still resolve the same element but lose the
  semantic "this is a search input" intent.
- **Independent of placeholder text.** The `getByRole`
  locator does not depend on the placeholder text the
  production source emits, which means a future
  rephrasing of the placeholder (e.g.
  `Search comments…` → `Filter by content / user…`) does
  not break the locator. The collections driver uses
  placeholder matching because the collections form's
  inputs do not light up `role="searchbox"` (they use
  `role="textbox"` with no accessible name).
- **The `data-testid` posture would force a production-
  source change purely for the e2e suite.** The host
  app's comments page does not emit `data-testid`
  attributes today. Adding them would couple the test
  surface to a production-source change that brings no
  observable benefit. The `role="searchbox"` is already
  a production-source primitive — pinning to it does
  not require a host-app change.

## Why `searchComments` / `clearSearch` and not direct Locator drives

Three reasons the driver wraps the search input with two
per-action methods (`searchComments(term)` /
`clearSearch()`) instead of letting the consuming spec
drive `searchInput.fill(...)` / `searchInput.clear()`
directly:

- **Documentation-by-default.** A new contributor reading
  the driver source can immediately see that "the search
  input drives by `term` substring" without reading the
  consuming spec or the production-source components. The
  named methods are the canonical "what can a spec do
  with the search input" surface.
- **Forward-compatible with debouncing / IME composition
  / multi-step interactions.** A future iteration of the
  search input might add a debounce wait
  (`await page.waitForTimeout(300)` after `fill`), an IME
  composition flush
  (`await searchInput.press('Enter')` to commit the
  composition), or a multi-step interaction (e.g. a
  typeahead dropdown that requires a `Tab` press to
  commit). The consuming spec calls
  `searchComments(term)` and any of those changes ship
  inside the driver; an inline `searchInput.fill(...)` at
  every call site would have to be touched at every
  consuming spec.
- **Symmetric with future per-input drivers.** The
  comments page is the first admin-tree surface in the
  rollout to expose a search input; future admin-tree
  drivers (`tags.page.ts`, `companies.page.ts`,
  `featured-items.page.ts`) that mount per-input search
  fields mirror this method shape (`searchTags(term)`,
  `searchCompanies(term)`, `searchFeaturedItems(term)`).

## Why `deleteCommentDialog` and `deleteButtons` are getters and not `readonly` fields

Three reasons the modal surface and the per-row trigger
collection use `get …(): Locator` getters instead of
pre-bound `readonly … : Locator` fields on the constructor:

- **Late-binding against modal mount/unmount lifecycle.**
  The delete-comment confirmation modal mounts and
  unmounts on every open/close cycle (mounts on per-row
  delete trigger click; unmounts on Cancel / Delete /
  Escape / outside-click). A pre-bound Locator field
  would have to be re-resolved on every mount/unmount
  cycle for the strict-mode resolver to walk the current
  DOM — but Playwright's Locators are already lazy /
  re-resolved on every action, so the getter shape adds
  no per-call cost while making the late-binding explicit.
- **Late-binding against per-row pagination.** The
  `deleteButtons` collection re-resolves on every page
  navigation / pagination action — a pre-bound field
  would still work (Playwright re-evaluates Locators on
  every action), but the getter shape makes the
  late-binding intent explicit at the call site.
- **Symmetric with the modal-getter posture across the
  admin-tree page-object directory.** The collections
  driver uses `get collectionFormModal()` and the
  clients driver uses `get clientFormModal()` /
  `get deleteConfirmModal()` for the same late-binding
  reasons. Keeping the convention consistent across the
  admin-tree page-object directory makes the tree
  scannable for a new contributor.

## Why a HeroUI Modal (and not `confirm()` or a custom-React overlay) for the delete confirmation

Three reasons the comments page uses a HeroUI `<Modal>` for
the delete confirmation, distinct from the collections
page's browser-native `confirm()` dialog and the clients
page's custom-React `.fixed.inset-0.z-50` overlay:

- **Production-source consistency with HeroUI Modal use
  elsewhere in the admin shell.** The comments page is
  one of several admin-tree surfaces (alongside
  `notifications`, `reports`, `surveys`) that uses
  HeroUI's `<Modal>` component for confirmation flows.
  The driver's `[role="dialog"]` Locator + `/delete/i`
  text filter is the canonical "find the HeroUI Modal
  confirmation" pattern that future admin-tree drivers
  for those pages will mirror.
- **Per-page contract divergence.** The collections page
  uses the browser-native `confirm()` dialog because the
  per-row delete is a single-step "confirm and delete"
  action with no per-row destructive-data preview. The
  clients page uses a custom-React overlay with
  per-client metadata preview (avatar / name / email
  shown in the modal). The comments page uses a HeroUI
  Modal because it shares the per-comment metadata
  preview but uses HeroUI's component instead of a
  custom React component.
- **`[role="dialog"]` lights up the screen-reader path.**
  HeroUI's `<Modal>` emits an underlying `<div
  role="dialog" aria-modal="true">` element, so the
  driver pinning to `[role="dialog"]` matches the
  screen-reader path. A future iteration that switches
  to a custom-React overlay (without the role) would
  break the driver — and would also break screen-reader
  accessibility, so the test-surface coupling is
  deliberate (the e2e suite acts as an a11y-regression
  guard for the modal posture).

## Why `deleteButtons` uses a dual-selector (`button[color="danger"], button.text-red-600`)

Three reasons the per-row delete-trigger collection uses a
dual-selector `button[color="danger"], button.text-red-600`
rather than a single one:

- **HeroUI's `color="danger"` prop and the Tailwind utility-
  class fallback are both valid production-source shapes
  for the delete trigger.** The host app uses HeroUI's
  `<Button color="danger">` for the per-row delete trigger,
  which renders an underlying `<button color="danger">`
  element with the `color` attribute pinned by the
  HeroUI component author. Some tenants override the
  HeroUI button with a Tailwind utility-class
  alternative (`<button className="text-red-600">`) for
  branding reasons. The dual-selector matches both.
- **Future-proof against HeroUI prop reshuffling.** A
  future HeroUI release might switch the `color` prop to
  a `variant` prop or rename `danger` to `error` —
  the Tailwind fallback (`button.text-red-600`) defends
  against that release-train. Conversely, a future
  Tailwind release might rename `text-red-600` to a
  semantic token like `text-destructive` — the HeroUI
  prop selector defends against that. The dual-selector
  is the smallest possible "match either shape" for the
  per-row delete trigger.
- **The consuming spec uses an inline svg-children
  selector for the delete trigger today.** The
  `comments.spec.ts` consuming spec does NOT use this
  helper today (it uses
  `adminPage.locator('button').filter({ has: adminPage.locator('svg.text-red-600, svg.text-red-400') })`
  inline) — the helper is documented for future
  per-row spec consumers that drive multiple delete
  triggers in a single flow.

## Failure matrix

| Mistake on `comments.page.ts` | Layer that surfaces it |
| --- | --- |
| Drop `import type` for `Page` / `Locator` | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner. |
| Drop the `extends BasePage` clause | Loses inherited `header` / `footer` / `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle`; every consuming spec must restate the network-idle wait inline. |
| Drop `super(page)` from the constructor | TypeScript compile error: "Constructors for derived classes must contain a 'super' call". |
| Drop `readonly` from any field | Cross-test state-leak risk against shared driver instances. |
| Drop the `.first()` pin from `heading` | Strict-mode failure against multi-heading surfaces (e.g. a per-row comment metadata `<h4>` rendered alongside the page-title `<h1>`). |
| Drop the `.first()` pin from `searchInput` | Strict-mode failure on tenants that mount more than one search input on the page. |
| Switch `searchInput` from `getByRole('searchbox')` to `getByPlaceholder(...)` | Locator becomes brittle to placeholder rephrasing; the collections-driver-style posture is appropriate for inputs without `role="searchbox"`, not for the comments page's `<input type="search">` posture. |
| Switch `searchInput` to `[data-testid="search"]` | Forces a production-source change purely for the e2e suite; violates the production-source-first selector posture. |
| Drop the `searchComments(term)` method | Every consuming spec must restate `await searchInput.fill(term)`; documentation-by-default is lost; future debounce / IME-composition handling has no central place to land. |
| Drop the `clearSearch()` method | Same as `searchComments`; consuming specs that filter must clear inline. |
| Switch `searchComments` from `fill` to `type` | Slower (per-character keystroke simulation) and would surface IME / debounce side effects that `fill` skips by writing the value in one shot. |
| Switch `deleteCommentDialog` from `[role="dialog"]` to `.fixed.inset-0.z-50` | Locator over-matches against any page-level overlay (e.g. a tooltip overlay or notification toast); the `[role="dialog"]` posture is the canonical HeroUI-Modal pin. |
| Drop the `/delete/i` text filter from `deleteCommentDialog` | Locator over-matches against any open `[role="dialog"]` (e.g. a future "edit comment" modal). |
| Switch `deleteButtons` from `button[color="danger"], button.text-red-600` to a single selector | Loses the dual-selector tolerance — a future HeroUI prop reshuffling or a future Tailwind utility-class rename breaks the locator. |
| Drop the `navigate()` method | Every consuming spec must restate `await commentsPage.goto('/admin/comments')`; documentation-by-default is lost. |
| Move the file out of `apps/web-e2e/page-objects/admin/` | `Cannot find module` on every importing spec. |
| Rename `AdminCommentsPage` | Every importer needs a matching rename. |
| Switch the file extension to `.tsx` | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks. |
| Drop the trailing newline | Prettier diff. |
| Ship the file with CRLF line endings | Same as above. |

## Per-line walkthrough

| Line(s) | Code | Purpose |
| --- | --- | --- |
| 1 | `import type { Page, Locator } from '@playwright/test';` | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost. |
| 2 | `import { BasePage } from '../base.page';` | Runtime import of the inheritance root; required because `extends BasePage` evaluates the symbol at class-declaration time. |
| 4 | `export class AdminCommentsPage extends BasePage {` | Single named export, with the `extends BasePage` clause — see "Why `AdminCommentsPage` extends `BasePage`" above. |
| 5 | `readonly heading: Locator;` | Pre-bound page heading Locator. |
| 6 | `readonly searchInput: Locator;` | Pre-bound search input Locator. |
| 8–11 | `constructor(page: Page) { super(page); … }` | Stores the `page` via `super(page)` and pre-binds every Locator in a single pass. |
| 9 | `super(page);` | Required by `extends BasePage` — wires up the inherited `page` field, `header` / `footer` / `navLinks` Locators, and the `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` methods. |
| 10 | `this.heading = page.getByRole('heading').first();` | Accessibility-tree-canonical heading Locator with `.first()` pin. |
| 11 | `this.searchInput = page.getByRole('searchbox').first();` | Accessibility-tree-canonical search input Locator with `.first()` pin. |
| 14–16 | `async navigate() { await this.goto('/admin/comments'); }` | Single canonical entry-point; closes over `BasePage`'s `goto` for post-navigation `waitForPageReady` discipline. |
| 19–21 | `async searchComments(term: string) { await this.searchInput.fill(term); }` | Search-driver helper. |
| 24–26 | `async clearSearch() { await this.searchInput.clear(); }` | Search-reset helper. |
| 29–31 | `get deleteCommentDialog() { return this.page.locator('[role="dialog"]').filter({ hasText: /delete/i }); }` | Late-bound HeroUI Modal Locator with `/delete/i` text filter. |
| 34–36 | `get deleteButtons() { return this.page.locator('button[color="danger"], button.text-red-600'); }` | Late-bound dual-selector Locator collection for per-row delete triggers. |

## Read / write surface

| Caller | Reads | Writes |
| --- | --- | --- |
| [`apps/web-e2e/tests/admin/comments.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/comments.spec.ts) | `heading.isVisible()` (visibility assertion), `searchInput.isVisible()` (test.skip-precondition check) | Calls `navigate()` to reach `/admin/comments`, `searchComments(term)` to fill the search input, `clearSearch()` to reset it. The consuming spec drives the per-row delete trigger via an inline `adminPage.locator('button').filter(…)` selector and the deletion-confirmation modal via an inline `[role="dialog"]` selector — the `deleteButtons` and `deleteCommentDialog` getters are documented for future per-row spec consumers. |
| Future per-row comment-table specs | The `deleteButtons` Locator collection for "exactly N visible delete triggers" assertions; the `deleteCommentDialog` Locator for modal-state assertions; a future per-row-content Locator collection (e.g. `commentRows`) for "exactly N comments" assertions | A future submit-button click that materialises a real comment delete in the admin database and exercises the per-row flow. |
| Future search-flow validation specs | A future Locator on the search-input "no results" empty state for "no comments match" assertions; the `searchInput` Locator's `aria-invalid` / `aria-describedby` attributes for input-validation assertions | A future `searchComments('')` call that triggers the empty-search reset, plus per-error assertions on the validation messages. |
| Admin comments production-source components (the production source for the DOM contract) | The exact `<input type="search">` shape that lights up `role="searchbox"`; the `[role="dialog"]` ARIA role on the delete-confirmation modal; the `/delete/i` substring match on the modal text content; the `color="danger"` prop on HeroUI `<Button>` per-row delete triggers; the `text-red-600` Tailwind utility-class fallback on the per-row delete triggers; the `<main>` element wrapping the comments listing; the `.divide-y` / `.space-y-4` Tailwind container shape on the comments-list container; the `getByText(/no comments/i)` empty-state node | Mounts the delete-confirmation HeroUI Modal in the DOM only after the per-row delete trigger is clicked; emits the per-row delete trigger as a HeroUI `<Button color="danger">` with a red-tinted child `<svg>`; emits the empty state as a `<p>` / `<div>` with the "No comments" text content. |
| [`base-page-object.md`](base-page-object.md) | The inheritance root the class extends; the `page` field, the `header` / `footer` / `navLinks` Locators, and the `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` methods. | — |
| [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md) | The "first per-source-file reference for any file under `apps/web-e2e/page-objects/admin/`" template this doc mirrors. | — |
| [`admin-clients-page-object.md`](admin-clients-page-object.md) | The "second per-source-file reference for any file under `apps/web-e2e/page-objects/admin/`" template this doc mirrors and the precedent for the custom-React `deleteConfirmModal` overlay posture. | — |
| [`admin-collections-page-object.md`](admin-collections-page-object.md) | The "third per-source-file reference for any file under `apps/web-e2e/page-objects/admin/`" template this doc mirrors and the precedent for the named-row helper API + per-form fill helper conventions. | — |
| [`e2e-tsconfig.md`](e2e-tsconfig.md) | The `include: ["./**/*.ts"]` glob picks up this file. | — |
| [`playwright-config.md`](playwright-config.md) | Resolves the relative `/admin/comments` path the consuming spec navigates to via `baseURL`; supplies the authenticated admin storage state via the `adminPage` fixture. | — |

### Read / write surface — failure modes

| Drift | Surfaces as |
| --- | --- |
| Production-source switch from HeroUI `<Input type="search">` to a non-search-typed `<input>` (e.g. `<input type="text">`) | The `searchInput` Locator fails to find the input because `role="searchbox"` no longer matches; every search-flow assertion times out. The driver must switch to `getByRole('textbox', { name: /search/i })` or `getByPlaceholder(/search/i)`. |
| Production-source switch from HeroUI `<Modal>` to a custom-React overlay (without `role="dialog"`) | The `deleteCommentDialog` getter fails to find the modal; every modal-state assertion times out. The driver must switch to a `.fixed.inset-0.z-50` Tailwind-overlay primitive (matching the clients driver) or to a browser-native `confirm()` dialog (matching the collections driver). |
| Production-source switch from HeroUI `<Button color="danger">` to a non-`color`-prop button | The `deleteButtons` getter's `button[color="danger"]` half of the dual-selector fails; the `button.text-red-600` Tailwind fallback half continues to work. The driver must drop the HeroUI half or update it for the new prop name. |
| Production-source switch from the `text-red-600` Tailwind utility-class to a semantic token like `text-destructive` | The `deleteButtons` getter's `button.text-red-600` half of the dual-selector fails; the `button[color="danger"]` HeroUI half continues to work. The driver must drop the Tailwind half or update it for the new utility-class name. |
| Production-source rename of the modal text content from `Delete Comment` to `Remove Comment` | The `deleteCommentDialog` getter's `/delete/i` text filter fails because `delete` no longer matches. The driver must update the regex to `/delete|remove/i` or to the new exact phrase. |
| Database seeding regression that empties the admin comments listing | The delete flow auto-`test.skip()`s via the `deleteButton.isVisible()` precondition check. |
| Authentication regression that breaks the `adminPage` fixture | Every spec fails with a 302 redirect to the sign-in page or a 403 from the admin route guard. |
| Middleware change that disables JavaScript on `/admin/comments` | The HeroUI Modal never mounts (the React state hook never fires on trigger click); every "modal opens" assertion times out. |
| `playwright.config.ts` `baseURL` change | The relative `/admin/comments` resolves to a different host; the route either 404s or redirects. |

## Change checklist

Any change to `comments.page.ts` must:

- Audit every spec under
  `apps/web-e2e/tests/admin/comments.spec.ts` for
  compatibility with the new shape.
- Cross-check [`base-page-object.md`](base-page-object.md)
  for the `BasePage` posture — if the new shape inherits
  from `BasePage`, document the why; if it does not (a
  future widget-style refactor), document the why-not
  against the standalone-class precedent set by
  [`scroll-to-top-page-object.md`](scroll-to-top-page-object.md).
- Cross-check
  [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
  [`admin-clients-page-object.md`](admin-clients-page-object.md),
  and
  [`admin-collections-page-object.md`](admin-collections-page-object.md)
  for the admin-tree page-object template; the new shape
  should mirror the established posture (type-only
  import, runtime base import, `extends BasePage`, single
  `navigate()` shortcut, late-bound modal getters).
- Cross-check the production source for the admin
  comments-management page for the canonical
  `[role="searchbox"]` ARIA role on the search input,
  the `[role="dialog"]` ARIA role on the
  delete-confirmation modal, the `Delete Comment`
  modal text content, the `color="danger"` prop on
  HeroUI `<Button>` per-row delete triggers, and the
  `text-red-600` Tailwind utility-class fallback.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for
  the `include: ["./**/*.ts"]` glob coverage.
- Cross-check
  [`playwright-config.md`](playwright-config.md) for the
  `baseURL` posture and the `adminPage` fixture binding
  the consuming spec relies on.
- Cross-check [`fixtures-index.md`](fixtures-index.md) —
  today the driver is instantiated inline by the
  consuming spec via the `adminPage` fixture, but a
  future fixture-bound comments driver would surface
  here.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the
  comments spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Comments Management"`).
- Add a [`docs/log.md`](../log.md) entry describing the
  change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that
  affects test authoring.
- Reviewer pass.
