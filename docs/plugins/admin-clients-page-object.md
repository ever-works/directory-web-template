---
id: admin-clients-page-object
title: E2E Admin Clients Page Object (apps/web-e2e/page-objects/admin/clients.page.ts)
sidebar_label: E2E Admin Clients Page Object
sidebar_position: 401
---

# E2E Admin Clients Page Object — `apps/web-e2e/page-objects/admin/clients.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin clients management** driver paired with
[`apps/web-e2e/page-objects/admin/clients.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/clients.page.ts).
Sits inside the `admin/` page-object subtree, alongside the
sixteen sibling admin-surface page objects (`bulk-actions.page.ts`
— see [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
`collections.page.ts`, `comments.page.ts`,
`companies.page.ts`, `dashboard.page.ts`,
`data-export.page.ts`, `featured-items.page.ts`,
`item-form.page.ts`, `items.page.ts`,
`notifications.page.ts`, `reports.page.ts`,
`roles.page.ts`, `settings.page.ts`,
`sponsorships.page.ts`, `surveys.page.ts`, `tags.page.ts`).

This page is the **second per-source-file reference** the docs
tree publishes for any file under
`apps/web-e2e/page-objects/admin/` — the first being
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
which established the template every admin-tree page-object doc
mirrors. The reference closes the gap for the
clients-management driver and continues the rollout of the
remaining fifteen admin-tree page-object docs (one per source
file).

Where [`base-page-object.md`](base-page-object.md) documents
the **page-object inheritance root** — the smallest possible
class every concrete page object under
`apps/web-e2e/page-objects/admin/`,
`apps/web-e2e/page-objects/auth/`,
`apps/web-e2e/page-objects/client/`, and
`apps/web-e2e/page-objects/public/` extends — and
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
documents the **suite's admin items bulk-operations driver
boundary** at `/admin/items`, this page documents the
**suite's admin clients management driver boundary** at
`/admin/clients` — the smallest possible page object that
lets a spec drive the admin clients listing end-to-end
(navigate to `/admin/clients`, locate the page heading,
locate the **first** "Add client" trigger button by its
case-insensitive `/add client/i` accessible-name regex, locate
the multi-step add-client form modal via the
`.fixed.inset-0.z-50` Tailwind-overlay positional selector
once the trigger has been clicked, locate the per-row delete
confirmation modal via the same `.fixed.inset-0.z-50`
positional selector filtered down to the
`hasText: /delete client/i` substring once a delete button
has been clicked, and expose the confirm-delete /
cancel-delete button pair as `role="button"` Locators
nested inside the delete confirmation modal).

The file is the **only driver** in the suite for the admin
clients-management surface today. Like
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
[`signin-page-object.md`](signin-page-object.md),
[`item-detail-page-object.md`](item-detail-page-object.md),
[`discover-page-object.md`](discover-page-object.md),
[`map-page-object.md`](map-page-object.md), and
[`public-pages-page-object.md`](public-pages-page-object.md),
the `AdminClientsPage` class **does extend `BasePage`** —
see "Why `AdminClientsPage` extends `BasePage`" below for the
load-bearing reasons — so it inherits `header` / `footer`
/ `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` /
`getTitle` from [`base-page-object.md`](base-page-object.md)
and only adds two per-page Locator fields (`heading`,
`addClientButton`), four per-page modal getters
(`clientFormModal`, `deleteConfirmModal`, `confirmDeleteButton`,
`cancelDeleteButton`), and the single-route `navigate()`
shortcut on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-clients` driver is consumed today by
[`apps/web-e2e/tests/admin/clients.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/clients.spec.ts),
which covers four flows over the admin-shell clients-management
surface:

- **Admin can access clients management page** — a baseline
  navigation + visibility assertion against the `heading` and
  `addClientButton` Locators after a `navigate()` /
  `waitForPageReady()` two-call. The flow pins the
  authenticated `/admin/clients` route as reachable and the
  add-client trigger as the canonical entry-point for the
  multi-step form.
- **Clients page displays client list** — a baseline
  `<main>`-region visibility assertion after the
  data-fetching settle window. The flow pins the
  client-list-table mounting on the page (the table itself is
  not a per-page Locator on this driver because the
  consuming spec is shape-agnostic — empty state, single-row,
  multi-page paginated all surface a `<main>` with the same
  visibility posture).
- **Admin can open create client modal** — a click-trigger
  flow that opens the multi-step add-client form modal via
  the `addClientButton` Locator and asserts the
  `clientFormModal` Locator is visible. The spec presses
  `Escape` to close the modal without submitting (keeps the
  test side-effect-free against the shared admin database).
- **Admin can open delete client confirmation** — a
  click-trigger flow that opens the delete confirmation
  modal via an inline `button[color="danger"]` Locator
  (the per-row delete trigger is not a per-page Locator on
  this driver because the consuming spec auto-`test.skip()`s
  on tenants without any clients to delete) and asserts the
  `deleteConfirmModal` Locator is visible. The spec clicks
  the `cancelDeleteButton` to dismiss the modal without
  performing the actual deletion (keeps the test
  side-effect-free against the shared admin database).

A spec that drives the admin clients-management surface
inline (via `await page.getByRole('button', { name: /add client/i }).click()`
or `await page.locator('.fixed.inset-0.z-50').first().isVisible()`)
is a **drift** that this page object is the canonical
replacement for; new specs that touch the admin
clients-management surface must reach for `AdminClientsPage`
instead.

## At a glance

| Element                                       | Type           | What it is                                                                                                                                                                                                                                                              | Why it matters                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`               | typed import   | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                                  | The admin-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports the clients driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime. |
| `import { BasePage } from '../base.page'`     | runtime import | Runtime import of the inheritance root — see [`base-page-object.md`](base-page-object.md). Required because `extends BasePage` evaluates the symbol at class-declaration time. | Anchors the clients driver to the canonical page-object base — the same `header` / `footer` / `navLinks` Locators every other page object in the suite has, the same `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` helpers. |
| `export class AdminClientsPage extends BasePage` | named export   | Single class declaration with `extends BasePage` — inherits the page-object base. Adds two per-page Locator fields, four per-page modal getters, and one `navigate()` shortcut on top.                                                                                  | See "Why `AdminClientsPage` extends `BasePage`" below. The class is the canonical driver for the admin clients-management surface today; every spec that drives the clients listing instantiates this class, never a bespoke inline driver. |
| `readonly heading: Locator`                   | field          | `page.getByRole('heading').first()` — locates the **first** heading on `/admin/clients` as the page title anchor for the post-navigation visibility assertion.                                                                                                          | The accessibility-tree-canonical posture for "the page heading" in a way that survives the production source switching from `<h1>` to `<h2>` (e.g. when the admin shell wraps the page in a card-titled layout). The `.first()` pin defends against a future regression that mounts a second heading (e.g. an admin breadcrumb that uses `<h1>`-shaped marketing chrome). |
| `readonly addClientButton: Locator`           | field          | `page.getByRole('button', { name: /add client/i }).first()` — the **first** button on the page whose accessible name matches the case-insensitive `/add client/i` regex.                                                                                                | The accessibility-tree-canonical posture for "the add-client trigger". The `i` regex flag tolerates the production source's casing variants (`Add Client`, `ADD CLIENT`, `add client`). The `.first()` pin defends against multi-button surfaces (e.g. an admin shell that mounts both a primary "Add client" page-header button and a secondary "+ Add a client" empty-state CTA). |
| `constructor(page: Page)`                     | constructor    | Stores the `page` via `super(page)` and pre-binds both per-page Locators in a single pass.                                                                                                                                                                              | Single constructor signature with the `super(page)` call (because the class extends `BasePage`). Every spec instantiates `new AdminClientsPage(adminPage)` against the authenticated admin fixture (no fixture-bound auto-instantiation today). |
| `async navigate()`                            | method         | `await this.goto('/admin/clients')` — navigates to the admin clients listing route via the inherited `goto()` from `BasePage`.                                                                                                                                          | The single canonical entry-point for every consuming spec. The `goto()` inheritance lets the driver participate in `BasePage`'s post-navigation `waitForPageReady()` discipline without restating the network-idle wait at every call site. |
| `get clientFormModal(): Locator`              | getter         | `this.page.locator('.fixed.inset-0.z-50').first()` — late-bound positional selector that locates the **first** Tailwind overlay on the page.                                                                                                                            | The multi-step add-client form modal mounts inside a `.fixed.inset-0.z-50` Tailwind overlay (full-viewport positioned, top-of-stacking-context z-index). The `.first()` pin defends against multiple overlays mounting in parallel (e.g. a tooltip hover overlay or a notification toast overlay that share the same Tailwind utility chain). |
| `get deleteConfirmModal(): Locator`           | getter         | `this.page.locator('.fixed.inset-0.z-50').filter({ hasText: /delete client/i })` — late-bound positional selector filtered down to the substring matching "Delete client".                                                                                              | The delete confirmation modal mounts inside the same `.fixed.inset-0.z-50` overlay surface as the add-client form modal — the `hasText: /delete client/i` substring filter disambiguates between the two. The `i` flag tolerates the production source's casing variants (`Delete Client`, `DELETE CLIENT`, `delete client`). |
| `get confirmDeleteButton(): Locator`          | getter         | `this.deleteConfirmModal.getByRole('button', { name: /^delete$/i })` — the **anchored** `^delete$` button inside the delete confirmation modal scope.                                                                                                                   | The `^delete$` anchored regex defends against the modal also containing a "Delete client" heading or a "Cannot delete" warning button — only buttons whose **complete** accessible name is exactly "Delete" match. The scoped Locator (nested under `deleteConfirmModal`) defends against a per-row "Delete" button on the underlying clients table being picked up by mistake. |
| `get cancelDeleteButton(): Locator`           | getter         | `this.deleteConfirmModal.getByRole('button', { name: /cancel/i })` — the substring `/cancel/i` button inside the delete confirmation modal scope.                                                                                                                       | The substring `cancel` regex tolerates the production source's casing variants (`Cancel`, `CANCEL`, `cancel`) and dismissal-phrasing variants (`Cancel`, `Cancel deletion`, `Cancel and close`). The scoped Locator (nested under `deleteConfirmModal`) defends against a clients-table-level "Cancel" button being picked up by mistake. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminClientsPage extends BasePage {
	readonly heading: Locator;
	readonly addClientButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.addClientButton = page.getByRole('button', { name: /add client/i }).first();
	}

	async navigate() {
		await this.goto('/admin/clients');
	}

	/** Get the client form modal overlay. */
	get clientFormModal() {
		return this.page.locator('.fixed.inset-0.z-50').first();
	}

	/** Get the delete confirmation modal. */
	get deleteConfirmModal() {
		return this.page.locator('.fixed.inset-0.z-50').filter({ hasText: /delete client/i });
	}

	/** Confirm delete button. */
	get confirmDeleteButton() {
		return this.deleteConfirmModal.getByRole('button', { name: /^delete$/i });
	}

	/** Cancel delete button. */
	get cancelDeleteButton() {
		return this.deleteConfirmModal.getByRole('button', { name: /cancel/i });
	}
}
```

## Why `AdminClientsPage` extends `BasePage`

Three load-bearing reasons the admin-tree clients driver
inherits from [`base-page-object.md`](base-page-object.md)
instead of standing alone (the posture
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md)
and the other public-tree widget drivers take):

- **Page-route navigation via the inherited `goto` method.**
  The clients driver targets a navigable URL
  (`/admin/clients`) — it is a "page object" in the URL sense,
  not a global widget. The single `navigate()` shortcut
  closes over the inherited `await this.goto('/admin/clients')`,
  which in turn participates in `BasePage`'s post-navigation
  `waitForPageReady()` discipline (network-idle wait, locale-
  prefix resolution against the configured `baseURL`,
  authenticated-cookie carry-through). A standalone class
  would have to restate every one of these concerns inline.
- **Global header / footer / nav-link chrome surfaced for
  free.** The admin shell renders the same global header /
  footer / nav-link chrome on `/admin/clients` as on every
  other admin route. The inherited `header` / `footer` /
  `navLinks` Locators let a spec drive the clients-management
  surface **and** assert on the surrounding admin shell
  (e.g. "the user-menu link is present in the header" /
  "the sidebar contains the Clients link") in the same flow,
  without wiring a second base-class composition primitive.
- **Post-navigation `waitForPageReady` stabiliser.** Every
  clients-management flow starts with `await clientsPage.navigate(); await clientsPage.waitForPageReady();`
  — the consuming spec at
  [`apps/web-e2e/tests/admin/clients.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/clients.spec.ts)
  uses this exact two-call shape four times. The
  `waitForPageReady` inheritance is what makes the second call
  meaningful — it's the same discipline `bulk-actions.spec.ts`,
  `dashboard.spec.ts`, `items-crud.spec.ts`, `items-filter.spec.ts`,
  `items-review.spec.ts`, and every other admin-tree spec
  rely on for the post-navigation network-idle wait against
  the admin shell's React Query hydration storm.

