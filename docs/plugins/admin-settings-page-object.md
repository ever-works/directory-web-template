---
id: admin-settings-page-object
title: E2E Admin Settings Page Object (apps/web-e2e/page-objects/admin/settings.page.ts)
sidebar_label: E2E Admin Settings Page Object
sidebar_position: 413
---

# E2E Admin Settings Page Object — `apps/web-e2e/page-objects/admin/settings.page.ts`

Per-source-file reference for the Playwright e2e suite's
**admin settings-management** driver paired with
[`apps/web-e2e/page-objects/admin/settings.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/settings.page.ts).
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
`sponsorships.page.ts`, `surveys.page.ts`,
`tags.page.ts`).

This page is the **fourteenth per-source-file
reference** the docs tree publishes for any file under
`apps/web-e2e/page-objects/admin/` and the **first**
admin-tree driver in the rollout that documents:

- A **minimal-fields, accordion-section-driven driver
  posture** — the smallest admin-tree page object
  surface to date with only **one** `readonly` Locator
  field (`heading`), one method (`navigate()`), one
  helper (`openSection(sectionName)`), and two getters
  (`switches`, `selects`). Every other admin-tree
  driver carries at least two `readonly` fields. The
  settings driver is the **first** admin-tree driver
  to document a single-field surface, justified by the
  page's content shape (a vertical accordion of
  collapsed sections, each opened on demand).
- A **`getByRole('button', { name: ... }).first()`
  accordion trigger resolver** that uses a runtime-
  built `RegExp` (`new RegExp(sectionName, 'i')`)
  rather than a static regex literal. The runtime-
  built regex lets the consuming spec drive any
  section by name (e.g. `openSection('General')`,
  `openSection('Homepage')`, `openSection('Header')`,
  `openSection('Monetization')`). Distinct from every
  prior admin-tree driver's static regex literal
  posture.
- A **broad multi-resolution `switches` Locator**
  (`page.locator('[role="switch"]')`) — the **first**
  admin-tree driver to expose every toggle switch on
  the page through a single multi-element Locator.
  Symmetric with the data-export driver's multi-
  resolution `exportButtons` Locator and the items
  driver's multi-resolution `reviewButtons` Locator,
  but tighter scope (per-page rather than per-form).
- A **broad multi-resolution `selects` Locator**
  (`page.locator('select')`) — the **first** admin-
  tree driver to expose every native HTML `<select>`
  dropdown on the page. The bare `select` element-
  selector pins to the production source's HTML
  primitive (rather than the WAI-ARIA `[role="listbox"]`
  selector that HeroUI's React `Select` component
  emits). The two-Locator pair (`switches` +
  `selects`) is the canonical "per-section form
  controls" surface that consuming specs assert
  visibility / count on after opening a section via
  `openSection(name)`.
- A **per-section accordion lifecycle posture** —
  unlike every prior admin-tree driver where the
  page is a flat surface (or a single-modal
  composite), the settings page mounts an accordion
  with seven canonical sections (General, Homepage,
  Header, Footer, Monetization, Location, Navigation).
  Each section is collapsed by default; the
  `openSection(name)` helper expands one section per
  call. The driver does NOT provide a
  `closeSection(name)` helper because the consuming
  specs never close a section (each spec opens one,
  asserts on its contents, and ends).

Where [`base-page-object.md`](base-page-object.md)
documents the **page-object inheritance root**, this
page documents the **suite's admin settings-
management driver boundary** at `/admin/settings` —
the smallest possible page object that lets a spec
drive the admin settings page end-to-end (navigate to
`/admin/settings`, locate the page heading via the
inherited-default `getByRole('heading').first()`
posture, expand any accordion section by name via
the case-insensitive `openSection(sectionName)`
helper, locate every toggle switch on the page via
the bare `[role="switch"]` selector, and locate every
HTML `<select>` dropdown via the bare element-
selector).

The file is the **only driver** in the suite for the
admin settings-management surface today. The
`AdminSettingsPage` class **does extend `BasePage`**
— see "Why `AdminSettingsPage` extends `BasePage`"
below — so it inherits `header` / `footer` /
`navLinks` / `goto` / `gotoLocalized` /
`waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and
only adds one per-page `readonly` Locator field
(`heading`), two methods (`navigate()`,
`openSection(sectionName)`), and two getters
(`switches`, `selects`) on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`admin-settings` driver is consumed today by
[`apps/web-e2e/tests/admin/settings.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/settings.spec.ts),
which covers six flows over the admin settings
management surface:

- **Admin can access settings page** — a baseline
  navigation + visibility assertion against the per-
  page `heading` Locator after a `navigate()` /
  `waitForPageReady()` two-call.
- **Settings page has accordion sections** — an
  accordion-trigger visibility assertion that
  resolves every accordion trigger via a `[data-state]`
  attribute selector filtered by a multi-section
  alternation regex (`/general|homepage|header|footer|monetization|location|navigation/i`).
  The assertion pins the accordion's seven canonical
  sections as discoverable via the
  `[data-state]` attribute (HeroUI's accordion mounts
  each trigger with a `data-state="open|closed"` for
  CSS-state targeting).
- **Admin can expand General Settings section** — a
  section-expansion flow that calls
  `settingsPage.openSection('General')`, waits 500 ms
  for the accordion's enter-animation to complete,
  then asserts that the per-section toggle switches
  are visible via the `switches` multi-resolution
  Locator's `count()` assertion (`> 0`).
- **Admin can expand Homepage Settings section** —
  symmetric to the General-section flow but targets
  the Homepage section. Asserts on the page-level
  `<main>` element's visibility rather than the
  per-section switch count (because the Homepage
  section's primary controls are `<input>` text
  fields rather than toggle switches).
- **Admin can expand Header Settings section** —
  symmetric to the General-section flow, targeting
  the Header section. Asserts on the
  `switches.count() > 0` invariant.
- **Admin can expand Monetization Settings section**
  — symmetric to the Homepage-section flow, targeting
  the Monetization section. Asserts on the page-
  level `<main>` element's visibility.

A spec that drives the admin settings surface inline
(via `await page.goto('/admin/settings')` then
`await page.getByRole('button', { name: /general/i }).first().click()`
or
`await page.locator('[role="switch"]').count()`)
is a **drift** that this page object is the
canonical replacement for; new specs that touch the
admin settings management surface must reach for
`AdminSettingsPage` instead.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The admin-tree drivers share the same `import type` discipline as the base class. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root. | Anchors the settings driver to the canonical page-object base. |
| `export class AdminSettingsPage extends BasePage` | named export | Single class declaration with `extends BasePage`. Adds one per-page Locator field, two methods, and two getters on top. | The class is the canonical driver for the admin settings-management surface today. |
| `readonly heading: Locator` | field | `page.getByRole('heading').first()` — the **first** heading on the page, regardless of level. | Symmetric with every other admin-tree driver's heading getter. The single-field surface is intentional — the per-section controls materialise on demand via `openSection(name)`. |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds the single per-page Locator. | Single constructor signature with the `super(page)` call. |
| `async navigate()` | method | `await this.goto('/admin/settings')` — navigates to the admin settings management route via the inherited `goto()` from `BasePage`. | The single canonical entry-point for every consuming spec. |
| `async openSection(sectionName)` | method | `await this.page.getByRole('button', { name: new RegExp(sectionName, 'i') }).first().click()` — clicks an accordion trigger by its name (case-insensitive substring match, runtime-built `RegExp`). | The runtime-built regex (rather than a static literal) lets the helper accept any section name as a string parameter. The `i` flag tolerates capitalisation drift between the production source's `General` and a future i18n locale's lowercase variant. The `.first()` pin defends against any future sub-trigger nested under the section. |
| `get switches()` | getter | `this.page.locator('[role="switch"]')` — every toggle switch on the page, located via the WAI-ARIA `switch` role. | The settings page emits each per-feature toggle as a HeroUI `<Switch>` component which renders with `role="switch"`. Pinning to the role is the production-source-stable hook today; distinct from the data-export driver's `#include-metadata` id-selector posture (which targets a single specific checkbox) and the featured-items driver's `#active-only` id-selector posture. |
| `get selects()` | getter | `this.page.locator('select')` — every native HTML `<select>` dropdown on the page. | The settings page emits a mix of HeroUI's React `Select` components (which emit `[role="listbox"]`) and bare native `<select>` elements (for sections like Header where the dropdown is wrapped in a server-component form). The bare `select` element-selector pins to the native `<select>` exclusively — distinct from a `[role="listbox"]` posture which would resolve to the HeroUI variants. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminSettingsPage extends BasePage {
	readonly heading: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
	}

	async navigate() {
		await this.goto('/admin/settings');
	}

	/** Open an accordion section by its value/label. */
	async openSection(sectionName: string) {
		const trigger = this.page.getByRole('button', { name: new RegExp(sectionName, 'i') }).first();
		await trigger.click();
	}

	/** Get all toggle switches on the page. */
	get switches() {
		return this.page.locator('[role="switch"]');
	}

	/** Get all select dropdowns on the page. */
	get selects() {
		return this.page.locator('select');
	}
}
```

## Why `AdminSettingsPage` extends `BasePage`

Three load-bearing reasons the admin-tree settings
driver inherits from
[`base-page-object.md`](base-page-object.md):

- **Page-route navigation via the inherited `goto`
  method.** The settings driver targets a navigable
  URL (`/admin/settings`).
- **Global header / footer / nav-link chrome surfaced
  for free.** The admin shell renders the same global
  header / footer / nav-link chrome on
  `/admin/settings` as on every other admin route.
- **Post-navigation `waitForPageReady` stabiliser.**
  Every settings flow that touches the accordion
  starts with
  `await settingsPage.navigate(); await settingsPage.waitForPageReady();`
  — the consuming spec at
  [`apps/web-e2e/tests/admin/settings.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/settings.spec.ts)
  uses this exact two-call shape in every flow.

