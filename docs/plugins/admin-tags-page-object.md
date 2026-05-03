---
id: admin-tags-page-object
title: E2E Admin Tags Page Object (apps/web-e2e/page-objects/admin/tags.page.ts)
sidebar_label: E2E Admin Tags Page Object
sidebar_position: 416
---

# E2E Admin Tags Page Object — `apps/web-e2e/page-objects/admin/tags.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin tags-management** driver paired with
[`apps/web-e2e/page-objects/admin/tags.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/tags.page.ts).
Sits inside the `admin/` page-object subtree, alongside
the fifteen sibling admin-surface page objects
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
`reports.page.ts` — see
[`admin-reports-page-object.md`](admin-reports-page-object.md),
`roles.page.ts` — see
[`admin-roles-page-object.md`](admin-roles-page-object.md),
`settings.page.ts` — see
[`admin-settings-page-object.md`](admin-settings-page-object.md),
`sponsorships.page.ts` — see
[`admin-sponsorships-page-object.md`](admin-sponsorships-page-object.md),
`surveys.page.ts` — see
[`admin-surveys-page-object.md`](admin-surveys-page-object.md)).

This page is the **seventeenth and final per-source-
file reference** the docs tree publishes for any file
under `apps/web-e2e/page-objects/admin/`, completing
the **admin-tree page-object docs rollout**
(17-of-17). With this page landed, every concrete
page-object source file under
`apps/web-e2e/page-objects/admin/` has a paired
per-source-file docs anchor that explains the
load-bearing reasons each Locator pins to its
current selector and the cross-references that any
new helper must respect.

The tags driver is the **first** admin-tree driver
in the rollout that documents:

- A **named-row-resolved CRUD helper trio**
  (`getTagByName(name)`, `editTag(name)`,
  `deleteTag(name)`) that composes the per-row
  resolver with the per-row action triggers — the
  most direct named-row-driven CRUD posture in the
  admin tree. Distinct from the items driver's
  `getItemByName(name)` resolver (which exposes the
  per-row Locator without action helpers because the
  consuming spec drives the actions inline) and
  distinct from the collections driver's
  `editCollection(name)` / `deleteCollection(name)`
  helpers (which use the same name-based pattern but
  resolve via `getCollectionByName(name)` walking a
  single parent up from the per-collection heading).
- A **`<div>`-anchored named-row resolver with a
  `^${name}` start-anchor regex** —
  `this.page.locator('div').filter({ hasText: new RegExp(\`^${name}\`) }).first()`.
  The bare `div` element-selector is the broadest
  possible row-anchor (compared to the items
  driver's `<h4>` heading-anchor and the
  collections driver's named-cell heading-anchor).
  The `^${name}` start-anchor regex is the **first**
  admin-tree driver posture to document a regex-
  based hasText filter that pins to the row's
  text content STARTING with the tag name (rather
  than the substring posture every other admin-
  tree driver uses).
- A **`#tag-id` and `#tag-name` id-selector input
  field pair** — production-source-stable hooks for
  the create / edit form modal's two text inputs.
  The hyphenated kebab-case ids (`tag-id`,
  `tag-name`) follow the production source's HTML
  form convention rather than the camelCase
  `id`-attribute convention HeroUI's `Input`
  component emits by default.
- A **modal-scoped `[role="switch"]` status toggle
  getter** (`statusToggle`) that scopes the WAI-
  ARIA `switch` role through the modal-Locator
  getter via `this.tagFormModal.locator('[role="switch"]').first()`.
  Distinct from the settings driver's page-level
  `switches` multi-resolution Locator (which
  resolves every switch on the page); the tags
  driver scopes the resolution to the create / edit
  modal exclusively.
- A **`.fixed.inset-0.z-50` Tailwind-overlay form
  modal** posture (matching the companies driver's
  `companyFormModal` and roles driver's modal-
  triplet posture) — distinct from the items
  driver's `[role="dialog"][aria-modal="true"]`
  composite-attribute selector and the comments /
  reports drivers' bare `[role="dialog"]` posture.
- A **per-mode submit-button-pair posture**
  (`createTagButton` for the create-mode "Create
  Tag" trigger and `updateTagButton` for the edit-
  mode "Update Tag" trigger) — both modal-scoped
  via `this.tagFormModal.getByRole('button', { name: ... })`.
  The two distinct getters mirror the companies
  driver's `createCompanyButton` / `updateCompanyButton`
  pair; distinct from the items driver's single
  `submitButton` posture which folds both modes
  into one Locator.
- A **two-key `data: { id?: string; name: string }`
  optional-id form-fill helper** (`fillTagForm`)
  that conditionally fills the `id` field only if
  the consumer provides one. The optional `id`
  parameter is the **first** admin-tree driver
  helper to document a conditional-fill posture
  driven by an optional TypeScript object key —
  reflecting the production source's contract where
  the tag's stable id is assigned automatically
  from the name (in create mode) but can be
  overridden by the admin (in edit mode or via an
  explicit override).

Where [`base-page-object.md`](base-page-object.md)
documents the **page-object inheritance root**, this
page documents the **suite's admin tags-management
driver boundary** at `/admin/tags` — the smallest
possible page object that lets a spec drive the
admin tags page end-to-end.

The file is the **only driver** in the suite for
the admin tags-management surface today. The
`AdminTagsPage` class **does extend `BasePage`** —
see "Why `AdminTagsPage` extends `BasePage`" below
— so it inherits `header` / `footer` / `navLinks`
/ `goto` / `gotoLocalized` / `waitForPageReady` /
`getTitle` from
[`base-page-object.md`](base-page-object.md) and
adds two per-page `readonly` Locator fields
(`heading`, `addTagButton`), four methods
(`navigate()`, `getTagByName(name)`, `editTag(name)`,
`deleteTag(name)`), one composite helper
(`fillTagForm(data)`), and seven getters
(`tagFormModal`, `tagIdInput`, `tagNameInput`,
`statusToggle`, `cancelButton`, `createTagButton`,
`updateTagButton`) on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-tags` driver is consumed today by
[`apps/web-e2e/tests/admin/tags.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/tags.spec.ts),
which covers five flows over the admin tags
management surface:

- **Admin can access tags management page** — a
  baseline navigation + visibility assertion against
  the per-page `heading` and `addTagButton` Locators.
- **Admin can create a new tag** — a full create
  flow that clicks the `addTagButton`, asserts the
  `tagFormModal` is visible, fills the form via
  `fillTagForm({ id, name })` with timestamped
  unique values, clicks `createTagButton`, asserts
  the modal is hidden (10-second timeout for the
  React Query refetch storm), then asserts the new
  tag's name is visible in the list.
- **Admin can edit an existing tag** — a full edit
  flow that resolves the first tag from the list
  via `<h4>.first()`, hovers the row to reveal the
  inline action buttons, clicks the edit button
  (the first button with an SVG icon), asserts the
  modal is visible, clears the name input, fills it
  with `${originalName} Updated`, clicks
  `updateTagButton`, asserts the modal is hidden.
- **Admin can delete a tag using native confirm
  dialog** — a delete flow that resolves the first
  tag, sets up a `dialog` event handler to accept
  the native browser `confirm()` (the tags page
  uses the browser-native `confirm()` rather than
  the in-page `[role="dialog"]` overlay every other
  admin-tree driver uses), hovers the row, clicks
  the delete button (the last button with an SVG
  icon), asserts the tag is hidden from the list.
- **Tags page shows tag count in stats** — a
  stats-surface visibility assertion against the
  `.grid` Tailwind-utility selector with a 10-
  second timeout.

A spec that drives the admin tags surface inline
(via `await page.goto('/admin/tags')` then
`await page.getByRole('button', { name: /add tag/i }).first().click()`
or `await page.locator('#tag-name').fill('...')`)
is a **drift** that this page object is the
canonical replacement for; new specs that touch
the admin tags management surface must reach for
`AdminTagsPage` instead.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The admin-tree drivers share the same `import type` discipline as the base class. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root. | Anchors the tags driver to the canonical page-object base. |
| `export class AdminTagsPage extends BasePage` | named export | Single class declaration with `extends BasePage`. | The class is the canonical driver for the admin tags-management surface today. |
| `readonly heading: Locator` | field | `page.getByRole('heading').first()` — the **first** heading on the page. | Symmetric with every other admin-tree driver's heading getter. |
| `readonly addTagButton: Locator` | field | `page.getByRole('button', { name: /add tag/i }).first()` — the **first** "Add Tag" trigger button. | Substring `/add tag/i` regex is permissive enough to tolerate label drift between `Add Tag` and a future `Add a Tag` rephrasing. |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds the two per-page Locator fields. | Single constructor signature with the `super(page)` call. |
| `async navigate()` | method | `await this.goto('/admin/tags')` — navigates to the admin tags management route. | The single canonical entry-point for every consuming spec. |
| `getTagByName(name)` | method | `this.page.locator('div').filter({ hasText: new RegExp(\`^${name}\`) }).first()` — resolves a tag row by its name's start-anchor regex. | The bare `<div>` element-selector is the broadest row-anchor in the admin tree. The `^${name}` start-anchor regex pins to rows whose text content STARTS with the tag name (defending against partial-match false positives on rows that contain the tag name as a substring). |
| `async editTag(name)` | method | `await tagRow.getByRole('button', { name: /edit/i }).click()` — clicks the edit button on the named tag row. | The `/edit/i` substring regex matches both `Edit` and `edit` label drift while remaining strict enough to disambiguate against any other button on the row. |
| `async deleteTag(name)` | method | `await tagRow.getByRole('button', { name: /delete/i }).click()` — clicks the delete button on the named tag row. | Symmetric with `editTag(name)`. |
| `get tagFormModal()` | getter | `this.page.locator('.fixed.inset-0.z-50').first()` — the create / edit form modal overlay. | The `.fixed.inset-0.z-50` Tailwind-utility-stack selector matches the production source's modal-overlay primitive (symmetric with the companies / roles drivers' modal posture). |
| `get tagIdInput()` | getter | `this.page.locator('#tag-id')` — the tag id input. | The `#tag-id` id-selector is the production-source-stable hook today. The hyphenated kebab-case id (`tag-id`) follows the production source's HTML form convention rather than the camelCase `id`-attribute convention HeroUI's `Input` component emits by default. |
| `get tagNameInput()` | getter | `this.page.locator('#tag-name')` — the tag name input. | Symmetric with `tagIdInput`. |
| `get statusToggle()` | getter | `this.tagFormModal.locator('[role="switch"]').first()` — the modal-scoped status toggle. | Scopes the WAI-ARIA `switch` role through the modal-Locator getter. Distinct from the settings driver's page-level `switches` multi-resolution Locator. |
| `get cancelButton()` | getter | `this.tagFormModal.getByRole('button', { name: /cancel/i })` — the modal's cancel button. | Modal-scoped via the `tagFormModal` getter prefix. |
| `get createTagButton()` | getter | `this.tagFormModal.getByRole('button', { name: /create tag/i })` — the modal's create-mode submit button. | Modal-scoped, exact substring `/create tag/i` regex. |
| `get updateTagButton()` | getter | `this.tagFormModal.getByRole('button', { name: /update tag/i })` — the modal's edit-mode submit button. | Symmetric with `createTagButton`. |
| `async fillTagForm(data)` | method | Conditionally fills `tagIdInput` if `data.id` is provided; always fills `tagNameInput` with `data.name`. The `data` parameter is typed `{ id?: string; name: string }`. | The optional `id` parameter is the **first** admin-tree driver helper to document a conditional-fill posture driven by an optional TypeScript object key — reflecting the production source's contract where the tag's stable id is assigned automatically from the name (in create mode) but can be overridden by the admin (in edit mode or via an explicit override). |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminTagsPage extends BasePage {
	readonly heading: Locator;
	readonly addTagButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.addTagButton = page.getByRole('button', { name: /add tag/i }).first();
	}

	async navigate() {
		await this.goto('/admin/tags');
	}

	/** Get a tag row by its name text. */
	getTagByName(name: string): Locator {
		return this.page.locator('div').filter({ hasText: new RegExp(`^${name}`) }).first();
	}

	/** Click the edit button for a specific tag. */
	async editTag(name: string) {
		const tagRow = this.getTagByName(name);
		await tagRow.getByRole('button', { name: /edit/i }).click();
	}

	/** Click the delete button for a specific tag. */
	async deleteTag(name: string) {
		const tagRow = this.getTagByName(name);
		await tagRow.getByRole('button', { name: /delete/i }).click();
	}

	/** Get the tag form modal overlay. */
	get tagFormModal() {
		return this.page.locator('.fixed.inset-0.z-50').first();
	}

	/** Tag form ID input. */
	get tagIdInput() {
		return this.page.locator('#tag-id');
	}

	/** Tag form name input. */
	get tagNameInput() {
		return this.page.locator('#tag-name');
	}

	/** Tag form status toggle. */
	get statusToggle() {
		return this.tagFormModal.locator('[role="switch"]').first();
	}

	/** Cancel button in tag form. */
	get cancelButton() {
		return this.tagFormModal.getByRole('button', { name: /cancel/i });
	}

	/** Create tag button in form. */
	get createTagButton() {
		return this.tagFormModal.getByRole('button', { name: /create tag/i });
	}

	/** Update tag button in form. */
	get updateTagButton() {
		return this.tagFormModal.getByRole('button', { name: /update tag/i });
	}

	/** Fill the tag form with data. */
	async fillTagForm(data: { id?: string; name: string }) {
		if (data.id) {
			await this.tagIdInput.fill(data.id);
		}
		await this.tagNameInput.fill(data.name);
	}
}
```

## Why `AdminTagsPage` extends `BasePage`

Three load-bearing reasons the admin-tree tags
driver inherits from
[`base-page-object.md`](base-page-object.md):

- **Page-route navigation via the inherited `goto`
  method.** The tags driver targets a navigable URL
  (`/admin/tags`).
- **Global header / footer / nav-link chrome
  surfaced for free.** The admin shell renders the
  same global chrome on `/admin/tags` as on every
  other admin route.
- **Post-navigation `waitForPageReady` stabiliser.**
  Every tags flow that touches the form modal /
  per-row CRUD action / stats grid starts with
  `await tagsPage.navigate(); await tagsPage.waitForPageReady();`
  — the consuming spec at
  [`tags.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/tags.spec.ts)
  uses this exact two-call shape.

## Why `getTagByName(name)` uses a `^${name}` start-anchor regex (and not a substring posture)

Three reasons the named-row resolver uses a
start-anchored regex (`^${name}`) instead of the
substring-anchored posture every other admin-tree
driver's named-row resolver uses:

- **The tags page renders rows where the tag name
  is the first text content.** The production
  source mounts each tag row with the tag's name
  as the leading text inside a `<h4>` heading.
  The `^${name}` start-anchor regex pins to rows
  whose text content STARTS with the tag name —
  defending against partial-match false positives
  on rows that contain the tag name as a substring
  in a description / count / metadata block.
- **The bare `<div>` element-selector is the
  broadest row-anchor.** Distinct from the items
  driver's `<h4>` heading-anchor and the
  collections driver's named-cell heading-anchor,
  the tags driver pins the row to a bare `<div>`
  because the production source emits each tag row
  as a `<div class="group">` wrapper. The broadest
  selector + the start-anchor regex together
  resolve to exactly one row per tag name.
- **The runtime-built `RegExp(\`^${name}\`)` does
  not include the `i` flag.** Tag names are case-
  sensitive in the production source's storage
  layer; the helper preserves the case-sensitivity
  contract. A case-insensitive helper would
  silently match `Awesome` and `awesome` rows,
  defeating the per-row resolution invariant.

## Why `tagFormModal` uses a `.fixed.inset-0.z-50` Tailwind-overlay selector

Three reasons the form modal getter uses the
Tailwind-utility-stack selector instead of the
WAI-ARIA `[role="dialog"]` posture:

- **The production source emits a bare
  `<div class="fixed inset-0 z-50">` overlay.** The
  tags page's create / edit modal is rendered as a
  Tailwind-utility-stacked `<div>` element without
  a `role="dialog"` ARIA attribute. Pinning to the
  ARIA role would resolve to zero elements.
- **Symmetric with the companies / roles drivers'
  modal posture.** The
  [`admin-companies-page-object.md`](admin-companies-page-object.md)
  driver's `companyFormModal` getter and the
  [`admin-roles-page-object.md`](admin-roles-page-object.md)
  driver's modal-triplet posture both use the same
  `.fixed.inset-0.z-50` selector. The tags driver
  follows the same convention.
- **A future migration to `[role="dialog"]` would
  be a production-source change.** Adopting the
  ARIA role would make the modal screen-reader-
  discoverable, but it requires a per-component
  refactor.

## Why `tagIdInput` / `tagNameInput` use kebab-case id selectors

Three reasons the form input getters use the
kebab-case `#tag-id` / `#tag-name` id-selectors
instead of the camelCase HeroUI `Input` default:

- **The production source emits hyphenated id
  attributes.** The tags page's create / edit
  form mounts each input as `<input id="tag-id">`
  / `<input id="tag-name">` — the kebab-case
  follows the production source's HTML form
  convention (which uses hyphens to separate
  multi-word ids for screen-reader-friendly
  pronunciation).
- **HeroUI's `Input` component default is
  camelCase.** HeroUI's `<Input>` React component
  emits `id="tagId"` / `id="tagName"` by default
  (matching the camelCase `name` prop). The
  production source overrides the default by
  passing an explicit `id` prop with the
  hyphenated value. Pinning to the kebab-case
  matches the production-source override.
- **Stable across HeroUI version migrations.** A
  future HeroUI major-version migration that
  changes the camelCase default would not affect
  this driver because the production source's
  explicit `id` override is invariant to HeroUI's
  default.

## Why `statusToggle` is modal-scoped (and not page-level)

Three reasons the status toggle getter scopes the
`[role="switch"]` resolution through the
`tagFormModal` getter instead of pinning to the
page-level posture:

- **The status toggle only mounts inside the form
  modal.** The tags page does not emit a page-
  level status toggle (unlike the settings page).
  The toggle only appears inside the create / edit
  modal. Page-level scope would resolve to zero
  elements when the modal is closed.
- **Symmetric with the create / update / cancel
  button getters.** Every modal-bound getter on
  the driver scopes through `this.tagFormModal`.
  The status toggle follows the same convention.
- **Distinct from the settings driver's page-level
  `switches` Locator.** The settings driver
  exposes every switch on the page through a
  multi-resolution Locator. The tags driver
  exposes only the modal-bound status toggle —
  reflecting the per-modal scoping invariant.

## Why `fillTagForm(data)` uses an optional `id` parameter

Three reasons the form-fill helper uses a
`data: { id?: string; name: string }` optional-id
shape:

- **The production source assigns the id
  automatically in create mode.** When the admin
  creates a new tag, the tag's stable id is
  derived from the name via slug-normalisation.
  The form's id input is pre-filled with the
  derived value, but the admin can override it.
  The optional `id` parameter lets the helper drive
  both the auto-derived case (omit `id`, let the
  production source pre-fill it) and the explicit-
  override case (pass `id`, fill the input).
- **The conditional-fill posture is the safest
  default.** A future spec that drives the form
  with auto-derived ids would benefit from the
  helper's omit-id contract (no need to provide a
  redundant id parameter); a future spec that
  drives the form with explicit ids passes `id`
  alongside `name`. The conditional-fill posture
  serves both contracts without forcing the
  consuming spec to derive the id inline.
