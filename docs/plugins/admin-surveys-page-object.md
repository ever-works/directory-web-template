---
id: admin-surveys-page-object
title: E2E Admin Surveys Page Object (apps/web-e2e/page-objects/admin/surveys.page.ts)
sidebar_label: E2E Admin Surveys Page Object
sidebar_position: 415
---

# E2E Admin Surveys Page Object — `apps/web-e2e/page-objects/admin/surveys.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin surveys-management** driver paired with
[`apps/web-e2e/page-objects/admin/surveys.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/surveys.page.ts).
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
`tags.page.ts`).

This page is the **sixteenth per-source-file reference**
the docs tree publishes for any file under
`apps/web-e2e/page-objects/admin/` and the **first**
admin-tree driver in the rollout that documents:

- A **bare `page.locator('h1').first()` heading
  resolver** — distinct from every other admin-tree
  driver's `page.getByRole('heading').first()`
  posture. The surveys page emits its top-level
  heading as a literal `<h1>` element today (rather
  than relying on the role-tree resolution path),
  so the bare-tag-name selector is the
  production-source-stable hook. A future render that
  upgrades the heading to a `getByRole('heading')`-
  resolvable `<h2 role="heading" aria-level="1">`
  posture would still satisfy the bare `h1` selector
  via the implicit ARIA mapping. The `.first()` pin
  defends against a future render that emits
  multiple `<h1>` elements (e.g. a per-section
  heading + a page-level heading), in which case the
  page-level heading is the **first** in document
  order.
- A **literal-union-typed `selectFilter(filter)` flow
  helper** that takes a `'all' | 'global' | 'item'`
  literal-union argument and dispatches on a
  `Record<string, RegExp>` filterMap to a
  `getByRole('button', { name: filterMap[filter] }).first().click()`
  call. The filterMap pins three regexes — `/all surveys/i`
  for the All filter, `/global/i` for the Global
  filter, and `/items/i` for the Item filter. The
  literal-union typing is load-bearing — a regression
  that drops the union type in favour of `string`
  would let consumers pass an arbitrary filter name
  that resolves to `undefined` via the `filterMap`
  index, surfacing as a runtime
  `Cannot read properties of undefined (reading '…')`
  failure rather than a compile-time type error. The
  three regexes are case-insensitive (the trailing
  `/i` flag) so they survive a future render that
  changes the casing of the filter button labels.
- A **dual index-based per-row Locator-factory
  posture** (`getEditButton(index)` /
  `getDeleteButton(index)`) that returns
  `this.page.locator('button[title*="Edit"]').nth(index)`
  and `this.page.locator('button[title*="Delete"]').nth(index)`
  — the **first** title-attribute substring posture
  in the admin-tree page-object subtree. The
  `[title*="…"]` selector is a CSS substring-match
  on the `title` attribute (rather than the `name=`
  accessible-name match the role-based selectors
  use), and the `.nth(index)` chain pins to the
  zero-indexed Locator at the per-row position the
  caller supplies. The substring posture defends
  against a future render that prefixes the title
  with a row identifier (e.g. `title="Edit survey 'Foo'"`).
- A **`getByRole('button', { name: /create survey/i }).first()`
  CTA-button resolver** that pins to the
  case-insensitive accessible-name regex match for
  the page's primary CTA. Distinct from the
  collections / item-form drivers' bare
  `getByRole('button', { name: /…/i })` posture
  (without the `.first()` chain) — the surveys page
  may emit a duplicate CTA in the empty-state
  illustration, so the `.first()` pin defends
  against the empty-state → list state rerender
  cycle.

Where [`base-page-object.md`](base-page-object.md)
documents the **page-object inheritance root**, this
page documents the **suite's admin surveys-management
driver boundary** at `/admin/surveys` — the smallest
possible page object that lets a spec drive the admin
surveys page end-to-end (navigate to `/admin/surveys`,
locate the page heading via the bare
`page.locator('h1').first()` posture, locate the
"Create Survey" CTA via the
`getByRole('button', { name: /create survey/i }).first()`
posture, switch between filter tabs via the typed
`selectFilter('all' | 'global' | 'item')` flow helper,
and resolve per-row edit / delete buttons by index via
the dual index-based per-row Locator-factory posture).

The file is the **only driver** in the suite for the
admin surveys-management surface today. The
`AdminSurveysPage` class **does extend `BasePage`** —
see "Why `AdminSurveysPage` extends `BasePage`"
below — so it inherits `header` / `footer` /
`navLinks` / `goto` / `gotoLocalized` /
`waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and only
adds two per-page `readonly` Locator fields
(`heading`, `createSurveyButton`), two methods
(`navigate()`, `selectFilter(filter)`), and two
per-row Locator-factory methods (`getEditButton(index)`,
`getDeleteButton(index)`) on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-surveys` driver is consumed today by
[`apps/web-e2e/tests/admin/surveys.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/surveys.spec.ts),
which covers four flows over the admin surveys
management surface:

- **Admin can access surveys management page** —
  a baseline navigation + visibility assertion against
  the per-page `heading` Locator after a `navigate()` /
  `waitForPageReady()` two-call.
- **Surveys page shows create survey button** —
  a CTA-visibility assertion that branches on whether
  the `createSurveyButton` is rendered (the surveys
  feature may be flag-disabled at the
  `feature-flags.config.ts` level). When the CTA is
  not rendered, the spec falls back to a
  warning-banner visibility assertion against the
  `/surveys.*disabled|enable.*surveys/i` regex
  match. When the CTA is rendered, the spec asserts
  the CTA is visible directly.
- **Filter buttons switch between All, Global, and
  Item surveys** — a three-step filter-switch flow
  that calls `selectFilter('global')`, then
  `selectFilter('item')`, then `selectFilter('all')`,
  with a 1-second `waitForTimeout(1_000)` between
  each call to wait for the per-filter rerender.
- **Survey list shows edit and delete actions** —
  a per-row visibility assertion that branches on
  whether any surveys exist. When no surveys exist
  (the `getEditButton(0)` Locator is not visible),
  the spec is `test.skip(true, …)`-ed. Otherwise the
  spec asserts both the edit and delete buttons at
  index 0 are visible.

A spec that drives the admin surveys surface inline
(via `await page.goto('/admin/surveys')` then
`await page.locator('h1').first().isVisible()` or
`await page.getByRole('button', { name: /create survey/i }).first().click()`
or
`await page.locator('button[title*="Edit"]').nth(0).click()`)
is a **drift** that this page object is the canonical
replacement for; new specs that touch the admin
surveys management surface must reach for
`AdminSurveysPage` instead.

## At a glance

| Element                                          | Type           | What it is                                                                                                                                                                                                                                                                             | Why it matters                                                                                                                                                                                                                         |
| ------------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`                  | typed import   | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                                                | The admin-tree drivers share the same `import type` discipline as the base class.                                                                                                                                                      |
| `import { BasePage } from '../base.page'`        | runtime import | Runtime import of the inheritance root.                                                                                                                                                                                                                                                | Anchors the surveys driver to the canonical page-object base.                                                                                                                                                                          |
| `export class AdminSurveysPage extends BasePage` | named export   | Single class declaration with `extends BasePage`. Adds two per-page `readonly` Locator fields, two methods, and two per-row Locator-factory methods on top.                                                                                                                            | The class is the canonical driver for the admin surveys-management surface today.                                                                                                                                                      |
| `readonly heading: Locator`                      | field          | `page.locator('h1').first()` — the **first** `<h1>` element on the page, located via the bare CSS tag-name selector.                                                                                                                                                                   | Distinct from every other admin-tree driver's `getByRole('heading').first()` posture. The bare tag-name selector is the production-source-stable hook today; the surveys page emits its top-level heading as a literal `<h1>` element. |
| `readonly createSurveyButton: Locator`           | field          | `page.getByRole('button', { name: /create survey/i }).first()` — the page's primary CTA, located via the case-insensitive accessible-name regex match with `.first()` defence against the empty-state illustration's duplicate CTA.                                                    | Pinning to the role + name combo is the production-source-stable hook today; the `.first()` chain defends against the empty-state → list state rerender cycle.                                                                         |
| `constructor(page: Page)`                        | constructor    | Stores the `page` via `super(page)` and pre-binds the two per-page Locator fields.                                                                                                                                                                                                     | Single constructor signature with the `super(page)` call.                                                                                                                                                                              |
| `async navigate()`                               | method         | `await this.goto('/admin/surveys')` — navigates to the admin surveys management route via the inherited `goto()` from `BasePage`.                                                                                                                                                      | The single canonical entry-point for every consuming spec.                                                                                                                                                                             |
| `async selectFilter(filter)`                     | method         | `await this.page.getByRole('button', { name: filterMap[filter] }).first().click()` — dispatches on a `Record<string, RegExp>` filterMap to click one of three filter buttons (All, Global, Items). The `filter` parameter is typed as the literal union `'all' \| 'global' \| 'item'`. | The literal-union typing is load-bearing — a regression that drops the union type in favour of `string` would let consumers pass an arbitrary filter name that resolves to `undefined` via the `filterMap` index.                      |
| `getEditButton(index)`                           | method         | `this.page.locator('button[title*="Edit"]').nth(index)` — the per-row edit button at the zero-indexed position the caller supplies, located via the CSS substring-match on the `title` attribute.                                                                                      | The substring posture defends against a future render that prefixes the title with a row identifier (e.g. `title="Edit survey 'Foo'"`).                                                                                                |
| `getDeleteButton(index)`                         | method         | `this.page.locator('button[title*="Delete"]').nth(index)` — the per-row delete button at the zero-indexed position the caller supplies, located via the CSS substring-match on the `title` attribute.                                                                                  | Symmetric with `getEditButton(index)` — same posture, different title substring.                                                                                                                                                       |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminSurveysPage extends BasePage {
	readonly heading: Locator;
	readonly createSurveyButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.locator('h1').first();
		this.createSurveyButton = page.getByRole('button', { name: /create survey/i }).first();
	}

	async navigate() {
		await this.goto('/admin/surveys');
	}

	/** Select a filter option: All, Global, or Items. */
	async selectFilter(filter: 'all' | 'global' | 'item') {
		const filterMap: Record<string, RegExp> = {
			all: /all surveys/i,
			global: /global/i,
			item: /items/i
		};
		await this.page.getByRole('button', { name: filterMap[filter] }).first().click();
	}

	/** Get survey edit button by survey title attribute. */
	getEditButton(index: number) {
		return this.page.locator('button[title*="Edit"]').nth(index);
	}

	/** Get survey delete button by index. */
	getDeleteButton(index: number) {
		return this.page.locator('button[title*="Delete"]').nth(index);
	}
}
```

