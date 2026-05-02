---
id: auth-fixture
title: Playwright Auth Fixture (`apps/web-e2e/fixtures/auth.fixture.ts`)
sidebar_label: Auth fixture
sidebar_position: 34
---

# Playwright Auth Fixture (`apps/web-e2e/fixtures/auth.fixture.ts`)

> **Status.** Authoritative reference for the Playwright e2e
> suite's authenticated-context fixture defined in
> [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
> and elaborated by
> [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion).
> The fixture is locked by
> [`apps/web-e2e/fixtures/auth.fixture.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/fixtures/auth.fixture.ts),
> which extends Playwright's `base` test object with four
> per-test fixtures (`adminContext`, `adminPage`, `clientContext`,
> `clientPage`) that each open a fresh `BrowserContext` /
> `Page` pair pre-loaded with the persisted authentication
> storage state minted by
> [`global-setup.md`](./global-setup.md), guards both storage-state
> file reads with the `requireAuthState()` helper that throws a
> contributor-actionable error if the file is missing (so the
> failure surfaces immediately with a pointer to the
> `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env-var pair instead
> of as a cryptic "context could not be created" error 30
> seconds in), and re-exports `expect` from `@playwright/test`
> so a spec can `import { test, expect } from '../fixtures/auth.fixture'`
> in one statement instead of two. When any of those fixtures
> moves, update **this** page in the same change so the doc and
> the file cannot drift.

`apps/web-e2e/fixtures/auth.fixture.ts` is the **single source of
truth** for every authenticated `BrowserContext` and `Page` in
the suite. It is the file that turns the per-suite global setup's
two persisted authentication storage states (`auth-states/admin.json`
and `auth-states/client.json`) into per-test isolated browser
contexts that a spec can drive immediately, without paying the
per-test sign-in / sign-up cost. Every spec under
`apps/web-e2e/tests/admin/` reaches for `adminPage` /
`adminContext`; every spec under `apps/web-e2e/tests/client/`
reaches for `clientPage` / `clientContext`. The unauthenticated
specs under `apps/web-e2e/tests/public/`, `apps/web-e2e/tests/api/`,
`apps/web-e2e/tests/auth/`, `apps/web-e2e/tests/i18n/`, and
`apps/web-e2e/tests/smoke/` use Playwright's default `test` and
`page` / `context` fixtures, which are not extended by this
file.

This page is the **per-source-file reference** that pairs with
[`apps/web-e2e/fixtures/auth.fixture.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/fixtures/auth.fixture.ts)
the same way
[`global-setup.md`](./global-setup.md) pairs with
`apps/web-e2e/global-setup.ts`,
[`global-teardown.md`](./global-teardown.md) pairs with
`apps/web-e2e/global-teardown.ts`,
[`e2e-test-data.md`](./e2e-test-data.md) pairs with
`apps/web-e2e/helpers/test-data.ts`,
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
[`global-setup.md`](./global-setup.md) documents the **suite's
pre-flight boundary** (validate the seeded admin credentials,
mint two persisted authentication storage states, write them to
`apps/web-e2e/auth-states/`),
[`global-teardown.md`](./global-teardown.md) documents the
**suite's post-flight boundary** (today a deliberate no-op
placeholder), and
[`e2e-test-data.md`](./e2e-test-data.md) documents the **suite's
shared-data boundary** (every constant, generator, env-var name,
route path, and auth-state file path), this page documents the
**suite's authenticated-fixture boundary** — how the persisted
storage states minted at pre-flight become per-test isolated
browser contexts, with what failure modes, and what guarantees a
spec can rely on when it imports `test` from this file instead
of from `@playwright/test`.

## At a glance

| Element                                    | Type                                                     | What it is                                                                                                                                                                                                                                                                                                                                                                                                       | Why it matters                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/* eslint-disable react-hooks/rules-of-hooks */` | comment directive                                       | Disables the `react-hooks/rules-of-hooks` ESLint rule for the entire file                                                                                                                                                                                                                                                                                                                                          | Playwright's `test.extend(...)` callback parameter list `(({ browser }, use) => ...)` triggers a false positive on the React hooks rule because the variable name `use` matches React's `use()` hook pattern. The rule is disabled at file scope so the false positive does not block CI. The rule is **not** disabled at workspace scope — only this one file pays the cost.                                                                                                                  |
| `import { test as base, type Page, type BrowserContext } from '@playwright/test';` | typed import                                            | Imports the base test object as `base` (so the local `test` alias can extend it without a name collision) and the two type-only imports `Page` and `BrowserContext` for the fixture type annotations                                                                                                                                                                                                              | The `as base` rename is mandatory because `test` is the canonical export the file exports back out — without the rename, the `export const test = base.extend<...>(...)` line would fail with "redeclaration". The `type` keyword on the two type imports keeps them out of the runtime bundle.                                                                                                                                                                                              |
| `import fs from 'fs';` + `import path from 'path';` | Node imports                                            | Imports the Node `fs` and `path` modules for the `requireAuthState()` helper's `fs.existsSync()` check and the `path.resolve(__dirname, '..', ...)` absolute-path computation                                                                                                                                                                                                                                  | The `__dirname`-anchored absolute path resolution survives `webServer.cwd: '../..'` (the monorepo-root anchor set by [`playwright-config.md`](./playwright-config.md)). A relative path like `./auth-states/admin.json` would be resolved against the monorepo root and would not find the file under `apps/web-e2e/auth-states/`.                                                                                                                                                            |
| `import { ADMIN_STATE_FILE, CLIENT_STATE_FILE } from '../helpers/test-data';` | shared-data import                                      | Imports the two relative path constants from [`e2e-test-data.md`](./e2e-test-data.md)                                                                                                                                                                                                                                                                                                                            | Centralising the file paths in `helpers/test-data.ts` means a future move from `auth-states/` to `.auth/` updates one constant and propagates through every consumer. The fixture never types the literal `'auth-states/admin.json'` because that drift is the most common cross-spec bug.                                                                                                                                                                                                  |
| `ADMIN_STATE_PATH` / `CLIENT_STATE_PATH`   | resolved absolute paths                                  | `path.resolve(__dirname, '..', ADMIN_STATE_FILE)` resolves to `<repo>/apps/web-e2e/auth-states/admin.json` (and similarly for the client)                                                                                                                                                                                                                                                                       | Resolving once at module load avoids re-resolving on every test. The `path.resolve(__dirname, '..', ...)` shape is the **only** shape that gives the right path under both `pnpm test:e2e` (run from `apps/web-e2e/`) and `pnpm --filter @ever-works/web-e2e test` (run from the workspace root with `webServer.cwd: '../..'`).                                                                                                                                                                |
| `requireAuthState(filePath)`               | `(filePath: string) => string` helper                    | Throws with a contributor-actionable message if the file does not exist, otherwise returns the path                                                                                                                                                                                                                                                                                                              | Without this guard, Playwright's `browser.newContext({ storageState: '<missing>' })` produces a cryptic "context could not be created" error 30 seconds into the test run. With the guard, the failure surfaces immediately with a pointer to the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env-var pair (which is the most common reason `global-setup` fails to write the file).                                                                                                          |
| `AuthFixtures` type                        | `type` declaration                                       | Declares the four fixture names and their types: `adminContext: BrowserContext`, `adminPage: Page`, `clientContext: BrowserContext`, `clientPage: Page`                                                                                                                                                                                                                                                          | Playwright's `test.extend<T>(...)` requires a type parameter so TypeScript can narrow the test parameter list. Without the type, every spec that destructures `{ adminPage }` would lose IntelliSense.                                                                                                                                                                                                                                                                                          |
| `adminContext` fixture                     | `(({ browser }, use) => Promise<void>)` factory         | Creates a fresh `BrowserContext` with `{ storageState: requireAuthState(ADMIN_STATE_PATH) }`, hands it to the test via `use(context)`, then closes it after the test                                                                                                                                                                                                                                              | A fresh context per test means cross-test cookie / localStorage isolation; the persisted storage state means the per-test sign-in cost is paid once at pre-flight, not once per test. The `await context.close()` after `use()` releases the per-test memory immediately, preventing leaks under high-parallelism workers.                                                                                                                                                                  |
| `adminPage` fixture                        | `(({ adminContext }, use) => Promise<void>)` factory    | Builds on `adminContext` by opening a fresh `Page` from it, hands it to the test, then closes it after the test                                                                                                                                                                                                                                                                                                  | Most admin specs do not need direct context access — they need a `Page`. The `adminPage` fixture is the convenience wrapper that hides the context and saves the spec one line.                                                                                                                                                                                                                                                                                                            |
| `clientContext` / `clientPage` fixtures    | parallel structure                                       | Same pattern as `adminContext` / `adminPage`, applied to the per-run client account's storage state                                                                                                                                                                                                                                                                                                              | The two pairs are intentionally parallel so a contributor reading the file knows that anything true for the admin pair is true for the client pair.                                                                                                                                                                                                                                                                                                                                          |
| `export { expect } from '@playwright/test';` | re-export                                                | Re-exports `expect` so a spec can `import { test, expect } from '../fixtures/auth.fixture'` in one statement                                                                                                                                                                                                                                                                                                     | Without the re-export, every spec would need two imports (`import { test } from '../fixtures/auth.fixture'` + `import { expect } from '@playwright/test'`). The re-export saves one line per spec and prevents the "imported `test` from one place but `expect` from another" anti-pattern that breaks Playwright's test-soft-failure aggregation.                                                                                                                                              |

## The full file, annotated

```ts
/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, type Page, type BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { ADMIN_STATE_FILE, CLIENT_STATE_FILE } from '../helpers/test-data';
```

The file-scoped ESLint disable directive is the file's only
opt-out from a workspace-level rule. It exists because
Playwright's `test.extend(...)` callback parameter list
`(({ browser }, use) => ...)` triggers a false positive on the
`react-hooks/rules-of-hooks` rule — the variable name `use`
collides with React 19's `use()` hook pattern. The rule's
heuristic looks for any function-call named `use` inside a
function and flags it as a hook call, which it is not in this
context.

The five imports lock four boundaries:

1. `test as base` — the rename is mandatory because the local
   `test` is the canonical export the file builds. Without the
   rename, `export const test = base.extend<...>(...)` would
   collide with the import.
2. `type Page, type BrowserContext` — type-only imports stay
   out of the runtime bundle. They are needed only by the
   `AuthFixtures` type declaration below.
3. `fs` / `path` — Node modules for the `requireAuthState()`
   helper's `fs.existsSync()` and the `path.resolve(__dirname,
   '..', ...)` absolute-path computation.
4. `ADMIN_STATE_FILE` / `CLIENT_STATE_FILE` — the relative
   path constants from [`e2e-test-data.md`](./e2e-test-data.md).
   The fixture never types the literal `'auth-states/admin.json'`
   because that drift is the most common cross-spec bug.

```ts
const ADMIN_STATE_PATH = path.resolve(__dirname, '..', ADMIN_STATE_FILE);
const CLIENT_STATE_PATH = path.resolve(__dirname, '..', CLIENT_STATE_FILE);
```

The two `path.resolve(__dirname, '..', ...)` calls compute the
absolute paths at module load. Three properties are
load-bearing:

1. **`__dirname` is the directory of the fixture file** —
   `<repo>/apps/web-e2e/fixtures/`. The leading `'..'` walks up
   one level to `<repo>/apps/web-e2e/`, where the
   `auth-states/` directory lives. The path therefore resolves
   to `<repo>/apps/web-e2e/auth-states/admin.json`.
2. **The resolution happens once at module load**, not on every
   test. Re-resolving inside the fixture factory would pay the
   `path.resolve` cost per test (cheap, but unnecessary) and
   would obscure the file's intent.
3. **Absolute paths survive `webServer.cwd: '../..'`** — the
   monorepo-root anchor set by
   [`playwright-config.md`](./playwright-config.md). A relative
   path like `'./auth-states/admin.json'` would be resolved
   against the monorepo root by Playwright's `storageState`
   reader, which would look for the file at
   `<repo>/auth-states/admin.json` instead of the actual
   `<repo>/apps/web-e2e/auth-states/admin.json`. The absolute
   path bypasses the relative-resolution ambiguity.

```ts
function requireAuthState(filePath: string): string {
	if (!fs.existsSync(filePath)) {
		throw new Error(
			`Auth state file not found: ${filePath}. ` +
				'Global setup may have failed — check that SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are correct.'
		);
	}
	return filePath;
}
```

The helper is the **fail-fast guard** for both storage-state
reads. Three properties are load-bearing:

1. **The check is `fs.existsSync()`, not `fs.statSync()`.**
   `existsSync` returns a boolean and never throws; `statSync`
   throws on a missing file with a low-level
   `ENOENT: no such file or directory` that does not name the
   storage-state context. Using `existsSync` means the explicit
   throw below carries the contributor-actionable message.
2. **The error message names both the file path AND the most
   common cause** (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
   misconfiguration). A contributor running the suite for the
   first time sees the file path the global setup expected to
   create, and the env-var pair that is most likely missing.
   Any vaguer message would shift the cost from the helper to
   the contributor's debugging time.
3. **The function returns the path on the happy path** — not
   `undefined` and not `void`. This means the fixture factories
   can compose it inline:
   `browser.newContext({ storageState: requireAuthState(ADMIN_STATE_PATH) })`.
   The composition is the entire point of the helper's return
   shape.

```ts
type AuthFixtures = {
	adminContext: BrowserContext;
	adminPage: Page;
	clientContext: BrowserContext;
	clientPage: Page;
};
```

The fixture type list. Playwright's `test.extend<T>(...)`
requires a type parameter so TypeScript can narrow the test
parameter list. Without the type:

- A spec that destructures `{ adminPage }` from the test
  parameter loses IntelliSense.
- A typo (`{ adminPag }`) becomes a runtime "fixture not
  defined" error 60 seconds into the test instead of a
  TypeScript error at edit time.
- The two `BrowserContext` and two `Page` types degenerate to
  `any` inside the spec body, and downstream `await
  adminPage.click(...)` calls lose autocomplete.

```ts
export const test = base.extend<AuthFixtures>({
	adminContext: async ({ browser }, use) => {
		const context = await browser.newContext({ storageState: requireAuthState(ADMIN_STATE_PATH) });
		await use(context);
		await context.close();
	},
	adminPage: async ({ adminContext }, use) => {
		const page = await adminContext.newPage();
		await use(page);
		await page.close();
	},
	clientContext: async ({ browser }, use) => {
		const context = await browser.newContext({ storageState: requireAuthState(CLIENT_STATE_PATH) });
		await use(context);
		await context.close();
	},
	clientPage: async ({ clientContext }, use) => {
		const page = await clientContext.newPage();
		await use(page);
		await page.close();
	},
});
```

The four fixture factories. Each follows Playwright's standard
`async ({ deps }, use) => { setup; await use(value); teardown; }`
pattern. Three properties are load-bearing for the admin pair
(and identically for the client pair):

1. **`adminContext` depends on `browser`, not `context`.**
   `browser.newContext(...)` creates a fresh `BrowserContext`;
   `context` (Playwright's default) would reuse the per-test
   default context, which has no storage state loaded. The
   fresh-context shape is the only way to apply the
   `storageState` option.
2. **`adminPage` depends on `adminContext`, not `page`.** A
   page from the default `page` fixture would be inside the
   default context, which has no storage state loaded. The
   `adminContext.newPage()` call ensures the page inherits the
   storage state.
3. **The teardown closes the context (or page) after `use()`.**
   This releases the per-test memory immediately, preventing
   leaks under high-parallelism workers (a 50-spec admin suite
   running on 2 workers would otherwise hold 50 contexts in
   memory by the end of the run). The `await` on `close()` is
   important — without it, the next test could start before the
   previous context's teardown completes, producing
   `EADDRINUSE` / "browser disconnected" failures under load.

```ts
export { expect } from '@playwright/test';
```

The re-export saves every spec one line and one import. The
shape `import { test, expect } from '../fixtures/auth.fixture'`
is the single canonical import for an authenticated spec. The
alternative — `import { test } from '../fixtures/auth.fixture'`
+ `import { expect } from '@playwright/test'` — is two lines
that would drift over time and would invite the
"imported `test` from one place but `expect` from another"
anti-pattern that breaks Playwright's test-soft-failure
aggregation (the `expect.soft()` family relies on the `test`
context being the same instance as the one `expect` was
imported from).

## How a spec uses the fixture

The canonical authenticated-spec shape is:

```ts
import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Admin dashboard', () => {
	test('renders the dashboard for an authenticated admin', async ({ adminPage }) => {
		await adminPage.goto('/admin');
		await expect(adminPage.getByRole('heading', { name: /dashboard/i })).toBeVisible();
	});

	test('shows the moderation queue', async ({ adminPage }) => {
		await adminPage.goto('/admin/moderation');
		await expect(adminPage.getByRole('table')).toBeVisible();
	});
});
```

Three properties are load-bearing:

1. **The spec imports `test` and `expect` from this file**, not
   from `@playwright/test`. The local `test` is the extended
   one with the four fixtures wired; the canonical `test` from
   `@playwright/test` does not have them.
2. **The destructure name (`adminPage` / `adminContext` /
   `clientPage` / `clientContext`) selects which storage state
   the test runs against.** Mixing both in the same test
   (`async ({ adminPage, clientPage })`) is legal but wastes
   resources — the fixture factories run for both, so two
   contexts boot per test instead of one.
3. **The fixture factory closes the context / page after the
   test.** A spec that calls `await adminPage.context().close()`
   inside the test body double-closes, which throws a
   "context already closed" error on the second close. Specs
   should not manually close anything that came from a fixture.

## Why a fixture instead of a `test.beforeEach()` hook

The naive shape would be:

```ts
test.beforeEach(async ({ browser }, testInfo) => {
	const context = await browser.newContext({ storageState: 'auth-states/admin.json' });
	const page = await context.newPage();
	testInfo.attach('admin-page', { body: 'opened' });
	(testInfo.context as any).adminPage = page;
});
```

This fails three different ways:

1. **`testInfo.context` is not a public stash.** Mutating it is
   undocumented behaviour. The fixture mechanism is the
   officially supported extension surface.
2. **The teardown belongs in `test.afterEach()`.** Splitting
   setup and teardown across two hooks invites drift — a
   contributor adds a new fixture in `beforeEach` but forgets
   the matching cleanup in `afterEach`. The fixture factory
   colocates both in one function.
3. **The `beforeEach` hook runs sequentially before the test;
   the fixture factory composes lazily.** A spec that does not
   destructure `adminPage` does not pay the context-boot cost
   under the fixture model. Under the `beforeEach` model, every
   test pays the cost regardless.

The fixture model is the lowest-cost, most-composable shape.
The hook model is rejected.

## Why `BrowserContext` per fixture, not a shared one

A naive optimisation would be:

```ts
let sharedAdminContext: BrowserContext | null = null;
test.beforeAll(async ({ browser }) => {
	sharedAdminContext = await browser.newContext({ storageState: 'auth-states/admin.json' });
});
test.afterAll(async () => {
	await sharedAdminContext?.close();
});
test('test 1', async () => {
	const page = await sharedAdminContext!.newPage();
	// ...
});
test('test 2', async () => {
	const page = await sharedAdminContext!.newPage();
	// ...
});
```

This fails three different ways:

1. **Cross-test cookie / localStorage pollution.** Test 1
   signs in (mutating cookies), Test 2 inherits the mutated
   cookies. A `beforeEach` cookie reset would mostly fix this
   but loses the `storageState` baseline.
2. **Concurrent page operations on one context can race.**
   Two parallel pages inside one context share a `localStorage`,
   `IndexedDB`, and service-worker scope. Mutations from one
   test can be observed from another.
3. **Per-test debugging is harder.** A trace recorded against
   a shared context contains operations from every test, not
   just the failing one. The fresh-context shape gives one
   trace per test, which is the granularity Playwright's HTML
   reporter assumes.

The fresh-context-per-test shape is the only shape that
preserves test isolation. The shared-context optimisation is
rejected.

## Failure matrix

| Mistake                                                              | What surfaces it                                                                                                                                                                                                                                                                                              | Prevention                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drop the `requireAuthState()` guard                                  | A missing `auth-states/admin.json` produces a cryptic Playwright "context could not be created" error 30 seconds in. The contributor has no clue the storage-state file is the problem.                                                                                                                       | Keep the guard. The contributor-actionable error message ("Global setup may have failed — check that SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are correct") is the entire point of the helper.                                                                                                                       |
| Switch from `fs.existsSync()` to `fs.statSync()`                     | A missing file produces an `ENOENT: no such file or directory` from Node's low-level `stat`, not the helper's contributor-actionable message.                                                                                                                                                                | Keep `fs.existsSync()`. It returns a boolean and never throws; the explicit throw below carries the actionable message.                                                                                                                                                                                            |
| Drop the `path.resolve(__dirname, '..', ...)` shape                  | A relative path like `'./auth-states/admin.json'` is resolved against `webServer.cwd: '../..'` (the monorepo root), so Playwright looks for the file at `<repo>/auth-states/admin.json` instead of `<repo>/apps/web-e2e/auth-states/admin.json`. The fixture fails for every test.                                | Keep the `__dirname`-anchored absolute path resolution. It is the only shape that survives the monorepo-root `cwd`.                                                                                                                                                                                                |
| Hard-code the literal `'auth-states/admin.json'` instead of importing | A future move from `auth-states/` to `.auth/` requires updating every consumer of the literal. Missing one means the fixture loads a stale file or fails to find one.                                                                                                                                         | Always import `ADMIN_STATE_FILE` / `CLIENT_STATE_FILE` from [`e2e-test-data.md`](./e2e-test-data.md). The constants are the single source of truth.                                                                                                                                                                |
| Drop the `as base` rename on the import                              | `export const test = test.extend<...>(...)` collides with the import name. TypeScript reports `Cannot redeclare block-scoped variable 'test'`.                                                                                                                                                                | Keep the rename. The local `test` is the canonical export.                                                                                                                                                                                                                                                          |
| Drop the `AuthFixtures` type parameter from `base.extend<T>(...)`     | TypeScript widens the test parameter list to the base shape, so `{ adminPage }` destructures lose IntelliSense and become `any`. A typo (`adminPag`) becomes a runtime error 60 seconds in instead of a TypeScript error at edit time.                                                                            | Keep the `AuthFixtures` type. It is the only thing protecting the spec author from typo-driven runtime failures.                                                                                                                                                                                                  |
| Reuse a shared `BrowserContext` across tests                         | Cross-test cookie / localStorage pollution; concurrent page operations race on shared `localStorage` / `IndexedDB` / service-worker scope; per-test trace recordings contain operations from every test.                                                                                                       | Keep the fresh-context-per-test shape. The per-test memory cost is the price for test isolation.                                                                                                                                                                                                                  |
| Drop the `await context.close()` (or `await page.close()`) teardown  | High-parallelism runs accumulate contexts in memory; a 50-spec admin suite on 2 workers holds 50 contexts at the end of the run. Eventually the worker OOMs.                                                                                                                                                  | Keep the teardown. The `await` on `close()` is also important — without it, the next test can start before teardown completes.                                                                                                                                                                                       |
| Drop the `re-export { expect }`                                      | Every spec needs two imports (`test` from this file, `expect` from `@playwright/test`). Over time, specs drift to importing both from `@playwright/test`, losing the extended `test` object and reverting to the un-fixtured base. Authenticated specs fail with "fixture not defined: adminPage".              | Keep the re-export. The single canonical import shape is the file's most important convention.                                                                                                                                                                                                                    |
| Switch the `adminContext` factory's `browser` dependency to `context` | The `context` fixture is the per-test default context with no storage state loaded. A `context.storageState({ path: '...' })` call would set state going forward but not load existing state. The fixture's "pre-loaded with admin auth" guarantee breaks silently.                                              | Keep the `browser` dependency. Only `browser.newContext({ storageState })` loads existing state at creation time.                                                                                                                                                                                                  |
| Switch the `adminPage` factory's `adminContext` dependency to `page` | The `page` fixture is the per-test default page inside the default context (with no storage state). The fixture's "authenticated page" guarantee breaks silently.                                                                                                                                              | Keep the `adminContext` dependency.                                                                                                                                                                                                                                                                                |
| Move the file from `apps/web-e2e/fixtures/auth.fixture.ts` to `apps/web-e2e/auth.fixture.ts` | The hard-coded `from '../fixtures/auth.fixture'` imports in every authenticated spec stop resolving. The suite fails to load with `Cannot find module '../fixtures/auth.fixture'`.                                                                                                                                | Keep the file under `apps/web-e2e/fixtures/`. The convention is that suite-internal helpers live under `helpers/`, page objects under `page-objects/`, and fixtures under `fixtures/`.                                                                                                                              |
| Add a third fixture pair without updating the `AuthFixtures` type    | TypeScript narrows the parameter list to the declared three fixtures; the new fourth fixture is not destructurable from the spec parameter list because the type does not include it.                                                                                                                          | Keep the `AuthFixtures` type in lock-step with the factories. Adding a fixture means adding it to the type AND to the `extend<...>(...)` object in the same change.                                                                                                                                                |
| Remove the `eslint-disable react-hooks/rules-of-hooks` directive     | The `use` parameter name in the fixture factory triggers the `react-hooks/rules-of-hooks` rule's false positive. CI fails the lint step.                                                                                                                                                                       | Keep the directive. Renaming `use` to `useFixture` would silence the lint but break Playwright's documented fixture contract — the parameter must be named `use` for the test runner to recognise it.                                                                                                              |

## Per-line walkthrough

| Line | Element                                                                                  | What it does                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `/* eslint-disable react-hooks/rules-of-hooks */`                                          | File-scoped disable of the `react-hooks/rules-of-hooks` rule. Necessary because the `use` parameter name in the fixture factory triggers a false positive.                                                                                                                                                                                                                                                            |
| 2    | `import { test as base, type Page, type BrowserContext } from '@playwright/test';`        | The base test object renamed to `base` to free up `test` for the local export, plus type-only imports for the fixture type annotations.                                                                                                                                                                                                                                                                            |
| 3    | `import fs from 'fs';`                                                                    | Node `fs` for the `requireAuthState()` `existsSync()` check.                                                                                                                                                                                                                                                                                                                                                       |
| 4    | `import path from 'path';`                                                                | Node `path` for the `path.resolve(__dirname, '..', ...)` absolute-path computation.                                                                                                                                                                                                                                                                                                                                  |
| 5    | `import { ADMIN_STATE_FILE, CLIENT_STATE_FILE } from '../helpers/test-data';`             | The two relative path constants from [`e2e-test-data.md`](./e2e-test-data.md). The fixture never types the literal `'auth-states/admin.json'`.                                                                                                                                                                                                                                                                       |
| 7    | `const ADMIN_STATE_PATH = path.resolve(__dirname, '..', ADMIN_STATE_FILE);`               | Resolves to `<repo>/apps/web-e2e/auth-states/admin.json` at module load. The `__dirname`-anchored shape survives `webServer.cwd: '../..'`.                                                                                                                                                                                                                                                                          |
| 8    | `const CLIENT_STATE_PATH = path.resolve(__dirname, '..', CLIENT_STATE_FILE);`             | Resolves to `<repo>/apps/web-e2e/auth-states/client.json`. Same shape rationale as the admin.                                                                                                                                                                                                                                                                                                                       |
| 10–18 | `function requireAuthState(filePath: string): string { ... }`                              | Fail-fast guard. Throws with a contributor-actionable message naming the file path AND the most likely cause (missing or wrong `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). Returns the path on the happy path so the fixture factories can compose it inline.                                                                                                                                                          |
| 20–25 | `type AuthFixtures = { ... }`                                                              | Declares the four fixture names and their types. Required by `base.extend<T>(...)` so TypeScript narrows the spec parameter list.                                                                                                                                                                                                                                                                                  |
| 27–47 | `export const test = base.extend<AuthFixtures>({ ... });`                                  | The four fixture factories. `adminContext` depends on `browser` and creates a fresh context with the admin storage state loaded. `adminPage` depends on `adminContext` and opens a fresh page from it. `clientContext` / `clientPage` mirror the admin pair against the per-run client account's storage state. Each factory closes its context / page after the test to prevent memory leaks under high parallelism. |
| 50    | `export { expect } from '@playwright/test';`                                               | Re-exports `expect` so a spec can import both `test` and `expect` from this file in one statement.                                                                                                                                                                                                                                                                                                                  |

