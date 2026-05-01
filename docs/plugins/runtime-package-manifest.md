---
id: plugin-runtime-package-manifest
title: Plugin Runtime Package Manifest Reference
sidebar_label: Runtime Package Manifest
sidebar_position: 19
---

# Plugin Runtime Package Manifest Reference

> **Status.** Authoritative reference for the `package.json` of
> `@ever-works/plugin-runtime` defined in
> [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The package manifest is locked by
> [`packages/plugin-runtime/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/package.json);
> when the runtime changes its export map, peer-dependency posture, or
> the tree-shaking flag, update **this** page in the same change so
> the doc and the manifest cannot drift.

`@ever-works/plugin-runtime` is the **React-aware** half of the plugin
system. While the
[Runtime Public Surface Reference](./runtime-public-surface.md)
documents the TypeScript barrel exposed by
[`packages/plugin-runtime/src/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/index.ts),
this page documents the **package-level contract** — the
`package.json` fields that decide which sub-paths are importable, how
React is reached (peer dependency, **required** — unlike the SDK
where it is optional), how the SDK is reached (workspace dependency
via `workspace:*`), how Zod is reached (runtime dependency, required),
and how bundlers tree-shake the runtime's React-aware `<SlotHost />`
re-export off server bundles when the host imports through the
narrowed `./registry` / `./loader` / `./testing` sub-paths.

This page is the **per-source-file reference** that pairs with
[`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/package.json)
the same way
[`sdk-package-manifest.md`](./sdk-package-manifest.md) pairs with
`packages/plugin-sdk/package.json`,
[`runtime-public-surface.md`](./runtime-public-surface.md) pairs
with `packages/plugin-runtime/src/index.ts`,
[`sdk-public-surface.md`](./sdk-public-surface.md) pairs with
`packages/plugin-sdk/src/index.ts`,
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
plugin under `packages/plugin-demo/src/`. Where the
[Runtime Public Surface Reference](./runtime-public-surface.md) covers
**what** the runtime exposes via TypeScript, this page covers **how**
the runtime is wired into Node's resolution algorithm and any bundler
that reads `package.json#exports` — the two pages are deliberately
complementary and should both be read whenever the runtime's import
surface is changed.

## At a glance

| Field                                  | Value                                                                                            | Why it matters                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                                 | `@ever-works/plugin-runtime`                                                                     | The scoped name host apps put in `dependencies`. The scope locks the package to the workspace.                                                       |
| `version`                              | `0.1.0`                                                                                          | The current runtime version. Pinned in lock-step with `@ever-works/plugin-sdk` so the registry / loader / `<SlotHost />` always agree on shape.      |
| `description`                          | `"Plugin runtime for the Directory Web Template — registry, config loader, and React SlotHost."` | One-line human-readable summary; surfaces in `pnpm list` and any package-graph tool.                                                                 |
| `license`                              | `AGPL-3.0`                                                                                       | The project's license. Plugins linking against the runtime via the host inherit AGPL obligations when distributed.                                   |
| `private`                              | `true`                                                                                           | Blocks accidental `pnpm publish`. The runtime is consumed via `workspace:*` only.                                                                    |
| `type`                                 | `"module"`                                                                                       | The package is a native ESM module. CommonJS hosts must `import()` it dynamically.                                                                   |
| `sideEffects`                          | `false`                                                                                          | Opts the package into bundler tree-shaking — critical for keeping `<SlotHost />` out of server bundles that only need `PluginRegistry`.              |
| `main`                                 | `./src/index.ts`                                                                                 | Node's legacy entry; resolves to the same TypeScript source as `exports."."`.                                                                        |
| `types`                                | `./src/index.ts`                                                                                 | TypeScript reads types from the same file. There is **no** separate `.d.ts` build step — Turborepo skips it intentionally.                           |
| `exports."."`                          | `./src/index.ts`                                                                                 | The barrel — every public name documented in [Runtime Public Surface](./runtime-public-surface.md).                                                  |
| `exports."./registry"`                 | `./src/registry.ts`                                                                              | Narrowed sub-path so a server action can import `PluginRegistry` without dragging React into the server graph.                                       |
| `exports."./SlotHost"`                 | `./src/SlotHost.tsx`                                                                             | Narrowed sub-path that makes the React boundary explicit in bundle reports.                                                                          |
| `exports."./loader"`                   | `./src/loader.ts`                                                                                | Narrowed sub-path for boot-pipeline tooling that needs `loadPlugins` / `mergeConfigSources` without the `<SlotHost />` React surface.                |
| `exports."./testing"`                  | `./src/testing.ts`                                                                               | Narrowed sub-path so a unit-test file can import `createTestRegistry` without spinning up a JSDOM environment for `<SlotHost />`.                    |
| `files`                                | `["src"]`                                                                                        | Even though `private: true` means the package never ships, this guards against accidental publishes including `node_modules`.                        |
| `scripts.typecheck`                    | `tsc --noEmit`                                                                                   | The single quality gate at the package level — type-checks the barrel and every per-source file (registry, loader, SlotHost, testing).               |
| `scripts.lint`                         | `echo 'No lint configured for plugin-runtime'`                                                   | Intentional no-op so `turbo run lint` succeeds while the per-package ESLint config is still pending Phase D.                                         |
| `dependencies.@ever-works/plugin-sdk`  | `workspace:*`                                                                                    | The runtime imports `PluginManifest`, `Capability`, `SlotId`, and the provider interfaces from the SDK — they must be the same module instance.      |
| `dependencies.zod`                     | `^4.0.5`                                                                                         | Zod is a runtime dependency because `loadPlugins` calls `manifest.config.safeParse(rawConfig)` against every plugin's Zod schema at boot.            |
| `peerDependencies.react`               | `>=19.0.0`                                                                                       | React is a peer dependency because `<SlotHost />` is a React function component. Unlike the SDK, the peer is **required** — no `optional` flag.      |
| `devDependencies.@ever-works/tsconfig` | `workspace:*`                                                                                    | The shared TS base config that pins `target`, `module`, `moduleResolution`, and `strict` flags.                                                      |
| `devDependencies.@types/react`         | `19.2.7`                                                                                         | React 19 typings, only used at type-check time. Hosted by the workspace; not bundled.                                                                |
| `devDependencies.react`                | `19.2.5`                                                                                         | React itself is dev-only because the runtime never imports a React runtime in `registry.ts` / `loader.ts` / `testing.ts` — only `SlotHost.tsx` does. |
| `devDependencies.typescript`           | `^5`                                                                                             | TypeScript is dev-only — the runtime ships TS sources directly via `exports`, no compile step.                                                       |

The package manifest is **deliberately small** but is **richer than
the SDK's** in two specific ways:

1. **Five `exports` entries instead of three.** The runtime owns more
   surface area than the SDK (registry, loader, slot-host, testing
   helper) and each lives behind a narrowed sub-path so a consumer
   can pay only for what it imports.
2. **React peer is required, not optional.** Unlike the SDK — which
   is framework-agnostic and only references React **types** — the
   runtime ships `<SlotHost />`, a React function component that
   imports `react` at runtime. A host that doesn't have React
   installed cannot install the runtime.

## Field-by-field

### `name` — the scoped workspace name

```jsonc
"name": "@ever-works/plugin-runtime"
```

The `@ever-works/` scope is the only legitimate way for a host app
to identify the runtime. The host's `apps/web/package.json` uses

```jsonc
{
	"dependencies": {
		"@ever-works/plugin-runtime": "workspace:*"
	}
}
```

The `workspace:*` specifier resolves to this package via pnpm's
workspace protocol; any non-workspace specifier (e.g. a registry
version) fails because the package is `private: true` and never
published. That failure is the intended outcome — see the
[failure matrix](#failure-matrix) below.

### `version` — pinned in lock-step with the SDK

```jsonc
"version": "0.1.0"
```

The runtime's version is pinned in lock-step with
[`@ever-works/plugin-sdk`'s `version`](./sdk-package-manifest.md#version--the-sdk-version-that-gates-templaterange).
Both packages bump together because the runtime imports `PluginManifest`,
`Capability`, and `SlotId` from the SDK; if the SDK bumps to `0.2.0`
in a way that changes those types, the runtime's `loadPlugins`,
`PluginRegistry`, and `<SlotHost />` all need a matching bump.

The runtime's version is not surfaced in `templateRange` matching —
that field only ever sees the SDK's version. But a host build that
mixes a `0.1.0` runtime with a `0.2.0` SDK is **a configuration
bug**: the workspace lockfile guarantees only one version of each
package is installed, and a major version mismatch at install time
fails with `ERR_PNPM_INVALID_DEP_VERSION`.

### `description` — the one-line package summary

```jsonc
"description": "Plugin runtime for the Directory Web Template — registry, config loader, and React SlotHost."
```

The `description` field is set on the runtime but **not** on the SDK
(see [SDK manifest](./sdk-package-manifest.md#name--the-scoped-workspace-name)).
The asymmetry is intentional: the SDK's purpose is fully captured by
its name, but the runtime owns four distinct concerns
(registry / loader / `<SlotHost />` / testing helper) so a one-line
summary helps `pnpm list`, GitHub's package graph, and any tooling
that scans `package.json` for human-readable metadata. This field
is **not** load-bearing — removing it would not break any
consumer — but it costs nothing to keep up to date and aids
discoverability.

### `license` — the AGPL-3.0 obligation chain

```jsonc
"license": "AGPL-3.0"
```

The runtime inherits the project's AGPL-3.0 license. Plugins that
link against the runtime via the host (the host imports both the
runtime and every plugin and is itself AGPL) inherit the AGPL
obligations under the network-use clause. A host author who needs a
commercial license should reach out via the project's
[license documentation](https://github.com/ever-works/directory-web-template/blob/develop/LICENSE.md)
before deploying a third-party fork. The license field is here so
that any tool that scans the workspace for license compatibility
(`pnpm licenses ls`, `license-checker`, FOSSA, etc.) sees the correct
license for the runtime and not a default `UNLICENSED` placeholder.

### `private` — never published, never resolvable from a registry

```jsonc
"private": true
```

This flag has the same two purposes as on the SDK:

1. **Block accidental `pnpm publish`.** Even with the
   [files](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files)
   array set, an `npm publish --access public` would fail. The flag
   is a hard guarantee that the runtime only travels via the
   workspace.
2. **Force `workspace:*` consumers.** Combined with `pnpm`'s
   default `workspace=true` resolution, downstream packages can only
   consume this runtime via the workspace protocol. Any attempt to
   install `@ever-works/plugin-runtime@0.1.0` from npmjs.com fails
   because the name is unscoped on the public registry.

### `type` — native ESM, no CommonJS shim

```jsonc
"type": "module"
```

Every `.ts` / `.tsx` file in `src/` is treated as ESM. There is no
`.cjs` companion build, no `require()` entry, and no `__dirname`
usage in the source. Hosts that still run CommonJS (very rare in
the Next.js 16 app) must reach the runtime via dynamic `import()`.
The SDK is `"type": "module"` for the same reason; the host's
Next.js app sets `"type": "module"` via `package.json` so the chain
holds end-to-end.

### `sideEffects` — tree-shaking opt-in

```jsonc
"sideEffects": false
```

The **single most-load-bearing** field in the runtime's manifest.
Because the runtime ships TypeScript sources directly via
`exports."."` and one of those exports is the React-aware
`<SlotHost />` component, a server action that imports
`PluginRegistry` from the barrel must be able to drop `<SlotHost />`
from the server bundle. The bundler can only safely drop the unused
React surface if it knows the package has no top-level side effects —
`sideEffects: false` is the declaration that gives it permission.

Removing this flag is a silent regression: the bundle keeps
building, but a server action that imports `PluginRegistry` would
suddenly include React (`react/jsx-runtime`,
`React.forwardRef`, etc.) in the server graph. The downstream
symptom is a larger server bundle and — in the worst case — a
runtime crash if a server-only environment does not have React
installed. The fix is **never** to add an `import './SlotHost'`
statement to the barrel for a side effect; instead, document the
new export here and add a narrowed sub-path entry under
`exports`.

The
[bundle-barrel-imports](https://github.com/ever-works/directory-web-template/blob/develop/.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md)
rule lints against this kind of regression in the host app.

### `main` and `types` — the legacy resolution path

```jsonc
"main": "./src/index.ts",
"types": "./src/index.ts"
```

Both fields point at the same file as `exports."."`. They exist
for the same two reasons as on the SDK:

1. **Legacy resolvers.** Some build tools (older webpack versions,
   Jest's default resolver, certain monorepo CLIs) still read
   `main` before `exports`.
2. **TypeScript without `moduleResolution: "bundler"`.** The shared
   `@ever-works/tsconfig` sets `moduleResolution: "bundler"`, but
   a host that uses an older tsconfig (`"node"` or `"node10"`) still
   gets the right typings via the top-level `types` field.

There is no separate `dist/` build, so `main` and `types` are
deliberately the **same file**. This is the same pattern as the SDK
and demo packages — the workspace skips the tsc-to-`.d.ts` step in
favour of letting Turborepo type-check sources directly.

### `exports` — the importable sub-paths

```jsonc
"exports": {
  ".": "./src/index.ts",
  "./registry": "./src/registry.ts",
  "./SlotHost": "./src/SlotHost.tsx",
  "./loader": "./src/loader.ts",
  "./testing": "./src/testing.ts"
}
```

This is the primary import-surface contract. **Five** specifiers are
exported:

- **`@ever-works/plugin-runtime`** — the barrel. Every public name
  is enumerated in
  [Runtime Public Surface](./runtime-public-surface.md#at-a-glance).
  Use this from any host module that doesn't care whether it pulls
  React in (typically the host's app-shell module, which already
  imports React for layout).
- **`@ever-works/plugin-runtime/registry`** — narrowed sub-path that
  re-exports only [`registry.ts`](./registry.md). Use this from a
  server action that needs `PluginRegistry` to read enable / disable
  state from the database without dragging React into the server
  graph. This is the most-load-bearing narrowed sub-path because it
  preserves the server / client boundary.
- **`@ever-works/plugin-runtime/SlotHost`** — narrowed sub-path that
  re-exports only [`SlotHost.tsx`](./slot-host.md). Use this from a
  React layout component that wants the React import boundary
  explicit in bundle reports. The capitalised `SlotHost` matches the
  source filename (`SlotHost.tsx`); changing the case is a breaking
  change for every host that imports the component.
- **`@ever-works/plugin-runtime/loader`** — narrowed sub-path that
  re-exports only [`loader.ts`](./loader.md). Use this from
  boot-pipeline tooling that needs `loadPlugins` / `mergeConfigSources`
  / `PluginConfigSources` / `LoadPluginsResult` without the
  `<SlotHost />` React surface. This is the second-most-load-bearing
  narrowed sub-path; it's what a Next.js `instrumentation.ts` would
  import to register plugins at server boot.
- **`@ever-works/plugin-runtime/testing`** — narrowed sub-path that
  re-exports only [`testing.ts`](./testing.md). Use this from a
  Playwright API spec or a unit-test file that needs
  `createTestRegistry` without spinning up a JSDOM environment for
  `<SlotHost />`.

The five sub-paths are the **only** legitimate import specifiers. A
host that imports `@ever-works/plugin-runtime/manifest` (no `exports`
entry — the file isn't even in `src/`) gets a resolution error from
any tool that respects `package.json#exports` (Node 18+, all modern
bundlers, TypeScript with `moduleResolution: "bundler"`). The error
is the intended outcome — see the [failure matrix](#failure-matrix).
Adding a new sub-path is a Spec-Kit-level change because it widens
the import surface every host can rely on; the change must be
paired with an update to
[Runtime Public Surface](./runtime-public-surface.md) and a
`docs/log.md` entry.

### `files` — the publish whitelist

```jsonc
"files": ["src"]
```

Even though `private: true` blocks publishing, the `files` array is
declared so that **if** the package were ever flipped to public (a
deliberate Spec Kit decision), only the `src/` directory would
travel — `node_modules`, `tsconfig.tsbuildinfo`, `dist`, and any
generated artefacts would be excluded. This is defence-in-depth, not
a substitute for `private: true`.

### `scripts.typecheck` — the single quality gate

```jsonc
"scripts.typecheck": "tsc --noEmit"
```

`tsc --noEmit` is the single source of truth for whether the
runtime's public surface compiles. The shared `@ever-works/tsconfig`
enables `strict` and the `exactOptionalPropertyTypes` /
`noUncheckedIndexedAccess` flags, so a regression in the registry's
enable / disable / load methods, the loader's deep-merge config
algorithm, the slot-host's `<SlotHost />` props contract, the
testing helper's options object, or the barrel's `export type`
markers shows up here. Turborepo runs this script via
`turbo run typecheck` from the monorepo root.

### `scripts.lint` — the deliberate no-op

```jsonc
"scripts.lint": "echo 'No lint configured for plugin-runtime'"
```

The script is a no-op so that `turbo run lint --filter=...` passes
across the workspace even before the per-package ESLint config lands
in Phase D of
[Spec 002](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/tasks.md).
Replacing this with a real `eslint .` invocation is one of the Phase
D tasks; until then the script keeps the Turborepo task graph
unbroken.

### `dependencies.@ever-works/plugin-sdk` — the SDK as a workspace dependency

```jsonc
"dependencies": {
  "@ever-works/plugin-sdk": "workspace:*"
}
```

The runtime imports `PluginManifest`, `Capability`, `SlotId`,
`PluginConfig`, the nine capability-provider interfaces, and
`CapabilityProviderMap` from the SDK. Those imports must resolve to
the **same module instance** as the one a plugin author imports —
otherwise a plugin's `manifest.capabilities = ['auth']` would be
typed against one `Capability` enum and the runtime's `loadPlugins`
would compare against a different one, breaking type narrowing and
silently allowing invalid capability strings.

The `workspace:*` specifier guarantees one resolution for the SDK in
the entire monorepo. pnpm's content-addressable store means the
runtime, the host, every plugin, and every test file all resolve to
the same `node_modules/@ever-works/plugin-sdk` symlink. Bumping this
to a registry version (`@ever-works/plugin-sdk@0.1.0`) would fail
because the SDK is `private: true`; the workspace specifier is the
only valid resolution.

### `dependencies.zod` — runtime config validation

```jsonc
"dependencies": {
  "zod": "^4.0.5"
}
```

Zod is a runtime dependency because:

- `loadPlugins` reads `manifest.config` (a Zod schema) and calls
  `safeParse(rawConfig)` against the merged config sources at boot.
- The runtime's `mergeConfigSources` deep-merges env / DB / override
  rows into a plain object that the SDK's `manifest.config.parse`
  then validates.
- `createTestRegistry` accepts a `configOverrides` map that the
  testing helper must validate against each plugin's schema before
  registering — Zod is the validator.

The `^4.0.5` range matches the SDK's range exactly. Bumping the
major in either package without bumping the other is a configuration
bug; pnpm's `peerDependencies` propagation will warn at install time.

### `peerDependencies.react` — required peer (unlike the SDK's optional peer)

```jsonc
"peerDependencies": {
  "react": ">=19.0.0"
}
```

React is a peer dependency because `<SlotHost />` is a React
function component that imports `react` at runtime. Unlike the SDK
(see
[SDK manifest](./sdk-package-manifest.md#peerdependenciesreact--react-as-a-host-concern)),
the peer is **not** marked optional. There is no
`peerDependenciesMeta.react.optional: true` flag because:

- `<SlotHost />` cannot work without React — the component is
  literally a React function. There is no useful "non-React" mode.
- A host that imports `@ever-works/plugin-runtime` without React
  installed should fail loudly at install time, not silently at
  runtime when `<SlotHost />` is first rendered.

The `>=19.0.0` lower bound matches the SDK's. Bumping the lower
bound is a host-side event: every host that used to ship against
React 18 must verify that `<SlotHost />` and every plugin's slot
component compile against React 19's stricter hooks /
`use(promise)` rules. The
[Vercel React Best Practices skill](https://github.com/ever-works/directory-web-template/blob/develop/.claude/skills/vercel-react-best-practices/SKILL.md)
documents the exact React 19 patterns slot components should
follow.

### `devDependencies` — type-check-time only

```jsonc
"devDependencies": {
  "@ever-works/tsconfig": "workspace:*",
  "@types/react": "19.2.7",
  "react": "19.2.5",
  "typescript": "^5"
}
```

Every entry here is dev-only:

- **`@ever-works/tsconfig`** is the shared base
  [`tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig)
  that pins `target`, `module`, `moduleResolution`, `strict`, and
  `exactOptionalPropertyTypes`. Bumping the base config is a
  workspace-wide event; the runtime picks it up automatically via
  the `workspace:*` specifier.
- **`@types/react` and `react`** are needed at type-check time so
  `tsc --noEmit` can resolve `React.FunctionComponent` and the JSX
  factory in `SlotHost.tsx`. They are dev-only because:
    - the runtime declares `react` as a **required peer** so the
      published shape says "the host installs React, not me";
    - the `devDependencies` entry exists only so the runtime's own
      `tsc --noEmit` script doesn't fail with "Cannot find module
      'react'" when run in isolation.
- **`typescript`** is dev-only because the runtime ships TS sources
  directly via `exports`. There is no compile step that would need
  TypeScript at runtime.

There is intentionally **no** `@types/react-dom` or `react-dom`
entry. The runtime never imports anything from `react-dom` —
`<SlotHost />` is a pure render component, not a portal or a root
mount. The host's React DOM rendering is its own concern.

## Sub-path map: barrel vs. narrowed

The relationship between the barrel and the four narrowed sub-paths
is a **strict subset** with one twist: each narrowed sub-path covers
exactly one source file, and the barrel covers all four:

```
@ever-works/plugin-runtime              // barrel — every public export
  ├── @ever-works/plugin-runtime/registry  // PluginRegistry
  ├── @ever-works/plugin-runtime/loader    // loadPlugins, mergeConfigSources, PluginConfigSources, LoadPluginsResult
  ├── @ever-works/plugin-runtime/SlotHost  // SlotHost, SlotHostProps
  └── @ever-works/plugin-runtime/testing   // createTestRegistry
```

The barrel re-exports everything the four narrowed sub-paths expose.
A consumer that imports `PluginRegistry` from the barrel gets the
same module instance as a consumer that imports it from the narrowed
sub-path — Node's module cache is keyed by the resolved file path
(`src/registry.ts` in both cases), not the import specifier. This
matters for `instanceof` checks and identity comparisons: there's
only one `PluginRegistry` constructor and one `<SlotHost />`
component in memory, no matter which import specifier brought them
in.

The **four** narrowed sub-paths are the runtime's signature
performance-correctness contract. Each one isolates a different
concern:

- **`./registry`** keeps React out of server-only callers. The host
  app's database-backed enable / disable middleware imports
  `PluginRegistry` through this sub-path so a server-only
  `instrumentation.ts` doesn't pull `react/jsx-runtime` into the
  server graph.
- **`./loader`** is the boot pipeline. `apps/web/lib/plugins/boot.ts`
  imports `loadPlugins` / `mergeConfigSources` through this sub-path
  so the boot pipeline never accidentally imports `<SlotHost />`.
- **`./SlotHost`** makes the React boundary explicit. A layout
  component that imports through this sub-path shows up clearly as
  "client-side React" in bundle reports.
- **`./testing`** keeps JSDOM out of unit tests that don't render.
  A Playwright API spec or a server-side unit test imports
  `createTestRegistry` through this sub-path so it never spins up
  the React testing environment.

There is **no** narrowed sub-path for the barrel's
`PluginConfigSources` / `LoadPluginsResult` types — they are
covered by `./loader` because they live in the same source file.

If a future change ever needs a runtime constant or a new React
component from this package, the right move is to add a narrowed
sub-path entry in `exports` and document it here in the same
change.

## Failure matrix

| Mistake                                                                                     | Where it surfaces                                                                                               | Why                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Host imports `@ever-works/plugin-runtime/manifest` (no `exports` entry).                    | Module-resolution error at build time (`Cannot find module` from Node, bundler, or `tsc`).                      | `package.json#exports` is exhaustive — only `.`, `./registry`, `./SlotHost`, `./loader`, and `./testing` are reachable.                                                                                                  |
| Server action imports `PluginRegistry` from the barrel instead of `./registry`.             | Silent bundle bloat — React leaks into the server bundle.                                                       | The barrel re-exports `<SlotHost />` and the bundler keeps every barrel-level re-export when `sideEffects` is true on **any** consumer's tree. The fix is the narrowed `./registry` sub-path.                            |
| Host imports `@ever-works/plugin-runtime/slothost` (lowercased).                            | Module-resolution error on case-sensitive filesystems (Linux, macOS in case-sensitive mode).                    | The sub-path is `./SlotHost`, matching `SlotHost.tsx` literally. The casing is part of the contract.                                                                                                                     |
| Host imports `@ever-works/plugin-runtime` from a CommonJS environment without `import()`.   | Runtime error: `ERR_REQUIRE_ESM`.                                                                               | The package is `"type": "module"`. CJS callers must use dynamic `import()`. The host's Next.js app is ESM-native, so this only bites isolated unit tests with a stale Jest config.                                       |
| Workspace consumer drops `sideEffects: false`.                                              | Silent bundle bloat — `<SlotHost />` and React ship to clients that never use them.                             | Tree-shaking only happens when bundlers can prove the package is side-effect-free. The flag is the proof.                                                                                                                |
| Host's `package.json` declares `@ever-works/plugin-runtime@0.1.0` instead of `workspace:*`. | `pnpm install` fails with `ERR_PNPM_NO_MATCHING_VERSION_INSIDE_WORKSPACE`.                                      | `private: true` plus the unscoped registry means the only valid resolution is `workspace:*`.                                                                                                                             |
| Runtime version diverges from SDK version (e.g. runtime `0.2.0` + SDK `0.1.0`).             | `tsc --noEmit` fails because `PluginManifest`, `Capability`, or `SlotId` shape mismatches between packages.     | The runtime imports those names from the SDK; bumping one without the other breaks the type compatibility chain.                                                                                                         |
| Host installs no React.                                                                     | `pnpm install` warns (`unmet peer dependency react`) and `<SlotHost />` crashes at runtime when first rendered. | The peer is **required** (no `optional: true` flag). A React-less host cannot use the runtime.                                                                                                                           |
| Plugin uses Zod 3 schemas but runtime is on Zod 4.                                          | Runtime error inside `loadPlugins.safeParse` — schema construction throws.                                      | `dependencies.zod` is `^4.0.5`; Zod 3 schemas are not interchangeable with Zod 4 ones. The plugin's own `package.json` should use the same range.                                                                        |
| New public name added to `index.ts` but no entry in `exports`.                              | Host build still works (the barrel covers it).                                                                  | This is **not** a failure in the technical sense — but it leaves the [Runtime Public Surface](./runtime-public-surface.md) doc stale. Use the [public-surface change checklist](#public-surface-change-checklist) below. |
| New file added under `src/` and exposed via `exports` but not via the barrel.               | Host build works, but the [Runtime Public Surface](./runtime-public-surface.md) doesn't list the export.        | Either add the re-export to the barrel (preferred) or document the new sub-path here and in [Runtime Public Surface](./runtime-public-surface.md#sub-paths).                                                             |

## Public-surface change checklist

When changing **any** field in this `package.json`:

- [ ] **Update this page** with the new value. Every field above is
      load-bearing; the doc can never lag the manifest.
- [ ] **Cross-check
      [Runtime Public Surface](./runtime-public-surface.md)**. If the
      change affects `exports`, the public-surface table must be
      updated in the same commit.
- [ ] **Cross-check
      [SDK Package Manifest](./sdk-package-manifest.md)**. The
      runtime's version must always be ≥ the SDK's, and a Zod /
      React peer-range bump in one almost always propagates to the
      other.
- [ ] **Cross-check
      [`packages.md`](./packages.md)**. The packages overview cites
      every runtime export, peer-dep posture, and the
      `sideEffects` flag.
- [ ] **Cross-check `apps/web/package.json`** and any host consumer.
      A peer-range bump propagates to the host's pinned React
      version; a Zod major bump propagates to every plugin's
      `dependencies` and the host's own boot pipeline.
- [ ] **Append a `docs/log.md` entry** under today's date. The line
      should mention the field, the old value, the new value, and
      the cross-link to this page.
- [ ] **Add or update an entry in
      [`docs/questions.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/questions.md)**
      if the change opens a configuration choice (e.g. "should
      narrowed sub-path X exist?"). Default to the most conservative
      option and let the user override later.
- [ ] **Run `pnpm tsc --noEmit` and the Playwright smoke specs.**
      A `version` bump that invalidates the SDK / runtime
      compatibility chain will show up as a `tsc` error in the
      runtime; a `<SlotHost />` API change will show up as a host
      render failure in the Playwright suite.
- [ ] **Update the
      [Constitution Check](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
      note** in the PR description if the change affects Article I
      (Plugin-First) or Article III (Public-Surface Stability).

## Cross-references

- [Runtime Public Surface Reference](./runtime-public-surface.md) —
  the TypeScript barrel exposed by `src/index.ts` that this manifest
  wires up.
- [SDK Package Manifest Reference](./sdk-package-manifest.md) — the
  analogous reference for `packages/plugin-sdk/package.json` (the
  framework-agnostic half of the plugin system, paired with the
  runtime here).
- [Plugin Package TypeScript Configurations](./plugin-tsconfigs.md)
  — the per-package `tsconfig.json` files for the SDK, runtime, and
  demo packages. The runtime's `tsconfig.json` is byte-identical to
  the SDK's and demo's; any change here must be matched in all three
  packages and in this manifest's React peer-dep range.
- [Plugin Packages overview](./packages.md) — the table that lists
  all three plugin packages (`plugin-sdk`, `plugin-runtime`,
  `plugin-demo`) with the same field-by-field treatment in summary
  form.
- [Authoring a Plugin](./authoring-a-plugin.md) — the author's guide
  that shows how the runtime's `dependencies`, `peerDependencies`,
  and `workspace:*` specifier line up with a plugin's own
  `package.json`.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
  — the source-of-truth spec that locks the plugin system's
  package-level contract.
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
  — Article I (Plugin-First) and Article III (Public-Surface
  Stability) are the two articles this manifest enforces at the
  package boundary.
