---
id: admin-item-form-page-object
title: E2E Admin Item Form Page Object (apps/web-e2e/page-objects/admin/item-form.page.ts)
sidebar_label: E2E Admin Item Form Page Object
sidebar_position: 408
---

# E2E Admin Item Form Page Object — `apps/web-e2e/page-objects/admin/item-form.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin multi-step item creation / edit form modal**
driver paired with
[`apps/web-e2e/page-objects/admin/item-form.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/item-form.page.ts).
Sits inside the `admin/` page-object subtree alongside
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
`items.page.ts`, `notifications.page.ts`,
`reports.page.ts`, `roles.page.ts`, `settings.page.ts`,
`sponsorships.page.ts`, `surveys.page.ts`,
`tags.page.ts`).

This page is the **ninth per-source-file reference** the
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
plus a per-form fill helper, the fourth
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
id-selector toggle** plus a pair of search-input
helpers plus a `statsCards` Locator getter, and the
eighth
[`admin-data-export-page-object.md`](admin-data-export-page-object.md)
which extended the rollout with the **`/admin`
co-tenant widget posture** plus an exact-match
`^CSV$` / `^JSON$` format-button pair plus a
composite-or `progressBar` Locator. The item-form
driver continues the rollout of the remaining eight
admin-tree page-object docs (one per source file) and is
the **first** admin-tree driver in the rollout that
documents:

- A **standalone (no `BasePage` extension) modal
  driver** posture: the `AdminItemFormPage` class is the
  **first** admin-tree driver in the rollout that does
  **not** extend `BasePage`. The modal is composed into
  whichever admin route the test happens to be on
  (`/admin/items` is the conventional caller), so a
  `goto()` shortcut would be incorrect — the modal does
  not own a route. This posture is symmetric with the
  signin / discover / item-detail / map / public-pages
  drivers' standalone postures (see
  [`signin-page-object.md`](signin-page-object.md)),
  but unique among the admin-tree drivers in the rollout
  to date.
- A **multi-step wizard surface** with four documented
  steps (Basic Info, Media & Links, Classification,
  Review & Submit) driven by `goToNextStep()` /
  `goToPreviousStep()` mutator helpers and three submit
  buttons (`createButton`, `updateButton`,
  `cancelButton`). The **first** admin-tree driver in
  the rollout to document a `Next` / `Previous`
  navigation pair on a single modal — distinct from
  every prior admin-tree driver's single-step add-form
  posture (clients, collections, companies all open a
  single-page form modal with a single submit button).
- A **`[role="dialog"][aria-modal="true"]` accessibility-
  tree-canonical modal selector** scoped via
  `this.modal.locator(...)` for every per-step input
  field. The **first** admin-tree driver in the rollout
  to document the explicit `aria-modal="true"` selector
  pair (the prior admin-tree drivers either use the bare
  `[role="dialog"]` selector — comments — or use a
  positional `.fixed.inset-0.z-50` Tailwind-overlay
  selector — companies). The `aria-modal="true"`
  attribute is the production-source convention for
  HeroUI's `Modal` component when rendered with the
  `aria-modal` prop — it pins the selector to the
  **focus-trapping** modal variant, distinct from the
  inline-overlay variant.
- A **per-step id-selector input field** posture
  (`#id`, `#name`, `#slug`, `#description`, `#icon_url`,
  `#source_url`) for every step that emits HeroUI form
  inputs with a stable `id` attribute. The **first**
  admin-tree driver in the rollout to document a
  per-step id-selector input field set on top of the
  modal's `aria-modal="true"` accessibility-tree-canonical
  selector — distinct from every prior admin-tree
  driver's per-form `getByLabel(...)` or
  `getByPlaceholder(...)` posture.
- A **placeholder-regex input field** posture
  (`getByPlaceholder(/enter categories/i)` /
  `getByPlaceholder(/enter tags/i)`) for the
  Classification step's category / tag inputs — the
  **first** admin-tree driver in the rollout to document
  the placeholder-regex fallback for inputs that the
  production source does not bind to a stable `id`
  attribute. The case-insensitive regex tolerates the
  production-source rephrasing between `Enter
  categories` / `Enter tags` and any future locale-
  specific placeholder rephrase.
- A **bare `select` HTML-element selector** for the
  status field (`this.modal.locator('select')`) — the
  **first** admin-tree driver in the rollout to document
  a positional HTML-element selector scoped to the modal
  rather than an accessibility-tree-canonical
  `getByRole('combobox')` posture. Required because the
  Review & Submit step's status field is the **only**
  `<select>` element inside the modal, so the positional
  selector resolves unambiguously.
- A **`[role="switch"]` accessibility-tree-canonical
  selector** for the featured toggle — the **first**
  admin-tree driver in the rollout to document the
  WAI-ARIA `switch` role (distinct from the
  `[role="checkbox"]` / `<input type="checkbox">` posture
  the data-export / featured-items drivers' toggles
  use). The `switch` role is the production-source
  convention for HeroUI's `Switch` component (a binary
  on/off toggle distinct from a checkbox's checked /
  unchecked / indeterminate trichotomy).