## `auth.fixture.ts`-change checklist

When this file's fixtures change — when a new authenticated
role is added, when the storage-state path resolution moves,
when the failure-message wording is updated — any of the
following deserves the same change in the same PR:

- **Cross-check [`global-setup.md`](./global-setup.md).** The
  storage-state files this fixture reads are the files
  `global-setup.ts` writes. Any new auth role here must have a
  matching sign-in / sign-up flow there, with a matching
  `storageState({ path })` write to the new file.
- **Cross-check [`global-teardown.md`](./global-teardown.md).**
  When the no-op teardown grows into a real cleanup sequence,
  the auth-state cleanup bucket will use the same `AUTH_STATE_DIR`
  constant. A new role here means a new file in the cleanup
  bucket there.
- **Cross-check [`e2e-test-data.md`](./e2e-test-data.md).**
  `ADMIN_STATE_FILE` and `CLIENT_STATE_FILE` (and any future
  `MODERATOR_STATE_FILE` / `EDITOR_STATE_FILE`) live there. A
  new role here means a new constant there.
- **Cross-check [`playwright-config.md`](./playwright-config.md).**
  The `webServer.cwd` resolves the relative paths in
  `ADMIN_STATE_FILE` / `CLIENT_STATE_FILE`; a change to `cwd`
  changes where the storage-state files actually land on disk
  and where this fixture must look for them.
