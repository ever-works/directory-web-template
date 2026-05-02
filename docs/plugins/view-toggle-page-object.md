---
id: view-toggle-page-object
title: E2E View-Toggle Page Object (apps/web-e2e/page-objects/public/view-toggle.page.ts)
sidebar_label: E2E View-Toggle Page Object
sidebar_position: 383
---

# E2E View-Toggle Page Object — `apps/web-e2e/page-objects/public/view-toggle.page.ts`

Per-source-file reference for the Playwright e2e suite's
public-listing **view-toggle** driver paired with
[`apps/web-e2e/page-objects/public/view-toggle.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/view-toggle.page.ts).
Sits inside the `public/` page-object subtree, alongside the
thirteen other public-surface page objects
(`discover.page.ts`, `item-detail.page.ts`,
`language-switcher.page.ts`, `map.page.ts`,
`newsletter.page.ts`, `profile-dropdown.page.ts`,
`public-pages.page.ts`, `scroll-to-top.page.ts`,
`search-bar.page.ts`, `share-button.page.ts`,
`sort-menu.page.ts`, `star-rating.page.ts`,
`theme-toggle.page.ts`).

Where [`base-page-object.md`](base-page-object.md) documents
the **page-object inheritance root** — the smallest possible
class every concrete page object under
`apps/web-e2e/page-objects/admin/`,
`apps/web-e2e/page-objects/auth/`,
`apps/web-e2e/page-objects/client/`, and
`apps/web-e2e/page-objects/public/` extends — and
[`theme-toggle-page-object.md`](theme-toggle-page-object.md)
documents the **suite's theme-switch driver boundary** under
`apps/web-e2e/page-objects/public/`, this page documents the
**suite's listing-view-mode driver boundary** — the smallest
possible page object that lets a spec drive the public
listing's **list / grid / masonry / map** view-toggle
end-to-end (read the four toggle buttons, switch to one of
the three named view modes, observe which button is the
"active" one via the `scale-105` Tailwind utility class
written into the button's class list).

The file is the **only** driver in the suite for the
public-listing view-mode toggle today. Like
[`theme-toggle-page-object.md`](theme-toggle-page-object.md)
and unlike [`signin-page-object.md`](signin-page-object.md),
the class **does not extend `BasePage`** — see
"Why the class does not extend `BasePage`" below for the
load-bearing reason — so it carries its own `page` field
and does not inherit `header` / `footer` / `navLinks` /
`goto` / `gotoLocalized` / `waitForPageReady` / `getTitle`
from [`base-page-object.md`](base-page-object.md).

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`view-toggle` driver is consumed today by
[`apps/web-e2e/tests/public/view-toggle.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/view-toggle.spec.ts),
which covers the listing-page view-mode flows:

- The toggle buttons are **visible on the listing page**
  at `/discover/1` (the canonical listing route documented
  in [`discover-page-object.md`](discover-page-object.md)).
- Clicking the **grid** button **flips the active state**
  to the grid button — the `isActive(gridButton)` predicate
  returns `true` after the click.
- Clicking the **list** button **flips the active state**
  to the list button — the inverse of the grid case.

A spec that drives the view toggle inline (via
`page.locator('button[aria-label*="grid" i]')`) is a **drift**
that this page object is the canonical replacement for; new
specs that touch the view-mode toggle must reach for this
page object instead.

## At a glance