## Why `getByRole('button', { name: /add client/i })` for `addClientButton`

Three reasons the field uses Playwright's
`getByRole('button', { name: /add client/i })` locator
instead of a CSS selector or a `data-testid`:

- **Accessibility-tree-canonical posture.** The add-client
  trigger is rendered as a `<button>` element with
  human-readable text content (`Add Client` / `Add client`
  depending on the message catalogue). The
  `getByRole('button', { name: /add client/i })` locator
  reads the computed accessible name (the text content for
  a text-content button, or the `aria-label` for an
  icon-only button) — the same surface a screen reader
  reads.
- **Locale-tolerant via the case-insensitive regex.** The
  `i` flag on the regex tolerates per-locale casing
  variants the production source has shipped. The simple
  word-stem regex (`add client`) is invariant to surrounding
  prefixes / suffixes (`+ Add Client`, `Add Client →`).
- **Strict-mode safety from the `.first()` pin against
  multi-button surfaces.** The clients-management page may
  surface both a primary page-header "Add client" button and
  an empty-state "Add your first client" CTA in a future
  iteration. The `.first()` pin defends against the
  empty-state CTA mounting a second `role="button"` peer with
  a colliding word stem in its accessible name (e.g.
  "Add client" vs "Add a client").

## Why `clientFormModal` and `deleteConfirmModal` are getters and not `readonly` fields

