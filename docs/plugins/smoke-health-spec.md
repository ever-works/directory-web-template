---
id: smoke-health-spec
title: E2E Smoke Health Spec (apps/web-e2e/tests/smoke/health.spec.ts)
sidebar_label: E2E Smoke Health Spec
sidebar_position: 500
---

# E2E Smoke Health Spec — `apps/web-e2e/tests/smoke/health.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**public-pages health-check spec** paired with
[`apps/web-e2e/tests/smoke/health.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/smoke/health.spec.ts).
Sits inside the `tests/smoke/` test subtree alongside the
sibling smoke spec
[`tests/smoke/navigation.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/smoke/navigation.spec.ts).

This is the **first per-source-file reference** the docs
tree publishes for any file under `apps/web-e2e/tests/`,
**opening the per-spec-file docs rollout** that
complements the now-closed page-object docs rollout (the
admin-tree at 17-of-17, the public-tree at 14-of-14, the
client-tree at 6-of-6, plus the `auth/signin` and
`base.page.ts` roots — see
[`base-page-object.md`](base-page-object.md) and
[`signin-page-object.md`](signin-page-object.md)).

Where the page-object docs rollout documented the
**driver layer** (the `*.page.ts` files that encapsulate
per-page Locator and helper APIs), the per-spec-file
docs rollout documents the **consumer layer** — the
`*.spec.ts` files that import drivers / fixtures /
helpers and turn them into assertion-bearing scenarios.

## At a glance

| Element                                               | Purpose                                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import { test, expect } from '@playwright/test'`     | Standard Playwright runtime — the spec uses **only** the runtime test / expect, NOT the project's auth-aware test fixture from [`fixtures/index.ts`](fixtures-index.md). The smoke layer is intentionally session-agnostic.                                   |
| `import { PUBLIC_ROUTES } from '../../helpers/test-data'` | Single import from the suite's shared-data boundary documented at [`e2e-test-data.md`](e2e-test-data.md). The `PUBLIC_ROUTES` array is a `readonly` tuple of `{ path, name }` pairs covering the 13 representative public routes the smoke layer exercises.   |
| `test.describe('Smoke: Public pages health check', …)` | Single top-level describe block — the spec's only structural element. The describe label is the load-bearing string the Playwright HTML report and the JUnit-XML output emit as the parent suite name.                                                        |
| `for (const route of PUBLIC_ROUTES)`                   | **Data-driven test generation** — one Playwright `test()` per route in `PUBLIC_ROUTES`. Distinct from every per-page spec under `tests/admin/`, `tests/client/`, or `tests/public/` (which all use a fixed describe-block + per-scenario `test()` posture).   |
| `` `${route.name} page loads (${route.path})` ``      | Per-test title combining the human-readable `name` field (e.g. `'Home'`, `'Privacy Policy'`) with the literal route path (e.g. `'/'`, `'/privacy-policy'`) — emits stable per-route test IDs the Playwright HTML report can group.                            |
| `await page.goto(route.path, { waitUntil: 'domcontentloaded' })` | Navigates to the per-route path with `waitUntil: 'domcontentloaded'` — the **earliest** wait condition in Playwright's four-step ladder (`'commit' / 'domcontentloaded' / 'load' / 'networkidle'`). Trades full-page-load wait time for smoke-suite speed.    |
| `expect(response, …).not.toBeNull()`                   | Pins the `page.goto()` return value as a non-null `Response` — defends against the rare case where Playwright returns `null` (which happens for navigations that did not result in a network request, e.g. same-page anchor jumps).                          |
| `expect(response!.status()).toBeLessThan(400)`         | Pins the HTTP status as a non-error response (`< 400`) — accepts the canonical 200, the 301 / 302 redirect chains, and the 304 `Not Modified` response a future contributor's `Cache-Control` header tuning might emit. Rejects every 4xx / 5xx outcome.    |
| `await expect(page.locator('body')).toBeVisible()`     | Pins the rendered DOM — proves the page returned a non-empty body the browser was able to paint. Distinct from a `'response.ok()'`-only assertion (which would accept a 200 response with an empty body).                                                    |

## What the spec asserts

The spec walks every entry in `PUBLIC_ROUTES` and pins
**three contracts** per route:

1. **Navigation completion** — `page.goto()` returns a
   non-null `Response`. The non-null pin is a defensive
   guard: Playwright returns `null` for same-document
   navigations (anchor jumps, history pushes), and a
   regression that turns a public route into a same-
   document navigation would be caught here as a hard
   `not.toBeNull()` failure rather than a confusing
   downstream `Cannot read property 'status' of null`.
2. **HTTP status** — the response status is `< 400`.
   The threshold deliberately includes the 3xx redirect
   class because the production source emits a number of
   middleware-driven redirects (e.g. the
   [`apps/web/middleware.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/middleware.ts)
   locale-prefix injection rewrites unprefixed URLs
   server-side and emits a 307 to the `/{locale}/…`
   shape). Rejecting 3xx responses would cause spurious
   smoke-failure noise on every locale-redirect.