- A **per-step fill helper** API
  (`fillBasicInfo({...})` / `fillMediaLinks({...})` /
  `addCategory(name)` / `addTag(name)`) and a **per-step
  navigation helper** API (`goToNextStep()` /
  `goToPreviousStep()`) and a **per-submit helper** API
  (`submitCreate()` / `submitUpdate()` / `cancel()`) on
  top of the per-locator getters. The **first** admin-
  tree driver in the rollout to document a stratified
  helper API across three categories (fill / navigate /
  submit) over a single multi-step wizard.
- A **per-modal lifecycle helper** API
  (`waitForOpen()` / `waitForClosed()`) on top of the
  per-locator getters — the **first** admin-tree driver
  in the rollout to document a per-modal lifecycle
  surface that the consuming spec uses to gate the
  modal-bound flows (a `waitForOpen()` call after the
  caller clicks the trigger button on the parent route,
  a `waitForClosed()` call after the caller clicks
  `submitCreate()` / `submitUpdate()` / `cancel()`). The
  lifecycle helpers wrap the
  `this.modal.waitFor({ state: 'visible' })` /
  `this.modal.waitFor({ state: 'hidden' })` Playwright
  primitives in named, intent-revealing methods so the
  consuming spec does not have to restate the modal
  Locator at every gate.

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
boundary** at `/admin` and
[`admin-data-export-page-object.md`](admin-data-export-page-object.md)
documents the **suite's admin data-export widget driver
boundary** at `/admin` (composed into the dashboard
landing page) and
[`admin-featured-items-page-object.md`](admin-featured-items-page-object.md)
documents the **suite's admin featured-items-management
driver boundary** at `/admin/featured-items`, this page
documents the **suite's admin item-form modal driver
boundary** — a route-less, modal-bound driver composed
into whichever admin route opens the modal (the
conventional caller is `/admin/items` — see
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
and the upcoming `admin-items-page-object.md`). The
smallest possible page object that lets a spec drive
the multi-step item creation / edit modal end-to-end
(open a `modal` Locator pinned to the
`[role="dialog"][aria-modal="true"]` accessibility-tree-
canonical selector pair, locate the eleven step-bound
input fields by their per-step id-selectors and
placeholder regexes, locate the five navigation /
submit buttons by their case-insensitive accessible-name
regexes, and run the eight `async` helpers
— `waitForOpen()` / `waitForClosed()` / `fillBasicInfo()`
/ `fillMediaLinks()` / `addCategory()` / `addTag()`
/ `goToNextStep()` / `goToPreviousStep()` /
`submitCreate()` / `submitUpdate()` / `cancel()` —
that close over the modal-bound Locators and the
`enter`-keypress autocomplete-confirmation discipline
the Classification step's category / tag inputs
require).

