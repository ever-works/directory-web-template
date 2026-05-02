---
id: base-page-object
title: E2E Base Page Object (apps/web-e2e/page-objects/base.page.ts)
sidebar_label: E2E Base Page Object
sidebar_position: 350
---

# E2E Base Page Object — `apps/web-e2e/page-objects/base.page.ts`

Per-source-file reference for the Playwright e2e suite's
foundational page-object class paired with
[`apps/web-e2e/page-objects/base.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/base.page.ts).
Sits at the root of the page-objects tree the same way
[`fixtures-index.md`](fixtures-index.md) sits at the root of
the fixtures tree and [`e2e-test-data.md`](e2e-test-data.md)
sits at the root of the helpers tree.

Where [`fixtures-index.md`](fixtures-index.md) documents the
**directory-level fixture-export boundary** — what the
`fixtures/` directory exposes as a single import target — and
[`e2e-test-data.md`](e2e-test-data.md) documents the
**suite's shared-data boundary**, this page documents the
**page-object inheritance root** — the smallest possible class
every concrete page object under
`apps/web-e2e/page-objects/admin/`,
`apps/web-e2e/page-objects/auth/`,
`apps/web-e2e/page-objects/client/`, and
`apps/web-e2e/page-objects/public/` extends.

## At a glance

| Element                         | Purpose                                                                                                                                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import type { Page, Locator }` | Type-only import of Playwright's `Page` and `Locator` types — no runtime cost, no circular import risk.                                                                                                                                              |
| `export class BasePage`         | Inheritance root for every page object in the suite (30+ subclasses today across admin, auth, client, public).                                                                                                                                       |
| `readonly page: Page`           | The Playwright `Page` handle every subclass needs for ad-hoc locator construction not pre-bound on the base.                                                                                                                                         |
| `readonly header: Locator`      | `page.locator('header').first()` — pinned to the **first** `<header>` because Next 16 layouts can stack a global header above a section header.                                                                                                      |
| `readonly footer: Locator`      | `page.locator('footer').first()` — same first-of-many posture as `header`.                                                                                                                                                                           |
| `readonly navLinks: Locator`    | `header.getByRole('link')` — header-scoped link enumeration so footer links and in-page links do not pollute navigation assertions.                                                                                                                  |
| `constructor(page)`             | Stores the `page` and pre-binds the three structural Locators above.                                                                                                                                                                                 |
| `goto(path)`                    | `page.goto(path, { waitUntil: 'domcontentloaded' })` — the suite-wide navigation primitive. `domcontentloaded` (not `load`, not `networkidle`) is the load-bearing choice this file makes; see "Why `domcontentloaded`" below.                       |
| `gotoLocalized(path, locale)`   | Locale-aware `goto`: `en` resolves to bare `path` (no `/en` prefix), every other locale resolves to `/${locale}${path}`. Encodes the host app's [`apps/web/middleware.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/middleware.ts) `localePrefix: 'as-needed'` posture. |
| `waitForPageReady()`            | `page.waitForLoadState('domcontentloaded')` — the explicit re-state of the same load state `goto()` already awaits, exposed so a subclass can re-await after a SPA navigation that does not go through `goto()`.                                     |
| `getTitle()`                    | `Promise<string>` shortcut for `page.title()` so subclasses do not import `page.title` from inside their own assertions.                                                                                                                              |

## File contents

```ts
import type { Page, Locator } from '@playwright/test';

export class BasePage {
    readonly page: Page;
    readonly header: Locator;
    readonly footer: Locator;
    readonly navLinks: Locator;

    constructor(page: Page) {
        this.page = page;
        this.header = page.locator('header').first();
        this.footer = page.locator('footer').first();
        this.navLinks = this.header.getByRole('link');
    }

    async goto(path: string) {
        await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    }

    async gotoLocalized(path: string, locale: string) {
        const prefix = locale === 'en' ? '' : `/${locale}`;
        await this.page.goto(`${prefix}${path}`, { waitUntil: 'domcontentloaded' });
    }

    async waitForPageReady() {
        await this.page.waitForLoadState('domcontentloaded');
    }

    async getTitle(): Promise<string> {
        return this.page.title();
    }
}
```

## Why `import type` and not a runtime import

Playwright's `Page` and `Locator` are only used as **type
annotations** in this file — they never appear in a `new`
expression, never get destructured at runtime, never reach
`typeof`-style introspection. A `import { Page, Locator } from
'@playwright/test'` would compile down to a runtime
`require('@playwright/test')` call that loads Playwright's
runner internals at module-load for every consumer of this
file. Three failure modes that the `import type` shape
prevents:

1. **Circular-import risk.** `@playwright/test` re-exports the
   runner's `test` function, which reads
   [`playwright-config.md`](playwright-config.md)'s exported
   config object via dynamic resolution; pulling that into a
   page object loaded before the runner has booted invites
   startup-order surprises.
2. **Bundle-size cost on type-only consumers.** Every concrete
   page object that extends `BasePage` re-exports through this
   file's transitive imports; a runtime import here would
   propagate to every test spec.
3. **Fixture-vs-runner ambient drift.** The fixtures barrel at
   [`fixtures-index.md`](fixtures-index.md) re-exports the
   `test` function from `@playwright/test` deliberately so
   every spec gets the same `test` function. The page-object
   tree's needs are narrower — it only ever needs the `Page`
   and `Locator` **types** for its method signatures — and
   `import type` documents that narrower contract at the file
   level.

## Why `page.locator('header').first()` and not a plain `header`

Next 16's app-router layouts can stack multiple `<header>`
elements: the root layout's site-wide header above a section
layout's content header above an item-detail page's
above-the-fold header. The unscoped `page.locator('header')`
matches all three and Playwright's strict-mode locator
resolution would throw at first use. `first()` pins the
selector to the top-most header, which is the site shell's
nav-bar in every layout the suite covers today. Three failure
modes the `first()` posture prevents:

1. **Strict-mode violations on item-detail pages.** Without
   `first()`, the moment a page uses a section-scoped
   `<header>` the assertion fails with
   `strict mode violation: locator('header') resolved to 2
   elements`.
2. **Cross-page assertion drift.** Subclasses author
   `expect(this.header).toBeVisible()` in a `verifyShell()`
   helper; they expect "the header is visible" to mean "the
   site nav-bar is visible," not "any of the headers on this
   page is visible."
3. **Footer parity.** The same posture on `footer` keeps
   header / footer assertions symmetric so a subclass that
   author the `verifyShell()` pattern does not have to
   remember which one is `first()` and which is unscoped.

## Why `header.getByRole('link')` for `navLinks`

The header is the canonical surface for top-level navigation
in this template. Footer links are different in three ways
that justify scoping enumeration to the header:

1. **Inventory.** The header lists primary navigation
   (Discover, Categories, Pricing, About, Sign In); the
   footer lists secondary navigation (Privacy Policy, Terms,
   Cookies). A test that asserts on "the navigation links"
   means the primary set, not the secondary set.
2. **Auth-state divergence.** The header's link inventory
   flips between unauthenticated (Sign In, Register) and
   authenticated (Profile, Settings, Sign Out) states; the
   footer's inventory does not. Header-scoped enumeration
   keeps the auth-shell assertions clean.
3. **Modal / drawer pollution.** A future "search drawer" or
   "command palette" rendered at body level would inject
   `<a>` elements into `page.getByRole('link')` but not into
   `header.getByRole('link')`. Header-scoping keeps the link
   inventory stable across UI surface evolutions.

## Why `goto()` uses `waitUntil: 'domcontentloaded'`

Playwright's default `waitUntil` for `page.goto()` is `load`
— wait until the `load` event fires. The base class
deliberately overrides to `domcontentloaded` for three
reasons:

1. **Next 16 streaming.** App-router pages with
   `<Suspense>` boundaries can keep the `load` event pending
   for several seconds while suspended children resolve.
   `domcontentloaded` fires as soon as the root HTML is
   parsed; the suspended boundaries fall back to their
   skeletons and resolve in the background. Smoke specs that
   only need to assert "the page renders without a server
   error" do not need to wait for every `<Suspense>` to
   settle.
2. **Image-heavy pages.** The Discover page renders item
   cards with hero images; `load` waits for every image to
   finish; `domcontentloaded` fires immediately. Across the
   30+ smoke specs that walk through Discover, the
   `domcontentloaded` choice cuts ~3-5s per spec.
3. **`networkidle` is a footgun.** Playwright's third option
   `networkidle` waits for "no network requests for 500ms" —
   a page with a polling `useEffect` (analytics heartbeat,
   real-time presence) never becomes idle. The base class
   never offers `networkidle` as an option so subclasses
   cannot accidentally pin a flaky wait.

A subclass that needs `load` semantics must call
`this.page.goto(path, { waitUntil: 'load' })` directly, which
documents the exception loudly at the call site.

## Why `gotoLocalized()` special-cases `'en'`

The host app's [`apps/web/middleware.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/middleware.ts)
configures `next-intl` with `localePrefix: 'as-needed'`. That
posture means:

- **English** routes resolve at bare paths: `/`, `/discover/1`,
  `/about`. There is no `/en` prefix; navigating to `/en/about`
  redirects to `/about`.
- **Every other locale** resolves at prefixed paths: `/fr/`,
  `/fr/discover/1`, `/fr/about`. Navigating to a bare path in
  a non-English browser locale redirects to the locale-prefixed
  path.

`gotoLocalized()` encodes that contract in one place. Three
rejected alternatives:

1. **Always prefix.** Calling
   `this.page.goto(`/${locale}${path}`)` for every locale
   triggers a 308 redirect on `en` (`/en/about` →
   `/about`); the redirect adds latency and pollutes the trace
   with a redundant request.
2. **Never prefix.** Calling `this.page.goto(path)` for every
   locale lands on the wrong page for non-English locales (a
   French test would land on the English `/about` page and
   fail the title assertion).
3. **Branch on `'en'` at every call site.** Subclasses would
   re-implement the prefix logic; a future change from
   `localePrefix: 'as-needed'` to `localePrefix: 'always'`
   would require touching every page object instead of one
   line in this file.

## Why `waitForPageReady()` is a thin re-state of `goto`'s wait

`goto()` already awaits `waitUntil: 'domcontentloaded'`, so
calling `waitForPageReady()` immediately after `goto()` is
redundant. The method exists for **post-`goto` interaction**
patterns:

- A subclass clicks a "Next page" pagination button — the URL
  changes, the SPA navigation does not go through
  `page.goto()`, and the `domcontentloaded` event fires again
  for the new render. `waitForPageReady()` gives subclasses a
  documented way to await the new render without re-importing
  `page.waitForLoadState`.
- A subclass triggers a `next/link` client-side navigation —
  same shape, no `page.goto()` call.
- A subclass dismisses a modal that was blocking input —
  Playwright's auto-wait already handles this for most
  selectors, but a subclass that needs to assert on the page
  state directly after the modal closes can use this method.

The single load-state value (`domcontentloaded`) matches
`goto()`'s posture so there is no asymmetry between "wait
once at navigation" and "wait again at interaction."

## Why `getTitle()` exists

`page.title()` is one method call. Wrapping it in
`getTitle()` looks redundant. Three reasons it earns its
keep:

1. **Subclass discoverability.** A subclass author looking
   at `BasePage` sees "title shortcut here" and writes
   `await this.getTitle()` instead of `await
   this.page.title()`. Teaching the suite a single shape
   keeps assertions consistent across page objects.
2. **Future override site.** A future version that needs to
   sanitise the title (strip a `| Site Name` suffix, trim
   whitespace, lowercase for assertion) overrides
   `getTitle()` here without touching every consumer.
3. **Type-narrowed `Promise<string>` return.** The explicit
   return type pins the contract — `page.title()` returns
   `Promise<string>` today, but a method signature here
   documents it for readers who never open Playwright's
   `.d.ts`.

## Failure matrix

| Mistake                                                                  | What surfaces                                                                                                                                                                                          | Where it surfaces                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Drop the `import type` and switch to a runtime import                    | Bundle-size cost propagates to every spec; circular-import risk at runtime; ambient-drift risk between this file and the runner.                                                                       | Spec runs that hit a circular boot order; trace bloat.                         |
| Drop `readonly` from any field                                           | Subclasses can re-assign the field mid-test; cross-test state leaks if the page object is cached across tests.                                                                                         | Mutation-related flakes that are nearly impossible to attribute back here.     |
| Drop `.first()` from `header` or `footer`                                | Strict-mode locator violation on any page with a stacked `<header>` / `<footer>` (item-detail, admin sub-layout).                                                                                      | First subclass that asserts `expect(header).toBeVisible()` on a stacked page.  |
| Switch `navLinks` from `header.getByRole('link')` to `page.getByRole('link')` | Footer links and in-page item-card links pollute the inventory; auth-shell assertions ("Sign In is visible") fail because the footer also has a Sign In link.                                          | Auth-shell smoke specs that assert on a clean header link inventory.           |
| Switch `goto()` from `domcontentloaded` to `load`                        | Every smoke spec that walks Discover or any image-heavy page slows by ~3-5s; CI test-time budget regresses.                                                                                            | CI duration; spec-level flake on `<Suspense>`-heavy pages.                     |
| Switch `goto()` from `domcontentloaded` to `networkidle`                 | Every spec that lands on a page with a polling `useEffect` (analytics heartbeat) hangs until Playwright's per-test timeout fires.                                                                      | Spec timeouts on every page with an analytics heartbeat.                       |
| Drop the `'en'` special-case from `gotoLocalized()`                      | English navigation triggers a 308 redirect on every call; trace bloat; `next-intl` middleware churn.                                                                                                   | Trace size; intermittent test latency.                                         |
| Hard-code `/${locale}${path}` for every locale                            | Same as above — every English call routes through the redirect.                                                                                                                                        | Same as above.                                                                 |
| Switch `waitForPageReady()` to a different load state                    | Asymmetry with `goto()`; subclasses awaiting the wrong event after a click-driven SPA nav.                                                                                                             | Spec-level flake on click-driven SPA navigations.                              |
| Drop `getTitle()`                                                         | Subclasses re-import `page.title` ad-hoc; inconsistency across page objects; no documented hook for future title sanitisation.                                                                          | Drift across page-object subclasses.                                           |
| Move the file from `apps/web-e2e/page-objects/base.page.ts`              | Every subclass's `import { BasePage } from '../base.page'` breaks; mass `Cannot find module` failures at TS gate.                                                                                       | TS gate; first runner boot.                                                    |
| Rename `BasePage` to a different name                                    | Same as above — every `extends BasePage` clause needs to be renamed too.                                                                                                                               | TS gate.                                                                       |
| Add a public field that holds shared state across tests                  | Cross-test leakage; one spec's mutation visible to the next spec's setup; flakes that only surface under serial runs.                                                                                  | Spec-level flake on serial runs.                                               |
| Add a `protected static` cache here                                      | Same as above — Playwright instantiates a new page object per test, but a `static` cache survives.                                                                                                     | Same as above.                                                                 |
| Make `goto()` return a `Promise<Response | null>`                         | Subclasses that drop the return start to drift from a future "assert on response status from goto" need; type-erasure on the most-called method in the suite.                                          | Subclass authoring drift.                                                      |
| Make the constructor accept anything other than `page: Page`             | Every subclass's `super(page)` breaks; the contract that "page-objects are constructed from a Playwright `Page`" leaks.                                                                                | TS gate; first runner boot.                                                    |
| Drop the trailing newline                                                | Prettier diff on POSIX CI runners; lint failure on the e2e workspace.                                                                                                                                  | CI lint step.                                                                  |
| Ship the file with a CRLF line ending                                    | Prettier diff on POSIX CI runners; same as above.                                                                                                                                                      | Same as above.                                                                 |
| Switch the file extension to `.tsx`                                      | The `include: ["./**/*.ts"]` glob in [`e2e-tsconfig.md`](e2e-tsconfig.md) does not match; the file falls out of the type-checker's scope; subclasses break with `Cannot find module '../base.page'`.   | TS gate.                                                                       |

## Per-line walkthrough

| Line | Content                                                                       | Purpose                                                                                                                                  |
| ---- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `import type { Page, Locator } from '@playwright/test';`                      | Type-only Playwright import — no runtime cost, no circular-import risk.                                                                  |
| 2    | (blank)                                                                       | Standard ESM shape — single blank line between imports and module body.                                                                  |
| 3    | `export class BasePage {`                                                     | Single named export — every concrete page object extends this class.                                                                     |
| 4    | `    readonly page: Page;`                                                    | The Playwright `Page` handle every subclass needs for ad-hoc locator construction.                                                       |
| 5    | `    readonly header: Locator;`                                               | Pre-bound site-shell header Locator.                                                                                                     |
| 6    | `    readonly footer: Locator;`                                               | Pre-bound site-shell footer Locator.                                                                                                     |
| 7    | `    readonly navLinks: Locator;`                                             | Pre-bound header-scoped link enumeration.                                                                                                |
| 8    | (blank)                                                                       | Field-vs-constructor separator.                                                                                                          |
| 9    | `    constructor(page: Page) {`                                               | Single constructor signature — `page: Page`. Every subclass's `super(page)` matches.                                                     |
| 10   | `        this.page = page;`                                                   | Stores the page handle for ad-hoc locator construction.                                                                                  |
| 11   | `        this.header = page.locator('header').first();`                       | Pins the header Locator to the first `<header>` element on the page.                                                                     |
| 12   | `        this.footer = page.locator('footer').first();`                       | Symmetric pinning for `<footer>`.                                                                                                        |
| 13   | `        this.navLinks = this.header.getByRole('link');`                      | Header-scoped link enumeration — uses the just-bound `this.header` so the scoping is invariant to a future `header` re-binding.          |
| 14   | `    }`                                                                       | Constructor close.                                                                                                                       |
| 15   | (blank)                                                                       | Constructor-vs-method separator.                                                                                                         |
| 16   | `    async goto(path: string) {`                                              | The suite-wide navigation primitive.                                                                                                     |
| 17   | `        await this.page.goto(path, { waitUntil: 'domcontentloaded' });`      | Override of Playwright's default `waitUntil: 'load'` — see "Why `domcontentloaded`" above.                                               |
| 18   | `    }`                                                                       | Method close.                                                                                                                            |
| 19   | (blank)                                                                       | Method separator.                                                                                                                        |
| 20   | `    async gotoLocalized(path: string, locale: string) {`                     | Locale-aware navigation — encodes the host app's `localePrefix: 'as-needed'` posture.                                                    |
| 21   | `        const prefix = locale === 'en' ? '' : `/${locale}`;`                 | English short-circuit — `en` resolves to bare paths.                                                                                     |
| 22   | `        await this.page.goto(`${prefix}${path}`, { waitUntil: 'domcontentloaded' });` | Same `domcontentloaded` posture as `goto()`.                                                                                  |
| 23   | `    }`                                                                       | Method close.                                                                                                                            |
| 24   | (blank)                                                                       | Method separator.                                                                                                                        |
| 25   | `    async waitForPageReady() {`                                              | Re-await primitive for post-navigation interactions.                                                                                     |
| 26   | `        await this.page.waitForLoadState('domcontentloaded');`               | Same load state as `goto()` — symmetric posture.                                                                                         |
| 27   | `    }`                                                                       | Method close.                                                                                                                            |
| 28   | (blank)                                                                       | Method separator.                                                                                                                        |
| 29   | `    async getTitle(): Promise<string> {`                                     | Title shortcut. Explicit `Promise<string>` return type pins the contract.                                                                |
| 30   | `        return this.page.title();`                                           | Direct passthrough today — future title sanitisation overrides this method.                                                              |
| 31   | `    }`                                                                       | Method close.                                                                                                                            |
| 32   | `}`                                                                           | Class close — single trailing newline maintained per Prettier `endOfLine: lf` posture.                                                   |

## `base.page.ts`-change checklist

When you change the contents of `base.page.ts`, walk this
checklist before merging:

- **Subclass audit.** Every page object under
  `apps/web-e2e/page-objects/admin/`,
  `apps/web-e2e/page-objects/auth/`,
  `apps/web-e2e/page-objects/client/`, and
  `apps/web-e2e/page-objects/public/` extends `BasePage`. A
  signature change (constructor, public method) requires a
  pass over every subclass.
- **[`fixtures-index.md`](fixtures-index.md) cross-check.** The
  `auth.fixture` re-exports `test` and `expect`; nothing in
  the page-object tree is re-exported there today. If a future
  change adds a "default page object" to the fixtures barrel,
  that change cross-references this file.
- **[`e2e-tsconfig.md`](e2e-tsconfig.md) cross-check.** The
  `include: ["./**/*.ts"]` glob already picks up
  `page-objects/base.page.ts`; if the glob narrows or the
  file moves, the type-checker stops walking it.
- **[`e2e-package-manifest.md`](e2e-package-manifest.md) cross-check.**
  The package's `devDependencies.@playwright/test` underwrites
  the `Page` and `Locator` types this file uses; a Playwright
  major bump may change the type signatures (most commonly
  the `goto()` return type).
- **[`playwright-config.md`](playwright-config.md) cross-check.**
  The `baseURL` configured there is what `page.goto(path)`
  resolves relative to. A change to `baseURL` shape (e.g.
  trailing slash, port number) ripples through every `goto()`
  call.
- **[`auth-fixture.md`](auth-fixture.md) cross-check.** Every
  authenticated page object instantiated from the auth
  fixture's storage-state-bearing context still goes through
  this base class. A change to the constructor signature
  ripples to fixture-instantiated specs too.
- **TS gate.** Run `pnpm tsc --noEmit` from the e2e
  workspace and from the workspace root to catch any
  signature drift.
- **Smoke run.** Run a smoke-subset Playwright run
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium`)
  against a representative spec from each subclass tree
  (admin, auth, client, public) to confirm the new shape
  works end-to-end.
- **[`docs/log.md`](../log.md) entry.** Append a `apps/web-e2e`
  entry summarising the change (one line, present tense, links
  to this file and any cross-checked references).
- **[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage) cross-link.**
  If the change introduces a new shared concept that affects
  test authoring (a new pre-bound Locator, a new navigation
  primitive, a new wait-state shape), that concept lands in
  the spec first as a tasks/plan entry.
- **Reviewer pass.** Walk the failure matrix above against the
  diff to confirm no row's mistake has been introduced.
