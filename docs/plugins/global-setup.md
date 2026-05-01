---
id: global-setup
title: Playwright Global Setup (`apps/web-e2e/global-setup.ts`)
sidebar_label: Global setup
sidebar_position: 31
---

# Playwright Global Setup (`apps/web-e2e/global-setup.ts`)

> **Status.** Authoritative reference for the Playwright e2e
> suite's per-run global setup defined in
> [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
> and elaborated by
> [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion).
> The setup is locked by
> [`apps/web-e2e/global-setup.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/global-setup.ts),
> which validates the required environment variable set, mints the
> two persisted authentication storage states (`auth-states/admin.json`
> and `auth-states/client.json`) by driving a real Chromium browser
> against the host web app's `/auth/signin` and `/auth/register`
> screens, and writes them to disk so authenticated test files can
> reuse them without paying the per-test sign-in / sign-up cost.
> When any of those steps move, update **this** page in the same
> change so the doc and the file cannot drift.

`apps/web-e2e/global-setup.ts` is the **per-suite global setup
hook** that the Playwright CLI
([`@playwright/test`](https://playwright.dev/docs/api/class-test))
calls exactly once before the first test in any run, regardless of
the number of files, projects, or workers. It pairs with
[`apps/web-e2e/global-teardown.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/global-teardown.ts)
(currently a no-op placeholder reserved for future cleanup work)
and is wired into the runner by the `globalSetup` /
`globalTeardown` fields of
[`apps/web-e2e/playwright.config.ts`](./playwright-config.md). The
config locks the runtime boundary; this file locks the
**pre-flight boundary** that every test relies on.

This page is the **per-source-file reference** that pairs with
[`apps/web-e2e/global-setup.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/global-setup.ts)
the same way
[`playwright-config.md`](./playwright-config.md) pairs with
`apps/web-e2e/playwright.config.ts`,
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
[`playwright-config.md`](./playwright-config.md) documents the
**suite's runtime boundary** (which directory the runner walks,
how many workers, which browsers, the `use`-defaults, the
`webServer` block), this page documents the **suite's pre-flight
boundary** — what the runner does once before the first test, in
what order, with what failure modes.

## At a glance

| Step                                       | What happens                                                                                                                                                                                                                          | Why it matters                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `promptForMissingEnv()` first              | Walks `REQUIRED_ENV_VARS` (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`) and either throws on `process.env.CI` or prompts the contributor on a TTY                                                                                       | The two seeded admin credentials are the only secrets the suite cannot derive — they are the row in the seeded database the admin sign-in flow targets. Failing fast with a clear error beats a cryptic `locator('#email').fill(undefined)` 30 seconds into the run.                                                                                                                                                                                                          |
| Resolve `baseURL` from `config.projects[0]` | Reads the first project's `use.baseURL` (set by `playwright.config.ts` to `process.env.BASE_URL ?? 'http://localhost:3000'`), with a literal `'http://localhost:3000'` fallback                                                       | The setup runs **before** any project-level `use`-defaults are merged — `config.projects[0]?.use?.baseURL` is the only path to the resolved URL. The fallback prevents a `TypeError: Cannot read properties of undefined` if a future config refactor drops the `baseURL` field.                                                                                                                                                                                              |
| `mkdir auth-states/`                       | Creates `apps/web-e2e/auth-states/` if missing (recursive)                                                                                                                                                                            | Playwright's `storageState({ path })` does **not** auto-create the parent directory; calling `chromium.launch()` and only later finding out the path is unwriteable wastes a Chromium boot.                                                                                                                                                                                                                                                                                  |
| `chromium.launch()` once                   | Boots one headless Chromium browser shared by both auth flows                                                                                                                                                                         | Two separate browsers would double the boot cost and the memory footprint. The two `BrowserContext` instances inside one browser are independent and cannot leak cookies between flows.                                                                                                                                                                                                                                                                                       |
| Admin sign-in flow                         | New context → `/auth/signin` → `#email` / `#password` → click "Sign in" → wait for `/admin` or `/client/dashboard` → `storageState({ path: 'auth-states/admin.json' })`                                                                | The admin context is the **only** one that can drive `/admin/**` test files — every admin page-object reuses this storage state via `test.use({ storageState })`.                                                                                                                                                                                                                                                                                                              |
| Client sign-up flow                        | New context → `/auth/register` → `#name` / `#email` / `#password` → press Enter on `#password` → wait for `/client/dashboard` → `storageState({ path: 'auth-states/client.json' })`                                                    | The client context is freshly registered every run via `TEST_DATA.generateClientEmail()`. This guarantees uniqueness against the seeded DB without needing a per-run cleanup step.                                                                                                                                                                                                                                                                                            |
| Single `browser.close()`                   | Both flows share one browser; close only after both contexts are persisted                                                                                                                                                            | Closing the browser inside a `try / finally` would run before the second context is closed. The current shape closes contexts → closes browser → returns. On any exception the `catch` block closes the browser and rethrows.                                                                                                                                                                                                                                                  |
| `console.log` per success                  | `[global-setup] Admin auth state saved` / `[global-setup] Client auth state saved`                                                                                                                                                    | Lets a contributor or CI log reader confirm both flows finished without scrolling the per-test report. Both lines are prefixed with `[global-setup]` so a `grep` against the run log filters them in one step.                                                                                                                                                                                                                                                                |

## The full file, annotated

```ts
import { chromium, type FullConfig } from '@playwright/test';
import { createInterface } from 'readline/promises';
import path from 'path';
import fs from 'fs';
import {
	TEST_DATA,
	ADMIN_STATE_FILE,
	CLIENT_STATE_FILE,
	AUTH_STATE_DIR,
	REQUIRED_ENV_VARS,
} from './helpers/test-data';
```

The imports lock four boundaries:

1. `@playwright/test` — `chromium` is the headless browser the
   setup drives; `FullConfig` is the type that `playwright.config.ts`
   passes in.
2. `readline/promises` — Node's promise-based stdin reader. Used
   only on a TTY when a required env var is missing locally.
3. `path` / `fs` — used to compute the absolute path of
   `auth-states/admin.json` / `auth-states/client.json` and to
   create the directory if it does not exist. The relative-path
   constants (`ADMIN_STATE_FILE`, `CLIENT_STATE_FILE`,
   `AUTH_STATE_DIR`) live in
   [`apps/web-e2e/helpers/test-data.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/helpers/test-data.ts)
   so a future refactor that moves the storage location updates one
   file, not three.
4. `./helpers/test-data` — the single source of truth for
   `TEST_DATA` (admin credentials, client password, the per-run
   client-email generator) and `REQUIRED_ENV_VARS`
   (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`). Anything the setup
   reads from the environment or hard-codes lives in that file so
   the spec set never drifts from the runner.

```ts
async function promptForMissingEnv(): Promise<void> {
	const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
	if (missing.length === 0) return;

	if (process.env.CI) {
		throw new Error(`Missing required environment variables in CI: ${missing.join(', ')}`);
	}

	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		for (const name of missing) {
			const answer = await rl.question(`[global-setup] Enter ${name}: `);
			if (!answer.trim()) {
				throw new Error(`${name} cannot be empty`);
			}
			process.env[name] = answer.trim();
		}
	} finally {
		rl.close();
	}
}
```

The pre-flight env-var prompt is the **only** time the suite is
allowed to be interactive. Three branches matter:

- All required vars present → returns immediately. CI hits this
  path because the workflow injects the secrets before the runner
  starts.
- Missing vars on `process.env.CI` → throws. CI must never block
  on stdin; the workflow's no-TTY environment would otherwise hang.
- Missing vars on a TTY → prompts the contributor for each missing
  var, refuses empty answers, and assigns the trimmed value back
  to `process.env`. The `try / finally` guarantees `rl.close()`
  runs even on a thrown empty-answer.

The function uses `readline/promises` (not the callback-based
classic `readline`) so the loop stays in `async / await` shape and
the contributor sees one prompt at a time.

```ts
async function globalSetup(config: FullConfig) {
	await promptForMissingEnv();

	const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';
```

The `globalSetup` function signature is fixed by Playwright. The
runner passes the resolved `FullConfig` (the merged result of the
`playwright.config.ts` defaults plus any CLI overrides). Reading
`config.projects[0]?.use?.baseURL` is the canonical way to get
the resolved `baseURL` because the project-level `use`-defaults
are the only place the runner actually fans `BASE_URL` out to.

The `?? 'http://localhost:3000'` fallback is defensive — if a
future config refactor drops the `baseURL` field on every project,
the setup still has a sensible default to fall back to. Without
the fallback, `chromium.newPage().goto(undefined)` would fail with
a cryptic `TypeError`.

```ts
	const authStatesDir = path.resolve(__dirname, AUTH_STATE_DIR);
	if (!fs.existsSync(authStatesDir)) {
		fs.mkdirSync(authStatesDir, { recursive: true });
	}

	const adminStatePath = path.resolve(__dirname, ADMIN_STATE_FILE);
	const clientStatePath = path.resolve(__dirname, CLIENT_STATE_FILE);
```

The setup resolves three absolute paths against the module's own
directory:

- `auth-states/` — created with `recursive: true` if missing. The
  `fs.existsSync` short-circuit avoids touching the filesystem on
  the common case where the directory already exists.
- `auth-states/admin.json` — the admin storage state target.
- `auth-states/client.json` — the client storage state target.

Anchoring against `__dirname` (not against `process.cwd()`) means
the suite resolves the same paths regardless of which working
directory the contributor invoked `pnpm test:e2e` from. This is
load-bearing because `playwright.config.ts` sets
`webServer.cwd: '../..'` (the monorepo root), so the runner's
process is rooted at the workspace, not at `apps/web-e2e/`.

```ts
	const browser = await chromium.launch();
```

A single Chromium browser is shared by both auth flows. Two
separate browsers would double the boot cost (each launch is
~500 ms) and the memory footprint (~150 MB per instance).
`chromium.launch()` returns a fresh, isolated instance — even if
the contributor's local Chrome is running, it does not interact
with this one.

```ts
	// Generate admin auth state
	try {
		const adminContext = await browser.newContext();
		const adminPage = await adminContext.newPage();

		await adminPage.goto(`${baseURL}/auth/signin`, { timeout: 60_000 });
		await adminPage.locator('#email').fill(TEST_DATA.ADMIN_EMAIL);
		await adminPage.locator('#password').fill(TEST_DATA.ADMIN_PASSWORD);
		await adminPage.getByRole('button', { name: /sign in/i }).click();
		await adminPage.waitForURL(/\/(admin|client\/dashboard)/, { timeout: 60_000 });

		await adminContext.storageState({ path: adminStatePath });
		await adminPage.close();
		await adminContext.close();
		console.log('[global-setup] Admin auth state saved');
	} catch (error) {
		await browser.close();
		throw new Error(`[global-setup] Failed to create admin auth state: ${error}`);
	}
```

The admin sign-in flow runs first because the seeded admin row
must exist in the database before any `/admin/**` test can run —
hitting `/auth/signin` with `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` is the canonical "is the seeded admin
present?" smoke check the rest of the suite implicitly depends on.

Six load-bearing steps:

1. `browser.newContext()` — fresh cookie jar, fresh storage. Two
   contexts inside one browser cannot share session cookies.
2. `goto('/auth/signin')` with a 60-second timeout — the host app
   may be cold-rendering on first hit, so the timeout matches the
   per-test `navigationTimeout` from `playwright.config.ts`.
3. `locator('#email').fill(...)` / `locator('#password').fill(...)`
   — the sign-in form's input IDs are stable. If the form ever
   migrates away from `#email` / `#password`, this is the first
   place that breaks (and the failure surfaces here, not in
   thirty downstream admin specs).
4. `getByRole('button', { name: /sign in/i }).click()` — semantic
   selector against the submit button. Tolerates label changes
   ("Sign in", "Sign In", "Sign in →") thanks to the
   case-insensitive regex.
5. `waitForURL(/\/(admin|client\/dashboard)/)` — the sign-in flow
   redirects admins to `/admin/dashboard` and clients to
   `/client/dashboard`. Either is a success signal; the regex
   accepts both because the seeded admin row's role determines
   which path the redirect picks.
6. `storageState({ path: adminStatePath })` — serialises the cookies
   and `localStorage` into a JSON file on disk. Subsequent admin
   tests load this file via `test.use({ storageState })` and skip
   the sign-in flow entirely.

The `try / catch` ensures any failure (timeout, missing form
element, wrong credentials) closes the browser before rethrowing.
Without the explicit `await browser.close()` the Chromium process
would linger in the background and trip the next test run's port
reservation.

```ts
	// Generate client auth state
	try {
		const clientContext = await browser.newContext();
		const clientPage = await clientContext.newPage();

		const clientEmail = TEST_DATA.generateClientEmail();
		await clientPage.goto(`${baseURL}/auth/register`, { timeout: 60_000 });
		await clientPage.locator('#name').fill('E2E Test Client');
		await clientPage.locator('#email').fill(clientEmail);
		await clientPage.locator('#password').fill(TEST_DATA.CLIENT_PASSWORD);
		await clientPage.locator('#password').press('Enter');
		await clientPage.waitForURL(/\/client\/dashboard/, { timeout: 120_000, waitUntil: 'domcontentloaded' });

		await clientContext.storageState({ path: clientStatePath });
		await clientPage.close();
		await clientContext.close();
		console.log('[global-setup] Client auth state saved');
	} catch (error) {
		await browser.close();
		throw new Error(`[global-setup] Failed to create client auth state: ${error}`);
	}
```

The client sign-up flow registers a brand-new client per run.
Three structural differences from the admin flow:

- `TEST_DATA.generateClientEmail()` returns
  `e2e-client-${Date.now()}-${randomSuffix}@test.local`, so two
  parallel CI workers cannot collide on the same email. The
  `@test.local` TLD prevents accidental real-world delivery if a
  future change starts emailing on registration.
- `press('Enter')` instead of clicking a button. The register form
  submits on Enter; using the keyboard event matches what a real
  contributor would do and avoids depending on the button's text
  (which the i18n catalogue may localise).
- `waitForURL` uses a 120-second timeout with `waitUntil:
  'domcontentloaded'`. The post-registration redirect creates the
  client's row, may run a welcome-email job, and may ping
  analytics — letting the runner unblock on `domcontentloaded`
  (instead of the default `load`) avoids waiting for slow trackers.

```ts
	await browser.close();
}

export default globalSetup;
```

The single `browser.close()` outside both `try / catch` blocks
runs only on the happy path. Both `catch` blocks have already
closed the browser before rethrowing, so this final close is
unreachable on failure and simply a no-op cost on success.

The default export is fixed by Playwright — `globalSetup` in
`playwright.config.ts` accepts the path to a module whose default
export is the setup function.

## Why `promptForMissingEnv` is the first call

The function runs before the browser launches and before any path
is resolved. Two regressions it forecloses:

- A contributor who forgot to set `SEED_ADMIN_EMAIL` would
  otherwise see Playwright spin up Chromium, navigate to
  `/auth/signin`, and fail with `locator('#email').fill(undefined)`
  ~30 seconds into the run. Failing fast with a clear "Set it in
  .env.local" error saves the contributor 30 seconds and leaves a
  clear next step.
- A CI run with the secret accidentally unset would hang on stdin
  forever. The `process.env.CI` short-circuit forces a thrown
  error in that case so the workflow surfaces the missing secret
  in the run summary.

## Why one Chromium, two contexts

Two `BrowserContext` instances inside one browser cost only the
context-creation overhead (~50 ms each). Two `chromium.launch()`
calls would cost ~500 ms each plus the persistent memory of two
Chromium processes. The two contexts are still fully isolated
from each other — no cookie, `localStorage`, or service worker
crosses the boundary.

## Why `storageState({ path })` instead of cookies-only

`storageState` captures both cookies (the NextAuth session token)
and `localStorage` (any client-side preferences set by the host
app's auth callback). Persisting only the cookie would lose any
post-sign-in client-side state, and tests that rely on the
hydrated layout (sidebar collapse state, theme preference, etc)
would re-render with the unauthenticated default.

## Why the admin flow accepts both `/admin` and `/client/dashboard`

The seeded admin's redirect destination depends on the role
column in the database. A future seed change that demotes the
seeded admin from `admin` to `client` would still see the redirect
land on `/client/dashboard` — accepting both keeps the setup
robust against that demotion. If a future spec needs to confirm
the user is **specifically** an admin, that assertion belongs in
the admin-only test files, not in the global setup.

## Why the client flow uses `domcontentloaded` instead of `load`

The post-registration redirect creates a client row, may queue a
welcome-email job, and may ping the analytics layer. `load`
waits for every sub-resource (analytics pixels, fonts, images)
before resolving — `domcontentloaded` waits only for the HTML
document and the React app's initial render. The client storage
state is captured the moment the new page is fully hydrated,
which is what `domcontentloaded` represents for a Next.js app.

## Why the `auth-states/` directory is per-suite, not per-worker

Playwright workers share the global setup's output by design.
Both auth states are written once and read by every subsequent
worker via `test.use({ storageState: 'auth-states/admin.json' })`.
Per-worker auth states would force the setup to drive Chromium N
times in parallel, multiplying the cost without buying isolation
the suite does not need (every worker drives a fresh
`BrowserContext` from the persisted state, so cookie pollution
between workers is impossible).

## Failure matrix

| Mistake                                                           | What surfaces                                                                                          | Why                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drop `promptForMissingEnv()`                                      | Cryptic `locator('#email').fill(undefined)` 30 s into the run                                         | The seed-admin secrets are the only suite secrets that cannot be derived. Dropping the prompt removes the only fail-fast path.                                                                                                                                                                                                                                  |
| Drop the `process.env.CI` branch from `promptForMissingEnv()`     | CI hangs forever on stdin                                                                              | `readline.question(...)` blocks on a no-TTY environment. The CI branch turns the hang into a clear error.                                                                                                                                                                                                                                                          |
| Drop the `''` empty-answer guard                                  | Silent failure later: `locator('#email').fill('')` succeeds, sign-in fails ambiguously                 | An empty admin email is never a valid value; rejecting it at the prompt converts a downstream timeout into an immediate error.                                                                                                                                                                                                                                   |
| Hard-code `baseURL = 'http://localhost:3000'`                     | `BASE_URL=...` env override stops working                                                              | The setup must respect the same `baseURL` resolution `playwright.config.ts` performs. Reading `config.projects[0]?.use?.baseURL` is the only way to honour both the env override and the config-level fallback.                                                                                                                                                  |
| Drop the `?? 'http://localhost:3000'` fallback                    | `goto(undefined)` `TypeError` on a malformed config                                                    | Defensive — if a future refactor drops the project-level `baseURL`, the setup still falls back to the local default.                                                                                                                                                                                                                                            |
| Drop `mkdir auth-states/`                                         | `storageState({ path })` throws `ENOENT`                                                               | Playwright does not auto-create parent directories. The recursive `mkdirSync` ensures both nested levels exist.                                                                                                                                                                                                                                                  |
| Use `process.cwd()` instead of `__dirname`                        | Paths break when `pnpm test:e2e` is invoked from a different working directory                          | `webServer.cwd: '../..'` already moves the runner's process root to the monorepo root. `__dirname` always resolves against the module's own directory, which is the only stable anchor.                                                                                                                                                                          |
| Two `chromium.launch()` calls                                     | Per-run wall-clock grows by ~500 ms; memory doubles                                                    | One browser with two contexts is fully isolated and dramatically cheaper.                                                                                                                                                                                                                                                                                       |
| Drop `try / catch` around either auth flow                        | Chromium process leaks on failure                                                                      | Without the explicit `browser.close()` in the `catch`, a thrown timeout leaves Chromium running — the next test run trips on the leaked Chromium debugging port.                                                                                                                                                                                                |
| Hard-code the admin email                                         | Suite stops working as soon as the seed file rotates                                                    | `TEST_DATA.ADMIN_EMAIL` reads from the env so the same suite works against any seed.                                                                                                                                                                                                                                                                             |
| Hard-code the client email                                        | Two parallel CI workers collide on the same email                                                      | `TEST_DATA.generateClientEmail()` injects `Date.now()` plus a random suffix to guarantee uniqueness.                                                                                                                                                                                                                                                            |
| Use a real-world TLD on the client email                          | Risk of accidental real-world delivery if a future change starts emailing on registration              | `@test.local` is RFC-2606-style — guaranteed not to resolve.                                                                                                                                                                                                                                                                                                     |
| Use `.click()` instead of `press('Enter')` on the register form    | Failure if the button label localises away from `/sign up/i`                                            | The register form submits on Enter; the keyboard event matches the contributor's path and avoids any button-text dependency.                                                                                                                                                                                                                                    |
| Use `waitUntil: 'load'` on the client redirect                    | Wall-clock blows up when analytics pixels or fonts are slow                                            | `domcontentloaded` waits only for the HTML and React's initial render; the auth state is captured the moment the new page is hydrated.                                                                                                                                                                                                                          |
| Use a 30-second client-redirect timeout instead of 120 seconds     | Cold-render flakes on CI                                                                               | The client registration may queue a welcome-email job and ping the analytics layer; 120 seconds gives the cold path slack without masking real hangs (60 seconds is enough for the warm path, but the suite tolerates the slowest of the two paths).                                                                                                            |
| Drop `storageState({ path })`                                     | Every authenticated test re-runs the sign-in / sign-up flow                                            | Persisting the storage state once amortises ~30 seconds of work across every authenticated test in the suite.                                                                                                                                                                                                                                                   |
| Tighten the admin redirect regex to `/admin` only                 | Suite stops working if the seeded admin is demoted                                                     | The seeded admin's role decides the redirect destination; accepting both `/admin` and `/client/dashboard` keeps the setup robust against role flips.                                                                                                                                                                                                            |
| Loosen the admin redirect regex to `/`                            | Setup succeeds even when sign-in fails (the page is still on `/auth/signin`)                           | The regex must require a post-redirect URL distinct from the sign-in screen.                                                                                                                                                                                                                                                                                     |
| Remove the per-success `console.log`                              | CI log is silent on the success path; failure is harder to diagnose                                    | The two `[global-setup]` lines are the only signal a contributor sees that both flows finished — without them, the only signal is the absence of a thrown error.                                                                                                                                                                                                |
| Drop `AUTH_STATE_DIR` / `ADMIN_STATE_FILE` / `CLIENT_STATE_FILE` constants | Path drift between `global-setup.ts` and the test files that load the state                            | Centralising the constants in `helpers/test-data.ts` keeps the spec set's source of truth in one file.                                                                                                                                                                                                                                                          |

## Per-line walkthrough

| Line                                                              | What it locks                                                                                                                                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import { chromium, type FullConfig } from '@playwright/test';`   | The browser engine and the config type the runner passes in.                                                                                                                        |
| `import { createInterface } from 'readline/promises';`            | The promise-based stdin reader used only on a TTY.                                                                                                                                  |
| `import path from 'path'; import fs from 'fs';`                    | Node's path / filesystem APIs for resolving and creating the storage-state directory.                                                                                              |
| `import { TEST_DATA, ... } from './helpers/test-data';`            | The single source of truth for credentials, the per-run client-email generator, and the persisted-state path constants.                                                            |
| `function requireEnv(name)` (inside `helpers/test-data.ts`)       | Throws on missing env vars; consumed by the lazy `ADMIN_EMAIL` / `ADMIN_PASSWORD` getters.                                                                                          |
| `if (process.env.CI) throw ...`                                    | The CI-must-not-prompt branch.                                                                                                                                                      |
| `const rl = createInterface(...)` + `rl.close()` in `finally`     | The TTY-only prompt loop with a guaranteed close.                                                                                                                                    |
| `const baseURL = config.projects[0]?.use?.baseURL ?? '...'`        | The resolved `baseURL` with the defensive fallback.                                                                                                                                 |
| `if (!fs.existsSync(authStatesDir)) fs.mkdirSync(...)`             | The recursive parent-directory creation.                                                                                                                                            |
| `path.resolve(__dirname, ADMIN_STATE_FILE)`                        | The absolute admin storage path, anchored to the module's directory.                                                                                                               |
| `await chromium.launch()`                                          | The single shared browser.                                                                                                                                                         |
| `await browser.newContext()` (twice)                               | The two isolated cookie jars.                                                                                                                                                      |
| `goto('/auth/signin', { timeout: 60_000 })`                        | The admin sign-in entry, with the cold-render-tolerant timeout.                                                                                                                    |
| `locator('#email').fill(...)` / `locator('#password').fill(...)`   | The stable form-field IDs.                                                                                                                                                          |
| `getByRole('button', { name: /sign in/i }).click()`                | The semantic, label-tolerant submit.                                                                                                                                                |
| `waitForURL(/\/(admin\|client\/dashboard)/)`                       | The role-tolerant post-redirect assertion.                                                                                                                                          |
| `storageState({ path: adminStatePath })`                           | The persisted admin auth state.                                                                                                                                                    |
| `console.log('[global-setup] Admin auth state saved')`             | The success signal.                                                                                                                                                                |
| `goto('/auth/register', { timeout: 60_000 })`                      | The client sign-up entry.                                                                                                                                                          |
| `TEST_DATA.generateClientEmail()`                                  | The per-run unique email.                                                                                                                                                          |
| `press('Enter')` on `#password`                                    | The keyboard-event submit, button-text-independent.                                                                                                                                |
| `waitForURL(/\/client\/dashboard/, { timeout: 120_000, waitUntil: 'domcontentloaded' })` | The slow-path-tolerant client-redirect wait.                                                                                                                |
| `storageState({ path: clientStatePath })`                          | The persisted client auth state.                                                                                                                                                   |
| `await browser.close()`                                            | The single shared-browser close, unreachable on failure (both `catch` blocks already closed).                                                                                       |
| `export default globalSetup;`                                      | The Playwright-mandated default export.                                                                                                                                            |

## `global-setup.ts`-change checklist

When you change anything inside this file, run through this list
before opening the PR:

- [ ] Cross-check
      [`playwright-config.md`](./playwright-config.md) — the config
      file's `globalSetup` field still points here, and any
      timeout / `baseURL` posture this file relies on is still in
      sync.
- [ ] Cross-check
      [`apps/web-e2e/helpers/test-data.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/helpers/test-data.ts)
      — every constant the setup imports (`AUTH_STATE_DIR`,
      `ADMIN_STATE_FILE`, `CLIENT_STATE_FILE`, `REQUIRED_ENV_VARS`,
      `TEST_DATA.*`) is still exported by name.
- [ ] Run `pnpm tsc --noEmit` from `apps/web-e2e/` (catches missing
      imports, drifted types from `@playwright/test`, accidental
      `any` introductions).
- [ ] Run `pnpm tsc --noEmit` from the workspace root (catches any
      cross-package drift the e2e tsconfig does not see).
- [ ] Run a smoke subset of the suite locally via
      `pnpm test:e2e --project=chromium tests/smoke/`. Both auth
      states must end up in `apps/web-e2e/auth-states/`.
- [ ] Verify both CI and local modes — set `CI=1` for one run to
      exercise the `process.env.CI` branch of
      `promptForMissingEnv` and the CI-only timeouts.
- [ ] Add a [`docs/log.md`](../log.md) entry tagged
      `docs/plugins` describing what changed here.
- [ ] Cross-link the new content from
      [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
      if the change has a spec impact (new pre-flight step, new
      env var contract, new auth flow).
- [ ] Reviewer pass — confirm the per-line walkthrough table and
      the failure matrix still hold.

## See also

- [`playwright-config.md`](./playwright-config.md) — the runner
  configuration that wires `globalSetup` to this file.
- [`e2e-tsconfig.md`](./e2e-tsconfig.md) — the type-checking
  posture for everything the suite imports.
- [`web-app-tsconfig.md`](./web-app-tsconfig.md) — the host web
  app's tsconfig (the suite drives the host app, so the two
  postures must stay aligned).
- [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  — the spec that locks the e2e contract.
- [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion)
  — the spec that locks the monorepo layout the setup's
  `__dirname` and `webServer.cwd` rely on.
