---
id: e2e-test-data
title: E2E Test Data Helpers (`apps/web-e2e/helpers/test-data.ts`)
sidebar_label: E2E test data
sidebar_position: 33
---

# E2E Test Data Helpers (`apps/web-e2e/helpers/test-data.ts`)

> **Status.** Authoritative reference for the Playwright e2e
> suite's central test-data and constants module defined in
> [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
> and elaborated by
> [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion).
> The module is locked by
> [`apps/web-e2e/helpers/test-data.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/helpers/test-data.ts),
> which exposes the seeded admin credentials (via the
> `requireEnv()` lazy getter so the suite fails-fast on a missing
> env-var instead of running with `undefined`), the per-run
> client account password, the unique-per-run client / item /
> URL generators that prevent parallel-worker collisions, the
> `REQUIRED_ENV_VARS` whitelist consumed by
> [`global-setup.md`](./global-setup.md)'s `promptForMissingEnv()`
> pre-flight step, the `PUBLIC_ROUTES` table consumed by every
> public-shell smoke spec, and the `AUTH_STATE_DIR` /
> `ADMIN_STATE_FILE` / `CLIENT_STATE_FILE` path constants
> consumed by
> [`global-setup.md`](./global-setup.md)'s
> `storageState({ path })` writes (and tomorrow by
> [`global-teardown.md`](./global-teardown.md)'s cleanup
> buckets). When any of those exports moves, update **this** page
> in the same change so the doc and the file cannot drift.

`apps/web-e2e/helpers/test-data.ts` is the **single source of
truth** for every constant, generator, env-var name, route path,
auth-state file path, and seeded credential the Playwright e2e
suite consumes. It is the file that prevents the same string from
being typed in two places — and therefore the file that prevents
the most common cross-spec drift bug (a path renamed in one
spec but missed in three others, an env-var renamed in
`promptForMissingEnv()` but missed in `TEST_DATA.ADMIN_EMAIL`,
a public route added to the navigation but missed by the
shell-smoke matrix). The module is imported by
[`global-setup.md`](./global-setup.md)'s top-level destructure
(`TEST_DATA`, `ADMIN_STATE_FILE`, `CLIENT_STATE_FILE`,
`AUTH_STATE_DIR`, `REQUIRED_ENV_VARS`), by every public-shell
smoke spec under `apps/web-e2e/tests/public/` (`PUBLIC_ROUTES`),
by every authenticated spec under `apps/web-e2e/tests/admin/`
and `apps/web-e2e/tests/client/` (via the per-suite `test.use({
storageState: ADMIN_STATE_FILE | CLIENT_STATE_FILE })` calls),
and by every spec that creates throw-away data (via
`TEST_DATA.generateClientEmail()`,
`TEST_DATA.generateItemName()`,
`TEST_DATA.generateItemUrl()`).

This page is the **per-source-file reference** that pairs with
[`apps/web-e2e/helpers/test-data.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/helpers/test-data.ts)
the same way
[`global-setup.md`](./global-setup.md) pairs with
`apps/web-e2e/global-setup.ts`,
[`global-teardown.md`](./global-teardown.md) pairs with
`apps/web-e2e/global-teardown.ts`,
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
[`plugin-demo.md`](./plugin-demo.md) pairs with the bundled
reference plugin under `packages/plugin-demo/src/`. Where
[`global-setup.md`](./global-setup.md) documents the
**suite's pre-flight boundary** (validate the seeded admin
credentials, mint two persisted authentication storage states,
write them to `apps/web-e2e/auth-states/`) and
[`global-teardown.md`](./global-teardown.md) documents the
**suite's post-flight boundary** (today a deliberate no-op
placeholder), this page documents the **suite's shared-data
boundary** — every constant, generator, env-var name, and path
the rest of the suite reads through.

## At a glance

