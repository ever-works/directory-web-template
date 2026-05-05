---
id: public-pages-page-object
title: E2E Public-Pages Page Object (apps/web-e2e/page-objects/public/public-pages.page.ts)
sidebar_label: E2E Public-Pages Page Object
sidebar_position: 393
---

# E2E Public-Pages Page Object — `apps/web-e2e/page-objects/public/public-pages.page.ts`

Per-source-file reference for the Playwright e2e suite's
**generic public content-page** driver paired with
[`apps/web-e2e/page-objects/public/public-pages.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/public-pages.page.ts).
Sits inside the `public/` page-object subtree, alongside the
thirteen other public-surface page objects
(`discover.page.ts`, `item-detail.page.ts`,
`language-switcher.page.ts`, `map.page.ts`,
`newsletter.page.ts`, `profile-dropdown.page.ts`,
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
[`profile-dropdown-page-object.md`](profile-dropdown-page-object.md)
documents the **suite's header profile-dropdown menu driver
boundary** under `apps/web-e2e/page-objects/public/`, this
page documents the **suite's generic public content-page +
error-page driver boundary** — the smallest possible page
objects that let a spec drive any of the six static / nearly-
static public content routes (`/collections`, `/categories`,
`/tags`, `/cookies`, `/pricing`, `/sponsor`) and the two
error surfaces (404, 403) end-to-end (navigate to a chosen
route via the dedicated `navigateToCollections()` /
`navigateToCategories()` / `navigateToTags()` /
`navigateToCookies()` / `navigateToPricing()` /
`navigateToSponsor()` shortcut methods that close over the
inherited `goto()`, locate the **first** `<h1>` /
`role="heading"` element on the page as the page title
anchor, locate the `<main>` element as the per-route content
container for visibility assertions, locate any
`nav[aria-label*="breadcrumb" i]` or fallback `<nav><ol>`
element as the breadcrumb trail, locate the page heading on
an error page, locate the `404|403` literal text anywhere in
the document for status-code assertions, locate the **first**
`role="link"` matching the case-insensitive `/home/` regex
as the canonical "go home" recovery link, and locate the
**first** `role="button"` matching the case-insensitive
`/go back/i` regex as the canonical browser-history-pop
button).

The file is **the only driver** in the suite for the six
static public content surfaces and the two error surfaces
today. Like
[`item-detail-page-object.md`](item-detail-page-object.md),
[`discover-page-object.md`](discover-page-object.md),
[`map-page-object.md`](map-page-object.md), and
[`signin-page-object.md`](signin-page-object.md), the
`PublicPagesPage` class **does extend `BasePage`** — see "Why
`PublicPagesPage` extends `BasePage`" below for the load-
bearing reasons — so it inherits `header` / `footer` /
`navLinks` / `goto` / `gotoLocalized` / `waitForPageReady` /
`getTitle` from [`base-page-object.md`](base-page-object.md)
and only adds the three per-page Locators
(`heading` / `mainContent` / `breadcrumb`) plus the six
route-shortcut methods on top.

Unlike every other public-tree page object today, this file
exports **two** named classes side-by-side:
`PublicPagesPage` (the content-page driver) and `ErrorPage`
(the error-page driver). Both extend `BasePage`. Splitting
the two would create a one-class-per-file `error.page.ts`
peer that adds nothing — the error surface is structurally a
"public content page that happens to be a 404 / 403", so the
file co-locates the two for the single-import convenience
the consuming specs depend on (see "Why
`PublicPagesPage` and `ErrorPage` co-habit a single file"
below).

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`public-pages` driver is consumed today by:

- [`apps/web-e2e/tests/public/collections.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/collections.spec.ts)
  — three flows over the `/collections` route (loads
  successfully, has a heading, has a breadcrumb).
- The error surface is also consumed indirectly by every
  spec that touches the 404 path, including
  [`apps/web-e2e/tests/public/error-pages.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/error-pages.spec.ts)
  and the `onErrorPage` branch in
  [`apps/web-e2e/tests/public/sponsor.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/sponsor.spec.ts).
- The same driver is the canonical home for any future
  spec under `apps/web-e2e/tests/public/categories.spec.ts`,
  `apps/web-e2e/tests/public/tags.spec.ts`,
  `apps/web-e2e/tests/public/cookies.spec.ts`,
  `apps/web-e2e/tests/public/pricing.spec.ts`, or
  `apps/web-e2e/tests/public/sponsor.spec.ts` that drives the
  same six static content routes.

A spec that drives any of the six static content routes
inline (via `await page.goto('/collections')` +
`await expect(page.getByRole('heading').first()).toBeVisible()`)
is a **drift** that this page object is the canonical
replacement for; new specs that touch any of the six routes
must reach for `PublicPagesPage` instead. Likewise, a spec
that drives an error page inline (via
`await expect(page.getByText(/404|403/)).toBeVisible()`)
is a drift that `ErrorPage` is the canonical replacement
for.

## At a glance