The file is the **only driver** in the suite for the
admin item-form modal today. Unlike
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
[`admin-clients-page-object.md`](admin-clients-page-object.md),
[`admin-collections-page-object.md`](admin-collections-page-object.md),
[`admin-comments-page-object.md`](admin-comments-page-object.md),
[`admin-companies-page-object.md`](admin-companies-page-object.md),
[`admin-dashboard-page-object.md`](admin-dashboard-page-object.md),
[`admin-data-export-page-object.md`](admin-data-export-page-object.md),
and
[`admin-featured-items-page-object.md`](admin-featured-items-page-object.md),
the `AdminItemFormPage` class **does NOT extend
`BasePage`** — see "Why `AdminItemFormPage` does NOT
extend `BasePage`" below for the load-bearing reasons
— so it does **not** inherit `header` / `footer` /
`navLinks` / `goto` / `gotoLocalized` /
`waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md). The class
stores a single `page` field and pre-binds nineteen
per-modal `readonly` Locator fields on top, plus the
nine `async` helper methods.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-item-form` driver is consumed today by
[`apps/web-e2e/tests/admin/items-crud.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-crud.spec.ts),
which covers a full create-then-edit-then-delete flow
over the admin items management surface. The driver is
imported alongside
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)'s
`AdminItemsPage` so the consuming spec can drive the
parent route plus the modal in one flow:

- **Open the modal** — the spec navigates to
  `/admin/items`, clicks the parent route's "Add Item"
  trigger button, and gates on `formPage.waitForOpen()`
  before the first input fill.
- **Step 1 (Basic Info)** — the spec fills `nameInput` /
  `descriptionInput` (id and slug auto-generate from the
  name in the production source), gates on the
  `nextButton` becoming enabled (a Zod-driven validity
  gate), then advances via `goToNextStep()`.
- **Step 2 (Media & Links)** — the spec fills
  `sourceUrlInput`, gates on the same `nextButton`
  validity contract, then advances.
- **Step 3 (Classification)** — the spec calls
  `addCategory(name)` and `addTag(name)` to drive the
  Classification step's autocomplete inputs (each
  helper closes over `categoryInput.fill(name)` then
  `categoryInput.press('Enter')` to commit the value
  against the inline autocomplete dropdown's
  enter-keypress contract), then advances.
- **Step 4 (Review & Submit)** — the spec optionally
  flips the `featuredSwitch`, optionally selects a
  status from `statusSelect`, then submits via
  `submitCreate()`.
- **Modal teardown** — the spec gates on
  `formPage.waitForClosed()` after the submit, then
  asserts on the parent route's row-listing surface.
- **Edit flow** — the spec opens the modal a second
  time via the per-row edit affordance on the parent
  route, drives the same wizard with mutated values,
  and submits via `submitUpdate()` (the create / update
  buttons are pinned to distinct accessible-name regexes
  so a misrouted submit fires the wrong button regex
  and surfaces immediately).
- **Cancel flow** — the spec optionally exercises
  `cancel()` to verify the modal closes without
  persisting any changes.

A spec that drives the admin item-form modal inline
(via `await page.locator('[role="dialog"][aria-modal="true"]').waitFor({ state: 'visible' })`
or `await page.locator('#name').fill('…')` /
`await page.getByRole('button', { name: /create item/i }).click()`)
is a **drift** that this page object is the canonical
replacement for; new specs that touch the admin item-
form modal surface must reach for `AdminItemFormPage`
instead.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The admin-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). The type-only posture prevents the same three failure modes the dashboard driver documents: bundle-size cost, circular-import risk against the runner's `test` export, ambient drift between `import type` and the runner's runtime. |
| `export class AdminItemFormPage` | named export | Single class declaration **without** `extends BasePage`. Stores a single `page` field, nineteen per-modal `readonly` Locator fields, and exposes nine `async` helper methods on top. | See "Why `AdminItemFormPage` does NOT extend `BasePage`" below. The class is the canonical driver for the admin item-form modal surface today; every spec that drives the modal instantiates this class, never a bespoke inline driver. |
| `readonly page: Page` | field | The Playwright `Page` instance stored at construction. Every Locator on the class closes over `this.modal` (which closes over `this.page`). | The page field is required because the class does **not** inherit from `BasePage` — there is no inherited `this.page`. Every per-modal Locator pre-binds against the stored `page` instance. The single-field posture mirrors every standalone driver in the suite. |
| `readonly modal: Locator` | field | `page.locator('[role="dialog"][aria-modal="true"]')` — the modal-overlay Locator that scopes every per-input Locator on the class. | Pinned to the **explicit `aria-modal="true"`** WAI-ARIA selector pair (distinct from the bare `[role="dialog"]` selector the comments driver uses, distinct from the positional `.fixed.inset-0.z-50` selector the companies driver uses). The `aria-modal="true"` attribute is the production-source convention for HeroUI's `Modal` component when rendered with focus-trapping enabled — it pins the selector to the focus-trapping modal variant exclusively. |
| `readonly modalTitle: Locator` | field | `this.modal.locator('h2')` — the modal's title heading, located via the bare `h2` HTML-element selector scoped to the `modal` Locator. | The modal renders a single `<h2>` header element today (the production source emits `Add Item` / `Edit Item` per-step headings inside an `<h2>`). The bare `h2` selector is unambiguous inside the modal scope; outside that scope it would resolve too broadly. A future spec that needs to assert on the per-step heading text must read `await formPage.modalTitle.textContent()` against this Locator. |
| `readonly idInput: Locator` | field | `this.modal.locator('#id')` — Step 1 (Basic Info) ID input. | Pinned to the production-source-stable `id="id"` attribute on the HeroUI `Input` component. The id-selector is more stable than `getByLabel('ID')` (locale-bound) and more stable than `getByPlaceholder(...)` (the production source omits the placeholder for the ID input today). The `id` field is auto-generated from the slug today, so the helper API exposes it as an optional field. |
| `readonly nameInput: Locator` | field | `this.modal.locator('#name')` — Step 1 (Basic Info) name input. | Pinned to the production-source-stable `id="name"` attribute. The name field is the one **required** field on Step 1 (the `nextButton` validity gate is bound to it), so the consuming spec must always fill it before advancing. |
| `readonly slugInput: Locator` | field | `this.modal.locator('#slug')` — Step 1 (Basic Info) slug input. | Pinned to the production-source-stable `id="slug"` attribute. The slug auto-generates from the name today; the helper API exposes the slug as an optional override field for specs that need to assert the auto-generation discipline. |
| `readonly descriptionInput: Locator` | field | `this.modal.locator('#description')` — Step 1 (Basic Info) description input. | Pinned to the production-source-stable `id="description"` attribute. The description field is the second **required** field on Step 1 — the `nextButton` validity gate is bound to both the name and the description (a Zod-driven `min(1)` per field). |
| `readonly iconUrlInput: Locator` | field | `this.modal.locator('#icon_url')` — Step 2 (Media & Links) icon-URL input. | Pinned to the production-source-stable `id="icon_url"` attribute. Optional on Step 2 (the source-URL field is the only required field on the step). |
| `readonly sourceUrlInput: Locator` | field | `this.modal.locator('#source_url')` — Step 2 (Media & Links) source-URL input. | Pinned to the production-source-stable `id="source_url"` attribute. Required on Step 2 — the `nextButton` validity gate is bound to it (a Zod-driven `url()` validator). |
| `readonly categoryInput: Locator` | field | `this.modal.getByPlaceholder(/enter categories/i)` — Step 3 (Classification) category autocomplete input. | The Classification step's inputs do **not** emit a stable `id` attribute (the HeroUI `Autocomplete` component renders a generated id today). The `getByPlaceholder(/enter categories/i)` regex pins to the production-source-stable placeholder text on the input. The case-insensitive `/i` flag tolerates the production-source rephrasing between `Enter categories` / `enter categories` and any future locale-bound rephrase. The `addCategory(name)` helper closes over `fill(name)` then `press('Enter')` to commit the value against the autocomplete dropdown's enter-keypress contract. |
| `readonly tagInput: Locator` | field | `this.modal.getByPlaceholder(/enter tags/i)` — Step 3 (Classification) tag autocomplete input. | Symmetric with `categoryInput`. The `addTag(name)` helper closes over the same `fill(name)` then `press('Enter')` discipline. |
| `readonly statusSelect: Locator` | field | `this.modal.locator('select')` — Last Step (Review & Submit) status `<select>` element. | Pinned to the bare `select` HTML-element selector scoped to the modal — the **only** native `<select>` element inside the modal today, so the selector resolves unambiguously. A future regression that adds a second `<select>` inside the modal (e.g. a per-locale variant picker) must update this Locator to a per-status-name id-selector or a `getByRole('combobox', { name: /status/i })` posture. |
| `readonly featuredSwitch: Locator` | field | `this.modal.locator('[role="switch"]')` — Last Step (Review & Submit) featured-toggle switch. | Pinned to the WAI-ARIA `switch` role — the production-source convention for HeroUI's `Switch` component (a binary on/off toggle with a sliding-thumb visual). Distinct from the `[role="checkbox"]` posture the data-export / featured-items drivers' toggles use because the HeroUI `Switch` is **not** a checkbox — it has no indeterminate state. The selector resolves unambiguously inside the modal scope (the modal renders a single switch today). |
| `readonly cancelButton: Locator` | field | `this.modal.getByRole('button', { name: /cancel/i })` — modal close trigger. | Pinned to the case-insensitive `/cancel/i` substring regex on the WAI-ARIA `button` role. Symmetric across every step (the `Cancel` button is rendered in the modal footer at every step). |
| `readonly previousButton: Locator` | field | `this.modal.getByRole('button', { name: /previous/i })` — multi-step wizard back-navigation trigger. | Hidden on Step 1 (the wizard has no prior step), visible on Steps 2–4. The `goToPreviousStep()` helper closes over `previousButton.click()`. |
| `readonly nextButton: Locator` | field | `this.modal.getByRole('button', { name: /next/i })` — multi-step wizard forward-navigation trigger. | Visible on Steps 1–3 (the Last Step replaces the `Next` button with the `Create Item` / `Update Item` submit button). The `nextButton` is **disabled** when the current step's validity gate fails — the consuming spec must `await expect(formPage.nextButton).toBeEnabled()` before calling `goToNextStep()`. |
| `readonly createButton: Locator` | field | `this.modal.getByRole('button', { name: /create item/i })` — Last Step submit trigger when the modal is rendered in **create** mode. | Pinned to the case-insensitive `/create item/i` substring regex. Distinct from the `updateButton` regex so a misrouted submit fires the wrong button regex and surfaces immediately as a Locator-resolution failure. |
| `readonly updateButton: Locator` | field | `this.modal.getByRole('button', { name: /update item/i })` — Last Step submit trigger when the modal is rendered in **edit** mode. | Pinned to the case-insensitive `/update item/i` substring regex. Distinct from the `createButton` regex for the same reason. |
| `constructor(page: Page)` | constructor | Stores `page`, then pre-binds the `modal` Locator and every per-step input / button Locator in a single pass. | Single constructor signature **without** the `super(page)` call (because the class does not extend `BasePage`). Every spec instantiates `new AdminItemFormPage(adminPage)` against the authenticated admin fixture (no fixture-bound auto-instantiation today). |
| `async waitForOpen()` | method | `await this.modal.waitFor({ state: 'visible' })` — the modal-open lifecycle gate. | The conventional first call after the parent route's "Add Item" trigger fires. The wait is the only safe gate before the first input fill — the modal mounts asynchronously after the trigger click, and the first-step input fields do not exist in the DOM until the mount completes. |
| `async waitForClosed()` | method | `await this.modal.waitFor({ state: 'hidden' })` — the modal-close lifecycle gate. | The conventional last call after the submit / cancel triggers fire. The wait is the only safe gate before the parent route's row-listing assertion — the modal unmounts asynchronously after the submit, and the parent route's row count does not refresh until the unmount completes. |
| `async fillBasicInfo({...})` | method | Fills `idInput` (optional), `nameInput`, `slugInput` (optional), and `descriptionInput` from the supplied data object. | The `id` and `slug` fields auto-generate from the name in the production source; the helper exposes them as optional overrides for specs that need to assert the auto-generation discipline or override the auto-generated values. |
| `async fillMediaLinks({...})` | method | Fills `sourceUrlInput` (required) and `iconUrlInput` (optional) from the supplied data object. | The `iconUrl` field is optional on Step 2; the helper omits the fill when the caller does not supply it. |
| `async addCategory(name)` | method | `categoryInput.fill(name)` then `categoryInput.press('Enter')` — commits the value against the autocomplete dropdown. | The `Enter` keypress is required to commit the value because the autocomplete dropdown does not commit on blur today. A future regression that switches the autocomplete to commit-on-blur would silently break the helper — the consuming spec would observe a `0` rather than `1` category count after the helper. |
| `async addTag(name)` | method | Symmetric with `addCategory(name)`. | Same `Enter` keypress discipline. |
| `async goToNextStep()` | method | `nextButton.click()` — advances to the next step. | The consuming spec must gate on `await expect(formPage.nextButton).toBeEnabled()` before calling this helper. The helper does not gate internally because the validity contract varies per step (Step 1 requires name + description; Step 2 requires source URL; Step 3 has no required field). |
| `async goToPreviousStep()` | method | `previousButton.click()` — returns to the prior step. | The consuming spec must not call this helper on Step 1 (the `previousButton` is hidden); the helper does not gate internally because the per-step contract is the consumer's concern. |
| `async submitCreate()` | method | `createButton.click()` — submits the create-mode form. | The consuming spec must gate on `await formPage.waitForClosed()` after this call — the modal closes asynchronously after the submit, and the parent route's row count does not refresh until the unmount completes. |
| `async submitUpdate()` | method | `updateButton.click()` — submits the edit-mode form. | Symmetric with `submitCreate()`. |
| `async cancel()` | method | `cancelButton.click()` — closes the modal without persisting. | Symmetric with `submitCreate()` / `submitUpdate()`. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the admin multi-step item creation/edit form modal.
 */
export class AdminItemFormPage {
	readonly page: Page;
	readonly modal: Locator;
	readonly modalTitle: Locator;

	// Step 1: Basic Info
	readonly idInput: Locator;
	readonly nameInput: Locator;
	readonly slugInput: Locator;
	readonly descriptionInput: Locator;

	// Step 2: Media & Links
	readonly iconUrlInput: Locator;
	readonly sourceUrlInput: Locator;

	// Step 3: Classification
	readonly categoryInput: Locator;
	readonly tagInput: Locator;

	// Last Step: Review & Submit
	readonly statusSelect: Locator;
	readonly featuredSwitch: Locator;

	// Navigation
	readonly cancelButton: Locator;
	readonly previousButton: Locator;
	readonly nextButton: Locator;
	readonly createButton: Locator;
	readonly updateButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.modal = page.locator('[role="dialog"][aria-modal="true"]');
		this.modalTitle = this.modal.locator('h2');

		// Step 1: Basic Info
		this.idInput = this.modal.locator('#id');
		this.nameInput = this.modal.locator('#name');
		this.slugInput = this.modal.locator('#slug');
		this.descriptionInput = this.modal.locator('#description');

		// Step 2: Media & Links
		this.iconUrlInput = this.modal.locator('#icon_url');
		this.sourceUrlInput = this.modal.locator('#source_url');

		// Step 3: Classification — inputs have no id; use placeholder text for stable selection
		this.categoryInput = this.modal.getByPlaceholder(/enter categories/i);
		this.tagInput = this.modal.getByPlaceholder(/enter tags/i);

		// Last Step: Review
		this.statusSelect = this.modal.locator('select');
		this.featuredSwitch = this.modal.locator('[role="switch"]');

		// Navigation buttons
		this.cancelButton = this.modal.getByRole('button', { name: /cancel/i });
		this.previousButton = this.modal.getByRole('button', { name: /previous/i });
		this.nextButton = this.modal.getByRole('button', { name: /next/i });
		this.createButton = this.modal.getByRole('button', { name: /create item/i });
		this.updateButton = this.modal.getByRole('button', { name: /update item/i });
	}

	async waitForOpen() {
		await this.modal.waitFor({ state: 'visible' });
	}

	async waitForClosed() {
		await this.modal.waitFor({ state: 'hidden' });
	}

	async fillBasicInfo(data: { id?: string; name: string; slug?: string; description: string }) {
		if (data.id) {
			await this.idInput.fill(data.id);
		}
		await this.nameInput.fill(data.name);
		if (data.slug) {
			await this.slugInput.fill(data.slug);
		}
		await this.descriptionInput.fill(data.description);
	}

	async fillMediaLinks(data: { sourceUrl: string; iconUrl?: string }) {
		await this.sourceUrlInput.fill(data.sourceUrl);
		if (data.iconUrl) {
			await this.iconUrlInput.fill(data.iconUrl);
		}
	}

	async addCategory(name: string) {
		await this.categoryInput.fill(name);
		await this.categoryInput.press('Enter');
	}

	async addTag(name: string) {
		await this.tagInput.fill(name);
		await this.tagInput.press('Enter');
	}

	async goToNextStep() {
		await this.nextButton.click();
	}

	async goToPreviousStep() {
		await this.previousButton.click();
	}

	async submitCreate() {
		await this.createButton.click();
	}

	async submitUpdate() {
		await this.updateButton.click();
	}

	async cancel() {
		await this.cancelButton.click();
	}
}
```

## Why `AdminItemFormPage` does NOT extend `BasePage`

Three load-bearing reasons the admin-tree item-form
driver stands alone instead of inheriting from
[`base-page-object.md`](base-page-object.md):

- **The modal owns no route.** The admin item-form
  modal is composed into whichever admin route opens
  it — conventionally `/admin/items` (the parent route
  the bulk-actions / items drivers cover) but the modal
  is reusable from any admin route that wires the
  trigger button. A `goto()` shortcut would be
  incorrect because there is no canonical URL the
  driver could navigate to. The `BasePage`
  inheritance — designed around per-route navigation
  via `goto()` and `gotoLocalized()` — would surface a
  misleading affordance.
- **The global header / footer / nav-link chrome
  belongs to the parent route.** The modal renders
  **on top of** the parent route's chrome — the parent
  route's `header` / `footer` / `navLinks` Locators
  are still resolvable because the modal does not
  unmount the parent route. The consuming spec
  instantiates the parent route's driver (e.g.
  `AdminItemsPage`) for the chrome assertions and the
  modal driver for the form assertions; the two
  drivers compose. Inheriting `BasePage`'s chrome
  Locators on the modal driver would cause them to
  resolve to the same parent-route chrome — a
  duplication of intent that obscures which driver
  owns which Locator.