3. **Body visibility** — `page.locator('body')` is
   visible. The body-visibility assertion is the
   smallest possible "the page rendered something" pin
   — it accepts the static-export shell, the SSR-
   hydrated React tree, the loading-skeleton state, and
   the
   [`apps/web/app/[locale]/loading.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/[locale]/loading.tsx)
   suspense-fallback.

## Why `waitUntil: 'domcontentloaded'` (not `'load'` / not `'networkidle'`)

Playwright's `goto()` accepts four wait conditions —
`'commit' / 'domcontentloaded' / 'load' / 'networkidle'`
— in increasing order of strictness. The smoke spec
deliberately picks the second-earliest:

- **`'commit'`** would return as soon as the navigation
  is committed (the first byte of the response is
  received). Too early — a server-error response that
  emits a partial body and then aborts would still
  resolve the goto.
- **`'domcontentloaded'`** (the spec's pick) waits for
  the `DOMContentLoaded` event — the HTML is fully
  parsed and the initial DOM tree is built, but
  asynchronous scripts, images, and stylesheets may
  still be loading. This is the earliest pin that lets
  the body-visibility assertion succeed.
- **`'load'`** waits for the full `load` event — every
  image, stylesheet, and font fully downloaded.
  Strictly stronger than the smoke layer needs and
  considerably slower on representative public routes
  (the `/discover/1` listing fetches every grid-tile
  image).
- **`'networkidle'`** waits until there are zero in-
  flight network requests for 500ms. Strictly stronger
  than `'load'` and the source of most "smoke flakiness"
  in suites that pick it (analytics beacons, PostHog
  ingestion, Sentry trace flushes never go fully idle).

## Why `< 400` (not `=== 200`)

The 3xx redirect class is the load-bearing reason the
spec accepts every status `< 400` rather than pinning
an exact 200. The production source emits 3xx
responses for at least four documented branches:

1. **Locale-prefix injection** — the
   [`apps/web/middleware.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/middleware.ts)
   middleware rewrites unprefixed paths (e.g. `/about`)
   to the active locale's path (e.g. `/en/about`) via a
   307. The `PUBLIC_ROUTES` entries are all unprefixed
   today and the smoke spec must accept the 307
   regardless of the active locale-detection posture.
2. **Trailing-slash normalisation** — Next.js's
   default `trailingSlash: false` config redirects
   `/about/` → `/about` via a 308 Permanent Redirect.
   A future contributor who reverses the
   `trailingSlash` flag would emit redirects for the
   bare-path entries.
3. **Auth-redirect** — the `/auth/signin` and
   `/auth/register` routes are public to anonymous
   visitors but redirect already-authenticated users
   to `/`. Smoke runs that pick up an authenticated
   `storageState` from a sibling spec would hit the
   redirect and a strict `=== 200` pin would fail.
4. **`Cache-Control: max-age` 304s** — a future
   contributor's `Cache-Control` header tuning might
   emit a 304 `Not Modified` response on warm-cache
   navigations.

