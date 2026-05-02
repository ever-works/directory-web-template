---
id: language-switcher-page-object
title: E2E Language-Switcher Page Object (apps/web-e2e/page-objects/public/language-switcher.page.ts)
sidebar_label: E2E Language-Switcher Page Object
sidebar_position: 388
---

# E2E Language-Switcher Page Object — `apps/web-e2e/page-objects/public/language-switcher.page.ts`

Per-source-file reference for the Playwright e2e suite's
**header locale-switcher** driver paired with
[`apps/web-e2e/page-objects/public/language-switcher.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/language-switcher.page.ts).
Sits inside the `public/` page-object subtree, alongside the
thirteen other public-surface page objects
(`discover.page.ts`, `item-detail.page.ts`,
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
[`star-rating-page-object.md`](star-rating-page-object.md)
documents the **suite's per-item rating-picker driver
boundary** under `apps/web-e2e/page-objects/public/`, this
page documents the **suite's locale-switching driver
boundary** — the smallest possible page object that lets a
spec drive the global header language-switcher dropdown
end-to-end (open the dropdown by clicking the
`aria-label="Select language"` trigger button, select any
locale by its **full localized display name** (`"Français"`,
`"Español"`, `"Deutsch"`, `"العربية"`, `"中文"`) via the
`aria-label="Switch to ${fullName}"` per-locale option
button, read the trigger button's current text content
upper-cased to expose the active locale code, and read the
`aria-expanded` attribute to assert that the dropdown is
open).

The file is the **only** driver in the suite for the global
header language-switcher today. Like
[`view-toggle-page-object.md`](view-toggle-page-object.md),
[`theme-toggle-page-object.md`](theme-toggle-page-object.md),
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md),
[`share-button-page-object.md`](share-button-page-object.md),
[`sort-menu-page-object.md`](sort-menu-page-object.md),
[`star-rating-page-object.md`](star-rating-page-object.md),
and unlike [`signin-page-object.md`](signin-page-object.md),
the class **does not extend `BasePage`** — see "Why the
class does not extend `BasePage`" below for the load-bearing
reason — so it carries its own `page` field and does not
inherit `header` / `footer` / `navLinks` / `goto` /
`gotoLocalized` / `waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md).

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`language-switcher` driver is consumed today by
[`apps/web-e2e/tests/public/language-switcher.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/language-switcher.spec.ts),
which covers four locale-switching flows from the home route
`/`:

- The trigger button is **visible in the header** at `/`
  with a 10-second visibility timeout.
- Clicking the trigger **opens the dropdown** — asserted by
  reading `aria-expanded === 'true'` via `isOpen()` (rather
  than asserting on the menu items, which keeps the test
  resilient to per-tenant locale-set changes).
- Selecting **Français** (`"Français"` localized display
  name) **navigates to `/fr`** — asserted by waiting for
  the URL to match `/\/fr/` with a 15-second timeout and a
  `page.url().includes('/fr')` post-check.
- Selecting **Español** (`"Español"` localized display
  name) **navigates to `/es`** — asserted by the same
  shape.

A spec that drives the language switcher inline (via
`page.locator('button[aria-label="Select language"]')`) is
a **drift** that this page object is the canonical
replacement for; new specs that touch the language switcher
must reach for this page object instead.

## At a glance

| Element                                     | Type           | What it is                                                                                                                                                                                                                                                                                                       | Why it matters                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }`             | typed import   | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                                                                                          | The public-tree drivers share the same `import type` discipline as the base class (see [`base-page-object.md`](base-page-object.md#why-import-type-and-not-a-runtime-import)). Three failure modes the type-only posture prevents: (a) bundle-size cost on every spec that imports a language-switcher driver, (b) circular-import risk against the runner's `test` export, (c) ambient drift between `import type` and the runner's runtime.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `export class LanguageSwitcher`             | named export   | Single class declaration with **no `extends` clause** — does not inherit from `BasePage`. The class stands alone with its own `page` field, one pre-bound `button` Locator pinned to `aria-label="Select language"`, a constructor, and four methods (`open()` / `selectLanguage(fullName)` / `getCurrentLocaleCode()` / `isOpen()`). | See "Why the class does not extend `BasePage`" below. The choice keeps the driver scoped to **just** the locale-switcher surface (no header / footer / nav-link assertions leak in), and lets a spec instantiate the driver against any header-bearing page (the public `/`, `/discover/[N]`, `/items/[slug]`, `/categories/[slug]`, or any of the localized `/[locale]/*` variants) without paying for the inherited Locators to resolve up-front.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `readonly page: Page`                       | field          | Stores the Playwright `Page` handle the constructor receives.                                                                                                                                                                                                                                                    | A `BasePage` subclass would inherit this field; the standalone class restates it. The field is `readonly` so a spec cannot accidentally re-point the driver mid-test. Crucially, the `page` field is **also** consumed inside `selectLanguage(fullName)` to construct the per-locale option Locator at call-time (rather than constructor-time) because the option set materialises only after `open()` has been called — and because the option set's exact membership depends on the host app's locale configuration which the driver is deliberately agnostic to.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `readonly button: Locator`                  | field          | `page.locator('button[aria-label="Select language"]').first()` — the canonical language-switcher trigger Locator: every `<button>` whose `aria-label` attribute is exactly `Select language`, pinned to the first match for strict-mode safety.                                                                  | The `aria-label="Select language"` attribute is the canonical accessible-name a screen reader announces when the user lands on the trigger. The pin to the **English** label `"Select language"` is **deliberate** — the production source writes this label as the **internationalization-key default** rather than translating it per-locale (see the `i18n` row in the failure matrix below for the load-bearing rationale). `.first()` survives a future second `aria-label="Select language"` button (e.g. a footer / sidebar duplicate, a mobile-drawer mirror, or a portal-rendered duplicate inside an admin shell).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `constructor(page: Page)`                   | constructor    | Stores the `page` and pre-binds the trigger Locator in a single pass.                                                                                                                                                                                                                                            | Single constructor signature, no `super(page)` call (because the class does not extend `BasePage`). Every spec instantiates `new LanguageSwitcher(page)` against the unauthenticated `page` fixture (because the language switcher is a public-header widget). The pre-bound posture keeps spec code terse — `langSwitcher.button.isVisible()` is the canonical visibility check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `async open()`                              | method         | `await this.button.click()` — single click on the trigger button.                                                                                                                                                                                                                                                | The "open the dropdown" primitive every other action method composes against. Symmetric posture with the `selectLanguage()` composite method that calls `open()` first. A spec that needs to test the dropdown opening without selecting a locale can call `open()` directly and then assert on `isOpen()` (the canonical pattern in the second consuming test).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `async selectLanguage(fullName: string)`    | method         | Composite "open the dropdown then click the per-locale option button matching the supplied **full localized display name**" primitive. Internally calls `this.open()`, then constructs a Locator at call-time via `this.page.locator(\`button[aria-label="Switch to ${fullName}"]\`)` and clicks it.                                       | The `fullName: string` parameter is load-bearing: every consuming spec passes a value like `"Français"` (not `"French"` and not `"FR"`), because the production source writes the per-locale option's `aria-label` as the **localized native display name**. This is the canonical "language picker shows each language in its own language" UX convention so a non-English speaker can find their language in the list. A regression that switches the option `aria-label` to an English-only `"Switch to French"` shape would silently break every consuming spec that uses `"Français"`. The Locator is built off `this.page.locator(…)` (not `this.button.locator(…)`) because the dropdown's option buttons may be rendered into a portal that is not a DOM descendant of the trigger button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `async getCurrentLocaleCode(): Promise<string>` | method     | Reads `this.button.textContent()`, trims whitespace, upper-cases, and returns the result with a `?? ''` nullish-coalesce that pins the public return type to `Promise<string>` even when `textContent()` returns `null` (the degenerate empty-element case).                                                     | The trigger button's text content is the host app's "currently active locale" indicator (e.g. `"EN"`, `"FR"`, `"ES"`, `"DE"`, `"AR"`, `"ZH"`). The host app writes the code in upper-case today, but a future production-source switch to lower-case (`"en"` → `"En"` → `"EN"`) would silently change the assertion shape; the `.toUpperCase()` collapses every casing variant into the canonical UPPER-CASE form. The `?.trim()` strips accidental whitespace introduced by the host app's flex / gap rendering. The `?? ''` collapses the `null` branch into a definitive empty-string fallback so consuming specs do not need a bespoke `if (code !== null)` narrowing. Defensive symmetry with `theme-toggle-page-object.md`'s `getCurrentTheme()` and `search-bar-page-object.md`'s `getValue()` posture.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `async isOpen(): Promise<boolean>`          | method         | Reads `this.button.getAttribute('aria-expanded')` and returns `expanded === 'true'`.                                                                                                                                                                                                                             | The `aria-expanded` attribute is the canonical ARIA primitive every responsible UI library writes onto a disclosure trigger to expose the open / closed state to assistive technology. The strict-equality check against the string literal `'true'` is load-bearing: `getAttribute` returns `string \| null`, and `null !== 'true'` collapses both the missing-attribute case and the `aria-expanded="false"` case into a definitive `false` return. A consuming spec asserts `expect(await langSwitcher.isOpen()).toBe(true)` after `open()` and `expect(...).toBe(false)` before `open()` — the canonical disclosure-state assertion shape.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the language switcher component in the header.
 */
export class LanguageSwitcher {
	readonly page: Page;
	readonly button: Locator;

	constructor(page: Page) {
		this.page = page;
		this.button = page.locator('button[aria-label="Select language"]').first();
	}

	/** Open the language dropdown */
	async open() {
		await this.button.click();
	}

	/** Select a locale by its full name (e.g. "Français", "Español") */
	async selectLanguage(fullName: string) {
		await this.open();
		const langButton = this.page.locator(`button[aria-label="Switch to ${fullName}"]`);
		await langButton.click();
	}

	/** Get the currently displayed locale code from the button text */
	async getCurrentLocaleCode(): Promise<string> {
		const text = await this.button.textContent();
		return text?.trim().toUpperCase() ?? '';
	}

	/** Check if the dropdown is expanded */
	async isOpen(): Promise<boolean> {
		const expanded = await this.button.getAttribute('aria-expanded');
		return expanded === 'true';
	}
}
```

## Why the class does not extend `BasePage`

Three load-bearing reasons the public-tree language-switcher
driver stands alone instead of inheriting from
[`base-page-object.md`](base-page-object.md):

- **Composition over inheritance against the global header
  surface.** The language switcher is a single header-mounted
  control — it is not a "page" in the URL sense.
  Inheriting from `BasePage` would force every spec that
  instantiates the driver to pay for the `header` /
  `footer` / `navLinks` Locator resolution even when the
  spec only needs the trigger and the dropdown. The
  standalone class lets a spec compose the driver into a
  larger page object's flow (e.g. a `DiscoverPage` flow that
  switches locale mid-test, or a localized-route smoke that
  drives the switcher to verify per-locale rendering)
  without inheriting page-shell concerns.
- **Reusability across all role trees.** A future admin-shell
  or client-shell language switcher (e.g. an admin-only
  language-set-management widget that re-uses the same
  ARIA contract) would also be a `LanguageSwitcher`
  consumer. Tying the driver to `BasePage`'s public-tree
  `header` Locator would prevent that reuse without either
  a base-class change or a bespoke per-tree driver.
- **Constructor parity with non-page widgets.** The
  `(page: Page)` signature without a `super(page)` call
  matches every other public-tree widget driver (e.g.
  `theme-toggle.page.ts`, `view-toggle.page.ts`,
  `share-button.page.ts`, `scroll-to-top.page.ts`,
  `search-bar.page.ts`, `sort-menu.page.ts`,
  `star-rating.page.ts` — all of which mirror this same
  posture). Keeping the inheritance discipline consistent
  across the public-tree widget drivers makes the tree
  scannable for a new contributor.

## Why the trigger pins the English `aria-label="Select language"`

Three reasons the trigger Locator pins to the literal English
string `"Select language"` instead of a substring match, a
locale-aware variant, or a `data-testid`:

- **The host app does not translate this label.** The
  production source writes `aria-label="Select language"`
  as a fixed English literal — the convention is that the
  language picker's own affordances stay in the
  application's source language so a user who landed on a
  page in a language they cannot read can still find the
  switcher. A regression that wires the label through the
  i18n layer (`t('header.languagePicker.ariaLabel')`) would
  break this driver but **also** break the UX contract; the
  driver staying English-only pins both invariants.
- **Strict equality survives a future related-control
  regression.** A future contributor might add a
  `aria-label="Choose region"` or `aria-label="Switch
  currency"` button alongside the language switcher (e.g.
  a per-region locale picker that splits country and
  language). Pinning to the exact `"Select language"` value
  keeps the Locator strict-mode-safe.
- **No production-source change required.** The
  `aria-label="Select language"` attribute is already there
  for accessibility — adding a `data-testid` would be a
  production-source concession to the e2e suite. The repo
  prefers
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)'s
  "production-source-first" posture: drive the UI with
  the selectors a screen reader would use.

## Why per-locale options pin `aria-label="Switch to ${fullName}"`

Three reasons `selectLanguage(fullName)` builds the
per-locale option Locator from
`button[aria-label="Switch to ${fullName}"]` instead of
matching by visible text or a `data-testid`:

- **Localized display names are the canonical UX convention.**
  Every responsible language picker shows each language in
  its own language (`"Français"`, `"Español"`, `"Deutsch"`,
  `"العربية"`, `"中文"`) so a non-English speaker can find
  their language. The host app writes the per-locale option's
  `aria-label` as `"Switch to ${localizedNativeName}"` and
  the visible text inside the option as the same localized
  native name. Pinning the driver to the **`aria-label`**
  rather than the visible text is load-bearing because the
  visible text may be wrapped in flag-emoji + name layouts
  (e.g. `"🇫🇷 Français"`) that would break a strict
  visible-text match.
- **The full-name parameter forces consuming specs to think
  about which name to pass.** Passing `"Français"` (not
  `"French"` and not `"fr"`) makes consuming specs match the
  user's mental model. A future contributor who tries
  `selectLanguage("French")` will see a Playwright timeout
  and learn the convention from the failure mode.
- **No production-source change required.** The
  `aria-label="Switch to ${fullName}"` attribute is already
  there for accessibility — adding a `data-testid` per
  locale would be a production-source concession to the e2e
  suite.

## Why the option Locator does **not** carry `.first()`

The `selectLanguage(fullName)` method constructs
`this.page.locator(\`button[aria-label="Switch to ${fullName}"]\`)`
without a `.first()` pin (unlike the `button` field). Three
reasons this asymmetry is intentional:

- **The per-locale `aria-label` value is unique by design.**
  No two locales share the same localized native name, so
  the selector resolves to exactly one element on every
  shape — the strict-mode invariant is preserved without
  `.first()`.
- **Strict-mode signal preservation.** A future regression
  that mints two `aria-label="Switch to Français"` buttons
  (e.g. a desktop-and-mobile drawer pair that both render
  inline) would surface as a strict-mode violation rather
  than silently picking one. That's the **intended** signal
  — the consuming spec should fail loudly so a contributor
  can reconcile the duplicate.
- **Symmetric posture with `theme-toggle-page-object.md`'s
  per-mode buttons.** That sibling driver also avoids
  `.first()` on the per-mode buttons for the same reason.

## Why `.first()` on the trigger button

Three failure modes dropping `.first()` on the trigger
would introduce:

- **Strict-mode collision against a future second
  switcher.** The host app today renders one language
  switcher in the header; a future footer mirror, mobile-
  drawer mirror, or sidebar duplicate that also writes
  `aria-label="Select language"` would surface a
  strict-mode violation on every language-switcher spec on
  every page that ships such a widget.
- **Strict-mode collision against an already-rendered
  duplicate.** A future portal-rendered switcher (e.g. a
  mobile drawer that mirrors the desktop switcher) would
  mount a second instance of the same DOM. `.first()`
  pins to the visible primary instance.
- **Strict-mode collision against an admin-shell mirror.**
  A future admin shell that ships its own header-mounted
  language switcher would mount a second instance.

## Why the constructor uses `this.page.locator(…)` and not the inherited `header` scope

The driver does not narrow the trigger Locator to the
header subtree (`this.header.locator(…)`) — three reasons:

- **The class does not extend `BasePage`.** There is no
  `header` field on the standalone class. Adding one would
  reintroduce the inheritance the class deliberately
  avoids (see "Why the class does not extend `BasePage`"
  above).
- **The trigger Locator's `aria-label="Select language"`
  is unique on every page today.** Scoping to the header
  subtree adds a CSS-selector cost without a strict-mode
  payoff.
- **Future header-less surfaces.** A future admin / client
  shell that hides the global header and renders the
  language switcher in a sidebar or modal would still
  surface through the page-level Locator without a code
  change.

## Why `getCurrentLocaleCode()` upper-cases the result

Three reasons `getCurrentLocaleCode()` calls
`text?.trim().toUpperCase()` instead of returning the raw
text content:

- **Casing-drift tolerance.** The host app writes the
  active-locale code in UPPER-CASE today (`"EN"`, `"FR"`,
  …); a future production-source switch to lower-case
  (`"en"`, `"fr"`) or title-case (`"En"`, `"Fr"`) would
  silently change the assertion shape on every consuming
  spec. The upper-case fold collapses every variant into
  the canonical UPPER-CASE form.
- **Symmetric to ISO 639-1 convention.** Locale codes are
  conventionally written UPPER-CASE in UI surfaces (`"EN"`,
  `"FR"`, `"DE"`) and lower-case in URL paths (`/fr`,
  `/de`). The driver's UPPER-CASE return matches the UI
  convention while leaving consuming specs free to
  `.toLowerCase()` for URL-prefix assertions.
- **Defensive symmetry with sibling drivers.** Sibling
  drivers like `theme-toggle-page-object.md`'s
  `getCurrentTheme()` collapse string returns to a
  canonical form too. Keeping the discipline consistent
  across public-tree widget drivers makes the tree
  scannable.

## Why `isOpen()` checks `aria-expanded === 'true'`

Three reasons `isOpen()` reads the `aria-expanded`
attribute instead of inspecting the DOM for the dropdown's
visibility:

- **The ARIA attribute is the screen-reader contract.**
  `aria-expanded` is the canonical disclosure-state
  primitive every responsible UI library writes onto a
  trigger. Pinning the driver to it means the e2e suite
  drives the UI the same way an assistive-technology user
  observes it.
- **Resilience to portal-rendered dropdowns.** The dropdown
  may be rendered into a React portal at the document root
  (the HeroUI / Radix / Headless UI default), making it
  not a DOM descendant of the trigger. Reading
  `aria-expanded` on the trigger sidesteps the portal
  question entirely.
- **String-literal equality narrows the boolean return.**
  `getAttribute` returns `string | null`, and the strict
  `=== 'true'` check collapses both the missing-attribute
  case and the `aria-expanded="false"` case into a
  definitive `false` return. The boolean result type is
  pinned to `Promise<boolean>` without a bespoke
  null-narrowing branch.

## Failure matrix

| Mistake on `language-switcher.page.ts`                                          | Layer that surfaces it                                                                                                |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Drop `import type` for `Page` / `Locator`                                       | Bundle-size cost on every spec that imports the driver; circular-import risk against the runner.                      |
| Add an `extends BasePage` clause                                                | Forces every spec to pay for `header` / `footer` / `navLinks` Locator resolution; couples the driver to page shell.   |
| Drop `readonly` from `page` or `button`                                         | Cross-test state-leak risk against shared driver instances.                                                            |
| Switch `button` to `aria-label*="language"` substring match                     | Future related buttons (`"Choose region"`, `"Switch language preferences"`) collide; strict-mode chaos.                |
| Wire `aria-label` through the i18n layer (`t('header.languagePicker.ariaLabel')`) | Locale-dependent label silently breaks every spec that runs against a non-English baseline.                            |
| Switch `button` to a `data-testid`                                              | Forces a production-source change purely for the e2e suite — violates the production-source-first selector posture.    |
| Drop `.first()` on `button`                                                     | Strict-mode collision against a future second language switcher (footer mirror, mobile-drawer mirror, admin mirror).   |
| Switch `selectLanguage` to match by visible text instead of `aria-label`        | Flag-emoji-prefixed visible text (e.g. `"🇫🇷 Français"`) silently breaks the option resolution.                       |
| Switch `selectLanguage` to take a locale code (`"fr"`) instead of a full name   | Consuming specs must change every call site; full-localized-display-name is the load-bearing convention.               |
| Switch `selectLanguage` to scope through `this.button.locator(…)`               | Portal-rendered dropdowns are not DOM descendants of the trigger; per-locale options fail to resolve.                  |
| Add `.first()` to the per-locale option Locator                                 | Silently picks one of two duplicates instead of failing loudly — masks a future duplicate-button regression.           |
| Drop the `?.trim()` from `getCurrentLocaleCode`                                 | Whitespace introduced by flex / gap rendering breaks exact-substring assertions in consuming specs.                    |
| Drop the `.toUpperCase()` from `getCurrentLocaleCode`                           | Future casing drift in the production source silently changes the assertion shape on every consuming spec.             |
| Drop the `?? ''` from `getCurrentLocaleCode`                                    | Public return type leaks `string \| undefined`; consuming specs need bespoke narrowing.                                |
| Switch `isOpen` to `=== expanded` (forgetting the string-literal comparison)    | TypeScript catches it at compile time — the variable is `string \| null`, not `boolean`.                              |
| Switch `isOpen` to `await this.button.locator('+ [role="menu"]').isVisible()`   | Portal-rendered dropdowns break the sibling-selector approach — the dropdown is not a DOM sibling of the trigger.      |
| Move the file out of `apps/web-e2e/page-objects/public/`                        | `Cannot find module` on every importing spec.                                                                          |
| Rename `LanguageSwitcher`                                                       | Every importer needs a matching rename.                                                                                |
| Switch the file extension to `.tsx`                                             | Falls out of the `include: ["./**/*.ts"]` glob; every importing spec breaks.                                           |
| Drop the trailing newline                                                       | Prettier diff.                                                                                                         |
| Ship the file with CRLF line endings                                            | Same as above.                                                                                                         |

## Per-line walkthrough

| Line(s) | Code                                                                                                              | Purpose                                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | `import type { Page, Locator } from '@playwright/test';`                                                          | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost.                                                                                                     |
| 3–5     | `/** Page object for the language switcher component in the header. */`                                           | JSDoc summary that surfaces in IDE hover for every importer.                                                                                                                       |
| 6       | `export class LanguageSwitcher {`                                                                                 | Single named export, no `extends` clause — see "Why the class does not extend `BasePage`" above.                                                                                   |
| 7       | `readonly page: Page;`                                                                                            | Stores the Playwright `Page` handle the constructor receives — also consumed inside `selectLanguage` to construct the option Locator at call-time against page-level scope.       |
| 8       | `readonly button: Locator;`                                                                                       | Pre-bound trigger Locator pinned to `aria-label="Select language"` with `.first()`.                                                                                                |
| 10–13   | `constructor(page: Page) { this.page = page; this.button = …; }`                                                  | Stores the `page` and pre-binds the trigger Locator in a single pass.                                                                                                              |
| 16–18   | `async open() { await this.button.click(); }`                                                                     | The "open the dropdown" primitive — single click on the trigger button.                                                                                                            |
| 21–25   | `async selectLanguage(fullName: string) { await this.open(); const langButton = this.page.locator(\`button[aria-label="Switch to ${fullName}"]\`); await langButton.click(); }` | The composite "open the dropdown then click the per-locale option button" primitive. Page-level scoped because the dropdown may be portal-rendered.                                |
| 28–31   | `async getCurrentLocaleCode(): Promise<string> { const text = await this.button.textContent(); return text?.trim().toUpperCase() ?? ''; }` | Reads the trigger button's text content and returns the trimmed UPPER-cased string with a `?? ''` fallback.                                                                        |
| 34–37   | `async isOpen(): Promise<boolean> { const expanded = await this.button.getAttribute('aria-expanded'); return expanded === 'true'; }` | Reads the `aria-expanded` attribute and returns the strict-equality comparison against the string literal `'true'`.                                                                |

## Read / write surface

| Caller                                                                                                                                  | Reads                                                                                                          | Writes                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/web-e2e/tests/public/language-switcher.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/language-switcher.spec.ts) | The trigger-visibility check (`langSwitcher.button.isVisible()`); `langSwitcher.isOpen()` after `open()`; `page.url()` after `selectLanguage('Français')` and `selectLanguage('Español')` | Calls `langSwitcher.open()` to drive the dropdown open; calls `langSwitcher.selectLanguage('Français')` and `selectLanguage('Español')` to drive locale switches that trigger client-side navigation to `/fr` and `/es`. |
| Future smoke / a11y specs                                                                                                              | `langSwitcher.getCurrentLocaleCode()` after a per-locale navigation to assert the active-code render          | Calls `selectLanguage('Deutsch')`, `selectLanguage('العربية')`, `selectLanguage('中文')` to drive the remaining locale-switch flows; calls `selectLanguage('English')` to revert.                                                                                                       |
| Header production-source component (the production source for the DOM contract)                                                       | The trigger button's `aria-label="Select language"` attribute; the per-locale option buttons' `aria-label="Switch to ${fullName}"`; the `aria-expanded` attribute; the trigger's text content with the active-locale code | Writes the trigger button with the active locale code (`"EN"` / `"FR"` / `"ES"` / …); writes the per-locale option buttons; writes the `aria-expanded` flip on `open()`. |
| [`e2e-tsconfig.md`](e2e-tsconfig.md)                                                                                                   | The `include: ["./**/*.ts"]` glob picks up this file.                                                          | —                                                                                                                                                                                                                                                                                       |
| [`playwright-config.md`](playwright-config.md)                                                                                          | Resolves the relative `/`, `/fr`, `/es` paths the consuming spec navigates to via `baseURL`.                   | —                                                                                                                                                                                                                                                                                       |

