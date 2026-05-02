---
id: discover-page-object
title: E2E Discover Page Object (apps/web-e2e/page-objects/public/discover.page.ts)
sidebar_label: E2E Discover Page Object
sidebar_position: 381
---

# E2E Discover Page Object — `apps/web-e2e/page-objects/public/discover.page.ts`

Per-source-file reference for the Playwright e2e suite's
public directory-listing driver paired with
[`apps/web-e2e/page-objects/public/discover.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/discover.page.ts).
Sits inside the `public/` page-object subtree, alongside the
fourteen other public-surface page objects
(`item-detail.page.ts`, `language-switcher.page.ts`,
`map.page.ts`, `newsletter.page.ts`,
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
[`theme-toggle-page-object.md`](theme-toggle-page-object.md)
documents the **suite's theme-switch driver boundary** under
`apps/web-e2e/page-objects/public/`, this page documents the
**suite's directory-listing driver boundary** — the smallest
possible page object that lets a spec drive `/discover/[N]`
end-to-end (navigate to a page in the directory, count the
items rendered, click into the first item, observe the
pagination control).

The class **does extend `BasePage`** — see "Why the class
extends `BasePage`" below for the load-bearing reason — so
it inherits `header` / `footer` / `navLinks` / `goto` /
`gotoLocalized` / `waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md).

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`discover` driver is consumed today by:

- [`apps/web-e2e/tests/public/discover.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/discover.spec.ts)
  — three flows: items rendered on page 1, click-into-detail
  navigation, pagination control visibility / navigation.
- [`apps/web-e2e/tests/public/map.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/map.spec.ts)
  — uses the same driver to seed a "the directory has items"
  precondition before the map spec navigates to `/map`.

A spec that drives the directory listing inline (via
`page.locator('a[href*="/items/"]')`) is a **drift** that
this page object is the canonical replacement for; new
specs that touch `/discover/[N]` must reach for this page
object instead.

## At a glance

