---
id: admin-companies-page-object
title: E2E Admin Companies Page Object (apps/web-e2e/page-objects/admin/companies.page.ts)
sidebar_label: E2E Admin Companies Page Object
sidebar_position: 404
---

# E2E Admin Companies Page Object — `apps/web-e2e/page-objects/admin/companies.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin companies management** driver paired with
[`apps/web-e2e/page-objects/admin/companies.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/companies.page.ts).
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
`dashboard.page.ts`, `data-export.page.ts`,
`featured-items.page.ts`, `item-form.page.ts`,
`items.page.ts`, `notifications.page.ts`,
`reports.page.ts`, `roles.page.ts`, `settings.page.ts`,
`sponsorships.page.ts`, `surveys.page.ts`, `tags.page.ts`).

This page is the **fifth per-source-file reference** the
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
fields plus a per-form fill helper, and the fourth
[`admin-comments-page-object.md`](admin-comments-page-object.md)
which extended the rollout with the
**HeroUI-Modal-based delete confirmation surface** (a
`[role="dialog"]` overlay rather than the browser-native
`confirm()` dialog the collections driver documents, and
rather than the custom-React `deleteConfirmModal` overlay
the clients driver documents). The companies driver
continues the rollout of the remaining twelve admin-tree
page-object docs (one per source file) and is the
**first** admin-tree driver in the rollout that documents
both a **bare `.fixed.inset-0.z-50` Tailwind-overlay
form modal** (matching the clients driver's posture for
the create / edit form) **and** a separate **text-
filtered Tailwind-overlay delete-confirmation modal**
(`.fixed.inset-0.z-50`-overlay primitive scoped by a
`hasText: /delete company/i` filter) — distinct from the
clients driver's named-class `deleteConfirmModal`
selector and from the comments driver's `[role="dialog"]`
selector.

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
boundary** at `/admin/comments`, this page documents the
**suite's admin companies-management driver boundary**
at `/admin/companies` — the smallest possible page
object that lets a spec drive the admin companies listing
end-to-end (navigate to `/admin/companies`, locate the
page heading via the inherited accessibility-tree-
canonical heading Locator, locate the "Add Company"
trigger via the case-insensitive `/add company/i`
accessible-name regex, locate the company-form modal via
the `.fixed.inset-0.z-50` Tailwind-overlay positional
selector, locate the company-name input as the first
`<input>` inside the modal, locate the cancel / create /
update buttons via the case-insensitive `/cancel/i`,
`/create company/i`, `/update company/i` accessible-name
regexes, and locate the deletion-confirmation modal via
the `.fixed.inset-0.z-50` overlay scoped by a
`hasText: /delete company/i` filter plus the `^delete$`
exact-match confirm-button regex).

The file is the **only driver** in the suite for the
admin companies-management surface today. Like
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
[`admin-clients-page-object.md`](admin-clients-page-object.md),
[`admin-collections-page-object.md`](admin-collections-page-object.md),
[`admin-comments-page-object.md`](admin-comments-page-object.md),
[`signin-page-object.md`](signin-page-object.md),
[`item-detail-page-object.md`](item-detail-page-object.md),
[`discover-page-object.md`](discover-page-object.md),
[`map-page-object.md`](map-page-object.md), and
[`public-pages-page-object.md`](public-pages-page-object.md),
the `AdminCompaniesPage` class **does extend `BasePage`**
— see "Why `AdminCompaniesPage` extends `BasePage`"
below for the load-bearing reasons — so it inherits
`header` / `footer` / `navLinks` / `goto` / `gotoLocalized`
/ `waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and only
adds two per-page `readonly` Locator fields (`heading`,
`addCompanyButton`), seven per-element getters
(`companyFormModal`, `companyNameInput`, `cancelButton`,
`createCompanyButton`, `updateCompanyButton`,
`deleteConfirmModal`, `confirmDeleteButton`), and the
single-route `navigate()` shortcut on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-companies` driver is consumed today by
[`apps/web-e2e/tests/admin/companies.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/companies.spec.ts),
which covers four flows over the admin-shell companies-
management surface:

- **Admin can access companies management page** — a
  baseline navigation + visibility assertion against the
  `heading` and `addCompanyButton` Locators after a
  `navigate()` / `waitForPageReady()` two-call. The flow
  pins the authenticated `/admin/companies` route as
  reachable and the page heading + add-company trigger as
  the canonical anchors for the page identity.
- **Admin can open create company modal** — a
  60s-timeout-bounded modal-mount flow that clicks
  `addCompanyButton`, asserts `companyFormModal`
  visibility within 5s, asserts `companyNameInput`
  visibility, then clicks `cancelButton` and asserts
  `companyFormModal` becomes hidden within 5s. The flow
  pins the modal-mount lifecycle (mounts on add-button
  click, unmounts on cancel-button click) and the per-
  field `<input>` visibility inside the modal.
