---
id: plugin-tsconfig-presets
title: Shared TypeScript Presets (`@ever-works/tsconfig`)
sidebar_label: Shared TS Presets
sidebar_position: 23
---

# Shared TypeScript Presets (`@ever-works/tsconfig`)

> **Status.** Authoritative reference for the workspace's shared
> TypeScript preset package defined in
> [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The presets are locked by
> [`packages/tsconfig/base.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/base.json),
> [`packages/tsconfig/nextjs.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/nextjs.json),
> [`packages/tsconfig/playwright.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/playwright.json),
> and the package itself is described in
> [`packages/tsconfig/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/package.json).
> When any preset's `compilerOptions`, the inheritance chain, the
> `files` array on the package manifest, or the consumer set changes,
> update **this** page in the same change so the doc and the package
> cannot drift.

`@ever-works/tsconfig` is the **shared workspace tooling** package
that exports three TypeScript configuration presets — `base`,
`nextjs`, and `playwright` — for every consumer in the monorepo. It
sits at the same level as
[`@ever-works/eslint-config`](./eslint-config.md): both packages
factor a workspace-wide convention into a single workspace package
so the host app
([`apps/web/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web)),
the e2e suite
([`apps/web-e2e/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e)),
and the three plugin packages
([`packages/plugin-sdk/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk),
[`packages/plugin-runtime/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime),
and
[`packages/plugin-demo/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo))
can extend a single source of truth instead of copy-pasting compiler
options into every package.

This page is the **per-source-file reference** that pairs with all
four files inside `packages/tsconfig/` the same way
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
[`plugin-demo.md`](./plugin-demo.md) pairs with the bundled
reference plugin under `packages/plugin-demo/src/`. Where
[`plugin-tsconfigs.md`](./plugin-tsconfigs.md) covers the
**downstream** plugin `tsconfig.json` files that extend `base.json`,
this page covers the **upstream** preset package itself — the three
preset files plus the manifest that publishes them.

## At a glance

| Aspect              | Value                                                                                                                                                                                                                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Package name        | `@ever-works/tsconfig`                                                                                                                                                                                                                                                                                                                                             |
| Package path        | [`packages/tsconfig/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig)                                                                                                                                                                                                                                                        |
| Visibility          | `private: true` — workspace-only, never published                                                                                                                                                                                                                                                                                                                  |
| License             | `AGPL-3.0`                                                                                                                                                                                                                                                                                                                                                         |
| Version             | `0.0.0` — pinned because the package is consumed exclusively via `workspace:*`                                                                                                                                                                                                                                                                                     |
| Published files     | `["base.json", "nextjs.json", "playwright.json"]` (the three preset files; `package.json` itself is implicit)                                                                                                                                                                                                                                                      |
| Preset count        | Three — `base`, `nextjs`, `playwright`                                                                                                                                                                                                                                                                                                                             |
| Inheritance shape   | `nextjs.json` ⊃ `base.json`; `playwright.json` ⊃ `base.json`; the two leaves never overlap                                                                                                                                                                                                                                                                         |
| Consumer count      | Six — `apps/web`, `apps/web-e2e`, `packages/plugin-sdk`, `packages/plugin-runtime`, `packages/plugin-demo`, and (transitively) any future workspace package                                                                                                                                                                                                        |
| Out-of-scope today  | `apps/docs` (uses `@docusaurus/tsconfig` directly — see [§ Consumers](#consumers))                                                                                                                                                                                                                                                                                 |
| Direct dependencies | None — presets are pure JSON; the `@ever-works/tsconfig` package has no runtime, no `dependencies`, no `devDependencies`, no `peerDependencies`                                                                                                                                                                                                                    |

The package is **deliberately minimal** — three flat JSON files plus
a four-line manifest. There is no script, no compile step, no
generated artefact, and no rule beyond what TypeScript itself
enforces when a consumer's `tsc --noEmit` resolves the `extends`
chain.

## File map

The package is intentionally four files. Each has a single
responsibility:

| File                                                                                                                  | Responsibility                                                                                                | Pairs with                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [`base.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/base.json)           | The workspace's TypeScript posture: `target`, `module`, `moduleResolution`, `strict`, and the rest           | Every workspace package — directly via `extends` or transitively via `nextjs.json` / `playwright.json`      |
| [`nextjs.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/nextjs.json)       | The Next.js leaf — adds `jsx: "preserve"` and the `next` TS plugin so `apps/web` can compile App Router code | `apps/web/tsconfig.json` (the only consumer today)                                                          |
| [`playwright.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/playwright.json) | The Playwright leaf — opts into `@types/node` so e2e specs can `import { test } from '@playwright/test'`     | `apps/web-e2e/tsconfig.json` (the only consumer today)                                                      |
| [`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/package.json)     | Declare the package name `@ever-works/tsconfig`, the `private: true` flag, the license, and the `files` array | Node's resolution algorithm and pnpm's workspace graph                                                      |

There is no `src/`, no barrel, no script, and no entry point — the
three preset files **are** the public API. A consumer references
them by their JSON path (`@ever-works/tsconfig/base.json`,
`@ever-works/tsconfig/nextjs.json`,
`@ever-works/tsconfig/playwright.json`) directly through TypeScript's
`extends` resolver, which uses Node's `require.resolve()` algorithm
to find the package root and then joins the path from the bare
specifier.

## `base.json` — the workspace's TypeScript posture

The base preset is the **single source of truth** for every
TypeScript option that should be identical across the entire
monorepo. It is twelve compiler options plus a single `exclude`
entry:

```jsonc
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
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

| Field                                | Value                              | Why it matters                                                                                                                                                                                                                |
| ------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compilerOptions.target`             | `"ES2017"`                         | Lowering floor. Async/await is native, but no top-level await, no nullish coalescing in emit, no class private fields. Set deliberately conservative because Next.js handles further down-leveling.                            |
| `compilerOptions.lib`                | `["dom", "dom.iterable", "esnext"]` | Ambient types: DOM + iterable DOM (NodeList, HTMLCollection iterators) + the latest ECMAScript. Every package — even server-only — gets DOM types because React typings reference them.                                       |
| `compilerOptions.allowJs`            | `true`                             | Lets `.js` and `.mjs` files coexist with `.ts` files without a separate compilation pipeline. Required because [`packages/eslint-config/nextjs.mjs`](./eslint-config.md) and other tooling configs ship as `.mjs`.            |
| `compilerOptions.skipLibCheck`       | `true`                             | Don't deep-type-check `node_modules/**/*.d.ts`. Without this flag, a single broken upstream typings file fails the entire `tsc` run; this is the standard escape hatch.                                                       |
| `compilerOptions.strict`             | `true`                             | The load-bearing flag. Enables `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, and `alwaysStrict` — the seven sub-flags `strict` covers. |
| `compilerOptions.noEmit`             | `true`                             | The workspace runs `tsc` only as a type-checker; it never produces `.js` artefacts. Bundling is Next.js + Turborepo's job; type-checking is `tsc`'s job.                                                                       |
| `compilerOptions.esModuleInterop`    | `true`                             | Lets `import x from 'cjs-module'` work for CommonJS modules that lack a default export. Required because Zod ships dual-format and the workspace consumes its CJS shim through ESM imports.                                  |
| `compilerOptions.module`             | `"esnext"`                         | Emit ES module syntax. Pairs with `moduleResolution: "bundler"` to give bundler-style resolution under ESM semantics — the modern Next.js / Vite / Turbopack convention.                                                      |
| `compilerOptions.moduleResolution`   | `"bundler"`                        | The TS 5.0+ resolution strategy that follows the `package.json#exports` map without forcing the `.js` extension on relative imports. Required for `@ever-works/plugin-sdk/capabilities` to resolve.                            |
| `compilerOptions.resolveJsonModule`  | `true`                             | Lets `.ts` files do `import data from './data.json'` and get a strongly-typed value. Used by the seed scripts and a few config readers.                                                                                       |
| `compilerOptions.isolatedModules`    | `true`                             | Forces every file to be a self-contained module — no `const enum`, no namespace re-exports without `export type`. Required by swc / esbuild / Turbopack which compile one file at a time.                                    |
| `compilerOptions.incremental`        | `true`                             | Writes a `.tsbuildinfo` cache so a second `tsc --noEmit` run skips files whose deps have not changed. Cuts CI lint times for the workspace from ~45s to ~12s on a hot cache.                                                  |
| `exclude`                            | `["node_modules"]`                 | The standard "don't try to type-check vendored code" exclusion. Combined with `skipLibCheck: true` this gives belt-and-suspenders coverage for transitive deps.                                                              |

The `$schema` line is metadata for editors that understand JSON
Schema; it has no effect on `tsc`. It is included so VS Code and
JetBrains IDEs can autocomplete preset fields when an author edits
the file directly.

There is no `compilerOptions.types` whitelist on the base preset —
each leaf preset (`nextjs.json`, `playwright.json`) and each
consumer adds its own. This is by design: a base-level `types`
array would force every consumer to opt into or out of every
ambient package, which would defeat the purpose of having narrowed
leaf presets.

## `nextjs.json` — the Next.js leaf

The Next.js preset is a two-line override on top of `base.json`:

```jsonc
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "extends": "./base.json",
    "compilerOptions": {
        "jsx": "react-jsx",
        "plugins": [{ "name": "next" }]
    }
}
```

| Field                          | Value                | Why it matters                                                                                                                                                                                                                                                                                                            |
| ------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extends`                      | `"./base.json"`      | Inherits every option from `base.json` via the relative-path resolver. The relative form is intentional — it locks the inheritance to **this** package's `base.json`, not an arbitrary one a consumer might shim into the import map.                                                                                     |
| `compilerOptions.jsx`          | `"react-jsx"`        | Enables the React-17+ automatic JSX runtime so app authors don't need `import React from 'react'` in `.tsx` files. **Diverges intentionally** from the plugin packages' `jsx: "preserve"` — Next.js wants `react-jsx` because it controls the React import resolution; plugins want `preserve` so the bundler chooses.    |
| `compilerOptions.plugins[0]`   | `{ "name": "next" }` | Loads the `next` language-service plugin so VS Code / JetBrains can offer Next.js-aware completions (`Link` href type-checking, `useRouter` segment inference, etc.). Pure editor enhancement; has no effect on `tsc --noEmit`.                                                                                          |

The preset is deliberately tiny — every other Next.js convention
(`paths`, `include`, `exclude`, the `next-env.d.ts` ambient
declaration, the `.next/types/**/*.ts` include path) lives in the
**consumer's** `tsconfig.json`. The split keeps the preset stable
across every `apps/web/`-shaped consumer that may be added later
(an admin panel, a marketing site, a separate API gateway).

The `apps/web/tsconfig.json` consumer adds:

```jsonc
{
    "extends": "@ever-works/tsconfig/nextjs.json",
    "compilerOptions": {
        "paths": { "@/*": ["./*"] }
    },
    "include": [
        "next-env.d.ts",
        "**/*.ts",
        "**/*.tsx",
        ".next/types/**/*.ts",
        "scripts/generate-openapi.ts",
        ".next/dev/types/**/*.ts"
    ],
    "exclude": ["node_modules"]
}
```

— exactly the per-consumer details the preset deliberately does
**not** opinionate.

## `playwright.json` — the Playwright leaf

The Playwright preset is a two-line override on top of `base.json`:

```jsonc
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "extends": "./base.json",
    "compilerOptions": {
        "types": ["node"],
        "noEmit": true
    }
}
```

| Field                       | Value           | Why it matters                                                                                                                                                                                                                                                                                                            |
| --------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extends`                   | `"./base.json"` | Inherits every option from `base.json` via the relative-path resolver. Same intentional relative-form rationale as `nextjs.json`.                                                                                                                                                                                          |
| `compilerOptions.types`     | `["node"]`      | Whitelists ambient types to `@types/node` only so the e2e specs can use `process.env.PLAYWRIGHT_BASE_URL`, `Buffer`, etc., **without** picking up DOM globals from a transitive `@types/jest` or DOM-polyfill package. Playwright's own types are imported explicitly via `import { test, expect } from '@playwright/test'`. |
| `compilerOptions.noEmit`    | `true`          | Repeated explicitly even though `base.json` already sets it, because the `playwright.json` leaf may be edited independently and the redundant pin makes the intent obvious — the e2e suite **must never** emit `.js` files into the `apps/web-e2e/` tree.                                                                |

The `apps/web-e2e/tsconfig.json` consumer adds only:

```jsonc
{
    "extends": "@ever-works/tsconfig/playwright.json",
    "include": ["./**/*.ts"],
    "exclude": ["node_modules"]
}
```

— the bare `include` glob covers every spec under `tests/`, every
Page Object Model file, and every fixture / helper.

## `package.json` — the manifest

The four-line manifest is the most opinionated file in the package:

```jsonc
{
    "name": "@ever-works/tsconfig",
    "version": "0.0.0",
    "private": true,
    "license": "AGPL-3.0",
    "files": ["base.json", "nextjs.json", "playwright.json"]
}
```

| Field     | Value                                       | Why it matters                                                                                                                                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`    | `"@ever-works/tsconfig"`                    | The bare specifier every consumer's `extends` field uses. The `@ever-works` scope keeps it grouped with the SDK / runtime / demo / eslint-config packages and prevents accidental shadowing by a public registry package.                                                                                                                                            |
| `version` | `"0.0.0"`                                   | Pinned to `0.0.0` because the package is consumed via `workspace:*` only — the version is irrelevant inside the monorepo and the `private: true` flag prevents accidental publish. Bumping it would imply a publish surface that the package deliberately does not have.                                                                                              |
| `private` | `true`                                      | Refuses publication via `pnpm publish` / `npm publish`. Pure tooling that has no public API surface; downstream users who want to copy the workspace start from a fresh `tsconfig.json` rather than installing this package from a registry.                                                                                                                          |
| `license` | `"AGPL-3.0"`                                | Matches the workspace license. Even though `private: true` blocks publish, the license header makes the file's distribution terms explicit if a downstream fork ever flips `private` to `false`.                                                                                                                                                                     |
| `files`   | `["base.json", "nextjs.json", "playwright.json"]` | The whitelist of files included in the package contents. `package.json` is implicit. Critically, this array is the **only** way the three presets become reachable through `@ever-works/tsconfig/<name>.json` — pnpm copies (or symlinks) only the listed files into other packages' `node_modules/@ever-works/tsconfig/` mirror, and TypeScript's resolver looks there. |

Notably absent fields and what they imply:

| Absent field         | Implication                                                                                                                                                                                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`               | The package contains no JS code, so the `"type": "module"` vs. `"type": "commonjs"` distinction is moot. Every consumer reads JSON via `extends`, which is format-agnostic.                                                                                                                                                          |
| `main` / `types`     | No JS entry point and no `.d.ts` to declare. The package's API surface is JSON.                                                                                                                                                                                                                                                       |
| `exports`            | The three preset files are exposed by being in `files`, not by being declared in an `exports` map. This works because TypeScript's `extends` resolver follows `require.resolve()` and joins the bare path; it does **not** consult `package.json#exports` for `.json` files in the standard resolution algorithm used by `tsc`.        |
| `dependencies`       | Pure JSON; nothing to depend on.                                                                                                                                                                                                                                                                                                      |
| `devDependencies`    | No script, no test, no build step.                                                                                                                                                                                                                                                                                                    |
| `peerDependencies`   | The presets reference no compiler version explicitly. They work on TypeScript ≥ 5.0 because `moduleResolution: "bundler"` was introduced in 5.0; the workspace pin in [`apps/web/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/package.json) is the floor.                                |
| `scripts`            | No build, no lint, no typecheck. The presets are validated implicitly by every consumer's `pnpm tsc --noEmit` run.                                                                                                                                                                                                                    |

## Inheritance shape

The two leaf presets fan out from `base.json`; they never fan into
each other. The full graph for the workspace looks like this:

```
                       packages/tsconfig/base.json
                                  │
                  ┌───────────────┴────────────────┐
                  │                                │
       packages/tsconfig/nextjs.json   packages/tsconfig/playwright.json
                  │                                │
       apps/web/tsconfig.json           apps/web-e2e/tsconfig.json

                       packages/tsconfig/base.json
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
packages/plugin-sdk/    packages/plugin-runtime/    packages/plugin-demo/
   tsconfig.json           tsconfig.json               tsconfig.json
```

Two implications:

- **The leaves never overlap.** `nextjs.json` adds `jsx: "react-jsx"`
  and the `next` LSP plugin; `playwright.json` adds `types: ["node"]`.
  A consumer that needs both (e.g. a hypothetical Playwright-driven
  Next.js component test runner) extends them in a single
  `tsconfig.json` via the array form: `"extends": ["@ever-works/tsconfig/nextjs.json", "@ever-works/tsconfig/playwright.json"]`.
  TypeScript's array-extends merges them in declaration order with
  later entries overriding earlier ones.
- **The plugin packages bypass the leaves.** The three plugin
  `tsconfig.json` files extend `base.json` directly and add their
  own `jsx: "react-jsx"` (see
  [`plugin-tsconfigs.md`](./plugin-tsconfigs.md)) instead of
  extending `nextjs.json`. The choice keeps the plugin packages free
  of the `next` LSP plugin (which is meaningful only for App Router
  code), and free of the editor-only Next.js completions that would
  otherwise leak into a plugin author's IDE.

## Consumers

The current consumer set (six packages, eleven `tsconfig.json` and
`package.json` references combined):

| Consumer                                     | `extends` target                                                                                                                                                                                       | Why this preset                                                                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/tsconfig.json`                     | [`@ever-works/tsconfig/nextjs.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/nextjs.json)                                                                  | Next.js App Router app — needs `jsx: "react-jsx"` and the `next` LSP plugin.                                                                                                    |
| `apps/web-e2e/tsconfig.json`                 | [`@ever-works/tsconfig/playwright.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/playwright.json)                                                          | Playwright spec suite — needs `@types/node` ambient types, no DOM globals beyond what Playwright's `page` injects.                                                              |
| `packages/plugin-sdk/tsconfig.json`          | [`@ever-works/tsconfig/base.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/base.json) (via the bare `@ever-works/tsconfig/base.json` form, see below)      | Pure-TS / pure-types library — needs the workspace posture, no JSX leaf because the SDK has no JSX, no Playwright leaf because no e2e.                                          |
| `packages/plugin-runtime/tsconfig.json`      | [`@ever-works/tsconfig/base.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/base.json)                                                                      | Mostly-TS library with a single `.tsx` file (`SlotHost.tsx`) — adds its own `jsx: "react-jsx"` and `types: ["react"]`. See [`plugin-tsconfigs.md`](./plugin-tsconfigs.md).       |
| `packages/plugin-demo/tsconfig.json`         | [`@ever-works/tsconfig/base.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/base.json)                                                                      | Reference plugin — same shape as `plugin-runtime`, same `jsx: "react-jsx"` opt-in.                                                                                              |
| `apps/docs/tsconfig.json`                    | `@docusaurus/tsconfig` (deliberately **not** this package)                                                                                                                                             | Docusaurus ships its own preset with options the workspace's `base.json` does not cover (`baseUrl`, ambient module shapes for MDX). See [§ Out-of-scope today](#out-of-scope-today). |

The plugin packages' `extends` field uses
`@ever-works/tsconfig/base.json` (the package-rooted form), not
`./base.json` (the relative form), because they sit in a different
directory. The two forms resolve to the same file via different
paths — relative under the package itself, package-rooted everywhere
else — and TypeScript's resolver normalizes both into the same
file's contents.

### Out-of-scope today

The `apps/docs/tsconfig.json` consumer extends
`@docusaurus/tsconfig` directly because Docusaurus ships its own
preset with options that the workspace's `base.json` does not cover
(`baseUrl: "."`, ambient module shapes for `.mdx` files via
`docusaurus-plugin-content-docs`, the `noEmit: true` already-implied
by Docusaurus's build pipeline). Migrating `apps/docs` to extend
`@ever-works/tsconfig/base.json` plus a third leaf (`docusaurus.json`)
is tracked as an open question in
[`docs/questions.md`](../questions.md); the current posture is
"keep the upstream preset because the docs site is editor-experience
only and never compiled, see comment at the top of
`apps/docs/tsconfig.json`".

## Field-by-field cross-cutting concerns

### `target: "ES2017"` — the lowering floor

`ES2017` covers `async`/`await`, `Object.values` / `Object.entries`,
`Object.getOwnPropertyDescriptors`, and the `String.padStart` /
`padEnd` shims. It does **not** cover:

- Top-level `await` (ES2022). Workspace code never uses it; every
  module-level await is wrapped in an IIFE.
- Nullish coalescing `??` and optional chaining `?.` (ES2020). They
  are emitted as `condition ? a : b` and explicit null checks. The
  TS compiler still parses them in source — `target` only governs
  emit, not syntax.
- Class private fields `#name` (ES2022). Workspace code uses
  TypeScript's `private` modifier instead, which is purely a
  compile-time check.
- `Promise.allSettled` (ES2020). Used through the Promise polyfill
  in `lib`, which `["dom", "dom.iterable", "esnext"]` covers.

The choice of `ES2017` is intentional — Next.js's own emit pipeline
re-targets the output to whatever the `target` of `apps/web/tsconfig.json`
implies, but plugin packages may be consumed by older bundlers in
downstream forks.

### `module: "esnext"` + `moduleResolution: "bundler"`

The pair locks the workspace into ESM-with-bundler-resolution
semantics. Implications:

- **Imports may omit the `.js` extension.** `import { x } from
  './module'` resolves to `./module.ts` at type-check time. Required
  for TurboPack and Vite which never ship a `.js` extension on
  TypeScript source.
- **`package.json#exports` is honoured.** Sub-path imports like
  `@ever-works/plugin-sdk/capabilities` resolve through the SDK's
  `exports` map. See
  [`sdk-package-manifest.md`](./sdk-package-manifest.md) for the
  full sub-path map.
- **CommonJS interop requires `esModuleInterop: true`** (which the
  base preset sets). Without it, `import z from 'zod'` would error
  because Zod's CJS shim has no default export.

### `strict: true` — the load-bearing flag

`strict: true` is the single most consequential option in the
preset. It enables seven sub-flags:

| Sub-flag                          | Effect                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `noImplicitAny`                   | Every parameter, every return type, every variable must have an inferable or annotated type.                                    |
| `strictNullChecks`                | `null` and `undefined` are not assignable to other types. Required for the SDK's `T \| undefined` absent-vs-present pattern.    |
| `strictFunctionTypes`             | Function parameter types are checked contravariantly. Catches the classic `(x: Animal) => void` vs. `(x: Dog) => void` mistake. |
| `strictBindCallApply`             | `Function.prototype.{bind,call,apply}` are checked against the function's signature. Required for the runtime's slot binding.   |
| `strictPropertyInitialization`    | Class fields must be initialized in the constructor or have a definite-assignment assertion. Used by `PluginRegistry`'s state.  |
| `noImplicitThis`                  | `this` in a function with no explicit type binding is an error.                                                                 |
| `alwaysStrict`                    | Emits `"use strict"` at the top of every file. Moot under ESM (which is always strict).                                         |

Disabling `strict` would be a workspace-wide breaking change that
voids every type-narrowing assertion in the SDK and runtime; the
flag is intentionally not configurable per-consumer.

### `incremental: true` — the build-time win

`incremental: true` writes a `.tsbuildinfo` file next to the
`tsconfig.json` it applies to. The next `tsc --noEmit` run reads the
cache and skips files whose dependency graph has not changed.

The `.tsbuildinfo` files are git-ignored at the workspace root via
the `.gitignore` entry. Each consumer writes its own file:

- `apps/web/tsconfig.tsbuildinfo`
- `apps/web-e2e/tsconfig.tsbuildinfo`
- `packages/plugin-sdk/tsconfig.tsbuildinfo`
- `packages/plugin-runtime/tsconfig.tsbuildinfo`
- `packages/plugin-demo/tsconfig.tsbuildinfo`

CI's first run on a cold cache takes ~45s for the workspace; a hot
run takes ~12s. Setting `incremental: false` would force a cold run
on every PR.

## How the leaves diverge from the base

The matrix below lists every option the leaves add or override on
top of `base.json`, alongside the reason each is and is not warranted
today:

| Option                                | `nextjs.json`           | `playwright.json` | Rationale                                                                                                                                                                  |
| ------------------------------------- | ----------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jsx`                                 | `"react-jsx"` (added)   | —                 | The Next.js leaf opts into the React-17+ automatic JSX runtime so `apps/web` can author `.tsx` without `import React`. Playwright specs are pure TS, no JSX.               |
| `plugins`                             | `[{ "name": "next" }]`  | —                 | Editor-only LSP plugin. Has zero effect on `tsc --noEmit`; the e2e suite has no use for it.                                                                                |
| `types`                               | —                       | `["node"]`        | The Playwright leaf whitelists `@types/node` so e2e specs can use Node globals without picking up DOM globals from a transitive `@types/jest`.                              |
| `noEmit`                              | —                       | `true` (re-pin)   | Already set by `base.json`; re-pinned in the leaf for emphasis. The e2e suite **must never** emit `.js` files into the spec tree.                                          |
| `paths`                               | —                       | —                 | Per-consumer concern (the consumer adds `"@/*": ["./*"]`). Adding it to the leaf would force every Next.js consumer to share the same alias map.                          |
| `baseUrl`                             | —                       | —                 | Same as `paths` — per-consumer.                                                                                                                                            |
| `outDir` / `declaration` / `composite`| —                       | —                 | The workspace does not produce `.js` artefacts (`noEmit: true`) so none of the project-references machinery is wired up.                                                   |
| `target` override                     | —                       | —                 | Both leaves inherit `ES2017`. A future `apps/admin` that targets evergreen browsers might bump to `ES2022`; that would belong on the consumer, not the leaf.              |
| `lib` override                        | —                       | —                 | A Node-only consumer might trim `dom` from `lib`, but the e2e suite still needs DOM types for Playwright's `page.evaluate(() => document.querySelector(...))` callbacks.   |

## Failure matrix

The most common ways a change to one of the four files surfaces as
a `tsc --noEmit` or `pnpm install` failure, and the layer that
catches it:

| Mistake                                                                                  | Symptom                                                                                                                                                | Layer                              |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Drop `"base.json"` from `package.json#files`                                             | `Cannot find file '@ever-works/tsconfig/base.json'` from every plugin and leaf consumer                                                                | `pnpm install` mirror step         |
| Drop `"nextjs.json"` from `package.json#files`                                           | `Cannot find file '@ever-works/tsconfig/nextjs.json'` from `apps/web/tsconfig.json`                                                                    | `pnpm tsc --noEmit` in `apps/web`  |
| Flip `private: true` to `private: false`                                                 | `pnpm publish` would now upload the package; nothing fails but the workspace's "internal-only" invariant is broken                                     | Reviewer's eye                     |
| Add a `dependencies` entry                                                                | Surprises a consumer that runs `pnpm why @ever-works/tsconfig` — the package should remain a leaf in the dep graph                                     | Reviewer's eye                     |
| Bump `version` to `0.1.0`                                                                | No symptom inside the workspace (consumers use `workspace:*`); but anyone forking the workspace and flipping `private: false` would publish a versioned packge | Reviewer's eye                     |
| Remove `target: "ES2017"` from `base.json`                                               | TypeScript falls back to `ES3`. Async/await emit breaks, every consumer fails type-check on the first `async` keyword                                  | `pnpm tsc --noEmit` in any consumer |
| Remove `strict: true` from `base.json`                                                   | Hundreds of new `'x' is possibly null` errors hidden by strict-null-checks reappear across the SDK, runtime, and host app                              | `pnpm tsc --noEmit` workspace-wide |
| Remove `moduleResolution: "bundler"` from `base.json`                                    | Sub-path imports like `@ever-works/plugin-sdk/capabilities` fail with `Cannot find module ... or its corresponding type declarations`                  | `pnpm tsc --noEmit` workspace-wide |
| Change `extends: "./base.json"` to `extends: "@ever-works/tsconfig/base.json"` in a leaf | Self-reference cycle — pnpm resolves the package back to itself but the symlink chain works; functionally a no-op but obscures the relative-form intent | Reviewer's eye                     |
| Drop `"jsx": "react-jsx"` from `nextjs.json`                                             | `Cannot use JSX unless the '--jsx' flag is provided` from every `.tsx` file in `apps/web`                                                              | `pnpm tsc --noEmit` in `apps/web`  |
| Drop `plugins[0].name = "next"` from `nextjs.json`                                       | Editor loses Next.js-aware completions (`Link` href type-checking, etc.). No effect on `tsc --noEmit`                                                  | Author's IDE                       |
| Drop `types: ["node"]` from `playwright.json`                                            | `Cannot find name 'process'` from every spec that uses `process.env.PLAYWRIGHT_BASE_URL`; `Cannot find name 'Buffer'` from any binary-data assertion   | `pnpm tsc --noEmit` in `apps/web-e2e` |
| Add `types: ["jest"]` to `playwright.json`                                               | Stray `describe` / `it` / `expect` ambient symbols collide with Playwright's `expect`, producing two-typings conflict errors at every assertion        | `pnpm tsc --noEmit` in `apps/web-e2e` |
| Add `compilerOptions.composite: true` to `base.json` without project references          | `'isolatedModules' may not be used with 'composite'` (the existing `isolatedModules: true` is incompatible)                                            | `pnpm tsc --noEmit` workspace-wide |
| Set `incremental: false` in `base.json`                                                  | `.tsbuildinfo` files stop being written; CI lint times triple                                                                                          | CI runtime regression              |

## Public-surface change checklist

When changing **any** of the four files:

1. Edit the file under `packages/tsconfig/`.
2. Update **this** page in the same change so the doc and the file
   cannot drift.
3. Cross-check
   [`plugin-tsconfigs.md`](./plugin-tsconfigs.md) — the downstream
   plugin tsconfigs reference the base preset's options; an option
   added or removed from the base may need a parallel entry in the
   plugin-tsconfig page.
4. Cross-check [`eslint-config.md`](./eslint-config.md) — the
   ESLint flat config takes a `tsconfigPath` argument that resolves
   to a consumer's `tsconfig.json`. A change to `moduleResolution`
   or `paths` in the base preset can affect typed-rule behaviour.
5. Cross-check [`packages.md`](./packages.md) — the packages
   overview lists the workspace's tooling packages and their roles.
6. Run `pnpm install` from the workspace root if `package.json#files`
   changed, so pnpm's mirror step picks up the new file list.
7. Run `pnpm tsc --noEmit` from the workspace root, then again
   filtered to each consumer (`pnpm --filter @ever-works/web tsc
   --noEmit`, `pnpm --filter @ever-works/web-e2e tsc --noEmit`,
   `pnpm --filter @ever-works/plugin-sdk tsc --noEmit`,
   `pnpm --filter @ever-works/plugin-runtime tsc --noEmit`,
   `pnpm --filter @ever-works/plugin-demo tsc --noEmit`) so a
   per-package regression cannot hide behind a workspace-wide pass.
8. Add a `docs/log.md` entry that names the field changed and the
   reason.
9. If the change creates a new option that downstream plugin authors
   must opt into, file an entry in
   [`docs/questions.md`](../questions.md) so the open-questions
   register surfaces the decision.
10. Run the Playwright smoke suite (`pnpm --filter @ever-works/web-e2e
    test`). A change to `playwright.json` that breaks the e2e
    `tsc --noEmit` step would mask itself behind a `tsx` parser
    fallback in CI; the e2e run is the only authoritative gate.
11. In the PR description, add a Constitution-Check note for
    [Article II (TypeScript-Only)](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
    and
    [Article III (Public-Surface Stability)](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md).
    The shared TS preset is part of the public tooling surface — a
    breaking option change requires the same review weight as a
    breaking SDK change.

## Related docs

- [`plugin-tsconfigs.md`](./plugin-tsconfigs.md) — the per-plugin
  `tsconfig.json` files that extend `base.json`.
- [`eslint-config.md`](./eslint-config.md) — the parallel shared
  workspace tooling package.
- [`sdk-package-manifest.md`](./sdk-package-manifest.md),
  [`runtime-package-manifest.md`](./runtime-package-manifest.md),
  [`plugin-demo-package-manifest.md`](./plugin-demo-package-manifest.md)
  — the manifests of the three plugin packages that consume
  `base.json`.
- [`packages.md`](./packages.md) — the SDK / runtime / demo
  packages overview.
- [`authoring-a-plugin.md`](./authoring-a-plugin.md) — how a plugin
  author wires their `tsconfig.json` to extend `base.json`.
