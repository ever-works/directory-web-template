---
id: client-submit-page-object
title: E2E Client Submit Page Object (apps/web-e2e/page-objects/client/submit.page.ts)
sidebar_label: E2E Client Submit Page Object
sidebar_position: 422
---

# E2E Client Submit Page Object — `apps/web-e2e/page-objects/client/submit.page.ts`

Per-source-file reference for the Playwright e2e suite's
**client item-submission three-step form** driver
paired with
[`apps/web-e2e/page-objects/client/submit.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/client/submit.page.ts).
Sits inside the `client/` page-object subtree, alongside
the five sibling client-surface page objects
(`dashboard.page.ts` — see
[`client-dashboard-page-object.md`](client-dashboard-page-object.md),
`profile.page.ts` — see
[`client-profile-page-object.md`](client-profile-page-object.md),
`settings.page.ts` — see
[`client-settings-page-object.md`](client-settings-page-object.md),
`submissions.page.ts` — see
[`client-submissions-page-object.md`](client-submissions-page-object.md),
`trash.page.ts`).

This page is the **fifth per-source-file reference**
the docs tree publishes for any file under
`apps/web-e2e/page-objects/client/` (continuing the
client-tree page-object docs rollout, **5-of-6**) and
the **first** client-tree driver in the rollout that
documents:

- A **multi-step wizard surface** with three documented
  steps (Basic Info → Payment / Plan Selection → Review
  & Submit) driven by **wizard-navigation buttons**
  (`nextStepButton`, `previousButton`) that compose
  with the **terminal submit button** (`submitButton`).
  Distinct from every prior client-tree driver (which
  are all single-page surfaces) and distinct from the
  admin item-form driver's modal-bound four-step
  wizard (which lives inside a `[role="dialog"]`
  overlay rather than a per-route page).
- A **`/submit` public-tree route boundary** —
  the only client-tree page object the docs rollout
  covers that targets a route OUTSIDE
  `/client/**`. The submit form lives at the bare
  `/submit` URL (locale-prefixed via the
  `[locale]/submit` segment), distinct from the
  dashboard / profile / settings / submissions /
  trash drivers all targeting `/client/**` routes.
  This reflects the production source's contract
  where `/submit` is the **first** post-signup CTA
  any authenticated user can reach without first
  visiting their dashboard.
- A **mixed selector-anchor posture** — the driver
  pins three different anchor styles in a single
  page object: (1) **id-selectors** (`#name`,
  `#description`, `#categories`) for the production-
  source-stable form fields; (2) **bare HTML element
  type-selectors** (`input[type="url"]`) for the
  LinkInput component which the production source
  does NOT bind to a stable id (the type-selector is
  the only stable hook today); and (3) **accessible-
  name regex-anchored buttons**
  (`getByRole('button', { name: /next step/i })`,
  `/previous/i`, `/submit product/i`) for the wizard
  navigation triggers. The mixed posture is the
  **first** client-tree driver to combine all three
  anchor styles in a single class.
- A **per-step `fillBasicInfo({ name, url, description })`
  composite helper** that fills three inputs in one
  call — symmetric with the admin item-form driver's
  `fillBasicInfo({...})` per-step helper but distinct
  in its parameter shape (the submit form's basic
  info bundles `name` + `url` + `description`,
  while the admin item-form's basic info bundles
  `id` + `name` + `slug` + `description` plus a
  separate `fillMediaLinks(...)` call for the URL).
- A **per-step `selectCategory(categoryName)` /
  `selectTag(tagName)` autocomplete commit helper
  pair** — the **first** client-tree driver to
  document combobox / tag-selection autocomplete
  helpers. The `selectCategory` helper opens the
  combobox via the `#categories` button-id-selector
  then clicks the named option via
  `getByRole('option', { name: categoryName }).first()`;
  the `selectTag` helper clicks the named tag button
  directly via
  `getByRole('button', { name: tagName, exact: true })`.
  Distinct from the admin item-form driver's
  `addCategory(name)` / `addTag(name)` helpers
  (which use placeholder-regex inputs for the
  Classification step's autocompletes).
- A **`selectFreePlan()` plan-selection helper** with
  an **OR-of-two-substring regex** matching either
  `Get Started Free` or `Select Free` button labels
  — the **first** client-tree driver to document a
  plan-selection mutator and the **first** to use a
  multi-substring alternation regex
  (`/get started free|select free/i`) for label-
  drift tolerance.

Where [`base-page-object.md`](base-page-object.md)
documents the **page-object inheritance root**, this
page documents the **suite's client item-submission
three-step form driver boundary** at `/submit`.

The file is the **only driver** in the suite for
the client item-submission surface today. The
`ClientSubmitPage` class **does extend `BasePage`**
— see "Why `ClientSubmitPage` extends `BasePage`"
below — so it inherits `header` / `footer` /
`navLinks` / `goto` / `gotoLocalized` /
`waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and adds
seven `readonly` Locator fields (`nameInput`,
`descriptionInput`, `linkUrlInput`,
`categoriesButton`, `nextStepButton`,
`previousButton`, `submitButton`), one navigation
method (`navigate()`), and four composite helpers
(`fillBasicInfo({...})`, `selectCategory(name)`,
`selectTag(name)`, `selectFreePlan()`) on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`client-submit` driver is consumed today by
[`apps/web-e2e/tests/client/submit-and-manage.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submit-and-manage.spec.ts),
which drives the full three-step submit flow as
part of the client submit-and-manage spec. The
flow:

- Navigate to `/submit` via `submitPage.navigate()`.
- Step 1 (Basic Info): fill via
  `fillBasicInfo({ name, url, description })`,
  optionally select a category by opening the
  `categoriesButton` combobox and clicking the first
  visible option, assert the `nextStepButton` is
  enabled, click it.
- Step 2 (Payment / Plan Selection): call
  `selectFreePlan()` to choose the free plan, assert
  the `nextStepButton` is enabled, click it.
- Step 3 (Review & Submit): assert the
  `submitButton` is enabled, click it. The flow
  then waits for the redirect to `/client/submissions`
  with a 30-second timeout.

The full flow runs in `serial` mode (via
`test.describe.configure({ mode: 'serial' })`)
because the subsequent flows in
`submit-and-manage.spec.ts` depend on the
just-submitted item being visible in the
submissions list.

A spec that drives the submit form inline (via
`await page.goto('/submit')` then
`await page.locator('#name').fill('...')`)
is a **drift** that this page object is the
canonical replacement for.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The client-tree drivers share the same `import type` discipline as the base class. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root. | Anchors the submit driver to the canonical page-object base. |
| `export class ClientSubmitPage extends BasePage` | named export | Single class declaration with `extends BasePage`. Adds seven per-page Locator fields, one navigation method, and four composite helpers on top. | The class is the canonical driver for the client item-submission surface today. |
| `readonly nameInput: Locator` | field | `page.locator('#name')` — the item-name input field, located via the `#name` id-selector. | The bare-`name` id is the production-source-stable hook today (HeroUI's `<Input name="name">` emits `id="name"`). |
| `readonly descriptionInput: Locator` | field | `page.locator('#description')` — the item-description textarea. | Symmetric with `nameInput`. |
| `readonly linkUrlInput: Locator` | field | `page.locator('input[type="url"]').first()` — the **first** `<input type="url">` element on the page. | The LinkInput component does NOT bind to a stable id today; the bare HTML `[type="url"]` element-selector is the next-best production-source-stable hook. The `.first()` pin defends against future per-link inputs. |
| `readonly categoriesButton: Locator` | field | `page.locator('#categories')` — the categories combobox trigger button. | The `#categories` id-selector pins to the production source's combobox-button id. The button opens a popover containing the per-category options (resolved via `selectCategory(name)` below). |
| `readonly nextStepButton: Locator` | field | `page.getByRole('button', { name: /next step/i })` — the wizard's "Next Step" trigger. | The substring `/next step/i` regex matches both `Next Step` and `Next step` capitalisation drift while remaining strict enough to disambiguate against any other navigation button. |
| `readonly previousButton: Locator` | field | `page.getByRole('button', { name: /previous/i })` — the wizard's "Previous" / back trigger. | Symmetric with `nextStepButton`. |
| `readonly submitButton: Locator` | field | `page.getByRole('button', { name: /submit product/i })` — the terminal "Submit Product" trigger on Step 3. | The substring regex matches both `Submit Product` and `Submit product`. |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds all seven per-page Locator fields. | Single constructor signature with the `super(page)` call. |
| `async navigate()` | method | `await this.goto('/submit')` — navigates to the submit form route via the inherited `goto()` from `BasePage`. | The single canonical entry-point for every consuming spec. |
| `async fillBasicInfo(data)` | method | Fills the URL, name, and description inputs in that order. The `data` parameter is typed `{ name: string; url: string; description: string }`. | The fill order (URL first, then name, then description) is load-bearing because the production source's LinkInput component fetches metadata from the URL on blur and pre-fills the name / description fields if they are empty. The driver's order ensures the URL fetch fires before the name / description fields are explicitly filled (so the explicit fill overrides any pre-filled metadata). |
| `async selectCategory(categoryName)` | method | Opens the `categoriesButton` combobox then clicks the named option via `getByRole('option', { name: categoryName }).first()`. | The `.first()` pin defends against any future duplicate-option rendering (e.g. a "Recently used" + "All" section split). |
| `async selectTag(tagName)` | method | Clicks the named tag button directly via `getByRole('button', { name: tagName, exact: true })`. | The `exact: true` option pins to the exact accessible name (rather than substring matching) because tag names are short and could collide with each other (e.g. `Free` vs `Free Trial`). |
| `async selectFreePlan()` | method | Clicks the **first** plan-selection button whose accessible name matches the OR-of-two-substring regex `/get started free\|select free/i`. | The OR-regex tolerates production-source label drift between `Get Started Free` and `Select Free`. The `.first()` pin defends against the production source's plan-card duplication (e.g. the same plan rendered in two pricing-grid layouts). |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the client submit form (/submit).
 * 3-step form: Basic Info → Payment (plan selection) → Review & Submit
 */
export class ClientSubmitPage extends BasePage {
	readonly nameInput: Locator;
	readonly descriptionInput: Locator;
	readonly linkUrlInput: Locator;
	readonly categoriesButton: Locator;
	readonly nextStepButton: Locator;
	readonly previousButton: Locator;
	readonly submitButton: Locator;

	constructor(page: Page) {
		super(page);
		this.nameInput = page.locator('#name');
		this.descriptionInput = page.locator('#description');
		// The main link URL input has type="url" inside the LinkInput component
		this.linkUrlInput = page.locator('input[type="url"]').first();
		this.categoriesButton = page.locator('#categories');
		this.nextStepButton = page.getByRole('button', { name: /next step/i });
		this.previousButton = page.getByRole('button', { name: /previous/i });
		this.submitButton = page.getByRole('button', { name: /submit product/i });
	}

	async navigate() {
		await this.goto('/submit');
	}

	/** Fill the basic info step fields. */
	async fillBasicInfo(data: { name: string; url: string; description: string }) {
		await this.linkUrlInput.fill(data.url);
		await this.nameInput.fill(data.name);
		await this.descriptionInput.fill(data.description);
	}

	/** Select a category from the dropdown by clicking the combobox then the option. */
	async selectCategory(categoryName: string) {
		await this.categoriesButton.click();
		await this.page.getByRole('option', { name: categoryName }).first().click();
	}

	/** Select a tag by clicking the tag button. */
	async selectTag(tagName: string) {
		await this.page.getByRole('button', { name: tagName, exact: true }).click();
	}

	/** Select the free plan on the payment step. */
	async selectFreePlan() {
		await this.page.getByRole('button', { name: /get started free|select free/i }).first().click();
	}
}
```

## Why `ClientSubmitPage` extends `BasePage`

Three load-bearing reasons the submit driver
inherits from
[`base-page-object.md`](base-page-object.md):

- **Page-route navigation via the inherited `goto`
  method.** The submit driver targets a navigable
  URL (`/submit`).
- **Global header / footer / nav-link chrome
  surfaced for free.** The public shell renders the
  same global chrome on `/submit` as on every other
  authenticated route.
- **Post-navigation `waitForPageReady` stabiliser.**
  Future flows that touch the multi-step wizard
  benefit from the inherited `waitForPageReady()`
  call's network-idle wait against the React Query
  hydration storm.

## Why `fillBasicInfo` fills URL first (and not name / description first)

Three reasons the helper fills the URL first, then
the name, then the description:

- **The LinkInput component fetches metadata on
  blur.** When the URL field is filled, the
  production source's LinkInput component fetches
  the target URL's OpenGraph metadata and pre-fills
  the name / description fields (if they are empty)
  with the fetched values. The fill order (URL
  first) ensures the OG fetch fires before the
  explicit name / description fills.
- **Subsequent fills override the OG-prefilled
  values.** After the LinkInput pre-fills name /
  description from the OG fetch, the explicit
  `nameInput.fill(...)` and
  `descriptionInput.fill(...)` calls override the
  pre-filled values with the test's data. A
  reversed fill order (name / description first,
  then URL) would result in the OG fetch
  overwriting the test's name / description.
- **The terminal Step 3 form-state validation
  expects all three fields filled.** The
  `submitButton` on Step 3 is disabled until all
  three fields have non-empty values. The fill
  order ensures the form's per-field validation
  resolves to a valid state before the
  `nextStepButton` enables.

## Why `linkUrlInput` uses a bare `input[type="url"]` element-selector

Three reasons the URL field getter uses the bare
HTML element-type-selector instead of an id-
selector or `getByRole('textbox')`:

- **The LinkInput component does NOT bind to a
  stable id.** The production source mounts the
  LinkInput component without an `id` prop, so the
  rendered `<input>` element has an auto-generated
  React-internal id that changes between renders.
  An id-selector would not resolve.
- **The `[type="url"]` attribute is the production-
  source-stable hook today.** The LinkInput
  component renders an `<input type="url">`
  element, and the URL type is invariant to the
  production source's per-component refactors
  (because the URL type triggers the browser's
  built-in URL validation).
- **`.first()` defends against multi-URL forms.** A
  future spec that adds a second URL field (e.g.
  for a "Demo URL" or "Repository URL" alongside
  the primary submission URL) would render
  multiple `<input type="url">` elements. The
  `.first()` pin guarantees the Locator resolves
  to the first URL input in DOM order — the
  primary submission URL is conventionally
  rendered first.

## Why `selectTag(tagName)` uses `exact: true` (and not a substring regex)

Three reasons the tag-selection helper uses
Playwright's `{ exact: true }` option instead of a
case-insensitive substring regex like
`new RegExp(tagName, 'i')`:

- **Tag names are short and may collide.** The
  production source's tag list includes short
  names like `Free`, `AI`, `App`. A substring
  match for `Free` would also match `Free Trial`,
  `Freemium`, or any other tag whose name contains
  the substring. The exact-match posture
  guarantees the helper resolves to the named tag
  exclusively.
- **The exact option preserves case-insensitivity
  by default.** Playwright's `{ exact: true }`
  option matches the accessible name with case-
  sensitive equality. The tag names are
  capitalised consistently in the production
  source, so case-sensitivity is the safer
  default.
- **A future tag rename would surface as a clear
  test failure.** If the production source
  renames a tag (e.g. `AI` → `Artificial
  Intelligence`), the helper's exact-match fails
  with a clear "Locator not found" error rather
  than silently matching a related tag.

## Why `selectFreePlan()` uses the OR-of-two-substring regex

Three reasons the plan-selection helper uses an
OR-regex (`/get started free|select free/i`)
instead of a single-substring pattern:

- **The production source emits two label
  variants.** The free plan's call-to-action
  button is rendered as either `Get Started Free`
  or `Select Free` depending on the production-
  source's per-environment plan-card configuration.
  The OR-regex matches either variant.
- **Capitalisation drift is tolerated by the `i`
  flag.** A future production-source rephrasing
  to lowercase `get started free` or mixed-case
  `Get started free` resolves correctly.
- **The `.first()` pin defends against pricing-grid
  duplication.** The production source may render
  the same plan in two layouts (e.g. a comparison
  table + a per-tier card grid). The `.first()`
  guarantees the Locator resolves to the first
  matching button in DOM order.

## What it does not contain

The submit driver intentionally omits a number of
helpers that future contributors might be tempted
to add:

- **No `getByTestId` selectors.** The driver uses
  accessibility-tree-canonical posture (`getByRole`)
  plus the id-selectors and the bare HTML element-
  type-selector exclusively.
- **No `submitFullFlow(data)` composite that drives
  all three steps.** The driver exposes per-step
  fill / select helpers, but no helper closes over
  the full Steps 1 → 2 → 3 flow because the
  consuming spec at
  [`submit-and-manage.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submit-and-manage.spec.ts)
  drives the per-step transitions inline (asserting
  on the `nextStepButton` enabled state between
  steps).
