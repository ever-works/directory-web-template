---
id: smoke-navigation-spec
title: E2E Smoke Navigation Spec (apps/web-e2e/tests/smoke/navigation.spec.ts)
sidebar_label: E2E Smoke Navigation Spec
sidebar_position: 501
---

# E2E Smoke Navigation Spec — `apps/web-e2e/tests/smoke/navigation.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**core navigation smoke spec** paired with
[`apps/web-e2e/tests/smoke/navigation.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/smoke/navigation.spec.ts).
Sits inside the `tests/smoke/` test subtree alongside the
**sibling** smoke spec
[`smoke-health-spec.md`](smoke-health-spec.md) (paired
with
[`tests/smoke/health.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/smoke/health.spec.ts)).

This is the **second** per-source-file reference the
docs tree publishes for any file under
`apps/web-e2e/tests/`, **continuing** the per-spec-file
docs rollout that
[`smoke-health-spec.md`](smoke-health-spec.md) opened —
the rollout complements the now-closed page-object docs
rollout (the admin-tree at 17-of-17, the public-tree at
14-of-14, the client-tree at 6-of-6, plus the
`auth/signin` and `base.page.ts` roots — see
[`base-page-object.md`](base-page-object.md) and
[`signin-page-object.md`](signin-page-object.md)).

Where [`smoke-health-spec.md`](smoke-health-spec.md)
documents a **data-driven, breadth-first** smoke
posture (one `test()` per route in a shared `PUBLIC_ROUTES`
constant, body-visibility-only assertions), this spec
documents the **hand-crafted, depth-first** smoke
posture — four hand-written `test()` blocks that
exercise specific user-flow primitives (home → item
detail click-through, home → sign-in click-through, an
item-grid count assertion, a categories-page heading
pin) the per-route health spec cannot.

## At a glance