### Read / write surface — failure modes

| Drift                                                                                                  | Surfaces as                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production-source switch from `aria-label="Select language"` to a translated value                     | The `button.isVisible()` returns `false`; the consuming spec fails on the visibility timeout.                                                                                                      |
| Production-source switch from per-locale `aria-label="Switch to Français"` to a code-based variant     | The `selectLanguage('Français')` call times out; the consuming spec fails.                                                                                                                          |
| Production-source rename of the option's localized name (e.g. `"Français"` → `"Le français"`)          | Same — `selectLanguage('Français')` times out; the consuming spec fails.                                                                                                                            |
| Production-source change to active-locale code casing (`"EN"` → `"en"`)                                | `getCurrentLocaleCode()` continues to return the canonical UPPER-CASE form because of `.toUpperCase()` — invariant.                                                                                |
| Production-source change to the dropdown rendering (portal → inline subtree)                           | `isOpen()` continues to work because it reads `aria-expanded` on the trigger — invariant.                                                                                                          |
| Removing `aria-expanded` from the trigger library                                                      | `isOpen()` returns `false` always; consuming spec's `expect(isOpen).toBe(true)` after `open()` fails.                                                                                              |
| Disabling locales via host-app feature flag (e.g. removing `/fr` from `next-intl`)                     | `selectLanguage('Français')` times out because the per-locale option is not rendered; consuming spec fails. This is the **intended** drift surface.                                                |
| Middleware change that prefixes the home route (`localePrefix: 'always'`)                              | The consuming spec's `page.goto('/')` lands on `/en` (or the default locale prefix); the trigger is still visible because it is a global header widget — invariant.                                |
| `playwright.config.ts` `baseURL` change                                                                | The relative `/`, `/fr`, `/es` resolve to a different host; the trigger is still visible if the host serves the same UI; navigation assertions may fail if the locale routes differ.                |