| Export                          | Type                                  | What it is                                                                                                                                                                                                                       | Why it matters                                                                                                                                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `requireEnv(name)`              | `(name: string) => string`            | Private helper that throws on a missing or empty env-var with a contributor-actionable message naming the missing key and the file (`.env.local`) it must be set in                                                              | The two seeded admin credentials are the only secrets the suite cannot derive — their absence must surface as a fail-fast error at first use, not as a silent `undefined` that turns into `locator('#email').fill(undefined)` 30 seconds into the run.                                                                                |
| `TEST_DATA.ADMIN_EMAIL`         | `get(): string` accessor              | Lazy getter calling `requireEnv('SEED_ADMIN_EMAIL')` so the env-var read happens at access time, not at module load                                                                                                              | Tests that do not need admin credentials must not be punished by a missing `SEED_ADMIN_EMAIL` env-var. The lazy-getter pattern means a contributor running `pnpm test:e2e:chromium -- public/` against a fresh checkout sees no error from the unused admin credential read.                                                          |
| `TEST_DATA.ADMIN_PASSWORD`      | `get(): string` accessor              | Lazy getter calling `requireEnv('SEED_ADMIN_PASSWORD')`                                                                                                                                                                          | Same lazy-getter rationale as `ADMIN_EMAIL`. The two getters together are the entire surface `global-setup.ts`'s admin sign-in flow uses to drive `/auth/signin`.                                                                                                                                                                       |
| `TEST_DATA.CLIENT_PASSWORD`     | `string` literal                      | The static password every per-run client account is created with (`'TestClient123!'`)                                                                                                                                            | The client password does not need to vary per run because each run uses a unique email, so the password is irrelevant to identity. Hard-coding it removes one moving part from the per-run client sign-up flow and makes failed sign-ups immediately reproducible from the trace.                                                                                       |
| `TEST_DATA.generateClientEmail` | `() => string` factory                | Returns a unique-per-call address shaped `e2e-client-${Date.now()}-${randomSuffix}@test.local` where `randomSuffix` is a 6-char base-36 slice of `Math.random()`                                                                  | Parallel workers each call this factory at run start; the millisecond-precision timestamp + 6-char suffix gives ~36⁶ ≈ 2.2B values per millisecond. The `@test.local` TLD is reserved (RFC 6761), so a stray account never accidentally receives an email from a real-world delivery service.                                          |
| `TEST_DATA.generateItemName`    | `() => string` factory                | Returns a unique-per-call item title shaped `E2E Test Item ${Date.now()}-${randomSuffix}`                                                                                                                                        | Item-creation specs need a name that does not collide with other workers or with the seeded fixtures; the timestamp + 4-char suffix gives ~36⁴ ≈ 1.7M values per millisecond, ample for the suite's volume.                                                                                                                          |
| `TEST_DATA.generateItemUrl`     | `() => string` factory                | Returns a unique-per-call URL shaped `https://e2e-test-${Date.now()}.example.com`                                                                                                                                                | Item-URL fields validate as URLs at the API layer; the `example.com` apex is reserved by IANA (RFC 2606), so the URL never resolves and never accidentally sends traffic to a real site.                                                                                                                                              |
| `REQUIRED_ENV_VARS`             | `readonly string[]` literal           | The whitelist consumed by [`global-setup.md`](./global-setup.md)'s `promptForMissingEnv()` step (`['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD']`)                                                                                  | The two getters above and this whitelist must stay in lock-step — adding a third required env-var without adding it here means `promptForMissingEnv()` does not prompt for it and the suite fails 30 seconds in instead of failing-fast at pre-flight.                                                                                |
| `PUBLIC_ROUTES`                 | `readonly { path; name }[]` literal   | The 13-row table of every public route the navigation shell links to (`/`, `/discover/1`, `/categories`, `/tags`, `/collections`, `/pricing`, `/about`, `/help`, `/privacy-policy`, `/terms-of-service`, `/cookies`, `/auth/signin`, `/auth/register`) | The public-shell smoke spec under `apps/web-e2e/tests/public/` iterates this table to assert each route returns < 500. Adding a public route to the navigation without adding it here means the new route ships without smoke coverage; removing one without removing it here means the next smoke run hits a 404 the route legitimately produces. |
| `AUTH_STATE_DIR`                | `string` literal `'auth-states'`      | The relative directory the per-run global setup writes admin and client storage states into                                                                                                                                      | Centralising the path means a future move from `auth-states/` to `.auth/` is a one-line edit, and the failure matrix in [`global-setup.md`](./global-setup.md) can pin the same constant rather than the literal string.                                                                                                                                                                                                                                                                |
| `ADMIN_STATE_FILE`              | `string` literal `'auth-states/admin.json'` | The relative path the admin storage state is written to and read from                                                                                                                                                            | Every authenticated admin spec uses `test.use({ storageState: ADMIN_STATE_FILE })` to skip the per-test sign-in. Centralising the path means the file rename never silently breaks a spec.                                                                                                                                                                                                                                                                                              |
| `CLIENT_STATE_FILE`             | `string` literal `'auth-states/client.json'` | The relative path the client storage state is written to and read from                                                                                                                                                           | Same rationale as `ADMIN_STATE_FILE`, applied to the per-run client account.                                                                                                                                                                                                                                                                                                                                                                                                            |