| Element                                                         | Purpose                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import { test, expect } from '@playwright/test'`               | Standard Playwright runtime — the spec uses **only** the runtime test / expect, NOT the project's auth-aware test fixture from [`fixtures/index.ts`](fixtures-index.md). Same session-agnostic posture as [`smoke-health-spec.md`](smoke-health-spec.md).                                                     |
| `test.describe('Smoke: Core navigation', …)`                    | Single top-level describe block. The describe label is the load-bearing string the Playwright HTML report and the JUnit-XML output emit as the parent suite name — distinct from the sibling `'Smoke: Public pages health check'` describe label.                                                            |
| `test('home page displays directory items', …)`                 | First scenario — pins the **item-grid populated** invariant the home page must satisfy. Locates `a[href*="/items/"]` and asserts the count is `> 0`. Distinct from the health spec's body-visibility-only pin: a regression that ships an empty-grid home (e.g. a broken content fetch) would surface here.   |
| `test('can navigate from home to an item detail page', …)`      | Second scenario — pins the **click-through navigation** invariant. Clicks the first item link, waits for `/items/` URL pattern, asserts an `h1` is visible. Distinct from the health spec's `goto()`-only pin: exercises the runtime navigation primitive the user-facing flow depends on.                    |
| `test('can navigate to categories page', …)`                    | Third scenario — pins the **categories-page heading** invariant. `goto('/categories')` then asserts an `h1` is visible. Distinct from the health spec's body-visibility-only pin: pins a stronger structural assertion (the categories page must emit a top-level heading).                                   |
| `test('can navigate to sign in from home', …)`                  | Fourth scenario — pins the **sign-in link discoverability** invariant. Locates a link by accessible name `/sign in/i`, clicks, asserts the URL becomes `/auth/signin`. Distinct from the health spec's per-route enumeration: this is the only smoke that exercises the **header sign-in CTA** discoverability.|
| `await expect(items.first()).toBeVisible({ timeout: 30_000 })`  | Pins the first item link as visible with a 30-second timeout — generous enough to absorb the SSR / hydration delay on a cold-cache home page render. The wider timeout is necessary because the spec exercises a **post-load** assertion (after `page.goto`), unlike the health spec's `goto()`-bound pin.    |
| `await page.waitForURL(/\/items\//, { waitUntil: 'domcontentloaded' })` | Pins the post-click URL as containing `/items/`. The regex is intentionally lenient — accepts `/items/<slug>`, `/{locale}/items/<slug>`, and `/items/<slug>?utm_…=…` query-string suffixes. The `waitUntil: 'domcontentloaded'` posture mirrors the sibling health spec's wait condition.            |
| `await expect(page.getByRole('heading', { level: 1 })).toBeVisible()` | Pins the rendered DOM as containing an `h1` element. Distinct from the health spec's `body`-locator pin — which accepts an empty body — by requiring a structurally-valid top-level heading.                                                                                                              |

## What the spec asserts

The spec walks **four hand-written scenarios** that
collectively pin the **golden-path navigation primitives**
the rest of the e2e suite assumes work:

1. **Item grid populated on home** — `page.locator('a[href*="/items/"]')`
   has at least one match. A regression that ships a
   broken home-page content fetch (e.g. an empty Git
   CMS sync, a Drizzle query hitting an empty
   database) would surface here as an item-count-zero
   failure. The per-page test under
   [`tests/public/home.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/home.spec.ts)
   covers the same invariant at higher fidelity; this
   smoke pin runs in **every** CI job whereas the
   per-page test runs only on develop / main shards.
2. **Click-through navigation home → item detail** —
   the click-and-wait pattern proves the runtime
   navigation primitive (Next.js client-side
   navigation, the `<Link>` component, the per-item
   route resolver). A regression in the `<Link>`
   component or the
   [`apps/web/app/[locale]/items/[slug]/page.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/[locale]/items/[slug]/page.tsx)
   resolver would surface here as a wait-for-URL
   timeout.
3. **Categories page renders a heading** —
   `goto('/categories')` resolves to a non-empty
   page with an `h1`. The categories page is a
   load-bearing entry point (every per-category
   filter URL is reachable from this page) and a
   structural failure here cascades to every
   per-category test under
   [`tests/public/categories.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/categories.spec.ts).
4. **Sign-in CTA discoverability from home** — the
   accessible-name-based locator `getByRole('link', { name: /sign in/i })`
   pins the **header sign-in link's accessible name**.
   A regression that translates the link to a non-
   English locale without an `aria-label` fallback
   would surface here. The locale-switcher tests under
   [`tests/i18n/locale.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/i18n/locale.spec.ts)
   cover the per-locale variant.

## Why a hand-written `test()` block (not a data-driven loop)

The spec's four scenarios each exercise a **distinct
user-flow primitive** (item-grid presence, click-
through, heading pin, sign-in CTA). Distinct from
[`smoke-health-spec.md`](smoke-health-spec.md)'s
single-loop / single-assertion pattern, the
hand-written-block posture has three load-bearing
reasons:

1. **Per-scenario assertion divergence** — each
   scenario pins a structurally different invariant
   (count > 0 / `h1` visibility / URL match / link-
   click). A data-driven loop would force a single
   assertion shape across all four, weakening the
   per-scenario pin.
2. **Per-scenario navigation primitive divergence** —
   the four scenarios exercise four navigation
   primitives (`goto`, `goto + locator + click +
   waitForURL`, `goto + locator`, `goto + role-locator
   + click + URL pin`). Bundling them into a loop
   would lose the per-primitive failure mode.
3. **Per-scenario test-ID granularity** — the per-
   test titles are hand-written, descriptive, and
   stable across reordering (`'home page displays
   directory items'` vs the data-driven `${route.name}
   page loads (${route.path})` pattern). Test IDs that
   describe **what** the scenario proves (not just
   **where** it runs) are easier to triage in the
   Playwright HTML report and JUnit-XML output.

## Why `a[href*="/items/"]` (not `[data-testid=…]`)

The item-grid presence assertion uses an attribute-
substring CSS selector rather than a `data-testid`
locator. The choice is **intentional, not a missing-
testid bug**:

- **Resilience to the page-object refactor surface**
  — the page-object drivers under
  [`apps/web-e2e/page-objects/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects)
  encapsulate `data-testid` selectors for the per-
  page specs. A `data-testid` regression in the home
  page would break every per-page test that uses the
  driver — the smoke layer must NOT also break,
  because the smoke layer is the canary that signals
  "the build is fundamentally broken" before the
  per-page suites can even run.
- **Cross-route coverage** — the
  `a[href*="/items/"]` selector is **inherently
  cross-route** — it matches every link to a per-
  item page regardless of which list / grid / card
  emits the link. A `data-testid="item-card"`
  selector would only match the card variant.
- **Selector simplicity** — the smoke layer must
  read like documentation. The substring selector
  is self-documenting: "any anchor whose `href`
  contains `/items/`" is exactly what the assertion
  proves.

## Why `getByRole('link', { name: /sign in/i })` (not `[href="/auth/signin"]`)

The sign-in CTA discoverability assertion uses an
**accessible-name-based** Playwright locator rather
than a CSS attribute selector. The choice is the
**accessibility-first** posture the constitution
Article V references:

- **Tests the user-visible primitive** — the
  Playwright `getByRole(role, { name })` locator
  resolves the link via the **accessibility tree**,
  exactly the way an assistive-technology user
  reaches the link. A regression that ships a
  link whose accessible name is no longer "Sign in"
  (e.g. translated to a different language without
  an `aria-label` fallback, or replaced with an
  icon-only button without an accessible name)
  would surface here.
- **Resilience to URL refactor** — a future
  contributor who renames the route from
  `/auth/signin` to `/login` (or moves it under a
  locale prefix) would only need to update the
  **second** assertion (the URL pin) without
  rewriting the **first** (the role-based locator).
- **Cross-locale coverage** — the regex
  `/sign in/i` is case-insensitive and the smoke
  layer's locale is pinned to `en-US` via the
  [`playwright.config.ts`](playwright-config.md)
  `locale: 'en-US'` use-flag, so the sign-in link's
  accessible name resolves to the English string
  on every smoke run regardless of the active
  i18n locale-detection middleware posture.

## What it does not contain

The spec is intentionally minimal. The following are
**deliberate omissions** that consuming specs and
sibling smoke specs cover instead:

- **No authenticated flows** — the spec runs as an
  anonymous browser context. Authenticated-flow
  smoke is covered by the auth-aware fixture in
  [`fixtures/auth.fixture.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/fixtures/auth.fixture.ts)
  + the per-page specs under `tests/admin/` /
  `tests/client/`.
- **No form interactions** — the sign-in scenario
  asserts only the **CTA discoverability + URL
  navigation**, not the sign-in form's submit /
  validation / error states. The form behaviour is
  covered by [`tests/auth/signin.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/auth/signin.spec.ts)
  and the per-driver
  [`signin-page-object.md`](signin-page-object.md)
  reference.
- **No screenshot / visual-regression assertions** —
  visual regression is intentionally out of scope
  for the smoke layer. Same posture as
  [`smoke-health-spec.md`](smoke-health-spec.md).
- **No per-locale enumeration** — the spec walks
  the `en-US`-locale paths only. Per-locale
  navigation coverage lives in
  [`tests/i18n/locale.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/i18n/locale.spec.ts).
- **No per-content-warning enumeration** — the spec
  does not exercise content-warning gating. Per-
  content-warning navigation coverage lives in the
  per-page specs under `tests/public/`.
- **No accessibility-tree assertions beyond the
  sign-in CTA** — the categories-page scenario uses
  a generic role-based heading locator
  (`getByRole('heading', { level: 1 })`), but the
  spec stops short of axe-core integration. Full
  accessibility coverage is delegated to the per-
  page specs and the dedicated axe-core integration
  the constitution Article V references.

## Why the 30-second `expect.toBeVisible({ timeout })` override

The first-item visibility assertion uses an explicit
30-second timeout (`{ timeout: 30_000 }`) that **overrides**
the project-default 30-second `expect.timeout` from
[`playwright.config.ts`](playwright-config.md):

- **The default already matches** — the
  `playwright.config.ts` sets `expect: { timeout: 30_000 }`
  globally, so the override is **redundant** today.
  The explicit override is a **deliberate self-
  documenting pin**: a future contributor who lowers
  the default timeout to 10 seconds will not
  inadvertently break the home-page item-grid
  visibility on a cold-cache CI runner.
- **Cold-cache resilience** — the home page's
  initial render involves fetching every Git CMS
  item, the locale resource bundle, the active
  theme's CSS, and the SSR-hydrated React tree. On
  a cold-cache CI runner this can exceed the
  default 5-second `expect.toBeVisible` timeout that
  Playwright ships out of the box.
- **Distinct from the navigation timeout** — the
  navigation timeout (`navigationTimeout: 60_000`)
  governs `goto` / `waitForURL` waits; the
  `expect.toBeVisible` timeout governs locator
  resolution waits. The two are independent and
  the spec sets the latter explicitly.

## Why `apps/web-e2e/tests/smoke/` (not `tests/public/`)

Same directory-placement rationale as
[`smoke-health-spec.md`](smoke-health-spec.md):

- **Smoke layer / per-page layer separation** — the
  `tests/smoke/` directory holds the lowest-fidelity
  "did the navigation work" assertions; the
  `tests/public/` directory holds the per-route
  content / behaviour assertions.
- **Per-project filtering** — the
  [`playwright.config.ts`](playwright-config.md)
  configures the smoke layer as a separate
  Playwright project that can be run in isolation
  via `pnpm test --project=smoke`.
- **CI shard parallelism** — the smoke layer runs
  in every CI job (PR / develop / main) as the
  fastest feedback loop; the per-page layer runs
  only on develop and main as a second-tier
  parallel shard.

## Cross-references

- [`smoke-health-spec.md`](smoke-health-spec.md) —
  the **sibling** smoke spec, paired with
  `tests/smoke/health.spec.ts`. Documents the
  **data-driven** smoke posture (one `test()` per
  route in `PUBLIC_ROUTES`) — distinct from this
  spec's hand-written posture.
- [`base-page-object.md`](base-page-object.md) —
  the page-object inheritance root. The smoke spec
  does NOT use any page object, distinct from every
  per-page spec under `tests/public/` /
  `tests/admin/` / `tests/client/`.
- [`e2e-test-data.md`](e2e-test-data.md) — the
  shared-data boundary. Distinct from the sibling
  health spec, this spec's only external import is
  `@playwright/test` itself — the spec deliberately
  does NOT import from `helpers/test-data.ts` to
  keep its import graph minimal.
- [`fixtures-index.md`](fixtures-index.md) — the
  fixture-export boundary. The smoke spec
  intentionally does NOT use the project's `test`
  fixture (same session-agnostic posture as the
  sibling health spec).
- [`playwright-config.md`](playwright-config.md) —
  the project-level Playwright configuration. The
  smoke spec inherits the `fullyParallel: true`,
  `retries: process.env.CI ? 2 : 0`,
  `expect.timeout: 30_000`,
  `navigationTimeout: 60_000`, and `reporter`
  settings from the config.
- [`global-setup.md`](global-setup.md) — the
  per-suite global setup. The smoke spec runs
  successfully even when global-setup has not yet
  run (deliberate independence — same posture as
  the sibling health spec).
- [`signin-page-object.md`](signin-page-object.md) —
  the sign-in page-object driver. The smoke spec
  does NOT use the driver (deliberate — the smoke
  layer must run before any driver is exercised).

## Related per-spec docs

- [`smoke-health-spec.md`](smoke-health-spec.md) —
  the **first** per-spec-file reference, paired with
  `tests/smoke/health.spec.ts`. Documents the
  data-driven smoke posture this spec deliberately
  contrasts with.
- This page (`smoke-navigation-spec.md`) is the
  **second** per-spec-file reference, paired with
  `tests/smoke/navigation.spec.ts`. With this
  reference the per-spec docs rollout closes its
  coverage of the **smoke tree** (the
  `tests/smoke/` directory has exactly two `*.spec.ts`
  files; both are now documented).
- Subsequent per-spec docs will turn to the per-tree
  spec rollouts under `tests/admin/` / `tests/client/` /
  `tests/public/` / `tests/api/` / `tests/auth/` /
  `tests/i18n/`.

## See also

- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  — the spec governing the e2e suite's coverage
  goals.
- [Constitution Article V — Performance & quality
  gates](../../.specify/memory/constitution.md) —
  the durable principle that mandates the smoke
  layer as the fastest CI feedback loop.
- [`apps/web-e2e/E2E-TESTS.md`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/E2E-TESTS.md)
  — the e2e suite's coverage manifest.
