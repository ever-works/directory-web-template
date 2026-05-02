---
id: web-app-tsconfig
title: Web App TypeScript Configuration (`apps/web/tsconfig.json`)
sidebar_label: Web App tsconfig
sidebar_position: 28
---

# Web App TypeScript Configuration (`apps/web/tsconfig.json`)

> **Status.** Authoritative reference for the host web application's
> TypeScript configuration defined in
> [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion)
> and elaborated by
> [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The configuration is locked by
> [`apps/web/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/tsconfig.json),
> which extends the shared
> [`@ever-works/tsconfig/nextjs.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/nextjs.json)
> preset and adds exactly two web-app-specific things — the `@/*` path
> alias and the `include` glob set that wires the App Router sources,
> the App-Router-generated type files, and the OpenAPI-generation
> script into the type-checker. When the `extends` target moves, the
> path alias changes, or the `include` / `exclude` globs grow or
> shrink, update **this** page in the same change so the doc and the
> file cannot drift.

`apps/web/tsconfig.json` is the **per-application TypeScript
configuration** that the host web app
([`apps/web/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web))
uses every time `pnpm tsc --noEmit`, `pnpm next build`, the editor's
TypeScript language service, or any other consumer of the file
type-checks the App Router sources. It sits one directory below the
shared
[`@ever-works/tsconfig`](./tsconfig-presets.md) presets the same way
[`plugin-tsconfigs.md`](./plugin-tsconfigs.md) sits one directory
below those presets for the three plugin packages — the host app and
the plugin packages share the same workspace-wide TypeScript posture
through the `extends` indirection, and only the per-package overrides
(the `@/*` alias for the host app, the `jsx` / `types` overrides for
the plugin packages) live in their respective `tsconfig.json` files.

This page is the **per-source-file reference** that pairs with
[`apps/web/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/tsconfig.json)
the same way
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
plugin under `packages/plugin-demo/src/`. Where the shared
[`@ever-works/tsconfig`](./tsconfig-presets.md) presets document the
**workspace-wide TypeScript posture** every consumer extends and
[`plugin-tsconfigs.md`](./plugin-tsconfigs.md) documents the
**plugin-package-level overrides** the three plugin packages add on
top of the `base.json` preset, this page documents the
**host-app-level overrides** the web application adds on top of the
`nextjs.json` preset — the `@/*` alias that powers every internal
import in `apps/web/`, and the `include` glob set that wires the App
Router sources, the Next-generated `.next/types/**` ambient
declarations, and the OpenAPI-generation script into the
type-checker.

## At a glance

| Field                       | Value                                                                                                                  | Why it matters                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extends`                   | `@ever-works/tsconfig/nextjs.json`                                                                                     | Inherits the workspace's Next.js posture — `target: ES2017`, `module: esnext`, `moduleResolution: bundler`, `strict: true`, `noEmit: true`, `jsx: react-jsx`, `lib: dom`/`dom.iterable`/`esnext`, the `next` TypeScript plugin, and the rest of the [shared `nextjs` preset](./tsconfig-presets.md). The host app does not redeclare any of those; one source of truth wins. |
| `compilerOptions.paths`     | `{ "@/*": ["./*"] }`                                                                                                   | The Next.js convention. Any module path that starts with `@/` resolves relative to `apps/web/` (e.g. `import { fetchItems } from '@/lib/content'` resolves to `apps/web/lib/content/index.ts`). The single-entry mapping is intentional — the host app does not split its source tree across multiple alias roots.                                                              |
| `include[0]`                | `next-env.d.ts`                                                                                                        | Ambient type declarations Next generates the first time the app boots; required for `process.env.*` and `next/image` types to be picked up by the language service.                                                                                                                                                                                                            |
| `include[1]`                | `**/*.ts`                                                                                                              | Every TypeScript source file in the app, recursively from `apps/web/`.                                                                                                                                                                                                                                                                                                          |
| `include[2]`                | `**/*.tsx`                                                                                                             | Every TypeScript-with-JSX source file. Necessary because `**/*.ts` does **not** match `.tsx` files.                                                                                                                                                                                                                                                                              |
| `include[3]`                | `.next/types/**/*.ts`                                                                                                  | The route-typed-link declarations Next emits during `next build` (and during `next dev` once the typed-routes feature is enabled). Without this entry, `Link`'s typed `href` props would resolve to `string` instead of the discriminated union of valid routes.                                                                                                                |
| `include[4]`                | `scripts/generate-openapi.ts`                                                                                          | The script invoked by `pnpm generate-docs` (chained from `predev` / `prebuild` in the app's `package.json`). It lives outside the App Router tree and would otherwise be excluded from the type-check; the explicit entry makes sure broken OpenAPI codegen surfaces at type-check time, not at runtime.                                                                        |
| `include[5]`                | `.next/dev/types/**/*.ts`                                                                                              | The dev-server variant of the route-typed-link declarations Next 16 emits under `.next/dev/types/`. Distinct from the `next build` output above; both must be in the include set so the language service stays correct in both `pnpm dev` and `pnpm build` contexts.                                                                                                            |
| `exclude[0]`                | `node_modules`                                                                                                         | The conventional exclude. `@ever-works/tsconfig/base.json` already excludes `node_modules`, but the host app re-states it explicitly to keep the file self-documenting and resilient to a future preset that might drop the exclude.                                                                                                                                            |

The file is **17 lines** today (counting brackets and the closing
newline). The four load-bearing pieces are the `extends` target, the
single `paths` entry, the six-entry `include` array, and the single
`exclude` entry. Flipping any of the four either widens the
type-checker's scope (slowing every editor / CI / `tsc` pass) or
breaks one or more invariants the template relies on. Keep this page
in lock-step with the file.

## The full file, annotated

```jsonc
{
  // The shared Next.js preset. The chain is:
  //   @ever-works/tsconfig/nextjs.json
  //     → @ever-works/tsconfig/base.json
  // The base preset locks `target: ES2017`, `module: esnext`,
  // `moduleResolution: bundler`, `strict: true`, `noEmit: true`,
  // `esModuleInterop`, `resolveJsonModule`, `isolatedModules`, and
  // `incremental`. The Next preset adds `jsx: react-jsx` and the
  // `next` TS plugin. None of those are restated here.
  "extends": "@ever-works/tsconfig/nextjs.json",

  "compilerOptions": {
    // The Next.js path alias. Resolves `@/*` to the workspace root
    // (i.e. `apps/web/*`). Used everywhere in the app sources.
    "paths": {
      "@/*": ["./*"]
    }
  },

  "include": [
    // Ambient type declarations Next generates on first boot.
    "next-env.d.ts",

    // Every TypeScript source file in the app.
    "**/*.ts",

    // Every TypeScript-with-JSX source file. `**/*.ts` does not
    // match `.tsx`.
    "**/*.tsx",

    // Route-typed-link declarations from `next build`.
    ".next/types/**/*.ts",

    // The OpenAPI-generation script — explicit because it lives
    // outside the App Router tree.
    "scripts/generate-openapi.ts",

    // Route-typed-link declarations from `next dev` under Next 16.
    ".next/dev/types/**/*.ts"
  ],

  // The conventional exclude. Re-stated for resilience.
  "exclude": ["node_modules"]
}
```

## Why the `extends` chain matters

The host app inherits its TypeScript posture from
[`@ever-works/tsconfig/nextjs.json`](./tsconfig-presets.md), which
itself inherits from
[`@ever-works/tsconfig/base.json`](./tsconfig-presets.md). The chain
factors the workspace's TypeScript posture into a single source of
truth so the host app, the e2e suite
([`apps/web-e2e/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e)),
and the three plugin packages
([`packages/plugin-sdk/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk),
[`packages/plugin-runtime/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime),
[`packages/plugin-demo/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo))
all share the same compiler options without copy-pasting them into
five `tsconfig.json` files.

Concretely, the host app gets the following from the preset chain:

| Setting              | Inherited from           | Effect                                                                                                                                          |
| -------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `target`             | `base.json` → `ES2017`   | Async-iterators and `Object.entries` work without polyfills; output is small enough for every browser the [browserslist baseline](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/lighthouse-test.json) covers. |
| `lib`                | `base.json`              | `dom`, `dom.iterable`, `esnext` — the standard Next.js lib set; required so `document`, `window`, `Map`, and modern JS features all type-check. |
| `module`             | `base.json` → `esnext`   | Module imports are emitted as ES module syntax; required so the bundler-aware `moduleResolution` step can resolve workspace packages.            |
| `moduleResolution`   | `base.json` → `bundler`  | Resolves package imports the way a bundler (Webpack / Turbopack / esbuild) does, including `package.json#exports` conditional resolution.        |
| `strict`             | `base.json` → `true`     | All strict-mode checks (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, etc) on. Per [Constitution Article II — TypeScript-Only](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md). |
| `noEmit`             | `base.json` → `true`     | `tsc --noEmit` is the only `tsc` invocation the workspace runs; the bundler emits the actual JS output. Keeps the type-checker fast.            |
| `esModuleInterop`    | `base.json` → `true`     | CommonJS modules can be `import`-ed without `* as` workarounds.                                                                                  |
| `resolveJsonModule`  | `base.json` → `true`     | `import data from './foo.json'` works.                                                                                                            |
| `isolatedModules`    | `base.json` → `true`     | Required for SWC / Babel single-file transpilers; flags any source file that cannot be transpiled in isolation.                                  |
| `incremental`        | `base.json` → `true`     | `.tsbuildinfo` cache makes subsequent type-checks an order of magnitude faster.                                                                  |
| `jsx`                | `nextjs.json` → `react-jsx` | The new JSX transform; no per-file `import React from 'react'` required.                                                                       |
| `compilerOptions.plugins` | `nextjs.json` → `[{ "name": "next" }]` | Wires the Next.js TS plugin into the language service for the App Router conventions.                                                       |
| `allowJs`            | `base.json` → `true`     | A handful of root-level scripts (`scripts/check-env.js`, `scripts/clone.cjs`) are still `.js`; `allowJs` lets them participate without rewrites. |
| `skipLibCheck`       | `base.json` → `true`     | Skip the type-check of `.d.ts` files in `node_modules`. Keeps every `tsc` pass under the [performance budget](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md). |

Restating any of these in `apps/web/tsconfig.json` would create two
sources of truth for the same posture. The right place to change a
shared compiler option is
[`packages/tsconfig/base.json`](./tsconfig-presets.md) (or the
`nextjs.json` overlay if the change only applies to Next.js
consumers); the host app picks the change up the next time it
re-extends the preset.

## Why the `@/*` path alias

The single `paths` entry — `"@/*": ["./*"]` — is the Next.js
convention for an internal-import alias rooted at the application's
top-level directory. It lets every source file inside `apps/web/`
import from any other directory in the app without writing
`../../../../` chains.

| Source file                                          | Import statement                              | Resolves to                                          |
| ---------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `apps/web/app/[locale]/(public)/page.tsx`            | `import { fetchItems } from '@/lib/content';` | `apps/web/lib/content/index.ts`                      |
| `apps/web/components/header.tsx`                     | `import { useTheme } from '@/hooks/useTheme';` | `apps/web/hooks/useTheme.ts`                         |
| `apps/web/lib/services/sponsor-ad.service.ts`        | `import { db } from '@/lib/db';`              | `apps/web/lib/db/index.ts`                           |
| `apps/web/app/api/items/popularity-scores/route.ts`  | `import { getCachedItems } from '@/lib/content';` | `apps/web/lib/content/index.ts`                      |

The alias is a TypeScript-language-service concern — at runtime, the
Next bundler resolves the same `@/*` alias from
`apps/web/jsconfig.json` (or, equivalently, from the `paths` entry of
this `tsconfig.json` file) using its built-in
`tsconfigPaths`-equivalent resolver. Both layers must agree on the
mapping, which is why the alias lives in the project's
`tsconfig.json` rather than in any one of the bundler's plugin
configs.

## Why the six-entry `include` array

TypeScript's default `include` would only pick up `.ts` and `.tsx`
files relative to the working directory. The App Router introduces
three sources of typed declarations that the type-checker would
otherwise miss:

1. **`next-env.d.ts`** — Ambient `process.env.*` and `next/image`
   typings Next regenerates on every dev / build. The file lives in
   `apps/web/`, so `**/*.ts` would already match it; the explicit
   entry survives a future Next change that might move it under a
   `.next/`-style hidden path.
2. **`.next/types/**/*.ts`** — Route-typed-link declarations Next
   emits during `next build` (the typed-routes feature). Without
   this entry, `Link`'s `href` prop resolves to `string` and the
   compiler stops catching invalid route slugs.
3. **`.next/dev/types/**/*.ts`** — The dev-server variant Next 16
   emits under `.next/dev/types/`. Distinct from the build-time
   variant above; both must be in the include set so the language
   service stays correct in both `pnpm dev` and `pnpm build`.
4. **`scripts/generate-openapi.ts`** — The OpenAPI-generation script
   `pnpm generate-docs` runs from the `predev` / `prebuild` hooks in
   the host app's
   [`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/package.json).
   It lives outside the App Router tree (`apps/web/scripts/`), so
   `**/*.ts` already matches it, but the explicit entry makes the
   intent visible to a reader who is auditing the type-checker's
   scope.
5. **`**/*.ts` and `**/*.tsx`** — Every TypeScript source file in
   the host app. The `.tsx` glob is required separately because
   `**/*.ts` does **not** match `.tsx` files.

Removing any of the entries either narrows the type-checker's scope
(allowing broken types in to escape detection) or breaks the typed
routes / OpenAPI feature. Adding a new entry — for example, a future
`drizzle/*.ts` migrations directory the type-checker should inspect —
should land here, in the same change that adds the directory.

## Why the `exclude` entry

`@ever-works/tsconfig/base.json` already excludes `node_modules`. The
host app re-states the exclude explicitly so the configuration
remains correct if a future preset change ever drops the line.
`exclude` is also resilient against `include` widening — even if a
new `include` glob would match a path inside `node_modules/`, the
explicit exclude keeps the type-checker from drilling into it.

## Failure matrix

The matrix below pins each load-bearing piece of the file to a
concrete user-visible failure that would surface if the piece were
flipped or removed.

| Change                                                              | What breaks                                                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Drop `extends`                                                      | Every shared compiler option (`strict`, `target`, `moduleResolution`, etc) reverts to the TypeScript default → mass type errors. |
| Change `extends` to a non-Next preset                               | `jsx` defaults to `preserve` → React 19's `react-jsx` transform stops working, every `.tsx` file fails to compile.                |
| Drop the `@/*` path alias                                           | Every internal import that uses the alias (`'@/lib/content'`, `'@/components/header'`, etc) fails to resolve.                    |
| Replace `./*` with an absolute path                                 | The alias resolves outside the workspace; broken on every contributor's machine that does not share the same absolute path.      |
| Drop `**/*.tsx` from `include`                                      | Every JSX source file falls out of the type-checker's scope; broken types in components silently survive `pnpm tsc --noEmit`.    |
| Drop `.next/types/**/*.ts` from `include`                           | Typed routes regress — `Link`'s `href` prop falls back to `string` and invalid route slugs slip through.                         |
| Drop `.next/dev/types/**/*.ts`                                       | The dev-server variant of typed routes regresses — `pnpm dev` reports `href` as `string` even when `pnpm build` does not.        |
| Drop `scripts/generate-openapi.ts`                                  | A type error in the OpenAPI generator escapes detection until runtime, where it crashes the predev / prebuild hook.              |
| Drop `node_modules` from `exclude`                                  | The type-checker walks every `.d.ts` in `node_modules` → orders of magnitude slower, hits the [performance budget](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md). |

## Per-line walkthrough

The annotated file in [The full file, annotated](#the-full-file-annotated)
is reproduced below with one row per load-bearing line and the
documentation impact of each.

| Line                                            | Documentation impact                                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `"extends": "@ever-works/tsconfig/nextjs.json"` | Update [tsconfig-presets.md](./tsconfig-presets.md) **and** this page.                                          |
| `"@/*": ["./*"]`                                | Update this page if the alias root or pattern ever changes.                                                     |
| `"next-env.d.ts"`                               | Drop only when Next stops generating the file.                                                                  |
| `"**/*.ts"`                                     | Permanent.                                                                                                      |
| `"**/*.tsx"`                                    | Permanent.                                                                                                      |
| `".next/types/**/*.ts"`                         | Drop only when typed routes are removed; the entry is permanent for as long as Next emits the directory.        |
| `"scripts/generate-openapi.ts"`                 | Drop only if the OpenAPI script is removed; otherwise update the path to match the new location.                |
| `".next/dev/types/**/*.ts"`                      | Drop only when the Next 16 dev-server variant is removed.                                                       |
| `"exclude": ["node_modules"]`                   | Keep as is.                                                                                                     |

## `tsconfig.json` change checklist

When a contributor changes
[`apps/web/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/tsconfig.json):

1. Update **this** page (`web-app-tsconfig.md`) in the same change.
2. If the `extends` target moved, update
   [tsconfig-presets.md](./tsconfig-presets.md) too.
3. If the `paths` alias changed, search the host app for
   `from '@/'` imports — every one needs to keep resolving.
4. If an `include` entry was added, justify the addition in
   [docs/log.md](../log.md) so the next reviewer knows why the
   type-checker's scope grew.
5. Pair the change with a [Spec 002](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
   cross-link if the change is part of a plugin-architecture
   migration.
6. Run `pnpm tsc --noEmit` from the host app and from the workspace
   root. Both must pass.
7. Reviewer pass: confirm the doc and the file say the same thing,
   line for line.

## Cross-references

- [Shared TypeScript Presets](./tsconfig-presets.md) — the
  `@ever-works/tsconfig` package this config extends.
- [Plugin Package TypeScript Configurations](./plugin-tsconfigs.md)
  — the parallel per-package configs in the three plugin packages.
- [Workspace Hoisting Posture](./npmrc-config.md) — the `.npmrc`
  posture every install applies before the type-checker runs.
- [Workspace Root Manifest](./workspace-root-manifest.md) — the
  root `package.json` that pins `typescript`, `tsx`, and the rest
  of the workspace's TypeScript tooling.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
  — the spec that owns the workspace's TypeScript posture.
- [Constitution Article II — TypeScript-Only](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
  — the durable principle that mandates `strict: true` and forbids
  loosening compiler options.