- **The post-navigation `waitForPageReady` stabiliser
  does not apply.** The modal mounts asynchronously
  after a button click, not after a page navigation.
  The lifecycle gate is
  `this.modal.waitFor({ state: 'visible' })` — wired
  through the dedicated `waitForOpen()` helper — not
  the network-idle wait that `BasePage.waitForPageReady`
  provides. Inheriting the network-idle wait would
  add a misleading affordance that does not gate the
  modal's mount lifecycle.

The standalone posture is symmetric with the signin /
discover / item-detail / map / public-pages drivers
(see [`signin-page-object.md`](signin-page-object.md))
— page objects that own a surface that does not bind
to a single canonical URL.

## Why the modal selector is `[role="dialog"][aria-modal="true"]` (and not `[role="dialog"]` / `.fixed.inset-0.z-50`)

Three reasons the modal selector pins to the explicit
`aria-modal="true"` WAI-ARIA pair:

- **Focus-trapping modal variant.** The `aria-modal="true"`
  attribute is the production-source convention for
  HeroUI's `Modal` component when rendered with
  focus-trapping enabled. The selector pins to the
  focus-trapping variant exclusively — distinct from
  the inline-overlay variant that omits the
  `aria-modal` attribute (a non-focus-trapping
  popover surface). A future regression that drops
  the focus-trapping behaviour would surface
  immediately as a Locator-resolution failure on every
  helper that closes over `this.modal`.