| Element                                  | Type           | What it is                                                                                                                                                                                                                                                              | Why it matters                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`          | typed import   | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                                  | The public-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports a directory-listing driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the page-object inheritance root.                                                                                                                                                                                                                  | The driver inherits `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` and the structural Locators `header` / `footer` / `navLinks`. Importing from `../base.page` (relative path) — not the package's public surface — is deliberate: the page-object tree is not a published package surface.                                                                  |
| `export class DiscoverPage extends BasePage` | named export | Single class declaration that **does extend `BasePage`** — inherits the page-shell Locators and the navigation primitives.                                                                                                                                            | See "Why the class extends `BasePage`" below. Unlike `theme-toggle.page.ts` (a header-mounted widget driver), `DiscoverPage` represents an **actual page** in the URL sense (`/discover/[N]`) and benefits from the shared `goto` / `waitForPageReady` posture.                                                                                                          |
| `readonly itemLinks: Locator`            | field          | `page.locator('a[href*="/items/"]')` — every directory-card link on the page, scoped by the `/items/` substring.                                                                                                                                                       | The directory cards link to item-detail routes at `/items/[slug]`; the `href*=` substring selector survives every locale prefix (`/en/items/…` / `/fr/items/…`) and every slug shape. Used by `getItemCount()` and `clickFirstItem()`.                                                                                                                                  |
| `readonly pagination: Locator`           | field          | `page.locator('nav[aria-label*="pagination"], nav[aria-label*="Pagination"]')` — the pagination `<nav>` landmark, case-insensitive on the `aria-label`.                                                                                                                | The host app's pagination component renders a `<nav aria-label="Pagination">` landmark. The dual-substring selector tolerates the case drift (`pagination` vs `Pagination`) the production source has shipped over time.                                                                                                                                              |
| `readonly heading: Locator`              | field          | `page.getByRole('heading', { level: 1 })` — the H1 the directory page renders.                                                                                                                                                                                          | Role-based heading lookup survives translation churn (`Discover`, `Découvrir`, `Descubrir`, `Entdecken`, …) and is the single accessible-name selector for the page's primary heading.                                                                                                                                                                                |
| `constructor(page: Page)`                | constructor    | Calls `super(page)` and pre-binds the three Locators above.                                                                                                                                                                                                            | Standard `BasePage` extension constructor. Every spec instantiates `new DiscoverPage(page)` (no fixture wiring today).                                                                                                                                                                                                                                                  |
| `async navigate(pageNum = 1)`            | method         | `await this.goto(`/discover/${pageNum}`)` — wraps the inherited `goto` primitive with the canonical `/discover/[N]` route.                                                                                                                                              | The default `pageNum = 1` makes "go to the first directory page" the most ergonomic call shape (`navigate()`). Callers that need a specific page pass the number explicitly (`navigate(2)`, `navigate(3)`).                                                                                                                                                          |
| `async getItemCount(): Promise<number>`  | method         | `return this.itemLinks.count()` — Playwright's `count()` over the `itemLinks` Locator.                                                                                                                                                                                  | Used by every spec to assert "the directory has items" / "the directory is empty". Returns 0 on an empty fixture without throwing.                                                                                                                                                                                                                                  |
| `async clickFirstItem()`                 | method         | `await this.itemLinks.first().click()` — clicks the first directory-card link.                                                                                                                                                                                          | The minimal "navigate to item detail" primitive every consuming spec composes against. `.first()` pins to the first match against the directory's render-order — the spec asserts on `/items/` URL substring instead of the slug for slug-invariance.                                                                                                                |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class DiscoverPage extends BasePage {
	readonly itemLinks: Locator;
	readonly pagination: Locator;
	readonly heading: Locator;

	constructor(page: Page) {
		super(page);
		this.itemLinks = page.locator('a[href*="/items/"]');
		this.pagination = page.locator('nav[aria-label*="pagination"], nav[aria-label*="Pagination"]');
		this.heading = page.getByRole('heading', { level: 1 });
	}

	async navigate(pageNum = 1) {
		await this.goto(`/discover/${pageNum}`);
	}

	async getItemCount(): Promise<number> {
		return this.itemLinks.count();
	}

	async clickFirstItem() {
		await this.itemLinks.first().click();
	}
}
```

## Why the class extends `BasePage`

Three load-bearing reasons the public-tree directory-listing
driver inherits from [`base-page-object.md`](base-page-object.md)
(unlike [`theme-toggle-page-object.md`](theme-toggle-page-object.md),
which deliberately stands alone):

- **`/discover/[N]` is a navigable page in the URL sense.**
  Inheriting from `BasePage` gives the driver the
  `goto(path)` and `waitForPageReady()` primitives "for
  free" — `navigate(pageNum)` composes `goto` with the
  `/discover/[N]` route shape. A standalone class would
  re-implement `goto` and re-state the `waitUntil:
  'domcontentloaded'` posture inline.
- **Shared page-shell Locators are useful.** A spec that
  asserts "the directory page renders the global header
  / footer / nav links" composes the inherited `header` /
  `footer` / `navLinks` Locators with the directory-specific
  `itemLinks` / `pagination` / `heading` Locators. Without
  inheritance every directory-listing spec would re-bind
  the page-shell Locators inline.
- **Constructor parity with sibling page-objects.** Every
  page-object that represents a navigable page (admin
  pages, client pages, auth pages, public-page wrappers)
  extends `BasePage`. Keeping the inheritance posture
  consistent across the page-shaped page objects lets a
  new contributor reason about the tree from a single
  template.

## Why `a[href*="/items/"]` for `itemLinks`

Three reasons the driver pins to the `href` substring
selector instead of a `data-testid="item-card"`:

- **No production-source change required.** The directory
  cards link to `/items/[slug]` via `<Link href>` in the
  production source — adding a `data-testid` would be a
  production-source concession to the e2e suite. The repo
  prefers
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)'s
  "production-source-first" posture.
