---
id: client-profile-page-object
title: E2E Client Profile Page Object (apps/web-e2e/page-objects/client/profile.page.ts)
sidebar_label: E2E Client Profile Page Object
sidebar_position: 420
---

# E2E Client Profile Page Object — `apps/web-e2e/page-objects/client/profile.page.ts`

Per-source-file reference for the Playwright e2e suite's
**client profile / settings** driver paired with
[`apps/web-e2e/page-objects/client/profile.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/client/profile.page.ts).
Sits inside the `client/` page-object subtree, alongside
the five sibling client-surface page objects
(`dashboard.page.ts` — see
[`client-dashboard-page-object.md`](client-dashboard-page-object.md),
`settings.page.ts`, `submissions.page.ts`,
`submit.page.ts`, `trash.page.ts`).

This page is the **second per-source-file reference**
the docs tree publishes for any file under
`apps/web-e2e/page-objects/client/` (the first being
[`client-dashboard-page-object.md`](client-dashboard-page-object.md)
which established the rollout's template) and the
**first** client-tree driver in the rollout that
documents:

- A **multi-route navigation pair**
  (`navigateToSettings()` /
  `navigateToBasicInfo()`) — the **first** client-
  tree driver to expose more than one navigation
  shortcut. The settings driver targets the
  `/client/settings` index route, while the basic-
  info navigation targets the per-tab
  `/client/settings/profile/basic-info` deep route.
  Distinct from every prior page-object driver in
  the suite which exposes a single `navigate()`
  method.
- An **eight-input form-field cluster** —
  (`displayNameInput`, `usernameInput`, `bioInput`,
  `locationInput`, `companyInput`, `jobTitleInput`,
  `websiteInput`, `saveButton`) — the largest
  per-page form-field inventory of any non-modal
  page-object driver in the suite. Distinct from the
  modal-bound form clusters in the items / item-form
  drivers (which scope inputs through a modal-Locator
  getter) because the basic-info form is rendered
  page-level, not inside a modal.
- A **camelCase id-selector input field cluster** —
  every input field uses a camelCase id-attribute
  (`#displayName`, `#bio`, `#jobTitle`) rather than
  the hyphenated kebab-case posture the tags driver
  documents (`#tag-id`, `#tag-name`) or the snake_case
  posture the item-form driver documents (`#icon_url`,
  `#source_url`). The camelCase posture matches the
  HeroUI `<Input>` React component's default `id`
  emission when the consumer passes a camelCase
  `name` prop.
- A **`.grid` Tailwind-utility-anchored
  settings-cards getter** (`settingsCards`) — pinned
  to the per-page grid layout primitive that the
  production source uses for the settings-card
  navigation shelf at `/client/settings`. Symmetric
  with the featured-items driver's `statsCards`
  getter and the data-export / reports drivers'
  `.grid`-anchored postures.
- A **page-level form posture** — distinct from the
  admin-tree drivers' modal-bound form posture
  (every admin-tree CRUD form is rendered inside a
  `[role="dialog"]` / `.fixed.inset-0.z-50` overlay).
  The basic-info form is rendered page-level on a
  dedicated route (`/client/settings/profile/basic-
  info`); the driver's input fields therefore pin
  to page-level id-selectors without a modal-Locator
  scope prefix.

Where [`base-page-object.md`](base-page-object.md)
documents the **page-object inheritance root**, this
page documents the **suite's client profile / settings
driver boundary** at `/client/settings` and
`/client/settings/profile/basic-info` — the smallest
possible page object that lets a spec drive the client
settings index plus the basic-info form end-to-end.

The file is the **only driver** in the suite for the
client profile / settings surface today. The
`ClientProfilePage` class **does extend `BasePage`**
— see "Why `ClientProfilePage` extends `BasePage`"
below — so it inherits `header` / `footer` /
`navLinks` / `goto` / `gotoLocalized` /
`waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and adds
nine `readonly` Locator fields (`heading`,
`settingsCards`, `displayNameInput`, `usernameInput`,
`bioInput`, `locationInput`, `companyInput`,
`jobTitleInput`, `websiteInput`, `saveButton`) plus
two navigation methods (`navigateToSettings()`,
`navigateToBasicInfo()`) on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`client-profile` driver is consumed today by
[`apps/web-e2e/tests/client/profile.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/profile.spec.ts),
which covers five flows over the client profile /
settings surface:

- **Client can access settings page** — a baseline
  navigation + visibility assertion against the per-
  page `heading` Locator after a
  `navigateToSettings()` / `waitForPageReady()` two-
  call (with a 10-second timeout for the React Query
  hydration storm).
- **Settings page shows settings cards grid** — a
  page-content visibility assertion against the page-
  level `<main>` element rather than the per-grid
  `settingsCards` Locator (the per-grid Locator is
  exposed for future per-card flows but the current
  consuming spec uses the broader `<main>` selector
  to avoid coupling to the grid layout's exact
  Tailwind class).
- **Client can access basic info form** — a deep-
  route navigation + per-input visibility assertion
  via `navigateToBasicInfo()`. The flow uses an
  OR-of-two-input visibility check
  (`hasDisplayName || hasUsername`) with a
  `test.skip(true, ...)` guard so the test remains
  green when the basic-info route is not reachable
  (e.g. when the `/client/settings/profile/basic-info`
  page is feature-flag-disabled).
- **Basic info form has save button** — a deep-route
  navigation + save-button visibility assertion via
  `navigateToBasicInfo()`. Symmetric to the per-input
  flow with a `test.skip(true, ...)` guard on the
  save button's visibility.
- **Display name field accepts input** — a full
  fill-and-restore exercise that reads the original
  value via `inputValue()`, fills the field with a
  timestamped test name, asserts the new value, and
  restores the original value to leave the per-tenant
  database state unchanged. The flow uses a
  `test.skip(true, ...)` guard on the
  `displayNameInput.isVisible()` check.

A spec that drives the client profile surface inline
(via `await page.goto('/client/settings')` then
`await page.locator('#displayName').fill('...')`)
is a **drift** that this page object is the canonical
replacement for.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The client-tree drivers share the same `import type` discipline as the base class. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root. | Anchors the profile driver to the canonical page-object base. |
| `export class ClientProfilePage extends BasePage` | named export | Single class declaration with `extends BasePage`. Adds nine per-page Locator fields and two navigation methods on top. | The class is the canonical driver for the client profile / settings surface today. |
| `readonly heading: Locator` | field | `page.getByRole('heading').first()` — the **first** heading on the page. | Symmetric with every other admin-tree / client-tree driver's heading getter. |
| `readonly settingsCards: Locator` | field | `page.locator('.grid').first()` — the per-page settings-cards grid layout primitive. | Symmetric with the featured-items driver's `statsCards` getter and the data-export / reports drivers' `.grid`-anchored postures. The `.first()` pin defends against multi-grid pages. |
| `readonly displayNameInput: Locator` | field | `page.locator('#displayName')` — the display-name input field, located via the camelCase `#displayName` id-selector. | The camelCase id matches the HeroUI `<Input>` React component's default `id` emission. Pinning to the id-selector is more stable than `getByPlaceholder` (placeholder text changes between locales) and `getByLabel` (label text changes between locales). |
| `readonly usernameInput: Locator` | field | `page.locator('#username')` — the username input field. | Symmetric with `displayNameInput`. |
| `readonly bioInput: Locator` | field | `page.locator('#bio')` — the bio input field. | Symmetric with `displayNameInput`. |
| `readonly locationInput: Locator` | field | `page.locator('#location')` — the location input field. | Symmetric with `displayNameInput`. Distinct from the admin-tree's location settings page, which scopes the location input through the settings accordion's Location section. |
| `readonly companyInput: Locator` | field | `page.locator('#company')` — the company input field. | Symmetric with `displayNameInput`. |
| `readonly jobTitleInput: Locator` | field | `page.locator('#jobTitle')` — the job-title input field. | Symmetric with `displayNameInput`. |
| `readonly websiteInput: Locator` | field | `page.locator('#website')` — the website URL input field. | Symmetric with `displayNameInput`. |
| `readonly saveButton: Locator` | field | `page.getByRole('button', { name: /save/i }).first()` — the **first** "Save" button on the page. | The `/save/i` substring regex tolerates label drift between `Save`, `Save Changes`, `Save Profile`. The `.first()` pin defends against multi-form pages. |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds all nine per-page Locator fields in a single pass. | Single constructor signature with the `super(page)` call. |
| `async navigateToSettings()` | method | `await this.goto('/client/settings')` — navigates to the client settings index route. | The settings index renders the navigation shelf of cards (Basic Info, Location, Security, etc.). |
| `async navigateToBasicInfo()` | method | `await this.goto('/client/settings/profile/basic-info')` — navigates directly to the basic-info form route. | The deep-route navigation skips the settings-cards index and lands on the per-tab basic-info form directly. The two navigation methods together let consuming specs drive both the index assertions (via `navigateToSettings()`) and the form assertions (via `navigateToBasicInfo()`) without restating the route paths. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the client profile/settings pages.
 */