## Why `openSection(sectionName)` uses a runtime-built `RegExp` (and not a static regex literal)

Three reasons the section-expansion helper builds
the regex at call-time via
`new RegExp(sectionName, 'i')` instead of a static
regex literal:

- **The helper accepts any section name as a string
  parameter.** The settings page mounts seven
  canonical accordion sections today (General,
  Homepage, Header, Footer, Monetization, Location,
  Navigation). A static regex literal would require
  an alternation pattern with all seven names hard-
  coded — making the helper rigid against future
  section additions or renames. The runtime-built
  regex lets the helper accept any name as a string,
  including future sections that don't exist today.
- **The `i` flag is preserved.** The runtime
  constructor takes the `i` flag as the second
  argument, preserving the case-insensitivity that
  every other admin-tree driver's static regex
  literals carry. A future i18n migration that
  switches the section labels to localised
  capitalisation (e.g. lowercase German `allgemein`
  instead of `General`) would not break the helper
  — but the helper's parameter would need to be
  updated to match the new locale's section name.
- **No per-section TypeScript union.** Distinct from
  the items driver's `selectStatusTab(status)` and
  reports driver's `selectStatusTab(status)`, this
  helper does NOT narrow the parameter to a TypeScript
  union of canonical section names. The settings
  page's section list is more fluid than the
  items / reports status lists (sections can be
  added, renamed, or split as the product evolves);
  a TypeScript union would create a tight coupling
  that requires per-section refactor coordination.