The smoke spec's `< 400` posture accepts all four
branches and rejects only the 4xx / 5xx error class.

## Why `body` (not `main` / not `[role="main"]`)

The body-visibility assertion uses the **most
universal** rendered-element pin — the `<body>`
element, which exists on every HTML response with a
parsed DOM. Distinct from:

- **`page.locator('main')`** — would fail on routes
  that wrap their content in `<div role="main">` or
  similar non-`<main>` semantic roots. The current
  layout uses `<main>` consistently but a future
  refactor (e.g. the
  [Spec 017 — Map View](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/017-map-view/spec.md)
  full-bleed posture) might break the assumption.
- **`page.locator('[role="main"]')`** — same
  fragility plus the role-attribute is omitted on the
  default `<main>` element (which already implies
  `role="main"`).
- **`page.locator('header')`** — would fail on the
  `/auth/signin` and `/auth/register` routes if the
  auth layout opts out of the global header.
- **`page.title()` non-empty assertion** — would fail
  on routes that emit a metadata-driven empty title.

The `<body>` pin is the **only** universal "the page
rendered something" assertion that survives every
layout / route / locale combination today.

## What it does not contain

The spec is intentionally minimal. The following are
**deliberate omissions** that consuming specs and
sibling smoke specs cover instead:

- **No `data-testid` selectors** — every assertion
  uses a tag-name Locator. Smoke specs are
  intentionally lower-fidelity than the per-page
  specs under `tests/public/` which use the page-
  object drivers' role / label / `data-testid`
  selectors.
- **No accessibility assertions** — accessibility is
  covered by the per-page specs and the dedicated
  axe-core integration the constitution Article V
  references. The smoke layer's job is "did the page
  render at all", not "did it render accessibly".
- **No screenshot / visual-regression assertions** —
  visual regression is intentionally out of scope for
  the smoke layer (would amplify flakiness on data-
  driven content like the `/discover/1` grid).
- **No per-route content assertions** — the spec
  asserts only that **a body** is visible, not that
  the body contains the expected content. The
  per-page specs under `tests/public/` (e.g.
  [`tests/public/about.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/about.spec.ts),
  [`tests/public/help.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/help.spec.ts))
  pin per-route content.
- **No locale enumeration** — the spec walks the
  unprefixed paths only. Per-locale coverage lives in
  [`tests/i18n/locale.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/i18n/locale.spec.ts).
- **No authenticated-route entries** — `PUBLIC_ROUTES`
  contains only routes anonymous visitors can reach
  (the auth pages included). Authenticated-route
  health is covered by the auth-aware fixture in
  [`fixtures/auth.fixture.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/fixtures/auth.fixture.ts)
  + the per-page specs under `tests/admin/` /
  `tests/client/` / `tests/public/admin-pages-protected.spec.ts`.

## Why `'@playwright/test'` (not the project's `test` fixture)

The smoke spec imports the runtime test directly from
`@playwright/test` rather than the project's auth-
aware test fixture from
[`fixtures/index.ts`](fixtures-index.md). The
intentional choice has three load-bearing reasons:

1. **Session agnosticism** — the smoke layer must
   prove that the public surface is reachable to a
   fresh, unauthenticated browser context. Importing
   the auth fixture would tie the smoke layer to the
   `auth-states/admin.json` /
   `auth-states/client.json` storage-state files the
   fixture sets up, which would (a) require the
   smoke run to first complete the auth dance and
   (b) hide regressions where a public route starts
   requiring auth.
2. **Independence from `global-setup.ts`** — the auth
   fixture depends on the global-setup
   ([`global-setup.md`](global-setup.md)) seeding an
   admin user and persisting an admin storage state.
   The smoke layer must run successfully even before
   the global-setup runs (e.g. on a fresh CI runner
   bringing up a clean database).
