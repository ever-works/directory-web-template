---
id: theme-toggle-page-object
title: E2E Theme-Toggle Page Object (apps/web-e2e/page-objects/public/theme-toggle.page.ts)
sidebar_label: E2E Theme-Toggle Page Object
sidebar_position: 380
---

# E2E Theme-Toggle Page Object — `apps/web-e2e/page-objects/public/theme-toggle.page.ts`

Per-source-file reference for the Playwright e2e suite's
header theme-switch driver paired with
[`apps/web-e2e/page-objects/public/theme-toggle.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/theme-toggle.page.ts).
Sits inside the `public/` page-object subtree, alongside the
fourteen other public-surface page objects
(`discover.page.ts`, `item-detail.page.ts`,
`language-switcher.page.ts`, `map.page.ts`,
`newsletter.page.ts`, `profile-dropdown.page.ts`,
`public-pages.page.ts`, `scroll-to-top.page.ts`,
`search-bar.page.ts`, `share-button.page.ts`,
`sort-menu.page.ts`, `star-rating.page.ts`,
`view-toggle.page.ts`).

Where [`base-page-object.md`](base-page-object.md) documents
the **page-object inheritance root** — the smallest possible
class every concrete page object under
`apps/web-e2e/page-objects/admin/`,
`apps/web-e2e/page-objects/auth/`,
`apps/web-e2e/page-objects/client/`, and
`apps/web-e2e/page-objects/public/` extends — and
[`signin-page-object.md`](signin-page-object.md) documents the
**suite's sign-in surface boundary** under
`apps/web-e2e/page-objects/auth/`, this page documents the
**suite's theme-switch driver boundary** — the smallest
possible page object that lets a spec drive the header
theme-switch dropdown end-to-end (open the dropdown, select
the **light** or **dark** option, observe the canonical
`aria-label` shape, observe the `dark` class flip on the
`<html>` element).

The file is the **only** driver in the suite for the
header theme switch today. Unlike [`signin-page-object.md`](signin-page-object.md),
the class **does not extend `BasePage`** — see
"Why the class does not extend `BasePage`" below for the
load-bearing reason — so it carries its own `page` field
and does not inherit `header` / `footer` / `navLinks` /
`goto` / `gotoLocalized` / `waitForPageReady` / `getTitle`
from [`base-page-object.md`](base-page-object.md).

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`theme-toggle` driver is consumed today by
[`apps/web-e2e/tests/public/theme-toggle.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/theme-toggle.spec.ts),
which covers four flows:

- The toggle button is **visible in the header** on `/`
  (the home page).
- Clicking the toggle button **opens the dropdown** (the
  `aria-expanded` attribute flips to `"true"`).