Three reasons both modal surfaces use `get …(): Locator`
getters instead of pre-bound `readonly … : Locator` fields
on the constructor:

- **Late-binding against modal mount/unmount lifecycle.**
  Both modals mount and unmount on every open/close cycle
  inside the page (the add-client modal mounts on the
  add-client trigger click and unmounts on Escape / submit /
  outside-click; the delete confirmation modal mounts on the
  per-row delete trigger click and unmounts on cancel /
  confirm). A pre-bound Locator field would have to be
  re-resolved on every mount/unmount cycle for the
  strict-mode resolver to walk the current DOM — but
  Playwright's Locators are already lazy / re-resolved on
  every action, so the getter shape adds no per-call cost
  while making the late-binding explicit.
- **Symmetric with `itemCheckboxes` on the bulk-actions
  driver.** [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
  uses the same getter posture for its per-row Locator
  collection. Keeping the convention consistent across the
  admin-tree page-object directory makes the tree scannable
  for a new contributor.
- **Per-call `filter()` invocation on `deleteConfirmModal`.**
  The delete confirmation modal getter invokes
  `.filter({ hasText: /delete client/i })` on every read.
  A pre-bound field would pin the filter result at
  constructor time (which is fine for filters that don't
  depend on state, but the getter shape leaves room for a
  future filter that does, e.g. a
  `filter({ hasText: this.currentClientName })` shape that
  pins the modal to a specific client's deletion).

## Why `.fixed.inset-0.z-50` for both modal surfaces

Three reasons both modal getters use the
**Tailwind-utility positional selector**
`.fixed.inset-0.z-50` instead of the canonical ARIA
`role="dialog"` selector that
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)'s
`confirmDialog` field uses:

- **Production-source posture.** The host app's clients-management
  modals are rendered as `.fixed.inset-0.z-50` Tailwind-utility-
  positioned overlays today, **without** the canonical
  `role="dialog"` ARIA attribute. A spec that pins to
  `[role="dialog"]` would silently `test.skip()` on every
  open/close cycle until the production source adds the
  ARIA attribute. The Tailwind-utility selector reads from
  a primitive the production source already emits.
- **Substring filter disambiguates between the two
  modals.** Both modals share the same overlay surface
  (`.fixed.inset-0.z-50`) — only the substring filter
  (`hasText: /delete client/i` for the delete confirmation
  modal) discriminates between them. A `[role="dialog"]`
  selector would have to recreate the same substring
  filter to pick the right modal.
- **Reuses the host app's CSS-utility convention.** The
  `.fixed.inset-0.z-50` Tailwind triple is the canonical
  full-viewport-overlay-at-top-of-stacking-context
  primitive in the host app. Other admin-shell modal
  drivers (`comments.page.ts`, `companies.page.ts`,
  `featured-items.page.ts`) use the same selector — keeping
  the convention consistent across the admin-tree
  page-object directory makes the tree scannable for a new
  contributor.

## Why `^delete$` anchored regex for `confirmDeleteButton`

Three reasons the field uses the **anchored**
`/^delete$/i` regex instead of a substring `/delete/i`
regex:

- **Defends against per-row "Delete client" heading
  collision.** The delete confirmation modal contains a
  "Delete client?" heading at the top — the substring
  `/delete/i` regex would match the heading **and** the
  confirm button, causing a strict-mode failure. The
  anchored `^delete$` regex matches only buttons whose
  **complete** accessible name is exactly "Delete".
- **Defends against per-row "Cannot delete" warning button
  collision.** A future iteration of the delete
  confirmation modal might mount a "Cannot delete (admin
  protection)" warning button for protected clients — the
  substring `/delete/i` regex would match the warning
  button **and** the confirm button. The anchored regex
  excludes the warning button.