- **Admin can create a new company** — a
  60s-timeout-bounded create-flow that uses a per-test
  `Date.now()`-suffixed company name, fills
  `companyNameInput` with the name, clicks
  `createCompanyButton`, asserts `companyFormModal`
  becomes hidden within 10s, then asserts the company
  appears in the listing via
  `adminPage.getByText(companyName).first()`. The flow
  pins both the create-mode form-submit shape (the
  `Create Company` button label, distinct from the
  `Update Company` label the edit-mode mounts) and the
  post-submit listing-refresh contract (the new row
  appears within the 10s post-mutation revalidation
  window).
- **Admin can open delete company confirmation** — a
  delete-flow that resolves the first per-row delete
  trigger via a multi-step Locator chain (first by
  `button` filtered by `svg` filtered by `/delete/i`,
  then by `button[color="danger"]` as a fallback), clicks
  it, asserts `deleteConfirmModal` visibility, clicks the
  modal's `Cancel` button, and asserts the modal closes
  within 5s. The flow pins both the delete-trigger shape
  (a HeroUI `<Button>` containing a `<svg>` icon, with
  the `color="danger"` prop as the fallback selector) and
  the delete-confirmation modal posture (a
  `.fixed.inset-0.z-50` Tailwind-overlay primitive scoped
  by `hasText: /delete company/i`, NOT the
  `[role="dialog"]` HeroUI Modal the comments driver
  pins, NOT the browser-native `confirm()` dialog the
  collections driver pins, and NOT the named-class
  `deleteConfirmModal` selector the clients driver pins).
  The flow auto-`test.skip()`s on tenants where no
  delete trigger is visible (e.g. an empty-database-
  shell variant where no companies exist).