- **No paid-plan selection helpers
  (`selectProPlan()` / `selectEnterprisePlan()`).**
  The driver exposes `selectFreePlan()` only because
  the consuming spec drives the free-plan flow only
  (paid plans require a Stripe checkout the e2e
  suite cannot complete without a sandbox).
- **No `assertStep(step)` invariant assertion.** The
  driver does not assert on the current wizard step.
  Future specs that need per-step state assertions
  must derive them inline.
- **No `getCurrentStep(): Promise<number>`
  accessor.** The driver does not expose a step-
  state accessor.

These omissions keep the driver minimal — every
property and method on the class is consumed by at
least one spec today.

## Cross-references

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root.
- [`client-dashboard-page-object.md`](client-dashboard-page-object.md)
  — the **first** client-tree page-object reference.
- [`client-profile-page-object.md`](client-profile-page-object.md)
  — the **second** client-tree page-object reference.
- [`client-settings-page-object.md`](client-settings-page-object.md)
  — the **third** client-tree page-object reference.
- [`client-submissions-page-object.md`](client-submissions-page-object.md)
  — the **fourth** client-tree page-object reference.
- [`admin-item-form-page-object.md`](admin-item-form-page-object.md)
  — the **ninth** admin-tree page-object reference.
  Documents the modal-bound four-step admin item-
  form wizard that this driver's per-route three-
  step form is the public-facing client counterpart
  of.
- [`signin-page-object.md`](signin-page-object.md) —
  the auth-tree authentication driver. Documents
  the email / password / submit-button surface that
  the consuming spec uses to log in as a client
  before navigating to `/submit`.

The
[`apps/web-e2e/tests/client/submit-and-manage.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submit-and-manage.spec.ts)
spec file is the consumer of this driver today;
new specs that touch the client submit surface
must reach for `ClientSubmitPage` instead of
inlining `page.goto('/submit')` /
`page.locator('#name').fill('...')` /
`page.getByRole('button', { name: /next step/i })`
calls.

With this entry the **client-tree page-object docs
rollout reaches 5-of-6**; subsequent rollouts in
this subtree will turn to `trash.page.ts` to close
the rollout.