| Element                                  | Type           | What it is                                                                                                                                                                                                                                                              | Why it matters                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`          | typed import   | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                                  | The public-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports a public-pages driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime. |
| `import { BasePage }`                    | runtime import | Value import of the `BasePage` class — this **is** a runtime import, because both `PublicPagesPage` and `ErrorPage` extend `BasePage` and inherit the global `header` / `footer` / `navLinks` Locators plus `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` methods.            | The runtime `BasePage` import is what makes both classes "page-route drivers" rather than "widget drivers" — the inheritance chain is what surfaces the global header / footer / nav-link chrome to every spec that drives a public content page or an error page. The contrast with the standalone widget drivers (`profile-dropdown.page.ts`, `newsletter.page.ts`, `scroll-to-top.page.ts`, `theme-toggle.page.ts`, `view-toggle.page.ts`, `share-button.page.ts`, `star-rating.page.ts`, `sort-menu.page.ts`, `search-bar.page.ts`, `language-switcher.page.ts`) is load-bearing — see "Why `PublicPagesPage` extends `BasePage`" below. |
| `export class PublicPagesPage extends BasePage` | named export | Single class declaration with **the `extends BasePage` clause** — inherits the `page` field, the `header` / `footer` / `navLinks` Locators, and the `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` methods from [`base-page-object.md`](base-page-object.md). The class adds three per-page Locators and six route-shortcut methods on top. | See "Why `PublicPagesPage` extends `BasePage`" below. The choice keeps the driver scoped to the six static / nearly-static public content routes (no auth-gated, no payment-gated routes leak in) while surfacing the global chrome (header navigation, footer signup, breadcrumb trail) to every consuming spec for free. |
| `readonly heading: Locator`              | field          | `page.getByRole('heading').first()` — the **first** `role="heading"` element on the page (which on every static content page is the page's `<h1>` title).                                                                                                                | The "what's the page title" anchor. Specs that drive any of the six routes assert the heading is visible to confirm the route rendered server-side without a 404 / 500. The `.first()` chain is a strict-mode-correctness append against the `<h2>` / `<h3>` siblings that may appear inside the `<main>` content, and `getByRole('heading')` is preferred over `page.locator('h1')` for the accessibility-tree-canonical posture (matches `<h1>`–`<h6>` and `[role="heading"]` indistinguishably). |
| `readonly mainContent: Locator`          | field          | `page.locator('main').first()` — the **first** `<main>` element on the page.                                                                                                                                                                                              | The "where does the per-route content live" container. Specs use this to scope assertions to the route's primary content (skipping the global header / footer / breadcrumb chrome). The `.first()` chain is strict-mode-correctness against the rare possibility of nested `<main>` elements emitted by a future portal / dialog / dynamic-island wrapper. The `<main>` element-tag selector is preferred over `getByRole('main')` for symmetry with the production-source `<main>` element emit (no `role="main"` ARIA attribute is set in the host theme today). |
| `readonly breadcrumb: Locator`           | field          | `page.locator('nav[aria-label*="breadcrumb" i], nav ol').first()` — comma-separated alternation. Matches **either** the canonical accessibility-tagged `<nav aria-label="breadcrumb">` element **or** the structural fallback `<nav><ol>` pattern — whichever the host theme renders, with `.first()` strict-mode-correctness append. | Three reasons for the OR-of-two-paths: (a) the canonical accessibility primitive is `aria-label="breadcrumb"` (case-insensitive via the `i` flag because some themes capitalise `"Breadcrumb"`), (b) the structural fallback `<nav><ol>` matches host themes that emit a breadcrumb without the `aria-label` (still semantic, just less accessibility-friendly), (c) the `.first()` chain is strict-mode-correctness against the rare possibility of multiple breadcrumb trails on a page (e.g. one in the header chrome and one in the per-route content). |
| `constructor(page: Page)`                | constructor    | Stores the `page` (via `super(page)`) and pre-binds the three per-page Locators in a single pass.                                                                                                                                                                          | Single constructor signature, calls `super(page)` first to wire up the inherited `page` / `header` / `footer` / `navLinks` fields, then pre-binds `heading` / `mainContent` / `breadcrumb` in source order. Every spec instantiates `new PublicPagesPage(page)` (no fixture wiring today). |
| `async navigateToCollections()`          | method         | `await this.goto('/collections')` — single navigation primitive that closes over the inherited `goto` method.                                                                                                                                                              | The "open the `/collections` route" primitive. The dedicated method is preferred over an inline `await page.goto('/collections')` for three reasons: (a) the route literal is co-located with the page object and not duplicated across consuming specs, (b) any future change to the route (e.g. a `/collections/all` migration) is a single-file edit, (c) the inherited `goto()` already wires up `waitForPageReady()` so the spec doesn't have to. |
| `async navigateToCategories()`           | method         | `await this.goto('/categories')` — single navigation primitive that closes over the inherited `goto` method.                                                                                                                                                                | The "open the `/categories` route" primitive. Same shape as `navigateToCollections()`. |
| `async navigateToTags()`                 | method         | `await this.goto('/tags')` — single navigation primitive that closes over the inherited `goto` method.                                                                                                                                                                      | The "open the `/tags` route" primitive. Same shape as `navigateToCollections()`. |
| `async navigateToCookies()`              | method         | `await this.goto('/cookies')` — single navigation primitive that closes over the inherited `goto` method.                                                                                                                                                                  | The "open the `/cookies` route" primitive. Same shape as `navigateToCollections()`. |
| `async navigateToPricing()`              | method         | `await this.goto('/pricing')` — single navigation primitive that closes over the inherited `goto` method.                                                                                                                                                                  | The "open the `/pricing` route" primitive. Same shape as `navigateToCollections()`. The `/pricing` route is gated by the host theme's `payment.enabled` config bit — when the bit is `false` the route 404s, and any consuming spec must use the `ErrorPage` peer to assert the 404. |
| `async navigateToSponsor()`              | method         | `await this.goto('/sponsor')` — single navigation primitive that closes over the inherited `goto` method.                                                                                                                                                                  | The "open the `/sponsor` route" primitive. Same shape as `navigateToCollections()`. The `/sponsor` route is gated by the host theme's sponsor-feature config bit — when the bit is `false` the route 404s or redirects to `/sign-in`, and any consuming spec must use the `ErrorPage` peer to assert the 404 (see [`apps/web-e2e/tests/public/sponsor.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/sponsor.spec.ts) for the canonical OR-of-three-statuses assertion `onSignIn \|\| onErrorPage \|\| stayedOnSponsor`). |
| `export class ErrorPage extends BasePage` | named export   | Second class declaration with **the `extends BasePage` clause** — co-habits the same file as `PublicPagesPage` (see "Why `PublicPagesPage` and `ErrorPage` co-habit a single file" below).                                                                                  | The error-page driver boundary. Inherits the same global chrome as `PublicPagesPage` so error-page specs can assert the header / footer survives the 404 / 403 render. |
| `readonly heading: Locator` (`ErrorPage`) | field         | `page.getByRole('heading').first()` — the **first** `role="heading"` element on the error page.                                                                                                                                                                            | Same shape as the `PublicPagesPage.heading` field, intentionally identical: an error page is a content page that happens to be a 404 / 403, so the heading anchor is the same primitive. |
| `readonly errorCode: Locator`            | field          | `page.getByText(/404\|403/)` — case-insensitive text match against the literals `404` or `403` anywhere in the document.                                                                                                                                                    | The "what's the error status code" anchor. Specs use this to assert the error page rendered the correct status code (vs. a generic "Something went wrong" template that hides the actual status). The regex alternation covers the two error surfaces the host theme emits today (404 — not found, 403 — forbidden). |
| `readonly goHomeButton: Locator`         | field          | `page.getByRole('link', { name: /home/i }).first()` — the **first** `role="link"` whose accessible name matches the case-insensitive `/home/i` regex.                                                                                                                       | The "go home recovery link" anchor. Three reasons for the case-insensitive substring regex: (a) the host theme's translation surface emits the link as `"Home"`, `"home"`, `"Go Home"`, `"Back home"`, etc. depending on locale, (b) the `.first()` chain is strict-mode-correctness against any header / footer "Home" links on the same page (which would otherwise collide with the in-content recovery link), (c) the `role="link"` posture matches both `<a>` elements with `href` attributes and `<button>` elements with `role="link"` overrides for visual-vs-functional flexibility. |
| `readonly goBackButton: Locator`         | field          | `page.getByRole('button', { name: /go back/i }).first()` — the **first** `role="button"` whose accessible name matches the case-insensitive `/go back/i` regex.                                                                                                            | The "browser-history-pop button" anchor. Three reasons for the case-insensitive substring regex: (a) the host theme's translation surface emits the button as `"Go Back"`, `"go back"`, `"Back"`, etc. depending on locale (the regex requires the two-word "go back" form for safety against the bare `"Back"` button which might appear in unrelated nav chrome), (b) the `.first()` chain is strict-mode-correctness against any unrelated `"Go back to top"` / `"Go back to listing"` buttons on the same page, (c) the `role="button"` posture (vs. `role="link"`) matches the production-source rendering as a `<button onClick={() => history.back()}>` rather than an `<a href="/">` link. |
| `constructor(page: Page)` (`ErrorPage`)  | constructor    | Stores the `page` (via `super(page)`) and pre-binds the four per-page Locators in a single pass.                                                                                                                                                                            | Single constructor signature, calls `super(page)` first to wire up the inherited `page` / `header` / `footer` / `navLinks` fields, then pre-binds `heading` / `errorCode` / `goHomeButton` / `goBackButton` in source order. Every spec instantiates `new ErrorPage(page)` (no fixture wiring today). |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for public content pages (collections, categories, tags, cookies, pricing).
 */
