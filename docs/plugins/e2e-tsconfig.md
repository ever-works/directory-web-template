---
id: e2e-tsconfig
title: E2E TypeScript Configuration (`apps/web-e2e/tsconfig.json`)
sidebar_label: E2E tsconfig
sidebar_position: 29
---

# E2E TypeScript Configuration (`apps/web-e2e/tsconfig.json`)

> **Status.** Authoritative reference for the Playwright e2e
> suite's TypeScript configuration defined in
> [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion)
> and elaborated by
> [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage).
> The configuration is locked by
> [`apps/web-e2e/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tsconfig.json),
> which extends the shared
> [`@ever-works/tsconfig/playwright.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/playwright.json)
> preset and adds exactly two e2e-specific things — the `include`
> glob `./**/*.ts` that scopes the type-checker to the suite's own
> source tree, and the `exclude: ["node_modules"]` re-statement that
> guards against a future preset change. When the `extends` target
> moves, the `include` glob narrows or widens, or the `exclude` list
> grows, update **this** page in the same change so the doc and the
> file cannot drift.

`apps/web-e2e/tsconfig.json` is the **per-suite TypeScript
configuration** that the Playwright e2e suite
([`apps/web-e2e/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e))
uses every time `pnpm tsc --noEmit`, `pnpm test:e2e`, the editor's
TypeScript language service, or any other consumer of the file
type-checks the e2e specs, fixtures, helpers, page objects, and
top-level globals (`global-setup.ts`, `global-teardown.ts`,
`playwright.config.ts`). It sits one directory below the shared
[`@ever-works/tsconfig`](./tsconfig-presets.md) presets the same way
[`web-app-tsconfig.md`](./web-app-tsconfig.md) sits one directory
below those presets for the host web app and
[`plugin-tsconfigs.md`](./plugin-tsconfigs.md) sits one directory
below them for the three plugin packages — the host app, the e2e
suite, and the plugin packages share the same workspace-wide
TypeScript posture through the `extends` indirection, and only the
per-package overrides (the `@/*` alias for the host app, the
`./**/*.ts` include glob for the e2e suite, the `jsx` / `types`
overrides for the plugin packages) live in their respective
`tsconfig.json` files.

This page is the **per-source-file reference** that pairs with
[`apps/web-e2e/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tsconfig.json)
the same way
[`web-app-tsconfig.md`](./web-app-tsconfig.md) pairs with
`apps/web/tsconfig.json`,
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
[`web-app-tsconfig.md`](./web-app-tsconfig.md) documents the
**host-app-level overrides** the web application adds on top of the
`nextjs.json` preset, this page documents the **e2e-suite-level
overrides** the Playwright suite adds on top of the `playwright.json`
preset — the single `include` glob that scopes the type-checker to
the suite's own source tree, and the explicit `exclude: ["node_modules"]`
that survives any future preset change.

## At a glance

| Field                       | Value                                       | Why it matters                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `extends`                   | `@ever-works/tsconfig/playwright.json`      | Inherits the workspace's Playwright posture — `target: ES2017`, `module: esnext`, `moduleResolution: bundler`, `strict: true`, `noEmit: true`, `esModuleInterop`, `resolveJsonModule`, `isolatedModules`, `incremental`, the `dom`/`dom.iterable`/`esnext` lib set, **plus** the `types: ["node"]` whitelist that opens up `process.env.*`, `URL`, `Buffer`, and the rest of the Node ambient surface that Playwright code relies on. |
| `include[0]`                | `./**/*.ts`                                  | Every TypeScript source file in the suite, recursively from `apps/web-e2e/`. Picks up the entire `tests/` tree (`tests/api/`, `tests/admin/`, `tests/auth/`, `tests/client/`, `tests/i18n/`, `tests/public/`, `tests/smoke/`), the `fixtures/`, `helpers/`, and `page-objects/` directories, plus the four top-level globals (`global-setup.ts`, `global-teardown.ts`, `playwright.config.ts`). The Playwright suite is TS-only — there are no `.tsx` files, no JSX, no React. |
| `exclude[0]`                | `node_modules`                               | The conventional exclude. `@ever-works/tsconfig/base.json` already excludes `node_modules`, but the suite re-states it explicitly to keep the file self-documenting and resilient to a future preset that might drop the exclude.                                                                                                                                                                                              |

The file is **5 lines** today (counting brackets and the closing
newline). The three load-bearing pieces are the `extends` target,
the single-entry `include` glob, and the single `exclude` entry.
Flipping any of the three either widens the type-checker's scope
(slowing every editor / CI / `tsc` pass) or breaks one or more
invariants the suite relies on. Keep this page in lock-step with
the file.

## The full file, annotated

```jsonc
{
  // The shared Playwright preset. The chain is:
  //   @ever-works/tsconfig/playwright.json
  //     → @ever-works/tsconfig/base.json
  // The base preset locks `target: ES2017`, `module: esnext`,
  // `moduleResolution: bundler`, `strict: true`, `noEmit: true`,
  // `esModuleInterop`, `resolveJsonModule`, `isolatedModules`,
  // `incremental`, and the `dom`/`dom.iterable`/`esnext` lib set.
  // The `playwright.json` overlay adds `types: ["node"]` so e2e
  // specs can reach `process.env.*`, `URL`, `Buffer`, and the rest
  // of the Node ambient surface, and re-states `noEmit: true`
  // (already inherited; the explicit re-statement is intentional).
  // None of those are restated here.
  "extends": "@ever-works/tsconfig/playwright.json",

  // Every TypeScript source file in the suite, recursively. Picks
  // up `tests/**/*.ts`, `fixtures/**/*.ts`, `helpers/**/*.ts`,
  // `page-objects/**/*.ts`, plus the four top-level globals
  // (`global-setup.ts`, `global-teardown.ts`,
  // `playwright.config.ts`). The Playwright suite has no `.tsx`
  // files; the host-app `**/*.tsx` glob is deliberately absent.
  "include": ["./**/*.ts"],

  // The conventional exclude. Re-stated for resilience.
  "exclude": ["node_modules"]
}
```

## Why the `extends` chain matters

The e2e suite inherits its TypeScript posture from
[`@ever-works/tsconfig/playwright.json`](./tsconfig-presets.md),
which itself inherits from
[`@ever-works/tsconfig/base.json`](./tsconfig-presets.md). The chain
factors the workspace's TypeScript posture into a single source of
truth so the host app
([`apps/web/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web)),
the e2e suite, and the three plugin packages
([`packages/plugin-sdk/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk),
[`packages/plugin-runtime/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime),
[`packages/plugin-demo/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo))
all share the same compiler options without copy-pasting them into
five `tsconfig.json` files.

Concretely, the e2e suite gets the following from the preset chain:

| Setting              | Inherited from                  | Effect                                                                                                                                                       |
| -------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `target`             | `base.json` → `ES2017`          | Async-iterators, `Object.entries`, optional chaining all type-check without polyfills; matches the host app's lowering floor so cross-suite `import`s stay tractable. |
| `lib`                | `base.json`                     | `dom`, `dom.iterable`, `esnext` — required so Playwright's `Page`, `Locator`, and the `Browser` APIs (which return `Promise`-wrapped DOM types) all type-check. |
| `module`             | `base.json` → `esnext`          | Module imports are emitted as ES module syntax; required so the bundler-aware `moduleResolution` step can resolve workspace packages.                         |
| `moduleResolution`   | `base.json` → `bundler`         | Resolves package imports the way a bundler does, including `package.json#exports` conditional resolution. Lets the suite import `@playwright/test` and `@faker-js/faker` cleanly. |
| `strict`             | `base.json` → `true`            | All strict-mode checks (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, etc) on. Per [Constitution Article II — TypeScript-Only](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md) — applies to the e2e suite identically to the host app. |
| `noEmit`             | `base.json` → `true` (re-pinned in `playwright.json`) | `tsc --noEmit` is the only `tsc` invocation the suite runs; Playwright handles its own transpilation at runtime. The re-pin in `playwright.json` is intentional — a future preset change cannot accidentally start emitting `.js` next to the specs. |
| `esModuleInterop`    | `base.json` → `true`            | CommonJS modules can be `import`-ed without `* as` workarounds; required for libraries the suite consumes (`dotenv`, `@faker-js/faker`).                     |
| `resolveJsonModule`  | `base.json` → `true`            | `import data from './fixtures/foo.json'` works.                                                                                                                |
| `isolatedModules`    | `base.json` → `true`            | Required because Playwright's runtime transpiler processes one file at a time; flags any source file that cannot be transpiled in isolation.                  |
| `incremental`        | `base.json` → `true`            | `.tsbuildinfo` cache (the file at `apps/web-e2e/tsconfig.tsbuildinfo`) makes subsequent type-checks an order of magnitude faster.                            |
| `types`              | `playwright.json` → `["node"]`  | The whitelist that opens up `@types/node`'s ambient surface (`process.env.*`, `URL`, `Buffer`, `setTimeout`, etc) without leaking `@types/jest` or other transitive ambient packages. The host app deliberately does not opt into this — its Next.js posture handles `process.env.*` through `next-env.d.ts`. |
| `allowJs`            | `base.json` → `true`            | Defensive — there are no `.js` files in the suite today, but the inherited flag means a one-off `.cjs` helper would not break the type-check.                  |
| `skipLibCheck`       | `base.json` → `true`            | Skip the type-check of `.d.ts` files in `node_modules`. Keeps every `tsc` pass under the [performance budget](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md). |

Restating any of these in `apps/web-e2e/tsconfig.json` would create
two sources of truth for the same posture. The right place to change
a shared compiler option is
[`packages/tsconfig/base.json`](./tsconfig-presets.md) (or the
`playwright.json` overlay if the change only applies to Playwright
consumers); the e2e suite picks the change up the next time it
re-extends the preset.

## Why the single `include` glob

The single `include` entry — `"./**/*.ts"` — is the minimum scope
that picks up every TypeScript source file in the suite recursively,
without leaking into adjacent workspace members. The relative-path
prefix (`./`) is significant: it anchors the glob at
`apps/web-e2e/`, which is the directory the file itself lives in.
TypeScript's default base directory for an `include` glob is the
directory of the `tsconfig.json` itself, so the leading `./` is
strictly cosmetic — but the prefix makes the anchor visible to a
reader auditing the suite's compile boundary.

Concretely, the glob picks up:

| Path under `apps/web-e2e/`            | Files                                                                                                                                                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/api/**/*.ts`                    | Every public-API smoke spec (~50+ files): `feature-existence-query.spec.ts`, `item-vote-count-query.spec.ts`, `items-engagement-query.spec.ts`, `tenant-query.spec.ts`, `version-query.spec.ts`, etc. |
| `tests/admin/**/*.ts`                  | Admin-protected route specs (`admin-by-id.spec.ts`, `admin-protected-extra.spec.ts`).                                                                                                                                 |
| `tests/auth/**/*.ts`                   | Authentication flow specs (`auth-change-password.spec.ts`).                                                                                                                                                            |
| `tests/client/**/*.ts`                 | Client-bound API specs (`client-item-restore.spec.ts`, `client-protected.spec.ts`).                                                                                                                                    |
| `tests/i18n/**/*.ts`                   | Locale-routing specs.                                                                                                                                                                                                  |
| `tests/public/**/*.ts`                 | Public-facing page specs (`tests/public/categories.spec.ts`, etc).                                                                                                                                                     |
| `tests/smoke/**/*.ts`                  | Top-level smoke specs.                                                                                                                                                                                                 |
| `fixtures/**/*.ts`                     | Test data builders and factories.                                                                                                                                                                                      |
| `helpers/**/*.ts`                      | Shared helper utilities.                                                                                                                                                                                               |
| `page-objects/**/*.ts`                 | Page Object Model (POM) classes per [`playwright-best-practices`](https://github.com/ever-works/directory-web-template/tree/develop/.claude/skills/playwright-best-practices). |
| `global-setup.ts`                       | Workspace-wide setup the Playwright runner invokes once before any worker starts.                                                                                                                                       |
| `global-teardown.ts`                    | Workspace-wide teardown the Playwright runner invokes once after all workers finish.                                                                                                                                    |
| `playwright.config.ts`                  | The Playwright runner configuration itself — must be type-checked because `defineConfig`'s schema is type-driven.                                                                                                       |

The glob deliberately does **not** match:

| Path                                  | Why excluded                                                                                                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `**/*.tsx`                             | The Playwright suite has no JSX files — every file is plain TypeScript. The host app's `**/*.tsx` entry is deliberately absent here.                                   |
| `node_modules/**`                      | Excluded explicitly (see below). Also excluded by the inherited `base.json` exclude.                                                                                   |
| `playwright-report/**`                 | Generated artifact directory; contains no source files but a `.gitignored` HTML report. Not matched by `*.ts` so no exclude needed.                                    |
| `tsconfig.tsbuildinfo`                  | Generated incremental-build cache; not a `.ts` file so not matched.                                                                                                    |
| Any file in adjacent workspace members | The relative-path anchor (`./`) keeps the glob inside `apps/web-e2e/`. TypeScript's `include` resolution stops at the `tsconfig.json` directory anyway.                  |

Removing the `include` entry would fall back to TypeScript's default
(`**/*` from the directory of the `tsconfig.json`), which would
match `node_modules/` until the explicit `exclude` filtered it out.
The current explicit form is faster (the type-checker walks fewer
candidates) and more obvious to a reader auditing the scope.

## Why the `exclude` entry

`@ever-works/tsconfig/base.json` already excludes `node_modules`. The
suite re-states the exclude explicitly so the configuration remains
correct if a future preset change ever drops the line. `exclude` is
also a defence-in-depth against any future `include` widening — even
if a new `include` glob would match a path inside `node_modules/`,
the explicit exclude keeps the type-checker from drilling into it.

## How the e2e suite diverges from the host app

The host app's
[`apps/web/tsconfig.json`](./web-app-tsconfig.md) and the e2e
suite's `apps/web-e2e/tsconfig.json` are not byte-identical, but
they share the same shape (`extends` + `compilerOptions` overrides
+ `include` + `exclude`). The matrix below pins every divergence to
its rationale:

| Field                          | `apps/web/tsconfig.json`                                                                       | `apps/web-e2e/tsconfig.json`                  | Why divergent                                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extends`                      | `@ever-works/tsconfig/nextjs.json`                                                              | `@ever-works/tsconfig/playwright.json`         | Different leaf preset. The `nextjs.json` overlay adds `jsx: react-jsx` and the `next` LSP plugin; `playwright.json` adds `types: ["node"]` and re-pins `noEmit: true`. The two leaves never overlap.        |
| `compilerOptions.paths`        | `{ "@/*": ["./*"] }`                                                                            | absent                                        | The `@/*` Next.js alias is a host-app concern; the e2e suite uses workspace-package imports (`@playwright/test`) and relative imports (`./helpers/foo`) only.                                                |
| `compilerOptions.types`        | absent (inherited from `nextjs.json`'s default — no `types` whitelist)                          | `["node"]` (inherited from `playwright.json`) | The host app's `next-env.d.ts` ambient declarations cover `process.env.*`; the e2e suite has no Next ambient layer and needs the explicit `@types/node` whitelist instead.                                  |
| `include[0]`                    | `next-env.d.ts`                                                                                  | (no equivalent)                                | The host app must pick up Next's auto-generated ambient declarations; the e2e suite has none.                                                                                                                  |
| `include[1]`                    | `**/*.ts`                                                                                        | `./**/*.ts`                                    | Functionally equivalent — both glob the entire source tree from the directory of the `tsconfig.json`. The e2e suite uses the leading `./` prefix for the visible anchor.                                       |
| `include[2]`                    | `**/*.tsx`                                                                                       | (deliberately absent)                          | The e2e suite is JSX-free.                                                                                                                                                                                       |
| `include[3]`                    | `.next/types/**/*.ts`                                                                            | (deliberately absent)                          | The e2e suite does not run `next build`; there is no `.next/types/` to pick up.                                                                                                                                  |
| `include[4]`                    | `scripts/generate-openapi.ts`                                                                    | (deliberately absent)                          | The OpenAPI generator is a host-app script; the e2e suite has no equivalent script outside its tree.                                                                                                            |
| `include[5]`                    | `.next/dev/types/**/*.ts`                                                                        | (deliberately absent)                          | The Next 16 dev-server typed routes are a host-app concern.                                                                                                                                                      |
| `exclude`                      | `["node_modules"]`                                                                              | `["node_modules"]`                             | Both re-state the exclude defensively. Identical.                                                                                                                                                                |

The two files therefore land at three structural overrides each
beyond the `extends` chain: the host app adds the `@/*` alias and
five extra `include` entries; the e2e suite trades those for the
inherited `types: ["node"]` whitelist and a single broader `include`
glob.

## Failure matrix

The matrix below pins each load-bearing piece of the file to a
concrete user-visible failure that would surface if the piece were
flipped or removed.

| Change                                                                | What breaks                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drop `extends`                                                        | Every shared compiler option (`strict`, `target`, `moduleResolution`, etc) reverts to the TypeScript default → mass type errors in every spec; `process.env.*` becomes `any`; Playwright's typed fixtures lose their inferred types.        |
| Change `extends` to `@ever-works/tsconfig/nextjs.json`                | Pulls in `jsx: react-jsx` and the `next` LSP plugin (irrelevant to the suite) **and** drops the `types: ["node"]` whitelist → `process.env.*` resolves to `any`, `Buffer` and `URL` lose their typings, every `dotenv` consumer regresses.  |
| Change `extends` to `@ever-works/tsconfig/base.json` directly          | Drops the `types: ["node"]` whitelist → same Node-ambient regression as above; the `playwright.json` overlay's `noEmit: true` re-pin is also lost.                                                                                              |
| Drop `./**/*.ts` from `include`                                        | Falls back to TypeScript's default `**/*` glob, which picks up `tsconfig.tsbuildinfo`, `playwright-report/**`, and any future generated artifact — significantly slower type-checks and false-positive errors.                              |
| Narrow `./**/*.ts` to `tests/**/*.ts`                                  | `global-setup.ts`, `global-teardown.ts`, `playwright.config.ts`, `fixtures/**/*.ts`, `helpers/**/*.ts`, and `page-objects/**/*.ts` all fall out of scope → broken type errors in those files silently survive `pnpm tsc --noEmit`.       |
| Add `**/*.tsx` to `include`                                            | Harmless today (no `.tsx` files exist) but documents an intent the suite does not have. A future contributor seeing the entry might assume `.tsx` files are welcome and add JSX components, drifting the suite away from its TS-only posture. |
| Drop `node_modules` from `exclude`                                    | The type-checker walks every `.d.ts` in `node_modules` → orders of magnitude slower; hits the [performance budget](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md).                       |
| Add `composite: true` without project references                        | TypeScript errors out: `'isolatedModules' may not be used with 'composite'` (because the inherited `isolatedModules: true` and the new `composite: true` conflict).                                                                          |
| Flip `noEmit: false` in an override                                    | The type-checker starts emitting `.js` files next to every `.ts` file in the suite → contaminates the working tree, breaks the Playwright runner's transpiler, and creates a `.gitignore` churn cascade.                                     |

## Per-line walkthrough

The annotated file in [The full file, annotated](#the-full-file-annotated)
is reproduced below with one row per load-bearing line and the
documentation impact of each.

| Line                                            | Documentation impact                                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `"extends": "@ever-works/tsconfig/playwright.json"` | Update [tsconfig-presets.md](./tsconfig-presets.md) **and** this page.                                          |
| `"include": ["./**/*.ts"]`                      | Update this page if the glob is narrowed (e.g. to `tests/**/*.ts`) or widened (e.g. with `**/*.tsx`).            |
| `"exclude": ["node_modules"]`                   | Keep as is.                                                                                                      |

## `tsconfig.json` change checklist

When a contributor changes
[`apps/web-e2e/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tsconfig.json):

1. Update **this** page (`e2e-tsconfig.md`) in the same change.
2. If the `extends` target moved, update
   [tsconfig-presets.md](./tsconfig-presets.md) too.
3. If the `include` glob changed, search the suite for files that
   match the previous pattern but not the new one — they will fall
   out of the type-checker's scope silently.
4. Justify the addition or removal in
   [docs/log.md](../log.md) so the next reviewer knows why the
   type-checker's scope grew or shrank.
5. Pair the change with a [Spec 010](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
   cross-link if the change is part of an e2e-coverage migration.
6. Run `pnpm tsc --noEmit` from the e2e suite (`pnpm --filter
   @ever-works/web-e2e tsc --noEmit`) and from the workspace root.
   Both must pass.
7. Run `pnpm test:e2e` against a smoke subset to confirm the
   Playwright runner still picks the suite up.
8. Reviewer pass: confirm the doc and the file say the same thing,
   line for line.

## Cross-references

- [Web App TypeScript Configuration](./web-app-tsconfig.md) — the
  per-source-file reference for the host web app's `tsconfig.json`.
- [Shared TypeScript Presets](./tsconfig-presets.md) — the
  `@ever-works/tsconfig` package this config extends.
- [Plugin Package TypeScript Configurations](./plugin-tsconfigs.md)
  — the parallel per-package configs in the three plugin packages.
- [Workspace Hoisting Posture](./npmrc-config.md) — the `.npmrc`
  posture every install applies before the type-checker runs.
- [Workspace Root Manifest](./workspace-root-manifest.md) — the
  root `package.json` that pins `typescript`, `tsx`, and the rest
  of the workspace's TypeScript tooling.
- [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion)
  — the spec that established the e2e suite's workspace boundary.
- [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  — the spec that owns the e2e suite's test-coverage commitments.
- [Constitution Article II — TypeScript-Only](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
  — the durable principle that mandates `strict: true` and forbids
  loosening compiler options.
- [Constitution Article IX — Test Coverage Bar](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
  — the durable principle that mandates the e2e suite be the
  authoritative coverage signal.