- **Symmetric with `getByRole('button', { name: /…/i })`
  on the bulk-actions driver.** The four action buttons
  on `bulk-actions.page.ts` use simple word-stem regexes
  (`/approve/i`, `/reject/i`, `/delete/i`, `/deselect|clear/i`)
  — the bulk-actions driver gets away with substring
  regexes because the bulk-action toolbar is the only
  source of "Approve" / "Reject" / "Delete" buttons in
  scope. The clients-driver delete confirmation modal is
  more crowded (heading, confirm button, cancel button,
  potential warning button) — the anchor is the
  smaller-blast-radius locator for that scope.

## Why nested `deleteConfirmModal.getByRole(...)` and not `page.getByRole(...)`

Three reasons both `confirmDeleteButton` and
`cancelDeleteButton` are **scoped** under
`deleteConfirmModal` instead of `page.getByRole(...)`
peers:

- **Defends against per-row "Delete" / "Cancel" button
  collision on the underlying clients table.** The
  clients table may surface a per-row "Delete" button as
  the trigger for the delete confirmation modal — the
  unscoped `page.getByRole('button', { name: /^delete$/i })`
  Locator would match the per-row trigger **and** the
  modal's confirm button, causing a strict-mode failure.
  The scoped Locator pins to the modal scope.