export class PublicPagesPage extends BasePage {
	readonly heading: Locator;
	readonly mainContent: Locator;
	readonly breadcrumb: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.mainContent = page.locator('main').first();
		this.breadcrumb = page.locator('nav[aria-label*="breadcrumb" i], nav ol').first();
	}

	async navigateToCollections() {
		await this.goto('/collections');
	}

	async navigateToCategories() {
		await this.goto('/categories');
	}

	async navigateToTags() {
		await this.goto('/tags');
	}

	async navigateToCookies() {
		await this.goto('/cookies');
	}

	async navigateToPricing() {
		await this.goto('/pricing');
	}

	async navigateToSponsor() {
		await this.goto('/sponsor');
	}
}

/**
 * Page object for error pages (404, unauthorized).
 */
export class ErrorPage extends BasePage {
	readonly heading: Locator;
	readonly errorCode: Locator;
	readonly goHomeButton: Locator;
	readonly goBackButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.errorCode = page.getByText(/404|403/);
		this.goHomeButton = page.getByRole('link', { name: /home/i }).first();
		this.goBackButton = page.getByRole('button', { name: /go back/i }).first();
	}
}
```

## Why `PublicPagesPage` extends `BasePage`

Three load-bearing reasons:

1. **Page-route navigation via the inherited `goto` method.**
   The six route-shortcut methods (`navigateToCollections`,
   `navigateToCategories`, `navigateToTags`,
   `navigateToCookies`, `navigateToPricing`,
   `navigateToSponsor`) all close over the inherited `goto`
   helper. Without the `extends BasePage` clause, every
   route-shortcut method would have to re-implement the
   `await this.page.goto(path); await this.waitForPageReady();`
   composite — six times over. The `extends` posture lets
   the page object lean on the canonical navigation primitive
   centrally maintained in [`base-page-object.md`](base-page-object.md).
2. **Global `header` / `footer` / `navLinks` chrome surfaced
   for free.** Every static public content route renders the
   global header (with the navigation links, the language
   switcher, the theme toggle, the profile dropdown if
   authenticated) and the global footer (with the newsletter
   signup, the legal links, the social links). The
   `BasePage` parent pre-binds these as inherited Locators
   (`header`, `footer`, `navLinks`) so consuming specs can
   assert the chrome rendered correctly on any of the six
   routes without re-binding the Locators.
3. **`waitForPageReady` post-navigation stabiliser.** The
   inherited `waitForPageReady` method (which the inherited
   `goto` calls automatically) is the single source of truth
   for "the route has finished hydrating" — it waits for the
   `networkidle` state and the React hydration boundary. The
   `extends` posture ties every route-shortcut method to the
   same stabiliser without re-stating the wait.

The contrast with the **standalone widget drivers**
(`profile-dropdown.page.ts`, `newsletter.page.ts`,
`scroll-to-top.page.ts`, `theme-toggle.page.ts`,
`view-toggle.page.ts`, `share-button.page.ts`,
`star-rating.page.ts`, `sort-menu.page.ts`,
`search-bar.page.ts`, `language-switcher.page.ts`) is load-
bearing — those drivers all stand alone with their own
`page` field because they drive a sub-page widget that does
not own the page route, while `PublicPagesPage` and
`ErrorPage` drive the route itself.

## Why `PublicPagesPage` and `ErrorPage` co-habit a single file

Three load-bearing reasons:

1. **An error page is a content page that happens to be a
   404 / 403.** The structural primitives are the same
   (`role="heading"` first element, `<main>` content
   container, recovery `role="link"` to home). Splitting the
   two would create a one-class-per-file `error.page.ts`
   peer that adds nothing — the file system would carry an
   extra file just to mirror the conceptual partition.
2. **The two classes share the same `BasePage` import and
   the same `Page, Locator` type-only import.** Splitting
   the two would duplicate both imports across two files
   for no payoff.
3. **The two classes are consumed together by every spec
   that drives a feature-flag-gated route.** A spec that
   drives `/sponsor` must drive **both** `PublicPagesPage`
   (when the feature is enabled) and `ErrorPage` (when the
   feature is disabled and the route 404s). Co-habiting the
   two in a single file lets the consuming spec import both
   in a single line: `import { PublicPagesPage, ErrorPage } from '../../page-objects/public/public-pages.page';`.

A four-class-per-file outlier (one class per
public route plus an error class) would still be the
wrong factoring: the routes share the **same** structural
primitives, and any future "add a new public content page"
work is a single new method on `PublicPagesPage` — not a
new file.

## Why `heading` uses `getByRole('heading').first()`

Three load-bearing reasons:

1. **Accessibility-tree-canonical posture.**
   `getByRole('heading')` matches both `<h1>`–`<h6>` element
   tags **and** any `[role="heading"]` ARIA attribute
   override indistinguishably. A spec that drives the
   `/collections` route should not break if a future host-
   theme refactor swaps the `<h1>` for a `<div role="heading" aria-level="1">`
   (which is allowed by the accessibility tree but not by a
   `page.locator('h1')` selector).
2. **Strict-mode-correctness.** The static public content
   pages emit the page title as the **first** `<h1>` and any
   `<h2>` / `<h3>` siblings inside the `<main>` content as
   sub-headings. Without the `.first()` chain, Playwright's
   strict mode flags the multiple-element collision as an
   error.
3. **Locale-stable selector.** The `role="heading"` axis is
   independent of the heading text, so a locale change that
   translates the page title from `"Collections"` to
   `"Sammlungen"` (German) doesn't break the heading anchor.

## Why `breadcrumb` uses an OR-of-two-paths

Three load-bearing reasons:

1. **The canonical accessibility primitive is
   `aria-label="breadcrumb"`.** The W3C ARIA Authoring
   Practices Guide for breadcrumbs recommends a
   `<nav aria-label="breadcrumb">` wrapper. The
   case-insensitive `*=` substring match handles host themes
   that capitalise the label (`"Breadcrumb"`) or pluralise
   it (`"Breadcrumbs"`).
2. **The structural fallback `<nav><ol>` matches host themes
   without the `aria-label`.** The fallback path keeps the
   selector resilient against host-theme drift — a theme
   that emits the breadcrumb as a semantic `<nav><ol>`
   without the explicit `aria-label` is still detected.
3. **Strict-mode-correctness via `.first()`.** The
   alternation could match multiple breadcrumb trails on a
   page (e.g. one in the header chrome and one in the per-
   route content), so the `.first()` chain is required to
   keep the Locator strict-mode-correct.

## Why `errorCode` uses `getByText(/404|403/)`

Three load-bearing reasons:

1. **The error code is the primary user-facing
   discriminator.** A user landing on a 404 page must see
   the literal `"404"` to know what happened — and the same
   for `"403"`. The regex alternation covers the two error
   surfaces the host theme emits today.
2. **The case-insensitive default of `getByText` is
   irrelevant for digits** but the regex form (vs. a string
   form) is preferred because it prevents a future
   `"It's a 4040 error"` typo / nested-error-code from
   matching the same selector.
3. **No `.first()` is required** because the error code is
   emitted exactly once on the canonical error template. A
   future regression that emits the error code multiple
   times would surface as a strict-mode collision and a
   spec failure — which is the desired signal.

## Why `goHomeButton` uses `role="link"` (not `role="button"`)

Three load-bearing reasons:

1. **The "go home" recovery link is a navigation primitive
   to `/`,** which is canonically an `<a href="/">` element
   with a `role="link"` accessibility role (vs. a
   `<button onClick={() => router.push('/')}>` which would
   carry `role="button"`). The host theme renders it as the
   former today.
2. **The `.first()` chain is strict-mode-correctness**
   against any header / footer "Home" links on the same
   page (which would otherwise collide with the in-content
   recovery link).
3. **The case-insensitive substring regex `/home/i`** lets
   the selector survive locale / casing drift across the
   host-theme translations (`"Home"`, `"home"`, `"Go Home"`,
   `"Back home"`, etc.). The regex is intentionally
   permissive — a future regression that translates the
   link to `"Главная"` (Russian for "main page") would
   require an explicit translation-table cross-check, but
   any English-derivative host-theme variant is covered.

## Why `goBackButton` uses `role="button"` (not `role="link"`)

Three load-bearing reasons:

1. **The "go back" button is a browser-history-pop
   primitive,** which is canonically a
   `<button onClick={() => history.back()}>` element with a
   `role="button"` accessibility role (vs. an `<a href="…">`
   which would carry `role="link"`). The host theme renders
   it as the former today.
2. **The case-insensitive substring regex `/go back/i`**
   requires the two-word "go back" form for safety against
   the bare `"Back"` button which might appear in unrelated
   navigation chrome (e.g. a "Back to listing" button on a
   detail page).
3. **The `.first()` chain is strict-mode-correctness**
   against any unrelated `"Go back to top"` / `"Go back to
   listing"` buttons on the same page.

