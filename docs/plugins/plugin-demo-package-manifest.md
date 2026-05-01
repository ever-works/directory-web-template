---
id: plugin-demo-package-manifest
title: Plugin Demo Package Manifest Reference
sidebar_label: Demo Package Manifest
sidebar_position: 20
---

# Plugin Demo Package Manifest Reference

> **Status.** Authoritative reference for the `package.json` of
> `@ever-works/plugin-demo` defined in
> [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The package manifest is locked by
> [`packages/plugin-demo/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/package.json);
> when the demo plugin changes its entry-file extension, peer-dependency
> posture, or the tree-shaking flag, update **this** page in the same
> change so the doc and the manifest cannot drift.

`@ever-works/plugin-demo` is the **third** package in the plugin-system
triplet. While [`@ever-works/plugin-sdk`](./sdk-package-manifest.md) is
the framework-agnostic library half (the contract every plugin author
imports from) and
[`@ever-works/plugin-runtime`](./runtime-package-manifest.md) is the
React-aware host-app half (the registry, loader, and `<SlotHost />`
the host application consumes), `@ever-works/plugin-demo` is the
**plugin-author half** — a worked, in-tree consumer of the SDK that any
third-party plugin author can copy as a starting point. The
[Reference Plugin (`@ever-works/plugin-demo`)](./plugin-demo.md) page
documents the three TypeScript source files inside `src/`; this page
documents the **package-level contract** — the `package.json` fields
that decide how the demo plugin is wired into the workspace and how a
downstream plugin author must wire their own package the same way.

This page is the **per-source-file reference** that pairs with
[`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/package.json)
the same way
[`sdk-package-manifest.md`](./sdk-package-manifest.md) pairs with
`packages/plugin-sdk/package.json`,
[`runtime-package-manifest.md`](./runtime-package-manifest.md) pairs
with `packages/plugin-runtime/package.json`,
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
[`plugin-demo.md`](./plugin-demo.md) covers **what** the demo plugin
exposes via TypeScript, this page covers **how** the demo plugin is
wired into Node's resolution algorithm and any bundler that reads
`package.json#exports` — the two pages are deliberately complementary
and should both be read whenever the demo plugin's package shape is
changed.

## At a glance

| Field                                  | Value                                                                                          | Why it matters                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                                 | `@ever-works/plugin-demo`                                                                      | The scoped name the host app puts in its workspace dependency list. The scope locks the package to the workspace.                               |
| `version`                              | `0.1.0`                                                                                        | The current demo version. Pinned in lock-step with `@ever-works/plugin-sdk` so a `templateRange: '>=0.1 <1.0'` always admits the demo.          |
| `description`                          | `"Reference / demo plugin for the Directory Web Template plugin system."`                      | One-line human-readable summary; surfaces in `pnpm list`, the admin plugin browser, and any package-graph tool.                                 |
| `license`                              | `AGPL-3.0`                                                                                     | The project's license. Plugins linking against the SDK and shipped in-tree inherit AGPL obligations when distributed.                           |
| `private`                              | `true`                                                                                         | Blocks accidental `pnpm publish`. The demo is consumed via `workspace:*` only; downstream plugin authors will flip this to `false` to publish.  |
| `type`                                 | `"module"`                                                                                     | The package is a native ESM module. CommonJS hosts must `import()` it dynamically.                                                              |
| `sideEffects`                          | `false`                                                                                        | Opts the package into bundler tree-shaking — the demo's `Header.tsx` is dead code in builds where the `'header.right'` slot isn't rendered.     |
| `main`                                 | `./src/index.tsx`                                                                              | Node's legacy entry; resolves to the same TypeScript source as `exports."."`. Note the `.tsx` extension because the entry composes JSX.         |
| `types`                                | `./src/index.tsx`                                                                              | TypeScript reads types from the same file. There is **no** separate `.d.ts` build step — Turborepo skips it intentionally.                      |
| `exports."."`                          | `./src/index.tsx`                                                                              | The single barrel — the plugin's `default` export (`DirectoryPlugin<DemoConfig>`).                                                              |
| `files`                                | `["src"]`                                                                                      | Even though `private: true` means the package never ships, this guards against accidental publishes including `node_modules`.                   |
| `scripts.typecheck`                    | `tsc --noEmit`                                                                                 | The single quality gate at the package level — type-checks the entry, the Zod schema, and the slot component all at once.                       |
| `scripts.lint`                         | `echo 'No lint configured for plugin-demo'`                                                    | Intentional no-op so `turbo run lint` succeeds while the per-package ESLint config is still pending Phase D.                                    |
| `dependencies.@ever-works/plugin-sdk`  | `workspace:*`                                                                                  | The demo imports `defineDirectoryPlugin` (value) and `SlotComponentProps` (type) from the SDK — they must be the same module instance.          |
| `dependencies.zod`                     | `^4.0.5`                                                                                       | Zod is a runtime dependency because `ConfigSchema = z.object({...})` is a runtime value the loader's `safeParse` walks at boot.                 |
| `peerDependencies.react`               | `>=19.0.0`                                                                                     | React is a peer dependency because `Header.tsx` returns JSX. The host's React installation is the only React the demo runs against.             |
| `devDependencies.@ever-works/tsconfig` | `workspace:*`                                                                                  | The shared TS base config that pins `target`, `module`, `moduleResolution`, `strict`, and the JSX flags needed for `.tsx` source.               |
| `devDependencies.@types/react`         | `19.2.7`                                                                                       | React 19 typings, only used at type-check time so `tsc --noEmit` can resolve `React.ReactNode` and `JSX.IntrinsicElements`.                     |
| `devDependencies.react`                | `19.2.5`                                                                                       | React itself is dev-only — `Header.tsx` returns JSX but never imports `react` directly; the JSX runtime is wired via `tsconfig`'s `jsx` flag.   |
| `devDependencies.typescript`           | `^5`                                                                                           | TypeScript is dev-only — the demo ships TS sources directly via `exports`, no compile step.                                                     |

The package manifest is **deliberately the smallest of the three** —
where the SDK has three `exports` entries and the runtime has five,
the demo has exactly one. There is no `dist/`, no `bin`, no `module`,
no `browser`, no `unpkg`, and no narrowed sub-path. Adding any of
those would imply the demo plugin owns a public TypeScript surface
beyond its `default` export, which it deliberately does not — the
plugin is its own surface.

## Field-by-field

### `name` — the scoped workspace name

```jsonc
"name": "@ever-works/plugin-demo"
```

The `@ever-works/` scope is the only legitimate way for the host app to
identify the demo. The host app puts

```jsonc
{
  "dependencies": {
    "@ever-works/plugin-demo": "workspace:*"
  }
}
```

in `apps/web/package.json`. The `workspace:*` specifier resolves to
this package via pnpm's workspace protocol; if a downstream consumer
ever tries to use a non-workspace specifier (e.g. a registry version)
the resolution will fail because the package is `private: true` and
never published. That failure is the intended outcome — see the
[failure matrix](#failure-matrix) below.

A downstream plugin author writing their own plugin (e.g.
`@acme/plugin-stripe-checkout`) **does not** use the `@ever-works/`
scope; the scope is reserved. They pick their own scope and either
ship via `workspace:*` (in-tree plugin) or publish to npm (out-of-tree
plugin). Either way, the package's own `name` field is the only
identifier the host app uses to import the plugin.

### `version` — the demo version that gates `templateRange`

```jsonc
"version": "0.1.0"
```

The demo's `manifest.version: '0.1.0'` (declared inside
`src/index.tsx`) is **separate** from this `package.json#version`
field. They happen to agree at `0.1.0` today, but the SDK only reads
the manifest version at boot — the package version is metadata for
`pnpm list`, the admin plugin browser, and any tool that walks the
workspace dependency graph. A future demo could bump
`package.json#version` to `0.2.0` (because of a tooling change inside
the package) without bumping `manifest.version` (because the plugin's
runtime contract is unchanged); the two fields drift on purpose.

The `templateRange: '>=0.1 <1.0'` declared in the manifest is what
gates loader admission; this `package.json#version` is purely a
workspace-graph identifier.

### `description` — the human-readable one-liner

```jsonc
"description": "Reference / demo plugin for the Directory Web Template plugin system."
```

The description surfaces in three places:

1. `pnpm list --json` and `pnpm why @ever-works/plugin-demo`.
2. The admin plugin browser (when implemented under
   [Spec 009 — Admin Dashboard](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/009-admin-dashboard)),
   which reads `package.json#description` to render the plugin card's
   subtitle so the admin can distinguish plugins at a glance without
   opening the manifest.
3. Any third-party package-graph tool (FOSSA, Dependabot, etc.) that
   indexes workspace metadata.

The description is intentionally written in present-tense
imperative-free English so it reads cleanly in all three surfaces. A
downstream plugin author should follow the same convention.

### `license` — the AGPL-3.0 obligation chain

```jsonc
"license": "AGPL-3.0"
```

The demo plugin inherits the project's AGPL-3.0 license. Because the
demo is in-tree and ships as part of the workspace, it does not have a
separate `LICENSE.md` file — the
[root `LICENSE.md`](https://github.com/ever-works/directory-web-template/blob/develop/LICENSE.md)
governs it transitively.

A third-party plugin author can pick any license they like for their
own package, **but** linking against `@ever-works/plugin-sdk` (which
is itself AGPL-3.0) brings the AGPL obligation chain into play
whenever the resulting host app is distributed. The plugin author who
needs a commercial license should reach out via the project's
[license documentation](https://github.com/ever-works/directory-web-template/blob/develop/LICENSE.md)
before publishing.

### `private` — never published, never resolvable from a registry

```jsonc
"private": true
```

The same two-purpose flag as the SDK and runtime:

1. **Block accidental `pnpm publish`.** Even with the `files` array
   set, an `npm publish --access public` against this package would
   fail with `EPRIVATE`. The demo only ever travels via the
   workspace.
2. **Force `workspace:*` consumers.** Combined with pnpm's default
   `workspace=true` resolution, the host can only consume the demo
   via the workspace protocol. Any attempt to install
   `@ever-works/plugin-demo@0.1.0` from npmjs.com fails because the
   `@ever-works/` scope is not registered on the public registry.

A downstream plugin author publishing their own plugin would set
`private: false` (or omit the field — `false` is the default) so the
package can be `pnpm publish`-ed.

### `type` — native ESM, no CommonJS shim

```jsonc
"type": "module"
```

Every `.ts` and `.tsx` file in `src/` is treated as ESM. There is no
`.cjs` companion build, no `require()` entry, and no `__dirname` usage
in the source. Hosts that still run CommonJS (very rare in the
Next.js 16 app) must reach the demo via dynamic `import()`. The host's
Next.js app sets `"type": "module"` via `apps/web/package.json` so the
chain holds end-to-end.

### `sideEffects` — tree-shaking opt-in

```jsonc
"sideEffects": false
```

This flag is **less load-bearing** for the demo than for the SDK or
runtime — the demo's entry `src/index.tsx` does
`export default demoPlugin`, so a host that imports the demo always
imports the entire plugin shape (manifest + slot component + Zod
config). There's no opportunity for the bundler to drop part of the
demo while keeping another part.

The flag is set to `false` anyway because:

1. **Consistency with the SDK and runtime.** All three plugin-system
   packages declare the same flag so a workspace-wide convention
   holds — a future grep for `"sideEffects": false` finds every
   plugin-system package.
2. **Future-proofing for plugin lazy loading.** When the loader gains
   the ability to defer-import disabled plugins (currently tracked in
   [`docs/questions.md`](https://github.com/ever-works/directory-web-template/blob/develop/docs/questions.md)),
   the bundler will need to know the package is side-effect-free to
   correctly drop the module from the initial bundle of a host that
   has the demo plugin disabled at boot.
3. **Defence-in-depth for downstream plugin authors.** A third-party
   plugin that copies this `package.json` as a starting point inherits
   the flag automatically, which is the right default for any plugin
   that ships only a `default` export.

The
[bundle-barrel-imports](https://github.com/ever-works/directory-web-template/blob/develop/.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md)
rule lints against regressions of this flag in the host app.

### `main` and `types` — the legacy resolution path with the `.tsx` twist

```jsonc
"main": "./src/index.tsx",
"types": "./src/index.tsx"
```

Both fields point at the same file as `exports."."` — `src/index.tsx`.
The **`.tsx` extension is the key difference** from the SDK
(`./src/index.ts`) and the runtime (`./src/index.ts`). Three reasons:

1. **The entry composes a JSX value.** `src/index.tsx` calls
   `defineDirectoryPlugin({ slots: { 'header.right': DemoHeaderBadge } })`,
   and `DemoHeaderBadge` is imported from `Header.tsx`. While the
   entry file itself doesn't write `<DemoHeaderBadge />` syntax, the
   conventional naming for "this package contains JSX" is `.tsx` so
   tooling that infers JSX-flag scope by file extension (older Babel,
   esbuild without explicit loader config, certain JetBrains
   IDEs) works without surprise.
2. **Symmetry with `Header.tsx`.** The slot component lives in
   `Header.tsx`; keeping the entry as `index.tsx` makes the
   `src/` directory uniformly `.tsx` for any file that touches
   React, and uniformly `.ts` for any file that doesn't (`config.ts`).
   A downstream plugin author who looks at the `src/` directory
   immediately understands which files are React-aware.
3. **TypeScript `jsx: "preserve"`.** The shared
   [`@ever-works/tsconfig`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig)
   sets `jsx: "preserve"`, which means `.tsx` files are emitted with
   JSX preserved for the bundler to handle. A `.ts` file with JSX
   inside would fail type-checking even when the JSX is valid.

There is no separate `dist/` build, so `main` and `types` are
deliberately the **same file**. This is the same pattern as the SDK
and runtime — the workspace skips the tsc-to-`.d.ts` step in favour
of letting Turborepo type-check sources directly.

### `exports` — the single importable specifier

```jsonc
"exports": {
  ".": "./src/index.tsx"
}
```

Exactly **one** entry. The demo plugin is a single-default-export
package and has no narrowed sub-paths. A downstream consumer that
imports `@ever-works/plugin-demo/Header` (no entry, even though the
file exists) will get a resolution error from any tool that respects
`package.json#exports` (Node 18+, all modern bundlers, TypeScript with
`moduleResolution: "bundler"`). The error is the intended outcome
because:

- The plugin's `default` export carries the full manifest +
  configuration + slot component bundle. There is no use case for
  importing the slot component independently of the plugin shape; the
  slot component is registered by the runtime via the manifest, not
  imported by the host app directly.
- Letting consumers import `Header.tsx` independently would create a
  second public name (the `DemoHeaderBadge` function) that downstream
  code could pin against, locking the demo's internal file structure
  as a public contract. Keeping the file private prevents that.
- The Zod `ConfigSchema` likewise has no `exports` entry. Plugin
  authors who want to extend the demo's schema should
  re-`defineDirectoryPlugin` with their own schema, not import the
  demo's schema and `.merge()` against it.

Adding a new sub-path entry to `exports` is a Spec-Kit-level change
because it widens the import surface every host app can rely on.

### `files` — the publish whitelist

```jsonc
"files": ["src"]
```

Even though `private: true` blocks publishing, the `files` array is
declared so that **if** the package were ever flipped to public (which
won't happen for the in-tree demo, but **will** happen for downstream
plugins that copy this manifest), only the `src/` directory would
travel — `node_modules`, `tsconfig.tsbuildinfo`, `dist`, and any
generated artefacts would be excluded. This is defence-in-depth, not
a substitute for `private: true`.

### `scripts.typecheck` — the single quality gate

```jsonc
"scripts.typecheck": "tsc --noEmit"
```

`tsc --noEmit` is the single source of truth for whether the demo's
public surface compiles. The shared `@ever-works/tsconfig` enables
`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
and the `jsx: "preserve"` flag, so a regression in:

- the `ConfigSchema` (a Zod schema typo),
- the `DemoHeaderBadge` props (a `SlotComponentProps<DemoConfig>`
  shape mismatch),
- the `defineDirectoryPlugin` call (a manifest field rename or
  capability literal change), or
- the JSX inside `Header.tsx` (a missing React 19 type)

shows up here. Turborepo runs this script via `turbo run typecheck`
from the monorepo root.

### `scripts.lint` — the deliberate no-op

```jsonc
"scripts.lint": "echo 'No lint configured for plugin-demo'"
```

The script is a no-op so that `turbo run lint --filter=...` passes
across the workspace even before the per-package ESLint config lands
in Phase D of [Spec 002](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/tasks.md).
Replacing this with a real `eslint .` invocation is one of the
Phase D tasks; until then the script keeps the Turborepo task graph
unbroken.

### `dependencies.@ever-works/plugin-sdk` — the SDK contract

```jsonc
"dependencies": {
  "@ever-works/plugin-sdk": "workspace:*"
}
```

The demo imports two names from the SDK:

- **`defineDirectoryPlugin`** (value) — the factory the entry file
  calls to compose the plugin shape. This is the single value
  re-export from the SDK that any plugin uses.
- **`SlotComponentProps`** (type-only) — the shape `Header.tsx`
  destructures `{ ctx }` from. This is one of the SDK's
  per-source-file `plugin.ts` exports, accessed through the barrel.

Both names must resolve to the **same module instance** the runtime
uses. The `workspace:*` specifier guarantees that — pnpm hoists the
SDK to a single resolved path, the runtime imports from the same
path, and the registry's `manifest.config.safeParse(...)` works
because both sides agree on the Zod schema's identity.

A downstream plugin author publishing their own plugin to npm cannot
use `workspace:*`; they pin a real SDK version (`^0.1.0`) and the
host's pnpm-lockfile resolves them both to the same SDK package on
install. The
[`templateRange`](./manifest.md#templaterange-string-required) check
inside `loadPlugins` is the runtime fallback if the lockfile ever
allows two SDK majors in the same install.

### `dependencies.zod` — Zod schemas at runtime

```jsonc
"zod": "^4.0.5"
```

Zod is a runtime dependency because:

- `ConfigSchema = z.object({ enabled: z.boolean().default(true), greeting: z.string().default('Demo plugin loaded') })`
  in `src/config.ts` is a Zod **value** (not a type). The schema
  instance must exist at runtime so the loader's
  `manifest.config.safeParse(rawConfig)` call walks the object.
- `defineDirectoryPlugin` infers `DemoConfig` from
  `z.infer<typeof ConfigSchema>`; that inference happens at compile
  time but the schema instance itself must exist at runtime for the
  parser to execute when the host boots.

The `^4.0.5` range matches the SDK's and runtime's pin so all three
packages resolve to the same Zod major. A version skew here would
mean the demo's `ConfigSchema` is a Zod-3 instance while the SDK's
type-side `manifest.config: ZodTypeAny` expects Zod-4 — `safeParse`
would still work (Zod 3's API is a subset of Zod 4's for the
features the demo uses), but the type-checker would complain. Bumping
this range is therefore a workspace-wide event — the SDK, runtime,
and demo move in lock-step.

### `peerDependencies.react` — React as a host concern

```jsonc
"peerDependencies": {
  "react": ">=19.0.0"
}
```

React is a peer dependency because `Header.tsx` returns JSX. Three
notes specific to the demo:

1. **No `peerDependenciesMeta.react.optional` flag.** Unlike the SDK
   (which marks React optional because non-slot plugins exist), the
   demo always ships a slot component, so React is always required.
   This matches the runtime's posture: any plugin that registers
   anything in `slots: {...}` must have React available.
2. **No direct `import React from 'react'`.** The
   [`@ever-works/tsconfig`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig)
   sets `jsx: "preserve"` and the host's Next.js app uses the
   automatic JSX runtime, so `Header.tsx` can return JSX without an
   explicit React import. The peer-dep declaration still applies
   because the JSX runtime resolves to the host's React install at
   build time.
3. **Lower bound `>=19.0.0`.** The demo uses React 19's stricter
   function-component types (`SlotComponentProps<DemoConfig>` is a
   React 19 component shape). Bumping to a higher floor (e.g.
   React 20 when it ships) is a workspace-wide event because the SDK
   and runtime move with the demo.

A downstream plugin author whose plugin **doesn't** ship a slot
component (e.g. an analytics-provider-only plugin) should
**omit** the `peerDependencies.react` field entirely, matching the
SDK's optional-React posture rather than the demo's required-React
posture.

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
  that pins `target`, `module`, `moduleResolution`, `strict`,
  `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and
  `jsx: "preserve"`. Bumping the base config is a workspace-wide
  event; the demo picks it up automatically via the `workspace:*`
  specifier.
- **`@types/react` and `react`** are needed at type-check time so
  `tsc --noEmit` can resolve `JSX.IntrinsicElements` (the `<span>`
  in `Header.tsx`) and `React.ReactNode` (the return type of
  `DemoHeaderBadge`). They are dev-only because:
    - the demo declares `react` as a **required peer**, so the
      published shape says "the host installs React, not me";
    - the `devDependencies` entry exists only so the demo's own
      `tsc --noEmit` script doesn't fail with "Cannot find module
      'react'" when run in isolation.
- **`typescript`** is dev-only because the demo ships TS / TSX
  sources directly via `exports`. There is no compile step that
  would need TypeScript at runtime.

A downstream plugin author should mirror this set exactly when
copying the demo manifest as a starting point. The exact pinned
versions of `@types/react` and `react` (19.2.7 and 19.2.5
respectively) are chosen by the workspace and propagate into every
package that pins them; a downstream plugin can either pin the
same versions for stability or pin a range (`^19.0.0`) for
flexibility against the host's actual React version.

## Sub-path map: a deliberately empty narrowing

The relationship between the demo's barrel and any narrowed sub-path
is the **degenerate case**: there are no narrowed sub-paths. The
shape is:

```
@ever-works/plugin-demo                  // the only specifier — the default export
  └── (no narrowed sub-paths)
```

Compare to the SDK (which has two narrowed sub-paths
`./capabilities` and `./slots`) and the runtime (which has four
narrowed sub-paths `./registry`, `./SlotHost`, `./loader`,
`./testing`). The demo is at the **leaf** of the dependency graph —
the host app imports it once, the runtime walks the
`default.manifest` and `default.slots`, and that is the entire
contract. A narrowed sub-path would imply the demo has internal
structure worth exposing, which it does not.

If a future demo ever needs to expose multiple `default`-style
exports (e.g. a "demo-without-slot" variant for testing the
slot-less plugin code path), the right move is to add a second
package (`@ever-works/plugin-demo-headless`) rather than a narrowed
sub-path. This keeps each package's `default` export
unambiguously the plugin shape — the contract every plugin author
writes against.

## Failure matrix

| Mistake                                                                                         | Where it surfaces                                                                                              | Why                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Host imports `@ever-works/plugin-demo/Header` (no `exports` entry).                             | Module-resolution error at build time (`Cannot find module` from Node, bundler, or `tsc`).                     | `package.json#exports` is exhaustive — only `.` is reachable. Import the demo's default export and let the runtime register the slot component for you.                              |
| Host imports `@ever-works/plugin-demo/config` (no `exports` entry, even though file exists).    | Same module-resolution error.                                                                                  | The Zod `ConfigSchema` is private to the demo. Plugin authors who want to extend the demo's schema should re-`defineDirectoryPlugin` with their own schema.                          |
| Host imports `@ever-works/plugin-demo` from a CommonJS entry without `import()`.                | Runtime error: `ERR_REQUIRE_ESM`.                                                                              | The package is `"type": "module"`. CJS callers must use dynamic `import()`. The host's Next.js app is ESM-native, so this only bites isolated unit tests with a stale Jest config.   |
| Workspace consumer drops `sideEffects: false`.                                                  | Silent bundle bloat — no error, but `Header.tsx` ships to clients that have the `'header.right'` slot disabled. | Tree-shaking only happens when bundlers can prove the package is side-effect-free. The flag is the proof.                                                                            |
| Demo's `package.json` declares `@ever-works/plugin-sdk@0.1.0` instead of `workspace:*`.         | `pnpm install` fails with `ERR_PNPM_NO_MATCHING_VERSION_INSIDE_WORKSPACE`.                                     | `private: true` plus the unscoped registry means the only valid SDK resolution from inside the workspace is `workspace:*`.                                                            |
| `main`/`types`/`exports` extension changed from `.tsx` to `.ts`.                                | TypeScript error inside `tsc --noEmit`: `Cannot use JSX unless the '--jsx' flag is provided.`                  | `.ts` files do not have JSX context under `jsx: "preserve"`. The `.tsx` extension is the signal that opens the JSX scope.                                                            |
| Demo's `peerDependencies.react` removed (or lower bound dropped to `>=18`).                     | TypeScript error at the demo's own `tsc --noEmit`.                                                              | The slot component uses React 19 typings (`SlotComponentProps<DemoConfig>` resolves to a React 19 function-component shape).                                                          |
| Demo uses Zod 3 schemas (`z.string().nonempty()` removed in Zod 4).                             | Runtime error inside `loadPlugins.safeParse` — schema construction throws.                                     | `dependencies.zod` is `^4.0.5`; Zod 3 schemas are not interchangeable with Zod 4 ones. The SDK and runtime would also be on Zod 4.                                                    |
| Demo's `manifest.version` and `package.json#version` drift in opposite directions.              | No technical failure — both fields keep working independently.                                                  | This is **not** a failure in the technical sense — but it leaves the [Reference Plugin](./plugin-demo.md) doc stale. Use the [public-surface change checklist](#public-surface-change-checklist) to keep both docs in sync. |
| Demo's `manifest.templateRange` widened beyond the SDK's `version`.                             | Loader admits the demo at boot; no error.                                                                       | This is the intended behaviour — but it must be paired with a [Reference Plugin](./plugin-demo.md) update so plugin authors who copy the demo see the new range.                      |
| Downstream plugin author copies this manifest verbatim, keeps `name: "@ever-works/plugin-demo"`. | `pnpm install` fails with a duplicate-package-name error.                                                       | The `@ever-works/` scope is reserved; downstream authors must change `name` to their own scope before publishing.                                                                     |
| Downstream plugin author copies this manifest, keeps `private: true` while trying to publish.   | `npm publish` fails with `EPRIVATE`.                                                                            | Flip `private: true` to `private: false` (or omit the field entirely) before publishing.                                                                                              |
| Downstream plugin author publishes a non-React-only plugin but keeps the demo's required React peer. | `pnpm install` warns about a missing peer when the host doesn't install React.                                  | Non-slot plugins should mirror the SDK's optional-React posture (`peerDependenciesMeta.react.optional: true`) rather than the demo's required-React posture.                          |

## Public-surface change checklist

When changing **any** field in this `package.json`:

- [ ] **Update this page** with the new value. Every field above is
      load-bearing; the doc can never lag the manifest.
- [ ] **Cross-check
      [Reference Plugin (`@ever-works/plugin-demo`)](./plugin-demo.md)**.
      If the change affects the entry-file extension, the manifest
      version, or the Zod / React peer-dep ranges, the per-source-file
      reference page must be updated in the same commit.
- [ ] **Cross-check
      [SDK Package Manifest](./sdk-package-manifest.md) and
      [Runtime Package Manifest](./runtime-package-manifest.md)**.
      The three manifests move in lock-step on `version`, Zod range,
      React peer range, and `sideEffects` flag. A bump to one is
      almost always a bump to all three.
- [ ] **Cross-check [`packages.md`](./packages.md)**. The packages
      overview cites the demo's exports, peer-dep posture, and the
      `sideEffects` flag.
- [ ] **Cross-check `apps/web/package.json`** and any host consumer.
      The host pins `@ever-works/plugin-demo: workspace:*`; a
      manifest change that affects the resolution shape (e.g. flipping
      `private: false`) propagates to the host's lockfile.
- [ ] **Append a `docs/log.md` entry** under today's date. The line
      should mention the field, the old value, the new value, and
      the cross-link to this page.
- [ ] **Add or update an entry in
      [`docs/questions.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/questions.md)**
      if the change opens a configuration choice (e.g. "should the
      demo expose `Header.tsx` via a narrowed sub-path?"). Default
      to the most conservative option and let the user override
      later.
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

- [Reference Plugin (`@ever-works/plugin-demo`)](./plugin-demo.md) —
  the per-source-file reference for the three TypeScript files
  (`config.ts`, `Header.tsx`, `index.tsx`) that this manifest wires
  up.
- [Plugin SDK Package Manifest Reference](./sdk-package-manifest.md)
  — the analogous manifest reference for `@ever-works/plugin-sdk`,
  which this package depends on via `workspace:*`.
- [Plugin Runtime Package Manifest Reference](./runtime-package-manifest.md)
  — the analogous manifest reference for `@ever-works/plugin-runtime`,
  which is the host-app consumer of every plugin (including this
  one).
- [Plugin Packages overview](./packages.md) — the table that lists
  all three plugin packages (`plugin-sdk`, `plugin-runtime`,
  `plugin-demo`) with the same field-by-field treatment in summary
  form.
- [Authoring a Plugin](./authoring-a-plugin.md) — the author's guide
  that shows how the demo's `dependencies`, `peerDependencies`, and
  `workspace:*` specifier map to a downstream plugin's own
  `package.json`.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
  — the source-of-truth spec that locks the plugin system's
  package-level contract.
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
  — Article I (Plugin-First) and Article III (Public-Surface
  Stability) are the two articles this manifest enforces at the
  package boundary.
