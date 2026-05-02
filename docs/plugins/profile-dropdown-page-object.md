---
id: profile-dropdown-page-object
title: E2E Profile-Dropdown Page Object (apps/web-e2e/page-objects/public/profile-dropdown.page.ts)
sidebar_label: E2E Profile-Dropdown Page Object
sidebar_position: 392
---

# E2E Profile-Dropdown Page Object — `apps/web-e2e/page-objects/public/profile-dropdown.page.ts`

Per-source-file reference for the Playwright e2e suite's
**header profile-dropdown menu** driver paired with
[`apps/web-e2e/page-objects/public/profile-dropdown.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/profile-dropdown.page.ts).
Sits inside the `public/` page-object subtree, alongside the
thirteen other public-surface page objects
(`discover.page.ts`, `item-detail.page.ts`,
`language-switcher.page.ts`, `map.page.ts`,
`newsletter.page.ts`, `public-pages.page.ts`,
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
[`newsletter-page-object.md`](newsletter-page-object.md)
documents the **suite's footer newsletter-signup widget
driver boundary** under `apps/web-e2e/page-objects/public/`,
this page documents the **suite's header profile-dropdown
menu driver boundary** — the smallest possible page object
that lets a spec drive the global header avatar / profile
button dropdown end-to-end (locate the trigger button by its
canonical production-source `id="user-menu-button"`
identifier, locate the dropdown-menu container by its
canonical production-source `id="profile-menu"` identifier,
locate every `[role="menuitem"]` child of the menu as a
collection for `clickMenuItem` filtering, locate the
**last** menu item as the canonical "Logout" / "Sign out"
button by positional convention, open the menu via a click
on the trigger button, read the menu's open state via the
trigger button's `aria-expanded` attribute, click any menu
item by a case-insensitive `RegExp` `hasText` filter on its
visible label, and click the last menu item directly via
the dedicated `logout()` primitive).

The file is the **only** driver in the suite for the header
profile-dropdown menu today. Like
[`scroll-to-top-page-object.md`](scroll-to-top-page-object.md),
[`view-toggle-page-object.md`](view-toggle-page-object.md),
[`theme-toggle-page-object.md`](theme-toggle-page-object.md),
[`star-rating-page-object.md`](star-rating-page-object.md),
[`sort-menu-page-object.md`](sort-menu-page-object.md),
[`share-button-page-object.md`](share-button-page-object.md),
[`search-bar-page-object.md`](search-bar-page-object.md),
[`newsletter-page-object.md`](newsletter-page-object.md),
and [`language-switcher-page-object.md`](language-switcher-page-object.md),
the class **does not extend `BasePage`** — see "Why the
class does not extend `BasePage`" below for the load-bearing
reason — so it carries its own `page` field and does not
inherit `header` / `footer` / `navLinks` / `goto` /
`gotoLocalized` / `waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md).

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite, and
[Spec 003 — Auth Providers](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/003-auth-providers)
is the home spec for the authentication surface. The
`profile-dropdown` driver is consumed today by the
authentication-flow specs that exercise the post-sign-in
profile menu (the menu only renders when the user is
authenticated; the unauthenticated header surfaces a
`Sign in` button instead, which is the surface
[`signin-page-object.md`](signin-page-object.md) drives
through). A spec that drives the profile dropdown inline
(via `page.locator('#user-menu-button')` etc.) is a
**drift** that this page object is the canonical replacement
for; new specs that touch the header profile menu must reach
for this page object instead.

The driver's five-method posture (`open()` / `isOpen()` /
`clickMenuItem(name)` / `logout()`) encodes the four load-
bearing assertions every consuming spec walks: (a) **the
trigger button is clickable** — clicking it toggles the
dropdown's `aria-expanded` state, (b) **the menu's open
state is observable** — `isOpen()` reads the
`aria-expanded` attribute on the trigger button, (c) **any
menu item is clickable by its visible label** —
`clickMenuItem(/Profile/)` resolves a single `[role="menuitem"]`
via the `hasText` filter and clicks it, (d) **the last menu
item is the logout button by convention** — the
production source guarantees the logout / sign-out item is
the bottom-most entry in the dropdown.

## At-a-glance summary

