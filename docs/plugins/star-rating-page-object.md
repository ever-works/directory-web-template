---
id: star-rating-page-object
title: E2E Star-Rating Page Object (apps/web-e2e/page-objects/public/star-rating.page.ts)
sidebar_label: E2E Star-Rating Page Object
sidebar_position: 387
---

# E2E Star-Rating Page Object — `apps/web-e2e/page-objects/public/star-rating.page.ts`

Per-source-file reference for the Playwright e2e suite's
**five-star rating picker** driver paired with
[`apps/web-e2e/page-objects/public/star-rating.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/star-rating.page.ts).
Sits inside the `public/` page-object subtree, alongside the
thirteen other public-surface page objects
(`discover.page.ts`, `item-detail.page.ts`,
`language-switcher.page.ts`, `map.page.ts`,
`newsletter.page.ts`, `profile-dropdown.page.ts`,
`public-pages.page.ts`, `scroll-to-top.page.ts`,
`search-bar.page.ts`, `share-button.page.ts`,
`sort-menu.page.ts`, `theme-toggle.page.ts`,
`view-toggle.page.ts`).

Where [`base-page-object.md`](base-page-object.md) documents
the **page-object inheritance root** — the smallest possible
class every concrete page object under
`apps/web-e2e/page-objects/admin/`,
`apps/web-e2e/page-objects/auth/`,
`apps/web-e2e/page-objects/client/`, and
`apps/web-e2e/page-objects/public/` extends — and
[`sort-menu-page-object.md`](sort-menu-page-object.md)
documents the **suite's listing-sort driver boundary** under
`apps/web-e2e/page-objects/public/`, this page documents the
**suite's per-item rating-picker driver boundary** — the
smallest possible page object that lets a spec drive the
item-detail page's five-star rating picker end-to-end (locate
the picker by its WAI-ARIA `[role="radiogroup"]` /
`aria-label="Rating"` pair, click any star 1–5 by its visible
`aria-label*="N star"` substring, and read the currently
selected rating value via a reverse `aria-checked="true"` scan
that returns the highest-numbered checked star or `0` when
nothing is checked).

The file is the **only** driver in the suite for the
five-star rating picker today. Like
[`view-toggle-page-object.md`](view-toggle-page-object.md),
[`theme-toggle-page-object.md`](theme-toggle-page-object.md),
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md),
[`share-button-page-object.md`](share-button-page-object.md),
[`sort-menu-page-object.md`](sort-menu-page-object.md), and
unlike [`signin-page-object.md`](signin-page-object.md), the
class **does not extend `BasePage`** — see "Why the class
does not extend `BasePage`" below for the load-bearing
reason — so it carries its own `page` field and does not
inherit `header` / `footer` / `navLinks` / `goto` /
`gotoLocalized` / `waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md).

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`star-rating` driver is consumed today by
[`apps/web-e2e/tests/public/star-rating.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/star-rating.spec.ts),
which covers three item-detail rating flows:

- The picker container is **visible on the item-detail
  page** at the first item linked from `/discover/1` (the
  canonical listing route documented in
  [`discover-page-object.md`](discover-page-object.md))
  after the spec follows the first `a[href*="/items/"]`
  anchor and waits for the URL to match `/\/items\//`.
- Clicking the **fourth star** (`rate(4)`) selects the
  fourth radio entry; a 500 ms settle delay is applied
  before the spec asserts that `getValue()` returns `4`.
- All five star buttons are present (`star(1)..star(5)` are
  each visible) — the spec walks a `for (let i = 1; i <= 5; i++)`
  loop and asserts visibility on each one.
- All three tests **soft-skip** with `test.skip(true, …)`
  when the picker container is not visible, so the spec
  degrades gracefully on environments / CMS-content
  combinations where ratings are disabled, the item-detail
  page does not surface a comment form, or the user is not
  authenticated for write-mode (the test runs under the
  `clientPage` fixture, but the picker may still be hidden
  by host-app feature-flag logic).

A spec that drives the rating picker inline (via
`page.locator('[role="radiogroup"][aria-label="Rating"]')`)
is a **drift** that this page object is the canonical
replacement for; new specs that touch the rating picker must
reach for this page object instead.

## At a glance

| Element                                       | Type           | What it is                                                                                                                                                                                                                                                                                              | Why it matters                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`               | typed import   | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                                                                | The public-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports a star-rating driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `export class StarRating`                     | named export   | Single class declaration with **no `extends` clause** — does not inherit from `BasePage`. The class stands alone with its own `page` field, one `container` Locator pinned to `[role="radiogroup"][aria-label="Rating"]`, a constructor that pre-binds the container, and three methods (`star(n)` / `rate(n)` / `getValue()`).             | See "Why the class does not extend `BasePage`" below. The choice keeps the driver scoped to **just** the rating-picker surface (no header / footer / nav-link assertions leak in), and lets a spec instantiate the driver against any item-detail-shaped page (the public `/items/[slug]` route, a per-locale `/[locale]/items/[slug]` route, or a future client-shell variation) without paying for the inherited Locators to resolve up-front.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `readonly page: Page`                         | field          | Stores the Playwright `Page` handle the constructor receives.                                                                                                                                                                                                                                          | Every Locator in the class resolves through this `Page` handle indirectly via the pre-bound `container` Locator. A `BasePage` subclass would inherit this field; the standalone class restates it. The field is `readonly` so a spec cannot accidentally re-point the driver mid-test. The `page` field is **not** consumed inside `star(n)` (which scopes through `this.container`) — the field is retained for future spec authors who may need to reach for `this.page.locator(…)` to assert against sibling DOM (e.g. an "Average rating" badge that lives next to the picker but outside the radio-group container).                                                                                                                                                                                                                                                                                                                                                                                                |
| `readonly container: Locator`                 | field          | `page.locator('[role="radiogroup"][aria-label="Rating"]').first()` — the canonical rating-picker container Locator: every element whose `role` attribute is `radiogroup` AND whose `aria-label` attribute is exactly `Rating`, pinned to the first match for strict-mode safety.                       | The `[role="radiogroup"]` ARIA primitive is the canonical accessible-name container every responsible UI library writes around a single-select radio surface. The dual anchor on `aria-label="Rating"` is load-bearing: the host app may render multiple `[role="radiogroup"]` elements on the same page (e.g. a future "Difficulty" picker, "Quality" picker, or "Recommend" picker that share the radio-group ARIA primitive). Pinning to the exact `aria-label="Rating"` value disambiguates; `.first()` survives a future second `[role="radiogroup"][aria-label="Rating"]` (e.g. a sticky-header rating picker that mirrors the inline picker on long-scroll item-detail pages, or a portal-rendered duplicate inside a modal). The choice **deliberately avoids** the `[aria-label*="Rating"]` substring match because a future translation layer may localize the label (`"Bewertung"`, `"Évaluation"`) and the substring `"Rating"` would no longer match — see the `i18n` row in the failure matrix below. |
| `constructor(page: Page)`                     | constructor    | Stores the `page` and pre-binds the single container Locator in a single pass.                                                                                                                                                                                                                          | Single constructor signature, no `super(page)` call (because the class does not extend `BasePage`). Every spec instantiates `new StarRating(clientPage)` against the `clientPage` fixture (because the rating picker only renders for authenticated users); see [`fixtures-index.md`](fixtures-index.md) for the fixture barrel that exports `clientPage`. The pre-bound posture keeps spec code terse — `starRating.container.isVisible()` is the canonical visibility check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `star(n: number): Locator`                    | method         | `this.container.locator('button[aria-label*="${n} star"]')` — locator-factory that constructs a per-star Locator at call-time by interpolating the numeric `n` into the `aria-label*="${n} star"` substring match, scoped through the `container` Locator.                                              | Three load-bearing properties: (1) **scope-through-container** — the locator is built off `this.container.locator(…)` rather than `this.page.locator(…)`, which means the resolution is constrained to descendants of the radio group and survives a future page that has a "1 star" button outside the picker (e.g. a "1 star = bad, 5 stars = great" legend rendered in the page footer). (2) **substring match on `aria-label*="N star"`** — the host app's HeroUI / Radix / shadcn-ui star-rating primitive writes labels like `"1 star"`, `"2 stars"`, `"3 stars"`, `"4 stars"`, `"5 stars"` (the trailing `"s"` for plurals); the substring match accommodates both shapes. (3) **return-as-Locator (not `await`-the-click)** — the method returns the Locator without clicking, so a spec can compose visibility / role / aria-checked assertions on the same Locator (`expect(starRating.star(3)).toBeVisible()` is the canonical visibility check used by the `'all 5 star buttons are present'` test). |
| `async rate(n: number)`                       | method         | `await this.star(n).click()` — composite "click the nth star" primitive.                                                                                                                                                                                                                                | The "rate by clicking" primitive every other action method composes against. Symmetric posture with the `getValue()` accessor that reads the post-click state. A spec that needs to click and then read can compose `await starRating.rate(4); const v = await starRating.getValue();` (the canonical pattern in the second consuming test). The host app debounces post-click state writes; the consuming spec waits 500 ms before calling `getValue()` to give the radio-group's `aria-checked` attributes time to settle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `async getValue(): Promise<number>`           | method         | Reverse-iterates `i = 5..1`, reads `await this.star(i).getAttribute('aria-checked')`, returns `i` on the first `'true'` and falls through to `return 0` when nothing is checked.                                                                                                                       | The reverse-iteration is **load-bearing**: the host app's HeroUI radio-group primitive writes `aria-checked="true"` on the actively-selected option **and** the lower-numbered options (a star at position N writes `aria-checked="true"` for itself; star primitives that visualize "fill up to N" by stamping `aria-checked` on N and below would also surface here). Returning the **highest** checked index gives the user-meaningful rating. The `return 0` floor turns the no-rating state into a definitive numeric sentinel so consuming specs do not need a bespoke `if (value !== undefined)` narrowing. The await-loop is sequential (not `Promise.all`) because `aria-checked` reads are cheap and the loop short-circuits on the first hit, keeping the spec runtime predictable.                                                                                                                                                                                                                            |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the star rating picker component.
 */
export class StarRating {
	readonly page: Page;
	readonly container: Locator;

	constructor(page: Page) {
		this.page = page;
		this.container = page.locator('[role="radiogroup"][aria-label="Rating"]').first();
	}

	/** Get a specific star button (1-5) */
	star(n: number): Locator {
		return this.container.locator(`button[aria-label*="${n} star"]`);
	}

	/** Rate by clicking the nth star */
	async rate(n: number) {
		await this.star(n).click();
	}

	/** Get the currently selected rating value */
	async getValue(): Promise<number> {
		for (let i = 5; i >= 1; i--) {
			const checked = await this.star(i).getAttribute('aria-checked');
			if (checked === 'true') return i;
		}
		return 0;
	}
}
```

## Why the class does not extend `BasePage`

Three load-bearing reasons the public-tree star-rating driver
stands alone instead of inheriting from
[`base-page-object.md`](base-page-object.md):

- **Composition over inheritance against the item-detail
  surface.** The rating picker is a single item-mounted
  control — it is not a "page" in the URL sense.
  Inheriting from `BasePage` would force every spec that
  instantiates the driver to pay for the `header` /
  `footer` / `navLinks` Locator resolution even when the
  spec only needs the picker. The standalone class lets a
  spec compose the driver into a larger page object's flow
  (e.g. an `ItemDetailPage` flow that drives the picker as
  one of several item widgets — comment form, share button,
  votes — without inheriting page-shell concerns).
- **Reusability on non-item-detail surfaces.** A future
  client-shell rating picker (e.g. a "Rate this content"
  inline widget on the dashboard, a per-tag rating mosaic,
  or an admin-shell rating-distribution widget) would also
  be a `StarRating` consumer. Tying the driver to
  `BasePage`'s global `header` Locator would prevent that
  reuse without either a base-class change or a bespoke
  per-tree driver.
- **Constructor parity with non-page widgets.** The
  `(page: Page)` signature without a `super(page)` call
  matches every other public-tree widget driver (e.g.
  `theme-toggle.page.ts`, `language-switcher.page.ts`,
  `share-button.page.ts`, `view-toggle.page.ts`,
  `scroll-to-top.page.ts`, `search-bar.page.ts`,
  `sort-menu.page.ts` — all of which mirror this same
  posture). Keeping the inheritance discipline consistent
  across the public-tree widget drivers makes the tree
  scannable for a new contributor.

## Why `[role="radiogroup"][aria-label="Rating"]` exact match

Three reasons the `container` Locator pins the dual selector
to `[role="radiogroup"][aria-label="Rating"]` instead of one
half or the other:

- **`radiogroup` is the WAI-ARIA-canonical primitive for a
  single-select radio surface.** ARIA defines `radiogroup`
  as the accessible-name container for a set of mutually
  exclusive `radio` (or `button` with `aria-checked`)
  options. Pinning the driver to this role means the e2e
  suite drives the UI the same way an assistive-technology
  user does. A regression that switches the container to
  `[role="group"]` (a related-but-different ARIA pattern
  with no exclusive-selection semantics) would correctly
  fail because the driver expects single-select behaviour
  on the inner stars.
- **The `aria-label="Rating"` anchor disambiguates against
  sibling radio groups.** A page that mounts multiple
  `[role="radiogroup"]` surfaces (a future "Difficulty"
  picker, a "Recommend? Yes/No" picker, a per-survey
  question rendered as a radio set) would surface a
  strict-mode collision without the `aria-label` anchor.
  The exact-match form is **deliberately not** a substring
  match — see the `i18n` row in the failure matrix for the
  translation-aware drift this trade-off intentionally
  surfaces.
- **No production-source change required.** The
  `[role="radiogroup"]` and `aria-label="Rating"`
  attributes are already there for accessibility — adding
  a `data-testid` would be a production-source concession
  to the e2e suite. The repo prefers
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)'s
  "production-source-first" posture: drive the UI with
  the selectors a screen reader would use.

