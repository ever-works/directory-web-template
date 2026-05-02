---
id: sort-menu-page-object
title: E2E Sort-Menu Page Object (apps/web-e2e/page-objects/public/sort-menu.page.ts)
sidebar_label: E2E Sort-Menu Page Object
sidebar_position: 386
---

# E2E Sort-Menu Page Object — `apps/web-e2e/page-objects/public/sort-menu.page.ts`

Per-source-file reference for the Playwright e2e suite's
**listing-sort dropdown** driver paired with
[`apps/web-e2e/page-objects/public/sort-menu.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/sort-menu.page.ts).
Sits inside the `public/` page-object subtree, alongside the
thirteen other public-surface page objects
(`discover.page.ts`, `item-detail.page.ts`,
`language-switcher.page.ts`, `map.page.ts`,
`newsletter.page.ts`, `profile-dropdown.page.ts`,
`public-pages.page.ts`, `scroll-to-top.page.ts`,
`search-bar.page.ts`, `share-button.page.ts`,
`star-rating.page.ts`, `theme-toggle.page.ts`,
`view-toggle.page.ts`).

Where [`base-page-object.md`](base-page-object.md) documents
the **page-object inheritance root** — the smallest possible
class every concrete page object under
`apps/web-e2e/page-objects/admin/`,
`apps/web-e2e/page-objects/auth/`,
`apps/web-e2e/page-objects/client/`, and
`apps/web-e2e/page-objects/public/` extends — and
[`share-button-page-object.md`](share-button-page-object.md)
documents the **suite's social-share driver boundary** under
`apps/web-e2e/page-objects/public/`, this page documents the
**suite's listing-sort driver boundary** — the smallest
possible page object that lets a spec drive the public
listing's sort dropdown end-to-end (open the dropdown by
clicking the `aria-haspopup="menu"` trigger, select any
sort option by visible-text regex via the dual
`[role="menuitemradio"], [role="menuitem"]` ARIA-role
selector, read the trigger button's current text content
to assert that the post-select label changed).

The file is the **only** driver in the suite for the
public-listing sort dropdown today. Like
[`view-toggle-page-object.md`](view-toggle-page-object.md),
[`theme-toggle-page-object.md`](theme-toggle-page-object.md),
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md),
[`share-button-page-object.md`](share-button-page-object.md),
and unlike [`signin-page-object.md`](signin-page-object.md),
the class **does not extend `BasePage`** — see "Why the class
does not extend `BasePage`" below for the load-bearing reason —
so it carries its own `page` field and does not inherit
`header` / `footer` / `navLinks` / `goto` / `gotoLocalized` /
`waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md).

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`sort-menu` driver is consumed today by
[`apps/web-e2e/tests/public/sort-menu.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/sort-menu.spec.ts),
which covers three listing-page sort flows:

- The trigger button is **visible on the listing page**
  at `/discover/1` (the canonical listing route documented
  in [`discover-page-object.md`](discover-page-object.md))
  after a 2-second settle delay.
- Clicking the trigger **opens a dropdown** with at least
  one `[role="menuitemradio"]` or `[role="menuitem"]`
  entry — the exact entry count varies by host-app sort
  configuration but the count must be greater than zero.
- Selecting a non-default option (the second entry in the
  list) **updates the trigger button's text**, asserted by
  reading `getCurrentLabel()` and checking the post-select
  string is non-empty.
- All three tests **soft-skip** with `test.skip(true, …)`
  when the trigger is not visible, so the spec degrades
  gracefully on environments / CMS-content combinations
  where the listing does not render a sort menu.

A spec that drives the sort menu inline (via
`page.locator('button[aria-haspopup="menu"]')`) is a
**drift** that this page object is the canonical
replacement for; new specs that touch the sort dropdown
must reach for this page object instead.

## At a glance

| Element                                     | Type           | What it is                                                                                                                                                                                                                                                                                          | Why it matters                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`             | typed import   | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                                                            | The public-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports a sort-menu driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `export class SortMenu`                     | named export   | Single class declaration with **no `extends` clause** — does not inherit from `BasePage`. The class stands alone with its own `page` field, two Locators (the trigger and the menu content), a constructor that pre-binds them, and three methods (`open()` / `selectOption(text)` / `getCurrentLabel()`). | See "Why the class does not extend `BasePage`" below. The choice keeps the driver scoped to **just** the sort-menu surface (no header / footer / nav-link assertions leak in), and lets a spec instantiate the driver against any listing-shaped page (the public `/discover/[N]` route, a category-filtered listing, a tag-filtered listing) without paying for the inherited Locators to resolve up-front.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `readonly page: Page`                       | field          | Stores the Playwright `Page` handle the constructor receives.                                                                                                                                                                                                                                       | Every Locator in the class resolves through this `Page` handle. A `BasePage` subclass would inherit this field; the standalone class restates it. The field is `readonly` so a spec cannot accidentally re-point the driver mid-test. Crucially, the `page` field is also used inside `selectOption` to construct the option Locator at call-time (rather than constructor-time) because the option set materialises only after `open()` has been called.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `readonly trigger: Locator`                 | field          | `page.locator('button[aria-haspopup="menu"]').first()` — the canonical sort-menu trigger Locator: every `<button>` whose `aria-haspopup` attribute is exactly `menu`, pinned to the first match for strict-mode safety.                                                                              | The `aria-haspopup="menu"` attribute is the canonical ARIA primitive every menu-trigger library writes onto a button that opens a `[role="menu"]` popup. The HeroUI / Radix / Headless UI / shadcn-ui dropdown primitives all write this attribute on the trigger element. The pin to `aria-haspopup="menu"` (not `aria-haspopup="true"` and not `aria-haspopup="listbox"`) is load-bearing: a regression that drops or changes the `aria-haspopup` value would surface as `Locator not found` on every sort-menu spec, AND a regression that switches the trigger's `aria-haspopup` to `listbox` (a related-but-different ARIA pattern) would correctly fail because the menu items would change role from `menuitem` to `option`. `.first()` survives a future second `aria-haspopup="menu"` button (e.g. an admin shell that mounts its own sort menu, or a profile-dropdown trigger that renders alongside the sort menu and also writes `aria-haspopup="menu"`). |
| `readonly menuContent: Locator`             | field          | `page.locator('[role="menu"]').first()` — the canonical opened-dropdown Locator: every element whose `role` attribute is `menu`, pinned to the first match for strict-mode safety.                                                                                                                  | The `[role="menu"]` element is what every menu library renders when the trigger opens. The Locator is **deliberately exposed as a `readonly` field** so a spec that wants to assert on the opened dropdown's properties (visibility, item count via `menuContent.locator('[role="menuitem"]').count()`, accessibility audit via axe-core, screenshot diff) can do so without reaching through a method. `.first()` survives a future second `[role="menu"]` element on the same page (e.g. a profile-dropdown menu that opens alongside the sort menu, a navigation submenu, or a portal-rendered duplicate).                                                                                                                                                                                                                                                                                                                                                                                  |
| `constructor(page: Page)`                   | constructor   | Stores the `page` and pre-binds the two Locators in a single pass.                                                                                                                                                                                                                                  | Single constructor signature, no `super(page)` call (because the class does not extend `BasePage`). Every spec instantiates `new SortMenu(page)` (no fixture wiring today). The pre-bound posture keeps spec code terse — `sortMenu.trigger.isVisible()` is the canonical visibility check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `async open()`                              | method         | `await this.trigger.click()` — single click on the trigger button.                                                                                                                                                                                                                                  | The "open the dropdown" primitive every other action method composes against. Symmetric posture with the `selectOption()` composite method that calls `open()` first. A spec that needs to test the dropdown opening without selecting an entry can call `open()` directly and then assert on `menuContent.isVisible()`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `async selectOption(text: RegExp)`          | method         | Composite "open the dropdown then click the first option matching the supplied regex" primitive. Internally calls `this.open()`, then constructs a Locator at call-time via `this.page.locator('[role="menuitemradio"], [role="menuitem"]').filter({ hasText: text }).first()` and clicks it.        | The `text: RegExp` parameter (not `string`) is load-bearing: every consuming spec should pass a regex like `/votes/i` or `/popular/i` so the match tolerates locale-specific phrasing variants (`"Most popular"`, `"Beliebteste"`, `"Plus populaires"`). The dual-role selector `[role="menuitemradio"], [role="menuitem"]` accommodates both the **single-select** (radio) and **plain-menu** (item) ARIA shapes — the host app's HeroUI sort menu writes `menuitemradio` today, but a regression that switches to a plain menu would still resolve. `.first()` survives a future regex that matches multiple options (e.g. `/popular/i` matching both `"Most popular"` and `"Popular this week"`).                                                                                                                                                                                                                                                                                            |
| `async getCurrentLabel(): Promise<string>`  | method         | Reads `this.trigger.textContent()` and returns the trimmed string, with a `?? ''` nullish-coalesce that pins the public return type to `Promise<string>` even when `textContent()` returns `null` (the degenerate empty-element case).                                                              | The trigger button's text content is the host app's "currently active sort" indicator (e.g. `"Sort by: Votes"` or `"Newest first"`). The `?? ''` collapses the `null` branch into a definitive empty-string fallback so consuming specs do not need a bespoke `if (label !== null)` narrowing. The `?.trim()` strips accidental whitespace introduced by the host app's flex / gap rendering. The method is the simplest possible "what sort is active right now" reader; future specs that want to assert on the exact label can compare against a regex with `.match(/votes/i)` rather than an exact-string equality (which would flake on every translation pass).                                                                                                                                                                                                                                                                                                                          |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the sort dropdown on listing pages.
 */
export class SortMenu {
	readonly page: Page;
	readonly trigger: Locator;
	readonly menuContent: Locator;

	constructor(page: Page) {
		this.page = page;
		this.trigger = page.locator('button[aria-haspopup="menu"]').first();
		this.menuContent = page.locator('[role="menu"]').first();
	}

	async open() {
		await this.trigger.click();
	}

	/** Select a sort option by its visible text */
	async selectOption(text: RegExp) {
		await this.open();
		const option = this.page.locator('[role="menuitemradio"], [role="menuitem"]').filter({ hasText: text }).first();
		await option.click();
	}

	/** Get the current sort label shown in the trigger button */
	async getCurrentLabel(): Promise<string> {
		const text = await this.trigger.textContent();
		return text?.trim() ?? '';
	}
}
```

## Why the class does not extend `BasePage`

Three load-bearing reasons the public-tree sort-menu driver
stands alone instead of inheriting from
[`base-page-object.md`](base-page-object.md):

- **Composition over inheritance against the listing
  surface.** The sort menu is a single listing-mounted
  control — it is not a "page" in the URL sense.
  Inheriting from `BasePage` would force every spec that
  instantiates the driver to pay for the `header` /
  `footer` / `navLinks` Locator resolution even when the
  spec only needs the trigger and the dropdown options.
  The standalone class lets a spec compose the driver into
  a larger page object's flow (e.g. a `DiscoverPage` flow
  that drives the sort menu as one of several listing
  widgets) without inheriting page-shell concerns.
- **Reusability on non-listing surfaces.** A future
  admin-shell-only sort menu (e.g. a per-admin "Items"
  table that supports a sort dropdown in the dashboard),
  a client-shell sort menu on the user submissions page,
  or a category-page sort menu would also be a `SortMenu`
  consumer. Tying the driver to `BasePage`'s global
  `header` Locator would prevent that reuse without either
  a base-class change or a bespoke per-tree driver.
- **Constructor parity with non-page widgets.** The
  `(page: Page)` signature without a `super(page)` call
  matches every other public-tree widget driver (e.g.
  `theme-toggle.page.ts`, `language-switcher.page.ts`,
  `share-button.page.ts`, `view-toggle.page.ts`,
  `scroll-to-top.page.ts`, `search-bar.page.ts`,
  `star-rating.page.ts` — all of which mirror this same
  posture). Keeping the inheritance discipline consistent
  across the public-tree widget drivers makes the tree
  scannable for a new contributor.

## Why `aria-haspopup="menu"` exact match and not a substring

Three reasons the trigger Locator pins to the exact
`aria-haspopup="menu"` attribute value instead of
`aria-haspopup*="menu"`, `aria-haspopup="true"`, or any
other variant:

- **`menu` is the ARIA-spec-canonical value for the
  trigger of a `[role="menu"]` popup.** WAI-ARIA defines
  five legal values for `aria-haspopup`: `false`, `true`,
  `menu`, `listbox`, `tree`, `grid`, and `dialog`. The
  `menu` value is the strict-mode-correct match for a
  trigger that opens a `[role="menu"]` element (which the
  `menuContent` Locator resolves). A regression that
  switches the trigger to `aria-haspopup="listbox"` (a
  related-but-different ARIA pattern that pairs with
  `[role="listbox"]` and `[role="option"]`) would
  correctly fail because the menu items would also change
  role from `menuitem` to `option`, breaking the dual-role
  selector in `selectOption()`.
- **Strict equality survives a future related-popup
  regression.** A future contributor might add a
  `aria-haspopup="dialog"` button alongside the sort menu
  (e.g. a "Filter" button that opens a modal dialog).
  Pinning to the exact `menu` value keeps the locator
  strict-mode-safe — the dialog-trigger button does not
  match.
- **No production-source change required.** The
  `aria-haspopup="menu"` attribute is already there for
  accessibility — adding a `data-testid` would be a
  production-source concession to the e2e suite. The repo
  prefers
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)'s
  "production-source-first" posture: drive the UI with
  the selectors a screen reader would use.

## Why `[role="menu"]` exact match for `menuContent`

Three reasons the dropdown Locator pins to
`[role="menu"]` instead of a CSS class selector or a
`data-testid`:

- **The role is the screen-reader-driven primitive.**
  `[role="menu"]` is the WAI-ARIA contract every menu
  library writes onto the opened dropdown's container.
  HeroUI, Radix, Headless UI, and shadcn-ui all write
  this role; pinning the driver to it means the e2e
  suite drives the UI the same way an assistive-
  technology user does.
- **Library invariance.** The host app's UI library
  choice may change over time (HeroUI → Radix → a custom
  primitive), but the `role="menu"` ARIA contract is
  invariant — every responsible UI library writes it
  for the same reason. A `data-testid` would force a
  production-source change for every library swap.
- **Strict-mode resilience against future submenus.**
  A future submenu rendered inside the sort menu would
  also carry `[role="menu"]`, but the `.first()` pin
  keeps the locator strict-mode-safe and resolves to
  the primary opened dropdown.

## Why `.first()` on every Locator

Three failure modes dropping `.first()` would introduce:

- **Strict-mode collision against a future second
  dropdown trigger.** The host app today renders one sort
  menu on the listing surface; a future admin-shell sort
  trigger, mobile-drawer sort mirror, or profile-dropdown
  trigger that also writes `aria-haspopup="menu"` would
  surface a strict-mode violation on every sort-menu spec
  on every page that ships such a widget.
- **Strict-mode collision against an already-open
  `[role="menu"]`.** If a spec runs in a sequence where
  another menu (e.g. a profile-dropdown) is already open
  when the spec instantiates `SortMenu`, the
  `[role="menu"]` selector would match both elements.
  `.first()` keeps the locator strict-mode-safe.
- **Strict-mode collision against a portal-rendered
  duplicate.** A future portal-rendered sort dropdown
  (e.g. a mobile drawer that mirrors the desktop sort
  menu) would mount a second instance of the same DOM.
  `.first()` pins to the visible primary instance.

## Why the dual-role selector in `selectOption`

Three reasons `selectOption` uses
`[role="menuitemradio"], [role="menuitem"]` (a comma-
separated dual selector) instead of one or the other:

- **Single-select vs free-action option-shape mismatch.**
  The host app's sort menu is a **single-select** menu
  (only one sort can be active at a time), so HeroUI
  writes `[role="menuitemradio"]` on each option. But a
  future change to a multi-select sort (e.g. "Sort by
  Votes AND Date" with a checkbox shape) or to a free-
  action sort (e.g. "Reset sort") would write
  `[role="menuitem"]` instead. The dual selector survives
  both shapes.
- **Library variance.** Different menu libraries default
  to different role choices for the same UX. HeroUI
  prefers `menuitemradio` for single-select; Radix
  prefers `menuitem` with a per-item `aria-checked`. The
  dual selector survives a future library swap without
  a bespoke per-library Locator.
- **Compatibility with the consuming spec's option-count
  check.** The consuming spec at
  `apps/web-e2e/tests/public/sort-menu.spec.ts` uses the
  same dual selector (`page.locator('[role="menuitemradio"], [role="menuitem"]')`)
  to count menu items in the third test. Keeping the
  driver-side and spec-side selectors symmetric makes
  the contract scannable.

## Why `text: RegExp` and not `text: string`

Three reasons `selectOption` accepts a `RegExp`
parameter instead of a plain string:

- **Locale invariance.** A consuming spec that calls
  `selectOption(/votes/i)` matches `"Sort by Votes"`,
  `"Most votes"`, `"Votes (descending)"`, and the
  per-locale translations `"Stimmen"` (German) — but only
  if the spec passes the corresponding regex. The
  RegExp parameter forces consuming specs to think about
  the substring contract rather than hard-coding an
  English-only string.
- **Strict-mode resilience.** A regex like `/popular/i`
  with the `i` flag matches `"Most popular"`, `"popular
  this week"`, and any future variant in any casing. A
  plain-string parameter would force consuming specs to
  use Playwright's `hasText` regex parameter directly,
  drifting away from the page object's encapsulation.
- **Type-narrowed Locator construction.** Playwright's
  `Locator.filter({ hasText: ... })` accepts both
  `string` and `RegExp`, but the regex form is
  case-and-substring-tolerant by default. Forcing the
  parameter to `RegExp` documents to consuming specs
  that case-insensitivity is the expected posture.

## Why `?.trim() ?? ''` on `getCurrentLabel`

Three reasons `getCurrentLabel` ends with the
`?.trim() ?? ''` chain:

- **Type narrowing to `Promise<string>`.** Without the
  fallback, the expression `text?.trim()` has type
  `string | undefined`. The `?? ''` collapses the
  `undefined` branch into a definitive empty string so
  the public return type is pinned to `Promise<string>`
  and consuming specs do not need a bespoke
  `if (label !== undefined)` narrowing.
- **Whitespace tolerance against flex / gap rendering.**
  The host app's trigger button renders the active sort
  with a flex layout that can introduce leading /
  trailing whitespace. The `.trim()` strips that
  whitespace so consuming specs can compare against
  exact substrings without flake.
- **Defensive symmetry with
  `theme-toggle-page-object.md`'s `getCurrentTheme()`
  and `search-bar-page-object.md`'s `getValue()`.** Both
  sibling drivers use the `?? ''` posture on their
  string-returning accessor methods; keeping the
  discipline consistent across public-tree widget
  drivers makes the tree scannable for a new
  contributor.

## Failure matrix

| Mistake on `sort-menu.page.ts`                                  | Layer that surfaces it                                                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Drop `import type` for `Page` / `Locator`                       | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner.                      |
| Add an `extends BasePage` clause                                | Forces every spec to pay for `header` / `footer` / `navLinks` Locator resolution; couples the driver to page shell.   |
| Drop `readonly` from `page` or any of the two Locator fields    | Cross-test state-leak risk against shared driver instances.                                                           |
| Switch `trigger` to `aria-haspopup*="menu"` substring match     | Matches `aria-haspopup="menu"` AND any future `aria-haspopup="menubar"` button; strict-mode chaos.                    |
| Switch `trigger` to `aria-haspopup="true"` legacy ARIA value    | Stops matching the canonical `menu` value; `Locator not found` on every sort-menu spec.                               |
| Switch `trigger` to a `data-testid`                             | Forces a production-source change purely for the e2e suite — violates the production-source-first selector posture.   |
| Drop `.first()` on `trigger` or `menuContent`                   | Strict-mode collision against a future second sort trigger / dropdown / portal mirror.                                |
| Drop the `[role="menu"]` ARIA-role anchor on `menuContent`      | Selector matches every CSS-class-bearing element; strict-mode collisions against incidental DOM.                      |
| Drop the dual-role selector in `selectOption`                   | Future library swap from `menuitemradio` to `menuitem` (or vice-versa) breaks the option-click flow silently.          |
| Switch `selectOption`'s parameter from `RegExp` to `string`     | Consuming specs lose the case-insensitive substring contract; locale-specific phrasing fails to match.                 |
| Drop `.first()` on the option Locator inside `selectOption`     | Strict-mode collision when the regex matches multiple options (e.g. `/popular/i` matching two options).                |
| Drop the `?.trim()` from `getCurrentLabel`                      | Whitespace introduced by flex / gap rendering breaks exact-substring assertions in consuming specs.                    |
| Drop the `?? ''` from `getCurrentLabel`                         | Public return type leaks `string \| undefined`; consuming specs need bespoke narrowing.                                |
| Pre-construct the option Locator in the constructor             | The option set materialises only after `open()` has been called; pre-construction would resolve to zero matches.       |
| Move the file out of `apps/web-e2e/page-objects/public/`        | `Cannot find module` on every importing spec.                                                                         |
| Rename `SortMenu`                                               | Every importer needs a matching rename.                                                                               |
| Switch the file extension to `.tsx`                             | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks.                                          |
| Drop the trailing newline                                       | Prettier diff.                                                                                                        |
| Ship the file with CRLF line endings                            | Same as above.                                                                                                        |

## Per-line walkthrough

| Line(s) | Code                                                                                                              | Purpose                                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | `import type { Page, Locator } from '@playwright/test';`                                                          | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost.                                                                                                     |
| 3–5     | `/** Page object for the sort dropdown on listing pages. */`                                                      | JSDoc summary that surfaces in IDE hover for every importer.                                                                                                                       |
| 6       | `export class SortMenu {`                                                                                         | Single named export, no `extends` clause — see "Why the class does not extend `BasePage`" above.                                                                                   |
| 7       | `readonly page: Page;`                                                                                            | Stores the Playwright `Page` handle the constructor receives.                                                                                                                      |
| 8–9     | `readonly trigger / menuContent: Locator;`                                                                        | Pre-bound two Locators — the `aria-haspopup="menu"` trigger button and the opened `[role="menu"]` dropdown.                                                                        |
| 11–15   | `constructor(page: Page) { this.page = page; this.trigger = …; this.menuContent = …; }`                           | Stores the `page` and pre-binds the two Locators in a single pass. Each Locator carries the `.first()` pin.                                                                         |
| 17–19   | `async open() { await this.trigger.click(); }`                                                                    | The "open the dropdown" primitive — single click on the trigger button.                                                                                                            |
| 21–26   | `async selectOption(text: RegExp) { await this.open(); const option = this.page.locator('[role="menuitemradio"], [role="menuitem"]').filter({ hasText: text }).first(); await option.click(); }` | The composite "open the dropdown then click the first option matching the regex" primitive. The option Locator is constructed at call-time because the option set materialises only after `open()`. |
| 28–32   | `async getCurrentLabel(): Promise<string> { const text = await this.trigger.textContent(); return text?.trim() ?? ''; }` | Reads the trigger button's text content and returns the trimmed string with a `?? ''` fallback for the `null` branch.                                                              |

## Read / write surface

| Caller                                                                                                                                  | Reads                                                                                                          | Writes                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/web-e2e/tests/public/sort-menu.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/sort-menu.spec.ts) | The trigger-visibility check (`sortMenu.trigger.isVisible()`); the menu-item count check (`page.locator('[role="menuitemradio"], [role="menuitem"]').count()`); `sortMenu.getCurrentLabel()` after a non-default selection | Calls `sortMenu.open()` to drive the dropdown open; clicks the second menu item via `menuItems.nth(1).click()` (drift from the canonical `selectOption()` shape).                                                                                                                       |
| Future smoke / a11y specs                                                                                                              | The `menuContent` Locator for `aria-orientation` audits, role-count audits, screenshot diffs                   | Calls `selectOption(/votes/i)` or `selectOption(/newest/i)` to drive specific sort flows for assertion against listing-result-order changes.                                                                                                                                            |
| Listing-page production-source component (the production source for the DOM contract)                                                 | The trigger button's `aria-haspopup` attribute; the `[role="menu"]` ARIA role on the dropdown; the `[role="menuitemradio"]` (or `menuitem`) role on each option | Writes the trigger button's text content with the active-sort label (e.g. `"Sort by: Votes"`); writes the `aria-checked` attribute on the active option; writes the `[role="menu"]` element when the user clicks the trigger.                                                            |
| [`e2e-tsconfig.md`](e2e-tsconfig.md)                                                                                                   | The `include: ["./**/*.ts"]` glob picks up this file.                                                          | —                                                                                                                                                                                                                                                                                       |
| [`playwright-config.md`](playwright-config.md)                                                                                          | Resolves the relative `/discover/1` path the consuming spec navigates to via `baseURL`.                        | —                                                                                                                                                                                                                                                                                       |
| [`discover-page-object.md`](discover-page-object.md)                                                                                   | The `/discover/[N]` listing-route contract the consuming spec follows before reaching the sort menu.           | —                                                                                                                                                                                                                                                                                       |