- **TypeScript narrowing surfaces the optional
  contract.** The `{ id?: string; name: string }`
  type signature documents the required vs
  optional fields at compile time. A consumer who
  passes `{ name: 'foo' }` gets type-checked
  successfully; a consumer who passes
  `{ id: 'foo' }` (without `name`) gets a
  TypeScript error.

## What it does not contain

The tags driver intentionally omits a number of
helpers that future contributors might be tempted
to add:

- **No `getByTestId` selectors.** The driver uses
  accessibility-tree-canonical posture (`getByRole`)
  plus the positional Tailwind-utility / id-
  selector exclusively.
- **No `createTag(data)` /
  `submitCreate(data)` / `submitEdit(data)`
  composite flow helpers.** The driver exposes
  the per-step Locators and the `fillTagForm`
  helper, but no helper closes over the full
  create / edit flow because the consuming spec
  drives the flow inline.
- **No `confirmDelete()` helper for the native
  `confirm()` dialog.** The driver exposes
  `deleteTag(name)` which clicks the delete
  trigger, but does NOT handle the native
  `confirm()` dialog. The consuming spec
  registers a `dialog` event handler explicitly
  via `adminPage.on('dialog', d => d.accept())`.
  A future helper that wraps the dialog handler
  could be added, but the per-spec posture is
  currently sufficient.