## Why `.first()` on the container Locator

Three failure modes dropping `.first()` would introduce:

- **Strict-mode collision against a future second rating
  picker.** The host app today renders one rating picker
  on the item-detail page; a future sticky-header rating
  picker (a long-scroll affordance), a portal-rendered
  rating picker inside a modal, or a "Rate average" mosaic
  badge that also writes `[role="radiogroup"][aria-label="Rating"]`
  would surface a strict-mode violation on every
  star-rating spec on every page that ships such a widget.
- **Strict-mode collision against an already-rendered
  duplicate.** If a spec navigates from one item to another
  and the previous item's picker is still in the DOM during
  a transition (e.g. exit-animation overlap), the
  `[role="radiogroup"][aria-label="Rating"]` selector
  would match both elements. `.first()` keeps the locator
  strict-mode-safe.
- **Strict-mode collision against a portal-rendered
  duplicate.** A future portal-rendered picker (e.g. a
  mobile drawer that mirrors the desktop picker on small
  viewports) would mount a second instance of the same
  DOM. `.first()` pins to the visible primary instance.

## Why `star(n)` returns a `Locator` instead of clicking

Three reasons `star(n)` returns the Locator instead of
calling `await locator.click()` and returning `void`:

- **Composability with assertion APIs.** A spec can build
  on the returned Locator with `expect(starRating.star(3)).toBeVisible()`
  (the third consuming test asserts visibility on each
  star), `expect(starRating.star(3)).toHaveAttribute('aria-checked', 'true')`
  (a smoke spec that asserts post-rate state), or
  `await starRating.star(3).hover()` (a future hover-state
  smoke spec). A void-returning method would force every
  consumer to reach inside the page object via
  `starRating.container.locator(…)`, drifting away from the
  driver's encapsulation.