- **Locale invariance.** The `href*="/items/"` substring
  matches `/items/foo` / `/en/items/foo` / `/fr/items/foo`
  / `/de/items/foo` / `/es/items/foo` / `/zh/items/foo` /
  `/ar/items/foo` identically. A `pathname.startsWith('/items/')`
  selector would fail on every locale-prefixed render.
- **Slug invariance.** The substring selector survives
  every slug rename, every category re-shuffle, and every
  data-source change. The driver does not need to know
  which slugs are present.

## Why dual-substring `aria-label*` for `pagination`

Three reasons the driver pins to **two** `aria-label`
substrings (`pagination` and `Pagination`) instead of one:

- **Production-source case drift.** The host app has shipped
  the pagination landmark with both `aria-label="Pagination"`
  (English title-case) and `aria-label="pagination"`
  (lowercase, often after an i18n pass). The dual selector
  matches both without per-version maintenance.
- **Strict-mode safety.** The `<nav>` landmark is unique on
  the directory listing — no `.first()` is required because
  there is exactly one pagination landmark per page.
- **Zero false positives.** The `aria-label*=` substring
  match is narrow enough that no other `<nav>` (the global
  navigation, the footer nav, breadcrumb nav) carries
  either `pagination` or `Pagination` in its label.

## Why `getByRole('heading', { level: 1 })` for `heading`

Three reasons the H1 is resolved by role + level instead of
a CSS / tag selector:

- **Locale invariance.** The H1's text changes with every
  locale (`Discover`, `Découvrir`, `Descubrir`, `Entdecken`,
  `اكتشف`, `发现`); the role + level selector is the only
  selector that resolves the same element across every
  locale render.
- **Single accessible-name source of truth.** Every page
  in the host app renders exactly one H1 (the page-title
  contract). The `getByRole('heading', { level: 1 })`
  resolution returns that single element without
  enumerating its text.
- **Production-source-first selector discipline.** The
  role + level selector mirrors what a screen reader hears
  when navigating the page (`"<H1 text>, heading, level
  1"`); it is the right surface for an accessible-by-default
  e2e test.

## Why `pageNum = 1` default on `navigate`

Three reasons the `navigate(pageNum = 1)` signature defaults
to page 1 instead of requiring an explicit argument:

- **The first directory page is the most-tested shape.**
  Every consuming spec today calls `navigate(1)` or
  `navigate()` (the implicit form). Defaulting to page 1
  makes the most-common call site the shortest call site.
- **Pagination tests are the explicit case.** Specs that
  test pagination explicitly call `navigate(2)` /
  `navigate(3)` to exercise the pagination control. The
  explicit number documents the intent.
- **Type-narrowed `Promise<void>` return.** The method
  returns `Promise<void>` regardless of the argument, so
  the default does not affect the return-type contract.
  A future "always-1" override would not need a method
  signature change.

## Why `.first()` on `clickFirstItem`

Three failure modes dropping `.first()` would introduce:

- **Strict-mode collision against multiple matching links.**
  The `a[href*="/items/"]` Locator matches every directory
  card on the page (12, 24, 48, …); without `.first()`,
  Playwright's strict mode would surface a violation on
  every click call.
- **Render-order independence.** The first card is
  whichever card the directory's render-order produces
  first; the spec asserts on the `/items/` URL substring
  (slug-invariance) so the test does not depend on which
  specific item is at position 0.
- **Future "highlighted item" support.** A future
  highlighted-first-item feature (e.g. a sponsored item
  that always renders at position 0) would surface as the
  same `.first()` match. The driver does not branch on
  highlighting; the spec asserts on the resulting URL.

## Failure matrix