- **Re-uses the late-binding lifecycle of the
  `deleteConfirmModal` getter.** Both `confirmDeleteButton`
  and `cancelDeleteButton` getters resolve through
  `this.deleteConfirmModal.getByRole(...)` — when the
  modal unmounts, the nested Locators auto-resolve to
  zero matches (no `isVisible()`-after-unmount false
  positive). The unscoped `page.getByRole(...)` peers
  would have to restate the same lifecycle inline.
- **Symmetric with the public-tree modal drivers.** The
  same nested-Locator posture is used by the public-tree
  newsletter modal driver and the public-tree login modal
  driver — keeping the convention consistent across the
  page-object tree makes contributing new modal drivers
  obvious.

## Failure matrix

| Mistake on `clients.page.ts`                                | Layer that surfaces it                                                                                          |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Drop `import type` for `Page` / `Locator`                   | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner.                  |
| Drop the `extends BasePage` clause                           | Loses inherited `header` / `footer` / `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle`; every consuming spec must restate the network-idle wait inline. |
| Drop `super(page)` from the constructor                      | TypeScript compile error: "Constructors for derived classes must contain a 'super' call".                         |
| Drop `readonly` from any field                              | Cross-test state-leak risk against shared driver instances.                                                       |
| Drop the `i` flag from the `addClientButton` regex          | Per-locale casing variants flake; e.g. `Add Client` (title case) misses a lowercase `add client` substring.       |
| Drop the `.first()` pin from `addClientButton`              | Strict-mode failure on tenants whose admin shell mounts both a page-header "Add client" CTA and an empty-state "Add a client" peer. |
| Switch `addClientButton` to `[data-testid="add-client"]`     | Forces a production-source change purely for the e2e suite; violates the production-source-first selector posture. |
| Drop the `.first()` pin from `clientFormModal`              | Strict-mode failure on tenants where a tooltip / toast also mounts as `.fixed.inset-0.z-50`.                       |
| Drop the `hasText: /delete client/i` filter from `deleteConfirmModal` | Locator over-matches against the add-client form modal (which also mounts as `.fixed.inset-0.z-50`).            |
| Drop the `^…$` anchors from `confirmDeleteButton`           | Strict-mode failure against the modal's "Delete client?" heading or any future "Cannot delete" warning button.    |
| Switch `confirmDeleteButton` / `cancelDeleteButton` to `page.getByRole(...)` peers | Strict-mode failure against per-row "Delete" / "Cancel" buttons on the underlying clients table.                  |
| Switch the modal getters to `[role="dialog"][aria-modal="true"]` | Silently `test.skip()`s on tenants where the host app has not added the canonical ARIA attributes to the overlay. |
| Drop the `navigate()` method                                | Every consuming spec must restate `await clientsPage.goto('/admin/clients')`; documentation-by-default is lost.   |
| Move the file out of `apps/web-e2e/page-objects/admin/`     | `Cannot find module` on every importing spec.                                                                     |
| Rename `AdminClientsPage`                                   | Every importer needs a matching rename.                                                                            |
| Switch the file extension to `.tsx`                         | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks.                                      |
| Drop the trailing newline                                   | Prettier diff.                                                                                                    |
| Ship the file with CRLF line endings                        | Same as above.                                                                                                    |

