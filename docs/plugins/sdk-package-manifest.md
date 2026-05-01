---
id: plugin-sdk-package-manifest
title: Plugin SDK Package Manifest Reference
sidebar_label: SDK Package Manifest
sidebar_position: 18
---

# Plugin SDK Package Manifest Reference

> **Status.** Authoritative reference for the `package.json` of
> `@ever-works/plugin-sdk` defined in
> [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The package manifest is locked by
> [`packages/plugin-sdk/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/package.json);
> when the SDK changes its export map, peer-dependency posture, or the
> tree-shaking flag, update **this** page in the same change so the
> doc and the manifest cannot drift.

`@ever-works/plugin-sdk` is the framework-agnostic half of the plugin
system. While the
[SDK Public Surface Reference](./sdk-public-surface.md) documents the
TypeScript barrel exposed by
[`packages/plugin-sdk/src/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/index.ts),
this page documents the **package-level contract** — the
`package.json` fields that decide which sub-paths are importable, how
React is reached (peer dependency, optional), how Zod is reached
(runtime dependency, required), and how bundlers tree-shake the
SDK's type-only exports down to nothing.

This page is the **per-source-file reference** that pairs with
[`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/package.json)
the same way [`sdk-public-surface.md`](./sdk-public-surface.md) pairs
with `packages/plugin-sdk/src/index.ts`,
[`manifest.md`](./manifest.md) pairs with `manifest.ts`,
[`capabilities.md`](./capabilities.md) pairs with `capabilities.ts`,
[`slots.md`](./slots.md) pairs with `slots.ts`,
[`providers.md`](./providers.md) pairs with `providers.ts`,
[`plugin.md`](./plugin.md) pairs with `plugin.ts`,
[`loader.md`](./loader.md) pairs with `loader.ts`,
[`registry.md`](./registry.md) pairs with `registry.ts`,
[`slot-host.md`](./slot-host.md) pairs with `SlotHost.tsx`,
[`testing.md`](./testing.md) pairs with `testing.ts`,
[`plugin-demo.md`](./plugin-demo.md) pairs with the bundled reference
plugin under `packages/plugin-demo/src/`, and
[`runtime-public-surface.md`](./runtime-public-surface.md) pairs with
`packages/plugin-runtime/src/index.ts`. Where the
[SDK Public Surface Reference](./sdk-public-surface.md) covers
**what** the SDK exposes via TypeScript, this page covers **how** the
SDK is wired into Node's resolution algorithm and any bundler that
reads `package.json#exports` — the two pages are deliberately
complementary and should both be read whenever the SDK's import
surface is changed.

## At a glance

| Field                           | Value                              | Why it matters                                                                                                         |
| ------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `name`                          | `@ever-works/plugin-sdk`           | The scoped name plugin authors put in `dependencies`. The scope locks the package to the workspace.                    |
| `version`                       | `0.1.0`                            | The current SDK version. Plugins gate against it via `manifest.templateRange`.                                         |
| `license`                       | `AGPL-3.0`                         | The project's license. Plugins linking against the SDK inherit AGPL obligations when distributed.                      |
| `private`                       | `true`                             | Blocks accidental `pnpm publish`. The SDK is consumed via `workspace:*` only.                                           |
| `type`                          | `"module"`                         | The package is a native ESM module. CommonJS hosts must `import()` it dynamically.                                     |
| `sideEffects`                   | `false`                            | Opts the package into bundler tree-shaking. Type-only re-exports cost zero bytes at runtime.                           |
| `main`                          | `./src/index.ts`                   | Node's legacy entry; resolves to the same TypeScript source as `exports."."`.                                          |
| `types`                         | `./src/index.ts`                   | TypeScript reads types from the same file. There is **no** separate `.d.ts` build step — Turborepo skips it intentionally. |
| `exports."."`                   | `./src/index.ts`                   | The barrel — every public name documented in [SDK Public Surface](./sdk-public-surface.md).                            |
| `exports."./capabilities"`      | `./src/capabilities.ts`            | Narrowed sub-path for hot paths that only need `CAPABILITIES` / `isCapability` / `Capability`.                         |
| `exports."./slots"`             | `./src/slots.ts`                   | Narrowed sub-path for hot paths that only need `SLOT_IDS` / `isSlotId` / `SlotId`.                                     |
| `files`                         | `["src"]`                          | Even though `private: true` means the package never ships, this guards against accidental publishes including `node_modules`. |
| `scripts.typecheck`             | `tsc --noEmit`                     | The single quality gate at the package level — type-checks the barrel and every per-source file.                       |
| `scripts.lint`                  | `echo 'No lint configured for plugin-sdk'` | Intentional no-op so `turbo run lint` succeeds while the per-package ESLint config is still pending Phase D.   |
| `dependencies.zod`              | `^4.0.5`                           | Zod is a **runtime** dependency because `manifest.config` schemas use it at validation time inside `loadPlugins`.     |
| `peerDependencies.react`        | `>=19.0.0`                         | React is a **peer** dependency because the SDK only references React types (`SlotComponentProps<TConfig>`).            |
| `peerDependenciesMeta.react.optional` | `true`                       | Plugins without slot components (e.g. analytics-only) don't need React installed; the host always installs it anyway.  |
| `devDependencies.@ever-works/tsconfig` | `workspace:*`               | The shared TS base config that pins `target`, `module`, `moduleResolution`, and `strict` flags.                        |
| `devDependencies.@types/react`  | `19.2.7`                           | React 19 typings, only used at type-check time. Hosted by the workspace; not bundled.                                  |
| `devDependencies.react`         | `19.2.5`                           | React itself is dev-only because the SDK never imports a React runtime — it only references React types.               |
| `devDependencies.typescript`    | `^5`                               | TypeScript is dev-only — the SDK ships TS sources directly via `exports`, no compile step.                              |

The package manifest is **deliberately small**: every field above is
load-bearing. There is no `build` script, no compiled `dist/`
directory, no separate `.d.ts` artefact, and no `bin` / `module` /
`browser` / `unpkg` field. Adding any of those is a Spec-Kit-level
change because it would alter the import surface every plugin author
already depends on.

## Field-by-field

### `name` — the scoped workspace name

```jsonc
"name": "@ever-works/plugin-sdk"
```

The `@ever-works/` scope is the only legitimate way for a plugin to
identify the SDK. Plugin authors put

```jsonc
{
  "dependencies": {
    "@ever-works/plugin-sdk": "workspace:*"
  }
}
```

in their own `package.json`. The `workspace:*` specifier resolves to
this package via pnpm's workspace protocol; if a downstream consumer
ever tries to use a non-workspace specifier (e.g. a registry version)
the resolution will fail because the package is `private: true` and
never published. That failure is the intended outcome — see the
[failure matrix](#failure-matrix) below.

### `version` — the SDK version that gates `templateRange`

```jsonc
"version": "0.1.0"
```

The runtime's `loadPlugins` reads this version (indirectly, through
the running build's bundle metadata) and matches it against every
plugin's
[`manifest.templateRange`](./manifest.md#templaterange-string-required).
A plugin with `templateRange: '>=0.1 <1.0'` is admitted; a plugin
with `templateRange: '>=2.0'` is rejected and lands in
[`LoadPluginsResult.rejected[name].reason`](./loader.md#failure-matrix)
with an explanatory string. Bumping this `version` field is therefore
a **plugin-API event** — every plugin author needs to either widen
their `templateRange` or accept rejection. The version bump should
land in the same Spec Kit change that documents the new SDK contract.

### `license` — the AGPL-3.0 obligation chain

```jsonc
"license": "AGPL-3.0"
```

The plugin SDK inherits the project's AGPL-3.0 license. Plugins that
link against the SDK and are distributed (including the network-use
clause) inherit the AGPL obligations. A plugin author who needs a
commercial license should reach out via the project's
[license documentation](https://github.com/ever-works/directory-web-template/blob/develop/LICENSE.md)
before publishing a third-party plugin. The license field is here so
that any tool that scans the workspace for license compatibility
(`pnpm licenses ls`, `license-checker`, FOSSA, etc.) sees the correct
license for the SDK and not a default `UNLICENSED` placeholder.

### `private` — never published, never resolvable from a registry

```jsonc
"private": true
```

This flag has two purposes:

1. **Block accidental `pnpm publish`.** Even with the
   [files](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files)
   array set, an `npm publish --access public` against this package
   would fail with `ENEEDAUTH` or `EPRIVATE` because the registry
   refuses private packages. The flag is a hard guarantee that the
   SDK only travels via the workspace.
2. **Force `workspace:*` consumers.** Combined with `pnpm`'s default
   `workspace=true` resolution, downstream packages can only consume
   this SDK via the workspace protocol. Any attempt to install
   `@ever-works/plugin-sdk@0.1.0` from npmjs.com fails because the
   name is unscoped on the public registry — the scope itself is
   not registered.

### `type` — native ESM, no CommonJS shim

```jsonc
"type": "module"
```

Every `.ts` file in `src/` is treated as ESM. There is no `.cjs`
companion build, no `require()` entry, and no `__dirname` usage in
the source. Hosts that still run CommonJS (very rare in the Next.js
16 app) must reach the SDK via dynamic `import()`. The runtime is
`"type": "module"` for the same reason; the host's Next.js app sets
`"type": "module"` via `package.json` so the chain holds end-to-end.

### `sideEffects` — tree-shaking opt-in

```jsonc
"sideEffects": false
```

This is the **most-load-bearing** field in the manifest. Because the
SDK ships TypeScript sources directly via `exports."."` and most of
those exports are type-only, a host that imports
`defineDirectoryPlugin` should pay zero bytes for `PluginContext`,
`SlotComponentProps`, `PluginProviders`, `PluginSlots`,
`AuthProvider`, `PaymentProvider`, `AnalyticsProvider`,
`SearchProvider`, `ContentSource`, `MapsProvider`,
`NewsletterProvider`, `NotificationsProvider`, `AIProvider`, and
`CapabilityProviderMap` because TypeScript erases all of those at
compile time. The bundler can only safely drop the unused
`CAPABILITIES` and `SLOT_IDS` constant arrays if it knows the
package has no top-level side effects — `sideEffects: false` is the
declaration that gives it permission. Removing this flag is a
silent regression: the bundle keeps building, but the SDK's runtime
constants are no longer tree-shaken, and a host that only imports
`defineDirectoryPlugin` would suddenly include both arrays in the
client bundle. The
[bundle-barrel-imports](https://github.com/ever-works/directory-web-template/blob/develop/.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md)
rule lints against this kind of regression in the host app.

### `main` and `types` — the legacy resolution path

```jsonc
"main": "./src/index.ts",
"types": "./src/index.ts"
```

Both fields point at the same file as `exports."."`. They exist for
two reasons:

1. **Legacy resolvers.** Some build tools (older webpack versions,
   Jest's default resolver, certain monorepo CLIs) still read `main`
   before `exports`. Pointing them at the same file keeps the
   resolution surface uniform.
2. **TypeScript without `moduleResolution: "bundler"`.** The shared
   `@ever-works/tsconfig` sets `moduleResolution: "bundler"`, which
   reads `exports.types` first, but a plugin author who uses an older
   tsconfig (`"node"` or `"node10"`) still gets the right typings via
   the top-level `types` field.

There is no separate `dist/` build, so `main` and `types` are
deliberately the **same file**. This is the same pattern as the
runtime and demo packages — the workspace skips the tsc-to-`.d.ts`
step in favour of letting Turborepo type-check sources directly.

### `exports` — the importable sub-paths

```jsonc
"exports": {
  ".": "./src/index.ts",
  "./capabilities": "./src/capabilities.ts",
  "./slots": "./src/slots.ts"
}
```

This is the primary import-surface contract. Three specifiers are
exported:

- **`@ever-works/plugin-sdk`** — the barrel. Plugin authors should
  import from this specifier in 99% of cases. Every public name is
  enumerated in
  [SDK Public Surface](./sdk-public-surface.md#at-a-glance).
- **`@ever-works/plugin-sdk/capabilities`** — narrowed sub-path that
  only re-exports the contents of
  [`capabilities.ts`](./capabilities.md). Use this from a build-time
  tool that needs `CAPABILITIES` for code generation but doesn't want
  to depend on the entire barrel (e.g. a custom ESLint rule that
  validates a plugin's `manifest.capabilities` against the canonical
  list).
- **`@ever-works/plugin-sdk/slots`** — narrowed sub-path that only
  re-exports the contents of [`slots.ts`](./slots.md). Use this from
  a build-time tool that needs `SLOT_IDS` for the same reason.

The three sub-paths are the **only** legitimate import specifiers.
A plugin author who imports `@ever-works/plugin-sdk/manifest` (no
sub-path entry, even though the file exists in `src/`) will get a
resolution error from any tool that respects `package.json#exports`
(Node 18+, all modern bundlers, TypeScript with
`moduleResolution: "bundler"`). The error is the intended outcome —
see the [failure matrix](#failure-matrix). Adding a new sub-path is
a Spec-Kit-level change because it widens the import surface every
plugin can rely on; the change must be paired with an update to
[SDK Public Surface](./sdk-public-surface.md) and a `docs/log.md`
entry.

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

`tsc --noEmit` is the single source of truth for whether the SDK's
public surface compiles. The shared `@ever-works/tsconfig` enables
`strict` and the `exactOptionalPropertyTypes` / `noUncheckedIndexedAccess`
flags, so a regression in the manifest's `config` schema, the
provider interfaces, the slot component contract, or the barrel's
`export type` markers shows up here. Turborepo runs this script via
`turbo run typecheck` from the monorepo root.

### `scripts.lint` — the deliberate no-op

```jsonc
"scripts.lint": "echo 'No lint configured for plugin-sdk'"
```

The script is a no-op so that `turbo run lint --filter=...` passes
across the workspace even before the per-package ESLint config lands
in Phase D of [Spec 002](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/tasks.md).
Replacing this with a real `eslint .` invocation is one of the
Phase D tasks; until then the script keeps the Turborepo task graph
unbroken.

### `dependencies.zod` — the only runtime dependency

```jsonc
"dependencies": {
  "zod": "^4.0.5"
}
```

Zod is a runtime dependency because:

- `PluginManifest<C>['config']` is a Zod schema (`ZodTypeAny`).
- `loadPlugins` calls `manifest.config.safeParse(rawConfig)` at boot,
  which materialises the schema's parser and runs it against the
  merged config sources.
- `defineDirectoryPlugin` infers `C` from the schema's
  `z.infer<typeof config>`; that inference happens at compile time
  but the schema instance itself must exist at runtime for the
  parser to execute.

The `^4.0.5` range pins to Zod 4.x. Bumping the major is a
plugin-API event because Zod 4 introduced breaking changes around
the `ZodEffects` chain shape; any plugin author whose `config`
schema uses `.refine` or `.transform` would need to verify their
schema still parses against the new major. Like the
`version` bump, a Zod major bump should land in the same Spec Kit
change that documents the new SDK contract.

### `peerDependencies.react` — React as a host concern

```jsonc
"peerDependencies": {
  "react": ">=19.0.0"
},
"peerDependenciesMeta": {
  "react": {
    "optional": true
  }
}
```

React is a peer dependency because the SDK references **only React
types** (`SlotComponentProps<TConfig>` references
`React.FunctionComponent`). It never imports a React runtime, never
calls `React.createElement`, and never registers a hook. The
host's React installation provides the actual runtime; the peer
range guarantees the host has a compatible major version.

The `optional: true` flag means a plugin that doesn't define slot
components (e.g. an analytics-only plugin that only ships an
`AnalyticsProvider`) doesn't need React installed at all — pnpm's
peer-dep resolver will silently skip the peer when it's optional.
The host app always installs React anyway because Next.js 16
depends on it, so in practice the optional flag mostly matters for
unit tests that import a non-React plugin in isolation.

Bumping the lower bound (`>=19.0.0`) is a host-side event: every
plugin author who used to ship against React 18 must verify that
their slot components compile against React 19's stricter
hooks / `use(promise)` rules. The
[Vercel React Best Practices skill](https://github.com/ever-works/directory-web-template/blob/develop/.claude/skills/vercel-react-best-practices/SKILL.md)
documents the exact React 19 patterns plugin slot components should
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
  workspace-wide event; the SDK picks it up automatically via the
  `workspace:*` specifier.
- **`@types/react` and `react`** are needed at type-check time so
  `tsc --noEmit` can resolve `React.FunctionComponent` in
  `SlotComponentProps<TConfig>`. They are dev-only because:
    - the SDK declares `react` as an **optional peer**, so the
      published shape says "the host installs React, not me";
    - the `devDependencies` entry exists only so the SDK's own
      `tsc --noEmit` script doesn't fail with "Cannot find module
      'react'" when run in isolation.
- **`typescript`** is dev-only because the SDK ships TS sources
  directly via `exports`. There is no compile step that would need
  TypeScript at runtime.

## Sub-path map: barrel vs. narrowed

The relationship between the barrel and the two narrowed sub-paths
is a **strict subset**:

```
@ever-works/plugin-sdk             // barrel — every public export
  ├── @ever-works/plugin-sdk/capabilities  // CAPABILITIES + isCapability + Capability
  └── @ever-works/plugin-sdk/slots         // SLOT_IDS + isSlotId + SlotId
```

The barrel re-exports everything the two narrowed sub-paths expose.
A consumer that imports `CAPABILITIES` from the barrel gets the
same module instance as a consumer that imports it from the
narrowed sub-path — Node's module cache is keyed by the resolved
file path (`src/capabilities.ts` in both cases), not the import
specifier. This matters for `instanceof` checks and identity
comparisons: there's only one `CAPABILITIES` array in memory, no
matter which import specifier brought it in.

There is **no** narrowed sub-path for `manifest.ts`, `providers.ts`,
`plugin.ts`, or `index.ts`. Plugin authors that need a name from
those files must import it through the barrel. This is intentional:

- `manifest.ts` exports types only; a narrowed sub-path would save
  zero bundle bytes (the types are already erased).
- `providers.ts` exports the nine capability-provider interfaces;
  narrowing would let a consumer import `AuthProvider` without
  pulling the others, but again — types only, zero runtime cost.
- `plugin.ts` exports `defineDirectoryPlugin` (the single
  author-facing factory); every plugin needs it, so a narrowed
  sub-path would just be a longer way of typing the same import.

If a future change ever needs a runtime constant from one of those
files, the right move is to add a narrowed sub-path entry in
`exports` and document it here in the same change.

## Failure matrix

| Mistake                                                                                                  | Where it surfaces                                                                                        | Why                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Plugin imports `@ever-works/plugin-sdk/manifest` (no `exports` entry).                                   | Module-resolution error at build time (`Cannot find module` from Node, bundler, or `tsc`).                | `package.json#exports` is exhaustive — only `.`, `./capabilities`, and `./slots` are reachable. Import the name from the barrel instead.                                            |
| Plugin imports `@ever-works/plugin-sdk` from a CommonJS host without `import()`.                         | Runtime error: `ERR_REQUIRE_ESM`.                                                                        | The package is `"type": "module"`. CJS callers must use dynamic `import()`. The host's Next.js app is ESM-native, so this only bites isolated unit tests with a stale Jest config.   |
| Workspace consumer drops `sideEffects: false`.                                                           | Silent bundle bloat — no error, but `CAPABILITIES` / `SLOT_IDS` ship to clients that never use them.     | Tree-shaking only happens when bundlers can prove the package is side-effect-free. The flag is the proof.                                                                            |
| Plugin's `package.json` declares `@ever-works/plugin-sdk@0.1.0` instead of `workspace:*`.                | `pnpm install` fails with `ERR_PNPM_NO_MATCHING_VERSION_INSIDE_WORKSPACE`.                                | `private: true` plus the unscoped registry means the only valid resolution is `workspace:*`.                                                                                          |
| Plugin's slot component uses React 18 hooks (`useId` from `react@18`).                                   | TypeScript error at the plugin's own `tsc --noEmit`.                                                      | The peer range is `>=19.0.0` — React 18 typings won't satisfy it.                                                                                                                     |
| Plugin uses Zod 3 schemas (`z.string().nonempty()` removed in Zod 4).                                    | Runtime error inside `loadPlugins.safeParse` — schema construction throws.                                | `dependencies.zod` is `^4.0.5`; Zod 3 schemas are not interchangeable with Zod 4 ones. The plugin's own `package.json` should use the same range.                                     |
| New public name added to `index.ts` but no entry in `exports`.                                           | Plugin-author build still works (the barrel covers it).                                                   | This is **not** a failure in the technical sense — but it leaves the [SDK Public Surface](./sdk-public-surface.md) doc stale. Use the [public-surface change checklist](#public-surface-change-checklist) below. |
| New file added under `src/` and exposed via `exports` but not via the barrel.                            | Plugin-author build works, but the [SDK Public Surface](./sdk-public-surface.md) doesn't list the export. | Either add the re-export to the barrel (preferred) or document the new sub-path here and in [SDK Public Surface](./sdk-public-surface.md#sub-paths).                                  |
| `version` bump that breaks every plugin's `templateRange`.                                               | Every plugin appears in `LoadPluginsResult.rejected` at host boot.                                        | This is the intended behaviour — but it must be paired with a Spec Kit change so plugin authors get advance notice. See the [public-surface change checklist](#public-surface-change-checklist). |

## Public-surface change checklist

When changing **any** field in this `package.json`:

- [ ] **Update this page** with the new value. Every field above is
      load-bearing; the doc can never lag the manifest.
- [ ] **Cross-check
      [SDK Public Surface](./sdk-public-surface.md)**. If the change
      affects `exports`, the public-surface table must be updated in
      the same commit.
- [ ] **Cross-check
      [`packages.md`](./packages.md)**. The packages overview cites
      the manifest's exports, peer-dep posture, and the
      `sideEffects` flag.
- [ ] **Cross-check `apps/web/package.json`** and any host consumer.
      A peer-range bump propagates to the host's pinned React
      version; a Zod major bump propagates to every plugin's
      `dependencies`.
- [ ] **Append a `docs/log.md` entry** under today's date. The line
      should mention the field, the old value, the new value, and
      the cross-link to this page.
- [ ] **Add or update an entry in
      [`docs/questions.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/questions.md)**
      if the change opens a configuration choice (e.g. "should
      narrowed sub-path X exist?"). Default to the most conservative
      option and let the user override later.
- [ ] **Run `pnpm tsc --noEmit` and the Playwright smoke specs.**
      A `version` bump that invalidates `templateRange` will show up
      as the demo plugin landing in `LoadPluginsResult.rejected`,
      which the
      [`testing-a-plugin.md`](./testing-a-plugin.md) smoke specs catch.
- [ ] **Update the
      [Constitution Check](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
      note** in the PR description if the change affects Article I
      (Plugin-First) or Article III (Public-Surface Stability).

## Cross-references

- [SDK Public Surface Reference](./sdk-public-surface.md) — the
  TypeScript barrel exposed by `src/index.ts` that this manifest
  wires up.
- [Plugin Packages overview](./packages.md) — the table that lists
  all three plugin packages (`plugin-sdk`, `plugin-runtime`,
  `plugin-demo`) with the same field-by-field treatment in summary
  form.
- [Runtime Public Surface Reference](./runtime-public-surface.md) —
  the analogous reference for `packages/plugin-runtime/package.json`
  (its own per-source-file reference will land in a follow-up; until
  then, the runtime's manifest is described inline in the runtime
  public-surface page).
- [Authoring a Plugin](./authoring-a-plugin.md) — the author's guide
  that shows how the manifest's `dependencies`, `peerDependencies`,
  and `workspace:*` specifier line up with a plugin's own
  `package.json`.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
  — the source-of-truth spec that locks the plugin system's
  package-level contract.
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
  — Article I (Plugin-First) and Article III (Public-Surface
  Stability) are the two articles this manifest enforces at the
  package boundary.