export class ClientProfilePage extends BasePage {
	readonly heading: Locator;
	readonly settingsCards: Locator;

	// Basic Info form fields
	readonly displayNameInput: Locator;
	readonly usernameInput: Locator;
	readonly bioInput: Locator;
	readonly locationInput: Locator;
	readonly companyInput: Locator;
	readonly jobTitleInput: Locator;
	readonly websiteInput: Locator;
	readonly saveButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.settingsCards = page.locator('.grid').first();

		// Basic Info form
		this.displayNameInput = page.locator('#displayName');
		this.usernameInput = page.locator('#username');
		this.bioInput = page.locator('#bio');
		this.locationInput = page.locator('#location');
		this.companyInput = page.locator('#company');
		this.jobTitleInput = page.locator('#jobTitle');
		this.websiteInput = page.locator('#website');
		this.saveButton = page.getByRole('button', { name: /save/i }).first();
	}

	async navigateToSettings() {
		await this.goto('/client/settings');
	}

	async navigateToBasicInfo() {
		await this.goto('/client/settings/profile/basic-info');
	}
}
```

## Why `ClientProfilePage` extends `BasePage`

Three load-bearing reasons the client-tree profile
driver inherits from
[`base-page-object.md`](base-page-object.md):

- **Multi-route navigation via the inherited `goto`
  method.** Both navigation methods compose the
  inherited `goto()` helper, which participates in
  `BasePage`'s post-navigation `waitForPageReady()`
  discipline.
- **Global header / footer / nav-link chrome surfaced
  for free.** The client shell renders the same
  global chrome on `/client/settings` as on every
  other client route.
- **Post-navigation `waitForPageReady` stabiliser.**
  Every profile flow that touches the form fields /
  settings cards starts with
  `await profilePage.navigateToSettings(); await profilePage.waitForPageReady();`
  or the basic-info equivalent.

## Why two navigation methods (and not one with a parameter)

Three reasons the driver exposes two distinct
navigation methods (`navigateToSettings()`,
`navigateToBasicInfo()`) instead of a single
parametrised `navigate(route: string)` helper:

- **The two routes are semantically distinct.** The
  settings index renders the navigation shelf; the
  basic-info form renders the per-tab form. Each
  consuming spec flow targets one of the two
  surfaces, so the per-route methods document the
  intent of each call site.
- **Type-narrowing surfaces typos at compile time.**
  A consumer who passes
  `navigateToSettings()` cannot accidentally typo
  the route (e.g. `'/client/setting'`); the per-
  method posture eliminates the typo class entirely.
  A bare `navigate(route: string)` helper would
  permit any string parameter, including typos.
- **Future per-tab navigation methods compose
  consistently.** A future spec that targets
  `/client/settings/profile/location` could add a
  `navigateToLocationInfo()` method on the same
  pattern. The per-method posture scales linearly
  with the per-tab route count.

## Why all input fields use camelCase id selectors

Three reasons the driver uses camelCase id-selectors
(`#displayName`, `#bio`, `#jobTitle`) instead of the
hyphenated kebab-case (`#display-name`) or
snake_case (`#display_name`) postures used elsewhere
in the suite:

- **The HeroUI `<Input>` component emits camelCase
  ids by default.** When the production source
  passes a camelCase `name` prop to a HeroUI
  `<Input>` (e.g. `name="displayName"`), the
  component renders `<input id="displayName">`. The
  driver pins to the production-source-emitted ids
  exactly.
