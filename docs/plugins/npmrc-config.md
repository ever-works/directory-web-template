---
id: monorepo-npmrc-config
title: Workspace Hoisting Posture (`.npmrc`)
sidebar_label: Workspace Hoisting Posture
sidebar_position: 27
---

# Workspace Hoisting Posture (`.npmrc`)

> **Status.** Authoritative reference for the monorepo's pnpm
> hoisting posture defined in
> [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion).
> The hoisting posture is locked by
> [`.npmrc`](https://github.com/ever-works/directory-web-template/tree/develop/.npmrc)
> at the monorepo root; when the `shamefully-hoist` setting flips,
> the `public-hoist-pattern` list grows or shrinks, or any other
> pnpm install-time setting is added to the file, update **this**
> page in the same change so the doc and the file cannot drift.

`.npmrc` at the monorepo root is the **per-install hoisting posture
manifest** — the file that decides which transitive dependencies
pnpm flattens into the **virtual store root** so unscoped tooling
(`eslint-plugin-*`, `@types/*` packages a third-party loader
expects to resolve from the project root, the HeroUI internal
package set the design system imports as peers) can be resolved by
**any** workspace member without each member declaring those
packages as a direct dependency. It sits alongside
[`pnpm-workspace.yaml`](./pnpm-workspace.md) (which folders become
workspace members), [`turbo.json`](./turbo-config.md) (what tasks
those members can run), and the workspace-root
[`package.json`](./workspace-root-manifest.md) (the
version-pinning, native-build allow-list, and Prettier posture for
the entire repo) — together those four files compose every
contributor's `pnpm install` outcome and every CI runner's
build environment.

This page is the **per-source-file reference** that pairs with
[`.npmrc`](https://github.com/ever-works/directory-web-template/tree/develop/.npmrc)
at the repo root the same way
[`pnpm-workspace.md`](./pnpm-workspace.md) pairs with
`pnpm-workspace.yaml`,
[`turbo-config.md`](./turbo-config.md) pairs with `turbo.json`,
[`workspace-root-manifest.md`](./workspace-root-manifest.md) pairs
with the root `package.json`,
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
[`plugin-demo.md`](./plugin-demo.md) pairs with the bundled
reference plugin under `packages/plugin-demo/src/`. Where the
package-level references document **what each package contributes**
to the workspace graph,
[`pnpm-workspace.md`](./pnpm-workspace.md) documents **which folders
join the graph**,
[`turbo-config.md`](./turbo-config.md) documents **what tasks the
joined folders can run**, and
[`workspace-root-manifest.md`](./workspace-root-manifest.md)
documents **the version-pinning posture, the native-build allow-list,
and the Prettier baseline** for the entire repo, this page documents
**which transitive dependencies leak out of the virtual store root
and become resolvable from any workspace member without an explicit
direct dependency** — the **install-time hoisting posture itself**.

## At a glance

| Field                                | Value          | Why it matters                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shamefully-hoist`                   | `true`         | Re-creates the **flat-`node_modules`** layout pnpm normally avoids. Every transitive dependency pnpm installs becomes resolvable from the virtual store root, which means a workspace member can `import` a package it does **not** declare in its own `package.json` so long as something else in the graph does. Necessary for tooling that relies on Node's classic resolution semantics; see "Why `shamefully-hoist`" below. |
| `public-hoist-pattern[]=*@heroui/*`  | (single entry) | Forces every package whose name matches the glob `*@heroui/*` (i.e. every `@heroui/*` scoped package, regardless of which workspace member depends on it directly) into the **public-hoist directory** — `node_modules/<package>` at the workspace root. Necessary for HeroUI's internal-peer model; see "Why the `@heroui/*` public-hoist" below.                                                                                  |

The file is **two lines** today. Both lines are load-bearing — flipping
either one to its default reverts to pnpm's strict isolation, which
breaks one or more third-party install-time and runtime invariants the
template relies on. Keep this page in lock-step with the file.

## Why `shamefully-hoist`

`shamefully-hoist=true` instructs pnpm to write the **flat-`node_modules`**
layout that npm and yarn classic produce by default — every transitive
dependency the workspace install resolves shows up under the workspace
root's `node_modules/` directory, not just the packages each workspace
member declares as direct dependencies.

This is **the opposite** of pnpm's default isolation posture, which
keeps every package's dependencies hidden behind the symlinked
virtual store. The default catches a real class of bug — a workspace
member that imports a package it does not declare in its
`package.json` — by failing the import at runtime instead of silently
resolving the package via accidental hoisting. The flat-layout flag
turns that fail-closed posture off.

The setting is necessary because of three concrete pressures from
the template's third-party stack:

- **Next.js compiler / `next/font` resolution.** The Next.js
  compiler resolves font subsets, MDX plugins, and a small set of
  built-in providers via Node's classic resolution from the project
  root. Several of those resolutions chase packages that the
  application does **not** declare directly (they are transitive
  dependencies of `next` itself). Under pnpm's strict layout, the
  compiler's resolver would not find them at the project root and
  would fall back to error.
- **ESLint flat config plugin resolution.** The shared
  [`@ever-works/eslint-config`](./eslint-config.md) preset imports
  `eslint-plugin-react`, `eslint-plugin-react-hooks`,
  `@next/eslint-plugin-next`, `@typescript-eslint/parser`, and
  `@typescript-eslint/eslint-plugin` directly — but ESLint itself
  resolves additional plugins by name (`react-refresh`, `prettier`,
  `unused-imports`) when those names appear in a config tree.
  ESLint's resolver, like Next.js's, looks at the project root.
- **Tailwind / PostCSS plugin discovery.** Tailwind v3's
  `tailwindcss-animate`, `@tailwindcss/typography`, and PostCSS's
  `autoprefixer` are all resolved by name from the project root by
  the build pipeline. They are direct dependencies of `apps/web`,
  but Tailwind's plugin loader expects to find them flat at the
  root.

The flag also has a known cost: a workspace member could
accidentally `import` a package it does not declare and the build
would still succeed because the package is hoisted. The
counter-measure lives in the shared
[`@ever-works/tsconfig`](./tsconfig-presets.md) `base.json`'s
`"strict": true` plus the
[`@ever-works/eslint-config`](./eslint-config.md) `import/no-extraneous-dependencies`
rule — both of which catch the missing-direct-dep case at type-check
or lint time even when hoisting would mask it at runtime.

## Why the `@heroui/*` public-hoist

`public-hoist-pattern[]=*@heroui/*` is a **scope-targeted opt-in**
that forces every package whose name matches the glob into
`node_modules/<package>` at the workspace root, **above** the
virtual store. It is more aggressive than `shamefully-hoist` for
this scope only — `shamefully-hoist` flattens transitive
dependencies; `public-hoist-pattern` makes them visible to **every**
workspace member regardless of their direct declarations.

The HeroUI design-system stack the template imports
(`@heroui/react`, `@heroui/system`, `@heroui/theme`,
`@heroui/shared-utils`, plus the per-component packages
`@heroui/button`, `@heroui/modal`, `@heroui/dropdown`, etc.) ships
**internal peer dependencies** between its own packages — for
example, `@heroui/button` has `@heroui/system` and
`@heroui/shared-utils` as internal peers, and expects to resolve
both from the **caller's** `node_modules` rather than from its own.
Under pnpm's strict isolation, those peer resolutions would fail
because the caller's `node_modules` only contains the symlinked
virtual store entries pnpm chose to expose, and the HeroUI
sub-packages would not see each other.

Forcing the entire `@heroui/*` scope to public-hoist guarantees
that:

- Every internal `@heroui/*` peer dependency resolves from the
  **same** copy at the workspace root — no duplicate React
  instances inside `@heroui/system`, no double-mounted theme
  context, no "two versions of `@heroui/shared-utils`" errors.
- Workspace members that import `@heroui/react` directly
  (`apps/web`) and workspace members that import a deeper HeroUI
  sub-package as part of a re-export (`packages/plugin-demo` — see
  [`plugin-demo.md`](./plugin-demo.md) — and any future plugin
  package that touches the design system) all see the same
  resolved version of every HeroUI package.
- The `pnpm.overrides` declarations for `@types/react` and
  `@types/react-dom` in the root
  [`package.json`](./workspace-root-manifest.md) reach the HeroUI
  sub-packages — under strict isolation, peer-dependency types can
  drift between the caller and the dependency; under public-hoist,
  there is exactly one `@types/react` at the root and every HeroUI
  sub-package compiles against it.

The pattern uses a **leading `*`** (`*@heroui/*`) rather than just
`@heroui/*` because pnpm's pattern matching against package names
can include the package's leading `@` as part of the name; the
leading `*` is the safe form that matches every variation pnpm
might internally normalize to. The three official forms — the
glob a contributor would write, the form pnpm normalizes to
internally, and the form the documentation prescribes — all match
under `*@heroui/*`, so the entry survives a future pnpm internal
change.

## How the file is read at install time

pnpm reads `.npmrc` files in this order, with later wins:

1. The **system** `.npmrc` (`/etc/npmrc` on POSIX, `%APPDATA%\npm\etc\npmrc`
   on Windows). Almost never customized for a workspace install.
2. The **user** `.npmrc` (`~/.npmrc`). Often holds registry-auth
   tokens; pnpm reads but does not project them onto workspace
   behavior.
3. The **project** `.npmrc` (`<repo-root>/.npmrc` — **this file**).
   The hoisting posture lives here. Settings declared here win over
   the user file for **install-shape** keys (`shamefully-hoist`,
   `public-hoist-pattern`, `hoist`, `hoist-pattern`,
   `node-linker`).
4. **Environment variables** prefixed `npm_config_` (rare in
   day-to-day; CI runners sometimes set
   `npm_config_shamefully_hoist=false` to test isolated installs —
   the project file's value wins on the project install regardless).
5. **Command-line flags** passed to `pnpm install` (e.g.
   `--shamefully-hoist=false` on a one-off install). Win over
   everything for that single command, do not persist.

Because the project file is read after the user file but before the
command-line flags, a contributor's personal `~/.npmrc` cannot
weaken the workspace's hoisting posture, but a contributor running
`pnpm install --shamefully-hoist=false` for a one-off experiment
**can** produce a strict-isolation `node_modules/` layout. That
one-off layout will fail one or more of the three resolution
pressures listed above; the failure is the **expected** smoke
signal, not a bug in the workspace.

## Failure matrix — what breaks if you flip a setting

| Setting flipped to default                                          | What breaks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shamefully-hoist=false` (default)                                  | Next.js's font / MDX / built-in-provider resolver fails to find packages at the project root. ESLint cannot resolve plugins it does not directly declare (e.g. `eslint-plugin-react-refresh` referenced from a shared config). Tailwind's plugin loader cannot load `tailwindcss-animate` / `@tailwindcss/typography` / `autoprefixer` when invoked from the workspace root. The exact failures show up as `Cannot find module '<name>'` errors during `pnpm dev` / `pnpm build` / `pnpm lint` — never silently masked.                                                                                                                                                                                                                                                                                |
| `public-hoist-pattern[]=*@heroui/*` removed                         | HeroUI's internal peer resolution fails: `@heroui/button` cannot find `@heroui/system` from the caller's `node_modules`. Reaches the user as a runtime "two versions of React" error or a `useTheme is not a function` error in development; reaches CI as a TypeScript compile error against `@heroui/system`'s exported types because the resolved version at the caller does not match the version `@heroui/button` was compiled against. The cure is **always** to restore the entry — the symptom does not converge if you hoist a single sub-package by name, because every internal peer relationship inside HeroUI's component graph would need its own pattern. The single `*@heroui/*` glob covers the whole scope at once, so HeroUI maintainers can add new sub-packages without any change here.|
| `node-linker=hoisted` added (third-party setting some teams add)    | Equivalent to `shamefully-hoist=true` for the `node_modules/` layout but **also** disables pnpm's symlinked virtual store. Disk usage roughly doubles, and `pnpm install` slows because every package is copied instead of linked. The workspace does **not** add this setting today; if a contributor adds it experimentally and commits it, revert.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `auto-install-peers=false` (default would suppress peer resolution) | Not set in this file (pnpm's default since v8 is `true`). If a future contributor sets it to `false`, peer dependencies declared by `@heroui/*` packages stop being installed automatically and must be added to `apps/web/package.json` manually. The workspace relies on the default; do not flip it here.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Any change to the file's encoding or line endings                   | pnpm parses `.npmrc` as UTF-8 with LF line endings. A Windows-only contributor saving the file with CRLF endings can produce a parse error on POSIX CI runners. The repository's `.gitattributes` and Prettier baseline (see [`workspace-root-manifest.md`](./workspace-root-manifest.md)) keep the line endings stable; do not commit a CRLF version of this file.                                                                                                                                                                                                                                                                                                                                                                                                                                       |

## Per-line walkthrough

The file's two lines are reproduced here with the documentation
impact pinned to each one. When this file changes, this section is
the first part of the doc to update.

### Line 1 — `shamefully-hoist=true`

The setting that flattens **every** transitive dependency pnpm
installs into the workspace root's `node_modules/`. This is the
broadest install-shape change pnpm exposes and is **on** because
the template's third-party stack — Next.js, ESLint, Tailwind,
PostCSS, Docusaurus, Drizzle ORM's CLI helpers — predates pnpm's
strict-isolation default and resolves several of its own internals
via Node's classic resolution from the project root.

A workspace member that wants to detect the
"forgot-to-declare-a-direct-dependency" case despite this flag has
two layers of safety net:

- The shared
  [`@ever-works/tsconfig`](./tsconfig-presets.md) `base.json` sets
  `"strict": true` and `"moduleResolution": "Bundler"`. The Bundler
  mode does **not** consult `node_modules` at the workspace root
  the way the legacy Node mode does — so a TypeScript compile that
  imports a hoisted-but-not-declared package surfaces as an error
  even when the runtime resolution would succeed.
- The shared
  [`@ever-works/eslint-config`](./eslint-config.md) preset enables
  `import/no-extraneous-dependencies` for every `apps/*` and
  `packages/*` member. The rule walks the importing package's
  `package.json` — not the workspace root — and flags any import
  whose specifier is not declared directly. The hoisting posture
  cannot mask this lint rule.

Together those two rules catch the legitimate cost of
`shamefully-hoist=true` at compile / lint time, so the runtime cost
(silent resolution of an undeclared package) cannot escape into a
green build.

### Line 2 — `public-hoist-pattern[]=*@heroui/*`

The setting that forces the entire `@heroui/*` scope into
`node_modules/<package>` at the workspace root, ensuring every
workspace member sees the same resolved version of every HeroUI
sub-package. The `[]` after the key is pnpm's array-syntax — `.npmrc`
keys ending in `[]` are accumulated rather than overwritten by
later occurrences, so a future contributor who adds a second
`public-hoist-pattern[]=…` line **extends** the list rather than
replacing it.

The leading `*` in `*@heroui/*` is the form documented across
pnpm's release notes as the safe match for scoped packages — it
covers the literal package name (e.g. `@heroui/button`), the
internal pnpm-store representation, and any future normalization
pnpm might introduce. Do not narrow this entry to a specific
sub-package name — every internal peer relationship inside HeroUI
would require its own pattern, and the next sub-package HeroUI
ships would silently break.

## When to update this doc

Update this page in the **same change** that touches `.npmrc`. The
inverse is also true: a contributor opening a PR that flips
`shamefully-hoist`, narrows the `public-hoist-pattern` entry, or
introduces a new pnpm install-time setting must update this page so
the doc and the file cannot drift. Reviewers should reject any PR
that does one without the other.

When this page is updated, also add a one-line entry in
[`docs/log.md`](../log.md) under the current date heading describing
which install-time setting changed and why, and link to this page.
The
[Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
spec depends on the workspace install posture being predictable;
a change to `.npmrc` that affects which packages are visible at the
workspace root is a cross-cutting change to the plugin contract and
warrants both a log entry and a note on the spec page.

## See also

- [`pnpm-workspace.md`](./pnpm-workspace.md) — which folders become
  workspace members.
- [`turbo-config.md`](./turbo-config.md) — what tasks workspace
  members can run.
- [`workspace-root-manifest.md`](./workspace-root-manifest.md) —
  the version-pinning, native-build allow-list, and Prettier
  baseline at the workspace root.
- [`tsconfig-presets.md`](./tsconfig-presets.md) — the shared
  TypeScript posture that catches "imported a hoisted-but-not-
  declared package" at compile time.
- [`eslint-config.md`](./eslint-config.md) — the shared ESLint
  posture that catches the same case at lint time.
- [`packages.md`](./packages.md) — the workspace-package overview
  this page complements at the install-shape layer.
- [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion) —
  the spec that adopted pnpm workspaces and the install-shape
  posture documented here.