| Element                                  | Type           | What it is                                                                                                                                                                                                                                                              | Why it matters                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`          | typed import   | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                                  | The public-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports a view-toggle driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime. |
| `export class ViewToggle`                | named export   | Single class declaration with **no `extends` clause** — does not inherit from `BasePage`. The class stands alone with its own `page` field and four button locators plus three `selectX` methods plus an `isActive` predicate.                                            | See "Why the class does not extend `BasePage`" below. The choice keeps the driver scoped to **just** the view-toggle surface (no header / footer / nav-link assertions leak in), and lets a spec instantiate the driver against any listing-shaped page (the public `/discover/[N]` route, a category-filtered listing, a tag-filtered listing) without paying for the inherited Locators to resolve up-front. |
| `readonly page: Page`                    | field          | Stores the Playwright `Page` handle the constructor receives.                                                                                                                                                                                                            | Every method in the class needs the `Page` handle (the four button-Locator constructions resolve through it; `isActive` does not, but the field is still kept on the class for spec-side direct access in mixed flows). A `BasePage` subclass would inherit this field; the standalone class restates it.                                                                  |
| `readonly listButton: Locator`           | field          | `page.locator('button[aria-label*="list" i]').first()` — the canonical list-mode button Locator pinned to the first match for strict-mode safety.                                                                                                                       | The host app's listing view-toggle component renders four buttons whose `aria-label` carries the view-mode name as a substring (`list`, `grid`, `masonry`, `map`). The substring selector with the `i` (case-insensitive) flag survives every label evolution (`"View as list"`, `"List view"`, `"Show as list"`). `.first()` survives a future second header (e.g. an admin shell that mounts its own view-toggle). |
| `readonly gridButton: Locator`           | field          | `page.locator('button[aria-label*="grid" i]').first()` — the canonical grid-mode button Locator.                                                                                                                                                                          | Mirror of `listButton` for the **grid** mode. The same substring-and-`i`-flag posture applies; the same `.first()` posture applies.                                                                                                                                                                                                                                         |
| `readonly masonryButton: Locator`        | field          | `page.locator('button[aria-label*="masonry" i]').first()` — the canonical masonry-mode button Locator.                                                                                                                                                                    | Mirror of `listButton` for the **masonry** mode. The same substring-and-`i`-flag posture applies; the same `.first()` posture applies.                                                                                                                                                                                                                                       |
| `readonly mapButton: Locator`            | field          | `page.locator('button[aria-label*="map" i]').first()` — the canonical map-mode button Locator.                                                                                                                                                                            | Mirror of `listButton` for the **map** mode. Note: there is **no `selectMap()` method** today — consumers can call `mapButton.click()` directly. See "Why there is no `selectMap()`" below for the reason.                                                                                                                                                                  |
| `constructor(page: Page)`                | constructor   | Stores the `page` and pre-binds the four button Locators in a single pass.                                                                                                                                                                                              | Single constructor signature, no `super(page)` call (because the class does not extend `BasePage`). Every spec instantiates `new ViewToggle(page)` (no fixture wiring today).                                                                                                                                                                                              |
| `async selectList()`                     | method         | `await this.listButton.click()` — single click on the list button.                                                                                                                                                                                                        | The "switch to list view" primitive. Symmetric posture with `selectGrid` / `selectMasonry` so a future "switch to timeline view" or "switch to kanban view" addition slots in without bespoke locator construction.                                                                                                                                                         |
| `async selectGrid()`                     | method         | `await this.gridButton.click()` — single click on the grid button.                                                                                                                                                                                                        | Mirror of `selectList` for the **grid** mode.                                                                                                                                                                                                                                                                                                                              |
| `async selectMasonry()`                  | method         | `await this.masonryButton.click()` — single click on the masonry button.                                                                                                                                                                                                  | Mirror of `selectList` for the **masonry** mode.                                                                                                                                                                                                                                                                                                                            |
| `async isActive(button: Locator)`        | method         | Reads the `class` attribute of the supplied `button` Locator and returns whether the class list includes the `scale-105` Tailwind utility-class substring. Returns `false` when the attribute is `null` (`?? false`).                                                    | The host app's listing view-toggle component writes `scale-105` (and a `bg-primary` overlay) onto the **active** view-mode button as a Tailwind utility-class signal. The substring scan tolerates a future class-list expansion and the `?? false` fallback makes the predicate type-narrowed `Promise<boolean>` even when the DOM has no `class` attribute at all (a degenerate case, but safe). |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the view toggle component (list/grid/masonry) on listing pages.
 */
export class ViewToggle {
	readonly page: Page;
	readonly listButton: Locator;
	readonly gridButton: Locator;
	readonly masonryButton: Locator;
	readonly mapButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.listButton = page.locator('button[aria-label*="list" i]').first();
		this.gridButton = page.locator('button[aria-label*="grid" i]').first();
		this.masonryButton = page.locator('button[aria-label*="masonry" i]').first();
		this.mapButton = page.locator('button[aria-label*="map" i]').first();
	}

	/** Switch to list view */
	async selectList() {
		await this.listButton.click();
	}

	/** Switch to grid view */
	async selectGrid() {
		await this.gridButton.click();
	}

	/** Switch to masonry view */
	async selectMasonry() {
		await this.masonryButton.click();
	}

	/** Check if a specific view button is the active one (has scale-105 / primary bg) */
	async isActive(button: Locator): Promise<boolean> {
		const classes = await button.getAttribute('class');
		return classes?.includes('scale-105') ?? false;
	}
}
```