- **Cross-check [`e2e-tsconfig.md`](./e2e-tsconfig.md).** The
  `include: ["./**/*.ts"]` glob already picks up
  `fixtures/auth.fixture.ts`. If the glob narrows or if the
  file moves, the type-checker stops walking the file and a
  future rename's type errors slip past `pnpm tsc --noEmit`.
- **Cross-check every authenticated spec under
  `apps/web-e2e/tests/admin/` and `apps/web-e2e/tests/client/`.**
  They all import `{ test, expect }` from this file via the
  relative path `'../../fixtures/auth.fixture'`. A file move
  means updating every import.
- **Run `pnpm tsc --noEmit` from `apps/web-e2e/`** to confirm
  the change type-checks under the e2e tsconfig posture.
- **Run `pnpm tsc --noEmit` from the workspace root** to confirm
  the workspace-wide type-checker also picks up the change.
- **Run a smoke-subset Playwright run** of the admin / client
  spec set (`pnpm test:e2e:chromium -- admin/ client/`) and
  confirm:
    1. The fixture loads both storage-state files (no
       `requireAuthState` throw).
    2. The admin specs see admin-only routes; the client specs
       see client-only routes.
    3. Each spec's trace contains operations from only that
       spec (proving fresh-context isolation).
- **Add a [`docs/log.md`](../log.md) entry** describing the
  change (newest at the top, `YYYY-MM-DD docs/plugins
  auth-fixture:` prefix).