- **Symmetric posture with the `rate(n)` composite.** The
  `rate(n)` method is the action verb that consumes
  `star(n)`. Splitting the locator-factory from the
  click-action primitive lets a spec assert on the Locator
  before it clicks (e.g. `await expect(starRating.star(4)).toBeVisible(); await starRating.rate(4);`).
- **Type-narrowed return.** `Locator` is a strict Playwright
  type with auto-completion for every chainable method
  (`click`, `hover`, `screenshot`, `getAttribute`, etc.).
  A `void` return would erase that type information.

## Why `aria-label*="N star"` substring match (and not exact)

Three reasons `star(n)` uses `aria-label*="${n} star"`
substring match instead of `aria-label="${n} star"` exact
match:

- **Plural form variance.** The host app's UI library
  writes labels like `"1 star"` (singular) and
  `"2 stars"` / `"3 stars"` / `"4 stars"` / `"5 stars"`
  (plural with trailing `"s"`). A substring match on
  `"${n} star"` matches both shapes — the `s` is outside
  the substring so plural and singular both resolve.
- **Future locale variance.** A localized label like
  `"1 star (out of 5)"` or `"1 star — Hate it"` (a future
  tooltip-style label that includes the rating semantics
  inline) would still match because the substring is a
  prefix of the full label.