## Failure matrix

| Mistake                                                                                                   | What breaks                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Drop the `import type` modifier                                                                            | Adds runtime cost on every spec that imports the public-pages driver, opens the door to circular-import drift against the runner's `test` export.                                                                                                                                                                                                |
| Drop the `extends BasePage` clause on either class                                                         | Removes the inherited `goto` / `waitForPageReady` / `getTitle` methods and the inherited `header` / `footer` / `navLinks` Locators from every consuming spec — every route-shortcut method would have to re-implement the navigation composite, every spec would have to re-bind the global chrome Locators.                                  |
| Drop `readonly` on any of the seven Locator fields                                                         | Allows mutation of the pre-bound Locators after construction, defeats the constructor's "single-pass binding" invariant, opens the door to mid-spec re-binding bugs.                                                                                                                                                                              |
| Drop `super(page)` from either constructor                                                                 | Crashes at construction time — TypeScript's strict mode requires `super(...)` before any `this.x = ...` access in a derived class constructor. Without the `super(page)` call, the inherited `page` / `header` / `footer` / `navLinks` fields are unset and every consuming spec breaks on the first inherited Locator access.              |
| Drop the `.first()` chain on `heading`                                                                     | Collides with the `<h2>` / `<h3>` sub-headings inside the `<main>` content under Playwright's strict mode, fails every consuming spec.                                                                                                                                                                                                            |
| Drop the `.first()` chain on `mainContent`                                                                 | Collides with any future nested `<main>` element emitted by a portal / dialog / dynamic-island wrapper under strict mode, fails every consuming spec.                                                                                                                                                                                            |
| Drop the OR-of-two-paths alternation in `breadcrumb`                                                       | Selecting only `nav[aria-label*="breadcrumb" i]` breaks host themes that emit the breadcrumb without the `aria-label`; selecting only `nav ol` breaks host themes that wrap the breadcrumb in a `<nav>` without an `<ol>` (e.g. a `<nav><ul>` variant).                                                                                          |
| Drop the `i` flag on the `breadcrumb`'s `aria-label*=` substring match                                     | Breaks host themes that capitalise the `aria-label` (`"Breadcrumb"`).                                                                                                                                                                                                                                                                              |
| Drop the `.first()` chain on `breadcrumb`                                                                  | Collides with multiple breadcrumb trails on a page (e.g. one in the header chrome and one in the per-route content) under strict mode.                                                                                                                                                                                                            |
| Re-bind `breadcrumb` to `getByRole('navigation', { name: /breadcrumb/i })`                                 | Hides the structural-fallback `<nav><ol>` path, breaks host themes without the explicit `aria-label`.                                                                                                                                                                                                                                              |
| Re-bind `heading` to `page.locator('h1')`                                                                  | Breaks host themes that emit the page title as a `<div role="heading" aria-level="1">` (allowed by the accessibility tree but not by a `<h1>` element-tag selector).                                                                                                                                                                              |
| Re-bind `mainContent` to `getByRole('main')`                                                               | Breaks the host theme today (which emits a `<main>` element-tag without the explicit `role="main"` ARIA attribute).                                                                                                                                                                                                                                |
| Re-bind any of the six route literals (e.g. `'/collections'` → `'/all-collections'`)                       | Breaks every consuming spec that drives the corresponding route. Acceptable only as part of a coordinated route-rename refactor, with a follow-up `docs/log.md` entry and a cross-check against the host-theme's middleware / sitemap.                                                                                                              |
| Inline the `page.goto(path)` in any of the six route-shortcut methods (replace `await this.goto(path)`)    | Drops the inherited `waitForPageReady` post-navigation stabiliser, causes flaky-on-slow-CI failures across every consuming spec.                                                                                                                                                                                                                  |
| Drop the `getByText(/404\|403/)` regex alternation in `errorCode`                                          | Selecting only `getByText('404')` breaks the 403 surface; selecting only `getByText('403')` breaks the 404 surface.                                                                                                                                                                                                                                |
| Re-bind `goHomeButton` to `role="button"`                                                                  | Breaks the host theme today (which emits the recovery link as an `<a href="/">` with `role="link"`).                                                                                                                                                                                                                                              |
| Drop the `i` flag on `goHomeButton`'s `/home/i` regex                                                      | Breaks host themes that emit the link as `"home"` (lowercase) or `"HOME"` (uppercase).                                                                                                                                                                                                                                                              |
| Re-bind `goHomeButton` to `name: 'Home'` (exact-string match, not regex)                                   | Breaks host themes that emit the link as `"Go Home"` / `"Back home"` / `"Back to home"`. The case-insensitive substring regex covers all variants.                                                                                                                                                                                                |
| Drop the `.first()` chain on `goHomeButton`                                                                | Collides with any header / footer "Home" links on the same page under strict mode.                                                                                                                                                                                                                                                                  |
| Re-bind `goBackButton` to `role="link"`                                                                    | Breaks the host theme today (which emits the browser-history-pop button as a `<button onClick={() => history.back()}>` with `role="button"`).                                                                                                                                                                                                      |
| Drop the `i` flag on `goBackButton`'s `/go back/i` regex                                                   | Breaks host themes that emit the button as `"go back"` (lowercase) or `"GO BACK"` (uppercase).                                                                                                                                                                                                                                                      |
| Re-bind `goBackButton` to `name: /back/i` (single-word match)                                              | Collides with the bare `"Back"` button which might appear in unrelated navigation chrome (e.g. a "Back to listing" button on a detail page). The two-word "go back" form is the safety lock.                                                                                                                                                       |
| Drop the `.first()` chain on `goBackButton`                                                                | Collides with any unrelated `"Go back to top"` / `"Go back to listing"` buttons on the same page under strict mode.                                                                                                                                                                                                                                  |
| Split the file into `public-pages.page.ts` and `error.page.ts`                                             | Duplicates the `import type { Page, Locator }` and `import { BasePage }` lines, breaks the canonical single-import convenience for consuming specs that use both classes (e.g. `apps/web-e2e/tests/public/sponsor.spec.ts`'s `onErrorPage` branch).                                                                                                |
| Move the file outside `apps/web-e2e/page-objects/public/`                                                  | Breaks the conventional path for public-tree page objects, breaks every relative `import` from consuming specs (`../../page-objects/public/public-pages.page`).                                                                                                                                                                                  |
| Rename the file to `public-pages.page.tsx`                                                                  | Breaks the `apps/web-e2e/tsconfig.json` `include` glob (`./**/*.ts` only), drops the file from the type-checker.                                                                                                                                                                                                                                  |
| Rename either class                                                                                        | Breaks every consuming spec's `import { PublicPagesPage, ErrorPage } from '...';` statement.                                                                                                                                                                                                                                                       |
| Commit the file with CRLF line endings                                                                     | Breaks the `.gitattributes` `* text=auto eol=lf` policy, surfaces as noisy whitespace-only diffs in every PR.                                                                                                                                                                                                                                       |

## Per-line walkthrough

| Line | Source                                                                                                | Purpose                                                                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `import type { Page, Locator } from '@playwright/test';`                                              | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                     |
| 2    | `import { BasePage } from '../base.page';`                                                            | Runtime import of the `BasePage` class — both `PublicPagesPage` and `ErrorPage` extend `BasePage`.                                                         |
| 4–6  | JSDoc comment for `PublicPagesPage`                                                                   | Documents the route surface (`/collections`, `/categories`, `/tags`, `/cookies`, `/pricing`).                                                              |
| 7    | `export class PublicPagesPage extends BasePage {`                                                     | Single named export with the `extends BasePage` clause — the page-route driver posture.                                                                    |
| 8    | `readonly heading: Locator;`                                                                          | Pre-bound first `role="heading"` element on the page.                                                                                                       |
| 9    | `readonly mainContent: Locator;`                                                                      | Pre-bound first `<main>` element on the page.                                                                                                                |
| 10   | `readonly breadcrumb: Locator;`                                                                       | Pre-bound first breadcrumb trail (either `<nav aria-label="breadcrumb">` or fallback `<nav><ol>`).                                                            |
| 12   | `constructor(page: Page) {`                                                                            | Single constructor signature.                                                                                                                                |
| 13   | `super(page);`                                                                                         | Wires up the inherited `page` / `header` / `footer` / `navLinks` fields via `BasePage`'s constructor.                                                       |
| 14   | `this.heading = page.getByRole('heading').first();`                                                    | Pre-binds the page heading anchor.                                                                                                                            |
| 15   | `this.mainContent = page.locator('main').first();`                                                     | Pre-binds the per-route content container.                                                                                                                    |
| 16   | `this.breadcrumb = page.locator('nav[aria-label*="breadcrumb" i], nav ol').first();`                   | Pre-binds the breadcrumb trail with the OR-of-two-paths alternation.                                                                                          |
| 19–21 | `async navigateToCollections() { await this.goto('/collections'); }`                                  | The `/collections` route shortcut.                                                                                                                            |
| 23–25 | `async navigateToCategories() { await this.goto('/categories'); }`                                    | The `/categories` route shortcut.                                                                                                                              |
| 27–29 | `async navigateToTags() { await this.goto('/tags'); }`                                                | The `/tags` route shortcut.                                                                                                                                    |
| 31–33 | `async navigateToCookies() { await this.goto('/cookies'); }`                                          | The `/cookies` route shortcut.                                                                                                                                  |
| 35–37 | `async navigateToPricing() { await this.goto('/pricing'); }`                                          | The `/pricing` route shortcut.                                                                                                                                  |
| 39–41 | `async navigateToSponsor() { await this.goto('/sponsor'); }`                                          | The `/sponsor` route shortcut.                                                                                                                                  |
| 45–47 | JSDoc comment for `ErrorPage`                                                                         | Documents the error surface (404, 403).                                                                                                                       |
| 48   | `export class ErrorPage extends BasePage {`                                                           | Second named export with the `extends BasePage` clause — the error-page driver posture.                                                                       |
| 49   | `readonly heading: Locator;`                                                                          | Pre-bound first `role="heading"` element on the error page.                                                                                                    |
| 50   | `readonly errorCode: Locator;`                                                                        | Pre-bound `404|403` literal text anywhere in the document.                                                                                                      |
| 51   | `readonly goHomeButton: Locator;`                                                                     | Pre-bound first `role="link"` matching `/home/i` — the "go home" recovery link.                                                                                  |
| 52   | `readonly goBackButton: Locator;`                                                                     | Pre-bound first `role="button"` matching `/go back/i` — the browser-history-pop button.                                                                          |
| 54   | `constructor(page: Page) {`                                                                            | Single constructor signature.                                                                                                                                  |
| 55   | `super(page);`                                                                                         | Wires up the inherited `page` / `header` / `footer` / `navLinks` fields via `BasePage`'s constructor.                                                          |
| 56   | `this.heading = page.getByRole('heading').first();`                                                    | Pre-binds the error-page heading anchor.                                                                                                                        |
| 57   | `this.errorCode = page.getByText(/404\|403/);`                                                          | Pre-binds the error code text anchor.                                                                                                                            |
| 58   | `this.goHomeButton = page.getByRole('link', { name: /home/i }).first();`                              | Pre-binds the "go home" recovery link anchor.                                                                                                                    |
| 59   | `this.goBackButton = page.getByRole('button', { name: /go back/i }).first();`                          | Pre-binds the "go back" browser-history-pop button anchor.                                                                                                       |

## Read / write surface

| Caller                                                                                                                                                                                | Reads / Writes                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/web-e2e/tests/public/collections.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/collections.spec.ts)                    | Reads `PublicPagesPage` — three flows over `/collections` (loads successfully via `navigateToCollections()`, has a heading via `heading.toBeVisible()`, has a breadcrumb via `breadcrumb.isVisible()`).                                                                                                                                  |
| [`apps/web-e2e/tests/public/sponsor.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/sponsor.spec.ts)                            | Reads the `onErrorPage` branch of the OR-of-three-statuses assertion (`onSignIn \|\| onErrorPage \|\| stayedOnSponsor`) — the spec doesn't import `ErrorPage` directly today (it inlines the `status === 404` check), but the canonical replacement is the `ErrorPage` driver and a future refactor would import it.                          |
| [`apps/web-e2e/tests/public/error-pages.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/error-pages.spec.ts)                    | Indirectly reads the same error-page DOM contract that `ErrorPage` exposes (404 status code, "go home" link). A future refactor would import `ErrorPage` directly.                                                                                                                                                                          |
| Future `apps/web-e2e/tests/public/categories.spec.ts` / `tags.spec.ts` / `cookies.spec.ts` / `pricing.spec.ts`                                                                        | Reads `PublicPagesPage` — same shape as `collections.spec.ts` but pinned to the corresponding route shortcut.                                                                                                                                                                                                                              |
| Production-source DOM contract under `apps/web/app/[lang]/collections/` / `categories/` / `tags/` / `cookies/` / `pricing/` / `sponsor/`                                              | Pre-binds the `<h1>` page title, the `<main>` content container, and the breadcrumb trail (either `<nav aria-label="breadcrumb">` or `<nav><ol>`) on each of the six routes. A regression that drops any of these primitives breaks the corresponding consuming spec.                                                                       |
| Production-source error-page DOM contract under `apps/web/app/not-found.tsx` / `apps/web/app/error.tsx`                                                                                | Pre-binds the `404|403` literal text, the "go home" recovery link (`<a href="/">`), and the "go back" browser-history-pop button (`<button onClick={() => history.back()}>`). A regression that drops any of these primitives breaks the corresponding consuming spec.                                                                       |
| [`base-page-object.md`](base-page-object.md)                                                                                                                                          | Inherits the `page` / `header` / `footer` / `navLinks` fields and the `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` methods.                                                                                                                                                                                                  |
| [`e2e-tsconfig.md`](e2e-tsconfig.md)                                                                                                                                                  | The `apps/web-e2e/tsconfig.json`'s `include: ["./**/*.ts"]` glob picks up this file and runs the type-checker over it on every `pnpm tsc --noEmit` run.                                                                                                                                                                                       |
| [`playwright-config.md`](playwright-config.md)                                                                                                                                        | The `playwright.config.ts`'s `baseURL` is what the inherited `goto('/collections')` resolves against.                                                                                                                                                                                                                                       |
| [`fixtures-index.md`](fixtures-index.md)                                                                                                                                              | A future `authenticatedPage` fixture would let consuming specs drive `/sponsor` (which is gated by a feature flag and on some tenants requires authentication) without manually wiring up the cookie session.                                                                                                                                |