- **The form's data shape is camelCase.** The
  client profile API contract uses camelCase keys
  (`{ displayName, username, jobTitle, ... }`); the
  form's input ids match the API's data shape.
  Distinct from the tags driver's hyphenated id
  posture, which matches the production source's
  HTML-form convention for dashboard-shell admin
  forms.
- **Symmetric with React Hook Form's
  `register('displayName')` posture.** The
  production source uses `react-hook-form`'s
  `register(name)` helper to bind each input to the
  form's data shape. The default `id` produced by
  `register('displayName')` is `displayName`. The
  driver pins to the framework's emitted ids.

## Why the form is page-level (and not modal-scoped)

Three reasons the driver pins inputs to page-level
id-selectors without a modal-Locator scope prefix:

- **The basic-info form is rendered on a dedicated
  route.** The production source mounts the form
  inline at `/client/settings/profile/basic-info`,
  not inside a modal overlay. There is no parent
  modal to scope through.
- **Distinct from the admin-tree's modal-bound CRUD
  posture.** Every admin-tree driver scopes form
  inputs through a `[role="dialog"]` /
  `.fixed.inset-0.z-50` modal-Locator getter
  (companies, comments, items, item-form, roles,
  tags). The client profile driver's page-level
  posture is the **first** client-tree driver to
  document the page-level form pattern.
- **The save button is also page-level.** The
  `saveButton` field uses
  `page.getByRole('button', { name: /save/i }).first()`
  without any modal-Locator scope prefix.

## What it does not contain

The profile driver intentionally omits a number of
helpers that future contributors might be tempted to
add:

- **No `getByTestId` selectors.** The driver uses
  accessibility-tree-canonical posture (`getByRole`)
  plus the page-level id-selector exclusively.
- **No per-field `setDisplayName(name)` /
  `setBio(text)` setter helpers.** The driver
  exposes the per-field Locators but no per-field
  setter wrappers because the consuming spec drives
  the fills inline via `displayNameInput.fill(...)`.
- **No `fillBasicInfo(data)` composite form-fill
  helper.** The driver does not aggregate the eight
  inputs into a single fill helper because no
  current spec drives all eight fields in the same
  flow.
- **No `submitBasicInfo()` /
  `saveAndAssertSuccess()` composite flow helper.**
  The driver exposes the `saveButton` Locator but
  no helper closes over the full save-and-verify
  flow because the consuming spec at
  [`profile.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/profile.spec.ts)
  asserts on per-input behaviour rather than the
  end-to-end save flow.
- **No `getDisplayName(): Promise<string>` /
  `getBio(): Promise<string>` accessor helpers.**
  The driver does not expose per-field accessors
  because the consuming spec reads via
  `displayNameInput.inputValue()` inline.
- **No per-tab navigation methods beyond
  `navigateToBasicInfo()`** (e.g. no
  `navigateToLocation()` /
  `navigateToSecurity()`). Future specs that need
  per-tab navigation must add the methods in step
  with the spec they add.

These omissions keep the driver minimal — every
property and method on the class is consumed by at
least one spec today.

## Cross-references

- [`base-page-object.md`](base-page-object.md) — the
  inheritance root.
- [`client-dashboard-page-object.md`](client-dashboard-page-object.md)
  — the **first** client-tree page-object reference.
  Documents the rollout's template for the
  `apps/web-e2e/page-objects/client/` subtree.
- [`signin-page-object.md`](signin-page-object.md) —
  the auth-tree authentication driver. Documents the
  email / password / submit-button surface that the
  consuming spec uses to log in as a client before
  navigating to the profile / settings routes.
- [`admin-tags-page-object.md`](admin-tags-page-object.md)
  — the **seventeenth and final** admin-tree page-
  object reference. Documents the kebab-case id-
  selector posture that this driver's camelCase id-
  selector posture intentionally diverges from.
- [`admin-item-form-page-object.md`](admin-item-form-page-object.md)
  — the **ninth** admin-tree page-object reference.
  Documents the snake_case id-selector posture
  (`#icon_url`, `#source_url`) that this driver's
  camelCase id-selector posture intentionally
  diverges from.

The
[`apps/web-e2e/tests/client/profile.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/profile.spec.ts)
spec file is the single consumer of this driver
today; new specs that touch the client profile /
settings surface must reach for `ClientProfilePage`
instead of inlining `page.goto('/client/settings')`
or `page.locator('#displayName')` calls.
