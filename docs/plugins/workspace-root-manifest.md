---
id: monorepo-workspace-root-manifest
title: Workspace Root Manifest (`package.json`)
sidebar_label: Workspace Root Manifest
sidebar_position: 26
---

# Workspace Root Manifest (`package.json`)

> **Status.** Authoritative reference for the monorepo's workspace
> root manifest defined in
> [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion).
> The root manifest is locked by
> [`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/package.json)
> at the monorepo root; when a top-level script, a `pnpm.overrides`
> entry, an `onlyBuiltDependencies` allow-list entry, the Prettier
> posture, the `engines` floor, or the `packageManager` pin changes,
> update **this** page in the same change so the doc and the
> manifest cannot drift.

`package.json` at the monorepo root is the **workspace-coordination
manifest** — the file that decides which Node major version every
contributor runs, which pnpm version every contributor uses (down to
the patch), which top-level scripts a contributor or CI runner
invokes against the entire workspace, which transitive dependency
versions are pinned across every workspace member, which native
build steps are allowed to execute during `pnpm install`, and which
Prettier rules every committed file is formatted under. It is the
**only** `package.json` in the repo that has no `dependencies` of
its own — every dependency at this level is either a workspace tool
(`turbo`, `prettier`) or a pinning declaration (`pnpm.overrides`).

This page is the **per-source-file reference** that pairs with
[`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/package.json)
at the repo root the same way
[`pnpm-workspace.md`](./pnpm-workspace.md) pairs with
`pnpm-workspace.yaml`,
[`turbo-config.md`](./turbo-config.md) pairs with `turbo.json`,
[`tsconfig-presets.md`](./tsconfig-presets.md) pairs with the four
files inside `packages/tsconfig/`,
[`eslint-config.md`](./eslint-config.md) pairs with the two files
inside `packages/eslint-config/`,
[`plugin-tsconfigs.md`](./plugin-tsconfigs.md) pairs with the three
plugin-package `tsconfig.json` files,
[`sdk-package-manifest.md`](./sdk-package-manifest.md) pairs with
`packages/plugin-sdk/package.json`,
[`runtime-package-manifest.md`](./runtime-package-manifest.md) pairs
with `packages/plugin-runtime/package.json`,
[`plugin-demo-package-manifest.md`](./plugin-demo-package-manifest.md)
pairs with `packages/plugin-demo/package.json`,
[`sdk-public-surface.md`](./sdk-public-surface.md) pairs with
`packages/plugin-sdk/src/index.ts`,
[`runtime-public-surface.md`](./runtime-public-surface.md) pairs
with `packages/plugin-runtime/src/index.ts`,
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
[`pnpm-workspace.md`](./pnpm-workspace.md) documents **which folders
become workspace members** and
[`turbo-config.md`](./turbo-config.md) documents **what tasks those
members can run, in what order, with what inputs**, this page
documents the **workspace-coordination posture itself** — the
top-level scripts that fan tasks out, the runtime / package-manager
floor every contributor must meet, the version-pinning posture for
transitive dependencies, the native-build allow-list that gates
`postinstall` execution, and the Prettier formatting baseline.

## At a glance