## Read / write surface failure modes

| Failure                                                                                                | What breaks                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production-source `/collections` route renamed to `/all-collections`                                    | Breaks `navigateToCollections()` and every consuming spec that uses it. Recovery: update the route literal in the page object, regenerate any URL-rewrites in middleware / sitemap, run a smoke-subset Playwright run targeting the collections spec subset.                                                                                                                |
| Production-source `<h1>` swapped for a `<div role="heading" aria-level="1">`                            | Survives because `getByRole('heading')` matches both the element-tag and the ARIA-attribute path. The accessibility-tree-canonical posture pays off here.                                                                                                                                                                                                                       |
| Production-source `<main>` swapped for a `<div role="main">`                                            | Breaks `mainContent` because the selector pins to the `<main>` element-tag (not the `role="main"` ARIA attribute). Recovery: re-bind `mainContent` to `getByRole('main')` after the host-theme change.                                                                                                                                                                          |
| Host-theme breadcrumb refactor swaps `<nav><ol>` for a `<div role="navigation"><ul>` structure         | Breaks `breadcrumb`'s structural fallback path. Recovery: extend the `breadcrumb` selector to add the new structure (`'nav[aria-label*="breadcrumb" i], nav ol, [role="navigation"][aria-label*="breadcrumb" i] ul'`).                                                                                                                                                            |
| `payment.enabled` config bit flipped to `false`                                                          | The `/pricing` route 404s on tenants with the bit off. Consuming specs that use `navigateToPricing()` must also use `ErrorPage` to assert the 404 (via `errorCode.toBeVisible()`). The two classes co-habiting the file is the canonical accommodation.                                                                                                                          |
| Sponsor feature flag flipped to `false`                                                                 | The `/sponsor` route 404s or redirects to `/sign-in` on tenants with the flag off. The OR-of-three-statuses assertion in `apps/web-e2e/tests/public/sponsor.spec.ts` survives this. A future refactor would route the 404 branch through `ErrorPage`.                                                                                                                            |
| Production-source error-page template renamed `404` to `Not Found`                                     | Breaks `errorCode` because the regex pins to the literal `404` / `403`. Recovery: extend the `errorCode` selector to add the textual variants (`page.getByText(/404\|403\|Not Found\|Forbidden/)`).                                                                                                                                                                                |
| Locale change with translated "Home" link to `"Главная"`                                                 | Breaks `goHomeButton` because the regex pins to the English-derivative `/home/i`. Recovery: switch to the locale-stable `<a href="/">` selector (`page.locator('a[href="/"]')`) or extend the regex to cover the new locale.                                                                                                                                                       |
| Locale change with translated "Go back" button to `"Вернуться назад"`                                    | Breaks `goBackButton` because the regex pins to the English-derivative `/go back/i`. Recovery: switch to the locale-stable `<button onClick={() => history.back()}>` selector (which doesn't have a stable accessibility name across locales) or extend the regex to cover the new locale.                                                                                          |
| Middleware prefix change (e.g. add a tenant prefix `/[tenant]/collections`)                              | Breaks every route shortcut because the literals are absolute. Recovery: switch to `gotoLocalized()` and pass the tenant prefix as a parameter.                                                                                                                                                                                                                                  |
| `playwright-config.md`'s `baseURL` change                                                                 | Survives because the route shortcuts are relative paths and the inherited `goto` resolves them against the `baseURL`.                                                                                                                                                                                                                                                          |

## `public-pages.page.ts` change checklist

Whenever you touch this file, work through this checklist
before opening the PR:

1. **Audit consuming specs.** Run a `grep -rn "PublicPagesPage\|ErrorPage" apps/web-e2e/tests/`
   to find every consumer. Check `apps/web-e2e/tests/public/collections.spec.ts`
   and `apps/web-e2e/tests/public/sponsor.spec.ts` at minimum. Add the future
   consumers that the page object intends to support
   (`categories.spec.ts`, `tags.spec.ts`, `cookies.spec.ts`,
   `pricing.spec.ts`, `error-pages.spec.ts`).
2. **Cross-check [`base-page-object.md`](base-page-object.md).**
   If you change the inherited surface (`page`, `header`,
   `footer`, `navLinks`, `goto`, `gotoLocalized`,
   `waitForPageReady`, `getTitle`), the change rolls through
   to every page object in the suite — coordinate with the
   inheritance root.
3. **Cross-check the production-source DOM contract.** Open
   `apps/web/app/[lang]/collections/page.tsx` /
   `categories/page.tsx` / `tags/page.tsx` /
   `cookies/page.tsx` / `pricing/page.tsx` /
   `sponsor/page.tsx` and confirm the `<h1>`, `<main>`, and
   breadcrumb primitives are all still rendered.
4. **Cross-check the production-source error-page contract.**
   Open `apps/web/app/not-found.tsx` and `apps/web/app/error.tsx`
   and confirm the `404` / `403` literal, the `<a href="/">`
   "go home" link, and the `<button>` "go back" button are
   all still rendered.
5. **Cross-check the route literals against the host-theme
   middleware.** The six routes (`/collections`,
   `/categories`, `/tags`, `/cookies`, `/pricing`,
   `/sponsor`) must all resolve to a 200 (or a 404 for
   feature-flag-gated routes) under the host-theme's
   middleware configuration.
6. **Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md).** The
   `include: ["./**/*.ts"]` glob picks up this file. Confirm
   the file extension stays `.ts` (not `.tsx`).