3. **Smaller import graph** — the runtime test has
   zero transitive imports beyond Playwright. The
   project test fixture pulls in
   `fixtures/auth.fixture.ts` →
   `helpers/test-data.ts` →
   `process.env.SEED_ADMIN_EMAIL` /
   `process.env.SEED_ADMIN_PASSWORD` runtime
   resolution that throws on missing env vars (see
   [`e2e-test-data.md`](e2e-test-data.md)). The
   smoke spec must run on a machine that has not yet
   sourced the seeded-admin env vars.

## Why one `for` loop (not 13 hand-written tests)

The spec uses a `for (const route of PUBLIC_ROUTES)`
loop to generate one Playwright `test()` per route
rather than 13 hand-written `test('Home page loads', …)`
blocks. The data-driven posture has three load-
bearing reasons:

1. **Single source of truth** — `PUBLIC_ROUTES` lives
   in [`apps/web-e2e/helpers/test-data.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/helpers/test-data.ts)
   and is shared with future smoke specs / consuming
   specs that need to exercise the public-route set.
   A new public route added to the production source
   needs to be added to `PUBLIC_ROUTES` once and the
   smoke coverage extends automatically.
2. **Stable test IDs** — the per-test title combines
   the `name` and `path` fields (`` `${route.name} page loads (${route.path})` ``)
   so the Playwright HTML report and the JUnit-XML
   output emit per-route test IDs that survive
   reordering of the `PUBLIC_ROUTES` array.
3. **Isolated failure** — Playwright runs each
   generated `test()` in its own worker context (per
   the project-level `fullyParallel: true` setting in
   [`playwright.config.ts`](playwright-config.md)). A
   regression on one route does not cascade to the
   others — every route gets its own isolated `Page` /
   `BrowserContext` / network log / video / trace.

## Why `apps/web-e2e/tests/smoke/` (not `tests/public/`)

The spec lives under `tests/smoke/` rather than
alongside the per-page public specs under
`tests/public/` because:

- **Smoke layer / per-page layer separation** — the
  `tests/smoke/` directory holds the lowest-fidelity
  "did the page render" assertions; the
  `tests/public/` directory holds the per-route
  content / behaviour assertions. The two layers
  serve different audiences (smoke for "is the build
  green", per-page for "does this route still work
  the way the spec says it should").
- **Per-project filtering** — the
  [`playwright.config.ts`](playwright-config.md)
  configures the smoke layer as a separate
  Playwright project that can be run in isolation
  via `pnpm test --project=smoke`. The directory
  separation makes the project filter trivial.
- **CI shard parallelism** — the smoke layer runs in
  every CI job (PR / develop / main) as the fastest
  feedback loop; the per-page layer runs only on
  develop and main as a second-tier parallel shard.

## Cross-references

- [`base-page-object.md`](base-page-object.md) —
  the page-object inheritance root. The smoke spec
  does NOT use any page object, distinct from every
  per-page spec under `tests/public/` /
  `tests/admin/` / `tests/client/`.
- [`e2e-test-data.md`](e2e-test-data.md) — the
  shared-data boundary. The smoke spec's only
  external import is the `PUBLIC_ROUTES` constant.
- [`fixtures-index.md`](fixtures-index.md) — the
  fixture-export boundary. The smoke spec
  intentionally does NOT use the project's `test`
  fixture (see "Why `'@playwright/test'`" above).
- [`playwright-config.md`](playwright-config.md) —
  the project-level Playwright configuration. The
  smoke spec inherits the `fullyParallel: true`,
  `retries: process.env.CI ? 2 : 0`, and `reporter`
  settings from the config.
- [`global-setup.md`](global-setup.md) — the
  per-suite global setup. The smoke spec runs
  successfully even when global-setup has not yet
  run (deliberate independence — see "Why
  `'@playwright/test'`" reason 2 above).

## Related per-spec docs

This page is the **first** per-spec-file reference
the docs tree publishes. Subsequent per-spec docs
will turn to the sibling smoke spec
(`tests/smoke/navigation.spec.ts` — see
`smoke-navigation-spec.md`, future) and then to the
per-tree spec rollouts under `tests/admin/` /
`tests/client/` / `tests/public/` / `tests/api/` /
`tests/auth/` / `tests/i18n/`.

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