### Read / write surface — failure modes

| Drift                                                                                                  | Surfaces as                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production-source switch from `aria-haspopup="menu"` to `aria-haspopup="listbox"`                      | The `trigger.isVisible()` returns `false`; all three consuming tests soft-skip with `test.skip(true, …)` — silent regression because the trigger gate is non-strict.                              |
| Production-source switch from `<button>` elements to a `<select>` element                              | The `button[aria-haspopup="menu"]` resolution fails; the consuming spec soft-skips silently.                                                                                                       |
| Production-source switch from `[role="menuitemradio"]` to `[role="option"]` (listbox-pattern swap)     | `selectOption()` fails with a Playwright timeout on the option click; the dual-role selector does not include `option`.                                                                            |
| Production-source rename of any sort-option label (e.g. `"Newest"` → `"Recent"`)                       | A consuming spec that calls `selectOption(/newest/i)` fails with a Playwright timeout; specs that pass a more general regex like `/^[A-Z]/` continue to work.                                       |
| Listing route change (`/discover/[N]` → `/listings/[N]`)                                               | The consuming spec's `page.goto('/discover/1')` lands on a 404; the sort menu is not present and the spec soft-skips.                                                                              |
| Middleware change that prefixes the listing route (`localePrefix: 'always'`)                           | The consuming spec's `page.goto('/discover/1')` lands on a redirect chain the sort menu is not part of; the trigger does not become visible and the spec soft-skips.                              |
| `playwright.config.ts` `baseURL` change                                                                | The relative `/discover/1` resolves to a different host; the sort menu is not present and the spec soft-skips.                                                                                     |
| Removing `[role="menu"]` from the dropdown library (e.g. switching from HeroUI to a custom div-soup) | The `menuContent` Locator fails to resolve; future smoke / a11y specs that read it fail with timeouts.                                                                                              |