| Element | Type | Purpose |
| --- | --- | --- |
| `import type { Page, Locator } from '@playwright/test'` | type-only import | Mirrors the type-only import discipline of every other public-tree page object so the runtime bundle pays nothing for the Playwright type surface. |
| `export class ProfileDropdown` | single named export | The driver's only export. **No `extends` clause** — the class stands alone (see "Why the class does not extend `BasePage`"). |
| `readonly page: Page` | bound field | Stores the Playwright `Page` handle the constructor receives. The standalone class must restate this because it does not inherit `BasePage.page`. |
| `readonly triggerButton: Locator` | bound `Locator` | The dropdown trigger button, pre-bound via `page.locator('#user-menu-button')`. The HTML-`id`-based selector is load-bearing — see "Why the trigger button uses `#user-menu-button`". |
| `readonly menu: Locator` | bound `Locator` | The dropdown menu container, pre-bound via `page.locator('#profile-menu')`. Symmetric with `triggerButton` — both reach for the production source's canonical HTML-`id` accessibility wiring. |
| `readonly menuItems: Locator` | bound `Locator` | The collection of every `[role="menuitem"]` inside the menu, pre-bound via `this.menu.locator('[role="menuitem"]')`. The Locator is **scoped to `this.menu`** so it does not catch `[role="menuitem"]` elements from a sibling dropdown (the language-switcher, the theme-toggle dropdown, etc.) on the same page. |
| `readonly logoutButton: Locator` | bound `Locator` | The last menu item (canonical "Logout" / "Sign out" entry by positional convention), pre-bound via `this.menu.locator('[role="menuitem"]').last()`. The positional `.last()` append is load-bearing — see "Why the logout button uses `.last()`". |
| `constructor(page: Page)` | constructor | Stores the `page` handle and pre-binds the four Locators in a single pass. No `super(page)` call (because the class does not extend `BasePage`); no async work is performed. |
| `async open()` | action | Single click on the trigger button to toggle the dropdown to open. Symmetric one-liner that mirrors the `open(...)` primitives in `language-switcher-page-object.md` and `sort-menu-page-object.md`. |
| `async isOpen(): Promise<boolean>` | accessor | Reads the trigger button's `aria-expanded` attribute and compares it strictly to the literal string `'true'`. The strict-equality on the literal `'true'` is load-bearing — see "Why `isOpen()` checks the exact `'true'` string". |
| `async clickMenuItem(name: RegExp)` | composite action | Filters the menu-item collection by `hasText: name` (an arbitrary `RegExp` the spec passes), reaches for the first match via `.first()`, and clicks it. The `RegExp` parameter shape is load-bearing — see "Why `clickMenuItem` takes a `RegExp` not a `string`". |
| `async logout()` | shortcut action | Single click on the bottom-most menu item via the pre-bound `logoutButton` Locator. Equivalent to `clickMenuItem(/log\s*out|sign\s*out/i)` but cheaper — the spec does not pay for the regex compile / `hasText` filter / `.first()` match every time. |

## Full file annotated

```ts
import type { Page, Locator } from '@playwright/test';
```

The single type-only Playwright import. The `import type`
modifier guarantees the runtime bundle pays nothing for the
Playwright type surface. **No `BasePage` value import** —
unlike [`map-page-object.md`](map-page-object.md),
[`item-detail-page-object.md`](item-detail-page-object.md),
and [`signin-page-object.md`](signin-page-object.md), the
class stands alone, so the
`import { BasePage } from '../base.page'` value import is
absent.

```ts
/**
 * Page object for the profile dropdown menu in the header.
 */
export class ProfileDropdown {
```

The single named class export, with **no `extends BasePage`**
clause. The class name `ProfileDropdown` is the public name
every consuming spec imports.

```ts
	readonly page: Page;
	readonly triggerButton: Locator;
	readonly menu: Locator;
	readonly menuItems: Locator;
	readonly logoutButton: Locator;
```

Five `readonly` fields — one for the `page` handle and four
per-surface Locators. `readonly` is load-bearing on every
field because Playwright Locators are stateless query
descriptors and re-assigning a Locator after construction
would silently desynchronise the driver's call sites from
its constructor body.

```ts
	constructor(page: Page) {
		this.page = page;
		this.triggerButton = page.locator('#user-menu-button');
		this.menu = page.locator('#profile-menu');
		this.menuItems = this.menu.locator('[role="menuitem"]');
		this.logoutButton = this.menu.locator('[role="menuitem"]').last();
	}
```