- **Multi-modal disambiguation.** The admin shell
  renders other `[role="dialog"]` overlays in the same
  DOM tree (the comments driver's HeroUI delete
  confirmation modal, the bulk-actions driver's
  confirmation modal, future per-row context menus).
  The bare `[role="dialog"]` selector would resolve
  ambiguously when the parent route renders both the
  item-form modal and a confirmation overlay in the
  same flow. The `aria-modal="true"` pair narrows the
  selector to the focus-trapping primary modal.
- **Accessibility-tree-canonical posture.** The
  `aria-modal="true"` selector is the WCAG-canonical
  way to identify a focus-trapping modal — every
  screen reader / accessibility audit tool also pins
  to this attribute. Distinct from the positional
  `.fixed.inset-0.z-50` Tailwind-utility selector the
  companies driver documents (a CSS-class-bound
  selector that breaks the moment the production
  source migrates to a different overlay primitive).
  The `[role="dialog"][aria-modal="true"]` posture is
  the cross-cutting convention every future admin-tree
  modal driver should mirror.

## Why per-step input fields are pinned to id-selectors (and not `getByLabel(...)` / `getByRole('textbox', { name })`)

Three reasons the per-step input field Locators pin to
the `#id` / `#name` / `#slug` / `#description` /
`#icon_url` / `#source_url` id-selectors instead of the
accessibility-tree-canonical `getByLabel(...)` /
`getByRole('textbox', { name })` postures:

- **Locale invariance.** The HeroUI `Input` component
  renders the field label via the `label` prop, which
  is locale-bound — the production source emits `Name`
  in `en-US`, `Nom` in `fr-FR`, `Nombre` in `es-ES`,
  etc. The `getByLabel('Name')` posture would lock
  the test suite to the `en-US` locale; the id-selector
  is locale-invariant by construction.
- **Production-source-stable contract.** The HeroUI
  `Input` component binds the `id` prop to the
  rendered `<input id="…">` attribute today; the id
  is the production-source convention for form-state
  binding via `react-hook-form`'s `register('name')`
  call. A regression that drops the id from any input
  would also break the form-state binding — so the
  id-selector posture is symmetric with the
  production-source contract.
- **Consistent posture across the wizard.** The
  Classification step's category / tag inputs do **not**
  emit a stable id (HeroUI's `Autocomplete` component
  generates a per-instance id), so those Locators fall
  back to the `getByPlaceholder(...)` regex posture.
  The id-selector posture for the four other input
  fields is the contractually consistent choice — the
  consuming spec reasons about "id-selector for fields
  with stable ids, placeholder-regex for fields
  without" rather than a per-field exception.

## Why the Classification step's inputs use `getByPlaceholder(/enter categories/i)` / `getByPlaceholder(/enter tags/i)`