## Why `AdminSurveysPage` extends `BasePage`

Three load-bearing reasons the admin-tree surveys
driver inherits from
[`base-page-object.md`](base-page-object.md):

- **Page-route navigation via the inherited `goto`
  method.** The surveys driver targets a navigable
  URL (`/admin/surveys`).
- **Global header / footer / nav-link chrome surfaced
  for free.** The admin shell renders the same global
  header / footer / nav-link chrome on
  `/admin/surveys` as on every other admin route.
  Future specs that need to assert on the chrome
  during a survey-management flow can reach for
  `surveysPage.header` / `surveysPage.footer` /
  `surveysPage.navLinks` without redefining them on
  the surveys driver.
- **Post-navigation `waitForPageReady` stabiliser.**
  Every survey-management flow that touches the page
  starts with
  `await surveysPage.navigate(); await surveysPage.waitForPageReady();`
  — the consuming spec at
  [`apps/web-e2e/tests/admin/surveys.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/surveys.spec.ts)
  uses this exact two-call shape in every flow.

## Why `heading` resolves via `page.locator('h1').first()` (not `getByRole('heading').first()`)

Three reasons the surveys driver pins the heading
Locator to the bare CSS `h1` tag-name selector
instead of the role-tree resolution path every other
admin-tree driver uses:

- **The surveys page emits its top-level heading as
  a literal `<h1>` element.** The production source
  at `apps/web/app/[locale]/admin/surveys/page.tsx`
  emits the page heading as a bare `<h1>` element
  (rather than wrapping it in a HeroUI `Card` /
  `CardHeader` / `Title` shell that emits a
  `role="heading"`-resolvable composite). The bare
  tag-name selector is the production-source-stable
  hook today.
- **The `.first()` pin defends against future
  multi-`<h1>` renders.** A future render that emits
  a per-section heading + a page-level heading
  (e.g. one `<h1>` for "Surveys" at the page level
  and one `<h1>` for "Active Surveys" at the section
  level) would surface as a strict-mode-correctness
  failure if the Locator did not pin to `.first()`.
  The page-level heading is the **first** in
  document order, so the `.first()` pin resolves
  unambiguously.
- **The bare `h1` selector survives a future
  role-promotion refactor.** A future render that
  upgrades the heading to a
  `getByRole('heading')`-resolvable
  `<h2 role="heading" aria-level="1">` posture
  would still satisfy the bare `h1` selector via
  the implicit ARIA mapping (the bare `h1` selector
  matches both `<h1>` and `<h2 role="heading" aria-level="1">`
  in some Playwright/CSS resolvers — verify with
  the Playwright codegen in case of refactor). The
  symmetric `getByRole('heading').first()` posture
  the other admin-tree drivers use would survive
  the same refactor by the same mechanism.

## Why `selectFilter(filter)` is typed with a literal union

Three reasons the `filter` parameter is typed as the
literal union `'all' | 'global' | 'item'` instead of
the bare `string` type:

- **Compile-time enforcement of the filterMap
  domain.** A regression that drops the union type
  in favour of `string` would let consumers pass an
  arbitrary filter name (e.g. `'pending'`,
  `'archived'`) that resolves to `undefined` via the
  `filterMap` index, surfacing as a runtime
  `Cannot read properties of undefined (reading '…')`
  failure rather than a compile-time type error.
- **The three regexes pin to the production source
  labels.** The filterMap pins three case-insensitive
  regexes — `/all surveys/i` for the All filter,
  `/global/i` for the Global filter, and `/items/i`
  for the Item filter. The trailing `/i` flag is
  load-bearing — a future render that changes the
  casing of the filter button labels (e.g.
  `'ALL SURVEYS'` instead of `'All Surveys'`) would
  still satisfy the case-insensitive match.
- **Symmetric with the items driver's typed
  status-filter dispatch.** The items driver also
  exposes a typed filter-switch helper (see
  [`admin-items-page-object.md`](admin-items-page-object.md));
  the surveys driver's literal-union typing follows
  the same convention. Future drivers that need a
  typed-filter-switch helper should reach for the
  same literal-union + `Record<string, RegExp>`
  filterMap dispatch posture.

## Why `getEditButton(index)` / `getDeleteButton(index)` use `button[title*="…"]` (not `getByRole('button', { name: /…/i })`)

Three reasons the per-row Locator-factory methods
use the CSS substring-match on the `title`
attribute instead of the role + name combo:

- **The per-row buttons are icon-only buttons with
  no visible text label.** The accessible name
  (which `getByRole('button', { name: /…/i })`
  matches against) for an icon-only button is
  derived from the `aria-label` attribute, which the
  surveys page does not emit today. The `title`
  attribute is the next-best production-source-stable
  hook (it surfaces as a tooltip on hover and as the
  fallback accessible name when no `aria-label` is
  present).
- **The substring-match defends against future row-
  identifier prefix refactors.** A future render
  that prefixes the title with a row identifier
  (e.g. `title="Edit survey 'Foo'"`) would still
  satisfy the substring-match on `*="Edit"` /
  `*="Delete"`. The exact-match selector
  `[title="Edit"]` would NOT survive the same
  refactor.
- **The `.nth(index)` pin is the per-row positional
  resolver.** The surveys list emits one edit button
  and one delete button per row (in document order
  matching the row order). The `.nth(index)` chain
  pins to the zero-indexed Locator at the per-row
  position the caller supplies. The convention is
  symmetric with the items / clients / sponsorships
  drivers' per-row positional resolution posture
  (which uses `getByRole('row').nth(index)` or
  similar).

## Why `createSurveyButton` chains `.first()` to the role + name combo

Three reasons the CTA-button Locator chains
`.first()` to the bare
`getByRole('button', { name: /create survey/i })`
posture:

- **The surveys page may emit a duplicate CTA in the
  empty-state illustration.** When the surveys list
  is empty, the page renders an empty-state
  illustration that may include a "Create Survey"
  CTA in addition to the page-header CTA. Without
  `.first()`, the Locator resolution would surface
  as a strict-mode-correctness failure when the
  empty state is rendered.
- **The page-header CTA is the **first** in document
  order.** When both CTAs are rendered (empty-state
    - page-header), the page-header CTA is the
      **first** in document order — so the `.first()`
      pin resolves unambiguously to the page-header
      CTA.
- **The `.first()` pin survives the empty-state →
  list state rerender cycle.** When a consuming
  spec creates the first survey via the
  `createSurveyButton.click()` call, the empty-state
  illustration is removed and the page transitions
  to the list state with only the page-header CTA
  rendered. The `.first()` pin resolves to the same
  CTA in both states (page-header CTA = first in
  document order in both cases).

## What it does not contain

The surveys driver intentionally omits a number of
helpers that future contributors might be tempted
to add:

- **No `getByTestId` selectors.** The driver uses
  accessibility-tree-canonical posture (`getByRole`)
  plus the bare CSS tag-name selector (for the
  heading) and the CSS title-attribute substring-
  match selector (for the per-row buttons)
  exclusively.
- **No `clickCreateSurvey()` flow helper.** The
  driver exposes the `createSurveyButton` Locator
  but no `clickCreateSurvey()` method. Future
  specs that drive the create-survey flow must
  compose the click + form-fill inline.
- **No `clickEditSurvey(index)` /
  `clickDeleteSurvey(index)` composite flow
  helpers.** The driver exposes the per-row
  Locator-factory methods (`getEditButton`,
  `getDeleteButton`) but no per-row click helpers.
  Future specs that drive per-row flows must
  compose the per-row click + per-modal fill inline.
- **No `assertSurveyPresent(name)` /
  `assertSurveyAbsent(name)` invariant
  assertions.** The driver does not bake test-time
  assertions into the page object.
- **No `waitForListReady()` post-load wait
  helper.** The surveys list emits its rows in a
  React Query-backed render that resolves
  asynchronously after `waitForPageReady()`. The
  consuming spec at
  [`surveys.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/surveys.spec.ts)
  uses an explicit `await adminPage.waitForTimeout(2_000)`
  after `waitForPageReady()` to wait for the list
  to render. A future contributor who replaces the
  `waitForTimeout` calls with a deterministic wait
  helper should add it to the page object (not
  inline in every spec).