| Mistake on `discover.page.ts`                                      | Layer that surfaces it                                                                                            |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Drop `import type` for `Page` / `Locator`                          | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner.                  |
| Drop the `extends BasePage` clause                                 | Loses inherited `goto` / `gotoLocalized` / `waitForPageReady` / `getTitle` and the page-shell Locators.           |
| Drop `readonly` from any field                                     | Cross-test state-leak risk against shared driver instances.                                                       |
| Switch `itemLinks` to `a[href^="/items/"]` (prefix-only)           | Locale-prefixed URLs (`/en/items/…`, `/fr/items/…`) fail to match; the directory listing returns count 0.        |
| Replace `a[href*="/items/"]` with a `data-testid`                  | Forces a production-source change purely for the e2e suite — violates the production-source-first selector posture. |
| Drop the dual-substring on `pagination`                            | Production-source case drift surfaces as `Locator not found` on whichever case the production source ships.       |
| Switch `pagination` to a `data-testid`                             | Same production-source-change rejection as above.                                                                 |
| Switch `heading` to `h1` (tag selector)                            | A future `<div role="heading" aria-level="1">` renders break; role+level is more robust.                          |
| Drop the default `pageNum = 1` on `navigate`                       | Every implicit `navigate()` call site breaks at the type gate.                                                    |
| Replace `goto(\`/discover/\${pageNum}\`)` with `goto('/discover/' + pageNum)` | Functionally identical; cosmetic-only diff.                                                                       |
| Drop `.first()` on `clickFirstItem`                                | Strict-mode collision against the dozen+ matching directory-card links.                                           |
| Hard-code `clickFirstItem` to a specific slug                      | Test breaks on every data-source change, every category re-shuffle.                                               |
| Move the file out of `apps/web-e2e/page-objects/public/`           | `Cannot find module` on every importing spec.                                                                     |
| Rename `DiscoverPage`                                              | Every importer needs a matching rename.                                                                           |
| Switch the file extension to `.tsx`                                | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks.                                      |
| Drop the trailing newline                                          | Prettier diff.                                                                                                    |
| Ship the file with CRLF line endings                               | Same as above.                                                                                                    |

## Per-line walkthrough

| Line(s) | Code                                                                                              | Purpose                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1       | `import type { Page, Locator } from '@playwright/test';`                                          | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost.                                         |
| 2       | `import { BasePage } from '../base.page';`                                                        | Runtime import of the page-object inheritance root — the only runtime import in the file.                              |
| 4       | `export class DiscoverPage extends BasePage {`                                                    | Single named export with the `extends BasePage` clause — inherits the page-shell Locators and navigation primitives.   |
| 5       | `readonly itemLinks: Locator;`                                                                    | Pre-bound directory-card links Locator.                                                                                |
| 6       | `readonly pagination: Locator;`                                                                   | Pre-bound pagination landmark Locator.                                                                                 |
| 7       | `readonly heading: Locator;`                                                                      | Pre-bound page-heading Locator.                                                                                        |
| 9–14    | `constructor(page: Page) { super(page); … }`                                                      | Calls `super(page)` and pre-binds the three Locators above.                                                            |
| 16–18   | `async navigate(pageNum = 1) { await this.goto(\`/discover/${pageNum}\`); }`                      | Wraps the inherited `goto` primitive with the canonical `/discover/[N]` route. Defaults `pageNum` to 1.               |
| 20–22   | `async getItemCount(): Promise<number> { return this.itemLinks.count(); }`                        | Playwright's `count()` over the `itemLinks` Locator — returns 0 on empty fixture without throwing.                    |
| 24–26   | `async clickFirstItem() { await this.itemLinks.first().click(); }`                                | Clicks the first directory-card link. `.first()` pins to the first match for strict-mode safety.                       |

## Read / write surface

