---
id: scroll-to-top-page-object
title: E2E Scroll-To-Top Page Object (apps/web-e2e/page-objects/public/scroll-to-top.page.ts)
sidebar_label: E2E Scroll-To-Top Page Object
sidebar_position: 384
---

# E2E Scroll-To-Top Page Object — `apps/web-e2e/page-objects/public/scroll-to-top.page.ts`

Per-source-file reference for the Playwright e2e suite's
**scroll-to-top button** driver paired with
[`apps/web-e2e/page-objects/public/scroll-to-top.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/scroll-to-top.page.ts).
Sits inside the `public/` page-object subtree, alongside the
thirteen other public-surface page objects
(`discover.page.ts`, `item-detail.page.ts`,
`language-switcher.page.ts`, `map.page.ts`,
`newsletter.page.ts`, `profile-dropdown.page.ts`,
`public-pages.page.ts`, `search-bar.page.ts`,
`share-button.page.ts`, `sort-menu.page.ts`,
`star-rating.page.ts`, `theme-toggle.page.ts`,
`view-toggle.page.ts`).

Where [`base-page-object.md`](base-page-object.md) documents
the **page-object inheritance root** and
[`view-toggle-page-object.md`](view-toggle-page-object.md)
documents the **suite's listing-view-mode driver boundary**
under `apps/web-e2e/page-objects/public/`, this page documents
the **suite's scroll-position driver boundary** — the smallest
possible page object that lets a spec drive the global "back to
top" floating button end-to-end (scroll the page down by an
arbitrary pixel offset to trigger the button to appear, click
the button to animate the page back to the top, read the
current `window.scrollY` value at any point during the flow to
make scroll-position assertions).

The file is the **only** driver in the suite for the
scroll-to-top floating button today. Like
[`view-toggle-page-object.md`](view-toggle-page-object.md),
[`theme-toggle-page-object.md`](theme-toggle-page-object.md),
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
`scroll-to-top` driver is consumed today by
[`apps/web-e2e/tests/public/scroll-to-top.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/scroll-to-top.spec.ts),
which covers the floating-button scroll-position flows:

- The button is **hidden at the top** of the home page (`/`)
  before any user scroll has happened — a baseline assertion
  pinning that the production source's scroll-threshold
  predicate fires correctly on the initial viewport position.
- The button **appears after scrolling down** past the
  ~300-pixel threshold the production source uses — the
  spec scrolls 500 pixels to comfortably clear the threshold,
  waits 500 ms for the React-state-driven visibility flip to
  paint, and asserts the `<button>` becomes visible.
- Clicking the button **scrolls the page back to the top** —
  the spec scrolls 800 pixels down, asserts a non-zero
  `scrollY`, clicks the visible button, waits 1 000 ms for
  the scroll animation to settle, and asserts the
  `scrollY` has dropped below 50 pixels (i.e. effectively at
  the top of the page).

A spec that drives the scroll-to-top button inline (via
`page.locator('button[aria-label="Scroll to top"]')`) is a
**drift** that this page object is the canonical replacement
for; new specs that touch the scroll-to-top floating button
must reach for this page object instead.

## At a glance

