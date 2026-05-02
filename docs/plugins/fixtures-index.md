---
id: fixtures-index
title: E2E Fixtures Barrel (`apps/web-e2e/fixtures/index.ts`)
sidebar_label: Fixtures barrel
sidebar_position: 36
---

# E2E Fixtures Barrel (`apps/web-e2e/fixtures/index.ts`)

> **Status.** Authoritative reference for the Playwright e2e
> suite's fixtures barrel module defined in
> [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
> and elaborated by
> [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion).
> The barrel is locked by
> [`apps/web-e2e/fixtures/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/fixtures/index.ts),
> which re-exports `test` and `expect` from
> [`auth.fixture.ts`](./auth-fixture.md) so consumers can import
> the suite's authenticated `test` runner from the directory
> rather than the file. When the file's exports change, update
> **this** page in the same change so the doc and the file
> cannot drift.

`apps/web-e2e/fixtures/index.ts` is the **directory-level
public surface** for the suite's `fixtures/` folder. It is the
file that turns the directory from "a folder containing one or
more fixture modules" into a single addressable import target —
`import { test, expect } from '../fixtures'` (or `'../../fixtures'`
from a nested spec) resolves through this barrel and lands on
the same extended `test` runner [`auth-fixture.md`](./auth-fixture.md)
exports. Today the suite's authenticated specs reach for the
`auth.fixture` file directly via
`from '../../fixtures/auth.fixture'`, but the barrel keeps the
"one extended runner per suite" boundary stable: future fixture
modules (per-feature toggles, seeded-data fixtures, multi-locale
context fixtures) will be composed into the same `test` runner
through this barrel rather than scattered across consumers.

This page is the **per-source-file reference** that pairs with
[`apps/web-e2e/fixtures/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/fixtures/index.ts)
the same way
[`auth-fixture.md`](./auth-fixture.md) pairs with
`apps/web-e2e/fixtures/auth.fixture.ts`,
[`global-setup.md`](./global-setup.md) pairs with
`apps/web-e2e/global-setup.ts`,
[`global-teardown.md`](./global-teardown.md) pairs with
`apps/web-e2e/global-teardown.ts`,
[`e2e-test-data.md`](./e2e-test-data.md) pairs with
`apps/web-e2e/helpers/test-data.ts`,
[`playwright-config.md`](./playwright-config.md) pairs with
`apps/web-e2e/playwright.config.ts`,
[`e2e-tsconfig.md`](./e2e-tsconfig.md) pairs with
`apps/web-e2e/tsconfig.json`, and
[`e2e-package-manifest.md`](./e2e-package-manifest.md) pairs with
`apps/web-e2e/package.json`. Where
[`auth-fixture.md`](./auth-fixture.md) documents the
**authenticated-fixture boundary** (how the persisted storage
states minted at pre-flight become per-test isolated browser
contexts), this page documents the **directory-level
fixture-export boundary** — what the `fixtures/` directory
exposes as a single import target, what the import-from-the-file
versus import-from-the-directory shapes guarantee, and how
future fixture modules compose through this barrel.

## At a glance

| Element                                              | Type                | What it is                                                                                                                                                              | Why it matters                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `export { test, expect } from './auth.fixture';`     | re-export statement | A single re-export that forwards both `test` (the extended `base.extend<AuthFixtures>(...)`) and `expect` from [`auth.fixture.ts`](./auth-fixture.md) to consumers      | Lets a future spec write `import { test, expect } from '../../fixtures'` instead of `'../../fixtures/auth.fixture'`. The directory becomes the addressable unit. When a second fixture module lands (e.g. `seed.fixture.ts`), this barrel composes both modules' fixtures into one extended `test` runner without the consumer having to import from two files.                                                                          |
| File extension `.ts` (not `.tsx`)                    | filename suffix     | The barrel is plain TypeScript; it has no JSX content                                                                                                                  | Matches the suite's TS-only posture documented in [`e2e-tsconfig.md`](./e2e-tsconfig.md). The `include: ["./**/*.ts"]` glob picks the file up; a `.tsx` extension would imply JSX scope where none exists.                                                                                                                                                                                                                                |
| Single-line file body                                | physical shape      | The body is one line of source                                                                                                                                         | Keeps the barrel tightly scoped. Adding logic here (helpers, conditional re-exports, computed names) defeats the "directory-level public surface" intent and invites drift from [`auth-fixture.md`](./auth-fixture.md). The barrel is for re-exports only.                                                                                                                                                                              |
| Trailing newline                                     | physical shape      | The file ends with a single trailing newline                                                                                                                            | Matches the workspace's Prettier `endOfLine: lf` posture inherited from the [`workspace-root-manifest.md`](./workspace-root-manifest.md) `prettier` block. A missing trailing newline triggers a Prettier diff during review; a CRLF line-ending triggers the same diff on POSIX CI runners.                                                                                                                                              |

## The full file, annotated

```ts
export { test, expect } from './auth.fixture';
```

The single re-export statement lifts both names from
[`auth.fixture.ts`](./auth-fixture.md) into the directory's
public surface. Three properties are load-bearing:

1. **The re-export forwards both `test` AND `expect`.** A
   barrel that forwards only `test` would break the canonical
   "import both from one place" import shape and re-introduce
   the "imported `test` from one place but `expect` from
   another" anti-pattern that breaks Playwright's test
   soft-failure aggregation (`expect.soft()` relies on the
   `test` context being the same instance the `expect` was
   imported from).
2. **The source path uses a relative `./auth.fixture` reference,
   not a package-rooted self-reference.** The relative shape
   resolves through TypeScript's `moduleResolution: "bundler"`
   posture inherited from
   [`e2e-tsconfig.md`](./e2e-tsconfig.md) without going through
   any `paths` mapping. The suite has no `paths` defined today
   precisely because relative re-exports do not need one; adding
   one would invite the "import from `@/fixtures`" anti-pattern
   from the host app's `apps/web/` boundary.
3. **The re-export does not rename either symbol.** Renaming
   `test` to `e2eTest` (or `expect` to `e2eExpect`) would force
   every consumer to either rename on import (`import { e2eTest as test } from '../../fixtures'`)
   or to use the renamed symbol everywhere, both of which break
   the Playwright runner's contract that the test function be
   named `test`. The bare names are mandatory.

## Why a barrel module instead of importing the file directly

The naive shape would be every spec writes
`import { test, expect } from '../../fixtures/auth.fixture'`
(which several specs do today, since the suite is small and the
barrel did not always exist). This pattern fails three different
ways once the suite grows:

1. **A new fixture module's exports cannot be composed into the
   same `test` runner without touching every consumer.** Suppose
   a future `seed.fixture.ts` extends the test runner with a
   `seededDb` fixture using the same `base.extend<...>(...)`
   pattern but starting from this file's `test` (so the runner
   inherits `adminContext` / `clientContext` / `adminPage` /
   `clientPage` from [`auth-fixture.md`](./auth-fixture.md) AND
   gains `seededDb`). With the barrel, the seed file imports
   the auth fixture and re-exports the new test runner; the
   barrel updates its single re-export line, and every consumer
   automatically sees the composed runner. Without the barrel,
   every consumer must update its import to point at the new
   file, which is a multi-file rename hazard.