## Why `switches` uses the `[role="switch"]` ARIA-role selector (and not a `[type="checkbox"]` element selector)

Three reasons the toggle-switches getter uses
Playwright's `[role="switch"]` accessibility-tree
selector instead of an HTML `[type="checkbox"]`
element selector:

- **HeroUI's `Switch` component emits
  `role="switch"`.** The production source uses
  HeroUI's `<Switch>` component for every feature-
  flag toggle on the settings page. HeroUI's
  `Switch` renders as a `<button>` element with
  `role="switch"` and `aria-checked` — NOT as a
  native `<input type="checkbox">`. Pinning to a
  `[type="checkbox"]` selector would resolve to zero
  elements.
- **The WAI-ARIA `switch` role is screen-reader-
  canonical.** Screen readers announce a
  `role="switch"` element as "switch on" / "switch
  off" — distinct from the "checkbox checked" /
  "checkbox not checked" announcement for native
  `<input type="checkbox">`. The settings page's
  per-feature toggles are semantically switches, not
  checkboxes, so the ARIA role posture matches the
  production-source contract.
- **A future migration to native `<input type="checkbox">`
  would be a production-source change.** Switching
  HeroUI's `<Switch>` to a native checkbox would be
  a deliberate redesign decision; the driver pins
  to the current contract without forcing a migration.