## The full file, annotated

```ts
function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}. Set it in .env.local`);
	}
	return value;
}
```

The `requireEnv()` helper is the **fail-fast guard** for every
env-var read in the module. Three properties are load-bearing:

1. **The empty-string check is `!value`, not `value === undefined`.**
   `process.env[name]` returns `undefined` for an unset variable
   and `''` for a set-but-empty one. Both cases must error
   because both produce a `locator('#email').fill('')` /
   `goto('')` failure 30 seconds in. The `!value` check catches
   both in one expression.
2. **The error message names the variable AND the file.** A
   contributor running the suite for the first time sees `Missing
   required environment variable: SEED_ADMIN_EMAIL. Set it in
   .env.local` and immediately knows which key to add and which
   file to add it to. Any vaguer message (`Missing env var` /
   `Configuration error`) shifts the cost from the helper to the
   contributor's debugging time.
3. **The function is private — not exported.** Other modules
   that need an env-var read should add their own `TEST_DATA`
   getter that calls into this helper, not import the helper
   directly. The single-source-of-truth posture means there is
   exactly one function in the suite that knows how to read an
   env-var with a fail-fast guard.

```ts
export const TEST_DATA = {
	get ADMIN_EMAIL(): string {
		return requireEnv('SEED_ADMIN_EMAIL');
	},
	get ADMIN_PASSWORD(): string {
		return requireEnv('SEED_ADMIN_PASSWORD');
	},
	CLIENT_PASSWORD: 'TestClient123!',
	generateClientEmail: () =>
		`e2e-client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
	generateItemName: () =>
		`E2E Test Item ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
	generateItemUrl: () =>
		`https://e2e-test-${Date.now()}.example.com`,
};
```

The `TEST_DATA` object is the **single import** every spec
reaches for. Six properties, three categories:

1. **Two lazy admin-credential getters.** `ADMIN_EMAIL` and
   `ADMIN_PASSWORD` are getters, not properties, because their
   values must be read **at access time** and not at module-load
   time. A spec that does not need admin credentials (a public
   smoke spec, an unauthenticated API spec) imports `TEST_DATA`
   for `generateClientEmail()` and never touches the getters; a
   missing `SEED_ADMIN_EMAIL` env-var must not break that spec.
   Property assignment (`ADMIN_EMAIL: requireEnv(...)`) would
   evaluate at module load and break every spec, even the ones
   that do not need admin credentials.
2. **One static client password.** `CLIENT_PASSWORD` is a hard-coded
   string because the per-run client account uses a unique email
   (so the password is irrelevant to identity), and a static
   password makes failed sign-ups immediately reproducible from
   the trace (the contributor can paste the password into the UI
   and reproduce the failure manually in 5 seconds).
3. **Three unique-per-call generators.** Each generator returns a
   new value on every call; parallel workers each call them at
   run start and never collide. The shape is `${prefix}-${Date.now()}-${randomSuffix}`
   with a millisecond timestamp and a base-36 random suffix:
    - `generateClientEmail()` — 6-char suffix, ~36⁶ ≈ 2.2B
      values per millisecond. The `@test.local` TLD is reserved
      (RFC 6761), so the address never accidentally receives a
      real email.
    - `generateItemName()` — 4-char suffix, ~36⁴ ≈ 1.7M values
      per millisecond. Sufficient because parallel workers
      create dozens of items per run, not millions.
    - `generateItemUrl()` — no random suffix because the
      timestamp alone gives millisecond uniqueness across
      workers, and a URL must be syntactically valid (URLs do
      not accept arbitrary characters in the host segment, so
      the suffix would have to be base-16 or constrained). The
      `example.com` apex is reserved by IANA (RFC 2606), so the
      URL never resolves and never sends traffic.

```ts
export const REQUIRED_ENV_VARS = ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'] as const;
```

The whitelist
[`global-setup.md`](./global-setup.md)'s
`promptForMissingEnv()` step walks at pre-flight time. Two
properties are load-bearing:

1. **The list is `as const`** so TypeScript narrows the array
   element type to the string literals (not just `string[]`).
   This means a contributor who renames `SEED_ADMIN_EMAIL` in
   the env-file but forgets to update the constant gets a
   compile-time error from any other module that calls
   `requireEnv('SEED_ADMIN_EMAIL')` against an `as const`
   compare.
2. **The list is the single source of truth** for the
   pre-flight prompt. Adding a third required env-var (a
   `SEED_DATABASE_URL` for a future per-run database fixture, a
   `SEED_STRIPE_KEY` for a future payment-flow test) means
   adding it here and adding a matching `TEST_DATA` getter — the
   pre-flight prompt picks up the new key automatically because
   it iterates this constant.

```ts
export const PUBLIC_ROUTES = [
	{ path: '/', name: 'Home' },
	{ path: '/discover/1', name: 'Discover Page 1' },
	{ path: '/categories', name: 'Categories' },
	{ path: '/tags', name: 'Tags' },
	{ path: '/collections', name: 'Collections' },
	{ path: '/pricing', name: 'Pricing' },
	{ path: '/about', name: 'About' },
	{ path: '/help', name: 'Help' },
	{ path: '/privacy-policy', name: 'Privacy Policy' },
	{ path: '/terms-of-service', name: 'Terms of Service' },
	{ path: '/cookies', name: 'Cookies' },
	{ path: '/auth/signin', name: 'Sign In' },
	{ path: '/auth/register', name: 'Register' },
] as const;
```

The 13-row table of every public route the navigation shell
links to. Three properties are load-bearing:

1. **The `name` field is human-readable, not a route slug.**
   Public-shell smoke specs use the name in test descriptions
   (`test('renders Home', ...)`), so the value matches what a
   contributor would type when reading the test report.
2. **`/discover/1` is included specifically as a paginated
   route.** Future contributors who add a page-2 / page-N test
   should not add `/discover/2` here — the smoke matrix asserts
   "the route returns" not "the route returns the right page",
   so `/discover/1` is sufficient and adding more rows would
   slow the suite without buying coverage.
3. **The list is `as const`** so the `path` and `name` fields
   are typed as the string literals rather than `string`. A spec
   that asserts on `route.name === 'Home'` gets type-narrowing
   help from the compiler.

```ts
export const AUTH_STATE_DIR = 'auth-states';
export const ADMIN_STATE_FILE = `${AUTH_STATE_DIR}/admin.json`;
export const CLIENT_STATE_FILE = `${AUTH_STATE_DIR}/client.json`;
```

The three path constants the per-run global setup writes to and
every authenticated spec reads from. Three properties are
load-bearing:

1. **The directory and the files are derived from one constant.**
   `ADMIN_STATE_FILE` and `CLIENT_STATE_FILE` are template-literal
   compositions of `AUTH_STATE_DIR` plus the per-role file name.
   A future move from `auth-states/` to `.auth/` is a one-line
   edit; both file constants update automatically.
2. **The paths are relative, not absolute.** Playwright's
   `storageState({ path })` resolves relative paths against the
   `webServer.cwd` set by
   [`playwright-config.md`](./playwright-config.md), which is the
   monorepo root. The relative paths therefore land at
   `<repo>/apps/web-e2e/auth-states/admin.json` etc. — exactly
   the location the e2e suite's `.gitignore` rules out and the
   directory `global-setup.ts`'s `mkdirSync(AUTH_STATE_DIR, {
   recursive: true })` creates.
3. **The directory matches the `.gitignore` entry.** A future
   move to `.auth/` requires updating both this file and the
   suite's `.gitignore` in the same PR; missing one means the
   per-run admin credential file leaks into a contributor's `git
   status` output.

## Why the lazy-getter pattern for the admin credentials

The naive shape would be:

```ts
export const TEST_DATA = {
	ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL ?? '',  // wrong
	ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD ?? '',  // wrong
	// ...
};
```

This fails three different ways:

1. **It evaluates at module load time.** Every spec that imports
   `TEST_DATA` triggers the `process.env` read, even specs that
   never touch admin credentials. A contributor running `pnpm
   test:e2e:chromium -- public/` against a fresh checkout (no
   `SEED_ADMIN_EMAIL` set yet) would get an unhelpful error
   from a spec that does not even need the credentials.
2. **The `?? ''` fallback turns the error into a silent
   `''` propagation.** `locator('#email').fill('')` does not
   throw — it just submits the form with an empty email field
   and waits 30 seconds for a redirect that never happens. The
   contributor sees a `waitForURL timeout` 30 seconds in
   instead of a `Missing required environment variable:
   SEED_ADMIN_EMAIL` error at the first call.
3. **The `??` fallback makes the type `string` rather than
   `string | undefined`.** TypeScript loses the warning that
   the value might be missing, which removes the type-check
   safety net.

The lazy-getter pattern (`get ADMIN_EMAIL(): string { return
requireEnv('SEED_ADMIN_EMAIL'); }`) fixes all three:

1. The `process.env` read happens at access time, not module
   load. A spec that never accesses the getter never triggers
   the read.
2. `requireEnv()` throws on `undefined` and on `''`, so the
   error surfaces at the first access with a contributor-actionable
   message.
3. The return type is `string`, not `string | undefined`, so
   downstream code does not need to narrow.

The cost is one indirection (`TEST_DATA.ADMIN_EMAIL` calls
`requireEnv()`) which is negligible. The benefit is a fail-fast
error with a contributor-actionable message at the first
access — the cheapest possible feedback loop.

## Why the generators use `Date.now()` + base-36 random

The shape is:

```ts
() => `e2e-client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`
```

Three alternatives were considered:

1. **`crypto.randomUUID()`.** Rejected because the e2e suite
   targets the browser request layer, not the Node crypto layer,
   and adding `import { randomUUID } from 'crypto'` introduces a
   Node-specific import in a module that is otherwise
   import-free. The current `Math.random().toString(36)` shape
   needs no imports at all.
2. **`@faker-js/faker`'s `faker.internet.email()`.** Rejected
   because Faker generates real-world TLDs (`.com`, `.org`,
   `.net`) which means a stray account could accidentally
   receive a real email if the test database leaks. The current
   `@test.local` TLD is reserved by RFC 6761 specifically for
   testing — no real-world domain ever resolves there. (Faker
   is in the `devDependencies` for other purposes; the
   suite uses it for things that do not need delivery
   isolation.)
3. **Per-worker static emails (`e2e-client-1@test.local`,
   `e2e-client-2@test.local`, ...).** Rejected because the
   seeded database accumulates one row per run and per-worker
   static emails would collide with the previous run's
   account, requiring a per-run cleanup step that does not
   exist today.

The current `${Date.now()}-${Math.random().toString(36).slice(2,
8)}` shape gives ~36⁶ ≈ 2.2B values per millisecond — orders of
magnitude more than the suite's ~10 worker × ~10 spec ×
~1 sign-up volume per run, with no Node imports and no
delivery-leak risk.

## Why `PUBLIC_ROUTES` is a `readonly` array of objects

The naive shape would be:

```ts
export const PUBLIC_ROUTES = ['/', '/categories', ...];  // wrong
```

The current `{ path, name }` shape pays for itself in three ways:

1. **The `name` field is the test description.** The smoke
   spec iterates the array as `for (const { path, name } of
   PUBLIC_ROUTES) { test(name, ...) }`, so the test report
   shows `Home`, `Categories`, `Sign In` — not `/`,
   `/categories`, `/auth/signin`. A contributor reading a CI
   failure can find the offending test instantly without
   mapping the slug back to the route.
2. **The `name` field stays human-readable across renames.**
   A future move from `/auth/signin` to `/login` updates only
   the `path` field; the `name: 'Sign In'` survives, so the
   test report does not suddenly become `login` (which a
   contributor would not recognise).
3. **The `as const` posture lets the smoke spec type-check
   against the literal values.** A spec that asserts `route.name
   === 'Home'` gets compile-time help from the narrowed string
   literal type — a typo (`'Hom'`) becomes a TypeScript error,
   not a silent test failure.

## Failure matrix

| Mistake                                                              | What surfaces it                                                                                                                                                                                                                                                                                                                                                          | Prevention                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drop the `requireEnv()` empty-string check                          | A `SEED_ADMIN_EMAIL=` (set-but-empty) env-var passes through as `''` and triggers a `locator('#email').fill('')` 30 seconds in. The `waitForURL` never resolves; the failure looks like a flaky redirect.                                                                                                                                                                  | Keep `if (!value)` rather than `if (value === undefined)`. Both `undefined` and `''` must throw.                                                                                                                                                                                                                                       |
| Switch the getters to property assignments                          | `ADMIN_EMAIL: requireEnv('SEED_ADMIN_EMAIL')` evaluates at module load. Every spec that imports `TEST_DATA` — including specs that never touch the admin credentials — fails with the `requireEnv` throw if the env-var is unset.                                                                                                                                          | Keep the lazy-getter shape. Property assignment evaluates at module load; getter evaluates at access time.                                                                                                                                                                                                                              |
| Add a `?? ''` fallback to the env-var reads                          | A missing env-var passes through as `''` and the failure surfaces 30 seconds in as a `waitForURL timeout` instead of immediately as a `Missing required environment variable: ...` error.                                                                                                                                                                                  | Never add a fallback to `requireEnv()`. The fail-fast posture is the entire point of the helper.                                                                                                                                                                                                                                       |
| Switch the client TLD from `@test.local` to `@example.com`           | RFC 6761 reserves `.local` and IANA reserves `example.com`, so neither resolves; the difference is `example.com` accepts `MAIL FROM` (`example.com` MX records do exist), and a stray test account could receive a real email if the test database leaks. `@test.local` has no MX records and never receives mail.                                                          | Keep the `@test.local` TLD. The reserved-TLD posture is the only thing protecting against accidental real-world delivery from a leaked test account.                                                                                                                                                                                    |
| Switch the URL apex from `example.com` to a real domain              | Item-creation specs would create rows with URLs that resolve to a real site; if a future feature pings the URL (a link-validity check, a metadata scrape), the e2e suite would accidentally send traffic to that site.                                                                                                                                                     | Keep `example.com`. RFC 2606 reserves it specifically for documentation and testing; nothing resolves there.                                                                                                                                                                                                                          |
| Drop the `Date.now()` prefix from a generator                       | `Math.random().toString(36).slice(2, 8)` alone gives only ~2.2B unique values across the **lifetime** of the suite, not per millisecond. Two parallel workers calling the generator within the same millisecond have a non-trivial collision probability over a long-enough run.                                                                                            | Keep the `Date.now()-${random}` shape. The timestamp + random is the cheapest possible collision-free generator.                                                                                                                                                                                                                       |
| Add a required env-var to `requireEnv()` calls without updating `REQUIRED_ENV_VARS` | The pre-flight `promptForMissingEnv()` step in [`global-setup.md`](./global-setup.md) walks `REQUIRED_ENV_VARS` to prompt the contributor; missing the new entry means the prompt never asks for it and the suite fails 30 seconds in.                                                                                                                                       | Keep the two surfaces (`requireEnv()` calls and `REQUIRED_ENV_VARS`) in lock-step. Adding a third required env-var means adding a getter, adding the env-var to the array, and updating `global-setup.md`'s table in the same PR.                                                                                                       |
| Drop `as const` from `REQUIRED_ENV_VARS` or `PUBLIC_ROUTES`          | TypeScript widens the literal types to `string`, removing the compile-time safety net against typos. A spec that asserts `route.name === 'Hom'` becomes a silent test failure rather than a TypeScript error.                                                                                                                                                              | Keep the `as const` posture on every literal-array export.                                                                                                                                                                                                                                                                              |
| Add a public route to the navigation without adding it to `PUBLIC_ROUTES` | The new route ships without smoke coverage. The first regression that breaks it lands in production unobserved.                                                                                                                                                                                                                                                          | Treat `PUBLIC_ROUTES` as the public-routes contract. Every public route the navigation links to must be in this list.                                                                                                                                                                                                                  |
| Remove a route from the navigation without removing it from `PUBLIC_ROUTES` | The next smoke run hits a 404 the route legitimately produces. The smoke matrix's `< 500` assertion still passes (404 < 500), but the test report shows a green run for a now-gone route.                                                                                                                                                                                | Treat `PUBLIC_ROUTES` as the public-routes contract. Removing a public route requires removing it here in the same PR.                                                                                                                                                                                                                  |
| Hard-code `'auth-states'` in `global-setup.ts` instead of importing | A future move from `auth-states/` to `.auth/` becomes a multi-file edit. Missing one file means the per-run admin credential file leaks into a contributor's `git status` output, or the per-test `test.use({ storageState })` calls cannot find the file.                                                                                                                | Always import `AUTH_STATE_DIR` / `ADMIN_STATE_FILE` / `CLIENT_STATE_FILE` from this module. The constant is the single source of truth.                                                                                                                                                                                                |
| Switch the `CLIENT_PASSWORD` from a hard-coded string to a generator | Failed sign-ups become harder to reproduce manually. The contributor sees a `Sign-up failed` error in the trace and has to find the password in the trace's request body to reproduce.                                                                                                                                                                                    | Keep `CLIENT_PASSWORD` static. Per-run uniqueness comes from the email; the password does not need to vary.                                                                                                                                                                                                                            |
| Move the file from `apps/web-e2e/helpers/test-data.ts` to `apps/web-e2e/test-data.ts` | The hard-coded `from './helpers/test-data'` imports in [`global-setup.md`](./global-setup.md) and every spec stop resolving. The suite fails to load with `Cannot find module './helpers/test-data'`.                                                                                                                                                                       | Keep the file under `apps/web-e2e/helpers/`. The convention is that suite-internal helpers live under `helpers/`, page objects under `page-objects/`, and fixtures under `fixtures/`.                                                                                                                                                  |
| Export `requireEnv` and call it from another module                  | Multiple modules each gain their own opinion of what "missing env-var" means; the error message drifts, the empty-string check drifts, the fail-fast posture drifts.                                                                                                                                                                                                       | Keep `requireEnv` private to this module. Other modules that need an env-var read should add a getter on `TEST_DATA` (or a sibling object) that calls `requireEnv` indirectly.                                                                                                                                                          |

## Per-line walkthrough

| Lines | Element                                                                      | What it does                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–7   | `function requireEnv(name: string): string { ... }`                          | Private fail-fast env-var helper. The `!value` check catches both `undefined` and `''`. The error message names the variable AND the file it must live in. Not exported — single source of truth for env-var reads.                                                                                                                                                                                                            |
| 9–10  | `export const TEST_DATA = { ... }`                                           | The single object every spec reaches for. Six properties: two lazy admin-credential getters, one static client password, three unique-per-call generators.                                                                                                                                                                                                                                                                  |
| 10–12 | `get ADMIN_EMAIL(): string { return requireEnv('SEED_ADMIN_EMAIL'); }`        | Lazy getter so the env-var read happens at access time, not module load. Specs that never touch admin credentials never trigger the throw.                                                                                                                                                                                                                                                                                  |
| 13–15 | `get ADMIN_PASSWORD(): string { return requireEnv('SEED_ADMIN_PASSWORD'); }`  | Same lazy-getter rationale as `ADMIN_EMAIL`.                                                                                                                                                                                                                                                                                                                                                                                |
| 16    | `CLIENT_PASSWORD: 'TestClient123!'`                                           | Static client password. Per-run uniqueness comes from the email; the password is irrelevant to identity. Hard-coded for reproducibility from trace.                                                                                                                                                                                                                                                                          |
| 17–18 | `generateClientEmail: () => \`e2e-client-${Date.now()}-${randomSuffix}@test.local\`` | Unique-per-call factory. Millisecond timestamp + 6-char base-36 random gives ~2.2B values per ms. `@test.local` (RFC 6761) prevents accidental delivery.                                                                                                                                                                                                                                                                  |
| 19–20 | `generateItemName: () => \`E2E Test Item ${Date.now()}-${randomSuffix}\``      | Unique-per-call factory. 4-char suffix is sufficient for the suite's volume.                                                                                                                                                                                                                                                                                                                                                |
| 21–22 | `generateItemUrl: () => \`https://e2e-test-${Date.now()}.example.com\``         | Unique-per-call factory. No random suffix because the timestamp alone gives ms-precision uniqueness, and URL hostnames have syntactic constraints. `example.com` (RFC 2606) prevents accidental traffic.                                                                                                                                                                                                                |
| 25    | `export const REQUIRED_ENV_VARS = ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'] as const;` | The whitelist [`global-setup.md`](./global-setup.md) walks at pre-flight. `as const` narrows to string literals.                                                                                                                                                                                                                                                                                                            |
| 27–41 | `export const PUBLIC_ROUTES = [{ path, name }, ...] as const;`                 | The 13-row table of every public route the navigation shell links to. Used by every public-shell smoke spec to assert each route returns < 500. `name` is human-readable so the test report makes sense at a glance.                                                                                                                                                                                                          |
| 43    | `export const AUTH_STATE_DIR = 'auth-states';`                                 | The relative directory the per-run global setup writes admin and client storage states into. Single source of truth for the directory name.                                                                                                                                                                                                                                                                                |
| 44    | `export const ADMIN_STATE_FILE = \`${AUTH_STATE_DIR}/admin.json\`;`           | Composed from `AUTH_STATE_DIR` so a future directory rename is a one-line edit. Used by `test.use({ storageState: ADMIN_STATE_FILE })` in every authenticated admin spec.                                                                                                                                                                                                                                                       |
| 45    | `export const CLIENT_STATE_FILE = \`${AUTH_STATE_DIR}/client.json\`;`         | Same composition rationale as `ADMIN_STATE_FILE`, applied to the per-run client account.                                                                                                                                                                                                                                                                                                                                    |

