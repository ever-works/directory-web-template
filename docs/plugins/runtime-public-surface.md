---
id: plugin-runtime-public-surface
title: Plugin Runtime Public Surface Reference
sidebar_label: Runtime Public Surface
sidebar_position: 17
---

# Plugin Runtime Public Surface Reference

> **Status.** Authoritative reference for the v1 public-surface barrel
> of `@ever-works/plugin-runtime` defined in
> [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The barrel is locked by
> [`packages/plugin-runtime/src/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/index.ts);
> when the runtime adds, removes, or renames a public export update
> **this** page in the same change so the doc and the runtime cannot
> drift.

`@ever-works/plugin-runtime` is the **React-aware** half of the plugin
system. Where [`@ever-works/plugin-sdk`](./sdk-public-surface.md) is
the framework-agnostic contract every plugin author imports from,
the runtime is what the **host app** boots: it owns the
[`PluginRegistry`](./registry.md), the
[`loadPlugins` / `mergeConfigSources`](./loader.md) deep-merge config
loader, the [`<SlotHost />`](./slot-host.md) React component, and the
[`createTestRegistry`](./testing.md) unit-test helper. The host app
is the **only** legitimate consumer of this barrel — plugins
themselves should never reach into `@ever-works/plugin-runtime`,
they should depend solely on `@ever-works/plugin-sdk` so that
Article I ("Core must not import from plugin packages, only from
`@ever-works/plugin-sdk`") of the
[constitution](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
stays enforceable in both directions: plugins cannot reach into the
runtime, and the runtime cannot reach into a specific plugin.

This page is the **per-source-file reference** that pairs with
[`index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/index.ts)
exactly the way [`sdk-public-surface.md`](./sdk-public-surface.md)
pairs with `packages/plugin-sdk/src/index.ts`,
[`registry.md`](./registry.md) pairs with `registry.ts`,
[`loader.md`](./loader.md) pairs with `loader.ts`,
[`slot-host.md`](./slot-host.md) pairs with `SlotHost.tsx`,
[`testing.md`](./testing.md) pairs with `testing.ts`,
[`manifest.md`](./manifest.md) pairs with `manifest.ts`,
[`capabilities.md`](./capabilities.md) pairs with `capabilities.ts`,
[`slots.md`](./slots.md) pairs with `slots.ts`,
[`providers.md`](./providers.md) pairs with `providers.ts`,
[`plugin.md`](./plugin.md) pairs with `plugin.ts`, and
[`plugin-demo.md`](./plugin-demo.md) pairs with the bundled reference
plugin under `packages/plugin-demo/src/`. Where each of those pages
documents the **shape** of one part of the runtime, this page
documents the **public surface** itself — every line of the barrel,
what it re-exports, whether it crosses the value / type boundary,
which sub-paths the package's
[`exports`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/package.json)
map exposes, and what the failure modes look like when an author
tries to reach around the barrel.

## At a glance

| Export                | Kind  | Defined in        | Per-source reference                                                |
| --------------------- | ----- | ----------------- | ------------------------------------------------------------------- |
| `PluginRegistry`      | value | `registry.ts`     | [Registry Reference](./registry.md)                                 |
| `loadPlugins`         | value | `loader.ts`       | [Loader Reference](./loader.md#loadplugins)                         |
| `mergeConfigSources`  | value | `loader.ts`       | [Loader Reference](./loader.md#mergeconfigsources)                  |
| `PluginConfigSources` | type  | `loader.ts`       | [Loader Reference](./loader.md#pluginconfigsources)                 |
| `LoadPluginsResult`   | type  | `loader.ts`       | [Loader Reference](./loader.md#loadpluginsresult)                   |
| `SlotHost`            | value | `SlotHost.tsx`    | [SlotHost Reference](./slot-host.md)                                |
| `SlotHostProps`       | type  | `SlotHost.tsx`    | [SlotHost Reference](./slot-host.md#slothostprops)                  |
| `createTestRegistry`  | value | `testing.ts`      | [Testing Reference](./testing.md)                                   |

The barrel's surface is **deliberately small**: every export above
falls into exactly one of three categories — the host-app boot
pipeline (`PluginRegistry` + `loadPlugins` + `mergeConfigSources` +
`PluginConfigSources` + `LoadPluginsResult`), the React render
surface (`SlotHost` + `SlotHostProps`), and the unit-test helper
(`createTestRegistry`). There are **no** default exports, no global
side-effecting modules, and no factory functions beyond the registry
constructor and the test helper. The package's
[`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/package.json)
declares `"sideEffects": false` so bundlers can tree-shake any unused
type-only re-export down to nothing at build time, and the host app
can import only the pieces it needs at boot — typically
`PluginRegistry` + `loadPlugins` + `mergeConfigSources` server-side
and `SlotHost` client-side.

## Sub-paths

`package.json#exports` exposes five importable specifiers:

```jsonc
{
  "exports": {
    ".":           "./src/index.ts",
    "./registry":  "./src/registry.ts",
    "./SlotHost":  "./src/SlotHost.tsx",
    "./loader":    "./src/loader.ts",
    "./testing":   "./src/testing.ts"
  }
}
```

Four of those are **narrowed** sub-paths into the same source files
the barrel re-exports from. They exist for three cases:

1. **Hot paths that only need one piece of the runtime.** A server
   action that only mutates plugin enable state can import
   `PluginRegistry` from `@ever-works/plugin-runtime/registry` and
   skip pulling in `<SlotHost />` (which would otherwise drag in
   React's runtime even though the action runs on the server). The
   sub-path keeps the import surface honest and shows up cleanly in
   [`bundle-barrel-imports`](https://github.com/ever-works/directory-web-template/tree/develop/.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md)-style
   bundle reports.
2. **Test-only consumers.** `@ever-works/plugin-runtime/testing`
   exposes `createTestRegistry` so a test file can import it
   without pulling the React `SlotHost` module into the test graph.
   The corresponding test pattern is documented in
   [Testing a Plugin](./testing-a-plugin.md) and the helper itself
   in [Testing Reference](./testing.md).
3. **Build-tool plugins that scan TypeScript imports.** ESLint,
   madge, knip, dependency-cruiser etc. can grep for
   `@ever-works/plugin-runtime/SlotHost` and report any code path
   that pulls React into a non-React boundary — useful for the
   Article I (Plugin-First) lint rule we ship under
   [Spec 002 / Phase D](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/tasks.md).

There is **no** `@ever-works/plugin-runtime/internal` or other
per-file sub-path beyond the four enumerated above: the runtime's
internal utilities live under `packages/plugin-runtime/src/` but are
intentionally only reachable through one of the five public
specifiers (the barrel plus the four narrowed sub-paths). Adding a
new sub-path is a **public-surface change** and follows the
[checklist below](#adding-a-new-public-export).

## Per-line walkthrough

`index.ts` is fifteen lines including the JSDoc preamble. Every line
is documented here so a reader can map a barrel diff to its
documentation impact one-to-one.

### Lines 1–8 — JSDoc preamble

```ts
/**
 * `@ever-works/plugin-runtime` — public surface.
 *
 * The runtime is React-aware. It owns the `PluginRegistry`, the
 * deep-merge config loader, and the `<SlotHost />` component.
 *
 * See [`docs/architecture/plugin-system.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/architecture/plugin-system.md).
 */
```

The preamble pins three invariants the rest of the barrel relies on:

- **React-aware, but only in the slot-host module.** Of the four
  source files re-exported from the barrel, three (`registry.ts`,
  `loader.ts`, `testing.ts`) compile cleanly under a Node-only
  TypeScript project. Only [`SlotHost.tsx`](./slot-host.md) imports
  from `react`. That split is what lets a server action import
  `PluginRegistry` without dragging React into the server graph and
  what lets the unit-test harness import `createTestRegistry`
  without spinning up a JSDOM environment.
- **Owns the registry, the loader, and the slot host.** The runtime's
  surface is deliberately bound to those three concerns. Anything
  beyond **register / enable / disable / load / render** belongs in
  a host-app module that wraps the registry — typically
  `apps/web/lib/plugins/registry.ts`,
  `apps/web/lib/plugins/loader.ts`, or an admin REST handler — and
  not in this package.
- **Cross-link to the architecture overview.** Every other
  per-source reference sits inside `docs/plugins/`. The architecture
  page at
  [`docs/architecture/plugin-system.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/architecture/plugin-system.md)
  is the rationale; this barrel is the contract.

### Line 9 — registry value re-export

```ts
export { PluginRegistry } from './registry';
```

The single value re-export from `registry.ts`. `PluginRegistry` is a
class (synchronous reads, async mutations) so the re-export must
cross the value boundary — a `export type` would erase the class at
compile time and the host app's `new PluginRegistry({ ... })` call
would fail at runtime. The runtime read / write surface
(`register`, `enable`, `disable`, `isEnabled`, `get`, `list`,
`slotsFor`) is documented in [`registry.md`](./registry.md); the
narrowed sub-path `@ever-works/plugin-runtime/registry` re-exports
the same class.

### Line 10 — loader value re-exports

```ts
export { loadPlugins, mergeConfigSources } from './loader';
```

Two value re-exports from `loader.ts`. `loadPlugins` runs each
plugin's Zod config schema, registers the validated value, and
invokes `setup()` if defined; `mergeConfigSources` is the shallow
merge that combines the env / DB / override config sources in
precedence order (`env < db < override`). Both are documented in
[`loader.md`](./loader.md). The corresponding sub-path
`@ever-works/plugin-runtime/loader` re-exports the same two
values.

The reason `mergeConfigSources` is a value re-export rather than a
runtime-only helper is so a host app that builds its config sources
in a non-standard way (e.g. an admin REST handler that reads from a
key-vault rather than a Postgres row) can call `mergeConfigSources`
directly to enforce the precedence contract without going through
`loadPlugins`. That removes the temptation to reimplement the merge
in the host app and accidentally reverse the precedence order.

### Line 11 — loader type re-exports

```ts
export type { PluginConfigSources, LoadPluginsResult } from './loader';
```

Two type-only re-exports.
[`PluginConfigSources`](./loader.md#pluginconfigsources) is the
shape of the config-source bag the loader accepts (`env?`, `db?`,
`override?` — all `Record<string, unknown>`); the keys are optional
because the deep-merge precedence only cares about which sources
are **provided**, not whether all three are. The corresponding
sub-path `@ever-works/plugin-runtime/loader` re-exports the same
two types.
[`LoadPluginsResult`](./loader.md#loadpluginsresult) is the
`{ registered, rejected }` summary the loader returns. The loader
intentionally **never throws** for plugin-level config failures —
every rejection lands in `result.rejected` so a host app can render
a per-plugin admin UI that distinguishes "loaded successfully"
from "loaded but rejected" without wrapping the loader call in a
try / catch. The split between `export { ... }` and
`export type { ... }` is meaningful: the latter is **erased** at
compile time so a bundler that imports only `LoadPluginsResult`
pulls zero runtime code. The
[`isolatedModules`](https://www.typescriptlang.org/tsconfig#isolatedModules)
project flag enforces this distinction.

### Line 12 — slot-host value re-export

```ts
export { SlotHost } from './SlotHost';
```

The single value re-export from `SlotHost.tsx`. `SlotHost` is the
React component that renders every contributed component for a slot
in registration order, with a Fragment-only output so it adds zero
DOM. The component is server-friendly (no `'use client'` boundary
inside the component itself; the boundary is up to the host
layout). The narrowed sub-path
`@ever-works/plugin-runtime/SlotHost` re-exports the same component;
host layouts that need to keep React out of a server boundary
should prefer the sub-path so the import shows up cleanly in
bundle reports.

### Line 13 — slot-host props type re-export

```ts
export type { SlotHostProps } from './SlotHost';
```

The single type-only re-export from `SlotHost.tsx`.
[`SlotHostProps`](./slot-host.md#slothostprops) is the
`{ slotId, registry, fallback? }` shape the component accepts;
`slotId` is constrained to the `SlotId` union that `@ever-works/plugin-sdk`
exposes, so a typo like `<SlotHost slotId="header.left.weird" />`
is caught at the call site without round-tripping through the
registry's runtime check. See
[`slot-host.md`](./slot-host.md) for the per-prop contract.

### Line 14 — testing helper value re-export

```ts
export { createTestRegistry } from './testing';
```

The single value re-export from `testing.ts`.
[`createTestRegistry`](./testing.md) spins up a `PluginRegistry`
pre-loaded with a list of plugins, running each plugin's Zod
schema with empty config sources to exercise the schema's
defaults. Intended for unit tests of plugin-aware code paths. The
narrowed sub-path `@ever-works/plugin-runtime/testing` re-exports
the same helper. There is **no** corresponding `export type`
companion line because the helper's options object
(`{ plugins: DirectoryPlugin[] }`) is an inline anonymous type —
test consumers that want to refer to it by name should declare a
local alias rather than expand the public surface here.

## Value vs. type re-exports

The barrel is split intentionally between `export { ... }` and
`export type { ... }`. The split is part of the public contract —
moving a name from one to the other is a breaking change.

| Export                 | Side       | Why                                                                                          |
| ---------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `PluginRegistry`       | value      | Runtime class — `new PluginRegistry({ ... })` and `registry.register(plugin, config)` are call sites that need the constructor and prototype methods at runtime. |
| `loadPlugins`          | value      | Runtime function — the host app awaits it during boot and reads its `LoadPluginsResult` summary. |
| `mergeConfigSources`   | value      | Runtime function — host apps that build config sources outside of `loadPlugins` call it directly to enforce the precedence contract. |
| `SlotHost`             | value      | React component — `<SlotHost slotId={...} registry={...} />` is a JSX call site that needs the component at runtime. |
| `createTestRegistry`   | value      | Runtime function — test files await it to spin up a registry with the schema's defaults. |
| `PluginConfigSources`  | type-only  | Pure shape. Erased at compile time so bundlers ship zero bytes for type-only imports.        |
| `LoadPluginsResult`    | type-only  | Pure shape. Erased at compile time so bundlers ship zero bytes for type-only imports.        |
| `SlotHostProps`        | type-only  | Pure shape. Erased at compile time so bundlers ship zero bytes for type-only imports.        |

A common mistake is to write `export { LoadPluginsResult } from './loader'`
when adding a new field to the loader's result type. That works at
runtime (the type is erased anyway) but adds a phantom value to the
barrel and breaks `isolatedModules` consumers. The pattern is:
**values use `export { ... }`, types use `export type { ... }`**.
The
[`@typescript-eslint/consistent-type-exports`](https://typescript-eslint.io/rules/consistent-type-exports/)
rule enforces this once the runtime turns it on alongside the SDK.

## Failure matrix

How a barrel-level mistake surfaces, mapped onto the layer that
catches it.

| Symptom                                                                                            | Root cause                                                                       | Caught by                                                                                                               | Where it surfaces                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot find module '@ever-works/plugin-runtime/internal'`                                          | Host app imported from a non-public sub-path                                     | Node module resolution — `package.json#exports` rejects unlisted sub-paths                                              | Build-time error in the host app (`tsc`, Next.js, Vite)                                                                                                              |
| `'LoadPluginsResult' is not exported`                                                              | Host app imported `LoadPluginsResult` as a value (`import { ... }`)              | TypeScript when `verbatimModuleSyntax` is on; otherwise erased at runtime, name resolves to `undefined`                | Build-time when strict; runtime `undefined` reference otherwise                                                                                                      |
| `PluginRegistry is not a constructor`                                                              | Bundler tree-shook a value re-export thinking it was a type                      | TypeScript catches the missing value at compile time when the consumer uses it; runtime error if a dynamic import path | `new PluginRegistry({ ... })` call site                                                                                                                              |
| `SlotHost rendered an empty Fragment` even though plugins are loaded                                | Host layout passed a different registry instance than the one `loadPlugins` populated | Run-time `<SlotHost />` rendering — registry's `slotsFor` returns an empty list                                       | The slot in the host layout where `<SlotHost slotId="…" registry={otherRegistry} />` is rendered                                                                    |
| Plugin admin UI shows the plugin disabled even though `setup()` ran                                | Host app stored `LoadPluginsResult.registered` but ignored `enabled` state from registry | TypeScript — the result type does not include enable state; admin UI must call `registry.isEnabled(name)`             | Plugin admin UI at the toggle row                                                                                                                                    |
| Bundle includes the entire runtime even though the consumer only imports `mergeConfigSources`      | `sideEffects` flag dropped from `package.json`                                   | Bundle analyzer — the runtime barrel transitively pulls `react` via the `SlotHost` re-export                            | Public-page bundle size budget enforced under [Spec 018 — Performance Budget](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/018-performance-budget) |
| `react` ends up in a server bundle that should not have it                                          | Host action imported from `@ever-works/plugin-runtime` instead of `@ever-works/plugin-runtime/registry` | Bundle analyzer — the barrel re-exports `SlotHost`, which imports React                                                | Server action bundle size budget                                                                                                                                     |

The matrix is intentionally narrow: every other failure mode the
plugin system can surface (Zod-rejected config, duplicate plugin
name, missing capability provider, slot-host fallback) is documented
under the per-source page that owns the failure — see
[`loader.md`](./loader.md), [`registry.md`](./registry.md), and
[`slot-host.md`](./slot-host.md). The barrel itself only fails when
the public surface is inconsistent with what the host app and the
plugin authors expect.

## Adding a new public export

The barrel is the contract. Any change that adds a name to the
barrel (or adds / removes a sub-path under `package.json#exports`)
is a **public-surface change** and goes through
[Spec Kit](../../.specify/README.md):

1. **Spec.** Document **why** the new export is needed in
   `docs/spec/NNN-<slug>/spec.md`. Pull the constitution check
   forward — Article I (Plugin-First) and Article VI (No removal)
   both apply.
2. **Plan.** Decide the kind (value / type / sub-path) and which
   per-source file owns the implementation. If the new export
   would cross the React boundary (i.e. a host-app server action
   would need to drag React in to use it), keep the implementation
   under `SlotHost.tsx` or open a new file with a narrowed
   sub-path so server consumers can opt out.
3. **Tasks.** Update the source file, add the corresponding
   `export { ... }` or `export type { ... }` line to `index.ts`,
   update **this** page's [At a glance](#at-a-glance) table and the
   relevant per-line walkthrough section, update
   [`docs/log.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/log.md)
   with one line under today's date.
4. **Implement.** Adding the export, updating the per-source
   reference (`registry.md`, `loader.md`, `slot-host.md`,
   `testing.md`), and writing at least one test that exercises the
   new surface — a `createTestRegistry` smoke test for a new
   registry method, a `loadPlugins` round-trip for a new loader
   option, a Playwright spec for a new admin endpoint that wraps
   the registry, or a `<SlotHost />` snapshot for a new prop.
5. **Verify.** `pnpm tsc --noEmit` from `packages/plugin-runtime`
   and `apps/web`, plus
   `pnpm --filter @ever-works/web-e2e exec playwright test`
   against any new spec.

Removing a name is governed by Article VIII of the
[constitution](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md):
move-and-improve, never delete. A "removed" export should be
preserved behind a deprecation spec
(`docs/spec/NNN-deprecate-<feature>/spec.md`) with a migration plan
before any line of `index.ts` is touched.

## See also

- [Plugin SDK Public Surface Reference](./sdk-public-surface.md) —
  the framework-agnostic counterpart paired with
  `packages/plugin-sdk/src/index.ts`.
- [Plugin Packages — SDK, Runtime, Demo](./packages.md) — the
  three-package split explained at a higher level.
- [Plugin System (Architecture)](../architecture/plugin-system.md) —
  the design rationale for the SDK / runtime boundary.
- [Authoring a Plugin](./authoring-a-plugin.md) — the workflow that
  consumes the SDK side of the runtime / SDK split.
- [Plugin Loader Reference](./loader.md) — per-API reference paired
  with `loader.ts`.
- [Plugin Registry Reference](./registry.md) — per-API reference
  paired with `registry.ts`.
- [Plugin SlotHost Reference](./slot-host.md) — per-component
  reference paired with `SlotHost.tsx`.
- [Plugin Testing Reference](./testing.md) — per-helper reference
  paired with `testing.ts`.
- [Plugin Capabilities Reference](./capabilities.md) — per-capability
  contract paired with `capabilities.ts`.
- [Plugin Slots Reference](./slots.md) — per-slot contract paired
  with `slots.ts`.
- [Plugin Manifest Reference](./manifest.md) — per-field reference
  paired with `manifest.ts`.
- [Plugin Providers Reference](./providers.md) — per-export reference
  paired with `providers.ts`.
- [Plugin Definition Reference](./plugin.md) — per-export reference
  paired with `plugin.ts`.
- [Reference Plugin (`@ever-works/plugin-demo`)](./plugin-demo.md) —
  per-source-file reference paired with the bundled reference plugin.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
  — Article I (Plugin-First) and Article VI (No removal).