| Field                                             | Value                                                                                                 | Why it matters                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `name`                                            | `ever-works-monorepo`                                                                                 | The workspace-root identifier. Never published; pnpm uses it only as a label.                                                        |
| `version`                                         | `0.1.0`                                                                                               | Symbolic — the workspace as a whole has no published artefact. Individual packages have their own version fields.                    |
| `private`                                         | `true`                                                                                                | Hard-blocks `pnpm publish` against the root. Combined with the per-package `private: true` it guarantees nothing reaches a registry. |
| `license`                                         | `AGPL-3.0`                                                                                            | The project's license. Inherited by every workspace member that does not override it.                                                |
| `packageManager`                                  | `pnpm@10.31.0`                                                                                        | The exact pnpm version every contributor and every CI runner must use, enforced by Corepack and `engineStrict`.                      |
| `engines.node`                                    | `>=20.19.0`                                                                                           | The Node.js floor. Below this version, `pnpm install` and `turbo` will error before any package code is read.                        |
| `scripts.build`                                   | `turbo run build`                                                                                     | The fan-out script that builds every workspace member in topological order according to [`turbo.json`](./turbo-config.md).           |
| `scripts.dev`                                     | `turbo run dev`                                                                                       | Starts the persistent `dev` task across every workspace member. The `dev` task is `cache: false` and `persistent: true`.             |
| `scripts.dev:web`                                 | `turbo run dev --filter=@ever-works/web`                                                              | Web-only dev shortcut that skips the docs app. Mirrors the `--filter` documented in [`pnpm-workspace.md`](./pnpm-workspace.md).      |
| `scripts.dev:docs`                                | `turbo run dev --filter=@ever-works/docs`                                                             | Docs-only dev shortcut. Used when iterating on the Docusaurus app under `apps/docs/`.                                                |
| `scripts.lint`                                    | `turbo run lint`                                                                                      | Fans `eslint` across every workspace member that defines a `lint` script. SDK / runtime packages declare a no-op intentionally.      |
| `scripts.test:e2e`                                | `turbo run test:e2e`                                                                                  | Drives the Playwright suite under `apps/web-e2e`. Depends on `build` (no `^`), so the local web app is built first.                  |
| `scripts.clean`                                   | `turbo run clean`                                                                                     | Fans `clean` across every workspace member; uncached because deletion is meaningless to cache.                                       |
| `scripts.format`                                  | `prettier --write "**/*.{ts,tsx,js,jsx,md,json}"`                                                     | The formatting fan-out. Reads the `prettier` block in this file and applies it to every committed source file.                       |
| `scripts.build:web`                               | `turbo run build --filter=@ever-works/web`                                                            | Builds only the web app and its workspace dependencies, used by Vercel preview deploys.                                              |
| `scripts.build:docs`                              | `turbo run build --filter=@ever-works/docs`                                                           | Builds only the docs app and its workspace dependencies.                                                                             |
| `scripts.build:docs:en`                           | `turbo run build:en --filter=@ever-works/docs`                                                        | English-only docs build. The `build:en` task is the second cached Turborepo task, with a narrower `outputs` set than `build`.        |
| `devDependencies.turbo`                           | `^2.5.0`                                                                                              | The Turborepo CLI. Pinned to a major range so cache-key semantics stay stable across CI runs.                                        |
| `devDependencies.prettier`                        | `^3.5.3`                                                                                              | The Prettier CLI. The `prettier` config block in this same file is the single source of truth for formatting rules.                  |
| `pnpm.publicHoistPattern`                         | `["@opentelemetry/*"]`                                                                                | Forces every `@opentelemetry/*` package to hoist to the workspace root so Sentry's instrumentation can resolve them at runtime.      |
| `pnpm.overrides.@types/react`                     | `19.2.7`                                                                                              | Pins React 19 typings across every transitive dependency so a stale `@types/react@18` doesn't sneak in via a third-party UI lib.     |
| `pnpm.overrides.@types/react-dom`                 | `19.2.3`                                                                                              | Mirrors the React typings pin for ReactDOM so React 19's narrowed `ReactNode` typing applies everywhere.                             |
| `pnpm.overrides.esbuild`                          | `0.27.0`                                                                                              | Pins the bundler used by Next.js / SWC fallback paths so Turbopack and Webpack agree on the exact transform output.                  |
| `pnpm.overrides.esbuild-register`                 | `3.6.0`                                                                                               | Pins the loader Drizzle Kit and Trigger.dev use to require TypeScript files at runtime.                                              |
| `pnpm.overrides.@opentelemetry/api`               | `1.9.0`                                                                                               | Pins the OTel API surface so every instrumentation library agrees on the same `Tracer` / `Meter` shape under the hoist rule above.   |
| `pnpm.onlyBuiltDependencies`                      | 10-entry allow-list (see [field walkthrough](#pnpmonlybuiltdependencies--the-postinstall-allow-list)) | The exhaustive set of packages whose `postinstall` / native-build hooks are allowed to run during `pnpm install`.                    |
| `prettier.printWidth`                             | `120`                                                                                                 | The wrap column. Wider than Prettier's default `80` to suit modern wide editors and reduce break-induced noise in JSX.               |
| `prettier.singleQuote`                            | `true`                                                                                                | Single quotes in JS / TS / TSX. Mirrors the project-wide convention seen across every existing `.ts` file.                           |
| `prettier.semi`                                   | `true`                                                                                                | Trailing semicolons. ASI is not relied on anywhere in this codebase.                                                                 |
| `prettier.useTabs`                                | `true`                                                                                                | Hard tabs (with `tabWidth: 4`) for accessibility. Overridden by language-specific entries below.                                     |
| `prettier.tabWidth`                               | `4`                                                                                                   | Tab width = 4 spaces. Combined with `useTabs: true` this means one tab is rendered as 4 columns.                                     |
| `prettier.arrowParens`                            | `always`                                                                                              | Always wrap arrow-function parameters in parens, even single-param. Stable diffs when adding a second parameter.                     |
| `prettier.trailingComma`                          | `none`                                                                                                | No trailing commas. Predates the modern `'all'` default; kept for diff stability.                                                    |
| `prettier.quoteProps`                             | `as-needed`                                                                                           | Only quote object keys when required (reserved words, hyphens, etc.). Default Prettier setting; pinned for clarity.                  |
| `prettier.trimTrailingWhitespace`                 | `true`                                                                                                | Strip trailing whitespace on save. Avoids noisy whitespace-only diffs.                                                               |
| `prettier.overrides[*.scss].useTabs` / `tabWidth` | `false` / `2`                                                                                         | SCSS uses 2-space indentation, not tabs. Matches the `*.scss` convention used across the web app.                                    |
| `prettier.overrides[*.yml].useTabs` / `tabWidth`  | `false` / `2`                                                                                         | YAML disallows tabs at the syntax level; this override prevents a hard parse failure on `.github/workflows/*.yml`.                   |

The manifest is **deliberately small**: there is no top-level
`dependencies`, no `bin`, no `main` / `exports`, no `workspaces`
field (pnpm uses
[`pnpm-workspace.yaml`](./pnpm-workspace.md) for that), and no
`type` field. The omissions are intentional and any addition would
be a Spec-Kit-level change because it would either move
responsibility from a workspace member up to the root (a layering
violation) or alter the contract every contributor's environment
relies on.

## File contents

```jsonc
{
	"name": "ever-works-monorepo",
	"version": "0.1.0",
	"private": true,
	"license": "AGPL-3.0",
	"packageManager": "pnpm@10.31.0",
	"engines": {
		"node": ">=20.19.0"
	},
	"scripts": {
		"build": "turbo run build",
		"dev": "turbo run dev",
		"dev:web": "turbo run dev --filter=@ever-works/web",
		"dev:docs": "turbo run dev --filter=@ever-works/docs",
		"lint": "turbo run lint",
		"test:e2e": "turbo run test:e2e",
		"clean": "turbo run clean",
		"format": "prettier --write \"**/*.{ts,tsx,js,jsx,md,json}\"",
		"build:web": "turbo run build --filter=@ever-works/web",
		"build:docs": "turbo run build --filter=@ever-works/docs",
		"build:docs:en": "turbo run build:en --filter=@ever-works/docs"
	},
	"devDependencies": {
		"turbo": "^2.5.0",
		"prettier": "^3.5.3"
	},
	"pnpm": {
		"publicHoistPattern": ["@opentelemetry/*"],
		"overrides": {
			"@types/react": "19.2.7",
			"@types/react-dom": "19.2.3",
			"esbuild": "0.27.0",
			"esbuild-register": "3.6.0",
			"@opentelemetry/api": "1.9.0"
		},
		"onlyBuiltDependencies": [
			"@vercel/speed-insights",
			"@heroui/shared-utils",
			"@parcel/watcher",
			"@scarf/scarf",
			"@sentry/cli",
			"@swc/core",
			"core-js",
			"core-js-pure",
			"esbuild",
			"protobufjs",
			"sharp"
		]
	},
	"prettier": {
		"printWidth": 120,
		"singleQuote": true,
		"semi": true,
		"useTabs": true,
		"tabWidth": 4,
		"arrowParens": "always",
		"trailingComma": "none",
		"quoteProps": "as-needed",
		"trimTrailingWhitespace": true,
		"overrides": [
			{ "files": "*.scss", "options": { "useTabs": false, "tabWidth": 2 } },
			{ "files": "*.yml", "options": { "useTabs": false, "tabWidth": 2 } }
		]
	}
}
```

## Field-by-field

### `name` — the workspace-root label

```jsonc
"name": "ever-works-monorepo"
```

The root `name` is **not** a package identifier — no consumer
imports `ever-works-monorepo`. pnpm uses it as the workspace label
shown in `pnpm list -r` output and in `turbo run` summary lines. It
is the only `name` in the repo that omits the `@ever-works/` scope
because the root has no scope.

### `version` — symbolic, never published

```jsonc
"version": "0.1.0"
```

The root version exists to satisfy `package.json` schema validators.
Because `private: true` blocks publishing, the value is purely
symbolic. Bumping it has no effect on consumers, no effect on
caching, and no effect on `pnpm install` behaviour. Each workspace
member tracks its own version independently — see
[`sdk-package-manifest.md`](./sdk-package-manifest.md#version--the-sdk-version-that-gates-templaterange)
for the per-package version semantics.

### `private` — hard-block on accidental publish

```jsonc
"private": true
```

Even though `pnpm publish` against the root would fail for other
reasons (missing `name` scope, missing `files` array, missing
`main`), `private: true` is the explicit and unambiguous block.
Combined with the per-package `private: true` on every workspace
member, the workspace is closed end-to-end against any registry
publish path.

### `license` — AGPL-3.0 inheritance root

```jsonc
"license": "AGPL-3.0"
```

The root license is the default for any workspace member that does
not override its own `license` field. Today every member inherits
this value. License-scanning tools (`pnpm licenses ls`,
`license-checker`, FOSSA) read this field as the workspace root
declaration. See [`LICENSE.md`](https://github.com/ever-works/directory-web-template/blob/develop/LICENSE.md)
for the canonical legal text.

### `packageManager` — exact pnpm version pin

```jsonc
"packageManager": "pnpm@10.31.0"
```

This field is read by [Corepack](https://nodejs.org/api/corepack.html)
to download and use the exact specified pnpm version when any
contributor runs `pnpm`. The specifier is the full
`<name>@<exact-version>` form — not a range — so every contributor
and every CI runner uses byte-for-byte the same pnpm. A floating
range here would defeat the point: lockfile churn from a pnpm patch
release is the kind of failure this pin prevents.

Bumping this version is a Spec-Kit-level change because pnpm's
lockfile format and resolution semantics can shift between major
versions, and CI / contributor environments must update in lockstep.

### `engines.node` — Node.js floor

```jsonc
"engines": {
	"node": ">=20.19.0"
}
```

Node 20.19.0 is the minimum because:

- Next.js 16 requires Node 20.9+ (the Next.js team's stated floor).
- The host's
  [`apps/web/scripts/check-env.js`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/scripts/check-env.js)
  uses `import.meta.url` and other ESM-only APIs that became stable
  in Node 20.
- The `node:test` runner used by some workspace members reaches
  feature parity at 20.x.

The floor is a `>=` range, not a `^20` range, because the workspace
deliberately allows Node 22 LTS once it stabilises — pinning to
exactly major-20 would force a coordinated bump.

### `scripts.build` — top-level build fan-out

```jsonc
"scripts": {
	"build": "turbo run build"
}
```

`pnpm build` from the repo root delegates to Turborepo's `build`
task, which is documented in detail at
[`turbo-config.md#build`](./turbo-config.md#build). The contract is:

1. Resolve the workspace dependency graph (read by Turborepo from
   each member's `dependencies` and `devDependencies`).
2. For every package that defines a `build` script, run it after its
   workspace dependencies' `build` scripts have completed
   (`dependsOn: ["^build"]`).
3. Cache the result keyed on source content + the 19-entry `env`
   allow-list documented at
   [`turbo-config.md#the-env-allow-list-family-by-family`](./turbo-config.md#the-env-allow-list--whats-in-and-whats-out).

The four-stage build chain is
`plugin-sdk → plugin-runtime + plugin-demo (parallel) → web` (see
[turbo-config.md#how-the-workspace-graph-and-task-graph-compose](./turbo-config.md#how-the-workspace-graph-and-task-graph-compose)).

### `scripts.dev` / `dev:web` / `dev:docs` — persistent watch fan-outs

```jsonc
"dev": "turbo run dev",
"dev:web": "turbo run dev --filter=@ever-works/web",
"dev:docs": "turbo run dev --filter=@ever-works/docs"
```

The unfiltered `dev` script runs every package's `dev` task in
parallel (Turborepo's `persistent: true` flag prevents shutdown).
The two filtered shortcuts narrow the watch set for two common
contributor workflows:

- **`dev:web`** is the most common — only the host Next.js app and
  its workspace dependencies (`plugin-sdk`, `plugin-runtime`,
  `plugin-demo`, `tsconfig`, `eslint-config`) are watched.
- **`dev:docs`** runs only the Docusaurus app under `apps/docs/`.

The `--filter` flag is documented in detail at
[Turborepo's filtering reference](https://turborepo.dev/docs/reference/filtering)
and the workspace's filterable members are enumerated in
[pnpm-workspace.md#resolved-workspace-members](./pnpm-workspace.md#resolved-workspace-members).

### `scripts.lint` — top-level lint fan-out

```jsonc
"lint": "turbo run lint"
```

Fans the `lint` task across every workspace member that defines
one. The four package-level scripts that today resolve to
`echo 'No lint configured for ...'` (the SDK, the runtime, and the
two demo / tsconfig packages — see
[`sdk-package-manifest.md`](./sdk-package-manifest.md#scriptslint--intentional-no-op)
for rationale) participate in the cache as no-op cache hits, so
`pnpm lint` from the root is fast on a warm cache.

### `scripts.test:e2e` — Playwright fan-out

```jsonc
"test:e2e": "turbo run test:e2e"
```

The `test:e2e` task is documented in detail at
[`turbo-config.md#test-e2e`](./turbo-config.md#teste2e). The Turbo
task declares `dependsOn: ["build"]` (no `^` prefix) so the local
package's own `build` runs first, but **not** every dependency's
`build`. The task is `cache: false` because Playwright runs against
a real Next.js server and are not deterministic functions of source
content.

### `scripts.clean` — workspace-wide clean

```jsonc
"clean": "turbo run clean"
```

Fans `clean` across every member. Each member's `clean` script
removes its own `.next/`, `dist/`, `build/`, and `tsconfig.tsbuildinfo`.
The Turbo task declares `cache: false` because caching a delete is
meaningless.

### `scripts.format` — Prettier fan-out

```jsonc
"format": "prettier --write \"**/*.{ts,tsx,js,jsx,md,json}\""
```

The `format` script does **not** go through Turborepo — Prettier is
fast enough that the cache-key cost would exceed the time saved.
The script reads the `prettier` block in this same file as the
single source of truth for formatting rules. The glob is
intentionally narrow:

- **`.ts` / `.tsx`** — TypeScript source.
- **`.js` / `.jsx`** — Allowed for narrow ESLint-config files like
  [`packages/eslint-config/nextjs.mjs`](./eslint-config.md) (the
  `.mjs` is intentionally excluded — Prettier still formats it,
  but the explicit glob avoids picking up generated CommonJS).
- **`.md`** — Markdown documentation under `docs/` and
  `apps/docs/docs/`.
- **`.json`** — Including this very file. The Prettier override for
  `*.json` is implicit (Prettier's `json` parser uses 2-space
  indentation regardless of `useTabs: true` because JSON syntax does
  not allow tabs in key positions).

Files matched by `.gitignore` (e.g. `node_modules/`,
`apps/web/.next/`, `apps/web/.content/`) are skipped by Prettier
automatically; there is no top-level `.prettierignore` because the
gitignore-driven default is sufficient.

### `scripts.build:web` / `build:docs` / `build:docs:en` — filtered build shortcuts

```jsonc
"build:web": "turbo run build --filter=@ever-works/web",
"build:docs": "turbo run build --filter=@ever-works/docs",
"build:docs:en": "turbo run build:en --filter=@ever-works/docs"
```

The first two are the deploy-target shortcuts:

- **`build:web`** is invoked by Vercel preview / production builds
  for the host application.
- **`build:docs`** is invoked by the docs deployment.
- **`build:docs:en`** is the English-only narrowing — the
  `build:en` task in [`turbo.json`](./turbo-config.md#builden) has a
  smaller `outputs` set (`['build/**']` only, no `.next/**`) and
  drives the locale-narrowed Docusaurus build for fast preview
  deploys when content authors only need to validate English copy.

### `devDependencies.turbo` — Turborepo CLI pin

```jsonc
"devDependencies": {
	"turbo": "^2.5.0"
}
```

Turborepo 2.5+ is required because:

- **Cache key semantics.** Turborepo 2.x changed the global
  `inputs` / `outputs` interpretation. Locking the major prevents a
  silent cache-key drift between a contributor's machine and CI.
- **`$schema` support in `turbo.json`.** Turborepo 2.x reads the
  `$schema` field shown at
  [turbo-config.md#at-a-glance](./turbo-config.md#at-a-glance) and
  enforces it; older versions ignore it.
- **`persistent: true` honours `dependsOn`.** Required for the
  `dev` task to start after `^build` of generated typings.

The caret range allows minor / patch updates within the 2.x series.

### `devDependencies.prettier` — Prettier CLI pin

```jsonc
"devDependencies": {
	"prettier": "^3.5.3"
}
```

Prettier 3.5+ is required because the `*.scss` and `*.yml`
overrides shown at
[the at-a-glance table above](#at-a-glance) rely on Prettier 3's
parser routing. Prettier 2 is incompatible — its
`overrides` matcher syntax changed at the 3.0 boundary. The caret
range allows minor / patch updates within the 3.x series.

### `pnpm.publicHoistPattern` — `@opentelemetry/*` hoist

```jsonc
"pnpm": {
	"publicHoistPattern": ["@opentelemetry/*"]
}
```

By default pnpm installs each package into its own
`node_modules/.pnpm/<name>@<version>/node_modules/`, with only
direct dependencies symlinked into a member's
`node_modules/`. This rule overrides that for every package whose
name starts with `@opentelemetry/` — those packages are hoisted
to the workspace root's `node_modules/` so any transitive
dependency (Sentry instrumentation, Trigger.dev runtime, OTel
exporters) can resolve them via Node's standard
`require.resolve('@opentelemetry/api')` walk.

The reason hoisting is required: OTel libraries register
themselves on a process-wide global (`globalThis.opentelemetry`).
If two copies of `@opentelemetry/api` exist on disk (e.g. one for
Sentry, one for Trigger.dev), each registers its own global and
the instrumentation pipeline silently breaks. Hoisting forces a
single resolved copy.

The `pnpm.overrides.@opentelemetry/api` pin
([documented below](#pnpmoverrides--workspace-wide-version-pins))
is the second half of this same protection — even if the hoist rule
fails, the overrides pin guarantees a single resolved version.

### `pnpm.overrides` — workspace-wide version pins

```jsonc
"pnpm": {
	"overrides": {
		"@types/react": "19.2.7",
		"@types/react-dom": "19.2.3",
		"esbuild": "0.27.0",
		"esbuild-register": "3.6.0",
		"@opentelemetry/api": "1.9.0"
	}
}
```

Each entry forces pnpm to resolve the named package to the exact
specified version regardless of the version range that any
transitive dependency requested. The entries are not chosen
arbitrarily:

- **`@types/react` / `@types/react-dom`** — A third-party UI
  library can ship `peerDependencies: { '@types/react': '^18' }`
  in its own `package.json`. Without this override pnpm would
  install React 18 typings alongside the workspace's React 19
  typings, and TypeScript would resolve the wrong typing in random
  files. Pinning to React 19 typings forces every consumer onto
  the same `ReactNode` definition (which narrowed at React 19 to
  exclude `bigint`).
- **`esbuild`** — The bundler used by SWC fallback paths in
  Next.js, by Drizzle Kit's TS loader, and by Trigger.dev's worker
  bundler. A version drift between those three would cause
  identical TypeScript source to produce three different bundles.
  The pin guarantees a single esbuild binary across the workspace.
- **`esbuild-register`** — The `register()`-based loader Drizzle
  Kit uses to require `.ts` files at runtime in commands like
  `drizzle-kit generate`. A version drift between this and the
  `esbuild` pin would cause TypeScript syntax features (newer
  decorators, `using` declarations) to parse in one tool but not
  another.
- **`@opentelemetry/api`** — The OTel API surface every
  instrumentation library imports. See
  [`publicHoistPattern`](#pnpmpublichoistpattern--opentelemetry-hoist)
  above for the hoist half of this same protection. Two resolved
  copies break OTel's global-registration model.

Entries are added here only when a real-world resolution conflict
is observed — premature pinning leads to brittle installs that
break when one of the named packages bumps its own peer ranges.

### `pnpm.onlyBuiltDependencies` — the `postinstall` allow-list

```jsonc
"pnpm": {
	"onlyBuiltDependencies": [
		"@vercel/speed-insights",
		"@heroui/shared-utils",
		"@parcel/watcher",
		"@scarf/scarf",
		"@sentry/cli",
		"@swc/core",
		"core-js",
		"core-js-pure",
		"esbuild",
		"protobufjs",
		"sharp"
	]
}
```

pnpm 10's default posture is **deny-by-default** for native /
post-install build hooks: any package that ships a
`scripts.preinstall` / `install` / `postinstall` is blocked from
running it during `pnpm install` unless the package name appears in
this allow-list. This is a security-hardening default — a
post-install hook can execute arbitrary code as the contributor's
user.

Each entry has a documented reason to be on the list:

| Entry                      | Why it must run                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vercel/speed-insights`   | Builds the Web Vitals reporter native bridge for Edge runtime.                                                                                          |
| `@heroui/shared-utils`     | Compiles internal CSS-in-JS helpers using a build script.                                                                                               |
| `@parcel/watcher`          | Builds the platform-native filesystem-watcher binary; Next.js 16 dev server depends on it for HMR.                                                      |
| `@scarf/scarf`             | Telemetry reporter; the `postinstall` is its install-time analytics ping. Listed because removing the listing causes a noisy warning on `pnpm install`. |
| `@sentry/cli`              | Downloads the platform-specific Sentry CLI binary used by the source-map upload step in the production build.                                           |
| `@swc/core`                | Builds platform-specific SWC native bindings; Next.js 16 uses SWC for transforms whenever Turbopack is not in use.                                      |
| `core-js` / `core-js-pure` | Their `postinstall` is a no-op pinned advert; allow-listed to suppress the install-time warning.                                                        |
| `esbuild`                  | Downloads the platform-specific esbuild binary; the override above pins the version, this entry permits the binary download.                            |
| `protobufjs`               | Compiles platform-specific Protocol Buffers parser bindings used by gRPC-based OTel exporters.                                                          |
| `sharp`                    | Downloads platform-specific libvips bindings; Next.js 16 uses sharp for `next/image` optimisation under Node runtime.                                   |

Adding a new package here is a Spec-Kit-level change because any
package allowed onto this list runs arbitrary code at install
time. The corresponding addition to a workspace member's
`dependencies` should land in the same change.

### `prettier` — workspace-wide formatting baseline

```jsonc
"prettier": {
	"printWidth": 120,
	"singleQuote": true,
	"semi": true,
	"useTabs": true,
	"tabWidth": 4,
	"arrowParens": "always",
	"trailingComma": "none",
	"quoteProps": "as-needed",
	"trimTrailingWhitespace": true,
	"overrides": [
		{ "files": "*.scss", "options": { "useTabs": false, "tabWidth": 2 } },
		{ "files": "*.yml", "options": { "useTabs": false, "tabWidth": 2 } }
	]
}
```

The Prettier block is **the** source of truth — there is no
`.prettierrc` file at the repo root, by intent. Locating the rules
inside the manifest means:

1. They travel with the workspace metadata pnpm reads.
2. Prettier's resolution algorithm walks up from the formatted
   file's directory and lands here without an extra file on disk.
3. The rules are visible in the same diff as any other
   workspace-coordination change.

The two language-specific overrides exist for syntax-level
reasons: SCSS conventions universally use 2-space indents (it's
how every reference Sass codebase is formatted), and YAML
**cannot** use tabs at the top level — tab characters in YAML
parse as syntax errors at the indentation positions where Prettier
would otherwise emit them. The override on `*.yml` therefore
prevents Prettier from emitting a file that fails to round-trip
through `js-yaml` / `yaml`.

JavaScript-side files that opt out of these rules do so via their
own `.prettierrc` or per-file `// prettier-ignore` directives;
those overrides are scoped to the workspace member that needs
them.

## Deliberately absent fields

Several fields a typical `package.json` would carry are missing
from the root manifest **on purpose**:

- **`dependencies`** — The root has no runtime code; nothing
  imports anything from the root's perspective. Every dependency is
  a `devDependency` or a workspace dependency declared by a
  member.
- **`workspaces`** — pnpm reads
  [`pnpm-workspace.yaml`](./pnpm-workspace.md) instead of the
  Yarn / npm `workspaces` field. Including both would create two
  sources of truth for the workspace shape.
- **`main` / `exports` / `types` / `module`** — The root is not
  importable. Adding any of these would make
  `import x from 'ever-works-monorepo'` resolve, which is meaningless
  and would mask a missing-package import bug.
- **`bin`** — The root exposes no CLI. Per-member CLIs (e.g.
  `apps/web`'s `next` CLI) are reached through their own
  `node_modules/.bin/`.
- **`type`** — Omitted at the root because the root has no
  executable code. Each member declares `"type": "module"` (the
  SDK, runtime, demo) or relies on Next.js's per-app convention
  (`apps/web`).
- **`repository` / `homepage` / `bugs`** — Available in
  [`README.md`](https://github.com/ever-works/directory-web-template/blob/develop/README.md)
  and the GitHub project metadata. Adding them here would create
  a second source of truth that drifts the moment the GitHub
  organisation or repository is renamed.
- **`peerDependencies`** — The root is not a library; nothing
  declares peers against the workspace root.
- **`engineStrict` / `os` / `cpu`** — Pnpm enforces
  `engines.node` strictly by default in 10.x; an explicit
  `engineStrict` is redundant. `os` / `cpu` are member-level
  concerns (e.g. `sharp`'s platform-specific binary) and the
  `onlyBuiltDependencies` allow-list documented above is the lever
  for those.

Adding any of these is a Spec-Kit-level change because each one
moves responsibility from a workspace member up to the root, which
is a layering violation that makes a member's posture dependent on
the workspace shape.

## Why this file lives at the repo root

Locating the manifest at the repo root is **structural**: pnpm,
Corepack, Turborepo, Vercel, GitHub Actions, the Renovate
dependency-update bot, and every contributor's editor all walk
upward from their starting directory and stop at the first
`package.json` they find. If this file lived under a `config/`
subfolder:

1. `pnpm install` from the root would fail — pnpm would not find a
   workspace manifest and would treat the root as an empty
   directory.
2. Corepack would not pick up the `packageManager` pin.
3. Turborepo would error before reading `turbo.json`.
4. Vercel's auto-detected build runner would mis-fire with
   `Could not find package.json`.
5. Editors using
   [pnpm's
   `@types/node` / `@types/react` resolution](https://pnpm.io/feature-comparison)
   would resolve typings against the wrong root.

The location is therefore not a stylistic choice — it is a
contract every consumer of this workspace assumes.

## Consumers — who reads this file

| Consumer                     | What it reads                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Corepack                     | `packageManager` to download and shim the exact pnpm version.                                                     |
| pnpm                         | `engines.node`, `pnpm.publicHoistPattern`, `pnpm.overrides`, `pnpm.onlyBuiltDependencies`, `devDependencies`.     |
| Turborepo (`turbo` CLI)      | `scripts` (for the entry-point `turbo run <task>` invocation), `devDependencies.turbo`.                           |
| Prettier (`prettier` CLI)    | The entire `prettier` block as the formatting source of truth.                                                    |
| Vercel build runner          | `engines.node`, `packageManager`, `scripts.build:web` (auto-detected).                                            |
| GitHub Actions               | `scripts.lint`, `scripts.build`, `scripts.test:e2e` invoked from the workflows under `.github/workflows/`.        |
| Editors (VS Code, JetBrains) | The `prettier` block via Prettier's resolution walk; the `engines.node` field for the recommended-runtime banner. |
| Renovate / Dependabot        | `devDependencies` for floating-range proposals; the `pnpm.overrides` block as a do-not-touch annotation.          |
| Contributors                 | `scripts` for the public command surface (`pnpm dev`, `pnpm build`, `pnpm format`, etc.).                         |

If a new consumer is added (e.g. a CI gate that requires a top-level
field), document it in this table in the same change.

## Failure matrix

| Symptom                                                                             | Likely cause                                                                                             | Fix                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install` errors with `ERR_PNPM_UNSUPPORTED_ENGINE`                            | Contributor's Node version is below `engines.node`'s `>=20.19.0` floor.                                  | Upgrade Node (e.g. via `nvm install 20.19`). The floor is intentional — see [`engines.node`](#enginesnode--nodejs-floor).                                                           |
| `pnpm install` errors with `Wrong package manager`                                  | Corepack downloaded a pnpm version that mismatches the `packageManager` pin.                             | Run `corepack prepare pnpm@10.31.0 --activate` (or update the pin if intentional).                                                                                                  |
| Sentry / Trigger.dev OTel instrumentation silently misses spans                     | Two copies of `@opentelemetry/api` resolved on disk because the hoist or override drifted.               | Verify [`pnpm.publicHoistPattern`](#pnpmpublichoistpattern--opentelemetry-hoist) and [`pnpm.overrides.@opentelemetry/api`](#pnpmoverrides--workspace-wide-version-pins) are intact. |
| `pnpm install` fails on a fresh clone with "ignored build script" warnings          | A new dependency landed that ships a `postinstall`, but its name is not in `pnpm.onlyBuiltDependencies`. | Audit the package's install hook. If it's required, add the name to the allow-list in the same change. Otherwise the warning is the success.                                        |
| Next.js 16 dev server reports `react-dom` typings clash                             | A transitive UI library installed a stale `@types/react@18` version that bypassed the override.          | Confirm `pnpm.overrides.@types/react` is at `19.2.7`; bump and reinstall.                                                                                                           |
| `pnpm format` rewrites every YAML file under `.github/workflows/` with tabs         | The `*.yml` Prettier override is missing or malformed.                                                   | Restore [`prettier.overrides[*.yml]`](#prettier--workspace-wide-formatting-baseline). YAML cannot use tabs.                                                                         |
| `pnpm dev:web` errors with `No matching project found for filter '@ever-works/web'` | The host app's `package.json` `name` field was renamed without updating this script.                     | Update the filter shortcut and the matching `--filter` arguments in `scripts.dev:web`, `scripts.build:web`.                                                                         |
| `turbo run <task>` errors with `Couldn't find a turbo binary`                       | `devDependencies.turbo` got dropped or the lockfile is out of sync.                                      | Restore the entry and run `pnpm install`.                                                                                                                                           |
| Vercel preview build fails with `pnpm: command not found`                           | The deployment runner is using a default Node toolchain without Corepack, ignoring `packageManager`.     | Ensure the project's Vercel settings enable Corepack (or pin pnpm via the project's `INSTALL_COMMAND`).                                                                             |

## Public-surface change checklist

Before merging a PR that touches this file, verify each of:

- [ ] The change is documented on **this** page in the same commit
      (no doc-drift from the manifest).
- [ ] If `engines.node` is bumped, the
      [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion)
      plan section on environment requirements is updated.
- [ ] If `packageManager` is bumped, every CI workflow under
      `.github/workflows/` is verified to enable Corepack.
- [ ] If `pnpm.overrides` gains an entry, the rationale is added to
      [pnpm.overrides — workspace-wide version pins](#pnpmoverrides--workspace-wide-version-pins).
- [ ] If `pnpm.onlyBuiltDependencies` gains an entry, the package's
      install-time behaviour is audited and the row added to the
      [allow-list table](#pnpmonlybuiltdependencies--the-postinstall-allow-list).
- [ ] If a `scripts.*` entry is added, removed, or renamed, the
      same change updates any `.github/workflows/*.yml`,
      `apps/*/vercel.json`, or contributor docs that referenced
      the old name.
- [ ] If the `prettier` block changes, `pnpm format` is run against
      the entire workspace in the same commit so the formatted
      tree matches the new rules.
- [ ] [`docs/log.md`](../log.md) gets a one-line entry under the
      release date.

## See also

- [`pnpm-workspace.md`](./pnpm-workspace.md) — the per-source-file
  reference for `pnpm-workspace.yaml`, the workspace-glob declaration
  this manifest's scripts fan tasks across.
- [`turbo-config.md`](./turbo-config.md) — the per-source-file
  reference for `turbo.json`, the task pipeline this manifest's
  scripts invoke via `turbo run`.
- [`tsconfig-presets.md`](./tsconfig-presets.md) — the per-source-file
  reference for the four files in `packages/tsconfig/`, the shared
  TypeScript posture every workspace member extends.
- [`eslint-config.md`](./eslint-config.md) — the per-source-file
  reference for the shared ESLint flat config under
  `packages/eslint-config/`.
- [`sdk-package-manifest.md`](./sdk-package-manifest.md),
  [`runtime-package-manifest.md`](./runtime-package-manifest.md),
  [`plugin-demo-package-manifest.md`](./plugin-demo-package-manifest.md)
  — the per-source-file references for each plugin package's own
  `package.json`.
- [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion)
  — the spec under which this manifest was created.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
  — the spec under which the per-package manifests were created.