The constructor stores the `page` handle and pre-binds every
per-page Locator in a single synchronous pass. Four load-
bearing choices encoded here:

1. **`#user-menu-button` HTML-`id` selector** — the
   production source emits a canonical `id="user-menu-button"`
   attribute on the trigger button; the e2e selector pins to
   that ID rather than a class / role / text selector
   because the ID is the production source's canonical
   accessibility-wiring primitive (referenced from the
   menu's `aria-controls` / `aria-labelledby` attributes
   internally).
2. **`#profile-menu` HTML-`id` selector** — symmetric with
   the trigger button. The production source emits
   `id="profile-menu"` on the dropdown's root container.
3. **`this.menu.locator('[role="menuitem"]')`** — the
   menu-item collection is **scoped to `this.menu`** so it
   does not catch `[role="menuitem"]` elements from a
   sibling dropdown on the same page (the language-switcher,
   the theme-toggle's dropdown variant, an open admin-table
   row-actions menu, etc.).
4. **`this.menu.locator('[role="menuitem"]').last()`** — the
   logout button is bound by **positional convention** —
   the production source guarantees the logout / sign-out
   item is the bottom-most entry in the dropdown. The
   `.last()` append pins the assertion to that positional
   convention without coupling to the button's locale-
   sensitive label.

```ts
	async open() {
		await this.triggerButton.click();
	}
```

The single-step open primitive. The click toggles the
dropdown to open. A second click closes it (toggle
semantics) — but consuming specs that need to close the
dropdown should reach for `clickMenuItem(...)` or `logout()`
instead, which trigger a navigation that closes the dropdown
as a side-effect.

```ts
	async isOpen(): Promise<boolean> {
		const expanded = await this.triggerButton.getAttribute('aria-expanded');
		return expanded === 'true';
	}
```

The open-state accessor. Reads the trigger button's
`aria-expanded` attribute (the WAI-ARIA-canonical disclosure
indicator) and compares it strictly to the literal string
`'true'`. The strict-equality is load-bearing — see "Why
`isOpen()` checks the exact `'true'` string" below.

```ts
	async clickMenuItem(name: RegExp) {
		const item = this.menuItems.filter({ hasText: name }).first();
		await item.click();
	}
```

The arbitrary-menu-item click primitive. Three load-bearing
choices encoded here:

1. **`name: RegExp`** — the parameter is a `RegExp` not a
   `string` so consuming specs can pass case-insensitive /
   anchored / locale-flexible patterns (`/profile/i`,
   `/^Settings$/`, `/log\s*out/i`). See "Why
   `clickMenuItem` takes a `RegExp` not a `string`" below
   for the load-bearing reason.
