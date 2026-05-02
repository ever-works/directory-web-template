---
id: search-bar-page-object
title: E2E Search-Bar Page Object (apps/web-e2e/page-objects/public/search-bar.page.ts)
sidebar_label: E2E Search-Bar Page Object
sidebar_position: 382
---

# E2E Search-Bar Page Object — `apps/web-e2e/page-objects/public/search-bar.page.ts`

Per-source-file reference for the Playwright e2e suite's
public-listing search-input driver paired with
[`apps/web-e2e/page-objects/public/search-bar.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/search-bar.page.ts).
Sits inside the `public/` page-object subtree, alongside the
fourteen other public-surface page objects
(`discover.page.ts`, `item-detail.page.ts`,
`language-switcher.page.ts`, `map.page.ts`,
`newsletter.page.ts`, `profile-dropdown.page.ts`,
`public-pages.page.ts`, `scroll-to-top.page.ts`,
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
**suite's directory-search driver boundary** — the smallest
possible page object that lets a spec drive the public
listing's search `<input>` end-to-end (type a search term,
clear the input, read back the current value).

The file is the **only** driver in the suite for the
public-listing search input today. Like
[`theme-toggle-page-object.md`](theme-toggle-page-object.md)
and unlike [`discover-page-object.md`](discover-page-object.md)
or [`signin-page-object.md`](signin-page-object.md),
the class **does not extend `BasePage`** — see
"Why the class does not extend `BasePage`" below for the
load-bearing reason — so it carries its own `page` field
and does not inherit `header` / `footer` / `navLinks` /
`goto` / `gotoLocalized` / `waitForPageReady` / `getTitle`
from [`base-page-object.md`](base-page-object.md).

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`search-bar` driver is consumed today by
[`apps/web-e2e/tests/public/search.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/search.spec.ts),
which covers three flows:

- The search input is **visible on the homepage** (`/`) when
  the production-source's `SearchBar` component is rendered.
- Typing a search term **fills the input** and the
  `getValue()` accessor reads back the typed string after the
  debounce window (~1s).
- Clearing the input **resets** the value to the empty
  string after a second debounce window.

A spec that drives the search input inline (via
`page.locator('input[placeholder*="Search" i]')`) is a
**drift** that this page object is the canonical replacement
for; new specs that touch the public-listing search input
must reach for this page object instead.

## At a glance