## Per-line walkthrough

| Line(s) | Code                                                                                                              | Purpose                                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | `import type { Page, Locator } from '@playwright/test';`                                                          | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost.                                                                                                     |
| 2       | `import { BasePage } from '../base.page';`                                                                         | Runtime import of the inheritance root; required because `extends BasePage` evaluates the symbol at class-declaration time.                                                        |
| 4       | `export class AdminClientsPage extends BasePage {`                                                                 | Single named export, with the `extends BasePage` clause — see "Why `AdminClientsPage` extends `BasePage`" above.                                                                    |
| 5       | `readonly heading: Locator;`                                                                                       | Pre-bound page heading Locator.                                                                                                                                                     |
| 6       | `readonly addClientButton: Locator;`                                                                               | Pre-bound add-client trigger button Locator.                                                                                                                                        |
| 8–12    | `constructor(page: Page) { super(page); … }`                                                                       | Stores the `page` via `super(page)` and pre-binds every Locator in a single pass.                                                                                                    |
| 10      | `this.heading = page.getByRole('heading').first();`                                                                | Accessibility-tree-canonical heading Locator with `.first()` pin.                                                                                                                   |
| 11      | `this.addClientButton = page.getByRole('button', { name: /add client/i }).first();`                                | Accessibility-tree-canonical add-client trigger button Locator with case-insensitive regex name.                                                                                    |
| 14–16   | `async navigate() { await this.goto('/admin/clients'); }`                                                          | Single canonical entry-point; closes over `BasePage`'s `goto` for post-navigation `waitForPageReady` discipline.                                                                    |
| 18–21   | `get clientFormModal() { return this.page.locator('.fixed.inset-0.z-50').first(); }`                                | Late-bound positional selector for the multi-step add-client form modal overlay with `.first()` pin.                                                                                |
| 23–26   | `get deleteConfirmModal() { return this.page.locator('.fixed.inset-0.z-50').filter({ hasText: /delete client/i }); }` | Late-bound positional selector filtered down to the "Delete client" substring for the delete confirmation modal overlay.                                                            |
| 28–31   | `get confirmDeleteButton() { return this.deleteConfirmModal.getByRole('button', { name: /^delete$/i }); }`         | Anchored `^delete$` button Locator scoped under the delete confirmation modal.                                                                                                       |
| 33–36   | `get cancelDeleteButton() { return this.deleteConfirmModal.getByRole('button', { name: /cancel/i }); }`           | Substring `/cancel/i` button Locator scoped under the delete confirmation modal.                                                                                                     |

