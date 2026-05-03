---
id: client-settings-page-object
title: E2E Client Settings Page Object (apps/web-e2e/page-objects/client/settings.page.ts)
sidebar_label: E2E Client Settings Page Object
sidebar_position: 421
---

# E2E Client Settings Page Object — `apps/web-e2e/page-objects/client/settings.page.ts`

Per-source-file reference for the Playwright e2e suite's
**client settings index** driver paired with
[`apps/web-e2e/page-objects/client/settings.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/client/settings.page.ts).
Sits inside the `client/` page-object subtree, alongside
the five sibling client-surface page objects
(`dashboard.page.ts` — see
[`client-dashboard-page-object.md`](client-dashboard-page-object.md),
`profile.page.ts` — see
[`client-profile-page-object.md`](client-profile-page-object.md),
`submissions.page.ts`, `submit.page.ts`,
`trash.page.ts`).

This page is the **third per-source-file reference**
the docs tree publishes for any file under
`apps/web-e2e/page-objects/client/` (after
[`client-dashboard-page-object.md`](client-dashboard-page-object.md)
which opened the rollout and
[`client-profile-page-object.md`](client-profile-page-object.md)
which extended it to the multi-route navigation
posture) and the **first** client-tree driver in the
rollout that documents:

- A **three-link navigation-shelf cluster**
  (`basicInfoLink`, `securityLink`, `billingLink`) —
  the **first** client-tree driver to expose pre-bound
  Locators for in-page navigation links, anchored to
  `getByRole('link', { name: /…/i })` substring
  resolvers. Distinct from the profile driver's
  multi-route navigation **method** posture, which
  routes via `goto()`. This driver's link Locators
  let consuming specs assert on the **shelf's
  visibility / count** without navigating away.
- A **`.grid.grid-cols-1.md\\:grid-cols-2`
  Tailwind-class-chain settings-grid getter**
  (`settingsGrid`) — pinned to the responsive
  1-column-mobile / 2-column-tablet+ Tailwind class
  chain that the production source uses for the
  settings-cards grid layout primitive at
  `/client/settings`. Distinct from the profile
  driver's bare `.grid` posture (which targets a
  superset of any grid on the page) and from the
  client-dashboard driver's wider
  `.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4`
  four-column desktop chain.
- A **single `navigate()` method** —
  `goto('/client/settings')` — symmetric with every
  prior page-object driver in the suite that exposes
  a single navigation shortcut. Distinct from the
  profile driver's multi-route
  `navigateToSettings()` / `navigateToBasicInfo()`
  pair, because the settings index is a single route
  whose only purpose is to render the navigation
  shelf of cards.
- A **`level: 1` heading getter** —
  `getByRole('heading', { level: 1 }).first()` — the
  **first** client-tree driver that pins the heading
  Locator to the per-page H1 specifically. Distinct
  from the dashboard driver's bare
  `getByRole('heading', { name: /dashboard/i })`
  posture and from the profile driver's bare
  `getByRole('heading').first()` posture. The H1-pin
  defends against future per-card H2 / H3 headings
  inside the settings-grid cards (Basic Info,
  Security, Billing each render a card heading).
- A **navigation-shelf-only posture** — the driver
  exposes Locators for the **shelf** of navigation
  cards (heading + grid + three links) but no form-
  field Locators. Distinct from the profile driver's
  eight-input form-field cluster, because the
  `/client/settings` index is the per-tenant
  navigation shelf for the per-tab forms — the forms
  themselves render under
  `/client/settings/profile/basic-info`,
  `/client/settings/security/*`, etc., and are
  scoped through the profile driver and any future
  per-tab driver, not through this index driver.

Where [`base-page-object.md`](base-page-object.md)
documents the **page-object inheritance root**, this
page documents the **suite's client settings index
driver boundary** at `/client/settings` — the
smallest possible page object that lets a spec drive
the client settings shelf end-to-end.

The file is the **only driver** in the suite for the
client settings index surface today. The
`ClientSettingsPage` class **does extend `BasePage`**
— see "Why `ClientSettingsPage` extends `BasePage`"
below — so it inherits `header` / `footer` /
`navLinks` / `goto` / `gotoLocalized` /
`waitForPageReady` / `getTitle` from
[`base-page-object.md`](base-page-object.md) and adds
five `readonly` Locator fields (`heading`,
`settingsGrid`, `basicInfoLink`, `securityLink`,
`billingLink`) plus one navigation method
(`navigate()`) on top.

## Spec context

[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
is the home spec for the Playwright e2e suite. The
`client-settings` driver is consumed today by
[`apps/web-e2e/tests/client/settings.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/settings.spec.ts),
which covers three flows over the client settings
index surface:

- **Authenticated client can access settings page** —
  a baseline navigation + visibility assertion
  against the per-page `heading` Locator after a
  `navigate()` call.
- **Settings page displays settings cards** — a
  page-content visibility assertion that walks the
  full link inventory via `clientPage.getByRole('link')`
  and asserts `count > 0`. Distinct from a per-link
  visibility check on `basicInfoLink` /
  `securityLink` / `billingLink` because the consuming
  spec opts to assert the broader "any link present"
  invariant rather than coupling to the per-link
  label set (which may grow as new settings tabs are
  added).
- **Unauthenticated user is redirected from settings**
  — a redirect-assertion flow that uses raw
  `page.goto('/client/settings', { waitUntil: 'domcontentloaded' })`
  followed by `page.waitForURL(/\/auth\/signin/)`.
  This is the **only** flow in the consuming spec
  that does NOT use the `clientPage` authenticated
  fixture; it uses the bare `page` fixture
  specifically to exercise the
  `[locale]/client/**` middleware redirect contract.

A spec that drives the client settings surface inline
(via `await page.goto('/client/settings')` then
`await page.locator('.grid').first()` calls) is a
**drift** that this page object is the canonical
replacement for.

## At a glance

| Element | Type | What it is | Why it matters |
| --- | --- | --- | --- |
| `import type { Page, Locator }` | typed import | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk. | The client-tree drivers share the same `import type` discipline as the base class. |
| `import { BasePage } from '../base.page'` | runtime import | Runtime import of the inheritance root. | Anchors the settings driver to the canonical page-object base. |
| `export class ClientSettingsPage extends BasePage` | named export | Single class declaration with `extends BasePage`. Adds five per-page Locator fields and one navigation method on top. | The class is the canonical driver for the client settings index surface today. |
| `readonly heading: Locator` | field | `page.getByRole('heading', { level: 1 }).first()` — the **first** H1 on the page. | The H1-pin defends against future per-card H2 / H3 headings. Distinct from the dashboard driver's `name: /dashboard/i` substring pin and the profile driver's bare `getByRole('heading')` pin. |
| `readonly settingsGrid: Locator` | field | `page.locator('.grid.grid-cols-1.md\\:grid-cols-2').first()` — the per-page settings-cards grid layout primitive. | Pins to the responsive 1-column-mobile / 2-column-tablet+ Tailwind class chain. The `.first()` pin defends against multi-grid pages. Distinct from the profile driver's bare `.grid` selector and the dashboard driver's four-column-desktop chain. |
| `readonly basicInfoLink: Locator` | field | `page.getByRole('link', { name: /basic info/i }).first()` — the first `Basic Info` navigation card link. | Substring-anchored to survive future "Basic Information" / "Basic Profile Info" relabels. The `.first()` pin defends against duplicate links in nested navigation menus. |
| `readonly securityLink: Locator` | field | `page.getByRole('link', { name: /security/i }).first()` — the first `Security` navigation card link. | Symmetric with `basicInfoLink`. |
| `readonly billingLink: Locator` | field | `page.getByRole('link', { name: /billing/i }).first()` — the first `Billing` navigation card link. | Symmetric with `basicInfoLink`. The substring tolerates a future `Billing & Plans` relabel. |
| `constructor(page: Page)` | constructor | Stores the `page` via `super(page)` and pre-binds all five per-page Locator fields in a single pass. | Single constructor signature with the `super(page)` call. |
| `async navigate()` | method | `await this.goto('/client/settings')` — navigates to the client settings index route. | The single navigation method matches every prior page-object driver's `navigate()` shape and is the natural opening call for any consuming spec flow. |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class ClientSettingsPage extends BasePage {
	readonly heading: Locator;
	readonly settingsGrid: Locator;
	readonly basicInfoLink: Locator;
	readonly securityLink: Locator;
	readonly billingLink: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading', { level: 1 }).first();
		this.settingsGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-2').first();
		this.basicInfoLink = page.getByRole('link', { name: /basic info/i }).first();
		this.securityLink = page.getByRole('link', { name: /security/i }).first();
		this.billingLink = page.getByRole('link', { name: /billing/i }).first();
	}

	async navigate() {
		await this.goto('/client/settings');
	}
}
```

## Why `ClientSettingsPage` extends `BasePage`

Three load-bearing reasons the client-tree settings
driver inherits from
[`base-page-object.md`](base-page-object.md):

- **Single-route navigation via the inherited `goto`
  method.** The `navigate()` method composes the
  inherited `goto()` helper, which participates in
  `BasePage`'s post-navigation `waitForPageReady()`
  discipline. Mirrors every prior page-object
  driver's posture.
- **Global header / footer / nav-link chrome surfaced
  for free.** The client shell renders the same
  global chrome on `/client/settings` as on every
  other client route. Specs that need to assert on
  the shell can reach the inherited `header` /
  `footer` / `navLinks` Locators without restating
  the selectors.
- **Post-navigation `waitForPageReady` stabiliser.**
  Every settings flow that touches the navigation
  shelf or the heading starts with
  `await settingsPage.navigate(); await settingsPage.waitForPageReady();`
  — the consuming spec's "settings page displays
  settings cards" flow uses exactly this two-call
  posture before walking the link inventory.

## Why a single `navigate()` (and not multiple)

Three reasons the driver exposes one navigation
method (`navigate()`) instead of the
profile driver's two-method
`navigateToSettings()` / `navigateToBasicInfo()`
posture:

- **The settings index is a single route.** The
  `/client/settings` URL is the only surface the
  driver covers today. Per-tab navigation
  (`/client/settings/profile/basic-info`,
  `/client/settings/security/*`,
  `/client/settings/billing/*`) is the responsibility
  of the corresponding per-tab driver (the profile
  driver's `navigateToBasicInfo()` is the canonical
  example). The settings index driver's job is to
  render the navigation shelf, not to drive the
  per-tab forms.
- **Symmetric with every prior single-route driver.**
  `client-dashboard-page-object.md` exposes a single
  `navigate()` method; every public-tree driver
  exposes a single `navigate()` method; every
  admin-tree driver exposes a single `navigate()`
  method. The settings driver follows the precedent.
- **Future per-tab navigation is a per-tab driver's
  job.** A consumer who needs to land directly on
  `/client/settings/security` should reach for a
  future `ClientSecurityPage` driver with its own
  `navigate()` method, not add a
  `navigateToSecurity()` shortcut to this driver.
  The settings index driver's surface stays minimal.

## Why three pre-bound link Locators

Three reasons the driver pre-binds three per-link
Locators (`basicInfoLink`, `securityLink`,
`billingLink`) instead of exposing a generic
`getCardLink(label: string)` getter or a bulk
`navigationLinks` Locator:

- **The three card labels are stable contract
  surface.** Basic Info / Security / Billing are the
  three primary settings tabs the production source
  guarantees. Pre-binding the Locators makes the
  driver's contract explicit at the type level — a
  consuming spec that reads `settingsPage.basicInfoLink`
  knows that link is part of the suite's contract,
  whereas a `getCardLink('Basic Info')` call would
  hide the contract behind a string parameter.
- **Substring resolvers tolerate future relabels.**
  Each link uses `getByRole('link', { name: /…/i })`
  with a substring regex (e.g. `/basic info/i`),
  which matches "Basic Info", "Basic Information",
  "Basic Profile Info" without modification. A bulk
  `navigationLinks: Locator` posture would force
  consuming specs to use index-based access
  (`navigationLinks.nth(0)`) which couples to the
  card order.
- **Per-link visibility assertions stay readable.**
  A consuming spec that asserts
  `await expect(settingsPage.basicInfoLink).toBeVisible()`
  reads more clearly than
  `await expect(settingsPage.getCardLink('Basic Info')).toBeVisible()`
  or
  `await expect(settingsPage.navigationLinks.filter({ hasText: 'Basic Info' })).toBeVisible()`.

## Why the heading is pinned to `level: 1`

Three reasons the driver pins the heading to
`getByRole('heading', { level: 1 })` rather than the
bare `getByRole('heading')` posture of the dashboard
and profile drivers:

- **The settings cards each render their own H2 / H3
  headings.** The Basic Info / Security / Billing
  cards on the settings shelf each render a per-card
  heading. A bare `getByRole('heading')` would match
  the first per-card heading rather than the per-page
  H1 if the H1 ever changes order in the DOM (e.g.
  if a future contributor inverts the layout to
  render the cards before the page heading).
- **The H1-pin documents the page-structure
  contract.** Pinning to `level: 1` documents the
  invariant that the page must render exactly one
  H1 (the page title) and the per-card headings
  must be H2 / H3. A future contributor who promotes
  a per-card heading to H1 must update the per-card
  source and the per-card spec in step.
- **Distinct from the dashboard / profile postures
  for documented reasons.** The dashboard driver
  pins on the substring `/dashboard/i` because the
  page heading is "Dashboard" / "My Dashboard" /
  "Welcome to your Dashboard" and the substring
  tolerates the relabel. The profile driver pins on
  the bare `getByRole('heading').first()` because
  the basic-info form's first heading might be the
  field-group heading "Basic Info" rather than the
  page-level H1. The settings driver pins on
  `level: 1` because the settings shelf has a stable
  H1 contract.

## What it does not contain

The settings driver intentionally omits a number of
helpers that future contributors might be tempted to
add:

- **No `getByTestId` selectors.** The driver uses
  accessibility-tree-canonical posture (`getByRole`)
  plus the Tailwind class-chain selector
  exclusively.
- **No per-tab navigation methods.** The driver
  exposes the three card link Locators but no
  `clickBasicInfoLink()` /
  `navigateToBasicInfoTab()` shortcuts. Per-tab
  navigation belongs in the corresponding per-tab
  driver (the profile driver's
  `navigateToBasicInfo()` is the canonical example).
- **No `getCardCount(): Promise<number>` /
  `getCardLabels(): Promise<string[]>` accessor
  helpers.** The driver exposes the
  `settingsGrid` Locator but no helpers that walk
  the card inventory because the consuming spec
  walks the broader `getByRole('link')` count
  inline.
- **No `clickFirstCard()` / `assertCardOrder(labels)`
  composite flow helpers.** The driver does not
  aggregate the three per-link Locators into a
  composite flow because no current spec drives
  more than one card in the same flow.
- **No fixture-bound `clientSettingsPage` accessor.**
  The driver is instantiated per-spec via
  `new ClientSettingsPage(clientPage)` rather than
  via a fixture. A future fixture-bound posture
  would be a separate refactor that updates
  [`fixtures-index.md`](fixtures-index.md) and the
  consuming spec in step.
- **No `navigateAndWait()` composite navigation
  helper.** The driver exposes `navigate()` and the
  inherited `waitForPageReady()` separately because
  the consuming spec composes them inline as
  `await settingsPage.navigate(); await settingsPage.waitForPageReady();`.

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
- [`client-profile-page-object.md`](client-profile-page-object.md)
  — the **second** client-tree page-object reference.
  Documents the multi-route navigation pair posture
  (`navigateToSettings()` / `navigateToBasicInfo()`)
  that this driver's single-method posture
  intentionally diverges from. The profile driver
  consumes the same `/client/settings` route this
  driver covers, but lands on the per-tab basic-info
  form rather than the navigation shelf.
- [`signin-page-object.md`](signin-page-object.md) —
  the auth-tree authentication driver. Documents
  the email / password / submit-button surface that
  the consuming spec uses to log in as a client
  before navigating to the settings index.
- [`auth-fixture.md`](auth-fixture.md) — the
  `clientPage` authenticated-page fixture the
  consuming spec uses for the two authenticated
  flows. The unauthenticated redirect flow uses the
  bare `page` fixture instead.

The
[`apps/web-e2e/tests/client/settings.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/settings.spec.ts)
spec file is the single consumer of this driver
today; new specs that touch the client settings
index surface must reach for `ClientSettingsPage`
instead of inlining `page.goto('/client/settings')`
or `page.locator('.grid')` calls.