- **Future a11y-label expansion.** A future expansion of
  the host app's accessible-name composition (e.g.
  `"Rate as 1 star"` to differentiate the picker from the
  display-only star icons) would still match the
  substring; the exact-match form would silently break.

## Why reverse iteration in `getValue()`

Three reasons `getValue()` walks `i = 5..1` instead of
`i = 1..5`:

- **Highest-checked-wins semantics.** The host app's
  star-rating primitive writes `aria-checked="true"` on
  the actively-selected option and may also write it on
  lower-indexed options (the "fill up to N" pattern). A
  forward iteration would return the **lowest** checked
  index (always `1` if any rating is set), which is not
  the user-meaningful value. The reverse iteration returns
  the highest checked index — the actual rating.
- **Short-circuit on the most likely match.** Most users
  rate at the high end (4 / 5 stars). Walking `5..1`
  short-circuits on the first hit, which on average
  resolves in fewer iterations than `1..5`.
- **Symmetric to the visual rendering.** The picker
  visually fills from left (`star(1)`) to right
  (`star(5)`), with the rightmost-filled star
  representing the rating. Walking right-to-left mirrors
  that visual semantics and makes the loop's intent
  scannable.

## Why `return 0` as the no-rating sentinel

Three reasons `getValue()` returns `0` (a `number`)
instead of `null` / `undefined` when no star is checked:

- **Type narrowing to `Promise<number>`.** Returning `0`
  pins the public return type to `Promise<number>` so
  consuming specs do not need a bespoke `if (value !== null)`
  or `if (value !== undefined)` narrowing. Comparison
  expressions like `expect(value).toBe(4)` and
  `expect(value).toBeGreaterThan(0)` work uniformly across
  the rated and unrated cases.
- **Defensive symmetry with sibling drivers.** Sibling
  drivers like
  [`theme-toggle-page-object.md`](theme-toggle-page-object.md)
  return `Promise<string>` (collapsed to `''` on the
  null-textContent branch) and
  [`search-bar-page-object.md`](search-bar-page-object.md)
  return `Promise<string>` (collapsed to `''` on the
  empty-input branch). Returning a definitive primitive
  sentinel keeps the public-tree widget driver discipline
  consistent.
- **0 is the natural null-rating value.** A `number` floor
  of `0` matches the host app's domain semantics: a user
  who has not rated yet has a numeric rating of zero, not
  `null`. The driver's return type matches the host app's
  data-model.

## Failure matrix

| Mistake on `star-rating.page.ts`                                | Layer that surfaces it                                                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Drop `import type` for `Page` / `Locator`                       | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner.                      |
| Add an `extends BasePage` clause                                | Forces every spec to pay for `header` / `footer` / `navLinks` Locator resolution; couples the driver to page shell.   |
| Drop `readonly` from `page` or `container`                      | Cross-test state-leak risk against shared driver instances.                                                           |
| Switch `container` to `[role="radiogroup"]` (no `aria-label`)   | Strict-mode collision against future sibling radio groups (`Difficulty`, `Recommend`, per-survey radio sets).         |
| Switch `container` to `[aria-label="Rating"]` (no `role`)       | Selector matches every CSS-class-bearing element with that label, including labels on non-radiogroup surfaces.        |
| Switch `container` to `[aria-label*="Rating"]` substring match  | Future translation layer (`"Bewertung"`, `"Évaluation"`) silently breaks the picker resolution.                       |
| Switch `container` to a `data-testid`                           | Forces a production-source change purely for the e2e suite — violates the production-source-first selector posture.   |
| Drop `.first()` on `container`                                  | Strict-mode collision against a future second picker (sticky-header rating picker, modal duplicate, portal mirror).   |
| Switch `star(n)` to `aria-label="${n} star"` exact match        | Plural-form mismatch on `"2 stars"` / `"3 stars"` / `"4 stars"` / `"5 stars"` — `Locator not found` on stars 2–5.     |
| Switch `star(n)` to `this.page.locator(…)` (drop `container.`)  | Strict-mode collision against a future "1 star = bad, 5 stars = great" legend in the page footer or sidebar.          |
| Switch `star(n)` to `await this.star(n).click()` (return void)  | Loses Locator composability — every spec needs to reach inside the driver via `container.locator(…)`.                 |
| Switch `getValue()` to forward iteration (`i = 1..5`)           | Returns the **lowest** checked star (always `1` for the fill-up-to-N pattern); rating reads silently always return 1. |
| Switch `getValue()` to `Promise.all(stars.map(getAttribute))`   | Same logic but loses short-circuit on the high-end-rating common case.                                                |
| Drop the `return 0` fallback in `getValue()`                    | Public return type leaks `number \| undefined`; consuming specs need bespoke narrowing.                               |
| Move the file out of `apps/web-e2e/page-objects/public/`        | `Cannot find module` on every importing spec.                                                                         |
| Rename `StarRating`                                             | Every importer needs a matching rename.                                                                               |
| Switch the file extension to `.tsx`                             | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks.                                          |
| Drop the trailing newline                                       | Prettier diff.                                                                                                        |
| Ship the file with CRLF line endings                            | Same as above.                                                                                                        |

