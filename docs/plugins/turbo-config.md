---
id: monorepo-turbo-config
title: Turborepo Pipeline Configuration (`turbo.json`)
sidebar_label: Turborepo Pipeline Config
sidebar_position: 25
---

# Turborepo Pipeline Configuration (`turbo.json`)

> **Status.** Authoritative reference for the monorepo's Turborepo
> task pipeline defined in
> [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion).
> The pipeline shape is locked by
> [`turbo.json`](https://github.com/ever-works/directory-web-template/tree/develop/turbo.json)
> at the monorepo root; when a task is added, removed, or its inputs /
> outputs / `dependsOn` graph changes, update **this** page in the
> same change so the doc and the manifest cannot drift.

`turbo.json` is the **single source of truth** for which tasks
Turborepo can run, how those tasks fan out across workspace members,
which environment variables are part of each task's cache key, and
which artefacts each task is allowed to produce. It is the file that
turns `pnpm run build` at the repo root into a parallel, cache-aware
build of every workspace member, and the file that gates `pnpm run
test:e2e` on the `build` step having completed first.

This page is the **per-source-file reference** that pairs with
[`turbo.json`](https://github.com/ever-works/directory-web-template/tree/develop/turbo.json)
the same way
[`pnpm-workspace.md`](./pnpm-workspace.md) pairs with
`pnpm-workspace.yaml`,
[`tsconfig-presets.md`](./tsconfig-presets.md) pairs with the four
files inside `packages/tsconfig/`,
[`eslint-config.md`](./eslint-config.md) pairs with the two files
inside `packages/eslint-config/`,
[`plugin-tsconfigs.md`](./plugin-tsconfigs.md) pairs with the three
plugin-package `tsconfig.json` files,
[`sdk-package-manifest.md`](./sdk-package-manifest.md) pairs with
`packages/plugin-sdk/package.json`,
[`runtime-package-manifest.md`](./runtime-package-manifest.md) pairs
with `packages/plugin-runtime/package.json`, and
[`plugin-demo-package-manifest.md`](./plugin-demo-package-manifest.md)
pairs with `packages/plugin-demo/package.json`. Where
[`pnpm-workspace.md`](./pnpm-workspace.md) documents **which folders
become workspace members**, this page documents **what tasks those
members can run, in what order, with what inputs**.

## At a glance

| Aspect            | Value                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Path              | [`turbo.json`](https://github.com/ever-works/directory-web-template/tree/develop/turbo.json) (repo root)                                                                              |
| Format            | JSON with comments allowed by Turborepo's loader; Prettier formats it as plain JSON today                                                                                             |
| `$schema`         | `https://turbo.build/schema.json` — Turborepo's own JSON Schema, surfaces typos in editor tooling                                                                                     |
| Top-level keys    | `$schema`, `tasks` (only two used today)                                                                                                                                              |
| Task count        | Six: `build`, `build:en`, `lint`, `dev`, `test:e2e`, `clean`                                                                                                                          |
| Cached tasks      | Four: `build`, `build:en`, `lint`, `test:e2e` is **not** cached by design                                                                                                             |
| Persistent tasks  | One: `dev` (long-running, never cached)                                                                                                                                               |
| Required by       | Every script alias in [`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/package.json) at the repo root that uses `turbo run` or its `tr` alias       |
| Reads             | Workspace member set from [`pnpm-workspace.yaml`](./pnpm-workspace.md), per-package `package.json#scripts` to discover task implementations, source-file content to compute hash keys |
| Cache backend     | Local on-disk `.turbo/` per workspace member by default; remote cache (Vercel Remote Cache) is opt-in via `TURBO_TOKEN` / `TURBO_TEAM` and is **not** wired up in this template today |
| Turborepo version | Pinned via `devDependencies.turbo` at the repo root; Turborepo's CLI parses the schema version from the JSON `$schema` URL                                                            |
| Prettier override | JSON files use spaces with `tabWidth: 2` (template-wide default)                                                                                                                      |

The file is **deliberately minimal** — six task entries, no
top-level `globalDependencies`, no `globalEnv`, no `remoteCache`
block, no `ui` override, no `concurrency` cap, no `daemon` knob, and
no per-package `extends` declarations. Every optional key the
Turborepo schema can carry is **deliberately absent today** —
those defaults are correct for this repo's posture and are pinned in
[§ Deliberately absent fields](#deliberately-absent-fields) below.

## File contents

```jsonc
{
	"$schema": "https://turbo.build/schema.json",
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"outputs": [".next/**", "!.next/cache/**", "build/**", "dist/**"],
			"env": [
				"ANALYZE",
				"AUTH_*",
				"COOKIE_SECRET",
				"CRON_SECRET",
				"DATA_REPOSITORY",
				"DATABASE_*",
				"EMAIL_*",
				"GH_*",
				"GITHUB_*",
				"NEXT_PUBLIC_*",
				"PLATFORM_API_*",
				"POLAR_*",
				"POSTHOG_*",
				"RESEND_*",
				"SENTRY_*",
				"SMTP_*",
				"STRIPE_*",
				"TRIGGER_DEV_*",
				"VERCEL_*"
			]
		},
		"build:en": {
			"dependsOn": ["^build"],
			"outputs": ["build/**"]
		},
		"lint": {
			"dependsOn": ["^build"]
		},
		"dev": {
			"cache": false,
			"persistent": true
		},
		"test:e2e": {
			"dependsOn": ["build"],
			"cache": false
		},
		"clean": {
			"cache": false
		}
	}
}
```

## Tasks — field-by-field walkthrough

The `tasks` map declares one entry per pipeline task. Each entry's
shape is a subset of the
[Turborepo task config schema](https://turborepo.dev/docs/reference/configuration#defining-tasks).
The walkthrough below covers every field that is **set today** plus
the ones that matter for understanding why each task can or cannot
hit the cache.

### `build`

| Field       | Value                                                    | What it pins                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dependsOn` | `["^build"]`                                             | The `^` prefix means "run the same task in **upstream** workspace dependencies before this one runs in the current package". This forces `@ever-works/plugin-sdk` to compile before `@ever-works/plugin-runtime`, which compiles before `@ever-works/plugin-demo`, before `@ever-works/web` consumes any of them. The graph is harvested from each member's `package.json#dependencies` / `devDependencies`.                                                                               |
| `outputs`   | `[".next/**", "!.next/cache/**", "build/**", "dist/**"]` | The four globs are the **only** artefacts Turborepo restores from cache on a hit. `.next/**` is the Next.js production bundle; the negated `!.next/cache/**` excludes Next.js's own per-build incremental cache (which is not portable across machines). `build/**` covers Docusaurus's static export. `dist/**` is forward-compatible with a future plugin-package build step (none of the three plugin packages emit to `dist/` today).                                                  |
| `env`       | The 19-entry allow-list above                            | Only environment variables in this list are part of the cache key. Setting `STRIPE_SECRET_KEY=foo` and re-running `turbo run build` produces a cache miss (because `STRIPE_*` matches); setting `MY_UNRELATED_VAR=foo` produces a cache hit. The `*` suffix is a pnpm-style wildcard (e.g. `AUTH_*` matches `AUTH_SECRET`, `AUTH_GITHUB_ID`, etc.). The list mirrors the `env` block in `apps/web/.env.example` so the cache key tracks every environment variable that reaches the build. |
| `cache`     | (default `true`)                                         | Successful build outputs are persisted to `.turbo/` and replayed on the next run when the inputs hash matches. Disabling it would force a full rebuild on every invocation; the default is correct.                                                                                                                                                                                                                                                                                        |

The `dependsOn: ["^build"]` line is what ties the workspace graph
shape (defined by [`pnpm-workspace.yaml`](./pnpm-workspace.md)) to
the build order: pnpm declares **who depends on whom**; Turborepo
walks that graph to decide **what to run first**.

### `build:en`

| Field       | Value          | What it pins                                                                                                                                                                                                                                               |
| ----------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dependsOn` | `["^build"]`   | Same upstream-first rule as `build`. The English-only Docusaurus build (`apps/docs#build:en`) consumes any plugin packages that ship typings, so they must be present first.                                                                               |
| `outputs`   | `["build/**"]` | Narrower than `build` because `build:en` is currently a Docusaurus-only task — it produces `apps/docs/build/` and nothing under `.next/` or `dist/`. Keeping the output set narrow lets Turborepo compute a tighter hash and persist a smaller cache slot. |

This task exists to support `pnpm dev:docs` and the docs site's
fast-build mode, where French / Spanish / German / Arabic / Chinese
translations are skipped to cut build time during local iteration.

### `lint`

| Field       | Value        | What it pins                                                                                                                                                                                                                                             |
| ----------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dependsOn` | `["^build"]` | The `^build` dependency ensures any package whose lint config consumes generated typings (none today, but `apps/docs` reads Docusaurus-generated route types via its own `lint` step) sees a fresh build of every upstream member before it runs ESLint. |

Cache is on by default — `lint` is fully reproducible from source +
ESLint config + workspace pnpm lockfile, so a re-run with no changes
short-circuits to a cache hit. The
[`eslint-config.md`](./eslint-config.md) reference is the per-rule
authority for what each `lint` invocation actually checks.

### `dev`

| Field        | Value   | What it pins                                                                                                                                                                                                                          |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cache`      | `false` | A long-running watch process never produces a cacheable artefact; setting `cache: false` is the canonical way to opt out of Turborepo's cache for tasks that never terminate.                                                         |
| `persistent` | `true`  | Tells Turborepo this task is expected to run forever (a Next.js dev server, a Docusaurus dev server, or `tsc --watch`). When combined with `cache: false`, Turborepo also routes the task's output through its TUI without buffering. |

The `pnpm dev` alias at the root expands to `turbo run dev` and fans
out across every package that defines a `dev` script. Today that's
`@ever-works/web` (Next.js) and `@ever-works/docs` (Docusaurus).
The plugin packages don't define a `dev` script — they're consumed
through the workspace symlink and re-evaluated on the consumer's
hot-reload.

### `test:e2e`

| Field       | Value       | What it pins                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dependsOn` | `["build"]` | Note the **lack of `^` prefix** — this is the only task in the file that depends on the `build` task **of the same package**, not of upstream dependencies. Reading `apps/web-e2e#test:e2e` requires `apps/web-e2e#build` (a no-op today) and `apps/web#build` (a real build, gated through workspace dependencies). The form `["build"]` says "run the local `build` task in the same package first". |
| `cache`     | `false`     | E2E suites talk to a live Next.js server, hit a real database (in CI) or SQLite (locally), and depend on the active `DATA_REPOSITORY` clone — none of which are stable enough to make the test run a deterministic function of source content. Leaving the cache off forces a fresh run every time and avoids false-green from a stale snapshot.                                                       |

The `apps/web-e2e/E2E-TESTS.md` file documents the actual test
execution flow; this entry only pins the **pipeline contract** that
every `test:e2e` invocation gets a fresh build first and never reads
from cache.

### `clean`

| Field   | Value   | What it pins                                                                                                                                                                                           |
| ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cache` | `false` | A `clean` task removes artefacts. Caching a delete operation is meaningless — the cached output would be "an empty directory", which contributes no value. Disabling caching is the canonical posture. |

The `clean` task is intentionally **not gated on `dependsOn`** — the
order in which packages are cleaned doesn't affect correctness, so
Turborepo is free to run the task in parallel for maximum throughput.

## How the workspace graph and task graph compose

The build graph for a single `pnpm run build` invocation at the
root composes the **workspace graph** (declared in
[`pnpm-workspace.yaml`](./pnpm-workspace.md)) with the **task graph**
(declared in this file):

```
1. pnpm-workspace.yaml expands "apps/*" + "packages/*"
   → 8 workspace members, each with its own package.json#dependencies

2. Each member's `dependencies` and `devDependencies` are inspected
   for `workspace:*` specifiers. The result is a directed acyclic
   graph (DAG) of who depends on whom:

       @ever-works/plugin-sdk    (no workspace deps)
              ↓
       @ever-works/plugin-runtime  (depends on plugin-sdk)
              ↓
       @ever-works/plugin-demo     (depends on plugin-sdk)
              ↓
       @ever-works/web             (consumes runtime + demo + sdk)

3. turbo.json declares `build` has `dependsOn: ["^build"]`.

4. Turborepo combines the two: for each member, it runs `build`
   only after every upstream member's `build` has completed. The
   four-step chain above becomes a four-stage build with
   plugin-sdk first, then plugin-runtime + plugin-demo in parallel,
   then `apps/web` last.
```

The `^` prefix is what makes the composition work. Drop it (i.e.
declare `dependsOn: ["build"]`) and Turborepo will only run the
local package's `build` first — every workspace member would build
in parallel without waiting for its upstream dependencies, which
would surface as "Cannot find module '@ever-works/plugin-sdk'" the
moment `apps/web`'s build tries to import the SDK.

## Why some tasks declare `outputs` and others don't

| Task       | Declares `outputs`?                                        | Why                                                                                                                                                                                                                                                                                          |
| ---------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build`    | Yes (`.next/**`, `!.next/cache/**`, `build/**`, `dist/**`) | Production builds emit artefacts the cache must capture. The negated `!.next/cache/**` excludes Next.js's own per-build incremental cache, which is non-portable across CI workers.                                                                                                          |
| `build:en` | Yes (`build/**`)                                           | English-only Docusaurus build emits `apps/docs/build/`. Narrower than `build` because no `.next/`, no `dist/`.                                                                                                                                                                               |
| `lint`     | No                                                         | ESLint produces no on-disk artefacts. The cache key is computed from the input hash; the cache slot stores only the exit code and stdout/stderr, which Turborepo replays on a hit.                                                                                                           |
| `dev`      | No                                                         | `cache: false` means there is no cache slot to populate. Listing outputs would be inert metadata.                                                                                                                                                                                            |
| `test:e2e` | No                                                         | `cache: false` for the same reason as `dev`. The Playwright HTML report is written to `apps/web-e2e/playwright-report/` but isn't a build artefact in the Turborepo sense — re-running the same test against a slightly different DB state must produce a different report, not a cache hit. |
| `clean`    | No                                                         | Same reason as `dev` / `test:e2e`. Caching a clean operation is meaningless.                                                                                                                                                                                                                 |

A common mistake when adding a new task is to copy the `build`
entry, change the task name, and forget to either narrow `outputs`
or set `cache: false`. The result is a cache slot that captures
artefacts the new task didn't actually produce, which surfaces on
a later cache hit as "files appear out of nowhere". Match the
posture of the existing tasks above when adding a new one.

## The `env` allow-list — what's in and what's out

The 19-entry `env` block on the `build` task is the single most
important field in this file: it determines **which environment
variables are part of the cache key**. A variable that is read at
build time but **not** in the allow-list will produce silent cache
hits even after the variable's value changes — which is exactly
the kind of bug that surfaces in production but never in CI.

| Family             | Pattern            | Read by                                                                                                     | Why it must be in the cache key                                                                                                                       |
| ------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bundle analysis    | `ANALYZE`          | `apps/web/next.config.mjs` (toggles `@next/bundle-analyzer`)                                                | Different value → different output (bundle stats files appear / disappear). Keeps reproducible cache hits.                                            |
| Auth               | `AUTH_*`           | `apps/web/lib/auth/index.ts`, NextAuth provider config, `.env.local`                                        | OAuth client IDs and secret affect the bundled provider list and any inlined client-id values.                                                        |
| Cookies            | `COOKIE_SECRET`    | NextAuth's session-cookie signing                                                                           | Inlined into nothing today, but listed defensively because rotating it should never produce a stale cache hit.                                        |
| Cron               | `CRON_SECRET`      | `apps/web/app/api/cron/**`                                                                                  | Cron route handlers compile-time check this in `coreConfig`, so a missing value would still be hashed.                                                |
| Content repo       | `DATA_REPOSITORY`  | `apps/web/scripts/clone.cjs`, `apps/web/lib/content`                                                        | The cloned content folder contributes to the static export — different repos produce different builds.                                                |
| Database           | `DATABASE_*`       | Drizzle schema setup, runtime queries                                                                       | The connection string isn't usually inlined, but `DATABASE_PROVIDER=sqlite` vs `DATABASE_PROVIDER=postgres` selects different driver code paths.      |
| Email transport    | `EMAIL_*`          | Newsletter / contact-form senders                                                                           | Variants of the SMTP / API client get bundled.                                                                                                        |
| GitHub integration | `GH_*`, `GITHUB_*` | OAuth callbacks, `apps/web/lib/services/sync-service.ts`                                                    | Both prefixes are listed because the codebase mixes the two in different services.                                                                    |
| Public client vars | `NEXT_PUBLIC_*`    | Inlined at build time by Next.js (every `process.env.NEXT_PUBLIC_*` becomes a literal in the client bundle) | This is the **most important** entry in the list. A `NEXT_PUBLIC_*` change without a cache invalidation produces a stale client bundle in production. |
| Platform API       | `PLATFORM_API_*`   | `apps/web/app/api/extract/route.ts` and other proxy routes                                                  | Different API endpoints / keys produce different runtime behaviour and may flip feature flags.                                                        |
| Polar              | `POLAR_*`          | Polar billing integration                                                                                   | Different Polar credentials → different client SDK initialisation.                                                                                    |
| PostHog            | `POSTHOG_*`        | Analytics SDK initialisation                                                                                | Same as Polar.                                                                                                                                        |
| Resend             | `RESEND_*`         | Transactional email                                                                                         | Same as Polar.                                                                                                                                        |
| Sentry             | `SENTRY_*`         | `apps/web/sentry.*.config.ts`, source-map upload                                                            | The DSN is inlined into the client bundle; the auth token controls whether source maps are uploaded at build time.                                    |
| SMTP               | `SMTP_*`           | Email transport                                                                                             | Same as `EMAIL_*` — listed separately because some configs use SMTP-specific names.                                                                   |
| Stripe             | `STRIPE_*`         | `apps/web/app/api/stripe/**`, `apps/web/lib/payment/stripe.ts`                                              | Public Stripe key (`STRIPE_PUBLISHABLE_KEY`) is sometimes inlined; secret key changes the runtime API surface.                                        |
| Trigger.dev        | `TRIGGER_DEV_*`    | Trigger.dev background jobs                                                                                 | Auth and project IDs determine which jobs are registered.                                                                                             |
| Vercel             | `VERCEL_*`         | `apps/web/middleware.ts`, deployment-aware code                                                             | `VERCEL_URL`, `VERCEL_ENV`, etc. influence the build output; especially `VERCEL_GIT_COMMIT_SHA` which appears in the version banner.                  |

A new build-time environment variable that is read by any package
**must** be added here in the same change. Forgetting to extend the
allow-list is the canonical way to ship a release that "works on my
machine" but stays cached as the wrong build in CI.

## Deliberately absent fields

Turborepo's schema supports several optional top-level keys and
several optional per-task fields. Each one is **deliberately absent
today** — the absence is part of the file's contract.

| Field                                | Default behaviour we accept                                                                                     | Why we don't set it today                                                                                                                                                                                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `globalDependencies`                 | (Empty.) Turborepo only hashes per-task `inputs` and per-task source globs.                                     | The repo's lockfile (`pnpm-lock.yaml`) is auto-included by Turborepo's lockfile detection. Adding files like `package.json` or `tsconfig.base.json` here would be redundant.                                                                                                                                  |
| `globalEnv`                          | (Empty.) Per-task `env` lists are the only env-based contributors to the cache key.                             | We want each task to declare its own env footprint explicitly. A `globalEnv` block would make it harder to see, at the task level, exactly which variables matter for which task. The cost is some duplication; the benefit is locality.                                                                      |
| `globalDotEnv`                       | (Empty.) Turborepo doesn't auto-load any `.env` file.                                                           | The repo deliberately keeps `.env.local` out of source control and relies on individual scripts to read it. Listing `.env` here would invite the assumption that `.env.production` is a managed input, which it is not.                                                                                       |
| `remoteCache`                        | (Empty.) Local-only `.turbo/` cache.                                                                            | Remote caching requires `TURBO_TOKEN` + `TURBO_TEAM` and a Vercel team. The repo is a template — downstream forks pick their own posture. The empty block keeps the install footprint minimal and avoids a confusing CI failure if a fork hasn't set the tokens up yet.                                       |
| `ui`                                 | (Default — `tui` as of Turborepo 2.x.)                                                                          | The default TUI is what users see. Forcing `stream` would lose the colourised parallel-task display; forcing `tui` redundantly is no-op.                                                                                                                                                                      |
| `daemon`                             | (Default `true`.)                                                                                               | Turborepo's daemon speeds up subsequent runs by keeping the workspace graph in memory. Disabling it would penalise every dev run by ~200ms of graph rebuild.                                                                                                                                                  |
| `concurrency`                        | (Default `10`.)                                                                                                 | Most CI workers run two to four tasks at once before saturating CPU; the `10` default is enough headroom and not enough to thrash. A lower value would underutilise CI; a higher value would only matter for a workspace with dozens of packages.                                                             |
| Per-task `inputs`                    | (Default — every file under the package, minus the package's own outputs and a small standard exclusion list.)  | Tightening `inputs` (e.g. `["src/**", "package.json"]`) speeds up the hash computation but is fragile: a change to `tsconfig.json` or `eslint.config.mjs` no longer invalidates the cache, which produces stale-build hits. The default is the safer choice for a template that downstream forks will modify. |
| Per-task `passThroughEnv`            | (Empty.) No environment variables are passed through to the task's process without being part of the cache key. | The repo's posture is "anything that affects the build is in the cache key". Pass-through would leak environment variability into the build without anyone noticing.                                                                                                                                          |
| Per-task `dotEnv`                    | (Empty.)                                                                                                        | Each consumer (e.g. `apps/web`) loads its own `.env.local` through a script in `package.json`. Listing it here would imply Turborepo controls the load order, which it does not.                                                                                                                              |
| Per-task `cache`-as-false on `build` | `cache: true` is implicit                                                                                       | Production builds **must** be cacheable; flipping this to `false` would multiply CI time by ~5× without any correctness benefit.                                                                                                                                                                              |
| Per-task `interactive`               | (Default `false`.)                                                                                              | None of the tasks today require stdin from a developer. Turborepo's `tui` mode handles `dev` task output without needing `interactive: true`.                                                                                                                                                                 |
| `extends`                            | (Empty — no `extends` field at the root or per-task.)                                                           | Workspace `turbo.json` files (one per package, optional) can extend the root via `"extends": ["//"]`. The repo doesn't have any per-package overrides today; every task lives in this single file.                                                                                                            |

## Why this file lives at the repo root

Turborepo's algorithm for finding the workspace anchor mirrors
pnpm's:

1. Start in the current working directory.
2. Walk up the directory tree.
3. The first folder that contains a `turbo.json` file (or the
   absence of any in the chain → use the inferred root) is the
   workspace anchor.

If `turbo.json` lived under `apps/` or `packages/`, every
`turbo run` invocation from a sibling folder would walk past the
anchor and either fall back to a single-package run or fail with
"no tasks discovered". The repo root is the only correct location.

The same property is what makes
[`pnpm-workspace.yaml`](./pnpm-workspace.md) discoverable from any
sub-folder via `pnpm install` — both files use the same root-anchored
convention so a developer can run any workspace command from any
sub-folder without chdir'ing back to the root.

## Consumers — who reads this file

| Consumer                                                                | How it reads `turbo.json`                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run build`                                                        | Resolves to `turbo run build` via `package.json#scripts.build` at the repo root, which forks Turborepo. Turborepo reads this file, harvests every member's `build` script from its `package.json#scripts`, computes the hash key from each member's source content + the `env` allow-list, and either restores from cache or runs the script. |
| `pnpm run lint`                                                         | Same chain via `turbo run lint`. The `dependsOn: ["^build"]` ensures every upstream member compiles before its consumer lints.                                                                                                                                                                                                                |
| `pnpm run dev`                                                          | `turbo run dev`. Cache disabled, persistent flag on, fans out across every package that defines a `dev` script (currently `@ever-works/web` and `@ever-works/docs`).                                                                                                                                                                          |
| `pnpm run test:e2e`                                                     | `turbo run test:e2e`. Gates on local `build` first (without `^`), runs uncached. The Playwright config picks up the running `apps/web` server.                                                                                                                                                                                                |
| Script aliases (`pnpm dev:web`)                                         | Aliases in `package.json` use `turbo run dev --filter=@ever-works/web` to narrow the fan-out to a single package. Turborepo still reads the full pipeline from this file but only schedules the filtered subset.                                                                                                                              |
| CI (`turbo run build lint`)                                             | The CI workflow uses a single `turbo run build lint --filter=...` invocation. The two tasks share the cache and the workspace graph, so CI runtime is bound by the slowest path through the DAG, not the sum of all tasks.                                                                                                                    |
| Editor tooling (VS Code Turborepo extension, IntelliJ Turborepo plugin) | Read the `$schema` URL to surface field-level autocomplete, inline error reporting, and `dependsOn` graph visualisation.                                                                                                                                                                                                                      |

## Failure matrix

The file is small enough that the failure modes are all predictable;
each one has a single point of ingestion.

| Mistake                                                      | Symptom                                                                                                                                                                                                                                                     | Layer that surfaces it                           |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| File deleted                                                 | `turbo run build` falls back to "no pipeline configuration" mode and runs every package's `build` in parallel without the `^build` ordering. `apps/web` build fails with `Cannot find module '@ever-works/plugin-sdk'` because the SDK hasn't compiled yet. | `pnpm run build` / `turbo run`                   |
| File renamed (e.g. `Turbo.json`, `turbo.jsonc`)              | Same as above — Turborepo only reads the canonical `turbo.json` filename.                                                                                                                                                                                   | `pnpm run build`                                 |
| File moved out of repo root                                  | Turborepo treats the run as a single-package invocation; cross-package `dependsOn` chains break.                                                                                                                                                            | `pnpm run build`                                 |
| `dependsOn: ["build"]` (without `^`) on `build`              | Each package builds in parallel without waiting for upstream members. `apps/web` build fails the moment it imports the SDK, which has not finished compiling.                                                                                               | `pnpm run build`                                 |
| `dependsOn: ["^build"]` removed from `build`                 | Same as above — without the explicit ordering, the workspace's transitive build order is not enforced.                                                                                                                                                      | `pnpm run build`                                 |
| `outputs` widened to `["**"]`                                | Turborepo caches every file in the package, including `node_modules/`. Cache size on disk balloons; hits become slow because Turborepo has to checksum gigabytes of dependencies.                                                                           | Cache restore performance, disk usage            |
| `outputs` narrowed to drop `.next/**`                        | Cache hits don't restore the Next.js bundle. Production deploys ship with no compiled output. Surfaces as a 500 from the deployed site, not a build failure.                                                                                                | Production deploy                                |
| `env` entry removed (e.g. `NEXT_PUBLIC_*`)                   | A change to a `NEXT_PUBLIC_*` variable produces a stale cache hit. The deployed client bundle keeps the old value silently. The canonical "I changed the env var but the change didn't take effect" footgun.                                                | Production runtime (silent — review must catch)  |
| `env` entry added incorrectly (e.g. literal `MY_VAR=value`)  | Turborepo's schema rejects the value as not a name pattern; the build fails on parse before the cache key is computed. The `*` form is a wildcard, not a value.                                                                                             | `turbo run build` parse                          |
| `cache: false` removed from `dev`                            | Turborepo tries to cache a never-terminating watch process; the run hangs indefinitely while Turborepo waits for the task to "finish" so it can persist the slot.                                                                                           | `pnpm run dev`                                   |
| `persistent: true` removed from `dev`                        | Turborepo treats the watch process as a finite task; on a CI invocation, the run terminates immediately because the dev server's first idle moment is treated as completion.                                                                                | `pnpm run dev` in CI                             |
| `cache: false` removed from `test:e2e`                       | The first green run is cached; every subsequent run that doesn't change source files reports a cache hit and skips the actual test execution. Tests appear to pass without ever running.                                                                    | CI green-from-cache (silent — review must catch) |
| New task added without `cache` / `outputs` / `env` decisions | Turborepo defaults to `cache: true` with no `outputs`, which caches an empty slot. Subsequent runs hit the empty cache and skip the task. Silent skip is the worst-case outcome.                                                                            | `pnpm run <new-task>` (silent)                   |
| `$schema` URL changed to a non-existent version              | Editor tooling loses autocomplete; Turborepo itself still parses the file because it uses its own internal schema, not the URL. A reviewer's first hint that the URL is wrong is the missing autocomplete in their editor.                                  | Editor tooling                                   |
| JSON syntax error (trailing comma, missing brace)            | Turborepo's parser surfaces a structured error with the line number. The build aborts before any task runs.                                                                                                                                                 | `turbo run` parse                                |
| Task name collision with a per-package `turbo.json`          | A future per-package `turbo.json` declaring a different `dependsOn` for the same task produces a "task config defined in multiple places" error.                                                                                                            | `turbo run` graph build                          |

## Public-surface change checklist

A change to `turbo.json` is a **pipeline-level public surface
change**: every CI run, every developer's `pnpm run` invocation, and
every cached build slot is impacted. Before merging:

- **Pipeline round-trip.** Run `pnpm exec turbo run build --dry-run`
  to see the full task graph. Confirm the order of execution
  matches the workspace dependency graph from
  [`pnpm-workspace.md`](./pnpm-workspace.md), and that the
  `dependsOn` chains haven't introduced a cycle.
- **Cache key cross-check.** If you added a new env entry, run
  `pnpm exec turbo run build --summarize` and inspect the JSON
  summary in `.turbo/runs/<id>.json` — the `hashOfExternalDependencies`
  and `inputs.env` blocks must include the new variable.
- **`pnpm-workspace.md` cross-check.** If the change references a
  new workspace member's `build` task, confirm the member is
  declared in
  [`pnpm-workspace.yaml`](./pnpm-workspace.md) and has a paired
  per-package manifest reference under `docs/plugins/`.
- **`apps/web` env propagation.** If the change adds an `env`
  family that `apps/web` reads, confirm the variable is also
  documented in `apps/web/.env.example` and (where appropriate)
  consumed via `apps/web/lib/config/config-service.ts`. The two
  sources must move together.
- **`docs/log.md` entry.** Add a one-line entry under today's
  date explaining the pipeline change and what consumer surfaces
  are affected.
- **`docs/questions.md` entry.** If the change opens a question
  about remote caching adoption, per-package `turbo.json`
  overrides, or a new task family, add an entry to the
  open-questions register.
- **Constitution check.** A `turbo.json` change touches
  Article III (Public-Surface Stability — every CI gate flows
  through the pipeline declared here), Article IX (Test Coverage
  Bar — `test:e2e` is the canonical gate), and indirectly
  Article I (Plugin-First — every plugin package's `build` runs
  through the pipeline). Add a "Constitution-Check" note to the
  PR description.

## See also

- [`pnpm-workspace.md`](./pnpm-workspace.md) — the workspace-graph
  declaration this pipeline composes with. The two files together
  form the complete root-level monorepo contract: pnpm declares
  who exists; Turborepo declares what they can run.
- [`packages.md`](./packages.md) — the high-level map of the three
  plugin packages whose `build` and `lint` tasks fan out through
  this pipeline.
- [`tsconfig-presets.md`](./tsconfig-presets.md) — the workspace's
  shared TypeScript posture; the `lint` and `build` tasks both
  consume the presets transitively.
- [`eslint-config.md`](./eslint-config.md) — the workspace's
  shared ESLint flat config; the `lint` task above runs the
  config across every member.
- [`sdk-package-manifest.md`](./sdk-package-manifest.md),
  [`runtime-package-manifest.md`](./runtime-package-manifest.md),
  [`plugin-demo-package-manifest.md`](./plugin-demo-package-manifest.md)
  — the per-package manifests whose `scripts.build` /
  `scripts.lint` entries are what the pipeline above invokes.
- [Spec 001 — Monorepo Conversion](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/001-monorepo-conversion)
  — the spec that motivated the move from a single-package layout
  to the current Turborepo-driven pipeline.
