---
id: map-page-object
title: E2E Map Page Object (apps/web-e2e/page-objects/public/map.page.ts)
sidebar_label: E2E Map Page Object
sidebar_position: 390
---

# E2E Map Page Object — `apps/web-e2e/page-objects/public/map.page.ts`

Per-source-file reference for the Playwright e2e suite's
**Map View page** driver paired with
[`apps/web-e2e/page-objects/public/map.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/map.page.ts).
Sits inside the `public/` page-object subtree, alongside the
thirteen other public-surface page objects
(`discover.page.ts`, `item-detail.page.ts`,
`language-switcher.page.ts`, `newsletter.page.ts`,
`profile-dropdown.page.ts`, `public-pages.page.ts`,
`scroll-to-top.page.ts`, `search-bar.page.ts`,
`share-button.page.ts`, `sort-menu.page.ts`,
`star-rating.page.ts`, `theme-toggle.page.ts`,
`view-toggle.page.ts`).

Where [`base-page-object.md`](base-page-object.md) documents
the **page-object inheritance root** — the smallest possible
class every concrete page object under
`apps/web-e2e/page-objects/admin/`,
`apps/web-e2e/page-objects/auth/`,
`apps/web-e2e/page-objects/client/`, and
`apps/web-e2e/page-objects/public/` extends — and
[`item-detail-page-object.md`](item-detail-page-object.md)
documents the **suite's per-item detail-page driver
boundary** under `apps/web-e2e/page-objects/public/`, this
page documents the **suite's Map View driver boundary** —
the smallest possible page object that lets a spec drive the
Map View feature (Spec 017) end-to-end (navigate to the
dedicated `/map` route via `BasePage.goto()`, query the
`data-testid="map-view"` markers container or the
`data-testid="map-empty-state"` empty placeholder to detect
whether the feature rendered successfully on environments
without provider keys / coordinates, query the
`data-testid="map-sidebar"` rail and the
`data-testid="map-sidebar-card"` per-item cards inside it for
sidebar interaction flows, locate the header `Map`
navigation link via the inherited `header` Locator scoped to
`role="link"` and the case-insensitive exact-match `/^Map$/`
regex anchored on the translation `HEADER_MAP` rendering as
`"Map"` in `en`, locate the listing-page view-toggle Map
button via the substring-matched
`button[aria-label*="map" i]` selector with `.first()`
strict-mode-correctness append, and surface the
mobile-responsive `Show map` / `Show list` accessible-name-
matched buttons via the case-insensitive `/show map/i` /
`/show list/i` regexes that survive the host theme's casing
drift).

The file is the **only** driver in the suite for the Map
View feature today. Like
[`item-detail-page-object.md`](item-detail-page-object.md)
and [`signin-page-object.md`](signin-page-object.md), the
class **does extend `BasePage`** — see "Why the class
extends `BasePage`" below for the load-bearing reason — so
it inherits `header` / `footer` / `navLinks` / `goto` /
`gotoLocalized` / `waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and only adds
the per-page locators and helpers that drive the map view /
sidebar / view-toggle / header-link / show-map-button /
show-list-button surfaces.

## Spec context

[Spec 017 — Map View for Listings](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/017-map-view-for-listings)
is the home spec for the Map View feature. The `map` driver
is consumed today by
[`apps/web-e2e/tests/public/map.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/map.spec.ts),
which covers the public read paths (the dedicated `/map`
route returns 200 when location features are enabled or 404
when they are gated off, the listing-page view-toggle Map
button is visible when the feature is available, the header
`Map` navigation link tracks the `header.map_enabled`
config gate, and the sidebar card highlights itself with
`aria-current="true"` on click when markers are present).
The driver's `isPageRendered()` helper is the load-bearing
**graceful-degradation primitive** that lets every consuming
spec succeed on dev environments without
`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` /
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` provider keys configured,
because the `data-testid="map-view"` markers container and
the `data-testid="map-empty-state"` empty placeholder are
both treated as a successful render.

## At-a-glance summary

| Element | Type | Purpose |
| --- | --- | --- |
| `import type { Page, Locator } from '@playwright/test'` | type-only import | Mirrors the type-only import discipline of every other public-tree page object so the runtime bundle pays nothing for the Playwright type surface. |
| `import { BasePage } from '../base.page'` | value import | Reaches up one directory level to the **suite-wide page-object inheritance root** documented in [`base-page-object.md`](base-page-object.md), pulling in `header` / `footer` / `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle`. |
| `export class MapPage extends BasePage` | single named export | The driver's only export. The `extends BasePage` clause is load-bearing — see "Why the class extends `BasePage`". |
| `readonly mapView: Locator` | bound `Locator` | The map markers container, pre-bound in the constructor via `page.getByTestId('map-view')`. The `data-testid` selector is the production source's accessibility-neutral marker that pins the visible markers wrapper across the host theme's CSS / DOM refactors. |
| `readonly mapEmptyState: Locator` | bound `Locator` | The map empty placeholder, pre-bound via `page.getByTestId('map-empty-state')`. Surfaces the **graceful-degradation render** path that must succeed on environments without provider keys / coordinates. |
| `readonly mapSidebar: Locator` | bound `Locator` | The sidebar rail container, pre-bound via `page.getByTestId('map-sidebar')`. Spec authors compose this with `sidebarCards` to scope card-selection assertions to the right rail when the host theme adds a second `map-sidebar` block. |
| `readonly sidebarCards: Locator` | bound `Locator` | The per-item sidebar cards, pre-bound via `page.getByTestId('map-sidebar-card')`. The Locator returns the **collection** of cards (no `.first()` append) so consuming specs compose `.first()` / `.nth(i)` / `.count()` against the collection at the call site. |
| `readonly mapHeaderLink: Locator` | bound `Locator` | The header `Map` navigation link, pre-bound to `this.header.getByRole('link', { name: /^Map$/ })`. The exact-match regex `/^Map$/` (no trailing characters, no case-insensitivity) pins the assertion to the canonical `HEADER_MAP` translation rendering as `"Map"` in `en` and survives the inherited `header` Locator's scope. |
| `readonly viewToggleMapButton: Locator` | bound `Locator` | The listing-page view-toggle Map button, pre-bound to the substring selector `button[aria-label*="map" i]` with `.first()` and the **case-insensitive `i` flag**. The substring-with-`i` flag is load-bearing — see "Why the view-toggle uses `aria-label*="map" i`". |
| `readonly showMapButton: Locator` | bound `Locator` | The mobile-responsive `Show map` button, pre-bound by accessible name via `page.getByRole('button', { name: /show map/i })`. The case-insensitive regex tolerates the production source's casing drift (`"Show map"`, `"Show Map"`, `"SHOW MAP"`). |
| `readonly showListButton: Locator` | bound `Locator` | The mobile-responsive `Show list` button, pre-bound by accessible name via `page.getByRole('button', { name: /show list/i })`. Symmetric with `showMapButton` — both buttons toggle the dual-pane mobile layout between markers and listing rail. |
| `constructor(page: Page)` | constructor | Calls `super(page)` so `BasePage`'s `header` / `footer` / `navLinks` are available, then pre-binds every per-page Locator in a single pass. No async work is performed — the constructor is synchronous by Playwright convention. |
| `navigate()` | async helper | Navigates to the dedicated `/map` route via the inherited `BasePage.goto('/map')`. Spec authors call this when the spec drives the Map View directly rather than reaching it via the listing-page view-toggle. |
| `isPageRendered()` | async accessor | Returns `true` if either the `mapView` markers container OR the `mapEmptyState` empty placeholder is visible. The OR is load-bearing — see "Why `isPageRendered()` accepts the empty-state path". |

## Full file annotated

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
```

The two imports together encode the driver's posture: a
`type`-only Playwright import (so the runtime bundle pays
nothing for `Page` / `Locator`) and a value import of the
suite-wide `BasePage` from a relative `../base.page`
path — the relative path is load-bearing because every other
public-tree page object uses the same `'../base.page'` form
and a re-route via a TS path alias would break grep-ability
across the suite.

```ts
/**
 * Page object for the Map View feature (Spec 017).
 *
 * Wraps:
 * - the dedicated `/map` route,
 * - the listing-page view-toggle Map button, and
 * - the header `Map` navigation link.
 */
export class MapPage extends BasePage {
```

The single named class export with an `extends BasePage`
clause and the spec-context JSDoc that pins the file to
[Spec 017 — Map View for Listings](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/017-map-view-for-listings).
The class name `MapPage` is the public name every consuming
spec imports; the `extends BasePage` clause gives it
`header` / `footer` / `navLinks` / `goto` /
`gotoLocalized` / `waitForPageReady` / `getTitle` for free —
see "Why the class extends `BasePage`" below for the
load-bearing reason.

```ts
	readonly mapView: Locator;
	readonly mapEmptyState: Locator;
	readonly mapSidebar: Locator;
	readonly sidebarCards: Locator;
	readonly mapHeaderLink: Locator;
	readonly viewToggleMapButton: Locator;
	readonly showMapButton: Locator;
	readonly showListButton: Locator;
```

The eight `readonly Locator` fields — one per actionable
surface on the page. `readonly` is load-bearing on every
field because Playwright Locators are stateless query
descriptors and re-assigning a Locator after construction
would silently desynchronise the driver's call sites from
its constructor body.

```ts
	constructor(page: Page) {
		super(page);
		this.mapView = page.getByTestId('map-view');
		this.mapEmptyState = page.getByTestId('map-empty-state');
		this.mapSidebar = page.getByTestId('map-sidebar');
		this.sidebarCards = page.getByTestId('map-sidebar-card');
		// The header Map link uses translation `HEADER_MAP` -> "Map" in en.
		this.mapHeaderLink = this.header.getByRole('link', { name: /^Map$/ });
		this.viewToggleMapButton = page.locator('button[aria-label*="map" i]').first();
		this.showMapButton = page.getByRole('button', { name: /show map/i });
		this.showListButton = page.getByRole('button', { name: /show list/i });
	}
```

The constructor calls `super(page)` first (mandatory because
`BasePage` stores `page` and pre-binds `header` / `footer` /
`navLinks`), then pre-binds every per-page Locator in a
single synchronous pass. Three load-bearing choices encoded
here:

1. **Four `getByTestId` selectors** for the markers
   container, the empty placeholder, the sidebar, and the
   sidebar cards — the `data-testid` attributes are the
   production source's accessibility-neutral markers and are
   stable across the host theme's CSS / DOM refactors.
2. **`this.header.getByRole('link', …)`** for the header
   `Map` link — the inherited `header` Locator scopes the
   query to the page header so the assertion does not match
   a footer "Map" link or a body-level "Site Map" reference.
3. **`button[aria-label*="map" i]`.first()** for the view-
   toggle — the substring with the case-insensitive `i`
   flag is load-bearing (see below) and the `.first()`
   append is for strict-mode-correctness.

```ts
	/** Navigate to the dedicated /map route. */
	async navigate() {
		await this.goto('/map');
	}
```

The dedicated `/map` route navigation primitive. Delegates
to the inherited `BasePage.goto(path)` so the `baseURL`
from [`playwright-config.md`](playwright-config.md) is
honored. Spec authors call this when the spec drives the
Map View directly (the
[`apps/web-e2e/tests/public/map.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/map.spec.ts)
spec uses `page.goto('/map', { waitUntil: 'domcontentloaded' })`
directly because it needs to read the `response.status()` to
distinguish 200 / 404 outcomes — but the alternative
`navigate()` form is the canonical primitive every other
consuming spec uses).

```ts
	/**
	 * Whether the page rendered successfully — we treat either the map view
	 * or the empty state as "ok" because in dev environments without
	 * provider keys / coordinates we expect the empty path.
	 */
	async isPageRendered(): Promise<boolean> {
		const view = await this.mapView.first().isVisible().catch(() => false);
		const empty = await this.mapEmptyState.first().isVisible().catch(() => false);
		return view || empty;
	}
```

The graceful-degradation accessor. Three load-bearing
choices encoded here:

1. **`isVisible().catch(() => false)`** — the `.catch`
   collapses any Playwright error (the Locator does not
   resolve, the element is detached mid-call, etc.) into a
   definitive `false` return without surfacing a stack
   trace.
2. **`view || empty`** — the OR is load-bearing because the
   feature is permitted to render either the markers
   container OR the empty placeholder. Either render path
   is treated as a successful render. See "Why
   `isPageRendered()` accepts the empty-state path" below.
3. **`.first()` on both Locators** — strict-mode-correctness
   appends that survive a future second `data-testid="map-view"`
   or `data-testid="map-empty-state"` somewhere on the page
   (a "preview" map widget on the discover home, etc.).

## Why the class extends `BasePage`

Three load-bearing reasons:

1. **The Map View page is a full page route, not a global
   widget.** Unlike
   [`scroll-to-top-page-object.md`](scroll-to-top-page-object.md),
   [`share-button-page-object.md`](share-button-page-object.md),
   [`sort-menu-page-object.md`](sort-menu-page-object.md),
   [`star-rating-page-object.md`](star-rating-page-object.md),
   [`view-toggle-page-object.md`](view-toggle-page-object.md),
   [`theme-toggle-page-object.md`](theme-toggle-page-object.md),
   and
   [`language-switcher-page-object.md`](language-switcher-page-object.md),
   the Map View is a **navigable URL** (`/map`) that the
   spec lands on via `goto()`. The `BasePage.goto()`
   inherited primitive is the canonical way every consuming
   spec navigates here, so extending `BasePage` is the
   conventional posture for a page-route driver in this
   suite.
2. **The page surfaces the global `header` / `footer` /
   `navLinks` chrome.** The Map View is rendered inside
   the public layout shell, so consuming specs reach for
   `header.theme.toggle()`, `header.language.select(...)`,
   `footer.cookies.accept()` etc. via the inherited
   `BasePage.header` / `BasePage.footer` / `BasePage.navLinks`
   composite getters — see
   [`base-page-object.md`](base-page-object.md) for the
   inherited surface. Extending `BasePage` here is the only
   way to expose those without re-binding them in every
   page-route driver. The header link `mapHeaderLink` field
   itself reads `this.header.getByRole(...)` directly —
   that scope reduction is impossible without the
   inheritance.
3. **`waitForPageReady()` is the canonical post-navigation
   stabilisation primitive.** A consuming spec calls
   `await page.waitForPageReady()` after `navigate()` to
   let any host-app-level loading skeleton settle before
   asserting on `mapView` / `mapEmptyState` / `sidebarCards`
   — that primitive lives on `BasePage` and is the
   conventional post-`goto` stabiliser across the suite.

## Why the view-toggle uses `aria-label*="map" i`

Three load-bearing reasons:

1. **The production source's view-toggle Map button label
   varies by host-theme i18n posture.** A spec that pins
   to an exact `aria-label="Map view"` literal would break
   on a host theme that emits `aria-label="Show as map"`,
   `aria-label="Map layout"`, or any future variant. The
   substring `*="map"` resolves to all of them.
2. **The `i` flag handles the casing drift** — the
   production source emits the label via a translation key
   that the host theme is free to render as `"Map"`,
   `"map"`, or `"MAP"` depending on the theme's casing
   convention. The `i` flag pins the substring match to
   case-insensitive without coupling the assertion to a
   specific casing.
3. **`.first()` is appended for strict-mode-correctness.**
   A future second `aria-label*="map"` button (a "Map
   settings" admin control, a "Open in map" share-target
   link) would otherwise trigger a strict-mode collision;
   `.first()` pins the Locator to the per-listing
   view-toggle button without masking the regression — every
   consuming spec asserts on the per-listing button via
   `viewToggleMapButton.click()`, which is the only consumer
   of this Locator.

## Why `isPageRendered()` accepts the empty-state path

Three load-bearing reasons:

1. **Dev environments without provider keys must succeed.**
   The CI runner does not always have
   `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` /
   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` configured, and the
   suite's broader posture is to treat a missing key as a
   degraded-but-valid render. The OR-of-two-paths in
   `isPageRendered()` encodes that posture at the driver
   level so every consuming spec inherits it for free.
2. **The empty-state is a real production-source render
   path.** When a tenant has the location feature enabled
   but no items have coordinates, the production source
   renders `data-testid="map-empty-state"` instead of the
   markers container — the empty render is the canonical
   "feature works, dataset is empty" UI. A spec that
   asserts on `mapView` exclusively would flake on a tenant
   with an empty dataset; the OR is the correct contract.
3. **The `.catch(() => false)` shields against transient
   Locator-resolution failures.** If the page is mid-render
   and the Locator's `isVisible()` call races with a DOM
   reflow, the `.catch` collapses the error into a
   `false` rather than surfacing a Playwright stack trace.
   The composite OR then re-evaluates against the other
   Locator and returns `true` if either resolved.

## Failure matrix

| Mistake | Why it breaks |
| --- | --- |
| Drop the `import type` modifier on the Playwright import. | Pulls Playwright's runtime into the bundle; breaks the suite-wide type-only import discipline mirrored in every other page-object file. |
| Drop the `extends BasePage` clause. | The driver loses `header` / `footer` / `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle`; every consuming spec breaks; the `mapHeaderLink` field's `this.header.getByRole(...)` call fails to resolve `this.header`. |
| Drop `readonly` on any Locator field. | Locator re-assignment after construction silently desynchronises driver call sites; assertions become stateful and tests flake. |
| Re-bind any of the four `data-testid` Locators to a CSS class / element-tag selector. | Couples the e2e suite to host-theme CSS that is free to refactor without warning; `data-testid` is the canonical accessibility-neutral marker the production source guarantees. |
| Drop the `mapEmptyState` field. | The graceful-degradation render path on environments without provider keys / coordinates becomes invisible to the suite; consuming specs flake on dev / CI runners without the keys. |
| Drop the `.first()` chain on `viewToggleMapButton`. | Strict-mode collision against a future "Map settings" admin control or "Open in map" share-target link. |
| Drop the `i` flag on the `viewToggleMapButton` substring selector. | Brittle to casing drift (`aria-label="Show as Map"` vs `aria-label="Show as map"`); a regression in the host theme's casing convention silently breaks the Locator. |
| Re-bind `viewToggleMapButton` to an exact-match `aria-label="Map view"` selector. | Brittle to host-theme i18n drift; a future translation rename to `"Show as map"`, `"Map layout"`, etc. silently breaks the Locator. |
| Re-bind `mapHeaderLink` to a non-anchored `name: /Map/` regex (drop the `^…$` anchors). | Catches `"Sitemap"`, `"Map view"`, `"Show map"`, etc. as collateral matches; the assertion's polarity flips silently. |
| Re-bind `mapHeaderLink` to a case-insensitive `name: /^Map$/i` regex. | The header link uses the canonical `HEADER_MAP` translation rendering as `"Map"` in `en` — pinning to the exact case is the load-bearing assertion that catches a host-theme casing drift. |
| Move `mapHeaderLink` off the inherited `this.header` Locator and onto a top-level `page.getByRole(...)`. | Catches a footer "Map" link or a body-level "Site Map" reference; the scope-reduction provided by `this.header` is load-bearing. |
| Drop the `super(page)` call in the constructor. | `BasePage.header` / `BasePage.footer` / `BasePage.navLinks` are unbound; every consuming spec that touches the global chrome breaks; the `mapHeaderLink` field's `this.header.getByRole(...)` call fails. |
| Convert `isPageRendered()` from `view OR empty` to `view AND empty`. | Both Locators must resolve simultaneously, which is impossible by construction (the production source renders one or the other); the helper always returns `false`. |
| Convert `isPageRendered()` from `view OR empty` to `view` exclusively. | Spec flakes on dev / CI runners without provider keys configured because the markers container never renders. |
| Drop the `.catch(() => false)` on either `isVisible()` call. | Transient Locator-resolution failures (DOM reflow mid-call, late-mounting empty state) surface as Playwright stack traces; the helper loses its graceful-degradation posture. |
| Drop the `.first()` on `mapView` / `mapEmptyState` inside `isPageRendered()`. | Strict-mode collision against a future second `data-testid="map-view"` (preview map widget on the discover home, etc.). |
| Re-bind `showMapButton` / `showListButton` to exact-match string instead of `/show map/i` / `/show list/i`. | Brittle to casing drift (`"Show Map"` vs `"Show map"` vs `"SHOW MAP"`). |
| Re-bind any `getByTestId` selector to a `data-test` / `data-cy` / `data-qa` variant. | Couples the e2e suite to a non-canonical attribute the production source is free to remove without warning; the suite's `getByTestId` posture pins to the Playwright-canonical `data-testid` attribute. |
| Move the file outside `apps/web-e2e/page-objects/public/`. | Breaks the relative `'../base.page'` import; consuming specs lose the import path convention; the [`e2e-tsconfig.md`](e2e-tsconfig.md) `include: ["./**/*.ts"]` glob still picks it up but the suite's directory-by-role discoverability regresses. |
| Rename the file to `map.page.tsx`. | The Playwright config has no JSX wiring; `BasePage.goto()` does not need a TSX surface. |
| Commit the file with CRLF line endings. | The suite's `.editorconfig` pins LF; tooling diffs become noisy. |

## Per-line walkthrough

| Line | Purpose |
| --- | --- |
| `import type { Page, Locator } from '@playwright/test';` | Pulls in the Playwright `Page` / `Locator` types for the constructor signature and field types. The `import type` modifier guarantees the runtime bundle pays nothing for Playwright. |
| `import { BasePage } from '../base.page';` | Reaches up one directory level to the suite-wide page-object inheritance root. The relative path is load-bearing — the suite-wide convention is `../base.page` from every public/auth/client/admin sub-tree. |
| `export class MapPage extends BasePage {` | Single named class export with the `extends BasePage` clause. The class name `MapPage` is the public name every consuming spec imports. |
| `readonly mapView: Locator;` | The `data-testid="map-view"` markers container. |
| `readonly mapEmptyState: Locator;` | The `data-testid="map-empty-state"` empty placeholder. |
| `readonly mapSidebar: Locator;` | The `data-testid="map-sidebar"` rail container. |
| `readonly sidebarCards: Locator;` | The `data-testid="map-sidebar-card"` per-item cards collection. |
| `readonly mapHeaderLink: Locator;` | The header `Map` link via the inherited `this.header` scope. |
| `readonly viewToggleMapButton: Locator;` | The substring `aria-label*="map" i` view-toggle button with `.first()`. |
| `readonly showMapButton: Locator;` | The mobile `Show map` button via case-insensitive accessible-name match. |
| `readonly showListButton: Locator;` | The mobile `Show list` button via case-insensitive accessible-name match. |
| `constructor(page: Page) { super(page); … }` | The synchronous constructor that pre-binds every Locator and chains to `BasePage`. |
| `async navigate()` | The dedicated `/map` route navigation primitive via inherited `goto()`. |
| `async isPageRendered(): Promise<boolean>` | The graceful-degradation accessor with the OR-of-two-paths and the `.catch(() => false)` error shields. |

## Read / write surface

| Surface | Reads | Writes |
| --- | --- | --- |
| `apps/web-e2e/tests/public/map.spec.ts` | `mapView`, `mapEmptyState`, `mapHeaderLink`, `viewToggleMapButton`, `sidebarCards` | `navigate()`, `isPageRendered()` |
| `apps/web-e2e/tests/public/seo-manifests.spec.ts` | indirectly references `/map` via the inherited `goto()` | none |
| Production source `apps/web/components/map/*` | DOM contract (`data-testid="map-view"`, `data-testid="map-empty-state"`, `data-testid="map-sidebar"`, `data-testid="map-sidebar-card"`, header `Map` link via `HEADER_MAP` translation key, view-toggle button `aria-label` substring `"map"` with case-insensitive flag, mobile `Show map` / `Show list` button accessible names) | n/a |
| [`base-page-object.md`](base-page-object.md) | Inherited `header` / `footer` / `navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` | n/a |
| [`e2e-tsconfig.md`](e2e-tsconfig.md) | `include: ["./**/*.ts"]` glob picks up this file | n/a |
| [`playwright-config.md`](playwright-config.md) | `baseURL` resolves the `/map` URL | n/a |
| [`fixtures-index.md`](fixtures-index.md) | Future authenticated variant would surface a fixture here | n/a |

## Read / write surface failure modes

| Failure | Why it surfaces here |
| --- | --- |
| `data-testid` rename on the markers container, empty placeholder, sidebar, or sidebar cards. | The four bound Locators drop their resolution; consuming specs flake on every assertion that reads them. |
| Header `Map` link translation rename (`HEADER_MAP` → `HEADER_MAP_VIEW`, etc.). | The exact-match `/^Map$/` regex drops on the renamed string; the `mapHeaderLink` Locator does not resolve. |
| View-toggle button `aria-label` rename that drops the `"map"` substring. | The substring `*="map"` selector resolves to nothing; `viewToggleMapButton.click()` flakes. |
| `Show map` / `Show list` button accessible-name rename. | The case-insensitive regexes drop; consuming specs that drive the mobile-responsive layout regress. |
| `header.map_enabled` config flip from `true` to `false`. | The header link disappears; the `mapHeaderLink.isVisible()` check returns `false`. The `map.spec.ts` "header Map link visibility tracks the config gate" assertion exercises this surface. |
| `settings.location.enabled` config flip. | The `/map` route returns 404 instead of 200; the `mapView` / `mapEmptyState` Locators do not resolve; the `isPageRendered()` accessor returns `false`. |
| Provider key (`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` / `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) absence. | The markers container does not render but the empty placeholder does; the OR-of-two-paths in `isPageRendered()` returns `true` regardless. The view-toggle Map button is hidden; consuming specs gate themselves with `test.skip(!hasMapProviderKey, ...)`. |
| Middleware-prefix change (e.g. `/map` → `/[locale]/map`). | The `navigate()` helper's `goto('/map')` path drops; specs must call the locale-prefixed variant via `gotoLocalized` from `BasePage`. |
| `baseURL` change in [`playwright-config.md`](playwright-config.md). | The `goto()` calls resolve to the wrong host; surfaces as a 404 on every consuming spec. |

## `map.page.ts`-change checklist

Any change to `apps/web-e2e/page-objects/public/map.page.ts` must:

1. Audit every spec under `apps/web-e2e/tests/public/map.spec.ts` for spec authors that touch the per-page surface.
2. Cross-check [`base-page-object.md`](base-page-object.md) — if the new shape inherits a different surface, document why.
3. Cross-check the production source under `apps/web/components/map/*` and the location-enabled config gates in `apps/web/lib/services/*` — the `data-testid="map-view"`, `data-testid="map-empty-state"`, `data-testid="map-sidebar"`, `data-testid="map-sidebar-card"`, the header `Map` link via the `HEADER_MAP` translation key, the view-toggle button `aria-label` substring `"map"` with case-insensitive flag, and the mobile `Show map` / `Show list` button accessible names must stay aligned.
4. Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) — the `include: ["./**/*.ts"]` glob picks up this file by convention.
5. Cross-check [`playwright-config.md`](playwright-config.md) — the `baseURL` posture is what `goto('/map')` resolves against.
6. Cross-check [`fixtures-index.md`](fixtures-index.md) — a future authenticated variant of `navigate` / `isPageRendered` would surface a fixture here.
7. Run dual `pnpm tsc --noEmit` (e2e package + workspace root) to catch the type surface.
8. Run a smoke-subset Playwright run targeting the map spec subset: `pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Map View"`.
9. Add a [`docs/log.md`](../log.md) entry under today's date heading.
10. Cross-link [Spec 017 — Map View for Listings](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/017-map-view-for-listings) if the change introduces a new shared concept that affects test authoring across the suite.
11. Submit the change for a reviewer pass with the cross-checks listed in the PR description.