| Element                                  | Type           | What it is                                                                                                                                                                                                                                                              | Why it matters                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`          | typed import   | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                                  | The public-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports a scroll-to-top driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime. |
| `export class ScrollToTop`               | named export   | Single class declaration with **no `extends` clause** — does not inherit from `BasePage`. The class stands alone with its own `page` field, one button Locator, and three primitive methods (`scrollDown`, `click`, `getScrollY`).                                       | See "Why the class does not extend `BasePage`" below. The choice keeps the driver scoped to **just** the scroll-to-top surface (no header / footer / nav-link assertions leak in), and lets a spec instantiate the driver against any scrollable page (the home page, a long item-detail page, a paginated listing) without paying for the inherited Locators to resolve up-front. |
| `readonly page: Page`                    | field          | Stores the Playwright `Page` handle the constructor receives.                                                                                                                                                                                                            | Every method in the class needs the `Page` handle — `scrollDown` and `getScrollY` reach through it via `page.evaluate(...)`, and `click` reaches through it implicitly via the bound `button` Locator. A `BasePage` subclass would inherit this field; the standalone class restates it. |
| `readonly button: Locator`               | field          | `page.locator('button[aria-label="Scroll to top"]')` — the canonical scroll-to-top button Locator pinned to the **exact** `aria-label="Scroll to top"` attribute (no substring, no `i` flag, no `.first()`).                                                            | The host app's scroll-to-top floating button is rendered exactly once per page with the canonical `aria-label="Scroll to top"` attribute; the exact selector is appropriate because (a) the label is hard-coded English in the production source today (no `next-intl` wrapping yet), (b) there is exactly one scroll-to-top button on every page so `.first()` is unnecessary, and (c) the label is the canonical accessibility primitive a screen reader announces — the e2e selector should pin to the same surface. |
| `constructor(page: Page)`                | constructor   | Stores the `page` and pre-binds the single button Locator in a single pass.                                                                                                                                                                                              | Single constructor signature, no `super(page)` call (because the class does not extend `BasePage`). Every spec instantiates `new ScrollToTop(page)` (no fixture wiring today).                                                                                                                                                                                              |
| `async scrollDown(pixels = 500)`         | method         | `await this.page.evaluate((px) => window.scrollBy(0, px), pixels)` — runs `window.scrollBy(0, pixels)` inside the page context to scroll the document by `pixels` pixels vertically.                                                                                    | The "scroll down to trigger the button to appear" primitive. Defaults to **500 pixels** which comfortably clears the production source's ~300-pixel threshold without overshooting the document end on the home page. The `pixels` parameter lets a spec scroll a precise distance for boundary-condition tests (e.g. exactly 300 pixels to test the threshold edge). |
| `async click()`                          | method         | `await this.button.click()` — single click on the floating button.                                                                                                                                                                                                       | The "go back to the top" primitive. A symmetric one-liner that mirrors `selectList` / `selectGrid` in [`view-toggle-page-object.md`](view-toggle-page-object.md) and `selectLight` / `selectDark` in [`theme-toggle-page-object.md`](theme-toggle-page-object.md). |
| `async getScrollY(): Promise<number>`    | method         | `return this.page.evaluate(() => window.scrollY)` — returns the current vertical scroll position of the page in pixels as a `Promise<number>`.                                                                                                                          | The "what is the current scroll position" accessor. Specs use this both as a precondition assertion (after `scrollDown`, `getScrollY()` should be > 0) and as a postcondition assertion (after `click`, `getScrollY()` should be ~ 0). The `Promise<number>` shape is type-narrowed by `page.evaluate()`'s generic inference. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the scroll-to-top button.
 */
export class ScrollToTop {
	readonly page: Page;
	readonly button: Locator;

	constructor(page: Page) {
		this.page = page;
		this.button = page.locator('button[aria-label="Scroll to top"]');
	}

	/** Scroll down to trigger the button to appear */
	async scrollDown(pixels = 500) {
		await this.page.evaluate((px) => window.scrollBy(0, px), pixels);
	}

	/** Click the scroll-to-top button */
	async click() {
		await this.button.click();
	}

	/** Get current scroll position */
	async getScrollY(): Promise<number> {
		return this.page.evaluate(() => window.scrollY);
	}
}
```

## Why the class does not extend `BasePage`

Three load-bearing reasons the public-tree scroll-to-top
driver stands alone instead of inheriting from
[`base-page-object.md`](base-page-object.md):

- **Composition over inheritance against any host surface.**
  The scroll-to-top button is a global floating widget that
  is rendered on every page in the public tree (and on
  authenticated pages in the admin and client trees too). It
  is not a "page" in the URL sense — every page object that
  represents a navigable URL would need to embed the
  scroll-to-top driver as a composition primitive, not
  inherit from it. Inheriting from `BasePage` would force
  every spec that instantiates the driver to pay for the
  `header` / `footer` / `navLinks` Locator resolution even
  when the spec only needs the scroll-to-top button. The
  standalone class lets a spec compose the driver into a
  larger page object's flow (e.g. a `DiscoverPage` flow that
  scrolls the page and verifies the button appears) without
  inheriting page-shell concerns.
