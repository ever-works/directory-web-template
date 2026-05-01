---
id: plugin-tsconfigs
title: Plugin Package TypeScript Configurations
sidebar_label: Plugin Package tsconfigs
sidebar_position: 21
---

# Plugin Package TypeScript Configurations

> **Status.** Authoritative reference for the per-package
> `tsconfig.json` files of the three plugin-system packages defined in
> [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The configurations are locked by
> [`packages/plugin-sdk/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/tsconfig.json),
> [`packages/plugin-runtime/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/tsconfig.json),
> and
> [`packages/plugin-demo/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/tsconfig.json),
> all of which inherit from the workspace's shared base config at
> [`packages/tsconfig/base.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/base.json).
> When any plugin package's compiler options or `include` / `exclude`
> globs change, update **this** page in the same change so the doc and
> the package configurations cannot drift.

The plugin system ships **three** workspace packages
(`@ever-works/plugin-sdk`, `@ever-works/plugin-runtime`,
`@ever-works/plugin-demo`) and each one has its own `tsconfig.json`.
All three are intentionally identical, deliberately tiny, and sit
directly above the shared base config from
[`@ever-works/tsconfig`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig).
The pattern is the load-bearing decision: every plugin-system package
inherits `target`, `module`, `moduleResolution`, `strict`, and the
rest of the workspace's TypeScript posture from one place, and only
adds the per-package overrides that genuinely differ — which today
amounts to the JSX flag and the React-types entry.

This page is the **per-source-file reference** that pairs with the
three `tsconfig.json` files the same way
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
plugin's TypeScript sources under `packages/plugin-demo/src/`. Where
the package-manifest references cover **how** the package is wired
into Node's resolution algorithm and `package.json#exports`, this
page covers **how** the package's TypeScript compiler is configured
when `pnpm tsc --noEmit` runs against its sources.

## At a glance — the three identical files

The three plugin packages have **byte-identical** `tsconfig.json`
files:

```jsonc
{
	"extends": "@ever-works/tsconfig/base.json",
	"compilerOptions": {
		"jsx": "react-jsx",
		"types": ["react"]
	},
	"include": ["src/**/*"],
	"exclude": ["node_modules", "dist"]
}
```

| Field                   | Value                              | Why it matters                                                                                                                                                                        |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extends`               | `"@ever-works/tsconfig/base.json"` | Inherits `target`, `module`, `moduleResolution`, `strict`, `esModuleInterop`, `noEmit`, `incremental`, and the rest of the workspace's TS posture from one place.                     |
| `compilerOptions.jsx`   | `"react-jsx"`                      | Enables the React-17+ automatic JSX runtime so plugin authors don't need `import React from 'react'` in `.tsx` files. The runtime alone is enough.                                    |
| `compilerOptions.types` | `["react"]`                        | Restricts ambient types to React only so a stray `@types/node`, `@types/jest`, or DOM polyfill in a transitive `node_modules` cannot leak into the plugin's compilation.              |
| `include`               | `["src/**/*"]`                     | Type-check every file under `src/` — the public surface and any internal helpers. Keeps the package boundary at `src/` so build artefacts and tests sit outside.                      |
| `exclude`               | `["node_modules", "dist"]`         | The standard "don't try to type-check vendored code or build output" exclusion. `dist/` is never produced today (see manifest pages) but the entry guards against future build steps. |

The three configurations are kept identical on purpose — all three
plugin packages have the same TypeScript posture (strict React-aware
ESM with the workspace's shared base) so a contributor who edits one
must edit all three, which is the desired friction point.

## Field-by-field

### `extends` — the shared base inherits the workspace's TS posture

```jsonc
"extends": "@ever-works/tsconfig/base.json"
```

The `extends` directive resolves through Node's `require.resolve()`
algorithm to
[`packages/tsconfig/base.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/base.json),
which is consumed via the `@ever-works/tsconfig` workspace package
declared in each plugin's
[`devDependencies.@ever-works/tsconfig`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/package.json)
as `workspace:*`. The shared base sets:

```jsonc
{
	"compilerOptions": {
		"target": "ES2017",
		"lib": ["dom", "dom.iterable", "esnext"],
		"allowJs": true,
		"skipLibCheck": true,
		"strict": true,
		"noEmit": true,
		"esModuleInterop": true,
		"module": "esnext",
		"moduleResolution": "bundler",
		"resolveJsonModule": true,
		"isolatedModules": true,
		"incremental": true
	},
	"exclude": ["node_modules"]
}
```

Each of those flags is load-bearing for a plugin author:

- **`target: "ES2017"`** keeps the lowering floor at native
  `async`/`await`, `Object.entries`, and exponentiation operator —
  the shared lower-bound across every host the plugin runs against.
- **`lib`** pulls in the DOM types that
  [`SlotHost.tsx`](./slot-host.md) and the demo's
  [`Header.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/src/Header.tsx)
  rely on at type-check time, plus the modern JS lib. A future
  Node-only plugin (no React, no DOM) could narrow this in its own
  `tsconfig.json` — but the three current packages all touch the DOM
  through React.
- **`allowJs: true`** lets a plugin author drop a `.js` file into
  `src/` for a generated artefact without forcing a refactor — the
  flag is dormant for the three current packages, all of which are
  pure TS/TSX.
- **`skipLibCheck: true`** turns off type-checking inside transitive
  `.d.ts` files. The plugin-system packages depend on `zod` and
  `react`, both of which ship typings; type-checking them on every
  `pnpm tsc --noEmit` is wasted work.
- **`strict: true`** is the load-bearing flag — every implicit-any,
  every nullable misuse, every `this`-context bug, and every
  function-property-narrowing mistake is caught at the package
  boundary. A regression that flips this to `false` would bypass the
  plugin system's type contract entirely.
- **`noEmit: true`** matches the package manifests: the three
  packages ship TypeScript sources directly via `package.json#exports`
  (no `dist/`), so the compiler's only job is type-checking. A future
  build step that needs `.d.ts` artefacts (e.g. for IntelliSense
  speed) would override this in a separate `tsconfig.build.json`,
  not flip it here.
- **`esModuleInterop: true`** allows
  `import type { ZodType } from 'zod'` to work cleanly even though
  Zod is technically an ESM-with-CJS-shim package.
- **`module: "esnext"` + `moduleResolution: "bundler"`** matches the
  package manifests' `"type": "module"` posture and lets `tsc`
  resolve the same `package.json#exports` map at type-check time as
  the bundler does at build time.
- **`resolveJsonModule: true`** is required for any plugin that wants
  to `import data from './data.json'` — none of the three current
  packages do, but the flag is harmless when unused and the cost of
  wiring it back on later (in a downstream plugin) is non-trivial.
- **`isolatedModules: true`** enforces single-file transpilation
  semantics so `swc` and `esbuild` (used by Next.js / Turbopack /
  Vite) can transpile each file independently without any
  cross-file type-stripping passes.
- **`incremental: true`** caches `.tsbuildinfo` between runs so a
  `pnpm tsc --noEmit` on the same source set is near-instant on the
  second invocation. The cache file lands in
  [`tsconfig.tsbuildinfo`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tsconfig.tsbuildinfo)
  next to the config that produced it.

The shared base also sets `exclude: ["node_modules"]`. The plugin
packages **add** `"dist"` to that list (see below), but `node_modules`
is inherited from the base — never re-stated in the per-package
file.

### `compilerOptions.jsx` — the automatic React JSX runtime

```jsonc
"compilerOptions": {
  "jsx": "react-jsx"
}
```

`"react-jsx"` is the React-17-and-newer automatic runtime. It tells
the TypeScript compiler to emit calls to
`react/jsx-runtime` (`jsx`, `jsxs`, `Fragment`) instead of the
legacy `React.createElement` calls. The practical consequence for
plugin authors is:

```tsx
// Authoring with `"jsx": "react-jsx"`. No React import needed.
export function Badge() {
	return <span>hello</span>;
}
```

Compare with the legacy `"react"` setting, which would require:

```tsx
// Legacy `"jsx": "react"` (NOT what we use).
import React from 'react';

export function Badge() {
	return <span>hello</span>;
}
```

The three plugin packages all ship JSX:

- **plugin-sdk** ships `slots.ts`, `manifest.ts`, `providers.ts`,
  `plugin.ts`, `capabilities.ts`, `index.ts` — none of which write
  literal JSX. But the type definitions in `plugin.ts` reference
  `React.ComponentType<SlotComponentProps<TConfig>>`, which means
  the SDK's type-check **does** need the JSX scope to be open even
  though the SDK itself never authors JSX.
- **plugin-runtime** ships `SlotHost.tsx`, which authors literal
  JSX inside the slot mapping. The runtime is the package that most
  obviously needs `react-jsx`.
- **plugin-demo** ships `Header.tsx`, which authors literal JSX. The
  demo is the package that most obviously needs `react-jsx`.

A regression that flips this to `"react"` would force every plugin
author to add `import React from 'react'` at the top of every `.tsx`
file. That's a breaking change to the plugin author's experience and
must go through a Spec Kit revision before landing.

### `compilerOptions.types` — restrict ambient typings to React only

```jsonc
"compilerOptions": {
  "types": ["react"]
}
```

The `types` option is one of TypeScript's most surprising features:
when **omitted**, the compiler implicitly pulls in every
`@types/*` package found anywhere in `node_modules`, including
transitive ones. When **set explicitly** (even to an empty array),
only the listed packages contribute ambient types.

Setting `types: ["react"]` is a **whitelist**:

- The plugin's compilation gets ambient access to `React`,
  `React.ComponentType`, `React.ReactNode`, `JSX.IntrinsicElements`,
  and the rest of the React typings — which is exactly what
  `SlotComponentProps<TConfig>` and the slot components need.
- Stray transitive `@types/*` packages (e.g. `@types/node` pulled in
  by an indirect dev dependency, `@types/jest` from a transitive
  test framework, DOM polyfill ambient types) **cannot** leak into
  the plugin's compilation. The package's strict, isolated boundary
  holds.

The whitelist is intentional and matters for plugin authors who
copy this `tsconfig.json` as a starting point: a downstream plugin
that needs `process.env.MY_KEY` (a Node ambient type) must
**explicitly** add `"node"` to its own `types` array; it will not
inherit Node typings by accident.

### `include` — type-check `src/` and only `src/`

```jsonc
"include": ["src/**/*"]
```

The package boundary is `src/`. Every file under `src/` is part of
the public-surface contract (or an internal helper consumed only by
the public surface), so every file under `src/` is type-checked.
Everything else — build outputs, fixtures, generated files,
`tsconfig.json` itself — is intentionally outside the scope.

The deliberate consequence: a plugin author who drops a one-off
script into the package root (e.g.
`packages/plugin-demo/scripts/generate-slot-list.mjs`) does **not**
have it type-checked by `pnpm tsc --noEmit`. That script must either
move under `src/` (and become part of the package's public surface
via `package.json#exports`) or stay outside (and be excluded from the
type-check guarantee). The `tsconfig.json` cannot have it both ways,
which is the intended forcing function.

### `exclude` — keep build outputs and `node_modules` out

```jsonc
"exclude": ["node_modules", "dist"]
```

The shared base already excludes `node_modules`; the plugin packages
add `"dist"` to the list as a forward-looking guard. Today, none of
the three plugin packages produce a `dist/` directory — they ship
TypeScript sources directly via `package.json#exports`. But a
future build step (e.g. `tsup` to emit `.d.ts` artefacts for
IntelliSense speed) would land its output in `dist/`, and the
exclusion ensures `tsc --noEmit` never tries to type-check the
build output (which would lead to "I see foo.d.ts and foo.ts and
they conflict" errors).

Re-stating `node_modules` in the per-package file alongside `dist`
is a deliberate readability choice — a contributor who opens the
file should see both exclusions in one place rather than
mentally-merging the inherited `node_modules` exclusion from the
base config.

## How the three packages diverge from this baseline

Today they don't. All three plugin packages have the **same five
lines** in their `tsconfig.json`. Each future divergence requires
explicit justification:

| Hypothetical override                               | Why it might be added                                                                                                            | Why it isn't today                                                                                                                                                                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compilerOptions.types: ["react", "node"]`          | A plugin-demo or plugin that needs `process.env` ambient typing.                                                                 | The demo does not read `process.env`. The SDK is framework-agnostic. The runtime reads `process.env` only inside `loader.ts`, which uses the `process.env.X` form (string-indexed access) and does not need ambient `process` typing. |
| `compilerOptions.declaration: true`                 | A future build step that emits `.d.ts` files alongside source for faster IntelliSense in IDEs that pre-warm declaration files.   | The packages ship sources directly via `exports`; IDEs walk the source tree just as fast.                                                                                                                                             |
| `compilerOptions.outDir: "./dist"`                  | Same as above — would pair with `declaration: true` once a build step exists.                                                    | Same — there is no build step today.                                                                                                                                                                                                  |
| `compilerOptions.composite: true`                   | Project references for parallel `tsc -b` builds across the monorepo.                                                             | Turborepo orchestrates parallelism at the workspace level (`turbo run typecheck`), not at the `tsc` level.                                                                                                                            |
| `compilerOptions.lib: ["esnext"]`                   | A future Node-only plugin (no React, no DOM) that wants the smallest possible lib set.                                           | The three current packages all touch the DOM via React.                                                                                                                                                                               |
| `include: ["src/**/*", "scripts/**/*.ts"]`          | A plugin that ships a CLI helper alongside the runtime artefact.                                                                 | None of the three current packages have a CLI helper.                                                                                                                                                                                 |
| `exclude: ["node_modules", "dist", "**/*.test.ts"]` | A plugin that co-locates Vitest specs alongside source files but doesn't want them type-checked under the package's strict mode. | Tests for the plugin packages live in `apps/web-e2e/`, not in `packages/*/src/`.                                                                                                                                                      |

A plugin author who needs any of the above for their **own**
package should override locally — but **must not** override in any
of the three plugin-system packages without a Spec Kit revision.

## Failure matrix

These are the manifestations of a `tsconfig.json` mistake mapped
back to where they surface:

| Manifestation                                                                                                | What changed                                                                                             | Where it surfaces                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `JSX element implicitly has type 'any' because no interface 'JSX.IntrinsicElements' exists.`                 | `compilerOptions.types` set to `[]` or `["node"]` — React typings dropped from the whitelist.            | `pnpm tsc --noEmit` in any plugin package that authors JSX (runtime, demo).                                                                   |
| `Cannot use JSX unless the '--jsx' flag is provided.`                                                        | `compilerOptions.jsx` removed or set to `"preserve"` without a downstream Babel/swc transform.           | `pnpm tsc --noEmit` in any plugin package that authors JSX.                                                                                   |
| `'process' is not defined.`                                                                                  | A plugin source file references `process.env.X` without `compilerOptions.types` listing `"node"`.        | `pnpm tsc --noEmit` in the plugin package that introduced the reference.                                                                      |
| Slow `pnpm tsc --noEmit` (10x baseline) on the second run.                                                   | `compilerOptions.incremental: false` overridden in a per-package `tsconfig.json`.                        | `pnpm tsc --noEmit` wall-clock on the second invocation; `tsconfig.tsbuildinfo` not produced.                                                 |
| `File 'src/foo.test.ts' is not in project / not under 'rootDir'.`                                            | `include` widened to a sibling directory but `rootDir` not adjusted.                                     | `pnpm tsc --noEmit` in the package that introduced the new path.                                                                              |
| Stray `@types/jest` symbols (`describe`, `it`, `expect`) leaking into a plugin source file.                  | `compilerOptions.types` removed (returns to the implicit "include everything in `node_modules/@types`"). | `pnpm tsc --noEmit` succeeds (because the symbols resolve), but the symbols leak into IntelliSense and create false-positive autocompletions. |
| `Output file 'dist/index.js' has not been built from source file 'src/index.ts'.`                            | `noEmit: false` overridden without an `outDir` set.                                                      | `pnpm tsc --noEmit` (the inner `tsc` invocation) emits `.js` artefacts into `src/`, polluting the source tree.                                |
| `Compiler option 'isolatedModules' may not be used with 'composite'.`                                        | `composite: true` added without dropping `isolatedModules: true`.                                        | `pnpm tsc --noEmit` in the per-package run.                                                                                                   |
| Demo plugin's `Header.tsx` typechecks locally but fails in CI with `Cannot find module 'react/jsx-runtime'.` | A regression that downgrades `react` peer-dep to `^17` while keeping `jsx: "react-jsx"`.                 | CI's `pnpm tsc --noEmit` after the lockfile resolves to the older React.                                                                      |
| Plugin author's downstream `tsconfig.json` doesn't extend `@ever-works/tsconfig/base.json`.                  | A copy-paste mistake when scaffolding a third-party plugin.                                              | The plugin's first `pnpm tsc --noEmit` run, which succeeds with non-strict defaults — silent regression of the strict contract. The           |
| [`testing-a-plugin.md`](./testing-a-plugin.md) checklist guards against this.                                |

## Public-surface change checklist

When the `tsconfig.json` of any plugin package changes:

- [ ] **Update this page**. The configuration values cited here are
      load-bearing; the doc can never lag the file.
- [ ] **Update the matching package-manifest reference**. If the
      change affects the JSX runtime, the React peer-dep range, or
      the entry-file extension, the per-package
      [`sdk-package-manifest.md`](./sdk-package-manifest.md),
      [`runtime-package-manifest.md`](./runtime-package-manifest.md),
      or
      [`plugin-demo-package-manifest.md`](./plugin-demo-package-manifest.md)
      must be updated in the same commit.
- [ ] **Cross-check the shared base**. Most TS-posture changes
      should land in
      [`packages/tsconfig/base.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/base.json),
      not in the per-plugin file. If the change is per-plugin, the
      "How the three packages diverge from this baseline" section
      above must be updated to explain why.
- [ ] **Cross-check
      [Authoring a Plugin](./authoring-a-plugin.md)**. The author's
      guide cites the TS-posture (strict mode, automatic JSX runtime,
      React-only ambient types). A regression of any of those flags
      requires a guide rewrite in the same commit.
- [ ] **Cross-check [`packages.md`](./packages.md)**. The packages
      overview cites the per-package configurations in summary form.
- [ ] **Run `pnpm tsc --noEmit` from the workspace root and from
      each plugin package directory.** A change that compiles cleanly
      from the root via Turborepo can still fail when run from a
      package directory directly because Turborepo's cache may mask
      the regression — verify both paths.
- [ ] **Append a `docs/log.md` entry** under today's date. The line
      should mention the option, the old value, the new value, and
      the cross-link to this page.
- [ ] **Add or update an entry in
      [`docs/questions.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/questions.md)**
      if the change opens a configuration choice (e.g. "should the
      plugin packages emit `.d.ts` artefacts?"). Default to the
      most conservative option and let the user override later.
- [ ] **Update the
      [Constitution Check](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
      note** in the PR description if the change affects Article II
      (TypeScript-Only) or Article III (Public-Surface Stability).

## Cross-references

- [Plugin SDK Package Manifest Reference](./sdk-package-manifest.md)
  — the manifest reference for `@ever-works/plugin-sdk`, whose
  `package.json` pulls in `@ever-works/tsconfig` as a `devDependency`
  so the per-package `tsconfig.json` can `extends` it.
- [Plugin Runtime Package Manifest Reference](./runtime-package-manifest.md)
  — the manifest reference for `@ever-works/plugin-runtime`, which
  follows the same `tsconfig.json` shape as the SDK.
- [Plugin Demo Package Manifest Reference](./plugin-demo-package-manifest.md)
  — the manifest reference for `@ever-works/plugin-demo`, which
  follows the same `tsconfig.json` shape as the SDK and runtime.
- [Plugin Packages overview](./packages.md) — the table that lists
  all three plugin packages with the same field-by-field treatment
  in summary form.
- [Authoring a Plugin](./authoring-a-plugin.md) — the author's
  guide that shows how a downstream plugin author should structure
  their own `tsconfig.json` to match the workspace's TS posture.
- [Testing a Plugin](./testing-a-plugin.md) — the test-plan guide
  that lists `pnpm tsc --noEmit` as the package-level quality gate.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
  — the source-of-truth spec that locks the plugin system's
  package-level contract.
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
  — Article II (TypeScript-Only) and Article III (Public-Surface
  Stability) are the two articles this configuration enforces at
  the type-check boundary.