## `test-data.ts`-change checklist

When this file's exports change — when a new env-var becomes
required, when a new public route ships, when a new generator is
added, when the auth-states path moves — any of the following
deserves the same change in the same PR:

- **Cross-check [`global-setup.md`](./global-setup.md).** The
  pre-flight `promptForMissingEnv()` step walks
  `REQUIRED_ENV_VARS`, the admin sign-in flow uses
  `TEST_DATA.ADMIN_EMAIL` / `TEST_DATA.ADMIN_PASSWORD`, the
  client sign-up flow uses `TEST_DATA.generateClientEmail()` /
  `TEST_DATA.CLIENT_PASSWORD`, and the `storageState({ path })`
  writes use `ADMIN_STATE_FILE` / `CLIENT_STATE_FILE` /
  `AUTH_STATE_DIR`. Every change here may need a matching change
  there.
- **Cross-check [`global-teardown.md`](./global-teardown.md).**
  When the no-op teardown grows into a real cleanup sequence,
  the cleanup buckets will use the same constants
  (`AUTH_STATE_DIR` for the directory rm, the per-run client
  email for the user-row delete). Future-friendly imports keep
  the teardown in lock-step.
- **Cross-check [`playwright-config.md`](./playwright-config.md).**
  The `webServer.cwd` resolves the relative paths in
  `ADMIN_STATE_FILE` / `CLIENT_STATE_FILE`; a change to `cwd`
  changes where the storage-state files actually land on disk.