Three reasons the Classification step's inputs pin to
the case-insensitive placeholder-regex posture:

- **No stable id on the input element.** HeroUI's
  `Autocomplete` component renders the underlying
  input with a generated `aria-controls` id that
  changes per mount — the id is **not** suitable as a
  Locator selector. The placeholder text is the only
  production-source-stable identifier on the input.
- **Case-insensitive `/i` flag preserves locale
  flexibility.** The `enter categories` / `enter tags`
  placeholder text is rendered today in `en-US`; the
  case-insensitive `/i` flag tolerates a future
  production-source change to `Enter Categories` /
  `Enter Tags` (title-case) without breaking the
  selector. A future locale-bound rephrase would still
  require a per-locale Locator — the case-insensitivity
  is a forward-compatibility hedge, not a locale-
  invariance guarantee.
- **Substring match tolerates suffix expansion.** A
  future production-source change that expands the
  placeholder to `Enter categories (comma-separated)`
  / `Enter tags (press Enter to add)` does not break
  the regex (the `/enter categories/i` substring is
  still resolvable inside the longer text). Distinct
  from the format-button driver's `^CSV$` exact-match
  posture — short tokens require exact-match anchors,
  long phrases tolerate substring match.

## Why `addCategory(name)` / `addTag(name)` close over `fill(name)` then `press('Enter')`

Three reasons the autocomplete-commit helpers close
over the two-call discipline:

- **The autocomplete dropdown does not commit on
  blur.** The HeroUI `Autocomplete` component requires
  an explicit `Enter` keypress to commit the typed
  value against the inline dropdown today. A future
  regression that switches the autocomplete to
  commit-on-blur would silently break the helper — the
  consuming spec would observe a `0` rather than `1`
  category count after the helper. The Enter-keypress
  discipline is the production-source contract the
  helper pins.
- **The two-call discipline is composable.** The
  helper is a single `async` method that returns a
  resolved promise after both calls complete. The
  consuming spec composes multiple `addCategory(...)` /
  `addTag(...)` calls in sequence without restating
  the two-call discipline at every site. Distinct from
  the `fillBasicInfo({...})` / `fillMediaLinks({...})`
  helpers which take a data object and fill multiple
  inputs in one call — the autocomplete helpers are
  per-name because each commit is an independent
  dropdown round-trip.
- **The helper name reveals intent.** The
  `addCategory(name)` / `addTag(name)` helper names
  read like the user-facing affordance (the user
  types a category, presses Enter, the chip appears)
  — distinct from the per-input `fill(...)` helper
  names a naive driver might expose. The consuming
  spec reads the helper call site and immediately
  understands the user-facing flow.

## Why the modal lifecycle is exposed via `waitForOpen()` / `waitForClosed()` (and not inline `waitFor` calls)

Three reasons the lifecycle helpers wrap the
`this.modal.waitFor(...)` primitives in named methods:

- **Intent-revealing naming.** The
  `waitForOpen()` / `waitForClosed()` names read like
  the user-facing modal lifecycle (the modal opens,
  the modal closes) — distinct from the
  Playwright-primitive `waitFor({ state: 'visible' })`
  / `waitFor({ state: 'hidden' })` shape a naive
  driver would expose. The consuming spec reads the
  helper call site and immediately understands the
  modal is the gate.
- **Single source of truth for the modal selector.**
  The lifecycle helpers close over `this.modal` (the
  same Locator every input field on the class scopes
  through). A future selector change to
  `[role="dialog"][aria-modal="true"][data-testid="item-form-modal"]`
  must update the `modal` Locator in one place; the
  lifecycle helpers do not restate the selector.