| Element                                  | Type           | What it is                                                                                                                                                                                                                                                              | Why it matters                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`          | typed import   | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                                  | The public-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports a search-input driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime. |
| `export class SearchBar`                 | named export   | Single class declaration with **no `extends` clause** — does not inherit from `BasePage`. The class stands alone with its own `page` field and three methods.                                                                                                            | See "Why the class does not extend `BasePage`" below. The choice keeps the driver scoped to **just** the search-input surface (no header / footer / nav-link assertions leak in), and lets a spec instantiate the driver against any page (the homepage, `/discover/[N]`, a category page) without paying for the inherited Locators to resolve up-front. |
| `readonly page: Page`                    | field          | Stores the Playwright `Page` handle the constructor receives.                                                                                                                                                                                                            | The standalone class restates this field that a `BasePage` subclass would inherit, so a future method that needs ad-hoc Locator construction (e.g. an `input` query keyed by a future production-source `data-listbox` attribute) has the handle available without a parent-class lookup. |
| `readonly input: Locator`                | field          | `page.locator('input[placeholder*="Search" i]').first()` — case-insensitive substring selector on the `<input>` element's `placeholder` attribute, pinned to the first match for strict-mode safety.                                                                    | The host app's listing search input renders with a `placeholder` like `"Search…"` / `"Search items"` / `"Search the directory"` — the substring `"Search"` is invariant across every label evolution, and the `i` flag tolerates production-source case drift (`"search"` vs `"Search"`). `.first()` survives a future second search input on the page (e.g. an admin shell that mounts its own search). |
| `readonly clearButton: Locator`          | field          | `page.locator('button', { hasText: '×' }).first()` — Locator for the "clear input" button, identified by its multiplication-sign glyph (`×` / U+00D7) text content, pinned to the first match.                                                                          | The production-source clear-input button renders with a `×` glyph (the multiplication sign, **not** the lower-case Latin x) — the `hasText` substring selector pins the locator to that exact code-point and survives every translation pass because the glyph is a Unicode symbol, not a translatable string. `.first()` survives any future stacked clear button (e.g. a clear-all-filters button on `/discover/[N]`). |
| `constructor(page: Page)`                | constructor    | Stores the `page` and pre-binds `input` and `clearButton`.                                                                                                                                                                                                              | Single constructor signature, no `super(page)` call (because the class does not extend `BasePage`). Every spec instantiates `new SearchBar(page)` (no fixture wiring today).                                                                                                                                                                                              |
| `async search(term: string)`             | method         | `await this.input.fill(term)` — Playwright's `fill()` over the bound `input` Locator.                                                                                                                                                                                  | The minimal "type into the search input" primitive. `fill()` is preferred over `pressSequentially()` because the production-source debounces on the React-controlled value rather than the per-keystroke event, so a single batch `fill()` is faster and semantically equivalent. The 1s `waitForTimeout` the consuming spec adds afterwards covers the debounce window. |
| `async clear()`                          | method         | `await this.input.clear()` — Playwright's `clear()` over the bound `input` Locator.                                                                                                                                                                                    | The minimal "empty the search input" primitive. The driver does **not** click the `clearButton` glyph because that path depends on the input being non-empty (the clear button is hidden when the input is empty in some host-app layouts); the `clear()` call works regardless of input state. |
| `async getValue(): Promise<string>`      | method         | `(await this.input.inputValue()) ?? ''` — Playwright's `inputValue()` over the bound `input` Locator with the `?? ''` nullish-coalesce guard.                                                                                                                          | The accessor every consuming spec uses to assert "the input shows the typed value" / "the input was cleared". The `?? ''` guard is defensive against a future Playwright API change that returns `null` for an unmounted input — today's `inputValue()` returns the empty string but the guard keeps the return type pinned to `string`. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the public search bar on the listing/home page.
 */
export class SearchBar {
	readonly page: Page;
	readonly input: Locator;
	readonly clearButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.input = page.locator('input[placeholder*="Search" i]').first();
		this.clearButton = page.locator('button', { hasText: '×' }).first();
	}

	/** Type a search term into the search input */
	async search(term: string) {
		await this.input.fill(term);
	}

	/** Clear the search input */
	async clear() {
		await this.input.clear();
	}

	/** Get current value of the search input */
	async getValue(): Promise<string> {
		return (await this.input.inputValue()) ?? '';
	}
}
```

## Why the class does not extend `BasePage`

Three load-bearing reasons the public-tree search-input
driver stands alone instead of inheriting from
[`base-page-object.md`](base-page-object.md):

- **Composition over inheritance against any host surface.**
  The search input is a single page-mounted control — it is
  not a "page" in the URL sense. A spec on `/`, a spec on
  `/discover/[N]`, a spec on a future category page, and a
  spec on a future tenant-scoped listing all want the same
  driver. Inheriting from `BasePage` would force every spec
  that instantiates the driver to pay for the `header` /
  `footer` / `navLinks` Locator resolution even when the
  spec only needs the search input. The standalone class
  lets a spec compose the driver into a larger page
  object's flow without inheriting page-shell concerns.
- **Reusability on non-listing surfaces.** A future
  admin-shell-only "search the dashboard" widget or a
  client-shell-only "search my submissions" widget would
  also be a `SearchBar` consumer. Tying the driver to
  `BasePage`'s global `header` Locator would prevent that
  reuse without either a base-class change or a bespoke
  admin-tree / client-tree driver.
- **Constructor parity with non-page widgets.** The
  `(page: Page)` signature without a `super(page)` call
  matches every other public-tree widget driver (e.g.
  [`theme-toggle-page-object.md`](theme-toggle-page-object.md),
  `language-switcher.page.ts`, `share-button.page.ts`,
  `view-toggle.page.ts` — all of which mirror this same
  posture). Keeping the inheritance discipline consistent
  across the public-tree widget drivers makes the tree
  scannable for a new contributor.

## Why `placeholder*="Search" i` and not a `data-testid`

Three reasons the driver pins to the production
`placeholder` substring instead of adding a
`data-testid="search-bar-input"`:

- **No production-source change required.** The
  `placeholder` is already there for screen-reader and
  empty-state UX — adding a `data-testid` would be a
  production-source concession to the e2e suite. The repo
  prefers
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)'s
  "production-source-first" posture: drive the UI with the
  attributes a screen reader would announce.
- **Placeholder-text invariance.** The production
  `placeholder` evolves over time (`"Search"` → `"Search…"`
  → `"Search items"` → `"Search the directory"`) but the
  prefix substring `"Search"` is invariant. The `i`
  flag handles the case-drift permutations (`"search"` vs
  `"Search"`) without forcing a per-deployment locator
  rebuild.
