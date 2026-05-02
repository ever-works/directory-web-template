---
id: global-teardown
title: Playwright Global Teardown (`apps/web-e2e/global-teardown.ts`)
sidebar_label: Global teardown
sidebar_position: 32
---

# Playwright Global Teardown (`apps/web-e2e/global-teardown.ts`)

> **Status.** Authoritative reference for the Playwright e2e
> suite's per-run global teardown defined in
> [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
> and elaborated by
> [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion).
> The teardown is locked by
> [`apps/web-e2e/global-teardown.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/global-teardown.ts),
> which today is a deliberate **no-op placeholder** — an empty async
> function that exists to reserve the slot Playwright will call
> exactly once after the last test in any run, regardless of the
> number of files, projects, or workers, and to give a future
> contributor the file path the runner already imports the moment
> the suite needs to clean up the artefacts the per-run global
> setup mints (`auth-states/admin.json`, `auth-states/client.json`,
> the throw-away client account `TEST_DATA.generateClientEmail()`
> writes against `/auth/register`, the half-written
> `apps/web-e2e/test-results/` files Playwright drops on a crash,
> and any future per-run database fixture the suite seeds).
> When that future contributor lifts the no-op into a real
> teardown, update **this** page in the same change so the doc and
> the file cannot drift.

`apps/web-e2e/global-teardown.ts` is the **per-suite global
teardown hook** that the Playwright CLI
([`@playwright/test`](https://playwright.dev/docs/api/class-test))
calls exactly once after the last test in any run, regardless of
the number of files, projects, or workers. It is the
**post-flight companion** to
[`apps/web-e2e/global-setup.ts`](./global-setup.md) (which mints
the two persisted authentication storage states by driving a real
Chromium browser against the host web app's `/auth/signin` and
`/auth/register` screens) and is wired into the runner by the
`globalTeardown` field of
[`apps/web-e2e/playwright.config.ts`](./playwright-config.md):

```ts
globalTeardown: path.resolve(__dirname, './global-teardown.ts'),
```

The config locks the runtime boundary; the global setup locks the
**pre-flight boundary**; this file locks the **post-flight
boundary** — what the runner does once after the last test, in
what order, with what failure modes — even when, today, the
answer is *nothing*.

This page is the **per-source-file reference** that pairs with
[`apps/web-e2e/global-teardown.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/global-teardown.ts)
the same way
[`global-setup.md`](./global-setup.md) pairs with
`apps/web-e2e/global-setup.ts`,
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
`apps/web-e2e/auth-states/`), this page documents the **suite's
post-flight boundary** — which today is `async function
globalTeardown() { /* placeholder */ }` and an `export default
globalTeardown`, and tomorrow may grow into a real cleanup
sequence.

## At a glance

| Step                                     | What happens today                                                                                           | What it reserves the slot for                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `async function globalTeardown()`        | Declares an async function with an empty body and a single `// Placeholder for future cleanup` comment       | Playwright's `globalTeardown` contract is `() => Promise<void> \| void` — an empty `async` function satisfies the type and lets a future contributor add `await` calls without a refactor. |
| `// Placeholder for future cleanup`      | Single-line marker comment naming the intent: future cleanup (e.g., test database reset)                     | A future contributor sees the slot is intentional, not abandoned. The "test database reset" hint is a concrete example of the kind of work that belongs here.                              |
| `export default globalTeardown`          | Default export of the function reference so the Playwright runner can resolve `globalTeardown:` in the config | The `globalTeardown:` field in [`playwright-config.md`](./playwright-config.md) imports this file by absolute path and expects a default-exported function — not a named export.           |

## The full file, annotated

```ts
async function globalTeardown() {
	// Placeholder for future cleanup (e.g., test database reset)
}

export default globalTeardown;
```

The file locks four boundaries:

1. **The function shape** — `async function globalTeardown()` with
   no parameter list. Playwright's
   [`globalTeardown` contract](https://playwright.dev/docs/test-global-setup-teardown)
   is `(config: FullConfig) => Promise<void> | void`. The current
   no-op ignores `config` because there is nothing to clean up;
   any future implementation that needs the resolved `baseURL`,
   the project list, or the `outputDir` can add `(config:
   FullConfig)` to the parameter list without breaking the
   default export.
2. **The empty body with a marker comment** — the only line
   inside the body is `// Placeholder for future cleanup (e.g.,
   test database reset)`. The comment is load-bearing: it
   prevents a contributor from deleting the file under the
   assumption that an empty async function is dead code, and it
   names a concrete cleanup example so the next contributor has a
   starting point.
3. **The default export** — `export default globalTeardown`. The
   Playwright runner calls `(await import(globalTeardown)).default`,
   so a switch to a named export
   (`export { globalTeardown }`) would produce a runtime
   `TypeError: undefined is not a function` the moment the runner
   tries to call it. The default export is the only contract.
4. **No imports** — the file imports nothing because there is
   nothing to clean up today. Adding an import (a database
   client, a `fs.rm` for `auth-states/`, a Stripe test-mode
   sweep) is the natural first step when the no-op is lifted into
   a real teardown.

## Why a no-op placeholder instead of dropping the file

The `globalTeardown` field in
[`apps/web-e2e/playwright.config.ts`](./playwright-config.md) is
**always** wired:

```ts
globalTeardown: path.resolve(__dirname, './global-teardown.ts'),
```

Three options were considered:

1. **Drop the file and the config field.** Rejected because
   adding the field back later requires both a config change and
   a new file in the same PR — two diffs that future contributors
   may forget to write together (the config change without the
   file produces an `ENOENT` on the resolved path, the file
   without the config change produces an unused-file lint
   warning).
2. **Keep the config field but point it at a real
   `noop.ts`.** Rejected because the path name does not
   communicate intent — a future contributor opening
   `playwright.config.ts` would read `globalTeardown:
   path.resolve(__dirname, './noop.ts')` and either wonder why
   the suite has a `noop.ts` file or refactor it away as
   accidental.
3. **Keep the field, keep the file, name it
   `global-teardown.ts`, leave it empty.** Adopted. The
   filename communicates the intent (`global-teardown.ts` is
   clearly the teardown sibling of `global-setup.ts`), the
   marker comment communicates that the emptiness is deliberate,
   and the default-exported async function communicates the
   contract a future implementation must preserve.

The current shape is therefore the **lowest-coupling option**: the
runner is wired today, the file exists today, the contract is
locked today, and a future cleanup PR is one inline edit away.

## What belongs in this file when it stops being a no-op

The cleanup work the placeholder reserves the slot for falls into
five concrete buckets:

1. **Per-run authentication state.** The setup writes
   `apps/web-e2e/auth-states/admin.json` and
   `apps/web-e2e/auth-states/client.json`. They are reused by
   every authenticated spec and a stale file from a prior run can
   silently mask a regression in the sign-in flow. A teardown
   that deletes the directory (`fs.rmSync(AUTH_STATE_DIR, {
   recursive: true, force: true })`) would force every CI run to
   re-mint both states and catch a regression earlier — at the
   cost of one extra Chromium boot per run.
2. **Per-run client account.** The setup signs up a unique client
   account via `TEST_DATA.generateClientEmail()`
   (`e2e-client-${Date.now()}-${randomSuffix}@test.local`). The
   account is never deleted, so the seeded database accumulates
   one row per run. A teardown that calls a hypothetical
   `DELETE /api/admin/users?email=...` (or runs a Drizzle
   `delete()` directly against the `users` table) would keep the
   row count stable.
3. **Per-run Stripe / Polar / LemonSqueezy fixtures.** Any spec
   that creates a real test-mode customer / subscription /
   checkout against the payment provider's sandbox leaves the
   object behind. A teardown that walks the run's fixture log
   and calls each provider's `customers.del(...)` /
   `subscriptions.cancel(...)` would prevent the sandbox from
   filling up.
4. **`apps/web-e2e/test-results/` cleanup on success.** Playwright
   already overwrites the directory on every run, but a crashed
   worker can leave half-written `trace.zip` / `video.webm` /
   `screenshot.png` files that confuse the next run's HTML
   reporter. A teardown that walks the directory and removes
   files older than the current run's start time would prevent
   the cross-pollution.
5. **Test-database snapshot reset.** The setup currently does not
   snapshot the database; a future change might. The teardown
   would then restore the snapshot so the next run starts from a
   known state.

When any of these lift the no-op into a real teardown, the
following invariants must hold:

- **The default export must remain a function returning `void` or
  `Promise<void>`.** The Playwright runner expects nothing else.
- **Failures must be swallowed and logged, not thrown.** A
  thrown error inside `globalTeardown` does not block the run
  (the run already finished) but does mark the run as failed in
  the reporter, which masks the real test outcomes. The
  recommended pattern is `try { ... } catch (err) {
  console.error('[global-teardown]', err); }` per cleanup
  bucket so one failing bucket does not skip the others.
- **Each cleanup must be idempotent.** A re-run after a partial
  failure must not double-delete or double-cancel.
- **The order must be: state files → DB rows → external
  fixtures → output directory.** Removing the auth-state files
  first prevents a future run from reusing them; removing the
  DB rows second clears the row the auth state was for; cleaning
  the external sandbox third prevents drift; cleaning the output
  directory last preserves the trace / video / screenshot files
  on a failed run.

## Why the parameter list is empty today

Playwright's
[`globalTeardown`](https://playwright.dev/docs/test-global-setup-teardown)
signature is:

```ts
type GlobalTeardown = (config: FullConfig) => void | Promise<void>;
```

The current implementation drops the `config` parameter because
the no-op does not need it. A future implementation that needs
the resolved `baseURL` (for an HTTP cleanup call), the project
list (to walk per-project artefacts), or the `outputDir` (to
target the `test-results/` cleanup) can add `(config: FullConfig)`
without breaking the default export. The parameter list is
therefore not load-bearing today — but it is the natural place
for a future implementation to receive the runtime context.

## Why `globalTeardown` is not allowed to throw

Throwing inside `globalTeardown` is legal — Playwright catches
the error, marks the run as failed, and prints the stack — but
it is **never the right call** for a teardown:

1. The run is already over by the time `globalTeardown` runs.
   Marking it failed because of a cleanup error overwrites the
   real test outcomes in the reporter.
2. A failing cleanup is almost always non-fatal (a DB row was
   already deleted, a Stripe customer was already cancelled, an
   auth-state file was already removed). Throwing escalates a
   no-op to a hard failure.
3. CI reruns the failed run, which re-runs the entire suite, not
   just the cleanup — which wastes ~30 minutes of CI time on a
   problem that does not affect the next run.

The recommended pattern for any future implementation is therefore:

```ts
async function globalTeardown(_config: FullConfig) {
	try {
		// best-effort cleanup bucket #1
	} catch (err) {
		console.error('[global-teardown] bucket #1 cleanup failed:', err);
	}

	try {
		// best-effort cleanup bucket #2
	} catch (err) {
		console.error('[global-teardown] bucket #2 cleanup failed:', err);
	}
}
```

Per-bucket `try / catch` instead of a single outer `try / catch`
so one failing bucket does not skip the others.

## Why `globalTeardown` runs once, not per-worker

Playwright distinguishes:

- `globalSetup` / `globalTeardown` — run **once per run**,
  before the first test and after the last test, regardless of
  the number of workers.
- `setup` / `teardown` (project-level) — run once per project.
- `beforeAll` / `afterAll` (file-level) — run once per worker
  per file.
- `beforeEach` / `afterEach` (test-level) — run once per test.

The teardown belongs at the global level because the cleanup
buckets it reserves the slot for are **shared per-run state**,
not per-worker or per-file:

- The `auth-states/` directory is shared by every worker.
- The throw-away client account is shared by every worker.
- The Stripe / Polar / LemonSqueezy sandbox is shared by every
  worker.
- The `test-results/` directory is shared by every worker.

Pushing the cleanup down to project / file / test level would
multiply the work by the worker count and produce race conditions
on the shared state.

## Failure matrix

| Mistake                                                          | What surfaces it                                                                                                                                                                                                                                          | Prevention                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drop the file                                                    | Playwright resolves the path in `playwright-config.md` to a missing file → `ENOENT: no such file or directory, open '<repo>/apps/web-e2e/global-teardown.ts'` at the start of every run. The runner aborts before `globalSetup` is even called.            | Keep the file even if it is a no-op. The placeholder comment names the intent so a future contributor does not delete it under a "dead code" assumption.                                                                                            |
| Drop the `globalTeardown` field from the config                  | The runner skips the teardown silently. Any future cleanup implementation goes unrun. No error message hints at the disconnect.                                                                                                                            | Keep the field wired. The pair (file present, config field present) is the contract; either one alone is broken.                                                                                                                                    |
| Switch the default export to a named export                      | `(await import(globalTeardown)).default` resolves to `undefined`. Playwright calls `undefined()` and crashes with `TypeError: undefined is not a function` at the end of the run, marking the otherwise-green run as failed.                                | Always keep `export default globalTeardown`. A future change that adds named exports (helper functions used elsewhere) must keep the default export of the teardown function.                                                                       |
| Make the function synchronous and throw                          | The thrown error escapes the Playwright runner before it has a chance to print the test report, which produces a confusing "tests passed but the run failed" log.                                                                                          | Keep the function `async`. Wrap each future cleanup bucket in its own `try / catch` and `console.error(err)` instead of throwing.                                                                                                                  |
| Leave the function body completely empty (no comment)            | A future contributor reads an empty async function and removes the file as dead code, breaking the runner's import of the path.                                                                                                                            | Keep the `// Placeholder for future cleanup (e.g., test database reset)` marker comment. It is the file's only protection against well-intentioned cleanup.                                                                                         |
| Move the file to `apps/web-e2e/setup/global-teardown.ts`         | The hard-coded `path.resolve(__dirname, './global-teardown.ts')` in `playwright-config.md` no longer resolves. The runner aborts at start with `ENOENT`.                                                                                                  | Keep the file co-located with `global-setup.ts` at the suite's top level. If the suite ever introduces a `setup/` directory, move both files together and update the config.                                                                       |
| Add a `process.exit(0)` at the end                               | Playwright's reporter does not get a chance to flush the HTML report; the `playwright-report/` directory is left empty and CI shows no test results.                                                                                                       | Never call `process.exit` from a global hook. Return normally and let Playwright shut down.                                                                                                                                                         |
| Hard-code an `await` on a real database client today              | The current local-dev setup does not require a database client. The `await` would fail in environments where the client is not configured (CI without a sandbox, local dev without `DATABASE_URL`).                                                       | Keep the function a no-op until a real cleanup bucket is needed. When one is added, gate it on the relevant env var (`if (!process.env.DATABASE_URL) return;`) so the suite still runs on minimal local-dev configurations.                        |
| Add a `setTimeout` / long-running async wait at the end           | Playwright will wait for the returned promise to resolve. A `setTimeout(..., 60_000)` blocks the runner from exiting for 60 seconds at the end of every run, including in CI, and can produce false "run timed out" results from the surrounding job.       | Keep the teardown synchronous-fast. Cleanup buckets that genuinely take time (large DB sweeps, API pagination) must be split into best-effort, time-bounded calls (`Promise.race([cleanup(), wait(5000)])`) so the teardown can never block the run. |

## Per-line walkthrough

| Line                                                            | What it does                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `async function globalTeardown() {`                             | Declares the teardown function. `async` so the future implementation can `await`. No parameter list because the no-op does not use the `FullConfig` Playwright would pass.                                                                                                                                                                  |
| `\t// Placeholder for future cleanup (e.g., test database reset)` | Single line marker. The "e.g., test database reset" hint is one of five concrete cleanup buckets a future implementation will likely fill (per-run auth states, per-run client account, payment-provider sandbox fixtures, `test-results/` directory cleanup on success, test-database snapshot reset).                                            |
| `}`                                                             | Closes the empty body.                                                                                                                                                                                                                                                                                                                       |
| (blank line)                                                    | Separates the function declaration from the export. No semantic load.                                                                                                                                                                                                                                                                       |
| `export default globalTeardown;`                                | The Playwright contract — `(await import('./global-teardown.ts')).default` must resolve to a function. Switching to `export { globalTeardown }` would silently break the runner.                                                                                                                                                              |

## `global-teardown.ts`-change checklist

When this file's no-op is lifted into a real teardown — or when
the no-op itself changes shape — any of the following deserves
the same change in the same PR:

- **Cross-check [`global-setup.md`](./global-setup.md).** Anything
  the setup mints (`auth-states/admin.json`,
  `auth-states/client.json`, the throw-away client account, any
  future per-run database fixture) is the natural target for the
  teardown. Update both pages so they describe the matched
  pre-flight / post-flight pair.
- **Cross-check [`playwright-config.md`](./playwright-config.md).**
  The `globalTeardown:` field's path resolution is the only
  thing pointing the runner at this file. If the file moves, the
  config moves with it; if the field's resolver shape changes,
  this page describes the new resolution.
- **Cross-check
  [`apps/web-e2e/helpers/test-data.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/helpers/test-data.ts).**
  `AUTH_STATE_DIR`, `ADMIN_STATE_FILE`, `CLIENT_STATE_FILE`, and
  `TEST_DATA.generateClientEmail()` are the constants the
  teardown will use to delete what the setup minted. Any rename
  or move there must be reflected here.
- **Cross-check [`e2e-tsconfig.md`](./e2e-tsconfig.md).** The
  e2e tsconfig's `include: ["./**/*.ts"]` glob already picks up
  `global-teardown.ts`. If the glob ever narrows (to
  `tests/**/*.ts`, for example), the type-checker stops walking
  this file and a future implementation's type errors would slip
  past `pnpm tsc --noEmit`.
- **Run `pnpm tsc --noEmit` from `apps/web-e2e/`** to confirm the
  file still type-checks under the e2e tsconfig posture.
- **Run `pnpm tsc --noEmit` from the workspace root** to confirm
  the workspace-wide type-checker also picks up the change.
- **Run a smoke-subset Playwright run** (`pnpm test:e2e:chromium
  -- --grep '@smoke'`) and confirm that:
    1. The runner starts (no `ENOENT` on the teardown path).
    2. The runner exits cleanly at the end (the teardown returns
       within the per-test timeout, no `process.exit` calls).
    3. The HTML report is written (`playwright-report/index.html`
       exists), proving the reporter still gets a chance to
       flush.
- **Add a [`docs/log.md`](../log.md) entry** describing the
  change (newest at the top, `YYYY-MM-DD docs/plugins
  global-teardown:` prefix).
- **Cross-link the change to
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)**
  if the teardown gains a real cleanup bucket. The spec is the
  authoritative living document for the e2e suite's behaviour;
  any non-trivial teardown work belongs there before it lands in
  this file.
- **Reviewer pass.** A second pair of eyes on the matched pair
  (this file + `playwright-config.md` field + `global-setup.md`
  cross-link + log entry) catches half-applied changes the
  contributor missed.

## Cross-references

- [`apps/web-e2e/global-teardown.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/global-teardown.ts)
  — the file this page documents.
- [`global-setup.md`](./global-setup.md) — the matched pre-flight
  reference.
- [`playwright-config.md`](./playwright-config.md) — the runner
  config that wires this file via `globalTeardown:`.
- [`e2e-tsconfig.md`](./e2e-tsconfig.md) — the tsconfig whose
  `include` glob picks up this file.
- [`apps/web-e2e/helpers/test-data.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/helpers/test-data.ts)
  — the constants and helpers a future teardown will reference.
- [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  — the authoritative living spec for the e2e suite.
- [`docs/log.md`](../log.md) — the running change log; every
  edit to this file or its source belongs there too.