2. **A future move of `auth.fixture.ts` to `auth/index.ts` (or
   any other internal restructuring) would force every consumer
   to update its import.** With the barrel, the move is a
   one-line edit to this file; consumers are unchanged. The
   barrel is the indirection layer that absorbs internal
   restructuring.
3. **The "import from the directory" shape is the JavaScript
   ecosystem's lingua franca.** Every Node user, every TypeScript
   user, every editor's auto-import recognizes
   `import { test } from '../../fixtures'`. The barrel teaches
   the suite to speak that lingua franca; importing from the
   `auth.fixture` file directly is a leak of internal structure
   that future readers must learn before they can navigate.

The barrel is the lowest-cost, most-composable shape. The
file-direct import shape is rejected for new specs.

## Why a single re-export and not `export *`

`export * from './auth.fixture'` would also work today (because
the auth fixture exports exactly `test` and `expect`), but it
fails three ways the named re-export does not:

1. **Type-only exports are dropped.** A future
   `auth.fixture.ts` that adds an `export type AuthFixtures`
   (which is the natural place for that type to live) would not
   forward through `export *` cleanly without an additional
   `export type *` companion line. Named re-exports are
   future-proof against the type-export distinction.
2. **The barrel's intent becomes opaque.** A reviewer scanning
   the barrel would see `export *` and have to read
   `auth.fixture.ts` to learn what is being re-exported. The
   named shape `export { test, expect }` documents the surface
   inline.
