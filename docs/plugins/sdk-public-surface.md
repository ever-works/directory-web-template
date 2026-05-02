---
id: plugin-sdk-public-surface
title: Plugin SDK Public Surface Reference
sidebar_label: SDK Public Surface
sidebar_position: 16
---

# Plugin SDK Public Surface Reference

> **Status.** Authoritative reference for the v1 public-surface barrel
> of `@ever-works/plugin-sdk` defined in
> [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The barrel is locked by
> [`packages/plugin-sdk/src/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/index.ts);
> when the SDK adds, removes, or renames a public export update
> **this** page in the same change so the doc and the SDK cannot
> drift.

`@ever-works/plugin-sdk` is the **framework-agnostic** half of the
plugin system. Plugin authors should never reach beyond the barrel
into a per-source file path like `@ever-works/plugin-sdk/src/manifest`
— the barrel is the contract. The runtime
([`@ever-works/plugin-runtime`](./packages.md#ever-worksplugin-runtime))
imports from the same barrel; that's how Article I ("Core must not
import from plugin packages, only from `@ever-works/plugin-sdk`") of
the [constitution](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
stays enforceable.

This page is the **per-source-file reference** that pairs with
[`index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/index.ts)
exactly the way [`manifest.md`](./manifest.md) pairs with
`manifest.ts`, [`capabilities.md`](./capabilities.md) pairs with
`capabilities.ts`, [`slots.md`](./slots.md) pairs with `slots.ts`,
[`providers.md`](./providers.md) pairs with `providers.ts`,
[`plugin.md`](./plugin.md) pairs with `plugin.ts`,
[`loader.md`](./loader.md) pairs with `loader.ts`,
[`registry.md`](./registry.md) pairs with `registry.ts`,
[`slot-host.md`](./slot-host.md) pairs with `SlotHost.tsx`,
[`testing.md`](./testing.md) pairs with `testing.ts`, and
[`plugin-demo.md`](./plugin-demo.md) pairs with the bundled reference
plugin under `packages/plugin-demo/src/`. Where each of those pages
documents the **shape** of one part of the SDK, this page documents
the **public surface** itself — every line of the barrel, what it
re-exports, whether it crosses the value / type boundary, which
sub-paths the package's
[`exports`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/package.json)
map exposes, and what the failure modes look like when an author
tries to reach around the barrel.

## At a glance

| Export                      | Kind  | Defined in           | Per-source reference                                         |
| --------------------------- | ----- | -------------------- | ------------------------------------------------------------ |
| `CAPABILITIES`              | value | `capabilities.ts`    | [Capabilities Reference](./capabilities.md)                  |
| `isCapability`              | value | `capabilities.ts`    | [Capabilities Reference](./capabilities.md)                  |
| `Capability`                | type  | `capabilities.ts`    | [Capabilities Reference](./capabilities.md)                  |
| `SLOT_IDS`                  | value | `slots.ts`           | [Slots Reference](./slots.md)                                |
| `isSlotId`                  | value | `slots.ts`           | [Slots Reference](./slots.md)                                |
| `SlotId`                    | type  | `slots.ts`           | [Slots Reference](./slots.md)                                |
| `PluginManifest<C>`         | type  | `manifest.ts`        | [Manifest Reference](./manifest.md)                          |
| `PluginConfig<C>`           | type  | `manifest.ts`        | [Manifest Reference](./manifest.md#pluginconfigc-type-alias) |
| `AuthProvider`              | type  | `providers.ts`       | [Providers Reference](./providers.md#authprovider)           |
| `PaymentProvider`           | type  | `providers.ts`       | [Providers Reference](./providers.md#paymentprovider)        |
| `AnalyticsProvider`         | type  | `providers.ts`       | [Providers Reference](./providers.md#analyticsprovider)      |
| `SearchProvider`            | type  | `providers.ts`       | [Providers Reference](./providers.md#searchprovider)         |
| `ContentSource`             | type  | `providers.ts`       | [Providers Reference](./providers.md#contentsource)          |
| `MapsProvider`              | type  | `providers.ts`       | [Providers Reference](./providers.md#mapsprovider)           |
| `NewsletterProvider`        | type  | `providers.ts`       | [Providers Reference](./providers.md#newsletterprovider)     |
| `NotificationsProvider`     | type  | `providers.ts`       | [Providers Reference](./providers.md#notificationsprovider)  |
| `AIProvider`                | type  | `providers.ts`       | [Providers Reference](./providers.md#aiprovider)             |
| `CapabilityProviderMap`     | type  | `providers.ts`       | [Providers Reference](./providers.md#capabilityprovidermap)  |
| `defineDirectoryPlugin`     | value | `plugin.ts`          | [Plugin Definition Reference](./plugin.md)                   |
| `DirectoryPlugin<C>`        | type  | `plugin.ts`          | [Plugin Definition Reference](./plugin.md#directorypluginc) |
| `PluginContext<TConfig>`    | type  | `plugin.ts`          | [Plugin Definition Reference](./plugin.md#plugincontexttconfig) |
| `SlotComponentProps<TConfig>` | type | `plugin.ts`          | [Plugin Definition Reference](./plugin.md#slotcomponentpropstconfig) |
| `PluginProviders`           | type  | `plugin.ts`          | [Plugin Definition Reference](./plugin.md#pluginproviders)   |
| `PluginSlots<TConfig>`      | type  | `plugin.ts`          | [Plugin Definition Reference](./plugin.md#pluginslotstconfig) |

The barrel's surface is **deliberately small**: every export above
falls into exactly one of three categories — runtime constants
(`CAPABILITIES`, `SLOT_IDS`), the single author-facing factory
(`defineDirectoryPlugin`), and types. There are no classes, no
side-effecting modules, and no default exports. The package's
[`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/package.json)
declares `"sideEffects": false` so bundlers can tree-shake any unused
type-only re-export down to nothing at build time.

## Sub-paths

`package.json#exports` exposes three importable specifiers:

```jsonc
{
  "exports": {
    ".": "./src/index.ts",
    "./capabilities": "./src/capabilities.ts",
    "./slots": "./src/slots.ts"
  }
}
```

Two of those are **narrowed** sub-paths into the same source files
the barrel re-exports from. They exist for two cases:

1. **Hot paths that only need the constant array.** A bundle that
   only renders a `<select>` of available slot ids can import
   `SLOT_IDS` from `@ever-works/plugin-sdk/slots` and skip pulling
   any of the type-only declarations from the barrel. The runtime
   constants are tiny, but the narrowing keeps the import surface
   honest and shows up cleanly in
   [`bundle-barrel-imports`](https://github.com/ever-works/directory-web-template/tree/develop/.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md)-style
   bundle reports.
2. **Build-tool plugins that scan TypeScript imports.** ESLint,
   madge, knip, dependency-cruiser etc. can grep for
   `@ever-works/plugin-sdk/capabilities` and report any code path
   that depends on the capability list without owning a plugin
   manifest — useful for the
   [Article I (Plugin-First) lint rule](./capabilities.md#adding-a-new-capability)
   we ship under [Spec 002 / Phase D](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/tasks.md).

There is **no** `@ever-works/plugin-sdk/manifest`,
`@ever-works/plugin-sdk/providers`, `@ever-works/plugin-sdk/plugin`,
or other per-file sub-path: those modules are intentionally only
reachable through the barrel so that adding a new capability or
provider interface does not implicitly create a public sub-path.
Adding a new sub-path is a **public-surface change** and follows the
[checklist below](#adding-a-new-public-export).

## Per-line walkthrough

`index.ts` is 40 lines including the JSDoc preamble. Every line is
documented here so a reader can map a barrel diff to its
documentation impact one-to-one.

### Lines 1–10 — JSDoc preamble

```ts
/**
 * `@ever-works/plugin-sdk` — public surface.
 *
 * The SDK is **framework-agnostic** apart from optional React types
 * for slot components. Anything React-specific lives in
 * `@ever-works/plugin-runtime`.
 *
 * See [`docs/architecture/plugin-system.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/architecture/plugin-system.md)
 * for the design rationale.
 */
```

The preamble pins three invariants the rest of the barrel relies on:

- **Framework-agnostic.** No file under `packages/plugin-sdk/src/`
  may import from `react`, `next`, `next-intl`, or any other
  framework runtime. The only React touch is a **type-only** import
  in [`plugin.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/plugin.ts)
  (`import type { ComponentType } from 'react'`) so the SDK can type
  slot components without pulling React into the runtime graph.
- **`react` is a peer dependency, not a direct dependency.** This
  matches the package's
  [`peerDependencies` / `peerDependenciesMeta.optional: true`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/package.json)
  declarations and lets non-React consumers (a Node-only test
  harness, a future CLI inspector, the constitution's "framework
  swap" Article IX scenario) pull the SDK without React.
- **Cross-link to the architecture overview.** Every other
  per-source reference sits inside `docs/plugins/`. The architecture
  page at
  [`docs/architecture/plugin-system.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/architecture/plugin-system.md)
  is the rationale; this barrel is the contract.

### Lines 11–12 — capability re-exports

```ts
export { CAPABILITIES, isCapability } from './capabilities';
export type { Capability } from './capabilities';
```

Two value re-exports (`CAPABILITIES`, `isCapability`) and one
type-only re-export (`Capability`). `CAPABILITIES` is the canonical
`as const` tuple of capability ids, `isCapability` is a type guard
narrowing `unknown` to `Capability`, and `Capability` is the
string-literal union derived from the tuple. The split between
`export { ... }` and `export type { ... }` is meaningful: the latter
is **erased** at compile time so a bundler that imports only
`Capability` pulls zero runtime code. The
[`isolatedModules`](https://www.typescriptlang.org/tsconfig#isolatedModules)
project flag enforces this distinction.

The runtime side (per-capability lookup style, dispatch order,
fan-out vs. single) lives in [`capabilities.md`](./capabilities.md).
The TypeScript shape (each capability's provider interface) lives
in [`providers.md`](./providers.md).

### Lines 14–15 — slot re-exports

```ts
export { SLOT_IDS, isSlotId } from './slots';
export type { SlotId } from './slots';
```

Same shape as the capability block. `SLOT_IDS` is the canonical
`as const` tuple of slot ids, `isSlotId` narrows `unknown` to
`SlotId`, and `SlotId` is the string-literal union. The
[`<SlotHost />`](./slot-host.md) component validates its `slotId`
prop against this union at compile time, so a typo like
`<SlotHost slotId="header.left.weird" />` is caught at the call
site without round-tripping through the registry.

The narrowed sub-path `@ever-works/plugin-sdk/slots` re-exports the
same three names — see [Sub-paths](#sub-paths).

### Line 17 — manifest types

```ts
export type { PluginManifest, PluginConfig } from './manifest';
```

Two type-only re-exports.
[`PluginManifest<C>`](./manifest.md) is the metadata interface every
plugin declares, generic over the Zod schema type `C` so authors
get full inference for `PluginConfig<C>` (= `z.infer<C>`). The
generic parameter is **bound** in the manifest interface
(`config: C`) so a manifest declared with
`z.object({ apiKey: z.string() })` types its
`PluginContext<TConfig>['config']` as `{ apiKey: string }` end-to-end.

### Lines 19–30 — capability provider interfaces + map

```ts
export type {
  AuthProvider,
  PaymentProvider,
  AnalyticsProvider,
  SearchProvider,
  ContentSource,
  MapsProvider,
  NewsletterProvider,
  NotificationsProvider,
  AIProvider,
  CapabilityProviderMap,
} from './providers';
```

Nine concrete provider interfaces plus the `CapabilityProviderMap`
mapped type that binds each capability id to its interface. All
type-only — providers are pure shape declarations, the runtime never
imports a "default implementation" from the SDK. See
[`providers.md`](./providers.md) for the per-export contract,
including the `(string & {})` literal-with-fallback trick on
`PaymentProvider.id` and the `'ui-slot' = never` lockout that catches
mis-typed `providers` maps at compile time.

### Line 32 — the only author-facing factory

```ts
export { defineDirectoryPlugin } from './plugin';
```

The single value re-export from `plugin.ts`. The factory is
identity-preserving — it returns its input unchanged — but its
generic signature

```ts
export function defineDirectoryPlugin<C extends z.ZodTypeAny>(
  plugin: DirectoryPlugin<C>,
): DirectoryPlugin<C>;
```

is what wires the plugin's [Zod config schema](./manifest.md#config)
into the inferred `PluginContext<PluginConfig<C>>` type the slot
components and the `setup()` hook see. Without the factory an
author would have to manually pass `<C>` everywhere; with it the
inference flows from the `manifest.config` field outward.

`defineDirectoryPlugin` is **the only public value** the SDK ships
besides the runtime constants `CAPABILITIES` and `SLOT_IDS`. The
[`plugin-demo`](./plugin-demo.md) reference plugin uses it exactly
once, at the package's
[`index.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/src/index.tsx)
entry point.

### Lines 33–39 — plugin-shape types

```ts
export type {
  DirectoryPlugin,
  PluginContext,
  SlotComponentProps,
  PluginProviders,
  PluginSlots,
} from './plugin';
```

The five type-only re-exports a plugin author imports alongside
`defineDirectoryPlugin`:

- [`DirectoryPlugin<C>`](./plugin.md#directorypluginc) — the shape
  the factory returns.
- [`PluginContext<TConfig>`](./plugin.md#plugincontexttconfig) — the
  runtime context handed to `setup()` and to every slot component.
- [`SlotComponentProps<TConfig>`](./plugin.md#slotcomponentpropstconfig)
  — the props every slot component must accept.
- [`PluginProviders`](./plugin.md#pluginproviders) — the typed map
  backing `plugin.providers`.
- [`PluginSlots<TConfig>`](./plugin.md#pluginslotstconfig) — the
  typed map backing `plugin.slots`.

Five types, all from the same source file, all reachable through
the barrel. A plugin author should never need to write
`@ever-works/plugin-sdk/plugin` directly.

## Value vs. type re-exports

The barrel is split intentionally between `export { ... }` and
`export type { ... }`. The split is part of the public contract —
moving a name from one to the other is a breaking change.

| Export                  | Side       | Why                                                                                  |
| ----------------------- | ---------- | ------------------------------------------------------------------------------------ |
| `CAPABILITIES`          | value      | Runtime tuple — read by `isCapability`, ESLint rules, admin UI dropdowns.            |
| `isCapability`          | value      | Type guard — needs to exist at runtime to be callable.                               |
| `SLOT_IDS`              | value      | Runtime tuple — read by `isSlotId`, slot-host fallback paths, admin UI dropdowns.    |
| `isSlotId`              | value      | Type guard — needs to exist at runtime.                                              |
| `defineDirectoryPlugin` | value      | The only author-facing factory.                                                      |
| Everything else         | type-only  | Pure shape. Erased at compile time so bundlers ship zero bytes for type-only imports. |

A common mistake is to write `export { Capability } from './capabilities'`
when adding a new capability. That works at runtime but breaks
`isolatedModules` consumers and adds a phantom value to the barrel.
The pattern is: **values use `export { ... }`, types use
`export type { ... }`**. The
[`@typescript-eslint/consistent-type-exports`](https://typescript-eslint.io/rules/consistent-type-exports/)
rule enforces this once the SDK turns it on.

## Failure matrix

How a barrel-level mistake surfaces, mapped onto the layer that
catches it.

| Symptom                                                                                            | Root cause                                                  | Caught by                                                                                                               | Where it surfaces                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot find module '@ever-works/plugin-sdk/manifest'`                                             | Author imported from a non-public sub-path                  | Node module resolution — `package.json#exports` rejects unlisted sub-paths                                              | Build-time error in the consumer (`tsc`, Next.js, Vite)                                                                                                              |
| `'Capability' is not exported`                                                                     | Author imported `Capability` as a value (`import { ... }`) | TypeScript when `verbatimModuleSyntax` is on; otherwise erased at runtime, name resolves to `undefined`                | Build-time when strict; runtime `undefined` reference otherwise                                                                                                      |
| `defineDirectoryPlugin is not a function`                                                          | Bundler tree-shook a value re-export thinking it was a type | TypeScript catches the missing value at compile time when the consumer uses it; runtime error if a dynamic import path | `defineDirectoryPlugin(...)` call site                                                                                                                               |
| Plugin's `ctx.config` types as `unknown`                                                           | Author skipped the `defineDirectoryPlugin` factory          | TypeScript — `DirectoryPlugin<C>` cannot infer `C` without the factory's generic call site                              | Slot component / `setup()` hook                                                                                                                                       |
| Adding a capability does not show up in admin UI                                                   | New capability id not added to `CAPABILITIES` tuple         | TypeScript — the new id is not part of `Capability` so admin UI's `select` cannot render it                              | Admin dashboard's plugin-toggle screen                                                                                                                                |
| New plugin manifest field silently ignored                                                         | Field added to `manifest.ts` but not re-exported            | TypeScript when consumer reads the field; otherwise admin UI / loader silently drops it                                  | Plugin admin UI / [`loadPlugins`](./loader.md)                                                                                                                       |
| Bundle includes the entire SDK even though the consumer only imports `SLOT_IDS`                    | `sideEffects` flag dropped from `package.json`              | Bundle analyzer — the SDK barrel transitively pulls every type module                                                    | Public-page bundle size budget enforced under [Spec 018 — Performance Budget](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/018-performance-budget) |

The matrix is intentionally narrow: every other failure mode the
plugin system can surface (Zod-rejected config, duplicate plugin
name, missing capability provider, slot-host fallback) is documented
under the per-source page that owns the failure — see
[`loader.md`](./loader.md), [`registry.md`](./registry.md), and
[`slot-host.md`](./slot-host.md). The barrel itself only fails when
the public surface is inconsistent with what plugin authors and the
runtime expect.

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
   per-source file owns the implementation.
3. **Tasks.** Update the source file, add the corresponding
   `export { ... }` or `export type { ... }` line to `index.ts`,
   update **this** page's [At a glance](#at-a-glance) table and the
   relevant per-line walkthrough section, update
   [`docs/log.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/log.md)
   with one line under today's date.
4. **Implement.** Adding the export, updating the per-source
   reference (`manifest.md`, `plugin.md`, etc.), and writing at
   least one test that exercises the new surface — a Zod schema
   round-trip for a new manifest field, a `createTestRegistry`
   smoke test for a new factory, or a Playwright API spec for a
   new admin endpoint.
5. **Verify.** `pnpm tsc --noEmit` from `packages/plugin-sdk` and
   `apps/web`, plus
   `pnpm --filter @ever-works/web-e2e exec playwright test`
   against any new spec.

Removing a name is governed by Article VIII of the
[constitution](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md):
move-and-improve, never delete. A "removed" export should be
preserved behind a deprecation spec
(`docs/spec/NNN-deprecate-<feature>/spec.md`) with a migration plan
before any line of `index.ts` is touched.

## See also

- [Plugin Packages — SDK, Runtime, Demo](./packages.md) — the
  three-package split explained at a higher level.
- [Plugin System (Architecture)](../architecture/plugin-system.md) —
  the design rationale for the barrel split.
- [Authoring a Plugin](./authoring-a-plugin.md) — the workflow that
  consumes every export this page documents.
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
- [Plugin Loader Reference](./loader.md) — per-API reference paired
  with `loader.ts`.
- [Plugin Registry Reference](./registry.md) — per-API reference
  paired with `registry.ts`.
- [Plugin SlotHost Reference](./slot-host.md) — per-component
  reference paired with `SlotHost.tsx`.
- [Plugin Testing Reference](./testing.md) — per-helper reference
  paired with `testing.ts`.
- [Reference Plugin (`@ever-works/plugin-demo`)](./plugin-demo.md) —
  per-source-file reference paired with the bundled reference plugin.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
  — Article I (Plugin-First) and Article VI (No removal).