- **Cross-check [`e2e-tsconfig.md`](./e2e-tsconfig.md).** The
  `include: ["./**/*.ts"]` glob already picks up
  `helpers/test-data.ts`. If the glob narrows or if the file
  moves, the type-checker stops walking the file and a future
  rename's type errors slip past `pnpm tsc --noEmit`.
- **Cross-check the suite's `.gitignore`.** `AUTH_STATE_DIR`'s
  value (`auth-states`) must match the `.gitignore` entry that
  excludes per-run admin credential files from `git status`.
  Renaming the directory means renaming the gitignore entry.
- **Cross-check the per-public-route smoke spec under
  `apps/web-e2e/tests/public/`.** The spec iterates
  `PUBLIC_ROUTES`; adding or removing a route means re-running
  the spec to confirm the route returns `< 500`.
- **Cross-check `apps/web/.env.example` and the workspace
  README.** A new `REQUIRED_ENV_VARS` entry must also appear in
  `.env.example` (so a contributor running `pnpm install` for
  the first time sees the variable in the example) and in the
  README's "Required environment variables" section.
- **Run `pnpm tsc --noEmit` from `apps/web-e2e/`** to confirm
  the change type-checks under the e2e tsconfig posture.
- **Run `pnpm tsc --noEmit` from the workspace root** to confirm
  the workspace-wide type-checker also picks up the change.