2. **`this.menuItems.filter({ hasText: name })`** — the
   `hasText` filter on the pre-bound menu-items collection
   resolves to every menu item whose text content matches
   the regex. The Locator is scoped to `this.menu` (via the
   `menuItems` field's binding), so it does not catch
   menu-items from a sibling dropdown.
3. **`.first()`** — strict-mode-correctness append against
   a future menu that contains two items with the same
   visible label (a "Profile" entry that links to
   `/profile` and a sub-menu "Profile" preview, etc.). The
   `.first()` pins the click to the top-most match.

```ts
	async logout() {
		await this.logoutButton.click();
	}
```

The dedicated logout shortcut. Single click on the pre-bound
`logoutButton` Locator (which targets the last menu item by
positional convention). Equivalent to
`clickMenuItem(/log\s*out|sign\s*out/i)` but cheaper — the
spec does not pay for the regex compile / `hasText` filter /
`.first()` match every time. Symmetric with the
`selectLight` / `selectDark` primitives in
[`theme-toggle-page-object.md`](theme-toggle-page-object.md)
and the `selectGrid` / `selectList` primitives in
[`view-toggle-page-object.md`](view-toggle-page-object.md).

## Why the class does not extend `BasePage`

Three load-bearing reasons:

1. **The profile dropdown is a header-rendered widget, not
   a page route.** Unlike
   [`item-detail-page-object.md`](item-detail-page-object.md),
   [`map-page-object.md`](map-page-object.md), and
   [`signin-page-object.md`](signin-page-object.md), the
   profile dropdown has no dedicated URL. A spec that drives
   the dropdown lands on whatever page renders the global
   header (`/`, `/discover`, `/profile`, `/settings`,
   `/items/[slug]`, etc.) and instantiates the page object
   **after** the landing has happened. There is no `goto()`
   primitive a `BasePage` extension would surface that the
   widget driver needs.
2. **The widget surface is local to the header; no header /
   footer / navLinks chrome is read.** The driver reads only
   the trigger button and the menu's per-item collection —
   none of which are exposed via `BasePage.header`,
   `BasePage.footer`, or `BasePage.navLinks`. Extending
   `BasePage` would force every spec that instantiates the
   driver to pay for the inherited `header.theme.toggle`,
   `header.language.select`, `footer.cookies.accept`, etc.
   composite Locators to resolve up-front, which is wasted
   work because no widget-driving spec touches those
   surfaces through the driver.
3. **Symmetry with sibling widget drivers.** The standalone
   class shape mirrors
   [`scroll-to-top-page-object.md`](scroll-to-top-page-object.md),
   [`view-toggle-page-object.md`](view-toggle-page-object.md),
   [`theme-toggle-page-object.md`](theme-toggle-page-object.md),
   [`star-rating-page-object.md`](star-rating-page-object.md),
   [`sort-menu-page-object.md`](sort-menu-page-object.md),
   [`share-button-page-object.md`](share-button-page-object.md),
   [`search-bar-page-object.md`](search-bar-page-object.md),
   [`newsletter-page-object.md`](newsletter-page-object.md),
   [`discover-page-object.md`](discover-page-object.md), and
   [`language-switcher-page-object.md`](language-switcher-page-object.md) —
   every widget driver in the suite is a standalone class.
   The convention is **page-route → extends `BasePage`,
   widget → standalone class** and breaking that symmetry
   would surface as a discoverability regression for new
   contributors who scan the directory for the per-widget
   driver.

## Why the trigger button uses `#user-menu-button`

Three load-bearing reasons:

1. **The HTML `id` is the production source's canonical
   accessibility-wiring primitive.** The dropdown's
   `aria-controls`, `aria-labelledby`, and / or
   `aria-haspopup` attributes reference the trigger button
   by ID; pinning the e2e selector to the same ID couples
   the driver to the load-bearing accessibility wiring
   that screen readers depend on. A regression that drops
   the `id` attribute would surface as both an
   accessibility regression AND an e2e regression
   simultaneously — exactly the alignment the convention
   targets.
2. **The `id` is locale-stable.** Unlike a `getByRole('button',
   { name: 'Profile' })` selector that depends on the
   current locale's translation of `"Profile"`, the
   `#user-menu-button` selector resolves identically in
   every locale (`en` / `fr` / `es` / `de` / `ar` / `zh`).
   The driver does not need to know which locale the spec
   has set when it instantiates.
3. **The `id` is theme-stable.** Unlike a CSS-class selector
   (`button.profile-trigger`) that depends on the host
   theme's class-naming convention, the `id` selector
   survives a Tailwind utility-class refactor or a host-
   theme rename without touching this driver.

## Why the logout button uses `.last()`

Three load-bearing reasons:

1. **The production source guarantees the logout item is
   the bottom-most entry in the dropdown.** The dropdown's
   per-item ordering is: profile → settings → admin (if
   admin) → … → logout. The `.last()` append pins the
   assertion to that positional convention without
   coupling to the button's locale-sensitive label
   (`"Sign out"` in `en`, `"Déconnexion"` in `fr`,
   `"Cerrar sesión"` in `es`, etc.).
2. **The positional convention is documented in the
   production source's component layout.** A future
   refactor that re-orders the menu items to put logout in
   the middle would surface as both an accessibility
   regression (users expect logout at the bottom) AND an
   e2e regression simultaneously — exactly the alignment
   the convention targets.
3. **An accessible-name match (`getByRole('menuitem', {
   name: /log\s*out/i })`) would be locale-fragile.** The
   `.last()` append is locale-stable and avoids the regex-
   compile / multi-locale-pattern-maintenance overhead a
   name-match would incur.

## Why `isOpen()` checks the exact `'true'` string

Three load-bearing reasons:

1. **`getAttribute()` returns the raw attribute value as a
   string or `null`.** The WAI-ARIA spec guarantees
   `aria-expanded` emits the literal strings `'true'` /
   `'false'` (lowercase, no quotes); the strict-equality on
   `'true'` pins the assertion to the WAI-ARIA-canonical
   shape.
2. **`Boolean(expanded)` would return `true` for `'false'`.**
   A truthy-coerce on the raw attribute value is a common
   mistake — `Boolean('false')` is `true` because every
   non-empty string is truthy in JavaScript. The strict-
   equality avoids that footgun.
3. **`null` (the attribute is not set) coerces to `false`.**
   If the production source emits the trigger button without
   the `aria-expanded` attribute (a regression), the
   `getAttribute` call returns `null`; the strict-equality
   on `'true'` returns `false`, which is the correct
   accessor return for an "unknown / not-yet-rendered"
   state. Spec authors that consume `isOpen()` as a polled
   predicate (`await expect.poll(() => dropdown.isOpen()).toBe(true)`)
   benefit from the false-on-null shape because the polling
   logic re-checks until the attribute appears.

## Why `clickMenuItem` takes a `RegExp` not a `string`

Three load-bearing reasons:

1. **Locale-sensitive labels need flexible matching.** The
   menu-item labels are translated (`"Profile"` /
   `"Profil"` / `"Profil"` / `"الملف الشخصي"` / `"个人资料"`).
   A `string` parameter would pin the spec to one locale; a
   `RegExp` lets the spec pass `/profile|profil/i` to match
   across multiple locales without re-binding. Spec authors
   that pin to a single locale via `i18n` test-locale
   wiring still benefit because they can pass an exact-
   match anchored regex like `/^Profile$/`.
2. **Case-insensitivity is opt-in.** The `RegExp` parameter
   lets each spec choose its own case-insensitivity flag —
   `/profile/i` for case-insensitive, `/^Profile$/` for
   exact. A `string` parameter would force one behavior.
3. **`hasText` accepts either `string` or `RegExp`** — the
   driver's signature mirrors Playwright's documented
   `hasText` parameter shape, which is the canonical filter
   primitive for menu-item selection. Mirroring the upstream
   API surface avoids an impedance-mismatch shim.

## Failure matrix

| Mistake | Why it breaks |
| --- | --- |
| Drop the `import type` modifier on the Playwright import. | Pulls Playwright's runtime into the bundle; breaks the suite-wide type-only import discipline mirrored in every other page-object file. |
| Add an `extends BasePage` clause to the class declaration. | Forces every spec that instantiates the driver to pay for the inherited `header` / `footer` / `navLinks` Locators to resolve up-front; couples the widget driver to the page-route convention; breaks the suite-wide widget-vs-page-route convention. |
| Drop `readonly` on any field. | Locator re-assignment after construction silently desynchronises driver call sites; assertions become stateful and tests flake. |
| Re-bind `triggerButton` to `getByRole('button', { name: 'Profile' })`. | Couples the assertion to the locale-sensitive `"Profile"` translation; the assertion would flake on every non-`en` test run. The HTML-`id` selector is locale-stable. |
| Re-bind `triggerButton` to `button.profile-trigger`. | Couples the assertion to the host theme's CSS-class naming convention; a Tailwind utility-class refactor or host-theme rename would silently break the Locator. |
| Drop the `#` from the `#user-menu-button` selector. | Playwright interprets `user-menu-button` as a tag selector and resolves zero elements; the Locator no longer resolves. |
| Re-bind `menu` to `getByRole('menu')`. | The page may render multiple `[role="menu"]` elements simultaneously (the language-switcher, an admin-table row-actions menu); the Locator over-broadens and triggers strict-mode collision. The HTML-`id` selector is collision-free. |
| Re-bind `menuItems` to `page.locator('[role="menuitem"]')` (drop the `this.menu.` scope). | Catches `[role="menuitem"]` elements from a sibling dropdown on the same page (the language-switcher, the theme-toggle's dropdown variant); the Locator's polarity flips silently. |
| Drop the `this.menu.` scope on `menuItems`. | Same as above — the menu-item collection over-broadens to the page level. |
| Drop the `.last()` append on `logoutButton`. | The Locator resolves to the **first** menu item (the canonical "Profile" entry by positional convention) instead of the bottom-most "Logout" entry; `logout()` calls click the wrong item and the assertion's polarity flips silently. |
| Replace `.last()` on `logoutButton` with `.filter({ hasText: /log\s*out/i }).first()`. | Couples the Locator to the locale-sensitive `"Logout"` / `"Sign out"` translation; the assertion would flake on every non-`en` test run. The positional `.last()` is locale-stable. |
| Convert `isOpen()` to `Boolean(expanded)`. | `Boolean('false')` is `true` because every non-empty string is truthy in JavaScript; the accessor returns the wrong polarity. |
| Convert `isOpen()` to `expanded === true` (strip the quotes). | `getAttribute()` returns a string, never a boolean; the comparison is always `false`. |
| Convert `isOpen()` to `!!expanded`. | Same as `Boolean(expanded)` — every non-empty string is truthy. |
| Convert the `clickMenuItem` parameter type from `RegExp` to `string`. | Spec authors lose case-insensitivity / multi-locale matching / exact-match anchoring; the spec is forced to pick one locale per call. |
| Drop the `.first()` chain on the `clickMenuItem` filter. | Strict-mode collision against a future menu that contains two items with the same visible label. |
| Convert the `clickMenuItem` filter from `hasText` to a CSS-attribute selector. | Couples the Locator to attribute-naming convention that the production source is free to refactor; the menu-item label is the canonical stable surface. |
| Inline the `logout()` body to use `clickMenuItem(/log\s*out/i)`. | Spec pays for the regex compile / `hasText` filter / `.first()` match every time `logout()` is called; the dedicated `logoutButton` field is the optimised path. |
| Drop the `await` on any of the action primitives. | Playwright auto-waiting handles per-Locator readiness, but the synchronous return shape would break consuming specs that compose the actions sequentially. |
| Move the file outside `apps/web-e2e/page-objects/public/`. | Consuming specs lose the import path convention; the [`e2e-tsconfig.md`](e2e-tsconfig.md) `include: ["./**/*.ts"]` glob still picks it up but the suite's directory-by-role discoverability regresses. |
| Rename the file to `profile-dropdown.page.tsx`. | The Playwright config has no JSX wiring; the standalone class does not need a TSX surface. |
| Rename the class to `ProfileDropdownPage`. | Breaks every consuming spec's `import { ProfileDropdown } from '../../page-objects/public/profile-dropdown.page'`; the class name `ProfileDropdown` is the public name the suite has standardised on for the standalone widget driver. The `Page` suffix is reserved for the page-route drivers that extend `BasePage`. |
| Commit the file with CRLF line endings. | The suite's `.editorconfig` pins LF; tooling diffs become noisy. |

## Per-line walkthrough

| Line | Purpose |
| --- | --- |
| `import type { Page, Locator } from '@playwright/test';` | Pulls in the Playwright `Page` / `Locator` types for the constructor signature and field types. The `import type` modifier guarantees the runtime bundle pays nothing for Playwright. |
| `/** Page object for the profile dropdown menu in the header. */` | The single-line JSDoc that pins the class to its surface — the header profile-dropdown widget. |
| `export class ProfileDropdown {` | Single named class export with **no `extends` clause** — the standalone widget driver convention. |
| `readonly page: Page;` | Stores the `Page` handle. The standalone class restates this because it does not inherit `BasePage.page`. |
| `readonly triggerButton: Locator;` | The dropdown trigger button, bound by HTML-`id` selector `#user-menu-button`. |
| `readonly menu: Locator;` | The dropdown menu container, bound by HTML-`id` selector `#profile-menu`. |
| `readonly menuItems: Locator;` | The collection of every `[role="menuitem"]` inside the menu, scoped to `this.menu`. |
| `readonly logoutButton: Locator;` | The last menu item, bound by `this.menu.locator('[role="menuitem"]').last()` for the positional convention. |
| `constructor(page: Page) { … }` | The synchronous constructor that pre-binds every Locator. |
| `async open()` | Single click on the trigger button. |
| `async isOpen(): Promise<boolean>` | Reads the trigger's `aria-expanded` attribute and strict-compares to `'true'`. |
| `async clickMenuItem(name: RegExp)` | Filters the menu-item collection by `hasText: name`, reaches for `.first()`, and clicks. |
| `async logout()` | Single click on the pre-bound `logoutButton` Locator. |

## Read / write surface

| Surface | Reads | Writes |
| --- | --- | --- |
| Future `apps/web-e2e/tests/auth/*.spec.ts` (logout flow, post-sign-in profile-menu navigation) | `triggerButton`, `menu`, `menuItems`, `logoutButton` | `open()`, `isOpen()`, `clickMenuItem(name)`, `logout()` |
| Production source `apps/web/components/header/profile-dropdown/*` (or equivalent header profile-menu component) | DOM contract (`id="user-menu-button"` on the trigger button, `id="profile-menu"` on the menu container, `[role="menuitem"]` on every menu item, `aria-expanded` on the trigger button, positional convention that the logout item is bottom-most) | n/a |
| [`base-page-object.md`](base-page-object.md) | n/a (the class does not extend `BasePage`) | n/a |
| [`e2e-tsconfig.md`](e2e-tsconfig.md) | `include: ["./**/*.ts"]` glob picks up this file | n/a |
| [`playwright-config.md`](playwright-config.md) | `baseURL` resolves whichever URL the spec lands on before instantiating the driver | n/a |
| [`fixtures-index.md`](fixtures-index.md) | A future `authenticatedPage` fixture that pre-signs-in the user would surface a fixture here that auto-wires the dropdown driver after sign-in | n/a |

## Read / write surface failure modes

| Failure | Why it surfaces here |
| --- | --- |
| Trigger button `id` rename (`user-menu-button` → `profile-button`). | The `#user-menu-button` selector drops; the Locator no longer resolves; consuming specs flake on the first `open()` call. |
| Menu container `id` rename (`profile-menu` → `user-menu`). | The `#profile-menu` selector drops; the `menuItems` collection scope drops; every menu-item assertion regresses. |
| `aria-expanded` attribute removed from the trigger button. | `isOpen()` always returns `false`; consuming specs flake on the post-`open()` open-state assertion. |
| Menu items emit a non-canonical role (`role="menuitemcheckbox"` instead of `role="menuitem"`). | The `[role="menuitem"]` selector drops; the menu-item collection is empty; consuming specs flake on every `clickMenuItem(...)` / `logout()` call. |
| Logout item moved off the bottom-most position. | `.last()` resolves to the wrong item; `logout()` clicks the wrong target; the spec follows the wrong navigation. |
| Authentication state regression — the dropdown is hidden on every page. | The trigger button's Locator does not resolve; consuming specs flake on the first `open()` call. Spec authors gate with the canonical `signin-page-object.md`-driven sign-in primitive. |
| Locale change with translated logout label. | The positional `.last()` is locale-stable; the assertion does not flake on locale changes. A future regression that re-binds `logoutButton` to a name-match would re-introduce locale sensitivity. |
| `baseURL` change in [`playwright-config.md`](playwright-config.md). | The page navigation that precedes driver instantiation resolves against the new host; the driver itself is host-agnostic. |

## `profile-dropdown.page.ts`-change checklist

Any change to `apps/web-e2e/page-objects/public/profile-dropdown.page.ts` must:

1. Audit every spec under `apps/web-e2e/tests/auth/` and `apps/web-e2e/tests/public/` for spec authors that touch the per-widget surface.
2. Cross-check [`base-page-object.md`](base-page-object.md) — confirm the standalone-class convention is preserved (no `extends BasePage` clause).
3. Cross-check the production source under the header profile-dropdown component — the `id="user-menu-button"` trigger button shape, the `id="profile-menu"` menu container shape, the `[role="menuitem"]` per-item role, the `aria-expanded` attribute on the trigger button, and the positional convention that the logout item is bottom-most must stay aligned.
4. Cross-check the auth provider integration under `apps/web/lib/auth/*` — the dropdown's render gate is the user's authenticated state.
5. Cross-check [`e2e-tsconfig.md`](e2e-tsconfig.md) — the `include: ["./**/*.ts"]` glob picks up this file by convention.
6. Cross-check [`playwright-config.md`](playwright-config.md) — the `baseURL` posture is what the page navigation that precedes driver instantiation resolves against.
7. Cross-check [`fixtures-index.md`](fixtures-index.md) — a future `authenticatedPage` fixture that pre-signs-in the user would surface a fixture here that auto-wires the dropdown driver after sign-in.
8. Run dual `pnpm tsc --noEmit` (e2e package + workspace root) to catch the type surface.
9. Run a smoke-subset Playwright run targeting the auth spec subset: `pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "Profile Dropdown"`.
10. Add a [`docs/log.md`](../log.md) entry under today's date heading.
11. Cross-link [Spec 003 — Auth Providers](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/003-auth-providers) if the change introduces a new shared concept that affects test authoring across the suite.
12. Submit the change for a reviewer pass with the cross-checks listed in the PR description.