## Per-line walkthrough

| Line(s) | Code                                                                                              | Purpose                                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | `import type { Page, Locator } from '@playwright/test';`                                          | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost.                                                                                       |
| 3–5     | `/** Page object for the star rating picker component. */`                                        | JSDoc summary that surfaces in IDE hover for every importer.                                                                                                         |
| 6       | `export class StarRating {`                                                                       | Single named export, no `extends` clause — see "Why the class does not extend `BasePage`" above.                                                                     |
| 7       | `readonly page: Page;`                                                                            | Stores the Playwright `Page` handle the constructor receives — retained for future `this.page.locator(…)` reach-outs to sibling DOM.                                 |
| 8       | `readonly container: Locator;`                                                                    | Pre-bound rating-picker container Locator — `[role="radiogroup"][aria-label="Rating"]` with `.first()` pin.                                                          |
| 10–13   | `constructor(page: Page) { this.page = page; this.container = …; }`                               | Stores the `page` and pre-binds the single container Locator in a single pass.                                                                                       |
| 15–18   | `star(n: number): Locator { return this.container.locator(\`button[aria-label*="${n} star"]\`); }` | Locator-factory scoped through `container` — substring match on the per-star `aria-label`; returns the Locator without clicking so consuming specs can compose assertions. |
| 20–23   | `async rate(n: number) { await this.star(n).click(); }`                                           | Composite "rate by clicking the nth star" primitive that reuses the `star(n)` factory.                                                                               |
| 25–32   | `async getValue(): Promise<number> { for (let i = 5; i >= 1; i--) { const checked = await this.star(i).getAttribute('aria-checked'); if (checked === 'true') return i; } return 0; }` | Reverse-iteration accessor that returns the highest checked star index, with a `return 0` fallback when nothing is checked.                                          |

## Read / write surface

| Caller                                                                                                                                  | Reads                                                                                                          | Writes                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/web-e2e/tests/public/star-rating.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/star-rating.spec.ts) | The picker visibility check (`starRating.container.isVisible()`); per-star visibility (`starRating.star(i)` 1–5); `starRating.getValue()` after clicking the fourth star | Calls `starRating.rate(4)` to drive the rating UI; navigates to `/discover/1`, clicks the first `a[href*="/items/"]` to land on an item-detail page, then waits for the URL to match `/\/items\//` before instantiating the driver. |
| Future smoke / a11y specs                                                                                                              | The `container` Locator for `aria-label` audits, role-count audits, screenshot diffs                          | Calls `rate(N)` for any N in 1..5 to drive specific rating flows for assertion against per-item rating-aggregate changes. |
| Item-detail production-source component (the production source for the DOM contract)                                                  | The container's `role="radiogroup"` attribute; the `aria-label="Rating"` anchor; the per-star `aria-label*="N star"` value; the per-star `aria-checked` attribute | Writes `aria-checked="true"` on the actively-selected option (and possibly on lower-indexed options for the fill-up-to-N pattern); writes the picker container with `[role="radiogroup"][aria-label="Rating"]`. |
| [`e2e-tsconfig.md`](e2e-tsconfig.md)                                                                                                   | The `include: ["./**/*.ts"]` glob picks up this file.                                                          | —                                                                                                                                                                                                                                                                                       |
| [`playwright-config.md`](playwright-config.md)                                                                                          | Resolves the relative `/discover/1` path the consuming spec navigates to via `baseURL`.                        | —                                                                                                                                                                                                                                                                                       |
| [`discover-page-object.md`](discover-page-object.md)                                                                                   | The `/discover/[N]` listing-route contract the consuming spec follows before navigating to the item-detail surface. | —                                                                                                                                                                                                                                                                                       |
| [`fixtures-index.md`](fixtures-index.md)                                                                                                | The `clientPage` fixture barrel that grants the consuming spec authenticated-user state.                       | —                                                                                                                                                                                                                                                                                       |