- **No `surveyForm` / `surveyEditModal` modal
  Locators.** The surveys page emits a per-survey
  edit modal (HeroUI Modal) and a create-survey
  form (HeroUI Form), but the driver does not
  expose either today. Future specs that drive the
  create / edit flows must compose the modal-scope
  resolution inline.
- **No pagination helper
  (`clickPaginationPage(page)` / `nextPage()` /
  `prevPage()`).** The surveys page does emit
  pagination chrome when the list is long, but the
  driver does not expose it today.
- **No `selectFilter('archived')` / additional
  filter values.** The literal-union argument
  type pins the domain to the three filters the
  page emits today (`'all'`, `'global'`, `'item'`).
  Future contributors who add a fourth filter
  (e.g. `'archived'`, `'draft'`) must extend the
  literal-union type AND the `filterMap` dispatch
  in the same edit.

These omissions keep the driver minimal — every
property and method on the class is consumed by at
least one spec today.

## Cross-references

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root every page object in
  `apps/web-e2e/page-objects/admin/` extends.
- [`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md)
  — the **first** admin-tree page-object reference.
- [`admin-clients-page-object.md`](admin-clients-page-object.md)
  — the **second** admin-tree page-object reference.
- [`admin-collections-page-object.md`](admin-collections-page-object.md)
  — the **third** admin-tree page-object reference.
- [`admin-comments-page-object.md`](admin-comments-page-object.md)
  — the **fourth** admin-tree page-object reference.
- [`admin-companies-page-object.md`](admin-companies-page-object.md)
  — the **fifth** admin-tree page-object reference.
- [`admin-dashboard-page-object.md`](admin-dashboard-page-object.md)
  — the **sixth** admin-tree page-object reference.
- [`admin-featured-items-page-object.md`](admin-featured-items-page-object.md)
  — the **seventh** admin-tree page-object reference.
- [`admin-data-export-page-object.md`](admin-data-export-page-object.md)
  — the **eighth** admin-tree page-object reference.
- [`admin-item-form-page-object.md`](admin-item-form-page-object.md)
  — the **ninth** admin-tree page-object reference.
- [`admin-items-page-object.md`](admin-items-page-object.md)
  — the **tenth** admin-tree page-object reference.
- [`admin-notifications-page-object.md`](admin-notifications-page-object.md)
  — the **eleventh** admin-tree page-object reference.
- [`admin-reports-page-object.md`](admin-reports-page-object.md)
  — the **twelfth** admin-tree page-object reference.
- [`admin-roles-page-object.md`](admin-roles-page-object.md)
  — the **thirteenth** admin-tree page-object reference.
- [`admin-settings-page-object.md`](admin-settings-page-object.md)
  — the **fourteenth** admin-tree page-object reference.
- [`admin-sponsorships-page-object.md`](admin-sponsorships-page-object.md)
  — the **fifteenth** admin-tree page-object reference.

The
[`apps/web-e2e/tests/admin/surveys.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/surveys.spec.ts)
spec file is the single consumer of this driver
today; new specs that touch the admin surveys
management surface must reach for
`AdminSurveysPage` instead of inlining
`page.goto('/admin/surveys')` /
`page.locator('h1').first().isVisible()` /
`page.getByRole('button', { name: /create survey/i }).first().click()` /
`page.locator('button[title*="Edit"]').nth(0)` /
`page.locator('button[title*="Delete"]').nth(0)`
calls.