- **Strict-mode survives a second search input.** A future
  second search input on the page (e.g. an admin-only
  search inside a section header, an auto-complete
  combo-box mounted inside a modal) would still match
  `placeholder*="Search" i`, so the `.first()` pin keeps
  the locator strict-mode-safe. A `data-testid` would
  either leak a duplicate or force a per-instance suffix
  every spec would have to know.

## Why `hasText: '×'` for the clear button

Three reasons the clear-button locator pins to the
multiplication-sign glyph text rather than a CSS class,
`aria-label`, or `data-testid`:

- **Glyph invariance.** The production-source clear-input
  button is rendered as a single Unicode glyph (`×`,
  U+00D7) — the multiplication sign, **not** the lower-case
  Latin x (`x`, U+0078). The glyph is **not translated**
  by the `next-intl` locale set because it is a symbol,
  not a translatable label. The `hasText` selector pins
  exactly that code-point and survives every translation
  pass.
- **Visual symmetry with the production source.** The host
  app's `SearchBar` component renders the glyph via a
  Tailwind utility (`text-xl leading-none`) without an
  `aria-label` today — driving the locator off the glyph
  matches the production source one-to-one without forcing
  a production-source change to add an `aria-label` for
  the e2e suite.
- **Strict-mode resilience against a stacked clear
  button.** A future "clear all filters" button on
  `/discover/[N]` could also use the `×` glyph (a common
  reset-control pattern). `.first()` pins the locator to
  the first match (the search-bar's clear button, because
  it is rendered above the listing's filter bar). A spec
  that needs the second match must use `nth(1)` directly.

## Why `.first()` on `input` and `clearButton`

Three failure modes dropping `.first()` on either Locator
would introduce:

- **Strict-mode collision against a future second search
  input.** The host app today renders one search input on
  the public listing; a future admin shell, a future
  newsletter signup mounted in a footer, or a future modal
  "search to add" widget would mount a second matching
  input. Dropping `.first()` would surface a strict-mode
  violation on every search spec on every page that ships
  such an input.
- **Strict-mode collision against the autocomplete
  dropdown's input.** A future autocomplete combo-box
  could mount a second search input inside the dropdown
  on focus. `.first()` survives that drift.
- **Strict-mode collision against a portal-rendered
  duplicate.** A future portal-rendered search overlay
  (e.g. a Cmd-K palette) would mount a second instance of
  the same DOM. `.first()` pins to the first instance.

## Why `fill()` instead of `pressSequentially()` for `search()`

Three reasons `search(term)` calls Playwright's `fill()`
instead of `pressSequentially()`:

- **Debounce semantics.** The production-source `SearchBar`
  component is a controlled React input that debounces on
  the React-controlled value, not on the per-keystroke
  `input` event. A single batch `fill()` triggers exactly
  one React state update, which is semantically equivalent
  to a debounced sequence of keystrokes; `pressSequentially`
  would dispatch N events that the host app must
  immediately collapse via debounce.
- **Speed.** `fill()` completes in a single Playwright
  round-trip; `pressSequentially()` is one round-trip per
  character. For a 10-character term the difference is
  ~50ms vs ~500ms per spec.
- **Deterministic value-readback.** `fill()` returns once
  the input's value has been set; `pressSequentially()`
  returns once the last keypress has been dispatched but
  before the React reconciler may have settled. The
  consuming spec asserts on `getValue()` after a 1s
  debounce window, and `fill()` makes that assertion
  deterministic.

## Why `clear()` instead of clicking `clearButton`

Three reasons `clear()` calls Playwright's `clear()`
primitive instead of clicking the bound `clearButton` Locator:

- **Empty-input safety.** The production-source `SearchBar`
  component **hides** the clear button when the input is
  empty. Calling `clearButton.click()` against an
  already-empty input would surface a Playwright timeout
  on the visibility wait. The `clear()` primitive works
  regardless of the input's state.
- **Clear-button drift survival.** A future production-source
  refactor could move the clear button outside the
  `<input>`'s parent (e.g. into a separate floating action
  bar), break it apart into per-token chips, or replace it
  with a "reset filters" composite. `clear()` survives any
  such drift because it operates on the input directly.
- **Production-source-first input semantics.** The
  Playwright `clear()` primitive dispatches the
  `keyboardEvent` sequence a real keyboard would produce
  for `Cmd/Ctrl+A` + `Delete`, which the host app's
  React-controlled `onChange` handler observes
  identically to a real-user clear. Clicking the
  `clearButton` would dispatch a synthetic `click` that
  the host app's handler observes via a different code
  path (`onClick` instead of `onChange`), creating a
  per-driver branch that diverges from real-user behaviour.