## Change checklist

Any change to `sort-menu.page.ts` must:

- Audit every spec under
  `apps/web-e2e/tests/public/sort-menu.spec.ts`
  for compatibility with the new shape.
- Cross-check [`base-page-object.md`](base-page-object.md)
  for the `BasePage` posture — if the new shape inherits
  from `BasePage`, document the why.
- Cross-check the production source for the listing
  sort-menu component for the trigger's `aria-haspopup`
  attribute, the `[role="menu"]` ARIA contract on the
  dropdown, the `[role="menuitemradio"]` (or `menuitem`)
  role on every option, and the trigger button's
  text-content shape that `getCurrentLabel()` reads.
- Cross-check [`discover-page-object.md`](discover-page-object.md)
  for the `/discover/[N]` listing-route contract the
  consuming spec follows before reaching the sort menu.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for the
  `include: ["./**/*.ts"]` glob coverage.
- Cross-check [`playwright-config.md`](playwright-config.md)
  for the `baseURL` posture the consuming spec relies on.
- Cross-check [`fixtures-index.md`](fixtures-index.md) —
  today the driver is instantiated inline by the
  consuming spec, but a future fixture-bound sort menu
  would surface here.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the
  sort-menu spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Sort Menu"`).
- Add a [`docs/log.md`](../log.md) entry describing the
  change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that
  affects test authoring.
- Reviewer pass.