- **Reusability across all role trees.** A future
  admin-shell spec or client-shell spec that drives the
  scroll-to-top button from inside the admin / client
  routes would also be a `ScrollToTop` consumer. Tying the
  driver to `BasePage`'s public-tree-shaped global `header`
  Locator would prevent that reuse without either a base-class
  change or a bespoke admin-tree / client-tree driver.
- **Constructor parity with non-page widgets.** The
  `(page: Page)` signature without a `super(page)` call
  matches every other public-tree widget driver (e.g.
  `theme-toggle.page.ts`, `view-toggle.page.ts`,
  `language-switcher.page.ts`, `share-button.page.ts`,
  `search-bar.page.ts` — all of which mirror this same
  posture). Keeping the inheritance discipline consistent
  across the public-tree widget drivers makes the tree
  scannable for a new contributor.

## Why exact `aria-label="Scroll to top"` and not a substring

Three reasons the driver pins to the production
`aria-label` with the **exact-match** `=` operator instead
of the substring `*=` operator with the `i` (case-insensitive)
flag that sibling drivers use:

- **The label is the canonical accessibility primitive.**
  The host app's scroll-to-top floating button has the
  hard-coded English `aria-label="Scroll to top"` attribute
  today, and that exact phrase is what a screen reader
  announces to a blind user. The e2e selector pinning to the
  exact phrase mirrors what the assistive-technology surface
  reads. A future translation pass that wraps the label in
  `next-intl` would add a t-key indirection, but the
  selector at that point would still pin to the canonical
  English label exposed to the screen reader for the default
  locale.
- **No collision risk requiring substring-tolerance.**
  Unlike the view-toggle's four buttons (where each of `list`
  / `grid` / `masonry` / `map` could appear in label
  variants), the scroll-to-top button has a single canonical
  phrase `"Scroll to top"` with no plausible variant. There
  is no "View as scroll to top" / "Scroll back to top"
  drift to defend against, so the substring tolerance the
  view-toggle / search-bar / theme-toggle drivers use is
  unnecessary here.
- **Strict-mode safety from the single-button shape.**
  There is exactly one scroll-to-top button on every page
  (it is a fixed-position floating widget — a second
  instance would be a UX bug, not a feature). The exact
  selector resolves to a single Locator without needing
  `.first()` for strict-mode discipline. A future regression
  that mounts a second scroll-to-top button (e.g. an
  admin-shell duplicate) would surface as a strict-mode
  violation on every spec — exactly the kind of
  behaviour-change signal the suite wants.

## Why no `.first()` on the button Locator

Three reasons the exact-match selector intentionally omits
the `.first()` pin:

- **Single-instance invariant.** As above, the scroll-to-top
  floating button is a fixed-position widget rendered exactly
  once per page. The strict-mode safety `.first()` provides
  on the four view-toggle buttons (where a future second
  toggle is plausible) is not needed here.
- **Strict-mode signal preservation.** A future regression
  that duplicates the scroll-to-top button (e.g. an
  admin-shell mounts its own copy alongside the public one,
  or a portal-rendered mobile drawer mirrors the desktop
  button) would surface as a strict-mode `Locator resolved
  to N elements` failure on every scroll-to-top spec. That
  failure is exactly the signal the suite wants — `.first()`
  would silently mask the regression by always picking the
  first instance.
- **Symmetric posture with future a11y assertions.** A
  future a11y audit spec that asserts "exactly one
  scroll-to-top button on the page" would use the bare
  `button` Locator's `count()` to confirm `=== 1`. Adding
  `.first()` to the field today would force that future
  spec to either reach through `page.locator(...)` directly
  (drifting from the canonical Locator) or accept the
  obscured count.

## Why `page.evaluate(() => window.scrollBy(0, px), pixels)` for `scrollDown`

Three reasons the driver scrolls via a `page.evaluate()`
call into the page context instead of Playwright's
`page.mouse.wheel()` or `page.keyboard.press('PageDown')`:

- **Deterministic scroll distance.** `window.scrollBy(0, N)`
  scrolls by exactly `N` pixels regardless of the user's
  scroll-wheel acceleration profile, the OS-level
  smooth-scrolling setting, or the page's CSS
  `scroll-behavior`. `page.mouse.wheel(0, N)` synthesises
  N pixels of wheel-delta which can be modulated by the
  browser's wheel-acceleration heuristic, and
  `page.keyboard.press('PageDown')` scrolls by one viewport
  height (variable). The deterministic shape is the right
  posture for a threshold test where the spec needs to scroll
  a precise distance past the production source's scroll
  threshold.
- **No reliance on viewport-shape for `PageDown`.**
  `PageDown`-based scrolling depends on the viewport height
  configured in `playwright.config.ts`, the document's
  scroll container, and any CSS `scroll-padding-block-end`
  on the document element. The `window.scrollBy` shape is
  invariant to all three.
- **Threshold-test ergonomics.** A spec that wants to test
  the exact threshold value (e.g. "the button does not
  appear at scrollY < 300, but does appear at scrollY ===
  300") can pass the precise pixel value to `scrollDown`. A
  spec that uses `page.mouse.wheel` or `PageDown` cannot
  achieve the same precision without computing the wheel
  delta or viewport height.

## Why `pixels = 500` default on `scrollDown`

Three reasons the parameter defaults to `500` rather than
`300` (the threshold value), `400` (a smaller margin), or
`1000` (a larger margin):

- **Comfortable threshold clearance.** The production source
  typically uses a ~300-pixel scroll threshold for floating
  "back to top" buttons. 500 pixels comfortably clears the
  threshold without being so far that a short page (e.g. an
  empty `/discover/1` listing on a fresh content repo) would
  scroll to the document end and clip the post-scroll
  position.
- **Symmetric with the consuming spec's per-test override.**
  The consuming spec at
  [`apps/web-e2e/tests/public/scroll-to-top.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/scroll-to-top.spec.ts)
  overrides the default to `800` for the click-and-return
  test (where it wants to scroll a noticeable distance to
  make the post-click `scrollY < 50` assertion meaningful).
  Specs that don't care about the precise distance — they
  just want to trigger the button to appear — can call
  `scrollDown()` without arguments.
- **Documentation-by-default.** A future contributor reading
  the file sees `pixels = 500` and immediately understands
  the typical threshold-clearance distance without having to
  read the production source. A more-aggressive default like
  `1000` would suggest a different intent ("scroll a long
  way") that the driver does not actually have.

## Why `getScrollY` reads `window.scrollY` and not React state

Three reasons the predicate reads the DOM-level
`window.scrollY` instead of the production source's React
state hook (e.g. `useWindowScroll()` from `react-use` or a
bespoke `useScrollPosition()` hook) or a CSS-variable
fallback (`document.documentElement.style.getPropertyValue
('--scroll-y')`):

- **Production-source-first signal.** The DOM-level
  `window.scrollY` is the **source of truth** for the
  current scroll position; every React state hook that
  tracks scroll position reads from it via a `scroll`
  event listener and reflects the same value. The e2e
  selector pinning to the source rather than to a derived
  surface keeps the driver invariant to React-state
  refactors.
- **No reach-in to React internals.** A spec that reads
  React state directly (via
  `page.evaluate(() => window.__REACT_DEVTOOLS_HOOK__...)`)
  couples the e2e suite to React's internal hook
  representation and breaks on every React major bump or
  Next.js refactor. The DOM-level `window.scrollY` is
  invariant to those changes.
- **Symmetric with the click-and-return assertion.** The
  consuming spec uses `getScrollY()` both before the click
  (to assert "we did scroll down") and after (to assert "we
  scrolled back up"). Both assertions read from the same
  source-of-truth surface, so the read-before / read-after
  shape is symmetric without bespoke wrapping. A
  React-state-aware predicate would have to be careful that
  the state-update event has flushed before the read; the
  DOM-level read is always current.

## Failure matrix

| Mistake on `scroll-to-top.page.ts`                              | Layer that surfaces it                                                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Drop `import type` for `Page` / `Locator`                       | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner.                  |
| Add an `extends BasePage` clause                                | Forces every spec to pay for `header` / `footer` / `navLinks` Locator resolution; couples the driver to page shell. |
| Drop `readonly` from `page` or `button`                         | Cross-test state-leak risk against shared driver instances.                                                       |
| Switch the button to `aria-label*="Scroll" i` substring         | Acceptable change but loses the strict-mode collision signal against future duplicate buttons.                    |
| Switch the button to `data-testid="scroll-to-top"`              | Forces a production-source change purely for the e2e suite — violates the production-source-first selector posture. |
| Add `.first()` to the button Locator                            | Silently masks a future regression that mounts a duplicate scroll-to-top button.                                  |
| Replace `window.scrollBy(0, px)` with `page.mouse.wheel(0, px)` | Wheel acceleration heuristics modulate the actual scroll distance; threshold tests flake.                          |
| Replace `window.scrollBy(0, px)` with `page.keyboard.press('PageDown')` | Scroll distance becomes viewport-height-dependent; threshold tests break on viewport-config changes.            |
| Drop the default `pixels = 500` on `scrollDown`                 | Every consuming spec must pass an explicit value; documentation-by-default is lost.                              |
| Switch `getScrollY` to read React state                         | Couples the e2e suite to React internals; breaks on React major bumps.                                            |
| Drop the `Promise<number>` return type annotation               | Type narrowing relies on `page.evaluate()`'s generic inference; an explicit annotation is defensive.              |
| Move the file out of `apps/web-e2e/page-objects/public/`        | `Cannot find module` on every importing spec.                                                                     |
| Rename `ScrollToTop`                                            | Every importer needs a matching rename.                                                                           |
| Switch the file extension to `.tsx`                             | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks.                                      |
| Drop the trailing newline                                       | Prettier diff.                                                                                                    |
| Ship the file with CRLF line endings                            | Same as above.                                                                                                    |

## Per-line walkthrough

| Line(s) | Code                                                                                                              | Purpose                                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | `import type { Page, Locator } from '@playwright/test';`                                                          | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost.                                                                                                     |
| 3–5     | `/** Page object for the scroll-to-top button. */`                                                                | JSDoc summary that surfaces in IDE hover for every importer.                                                                                                                       |
| 6       | `export class ScrollToTop {`                                                                                      | Single named export, no `extends` clause — see "Why the class does not extend `BasePage`" above.                                                                                   |
| 7       | `readonly page: Page;`                                                                                            | Stores the Playwright `Page` handle the constructor receives.                                                                                                                      |
| 8       | `readonly button: Locator;`                                                                                       | Pre-bound floating button Locator.                                                                                                                                                 |
| 10–13   | `constructor(page: Page) { this.page = page; this.button = page.locator('button[aria-label="Scroll to top"]'); }` | Stores the `page` and pre-binds the single button Locator with the exact-match `aria-label="Scroll to top"` selector. |
| 15      | `/** Scroll down to trigger the button to appear */`                                                              | JSDoc summary for the `scrollDown` primitive.                                                                                                                                       |
| 16–18   | `async scrollDown(pixels = 500) { await this.page.evaluate((px) => window.scrollBy(0, px), pixels); }`           | Runs `window.scrollBy(0, pixels)` inside the page context to scroll the document by `pixels` pixels vertically. Defaults to 500 pixels for comfortable threshold clearance. |
| 20      | `/** Click the scroll-to-top button */`                                                                            | JSDoc summary for the `click` primitive.                                                                                                                                            |
| 21–23   | `async click() { await this.button.click(); }`                                                                    | Single click on the floating button — the "go back to the top" primitive.                                                                                                          |
| 25      | `/** Get current scroll position */`                                                                               | JSDoc summary for the `getScrollY` accessor.                                                                                                                                        |
| 26–28   | `async getScrollY(): Promise<number> { return this.page.evaluate(() => window.scrollY); }`                       | Returns the current vertical scroll position of the page in pixels as a `Promise<number>`. Explicit return-type annotation defends against `page.evaluate()`'s generic inference. |

## Read / write surface

| Caller                                                                                                                                  | Reads                                                                                              | Writes                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/web-e2e/tests/public/scroll-to-top.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/scroll-to-top.spec.ts) | Button visibility checks (`isHidden()` / `isVisible()`); `getScrollY()` boolean assertions before and after click | Calls `scrollDown()` to trigger the button to appear, `scrollDown(800)` to scroll a noticeable distance, `click()` to scroll back to the top.                                                                                                                                          |
| Future smoke / a11y specs                                                                                                              | `button.count()` for "exactly one scroll-to-top button" assertions; `button.getAttribute('aria-label')` for screen-reader audits | Same write surface as today's spec.                                                                                                                                                                                                                                                     |
| Listing-page / item-detail-page production-source components (the production source for the DOM contract)                            | The exact `aria-label="Scroll to top"` attribute and the floating-button visibility threshold      | The visibility flip when the user scrolls past the threshold (via the `useEffect` hook that backs the production source's scroll-position listener).                                                                                                                                    |
| [`e2e-tsconfig.md`](e2e-tsconfig.md)                                                                                                   | The `include: ["./**/*.ts"]` glob picks up this file.                                              | —                                                                                                                                                                                                                                                                                       |
| [`playwright-config.md`](playwright-config.md)                                                                                          | Resolves the relative `/` path the consuming spec navigates to via `baseURL`.                      | —                                                                                                                                                                                                                                                                                       |

### Read / write surface — failure modes

| Drift                                                                                                  | Surfaces as                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production-source rename of the `aria-label` from `"Scroll to top"` to `"Back to top"`                 | Strict-mode `Locator not found` on every visibility assertion; every assertion against `button` fails.                                                                                            |
| Production-source switch from `<button>` to `<a href="#top">` anchor element                          | The `button[aria-label="…"]` resolution fails to find the element; `click()` fails with a Playwright timeout.                                                                                     |
| Production-source switch from a fixed-position floating widget to an inline footer "back to top" link  | The button is not viewport-positioned; the `isVisible()` assertion may flap (visible on mount but not in the same scroll-triggered way).                                                          |
| Production-source switch from the ~300-pixel threshold to a larger threshold (e.g. 1000 pixels)        | The `scrollDown(500)` default no longer clears the threshold; the appearance assertion fails with a "button still hidden after scroll" timeout.                                                   |
| Production-source switch from `useEffect` scroll-listener to a CSS-only `:has(.scrolled)` selector     | The visibility flip is no longer driven by JavaScript; the React-state-aware spec becomes flaky depending on layout-paint timing.                                                                  |
| Production-source `next-intl`-wrapping of the `aria-label`                                             | The exact-match selector breaks for any non-default locale; per-locale specs fail. Mitigation: switch to `aria-label*="…" i` substring at that point.                                              |
| Middleware change that disables JavaScript on a route                                                   | The button never appears (the React state hook never fires); every appearance assertion times out.                                                                                                 |
| `playwright.config.ts` `baseURL` change                                                                | The relative `/` resolves to a different host; the home page does not render the scroll-to-top button.                                                                                            |

## Change checklist

Any change to `scroll-to-top.page.ts` must:

- Audit every spec under `apps/web-e2e/tests/public/scroll-to-top.spec.ts`
  for compatibility with the new shape.
- Cross-check [`base-page-object.md`](base-page-object.md) for the
  `BasePage` posture — if the new shape inherits from `BasePage`,
  document the why.
- Cross-check the production source for the scroll-to-top button
  for the exact `aria-label="Scroll to top"` attribute, the
  fixed-position floating shape, the ~300-pixel scroll threshold,
  and the React-state-driven visibility flip.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for the
  `include: ["./**/*.ts"]` glob coverage.
- Cross-check [`playwright-config.md`](playwright-config.md) for
  the `baseURL` posture the consuming spec relies on.
- Cross-check [`fixtures-index.md`](fixtures-index.md) — today the
  driver is instantiated inline by the consuming spec, but a
  future fixture-bound scroll-to-top would surface here.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the scroll-to-top
  spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "scroll-to-top"`).
- Add a [`docs/log.md`](../log.md) entry describing the change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that affects test
  authoring.
- Reviewer pass.
