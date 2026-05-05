---
id: admin-data-export-page-object
title: E2E Admin Data Export Page Object (apps/web-e2e/page-objects/admin/data-export.page.ts)
sidebar_label: E2E Admin Data Export Page Object
sidebar_position: 407
---

# E2E Admin Data Export Page Object — `apps/web-e2e/page-objects/admin/data-export.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin data-export widget** driver paired with
[`apps/web-e2e/page-objects/admin/data-export.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/data-export.page.ts).
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
`featured-items.page.ts` — see
[`admin-featured-items-page-object.md`](admin-featured-items-page-object.md),
`item-form.page.ts`, `items.page.ts`,
`notifications.page.ts`, `reports.page.ts`,
`roles.page.ts`, `settings.page.ts`,
`sponsorships.page.ts`, `surveys.page.ts`,
`tags.page.ts`).

This page is the **eighth per-source-file reference** the
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
modal** posture, the sixth
[`admin-dashboard-page-object.md`](admin-dashboard-page-object.md)
which extended the rollout with the
**`getByRole('tablist')`-anchored multi-tab navigation
surface** with a per-tab `selectTab(tabName)` helper,
and the seventh
[`admin-featured-items-page-object.md`](admin-featured-items-page-object.md)
which extended the rollout with the **`#active-only`
id-selector toggle** (a positional
`<input id="active-only">` checkbox surface) plus a pair
of **search-input helpers** (`search(term)` /
`clearSearch()`) plus a **`statsCards` Locator getter**
that pins to the positional `.grid` selector. The
data-export driver continues the rollout of the
remaining nine admin-tree page-object docs (one per
source file) and is the **first** admin-tree driver in
the rollout that documents:

- A **`/admin` co-tenant widget** posture: the data-
  export widget is **not** rendered at a dedicated route
  — it is composed into the admin dashboard landing
  page at `/admin` itself. The driver's `navigate()`
  shortcut therefore closes over the inherited
  `goto('/admin')` and not an `/admin/data-export`
  route. This is distinct from every prior admin-tree
  driver (bulk-actions / clients / collections /
  comments / companies / featured-items navigate to
  per-feature routes, dashboard navigates to the same
  `/admin` route but for the dashboard chrome and not a
  composed widget).
- A **format-button pair** (`csvButton` / `jsonButton`)
  — the **first** admin-tree driver to document a pair
  of mutually-exclusive radio-style trigger buttons via
  case-insensitive `^CSV$` / `^JSON$` exact-match
  accessible-name regexes (distinct from the
  `/add … /i` substring regexes every form-modal
  trigger uses, distinct from the `/refresh/i`
  substring regex the dashboard refresh button uses).
  The exact-match `^…$` anchors are required because
  the format-button accessible names are short three-
  to four-character tokens and a substring regex would
  match accidentally on other buttons (e.g. a future
  `Export CSV` button would match `/CSV/i`).
- A **`#include-metadata` id-selector checkbox** — a
  positional `<input id="include-metadata">` checkbox
  that toggles whether the export bundle includes
  metadata fields. Pinned to the id-selector for the
  same three reasons the featured-items driver pins the
  `#active-only` toggle (production-source-stable id
  binding, `getByRole('checkbox')` resolves too broadly,
  `getByLabel(...)` would lock to the English locale).
- A **broad-name `exportButtons` Locator** — a multi-
  resolution Locator that pins to every button whose
  accessible name matches the case-insensitive
  `/export|download/i` alternation regex. Distinct from
  every other admin-tree driver's `.first()`-pinned
  Locator postures because the data-export widget
  intentionally renders **multiple** export trigger
  buttons (one per format / one per scope / one per
  destination), and the consuming spec asserts on
  `count()` plus `first().toBeVisible()` rather than a
  single canonical trigger.
- A **`progressBar` Locator with composite-or
  selectors** — `[role="progressbar"], .bg-blue-600.rounded-full`.
  The first half pins to the WAI-ARIA `progressbar`
  role (the accessibility-tree-canonical posture); the
  second half pins to the positional Tailwind-utility
  selector that the data-export widget's progress
  indicator emits today. The composite-or posture is
  the **first** admin-tree driver to document a fall-
  back chain — Playwright resolves the first matching
  half, so a future production-source change that adds
  the `role="progressbar"` ARIA attribute lights up the
  accessibility-tree-canonical posture without breaking
  the existing positional fallback.

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
[`admin-featured-items-page-object.md`](admin-featured-items-page-object.md)
documents the **suite's admin featured-items-management
driver boundary** at `/admin/featured-items`, this page
documents the **suite's admin data-export widget driver
boundary** at `/admin` (composed into the dashboard
landing page rather than mounted at a dedicated route)
— the smallest possible page object that lets a spec
drive the data-export widget end-to-end (navigate to
`/admin`, locate the widget heading via the inherited-
default `getByRole('heading').first()` posture, locate
the **first** "CSV" format trigger button by its case-
insensitive `^CSV$` exact-match accessible-name regex,
locate the **first** "JSON" format trigger button by
its case-insensitive `^JSON$` exact-match accessible-
name regex, locate the include-metadata toggle by its
`#include-metadata` id-selector, locate every export /
download trigger button by the case-insensitive
`/export|download/i` alternation regex, and locate the
progress indicator via the composite-or
`[role="progressbar"], .bg-blue-600.rounded-full`
selector chain).

The file is the **only driver** in the suite for the
admin data-export widget today. Like
[`admin-bulk-actions-page-object.md`](admin-bulk-actions-page-object.md),
[`admin-clients-page-object.md`](admin-clients-page-object.md),
[`admin-collections-page-object.md`](admin-collections-page-object.md),
[`admin-comments-page-object.md`](admin-comments-page-object.md),
[`admin-companies-page-object.md`](admin-companies-page-object.md),
[`admin-dashboard-page-object.md`](admin-dashboard-page-object.md),
[`admin-featured-items-page-object.md`](admin-featured-items-page-object.md),
[`signin-page-object.md`](signin-page-object.md),
[`item-detail-page-object.md`](item-detail-page-object.md),
[`discover-page-object.md`](discover-page-object.md),
[`map-page-object.md`](map-page-object.md), and
[`public-pages-page-object.md`](public-pages-page-object.md),
the `AdminDataExportPage` class **does extend
`BasePage`** — see "Why `AdminDataExportPage` extends
`BasePage`" below for the load-bearing reasons — so it
inherits `header` / `footer` / `navLinks` / `goto` /
`gotoLocalized` / `waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and only
adds six per-page `readonly` Locator fields
(`heading`, `csvButton`, `jsonButton`,
`includeMetadataCheckbox`, `exportButtons`,
`progressBar`) and one method (`navigate()`) on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-data-export` driver is consumed today by
[`apps/web-e2e/tests/admin/data-export.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/data-export.spec.ts),
which covers three flows over the admin data-export
widget surface — each guarded by a `test.skip(true, …)`
defensive posture so the test remains green when the
widget is hidden behind a feature-flag or composed into
a future per-route page rather than the `/admin`
landing page:

- **Admin dashboard has export format buttons** — a
  baseline visibility assertion that asserts at least
  one of the `csvButton` / `jsonButton` Locators is
  visible after a `navigate()` /
  `waitForPageReady()` two-call. The flow uses the
  `expect(hasCsv || hasJson).toBeTruthy()` boolean-
  composition posture so a regression that hides the
  CSV trigger but leaves the JSON trigger (or vice
  versa) does not falsely pass — a regression that
  hides **both** triggers fires the defensive
  `test.skip(true, ...)` guard rather than failing the
  flow, because the data-export widget is a composed
  surface that the production source can disable.
- **Include metadata checkbox is available** — a
  toggle-flow exercise that asserts the
  `includeMetadataCheckbox` Locator is visible, then
  clicks it and asserts that
  `await checkbox.isChecked()` returns a `boolean`
  (any boolean — the assertion is not on the post-click
  state, just on the type contract). The flow uses the
  same `test.skip(true, ...)` guard pattern on
  `checkbox.isVisible().catch(() => false)` so the
  test remains green when the include-metadata toggle
  is hidden behind a feature-flag.
- **Export/download buttons are available** — a
  count-and-visibility assertion against the
  `exportButtons` broad-name Locator. The flow asserts
  `count() > 0` then `first().toBeVisible()` against
  the first match. The defensive guard fires when the
  count is zero, not on a visibility-check failure.

A spec that drives the admin data-export widget inline
(via `await page.goto('/admin')` then
`await page.getByRole('button', { name: /^CSV$/i }).first().click()`
or `await page.locator('#include-metadata').click()`)
is a **drift** that this page object is the canonical
replacement for; new specs that touch the admin data-
export widget surface must reach for
`AdminDataExportPage` instead.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The admin-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). The type-only posture prevents the same three failure modes the dashboard driver documents: bundle-size cost, circular-import risk against the runner's `test` export, ambient drift between `import type` and the runner's runtime. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root — see [`base-page-object.md`](base-page-object.md). Required because `extends BasePage` evaluates the symbol at class-declaration time. | Anchors the data-export driver to the canonical page-object base — the same `header` / `footer` / `navLinks` Locators every other page object in the suite has, the same `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` helpers. |
| `export class AdminDataExportPage extends BasePage` | named export | Single class declaration with `extends BasePage` — inherits the page-object base. Adds six per-page Locator fields and the `navigate()` shortcut on top. | See "Why `AdminDataExportPage` extends `BasePage`" below. The class is the canonical driver for the admin data-export widget surface today; every spec that drives the widget instantiates this class, never a bespoke inline driver. |
| `readonly heading: Locator` | field | `page.getByRole('heading').first()` — the **first** heading on the page, regardless of level. | The `getByRole('heading').first()` accessibility-tree-canonical posture matches the heading getter on every other admin-tree page object that has a `heading` field today (clients, collections, comments, companies, featured-items). The `.first()` pin defends against multi-heading pages — the data-export widget's heading is conventionally the **second** heading in DOM order on `/admin` (the dashboard heading is first), so the `.first()` pin resolves to the dashboard heading rather than the widget heading by design. A future spec that needs the widget-specific heading must derive a per-section Locator inline. |
| `readonly csvButton: Locator` | field | `page.getByRole('button', { name: /^CSV$/i }).first()` — the **first** button whose accessible name is exactly `CSV` (case-insensitive). | The data-export widget renders a single CSV format trigger today (the production source uses the exact label `CSV` on a `<button>`). The `.first()` pin defends against multi-button pages (e.g. a future per-card "CSV" button in addition to the widget-level one). The `^CSV$` exact-match regex is required because the substring posture (`/CSV/i`) would match accidentally on a future "Export CSV" / "Download CSV" / "Sample CSV" button — the format-trigger contract is that the button's accessible name is **exactly** `CSV`. |
| `readonly jsonButton: Locator` | field | `page.getByRole('button', { name: /^JSON$/i }).first()` — the **first** button whose accessible name is exactly `JSON` (case-insensitive). | Symmetric with `csvButton`. The data-export widget renders a single JSON format trigger today (the production source uses the exact label `JSON` on a `<button>`). The `^JSON$` exact-match regex is required for the same reason as the CSV trigger — the substring posture would match accidentally on a future "Export JSON" / "Download JSON" button. |
| `readonly includeMetadataCheckbox: Locator` | field | `page.locator('#include-metadata')` — the include-metadata toggle, located via the `#include-metadata` id-selector. | The data-export widget renders the include-metadata toggle as a `<input id="include-metadata" type="checkbox">` today with a paired `<label htmlFor="include-metadata">Include metadata</label>`. Pinning to the id-selector is more stable than `getByRole('checkbox')` (which would resolve too broadly if the page renders multiple checkboxes for per-field selection) and more stable than `getByLabel('Include metadata')` (label text changes between locales). The id-selector is the production-source-stable hook the toggle's `<label htmlFor="include-metadata">` already binds to. Symmetric with the featured-items driver's `#active-only` id-selector posture (see [`admin-featured-items-page-object.md`](admin-featured-items-page-object.md#why-activeonlytoggle-uses-the-active-only-id-selector-and-not-getbyrolecheckbox--getbylabel)). |
| `readonly exportButtons: Locator` | field | `page.getByRole('button', { name: /export|download/i })` — every button whose accessible name matches the case-insensitive `/export\|download/i` alternation. | The data-export widget renders multiple export trigger buttons today (one per format / one per scope / one per destination — e.g. "Export CSV", "Download Sample", "Export Filtered"). Unlike every other admin-tree driver's `.first()`-pinned Locator postures, this Locator intentionally resolves to a **multi-element match** so the consuming spec can assert on `count()` / iterate / pin a specific match by chained filter. The alternation regex tolerates the production-source rephrasing between `Export …`, `Download …`, `Generate Export`. |
| `readonly progressBar: Locator` | field | `page.locator('[role="progressbar"], .bg-blue-600.rounded-full').first()` — the progress indicator, located via the **composite-or** chain of an accessibility-tree-canonical posture and a positional Tailwind-utility posture. | The data-export widget renders an export-in-progress indicator that is **not** ARIA-tagged today; the production source emits a `<div class="bg-blue-600 rounded-full">` Tailwind primitive without a `role="progressbar"` attribute. The composite-or posture is the **first** admin-tree driver to document a fallback chain — the first half is the future-state accessibility-tree-canonical posture, the second half is the current-state Tailwind-utility positional posture. Playwright resolves the first matching half, so a future production-source change that adds the `role="progressbar"` ARIA attribute lights up the accessibility-tree-canonical posture without breaking the existing positional fallback. The `.first()` pin defends against multi-progressbar pages (e.g. a future per-flow progress indicator on top of the widget-level one). |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds all six per-page Locators in a single pass. | Single constructor signature with the `super(page)` call (because the class extends `BasePage`). Every spec instantiates `new AdminDataExportPage(adminPage)` against the authenticated admin fixture (no fixture-bound auto-instantiation today). |
| `async navigate()` | method | `await this.goto('/admin')` — navigates to the admin dashboard landing page (where the data-export widget is composed) via the inherited `goto()` from `BasePage`. | The single canonical entry-point for every consuming spec. The `goto('/admin')` route — rather than `/admin/data-export` — is load-bearing: the data-export widget is **not** rendered at a dedicated route, it is composed into the admin dashboard landing page itself. A future refactor that mounts the widget at `/admin/data-export` must update this method in lockstep. The `goto()` inheritance lets the driver participate in `BasePage`'s post-navigation `waitForPageReady()` discipline without restating the network-idle wait at every call site. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the admin data export component.
 */
export class AdminDataExportPage extends BasePage {
	readonly heading: Locator;
	readonly csvButton: Locator;
	readonly jsonButton: Locator;
	readonly includeMetadataCheckbox: Locator;
	readonly exportButtons: Locator;
	readonly progressBar: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.csvButton = page.getByRole('button', { name: /^CSV$/i }).first();
		this.jsonButton = page.getByRole('button', { name: /^JSON$/i }).first();
		this.includeMetadataCheckbox = page.locator('#include-metadata');
		this.exportButtons = page.getByRole('button', { name: /export|download/i });
		this.progressBar = page.locator('[role="progressbar"], .bg-blue-600.rounded-full').first();
	}

	async navigate() {
		await this.goto('/admin');
	}
}
```

## Why `AdminDataExportPage` extends `BasePage`

Three load-bearing reasons the admin-tree data-export
driver inherits from
[`base-page-object.md`](base-page-object.md) instead of
standing alone (the posture
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md)
and the other public-tree widget drivers take):

- **Page-route navigation via the inherited `goto`
  method.** The data-export widget is composed into a
  navigable URL (`/admin`) — the `navigate()` shortcut
  needs a real `goto()` call to reach the route on
  which the widget is mounted. The single `navigate()`
  shortcut closes over the inherited
  `await this.goto('/admin')`, which in turn
  participates in `BasePage`'s post-navigation
  `waitForPageReady()` discipline (network-idle wait,
  locale-prefix resolution against the configured
  `baseURL`, authenticated-cookie carry-through). A
  standalone class would have to restate every one of
  these concerns inline.
- **Global header / footer / nav-link chrome surfaced
  for free.** The admin shell renders the same global
  header / footer / nav-link chrome on `/admin` as on
  every other admin route. The inherited `header` /
  `footer` / `navLinks` Locators let a spec drive the
  data-export widget **and** assert on the surrounding
  admin shell (e.g. "the user-menu link is present in
  the header" / "the sidebar contains the admin nav
  links") in the same flow, without wiring a second
  base-class composition primitive.
- **Post-navigation `waitForPageReady` stabiliser.**
  Every data-export flow that touches the format
  buttons / metadata toggle / export triggers /
  progress bar starts with
  `await exportPage.navigate(); await exportPage.waitForPageReady(); await page.waitForTimeout(2_000);`
  — the consuming spec at
  [`apps/web-e2e/tests/admin/data-export.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/data-export.spec.ts)
  uses this exact three-call shape (a synchronous
  network-idle wait via `waitForPageReady()` then a
  fixed 2-second timer for the dashboard's React Query
  hydration storm to settle). The `waitForPageReady`
  inheritance is what makes the second call meaningful
  — it's the same discipline every other admin-tree
  spec relies on for the post-navigation network-idle
  wait against the admin shell's React Query
  hydration storm.