## Why the class does not extend `BasePage`

Three load-bearing reasons the public-tree view-toggle
driver stands alone instead of inheriting from
[`base-page-object.md`](base-page-object.md):

- **Composition over inheritance against the listing
  surface.** The view toggle is a single listing-mounted
  control row — it is not a "page" in the URL sense.
  Inheriting from `BasePage` would force every spec that
  instantiates the driver to pay for the `header` /
  `footer` / `navLinks` Locator resolution even when the
  spec only needs the view buttons. The standalone class
  lets a spec compose the driver into a larger page
  object's flow (e.g. a `DiscoverPage` flow that drives
  the view toggle as one of several listing widgets)
  without inheriting page-shell concerns.
- **Reusability on non-listing surfaces.** A future
  admin-shell-only view toggle (e.g. a per-admin "Items"
  table that supports a list / grid switch in the
  dashboard) would also be a `ViewToggle` consumer. Tying
  the driver to `BasePage`'s global `header` Locator
  would prevent that reuse without either a base-class
  change or a bespoke admin-tree driver.
- **Constructor parity with non-page widgets.** The
  `(page: Page)` signature without a `super(page)` call
  matches every other public-tree widget driver (e.g.
  `theme-toggle.page.ts`, `language-switcher.page.ts`,
  `share-button.page.ts`, `search-bar.page.ts` — all of
  which mirror this same posture). Keeping the inheritance
  discipline consistent across the public-tree widget
  drivers makes the tree scannable for a new contributor.

## Why `aria-label*="…" i` and not a `data-testid`

Three reasons the driver pins to the production
`aria-label` substring with the `i` (case-insensitive)
flag instead of adding a `data-testid="view-toggle-list"`:

- **No production-source change required.** The
  `aria-label` is already there for accessibility — adding
  a `data-testid` would be a production-source concession
  to the e2e suite. The repo prefers
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)'s
  "production-source-first" posture: drive the UI with
  the selectors a screen reader would use.
- **View-label invariance.** The production `aria-label`
  may render as `"View as list"`, `"List view"`,
  `"Show as a list"`, or any future variant — all of
  which contain the substring `list`. The substring
  selector pins to the invariant. The `i` flag tolerates
  case drift (`"List view"` vs `"list view"` vs
  `"LIST VIEW"`).
- **Strict-mode survives a second view toggle.** A future
  second view toggle on the page (e.g. an admin-only
  toggle, or a "saved view" widget on a dashboard) would
  still match `aria-label*="list" i`, so the `.first()`
  pin keeps the locator strict-mode-safe. A `data-testid`
  would either leak a duplicate or force a per-instance
  suffix every spec would have to know.

## Why `.first()` on every button Locator

Three failure modes dropping `.first()` would introduce:

- **Strict-mode collision against a future admin-shell
  view toggle.** The host app today renders one view
  toggle on the listing surface; a future admin shell or
  embedded "table view" widget would mount a second
  matching `aria-label*="list" i`. Dropping `.first()`
  would surface a strict-mode violation on every
  view-toggle spec on every page that ships such a
  widget.
- **Strict-mode collision against the listing-card "list"
  buttons.** A listing card's per-row "Add to list"
  action button could surface `aria-label*="list" i` in a
  future redesign — `.first()` survives that drift.
- **Strict-mode collision against a portal-rendered
  duplicate.** A future portal-rendered view toggle
  (e.g. a mobile drawer that mirrors the desktop view
  toggle) would mount a second instance of the same DOM.
  `.first()` pins to the visible primary instance.

## Why the `i` flag on every substring selector

Three reasons every button Locator carries the
case-insensitive `i` flag on its `aria-label*=` substring:

- **Locale-style casing drift.** The host app currently
  ships English-language labels in `Title Case`, but a
  future translation pass via `next-intl` could produce
  labels in different casing conventions per language
  (German uses noun capitalisation, French uses sentence
  case). The `i` flag survives every casing variant.
- **Production-source casing drift.** A future redesign
  pass could change `aria-label="View as List"` to
  `aria-label="view as list"` (Tailwind's lowercase
  utility-text aesthetic) or vice versa. The `i` flag
  survives the change.
- **Future-proofing against per-component overrides.** A
  per-tenant override that customises the view-toggle
  labels (e.g. enterprise tenants who wire a brand-voice
  copy override) could ship arbitrary casing. The `i`
  flag survives every override.

## Why there is no `selectMap()` method today

Three reasons the file declares a `mapButton` Locator
but no `selectMap()` method:

- **Map-view is feature-gated.** The map view is only
  available when [`features/map-view.md`](../features/map-view.md)
  is enabled (it requires a Mapbox or Google Maps token
  in `.env.local` and an opt-in `enableMapView` flag in
  `apps/web/lib/config/features.ts`). A spec that
  unconditionally clicks `selectMap()` would fail on
  every CI run that does not configure the Maps
  integration. The current shape lets a spec
  conditionally call `mapButton.click()` after a
  visibility check.
- **Symmetric posture preserves a future addition.** The
  three named-mode methods (`selectList`, `selectGrid`,
  `selectMasonry`) are identical-shape one-liners; a
  future `selectMap()` would slot into the same shape
  the day the map mode becomes always-on. Until then,
  the missing method is a deliberate signal that the
  feature is gated.
- **Direct-Locator access discipline.** The `readonly
  mapButton` field is intentionally exposed so a spec
  that needs to interact with the map button (visibility
  check, screenshot, accessibility audit) can do so
  without reaching through a method. The file's read /
  write surface is explicit about the four buttons being
  read-and-write surfaces; the three select methods are
  shorthand for the most-common click pattern.

## Why `isActive()` reads the `scale-105` substring

Three reasons the active-mode predicate reads the
`scale-105` substring on the button's `class` attribute
instead of `aria-pressed`, a `data-active` attribute, or
React state:

- **Production-source-first signal.** The host app's
  view-toggle component writes `scale-105` (a Tailwind
  utility class) and `bg-primary` onto the active button
  as the visual signal of which view-mode is currently
  selected. The class list is the right surface for the
  predicate because that is the surface a user sees.
- **Strict-mode safety against future class-list
  expansion.** A future redesign could append `ring-2`,
  `ring-primary`, `shadow-lg`, or any other Tailwind
  utility class to the active button. The substring scan
  tolerates the expansion as long as `scale-105` stays
  in the class list. A regression that drops `scale-105`
  in favour of a different active-state utility (e.g.
  `bg-secondary`) would surface immediately as a
  predicate-returns-`false` failure on the active-state
  spec.
- **Future-proofing against `aria-pressed` adoption.** A
  future a11y pass could add `aria-pressed="true"` to
  the active button — but that would be additive, not a
  replacement, because the visual `scale-105` signal
  must still be present for sighted users. The
  predicate's substring scan is the right shape for
  today's contract; an `aria-pressed`-aware variant
  would be a future addition, not a replacement.

## Why `?? false` on the class-list scan

Two reasons the `isActive` predicate ends with the
`?? false` nullish-coalesce:

- **Type narrowing to `Promise<boolean>`.** Without the
  fallback, the expression `classes?.includes('scale-105')`
  has type `boolean | undefined`. The `?? false`
  collapses the `undefined` branch into a definitive
  `false` so the public return type is pinned to
  `Promise<boolean>` and consuming specs do not need a
  bespoke `if (typeof active === 'boolean')` narrowing.
- **Defensive symmetry with
  `theme-toggle-page-object.md`'s `isDarkMode()`.** The
  sibling theme-toggle driver uses the same `?? false`
  posture on its class-list scan; keeping the discipline
  consistent across public-tree widget drivers makes
  the tree scannable for a new contributor.

## Failure matrix

