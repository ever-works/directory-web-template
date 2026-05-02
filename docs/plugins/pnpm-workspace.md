---
id: monorepo-pnpm-workspace
title: pnpm Workspace Manifest (`pnpm-workspace.yaml`)
sidebar_label: pnpm Workspace Manifest
sidebar_position: 24
---

# pnpm Workspace Manifest (`pnpm-workspace.yaml`)

> **Status.** Authoritative reference for the monorepo's pnpm
> workspace declaration defined in
> [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion).
> The workspace shape is locked by
> [`pnpm-workspace.yaml`](https://github.com/ever-works/directory-web-template/tree/develop/pnpm-workspace.yaml)
> at the monorepo root; when a glob is added, removed, or narrowed,
> update **this** page in the same change so the doc and the manifest
> cannot drift.

`pnpm-workspace.yaml` is the **single source of truth** for which
folders pnpm scans when it builds the workspace dependency graph. It
is the file that turns `apps/web`, `apps/web-e2e`, `apps/docs`,
`packages/plugin-sdk`, `packages/plugin-runtime`,
`packages/plugin-demo`, `packages/eslint-config`, and
`packages/tsconfig` into a single linked install — and the file that
makes a `workspace:*` specifier in any consumer's `package.json`
resolve to a sibling folder rather than a tarball on the registry.

This page is the **per-source-file reference** that pairs with
[`pnpm-workspace.yaml`](https://github.com/ever-works/directory-web-template/tree/develop/pnpm-workspace.yaml)
the same way
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
plugin under `packages/plugin-demo/src/`. Where the package-level
references document **what each package contributes** to the
workspace graph, this page documents **how the graph is declared in
the first place** — the single YAML file that pnpm reads before any
package manifest is touched.

## At a glance

| Aspect            | Value                                                                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Path              | [`pnpm-workspace.yaml`](https://github.com/ever-works/directory-web-template/tree/develop/pnpm-workspace.yaml) (root)                                                                                                       |
| Format            | YAML 1.2 — pnpm reads it via `js-yaml`                                                                                                                                                                                      |
| Top-level keys    | `packages` (only key currently used)                                                                                                                                                                                        |
| Glob count        | Two: `"apps/*"`, `"packages/*"`                                                                                                                                                                                             |
| Resolved members  | Eight: `apps/web`, `apps/docs`, `apps/web-e2e`, `packages/plugin-sdk`, `packages/plugin-runtime`, `packages/plugin-demo`, `packages/eslint-config`, `packages/tsconfig`                                                     |
| Glob engine       | [micromatch](https://github.com/micromatch/micromatch) — `**/`-recursive globs are supported but **not used** today                                                                                                         |
| Required by       | `pnpm install`, `pnpm -r ...`, every `workspace:*` specifier in any nested `package.json`, Turborepo's package discovery (via [`turbo.json`](https://github.com/ever-works/directory-web-template/tree/develop/turbo.json)) |
| Read by           | pnpm, Turborepo (transitively via pnpm), `@pnpm/find-workspace-packages` consumers in tooling                                                                                                                               |
| pnpm version pin  | `pnpm@10.31.0` (declared in [`package.json#packageManager`](https://github.com/ever-works/directory-web-template/tree/develop/package.json))                                                                                |
| Prettier override | YAML files use spaces with `tabWidth: 2` (see `package.json#prettier.overrides[*]`)                                                                                                                                         |

The file is **deliberately minimal** — three lines of YAML. There is
no `catalog`, no `catalogs`, no `linkWorkspacePackages`,
`preferWorkspacePackages`, `sharedWorkspaceLockfile`,
`saveWorkspaceProtocol`, `injectWorkspacePackages`, or any of the
optional pnpm 9+/10 keys that `pnpm-workspace.yaml` can carry. Every
optional key is **deliberately absent today** — those defaults are
correct for this repo's posture and are pinned in [§ Deliberately
absent fields](#deliberately-absent-fields) below.

## File contents

```yaml
packages:
    - 'apps/*'
    - 'packages/*'
```

| Field         | Value                  | Why it matters                                                                                                                                                                                                                                                                                              |
| ------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages`    | Array of glob patterns | Tells pnpm which folders contain workspace packages. pnpm walks the matching folders, reads each one's `package.json`, and registers its `name` as a workspace member. Without this key, every `workspace:*` specifier would fail with `ERR_PNPM_NO_MATCHING_VERSION` because pnpm has no graph to resolve. |
| `packages[0]` | `"apps/*"`             | First-level wildcard under `apps/`. Resolves to `apps/web` (the Next.js host app), `apps/docs` (the Docusaurus site), and `apps/web-e2e` (the Playwright suite). Does **not** descend into nested folders — `apps/web/.next/cache` is intentionally not a workspace member.                                 |
| `packages[1]` | `"packages/*"`         | First-level wildcard under `packages/`. Resolves to `packages/plugin-sdk`, `packages/plugin-runtime`, `packages/plugin-demo`, `packages/eslint-config`, and `packages/tsconfig`. The shape mirrors the `apps/*` glob so a future contributor reading the file can see the convention at a glance.           |

## Why a glob, not an explicit list

The glob form has three properties that the explicit form does not:

1. **New packages auto-register.** Adding
   [`packages/plugin-foo/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages)
   immediately makes `@ever-works/plugin-foo` resolvable through
   `workspace:*` without a second commit to
   `pnpm-workspace.yaml`. The
   [authoring guide](./authoring-a-plugin.md) and the
   [packages overview](./packages.md) both rely on this property —
   neither doc tells the reader to "also edit
   `pnpm-workspace.yaml`" because the glob covers it.
2. **Removing a package removes a member with one delete.** A future
   `rm -rf packages/plugin-foo` cleanly removes
   `@ever-works/plugin-foo` from the workspace graph at the next
   `pnpm install` — there is no orphaned reference in
   `pnpm-workspace.yaml` to forget to clean up.
3. **The convention scales to two roots.** The repo has exactly two
   roots that hold workspace members (`apps/`, `packages/`). The two
   matching globs are the smallest possible expression of that
   topology — there is no third root to extend, and a single
   `**/package.json`-style global glob would over-match (it would
   pick up `apps/web/.content/**/package.json` from the cloned CMS
   repo and crash the install with a duplicate-name error).

## Resolved workspace members

The two globs resolve to **eight** workspace members today, in the
order pnpm walks them (deterministic by directory name within each
glob):

| Package name                         | Path                      | Resolved by    | Pairs with                                                             |
| ------------------------------------ | ------------------------- | -------------- | ---------------------------------------------------------------------- |
| `@ever-works/web`                    | `apps/web`                | `"apps/*"`     | The host Next.js app                                                   |
| `@ever-works/docs`                   | `apps/docs`               | `"apps/*"`     | The Docusaurus documentation site                                      |
| `web-e2e` (or `@ever-works/web-e2e`) | `apps/web-e2e`            | `"apps/*"`     | The Playwright e2e suite                                               |
| `@ever-works/plugin-sdk`             | `packages/plugin-sdk`     | `"packages/*"` | [`sdk-package-manifest.md`](./sdk-package-manifest.md)                 |
| `@ever-works/plugin-runtime`         | `packages/plugin-runtime` | `"packages/*"` | [`runtime-package-manifest.md`](./runtime-package-manifest.md)         |
| `@ever-works/plugin-demo`            | `packages/plugin-demo`    | `"packages/*"` | [`plugin-demo-package-manifest.md`](./plugin-demo-package-manifest.md) |
| `@ever-works/eslint-config`          | `packages/eslint-config`  | `"packages/*"` | [`eslint-config.md`](./eslint-config.md)                               |
| `@ever-works/tsconfig`               | `packages/tsconfig`       | `"packages/*"` | [`tsconfig-presets.md`](./tsconfig-presets.md)                         |

The order is **not** load-bearing — pnpm rebuilds the dependency
graph from each member's `package.json#dependencies` /
`devDependencies` / `peerDependencies`, not from the glob expansion
order. But the order is **deterministic**: a fresh `pnpm install -r`
on a clean machine walks the members in the same order on every
invocation, which keeps `pnpm-lock.yaml` stable and reproducible
across CI and developer machines.

## Glob semantics — what the two patterns do and don't match

| Pattern        | Matches                                                                                                                 | Does **not** match                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `"apps/*"`     | `apps/web`, `apps/web-e2e`, `apps/docs` (every direct child folder of `apps/`)                                          | `apps/web/.content/**` (the cloned CMS repo), `apps/web/.next/**` (the build output), `apps/web/scripts/**` (a non-package folder) |
| `"packages/*"` | `packages/plugin-sdk`, `packages/plugin-runtime`, `packages/plugin-demo`, `packages/eslint-config`, `packages/tsconfig` | `packages/plugin-sdk/src/**`, `packages/plugin-runtime/node_modules/**`, `packages/tsconfig/base.json` (a file, not a folder)      |

The single-`*` form is the safe default. A double-`**` form would
recurse into nested folders — and because
`apps/web/.content/**/package.json` exists during local development
(every cloned CMS sub-folder has a manifest), `**`-recursive matching
would produce a stream of duplicate-name errors at install time. Keep
the patterns single-`*` unless a future spec explicitly motivates
recursive scanning.

## How `workspace:*` specifiers resolve through this file

The runtime package's manifest contains:

```jsonc
{
	"dependencies": {
		"@ever-works/plugin-sdk": "workspace:*"
	}
}
```

When pnpm sees `workspace:*` it consults the workspace graph (built
from `pnpm-workspace.yaml`) and resolves the specifier to the local
`packages/plugin-sdk` folder rather than fetching a tarball from the
registry. The chain is:

1. `pnpm install` reads `pnpm-workspace.yaml`, expands the two globs,
   and walks each resolved folder's `package.json` to harvest its
   `name`.
2. The harvested names are stored in an in-memory map: `name →
absolute-path`.
3. Every `workspace:*` specifier in every harvested manifest is
   resolved against that map.
4. Any unresolved specifier produces `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`
   — the canonical symptom of a package being deleted from
   `packages/` without its consumer being updated, or a glob being
   narrowed without the dependent package being removed first.

Concretely, the demo plugin is reachable from the runtime's
`workspace:*` because the
[`packages/plugin-demo/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/package.json)
manifest declares `"name": "@ever-works/plugin-demo"` and the
`"packages/*"` glob in `pnpm-workspace.yaml` walks that folder. Drop
either side and the chain breaks.

## Deliberately absent fields

pnpm 9+ supports several optional top-level keys on
`pnpm-workspace.yaml`. Each one is **deliberately absent today** —
the absence is part of the file's contract.

| Field                     | Default behaviour we accept                                                                                                                                                                                | Why we don't set it today                                                                                                                                                                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `catalog` / `catalogs`    | Centralised version pinning across all workspace packages (one place to bump every consumer of `react`, `zod`, etc.). Without it, each `package.json` declares its own version range.                      | The repo today has only two consumers per major library (`apps/web` + the plugin packages); the `pnpm.overrides` block in `package.json` already pins React, Zod, esbuild, and OpenTelemetry across the whole graph. Catalog adoption is queued in [`docs/questions.md`](../questions.md) for a future spec. |
| `linkWorkspacePackages`   | `true` (pnpm default since v10) — every workspace package is linked into every consumer's `node_modules` even if the consumer's manifest declares the dependency by version-range form (e.g. `"^1.0.0"`).  | The default is correct. Setting it to `false` would force `workspace:*` everywhere, which is more verbose without changing behaviour.                                                                                                                                                                        |
| `preferWorkspacePackages` | `false` (pnpm default) — when both a workspace package and a registry package match a specifier, the registry version wins unless the specifier is `workspace:*` / `workspace:^` / `workspace:~`.          | The default is correct. Flipping it on would silently shadow registry packages with a workspace package that happens to share a name — a surprise we don't want.                                                                                                                                             |
| `sharedWorkspaceLockfile` | `true` (pnpm default) — a single `pnpm-lock.yaml` at the repo root locks every workspace member's dependencies. Disabling it would write a per-package `pnpm-lock.yaml` and double the maintenance burden. | The default is correct. The repo has exactly one lockfile at the root and Turborepo's cache hashing relies on it.                                                                                                                                                                                            |
| `saveWorkspaceProtocol`   | `"rolling"` (pnpm default) — `pnpm add ./local/package` writes `workspace:^` into the consumer's manifest, which is what we want for stable internal API contracts.                                        | The default is correct.                                                                                                                                                                                                                                                                                      |
| `injectWorkspacePackages` | `false` (pnpm default) — workspace packages are linked, not deep-copied. Linking is faster and keeps the graph navigable; deep-copying would defeat hot-reload during `pnpm dev`.                          | The default is correct.                                                                                                                                                                                                                                                                                      |
| `overrides`               | (Empty — overrides live in [`package.json#pnpm.overrides`](https://github.com/ever-works/directory-web-template/tree/develop/package.json) at the repo root.)                                              | Overrides apply at the repo level, not the workspace level — putting them in `package.json` keeps every related field (Prettier config, scripts, engines) in one place.                                                                                                                                      |
| `peerDependencyRules`     | (Empty — pnpm uses its built-in resolver, which warns on peer-dependency mismatches but does not error.)                                                                                                   | The repo's peer-dependency posture is documented in each plugin package's manifest reference; a global rule set would shadow those local declarations.                                                                                                                                                       |
| `packageExtensions`       | (Empty — pnpm consumes upstream `package.json` files unmodified.)                                                                                                                                          | The repo doesn't need to patch any upstream package's typings or peer-dependency declarations today. If a future dependency requires it, the extension would land in `package.json#pnpm.packageExtensions` rather than here, for the same "all related fields in one place" reason.                          |
| `onlyBuiltDependencies`   | (Empty — declared in [`package.json#pnpm.onlyBuiltDependencies`](https://github.com/ever-works/directory-web-template/tree/develop/package.json) instead.)                                                 | Same "one place per concern" rationale as `overrides`. The list of native-build-allowlist packages is already at the repo root.                                                                                                                                                                              |

## Why this file lives at the repo root, not under `packages/`

pnpm's algorithm for finding the workspace anchor is:

1. Start in the current working directory.
2. Walk up the directory tree.
3. The first folder that contains a `pnpm-workspace.yaml` file is
   the workspace anchor.

If the file lived under `packages/` or `apps/`, every `pnpm install`
run from a sibling folder would walk past the anchor and either
treat the sibling as a single-package install or fail to find the
graph at all. The repo root is the only correct location.

The same property is what makes
[`turbo.json`](https://github.com/ever-works/directory-web-template/tree/develop/turbo.json)
discoverable from any sub-folder via `pnpm exec turbo run build` —
both files use the same root-anchored convention so a developer can
run any workspace command from any sub-folder without chdir'ing
back to the root.

## Consumers — who reads this file

| Consumer                              | How it reads `pnpm-workspace.yaml`                                                                                                                                                                                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install`                        | Expands the `packages` globs, harvests every member's `package.json#name`, builds the in-memory `name → absolute-path` map, then resolves every `workspace:*` specifier through it.                                                                                                                                                        |
| `pnpm -r <task>` / `pnpm --filter`    | Walks the same expanded list and runs the task in each member that matches the filter expression. The `--filter` parser uses the resolved package names, not the on-disk paths.                                                                                                                                                            |
| `turbo run <task>`                    | Reads its own [`turbo.json`](https://github.com/ever-works/directory-web-template/tree/develop/turbo.json) for the task graph but defers package discovery to pnpm via the `@pnpm/find-workspace-packages` adapter that ships with Turborepo. Turborepo's `--filter=@ever-works/web` expression resolves through the same map pnpm builds. |
| `pnpm dev:web`                        | The script in `package.json` expands to `turbo run dev --filter=@ever-works/web`, which fans out through Turborepo to pnpm's resolution map. The package name `@ever-works/web` only resolves because the `apps/*` glob walks `apps/web/package.json`.                                                                                     |
| Tooling under `apps/` and `packages/` | Workspace tools that import `@pnpm/find-workspace-packages` (the docs site's plugin loader, the test harness, future codegen scripts) read the same YAML and walk the same list. Any tool that needs the canonical workspace-member set goes through this file, not through ad-hoc directory walks.                                        |

## Failure matrix

The file is small enough that the failure modes are all predictable;
each one has a single point of ingestion.

| Mistake                                                               | Symptom                                                                                                                                                                                               | Layer that surfaces it                         |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| File deleted                                                          | `ERR_PNPM_NO_MATCHING_VERSION  No matching version found for @ever-works/plugin-sdk` on `pnpm install`. Every `workspace:*` specifier fails because there is no graph.                                | `pnpm install`                                 |
| File renamed (e.g., `pnpm-workspace.yml`)                             | Same as above — pnpm only reads the canonical `pnpm-workspace.yaml` filename.                                                                                                                         | `pnpm install`                                 |
| File moved out of repo root (into `packages/`, `apps/`, etc.)         | `pnpm install` from the repo root treats the install as a single-package install. Every `workspace:*` specifier in `packages/plugin-runtime/package.json` fails to resolve.                           | `pnpm install`                                 |
| Globs narrowed (e.g. drop `"apps/*"`)                                 | `apps/web` is no longer a workspace member, so a future plugin package that imports `@ever-works/web` (none today, but a hypothetical admin panel might) would lose its resolution.                   | `pnpm install`                                 |
| Globs broadened to `**` (e.g. `"packages/**"`, `"**"`)                | pnpm walks `apps/web/.content/**` and `packages/*/node_modules/**`, finds duplicate `package.json` files, and crashes with `ERR_PNPM_DUPLICATE_PACKAGE`.                                              | `pnpm install`                                 |
| Two members declared with the same `name` in their `package.json`     | `ERR_PNPM_DUPLICATE_PACKAGE  Multiple packages with name "..."`. The glob in `pnpm-workspace.yaml` is correct; the bug is in the duplicate manifest. Surfaces immediately on the next install.        | `pnpm install`                                 |
| YAML indentation mistake (tab in YAML, missing colon, malformed list) | `js-yaml` throws a parse error before pnpm gets the chance to walk the globs. Prettier's `*.yml` override (`useTabs: false`, `tabWidth: 2`) prevents the tab variant on save.                         | `pnpm install`, Prettier on save               |
| `packages` key renamed (e.g. `workspaces:` — Yarn convention)         | pnpm reads no globs, treats every `workspace:*` specifier as unresolvable. The Yarn-vs-pnpm convention difference is a recurring footgun for contributors coming from a `npm workspaces` background.  | `pnpm install`                                 |
| `packages/plugin-foo` added without a `package.json`                  | `pnpm install` skips the folder silently — pnpm walks the glob and ignores any matched folder that has no manifest. The new package is invisible to `workspace:*` until the manifest is committed.    | `pnpm install` (silent — review must catch it) |
| Package's `name` field changed without updating consumers' specifiers | `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` for the old name. The glob in `pnpm-workspace.yaml` is correct; the bug is the rename without a co-ordinated consumer update.                                      | `pnpm install`                                 |
| Glob uses Windows-style backslashes (`packages\*`)                    | js-yaml accepts the string but micromatch matches nothing on Linux/macOS. Surfaces as "package not found" on CI even though the developer's local Windows install worked.                             | `pnpm install` on CI                           |
| `apps/web/.content/` checked in by accident                           | If someone commits the cloned CMS folder into `apps/web/.content/` with a top-level `package.json`, the `apps/*` glob still won't match (only first-level children) — but a future `**` switch would. | Review (caught here, not at install)           |

## Public-surface change checklist

A change to `pnpm-workspace.yaml` is a **workspace-level public
surface change**: every consumer of `workspace:*` and every
Turborepo task is impacted. Before merging:

- **Workspace round-trip.** Run `pnpm install` from a clean
  `node_modules` to verify every `workspace:*` specifier still
  resolves. Confirm the lockfile diff only adds/removes the new
  members, not random unrelated bumps.
- **Turborepo discovery.** Run `pnpm exec turbo run build --dry-run`
  to verify Turborepo sees every workspace member you expect; a
  package missing from the dry-run output means the glob no longer
  walks its folder.
- **Cross-check the manifest references.** If you added a member,
  cross-check the matching package-manifest reference under
  `docs/plugins/` ([`sdk-package-manifest.md`](./sdk-package-manifest.md),
  [`runtime-package-manifest.md`](./runtime-package-manifest.md),
  [`plugin-demo-package-manifest.md`](./plugin-demo-package-manifest.md),
  [`eslint-config.md`](./eslint-config.md),
  [`tsconfig-presets.md`](./tsconfig-presets.md)) — every workspace
  member should have a per-source-file reference page.
- **`packages.md` cross-check.** If the change adds, removes, or
  renames a workspace member, update
  [`packages.md`](./packages.md) so the high-level package map
  stays in sync with the resolved set in this file.
- **`apps/web` lockfile cross-check.** Confirm
  [`apps/web/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/package.json)
  still resolves every `workspace:*` it declares; a narrowed glob
  here would manifest as a build failure in `apps/web`.
- **`docs/log.md` entry.** Add a one-line entry under today's date
  explaining the workspace change and what consumer surfaces are
  affected.
- **`docs/questions.md` entry.** If the change opens a question
  about catalog adoption, recursive globs, or a fourth root folder,
  add an entry to the open-questions register.
- **Constitution check.** A `pnpm-workspace.yaml` change touches
  Article I (Plugin-First — every plugin package depends on this
  glob being correct) and Article III (Public-Surface Stability —
  the workspace member set is part of the public surface for any
  downstream fork). Add a "Constitution-Check" note to the PR
  description.

## See also

- [`packages.md`](./packages.md) — the high-level map of the three
  plugin packages and their dependency chain (which depends on the
  glob resolution this file performs).
- [`tsconfig-presets.md`](./tsconfig-presets.md) — the workspace's
  shared TypeScript posture, distributed via `workspace:*`
  specifiers that resolve through this file.
- [`eslint-config.md`](./eslint-config.md) — the workspace's shared
  ESLint flat config, distributed via the same `workspace:*`
  protocol.
- [`sdk-package-manifest.md`](./sdk-package-manifest.md),
  [`runtime-package-manifest.md`](./runtime-package-manifest.md),
  [`plugin-demo-package-manifest.md`](./plugin-demo-package-manifest.md)
  — the per-package manifest references whose `workspace:*`
  specifiers resolve only because the two globs in this file
  walk their folders.
- [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion)
  — the spec that motivated the move from a single-package layout
  to the current two-glob workspace.