A spec that drives the admin companies-management
surface inline (via
`await page.getByRole('button', { name: /add company/i }).click()`
or
`await page.locator('.fixed.inset-0.z-50').first().getByRole('button', { name: /create company/i }).click()`)
is a **drift** that this page object is the canonical
replacement for; new specs that touch the admin
companies-management surface must reach for
`AdminCompaniesPage` instead.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The admin-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports the companies driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root — see [`base-page-object.md`](base-page-object.md). Required because `extends BasePage` evaluates the symbol at class-declaration time. | Anchors the companies driver to the canonical page-object base — the same `header` / `footer` / `navLinks` Locators every other page object in the suite has, the same `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` helpers. |
| `export class AdminCompaniesPage extends BasePage` | named export | Single class declaration with `extends BasePage` — inherits the page-object base. Adds two per-page Locator fields, seven per-element getters, and one `navigate()` shortcut on top. | See "Why `AdminCompaniesPage` extends `BasePage`" below. The class is the canonical driver for the admin companies-management surface today; every spec that drives the companies listing instantiates this class, never a bespoke inline driver. |
| `readonly heading: Locator` | field | `page.getByRole('heading').first()` — locates the **first** heading on `/admin/companies` as the page title anchor. | The accessibility-tree-canonical posture for "the page heading" in a way that survives the production source switching from `<h1>` to `<h2>`. The `.first()` pin defends against future per-card / per-row company-name `<h4>` / `<h3>` headings being picked up by mistake. |
| `readonly addCompanyButton: Locator` | field | `page.getByRole('button', { name: /add company/i }).first()` — the **first** button whose accessible name matches the case-insensitive `/add company/i` substring. | Accessibility-tree-canonical posture for the "Add Company" trigger. The `.first()` pin defends against multi-button pages (e.g. a future "Add Company" button in the header **and** in an empty-state CTA). The case-insensitive `/add company/i` regex tolerates production-source rephrasing between `Add Company`, `Add company`, `+ Add Company`. |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds both per-page Locators in a single pass. | Single constructor signature with the `super(page)` call (because the class extends `BasePage`). Every spec instantiates `new AdminCompaniesPage(adminPage)` against the authenticated admin fixture (no fixture-bound auto-instantiation today). |
| `async navigate()` | method | `await this.goto('/admin/companies')` — navigates to the admin companies listing route via the inherited `goto()` from `BasePage`. | The single canonical entry-point for every consuming spec. The `goto()` inheritance lets the driver participate in `BasePage`'s post-navigation `waitForPageReady()` discipline without restating the network-idle wait at every call site. |
| `get companyFormModal(): Locator` | getter | `this.page.locator('.fixed.inset-0.z-50').first()` — late-bound positional selector that locates the **first** `.fixed.inset-0.z-50` Tailwind-overlay element on the page. | The create-or-edit company-form modal. The `.first()` pin defends against multi-overlay pages (e.g. a future toast notification rendered with the same Tailwind overlay primitive). The selector matches the clients driver's `clientFormModal` posture and the collections driver's `collectionFormModal` posture — every admin-tree page-object that mounts a form modal uses the same `.fixed.inset-0.z-50` Tailwind-overlay primitive selector. |
| `get companyNameInput(): Locator` | getter | `this.companyFormModal.locator('input').first()` — modal-scoped positional selector for the **first** `<input>` element inside the form modal. | The company-name input. Distinct from the collections driver's `getByPlaceholder(...)` posture because the companies form's inputs do not emit production-source-stable placeholders today (the form input rendered by HeroUI's `<Input>` component receives the placeholder via a `label` prop with no per-input `aria-label` or `data-testid`). The modal-scoped `locator('input').first()` matches the first input regardless of the placeholder text — fragile to per-form-input reordering, robust to placeholder rephrasing. |
| `get cancelButton(): Locator` | getter | `this.companyFormModal.getByRole('button', { name: /cancel/i })` — modal-scoped accessible-name selector for the cancel button. | Modal-scoped `Cancel` button posture. The case-insensitive `/cancel/i` regex tolerates production-source rephrasing between `Cancel`, `cancel`, `CANCEL`. The modal-scope guarantees the selector does not pick up a global page `Cancel` button. |
| `get createCompanyButton(): Locator` | getter | `this.companyFormModal.getByRole('button', { name: /create company/i })` — modal-scoped accessible-name selector for the create-mode submit button. | Create-mode submit-button posture. The case-insensitive `/create company/i` regex tolerates production-source rephrasing between `Create Company`, `create company`. The modal-scope guarantees the selector does not pick up the form-anchoring "Add Company" button on the page (which uses the `Add Company` accessible name). |
| `get updateCompanyButton(): Locator` | getter | `this.companyFormModal.getByRole('button', { name: /update company/i })` — modal-scoped accessible-name selector for the edit-mode submit button. | Edit-mode submit-button posture. The case-insensitive `/update company/i` regex tolerates production-source rephrasing between `Update Company`, `update company`. The form modal mounts in two modes (create / edit) — `createCompanyButton` and `updateCompanyButton` are the per-mode submit-button drivers. |
| `get deleteConfirmModal(): Locator` | getter | `this.page.locator('.fixed.inset-0.z-50').filter({ hasText: /delete company/i })` — late-bound positional selector for the `.fixed.inset-0.z-50` overlay scoped by the case-insensitive `/delete company/i` text filter. | The delete-confirmation modal. Distinct from the comments driver's `[role="dialog"]` posture (HeroUI Modal) and from the clients driver's named-class `deleteConfirmModal` posture — the companies driver uses the bare Tailwind-overlay primitive scoped by a text filter to avoid clashing with the create / edit form modal that uses the same overlay primitive. The `/delete company/i` text filter is the per-modal disambiguation key. |
| `get confirmDeleteButton(): Locator` | getter | `this.deleteConfirmModal.getByRole('button', { name: /^delete$/i })` — modal-scoped accessible-name selector for the confirm-delete button via an exact-match `/^delete$/i` regex. | Confirm-delete button posture. The exact-match `^delete$` anchors guard against picking up the modal-title `Delete Company` text as the button name (which would happen with a substring `/delete/i` regex on a HeroUI Modal that emits the title as the modal's accessible name). The modal-scope guarantees the selector does not pick up a global page `Delete` button. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminCompaniesPage extends BasePage {
	readonly heading: Locator;
	readonly addCompanyButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.addCompanyButton = page.getByRole('button', { name: /add company/i }).first();
	}

	async navigate() {
		await this.goto('/admin/companies');
	}

	/** Get the company form modal overlay. */
	get companyFormModal() {
		return this.page.locator('.fixed.inset-0.z-50').first();
	}

	/** Company form name input (by label text). */
	get companyNameInput() {
		return this.companyFormModal.locator('input').first();
	}

	/** Cancel button in company form. */
	get cancelButton() {
		return this.companyFormModal.getByRole('button', { name: /cancel/i });
	}

	/** Create company button. */
	get createCompanyButton() {
		return this.companyFormModal.getByRole('button', { name: /create company/i });
	}

	/** Update company button. */
	get updateCompanyButton() {
		return this.companyFormModal.getByRole('button', { name: /update company/i });
	}

	/** Get the delete confirmation modal. */
	get deleteConfirmModal() {
		return this.page.locator('.fixed.inset-0.z-50').filter({ hasText: /delete company/i });
	}

	/** Confirm delete button. */
	get confirmDeleteButton() {
		return this.deleteConfirmModal.getByRole('button', { name: /^delete$/i });
	}
}
```

## Why `AdminCompaniesPage` extends `BasePage`

Three load-bearing reasons the admin-tree companies
driver inherits from
[`base-page-object.md`](base-page-object.md) instead of
standing alone (the posture
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md)
and the other public-tree widget drivers take):

- **Page-route navigation via the inherited `goto`
  method.** The companies driver targets a navigable URL
  (`/admin/companies`) — it is a "page object" in the URL
  sense, not a global widget. The single `navigate()`
  shortcut closes over the inherited
  `await this.goto('/admin/companies')`, which in turn
  participates in `BasePage`'s post-navigation
  `waitForPageReady()` discipline (network-idle wait,
  locale-prefix resolution against the configured
  `baseURL`, authenticated-cookie carry-through). A
  standalone class would have to restate every one of
  these concerns inline.
- **Global header / footer / nav-link chrome surfaced
  for free.** The admin shell renders the same global
  header / footer / nav-link chrome on
  `/admin/companies` as on every other admin route. The
  inherited `header` / `footer` / `navLinks` Locators
  let a spec drive the companies-management surface
  **and** assert on the surrounding admin shell (e.g.
  "the user-menu link is present in the header" / "the
  sidebar contains the Companies link") in the same
  flow, without wiring a second base-class composition
  primitive.
- **Post-navigation `waitForPageReady` stabiliser.** Every
  companies-management flow starts with
  `await companiesPage.navigate(); await companiesPage.waitForPageReady();`
  — the consuming spec at
  [`apps/web-e2e/tests/admin/companies.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/companies.spec.ts)
  uses this exact two-call shape four times. The
  `waitForPageReady` inheritance is what makes the
  second call meaningful — it's the same discipline
  `bulk-actions.spec.ts`, `clients.spec.ts`,
  `collections.spec.ts`, `comments.spec.ts`,
  `dashboard.spec.ts`, `items-crud.spec.ts`,
  `items-filter.spec.ts`, `items-review.spec.ts`, and
  every other admin-tree spec rely on for the post-
  navigation network-idle wait against the admin shell's
  React Query hydration storm.