## Read / write surface

| Caller                                                                                                                                  | Reads                                                                                              | Writes                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/web-e2e/tests/admin/clients.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/clients.spec.ts) | `heading.isVisible()`, `addClientButton.isVisible()`, `clientFormModal.isVisible()`, `deleteConfirmModal.isVisible()` | Calls `navigate()` to reach `/admin/clients`, `addClientButton.click()` to open the add-client form modal, `cancelDeleteButton.click()` to dismiss the delete confirmation modal, and presses `Escape` to dismiss the add-client form modal. Inline `button[color="danger"]` Locator drives the per-row delete trigger today. |
| Future per-row clients-table specs                                                                                                      | A future per-row Locator collection (e.g. `clientRows`) for "exactly N clients" assertions          | A future per-row trigger Locator (e.g. `editButton(name)` / `deleteButton(name)`) for the per-row edit / delete flows.                                                                                                                                                                  |
| Future add-client form-submit specs                                                                                                     | A future Locator collection on the multi-step add-client form modal (e.g. `formStep1NameInput`, `formStep2EmailInput`, `formNextButton`, `formSubmitButton`) | A future submit-button click that materialises a real client row in the admin database and exercises the multi-step form's per-step navigation.                                                                                                                                          |
| Admin clients production-source components (the production source for the DOM contract)                                                 | The exact accessible name of the add-client trigger button; the `.fixed.inset-0.z-50` Tailwind utility chain on both modal overlays; the "Delete client" heading text inside the delete confirmation modal; the accessible names of the confirm-delete / cancel-delete buttons | Mounts the add-client form modal in the DOM only after the add-client trigger is clicked; mounts the delete confirmation modal in the DOM only after a per-row delete trigger is clicked; emits the per-row delete trigger conditionally based on the current admin's permission level.   |
| [`base-page-object.md`](base-page-object.md)                                                                                            | The inheritance root the class extends; the `page` field, the `header` / `footer` / `navLinks` Locators, and the `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` methods. | —                                                                                                                                                                                                                                                                                       |
| [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)                                                                | The "first per-source-file reference for any file under `apps/web-e2e/page-objects/admin/`" template this doc mirrors. | —                                                                                                                                                                                                                                                                                       |
| [`e2e-tsconfig.md`](e2e-tsconfig.md)                                                                                                   | The `include: ["./**/*.ts"]` glob picks up this file.                                              | —                                                                                                                                                                                                                                                                                       |
| [`playwright-config.md`](playwright-config.md)                                                                                          | Resolves the relative `/admin/clients` path the consuming spec navigates to via `baseURL`; supplies the authenticated admin storage state via the `adminPage` fixture. | —                                                                                                                                                                                                                                                                                       |