- **Run a smoke-subset Playwright run** (`pnpm
  test:e2e:chromium -- --grep '@smoke'`) and confirm the
  pre-flight prompt walks the new env-var, the admin sign-in /
  client sign-up flows still pass, and `auth-states/` still
  contains both `admin.json` and `client.json` after the run.
- **Add a [`docs/log.md`](../log.md) entry** describing the
  change (newest at the top, `YYYY-MM-DD docs/plugins
  e2e-test-data:` prefix).
- **Cross-link the change to
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)**
  if the change introduces a new shared concept (a new generator
  family, a new state-file pair, a new env-var family). The spec
  is the authoritative living document for the e2e suite's
  behaviour.
- **Reviewer pass.** A second pair of eyes on the matched
  changes (this file + `global-setup.md` cross-link + `.env.example`
  propagation + log entry) catches half-applied changes the
  contributor missed.

## Cross-references

- [`apps/web-e2e/helpers/test-data.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/helpers/test-data.ts)
  — the file this page documents.
- [`global-setup.md`](./global-setup.md) — the pre-flight hook
  that consumes `TEST_DATA`, `REQUIRED_ENV_VARS`,
  `ADMIN_STATE_FILE`, `CLIENT_STATE_FILE`, and `AUTH_STATE_DIR`.
- [`global-teardown.md`](./global-teardown.md) — the post-flight
  hook (today a no-op placeholder) that will consume the same
  constants when it grows into a real cleanup sequence.
- [`playwright-config.md`](./playwright-config.md) — the runner
  config whose `webServer.cwd` resolves the relative paths in
  `ADMIN_STATE_FILE` / `CLIENT_STATE_FILE`.
- [`e2e-tsconfig.md`](./e2e-tsconfig.md) — the tsconfig whose
  `include` glob picks up this file.
- [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  — the authoritative living spec for the e2e suite.
- [`docs/log.md`](../log.md) — the running change log; every
  edit to this file or its source belongs there too.