## Why `.fixed.inset-0.z-50` for the form modal

Three reasons the form-modal getter uses Playwright's
`.fixed.inset-0.z-50` Tailwind-utility positional
selector instead of `[role="dialog"]` (the comments
driver's posture) or a `data-testid`:

- **Production-source consistency with the clients /
  collections form-modal posture.** The companies form
  modal is rendered with the same
  `.fixed.inset-0.z-50` Tailwind-overlay primitive as
  the clients form modal and the collections form modal.
  Every admin-tree page-object that mounts a form modal
  uses the same selector, so the test surface is
  internally consistent and easy to refactor en masse.
- **No `[role="dialog"]` on the production source today.**
  The companies form modal does not emit
  `role="dialog"` on the host element; switching to
  `getByRole('dialog')` would fail to find the modal
  unless the production source is patched. The
  `.fixed.inset-0.z-50` posture matches what the
  production source emits today.
- **The `data-testid` posture would force a production-
  source change purely for the e2e suite.** The host
  app's companies page does not emit `data-testid`
  attributes today. Adding them would couple the test
  surface to a production-source change that brings no
  observable benefit. The Tailwind utility-class trio
  (`fixed`, `inset-0`, `z-50`) is already a production-
  source primitive — pinning to it does not require a
  host-app change.

## Why `.first()` on `companyFormModal` (and not on `deleteConfirmModal`)

Three reasons `companyFormModal` pins to `.first()`
while `deleteConfirmModal` does not:

- **`.fixed.inset-0.z-50` is a multi-instance selector.**
  The Tailwind-overlay primitive is used for any modal
  / dialog / toast / tooltip the production source
  mounts on top of the page. The `.first()` pin
  guarantees `companyFormModal` resolves to the first
  such overlay (the create / edit form modal) and not
  to a stray notification toast or tooltip rendered with
  the same primitive.
- **`deleteConfirmModal` uses a text filter to
  disambiguate.** The delete-confirmation modal is
  scoped by `hasText: /delete company/i` — the filter
  is what guarantees the Locator resolves to the
  delete-confirmation modal and not to the create /
  edit form modal (which has no `Delete Company` text
  content). The text filter is a stronger
  disambiguation than `.first()` would be — even if
  multiple overlays mount simultaneously, only the
  delete-confirmation modal contains the `/delete
  company/i` substring. Adding `.first()` after the
  filter would be redundant.
- **Modal-mount lifecycle differences.** The form modal
  mounts before any other overlay (the user clicks
  `Add Company` to open it, no other modals are open
  at that point), so `.first()` is the natural
  disambiguator. The delete-confirmation modal mounts
  after the user clicks a per-row delete trigger, by
  which time the form modal has been closed (or never
  opened), so the text-filter disambiguation is the
  natural choice.

## Why `companyNameInput` uses `locator('input').first()` (and not `getByPlaceholder` / `getByRole('textbox')`)

Three reasons the company-name input getter uses the
modal-scoped `locator('input').first()` positional
selector instead of `getByPlaceholder(...)` (the
collections driver's posture) or
`getByRole('textbox', { name: ... })`:

- **No production-source-stable placeholder on the
  companies form input.** The companies form's name
  input does not emit a stable placeholder today (the
  HeroUI `<Input>` component receives the visible label
  via a `label` prop, not a `placeholder` prop). The
  modal-scoped `locator('input').first()` matches the
  first `<input>` regardless of the placeholder shape.
- **No accessible-name binding via a `<label>`
  element.** The HeroUI `<Input>` component does not
  pair with a separate `<label htmlFor="...">` element;
  the visible label is rendered as a sibling `<span>`
  inside the same wrapper. `getByRole('textbox', {
  name: 'Company name' })` would resolve via a fragile
  accessible-name computation that depends on
  `aria-labelledby` glue the production-source code
  emits. The positional `.first()` is the simpler
  pin.
- **Single-input form contract.** The companies form
  has a single primary input (the company name) — every
  other field on the form (website, domain, slug,
  status) is either optional or a select/toggle, not a
  text input. The `.first()` pin is unambiguous on the
  form because there is no second `<input>` competing
  for the position.

## Why `confirmDeleteButton` uses an exact-match `/^delete$/i` regex

Three reasons the confirm-delete button getter uses an
exact-match `/^delete$/i` regex with the `^` / `$`
anchors instead of the substring `/delete/i` posture
the comments driver's `deleteCommentDialog` text filter
uses:

- **The HeroUI Modal emits the title as the modal's
  accessible name.** A substring `/delete/i` regex would
  match both the modal title (`Delete Company`) and
  the confirm-delete button (`Delete`). Playwright's
  strict-mode resolver would fail on the multi-element
  match. The `^delete$` anchors guarantee the selector
  resolves to the button (whose accessible name is
  exactly `Delete`) and not to the modal title (whose
  accessible name is exactly `Delete Company`).
- **The case-insensitive `/i` flag tolerates
  capitalisation drift.** A future production-source
  rephrasing between `Delete`, `delete`, and `DELETE`
  does not break the locator. The flag is the same
  case-insensitivity the other admin-tree drivers use
  for their submit-button regexes.
- **The modal-scope is the second-line defence.** Even
  without the exact-match anchors, the modal-scope
  (`this.deleteConfirmModal.getByRole(...)`) restricts
  the search to the delete-confirmation modal subtree
  — but the modal-title text is inside the same
  subtree, so the exact-match anchors are still
  required.

## Why two distinct submit-button getters (`createCompanyButton` / `updateCompanyButton`)

Three reasons the driver exposes the create-mode and
edit-mode submit buttons as two distinct getters
instead of a single `submitButton` getter that handles
both:

- **The form modal mounts in two distinct modes
  (create / edit) with two distinct accessible names.**
  The host app's companies form mounts as the create
  form (with the `Create Company` submit button) when
  the user clicks `Add Company` from the listing, and
  as the edit form (with the `Update Company` submit
  button) when the user clicks a per-row edit trigger.
  A single `submitButton` getter would have to
  alternate between two regex-name patterns, which is
  more brittle than two single-purpose getters.
- **Per-mode test assertions.** The consuming
  `companies.spec.ts` create-flow test asserts on the
  `Create Company` button by name; a future edit-flow
  test will assert on the `Update Company` button by
  name. The two-getter shape lets each test reach for
  the per-mode driver directly without alternating
  branches.
- **Future-proof against per-mode-specific submit
  behaviours.** A future production-source change might
  add a per-mode loading state (e.g. a `Creating...`
  label on the create button while the API call is in
  flight, distinct from a `Updating...` label on the
  edit button). The two-getter shape gives the driver
  a per-mode binding point for any per-mode-specific
  selector adjustments.

## Why `companyFormModal` is a getter and not a `readonly` field

Three reasons the form-modal Locator (and the per-form-
input getters) use `get …(): Locator` getters instead of
pre-bound `readonly … : Locator` fields on the
constructor:

- **Late-binding against modal mount/unmount lifecycle.**
  The form modal mounts and unmounts on every open /
  close cycle (mounts on `Add Company` / per-row edit
  click; unmounts on Cancel / Create / Update / Escape /
  outside-click). A pre-bound Locator field would have
  to be re-resolved on every mount / unmount cycle for
  the strict-mode resolver to walk the current DOM —
  but Playwright's Locators are already lazy / re-
  resolved on every action, so the getter shape adds
  no per-call cost while making the late-binding
  explicit.
- **Symmetric with the modal-getter posture across the
  admin-tree page-object directory.** The clients
  driver uses `get clientFormModal()` and the
  collections driver uses `get collectionFormModal()`
  for the same late-binding reasons. Keeping the
  convention consistent across the admin-tree page-
  object directory makes the tree scannable for a new
  contributor.
- **Used as the scope-anchor for downstream getters.**
  The `companyFormModal` getter is the scope-anchor for
  every per-form-input / per-button getter in the
  driver: `companyNameInput` is
  `companyFormModal.locator('input').first()`,
  `cancelButton` is
  `companyFormModal.getByRole('button', { name: /cancel/i })`,
  etc. Encoding the scope as a getter makes the
  scope-chain explicit at the call site (every
  downstream getter starts with `this.companyFormModal`),
  which makes the modal-scope drift impossible to miss
  during code review.

## Failure matrix

| Mistake on `companies.page.ts` | Layer that surfaces it |
| --- | --- |
| Drop `import type` for `Page` / `Locator` | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner. |
| Drop the `extends BasePage` clause | Loses inherited `header` / `footer` / `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle`; every consuming spec must restate the network-idle wait inline. |
| Drop `super(page)` from the constructor | TypeScript compile error: "Constructors for derived classes must contain a 'super' call". |
| Drop `readonly` from any field | Cross-test state-leak risk against shared driver instances. |
| Drop the `.first()` pin from `heading` | Strict-mode failure against multi-heading surfaces. |
| Drop the `.first()` pin from `addCompanyButton` | Strict-mode failure against multi-trigger pages (e.g. an "Add Company" button in the header **and** an empty-state CTA). |
| Drop the case-insensitive `/i` flag from `addCompanyButton` | Brittle against `Add company` ↔ `Add Company` rephrasing. |
| Drop the `.first()` pin from `companyFormModal` | Strict-mode failure against multi-overlay pages (e.g. a notification toast rendered with the same Tailwind overlay primitive). |
| Switch `companyFormModal` to `[role="dialog"][aria-modal="true"]` | The host app's form modal does not emit `role="dialog"` today; the locator fails to find the modal. The driver should switch only after the production source is patched. |
| Switch `companyNameInput` to `getByPlaceholder(/company name/i)` | The host app's input does not emit a stable placeholder today; the locator fails to find the input. |
| Drop the modal-scope from `companyNameInput`, `cancelButton`, `createCompanyButton`, `updateCompanyButton`, or `confirmDeleteButton` | Locator picks up global page elements — the per-form / per-modal contract is silently broken. |
| Switch `createCompanyButton` regex from `/create company/i` to `/create/i` | Locator over-matches against any other "Create" button on the page (e.g. a future "Create Item" / "Create Tag" button rendered in the same admin shell). |
| Switch `updateCompanyButton` regex from `/update company/i` to `/update/i` | Same as above for the edit-mode submit button. |
| Drop the `^…$` anchors from `confirmDeleteButton` regex | Locator over-matches against the modal-title text (`Delete Company`) — strict-mode failure on the multi-element match. |
| Switch `deleteConfirmModal` from `.fixed.inset-0.z-50` to `[role="dialog"]` | The host app's delete-confirmation modal does not emit `role="dialog"` today; the locator fails to find the modal. |
| Drop the `hasText: /delete company/i` filter from `deleteConfirmModal` | Locator picks up the create / edit form modal (which uses the same overlay primitive). |
| Drop the `navigate()` method | Every consuming spec must restate `await companiesPage.goto('/admin/companies')`; documentation-by-default is lost. |
| Move the file out of `apps/web-e2e/page-objects/admin/` | `Cannot find module` on every importing spec. |
| Rename `AdminCompaniesPage` | Every importer needs a matching rename. |
| Switch the file extension to `.tsx` | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks. |
| Drop the trailing newline | Prettier diff. |
| Ship the file with CRLF line endings | Same as above. |

## Per-line walkthrough

| Line(s) | Code | Purpose |
| --- | --- | --- |
| 1 | `import type { Page, Locator } from '@playwright/test';` | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost. |
| 2 | `import { BasePage } from '../base.page';` | Runtime import of the inheritance root; required because `extends BasePage` evaluates the symbol at class-declaration time. |
| 4 | `export class AdminCompaniesPage extends BasePage {` | Single named export, with the `extends BasePage` clause — see "Why `AdminCompaniesPage` extends `BasePage`" above. |
| 5 | `readonly heading: Locator;` | Pre-bound page heading Locator. |
| 6 | `readonly addCompanyButton: Locator;` | Pre-bound add-company trigger Locator. |
| 8–12 | `constructor(page: Page) { super(page); … }` | Stores the `page` via `super(page)` and pre-binds every Locator in a single pass. |
| 9 | `super(page);` | Required by `extends BasePage` — wires up the inherited `page` field, `header` / `footer` / `navLinks` Locators, and the `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` methods. |
| 10 | `this.heading = page.getByRole('heading').first();` | Accessibility-tree-canonical heading Locator with `.first()` pin. |
| 11 | `this.addCompanyButton = page.getByRole('button', { name: /add company/i }).first();` | Accessibility-tree-canonical add-company trigger Locator with case-insensitive name regex and `.first()` pin. |
| 14–16 | `async navigate() { await this.goto('/admin/companies'); }` | Single canonical entry-point; closes over `BasePage`'s `goto` for post-navigation `waitForPageReady` discipline. |
| 19–21 | `get companyFormModal() { return this.page.locator('.fixed.inset-0.z-50').first(); }` | Late-bound form-modal Locator with `.first()` pin against multi-overlay pages. |
| 24–26 | `get companyNameInput() { return this.companyFormModal.locator('input').first(); }` | Modal-scoped first-input Locator. |
| 29–31 | `get cancelButton() { return this.companyFormModal.getByRole('button', { name: /cancel/i }); }` | Modal-scoped cancel button Locator. |
| 34–36 | `get createCompanyButton() { return this.companyFormModal.getByRole('button', { name: /create company/i }); }` | Modal-scoped create-mode submit button Locator. |
| 39–41 | `get updateCompanyButton() { return this.companyFormModal.getByRole('button', { name: /update company/i }); }` | Modal-scoped edit-mode submit button Locator. |
| 44–46 | `get deleteConfirmModal() { return this.page.locator('.fixed.inset-0.z-50').filter({ hasText: /delete company/i }); }` | Late-bound delete-confirmation modal Locator with text filter. |
| 49–51 | `get confirmDeleteButton() { return this.deleteConfirmModal.getByRole('button', { name: /^delete$/i }); }` | Modal-scoped exact-match confirm-delete button Locator. |

## Read / write surface

| Caller | Reads | Writes |
| --- | --- | --- |
| [`apps/web-e2e/tests/admin/companies.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/companies.spec.ts) | `heading.isVisible()` and `addCompanyButton.isVisible()` (visibility assertions); `companyFormModal.isVisible()` / `.isHidden()` for modal-mount lifecycle assertions; `companyNameInput.isVisible()` for input-presence assertion; `deleteConfirmModal.isVisible()` for delete-modal mount assertion. | Calls `navigate()` to reach `/admin/companies`; clicks `addCompanyButton` to open the form modal; fills `companyNameInput` with a per-test `Date.now()`-suffixed name; clicks `createCompanyButton` to submit the create form; clicks `cancelButton` to close the form modal; clicks the in-modal cancel button on the delete-confirmation modal to close it. |
| Future per-row companies-table specs | A future per-row Locator collection (e.g. `companyRows`) for "exactly N companies" assertions; the `confirmDeleteButton` Locator for "delete-and-confirm" flows; the `updateCompanyButton` Locator for "edit and submit" flows. | A future submit-button click that materialises a real company delete in the admin database; a future edit-flow that fills the form, clicks `updateCompanyButton`, and asserts the row updates in the listing. |
| Future status-filter / search-flow validation specs | A future `statusFilter` Locator for "filter by active/inactive" assertions; a future `searchInput` Locator for "search by name or domain" assertions. | A future filter-flow that selects `active` / `inactive` from the status filter and asserts the listing updates; a future search-flow that fills the search input and asserts the listing filters. |
| Admin companies production-source components (the production source for the DOM contract) | The exact `<button>` shape with the `Add Company` accessible name; the `.fixed.inset-0.z-50` Tailwind-overlay primitive on the form modal and the delete-confirmation modal; the `Create Company` / `Update Company` accessible names on the per-mode submit buttons; the `Cancel` accessible name on the modal cancel button; the `Delete Company` text content on the delete-confirmation modal title; the `Delete` accessible name on the confirm-delete button. | Mounts the form modal in the DOM only after the user clicks `Add Company` or a per-row edit trigger; emits the form-mode (`Create Company` vs `Update Company` submit-button label) based on whether the form is opened via the add-button or via a per-row edit trigger; mounts the delete-confirmation modal in the DOM only after the user clicks a per-row delete trigger. |
| [`base-page-object.md`](base-page-object.md) | The inheritance root the class extends; the `page` field, the `header` / `footer` / `navLinks` Locators, and the `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` methods. | — |
| [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md) | The "first per-source-file reference for any file under `apps/web-e2e/page-objects/admin/`" template this doc mirrors. | — |
| [`admin-clients-page-object.md`](admin-clients-page-object.md) | The "second per-source-file reference for any file under `apps/web-e2e/page-objects/admin/`" template this doc mirrors and the precedent for the `.fixed.inset-0.z-50` form-modal selector + a separate named-class delete-confirmation modal. | — |
| [`admin-collections-page-object.md`](admin-collections-page-object.md) | The "third per-source-file reference for any file under `apps/web-e2e/page-objects/admin/`" template this doc mirrors and the precedent for the named-row helper API + per-form fill helper conventions. | — |
| [`admin-comments-page-object.md`](admin-comments-page-object.md) | The "fourth per-source-file reference for any file under `apps/web-e2e/page-objects/admin/`" template this doc mirrors and the precedent for the `[role="dialog"]` HeroUI Modal-based delete-confirmation modal posture. | — |
| [`e2e-tsconfig.md`](e2e-tsconfig.md) | The `include: ["./**/*.ts"]` glob picks up this file. | — |
| [`playwright-config.md`](playwright-config.md) | Resolves the relative `/admin/companies` path the consuming spec navigates to via `baseURL`; supplies the authenticated admin storage state via the `adminPage` fixture. | — |

### Read / write surface — failure modes

| Drift | Surfaces as |
| --- | --- |
| Production-source rename of the "Add Company" button accessible name (e.g. to `New Company` or `+ Add`) | The `addCompanyButton` Locator fails to find the button; every modal-mount flow times out. The driver must update the regex to match the new name. |
| Production-source switch from the `.fixed.inset-0.z-50` Tailwind-overlay primitive to a `[role="dialog"]` HeroUI Modal | The `companyFormModal` and `deleteConfirmModal` getters fail to find the modal; every modal-state assertion times out. The driver must switch the selector to `[role="dialog"]`. |
| Production-source rename of the `Create Company` / `Update Company` submit-button accessible names | The per-mode submit-button getters fail to find the button; the per-mode assertions time out. The driver must update the regex to match the new name. |
| Production-source rename of the delete-confirmation modal title from `Delete Company` to `Remove Company` | The `deleteConfirmModal` getter's `/delete company/i` text filter fails because `delete` no longer matches. The driver must update the regex to `/delete|remove company/i` or to the new exact phrase. |
| Production-source rename of the confirm-delete button from `Delete` to `Remove` | The `confirmDeleteButton` getter's `/^delete$/i` regex fails. The driver must update the regex to `/^remove$/i` or to the new exact phrase. |
| Production-source addition of a second `<input>` before the company-name input in the form (e.g. an "Avatar URL" field) | The `companyNameInput` Locator's `.first()` pin resolves to the new input instead of the company-name input. The driver must switch to a placeholder / accessible-name pin once the production source emits one. |
| Empty-companies-listing seeding regression | The delete flow auto-`test.skip()`s via the per-row delete-trigger visibility precondition check. |
| Authentication regression that breaks the `adminPage` fixture | Every spec fails with a 302 redirect to the sign-in page or a 401 from the admin route guard. |
| Middleware change that disables JavaScript on `/admin/companies` | The form modal never mounts (the React state hook never fires on add-button click); every "modal opens" assertion times out. |
| `playwright.config.ts` `baseURL` change | The relative `/admin/companies` resolves to a different host; the route either 404s or redirects. |

## Change checklist

Any change to `companies.page.ts` must:

- Audit every spec under
  `apps/web-e2e/tests/admin/companies.spec.ts` for
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
  [`admin-collections-page-object.md`](admin-collections-page-object.md),
  and
  [`admin-comments-page-object.md`](admin-comments-page-object.md)
  for the admin-tree page-object template; the new shape
  should mirror the established posture (type-only
  import, runtime base import, `extends BasePage`, single
  `navigate()` shortcut, late-bound modal getters).
- Cross-check the production source for the admin
  companies-management page for the canonical
  `Add Company` button accessible name, the
  `.fixed.inset-0.z-50` Tailwind-overlay primitive on the
  form modal and the delete-confirmation modal, the
  `Create Company` / `Update Company` accessible names on
  the per-mode submit buttons, the `Delete Company`
  modal-title text, and the `Delete` accessible name on
  the confirm-delete button.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for the
  `include: ["./**/*.ts"]` glob coverage.
- Cross-check
  [`playwright-config.md`](playwright-config.md) for the
  `baseURL` posture and the `adminPage` fixture binding
  the consuming spec relies on.
- Cross-check [`fixtures-index.md`](fixtures-index.md) —
  today the driver is instantiated inline by the
  consuming spec via the `adminPage` fixture, but a
  future fixture-bound companies driver would surface
  here.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the
  companies spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Companies Management"`).
- Add a [`docs/log.md`](../log.md) entry describing the
  change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that
  affects test authoring.
- Reviewer pass.