## Why `?? ''` on `getValue()`

Three reasons the accessor coalesces to the empty string:

- **API future-proofing.** Today's Playwright
  `inputValue()` returns `string`, never `null` or
  `undefined`. A future Playwright major could relax that
  return type to `string | null` for unmounted inputs;
  the `?? ''` guard keeps the public surface pinned to
  `string` so consuming specs do not need to add their
  own coalesce.
- **Type-narrowed assertion shape.** Consuming specs
  assert `expect(value).toBe('')` or `expect(value).toBe('test')`
  on the `string` return; a `string | null` return type
  would force every assertion to coalesce, polluting the
  spec-level surface.
- **Defensive symmetry with `getCurrentTheme()`.** The
  sibling [`theme-toggle-page-object.md`](theme-toggle-page-object.md)'s
  `getCurrentTheme()` method has the same defensive
  posture (substring scan with a fallback), so the public-tree
  widget drivers share the same return-type discipline.

## Failure matrix

| Mistake on `search-bar.page.ts`                          | Layer that surfaces it                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Drop `import type` for `Page` / `Locator`                | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner.                  |
| Add an `extends BasePage` clause                         | Forces every spec to pay for `header` / `footer` / `navLinks` Locator resolution; couples the driver to page shell. |
| Drop `readonly` from `page`, `input`, or `clearButton`   | Cross-test state-leak risk against shared driver instances.                                                       |
| Switch `input` to `placeholder="Search"` exact match     | Breaks on every placeholder evolution (e.g. `"Search…"` → `"Search items"`).                                      |
| Drop the `i` flag from the `placeholder` substring       | Case-strict matching breaks on a `"search"` lower-case rename.                                                    |
| Drop `.first()` on `input`                               | Strict-mode collision against a future second search input (admin-shell, newsletter, modal).                      |
| Replace `placeholder*="Search" i` with `data-testid`     | Forces a production-source change purely for the e2e suite — violates the production-source-first selector posture. |
| Switch `clearButton` to `hasText: 'x'` (Latin lower-case x) | Locator never resolves — the production source ships the multiplication sign `×` (U+00D7), not the Latin x.       |
| Switch `clearButton` to a CSS class selector             | Multiple buttons match (e.g. `button.clear`) and surface a strict-mode violation; production CSS classes drift.   |
| Drop `.first()` on `clearButton`                         | Strict-mode collision against a future "clear filters" button using the same `×` glyph.                           |
| Switch `search()` from `fill()` to `pressSequentially()` | ~10× slower per spec; non-deterministic value-readback against the React debounce.                                |
| Switch `clear()` to a `clearButton.click()`              | Spec timeouts when the input is already empty (clear button is hidden); diverges from real-user clear semantics.   |
| Drop the `?? ''` on `getValue()`                         | Future Playwright `inputValue()` API change to `string \| null` breaks every consuming assertion.                  |
| Move the file out of `apps/web-e2e/page-objects/public/` | `Cannot find module` on every importing spec.                                                                     |
| Rename `SearchBar`                                       | Every importer needs a matching rename.                                                                           |
| Switch the file extension to `.tsx`                      | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks.                                      |
| Drop the trailing newline                                | Prettier diff.                                                                                                    |
| Ship the file with CRLF line endings                     | Same as above.                                                                                                    |

## Per-line walkthrough

