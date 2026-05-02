---
id: playwright-config
title: Playwright Runner Configuration (`apps/web-e2e/playwright.config.ts`)
sidebar_label: Playwright config
sidebar_position: 30
---

# Playwright Runner Configuration (`apps/web-e2e/playwright.config.ts`)

> **Status.** Authoritative reference for the Playwright e2e
> suite's runner configuration defined in
> [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
> and elaborated by
> [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion).
> The configuration is locked by
> [`apps/web-e2e/playwright.config.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/playwright.config.ts),
> which loads `apps/web/.env.local` via `dotenv`, declares the
> `testDir` / `outputDir` boundaries, the parallelism / retry posture
> per CI vs local, the reporter set per CI vs local, three browser
> projects (Chromium, Firefox, WebKit), the `use`-block defaults
> every project inherits, and the `webServer` block that boots the
> host web app (`pnpm --filter @ever-works/web dev` locally, `build`
> + `start` on CI). When any of those fields move, update **this**
> page in the same change so the doc and the file cannot drift.

`apps/web-e2e/playwright.config.ts` is the **per-suite Playwright
runner configuration** that the Playwright CLI
([`@playwright/test`](https://playwright.dev/docs/api/class-test))
reads every time `pnpm test:e2e`, `pnpm test:e2e:ui`,
`pnpm test:e2e:chromium`, `pnpm test:e2e:headed`, `pnpm test:e2e:debug`,
or any IDE Playwright integration runs. It pairs with
[`apps/web-e2e/tsconfig.json`](./e2e-tsconfig.md) — the tsconfig
locks the **type-checking posture** of the suite, this file locks
the **runtime behaviour** of the runner. Both files together
define the e2e suite's compile-and-run boundary.

This page is the **per-source-file reference** that pairs with
[`apps/web-e2e/playwright.config.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/playwright.config.ts)
the same way
[`e2e-tsconfig.md`](./e2e-tsconfig.md) pairs with
`apps/web-e2e/tsconfig.json`,
[`web-app-tsconfig.md`](./web-app-tsconfig.md) pairs with
`apps/web/tsconfig.json`,
[`tsconfig-presets.md`](./tsconfig-presets.md) pairs with the four
files inside
[`packages/tsconfig/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig),
[`plugin-tsconfigs.md`](./plugin-tsconfigs.md) pairs with the three
plugin-package `tsconfig.json` files,
[`eslint-config.md`](./eslint-config.md) pairs with the two files
inside `packages/eslint-config/`,
[`pnpm-workspace.md`](./pnpm-workspace.md) pairs with
`pnpm-workspace.yaml`,
[`turbo-config.md`](./turbo-config.md) pairs with `turbo.json`,
[`workspace-root-manifest.md`](./workspace-root-manifest.md) pairs
with the root `package.json`,
[`npmrc-config.md`](./npmrc-config.md) pairs with `.npmrc`,
[`sdk-package-manifest.md`](./sdk-package-manifest.md) pairs with
`packages/plugin-sdk/package.json`,
[`runtime-package-manifest.md`](./runtime-package-manifest.md) pairs
with `packages/plugin-runtime/package.json`,
[`plugin-demo-package-manifest.md`](./plugin-demo-package-manifest.md)
pairs with `packages/plugin-demo/package.json`,
[`sdk-public-surface.md`](./sdk-public-surface.md) pairs with
`packages/plugin-sdk/src/index.ts`,
[`runtime-public-surface.md`](./runtime-public-surface.md) pairs with
`packages/plugin-runtime/src/index.ts`,
[`manifest.md`](./manifest.md) pairs with `manifest.ts`,
[`capabilities.md`](./capabilities.md) pairs with `capabilities.ts`,
[`slots.md`](./slots.md) pairs with `slots.ts`,
[`providers.md`](./providers.md) pairs with `providers.ts`,
[`plugin.md`](./plugin.md) pairs with `plugin.ts`,
[`loader.md`](./loader.md) pairs with `loader.ts`,
[`registry.md`](./registry.md) pairs with `registry.ts`,
[`slot-host.md`](./slot-host.md) pairs with `SlotHost.tsx`,
[`testing.md`](./testing.md) pairs with `testing.ts`, and
[`plugin-demo.md`](./plugin-demo.md) pairs with the bundled reference
plugin under `packages/plugin-demo/src/`. Where
[`e2e-tsconfig.md`](./e2e-tsconfig.md) documents the **suite's
type-checking boundary** (which files the type-checker walks, which
preset they extend), this page documents the **suite's runtime
boundary** — which directory the runner discovers tests from, how
many workers run them, which browsers they execute against, what
the `use`-defaults are, and how the host app is booted before the
first test.

## At a glance

| Field                                | Value                                                                                                                                                                              | Why it matters                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dotenv.config({ path: ../web/.env.local })` | Loads the host web app's `.env.local` file before the runner starts                                                                                                                | The Playwright suite must see the same env the host app sees so `BASE_URL`, `DATABASE_URL`, `AUTH_SECRET`, etc all resolve identically in test and dev. Loading from `../web/.env.local` (not from `apps/web-e2e/.env.local`) keeps a single source of truth.                                                                                                                                                                                                                                          |
| `baseURL`                             | `process.env.BASE_URL ?? 'http://localhost:3000'`                                                                                                                                  | Every `request.get(...)` and `page.goto(...)` resolves relative to this URL. The override hatch (`BASE_URL=...`) lets CI / staging point the suite at a deployed environment without touching the file.                                                                                                                                                                                                                                                                                              |
| `isCI`                                | `!!process.env.CI`                                                                                                                                                                 | Boolean gate that fans the per-environment overrides (parallelism, retries, reporter set, trace mode, video mode, webServer command, webServer timeout) into two distinct postures.                                                                                                                                                                                                                                                                                                                  |
| `testDir`                             | `'./tests'`                                                                                                                                                                        | The runner walks `apps/web-e2e/tests/**/*.spec.ts` only. `fixtures/`, `helpers/`, `page-objects/`, `global-setup.ts`, `global-teardown.ts`, and `playwright.config.ts` are **not** tests — they are imported from inside the test files.                                                                                                                                                                                                                                                              |
| `outputDir`                           | `'./test-results'`                                                                                                                                                                 | Per-test artefact directory (videos, traces, screenshots). Distinct from `playwright-report/` (the HTML reporter output).                                                                                                                                                                                                                                                                                                                                                                            |
| `fullyParallel`                       | `true`                                                                                                                                                                              | Tests inside the same file run in parallel. Combined with `workers > 1`, this gives the runner full freedom to interleave specs across workers.                                                                                                                                                                                                                                                                                                                                                       |
| `workers`                             | `isCI ? 2 : 1`                                                                                                                                                                      | CI runs two workers in parallel; local runs serialise. The CI bump trades flakiness risk against wall-clock time; the local default avoids surprising the contributor.                                                                                                                                                                                                                                                                                                                                |
| `retries`                             | `isCI ? 2 : 0`                                                                                                                                                                      | CI auto-retries flaky tests up to twice; local does not retry (the contributor sees the first failure verbatim).                                                                                                                                                                                                                                                                                                                                                                                       |
| `reporter` (CI)                       | `[['html', { open: 'never', outputFolder: './playwright-report' }], ['github'], ['list']]`                                                                                          | CI emits the HTML report as an artifact, the `github` reporter for inline annotations on the run page, and `list` for raw stdout. `open: 'never'` is critical — the runner must never try to open a browser on the CI machine.                                                                                                                                                                                                                                                                          |
| `reporter` (local)                    | `[['html', { open: 'on-failure', outputFolder: './playwright-report' }], ['list']]`                                                                                                | Local emits the HTML report and only auto-opens it on the first failure. The `list` reporter prints per-test status as the run progresses.                                                                                                                                                                                                                                                                                                                                                              |
| `timeout`                             | `60_000`                                                                                                                                                                            | Per-test timeout — 60 seconds. Captures any hung navigation, hung selector, or unresponsive page early.                                                                                                                                                                                                                                                                                                                                                                                                |
| `expect.timeout`                      | `30_000`                                                                                                                                                                            | Per-`expect()` timeout — 30 seconds. Auto-retrying assertions (`expect(locator).toBeVisible()`) loop until this deadline elapses.                                                                                                                                                                                                                                                                                                                                                                       |
| `globalSetup`                         | `path.resolve(__dirname, './global-setup.ts')`                                                                                                                                     | Runs **once** before any worker starts. Used to seed test data, prime caches, validate env vars.                                                                                                                                                                                                                                                                                                                                                                                                       |
| `globalTeardown`                      | `path.resolve(__dirname, './global-teardown.ts')`                                                                                                                                  | Runs **once** after all workers finish. Used to flush per-run caches, reset DB-side state.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `use.baseURL`                         | `baseURL`                                                                                                                                                                            | Inherits the top-level `baseURL`. Every project (Chromium, Firefox, WebKit) sees the same root URL.                                                                                                                                                                                                                                                                                                                                                                                                    |
| `use.trace`                           | `isCI ? 'on-first-retry' : 'retain-on-failure'`                                                                                                                                     | CI emits a trace only when a test fails the first time and is being retried (saves storage on the happy path). Local always retains a trace on failure so the contributor can open it via `npx playwright show-trace`.                                                                                                                                                                                                                                                                                  |
| `use.screenshot`                      | `'only-on-failure'`                                                                                                                                                                | Screenshots are kept only when a test fails. Saves storage and keeps the report focused on the failures.                                                                                                                                                                                                                                                                                                                                                                                              |
| `use.video`                           | `isCI ? 'on-first-retry' : 'off'`                                                                                                                                                   | CI records video on the first retry (helps diagnose CI-only flakes); local skips video to keep the watch loop fast.                                                                                                                                                                                                                                                                                                                                                                                    |
| `use.navigationTimeout`               | `60_000`                                                                                                                                                                            | Per-`page.goto(...)` timeout. Same posture as `timeout` — long enough to absorb the host app's first cold render in dev mode.                                                                                                                                                                                                                                                                                                                                                                          |
| `use.actionTimeout`                   | `30_000`                                                                                                                                                                            | Per-action timeout (`page.click(...)`, `page.fill(...)`). Matches `expect.timeout` so a flaky click and a flaky assertion fail at the same deadline.                                                                                                                                                                                                                                                                                                                                                    |
| `use.locale`                          | `'en-US'`                                                                                                                                                                            | Pins the browser locale so locale-dependent rendering (date formatting, plural rules) is deterministic.                                                                                                                                                                                                                                                                                                                                                                                                |
| `use.timezoneId`                      | `'America/New_York'`                                                                                                                                                                 | Pins the browser timezone so timestamp-rendering tests are deterministic. Picked deliberately to match the original docs build environment.                                                                                                                                                                                                                                                                                                                                                            |
| `projects[0]`                         | `{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }`                                                                                                                       | Desktop Chrome — the primary cross-section of the user base. The first project listed.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `projects[1]`                         | `{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }`                                                                                                                        | Desktop Firefox — guards against Chromium-only assumptions.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `projects[2]`                         | `{ name: 'webkit', use: { ...devices['Desktop Safari'] } }`                                                                                                                          | Desktop Safari — guards against WebKit-specific layout / API divergence.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `webServer.command` (CI)              | `'pnpm --filter @ever-works/web build && pnpm --filter @ever-works/web start'`                                                                                                       | CI builds a production bundle then starts it. `next start` is faster, deterministic, and does not run the dev-mode HMR.                                                                                                                                                                                                                                                                                                                                                                                |
| `webServer.command` (local)           | `'pnpm --filter @ever-works/web dev'`                                                                                                                                                | Local runs `next dev` for fast turnaround when a contributor is iterating on a spec against a running app.                                                                                                                                                                                                                                                                                                                                                                                              |
| `webServer.cwd`                       | `path.resolve(__dirname, '../..')`                                                                                                                                                  | Run the `pnpm --filter ...` command from the **monorepo root** so pnpm resolves the workspace alias correctly. `__dirname` is `apps/web-e2e/`, `../..` lands at the repo root.                                                                                                                                                                                                                                                                                                                          |
| `webServer.url`                       | `baseURL`                                                                                                                                                                            | The runner polls this URL and waits for the app to come up before the first test runs. Identical to the test-side `baseURL`.                                                                                                                                                                                                                                                                                                                                                                            |
| `webServer.reuseExistingServer`       | `!isCI`                                                                                                                                                                              | Local: if a `next dev` is already running on `:3000`, reuse it. CI: always start a fresh server (avoids picking up a stale process from a previous job).                                                                                                                                                                                                                                                                                                                                                |
| `webServer.timeout`                   | `isCI ? 300_000 : 120_000`                                                                                                                                                          | CI: 5-minute boot budget (cold builds need the headroom). Local: 2-minute boot budget (a `next dev` cold start is ~30s on a slow machine).                                                                                                                                                                                                                                                                                                                                                              |
| `webServer.stdout` / `webServer.stderr` | `'pipe'`                                                                                                                                                                            | Pipe the host app's stdout/stderr through the runner so the contributor sees compile errors and runtime errors inline with the test failures. Default is `'ignore'`, which would silently swallow them.                                                                                                                                                                                                                                                                                                  |

The file is **64 lines** today (counting blank lines and the
trailing newline). The configuration is dense — every line is
load-bearing. Flipping any of the per-CI-vs-local branches without
testing both paths is a prime source of CI/local divergence;
flipping any of the timeouts without measuring tail latency under
load tends to produce flakes that are genuinely hard to triage.

## The full file, annotated

```ts
// `defineConfig` is the Playwright API the runner consumes — it
// validates the schema at import time and gives the editor full
// IntelliSense over every option. `devices` is the catalogue of
// pre-canned per-project descriptors (`Desktop Chrome`,
// `Desktop Firefox`, `Desktop Safari`, plus iPhone / iPad / Pixel
// presets we deliberately do not enable today).
import { defineConfig, devices } from '@playwright/test';

// `dotenv` reads a `.env.local` file and applies its key/value
// pairs to `process.env` before the runner reads them. Loaded from
// the host app's directory so the suite sees the same env the app
// sees — single source of truth.
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

// The base URL every `request.get(...)` and `page.goto(...)` will
// resolve against. The `BASE_URL=...` override hatch lets CI /
// staging point the suite at a deployed environment without
// touching this file.
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

// CI gate. Every per-environment branch below reads this once.
const isCI = !!process.env.CI;

export default defineConfig({
  // The runner walks `apps/web-e2e/tests/**/*.spec.ts` only. Sibling
  // directories (`fixtures`, `helpers`, `page-objects`) and
  // top-level files (`global-setup.ts`, `global-teardown.ts`,
  // `playwright.config.ts`) are not tests.
  testDir: './tests',

  // Per-test artefact directory: videos, traces, screenshots. The
  // HTML reporter writes its bundle to a separate `playwright-report/`
  // directory (configured below).
  outputDir: './test-results',

  // Tests inside the same file run in parallel. Combined with
  // `workers > 1`, the runner has full freedom to interleave specs.
  fullyParallel: true,

  // CI: 2 workers (faster wall-clock at the cost of more
  // resource contention). Local: 1 worker (predictable, no
  // accidental parallel-write races against a shared dev server).
  workers: isCI ? 2 : 1,

  // CI: 2 retries (auto-recover from transient flakes). Local: 0
  // retries (the contributor sees the first failure verbatim).
  retries: isCI ? 2 : 0,

  // Reporter set is per-environment.
  //   CI: HTML report saved to `playwright-report/` and never
  //       auto-opened (no GUI on the runner). The `github` reporter
  //       attaches per-test annotations to the GitHub Actions run
  //       page. The `list` reporter prints the raw stream.
  //   Local: HTML report auto-opens only when a test fails. The
  //       `list` reporter prints the running stream.
  reporter: isCI
    ? [['html', { open: 'never', outputFolder: './playwright-report' }], ['github'], ['list']]
    : [['html', { open: 'on-failure', outputFolder: './playwright-report' }], ['list']],

  // Per-test deadline. 60s is generous enough to absorb a `next dev`
  // cold-render of a route the suite has not yet warmed.
  timeout: 60_000,

  // `expect()` deadline. 30s lets `expect(locator).toBeVisible()`
  // and friends auto-retry against a slow render without giving up
  // the moment the page hydrates.
  expect: { timeout: 30_000 },

  // Runs ONCE before any worker starts. See `global-setup.ts`.
  globalSetup: path.resolve(__dirname, './global-setup.ts'),

  // Runs ONCE after all workers finish. See `global-teardown.ts`.
  globalTeardown: path.resolve(__dirname, './global-teardown.ts'),

  use: {
    // The base URL every test inherits.
    baseURL,

    // CI: trace ONLY when a test is being retried after a first
    // failure (saves storage on the happy path). Local: always
    // retain a trace on failure so the contributor can open it
    // with `npx playwright show-trace`.
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',

    // Screenshot on every failure (and only on failure). Cheap
    // and keeps the report focused.
    screenshot: 'only-on-failure',

    // CI: record video on first retry. Local: video off (keeps
    // the watch loop fast).
    video: isCI ? 'on-first-retry' : 'off',

    // Per-`page.goto(...)` deadline. Same shape as `timeout`.
    navigationTimeout: 60_000,

    // Per-action deadline (click, fill, press). Matches
    // `expect.timeout` so a flaky click and a flaky assertion
    // fail at the same boundary.
    actionTimeout: 30_000,

    // Pinned locale. Date formatting, plural rules, and any
    // locale-dependent rendering becomes deterministic.
    locale: 'en-US',

    // Pinned timezone. Any timestamp-rendering test that happens
    // to run on a CI runner in UTC produces the same output as
    // on a contributor's machine in PT.
    timezoneId: 'America/New_York',
  },

  // Three projects — the runner replays the entire test set
  // against each one. Order matters only for the report ordering;
  // the runner schedules them in parallel.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome']  } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari']  } },
  ],

  webServer: {
    // CI: build the production bundle and start it (deterministic,
    // no HMR, faster steady-state). Local: run `next dev` for the
    // fast iteration loop.
    command: isCI
      ? 'pnpm --filter @ever-works/web build && pnpm --filter @ever-works/web start'
      : 'pnpm --filter @ever-works/web dev',

    // Run from the monorepo root so pnpm resolves
    // `--filter @ever-works/web` against the workspace registry.
    cwd: path.resolve(__dirname, '../..'),

    // The runner polls this URL and waits for the app to come up
    // before the first test runs.
    url: baseURL,

    // Local: reuse a `next dev` already running on :3000. CI:
    // always start a fresh server.
    reuseExistingServer: !isCI,

    // CI: 5-minute boot budget (cold builds). Local: 2-minute
    // boot budget (a cold `next dev` is ~30s on a slow machine).
    timeout: isCI ? 300_000 : 120_000,

    // Pipe stdout/stderr through the runner so compile and
    // runtime errors land inline with the failing test output.
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
```

## Why `dotenv.config({ path: '../web/.env.local' })`

The Playwright suite needs the same environment the host app
sees. The host app reads `apps/web/.env.local` via Next.js's
built-in env loader; the e2e suite is a separate Node process
that does not benefit from Next's loader and must call `dotenv`
explicitly.

Loading from `../web/.env.local` (not from a separate
`apps/web-e2e/.env.local`) is intentional:

| Reason | Detail |
| ------ | ------ |
| Single source of truth | The contributor sets `DATABASE_URL`, `AUTH_SECRET`, `BASE_URL`, etc once in `apps/web/.env.local` and both the app and the suite read it. |
| Drift impossibility | A second `.env.local` file would inevitably go out of sync. The cross-app reach guarantees the suite cannot be tested against a different env from the one the app boots with. |
| Contributor cost | New contributors copy `.env.example` to `apps/web/.env.local` once and the suite is ready to run. |
| Mirror behaviour with the `webServer` | The `webServer.command` runs the host app from the workspace root, which means Next reads `apps/web/.env.local` for the booted server too. Same env both sides. |

The trade-off is that a contributor who wants to override env
vars **only for the e2e suite** has to set them in the shell
before invoking `pnpm test:e2e` (e.g. `BASE_URL=...
pnpm test:e2e`). That edge case is rare enough that the
single-source-of-truth posture wins.

## Why `BASE_URL` is the only env-var override surface

`baseURL` is the single field that reads from
`process.env.BASE_URL`. Every other field is a constant. The
choice is deliberate:

- **CI / staging targeting.** A contributor running the suite
  against a deployed preview environment exports `BASE_URL=...`
  and the suite runs as if the app were local.
- **Multi-environment matrix.** A future "run the suite against
  prod-shadow" job in CI sets `BASE_URL=https://shadow.example.com`
  and reuses the same spec set.
- **Locked posture for everything else.** Timeouts, retries, the
  reporter set, the project list, the `use`-block, the
  `webServer` block all live in the file. The contributor cannot
  accidentally degrade the suite by exporting a wrong env var.

If a future contributor wants to widen the surface, the right
move is to add a dedicated config field (e.g. `workers` derived
from `process.env.PLAYWRIGHT_WORKERS`), not to read a fresh env
var inline. The discipline keeps the configuration explicit and
auditable.

## Why the per-CI-vs-local branches

The five `isCI ? X : Y` branches (`workers`, `retries`,
`reporter`, `use.trace`, `use.video`, `webServer.command`,
`webServer.reuseExistingServer`, `webServer.timeout`) all encode
the same trade-off: **CI optimises for throughput and reliability;
local optimises for fast iteration and clear failure signals**.

| Field | CI posture | Local posture | Rationale |
| ----- | ---------- | ------------- | --------- |
| `workers` | `2` | `1` | CI parallelises within the runner job; local serialises so the contributor sees ordered output. |
| `retries` | `2` | `0` | CI auto-recovers from transient flakes; local surfaces the first failure verbatim. |
| `reporter` | `html` (no auto-open) + `github` + `list` | `html` (auto-open on failure) + `list` | CI must not try to open a browser; local should open the report when the contributor needs it. |
| `use.trace` | `on-first-retry` | `retain-on-failure` | CI saves trace storage on the happy path; local always retains so `npx playwright show-trace` just works. |
| `use.video` | `on-first-retry` | `off` | CI records video on flakes; local skips for speed. |
| `webServer.command` | `build && start` | `dev` | CI uses the production bundle (deterministic, faster steady-state); local uses HMR (fast iteration). |
| `webServer.reuseExistingServer` | `false` | `true` | CI always boots a fresh server; local reuses a running `next dev`. |
| `webServer.timeout` | `300_000` | `120_000` | CI absorbs cold-build time; local trusts that `next dev` has already warmed. |

Restating these branches inline in every spec would be a
maintenance disaster. The runner reads them once at startup and
applies them to every test.

## Why the three browser projects

The suite runs against Chromium, Firefox, and WebKit because
real users browse on all three engines. The trade-offs:

| Project | Cost | Benefit |
| ------- | ---- | ------- |
| Chromium | Cheapest — fast install, fast launch | Catches the largest cross-section of the user base. The first project listed; the only one CI runs in the `chromium`-only filter (`pnpm test:e2e:chromium`). |
| Firefox | Modest — slower launch, slightly larger driver | Catches Gecko-specific bugs (CSS layout differences, missing `Intl` data, different cookie semantics). |
| WebKit | Highest — Safari's `Webkit` engine has the slowest launch and the most platform divergence | Catches Safari-only bugs that would otherwise slip past until a real user filed an issue. Especially valuable for Stripe Apple Pay, IDN URLs, and Safari's stricter cookie / SameSite enforcement. |

The trade-off is that running all three projects triples the
worker time. The CI matrix today runs all three; a future cost
optimisation could split them across separate jobs (one project
per job, three jobs in parallel).

## Why `webServer.cwd` is the monorepo root

The `pnpm --filter @ever-works/web ...` commands resolve the
`@ever-works/web` package against the workspace registry, which
lives at the monorepo root in `pnpm-workspace.yaml`. Running the
command from any other directory either:

- fails outright (`pnpm` cannot find the workspace anchor), or
- resolves the filter against a sub-tree workspace (e.g. an
  `apps/web/pnpm-workspace.yaml` if one ever existed), producing
  unexpected behaviour.

The explicit `path.resolve(__dirname, '../..')` lands at the
monorepo root regardless of where the runner is invoked from
(repo root, `apps/web-e2e/`, an IDE's "Run Test" button), so the
behaviour is uniform.

## Why `stdout: 'pipe'` and `stderr: 'pipe'`

Default Playwright behaviour is `stdout: 'ignore'`, which silently
swallows everything the host app prints. That is the single
biggest cause of "the e2e suite is failing but I cannot tell why"
incidents — a Next.js compile error or a runtime panic prints to
stderr, the runner ignores it, and the failing test reports a
generic timeout.

Piping both streams through the runner attaches the host app's
output to the test report, so a compile error surfaces inline with
the first failing spec. The cost is some additional log volume in
the report; the benefit is that every failure is self-diagnosing.

## Failure matrix

The matrix below pins each load-bearing piece of the file to a
concrete user-visible failure that would surface if the piece were
flipped or removed.

| Change                                                                | What breaks                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Drop `dotenv.config(...)`                                              | The suite stops seeing `DATABASE_URL`, `AUTH_SECRET`, etc; specs that touch the database start failing with cryptic 500s; the `webServer` boots without env so the host app fails its own env validation.                                                                       |
| Change the dotenv path to a separate `apps/web-e2e/.env.local`         | Two sources of truth; the suite drifts from the booted server's env; flakes appear in CI when the two files disagree.                                                                                                                                                          |
| Drop `BASE_URL` fallback                                               | Tests fail to connect to the booted server; CI can no longer target a deployed preview without the file change.                                                                                                                                                                |
| Set `fullyParallel: false`                                              | Tests in the same file serialise; total wall-clock time on a 30-spec file roughly triples.                                                                                                                                                                                     |
| Bump `workers` past 2 on CI                                            | Resource contention against the booted server; flake rate climbs as the dev server's compile cache thrashes.                                                                                                                                                                  |
| Drop `retries` on CI                                                    | A 1% per-spec flake rate becomes a 60%+ "at least one spec failed" rate across a 50-spec suite — the suite becomes effectively un-mergeable.                                                                                                                                  |
| Drop the `github` reporter on CI                                       | Failing specs no longer annotate the GitHub Actions run page inline; contributors must dig into the HTML report to find the failure.                                                                                                                                            |
| Drop the `html` reporter                                               | The report artifact is gone; CI flakes become unreproducible because the trace / screenshot / video links live in the HTML report.                                                                                                                                              |
| Set `reporter: [['html', { open: 'always' }]]` on CI                   | The CI runner tries to launch a browser to open the report; jobs hang or fail with a "no display" error.                                                                                                                                                                       |
| Bump `timeout` to `30_000`                                              | A `next dev` cold-render of a never-visited route hits the deadline; the spec fails with a timeout that has nothing to do with the assertion.                                                                                                                                  |
| Drop `globalSetup`                                                      | Per-run setup never runs; specs that depend on seeded state fail erratically.                                                                                                                                                                                                  |
| Set `use.trace: 'off'` on CI                                            | A flake-only-on-CI bug becomes un-diagnosable; the contributor sees `Test timeout 60000ms exceeded` with no further information.                                                                                                                                              |
| Set `use.locale: 'en-GB'`                                               | A spec that asserts on `en-US`-formatted dates ("12/25/2026") breaks because the browser now renders "25/12/2026".                                                                                                                                                              |
| Set `use.timezoneId: 'UTC'`                                             | A spec that asserts on rendered timestamps in `America/New_York` breaks because the renders shift by 4–5 hours.                                                                                                                                                                |
| Drop a project (e.g. `webkit`)                                          | Browser-specific regressions in that engine slip past CI until a real user files an issue.                                                                                                                                                                                      |
| Add an iPhone project without a CI matrix bump                         | Wall-clock time grows by 33%; the suite becomes the long pole on every PR.                                                                                                                                                                                                     |
| Set `webServer.command: 'next start'` (without the `build` step) on CI  | CI fails on the first run after a clean checkout because `.next/` does not exist.                                                                                                                                                                                              |
| Set `webServer.cwd: __dirname`                                          | `pnpm --filter @ever-works/web` cannot find the workspace anchor; the server fails to boot with `ERR_PNPM_NO_WORKSPACE_FOUND`.                                                                                                                                                  |
| Drop `webServer.reuseExistingServer: true` on local                    | Every `pnpm test:e2e` invocation tries to start a fresh `next dev` and fails with `EADDRINUSE` if the contributor already has one running.                                                                                                                                       |
| Drop `webServer.stdout: 'pipe'`                                        | Host-app compile errors and runtime panics go silent; specs fail with cryptic timeouts.                                                                                                                                                                                        |

## Per-line walkthrough

The annotated file in [The full file, annotated](#the-full-file-annotated)
is reproduced below with one row per load-bearing block and the
documentation impact of each.

| Line / block                                                                  | Documentation impact                                                                                                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `import { defineConfig, devices } from '@playwright/test'`                     | Pinned by the e2e package's `@playwright/test` dep range; update [`e2e-tsconfig.md`](./e2e-tsconfig.md) cross-link only on a major bump. |
| `dotenv.config({ path: '../web/.env.local' })`                                 | Update this page if the env file location ever moves.                                                                                  |
| `const baseURL = process.env.BASE_URL ?? 'http://localhost:3000'`              | Update this page **and** the `webServer.url` cross-reference if the default port ever changes.                                         |
| `const isCI = !!process.env.CI`                                                 | Permanent; every per-environment branch reads it.                                                                                       |
| `testDir: './tests'`                                                           | Update this page if the test root moves (rare).                                                                                        |
| `outputDir: './test-results'`                                                  | Update this page if the artefact dir moves.                                                                                           |
| `fullyParallel: true`                                                          | Permanent under the current performance budget.                                                                                       |
| `workers: isCI ? 2 : 1`                                                        | Update this page if the CI worker count changes; cross-check against the CI runner's resource budget.                                  |
| `retries: isCI ? 2 : 0`                                                        | Update this page if the retry count changes; cross-check against [Constitution Article IX — Test Coverage Bar](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md). |
| `reporter` block                                                                | Update this page on every reporter change. CI must not auto-open.                                                                     |
| `timeout: 60_000`                                                              | Update this page if per-test deadline changes; cross-check against tail-latency measurements.                                         |
| `expect: { timeout: 30_000 }`                                                   | Update this page if `expect()` deadline changes.                                                                                      |
| `globalSetup` / `globalTeardown` paths                                          | Update this page if those files move; cross-check against [`e2e-tsconfig.md`](./e2e-tsconfig.md) include glob.                        |
| `use.baseURL`                                                                   | Inherited from top-level `baseURL`. Update both together.                                                                              |
| `use.trace`                                                                     | Update this page if the per-environment trace mode changes.                                                                           |
| `use.screenshot`                                                                | Update this page if the screenshot mode changes.                                                                                      |
| `use.video`                                                                     | Update this page if the per-environment video mode changes.                                                                           |
| `use.navigationTimeout` / `use.actionTimeout`                                    | Update this page on every change; cross-check against `timeout` and `expect.timeout`.                                                 |
| `use.locale` / `use.timezoneId`                                                 | Update this page on every change; specs that assert on locale-formatted output break silently otherwise.                              |
| `projects[*]`                                                                   | Update this page on every project add / remove; cross-check against the CI matrix.                                                    |
| `webServer.command`                                                              | Update this page on every command change; cross-check against `apps/web/package.json#scripts` and the `pnpm-workspace.yaml` anchor.    |
| `webServer.cwd`                                                                  | Permanent — the monorepo root anchor.                                                                                                  |
| `webServer.url`                                                                  | Inherits from `baseURL`; update both together.                                                                                         |
| `webServer.reuseExistingServer`                                                  | Permanent under the current iteration loop.                                                                                            |
| `webServer.timeout`                                                              | Update this page if cold-build time changes materially.                                                                                |
| `webServer.stdout` / `webServer.stderr`                                          | Permanent; the explicit `'pipe'` is what makes failures self-diagnosing.                                                                |

## `playwright.config.ts` change checklist

When a contributor changes
[`apps/web-e2e/playwright.config.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/playwright.config.ts):

1. Update **this** page (`playwright-config.md`) in the same change.
2. Cross-check [`e2e-tsconfig.md`](./e2e-tsconfig.md) — if `globalSetup`,
   `globalTeardown`, or new top-level files moved, the include glob
   may need to follow.
3. Run `pnpm tsc --noEmit` from the e2e suite to catch any
   `defineConfig`-schema violations at type-check time.
4. Run a smoke subset of the suite locally
   (`pnpm test:e2e:chromium -- --grep '@smoke'`) to confirm the
   `webServer` still boots.
5. If the change touches a per-CI-vs-local branch, run the suite
   in both modes — locally with `CI` unset, and locally with
   `CI=true` set — and compare the run output.
6. Justify the change in [`docs/log.md`](../log.md) so the next
   reviewer knows why the runner posture moved.
7. Pair the change with a [Spec 010](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
   cross-link if it is part of an e2e-coverage migration.
8. Reviewer pass: confirm the doc and the file say the same thing,
   line for line.

## Cross-references

- [E2E TypeScript Configuration](./e2e-tsconfig.md) — the
  per-source-file reference for the suite's `tsconfig.json`.
- [Web App TypeScript Configuration](./web-app-tsconfig.md) — the
  per-source-file reference for the host web app's `tsconfig.json`,
  which the `webServer` block boots.
- [Workspace Root Manifest](./workspace-root-manifest.md) — the
  root `package.json` that pins `@playwright/test` (transitively
  via `apps/web-e2e/package.json`) and the workspace anchor the
  `webServer.cwd` resolves against.
- [Turborepo Pipeline Configuration](./turbo-config.md) — the
  `test:e2e` task that ultimately drives this config.
- [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion)
  — the spec that established the e2e suite's workspace boundary.
- [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  — the spec that owns the e2e suite's coverage commitments.
- [Constitution Article IX — Test Coverage Bar](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
  — the durable principle that mandates the e2e suite be the
  authoritative coverage signal.
- [Playwright Best Practices skill](https://github.com/ever-works/directory-web-template/tree/develop/.claude/skills/playwright-best-practices) —
  the cross-cutting reference that informs the runner posture.