- Selecting the **dark** option **applies the `dark` class**
  to `<html>` (the Tailwind dark-mode hook documented in
  the host app's
  [`apps/web/components/header/theme-switch.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/components/header/theme-switch.tsx)).
- Selecting the **light** option **removes the `dark` class**
  from `<html>` (the inverse).

A spec that drives the theme switch inline (via
`page.locator('button[aria-label*="Current theme"]')`) is a
**drift** that this page object is the canonical replacement
for; new specs that touch the theme switch must reach for
this page object instead.

## At a glance

| Element                                  | Type           | What it is                                                                                                                                                                                                                                                              | Why it matters                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`          | typed import   | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                                  | The public-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports a theme-switch driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime. |
| `export class ThemeToggle`               | named export   | Single class declaration with **no `extends` clause** — does not inherit from `BasePage`. The class stands alone with its own `page` field and four methods.                                                                                                             | See "Why the class does not extend `BasePage`" below. The choice keeps the driver scoped to **just** the theme-switch surface (no header / footer / nav-link assertions leak in), and lets a spec instantiate the driver against any page (a header that already exists in the layout, a header that the spec navigated to a moment ago) without paying for the inherited Locators to resolve up-front. |
| `readonly page: Page`                    | field          | Stores the Playwright `Page` handle the constructor receives.                                                                                                                                                                                                            | Every method in the class needs the `Page` handle (`open` clicks via the toggle button, `selectLight` / `selectDark` re-open and resolve the option button via `page.getByRole`, `isDarkMode` resolves the `<html>` Locator). A `BasePage` subclass would inherit this field; the standalone class restates it.                                                            |
| `readonly toggleButton: Locator`         | field          | `page.locator('button[aria-label*="Current theme"]').first()` — the canonical toggle-button Locator pinned to the first match for strict-mode safety.                                                                                                                    | The host app's [`apps/web/components/header/theme-switch.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/components/header/theme-switch.tsx) renders the toggle button with `aria-label={`Current theme: ${currentThemeInfo.label}`}` — the substring `"Current theme"` is invariant to the chosen theme label, so the substring selector survives every theme rename. `.first()` survives a future second header (e.g. the admin shell that mounts its own theme switcher). |
| `constructor(page: Page)`                | constructor   | Stores the `page` and pre-binds `toggleButton`.                                                                                                                                                                                                                          | Single constructor signature, no `super(page)` call (because the class does not extend `BasePage`). Every spec instantiates `new ThemeToggle(page)` (no fixture wiring today).                                                                                                                                                                                              |
| `async getCurrentTheme()`                | method         | Reads the `aria-label` attribute of `toggleButton` and parses it for the substrings `"light"` / `"dark"`. Returns `'light'`, `'dark'`, or `'unknown'`.                                                                                                                  | The toggle button's `aria-label` is the **single source of truth** for the currently-selected theme (the production component reads from `useTheme()` and renders the human-readable `currentThemeInfo.label`). The substring scan tolerates label evolution (the production label could become `"Current theme: Dark — Material"` and the parser would still return `'dark'`). |
| `async open()`                           | method         | `await this.toggleButton.click()` — single click on the toggle button.                                                                                                                                                                                                  | The minimal "open the dropdown" primitive every other method composes against. `selectLight` / `selectDark` both call `open()` first because the option buttons only mount when the dropdown is open.                                                                                                                                                                       |
| `async selectLight()`                    | method         | Calls `open()`, then resolves `page.getByRole('button', { name: /light/i }).first()` and clicks it.                                                                                                                                                                     | Role+regex name lookup survives translation churn the same way `signin-page-object.md`'s `submitButton` does. `.first()` pins to the first match against a future second `light`-named button somewhere on the page (e.g. a "light theme" call-to-action banner on the marketing page).                                                                                    |
| `async selectDark()`                     | method         | Mirror of `selectLight` for the **dark** option.                                                                                                                                                                                                                         | Symmetric posture — every "select the X theme" method follows the same shape so a future "select the corporate theme" or "select the funny theme" addition slots in without bespoke locator construction.                                                                                                                                                                  |
| `async isDarkMode()`                     | method         | `await this.page.locator('html').getAttribute('class')`, then returns whether the result includes the `dark` substring.                                                                                                                                                  | The Tailwind dark-mode hook is `class="dark"` on `<html>` (see the host app's `apps/web/app/[locale]/layout.tsx` and the Tailwind v4 dark-mode posture). The substring scan tolerates a future class list expansion (e.g. `class="dark theme-everworks notranslate"`), so the assertion survives Tailwind class-list reordering as long as `dark` stays in the class list. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the theme toggle component in the header.
 */
export class ThemeToggle {
	readonly page: Page;
	readonly toggleButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.toggleButton = page.locator('button[aria-label*="Current theme"]').first();
	}

	/** Get the current theme from the toggle button's aria-label */
	async getCurrentTheme(): Promise<string> {
		const label = await this.toggleButton.getAttribute('aria-label');
		if (label?.includes('light')) return 'light';
		if (label?.includes('dark')) return 'dark';
		return 'unknown';
	}

	/** Open the theme dropdown */
	async open() {
		await this.toggleButton.click();
	}

	/** Select light theme from the dropdown */
	async selectLight() {
		await this.open();
		const lightButton = this.page.getByRole('button', { name: /light/i }).first();
		await lightButton.click();
	}

	/** Select dark theme from the dropdown */
	async selectDark() {
		await this.open();
		const darkButton = this.page.getByRole('button', { name: /dark/i }).first();
		await darkButton.click();
	}

	/** Check if the page has the dark class on <html> */
	async isDarkMode(): Promise<boolean> {
		const htmlClass = await this.page.locator('html').getAttribute('class');
		return htmlClass?.includes('dark') ?? false;
	}
}
```

## Why the class does not extend `BasePage`

Three load-bearing reasons the public-tree theme-switch
driver stands alone instead of inheriting from
[`base-page-object.md`](base-page-object.md):

- **Composition over inheritance against the header surface.**
  The theme switch is a single header-mounted control — it
  is not a "page" in the URL sense. Inheriting from `BasePage`
  would force every spec that instantiates the driver to pay
  for the `header` / `footer` / `navLinks` Locator
  resolution even when the spec only needs the toggle. The
  standalone class lets a spec compose the driver into a
  larger page object's flow without inheriting page-shell
  concerns.
- **Reusability on non-page surfaces.** A future
  admin-shell-only theme switch (e.g. a per-admin theme
  switch in the dashboard sidebar) would also be a
  `ThemeToggle` consumer. Tying the driver to `BasePage`'s
  global `header` Locator would prevent that reuse without
  either a base-class change or a bespoke admin-tree driver.
- **Constructor parity with non-page widgets.** The
  `(page: Page)` signature without a `super(page)` call
  matches every other public-tree widget driver (e.g.
  `language-switcher.page.ts`, `share-button.page.ts`,
  `view-toggle.page.ts` — all of which mirror this same
  posture). Keeping the inheritance discipline consistent
  across the public-tree widget drivers makes the tree
  scannable for a new contributor.

## Why `aria-label*="Current theme"` and not a `data-testid`

Three reasons the driver pins to the production
`aria-label` substring instead of adding a
`data-testid="theme-toggle"`:

- **No production-source change required.** The
  `aria-label` is already there for accessibility — adding a
  `data-testid` would be a production-source concession to
  the e2e suite. The repo prefers
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)'s
  "production-source-first" posture: drive the UI with the
  selectors a screen reader would use.
- **Theme-label invariance.** The production
  `aria-label={`Current theme: ${currentThemeInfo.label}`}`
  changes the **suffix** (`Light`, `Dark`, `Material`,
  `Funny`, `Corporate`) but the **prefix** `"Current theme"`
  is invariant. The substring selector pins to the
  invariant.
- **Strict-mode survives a second theme switch.** A future
  second theme switch on the page (e.g. an admin-only
  switch) would still match `aria-label*="Current theme"`,
  so the `.first()` pin keeps the locator
  strict-mode-safe. A `data-testid` would either leak a
  duplicate or force a per-instance suffix every spec would
  have to know.

## Why `.first()` on the toggle button

Three failure modes dropping `.first()` would introduce:

- **Strict-mode collision against a future admin-shell
  theme switch.** The host app today renders one theme
  switch in the public header; a future admin shell or
  embedded "theme picker" widget would mount a second
  matching `aria-label*="Current theme"`. Dropping `.first()`
  would surface a strict-mode violation on every theme
  spec on every page that ships such a widget.
- **Strict-mode collision against the dropdown's option
  buttons.** The dropdown's own option buttons (light /
  dark / material / etc.) do not carry a "Current theme"
  `aria-label` today, but a future redesign could surface
  per-option "Current theme: X" labels in the dropdown's
  hover state — `.first()` survives that drift.
- **Strict-mode collision against a portal-rendered
  duplicate.** A future portal-rendered theme switch
  (e.g. a mobile drawer) would mount a second instance of
  the same DOM. `.first()` pins to the visible header
  instance.

## Why parse the `aria-label` substring instead of querying state

Three reasons `getCurrentTheme()` reads the `aria-label`
substring instead of reaching into React state, localStorage,
or the `<html>` class list:

- **Black-box discipline.** An e2e test must not reach into
  the production app's internals — it must drive the UI
  the way a user would. The `aria-label` is the surface a
  screen reader sees; it is the right surface for an e2e
  assertion.
- **Storage drift survival.** A future migration from
  `localStorage` to a server-side cookie or to a Drizzle
  user-preferences row would not change the `aria-label`
  shape. The driver survives the migration without a
  per-storage-backend rewrite.
- **Theme-set extensibility.** The host app today ships
  four named themes (`everworks`, `corporate`, `material`,
  `funny`); a future fifth theme would surface as a fifth
  `currentThemeInfo.label` value. The `'unknown'` return
  from `getCurrentTheme()` lets a spec assert "the theme
  is one of the known set" without enumerating the set
  exhaustively.

## Why role+regex name for the option buttons

Three reasons `selectLight` / `selectDark` use
`page.getByRole('button', { name: /light/i }).first()`
instead of a CSS attribute selector or a `data-testid`:

- **Locale invariance.** The `i` flag on the regex is
  case-insensitive, but the regex itself targets the
  English-language label substring. A future translation
  pass would translate the label into French / Spanish /
  German / Arabic / Chinese and the role+regex selector
  would fail. The substring is **deliberately English-only**
  today because the dropdown's option buttons are
  content-free Tailwind UI buttons that show the label as
  the only accessible name; a future i18n pass on the
  dropdown labels would need a corresponding driver update.
  See the failure matrix below.
- **Strict-mode resilience against multiple "light"
  matches.** A "light theme" CTA banner elsewhere on the
  page would also match `name: /light/i`. `.first()` pins
  the locator to the first match (the dropdown option,
  because the dropdown is rendered above the fold once
  open). A spec that needs the second match must use
  `nth(1)` directly.
- **Production-source-first selector discipline.** The
  role+name selector mirrors what a screen reader hears
  when navigating the dropdown (`"Light, button"`); it is
  the right surface for an accessible-by-default e2e test.

## Why `isDarkMode()` reads `<html>`'s class

Three reasons the dark-mode check reads the `<html>` class
list instead of `<body>`, `<main>`, or a React Context value:

- **Tailwind's `darkMode: 'class'` posture.** The host app
  configures Tailwind's dark-mode hook on the `dark` class
  applied to `<html>` (see the
  `.claude/skills/tailwind-css-patterns/references/responsive-design.md`
  and `.claude/skills/tailwind-v4-shadcn/references/dark-mode.md`
  references). Reading `<html>`'s class is the right
  surface for the assertion.
- **Server-render parity.** The `dark` class is set on
  `<html>` server-side via the
  `rendering-hydration-no-flicker.md` posture (a synchronous
  pre-hydration script reads the user's preference and
  writes the class), so the assertion survives the
  hydration race.
- **No-flicker guarantee.** The substring scan tolerates a
  future class-list expansion (e.g. `class="dark theme-everworks
  notranslate"`) because the test only requires the `dark`
  substring to be present.

## Failure matrix

| Mistake on `theme-toggle.page.ts`                          | Layer that surfaces it                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Drop `import type` for `Page` / `Locator`                  | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner.                  |
| Add an `extends BasePage` clause                           | Forces every spec to pay for `header` / `footer` / `navLinks` Locator resolution; couples the driver to page shell. |
| Drop `readonly` from `page` or `toggleButton`              | Cross-test state-leak risk against shared driver instances.                                                       |
| Switch `toggleButton` to `aria-label="Current theme: Light"` exact match | First-render flake against any theme other than "Light"; breaks on every theme rename.                            |
| Drop `.first()` on `toggleButton`                          | Strict-mode collision against a future second theme switch (admin-shell, portal, mobile drawer).                  |
| Replace `aria-label*="Current theme"` with `data-testid`   | Forces a production-source change purely for the e2e suite — violates the production-source-first selector posture. |
| Switch the option-button locator to a CSS attribute selector | Multiple buttons match (e.g. `button.theme-option`) and surface a strict-mode violation on every selection call.   |
| Switch the option-button locator to a text-only selector   | Localised pages fail to resolve the button if/when the option labels are translated; no `i` flag means case-strict matching. |
| Drop `.first()` on the option-button locator               | Strict-mode collision against a "light theme" CTA banner elsewhere on the page.                                   |
| Read state from `localStorage` / React Context             | Couples the e2e suite to internal state; survives a storage migration only if every driver is rewritten.          |
| Read the dark-mode flag from `<body>` / `<main>`           | Tailwind's `darkMode: 'class'` posture is `<html>`-scoped; reading the wrong element returns `false` even in dark mode. |
| Drop the `'unknown'` branch from `getCurrentTheme`         | A future fifth theme breaks every assertion that pins to one of the known returns; the open enum is the right shape. |
| Move the file out of `apps/web-e2e/page-objects/public/`   | `Cannot find module` on every importing spec.                                                                     |
| Rename `ThemeToggle`                                       | Every importer needs a matching rename.                                                                           |
| Switch the file extension to `.tsx`                        | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks.                                      |
| Drop the trailing newline                                  | Prettier diff.                                                                                                    |
| Ship the file with CRLF line endings                       | Same as above.                                                                                                    |

## Per-line walkthrough

| Line(s) | Code                                                                                                              | Purpose                                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | `import type { Page, Locator } from '@playwright/test';`                                                          | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost.                                                                                                     |
| 3–5     | `/** Page object for the theme toggle component in the header. */`                                                | JSDoc summary that surfaces in IDE hover for every importer.                                                                                                                       |
| 6       | `export class ThemeToggle {`                                                                                      | Single named export, no `extends` clause — see "Why the class does not extend `BasePage`" above.                                                                                   |
| 7       | `readonly page: Page;`                                                                                            | Stores the Playwright `Page` handle the constructor receives.                                                                                                                      |
| 8       | `readonly toggleButton: Locator;`                                                                                 | Pre-bound toggle-button Locator.                                                                                                                                                   |
| 10–13   | `constructor(page: Page) { this.page = page; this.toggleButton = page.locator('button[aria-label*="Current theme"]').first(); }` | Stores the `page` and pre-binds the toggle button Locator. The substring `aria-label*="Current theme"` is the load-bearing selector. `.first()` pins to the first match. |
| 16      | `async getCurrentTheme(): Promise<string> {`                                                                     | Returns the currently-selected theme parsed from the toggle button's `aria-label`.                                                                                                 |
| 17–20   | label scan + return                                                                                               | Substring scan for `"light"` / `"dark"`, with `'unknown'` fallback for every other theme (`material`, `funny`, `corporate`, …).                                                   |
| 24–26   | `async open() { await this.toggleButton.click(); }`                                                              | The minimal "open the dropdown" primitive every other method composes against.                                                                                                     |
| 29–33   | `async selectLight() { await this.open(); const lightButton = ...; await lightButton.click(); }`                  | Composes `open()` + role+regex-name resolution + click. `.first()` pins to the first matching button.                                                                              |
| 36–40   | `async selectDark() { ... }`                                                                                      | Mirror of `selectLight` for the **dark** option.                                                                                                                                   |
| 43–46   | `async isDarkMode(): Promise<boolean> { ... }`                                                                   | Reads the `<html>` class list and returns whether the `dark` substring is present.                                                                                                 |

## Read / write surface

| Caller                                                                                                                                  | Reads                                                                          | Writes                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/web-e2e/tests/public/theme-toggle.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/theme-toggle.spec.ts) | `toggleButton` (visibility / `aria-expanded`), `isDarkMode()` (boolean assertion) | Calls `open()` to flip `aria-expanded`; calls `selectDark()` / `selectLight()` to flip the `<html>` class.                                                                                                                                                                              |
| Future smoke / a11y specs                                                                                                              | `getCurrentTheme()` for a dual-mode spec that asserts both light and dark renders | Same write surface as today's spec.                                                                                                                                                                                                                                                     |
| [`apps/web/components/header/theme-switch.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/components/header/theme-switch.tsx) (production source for the DOM contract) | The `aria-label="Current theme: ${label}"` shape and the dropdown option buttons                            | The `dark` class on `<html>` (via the `useTheme()` hook).                                                                                                                                                                                                                              |
| [`e2e-tsconfig.md`](e2e-tsconfig.md)                                                                                                   | The `include: ["./**/*.ts"]` glob picks up this file.                          | —                                                                                                                                                                                                                                                                                       |
| [`playwright-config.md`](playwright-config.md)                                                                                          | Resolves the relative `/` path the consuming spec navigates to via `baseURL`.   | —                                                                                                                                                                                                                                                                                       |

### Read / write surface — failure modes

| Drift                                                                                                  | Surfaces as                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production-source rename of the `aria-label` from `Current theme: …` to `Theme: …`                     | Strict-mode `Locator not found` on every theme-toggle spec; every assertion against `toggleButton` fails.                                                                                         |
| Production-source switch to a `select` element                                                         | The `getByRole('button', { name: /light/i })` resolution fails to find the option; `selectLight` / `selectDark` fail with a Playwright timeout.                                                  |
| Production-source switch from `class="dark"` to a CSS attribute (`data-theme="dark"`)                  | `isDarkMode()` returns `false` even in dark mode — every dark-mode assertion silently passes wrong.                                                                                              |
| Tailwind v4 `darkMode: 'media'` switch (drops the `dark` class entirely)                               | `isDarkMode()` returns `false` in every render; the assertion is no longer meaningful.                                                                                                            |
| Middleware change that prefixes the home route (`localePrefix: 'always'`)                              | The consuming spec's `page.goto('/')` lands on a redirect chain the toggle button is not part of; `toggleButton.toBeVisible()` times out.                                                        |
| `playwright.config.ts` `baseURL` change                                                                | The relative `/` resolves to a different host; the toggle is not present and the spec fails on visibility.                                                                                       |

## Change checklist

Any change to `theme-toggle.page.ts` must:

- Audit every spec under `apps/web-e2e/tests/public/theme-toggle.spec.ts`
  for compatibility with the new shape.
- Cross-check [`base-page-object.md`](base-page-object.md) for the
  `BasePage` posture — if the new shape inherits from `BasePage`,
  document the why.
- Cross-check the production source at
  [`apps/web/components/header/theme-switch.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/components/header/theme-switch.tsx)
  for the `aria-label` shape, the dropdown option-button shape, and
  the `<html>`-class hook.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for the
  `include: ["./**/*.ts"]` glob coverage.
- Cross-check [`playwright-config.md`](playwright-config.md) for
  the `baseURL` posture the consuming spec relies on.
- Cross-check [`fixtures-index.md`](fixtures-index.md) — today the
  driver is instantiated inline by the consuming spec, but a
  future fixture-bound theme-toggle would surface here.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the theme-toggle
  spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep theme`).
- Add a [`docs/log.md`](../log.md) entry describing the change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that affects test
  authoring.
- Reviewer pass.