## Change checklist

Any change to `language-switcher.page.ts` must:

- Audit every spec under
  `apps/web-e2e/tests/public/language-switcher.spec.ts`
  for compatibility with the new shape.
- Cross-check [`base-page-object.md`](base-page-object.md)
  for the `BasePage` posture — if the new shape inherits
  from `BasePage`, document the why.
- Cross-check the production source for the header
  language-switcher component for the trigger's
  `aria-label="Select language"` attribute, the per-locale
  option buttons' `aria-label="Switch to ${fullName}"`
  shape, the `aria-expanded` attribute that `isOpen()`
  reads, and the trigger button's text-content shape that
  `getCurrentLocaleCode()` reads.
- Cross-check the host app's `next-intl` configuration —
  the locale set the production source surfaces in the
  dropdown is the set every consuming spec can pass to
  `selectLanguage()`.
- Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) for the
  `include: ["./**/*.ts"]` glob coverage.
- Cross-check [`playwright-config.md`](playwright-config.md)
  for the `baseURL` posture the consuming spec relies on.
- Cross-check [`fixtures-index.md`](fixtures-index.md) —
  today the driver is instantiated against the
  unauthenticated `page` fixture; a future authenticated
  variant would surface here.
- Run dual `pnpm tsc --noEmit` (e2e + workspace root).
- Run a smoke-subset Playwright run targeting the
  language-switcher spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Language Switcher"`).
- Add a [`docs/log.md`](../log.md) entry describing the
  change.
- Cross-link [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  if the change introduces a new shared concept that
  affects test authoring.
- Reviewer pass.