| Mistake on `view-toggle.page.ts`                                | Layer that surfaces it                                                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Drop `import type` for `Page` / `Locator`                       | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner.                  |
| Add an `extends BasePage` clause                                | Forces every spec to pay for `header` / `footer` / `navLinks` Locator resolution; couples the driver to page shell. |
| Drop `readonly` from `page` or any of the four button fields    | Cross-test state-leak risk against shared driver instances.                                                       |
| Switch any button to `aria-label="…"` exact match               | First-render flake against any production-source label rephrase; breaks on every translation pass.                |
| Drop the `i` flag from any substring selector                   | Case-strict matching against the production `aria-label`; flakes on any casing drift.                             |
| Drop `.first()` on any button Locator                           | Strict-mode collision against a future second view toggle (admin-shell, portal, mobile drawer).                   |
| Replace `aria-label*="…" i` with a `data-testid`                | Forces a production-source change purely for the e2e suite — violates the production-source-first selector posture. |
| Add a `selectMap()` method that unconditionally clicks          | Spec failures on every CI run that does not configure Mapbox / Google Maps.                                       |
| Drop the `mapButton` field while keeping the named-mode methods | Future map-view spec must construct the Locator inline — drifts away from the canonical shape.                    |
| Read the active-state from React state / `aria-pressed`         | Couples the e2e suite to internal state or a not-yet-adopted attribute; survives only if every driver is rewritten. |
| Replace `scale-105` substring with `bg-primary` substring       | Predicate fires on a button that has `bg-primary` for any reason (e.g. hover state); false-positive on every spec. |
| Drop the `?? false` from `isActive()`                           | Public return type leaks `boolean \| undefined`; consuming specs need bespoke narrowing.                          |
| Move the file out of `apps/web-e2e/page-objects/public/`        | `Cannot find module` on every importing spec.                                                                     |
| Rename `ViewToggle`                                             | Every importer needs a matching rename.                                                                           |
| Switch the file extension to `.tsx`                             | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks.                                      |
| Drop the trailing newline                                       | Prettier diff.                                                                                                    |
| Ship the file with CRLF line endings                            | Same as above.                                                                                                    |

## Per-line walkthrough

| Line(s) | Code                                                                                                              | Purpose                                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | `import type { Page, Locator } from '@playwright/test';`                                                          | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost.                                                                                                     |
| 3–5     | `/** Page object for the view toggle component (list/grid/masonry) on listing pages. */`                          | JSDoc summary that surfaces in IDE hover for every importer.                                                                                                                       |
| 6       | `export class ViewToggle {`                                                                                       | Single named export, no `extends` clause — see "Why the class does not extend `BasePage`" above.                                                                                   |
| 7       | `readonly page: Page;`                                                                                            | Stores the Playwright `Page` handle the constructor receives.                                                                                                                      |
| 8–11    | `readonly listButton / gridButton / masonryButton / mapButton: Locator;`                                          | Pre-bound four button Locators.                                                                                                                                                    |
| 13–19   | `constructor(page: Page) { this.page = page; this.listButton = …; this.gridButton = …; this.masonryButton = …; this.mapButton = …; }` | Stores the `page` and pre-binds the four button Locators. Each substring selector carries the `i` flag and the `.first()` pin. |
| 22–24   | `async selectList() { await this.listButton.click(); }`                                                           | The "switch to list view" primitive — single click.                                                                                                                                |
| 27–29   | `async selectGrid() { ... }`                                                                                      | Mirror of `selectList` for the **grid** mode.                                                                                                                                      |
| 32–34   | `async selectMasonry() { ... }`                                                                                   | Mirror of `selectList` for the **masonry** mode.                                                                                                                                   |
| 37–40   | `async isActive(button: Locator): Promise<boolean> { const classes = await button.getAttribute('class'); return classes?.includes('scale-105') ?? false; }` | Reads the supplied button's `class` attribute and returns whether the `scale-105` Tailwind utility-class substring is present. The `?? false` collapses the `undefined` branch into `false` so the public return type is pinned to `Promise<boolean>`. |

## Read / write surface

