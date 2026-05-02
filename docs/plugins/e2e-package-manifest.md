---
id: e2e-package-manifest
title: E2E Package Manifest (`apps/web-e2e/package.json`)
sidebar_label: E2E package manifest
sidebar_position: 35
---

# E2E Package Manifest (`apps/web-e2e/package.json`)

> **Status.** Authoritative reference for the Playwright e2e
> suite's package manifest defined in
> [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
> and elaborated by
> [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion).
> The manifest is locked by
> [`apps/web-e2e/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/package.json),
> which declares the `@ever-works/web-e2e` workspace member, its
> Playwright-driven `scripts.*` surface (`test:e2e`,
> `test:e2e:ui`, `test:e2e:chromium`, `test:e2e:headed`,
> `test:e2e:debug`), the explicit no-op `lint` script that lets
> Turborepo's workspace-wide `pnpm lint` walk this member without a
> per-package opt-out, and the four `devDependencies` (`@ever-works/tsconfig`
> with the `workspace:*` specifier the suite extends through
> [`e2e-tsconfig.md`](./e2e-tsconfig.md), `@playwright/test` for the
> runner this manifest gates, `@faker-js/faker` for the synthetic
> data the e2e helpers reach for when `TEST_DATA.generate*()` is too
> coarse, `dotenv` for the cross-app `.env.local` load
> [`playwright-config.md`](./playwright-config.md) performs at boot,
> and `typescript` for the `pnpm tsc --noEmit` gate the suite shares
> with the rest of the workspace). When any of those fields move,
> update **this** page in the same change so the doc and the file
> cannot drift.

`apps/web-e2e/package.json` is the **single source of truth** for
every script, dependency, and metadata field that makes the
Playwright e2e suite a workspace member. It is the file that turns
the e2e directory from a loose collection of `.spec.ts` files into
an addressable workspace package — `pnpm --filter @ever-works/web-e2e`
resolves through this manifest, the workspace's `pnpm-workspace.yaml`
glob (`apps/*`) discovers it, and Turborepo's `test:e2e` task
delegates to the script defined here. The manifest sits one
directory below the workspace's
[`pnpm-workspace.yaml`](./pnpm-workspace.md) and one directory
above the suite's runtime configuration in
[`playwright-config.md`](./playwright-config.md), the suite's
TypeScript posture in [`e2e-tsconfig.md`](./e2e-tsconfig.md), and
the suite's authentication fixture in
[`auth-fixture.md`](./auth-fixture.md).

This page is the **per-source-file reference** that pairs with
[`apps/web-e2e/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/package.json)
the same way
[`workspace-root-manifest.md`](./workspace-root-manifest.md) pairs
with the repo-root `package.json`,
[`runtime-package-manifest.md`](./runtime-package-manifest.md) pairs
with `packages/plugin-runtime/package.json`,
[`sdk-package-manifest.md`](./sdk-package-manifest.md) pairs with
`packages/plugin-sdk/package.json`, and
[`plugin-demo-package-manifest.md`](./plugin-demo-package-manifest.md)
pairs with `packages/plugin-demo/package.json`. Where those four
documents document the manifest of a host-app or library workspace
member, this one documents the manifest of a **test-only** workspace
member — a member that ships no runtime exports, ships no `main` /
`types` / `exports` map, declares everything in `devDependencies`
because the package is consumed only by the workspace itself, and
deliberately omits a `dependencies` block.

## At-a-glance summary

| Field | Value | Why it matters |
| --- | --- | --- |
| `name` | `@ever-works/web-e2e` | The workspace identifier `pnpm --filter @ever-works/web-e2e` and Turborepo's `test:e2e` task resolve through. Must match the directory name's role (`apps/web-e2e/`) and the scope used by the rest of the workspace (`@ever-works/*`). |
| `version` | `0.0.0` | Symbolic-only because `private: true` blocks publishing. Pinned to `0.0.0` to make the "this is not a versioned artefact" stance explicit; bumping is meaningless. |
| `private` | `true` | Hard-blocks `pnpm publish` from accidentally pushing the e2e suite to the npm registry. Removing this field would let CI's `pnpm publish -r` walk the suite. |
| `license` | `AGPL-3.0` | Inherits the workspace-wide license declared in [`workspace-root-manifest.md`](./workspace-root-manifest.md). Required by the AGPL-3.0 inheritance convention even on private members. |
| `scripts.test:e2e` | `playwright test` | The canonical Playwright invocation. Turborepo's `test:e2e` task delegates here; `pnpm test:e2e` from the repo root runs this through the `--filter` shortcut. Reads `apps/web-e2e/playwright.config.ts` per [`playwright-config.md`](./playwright-config.md). |
| `scripts.test:e2e:ui` | `playwright test --ui` | Opens Playwright's interactive UI mode for local-development authoring. Not invoked by CI; surfaces as a contributor convenience. |
| `scripts.test:e2e:chromium` | `playwright test --project=chromium` | Runs only the Chromium project from `playwright.config.ts`. Used by the smoke-subset CI invocation and by contributors iterating on a flake bisect. |
| `scripts.test:e2e:headed` | `playwright test --headed` | Launches the configured browsers in headed (visible-window) mode. Pairs with the Playwright Inspector for visual debugging. |
| `scripts.test:e2e:debug` | `playwright test --debug` | Runs Playwright with the inspector attached so `await page.pause()` calls and breakpoints surface in the dev tools. |
| `scripts.lint` | `echo 'No lint configured for e2e'` | An explicit no-op so the workspace-wide `pnpm lint` walks this member without printing `pnpm: missing script "lint"` errors. The suite's TypeScript posture in [`e2e-tsconfig.md`](./e2e-tsconfig.md) and Playwright's own implicit-rule typing carry the safety net the lint step provides for the rest of the workspace today. |
| `devDependencies.@ever-works/tsconfig` | `workspace:*` | The `workspace:*` specifier resolves through pnpm to the in-tree `@ever-works/tsconfig` package — see [`tsconfig-presets.md`](./tsconfig-presets.md). Pinning to `workspace:*` instead of an SDK-style range guarantees the suite always tracks the workspace's TypeScript posture. |
| `devDependencies.@playwright/test` | `^1.58.2` | The runner this manifest's `test:e2e` script delegates to. The `^1` range tracks Playwright 1.x feature additions while pinning the major to avoid breaking changes. Bumping the major requires a [`playwright-config.md`](./playwright-config.md) cross-check. |
| `devDependencies.@faker-js/faker` | `^10.1.0` | The synthetic-data library the suite reaches for when `TEST_DATA.generateClientEmail()` / `generateItemName()` / `generateItemUrl()` per [`e2e-test-data.md`](./e2e-test-data.md) is too coarse-grained. The `^10` range tracks Faker 10.x's locale tables. |
| `devDependencies.dotenv` | `^16.4.7` | Loads `apps/web/.env.local` from `playwright.config.ts` per [`playwright-config.md`](./playwright-config.md), keeping a single source of truth between the suite and the booted host app. The `^16` range is the workspace's pin (matched in `apps/web/package.json`). |
| `devDependencies.typescript` | `^5` | The compiler the workspace-wide `pnpm tsc --noEmit` gate runs through. The `^5` range matches the rest of the workspace's TypeScript pin. |

## File contents

```json
{
	"name": "@ever-works/web-e2e",
	"version": "0.0.0",
	"private": true,
	"license": "AGPL-3.0",
	"scripts": {
		"test:e2e": "playwright test",
		"test:e2e:ui": "playwright test --ui",
		"test:e2e:chromium": "playwright test --project=chromium",
		"test:e2e:headed": "playwright test --headed",
		"test:e2e:debug": "playwright test --debug",
		"lint": "echo 'No lint configured for e2e'"
	},
	"devDependencies": {
		"@ever-works/tsconfig": "workspace:*",
		"@playwright/test": "^1.58.2",
		"@faker-js/faker": "^10.1.0",
		"dotenv": "^16.4.7",
		"typescript": "^5"
	}
}
```

## Why each field is here

### Why `name: '@ever-works/web-e2e'`

The workspace identifier the rest of the monorepo addresses this
member by. Three load-bearing properties:

1. **The `@ever-works/` scope** matches the rest of the workspace's
   members (`@ever-works/web`, `@ever-works/docs`,
   `@ever-works/plugin-sdk`, `@ever-works/plugin-runtime`,
   `@ever-works/plugin-demo`, `@ever-works/tsconfig`,
   `@ever-works/eslint-config`). Mixing scopes would break the
   `pnpm --filter "@ever-works/*"` glob the workspace's CI invocations
   rely on.
2. **The `web-e2e` suffix** mirrors the directory name
   (`apps/web-e2e/`) so a contributor reading a `pnpm --filter`
   command can find the package source from the name alone, and
   `pnpm-workspace.yaml`'s `apps/*` glob picks up the directory
   without needing an explicit allow-list.
3. **The presence of a `name` at all** is what makes this directory
   a workspace member. A `package.json` without a `name` field
   would not be addressable through `--filter`, would not get a
   `node_modules/` directory of its own, and would not participate
   in the workspace's `pnpm install`.

### Why `version: '0.0.0'`

The version is symbolic-only because `private: true` blocks
publishing. Pinning to `0.0.0` makes the "this is not a versioned
artefact" stance explicit. Bumping the version is meaningless; the
field exists because pnpm requires it.

### Why `private: true`

`private: true` is the hard-block that prevents `pnpm publish` (and
its workspace-recursive variants) from pushing the e2e suite to the
npm registry. Removing this field would let CI's `pnpm publish -r`
walk this package and surface a fresh `@ever-works/web-e2e@0.0.0`
artefact on every release — exactly the wrong outcome for a
test-only package.

### Why `license: 'AGPL-3.0'`

Inherits the workspace's `AGPL-3.0` license declared in
[`workspace-root-manifest.md`](./workspace-root-manifest.md). The
SPDX identifier is the canonical form pnpm and editors rely on.
The AGPL-3.0 inheritance convention requires every member of a
copyleft-licensed workspace to either repeat the license at the
member level or omit it (pnpm walks up to the parent on the
omission); we repeat it for explicitness.

### Why the five Playwright `scripts.*` entries

The five scripts wrap Playwright's CLI invocations the suite needs
in different contexts:

- `test:e2e` — the headless invocation Turborepo's `test:e2e` task
  delegates to. CI runs through this; contributors invoke it from
  the repo root via `pnpm test:e2e`.
- `test:e2e:ui` — Playwright's interactive UI for authoring tests.
  Used during local development; not invoked by CI.
- `test:e2e:chromium` — the single-project invocation the smoke
  subset uses, and the canonical "fast iteration" command for
  authoring against Chromium-specific behaviour.
- `test:e2e:headed` — visible-window mode for visual debugging
  (paired with the inspector in `test:e2e:debug`).
- `test:e2e:debug` — runs with the Playwright Inspector attached so
  `await page.pause()` calls and breakpoints work.

The scripts deliberately do **not** wrap any flag combinations
beyond what Playwright's CLI offers natively — the surface stays
flat so the convention "what `playwright test` accepts is what
this script accepts" holds.

### Why `scripts.lint` is a no-op echo

The workspace-wide `pnpm lint` invocation walks every member with a
`lint` script. The e2e suite has no ESLint configuration today
(see [`eslint-config.md`](./eslint-config.md) for the workspace's
shared posture and the consumer table that pins which packages
opt in), so the script must exist for the workspace-wide walk to
succeed but must be a no-op locally. Three rejected alternatives:

1. **Drop the script entirely** — the workspace-wide `pnpm -r lint`
   would print `pnpm: missing script "lint"` and exit non-zero,
   breaking CI.
2. **Wire up a real lint** — would duplicate the `pnpm tsc --noEmit`
   safety net (the suite's TypeScript posture in
   [`e2e-tsconfig.md`](./e2e-tsconfig.md) catches every TS-level
   error without an additional ESLint pass), and would require
   adding a `nextjsConfig` invocation that the suite doesn't use.
3. **`true`** — works but says nothing; the `echo` makes the
   intent visible to a contributor reading the manifest cold.

### Why `devDependencies.@ever-works/tsconfig` with `workspace:*`

The `workspace:*` specifier is the pnpm convention for "always
resolve to whatever the in-tree `@ever-works/tsconfig` package is";
see [`tsconfig-presets.md`](./tsconfig-presets.md) for the four
files this resolves to. Pinning to `workspace:*` instead of a
range:

- Guarantees the suite always tracks the workspace's TypeScript
  posture without needing a manual range bump on every preset
  change.
- Lets `pnpm install` resolve the dependency from the in-tree
  source instead of the npm registry (which never sees this
  package because of `private: true` on the preset).
- Matches the convention every other workspace member uses for
  in-tree dependencies (every `packages/*` and `apps/*` that
  consumes `@ever-works/tsconfig` does so via `workspace:*`).

### Why `devDependencies.@playwright/test` with `^1.58.2`

The runner the `scripts.test:e2e` invocation delegates to. The
`^1` range tracks Playwright 1.x's feature additions (which never
break test code by Playwright's commitment) while pinning the major
to avoid the next 2.x breaking-change wave. The `1.58.2` floor is
the version this codebase first wired in; bumping it requires:

- A [`playwright-config.md`](./playwright-config.md) cross-check
  (the `webServer.command` and `webServer.timeout` semantics
  stabilised across the 1.x line).
- A [`auth-fixture.md`](./auth-fixture.md) cross-check (the
  fixture's `base.extend<AuthFixtures>(...)` shape relies on
  Playwright 1.x's fixture API).
- A `pnpm install` round-trip to refresh the lockfile.

### Why `devDependencies.@faker-js/faker` with `^10.1.0`

Faker is the synthetic-data library the suite reaches for when
`TEST_DATA.generate*()` per [`e2e-test-data.md`](./e2e-test-data.md)
is too coarse-grained — for instance, when a spec needs a
realistic-looking item description or a localized address that
the simple `Date.now()`-prefixed generators can't synthesise. The
`^10` range tracks Faker 10.x's locale-table additions; the `10.1.0`
floor is the version this codebase first wired in.

The library is in `devDependencies` rather than the suite's
runtime helpers because it is **only** consumed by `tests/**/*.spec.ts`
files at test-runner time; nothing in `apps/web/`'s production
bundle reaches for it.

### Why `devDependencies.dotenv` with `^16.4.7`

The cross-app env-loading library invoked from
`apps/web-e2e/playwright.config.ts` per
[`playwright-config.md`](./playwright-config.md) — the
`dotenv.config({ path: '../web/.env.local' })` call that keeps a
single source of truth between the suite's `process.env.*`
reads and the booted host app's `process.env.*` reads. The `^16`
range matches the workspace's pin in `apps/web/package.json`,
guaranteeing identical parsing semantics across the two readers
(both consume `KEY=value` lines, both ignore lines starting with
`#`, both expand `${VAR}` references).

### Why `devDependencies.typescript` with `^5`

The compiler the workspace-wide `pnpm tsc --noEmit` gate runs
through. The `^5` range matches the rest of the workspace's
TypeScript pin (every `apps/*` and `packages/*` `package.json`
declares `typescript@^5` in `devDependencies`). The deliberate
absence of a tighter pin means a workspace-wide `pnpm install`
hoists the same TypeScript major to every member; flipping this
to `~5.x` or `5.x.y` here would risk version drift across the
workspace.

## Deliberately absent fields

| Field | Why it's absent |
| --- | --- |
| `description` | The `name` field already conveys role (`web-e2e`); a description would be one more thing to drift on a directory rename. The host-app and library manifests carry descriptions because they appear in the npm registry; this private package never does. |
| `homepage` / `repository` / `bugs` | Same rationale — these fields surface only on published packages. The repo-root [`workspace-root-manifest.md`](./workspace-root-manifest.md) is the single source of truth for repository metadata. |
| `author` | Inherited from the workspace-wide `AGPL-3.0` license; no per-package author. |
| `keywords` | Same rationale as `description` — surfaces only in the registry. |
| `engines` | Inherited from [`workspace-root-manifest.md`](./workspace-root-manifest.md)'s `engines.node: '>=20.19.0'`. Repeating here would risk drift. |
| `packageManager` | Inherited from the workspace root; pnpm's Corepack lookup walks up to the first `packageManager` field it finds. |
| `type` | Absent because Playwright's CLI handles both ESM and CJS spec files and the suite's `tsconfig.json` (per [`e2e-tsconfig.md`](./e2e-tsconfig.md)) sets `module: 'esnext'` + `moduleResolution: 'bundler'` directly. Adding `"type": "module"` would risk a regression on a future Playwright version that ships a CJS-only utility. |
| `main` / `types` / `exports` | The package has no public exports — every consumer of the e2e source is the suite itself. The absence of these fields is what makes this manifest a **test-only** member rather than a library. |
| `bin` | No CLI entry — invocation is exclusively through `scripts.*`. |
| `dependencies` | Deliberately empty: every reach for a third-party library is at test-runner time (`devDependencies`) and nothing in this package is consumed by another workspace member at runtime. The presence of a `dependencies` block would imply a runtime contract the suite does not have. |
| `peerDependencies` / `peerDependenciesMeta` | The suite is a leaf consumer; nothing peer-imports it. |
| `files` | Irrelevant on a `private: true` package — pnpm never tarballs an unpublishable manifest, so the `files` whitelist has no readers. |
| `scripts.dev` / `scripts.build` / `scripts.start` | The suite has no dev or build step (Playwright runs the spec files directly through `tsx`-style on-the-fly transpilation via its own runtime); adding these scripts would create a misleading impression that the package builds. |
| `pnpm.*` overrides | Inherited from [`workspace-root-manifest.md`](./workspace-root-manifest.md). The repo-root manifest carries the workspace-wide `pnpm.overrides`, `pnpm.publicHoistPattern`, and `pnpm.onlyBuiltDependencies` that govern install-time hoisting and native-build allow-listing. |
| `prettier` | Inherited from [`workspace-root-manifest.md`](./workspace-root-manifest.md). The repo-root manifest's `prettier` block is the workspace-wide formatter posture. |

## Consumer table

| Reader | What it consumes from this manifest |
| --- | --- |
| **`pnpm install`** at the repo root | The full manifest. Resolves `devDependencies.@ever-works/tsconfig` through `workspace:*`, walks `devDependencies.@playwright/test` / `@faker-js/faker` / `dotenv` / `typescript` against the lockfile, registers the package as a workspace member under the `apps/*` glob in [`pnpm-workspace.md`](./pnpm-workspace.md). |
| **`pnpm --filter @ever-works/web-e2e <script>`** | The `name` field for the filter glob; the `scripts.<script>` field for the command. Used by every workspace-aware invocation that targets the suite specifically. |
| **Turborepo's `test:e2e` task** declared in [`turbo-config.md`](./turbo-config.md) | The `name` field (Turborepo enumerates workspace members by name) and `scripts.test:e2e` (the task delegates to this script). The `dependsOn: ['build']` clause in `turbo.json` resolves the dependency on `@ever-works/web`'s `build` script before invoking this script. |
| **CI workflows** under `.github/workflows/` | The `name` (for filter targets) and `scripts.test:e2e` / `scripts.test:e2e:chromium` (for the per-job invocation). |
| **The Playwright runner itself** at `scripts.test:e2e` invocation time | Not the manifest directly, but its CLI walks up from the invocation directory looking for `playwright.config.ts` per [`playwright-config.md`](./playwright-config.md); the `node_modules/.bin/playwright` shim that pnpm symlinks comes from `devDependencies.@playwright/test`. |
| **TypeScript's `tsc --noEmit` gate** | `devDependencies.typescript` (the compiler) and `devDependencies.@ever-works/tsconfig` (the preset chain extended by [`e2e-tsconfig.md`](./e2e-tsconfig.md)). |
| **Renovate / Dependabot** | The `devDependencies.*` semver ranges for upgrade-PR generation. The `^1` / `^10` / `^16` / `^5` ranges all explicitly opt into minor updates; tightening to `~` would prevent the bot from opening minor-bump PRs. |
| **Editors** (VS Code, JetBrains, Cursor) | The `name` for workspace-treeing in the sidebar, `scripts.*` for the integrated runner panels. |

## Failure matrix

| Mistake | First failure surface |
| --- | --- |
| Drop the `name` field. | `pnpm install` errors at parse time: the workspace member becomes unaddressable, the `apps/*` glob in [`pnpm-workspace.md`](./pnpm-workspace.md) skips it, and `pnpm --filter @ever-works/web-e2e` resolves to nothing. |
| Rename `name` to a non-`@ever-works/*` scope. | The workspace's CI `pnpm --filter "@ever-works/*"` glob silently skips the package, dropping e2e coverage from CI without surfacing a parse error. |
| Drop `private: true`. | `pnpm publish -r` walks the package and pushes `@ever-works/web-e2e@0.0.0` to the npm registry on the next release. |
| Drop the `license` field. | pnpm walks up to the workspace root for inheritance — works today but breaks the AGPL-3.0 declaration model the moment the workspace root's license drifts. |
| Drop `scripts.test:e2e`. | Turborepo's `test:e2e` task fails with `Couldn't find script "test:e2e"`; CI breaks. |
| Drop `scripts.lint`. | The workspace-wide `pnpm -r lint` walks this package and exits non-zero with `missing script "lint"`. CI breaks. |
| Switch `scripts.lint` from a no-op echo to a real lint command without first wiring `eslint.config.mjs`. | `pnpm install` succeeds; `pnpm lint` fails with `Cannot find module 'eslint'` because the manifest does not declare ESLint as a dev-dep. |
| Add a duplicate `scripts.test:e2e` alias under a different name without deleting the original. | No immediate failure, but contributors and CI workflows drift across the two names; eventually a Playwright upgrade lands changes that affect only one of them. |
| Drop `devDependencies.@playwright/test`. | `pnpm test:e2e` exits with `Cannot find module '@playwright/test'`. The `scripts.test:e2e` script's `playwright` binary is the runtime whose presence depends on this dev-dep. |
| Drop `devDependencies.@ever-works/tsconfig` or change its specifier away from `workspace:*`. | The suite's `tsconfig.json` per [`e2e-tsconfig.md`](./e2e-tsconfig.md) fails to resolve `extends: '@ever-works/tsconfig/playwright.json'`; `pnpm tsc --noEmit` reports `Cannot find base config` errors at gate time. |
| Drop `devDependencies.dotenv`. | `apps/web-e2e/playwright.config.ts`'s top-level `import dotenv from 'dotenv'` per [`playwright-config.md`](./playwright-config.md) fails to resolve at runner-boot, every spec fails before the first test step, and the host-app's env-driven branches (database connection, auth secret, content-repo URL) flap unpredictably depending on shell-export state. |
| Drop `devDependencies.@faker-js/faker`. | Any spec that reaches for `faker.*` gets `Cannot find module '@faker-js/faker'` at runner-boot. The simpler specs that rely only on `TEST_DATA.generate*()` per [`e2e-test-data.md`](./e2e-test-data.md) keep working, masking the breakage until a contributor lands a Faker-using spec. |
| Drop `devDependencies.typescript`. | The workspace-wide `pnpm tsc --noEmit` gate fails with `Cannot find module 'typescript'`. The package's own `tsc --noEmit` invocation also fails. |
| Tighten `devDependencies.@playwright/test` from `^1.58.2` to `1.58.2`. | Renovate stops opening minor-bump PRs for Playwright; the suite drifts away from the rest of the ecosystem's Playwright version over a few quarters. |
| Loosen `devDependencies.@playwright/test` from `^1.58.2` to `*`. | A future Playwright 2.x major silently lands; the suite's [`playwright-config.md`](./playwright-config.md) and [`auth-fixture.md`](./auth-fixture.md) shapes break en masse without a controlled bump. |
| Move the file from `apps/web-e2e/package.json`. | `pnpm install` no longer resolves the `apps/*` glob to this directory; the workspace's CI invocations that target `@ever-works/web-e2e` via `--filter` silently no-op. |
| Add a `dependencies` block. | Implies a runtime contract the suite does not have; risks the suite being walked by `npm` / `pnpm install --prod` and pulling its dev-only libraries into a production build. |
| Add `"type": "module"`. | Risks a regression on a future Playwright minor that ships a CJS-only utility (the runtime emits `ERR_REQUIRE_ESM` from CJS code reaching for the now-ESM-only suite). |
| Bump `version` away from `0.0.0`. | No immediate failure, but signals "this is a versioned artefact" while `private: true` still blocks publishing — drift between the field and the constraint. |

## Per-line walkthrough

| Line | Field | What it does |
| --- | --- | --- |
| 2 | `"name": "@ever-works/web-e2e"` | Declares the workspace identifier. |
| 3 | `"version": "0.0.0"` | Symbolic version. |
| 4 | `"private": true` | Hard-blocks publishing. |
| 5 | `"license": "AGPL-3.0"` | SPDX license identifier. |
| 6 | `"scripts": {` | Opens the script map. |
| 7 | `"test:e2e": "playwright test"` | Headless Playwright run, the canonical CI invocation. |
| 8 | `"test:e2e:ui": "playwright test --ui"` | Interactive UI mode. |
| 9 | `"test:e2e:chromium": "playwright test --project=chromium"` | Chromium-only run. |
| 10 | `"test:e2e:headed": "playwright test --headed"` | Headed (visible-window) mode. |
| 11 | `"test:e2e:debug": "playwright test --debug"` | Inspector-attached debug mode. |
| 12 | `"lint": "echo 'No lint configured for e2e'"` | Workspace-wide `pnpm lint` no-op. |
| 13 | `}` | Closes the script map. |
| 14 | `"devDependencies": {` | Opens the dev-dep map. |
| 15 | `"@ever-works/tsconfig": "workspace:*"` | In-tree TypeScript preset package. |
| 16 | `"@playwright/test": "^1.58.2"` | The Playwright test runner. |
| 17 | `"@faker-js/faker": "^10.1.0"` | Synthetic-data library. |
| 18 | `"dotenv": "^16.4.7"` | Env-loader for `playwright.config.ts`. |
| 19 | `"typescript": "^5"` | The TypeScript compiler. |
| 20 | `}` | Closes the dev-dep map. |

## `package.json`-change checklist

When this file changes — adding a script, bumping a dependency,
adding a new dev-dep, dropping a field — the change must travel
with the following cross-checks:

- A [`pnpm-workspace.md`](./pnpm-workspace.md) cross-check if the
  `name` field changes (the `apps/*` glob discovers the directory,
  but the filter glob `@ever-works/*` only resolves through the
  manifest's `name`).
- A [`playwright-config.md`](./playwright-config.md) cross-check
  if `devDependencies.@playwright/test` or `devDependencies.dotenv`
  changes (the config imports both at runner-boot).
- A [`e2e-tsconfig.md`](./e2e-tsconfig.md) cross-check if
  `devDependencies.@ever-works/tsconfig` or `devDependencies.typescript`
  changes (the suite's `tsconfig.json` extends the in-tree preset
  and the gate runs through the workspace's TS compiler).
- A [`auth-fixture.md`](./auth-fixture.md) cross-check if
  `devDependencies.@playwright/test` major-bumps (the fixture's
  `base.extend<AuthFixtures>(...)` shape relies on Playwright's
  fixture API).
- A [`e2e-test-data.md`](./e2e-test-data.md) cross-check if
  `devDependencies.@faker-js/faker` major-bumps (the helpers may
  reach for faker locales that change shape across Faker majors).
- A [`turbo-config.md`](./turbo-config.md) cross-check if a new
  workspace-spanning script is added (Turborepo needs a matching
  `tasks.<name>` declaration).
- A [`workspace-root-manifest.md`](./workspace-root-manifest.md)
  cross-check if the `engines` / `packageManager` / `prettier` /
  `pnpm.*` posture diverges (these are inherited from the root and
  must not be overridden here).
- A `pnpm install` round-trip to refresh the lockfile.
- A `pnpm tsc --noEmit` gate run (workspace-root + e2e).
- A smoke-subset Playwright run
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium`) that
  confirms the suite still boots cleanly with the new dependency
  set.
- A [`docs/log.md`](../log.md) entry under the current date heading.
- A [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  cross-link if the change introduces a new shared concept that
  affects test authoring (a new dev-dep that helpers reach for, a
  new script that CI invokes).
- A reviewer pass.

The bar is one PR per manifest change; bundled changes that touch
both this manifest and the runtime config (or the tsconfig, or the
auth fixture) are fine when the changes are causally coupled (e.g.
a Playwright major-bump that requires `playwright.config.ts`
edits) but not when they are merely co-located.