## Why `selects` uses the bare `select` element selector (and not `[role="listbox"]`)

Three reasons the dropdowns getter uses the bare
HTML `select` element selector instead of the WAI-
ARIA `[role="listbox"]` posture:

- **The settings page emits native `<select>`
  elements.** Several sections (notably Header and
  Footer) use bare native `<select>` HTML elements
  rather than HeroUI's React `Select` component.
  The bare element-selector pins to the native
  variant exclusively.
- **HeroUI's `Select` emits `[role="listbox"]` when
  open.** The HeroUI React `Select` component
  renders as a button trigger that opens a
  `[role="listbox"]` popup on click. A
  `[role="listbox"]` selector would resolve to the
  open popup, not the closed-state trigger — the
  consuming spec needs to assert on the trigger
  before opening, so the role-based posture
  doesn't fit.
- **The two-Locator pair (`switches` + `selects`)
  documents the canonical settings-form contract.**
  Together, the two getters expose the full set of
  per-section form controls. A consuming spec that
  asserts `switches.count() > 0` plus
  `selects.count() > 0` after `openSection(name)`
  pins both the WAI-ARIA toggle surface AND the
  native dropdown surface — a deliberate dual
  contract.

## Why no `closeSection(sectionName)` helper

Three reasons the driver does NOT expose a
`closeSection(sectionName)` helper symmetric with
`openSection(sectionName)`:

- **No consuming spec closes a section today.** The
  five spec flows in
  [`settings.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/settings.spec.ts)
  each open one section, assert on its contents,
  and end. None of them close a section before
  asserting.
- **HeroUI's accordion uses the same trigger button
  for both open and close.** Calling
  `openSection(name)` on an already-open section
  closes it. The same helper toggles both
  directions — adding a separate `closeSection`
  helper would duplicate the logic without adding
  any state-aware semantics (the helper has no way
  to read the current open / closed state without a
  separate `isOpen(sectionName)` accessor).
- **Future state-aware helpers can compose on top.**
  A future spec that needs to close a specific
  section (e.g. to assert that closing collapses
  its child controls) can add an
  `isOpen(sectionName)` accessor plus a
  state-aware `setSectionState(name, state)`
  setter. The driver intentionally leaves that
  surface unimplemented today.

## What it does not contain

The settings driver intentionally omits a number
of helpers that future contributors might be
tempted to add:

- **No `getByTestId` selectors.** The driver uses
  accessibility-tree-canonical posture (`getByRole`)
  plus the bare HTML `select` element-selector
  exclusively.
- **No `closeSection(sectionName)` helper** —
  see "Why no `closeSection(sectionName)` helper"
  above.
- **No `isOpen(sectionName): Promise<boolean>`
  accessor.** The driver does not expose a state-
  aware accessor for the per-section open / closed
  state. Future specs that need to assert on the
  state must derive it inline via
  `await page.getByRole('button', { name: ... }).getAttribute('data-state')`.
- **No per-section helper API
  (`openGeneral()` / `openHomepage()` / etc.).**
  The driver does not expose per-section
  convenience methods. Future specs that drive
  every section in the same flow can compose
  `openSection(name)` calls inline with explicit
  string parameters.
- **No `toggleSwitch(switchName)` /
  `selectOption(selectName, value)` form-control
  helpers.** The driver exposes the multi-
  resolution `switches` and `selects` Locators but
  no per-control mutators. Future specs that drive
  per-control flows must derive the mutators
  inline via `switches.first().click()` or
  `selects.first().selectOption(...)`.
- **No `submit()` / `save()` form-submission
  helper.** The settings page persists each
  control's state inline (no global submit
  button), so the driver has no top-level submit
  action to wrap.

These omissions keep the driver minimal — every
property and method on the class is consumed by
at least one spec today.

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
  — the **thirteenth** admin-tree page-object reference.

The
[`apps/web-e2e/tests/admin/settings.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/settings.spec.ts)
spec file is the single consumer of this driver
today; new specs that touch the admin settings
management surface must reach for
`AdminSettingsPage` instead of inlining
`page.goto('/admin/settings')` /
`page.getByRole('button', { name: /general/i })` /
`page.locator('[role="switch"]')` calls.