| Caller                                                                                                                                  | Reads                                                                                              | Writes                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/web-e2e/tests/public/view-toggle.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/view-toggle.spec.ts) | The four button-visibility checks (`isVisible()`); `isActive(gridButton)` / `isActive(listButton)` boolean assertions | Calls `selectGrid()` / `selectList()` to flip the active-state class.                                                                                                                                                                                                                  |
| Future smoke / a11y specs                                                                                                              | The `mapButton` field for a feature-gated map-view spec; the four buttons' `aria-label` for accessibility audits | Same write surface as today's spec.                                                                                                                                                                                                                                                     |
| Listing-page production-source component (the production source for the DOM contract)                                                 | The four `aria-label` attributes and the `scale-105` Tailwind utility-class on the active button                | The class-list flip when the user clicks a different mode (via the `useState` hook that backs the toggle).                                                                                                                                                                              |
| [`e2e-tsconfig.md`](e2e-tsconfig.md)                                                                                                   | The `include: ["./**/*.ts"]` glob picks up this file.                                              | —                                                                                                                                                                                                                                                                                       |
| [`playwright-config.md`](playwright-config.md)                                                                                          | Resolves the relative `/discover/1` path the consuming spec navigates to via `baseURL`.            | —                                                                                                                                                                                                                                                                                       |
| [`features/map-view.md`](../features/map-view.md)                                                                                       | The map-view feature gate — the `mapButton` field is only useful when the map view is enabled.     | —                                                                                                                                                                                                                                                                                       |

### Read / write surface — failure modes

| Drift                                                                                                  | Surfaces as                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production-source rename of the `aria-label` from `"View as list"` to `"View by list"` (drops `list` substring) | Strict-mode `Locator not found` on every list-mode assertion; every assertion against `listButton` fails.                                                                                         |
| Production-source switch from `<button>` elements to a `<select>` / `<radio>` group                    | The `button[aria-label*="…" i]` resolution fails to find the button; `selectList` / `selectGrid` / `selectMasonry` fail with a Playwright timeout.                                                |
| Production-source switch from `scale-105` to a different active-state Tailwind utility (e.g. `bg-secondary`) | `isActive()` returns `false` even when the button is the active one — every active-state assertion silently passes wrong.                                                                          |
| Listing route change (`/discover/[N]` → `/listings/[N]`)                                               | The consuming spec's `page.goto('/discover/1')` lands on a 404; the toggle is not present and the spec fails on visibility.                                                                       |
| Map-view feature flag flips on without configuring Mapbox / Google Maps                                | A future spec that calls `mapButton.click()` lands on a half-rendered map and screenshots / a11y audits fail.                                                                                     |
| Middleware change that prefixes the listing route (`localePrefix: 'always'`)                           | The consuming spec's `page.goto('/discover/1')` lands on a redirect chain the toggle is not part of; `listButton.toBeVisible()` times out.                                                       |
| `playwright.config.ts` `baseURL` change                                                                | The relative `/discover/1` resolves to a different host; the toggle is not present and the spec fails on visibility.                                                                              |

## Change checklist

Any change to `view-toggle.page.ts` must:

- Audit every spec under `apps/web-e2e/tests/public/view-toggle.spec.ts`
  for compatibility with the new shape.
- Cross-check [`base-page-object.md`](base-page-object.md) for the
  `BasePage` posture — if the new shape inherits from `BasePage`,
  document the why.
- Cross-check the production source for the listing view-toggle
  component for the `aria-label` shape on every button, the
  `scale-105` Tailwind utility-class hook on the active button,
  and the four button positions in the toggle row.
- Cross-check [`discover-page-object.md`](discover-page-object.md)
  for the `/discover/[N]` listing-route contract the consuming
  spec relies on.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for the
  `include: ["./**/*.ts"]` glob coverage.
- Cross-check [`playwright-config.md`](playwright-config.md) for
  the `baseURL` posture the consuming spec relies on.
- Cross-check [`fixtures-index.md`](fixtures-index.md) — today the
  driver is instantiated inline by the consuming spec, but a
  future fixture-bound view-toggle would surface here.
- Cross-check [`features/map-view.md`](../features/map-view.md)
  for the map-view feature gate posture if a future
  `selectMap()` method is added.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the view-toggle
  spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "view-toggle"`).
- Add a [`docs/log.md`](../log.md) entry describing the change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that affects test
  authoring.
- Reviewer pass.