- **Cross-link the change to
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)**
  if the change introduces a new auth role or a new fixture
  pair. The spec is the authoritative living document for the
  e2e suite's behaviour.
- **Reviewer pass.** A second pair of eyes on the matched
  changes (this file + `global-setup.md` cross-link + `e2e-test-data.md`
  cross-link + every consumer spec import + log entry) catches
  half-applied changes the contributor missed.

## Cross-references

- [`apps/web-e2e/fixtures/auth.fixture.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/fixtures/auth.fixture.ts)
  — the file this page documents.
- [`global-setup.md`](./global-setup.md) — the pre-flight hook
  that mints the two storage-state files this fixture reads.
- [`global-teardown.md`](./global-teardown.md) — the post-flight
  hook (today a no-op placeholder) that will clean up the same
  files when it grows into a real cleanup sequence.
- [`e2e-test-data.md`](./e2e-test-data.md) — the shared-data
  module that exports `ADMIN_STATE_FILE` and `CLIENT_STATE_FILE`.
- [`playwright-config.md`](./playwright-config.md) — the runner
  config whose `webServer.cwd` resolves the relative paths.
- [`e2e-tsconfig.md`](./e2e-tsconfig.md) — the tsconfig whose
  `include` glob picks up this file.
- [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  — the authoritative living spec for the e2e suite.
- [`docs/log.md`](../log.md) — the running change log; every
  edit to this file or its source belongs there too.