3. **Implicit re-exports surface accidental additions.** A
   future `auth.fixture.ts` change that adds an internal-only
   helper (`getAuthState()`, `requireAuthState()`, the
   `AUTH_FIXTURES` const) would silently leak through
   `export *` into the barrel's public surface. The named
   re-export hard-blocks the leak.

The named re-export is the lowest-coupling shape. The
`export *` shape is rejected.

## Failure matrix

| Mistake                                                              | What surfaces it                                                                                                                                                                                                                                                                                                | Prevention                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drop the re-export of `expect`                                       | Every consumer's `import { test, expect } from '../../fixtures'` fails to resolve `expect`. TypeScript reports `Module '"../fixtures"' has no exported member 'expect'`.                                                                                                                                       | Keep the dual re-export. Both names must travel together so soft-failure aggregation does not regress.                                                                                                                                                                                                              |
| Drop the re-export of `test`                                         | Every consumer's `import { test }` fails to resolve. The suite cannot author authenticated specs through the barrel.                                                                                                                                                                                          | Keep the `test` re-export. It is the load-bearing export of the file.                                                                                                                                                                                                                                                |
| Switch to `export * from './auth.fixture'`                           | Type-only exports drop silently; future internal helpers leak; the barrel's intent becomes opaque.                                                                                                                                                                                                            | Keep the named re-export shape.                                                                                                                                                                                                                                                                                      |
| Rename `test` to `e2eTest` on the way out                            | Playwright's test discovery still works because the runner finds tests by file, not by symbol — but every spec author's editor flags the `test(...)` calls because the imported symbol is `e2eTest`. Net cost: every spec author has to learn the rename and the suite drifts away from Playwright convention.    | Keep the bare name. Playwright's documented convention is that the imported symbol be named `test`.                                                                                                                                                                                                                |
| Switch the source path to a package-rooted self-reference            | The barrel cannot resolve `'@/fixtures/auth.fixture'` without a `paths` mapping in [`e2e-tsconfig.md`](./e2e-tsconfig.md), which the suite intentionally does not declare. TypeScript reports `Cannot find module`.                                                                                              | Keep the relative `./auth.fixture` path. The relative shape resolves through `moduleResolution: "bundler"` without configuration.                                                                                                                                                                                  |
| Add helper code (constants, helpers, computed names) inside the file | The barrel's "directory-level public surface" intent breaks. Future readers have to walk the barrel's logic before they understand what the directory exposes.                                                                                                                                                | Keep the barrel as re-exports only. Helpers belong in `helpers/test-data.ts` (per [`e2e-test-data.md`](./e2e-test-data.md)); fixture composition belongs in dedicated fixture files re-exported through this barrel.                                                                                              |
| Move the file to `apps/web-e2e/fixtures.ts` (collapse the directory) | The directory shape goes away; future fixture modules cannot live alongside the barrel. Every existing import path through the directory (`../fixtures`, `../../fixtures`) keeps working — Node resolves the file before the directory — but the convention is lost.                                            | Keep the file at `apps/web-e2e/fixtures/index.ts`. The directory is the unit of fixture composition.                                                                                                                                                                                                                 |
| Ship the file with a CRLF line ending                                | Prettier reports the line as a diff on POSIX CI runners; the workspace's `endOfLine: lf` posture (inherited from the [`workspace-root-manifest.md`](./workspace-root-manifest.md) `prettier` block) flags the file.                                                                                              | Keep the file as LF-terminated. The `.editorconfig` (when added) and the workspace Prettier config both pin LF.                                                                                                                                                                                                     |
| Drop the trailing newline                                            | Prettier reports a "missing trailing newline" diff. The CI lint step fails.                                                                                                                                                                                                                                   | Keep the trailing newline. The Prettier default is on; the file passes the lint by virtue of the trailing newline being present.                                                                                                                                                                                    |
| Switch the file extension to `.tsx`                                  | The `include: ["./**/*.ts"]` glob in [`e2e-tsconfig.md`](./e2e-tsconfig.md) does not match `.tsx`; the file falls out of the type-checker's scope. A typo or a future regression silently slips past `pnpm tsc --noEmit`.                                                                                       | Keep the `.ts` extension. The barrel has no JSX content; `.ts` is the correct extension.                                                                                                                                                                                                                          |
| Author a parallel barrel in `helpers/index.ts`                       | Two directory-level public surfaces compete: `helpers/index.ts` versus the file-direct import shape that current consumers use. Specs drift between the two import paths. The "single canonical import shape" convention regresses.                                                                          | Per the doc-question register, the consensus is one barrel per fixture-shaped directory (`fixtures/`); `helpers/` consumers import from the file directly until a clear need for a barrel emerges. Open question for a future maintainer review.                                                                |