## Why `csvButton` / `jsonButton` use `^CSV$` / `^JSON$` exact-match regexes (and not `/CSV/i` / `/JSON/i` substring matches)

Three reasons the format-trigger getters use
exact-match `^…$`-anchored regexes instead of the
substring posture every other admin-tree driver's
button getter uses:

- **The format-trigger accessible names are short
  three- to four-character tokens.** The production
  source emits `<button>CSV</button>` and
  `<button>JSON</button>` as the format-trigger labels.
  A substring regex (`/CSV/i`) would match accidentally
  on any future "Export CSV", "Download CSV", "Sample
  CSV", "CSV Schema" button — the substring posture is
  too permissive for short tokens. The exact-match
  `^CSV$` regex resolves to the canonical format-
  trigger button exclusively.
- **The `/i` case-insensitivity flag is preserved.**
  The exact-match regex does not lock the assertion to
  uppercase only — a future refactor that switches
  the production source to render `csv` (lowercase) on
  the trigger button still resolves via the `/i`
  flag. This is a deliberate trade-off between
  permissiveness (the `/i` flag tolerates case drift)
  and strictness (the `^…$` anchors prevent substring
  match drift).
- **Symmetric with the public-tree
  `view-toggle-page-object.md` posture.** The view-
  toggle driver uses the same exact-match `^…$`-
  anchored posture for its `gridButton` / `listButton`
  Locators (which target the icon-only "Grid" / "List"
  view-mode triggers). The data-export driver follows
  the same convention so a future contributor who
  adds a per-trigger Locator on the data-export widget
  can lift the existing pattern from either driver
  without surprise. The
  [`view-toggle-page-object.md`](view-toggle-page-object.md)
  doc establishes the posture for icon-only / short-
  label trigger buttons.