| Line(s) | Code                                                                                                              | Purpose                                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | `import type { Page, Locator } from '@playwright/test';`                                                          | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost.                                                                                                     |
| 3–5     | `/** Page object for the public search bar on the listing/home page. */`                                          | JSDoc summary that surfaces in IDE hover for every importer.                                                                                                                       |
| 6       | `export class SearchBar {`                                                                                        | Single named export, no `extends` clause — see "Why the class does not extend `BasePage`" above.                                                                                   |
| 7       | `readonly page: Page;`                                                                                            | Stores the Playwright `Page` handle the constructor receives.                                                                                                                      |
| 8       | `readonly input: Locator;`                                                                                        | Pre-bound search-input Locator.                                                                                                                                                    |
| 9       | `readonly clearButton: Locator;`                                                                                  | Pre-bound clear-input button Locator.                                                                                                                                              |
| 11–15   | `constructor(page: Page) { this.page = page; this.input = ...; this.clearButton = ...; }`                          | Stores the `page` and pre-binds the `input` and `clearButton` Locators. The substrings `placeholder*="Search" i` and `hasText: '×'` are the load-bearing selectors. `.first()` pins both to the first match. |
| 18      | `async search(term: string) {`                                                                                    | Types a search term into the input via Playwright's `fill()` primitive.                                                                                                            |
| 19      | `await this.input.fill(term);`                                                                                   | Single batch fill — fastest and most deterministic shape for the React-controlled, debounced input.                                                                                |
| 23      | `async clear() {`                                                                                                | Empties the input via Playwright's `clear()` primitive.                                                                                                                            |
| 24      | `await this.input.clear();`                                                                                      | Operates on the input directly, regardless of the clear button's visibility state.                                                                                                |
| 28      | `async getValue(): Promise<string> {`                                                                             | Reads back the input's current value as a `string`.                                                                                                                                |
| 29      | `return (await this.input.inputValue()) ?? '';`                                                                  | Coalesces a future `null` return from Playwright's API to the empty string so consuming specs always receive a `string`.                                                          |

## Read / write surface

| Caller                                                                                                                                  | Reads                                                                          | Writes                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/web-e2e/tests/public/search.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/search.spec.ts) | `input` (visibility), `getValue()` (string assertion)                          | Calls `search(term)` to fill the input; calls `clear()` to empty the input.                                                                                                                                                                                                              |
| Future smoke / a11y specs                                                                                                              | `getValue()` for a dual-mode spec that asserts both filled and cleared states | Same write surface as today's spec.                                                                                                                                                                                                                                                     |
| Production source for the listing's search input (the host app's `SearchBar` React component) | The `input[placeholder*="Search"]` shape and the `hasText: '×'` clear-button glyph                            | The React-controlled `value` and the debounced query that drives the listing's filter state.                                                                                                                                                                                              |
| [`e2e-tsconfig.md`](e2e-tsconfig.md)                                                                                                   | The `include: ["./**/*.ts"]` glob picks up this file.                          | —                                                                                                                                                                                                                                                                                       |
| [`playwright-config.md`](playwright-config.md)                                                                                          | Resolves the relative `/` path the consuming spec navigates to via `baseURL`.   | —                                                                                                                                                                                                                                                                                       |

### Read / write surface — failure modes

| Drift                                                                                                  | Surfaces as                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production-source rename of the `placeholder` from `Search…` to `Find anything…`                       | Strict-mode `Locator not found` on every search spec; every assertion against `input` fails.                                                                                                     |
| Production-source switch to a `<combobox>` element with `role="combobox"`                              | The `input[placeholder*=…]` resolution fails to find the input; `search()` / `clear()` fail with a Playwright timeout.                                                                          |
| Production-source switch from `×` glyph to a Lucide `<X />` icon component                             | The `hasText: '×'` resolution fails — the icon renders as an SVG without the literal glyph in `textContent`. The clear button's visibility / click test fails.                                  |
| Production-source switch from `<input>` to a contenteditable `<div>`                                   | `inputValue()` returns the empty string on every read; `getValue()` reports `''` for every typed term, masking real failures.                                                                    |
| Middleware change that prefixes the home route (`localePrefix: 'always'`)                              | The consuming spec's `page.goto('/')` lands on a redirect chain the search input is not part of; `input.toBeVisible()` times out.                                                                |
| `playwright.config.ts` `baseURL` change                                                                | The relative `/` resolves to a different host; the search input is not present and the spec fails on visibility.                                                                                 |

## Change checklist

Any change to `search-bar.page.ts` must:

- Audit every spec under `apps/web-e2e/tests/public/search.spec.ts`
  for compatibility with the new shape.
- Cross-check [`base-page-object.md`](base-page-object.md) for the
  `BasePage` posture — if the new shape inherits from `BasePage`,
  document the why.
- Cross-check the production source for the listing's search-input
  React component — verify the `placeholder` substring, the
  `×` glyph, and the React-controlled `value` shape stay in
  sync with the locator selectors.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for the
  `include: ["./**/*.ts"]` glob coverage.
- Cross-check [`playwright-config.md`](playwright-config.md) for
  the `baseURL` posture the consuming spec relies on.
- Cross-check [`fixtures-index.md`](fixtures-index.md) — today the
  driver is instantiated inline by the consuming spec, but a
  future fixture-bound search bar would surface here.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the search-bar
  spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep search`).
- Add a [`docs/log.md`](../log.md) entry describing the change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that affects test
  authoring.
- Reviewer pass.