- **No `assertTagPresent(name)` /
  `assertTagAbsent(name)` invariant helpers.** The
  driver does not assert on the tag list's
  contents.
- **No `getTagsCount(): Promise<number>`
  accessor.** The driver does not expose a tag-
  count accessor.

These omissions keep the driver minimal — every
property and method on the class is consumed by
at least one spec today.

## Cross-references

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root.
- [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
  — the **first** admin-tree page-object reference.
- [`admin-clients-page-object.md`](admin-clients-page-object.md)
  — the **second** admin-tree page-object reference.
- [`admin-collections-page-object.md`](admin-collections-page-object.md)
  — the **third** admin-tree page-object reference.
  Documents the precedent named-row helper API
  (`getCollectionByName(name)`,
  `editCollection(name)`,
  `deleteCollection(name)`) that this driver's
  `getTagByName(name)` / `editTag(name)` /
  `deleteTag(name)` trio follows.
- [`admin-comments-page-object.md`](admin-comments-page-object.md)
  — the **fourth** admin-tree page-object reference.
- [`admin-companies-page-object.md`](admin-companies-page-object.md)
  — the **fifth** admin-tree page-object reference.
  Documents the precedent `.fixed.inset-0.z-50`
  Tailwind-overlay form modal posture.
- [`admin-dashboard-page-object.md`](admin-dashboard-page-object.md)
  — the **sixth** admin-tree page-object reference.
- [`admin-data-export-page-object.md`](admin-data-export-page-object.md)
  — the **eighth** admin-tree page-object reference.
- [`admin-featured-items-page-object.md`](admin-featured-items-page-object.md)
  — the **seventh** admin-tree page-object reference.
- [`admin-item-form-page-object.md`](admin-item-form-page-object.md)
  — the **ninth** admin-tree page-object reference.
- [`admin-items-page-object.md`](admin-items-page-object.md)
  — the **tenth** admin-tree page-object reference.
- [`admin-notifications-page-object.md`](admin-notifications-page-object.md)
  — the **eleventh** admin-tree page-object reference.
- [`admin-reports-page-object.md`](admin-reports-page-object.md)
  — the **twelfth** admin-tree page-object reference.
- [`admin-roles-page-object.md`](admin-roles-page-object.md)
  — the **thirteenth** admin-tree page-object
  reference. Documents the precedent multi-modal
  posture this driver's single-modal posture builds
  on.
- [`admin-settings-page-object.md`](admin-settings-page-object.md)
  — the **fourteenth** admin-tree page-object
  reference. Documents the page-level `switches`
  multi-resolution Locator that this driver's
  modal-scoped `statusToggle` getter intentionally
  diverges from.
- [`admin-sponsorships-page-object.md`](admin-sponsorships-page-object.md)
  — the **fifteenth** admin-tree page-object
  reference.
- [`admin-surveys-page-object.md`](admin-surveys-page-object.md)
  — the **sixteenth** admin-tree page-object
  reference (the prior to this final entry).

The
[`apps/web-e2e/tests/admin/tags.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/tags.spec.ts)
spec file is the single consumer of this driver
today; new specs that touch the admin tags
management surface must reach for `AdminTagsPage`
instead of inlining `page.goto('/admin/tags')` /
`page.locator('#tag-name')` /
`page.getByRole('button', { name: /create tag/i })`
calls.

With this page landed, the **admin-tree page-object
docs rollout is complete (17-of-17)**. Every
concrete page-object source file under
`apps/web-e2e/page-objects/admin/` now has a paired
per-source-file docs anchor. Subsequent rollouts
should turn to the `apps/web-e2e/page-objects/auth/`
and remaining `apps/web-e2e/page-objects/client/`
subtrees.