| Caller                                                                                                                                              | Reads                                                                                       | Writes                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/web-e2e/tests/public/discover.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/discover.spec.ts) | `getItemCount()` (assertion on `>0`), `itemLinks.first()` visibility, the H1 / pagination landmarks | Calls `navigate(1)` / `navigate(2)` to land on `/discover/[N]`; calls `clickFirstItem()` to navigate to item-detail.                                                                                                  |
| [`apps/web-e2e/tests/public/map.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/map.spec.ts)         | `getItemCount()` to seed a "the directory has items" precondition before navigating to `/map` | Same write surface as above for the precondition phase.                                                                                                                                                              |
| [`apps/web/app/[locale]/discover/[page]/page.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/%5Blocale%5D/discover/%5Bpage%5D/page.tsx) (production source for the DOM contract) | The directory-card `<Link href="/items/[slug]">` shape, the `<nav aria-label="Pagination">` landmark, the H1 | The directory list render and the pagination control DOM.                                                                                                                                                            |
| [`base-page-object.md`](base-page-object.md)                                                                                                      | The inherited `goto` / `waitForPageReady` / `gotoLocalized` / `getTitle` primitives and the page-shell Locators | —                                                                                                                                                                                                                     |
| [`e2e-tsconfig.md`](e2e-tsconfig.md)                                                                                                              | The `include: ["./**/*.ts"]` glob picks up this file.                                       | —                                                                                                                                                                                                                     |
| [`playwright-config.md`](playwright-config.md)                                                                                                    | Resolves the relative `/discover/[N]` path the consuming spec navigates to via `baseURL`.   | —                                                                                                                                                                                                                     |

### Read / write surface — failure modes

| Drift                                                                                                  | Surfaces as                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production-source rename of the directory route from `/discover/[page]` to `/browse/[page]`            | `navigate(1)` lands on a 404 or a redirect chain; every consuming spec fails with a navigation timeout.                                                                                          |
| Production-source change of the item-detail route prefix (`/items/` → `/products/`)                    | `itemLinks` matches zero elements; `getItemCount()` returns 0; every "the directory has items" assertion fails even when the directory does have items.                                          |
| Production-source change of the pagination landmark `aria-label`                                       | `pagination` matches zero elements; pagination-visibility assertions fail.                                                                                                                       |
| Production-source switch from H1 to H2 for the page heading                                            | `heading` matches zero elements; any future heading-text assertion fails.                                                                                                                        |
| Middleware change that prefixes the discover route (`localePrefix: 'always'`)                          | The consuming spec's `navigate(1)` lands on a redirect chain; the directory items fail to render before the spec's wait condition.                                                              |
| `playwright.config.ts` `baseURL` change                                                                | The relative `/discover/[N]` resolves to a different host; the directory items are not present and the spec fails on `getItemCount() > 0`.                                                       |
| Empty data fixture                                                                                     | `getItemCount()` returns 0; the spec's "no items" branch fires (today the spec asserts `> 0` and fails).                                                                                         |

## Change checklist

Any change to `discover.page.ts` must:

- Audit every spec under `apps/web-e2e/tests/public/discover.spec.ts`
  and `apps/web-e2e/tests/public/map.spec.ts` for compatibility with the
  new shape.
- Cross-check [`base-page-object.md`](base-page-object.md) for the
  `BasePage` posture — if the new shape drops `extends BasePage`,
  document the why.
- Cross-check the production source at
  [`apps/web/app/[locale]/discover/[page]/page.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/%5Blocale%5D/discover/%5Bpage%5D/page.tsx)
  for the directory-card link shape, the pagination landmark
  shape, and the H1 contract.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for the
  `include: ["./**/*.ts"]` glob coverage.
- Cross-check [`playwright-config.md`](playwright-config.md) for
  the `baseURL` posture the consuming specs rely on.
- Cross-check [`fixtures-index.md`](fixtures-index.md) — today the
  driver is instantiated inline by the consuming specs, but a
  future fixture-bound directory driver would surface here.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the discover and
  map spec subsets
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "discover|map"`).
- Add a [`docs/log.md`](../log.md) entry describing the change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that affects test
  authoring.
- Reviewer pass.