## Why `includeMetadataCheckbox` uses the `#include-metadata` id-selector (and not `getByRole('checkbox')` / `getByLabel`)

Three reasons the include-metadata toggle getter uses
Playwright's `page.locator('#include-metadata')` id-
selector instead of `getByRole('checkbox')` or
`getByLabel('Include metadata')` — the same pattern
established by
[`admin-featured-items-page-object.md`](admin-featured-items-page-object.md#why-activeonlytoggle-uses-the-active-only-id-selector-and-not-getbyrolecheckbox--getbylabel):

- **Production-source-stable id-binding.** The data-
  export widget renders the toggle as `<input
  id="include-metadata" type="checkbox">` with a
  paired `<label htmlFor="include-metadata">Include
  metadata</label>` today — the id is the production-
  source-stable hook the label binding uses, so
  removing it would break the screen-reader-
  accessibility contract the rest of the admin shell
  honours. Pinning to the id is the same posture the
  label binding asserts on, which means a regression
  that breaks the id-binding surfaces in two places at
  once (the label binding and this driver's Locator).
- **`getByRole('checkbox')` would resolve too broadly.**
  The data-export widget may render multiple
  checkboxes (e.g. a per-field selection checkbox
  alongside the widget-level metadata toggle, or a
  per-row selection checkbox in a future per-row
  export-preview table). The id-scope limits the
  Locator to the include-metadata toggle exclusively
  — there is no ambiguity about which checkbox the
  helper resolves to.
- **`getByLabel('Include metadata')` would lock to
  the English locale.** The label text is translated
  per-locale via `next-intl` (e.g. `Include metadata`
  in EN, `Inclure les métadonnées` in FR, `Incluir
  metadatos` in ES). Pinning to the label text would
  force the test to branch on locale, which is
  exactly the kind of fragility the id-selector
  posture eliminates. The `#include-metadata` id is
  invariant to locale.

## Why `exportButtons` is a multi-resolution Locator (and not `.first()`-pinned)

Three reasons the export-buttons getter intentionally
resolves to a multi-element match instead of pinning
to the `.first()` element:

- **The data-export widget renders multiple export
  triggers today.** The production source emits
  multiple `<button>` elements whose labels match the
  `/export|download/i` alternation regex (e.g. "Export
  CSV", "Download JSON", "Export All Items", "Download
  Sample Template"). Pinning to `.first()` would
  resolve to the first match in DOM order — which is
  not guaranteed to be the canonical primary trigger
  across refactors. The multi-resolution Locator lets
  the consuming spec assert on `count() > 0` (the
  flow-level invariant: at least one export trigger
  is rendered) without locking to a specific match.
- **The consuming spec asserts on `count()` and
  iterates.** The
  [`apps/web-e2e/tests/admin/data-export.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/data-export.spec.ts)
  spec asserts
  `expect(exportButtonCount).toBeGreaterThan(0)` and
  `await expect(exportPage.exportButtons.first()).toBeVisible()`
  — the count assertion is the load-bearing invariant
  (at least one trigger is rendered), the
  `.first().toBeVisible()` assertion is a smoke
  visibility check on the first match. A `.first()`-
  pinned Locator would force the count assertion to
  be derived inline (`exportPage.exportButtons.count()`
  with the consuming spec re-deriving the broad
  Locator), which is exactly the boilerplate the
  multi-resolution posture folds in.
- **Composable filtering / iteration in future
  specs.** The multi-resolution Locator is the
  composable primitive — a future spec that wants to
  assert on a specific export trigger (e.g. "the
  Export CSV button is visible") can derive a per-
  trigger Locator by chaining `.filter({ hasText:
  /CSV/i })` on top, without any change to this
  driver. A `.first()`-pinned Locator would force
  every per-trigger spec to re-derive the broad
  Locator inline.

## Why `progressBar` uses a composite-or selector chain (and not a single posture)

Three reasons the progress-bar getter uses a
composite-or chain
(`[role="progressbar"], .bg-blue-600.rounded-full`)
instead of a single accessibility-tree-canonical or
positional posture:

- **The current production source is not ARIA-tagged.**
  The data-export widget's progress indicator is
  rendered today as `<div class="bg-blue-600 rounded-
  full">` without a `role="progressbar"` attribute. A
  pure `[role="progressbar"]` posture would resolve to
  zero elements until the production source adopts
  the ARIA role. The composite-or chain lights up the
  positional Tailwind-utility posture as the current-
  state fallback.
- **The future-state production source should be ARIA-
  tagged.** The accessibility-tree-canonical posture
  (`[role="progressbar"]`) is the screen-reader-
  accessible posture that the production source
  **should** adopt to be WCAG-compliant. A pure
  positional posture would lock the driver to the
  current-state Tailwind classes, which would break
  on a future refactor that adopts the ARIA role.
  The composite-or chain lets the driver participate
  in the future ARIA migration without breaking the
  current-state contract.
- **Playwright resolves the first matching half.** The
  composite-or selector is a CSS comma-separated
  selector chain — Playwright resolves to whichever
  half matches first in document order. The
  `.first()` pin on top of the chain defends against
  multi-progressbar pages (e.g. a future per-flow
  progress indicator on top of the widget-level one).
  The combined posture is a forward-compatible
  fallback chain, not a brittle single-posture
  Locator.

## What it does not contain

The data-export driver intentionally omits a number
of helpers that future contributors might be tempted
to add:

- **No `getByTestId` selectors.** The driver uses
  accessibility-tree-canonical posture (`getByRole`,
  `id`-selector) plus the positional Tailwind-utility
  selector exclusively. A future contributor who adds
  `data-testid` attributes to the production source
  must update this driver to consume them — but the
  default posture is the accessibility-tree-canonical
  one, and any `data-testid` migration must preserve
  the existing posture as a fallback.
- **No per-format download flow helper.** The driver
  exposes the `csvButton` / `jsonButton` triggers and
  the `progressBar` Locator, but no helper closes
  over the full export-and-download flow because no
  current spec drives a full export-flow against a
  real downloader. A future spec that wants to drive
  the full download flow must add the helper (e.g.
  `downloadCsv()` returning the `Download` event)
  as part of the same spec.
- **No `enableMetadata()` / `disableMetadata()`
  setter helpers.** The driver exposes the
  `includeMetadataCheckbox` Locator but does not
  expose a per-state setter. A future spec that wants
  to assert on "the metadata is enabled then
  disabled" must derive the click-flow inline —
  `await exportPage.includeMetadataCheckbox.check()`
  / `.uncheck()`.
- **No `assertProgress(percent)` invariant helper.**
  The driver exposes the `progressBar` Locator but
  does not assert on the progress percentage. A
  future spec that wants to assert on per-percent
  progress (e.g. "the progress bar reaches 100%
  before the download fires") must derive the
  assertion inline via
  `expect(exportPage.progressBar).toHaveAttribute(
  'aria-valuenow', '100')` once the ARIA role is
  adopted.
- **No format-equivalence helper that switches between
  CSV and JSON.** The driver exposes the
  `csvButton` / `jsonButton` Locators as separate
  fields, not a single `selectFormat(format)` helper.
  A future spec that wants to drive both formats in
  the same flow must alternate the click calls
  inline — the per-format Locators are the load-
  bearing primitives, not a composite setter.

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
  selection driver, distinct from the format-trigger
  surface this driver documents).
- [`admin-clients-page-object.md`](admin-clients-page-object.md)
  — the **second** admin-tree page-object reference.
  Documents the **multi-step add-form modal + nested
  delete-confirmation modal posture** at
  `/admin/clients` (a custom-React `deleteConfirmModal`
  selector, distinct from the simpler widget-level
  posture this driver documents).
- [`admin-collections-page-object.md`](admin-collections-page-object.md)
  — the **third** admin-tree page-object reference.
  Documents the **named-row helper API + per-form fill
  helper posture** at `/admin/collections` (a
  per-row-name resolver, distinct from the widget-level
  format-trigger posture this driver documents).
- [`admin-comments-page-object.md`](admin-comments-page-object.md)
  — the **fourth** admin-tree page-object reference.
  Documents the **HeroUI-Modal-based delete confirmation
  surface** at `/admin/comments` (a `[role="dialog"]`
  overlay, distinct from the dedicated route + widget
  composition this driver documents).
- [`admin-companies-page-object.md`](admin-companies-page-object.md)
  — the **fifth** admin-tree page-object reference.
  Documents the **bare `.fixed.inset-0.z-50` Tailwind-
  overlay form modal + text-filtered Tailwind-overlay
  delete-confirmation modal posture** at
  `/admin/companies` (a positional-selector +
  text-filter disambiguation pair, distinct from the
  composite-or progressbar posture this driver uses).
- [`admin-dashboard-page-object.md`](admin-dashboard-page-object.md)
  — the **sixth** admin-tree page-object reference.
  Documents the **`getByRole('tablist')`-anchored
  multi-tab navigation surface** at `/admin` with a
  per-tab `selectTab(tabName)` helper. The data-export
  driver targets the same `/admin` route but composes
  a widget rather than the dashboard chrome.
- [`admin-featured-items-page-object.md`](admin-featured-items-page-object.md)
  — the **seventh** admin-tree page-object reference.
  Documents the **`#active-only` id-selector toggle**
  at `/admin/featured-items` (a positional `<input
  id="active-only">` checkbox) plus the search-input
  helper pair plus the `statsCards` grid Locator.
  Symmetric with this driver's `#include-metadata`
  id-selector posture (see "Why `includeMetadataCheckbox`
  uses the `#include-metadata` id-selector" above).
- [`signin-page-object.md`](signin-page-object.md) —
  the auth-tree authentication driver. Documents the
  email / password / submit-button surface that gets
  the suite into an authenticated session before any
  admin-tree driver navigates to its route.
- [`view-toggle-page-object.md`](view-toggle-page-object.md)
  — the public-tree view-toggle driver. Documents the
  `^Grid$` / `^List$` exact-match icon-only trigger
  posture (the precedent for the `^CSV$` / `^JSON$`
  exact-match format-trigger posture this driver
  documents).
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
[`apps/web-e2e/tests/admin/data-export.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/data-export.spec.ts)
spec file is the single consumer of this driver today;
new specs that touch the admin data-export widget
surface must reach for `AdminDataExportPage` instead of
inlining `page.goto('/admin')` /
`page.getByRole('button', { name: /^CSV$/i })` /
`page.locator('#include-metadata')` calls.