### Read / write surface — failure modes

| Drift                                                                                                  | Surfaces as                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production-source rename of the "Add Client" button text to "New Client"                                | The `addClientButton` Locator fails to find the trigger; every "click add-client → modal opens" assertion times out.                                                                              |
| Production-source switch from `.fixed.inset-0.z-50` to a different overlay primitive (e.g. portal-rendered) | Both modal getters fail to find the overlay; every "modal opens" assertion times out.                                                                                                              |
| Production-source rename of the "Delete client" heading to "Confirm deletion"                          | The `deleteConfirmModal` filter `hasText: /delete client/i` fails to match; the modal getter resolves to zero matches; every "delete confirmation opens" assertion times out.                      |
| Production-source rename of the confirm button from "Delete" to "Confirm" / "Yes"                       | The `confirmDeleteButton` Locator fails to find the button; every "confirm-delete is visible" assertion times out.                                                                                 |
| Production-source rename of the cancel button from "Cancel" to "Close" / "Dismiss"                      | The `cancelDeleteButton` Locator fails to find the button; every "click cancel" interaction fails to close the modal.                                                                              |
| Production-source switch from text-content "Add Client" button to icon-only button without `aria-label` | The `getByRole('button', { name: /add client/i })` Locator fails to compute an accessible name; every add-client trigger assertion fails.                                                          |
| Database seeding regression that empties the admin clients listing                                      | The per-row delete trigger is hidden (no clients to delete); the delete-confirmation spec auto-`test.skip()`s via the visibility precondition check.                                               |
| Authentication regression that breaks the `adminPage` fixture                                           | Every spec fails with a 302 redirect to the sign-in page or a 401/403 from the admin route guard.                                                                                                  |
| Middleware change that disables JavaScript on `/admin/clients`                                          | The add-client form modal never mounts (the React state hook never fires on trigger click); every "modal opens" assertion times out.                                                              |
| `playwright.config.ts` `baseURL` change                                                                | The relative `/admin/clients` resolves to a different host; the route either 404s or redirects.                                                                                                    |

## Change checklist

Any change to `clients.page.ts` must:

- Audit every spec under `apps/web-e2e/tests/admin/clients.spec.ts`
  for compatibility with the new shape.
- Cross-check [`base-page-object.md`](base-page-object.md) for the
  `BasePage` posture — if the new shape inherits from `BasePage`,
  document the why; if it does not (a future widget-style refactor),
  document the why-not against the standalone-class precedent set by
  [`scroll-to-top-page-object.md`](scroll-to-top-page-object.md).
- Cross-check [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
  for the admin-tree page-object template; the new shape should mirror
  the established posture (type-only import, runtime base import,
  `extends BasePage`, single `navigate()` shortcut, late-bound modal
  getters).
- Cross-check the production source for the admin clients-management
  page for the canonical "Add Client" button accessible name, the
  `.fixed.inset-0.z-50` Tailwind utility chain on both modal overlays,
  the "Delete client" heading text inside the delete confirmation modal,
  and the accessible names of the confirm-delete / cancel-delete buttons.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for the
  `include: ["./**/*.ts"]` glob coverage.
- Cross-check [`playwright-config.md`](playwright-config.md) for
  the `baseURL` posture and the `adminPage` fixture binding the
  consuming spec relies on.
- Cross-check [`fixtures-index.md`](fixtures-index.md) — today the
  driver is instantiated inline by the consuming spec via the
  `adminPage` fixture, but a future fixture-bound clients
  driver would surface here.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the clients
  spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Clients Management"`).
- Add a [`docs/log.md`](../log.md) entry describing the change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that affects test
  authoring.
- Reviewer pass.