- **Composable with the per-step navigation
  helpers.** The consuming spec composes
  `await formPage.waitForOpen()` after the parent
  route's trigger fires, then the per-step
  `fillBasicInfo({...})` / `goToNextStep()` calls,
  then `await formPage.waitForClosed()` after the
  `submitCreate()` call. The lifecycle helpers fit
  into the per-step helper chain without restating
  the modal Locator — distinct from a hypothetical
  `waitForModalOpen()` / `waitForModalClosed()` naming
  that would duplicate the `modal` prefix.

## Cross-references

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root every page object in
  `apps/web-e2e/page-objects/admin/` extends. The
  item-form driver is the **first** admin-tree driver
  in the rollout that does **not** extend the base —
  see "Why `AdminItemFormPage` does NOT extend
  `BasePage`" above.
- [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
  — the **first** admin-tree page-object reference and
  the rollout template. Documents the **bulk-actions
  toolbar surface** at `/admin/items` (the conventional
  parent route the item-form modal is composed into).
- [`admin-clients-page-object.md`](admin-clients-page-object.md)
  — the **second** admin-tree page-object reference.
  Documents the **multi-step add-form modal + nested
  delete-confirmation modal posture** at
  `/admin/clients`. Distinct from this driver's
  posture in that the clients add-form modal extends
  `BasePage` and has its own `goto()` shortcut to
  `/admin/clients`.
- [`admin-collections-page-object.md`](admin-collections-page-object.md)
  — the **third** admin-tree page-object reference.
  Documents the **named-row helper API + per-form fill
  helper posture** at `/admin/collections`. The
  per-form fill helper (`fillCollectionForm({...})`) is
  the precedent for the `fillBasicInfo({...})` /
  `fillMediaLinks({...})` per-step fill helpers this
  driver documents.
- [`admin-comments-page-object.md`](admin-comments-page-object.md)
  — the **fourth** admin-tree page-object reference.
  Documents the **HeroUI-Modal-based delete confirmation
  surface** at `/admin/comments` (a `[role="dialog"]`
  overlay). Distinct from this driver's
  `[role="dialog"][aria-modal="true"]` selector pair —
  the comments driver pins to the bare `[role="dialog"]`
  selector, this driver narrows to the focus-trapping
  modal variant.
- [`admin-companies-page-object.md`](admin-companies-page-object.md)
  — the **fifth** admin-tree page-object reference.
  Documents the **bare `.fixed.inset-0.z-50` Tailwind-
  overlay form modal posture** at `/admin/companies`.
  Distinct from this driver's accessibility-tree-
  canonical `[role="dialog"][aria-modal="true"]`
  posture.
- [`admin-dashboard-page-object.md`](admin-dashboard-page-object.md)
  — the **sixth** admin-tree page-object reference.
  Documents the **`getByRole('tablist')`-anchored
  multi-tab navigation surface** at `/admin`. Distinct
  from this driver's per-step wizard navigation
  surface — the dashboard tabs swap out the rendered
  tab panel; the item-form wizard advances through
  ordered steps with a forward / back navigation pair.
- [`admin-data-export-page-object.md`](admin-data-export-page-object.md)
  — the **eighth** admin-tree page-object reference.
  Documents the **`/admin` co-tenant widget posture**
  plus the exact-match `^CSV$` / `^JSON$` format-button
  pair. Distinct from this driver's modal posture in
  that the data-export widget is composed into a
  navigable URL (`/admin`); the item-form modal is
  composed into a button click on whichever admin
  route opens it.
- [`admin-featured-items-page-object.md`](admin-featured-items-page-object.md)
  — the **seventh** admin-tree page-object reference.
  Documents the **`#active-only` id-selector toggle**
  plus the search-input helper pair. The id-selector
  posture is the precedent for this driver's per-step
  input field id-selectors.
- [`signin-page-object.md`](signin-page-object.md) —
  the auth-tree authentication driver. The standalone
  (no `BasePage`) posture this driver uses is
  symmetric with the signin driver's standalone
  posture (a surface that does not bind to a single
  canonical URL).
- [`item-detail-page-object.md`](item-detail-page-object.md),
  [`discover-page-object.md`](discover-page-object.md),
  [`map-page-object.md`](map-page-object.md),
  [`public-pages-page-object.md`](public-pages-page-object.md)
  — public-tree page-object references that document
  the unauthenticated end of the suite. The
  item-detail / discover / map drivers' standalone
  postures are the precedents for this driver's
  standalone posture.

The
[`apps/web-e2e/tests/admin/items-crud.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-crud.spec.ts)
spec file is the single consumer of this driver today;
new specs that touch the admin item-form modal surface
must reach for `AdminItemFormPage` instead of inlining
`page.locator('[role="dialog"][aria-modal="true"]').waitFor({ state: 'visible' })`
or `page.locator('#name').fill('…')` /
`page.getByRole('button', { name: /create item/i }).click()`
calls.