7. **Cross-check [`playwright-config.md`](playwright-config.md).**
   The `baseURL` is what the route shortcuts resolve
   against.
8. **Cross-check [`fixtures-index.md`](fixtures-index.md).**
   A future `authenticatedPage` fixture would let consuming
   specs drive the auth-gated `/sponsor` route variant.
9. **Run dual `pnpm tsc --noEmit`.** Once for the e2e
   package (`pnpm --filter @ever-works/web-e2e tsc --noEmit`)
   and once for the workspace root (`pnpm tsc --noEmit`) to
   pin any type-level drift.
10. **Run a smoke-subset Playwright run** targeting the
    public-pages spec subset (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Collections \|Categories \|Tags \|Cookies \|Pricing \|Sponsor \|Error"`).
11. **Add a [`docs/log.md`](../log.md) entry** describing
    the change ("`docs/plugins/public-pages-page-object` —
    add per-source-file reference for the public-pages
    page-object").
12. **Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)**
    if the change introduces a new shared concept that
    affects test authoring.
13. **Reviewer pass.** A second set of eyes on the
    public-pages selectors and the route literals catches
    most of the failure-matrix mistakes.

## Cross-links

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root every concrete page object extends.
- [`profile-dropdown-page-object.md`](profile-dropdown-page-object.md)
  — the suite's header profile-dropdown menu driver
  boundary.
- [`newsletter-page-object.md`](newsletter-page-object.md)
  — the suite's footer newsletter-signup widget driver
  boundary.
- [`map-page-object.md`](map-page-object.md) — the suite's
  Map View page-route driver boundary.
- [`item-detail-page-object.md`](item-detail-page-object.md)
  — the suite's per-item detail-page driver boundary.
- [`discover-page-object.md`](discover-page-object.md) —
  the suite's `/discover` listing-page driver boundary.
- [`signin-page-object.md`](signin-page-object.md) — the
  suite's auth-tree sign-in form driver boundary.
- [`scroll-to-top-page-object.md`](scroll-to-top-page-object.md)
  — the suite's scroll-position driver boundary.
- [`view-toggle-page-object.md`](view-toggle-page-object.md)
  — the suite's listing view-mode driver boundary.
- [`theme-toggle-page-object.md`](theme-toggle-page-object.md)
  — the suite's theme-mode driver boundary.
- [`star-rating-page-object.md`](star-rating-page-object.md)
  — the suite's star-rating driver boundary.
- [`sort-menu-page-object.md`](sort-menu-page-object.md) —
  the suite's sort-menu driver boundary.
- [`share-button-page-object.md`](share-button-page-object.md)
  — the suite's share-button driver boundary.
- [`search-bar-page-object.md`](search-bar-page-object.md)
  — the suite's search-bar driver boundary.
- [`language-switcher-page-object.md`](language-switcher-page-object.md)
  — the suite's language-switcher driver boundary.
- [`e2e-tsconfig.md`](e2e-tsconfig.md) — the type-checker
  configuration that picks up this file.
- [`playwright-config.md`](playwright-config.md) — the
  `baseURL` the route shortcuts resolve against.
- [`fixtures-index.md`](fixtures-index.md) — the fixture
  surface for a future authenticated-route variant.
- [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  — the home spec for the Playwright e2e suite.