### Read / write surface — failure modes

| Drift                                                                                                  | Surfaces as                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production-source switch from `[role="radiogroup"]` to `[role="group"]` (semantic loss)                | The `container.isVisible()` returns `false`; all three consuming tests soft-skip with `test.skip(true, …)` — silent regression because the container gate is non-strict.                          |
| Production-source switch from `aria-label="Rating"` to a translated value (`"Bewertung"`)              | Same — the picker silently does not surface; consuming spec soft-skips.                                                                                                                            |
| Production-source switch from per-star `<button>` elements to `<input type="radio">` / `<label>`       | The `aria-label*="N star"` selector still matches if the host app preserves the accessible name on the input, but the `button[aria-label*=…]` element-name anchor breaks; consuming spec fails.   |
| Production-source rename of the picker label (e.g. `"Rating"` → `"Score"` in source, no translation)   | The `[aria-label="Rating"]` anchor stops matching; consuming spec soft-skips silently.                                                                                                             |
| Item route change (`/items/[slug]` → `/listings/[slug]`)                                               | The consuming spec's `waitForURL(/\/items\//)` times out; the rating picker is not present and the spec soft-skips.                                                                                |
| Middleware change that prefixes the item route (`localePrefix: 'always'`)                              | The consuming spec's `clientPage.goto('/discover/1')` lands on a redirect chain the picker is not part of; the container does not become visible and the spec soft-skips.                          |
| `playwright.config.ts` `baseURL` change                                                                | The relative `/discover/1` resolves to a different host; the picker is not present and the spec soft-skips.                                                                                        |
| Disabling ratings via host-app feature flag                                                            | The `container.isVisible()` returns `false`; all three consuming tests soft-skip with `test.skip(true, …)`. This is the **intended** soft-skip surface — not a drift.                              |
| Switching the host-app radio-group library (HeroUI → Radix → custom)                                   | If the new library writes the same `[role="radiogroup"][aria-label="Rating"]` and per-star `aria-label*="N star"` shapes, the driver is invariant; if it changes either, the consuming spec fails. |
| Removing the `clientPage` fixture from `apps/web-e2e/fixtures/`                                        | The consuming spec's `({ clientPage })` parameter destructure fails at fixture-resolution time; the test errors out with a fixture-missing message before any picker code runs.                    |

## Change checklist

Any change to `star-rating.page.ts` must:

- Audit every spec under
  `apps/web-e2e/tests/public/star-rating.spec.ts`
  for compatibility with the new shape.
- Cross-check [`base-page-object.md`](base-page-object.md)
  for the `BasePage` posture — if the new shape inherits
  from `BasePage`, document the why.
- Cross-check the production source for the item-detail
  rating-picker component for the container's
  `[role="radiogroup"]` ARIA role, the
  `aria-label="Rating"` anchor, the per-star
  `aria-label*="N star"` accessible-name shape, and the
  per-star `aria-checked` attribute that `getValue()`
  reads.
- Cross-check [`discover-page-object.md`](discover-page-object.md)
  for the `/discover/[N]` listing-route contract the
  consuming spec follows before reaching the item-detail
  surface.
- Cross-check [`fixtures-index.md`](fixtures-index.md) —
  today the driver is instantiated against the
  `clientPage` fixture for authenticated-user state; a
  future fixture-bound rating picker would surface here.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for the
  `include: ["./**/*.ts"]` glob coverage.
- Cross-check [`playwright-config.md`](playwright-config.md)
  for the `baseURL` posture the consuming spec relies on.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the
  star-rating spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Star Rating"`).
- Add a [`docs/log.md`](../log.md) entry describing the
  change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that
  affects test authoring.
- Reviewer pass.