## Per-line walkthrough

| Line | Element                                              | What it does                                                                                                                                                            |
| ---- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `export { test, expect } from './auth.fixture';`     | Forwards the extended `test` runner and the `expect` matcher from [`auth-fixture.md`](./auth-fixture.md) into the directory's public surface.                          |

## `index.ts`-change checklist

When this file's re-exports change — when a new fixture module
lands and its exports need to compose through the barrel, when
the source path moves, when a new shared symbol needs to surface
through the directory — any of the following deserves the same
change in the same PR:

- **Cross-check [`auth-fixture.md`](./auth-fixture.md).** Every
  symbol re-exported here originates there today. A new auth
  fixture export must land in `auth.fixture.ts` first, then
  flow through this barrel.
- **Cross-check [`e2e-tsconfig.md`](./e2e-tsconfig.md).** The
  `include: ["./**/*.ts"]` glob already picks up
  `fixtures/index.ts`. If the glob narrows or if the file moves,
  the type-checker stops walking the file and a future
  rename's type errors slip past `pnpm tsc --noEmit`.
- **Cross-check [`e2e-package-manifest.md`](./e2e-package-manifest.md).**
  The package's `devDependencies.@playwright/test` is what
  underwrites the `test` and `expect` types this barrel
  forwards. A Playwright major bump may change the type
  signatures and warrants a re-read of the barrel.
- **Cross-check every consumer.** Today's authenticated specs
  under `apps/web-e2e/tests/admin/` and `apps/web-e2e/tests/client/`
  import from `'../../fixtures/auth.fixture'`. New specs should
  import from `'../../fixtures'` to use the barrel; consumer
  audit on every PR keeps the convention consistent.
- **Run `pnpm tsc --noEmit` from `apps/web-e2e/`** to confirm
  the change type-checks under the e2e tsconfig posture.
- **Run `pnpm tsc --noEmit` from the workspace root** to confirm
  the workspace-wide type-checker also picks up the change.
- **Run a smoke-subset Playwright run** of the admin / client
  spec set (`pnpm test:e2e:chromium -- admin/ client/`) and
  confirm: the runner discovers the same specs as before, the
  authenticated specs see the same fixtures, and trace
  recordings remain isolated per spec.
- **Add a [`docs/log.md`](../log.md) entry** describing the
  change (newest at the top, `YYYY-MM-DD docs/plugins
  fixtures-index:` prefix).
- **Cross-link the change to
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)**
  if the change introduces a new fixture pair that affects test
  authoring conventions. The spec is the authoritative living
  document for the e2e suite's behaviour.
- **Reviewer pass.** A second pair of eyes on the matched
  changes (this file + `auth-fixture.md` cross-link + every
  consumer spec import + log entry) catches half-applied
  changes the contributor missed.

## Cross-references

- [`apps/web-e2e/fixtures/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/fixtures/index.ts)
  — the file this page documents.
- [`auth-fixture.md`](./auth-fixture.md) — the underlying
  fixture file whose `test` and `expect` exports this barrel
  forwards.
- [`global-setup.md`](./global-setup.md) — the pre-flight hook
  that mints the storage-state files the auth fixture reads.
- [`global-teardown.md`](./global-teardown.md) — the post-flight
  hook (today a no-op placeholder).
- [`e2e-test-data.md`](./e2e-test-data.md) — the shared-data
  module that exports the auth-state path constants.
- [`playwright-config.md`](./playwright-config.md) — the runner
  config whose `webServer.cwd` resolves the relative paths.
- [`e2e-tsconfig.md`](./e2e-tsconfig.md) — the tsconfig whose
  `include` glob picks up this file.
- [`e2e-package-manifest.md`](./e2e-package-manifest.md) — the
  package manifest that gates the Playwright runner.
- [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  — the authoritative living spec for the e2e suite.
- [`docs/log.md`](../log.md) — the running change log; every
  edit to this file or its source belongs there too.
