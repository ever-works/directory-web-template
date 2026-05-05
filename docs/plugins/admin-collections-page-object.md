---
id: admin-collections-page-object
title: E2E Admin Collections Page Object (apps/web-e2e/page-objects/admin/collections.page.ts)
sidebar_label: E2E Admin Collections Page Object
sidebar_position: 402
---

# E2E Admin Collections Page Object — `apps/web-e2e/page-objects/admin/collections.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin collections management** driver paired with
[`apps/web-e2e/page-objects/admin/collections.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/collections.page.ts).
Sits inside the `admin/` page-object subtree, alongside the
sixteen sibling admin-surface page objects (`bulk-actions.page.ts`
— see [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
`clients.page.ts` — see
[`admin-clients-page-object.md`](admin-clients-page-object.md),
`comments.page.ts`, `companies.page.ts`, `dashboard.page.ts`,
`data-export.page.ts`, `featured-items.page.ts`,
`item-form.page.ts`, `items.page.ts`,
`notifications.page.ts`, `reports.page.ts`,
`roles.page.ts`, `settings.page.ts`,
`sponsorships.page.ts`, `surveys.page.ts`, `tags.page.ts`).

This page is the **third per-source-file reference** the docs
tree publishes for any file under
`apps/web-e2e/page-objects/admin/` — the first being
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
which established the template, and the second
[`admin-clients-page-object.md`](admin-clients-page-object.md)
which extended the rollout with the multi-step add-form
modal + nested delete-confirmation modal posture. The
collections driver continues the rollout of the remaining
fourteen admin-tree page-object docs (one per source file)
and is the **first** admin-tree driver in the rollout that
documents a **named-row helper API** (`getCollectionByName(name)`,
`editCollection(name)`, `deleteCollection(name)`) on top of
the per-page Locator fields, plus a **per-form fill helper**
(`fillCollectionForm({ id?, name, description? })`) that
encodes the multi-input form-fill convention every future
admin-form driver in the suite mirrors.

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
at `/admin/clients`, this page documents the
**suite's admin collections-management driver boundary** at
`/admin/collections` — the smallest possible page object that
lets a spec drive the admin collections listing end-to-end
(navigate to `/admin/collections`, locate the page heading,
locate the **first** "Add collection" trigger button by its
case-insensitive `/add collection/i` accessible-name regex,
locate the collection-form modal via the `.fixed.inset-0.z-50`
Tailwind-overlay positional selector once the trigger has been
clicked, locate every form-input field by its production-source
placeholder (`/frontend-frameworks/i` for the ID input,
`/collection name/i` for the name input, `🤖` exact-match for
the icon input, `/short description/i` for the description
textarea), locate the active toggle by its `[role="switch"]`
ARIA role, locate the cancel / create / save buttons by their
case-insensitive accessible names, and expose a per-row
collection finder + per-row edit / delete trigger pair via
the `getCollectionByName(name)` / `editCollection(name)` /
`deleteCollection(name)` helper APIs).

The file is the **only driver** in the suite for the admin
collections-management surface today. Like
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
[`admin-clients-page-object.md`](admin-clients-page-object.md),
[`signin-page-object.md`](signin-page-object.md),
[`item-detail-page-object.md`](item-detail-page-object.md),
[`discover-page-object.md`](discover-page-object.md),
[`map-page-object.md`](map-page-object.md), and
[`public-pages-page-object.md`](public-pages-page-object.md),
the `AdminCollectionsPage` class **does extend `BasePage`** —
see "Why `AdminCollectionsPage` extends `BasePage`" below for
the load-bearing reasons — so it inherits `header` / `footer`
/ `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` /
`getTitle` from [`base-page-object.md`](base-page-object.md)
and only adds two per-page Locator fields (`heading`,
`addCollectionButton`), seven per-form-element getters
(`collectionFormModal`, `collectionIdInput`,
`collectionNameInput`, `collectionIconInput`,
`collectionDescriptionInput`, `activeToggle`, `cancelButton`,
`createButton`, `saveButton`), the named-row helper API
(`getCollectionByName`, `editCollection`, `deleteCollection`),
the per-form fill helper (`fillCollectionForm`), and the
single-route `navigate()` shortcut on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-collections` driver is consumed today by
[`apps/web-e2e/tests/admin/collections.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/collections.spec.ts),
which covers five flows over the admin-shell collections-
management surface:

- **Admin can access collections management page** — a
  baseline navigation + visibility assertion against the
  `heading` and `addCollectionButton` Locators after a
  `navigate()` / `waitForPageReady()` two-call. The flow
  pins the authenticated `/admin/collections` route as
  reachable and the add-collection trigger as the canonical
  entry-point for the form modal.
- **Admin can create a new collection** — a click-trigger
  flow that opens the collection-form modal via the
  `addCollectionButton` Locator, fills the form via the
  `fillCollectionForm({ id, name, description })` helper,
  clicks the `createButton` Locator, asserts the modal
  closes, and asserts the new collection name appears in
  the underlying list. The spec uses `Date.now()`-suffixed
  fixtures for `id` / `name` so the spec is idempotent
  against repeat-runs against the shared admin database.
- **Admin can edit an existing collection** — a hover-trigger
  flow that hovers over the first collection row to reveal
  the inline action buttons, clicks the per-row edit button,
  asserts the collection-form modal opens, clears the
  `collectionNameInput` Locator and re-fills it with the
  updated name, clicks the `saveButton` Locator, and
  asserts the modal closes. The spec uses the inline
  `div.group` per-row Locator with the `hasText:
  originalName` filter rather than the
  `getCollectionByName(name)` helper because the helper
  resolves to a `div`-tag generic Locator that is too
  permissive for the hover-to-reveal action-button shape.
- **Admin can delete a collection using native confirm
  dialog** — a hover-trigger + native-dialog-handler flow
  that registers a `page.on('dialog', dialog =>
  dialog.accept())` handler before clicking the per-row
  delete button. The flow pins the production-source's
  use of the browser-native `confirm()` API (rather than a
  custom React modal) for the delete confirmation surface
  on the collections page — distinct from the clients
  driver's `deleteConfirmModal` Tailwind-overlay posture.
- **Collections page displays stats cards** — a baseline
  visibility assertion against the heading + the first
  `.grid` Locator, pinning the stats grid (Total / Active /
  Items Assigned counter cards) as visible after the
  data-fetching settle window.

A spec that drives the admin collections-management surface
inline (via `await page.getByRole('button', { name: /add
collection/i }).click()` or `await
page.getByPlaceholder(/collection name/i).fill(…)`) is a
**drift** that this page object is the canonical replacement
for; new specs that touch the admin collections-management
surface must reach for `AdminCollectionsPage` instead.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The admin-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports the collections driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root — see [`base-page-object.md`](base-page-object.md). Required because `extends BasePage` evaluates the symbol at class-declaration time. | Anchors the collections driver to the canonical page-object base — the same `header` / `footer` / `navLinks` Locators every other page object in the suite has, the same `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` helpers. |
| `export class AdminCollectionsPage extends BasePage` | named export | Single class declaration with `extends BasePage` — inherits the page-object base. Adds two per-page Locator fields, nine per-form modal getters, three named-row helpers, one per-form fill helper, and one `navigate()` shortcut on top. | See "Why `AdminCollectionsPage` extends `BasePage`" below. The class is the canonical driver for the admin collections-management surface today; every spec that drives the collections listing instantiates this class, never a bespoke inline driver. |
| `readonly heading: Locator` | field | `page.getByRole('heading').first()` — locates the **first** heading on `/admin/collections` as the page title anchor. | The accessibility-tree-canonical posture for "the page heading" in a way that survives the production source switching from `<h1>` to `<h2>`. The `.first()` pin defends against future per-row collection name `<h4>` / `<h3>` headings being picked up by mistake (the consuming spec at `collections.spec.ts` uses `adminPage.locator('h4, h3').first()` for the per-row collection name read precisely because those headings exist on the page alongside the page-title heading). |
| `readonly addCollectionButton: Locator` | field | `page.getByRole('button', { name: /add collection/i }).first()` — the **first** button on the page whose accessible name matches the case-insensitive `/add collection/i` regex. | Accessibility-tree-canonical posture for the add-collection trigger. The `i` regex flag tolerates the production source's casing variants (`Add Collection`, `ADD COLLECTION`, `add collection`). The `.first()` pin defends against multi-button surfaces (e.g. an admin shell that mounts both a primary "Add collection" page-header button and a secondary "+ Add a collection" empty-state CTA). |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds both per-page Locators in a single pass. | Single constructor signature with the `super(page)` call (because the class extends `BasePage`). Every spec instantiates `new AdminCollectionsPage(adminPage)` against the authenticated admin fixture (no fixture-bound auto-instantiation today). |
| `async navigate()` | method | `await this.goto('/admin/collections')` — navigates to the admin collections listing route via the inherited `goto()` from `BasePage`. | The single canonical entry-point for every consuming spec. The `goto()` inheritance lets the driver participate in `BasePage`'s post-navigation `waitForPageReady()` discipline without restating the network-idle wait at every call site. |
| `getCollectionByName(name: string): Locator` | method | `this.page.locator('div').filter({ hasText: new RegExp(name, 'i') }).first()` — resolves a collection row by its name text via a permissive `div`-tag locator with a case-insensitive substring filter. | The named-row finder. Three properties: (a) **case-insensitive substring match** via `new RegExp(name, 'i')` tolerates the production source's casing variants, (b) **`.first()` pin** against the same name appearing in nested rows (e.g. a "Productivity Tools" parent collection containing a "Productivity Tools" child), (c) **`div`-tag selector** rather than `[role="row"]` because the production source renders collections as Tailwind-styled cards, not table rows. The consuming spec at `collections.spec.ts` does NOT use this helper today (it uses an inline `div.group` selector instead) — the helper is documented for future per-row spec consumers. |
| `async editCollection(name: string)` | method | Resolves the row via `getCollectionByName(name)`, then clicks `getByRole('button', { name: /edit/i })` inside the row scope. | The named-row edit-trigger. The scoped Locator (nested under the row) defends against a page-level "Edit settings" or "Edit profile" button being picked up by mistake. The `i` flag on the regex tolerates the production source's casing variants. |
| `async deleteCollection(name: string)` | method | Resolves the row via `getCollectionByName(name)`, then clicks `getByRole('button', { name: /delete/i })` inside the row scope. | Symmetric with `editCollection`. The scoped Locator defends against a page-level "Delete account" or other crowding-button being picked up by mistake. |
| `get collectionFormModal(): Locator` | getter | `this.page.locator('.fixed.inset-0.z-50').first()` — late-bound positional selector that locates the **first** Tailwind overlay on the page. | The collection-form modal mounts inside a `.fixed.inset-0.z-50` Tailwind overlay (full-viewport positioned, top-of-stacking-context z-index). Symmetric with `clientFormModal` on `AdminClientsPage`. The `.first()` pin defends against multiple overlays mounting in parallel (e.g. a tooltip hover overlay or a notification toast overlay that share the same Tailwind utility chain). |
| `get collectionIdInput(): Locator` | getter | `this.collectionFormModal.getByPlaceholder(/frontend-frameworks/i)` — substring placeholder match on the modal-scoped input. | The ID input uses a HeroUI `<Input>` component without a `<label>`-text-content pair — the most stable way to target it is the production-source-defined placeholder. The placeholder shows an example collection ID (`frontend-frameworks`) — the substring regex tolerates the placeholder text being expanded (`e.g. frontend-frameworks`) without breaking the locator. |
| `get collectionNameInput(): Locator` | getter | `this.collectionFormModal.getByPlaceholder(/collection name/i)` — substring placeholder match on the modal-scoped input. | The name input is the most-used form field on the modal (every create / edit flow writes to it). The substring regex tolerates the production source's casing variants (`Collection Name`, `Collection name`, `collection name`). |
| `get collectionIconInput(): Locator` | getter | `this.collectionFormModal.getByPlaceholder('🤖')` — exact-match placeholder on the modal-scoped input. | The icon input uses an emoji as its placeholder (`🤖`) — the only emoji-placeholder field in the entire e2e suite. The exact-match (no regex) is appropriate because the placeholder is a single Unicode codepoint, no casing variants to tolerate. |
| `get collectionDescriptionInput(): Locator` | getter | `this.collectionFormModal.getByPlaceholder(/short description/i)` — substring placeholder match on the modal-scoped textarea. | The description input is a multi-line `<textarea>` (not a single-line `<input>`). The Locator surface is identical (`getByPlaceholder` works on both element types), but the read / write semantics differ — `.fill(text)` works on both, but a future contributor who reaches for `.press('Enter')` to confirm the field will discover that the textarea inserts a newline rather than submitting. |
| `get activeToggle(): Locator` | getter | `this.collectionFormModal.locator('[role="switch"]').first()` — the **first** ARIA-`role="switch"` element inside the modal scope. | The active toggle is a HeroUI `<Switch>` component which renders as a `role="switch"` element. The accessibility-tree-canonical posture (matches the screen-reader path). The `.first()` pin defends against future iterations of the form mounting more than one switch. |
| `get cancelButton(): Locator` | getter | `this.collectionFormModal.getByRole('button', { name: /cancel/i })` — substring `/cancel/i` button inside the modal scope. | The dismissal button. The substring regex tolerates phrasing variants (`Cancel`, `Cancel and close`, `Cancel changes`). The scoped Locator (nested under `collectionFormModal`) defends against a page-level "Cancel" button being picked up by mistake. |
| `get createButton(): Locator` | getter | `this.collectionFormModal.getByRole('button', { name: /create collection/i })` — substring `/create collection/i` button inside the modal scope. | The submit button on the **create** flow. The two-word regex (`create collection`) is more specific than a one-word `/create/i` regex and defends against a generic "Create" button being picked up by mistake. The scoped Locator defends against a page-level "Create collection" button being picked up by mistake. |
| `get saveButton(): Locator` | getter | `this.collectionFormModal.getByRole('button', { name: /save changes/i })` — substring `/save changes/i` button inside the modal scope. | The submit button on the **edit** flow. The two-word regex (`save changes`) is more specific than a one-word `/save/i` regex. Distinct from `createButton` because the production source mounts only one or the other depending on whether the modal is in create-mode or edit-mode (open via `addCollectionButton` vs open via per-row edit trigger). |
| `async fillCollectionForm({ id?, name, description? })` | method | `await this.collectionIdInput.fill(data.id)` (if `data.id` is set), `await this.collectionNameInput.fill(data.name)` (always), `await this.collectionDescriptionInput.fill(data.description)` (if `data.description` is set). | The per-form fill helper. Three properties: (a) **named-arg shape** with TypeScript-optional `id?` and `description?` lets the consuming spec write `fillCollectionForm({ name: '…' })` for an edit-mode flow that only changes the name, (b) **deterministic order** (id, then name, then description) matches the visual order of the form fields, defending against tab-order regressions, (c) **`fill` and not `type`** is faster (`fill` writes to the underlying input value via the React state hook in one shot, `type` would simulate per-character keystrokes). |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminCollectionsPage extends BasePage {
	readonly heading: Locator;
	readonly addCollectionButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.addCollectionButton = page.getByRole('button', { name: /add collection/i }).first();
	}

	async navigate() {
		await this.goto('/admin/collections');
	}

	/** Get a collection row by its name text. */
	getCollectionByName(name: string): Locator {
		return this.page.locator('div').filter({ hasText: new RegExp(name, 'i') }).first();
	}

	/** Click the edit button for a specific collection. */
	async editCollection(name: string) {
		const row = this.getCollectionByName(name);
		await row.getByRole('button', { name: /edit/i }).click();
	}

	/** Click the delete button for a specific collection. */
	async deleteCollection(name: string) {
		const row = this.getCollectionByName(name);
		await row.getByRole('button', { name: /delete/i }).click();
	}

	/** Get the collection form modal overlay. */
	get collectionFormModal() {
		return this.page.locator('.fixed.inset-0.z-50').first();
	}

	/** Collection form ID input (uses HeroUI Input — target by placeholder). */
	get collectionIdInput() {
		return this.collectionFormModal.getByPlaceholder(/frontend-frameworks/i);
	}

	/** Collection form name input. */
	get collectionNameInput() {
		return this.collectionFormModal.getByPlaceholder(/collection name/i);
	}

	/** Collection form icon input. */
	get collectionIconInput() {
		return this.collectionFormModal.getByPlaceholder('🤖');
	}

	/** Collection form description textarea. */
	get collectionDescriptionInput() {
		return this.collectionFormModal.getByPlaceholder(/short description/i);
	}

	/** Collection form active toggle. */
	get activeToggle() {
		return this.collectionFormModal.locator('[role="switch"]').first();
	}

	/** Cancel button in collection form. */
	get cancelButton() {
		return this.collectionFormModal.getByRole('button', { name: /cancel/i });
	}

	/** Create collection button. */
	get createButton() {
		return this.collectionFormModal.getByRole('button', { name: /create collection/i });
	}

	/** Save changes button (edit mode). */
	get saveButton() {
		return this.collectionFormModal.getByRole('button', { name: /save changes/i });
	}

	/** Fill the collection form. */
	async fillCollectionForm(data: { id?: string; name: string; description?: string }) {
		if (data.id) {
			await this.collectionIdInput.fill(data.id);
		}
		await this.collectionNameInput.fill(data.name);
		if (data.description) {
			await this.collectionDescriptionInput.fill(data.description);
		}
	}
}
```

## Why `AdminCollectionsPage` extends `BasePage`

Three load-bearing reasons the admin-tree collections driver
inherits from [`base-page-object.md`](base-page-object.md)
instead of standing alone (the posture
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md)
and the other public-tree widget drivers take):

- **Page-route navigation via the inherited `goto` method.**
  The collections driver targets a navigable URL
  (`/admin/collections`) — it is a "page object" in the URL
  sense, not a global widget. The single `navigate()`
  shortcut closes over the inherited
  `await this.goto('/admin/collections')`, which in turn
  participates in `BasePage`'s post-navigation
  `waitForPageReady()` discipline (network-idle wait,
  locale-prefix resolution against the configured
  `baseURL`, authenticated-cookie carry-through). A
  standalone class would have to restate every one of these
  concerns inline.
- **Global header / footer / nav-link chrome surfaced for
  free.** The admin shell renders the same global header /
  footer / nav-link chrome on `/admin/collections` as on
  every other admin route. The inherited `header` /
  `footer` / `navLinks` Locators let a spec drive the
  collections-management surface **and** assert on the
  surrounding admin shell (e.g. "the user-menu link is
  present in the header" / "the sidebar contains the
  Collections link") in the same flow, without wiring a
  second base-class composition primitive.
- **Post-navigation `waitForPageReady` stabiliser.** Every
  collections-management flow starts with
  `await collectionsPage.navigate(); await collectionsPage.waitForPageReady();`
  — the consuming spec at
  [`apps/web-e2e/tests/admin/collections.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/collections.spec.ts)
  uses this exact two-call shape five times. The
  `waitForPageReady` inheritance is what makes the second
  call meaningful — it's the same discipline
  `bulk-actions.spec.ts`, `clients.spec.ts`,
  `dashboard.spec.ts`, `items-crud.spec.ts`,
  `items-filter.spec.ts`, `items-review.spec.ts`, and every
  other admin-tree spec rely on for the post-navigation
  network-idle wait against the admin shell's React Query
  hydration storm.

## Why `getByPlaceholder(...)` for every form-input field

Three reasons every form-input getter
(`collectionIdInput`, `collectionNameInput`,
`collectionIconInput`, `collectionDescriptionInput`) uses
Playwright's `getByPlaceholder(...)` locator instead of
`getByLabel(...)`, `getByRole('textbox', { name: … })`, or
a `data-testid`:

- **HeroUI's `<Input>` component does not pair with a
  visible `<label>` element.** The collection-form modal's
  inputs use HeroUI's `<Input>` component, which renders
  the label as a styled `<span>` inside the `<input>`'s
  parent `<div>` — not as a `<label for="…">` element with
  a `for` attribute pointing at the input's `id`. The
  `getByLabel(...)` locator reads the underlying ARIA
  `accessible-name` computation, which prefers the
  `<label>` association over the placeholder; on this
  page, the absence of the `<label>` association makes
  `getByLabel(...)` resolve to zero matches for every
  field. The placeholder is the only stable
  production-source-emitted text the driver can pin to.
- **`getByRole('textbox', { name: … })` would resolve via
  the same accessible-name computation.** The accessible
  name for an `<input type="text">` without a `<label>`
  association falls back to the `aria-label` or the
  `placeholder` (in that order). The HeroUI `<Input>`
  component does not set `aria-label`, so the
  `getByRole('textbox', { name: /collection name/i })`
  Locator would resolve via the placeholder anyway — but
  with an extra hop through the role computation. The
  `getByPlaceholder(...)` shortcut is more direct and
  Playwright-idiomatic.
- **The `data-testid` posture would force a production-source
  change purely for the e2e suite.** The host app's
  collections form does not emit `data-testid` attributes
  today. Adding them would couple the test surface to a
  production-source change that brings no observable
  benefit. The placeholder is already a production-source
  primitive — pinning to it does not require a host-app
  change.

## Why `collectionFormModal` is a getter and not a `readonly` field

Three reasons the modal surface uses `get …(): Locator`
getter instead of a pre-bound `readonly … : Locator` field
on the constructor:

- **Late-binding against modal mount/unmount lifecycle.**
  The collection-form modal mounts and unmounts on every
  open/close cycle inside the page (mounts on the
  add-collection trigger click or the per-row edit trigger
  click; unmounts on Escape / submit / outside-click /
  cancel). A pre-bound Locator field would have to be
  re-resolved on every mount/unmount cycle for the
  strict-mode resolver to walk the current DOM — but
  Playwright's Locators are already lazy / re-resolved on
  every action, so the getter shape adds no per-call cost
  while making the late-binding explicit.
- **Symmetric with `clientFormModal` /
  `deleteConfirmModal` on the clients driver.**
  [`admin-clients-page-object.md`](admin-clients-page-object.md)
  uses the same getter posture for both modal surfaces.
  Keeping the convention consistent across the admin-tree
  page-object directory makes the tree scannable for a new
  contributor.
- **Used as the scope-anchor for nine downstream
  per-form-element getters.** The form-input getters
  (`collectionIdInput`, `collectionNameInput`,
  `collectionIconInput`, `collectionDescriptionInput`) and
  the form-control getters (`activeToggle`, `cancelButton`,
  `createButton`, `saveButton`) all read through
  `this.collectionFormModal.getByPlaceholder(...)` /
  `this.collectionFormModal.locator(...)` /
  `this.collectionFormModal.getByRole(...)`. A pre-bound
  field would resolve the modal Locator at constructor
  time (which is fine for shape but loses the late-binding
  semantics on every downstream getter); the getter shape
  re-resolves the modal scope on every per-form-element
  read.

## Why three named-row helpers (`getCollectionByName`, `editCollection`, `deleteCollection`)

Three reasons the driver exposes three named-row helpers on
top of the per-page Locator fields, where
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
and [`admin-clients-page-object.md`](admin-clients-page-object.md)
do not:

- **The collections page is the first admin-tree surface
  with per-row edit/delete buttons in the rollout.** The
  bulk-actions page exposes a global toolbar (every
  selected row gets the same action); the clients page
  exposes a delete confirmation modal on top of an inline
  per-row trigger that the spec drives via
  `button[color="danger"]`. The collections page is the
  first admin-tree surface where every row has an inline
  edit + delete button pair — the named-row helpers are
  the canonical encoding of that shape. Future admin-tree
  drivers (`comments.page.ts`, `companies.page.ts`,
  `featured-items.page.ts`) that mount per-row action
  buttons mirror this helper shape.
- **The helpers compose with the underlying Locator API
  rather than replacing it.** Each helper is a thin async
  wrapper: `editCollection(name)` resolves the row via
  `getCollectionByName(name)` and then calls
  `getByRole('button', { name: /edit/i }).click()` on the
  row scope. A consuming spec that needs more than the
  click — e.g. waiting for the modal to open after the
  click — composes the helper with a follow-up
  `await expect(collectionsPage.collectionFormModal).toBeVisible()`
  assertion. The helpers do not lock the spec into a
  pre-canned shape.
- **The helpers are documentation-by-default for new
  contributors.** A new contributor reading the driver
  source can immediately see that "rows are addressable by
  name" and "per-row actions are edit / delete" without
  reading the consuming spec or the production-source
  components. The helper API is the canonical "what can a
  spec do with this driver" surface — every consuming spec
  that drives a per-row flow should compose with the
  helpers rather than restate the row-resolution logic
  inline.

## Why `fillCollectionForm` accepts an object and not positional args

Three reasons the per-form fill helper takes a single
object parameter `{ id?: string; name: string; description?: string }`
instead of three positional `id`, `name`, `description`
parameters:

- **Optional fields with TypeScript-required `name`.**
  The form has one required field (`name`) and two optional
  fields (`id` for create-mode only, `description` for any
  mode where the user wants to set the description). The
  named-arg shape encodes "required vs optional" via
  TypeScript's `?` suffix — a positional shape would have
  to declare every parameter as optional and check at
  runtime, losing the compile-time guarantee.
- **Self-documenting at the call site.** A consuming spec
  that reads `fillCollectionForm({ id: 'frontend-frameworks',
  name: 'Frontend Frameworks', description: 'Modern JS
  frameworks' })` can be understood without reading the
  driver source. A positional `fillCollectionForm('frontend-frameworks',
  'Frontend Frameworks', 'Modern JS frameworks')` would
  require a reader to count parameter positions and consult
  the driver's signature.
- **Forward-compatible with new fields.** A future
  iteration of the form might add a `slug?` or `icon?` or
  `isActive?` field — the named-arg shape lets the helper
  add the new field without breaking any existing call
  site (the new field is automatically optional, and
  existing call sites that don't pass it continue to
  compile). A positional shape would force every existing
  call site to add a `null` / `undefined` placeholder.

## Why placeholder-only inputs (no per-input `aria-label` or `data-testid`)

Three reasons the driver pins to placeholders rather than
`aria-label` or `data-testid`, even though those would be
more stable in principle:

- **Production-source posture.** The host app's collection
  form uses HeroUI's `<Input>` component, which does not
  set `aria-label` and does not emit `data-testid`. The
  e2e driver pins to a primitive the production source
  already emits — the placeholder. Adding `aria-label` or
  `data-testid` to every input would force a production-
  source change purely for the e2e suite, which the
  template's "production-source-first" selector posture
  rejects (see the failure matrix entry for
  `data-testid`).
- **Substring-regex tolerance.** Each placeholder getter
  uses a substring regex (`/frontend-frameworks/i`,
  `/collection name/i`, `/short description/i`) — except
  the icon input which uses an exact-match Unicode emoji
  (`🤖`). The regex form tolerates the placeholder text
  being expanded (e.g. `Collection name (required)`) or
  contracted (e.g. `Name`) without breaking the locator.
  An `aria-label` switch would have to recreate the same
  tolerance.
- **Locale-stability via the production-source's
  English-only placeholders.** The form's placeholders are
  English-only today (no `next-intl` t-key resolution).
  This is a deliberate design choice — the form is an
  admin-only surface that the production source assumes
  the admin operates in English. A future iteration of
  the form that translates the placeholders to per-locale
  phrases would have to re-evaluate the locator strategy
  (likely switching to `getByLabel(...)` once the form
  also adds `<label>` associations) — but until then, the
  placeholder is the most stable per-locale-invariant
  primitive on the form.

## Failure matrix

| Mistake on `collections.page.ts` | Layer that surfaces it |
| --- | --- |
| Drop `import type` for `Page` / `Locator` | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner. |
| Drop the `extends BasePage` clause | Loses inherited `header` / `footer` / `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle`; every consuming spec must restate the network-idle wait inline. |
| Drop `super(page)` from the constructor | TypeScript compile error: "Constructors for derived classes must contain a 'super' call". |
| Drop `readonly` from any field | Cross-test state-leak risk against shared driver instances. |
| Drop the `i` flag from any name-regex | Per-locale casing variants flake; e.g. `Add Collection` (title case) misses a lowercase `add collection` substring. |
| Drop the `.first()` pin from `addCollectionButton` | Strict-mode failure on tenants whose admin shell mounts both a page-header "Add collection" CTA and an empty-state "Add a collection" peer. |
| Drop the `.first()` pin from `heading` | Strict-mode failure against per-row collection name headings (`<h4>`/`<h3>`) — the consuming spec uses `adminPage.locator('h4, h3').first()` precisely because those headings exist on the page. |
| Switch `addCollectionButton` to `[data-testid="add-collection"]` | Forces a production-source change purely for the e2e suite; violates the production-source-first selector posture. |
| Drop the `.first()` pin from `collectionFormModal` | Strict-mode failure on tenants where a tooltip / toast also mounts as `.fixed.inset-0.z-50`. |
| Switch `collectionFormModal` to `[role="dialog"][aria-modal="true"]` | Silently `test.skip()`s on tenants where the host app has not added the canonical ARIA attributes to the overlay. |
| Switch any input getter from `getByPlaceholder(...)` to `getByLabel(...)` | Locator resolves to zero matches because HeroUI's `<Input>` component does not emit a `<label>` association. |
| Drop the modal scope from any input getter | Locator over-matches against page-level inputs (e.g. a future search input on the collections listing). |
| Drop the modal scope from `cancelButton` / `createButton` / `saveButton` | Locator over-matches against page-level buttons. |
| Switch `createButton` regex from `/create collection/i` to `/create/i` | Locator matches a page-level "Create" button (e.g. "Create user" / "Create role" on a future shared admin shell). |
| Switch `saveButton` regex from `/save changes/i` to `/save/i` | Locator matches a page-level "Save settings" button on a future iteration of the admin shell. |
| Switch `activeToggle` from `[role="switch"]` to `input[type="checkbox"]` | Locator resolves to zero matches because HeroUI's `<Switch>` renders as a `role="switch"` element, not a native checkbox. |
| Drop the `getCollectionByName` helper | Every per-row consuming spec must restate the row-resolution Locator inline; documentation-by-default is lost. |
| Switch `getCollectionByName` from `div`-tag to `[role="row"]` | Locator resolves to zero matches because the production source renders collections as Tailwind cards, not table rows. |
| Switch `editCollection` / `deleteCollection` to `page.getByRole(...)` peers | Strict-mode failure against per-row buttons not scoped to the targeted collection. |
| Drop the `if (data.id)` guard in `fillCollectionForm` | Edit-mode flows that don't pass `id` will fill the ID input with `undefined`, surfacing as a TypeScript error. |
| Drop the `navigate()` method | Every consuming spec must restate `await collectionsPage.goto('/admin/collections')`; documentation-by-default is lost. |
| Move the file out of `apps/web-e2e/page-objects/admin/` | `Cannot find module` on every importing spec. |
| Rename `AdminCollectionsPage` | Every importer needs a matching rename. |
| Switch the file extension to `.tsx` | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks. |
| Drop the trailing newline | Prettier diff. |
| Ship the file with CRLF line endings | Same as above. |

## Per-line walkthrough

| Line(s) | Code | Purpose |
| --- | --- | --- |
| 1 | `import type { Page, Locator } from '@playwright/test';` | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost. |
| 2 | `import { BasePage } from '../base.page';` | Runtime import of the inheritance root; required because `extends BasePage` evaluates the symbol at class-declaration time. |
| 4 | `export class AdminCollectionsPage extends BasePage {` | Single named export, with the `extends BasePage` clause — see "Why `AdminCollectionsPage` extends `BasePage`" above. |
| 5 | `readonly heading: Locator;` | Pre-bound page heading Locator. |
| 6 | `readonly addCollectionButton: Locator;` | Pre-bound add-collection trigger button Locator. |
| 8–11 | `constructor(page: Page) { super(page); … }` | Stores the `page` via `super(page)` and pre-binds every Locator in a single pass. |
| 9 | `super(page);` | Required by `extends BasePage` — wires up the inherited `page` field, `header` / `footer` / `navLinks` Locators, and the `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` methods. |
| 10 | `this.heading = page.getByRole('heading').first();` | Accessibility-tree-canonical heading Locator with `.first()` pin. |
| 11 | `this.addCollectionButton = page.getByRole('button', { name: /add collection/i }).first();` | Accessibility-tree-canonical add-collection trigger button Locator with case-insensitive regex name. |
| 14–16 | `async navigate() { await this.goto('/admin/collections'); }` | Single canonical entry-point; closes over `BasePage`'s `goto` for post-navigation `waitForPageReady` discipline. |
| 19–21 | `getCollectionByName(name: string): Locator { … }` | Named-row finder via `div`-tag Locator with case-insensitive substring filter and `.first()` pin. |
| 24–27 | `async editCollection(name: string) { … }` | Named-row edit-trigger; resolves the row via `getCollectionByName` then clicks the scoped edit button. |
| 30–33 | `async deleteCollection(name: string) { … }` | Named-row delete-trigger; symmetric with `editCollection`. |
| 36–38 | `get collectionFormModal() { return this.page.locator('.fixed.inset-0.z-50').first(); }` | Late-bound positional selector for the collection-form modal overlay with `.first()` pin. |
| 41–43 | `get collectionIdInput() { return this.collectionFormModal.getByPlaceholder(/frontend-frameworks/i); }` | Modal-scoped placeholder match for the ID input. |
| 46–48 | `get collectionNameInput() { return this.collectionFormModal.getByPlaceholder(/collection name/i); }` | Modal-scoped placeholder match for the name input. |
| 51–53 | `get collectionIconInput() { return this.collectionFormModal.getByPlaceholder('🤖'); }` | Modal-scoped exact-match Unicode-emoji placeholder for the icon input. |
| 56–58 | `get collectionDescriptionInput() { return this.collectionFormModal.getByPlaceholder(/short description/i); }` | Modal-scoped placeholder match for the description textarea. |
| 61–63 | `get activeToggle() { return this.collectionFormModal.locator('[role="switch"]').first(); }` | Modal-scoped ARIA-`role="switch"` Locator with `.first()` pin. |
| 66–68 | `get cancelButton() { return this.collectionFormModal.getByRole('button', { name: /cancel/i }); }` | Modal-scoped substring `/cancel/i` button Locator. |
| 71–73 | `get createButton() { return this.collectionFormModal.getByRole('button', { name: /create collection/i }); }` | Modal-scoped substring `/create collection/i` button Locator (create-mode submit). |
| 76–78 | `get saveButton() { return this.collectionFormModal.getByRole('button', { name: /save changes/i }); }` | Modal-scoped substring `/save changes/i` button Locator (edit-mode submit). |
| 81–89 | `async fillCollectionForm(data: { id?: string; name: string; description?: string }) { … }` | Per-form fill helper with `if (data.id)` / `if (data.description)` guards for the optional fields. |

## Read / write surface

| Caller | Reads | Writes |
| --- | --- | --- |
| [`apps/web-e2e/tests/admin/collections.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/collections.spec.ts) | `heading.isVisible()`, `addCollectionButton.isVisible()`, `collectionFormModal.isVisible()` (visible / hidden assertions), `createButton`, `saveButton`, `collectionNameInput` | Calls `navigate()` to reach `/admin/collections`, `addCollectionButton.click()` to open the create-mode modal, `fillCollectionForm(data)` to fill the form fields, `createButton.click()` to submit the create flow, an inline per-row hover + edit click to open the edit-mode modal, `collectionNameInput.clear()` + `.fill(updatedName)` to update the name, `saveButton.click()` to submit the edit flow, an inline per-row hover + delete click + `dialog.accept()` to delete a collection. |
| Future per-row collections-table specs | A future per-row Locator collection (e.g. `collectionRows`) for "exactly N collections" assertions; the `getCollectionByName(name)` helper for named-row lookups; the `editCollection(name)` / `deleteCollection(name)` helpers for per-row triggers | A future submit-button click that materialises a real collection edit / delete in the admin database and exercises the per-row flow. |
| Future create-flow validation specs | A future Locator collection on the form-validation error messages (e.g. `idValidationError`, `nameValidationError`) for "ID is required" / "Name is too long" / "Slug already exists" assertions | A future `fillCollectionForm({ name: '' })` call that triggers the empty-name validator, plus per-error assertions on the validation messages. |
| Admin collections production-source components (the production source for the DOM contract) | The exact accessible name of the add-collection trigger button; the `.fixed.inset-0.z-50` Tailwind utility chain on the modal overlay; the placeholders on every form-input field; the `[role="switch"]` ARIA role on the active toggle; the accessible names of the cancel / create / save buttons | Mounts the collection-form modal in the DOM only after the add-collection trigger or per-row edit trigger is clicked; emits the per-row delete trigger as a button that opens a browser-native `confirm()` dialog (not a custom React modal); emits the per-row edit / delete buttons inside a `div.group` wrapper that reveals them on hover. |
| [`base-page-object.md`](base-page-object.md) | The inheritance root the class extends; the `page` field, the `header` / `footer` / `navLinks` Locators, and the `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` methods. | — |
| [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md) | The "first per-source-file reference for any file under `apps/web-e2e/page-objects/admin/`" template this doc mirrors. | — |
| [`admin-clients-page-object.md`](admin-clients-page-object.md) | The "second per-source-file reference for any file under `apps/web-e2e/page-objects/admin/`" template this doc mirrors and the precedent for the `.fixed.inset-0.z-50` modal-overlay posture. | — |
| [`e2e-tsconfig.md`](e2e-tsconfig.md) | The `include: ["./**/*.ts"]` glob picks up this file. | — |
| [`playwright-config.md`](playwright-config.md) | Resolves the relative `/admin/collections` path the consuming spec navigates to via `baseURL`; supplies the authenticated admin storage state via the `adminPage` fixture. | — |

### Read / write surface — failure modes

| Drift | Surfaces as |
| --- | --- |
| Production-source rename of the "Add Collection" button text to "New Collection" | The `addCollectionButton` Locator fails to find the trigger; every "click add-collection → modal opens" assertion times out. |
| Production-source switch from `.fixed.inset-0.z-50` to a different overlay primitive (e.g. portal-rendered) | The `collectionFormModal` getter fails to find the overlay; every "modal opens" assertion times out. |
| Production-source rename of any form-input placeholder text | The corresponding `getByPlaceholder(...)` Locator fails to match; every form-fill assertion fails. |
| Production-source switch from HeroUI `<Input>` to a `<input>`-with-`<label>` pair | The `getByPlaceholder(...)` Locators continue to work (the placeholder is preserved), but a future contributor who switches the driver to `getByLabel(...)` should re-evaluate the regex shapes. |
| Production-source switch from HeroUI `<Switch>` to a native `<input type="checkbox">` | The `activeToggle` Locator fails because `[role="switch"]` no longer matches; the spec must switch to `input[type="checkbox"]`. |
| Production-source rename of the create-mode submit button from "Create Collection" to "Create" | The `createButton` Locator fails because `/create collection/i` no longer matches; the spec must switch to `/create/i` (which would over-match a future page-level "Create" button — the rename would force a re-evaluation). |
| Production-source rename of the edit-mode submit button from "Save Changes" to "Save" | The `saveButton` Locator fails because `/save changes/i` no longer matches; symmetric with the `createButton` rename. |
| Production-source switch of the per-row delete from `confirm()` to a custom React modal | The consuming spec's `page.on('dialog', dialog => dialog.accept())` handler never fires; the deletion is blocked behind the modal. The spec must switch to a `deleteConfirmModal` Locator (matching the clients driver's posture). |
| Production-source switch of the per-row edit / delete buttons from `<button>` to a kebab-menu opener | The named-row helpers (`editCollection`, `deleteCollection`) fail because `getByRole('button', { name: /edit|delete/i })` no longer matches the inline buttons; the spec must switch to a kebab-menu open + click flow. |
| Database seeding regression that empties the admin collections listing | The edit / delete flows fail because no row exists; the spec auto-`test.skip()`s via the `firstCollection` visibility precondition check. |
| Authentication regression that breaks the `adminPage` fixture | Every spec fails with a 302 redirect to the sign-in page or a 401/403 from the admin route guard. |
| Middleware change that disables JavaScript on `/admin/collections` | The collection-form modal never mounts (the React state hook never fires on trigger click); every "modal opens" assertion times out. |
| `playwright.config.ts` `baseURL` change | The relative `/admin/collections` resolves to a different host; the route either 404s or redirects. |

## Change checklist

Any change to `collections.page.ts` must:

- Audit every spec under
  `apps/web-e2e/tests/admin/collections.spec.ts` for
  compatibility with the new shape.
- Cross-check [`base-page-object.md`](base-page-object.md)
  for the `BasePage` posture — if the new shape inherits
  from `BasePage`, document the why; if it does not (a
  future widget-style refactor), document the why-not
  against the standalone-class precedent set by
  [`scroll-to-top-page-object.md`](scroll-to-top-page-object.md).
- Cross-check
  [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
  and
  [`admin-clients-page-object.md`](admin-clients-page-object.md)
  for the admin-tree page-object template; the new shape
  should mirror the established posture (type-only
  import, runtime base import, `extends BasePage`, single
  `navigate()` shortcut, late-bound modal getters).
- Cross-check the production source for the admin
  collections-management page for the canonical "Add
  Collection" button accessible name, the
  `.fixed.inset-0.z-50` Tailwind utility chain on the
  modal overlay, the placeholders on every form-input
  field, the `[role="switch"]` ARIA role on the active
  toggle, the accessible names of the cancel / create /
  save buttons, and the per-row hover-to-reveal
  edit / delete button pair.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for
  the `include: ["./**/*.ts"]` glob coverage.
- Cross-check
  [`playwright-config.md`](playwright-config.md) for the
  `baseURL` posture and the `adminPage` fixture binding
  the consuming spec relies on.
- Cross-check [`fixtures-index.md`](fixtures-index.md) —
  today the driver is instantiated inline by the
  consuming spec via the `adminPage` fixture, but a
  future fixture-bound collections driver would surface
  here.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the
  collections spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Collections Management"`).
- Add a [`docs/log.md`](../log.md) entry describing the
  change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that
  affects test authoring.
- Reviewer pass.
