---
id: log
title: Documentation & Specs Change Log
sidebar_label: Change Log
sidebar_position: 99
---

# Documentation & Specs Change Log

A running log of meaningful changes to documentation, specs, and the
project's living-document set (constitution, agent rules, plans). One
line per change, newest at the top. Every line follows the form:

```
YYYY-MM-DD area: short summary
```

Where **area** is one of:

- `docs/<section>` — a docs page.
- `spec-NNN` — a feature spec under `docs/spec/NNN-…/`.
- `constitution` — an amendment to `.specify/memory/constitution.md`.
- `agents` — `AGENTS.md` change.
- `claude` — `CLAUDE.md` change.
- `index` — `docs/index.md` change.
- `questions` — `docs/questions.md` change.

This file lives in the docs site and acts as a hand-maintained
companion to git history. Use this when reading **what changed and
why** at a higher level than per-commit diffs.

---

## 2026-05-02

- `docs/plugins` Added `playwright-config.md` — the
  **per-source-file reference** for the Playwright e2e suite's
  runner configuration paired with
  [`apps/web-e2e/playwright.config.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/playwright.config.ts),
  the runtime companion to
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md) (where the tsconfig
  locks the suite's type-checking posture, this file locks the
  suite's runtime behaviour). Documents the at-a-glance summary of
  every load-bearing field (`dotenv.config({ path: '../web/.env.local' })`
  cross-app env loading, the `BASE_URL` override hatch with the
  `'http://localhost:3000'` default, the `isCI` boolean gate, the
  `testDir: './tests'` and `outputDir: './test-results'` artefact
  boundaries, `fullyParallel: true`, `workers: isCI ? 2 : 1`,
  `retries: isCI ? 2 : 0`, the per-environment reporter set with
  `open: 'never'` on CI, the `60_000` per-test and `30_000`
  `expect()` timeouts, the `globalSetup` / `globalTeardown` paths,
  the `use`-block defaults — `baseURL`, `trace: isCI ?
  'on-first-retry' : 'retain-on-failure'`, `screenshot:
  'only-on-failure'`, `video: isCI ? 'on-first-retry' : 'off'`,
  `navigationTimeout: 60_000`, `actionTimeout: 30_000`, `locale:
  'en-US'`, `timezoneId: 'America/New_York'` — the three browser
  projects (Chromium, Firefox, WebKit), and the `webServer` block
  with the per-environment `command` (`build && start` on CI,
  `dev` locally), `cwd: '../..'` monorepo-root anchor,
  `reuseExistingServer: !isCI`, the per-environment timeouts
  (`300_000` CI, `120_000` local), and the `stdout: 'pipe'` /
  `stderr: 'pipe'` self-diagnosing posture); the full file
  annotated line-by-line; the "Why
  `dotenv.config({ path: '../web/.env.local' })`" walkthrough that
  pins the single-source-of-truth posture against drift; the "Why
  `BASE_URL` is the only env-var override surface" rationale; the
  per-CI-vs-local branch matrix that maps each `isCI ? X : Y`
  branch to its trade-off; the "Why the three browser projects"
  cost / benefit matrix; the "Why `webServer.cwd` is the monorepo
  root" rationale; the "Why `stdout: 'pipe'` and `stderr: 'pipe'`"
  self-diagnosing rationale; the failure matrix that maps each
  `playwright.config.ts` mistake (dropped `dotenv.config(...)` →
  cryptic 500s, separate `apps/web-e2e/.env.local` → drift,
  `BASE_URL` fallback dropped → cannot target deployed previews,
  `fullyParallel: false` → ~3× wall-clock, `workers > 2` on CI →
  resource contention flakes, `retries: 0` on CI → un-mergeable
  flake amplification, `github` reporter dropped → no inline
  annotations, `html` reporter dropped → unreproducible flakes,
  `open: 'always'` on CI → CI hangs on no-display, `timeout`
  reduction → cold-render flakes, `globalSetup` dropped →
  unseeded specs, `use.trace: 'off'` on CI → un-diagnosable
  CI-only flakes, `use.locale: 'en-GB'` → date-format breakage,
  `use.timezoneId: 'UTC'` → timestamp-render breakage, project
  drop → engine-specific regressions slip past CI, project add
  without matrix bump → wall-clock blow-up, `next start` without
  `build` step on CI → cold-checkout failure, `webServer.cwd:
  __dirname` → `ERR_PNPM_NO_WORKSPACE_FOUND`,
  `reuseExistingServer: false` locally → `EADDRINUSE`,
  `stdout: 'ignore'` → silent host-app errors) onto the layer
  that surfaces each one; the per-line walkthrough table; and
  the `playwright.config.ts`-change checklist that ties any flip
  back to a [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md)
  cross-check, a `pnpm tsc --noEmit` run, a smoke-subset run, the
  per-CI-vs-local both-modes verification, a [`docs/log.md`](log.md)
  entry, a Spec 010 cross-link, and a reviewer pass.
- `apps/web-e2e` Added a query-param surface smoke spec for
  `GET /api/items/[slug]/comments`
  ([`item-comments-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-comments-query.spec.ts))
  — the public per-item comments-list endpoint served by
  `apps/web/app/api/items/[slug]/comments/route.ts`. The handler
  signature is `GET(request: Request, { params }: ...)` —
  `request` is declared but never read; the handler only awaits
  `params.slug`, calls `checkDatabaseAvailability()` (which
  short-circuits to an empty list when no DB is configured), and
  otherwise calls `getCommentsByItemId(slug)`. The spec
  enumerates every plausible query-param shape a future
  contributor might add (`?limit=` / `?offset=` / `?page=` /
  `?pageSize=` pagination keys, `?sort=` / `?order=` / `?orderBy=`
  sort keys, `?rating=` / `?minRating=` / `?maxRating=` filter
  keys, `?include=` / `?fields=` / `?select=` / `?expand=`
  projection keys, `?userId=` / `?status=` / `?moderation=`
  filter keys, `?refresh=` / `?force=` / `?fresh=` cache-busting
  keys, `?format=`, `?locale=` / `?lang=`, `?since=` / `?from=` /
  `?until=` time-window keys, plus empty values, repeated keys,
  special-character payloads, long payloads, and bogus typo'd
  keys) and asserts the bulk-loop `< 500` contract (the route
  has three success branches — DB-unavailable short-circuit,
  happy-path data-layer query, and catch-and-empty fallback —
  that all legitimately return `200 OK`), the canonical
  `{ success, comments }` envelope shape on the happy path, the
  status-invariance between the no-arg and parameter-laden
  branches, and a multi-permutation shape-stability assertion.
  The spec guards against regressions that introduce a
  `request.url`-based wiring (which a future "filter by rating",
  "include only top-level", "sort by helpfulness", or
  "paginate" feature might tempt a future contributor into
  adding), and pairs with `playwright-config.md` in the same
  change so the per-source-file documentation set and the e2e
  coverage advance together.
- `docs/plugins` Added `e2e-tsconfig.md` — the
  **per-source-file reference** for the Playwright e2e suite's
  TypeScript configuration paired with
  [`apps/web-e2e/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tsconfig.json),
  sitting one directory below the shared
  [`@ever-works/tsconfig`](plugins/tsconfig-presets.md) presets the
  same way [`web-app-tsconfig.md`](plugins/web-app-tsconfig.md) sits
  one directory below those presets for the host web app and
  [`plugin-tsconfigs.md`](plugins/plugin-tsconfigs.md) sits one
  directory below them for the three plugin packages. Documents the
  `extends: "@ever-works/tsconfig/playwright.json"` chain that
  inherits the workspace's TypeScript posture (`target: ES2017`,
  `module: esnext`, `moduleResolution: bundler`, `strict: true`,
  `noEmit: true`, `esModuleInterop`, `resolveJsonModule`,
  `isolatedModules`, `incremental`, the `dom`/`dom.iterable`/`esnext`
  lib set) plus the Playwright leaf's `types: ["node"]` whitelist
  that opens up `process.env.*`, `URL`, `Buffer`, and the rest of
  the Node ambient surface; the single-entry `include` array
  (`./**/*.ts`) that scopes the type-checker to the suite's own
  source tree (the `tests/` tree under `tests/api/`, `tests/admin/`,
  `tests/auth/`, `tests/client/`, `tests/i18n/`, `tests/public/`,
  `tests/smoke/`, plus `fixtures/`, `helpers/`, `page-objects/`, and
  the four top-level globals `global-setup.ts`, `global-teardown.ts`,
  and `playwright.config.ts`); the `exclude: ["node_modules"]`
  resilience rationale; the deliberate divergences from
  [`apps/web/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/tsconfig.json)
  (no `@/*` alias, no `**/*.tsx` glob, no `.next/types/**/*.ts` or
  `.next/dev/types/**/*.ts` entries, no `scripts/generate-openapi.ts`
  entry, the leading-`./` anchor on the include glob); the per-line
  walkthrough that pins each line to a documentation impact; the
  failure matrix that maps each `tsconfig.json` mistake (`extends`
  dropped → mass type errors, `extends` switched to `nextjs.json` →
  Node-ambient regression for `process.env.*`, `extends` switched to
  `base.json` directly → loses both the Node whitelist and the
  `noEmit` re-pin, `./**/*.ts` glob narrowed to `tests/**/*.ts` →
  `global-setup.ts`/`global-teardown.ts`/`playwright.config.ts`/
  `fixtures/`/`helpers/`/`page-objects/` fall out of scope,
  `**/*.tsx` added → drift away from the suite's TS-only posture,
  `node_modules` exclude dropped → orders of magnitude slower
  type-check, `composite: true` added → `'isolatedModules' may not
  be used with 'composite'` panic, `noEmit: false` flipped → `.js`
  contamination next to every `.ts` file) onto the layer that
  surfaces each one; and the `tsconfig.json`-change checklist that
  ties any flip back to a [`tsconfig-presets.md`](plugins/tsconfig-presets.md)
  cross-check, a [`docs/log.md`](log.md) entry, a Spec 010
  cross-link, the dual `pnpm tsc --noEmit` runs (e2e + workspace
  root), the Playwright smoke run, and a reviewer pass.
- `apps/web-e2e` Added a query-param surface smoke spec for
  `GET /api/reference`
  ([`reference-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/reference-query.spec.ts))
  — the public Scalar API reference UI served by
  `apps/web/app/api/reference/route.ts`. The spec enumerates every
  plausible query-param shape a future contributor might add
  (`?theme=`, `?layout=` / `?sidebar=` / `?showSidebar=`, `?spec=` /
  `?url=` / `?source=`, `?tag=` / `?operation=` / `?path=`,
  `?format=`, `?locale=` / `?lang=`, `?refresh=` / `?force=` /
  `?fresh=` / `?nocache=`, `?dark=` / `?darkMode=` / `?colorMode=`,
  plus empty values, repeated keys, special-character payloads —
  including SSRF-shaped `?spec=` URLs — long payloads, and bogus
  typo'd keys) and asserts the bulk-loop `< 500` contract, the
  status-invariance between the no-arg and parameter-laden branches,
  a multi-permutation status-stability assertion, and a dedicated
  guard against a future `?spec=` SSRF wiring (the handler today is
  the library-provided constant `ApiReference(config)` from
  `@scalar/nextjs-api-reference` closed over a static `config`
  object, so any caller-supplied URL must be ignored). The spec
  guards against regressions that swap the constant handler for a
  `request.url`-based wiring, and pairs with `e2e-tsconfig.md` in
  the same change so the per-source-file documentation set and the
  e2e coverage advance together.
- `docs/plugins` Added `web-app-tsconfig.md` — the
  **per-source-file reference** for the host web application's
  TypeScript configuration paired with
  [`apps/web/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/tsconfig.json),
  sitting one directory below the shared
  [`@ever-works/tsconfig`](plugins/tsconfig-presets.md) presets the
  same way [`plugin-tsconfigs.md`](plugins/plugin-tsconfigs.md) sits
  one directory below those presets for the three plugin packages.
  Documents the `extends: "@ever-works/tsconfig/nextjs.json"` chain
  that locks the workspace-wide TypeScript posture (`target: ES2017`,
  `module: esnext`, `moduleResolution: bundler`, `strict: true`,
  `noEmit: true`, `jsx: react-jsx`, the `next` LSP plugin, the
  `dom`/`dom.iterable`/`esnext` lib set, `allowJs: true`,
  `skipLibCheck: true`, `incremental: true`, `isolatedModules: true`)
  in one place; the single `compilerOptions.paths` entry
  `{ "@/*": ["./*"] }` that is the Next.js convention for an
  internal-import alias rooted at the application's top-level
  directory and powers every internal import in the App Router; the
  six-entry `include` array (`next-env.d.ts`, `**/*.ts`, `**/*.tsx`,
  `.next/types/**/*.ts` for `next build` typed-link declarations,
  `scripts/generate-openapi.ts` for the OpenAPI-generation script,
  and `.next/dev/types/**/*.ts` for the Next 16 dev-server variant);
  the `exclude: ["node_modules"]` resilience rationale; the per-line
  walkthrough that pins each line to a documentation impact; the
  failure matrix that maps each `tsconfig.json` mistake (`extends`
  dropped → mass type errors, `extends` switched to a non-Next preset
  → JSX transform breaks, `@/*` alias dropped → every internal import
  that uses the alias fails to resolve, `**/*.tsx` dropped → JSX
  source files fall out of scope, `.next/types/**/*.ts` dropped →
  typed routes regress, `node_modules` exclude dropped → orders of
  magnitude slower type-check) onto the layer that surfaces each
  one; and the `tsconfig.json`-change checklist that ties any flip
  back to a [`tsconfig-presets.md`](plugins/tsconfig-presets.md)
  cross-check, a [`docs/log.md`](log.md) entry, a Spec 002
  cross-link, the dual `pnpm tsc --noEmit` runs, and a reviewer pass.
- `apps/web-e2e` Added a query-param surface smoke spec for
  `GET /api/items/[slug]/votes/count`
  ([`item-vote-count-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-vote-count-query.spec.ts))
  — the public per-item vote-count endpoint served by
  `apps/web/app/api/items/[slug]/votes/count/route.ts`. The spec
  enumerates every plausible query-param shape a future contributor
  might add (`?userId=`, `?include=` / `?fields=` / `?select=`,
  `?expand=`, `?refresh=` / `?force=` / `?fresh=`, `?format=`,
  `?locale=` / `?lang=`, `?since=` / `?from=` / `?until=`,
  `?direction=`, plus empty values, repeated keys, special-character
  payloads, long payloads, and bogus typo'd keys) and asserts the
  bulk-loop `< 500` contract, the canonical `{ success, count }`
  envelope shape on the happy path, the status-invariance between
  the no-arg and parameter-laden branches, and a multi-permutation
  shape-stability assertion. The spec guards against regressions
  that introduce a `request.url`-based wiring (the handler signature
  is `GET(request, context)` — `request` is declared but never read;
  the handler only awaits `context.params` and calls
  `getVoteCountForItem(slug)`), and pairs with `web-app-tsconfig.md`
  in the same change so the per-source-file documentation set and
  the e2e coverage advance together.

## 2026-05-01

- `docs/plugins` Added `npmrc-config.md` — the
  **per-source-file reference** for the monorepo's pnpm
  install-time hoisting posture paired with
  [`.npmrc`](https://github.com/ever-works/directory-web-template/tree/develop/.npmrc)
  at the repo root, the fourth root-level config reference after
  [`pnpm-workspace.md`](plugins/pnpm-workspace.md),
  [`turbo-config.md`](plugins/turbo-config.md), and
  [`workspace-root-manifest.md`](plugins/workspace-root-manifest.md).
  Where `pnpm-workspace.md` documents **which folders become
  workspace members**, `turbo-config.md` documents **what tasks
  those members can run**, and `workspace-root-manifest.md`
  documents **the version-pinning, native-build allow-list, and
  Prettier baseline** for the entire repo, this page documents the
  **install-time hoisting posture itself** — the two load-bearing
  settings (`shamefully-hoist=true` that flattens every transitive
  dependency into the workspace root's `node_modules/`, and
  `public-hoist-pattern[]=*@heroui/*` that forces every `@heroui/*`
  package into the workspace-root public-hoist directory so
  HeroUI's internal-peer model resolves identically from every
  workspace member), the rationale for each (Next.js / ESLint /
  Tailwind / PostCSS plugin discovery from the project root for
  the first; `@heroui/system` / `@heroui/shared-utils` /
  per-component peer resolution for the second), the `.npmrc`
  precedence chain (system → user → project → env-vars → CLI
  flags), the failure matrix that pins each setting flip to a
  concrete user-visible failure, the per-line walkthrough that
  pairs each line with the documentation impact, and the
  `.npmrc`-change checklist that ties any flip back to a
  [`docs/log.md`](log.md) entry, a Spec 002 cross-link, and a
  reviewer pass.
- `apps/web-e2e` Added a query-param surface smoke spec for
  `GET /api/user/profile/location`
  ([`user-profile-location-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/user-profile-location-query.spec.ts))
  — the auth-gated `clientProfileId`-derived location lookup served
  by `apps/web/app/api/user/profile/location/route.ts`. The spec
  enumerates every plausible query-param shape a future contributor
  might add (`?userId=`, `?clientProfileId=`, `?id=`, `?include=`,
  `?fields=` / `?select=`, `?expand=`, `?refresh=` / `?force=` /
  `?fresh=`, `?format=`, `?locale=` / `?lang=`, `?privacy=`, plus
  empty values, repeated keys, special-character payloads, long
  payloads, and bogus typo'd keys) and asserts the bulk-loop
  `< 500` contract and the canonical typed `{ error }` envelope
  shape on the unauthenticated branch. The spec guards against
  regressions that introduce a `request.nextUrl.searchParams.get(...)`
  call (the handler signature is `export async function GET()` —
  no `request` parameter, no query-key reads), and pairs with
  `npmrc-config.md` in the same change so the per-source-file
  documentation set and the e2e coverage advance together.
- `docs/plugins` Added `workspace-root-manifest.md` — the
  **per-source-file reference** for the monorepo's
  workspace-coordination manifest paired with
  [`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/package.json)
  at the repo root, the third root-level config reference after
  [`pnpm-workspace.md`](plugins/pnpm-workspace.md) and
  [`turbo-config.md`](plugins/turbo-config.md). Where
  `pnpm-workspace.md` documents **which folders become workspace
  members** and `turbo-config.md` documents **what tasks those
  members can run**, this page documents the **workspace-coordination
  posture itself** — the eleven top-level `scripts.*` entries every
  contributor and CI runner invokes (`pnpm build`, `pnpm dev`,
  `pnpm dev:web`, `pnpm dev:docs`, `pnpm lint`, `pnpm test:e2e`,
  `pnpm clean`, `pnpm format`, `pnpm build:web`, `pnpm build:docs`,
  `pnpm build:docs:en`), the runtime / package-manager floor
  (`engines.node` `>=20.19.0`, `packageManager` exact pin
  `pnpm@10.31.0` enforced by Corepack), the version-pinning posture
  for transitive dependencies via `pnpm.overrides` (`@types/react`
  `19.2.7`, `@types/react-dom` `19.2.3`, `esbuild` `0.27.0`,
  `esbuild-register` `3.6.0`, `@opentelemetry/api` `1.9.0`), the
  `pnpm.publicHoistPattern: ['@opentelemetry/*']` hoist rule that
  protects OTel's global-registration model, the 11-entry
  `pnpm.onlyBuiltDependencies` allow-list (`@vercel/speed-insights`,
  `@heroui/shared-utils`, `@parcel/watcher`, `@scarf/scarf`,
  `@sentry/cli`, `@swc/core`, `core-js`, `core-js-pure`, `esbuild`,
  `protobufjs`, `sharp`) that gates `postinstall` hooks during
  `pnpm install` under pnpm 10's deny-by-default hardening, and the
  workspace-wide Prettier formatting baseline (`printWidth: 120`,
  `singleQuote`, `semi`, `useTabs` with `tabWidth: 4`,
  `arrowParens: 'always'`, `trailingComma: 'none'`, plus the two
  language-specific overrides for `*.scss` and `*.yml` that switch
  to 2-space indents because YAML cannot use tab characters at the
  syntax level). Documents the at-a-glance summary table of every
  load-bearing field with its value and why-it-matters note; the
  file-contents walk-through (the full JSON file); the per-field
  walkthrough — `name`, `version`, `private`, `license`,
  `packageManager` with the Corepack-shim rationale, `engines.node`
  with the Next.js 16 / `apps/web/scripts/check-env.js` ESM-API /
  `node:test` parity rationale, the eleven `scripts.*` entries with
  their `turbo run <task>` delegations and the
  `--filter=@ever-works/<name>` shortcut rationale, the two
  `devDependencies.turbo`/`prettier` ranges with their exact-version
  rationales (Turborepo 2.x cache-key semantics + `$schema`
  enforcement + `persistent: true` honouring `dependsOn`;
  Prettier 3.x's `overrides` matcher syntax), the
  `pnpm.publicHoistPattern` rule and why it must coexist with the
  `@opentelemetry/api` override, the `pnpm.overrides` field with the
  per-entry rationale for each pin (React typings to lock the
  React 19 narrowed `ReactNode`, `esbuild` to align Next.js /
  Drizzle Kit / Trigger.dev bundler output, `esbuild-register` to
  keep TS syntax features parsing identically across the workspace,
  `@opentelemetry/api` for OTel singleton enforcement), the
  `pnpm.onlyBuiltDependencies` allow-list as pnpm 10's deny-by-default
  `postinstall` hardening with a per-entry table of why each package
  needs to run a build step, the `prettier` block as the
  single-source-of-truth for formatting rules (no `.prettierrc` at
  the repo root by intent), and the two language-specific overrides
  for SCSS conventions and YAML's tab-disallow syntax constraint;
  the deliberately-absent-fields matrix covering top-level
  `dependencies`, `workspaces` (because pnpm reads
  `pnpm-workspace.yaml`), `main` / `exports` / `types` / `module`,
  `bin`, `type`, `repository` / `homepage` / `bugs`,
  `peerDependencies`, `engineStrict` / `os` / `cpu` with the reason
  each is omitted; the "Why this file lives at the repo root"
  rationale (pnpm, Corepack, Turborepo, Vercel, GitHub Actions,
  Renovate, and editors all walk upward and stop at the first
  `package.json`); the consumer table mapping each reader (Corepack,
  pnpm, Turborepo CLI, Prettier CLI, Vercel build runner, GitHub
  Actions, editors, Renovate / Dependabot, contributors) to the
  fields it consumes; the failure matrix that maps each
  manifest-level mistake (`ERR_PNPM_UNSUPPORTED_ENGINE` from a
  Node-floor regression, `Wrong package manager` from a Corepack
  drift, OTel span loss from a hoist or override drop, `pnpm install`
  `ignored build script` warnings from a missing allow-list entry,
  React 19 typings clash from a missing override, YAML re-formatted
  with tabs from a missing override, `--filter` shortcut breakage
  from a renamed package `name`, `Couldn't find a turbo binary` from
  a dropped `devDependency`, Vercel's `pnpm: command not found` from
  disabled Corepack) onto the layer that surfaces each one; and the
  public-surface change checklist that ties any field change to a
  Spec 001 plan cross-check, a CI workflow Corepack-enable check, a
  `.github/workflows/*.yml` propagation check, an
  `apps/*/vercel.json` propagation check, a workspace-wide
  `pnpm format` round-trip, a `docs/log.md` entry, and the
  Constitution-Check note in the PR description for Article III
  (Public-Surface Stability) and Article IX (Test Coverage Bar).
- `apps/web-e2e` Added a Playwright smoke spec for the
  **query-param surface** of the auth-gated current-tenant endpoint
  served by
  [`apps/web/app/api/tenant/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/tenant/route.ts)
  at
  [`apps/web-e2e/tests/api/tenant-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/tenant-query.spec.ts).
  The handler signature is `export async function GET()` (no
  `request` parameter) and it reads zero query keys; the spec walks
  ~50 query strings — `?tenantId=`, `?id=`, `?slug=`, `?include=`,
  `?fields=` / `?select=`, `?expand=`, `?refresh=` / `?force=` /
  `?fresh=`, `?format=`, `?locale=` / `?lang=`, empty values,
  repeated keys, SQL-injection-style escapes (`'`, `<script>`, `..`,
  `%00`), and 500-character payloads — asserting `status < 500` for
  each so a regression that introduces a `searchParams.get(...)`
  call is caught immediately as a typed-envelope-shape failure
  rather than as a session-bearing test flake. Pins the
  unauthenticated branch's typed `{ tenant: null }` envelope on the
  401 path against accidental drops to `null` or
  `{ error: 'Unauthorized' }`, and asserts that the bogus-query
  response and the no-arg response have identical envelope shapes.
- `docs/plugins` Added `turbo-config.md` — the **per-source-file
  reference** for the monorepo's Turborepo task pipeline paired
  with
  [`turbo.json`](https://github.com/ever-works/directory-web-template/tree/develop/turbo.json)
  at the repo root, the second root-level config reference after
  [`pnpm-workspace.md`](plugins/pnpm-workspace.md). Where
  `pnpm-workspace.md` documents **which folders become workspace
  members**, this page documents **what tasks those members can
  run, in what order, with what inputs**. Documents the at-a-glance
  summary (path at the repo root, JSON-with-comments format,
  `$schema: "https://turbo.build/schema.json"`, two top-level keys
  `$schema` and `tasks`, six task entries `build`, `build:en`,
  `lint`, `dev`, `test:e2e`, `clean`, four cached tasks vs. two
  uncached, one persistent task `dev`, local `.turbo/` cache
  backend, no remote-cache wired today, Prettier `*.json` override
  pinning JSON to spaces with `tabWidth: 2`); the file-contents
  walk-through (the full JSON file with one row per task entry);
  the per-task field-by-field walkthrough (`build` with
  `dependsOn: ["^build"]` upstream-first ordering, the
  `outputs: [".next/**", "!.next/cache/**", "build/**", "dist/**"]`
  artefact whitelist with the Next.js cache exclusion rationale,
  the 19-entry `env` allow-list `ANALYZE`, `AUTH_*`, `COOKIE_SECRET`,
  `CRON_SECRET`, `DATA_REPOSITORY`, `DATABASE_*`, `EMAIL_*`,
  `GH_*`, `GITHUB_*`, `NEXT_PUBLIC_*`, `PLATFORM_API_*`,
  `POLAR_*`, `POSTHOG_*`, `RESEND_*`, `SENTRY_*`, `SMTP_*`,
  `STRIPE_*`, `TRIGGER_DEV_*`, `VERCEL_*` with the per-family
  rationale for why each must be in the cache key; `build:en` with
  the narrowed `outputs: ["build/**"]` Docusaurus-only artefact
  set; `lint` with `dependsOn: ["^build"]` so generated typings
  compile first; `dev` with `cache: false` + `persistent: true`
  for the long-running watch process; `test:e2e` with
  `dependsOn: ["build"]` (no `^` prefix so the local-package
  build runs first) and `cache: false` because Playwright runs are
  not deterministic functions of source content; `clean` with
  `cache: false` because a delete operation is meaningless to
  cache); the workspace-and-task-graph composition walk-through
  showing how `pnpm-workspace.yaml` expands → workspace members
  → `package.json#dependencies` DAG → Turborepo's `^build`
  rule → the four-stage build chain
  `plugin-sdk → plugin-runtime + plugin-demo (parallel) → web`;
  the "Why some tasks declare `outputs` and others don't" matrix;
  the `env` allow-list family-by-family table (Bundle analysis /
  Auth / Cookies / Cron / Content repo / Database / Email
  transport / GitHub integration / Public client vars / Platform
  API / Polar / PostHog / Resend / Sentry / SMTP / Stripe /
  Trigger.dev / Vercel) with the consumer file path and why each
  family must contribute to the cache key; the "Deliberately
  absent fields" matrix covering top-level `globalDependencies`,
  `globalEnv`, `globalDotEnv`, `remoteCache`, `ui`, `daemon`,
  `concurrency`, and per-task `inputs`, `passThroughEnv`,
  `dotEnv`, `cache: false on build`, `interactive`, `extends`
  with the default behaviour we accept and why each one is not
  set today; the "Why this file lives at the repo root" rationale
  (Turborepo walks up the directory tree and uses the first
  `turbo.json` it finds as the workspace anchor; same property as
  `pnpm-workspace.yaml`); the consumer table mapping each reader
  (`pnpm run build`, `pnpm run lint`, `pnpm run dev`,
  `pnpm run test:e2e`, the `dev:web` / `dev:docs` script aliases
  using `--filter`, CI's `turbo run build lint --filter`, editor
  tooling that reads `$schema`) to how each consumes this file;
  the failure matrix mapping each pipeline-level mistake (file
  deleted, file renamed, file moved out of root, dropping the `^`
  from `dependsOn` on `build`, removing `dependsOn` from `build`,
  widening `outputs` to `["**"]`, narrowing `outputs` to drop
  `.next/**`, removing an `env` family entry like `NEXT_PUBLIC_*`,
  adding a literal `MY_VAR=value` non-pattern entry, removing
  `cache: false` from `dev` or `test:e2e`, removing
  `persistent: true` from `dev`, adding a new task without
  `cache` / `outputs` / `env` decisions, changing the `$schema`
  URL, JSON syntax errors, task-name collisions with a future
  per-package `turbo.json`) onto the layer that surfaces each
  one; and the public-surface change checklist that ties any
  pipeline change to a `turbo run --dry-run` round-trip, a
  `--summarize` cache-key cross-check, a `pnpm-workspace.md`
  cross-check, an `apps/web/.env.example` propagation check, a
  `docs/log.md` entry, an open-questions register entry, and the
  Constitution-Check note in the PR description for Article I
  (Plugin-First), Article III (Public-Surface Stability), and
  Article IX (Test Coverage Bar).
- `apps/web-e2e` Added
  [`tests/api/config-features-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/config-features-query.spec.ts)
  — query-param surface smoke for the `/api/config/features`
  endpoint, mirroring the pattern set by
  [`tests/api/feature-existence-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/feature-existence-query.spec.ts).
  The route's handler signature is
  `export async function GET()` — no `request` parameter and zero
  `searchParams.get(...)` calls — so any query string the caller
  appends must be silently ignored. The spec walks ~70 query
  variants (locale-style keys `?locale=`, `?lang=`; tenant-style
  keys `?tenant=`, `?tenantId=`, `?org=`; filter keys `?feature=`,
  `?features=`; caller-controlled flag overrides
  `?ratings=`/`?comments=`/`?favorites=`/`?featuredItems=`/
  `?surveys=`; pagination keys `?limit=`, `?offset=`, `?page=`,
  `?pageSize=`; sort keys `?sort=`, `?order=`, `?direction=`;
  type-ahead keys `?q=`, `?search=`, `?prefix=`, `?filter=`;
  cache-bypass knobs `?cache=`, `?fresh=`, `?nocache=`,
  `?bypass=`, `?_=<timestamp>`; empty values, repeated keys,
  special-character percent-encoded values for `%`, `/`, `\`,
  `'`, `"`, `<`, `>`, null byte, `;`, `--`, long values up to
  2,000 chars, prototype-pollution attempts via `?__proto__=` and
  `?constructor=`) and asserts each must respond with one of the
  two documented status codes (200 success, 500 catch-and-degrade)
  — anything else (502, 503, framework crash) indicates a
  regression. Three dedicated tests pin the canonical envelope
  shape (`{ ratings: boolean, comments: boolean, favorites:
boolean, featuredItems: boolean, surveys: boolean }` on either
  branch, with all five flags hard-coded to `false` on the catch
  path), the per-branch `Cache-Control` header (`public,
s-maxage=300, stale-while-revalidate=600` on success vs.
  `no-cache` on the 500 path so a degraded response is not pinned
  by a CDN for five minutes), the no-arg-vs-bogus-args status
  invariance, and the caller-controlled-flag-override
  ignorability (`?ratings=false` does not flip the envelope's
  flag — the response reflects the server's view, not the
  client's suggestion).
- `docs/index.md` Added the
  [`turbo-config.md`](plugins/turbo-config.md) entry to the
  monorepo / packages section so the new pipeline reference is
  discoverable from the top-level docs navigation, sitting
  immediately after `pnpm-workspace.md` as the second of the two
  root-level config references.
- `docs/plugins` Added `pnpm-workspace.md` — the **per-source-file
  reference** for the monorepo's pnpm workspace declaration paired
  with
  [`pnpm-workspace.yaml`](https://github.com/ever-works/directory-web-template/tree/develop/pnpm-workspace.yaml)
  at the repo root, the same way `tsconfig-presets.md` pairs with the
  four files inside `packages/tsconfig/`, `eslint-config.md` pairs
  with the two files inside `packages/eslint-config/`, and the
  per-package manifest references each pair with one
  `packages/*/package.json`. Where the package-level references
  document **what each package contributes** to the workspace graph,
  this page documents **how the graph is declared in the first
  place** — the single YAML file that pnpm reads before any package
  manifest is touched. The page documents the at-a-glance summary
  (path `pnpm-workspace.yaml` at the repo root, YAML 1.2 format,
  single `packages` top-level key, two globs `"apps/*"` and
  `"packages/*"`, eight resolved members across `apps/web`,
  `apps/docs`, `apps/web-e2e` and the five `packages/*`, micromatch
  glob engine, pinned to `pnpm@10.31.0` via
  `package.json#packageManager`, Prettier `*.yml` override that
  pins YAML to spaces with `tabWidth: 2`); the file contents
  walk-through (the three-line file with one row per field —
  `packages` array, the `"apps/*"` glob and what it does and does
  not match, the `"packages/*"` glob and what it does and does not
  match); the "Why a glob, not an explicit list" rationale (new
  packages auto-register, removed packages auto-unregister, the
  convention scales to two roots without over-matching
  `apps/web/.content/**`); the resolved-members table that maps
  each of the eight current members to its path, glob, and matching
  per-package reference page; the glob-semantics matrix that pins
  what `"apps/*"` and `"packages/*"` match versus do not match (one
  level deep, no `**` recursion); the `workspace:*` resolution
  walk-through that traces the four-step chain pnpm performs at
  install time; the "Deliberately absent fields" matrix covering
  `catalog` / `catalogs`, `linkWorkspacePackages`,
  `preferWorkspacePackages`, `sharedWorkspaceLockfile`,
  `saveWorkspaceProtocol`, `injectWorkspacePackages`, `overrides`,
  `peerDependencyRules`, `packageExtensions`, and
  `onlyBuiltDependencies` with the default behaviour we accept and
  why each one is not set today; the "Why this file lives at the
  repo root" rationale (pnpm walks up the directory tree and uses
  the first `pnpm-workspace.yaml` it finds as the workspace anchor;
  same property as `turbo.json`); the consumer table that maps each
  reader (`pnpm install`, `pnpm -r`, `pnpm --filter`, `turbo run`,
  the script aliases like `pnpm dev:web`, and tooling that imports
  `@pnpm/find-workspace-packages`) to how it consumes this file;
  the failure matrix that maps each workspace-level mistake (file
  deleted, file renamed `.yml`, file moved out of root, globs
  narrowed, globs broadened to `**`, two members declared with the
  same `name`, YAML indentation mistake, `packages` key renamed to
  Yarn's `workspaces:`, package added without a `package.json`,
  package's `name` changed without updating consumers, glob uses
  Windows-style backslashes, `apps/web/.content/` accidental
  inclusion) onto the layer that surfaces them; and the public-
  surface change checklist that ties any glob change to a
  `pnpm install` round-trip, a `turbo run --dry-run` discovery
  check, a `packages.md` cross-check, an `apps/web/package.json`
  lockfile cross-check, a `docs/log.md` entry, an open-questions
  register entry, and the Constitution-Check note in the PR
  description for Article I (Plugin-First) and Article III
  (Public-Surface Stability).
- `apps/web-e2e` Added
  [`tests/api/current-user-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/current-user-query.spec.ts)
  — query-param surface smoke for the `/api/current-user`
  endpoint, mirroring the pattern set by
  [`tests/api/health-database-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/health-database-query.spec.ts),
  [`tests/api/version-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/version-query.spec.ts),
  [`tests/api/feature-existence-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/feature-existence-query.spec.ts),
  and the other `*-query.spec.ts` files. The handler signature is
  `export async function GET()` (no `request` parameter), so the
  spec walks the obvious query-param keys a future contributor
  might add (`refresh`, `force`, `provider`, `tenantId`, `locale`,
  `lang`, `format`, `verbose`, `debug`, `fields`, `include`,
  `exclude`) plus empty values, repeated keys, SQL-injection-shaped
  values (`%27`, `%22`, `%3B`, `%2D%2D`, `'OR'1'='1`,
  `DROP+TABLE+users`), an XSS-shaped value
  (`<script>alert(1)</script>`), a path-traversal-shaped value
  (`../../etc/passwd`), long values, and bogus typo'd keys.
  Asserts a tighter contract than the other query-smoke specs: the
  route is intentionally public (returns `null` rather than `401`
  when unauthenticated) so the only valid status is `200`, and any
  4xx — not just 5xx — is a regression. Also pins the
  unauthenticated response envelope (the JSON literal `null`, not
  `{}`, not `{ user: null }`, not the safe-user shape with `null`
  fields), the authenticated envelope shape (`id` is a string,
  `isAdmin` is a boolean — the only two `required` fields per the
  route's swagger doc), the same-status invariant across baseline
  and parameterised URLs, the SQL-injection invariant (the route
  runs `auth()` only with no SQL interpolation, so injection-shaped
  values cannot reach any downstream layer), and the
  Authentication-spec sensitive-field-non-exposure contract that
  forbids `password`, `passwordHash`, `hashedPassword`, `salt`,
  `token`, `accessToken`, `refreshToken`, `idToken`, `jwt`,
  `session`, `sessionToken`, `iat`, `exp`, `jti`, `sub`, and
  `secret` from appearing in the safe-user shape.
- `docs/plugins` Added `tsconfig-presets.md` — the **per-source-file
  reference** for the workspace's shared TypeScript preset package,
  paired with
  [`packages/tsconfig/base.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/base.json),
  [`packages/tsconfig/nextjs.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/nextjs.json),
  [`packages/tsconfig/playwright.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/playwright.json),
  and
  [`packages/tsconfig/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/package.json),
  the same way `eslint-config.md` pairs with the two
  `packages/eslint-config/*` files and `plugin-tsconfigs.md` pairs
  with the three plugin-package `tsconfig.json` files. Where
  `plugin-tsconfigs.md` covers the **downstream** plugin tsconfigs
  that extend `base.json`, this page covers the **upstream** preset
  package itself — the three preset files plus the manifest that
  publishes them. The page documents the at-a-glance summary
  (package name `@ever-works/tsconfig`, `private: true`,
  `version: '0.0.0'` pinned because consumed via `workspace:*`
  only, three preset files declared in `package.json#files`, six
  current consumers across `apps/web`, `apps/web-e2e`, and the
  three plugin packages, no `dependencies` / `devDependencies` /
  `peerDependencies` / `scripts`); the file map; the per-field
  walk-through of each preset file (twelve compiler options on
  `base.json` plus an `exclude` entry, two-line override on
  `nextjs.json`, two-line override on `playwright.json`); the
  per-field walk-through of `package.json` plus the matrix of
  deliberately-absent fields (`type`, `main`, `types`, `exports`,
  `dependencies`, `devDependencies`, `peerDependencies`, `scripts`)
  and what each absence implies; the inheritance ASCII diagram
  showing the two leaves fanning out from `base.json` and the three
  plugin packages bypassing the leaves; the consumer table mapping
  each of the six current consumers to its `extends` target with
  the rationale; the deliberate `apps/docs` out-of-scope note;
  the cross-cutting concerns walkthrough (`target: 'ES2017'`,
  `module` + `moduleResolution` pair semantics, `strict` sub-flags,
  `incremental` cache mechanics); the "How the leaves diverge from
  the base" matrix; the failure matrix that maps each preset-level
  mistake onto the layer that surfaces it; and the public-surface
  change checklist with the Constitution-Check note for Article II
  (TypeScript-Only) and Article III (Public-Surface Stability).
- `apps/web-e2e` Added
  [`tests/api/health-database-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/health-database-query.spec.ts)
  — query-param surface smoke for the `/api/health/database`
  endpoint, mirroring the pattern set by
  [`tests/api/version-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/version-query.spec.ts),
  [`tests/api/feature-existence-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/feature-existence-query.spec.ts),
  and the other `*-query.spec.ts` files. The handler signature is
  `export async function GET()` (no `request` parameter), so the
  spec walks the obvious query-param keys a future contributor
  might add (`refresh`, `force`, `schema`, `database`, `table`,
  `timeout`, `check`, `probe`, `format`, `verbose`, `debug`,
  `locale`, `lang`) plus empty values, repeated keys,
  SQL-injection-shaped values (`%27`, `%22`, `%3B`, `%2D%2D`,
  `'OR'1'='1`, `DROP+TABLE+users`), long values, and bogus typo'd
  keys. Asserts a tighter contract than the other query-smoke
  specs (`< 500`): the route's two valid branches are 200 (healthy)
  and 500 (unhealthy on a missing-database CI environment), and
  every parameterised URL must respond with the **same status as
  the no-arg baseline** — any URL-driven status drift is a real
  regression. Also pins the response envelope shape (`status`
  one-of `'healthy'`/`'unhealthy'`, `database` one-of
  `'connected'`/`'disconnected'`, `timestamp` an ISO-8601 string)
  and the SQL-injection invariant (the route runs a hard-coded
  `db.execute(sql\`SELECT 1 as test\`)` with no parameter binding,
  so injection-shaped values cannot reach the SQL layer).
- `docs/index.md` Added the [Shared TypeScript Presets](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/tsconfig-presets.md) entry under the
  "For Contributors & AI Agents" section so the new plugin docs
  page is reachable from the docs index.
- `docs/plugins` Added `eslint-config.md` — the **per-source-file
  reference** for the workspace's shared ESLint flat config preset,
  paired with
  [`packages/eslint-config/nextjs.mjs`](https://github.com/ever-works/directory-web-template/tree/develop/packages/eslint-config/nextjs.mjs)
  and
  [`packages/eslint-config/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/eslint-config/package.json),
  the same way `plugin-tsconfigs.md` pairs with the three plugin-package
  `tsconfig.json` files. Where `plugin-tsconfigs.md` covers the
  workspace's TypeScript posture, this page covers the workspace's
  lint posture — the rules, the parser, the ignored globs, and the
  `tsconfigPath` parameter every consumer threads through. The page
  is organised as a per-block walkthrough of the three flat-config
  blocks the factory returns (block 1: `ignores` for `**/node_modules/**`,
  `**/.next/**`, `**/out/**`, `**/build/**`, `**/dist/**`, and
  `**/*.config.{js,ts,mjs}` with each pattern's rationale; block 2:
  JS/TS shared rules for `*.{js,jsx,ts,tsx}` with
  `react-hooks/rules-of-hooks: 'error'` as the load-bearing rule,
  `react-hooks/exhaustive-deps: 'warn'` as the hint level, the
  deliberate `'no-unused-vars': 'off'` to defer to the TS-aware
  variant, and `'no-console': 'off'` to allow the structured-logging
  convention used by the API routes; block 3: TS-only typed rules
  for `*.{ts,tsx}` with the typed `@typescript-eslint/parser`
  threading `parserOptions.project: tsconfigPath`,
  `@typescript-eslint/no-unused-vars: 'warn'` with the `^_` prefix
  convention for `_request`, `catch (_) { ... }`, and head-discarded
  destructuring); the `package.json` field-by-field walkthrough
  (`name: '@ever-works/eslint-config'`, `version: '0.0.0'`,
  `private: true`, `license: AGPL-3.0`, the single sub-path
  `exports."./nextjs"` that forces consumers to import via the full
  path, the four direct dependencies and their workspace-floor
  ranges, the `eslint@^9` peer-dep that pins the flat-config
  format); the consumer table that maps the four current consumers
  (`apps/web`, `apps/docs`, `apps/web-e2e`, plugin packages) onto
  how each calls `nextjsConfig(...)` and the Phase-D plan to wire
  the per-package lint gate scheduled in Spec 002; the failure
  matrix that maps each configuration mistake (`Cannot find module
'@ever-works/eslint-config/nextjs'` from a lost sub-path entry,
  `Parsing error: Cannot find module '@typescript-eslint/parser'`
  from a stale ESLint-8 lockfile, `Configuration for rule
"react-hooks/rules-of-hooks" is invalid` from a stale plugin pin,
  `'_request' is defined but never used` from a re-enabled JS
  `no-unused-vars`, `'console' is not defined` from a flipped
  `no-console`, raised-to-error `react/jsx-key` from a consumer
  override, invalid `tsconfigPath`, `.next/`-build-output linting
  from a removed ignore, tooling-config linting from a removed
  `*.config.*` ignore, eslintrc-syntax-mixed-with-flat-config from
  a regression, `eslint@9.x not found` peer-dep refusal) onto the
  layer that surfaces them; and the public-surface change checklist
  that ties any rule or field change to a `plugin-tsconfigs.md`
  cross-check, an `authoring-a-plugin.md` cross-check, an
  `apps/web/eslint.config.mjs` propagation check, the workspace-root
  `pnpm lint` run, the `pnpm install` lockfile run, a
  `docs/log.md` entry, an open-questions register entry, and the
  Constitution-Check note in the PR description for Article II
  (TypeScript-Only) and Article IX (Test Coverage Bar). Cross-linked
  from `plugin-tsconfigs.md` and from `docs/index.md`.
- `apps/web-e2e` Added `tests/api/version-query.spec.ts` — a
  **query-param surface smoke** for the public version endpoints
  (`/api/version` GET, `/api/version/sync` GET, `/api/version/sync`
  POST). The existing `version.spec.ts` covers the canonical
  no-arg / no-body happy paths; this spec walks ~50 query-string
  variations (`?branch=`, `?refresh=`, `?force=`, `?clone=`,
  `?commit=`, `?sha=`, `?ref=`, `?repository=`, `?format=`,
  `?short=`, `?long=`, `?locale=`, `?lang=`, empty values, repeated
  keys, special-character values that would tempt a future
  shell-quoting bug if a contributor ever swapped `isomorphic-git`
  for a shell `git` invocation, 500-character values, and bogus /
  typo'd unknown keys) and asserts each variation returns a non-5xx
  response, plus per-endpoint envelope-shape assertions
  (`/api/version`: `{commit, message, ...}` always at 200 with
  `commit` always a non-empty string and `message` always a string
  on both the success and the graceful-degrade branches;
  `/api/version/sync` GET: `{syncInProgress, lastSyncTime,
timeSinceLastSyncHuman, uptime, timestamp}` always at 200 with
  `syncInProgress: boolean`, `lastSyncTime: string | null`,
  `uptime: number >= 0`), an "identical with and without bogus
  query parameters" status-code invariant for both GETs, and a
  POST `/api/version/sync` "ignores query parameters" invariant
  that proves the body-only handler does not regress to reading
  the URL. Closes the query-surface gap for these three endpoints
  in [Spec 010](spec/010-e2e-test-coverage/spec.md).
- `docs/plugins` Added `plugin-tsconfigs.md` — the **per-source-file
  reference** for the three byte-identical `tsconfig.json` files in
  the plugin-system packages, paired with
  [`packages/plugin-sdk/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/tsconfig.json),
  [`packages/plugin-runtime/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/tsconfig.json),
  and
  [`packages/plugin-demo/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/tsconfig.json),
  the same way `sdk-package-manifest.md` pairs with
  `packages/plugin-sdk/package.json`,
  `runtime-package-manifest.md` pairs with
  `packages/plugin-runtime/package.json`, and
  `plugin-demo-package-manifest.md` pairs with
  `packages/plugin-demo/package.json`. Where the package-manifest
  references cover **how** each package is wired into Node's
  resolution algorithm and `package.json#exports`, this page covers
  **how** each package's TypeScript compiler is configured when
  `pnpm tsc --noEmit` runs against its sources. The page is
  organised as a field-by-field reference (`extends:
"@ever-works/tsconfig/base.json"`, `compilerOptions.jsx:
"react-jsx"`, `compilerOptions.types: ["react"]`, `include:
["src/**/*"]`, `exclude: ["node_modules", "dist"]`) with each
  field paired with its purpose, the practical consequence for
  plugin authors, and the change-event-class it implies for any
  third-party plugin author copying this configuration as a
  starting point; the per-flag walkthrough of the inherited base
  config (`target: "ES2017"`, `lib`, `allowJs`, `skipLibCheck`,
  `strict`, `noEmit`, `esModuleInterop`, `module`,
  `moduleResolution: "bundler"`, `resolveJsonModule`,
  `isolatedModules`, `incremental`) that pins each one to a
  documentation impact; the `react-jsx` automatic-runtime
  rationale (the SDK's `plugin.ts` references `React.ComponentType`
  types so the JSX scope must be open even where no JSX is
  authored, runtime's `SlotHost.tsx` and demo's `Header.tsx`
  author literal JSX, all three packages need the same JSX flag);
  the `types: ["react"]` whitelist semantics (transitive
  `@types/node` / `@types/jest` / DOM-polyfill packages cannot
  leak ambient types into the plugin's compilation, plugin
  authors who need `process.env` ambient typing must explicitly
  add `"node"` to their own `types` array); the
  `include`-and-`exclude` rationale that locks the package
  boundary at `src/` and forward-guards against a future `dist/`
  build step (a one-off script in `packages/plugin-demo/scripts/`
  is intentionally outside the type-check guarantee, which is the
  forcing function for "move under `src/`" or "stay outside the
  package's public surface"); the "How the three packages diverge
  from this baseline" matrix that lists every hypothetical
  override (`types: ["react", "node"]` for a Node-aware demo,
  `declaration: true` for IDE pre-warm, `outDir: "./dist"` for a
  future build step, `composite: true` for project-references
  parallelism, `lib: ["esnext"]` for a Node-only plugin, widened
  `include` for a CLI-helper plugin, narrowed `exclude` for
  co-located Vitest tests) with the reason it is and is not
  warranted today; the failure matrix that maps each
  `tsconfig.json` mistake (`JSX element implicitly has type
'any'` from a dropped React-types entry, `Cannot use JSX unless
the '--jsx' flag is provided` from a removed JSX flag,
  `'process' is not defined` from a missing Node-types entry,
  slow `pnpm tsc --noEmit` from an `incremental: false`
  regression, stray `@types/jest` symbols leaking into
  IntelliSense from a removed `types` whitelist,
  `Output file 'dist/index.js' has not been built from source
file 'src/index.ts'` from an accidental `noEmit: false`,
  `Compiler option 'isolatedModules' may not be used with
'composite'` from a `composite: true` override that didn't
  drop `isolatedModules`, the demo's `Cannot find module
'react/jsx-runtime'` symptom of a React-18 lockfile downgrade
  while keeping `jsx: "react-jsx"`, and a downstream plugin's
  silent-strict-mode regression from a missed `extends`
  directive) onto the layer that surfaces them; and the
  public-surface change checklist that ties any option change to
  a matching package-manifest cross-check (changes to JSX runtime
  / React peer-dep range / entry-file extension propagate to
  [`sdk-package-manifest.md`](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/sdk-package-manifest.md),
  [`runtime-package-manifest.md`](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/runtime-package-manifest.md),
  and
  [`plugin-demo-package-manifest.md`](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/plugin-demo-package-manifest.md)
  in the same commit), an
  [`Authoring a Plugin`](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/authoring-a-plugin.md)
  cross-check, a `packages.md` cross-check, the dual
  `pnpm tsc --noEmit` runs (workspace-root + per-package, because
  Turborepo's cache may mask a regression that only shows up
  in the per-package run), a `docs/log.md` entry, an
  open-questions register entry, and the Constitution-Check note
  in the PR description for Article II (TypeScript-Only) and
  Article III (Public-Surface Stability). Cross-linked from the
  three package-manifest references' Cross-references sections
  and from `docs/index.md`.
- `apps/web-e2e` Added `tests/api/feature-existence-query.spec.ts`
  — a **query-param surface smoke** for the four public
  feature-existence endpoints (`/api/categories/exists`,
  `/api/collections/exists`, `/api/surveys/exists`, and
  `/api/items/export/settings`). The existing
  `feature-existence.spec.ts` covers the no-arg / single-canonical-arg
  happy path; this spec walks ~80 query-string variations
  (`?locale=`, `?type=`, `?limit=`, `?offset=`, `?page=`,
  `?pageSize=`, `?q=`, `?search=`, `?filter=`, `?prefix=`,
  `?sort=`, `?order=`, `?direction=`, `?lang=`, empty values,
  repeated keys, special-character values, 500-character values,
  and bogus / typo'd unknown keys across all four endpoints) and
  asserts each variation returns a non-5xx response, plus a
  per-endpoint envelope-shape assertion (categories: `{exists,
count}` always at 200; collections: same envelope at 200 or 500
  with the optional `error` string; surveys: `{exists}` always at
  200; items/export/settings: `{export_enabled}` always at 200),
  plus an "identical with and without bogus query parameters"
  invariant for the three endpoints whose handlers do not read
  the request URL. Closes the query-surface gap for these four
  endpoints in [Spec 010](spec/010-e2e-test-coverage/spec.md).
- `docs/plugins` Added `plugin-demo-package-manifest.md` — the
  **per-source-file reference** for the demo plugin package
  manifest that pairs with
  [`packages/plugin-demo/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/package.json)
  the same way `sdk-package-manifest.md` pairs with
  `packages/plugin-sdk/package.json`,
  `runtime-package-manifest.md` pairs with
  `packages/plugin-runtime/package.json`, and `plugin-demo.md`
  pairs with the bundled reference plugin's TypeScript sources
  under `packages/plugin-demo/src/`. Where the
  [Reference Plugin](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/plugin-demo.md)
  page documents the three TypeScript files (`config.ts`,
  `Header.tsx`, `index.tsx`), this page documents the
  **package-level contract** — the `package.json` fields that
  decide how the demo plugin is wired into the workspace and how
  a downstream plugin author must wire their own package the
  same way. The page is organised as a field-by-field reference
  (`name`, `version`, `description`, `license`, `private`,
  `type: "module"`, `sideEffects: false`, `main`, `types`,
  `exports."."` (single entry pointing at `./src/index.tsx`
  because the entry composes JSX), `files`, `scripts.typecheck`
  / `scripts.lint`, `dependencies.@ever-works/plugin-sdk`
  (workspace), `dependencies.zod`, `peerDependencies.react`
  (required, **no** `peerDependenciesMeta` because the demo
  always ships a slot component), and the `devDependencies`
  set) with each field paired with its purpose, why-it-matters
  note, and the change-event-class it implies for downstream
  plugin authors who copy this manifest as a starting point;
  the deliberately-empty sub-path map (no narrowed sub-paths
  because the demo is a leaf consumer with a single `default`
  export — narrowing would imply public structure inside
  `Header.tsx` / `config.ts` which the demo intentionally
  hides); the `manifest.version` vs. `package.json#version`
  drift contract (the manifest version gates `templateRange`;
  the package version is workspace-graph metadata only); the
  `.tsx`-vs-`.ts`-extension-on-the-entry rationale (the entry
  composes JSX through `Header.tsx`, so `.tsx` opens the JSX
  scope under `jsx: "preserve"`); a failure matrix that maps
  each demo-level manifestation (non-public sub-path import
  like `@ever-works/plugin-demo/Header`, CJS-without-`import()`,
  dropped `sideEffects` flag, non-`workspace:*` SDK specifier,
  `.tsx`-flipped-to-`.ts`, React-18-typings, Zod-3-schemas,
  `manifest.version`/`package.json#version` drift,
  `templateRange` widened beyond SDK `version`, downstream-author
  -keeps-`@ever-works`-scope, downstream-author-keeps-`private:
true`-while-publishing, downstream-author-keeps-required-React
  -peer-on-non-React-plugin) onto the layer that surfaces it;
  and a public-surface change checklist that ties any field
  change to a cross-check against `plugin-demo.md`,
  `sdk-package-manifest.md`, `runtime-package-manifest.md`
  (the three manifests move in lock-step on `version`, Zod
  range, React peer range, and `sideEffects` flag),
  `packages.md`, an `apps/web/package.json` lockfile
  cross-check, a `docs/log.md` entry, an open-questions
  register entry, the `pnpm tsc --noEmit` and Playwright
  smoke-spec verification step, and the Constitution-Check
  note in the PR description for Article I (Plugin-First) and
  Article III (Public-Surface Stability). Cross-linked from
  `docs/index.md` Plugins section.
- `apps/web-e2e` Added `tests/api/location-listing-query.spec.ts`
  — a Playwright API smoke spec that closes the **query-param
  surface** coverage gap for the public no-arg location-listing
  endpoints
  [`/api/location/cities`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/location/cities/route.ts)
  and
  [`/api/location/countries`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/location/countries/route.ts).
  The existing `location.spec.ts` covers the no-arg happy
  path for both endpoints; the new spec walks the
  **query-param surface** so a regression that introduces a
  typo'd `request.nextUrl.searchParams.get(...)` call (which
  a future filter-by-country-prefix or filter-by-locale
  change might tempt a future contributor into adding) is
  caught immediately as a non-200 / non-404 / 5xx response.
  Both routes are intentionally no-arg — the `GET()` function
  signature is `export async function GET()` — so the route's
  contract is that **any** query string is silently ignored,
  and the spec enumerates every plausible-future-typed key
  family (`?city=` / `?country=` typo'd from
  `/api/location/coordinates`; `?prefix=` / `?q=` /
  `?search=` / `?filter=` typed for type-ahead search;
  `?limit=` / `?offset=` / `?page=` / `?pageSize=` typed
  for pagination; `?sort=` / `?order=` / `?direction=` typed
  for sort wiring; `?locale=` / `?lang=` typed for i18n;
  empty-value forms; repeated keys; special-character
  values like `%25`/`%2F`/`%5C`/`%27` that would tempt a
  future regex / LIKE-prefix wiring; long values
  `'x'.repeat(500)`; bogus / typo'd keys). The assertion
  contract is intentionally narrow — every URL must respond
  with a `<500` status, and the no-arg envelope must be
  either `{ success: false, error: 'Location features are
disabled' }` (404 branch when the feature gate is off,
  the most-likely branch in local dev) or `{ success: true,
data: string[] }` (200 branch when the feature is on
  and the data layer succeeds). The two
  `responds identically with and without bogus query
parameters` assertions pin the contract that the route
  never reads the request URL, so the status code with any
  query string must match the no-arg status code exactly.
- `docs/plugins` Added `runtime-package-manifest.md` — the
  **per-source-file reference** for the runtime package manifest
  that pairs with
  [`packages/plugin-runtime/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/package.json)
  the same way `sdk-package-manifest.md` pairs with
  `packages/plugin-sdk/package.json`,
  `runtime-public-surface.md` pairs with
  `packages/plugin-runtime/src/index.ts`, and the per-source-file
  reference set under `docs/plugins/` already documents every
  TypeScript file in `packages/plugin-sdk/src/` and
  `packages/plugin-runtime/src/`. Where the
  [Runtime Public Surface Reference](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/runtime-public-surface.md)
  documents the TypeScript barrel, this page documents the
  **package-level contract** — the `package.json` fields that
  decide which sub-paths are importable, how React is reached
  (peer dependency, **required** — unlike the SDK where it is
  optional), how the SDK is reached (workspace dependency via
  `workspace:*`), how Zod is reached (runtime dependency,
  required), and how bundlers tree-shake the runtime's React-aware
  `<SlotHost />` re-export off server bundles when the host imports
  through the narrowed `./registry` / `./loader` / `./testing`
  sub-paths. The page is organised as a field-by-field reference
  (`name`, `version`, `description`, `license`, `private`,
  `type: "module"`, `sideEffects: false`, `main`, `types`,
  `exports."."` / `./registry` / `./SlotHost` / `./loader` /
  `./testing`, `files`, `scripts.typecheck` / `scripts.lint`,
  `dependencies.@ever-works/plugin-sdk` (workspace),
  `dependencies.zod`, `peerDependencies.react` (required, **no**
  `peerDependenciesMeta`), and the `devDependencies` set) with
  each field paired with its purpose, why-it-matters note, and the
  change-event-class it implies for host-app authors; a sub-path
  map that locks the barrel-vs-narrowed contract (the four
  narrowed sub-paths are a strict subset of the barrel and resolve
  to the same module instance via Node's path-keyed module cache,
  and each one isolates a different concern — `./registry` keeps
  React out of server-only callers, `./loader` is the boot
  pipeline, `./SlotHost` makes the React boundary explicit,
  `./testing` keeps JSDOM out of server-side unit tests); a
  failure matrix that maps each manifest-level mistake (non-public
  sub-path import, server action importing `PluginRegistry` from
  the barrel instead of `./registry`, lowercased `slothost`,
  CJS-without-`import()`, dropped `sideEffects` flag,
  non-`workspace:*` specifier, runtime-version-diverges-from-SDK-version,
  host-installs-no-React, Zod-3-schema, public-name-without-`exports`-entry,
  file-without-barrel-re-export) onto the layer that surfaces it;
  and a public-surface change checklist that ties any field change
  to a cross-check against `runtime-public-surface.md`,
  `sdk-package-manifest.md`, `packages.md`, an
  `apps/web/package.json` peer-range / Zod-major propagation
  check, a `docs/log.md` entry, an open-questions register entry,
  the `pnpm tsc --noEmit` and Playwright smoke-spec verification
  step, and the Constitution-Check note in the PR description for
  Article I (Plugin-First) and Article III (Public-Surface
  Stability). Cross-linked from `docs/index.md` Plugins section.
- `apps/web-e2e` Added `tests/api/location-search-query.spec.ts`
  — a Playwright API smoke spec that closes the **query-param
  surface detail** coverage gap for the public
  `/api/location/search` endpoint served by
  [`apps/web/app/api/location/search/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/location/search/route.ts).
  The existing `location.spec.ts` covers the no-params 400, the
  single-param `city` / `country` / radius branches, and an
  invalid-coordinates 400; the new spec walks the full **query-
  param surface detail** (the radius branch's `parseFloat`
  finite-number checks, the `parseInt(radius, 10)` default-50
  fallback, the `radius=0` / negative / `NaN` 400, the `near_lat=NaN`
  / `near_lng=NaN` / `infinity` 400, the only-one-of-the-pair
  fall-through to city / country, the `if (city)` / `if (country)`
  truthy guards, the percent-encoded UTF-8 city / country values,
  the whitespace-only city / country values that pass the truthy
  check, the branch-priority order radius > city > country, the
  unknown / typo'd parameter names that hit the no-params 400, and
  the repeated query keys that take the first value via
  `searchParams.get(name)`) so a regression in any of those
  branches is caught explicitly. The assertion contract is
  intentionally narrow — every URL must respond with a `<500`
  status, the body must be valid JSON when present, and the JSON
  envelope must contain at least one of `success` / `error` /
  `data` keys; when `data` is present, `data.slugs` must be an
  array and `data.distances` (when present) must be a non-array
  object. 4xx-other and 5xx are never allowed because the route
  never validates beyond what the matrix above describes.
- `docs/plugins` Added `sdk-package-manifest.md` — the
  **per-source-file reference** for the SDK package manifest that
  pairs with
  [`packages/plugin-sdk/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/package.json)
  the same way `sdk-public-surface.md` pairs with
  `packages/plugin-sdk/src/index.ts`,
  `runtime-public-surface.md` pairs with
  `packages/plugin-runtime/src/index.ts`, `manifest.md` pairs with
  `manifest.ts`, `capabilities.md` pairs with `capabilities.ts`,
  `slots.md` pairs with `slots.ts`, `providers.md` pairs with
  `providers.ts`, `plugin.md` pairs with `plugin.ts`, `loader.md`
  pairs with `loader.ts`, `registry.md` pairs with `registry.ts`,
  `slot-host.md` pairs with `SlotHost.tsx`, `testing.md` pairs
  with `testing.ts`, and `plugin-demo.md` pairs with the bundled
  reference plugin under `packages/plugin-demo/src/`. Where the
  SDK public-surface page documents the TypeScript barrel, this
  page documents the **package-level contract** — the
  `package.json` fields that decide which sub-paths are
  importable, how React is reached (peer dependency, optional),
  how Zod is reached (runtime dependency, required), and how
  bundlers tree-shake the SDK's type-only exports down to nothing.
  The page is organised as a field-by-field reference (`name`,
  `version`, `license`, `private`, `type: "module"`,
  `sideEffects: false`, `main`, `types`,
  `exports."."` / `./capabilities` / `./slots`, `files`,
  `scripts.typecheck` / `scripts.lint`, `dependencies.zod`,
  `peerDependencies.react` with `peerDependenciesMeta.react.optional`,
  and the `devDependencies` set) with each field paired with its
  purpose, why-it-matters note, and the change-event-class it
  implies for plugin authors; a sub-path map that locks the
  barrel-vs-narrowed contract (the two narrowed sub-paths are a
  strict subset of the barrel and resolve to the same module
  instance via Node's path-keyed module cache, and `manifest.ts`
  / `providers.ts` / `plugin.ts` / `index.ts` deliberately have
  no narrowed sub-path because their exports are types-only or
  single-author-facing-factory); a failure matrix that maps each
  manifest-level mistake (non-public sub-path import,
  CJS-without-`import()`, dropped `sideEffects` flag,
  non-`workspace:*` specifier, React-18-typings, Zod-3-schema,
  public-name-without-`exports`-entry, file-without-barrel-re-export,
  breaking `version` bump) onto the layer that surfaces it; and a
  public-surface change checklist that ties any field change to a
  cross-check against `sdk-public-surface.md` and `packages.md`,
  an `apps/web/package.json` peer-range / Zod-major propagation
  check, a `docs/log.md` entry, an open-questions register entry,
  the `pnpm tsc --noEmit` and Playwright smoke-spec verification
  step, and the Constitution-Check note in the PR description for
  Article I (Plugin-First) and Article III (Public-Surface
  Stability). Cross-linked from `docs/index.md` Plugins section.
- `apps/web-e2e` Added `tests/api/location-coordinates-query.spec.ts`
  — a Playwright API smoke spec that closes a coverage gap for the
  public `/api/location/coordinates` endpoint served by
  [`apps/web/app/api/location/coordinates/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/location/coordinates/route.ts).
  The existing `location-coordinates.spec.ts` covers the
  no-query-param happy path and two basic filter cases; the new
  spec walks the **query-param surface** (the `searchParams.get('city')`
  / `searchParams.get('country')` reads, the
  `city.trim().toLowerCase()` normalisation against
  `entry.cityNormalized` / `entry.countryNormalized`, the
  `if (city)` / `if (country)` truthy guards, the
  `!entry.isRemote` filter, the `Number(entry.latitude)` /
  `Number(entry.longitude)` coercion, the 404-on-feature-disabled
  short-circuit, and the catch-and-500 fallback) so a regression
  in any of those branches is caught explicitly. The spec
  enumerates well-formed values (`Paris`, `paris`, `PARIS`,
  `New%20York`, percent-encoded UTF-8 like `S%C3%A3o%20Paulo` and
  `Bogot%C3%A1`), whitespace-only values that pass the truthy
  check but normalise to an empty string (single space, double
  space, `%09` tab, `%0A` newline), missing-key cases, and the
  combined `city`+`country` shape. The assertion contract is
  intentionally narrow — every URL must respond with a JSON body
  matching `{ success: true, data: [] | array }` (200 branch,
  feature enabled) or `{ success: false, error: string }` (404
  branch, feature disabled). 4xx-other and 5xx are never allowed
  because the route never validates the value and the
  data-layer call must not crash before the response renderer.
- `docs/plugins` Added `runtime-public-surface.md` — the
  **per-source-file reference** for the runtime barrel that pairs
  with [`packages/plugin-runtime/src/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/index.ts)
  the same way `sdk-public-surface.md` pairs with
  `packages/plugin-sdk/src/index.ts`, `manifest.md` pairs with
  `manifest.ts`, `capabilities.md` pairs with `capabilities.ts`,
  `slots.md` pairs with `slots.ts`, `providers.md` pairs with
  `providers.ts`, `plugin.md` pairs with `plugin.ts`, `loader.md`
  pairs with `loader.ts`, `registry.md` pairs with `registry.ts`,
  `slot-host.md` pairs with `SlotHost.tsx`, `testing.md` pairs
  with `testing.ts`, and `plugin-demo.md` pairs with the bundled
  reference plugin under `packages/plugin-demo/src/`. The page is
  organised as a per-line walkthrough of the 15-line barrel: the
  JSDoc preamble's three pinned invariants (React-aware-only-in-`SlotHost`
  so a server action that imports `PluginRegistry` does not drag
  React into the server graph and the unit-test harness that
  imports `createTestRegistry` does not need a JSDOM environment;
  owns-registry-loader-host so anything beyond
  **register / enable / disable / load / render** belongs in a
  host-app module that wraps the registry rather than in this
  package; cross-link to `docs/architecture/plugin-system.md` so
  the architecture is the rationale and the barrel is the
  contract); line 9 the `PluginRegistry` value re-export and why
  it must cross the value boundary (an `export type` would erase
  the class at compile time and `new PluginRegistry({…})` would
  fail at runtime); line 10 the `loadPlugins` and
  `mergeConfigSources` value re-exports plus the explicit reason
  `mergeConfigSources` is a value re-export rather than a
  runtime-only helper (so a host app that builds config sources
  in a non-standard way like an admin REST handler that reads
  from a key-vault rather than a Postgres row can call
  `mergeConfigSources` directly to enforce the precedence
  contract without going through `loadPlugins`, removing the
  temptation to reimplement the merge in the host app and
  accidentally reverse the precedence order); line 11 the
  `PluginConfigSources` and `LoadPluginsResult` type-only
  re-exports plus the never-throws-for-plugin-level-config-failures
  invariant on `LoadPluginsResult` (every rejection lands in
  `result.rejected` so a host app can render a per-plugin admin
  UI that distinguishes "loaded successfully" from "loaded but
  rejected" without wrapping the loader call in a try / catch);
  line 12 the `SlotHost` value re-export and the Fragment-only
  zero-DOM output; line 13 the `SlotHostProps` type-only
  re-export with the `slotId` constraint that catches typos at
  the call site; and line 14 the `createTestRegistry` value
  re-export with the explicit no-`export type` companion line
  because the helper's options object (`{ plugins: DirectoryPlugin[] }`)
  is an inline anonymous type and test consumers that want to
  refer to it by name should declare a local alias rather than
  expand the public surface here. The page also documents the
  `package.json#exports` sub-path map (`.`, `./registry`,
  `./SlotHost`, `./loader`, `./testing`) and the rationale for
  keeping the four narrowed sub-paths so a server action can
  import `PluginRegistry` from `@ever-works/plugin-runtime/registry`
  without dragging React into the server bundle, a test file
  can import `createTestRegistry` from
  `@ever-works/plugin-runtime/testing` without spinning up a
  JSDOM environment, and a host layout can import `<SlotHost />`
  from `@ever-works/plugin-runtime/SlotHost` to keep the React
  boundary explicit in bundle reports; the value-vs-type contract
  that locks moving a name across the `export { ... }` /
  `export type { ... }` boundary as a breaking change and points
  at `@typescript-eslint/consistent-type-exports` as the lint
  rule the runtime turns on alongside the SDK; the failure matrix
  that maps barrel-level mistakes (`Cannot find module '@ever-works/plugin-runtime/internal'`
  from a non-public sub-path import,
  `'LoadPluginsResult' is not exported` from a value-vs-type
  mis-import, `PluginRegistry is not a constructor` from a
  bundler tree-shaking the registry value re-export,
  `<SlotHost />` rendering an empty Fragment when the host
  layout passes a different registry instance than the one
  `loadPlugins` populated, plugin admin UI showing the plugin
  disabled when the host app stored `LoadPluginsResult.registered`
  but ignored enable state from the registry, full-runtime-pulled-in
  regression when the `sideEffects: false` flag is dropped from
  `package.json`, React leaking into a server bundle when a host
  action imports from the barrel instead of the narrowed
  `./registry` sub-path) onto the layer that catches it (Node
  module resolution, TypeScript with `verbatimModuleSyntax`, the
  consumer call site, the `<SlotHost />` runtime, the admin
  dashboard, the bundle analyzer, the public page bundle-size
  budget under Spec 018, the server action bundle-size budget);
  and the public-surface change checklist that ties any addition
  / removal back to Spec Kit, the matching per-source reference
  page, the `docs/log.md` entry, the `pnpm tsc --noEmit`
  verification step, and Article VIII (No removal) for any name
  that needs to leave the barrel. Cross-link from
  [`docs/index.md`](./index.md) and from
  [`docs/plugins/packages.md`](./plugins/packages.md) so the new
  doc is discoverable from both the docs index and the package
  overview alongside the SDK / runtime / demo source links.
- `e2e/api` Added `items-engagement-query.spec.ts` — the
  **public query-param surface** smoke for
  [`GET /api/items/engagement`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/engagement/route.ts)
  that pairs with the four obvious branches already in
  [`items-engagement-and-favorites.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/items-engagement-and-favorites.spec.ts)
  the same way `sponsor-ads-public.spec.ts` pairs with the
  no-arg coverage already in `feature-existence.spec.ts`,
  `featured-items-query.spec.ts` pairs with the
  `featured-items` no-arg case in `items.spec.ts`,
  `items-export-query.spec.ts` pairs with the `items-export`
  no-arg case in `discovery.spec.ts`, and
  `items-popularity-scores.spec.ts` pairs with the
  `popularity-scores` no-arg case in `discovery.spec.ts`. The
  spec parametrises the route's single `slugs` required
  comma-separated query parameter (`split(',').map(s => s.trim()).filter(Boolean)`-parsed
  with no upper limit beyond the 200-entry abuse-prevention
  ceiling) across the missing-param branch (returns `400` +
  `{ error: 'Missing required parameter: slugs' }` from the
  `searchParams.get('slugs') === null` check), the present-but-empty /
  whitespace-only / comma-only branches (`?slugs=`, `?slugs=%20`,
  `?slugs=,,,` — all produce an empty parsed list and return
  `200` + `{ metrics: {} }` via the `slugs.length === 0`
  guard), the single-known-or-unknown-slug case, the
  multi-slug happy path, the surrounding / interior whitespace
  case (the route trims each entry and drops trimmed-empty
  entries via `filter(Boolean)`), the URL-encoded slug-content
  case (`%2F`, `%2B`, `%25`, `%26` are passed through verbatim
  to the data layer), the at-the-ceiling 200-slug case, the
  one-above-the-ceiling 201-slug case (the off-by-one boundary
  on the `slugs.length > 200` guard that the existing 250-slug
  case in `items-engagement-and-favorites.spec.ts` doesn't pin
  explicitly), the extra-unknown-query-params case (the route
  only reads `slugs` from `searchParams`), and the repeated
  `slugs` keys case (`searchParams.get` returns the **first**
  occurrence; the rest are silently ignored — the route does
  not call `searchParams.getAll`). Status `< 500` is the only
  asserted contract for the parametrised cases — the route has
  three distinct success branches that all legitimately return
  `200 OK` with different payloads (the
  `checkDatabaseAvailability()` short-circuit returning
  `{ metrics: {} }`, the happy-path
  `getEngagementMetricsPerItem(slugs)` query with the
  `Map`-to-plain-object conversion, and the `try / catch`
  empty-fallback that handles internal errors by warning in dev
  and still returning `{ metrics: {} }`), and asserting on the
  body would pin the spec to a single branch and break under
  the others. Two extra small assertions pin the deterministic
  branches: the no-arg case must produce a 4xx with the
  missing-param envelope (or the DB-fallback `{ metrics: {} }`
  short-circuit if a future refactor swaps the order — the
  assertion is permissive on which envelope but strict on the
  4xx-or-200 bracket so the JSON shape stays valid), and the
  two-slug happy path must always produce a 200 with a
  `metrics` plain-object envelope (not array, not null) so a
  future change that turned the route into a 4xx / 5xx response
  on a well-formed request would be caught explicitly.
- `docs/plugins` Added `sdk-public-surface.md` — the
  **per-source-file reference** for the SDK barrel that pairs with
  [`packages/plugin-sdk/src/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/index.ts)
  the same way `manifest.md` pairs with `manifest.ts`,
  `capabilities.md` pairs with `capabilities.ts`, `slots.md` pairs
  with `slots.ts`, `providers.md` pairs with `providers.ts`,
  `plugin.md` pairs with `plugin.ts`, `loader.md` pairs with
  `loader.ts`, `registry.md` pairs with `registry.ts`,
  `slot-host.md` pairs with `SlotHost.tsx`, `testing.md` pairs with
  `testing.ts`, and `plugin-demo.md` pairs with the bundled
  reference plugin under `packages/plugin-demo/src/`. The page is
  organised as a per-line walkthrough of the 40-line barrel: the
  JSDoc preamble's three pinned invariants (framework-agnostic, the
  `react` peer-dependency-not-direct-dep stance, and the
  cross-link to `docs/architecture/plugin-system.md`); lines 11-12
  the capability re-exports (`CAPABILITIES` and `isCapability` as
  values, `Capability` as a type-only re-export with the
  value-vs-type split that `isolatedModules` enforces); lines
  14-15 the slot re-exports with the same shape; line 17 the
  manifest type re-exports (`PluginManifest<C>` and
  `PluginConfig<C>`); lines 19-30 the nine concrete capability
  provider interfaces and the `CapabilityProviderMap` mapped type
  re-exports; line 32 the **only** value re-export from `plugin.ts`
  (`defineDirectoryPlugin`) and the inference path the factory's
  `<C extends z.ZodTypeAny>` signature creates; lines 33-39 the
  five plugin-shape type re-exports (`DirectoryPlugin<C>`,
  `PluginContext<TConfig>`, `SlotComponentProps<TConfig>`,
  `PluginProviders`, `PluginSlots<TConfig>`). The page also
  documents the `package.json#exports` sub-path map (`.`,
  `./capabilities`, `./slots`) and the deliberate decision to keep
  `manifest`, `providers`, `plugin`, `loader`, `registry`, and
  `SlotHost` reachable only through the barrel (so adding a new
  capability or provider interface does not implicitly create a
  public sub-path); the value-vs-type contract that locks moving a
  name across the `export { ... }` / `export type { ... }`
  boundary as a breaking change and points at
  `@typescript-eslint/consistent-type-exports` as the lint rule
  the SDK turns on once the surface is stable; the failure matrix
  that maps barrel-level mistakes (`Cannot find module
'@ever-works/plugin-sdk/manifest'` from a non-public sub-path
  import, `'Capability' is not exported` from a value-vs-type
  mis-import, `defineDirectoryPlugin is not a function` from a
  bundler tree-shaking a value re-export, `ctx.config` typing as
  `unknown` when an author skips the factory, new capability not
  appearing in admin UI when the id is missing from the
  `CAPABILITIES` tuple, new manifest field silently ignored when
  the barrel re-export is missing, full-SDK-pulled-in regression
  when the `sideEffects: false` flag is dropped from
  `package.json`) onto the layer that catches it (Node module
  resolution, TypeScript with `verbatimModuleSyntax`, the consumer
  call site, the admin dashboard, the bundle analyzer, the public
  page bundle-size budget under Spec 018); and the public-surface
  change checklist that ties any addition / removal back to Spec
  Kit, the matching per-source reference page, the `docs/log.md`
  entry, the `pnpm tsc --noEmit` verification step, and Article
  VIII (No removal) for any name that needs to leave the barrel.
  Cross-link from [`docs/index.md`](./index.md) and from
  [`docs/plugins/packages.md`](./plugins/packages.md) so the new
  doc is discoverable from both the docs index and the package
  overview alongside the SDK / runtime / demo source links.
- `e2e/api` Added `sponsor-ads-public.spec.ts` — the
  **public query-param surface** smoke for
  [`GET /api/sponsor-ads`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/sponsor-ads/route.ts)
  that pairs with the no-arg coverage already in
  [`feature-existence.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/feature-existence.spec.ts)
  the same way `featured-items-query.spec.ts` pairs with the
  `featured-items` no-arg case in `items.spec.ts`,
  `items-export-query.spec.ts` pairs with the `items-export`
  no-arg case in `discovery.spec.ts`, and
  `items-popularity-scores.spec.ts` pairs with the
  `popularity-scores` no-arg case in `discovery.spec.ts`. The spec
  parametrises the route's single `limit` query parameter
  (`Number(...)`-ed with default `10`,
  `Number.isFinite ? Math.min(Math.max(1, Math.floor(value)), 50)
: 10`-clamped) across the [1, 50] valid range, beyond the upper
  clamp (`51`, `999`, `10000`), below the lower clamp (`0`, `-5`,
  `-1`), non-numeric / `NaN` / `Infinity` / `-Infinity` (which
  exercise the `Number.isFinite` fallback path), float (truncated
  via `Math.floor` before clamping), leading-whitespace / `+`
  sign, extra unknown query params (silently ignored), and
  repeated `limit` keys (only the first occurrence is read by
  `searchParams.get`). Status `< 500` is the only asserted
  contract — the route has three distinct success branches that
  all legitimately return `200 OK` with different payloads (the
  `checkDatabaseAvailability()` short-circuit returning
  `{ success: true, data: [] }`, the happy-path
  `sponsorAdService.getActiveSponsorAdsWithItems` query, and the
  `try / catch` empty-list fallback that handles internal errors
  by logging in development and still returning
  `{ success: true, data: [] }`), and asserting on the body would
  pin the spec to a single branch and break under the others. A
  separate small assertion on the no-arg path verifies that the
  JSON envelope shape (`{ success: true, data: [...] }` with
  `data` an array) is preserved across all three branches so a
  future change that turned the route into a 4xx / 5xx response
  would be caught explicitly.
- `docs/plugins` Added `plugin-demo.md` — the **per-source-file
  reference** for the bundled reference / demo plugin that pairs
  with [`packages/plugin-demo/src/index.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/src/index.tsx),
  [`packages/plugin-demo/src/config.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/src/config.ts),
  and [`packages/plugin-demo/src/Header.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/src/Header.tsx)
  the same way `manifest.md` pairs with `manifest.ts`,
  `capabilities.md` pairs with `capabilities.ts`, `slots.md` pairs
  with `slots.ts`, `providers.md` pairs with `providers.ts`,
  `plugin.md` pairs with `plugin.ts`, `loader.md` pairs with
  `loader.ts`, `registry.md` pairs with `registry.ts`,
  `slot-host.md` pairs with `SlotHost.tsx`, and `testing.md` pairs
  with `testing.ts`. The page documents the at-a-glance manifest
  summary (name `'demo'`, `templateRange '>=0.1 <1.0'`,
  `'ui-slot'` capability, `'header.right'` slot, `defaultEnabled:
true`, `adminToggleable: true`); the file map that ties each of
  the three source files to the SDK surface they consume; the
  per-line walk-through of `ConfigSchema` and `DemoConfig` (the
  `.default(true)` / `.default('Demo plugin loaded')` calls that
  make `z.infer<typeof ConfigSchema>` non-optional and let the
  loader parse cleanly with **no** config sources at all); the
  `DemoHeaderBadge` props / render contract / disabled-config
  short-circuit (the `if (!ctx.config.enabled) return null;` line
  the admin enable / disable flow exercises through merged config
  sources rather than registry-level unregistration) and the
  stable `data-plugin="demo"` / `data-testid="demo-plugin-badge"`
  test hooks; the `defineDirectoryPlugin` invocation broken down
  by manifest field and slot binding with the type-inference path
  that ties `ConfigSchema` to `SlotComponentProps<DemoConfig>` so
  the slot component cannot drift out of sync with the schema;
  the three call sites the demo plugin participates in (loader
  Zod parse + register, registry key under `'demo'`, slot host
  render via `<SlotHost slotId="header.right" />`); the failure
  matrix that maps demo-plugin manifestations onto the
  loader / registry / slot-host failure surfaces (Zod-rejected
  `enabled: 'yes'` / `greeting: 42`, `templateRange` mismatch,
  admin override flipping `enabled` post-boot, duplicate-name
  throw); the replace-the-demo-plugin recipe that exercises the
  slot ordering guarantee, the admin toggle, and the
  `defaultEnabled: false` lever without removing the reference
  package from tree (per the no-removal rule); and the evolution
  checklist that pairs every source-file change with the matching
  SDK reference page and `docs/log.md` entry. Cross-link from
  [`docs/index.md`](./index.md) so the new doc is discoverable
  from the docs index alongside the SDK / runtime / demo package
  links it complements.
- `e2e/api` Added `featured-items-query.spec.ts` — the
  **query-param surface** smoke for the public
  [`GET /api/featured-items`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/featured-items/route.ts)
  endpoint that pairs with the no-arg coverage already in
  [`items.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/items.spec.ts)
  the same way `items-export-query.spec.ts` pairs with the
  `items-export` no-arg case in `discovery.spec.ts` and
  `items-popularity-scores.spec.ts` pairs with the
  `popularity-scores` no-arg case in `discovery.spec.ts`. The
  spec parametrises the route's two query parameters: the
  `limit` parameter (`Number.parseInt`-ed with default `6`,
  `Math.min(Math.max(value, 1), 50)`-clamped, `Number.isFinite`
  fallback to default for `NaN`) across the [1, 50] valid range,
  beyond the upper clamp (`51`, `999`, `10000`), below the lower
  clamp (`0`, `-5`), non-numeric / empty (`abc`, `NaN`, empty
  string), float (`6.5`, `49.9`), and leading-whitespace / `+`
  sign (`%2010`, `%2B10`) cases that exercise every branch of
  `Number.parseInt` + clamp + finiteness fallback; and the
  `includeExpired` parameter (strict `=== 'true'` check) across
  the literal `'true'` flip and every other value that keeps the
  default-on path (`'false'`, `'1'`, `'0'`, empty, `'TRUE'`).
  Combined `limit` + `includeExpired` cases verify the two
  parameters stay independent. Status `< 500` is the only
  asserted contract — the route has two distinct success
  branches (DB-available query vs.
  `checkDatabaseAvailability()`-short-circuit /
  `getTenantId() === null`-short-circuit, both legitimately
  returning `200 OK` with different payloads) plus a
  catch-and-empty fallback, and asserting on the body would
  pin the spec to a single branch and break under the others.

- `docs/plugins` Added `providers.md` — the parallel **per-export
  capability-provider reference** that pairs with [`packages/plugin-sdk/src/providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts)
  exactly the way `manifest.md` pairs with `manifest.ts`,
  `capabilities.md` pairs with `capabilities.ts`, `slots.md` pairs
  with `slots.ts`, `loader.md` pairs with `loader.ts`, `registry.md`
  pairs with `registry.ts`, `slot-host.md` pairs with `SlotHost.tsx`,
  `testing.md` pairs with `testing.ts`, and `plugin.md` pairs with
  `plugin.ts`. The page is one section per public export of
  `providers.ts`: each of the nine concrete provider interfaces
  ([`AuthProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#authprovider),
  [`PaymentProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#paymentprovider),
  [`AnalyticsProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#analyticsprovider),
  [`SearchProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#searchprovider),
  [`ContentSource`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#contentsource),
  [`MapsProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#mapsprovider),
  [`NewsletterProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#newsletterprovider),
  [`NotificationsProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#notificationsprovider),
  [`AIProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#aiprovider))
  with one sub-section per member documenting its type, nullability,
  and per-member type-system notes (the `(string & {})`
  literal-with-fallback trick on `PaymentProvider.id` that keeps the
  union open without giving up autocomplete on the three built-in
  literals; the `Promise<unknown[]>` widening contract on
  `SearchProvider.search` that defers `Item`-shape assertion to the
  host; the `Promise<unknown | undefined>` absent-vs-error
  distinction on `ContentSource.getItem` where `unknown` is success,
  `undefined` is 404, and a thrown error is the third case; the
  `void | Promise<void>` sync-or-async pattern on optional hooks
  that lets a synchronous backend declare without an `async`
  wrapper; the `{ ok; reason? }` result envelope on
  `NewsletterProvider` that surfaces provider-specific failures as
  data so the host renders them without a try/catch on the request
  path; the `markRead(string[])` batch-baked-into-the-type contract
  on `NotificationsProvider`; the deliberately-minimal v1
  `AIProvider.complete` shape that a future
  `AIProvider<TStream extends boolean = false>` extension can grow
  without breaking), the [`CapabilityProviderMap`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#capabilityprovidermap)
  mapped type that binds every member of `Capability` to its
  provider interface and types
  [`PluginRegistry.get<C>`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/registry.md#getcapability--single-provider-lookup)
  /
  [`list<C>`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/registry.md#listcapability--enumerate-providers-by-capability)
  / [`PluginProviders`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/plugin.md#pluginproviders)
  generically including the `'ui-slot' = never` lockout that turns
  any `providers: { 'ui-slot': anything }` attempt into a
  TypeScript compile error and the `[K in Capability]?: K extends keyof CapabilityProviderMap ? CapabilityProviderMap[K] : never;`
  mapped-type expression that catches an unknown-capability key the
  same way; the read / write surface that maps every caller (plugin
  author, [`defineDirectoryPlugin`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/plugin.md#definedirectoryplugin),
  [`PluginRegistry.register`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/registry.md#registerplugin-validatedconfig-opts--add-a-plugin),
  [`get<C>`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/registry.md#getcapability--single-provider-lookup),
  [`list<C>`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/registry.md#listcapability--enumerate-providers-by-capability),
  [`<SlotHost />`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/slot-host.md),
  host code under `apps/web/lib/<capability>/**`) to the fields
  they touch and which calls are async; and a nine-row **failure
  matrix** that maps every observable failure mode (missing required
  interface member, extra unknown member excess-property check,
  `'ui-slot'` provider attempt as a TypeScript compile error,
  provider attached for an undeclared capability as the same
  compile-time category error via the `[K in Capability]?: …`
  mapped type, `setup` throw routed to
  `LoadPluginsResult.rejected[name].reason: 'setup'`, fan-out
  `forward` throw swallowed by the host wrapper, single-lookup
  throw propagated through normal `try/catch`, runtime malformed
  shape caught by the host's per-call re-narrowing, two enabled
  plugins on the same single-lookup capability resolved as
  "first-registered wins") onto the layer that surfaces it. The
  page bookends [Spec 002](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)'s
  per-source-file SDK reference set so every public export of
  every `packages/plugin-sdk/**` and `packages/plugin-runtime/**`
  source file now has a paired `docs/plugins/<file>.md` page with
  the same `> When the SDK adds, removes, or renames an export
update **this** page in the same change` anti-drift contract.
  Cross-linked from [`docs/plugins/plugin.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/plugin.md),
  [`docs/plugins/capabilities.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/capabilities.md),
  [`docs/plugins/manifest.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/manifest.md),
  [`docs/plugins/registry.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/registry.md),
  [`docs/plugins/loader.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/loader.md),
  [`docs/plugins/slots.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/slots.md),
  [`docs/plugins/slot-host.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/slot-host.md),
  [`docs/plugins/testing.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/testing.md),
  [`docs/plugins/lifecycle.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/lifecycle.md),
  [`docs/plugins/authoring-a-plugin.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/authoring-a-plugin.md),
  [`docs/plugins/testing-a-plugin.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/testing-a-plugin.md),
  [`docs/plugins/packages.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/packages.md),
  and [`docs/index.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/index.md);
  the parallel page [`docs/plugins/capabilities.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/capabilities.md)
  retains the **runtime contract** angle (lookup style, fan-out vs.
  single, dispatch order) while this new page owns the
  **TypeScript shape** angle (per-member type-system notes, the
  `CapabilityProviderMap` mapped-type expression, and the
  compile-time failure modes), and the two pages cross-link to make
  the split explicit so a reader implementing a provider knows to
  read this one and a reader deciding which capability to declare
  knows to read the other.
- `spec-002` Updated [`docs/spec/002-plugin-architecture/tasks.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)'s
  T-010 to enumerate `docs/plugins/providers.md` alongside the other
  thirteen `docs/plugins/**` pages and to document the same
  anti-drift / per-member / read-write / failure-matrix
  cross-reference contract this new page satisfies — completing
  the per-source-file SDK doc set so every `packages/plugin-sdk/**`
  and `packages/plugin-runtime/**` source file is paired with
  exactly one `docs/plugins/<file>.md` reference under Spec 002.
- `apps/web-e2e` Added `tests/api/items-export-query.spec.ts` —
  ten cases that exercise the **query-param surface** of
  [`apps/web/app/api/items/export/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/export/route.ts)
  (the Zod-validated `format` enum
  [`exportQuerySchema`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/lib/validations/item-import.ts):
  both valid values `csv` / `xlsx`, the empty-string rejection,
  the unknown-value rejections, the case-sensitivity check, and
  the unknown-extra-key passthrough). Complements the single
  happy-path entry already smoked in `discovery.spec.ts` so a
  regression in the schema, the default-on-omit fallback, the
  rate-limit short-circuit, or the `getExportEnabled()`
  feature-flag gate surfaces as a failing case rather than a
  silent change in export behaviour. No-5xx contract; payload
  shape and `Content-Type` are intentionally not asserted because
  the response is either a 403 / 4xx JSON envelope or a binary
  CSV / XLSX stream depending on whether the export feature flag
  is on for the active config repository.
- `docs/plugins` Added `plugin.md` — the parallel **per-export
  plugin definition reference** that pairs with [`packages/plugin-sdk/src/plugin.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/plugin.ts)
  exactly the way `manifest.md` pairs with `manifest.ts`,
  `capabilities.md` pairs with `capabilities.ts`, `slots.md` pairs
  with `slots.ts`, `loader.md` pairs with `loader.ts`, `registry.md`
  pairs with `registry.ts`, `slot-host.md` pairs with `SlotHost.tsx`,
  and `testing.md` pairs with `testing.ts`. The page is one section
  per public export of `plugin.ts`: the
  [`defineDirectoryPlugin`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/plugin.md#definedirectoryplugin)
  factory (and its **inference-only** semantics — the function
  returns its argument unchanged and never validates / mutates
  anything; validation is the loader's job and registration is the
  registry's job), the `DirectoryPlugin<C>` interface (with
  per-field sub-sections for `manifest`, `setup`, `teardown`,
  `slots`, `providers` that document the runtime contract for each
  hook including the silent-rejection / propagated-throw
  distinctions, the "where it runs" / "use it for" / "do not use it
  for" / "what happens if it throws" framing established by the
  earlier per-source-file references), the `PluginContext<TConfig>`
  runtime context (one sub-section per field — `config`, `name`,
  `enabled`, optional `logger` — including the always-`true`
  invariant for `enabled` inside `setup`, the explicit "where
  `config` comes from" three-step trace through
  `mergeConfigSources` → Zod parse → `ctx.config`, and the
  `console`-vs-`ctx.logger` guidance), the `SlotComponentProps<TConfig>`
  slot-component contract (single `ctx` field, no extra props from
  `<SlotHost />`, request-scoped data via `headers()` /
  `cookies()` / context providers above the host), and the
  `PluginProviders` and `PluginSlots<TConfig>` typed maps (mapped-type
  internals including the `'ui-slot' = never` lockout that catches
  `providers: { 'ui-slot': anything }` at compile time and the
  `Partial<Record<SlotId, ...>>` shape that catches unknown slot
  ids the same way). The page also documents a nine-row **failure
  matrix** that lists every observable failure mode in the loader /
  registry / `<SlotHost />` layers a plugin returns into
  (hand-rolled plugin loses `C` inference at the TypeScript layer,
  duplicate `name` is the only manifest-level propagated throw via
  `register`, `manifest.config` rejection routes through
  `LoadPluginsResult.rejected[name].reason: 'config'` silently,
  invalid / unmatched `templateRange` routes the same way with
  `reason: 'templateRange'`, throwing `setup` is plugin-local with
  `reason: 'setup'`, throwing `teardown` is swallowed by `disable`,
  slot-component throw bubbles through React, and the two
  TypeScript-only failures — `'ui-slot'` provider attempt and
  unknown `SlotId` — are caught at compile time), a **read / write
  surface summary** that mirrors the `manifest.md` and `registry.md`
  tables and maps every caller (plugin author, `loadPlugins`,
  `PluginRegistry.register`, `PluginRegistry.disable`, `<SlotHost />`,
  `createTestRegistry`, slot components) to the fields they touch,
  three worked examples (minimal `defineDirectoryPlugin` call, a
  `setup` hook reading the typed `ctx.config`, a slot component
  reading `props.ctx`), and a five-step "how to add a new plugin
  field" checklist that mirrors the patterns established in
  `capabilities.md`, `slots.md`, `loader.md`, `registry.md`,
  `slot-host.md`, `testing.md`, and `manifest.md` — bookending the
  SDK with the same anti-drift contract every per-source-file
  SDK / runtime page now satisfies. Cross-links added in
  `authoring-a-plugin.md`, `lifecycle.md` _See also_,
  `loader.md` _See also_, `registry.md` _See also_,
  `slot-host.md` _See also_, `testing.md` _See also_,
  `testing-a-plugin.md` _See also_, `packages.md` _See also_,
  `capabilities.md` _See also_, `slots.md` _See also_,
  `manifest.md` _See also_, and `docs/index.md`. Spec 002 `T-010`
  task list grew from "eleven pages" to "twelve pages" and adds an
  explicit "doc and SDK cannot drift" verification bullet for the
  new reference (matching the wording added for `capabilities.md`,
  `slots.md`, `loader.md`, `registry.md`, `slot-host.md`,
  `testing.md`, and `manifest.md`).
- `apps/web-e2e` Added `api/items-popularity-scores.spec.ts`
  (15 cases) closing the **query-param surface** of the public
  `GET /api/items/popularity-scores` debug endpoint served by
  [`apps/web/app/api/items/popularity-scores/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/popularity-scores/route.ts).
  The single happy-path entry (`/api/items/popularity-scores` with
  no query) was already smoked by `discovery.spec.ts`; this spec
  exercises the route's `parseInt` + `Math.min(value, 100)` clamp
  on `limit` (valid integers `5` / `20`, beyond-clamp values
  `999` / `10000`, empty string falling back to the `'20'` default,
  non-integer `abc`, negative `-5`, zero, plus combined
  `limit=200&locale=de`) and the `locale` default / unknown-locale
  fallback (`en`, `fr`, `zh`, `__no_such_locale__`) so a regression
  in the route's parameter parsing surfaces as a failing case
  rather than a silent change in scoring output. Same conservative
  no-5xx contract as the rest of the smoke layer — payload shape
  is intentionally not asserted because the score breakdown varies
  with the active data repository / database state.
  `E2E-TESTS.md` updated with the entry and the
  continual-improvement total annotation (~292 → ~307 across
  47 → 48 spec files).
- `docs/plugins` Added `manifest.md` — the parallel **per-field
  manifest reference** that pairs with [`packages/plugin-sdk/src/manifest.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/manifest.ts)
  exactly the way `registry.md` pairs with `registry.ts`,
  `loader.md` pairs with `loader.ts`, `slot-host.md` pairs with
  `SlotHost.tsx`, and `testing.md` pairs with `testing.ts`. The
  page is one section per field (`name`, `version`, `description`,
  `templateRange`, `capabilities`, `config`, `defaultEnabled`,
  `adminToggleable`, `homepage`) plus an eight-row **failure
  matrix** covering every observable manifest-level outcome
  (duplicate `name` → the only propagated throw, invalid semver
  in `templateRange` → silent rejection with reason
  `templateRange`, mismatched `templateRange` → same, empty
  `capabilities` → empty `list<C>` index, Zod-rejected `config`
  → silent rejection with reason `config`, `defaultEnabled` vs
  DB row → DB wins, `adminToggleable: false` vs programmatic
  `disable` → mutation succeeds (UI hint, not authz),
  non-URL `homepage` → not validated). It documents the
  `PluginManifest<C>` interface, the `PluginConfig<C>` type alias
  the SDK ships, the registry / loader / `<SlotHost />` reads
  every field powers (`manifest.name` → React key, registry
  primary key, `plugin_settings` row id; `manifest.capabilities`
  → registry `list<C>` index; `manifest.config` →
  `loadPlugins` Zod gate; `manifest.templateRange` → boot-time
  semver compatibility check), and the **rename-is-a-breaking-change**
  contract that previously lived only in source comments. The
  page closes with a five-step "how to add a new manifest field"
  checklist that mirrors the patterns established in
  `capabilities.md`, `slots.md`, `loader.md`, `registry.md`,
  `slot-host.md`, and `testing.md` — bookending the surface so
  every per-source-file SDK / runtime page is now covered by a
  matching anti-drift reference. Cross-links added in
  `authoring-a-plugin.md`, `lifecycle.md`, `loader.md`,
  `registry.md`, `slot-host.md`, `testing.md`, `testing-a-plugin.md`,
  `capabilities.md`, `slots.md`, `packages.md`, and
  `docs/index.md`. Spec 002 `T-010` task list grew from "ten
  pages" to "eleven pages" and adds an explicit
  "doc and SDK cannot drift" verification bullet for the new
  reference (matching the wording added for `capabilities.md`,
  `slots.md`, `loader.md`, `registry.md`, `slot-host.md`, and
  `testing.md`).
- `apps/web-e2e` Added `api/client-item-restore.spec.ts` (1 case)
  closing the last `/api/client/**` per-id surface that was
  previously implicit rather than explicit:
  `POST /api/client/items/[id]/restore`, the soft-delete restore
  action served by
  [`apps/web/app/api/client/items/[id]/restore/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/%5Bid%5D/restore/route.ts).
  The matching CRUD surface (`GET / PATCH / DELETE /api/client/items/[id]`)
  is already smoked via `client-protected.spec.ts`; this spec closes
  the per-id action sub-route. Same conservative no-5xx pattern as
  the rest of the smoke layer — uses an intentionally non-existent
  UUID so the spec never depends on data-repository content.
  `E2E-TESTS.md` updated with the entry and the
  continual-improvement total annotation (~291 → ~292 across
  46 → 47 spec files).
- `apps/web-e2e` Added `api/nextauth-discovery.spec.ts` (9 cases)
  closing the NextAuth catch-all (`/api/auth/[...nextauth]`) public
  discovery surface: GET `providers`, `csrf`, `session`, `signin`,
  `signout`, `error` plus POST `signout` (no CSRF), POST
  `callback/credentials` (empty body), and GET
  `callback/<unknown-provider>` — no-5xx contract for every entry.
  Closes the last NextAuth-managed surface that was implicit rather
  than explicit (the custom `/api/auth/change-password` helper sits
  in `auth-change-password.spec.ts`). Also added
  `public/seo-manifests.spec.ts` (4 cases) for the public SEO /
  manifest surface generated by `app/{robots,sitemap,opengraph-image}.{ts,tsx}`
  and the static favicon: `/robots.txt` (with `User-agent` content
  sanity check), `/sitemap.xml` (XML prolog sanity check),
  `/opengraph-image`, `/favicon.ico` — no-5xx contract. Same
  conservative pattern as the rest of the smoke layer so the specs
  stay valid across local / CI environments. `E2E-TESTS.md` updated
  with both entries and the continual-improvement total annotation.
- `docs/plugins` Added `testing.md` — the parallel **per-helper
  testing reference** that pairs with [`packages/plugin-runtime/src/testing.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/testing.ts)
  exactly the way `registry.md` pairs with `registry.ts`,
  `loader.md` pairs with `loader.ts`, and `slot-host.md` pairs with
  `SlotHost.tsx`. The page is one section per helper
  (`createTestRegistry({ plugins })` is the only one in v1) plus a
  six-row **failure matrix** covering every observable outcome
  (Zod-rejected schema → silent drop, throwing `setup` → loader
  records as rejected but helper still resolves, duplicate-name →
  the **only** propagated throw out of the helper, empty-array →
  empty registry no-op, `defaultEnabled: false` → registered but
  not enabled, slot component throws on render → bubbles through
  React when `<SlotHost />` calls it). It documents the four
  things `createTestRegistry` does in order
  (`new PluginRegistry()` with `persistEnabled` undefined, map each
  plugin to a `{ plugin }` envelope, `await loadPlugins(...)`,
  return the loaded registry) and the **explicit non-goals** that
  previously lived only in source comments — the helper is not a
  registry constructor, not a config harness, not a rejection
  inspector, not a persistence harness, not a render harness, not
  async-cleanup-aware — so test authors can pick the right tool
  the first time. It also documents the **dual import surface**
  (`from '@ever-works/plugin-runtime'` versus `from '@ever-works/plugin-runtime/testing'`)
  declared in the runtime's
  [`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/package.json)
  `exports` map, the **read / write surface summary** that maps
  callers (plugin package unit tests, capability composition tests,
  slot composition tests, admin enable / disable tests,
  config-required plugins, rejection-asserting tests,
  persistence-callback tests) to the methods they're allowed to
  invoke, three worked Vitest examples (happy-path register-and-slot,
  config-required plugin via direct `loadPlugins`, disable-then-empty
  round-trip) — the same three paths that
  `apps/web-e2e/tests/plugins/admin-toggle.spec.ts` and
  `apps/web-e2e/tests/plugins/slots.spec.ts` cover at the
  Playwright layer (per Spec 002 / T-009), and a five-step
  "how to add a new test seam" checklist that mirrors the patterns
  established in `capabilities.md`, `slots.md`, `loader.md`,
  `registry.md`, and `slot-host.md`. Cross-links added in
  `authoring-a-plugin.md`, `lifecycle.md` _See also_,
  `testing-a-plugin.md` _See also_, `packages.md` _See also_,
  `capabilities.md` _See also_, `slots.md` _See also_,
  `loader.md` _See also_, `registry.md` _See also_,
  `slot-host.md` _See also_, and `docs/index.md`. Spec 002 `T-010`
  task list grew from "nine pages" to "ten pages" and adds an
  explicit "doc and runtime cannot drift" verification bullet for
  the new reference (matching the wording added for
  `capabilities.md`, `slots.md`, `loader.md`, `registry.md`, and
  `slot-host.md`).
- `docs/plugins` Added `slot-host.md` — the parallel **per-component
  SlotHost reference** that pairs with [`packages/plugin-runtime/src/SlotHost.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/SlotHost.tsx)
  exactly the way `registry.md` pairs with `registry.ts` and
  `loader.md` pairs with `loader.ts`. The page is one section per
  prop (`slotId`, `registry`, `fallback?`) plus a six-row
  **failure matrix** covering every observable outcome (no
  contributors, all contributors disabled, one or more enabled
  contributors, contributed component throws, duplicate plugin name
  — already caught one level up by `PluginRegistry.register`,
  unknown `slotId` typed through `any`). It documents the four
  things `<SlotHost />` does in order (call `slotsFor`, fall back
  to `fallback ?? null` on empty, wrap each contribution in a
  Fragment keyed by `pluginName`, return with no extra DOM wrapper)
  and the **server-friendliness contract** that previously lived
  only in source comments — no `"use client"`, no client-only
  hooks, no `react-dom` import, only a synchronous registry read —
  which means a layout that uses `<SlotHost />` stays a server
  component even when its contributed slot components opt into
  client rendering. It also documents the **anti-patterns** (the
  host is not a wrapper element, not a client component, not a
  reactivity boundary, not an error-boundary, not a way to pass
  extra props to slot components) so layout authors do not have to
  read the source to rule them out. Three worked Vitest examples
  cover the happy-path render, the empty-fallback path, and the
  disable-then-empty round-trip — the same three paths that
  `apps/web-e2e/tests/plugins/slots.spec.ts` covers at the
  Playwright layer (per Spec 002 / T-009). The page also documents
  the dual import surface (`from '@ever-works/plugin-runtime'`
  versus `from '@ever-works/plugin-runtime/SlotHost'`) and a
  five-step "how to add a new prop" checklist that mirrors the
  patterns established in `capabilities.md`, `slots.md`,
  `loader.md`, and `registry.md`. Cross-links added in
  `authoring-a-plugin.md`, `lifecycle.md` _See also_,
  `testing-a-plugin.md` _See also_, `packages.md` _See also_,
  `capabilities.md` _See also_, `slots.md` _See also_,
  `loader.md` _See also_, `registry.md` _See also_, and
  `docs/index.md`. Spec 002 `T-010` task list grew from "eight
  pages" to "nine pages" and adds an explicit "doc and runtime
  cannot drift" verification bullet for the new reference
  (matching the wording added for `capabilities.md`, `slots.md`,
  `loader.md`, and `registry.md`).
- `docs/plugins` Added `registry.md` — the parallel **per-API
  registry reference** that pairs with [`packages/plugin-runtime/src/registry.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/registry.ts)
  exactly the way `loader.md` pairs with `loader.ts`. One section
  per public method (`new PluginRegistry({ persistEnabled? })`,
  `register`, `isEnabled`, `isRegistered`, `enable`, `disable`,
  `get<C>`, `list<C>`, `slotsFor`, `list_all`) with the full
  TypeScript signature, the throws / no-throws contract, and the
  precise idempotence rules (`enable` on an already-enabled plugin
  is a no-op and **does not** invoke the persistence callback;
  `disable` on an already-disabled plugin **does not** invoke
  `teardown`). The page includes a **read / write surface
  summary** that maps callers (layouts / capability code / admin
  UI / boot / tests) to the methods they're allowed to invoke,
  plus an explicit eight-row failure matrix covering the throwing
  outcomes (duplicate-name on `register`, unregistered name on
  `enable` / `disable`), the silent outcomes (already-enabled,
  already-disabled, unknown capability returning
  `undefined` / `[]`, empty `slotsFor`), and the propagating
  outcomes (throwing `persistEnabled`, throwing `teardown` —
  including the "stays disabled in memory" semantics that allow
  safe retries). Two worked Vitest examples cover the
  disable-then-`slotsFor`-empty round-trip and the duplicate-name
  throw. The page also documents the `defaultEnabled` precedence
  (`opts?.enabled ?? plugin.manifest.defaultEnabled ?? true`) and
  the rationale for the underscore-cased `list_all` name — both
  facts that previously lived only in the source comments.
  Cross-links added in `authoring-a-plugin.md`, `lifecycle.md`
  _See also_, `testing-a-plugin.md` _See also_, `packages.md`
  _See also_, `capabilities.md` _See also_, `slots.md` _See
  also_, `loader.md` _See also_, and `docs/index.md`. Spec 002
  `T-010` task list grew from "seven pages" to "eight pages" and
  adds an explicit "doc and runtime cannot drift" verification
  bullet for the new reference (matching the wording added for
  `capabilities.md`, `slots.md`, and `loader.md`).
- `docs/plugins` Added `loader.md` — the parallel **per-API loader
  reference** that pairs with [`packages/plugin-runtime/src/loader.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/loader.ts)
  exactly the way `capabilities.md` pairs with `providers.ts` and
  `slots.md` pairs with `slots.ts`. One section per export
  (`loadPlugins`, `mergeConfigSources`, `PluginConfigSources`,
  `LoadPluginsResult`) with the full TypeScript signature, the
  precedence rule (`env ⊆ db ⊆ override`), and an explicit
  six-row failure matrix covering the five outcomes
  ("config passes Zod", "config fails Zod", "setup throws",
  "`enabled: false` + valid config", "duplicate plugin name", "empty
  plugins array") that previously lived only in the source comments.
  The page also includes a worked Vitest example that calls
  `loadPlugins` directly to verify override precedence and the
  validation-failure path, plus a five-step "how to add a new loader
  feature" checklist that mirrors the patterns established in
  `capabilities.md` and `slots.md`. Plugin authors and host-app
  integrators previously had to read the loader source to discover
  that a plugin whose `setup()` throws appears in **both**
  `registered` and `rejected`, that the merge is intentionally
  shallow (not deep), and that the loader does not abort on failure;
  that information now lives in one place. Cross-links added in
  `authoring-a-plugin.md`, `lifecycle.md` _See also_,
  `testing-a-plugin.md` _See also_, `packages.md` _See also_,
  `capabilities.md` _See also_, `slots.md` _See also_, and
  `docs/index.md`. Spec 002 `T-010` task list grew from "six pages"
  to "seven pages" and adds an explicit "doc and runtime cannot
  drift" verification bullet for the new reference (matching the
  wording added for `capabilities.md` and `slots.md`).
- `docs/plugins` Added `slots.md` — the parallel **per-slot reference**
  that pairs with [`packages/plugin-sdk/src/slots.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/slots.ts)
  exactly the way `capabilities.md` pairs with `providers.ts`. One
  section per canonical slot id (`header.left`, `header.right`,
  `footer.center`, `home.before-listing`, `home.after-listing`,
  `item.detail.sidebar`, `item.detail.actions`,
  `item.detail.afterFooter`, `admin.layout.header.right`,
  `admin.settings.section`, `admin.dashboard.widgets`,
  `admin.items.row.actions`, `admin.items.toolbar`,
  `client.dashboard.widgets`, `client.settings.section`) with the
  layout it renders into, the intended use case, and any composition
  caveats. Top of the page documents the `{ ctx }` component contract
  (props are fixed; render an accessible region; keep server-friendly;
  localise via `next-intl`), the composition rules
  (registration-order, multi-contributor support, immediate disable,
  `fallback` semantics, fragment-only host), and a five-step "how to
  add a new slot" checklist. Cross-links added in the architecture
  page (Slots table now points at this reference as the source of
  truth), `authoring-a-plugin.md`, `lifecycle.md`,
  `testing-a-plugin.md`, `capabilities.md`, `packages.md`, and
  `docs/index.md`. Spec 002 `T-010` task list grew from "five pages"
  to "six pages" and adds an explicit "doc and SDK cannot drift"
  verification bullet for the new reference (matching the wording
  added for `capabilities.md`).
- `docs/plugins` Added `capabilities.md` — the missing **per-capability
  reference** that pairs with [`packages/plugin-sdk/src/providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts).
  One section per canonical capability (`auth`, `payment`, `analytics`,
  `search`, `content-source`, `maps`, `newsletter`, `notifications`,
  `ai`, `ui-slot`) with the full TypeScript interface, the lookup
  style (single-provider via `registry.get` vs fan-out via
  `registry.list`), the rules the runtime applies when two enabled
  plugins declare the same capability, and a five-step "how to add a
  new capability" checklist that mirrors Spec 002. Plugin authors
  previously had to read the SDK source to discover that
  `analytics` / `newsletter` / `notifications` are fan-out and that
  `auth` / `payment` / `search` / `content-source` / `maps` / `ai`
  are single-lookup; that information now lives in one place. Cross-links
  added in the architecture page (`Capabilities` table now points at
  this reference as the source of truth), `authoring-a-plugin.md`
  _See also_, `lifecycle.md` _See also_, `testing-a-plugin.md`
  _See also_, `packages.md` _See also_, and `docs/index.md`.
  Spec 002 `T-010` task list grew from "four pages" to "five pages"
  and adds an explicit "doc and SDK cannot drift" verification
  bullet for the new reference.
- `apps/web-e2e` Added `public/per-survey-public.spec.ts` (1 — `GET
/surveys/[slug]` with an unknown slug; exercises the
  `notFound()` / disabled-feature branch with the same non-5xx
  contract as the rest of the smoke layer. Closes the last
  public-survey page surface that was implicit rather than explicit;
  the listing page is already covered by `public/surveys.spec.ts`,
  the dashboard owner flow by `public/dashboard-surveys-protected.spec.ts`,
  the admin per-slug pages by `public/admin-by-id-pages-protected.spec.ts`,
  and the REST surface by `api/surveys.spec.ts`). `E2E-TESTS.md`
  updated with the new entry and the continual-improvement headline
  total annotation (now ~278 tests across 44 spec files).
- `docs/plugins` Added `testing-a-plugin.md` (~6 KB) — author-facing
  guide that pairs with the existing `authoring-a-plugin.md`. It
  documents the four-layer test pyramid for plugins
  (manifest/Zod schema, registry round-trip via
  `createTestRegistry`, slot rendering through `<SlotHost />`, and
  Playwright smoke specs), an explicit _what not to do_ list (don't
  mock `PluginRegistry`, don't reach into `apps/web/**`, don't
  assert on translatable copy), and an "override" recipe for
  schemas with non-default required fields. Each example imports
  from the published runtime exports
  (`@ever-works/plugin-runtime/testing`,
  `@ever-works/plugin-runtime/SlotHost`,
  `@ever-works/plugin-runtime`), so the doc and
  [`packages/plugin-runtime/src/testing.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/testing.ts)
  / [`SlotHost.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/SlotHost.tsx)
  cannot drift. Cross-links added in `authoring-a-plugin.md`
  (replaces the inline "Add a Playwright spec" snippet with a
  pointer to the dedicated guide and the original Playwright
  example), `packages.md` _See also_ section, and `lifecycle.md`
  _See also_ section. `docs/index.md` now lists three plugin
  guides under the spec-driven pointers — `Authoring a Plugin`,
  the previously-unlinked `Plugin Lifecycle`, and the new
  `Testing a Plugin`. Spec 002 `tasks.md` `T-010` task list grew
  from "three new pages" to the four canonical
  `docs/plugins/**` pages and now includes
  `docs/plugins/packages.md` + `docs/plugins/testing-a-plugin.md`,
  with an explicit "doc and runtime cannot drift" verification
  bullet.
- `docs/architecture` `plugin-system.md` status block updated from
  _proposed_ to _in-progress_ (Phase A scaffolding shipped in commit
  `8b68d29a`); the "two packages" section now reads "three packages"
  to include the existing `@ever-works/plugin-demo` reference plugin
  (with a note that it is not part of the runtime contract). The
  Slots table was extended from 9 rows to the full 15 canonical slot
  ids (`home.after-listing`, `item.detail.actions`,
  `admin.layout.header.right`, `admin.items.row.actions`,
  `admin.items.toolbar`, `client.settings.section`) and now points
  readers at [`packages/plugin-sdk/src/slots.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/slots.ts)
  as the authoritative source so the doc and the SDK can never drift
  again.
- `apps/web-e2e` Added `api/item-company-write.spec.ts` (2 — `POST`
  and `DELETE` `/api/items/[slug]/company` for a non-existent slug;
  the matching `GET` is already covered in
  `payment-protected.spec.ts` line 37, but the **write** surfaces of
  the per-item admin company-assignment route were not explicitly
  smoke-tested. Same no-5xx contract as the rest of the smoke layer
  — anonymous callers must receive a 4xx, never a 5xx).
  `E2E-TESTS.md` updated with the new entry.
- `spec-018` Added `018-performance-budget` (proposed): full
  spec/plan/tasks trio that converts Article V of the constitution
  into a measurable, CI-enforced contract — per-route gzip first-load
  JS budget, a `pnpm perf:bundle` script, a Lighthouse CI workflow,
  and a maintainer-facing dashboard page. Two PRs are scoped: PR 1
  (bundle gate + docs) and PR 2 (Lighthouse CI). Two open questions
  recorded in `docs/questions.md` (Q-018a Lighthouse trigger
  surface; Q-018b budget file location). No code yet — this entry
  only adds the docs/spec scaffolding so future work stops "Article
  V is aspirational" being a true statement.
- `spec-017` Status flipped from _in-progress_ to **shipped** in
  the spec index and in [`spec.md`](spec/017-map-view/spec.md). All
  T-001..T-009 tasks landed in commit `fe808cc3` (`feat: more on
maps`) on the `develop` branch — sidebar + dedicated `/map`
  route + header nav link + e2e coverage are live. Follow-up
  enhancements (sidebar virtualisation, mini-map embed on
  item-detail) tracked as separate iterations.
- `questions` Added `Q-018a` (Lighthouse trigger surface) and
  `Q-018b` (perf budget file location) under the new Spec 018
  section.
- `spec-017` Added `017-map-view` (proposed → implemented in this PR):
  spec/plan/tasks for the listing map view + dedicated `/map` route +
  header `Map` nav link gated on `settings.header.map_enabled`. Adds
  `MapSidebar`, extends `LayoutMap` with marker↔card sync and
  auto-fit bounds, adds `apps/web-e2e/tests/public/map.spec.ts` and
  `docs/features/map-view.md`. No new dependencies.
- `index` Added a Maps & Location bullet to `docs/index.md` Key
  Features that links to the new feature page.
- `docs/features` `maps-location.md` and `guides/map-integration-guide.md`
  now cross-link to the Map View feature page and Spec 017.
- `README` Root `README.md` Tech Stack now mentions Mapbox GL JS /
  Google Maps and a new "Maps & Location" section documents the
  Map view config, env vars, and YAML location example.
- `apps/web-e2e` Added two more smoke spec files closing the last
  notable per-slug surfaces that were not yet explicitly covered:
  `public/per-slug-public.spec.ts` (3 — `/comparisons/[slug]`,
  `/categories/[category]`, `/tags/[tag]` per-slug detail pages with
  an intentionally unknown slug; exercises each page's `notFound()`
  / disabled-feature branch with the same non-5xx contract used
  elsewhere in the smoke layer; complements the legacy `(listing)`
  versions in `public/legacy-routing.spec.ts`) and
  `api/item-comment-rating-by-id.spec.ts` (2 — `GET` and `PATCH` of
  `/api/items/[slug]/comments/rating/[commentId]` for a non-existent
  comment id; closes the last `/api/items/[slug]/**` per-comment
  route that was not explicitly smoke-tested — sibling routes
  `/api/items/[slug]/comments/rating` and `.../comments/[commentId]`
  are already covered by `api/item-public.spec.ts` and
  `api/items-engagement-and-favorites.spec.ts`). Same no-5xx contract
  as the rest of the smoke layer. `E2E-TESTS.md` updated with both
  entries and the continual-improvement headline total annotation
  (now ~277 tests across 43 spec files).

## 2026-04-30

- `apps/web-e2e` Added `api/item-votes-public.spec.ts` (2 — public
  `GET /api/items/[slug]/votes` non-existent-slug contract: no-5xx
  status plus a non-error JSON envelope when the body parses). This
  closes the last public per-item GET surface that was implicit
  rather than explicit (the `/votes/count` route is its sibling and
  was already covered by `api/item-public.spec.ts`; the auth-gated
  `/votes` POST/DELETE and `/votes/status` GET sit in
  `items-engagement-and-favorites.spec.ts` and
  `payment-protected.spec.ts` respectively). Same no-5xx contract as
  the rest of the smoke layer. `E2E-TESTS.md` updated with the new
  entry and the continual-improvement headline total annotation.
- `spec-001` Added retroactive `plan.md` and `tasks.md` so the
  monorepo-conversion spec now carries the full Spec Kit
  spec → plan → tasks trio. Both files state up front that they are
  retroactive and defer to the originals under
  `docs/plans/2026-03-08-monorepo-conversion*` for historical
  sequencing per Article VIII of the constitution. The spec index
  (`docs/spec/README.md`) gained inline `(plan, tasks)` links on the
  001 row and a clarifying line in _Conventions_ explaining when a
  retroactive trio is reconstructed for parity.
- `apps/web-e2e` Added three more smoke spec files closing the
  remaining admin-by-id and client / page-by-id gaps not covered by
  the earlier collection-level specs:
  `api/admin-by-id.spec.ts` (47 — admin per-`[id]` REST routes
  across categories, clients, collections (+ items helper), comments,
  companies, featured-items, items (+ history / review / full
  import), notifications read receipt, reports, roles (+ permissions
  sub-route), sponsor-ads (+ approve / cancel / reject), tags, users - settings POST), `api/items-engagement-and-favorites.spec.ts`
  (11 — public `/api/items/engagement` 4 cases including
  missing-slugs, empty-slugs, unknown-slugs, and >200-slugs guard +
  auth-gated comment-by-id PUT / DELETE, vote toggle / clear, and
  favorites GET / POST + `/favorites/[itemSlug]` DELETE),
  `public/admin-by-id-pages-protected.spec.ts` (18 — admin per-id
  page routes `/admin/clients/[id]`, `/admin/surveys/[slug]/{edit,
preview,responses}`, `/admin/auth/signin`, plus `/client/**`
  authenticated owner pages: dashboard, profile/[username],
  settings (basic-info / billing / location / portfolio /
  theme-colors / submissions/trash), security, sponsorships,
  submissions, submissions/trash). Same no-5xx contract as the rest
  of the smoke layer. `E2E-TESTS.md` updated with all three entries
  and the continual-improvement headline total annotation.
- `apps/web-e2e` Added five more page-route smoke specs closing the
  remaining gaps in the public + protected page surface:
  `public/pricing-success.spec.ts` (2 — `/pricing/success` with and
  without checkout query params), `public/listing-paginated.spec.ts`
  (6 — `/discover/[page]` with a high page number,
  `/collections/paging[/page]`, `/tags/paging[/page]`),
  `public/legacy-routing.spec.ts` (5 — legacy nested catch-alls
  `/categories/category/[...categorie]`, `/tags/tag/[...tags]`, and
  the `(listing)` group's `/tags/[...tag]`),
  `public/item-survey-public.spec.ts` (2 — public per-item survey
  response page `/items/[slug]/surveys/[surveySlug]` for unknown
  slugs), `public/dashboard-surveys-protected.spec.ts` (3 — owner
  flow `/dashboard/items/[itemId]/surveys[/preview|/responses]`
  redirect-or-404 contract). Same no-5xx contract as the rest of the
  smoke layer. `E2E-TESTS.md` updated with all five entries and the
  continual-improvement headline total annotation.
- `apps/web-e2e` Added eleven more smoke specs closing the largest
  remaining coverage gaps: `api/admin-protected-extra.spec.ts` (36
  admin-only endpoints across every slice — categories `all`/`git`/
  `reorder`, clients `dashboard`/`stats`/`advanced-search`/`bulk`,
  collections, comments, companies, featured-items, geo-analytics,
  items `stats`/`bulk`/`export`/`export/sample`/`import/validate`,
  location-index, navigation, notifications `mark-all-read`,
  reports `list`/`stats`, roles `list`/`active`/`stats`, settings
  `list`/`map-status`, sponsor-ads, tags `list`/`all`, twenty-crm
  `config`/`test-connection`, users `check-email`/`check-username`/
  `stats`), `api/client-protected.spec.ts` (8 `/api/client/**`
  endpoints — dashboard `stats`, `geo-stats`, items list /
  `coordinates` / `stats`, import `sample`/`validate`/POST),
  `api/surveys.spec.ts` (8 auth-gated CRUD + per-survey responses - per-response detail), `api/payment-checkouts.spec.ts` (28
  auth-gated checkout / payment-method / setup-intent /
  subscription mutation routes across Stripe, LemonSqueezy, Polar,
  Solidgate + sponsor-ad lifecycle), `api/auth-change-password.spec.ts`
  (2 no-session / empty-body cases), `api/location-coordinates.spec.ts`
  (3 enabled / disabled feature-gate cases),
  `api/user-profile-location.spec.ts` (2 GET + PUT no-session
  cases), `api/reports.spec.ts` (2 no-session / empty-body cases),
  `public/newsletter-unsubscribe.spec.ts` (2 with / without token),
  `public/integration.spec.ts` (3 `/integration/{analytics,posthog,
speed-insights}` showcase pages), and
  `public/admin-pages-protected.spec.ts` (18 `/admin/**` and
  `/dashboard/**` page routes redirect anonymous visitors without
  5xx). Same no-5xx contract as the rest of the smoke layer.
  `E2E-TESTS.md` updated with all eleven entries and the
  continual-improvement headline total annotation.
- `apps/web-e2e` Added six more API smoke spec files closing
  remaining coverage gaps in the public surface:
  `api/feature-existence.spec.ts` (`/api/categories/exists`,
  `/api/collections/exists`, `/api/surveys/exists` with
  `type=item|global`, `/api/items/export/settings`),
  `api/location.spec.ts` (`/api/location/countries`, `/cities`,
  `/search` with no-params / city / country / valid-radius /
  invalid-coords variants — covers both the location-enabled 200/400
  and location-disabled 404 contracts), `api/item-public.spec.ts`
  (public per-item GETs and POSTs against a non-existent slug —
  votes/count, comments listing, comments/rating, views POST,
  unauthenticated comments POST), `api/cron-jobs.spec.ts`
  (`/api/cron/subscription-expiration` and
  `/api/cron/subscription-reminders` with no secret and with a
  wrong secret), `api/stripe-public.spec.ts` (`/api/stripe/products`
  dynamic-pricing gate), and `api/payment-protected.spec.ts` (13
  auth-required user / Stripe / LemonSqueezy / sponsor-ads / payment
  account / per-item company / votes-status surfaces). Same
  no-5xx contract as the rest of the API smoke layer. `E2E-TESTS.md`
  updated with all six entries and the continual-improvement total
  annotation.
- `spec-002` Status moved from _proposed_ to _in-progress_ in the
  spec index now that Phase A (T-001/T-002/T-003 — SDK, runtime, and
  demo plugin scaffolds) has shipped. T-004..T-012 still remain.
- `apps/web-e2e` Added API smoke specs for previously-uncovered
  endpoint surfaces: `api/version.spec.ts` (GET `/api/version`, GET
  and POST on `/api/version/sync`), `api/webhooks.spec.ts` (Stripe,
  LemonSqueezy, Polar, Solidgate webhook GET / unsigned-POST
  contracts — both must be 4xx, never 5xx),
  `api/discovery.spec.ts` (public sponsor-ads, items
  popularity-scores, items export, items/[slug] 404 contract),
  `api/protected.spec.ts` (10 auth-required endpoints across tenant,
  admin, user, client, current-user surfaces — must respond 4xx, not
  5xx, when unauthenticated), and `api/method-guards.spec.ts`
  (POST-only `/api/extract`, `/api/verify-recaptcha`, `/api/geocode`,
  plus `/api/internal/db-init` dev-gate and `/api/cron/sync`
  contract). Each spec only asserts "no 5xx" so it stays valid
  across local / CI environments. `apps/web-e2e/E2E-TESTS.md`
  updated with new entries and the headline total annotation.
- `apps/web-e2e` Added smoke specs for previously-uncovered surfaces:
  `auth/new-verification.spec.ts`, `public/docs.spec.ts`,
  `public/cms-page.spec.ts` (the generic `/pages/[slug]` route),
  `client/billing.spec.ts` (dashboard billing auth + redirect), and
  `api/reference.spec.ts` (Scalar API reference UI + `openapi.json`).
  `apps/web-e2e/E2E-TESTS.md` updated to list each new spec.
- `docs/plugins` Added `packages.md` — a per-package overview of
  `@ever-works/plugin-sdk`, `@ever-works/plugin-runtime`,
  `@ever-works/plugin-demo`. Linked from `docs/index.md`.
- `spec-002` Phase A complete: scaffolded
  [`@ever-works/plugin-sdk`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk),
  [`@ever-works/plugin-runtime`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime),
  and [`@ever-works/plugin-demo`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo)
  per [Spec 002 / T-001..T-003](spec/002-plugin-architecture/tasks.md).
  All three packages typecheck cleanly. No `apps/web` wire-up yet —
  that lands in Phase B (T-004..T-006).
- `spec-006`, `spec-007`, `spec-008`, `spec-009`, `spec-011`,
  `spec-012`, `spec-013`, `spec-014`, `spec-015`, `spec-016` Added
  implementation plans + task lists, completing the Spec Kit trio
  (`spec.md` + `plan.md` + `tasks.md`) for every retroactive feature
  spec from this run. Each plan documents the existing topology and
  the migration path to the plugin architecture (Spec 002).
- `apps/web-e2e` Added smoke specs for previously-uncovered surfaces
  to close gaps in [Spec 010](spec/010-e2e-test-coverage/spec.md):
  `auth/forgot-password.spec.ts`, `auth/new-password.spec.ts`,
  `public/help.spec.ts`, `public/about.spec.ts`,
  `public/comparisons.spec.ts`, `public/sponsor.spec.ts`.
- `spec-003` Added implementation plan + tasks for auth providers,
  documenting the existing topology and the migration path to plugin
  packages once Spec 002 stabilises.
- `spec-004` Added implementation plan + tasks for payment providers
  with the same pattern (current shape + plugin-migration target).
- `spec-005` Added implementation plan + tasks for i18n covering
  message catalogue management, locale switcher, RTL, and Docusaurus
  i18n.
- `spec-016` Added retroactive spec for the typed analytics events
  layer shipped in PR #692, sitting on top of Spec 008.
- `spec-010` Added implementation plan and task list for the e2e
  test coverage spec, including engineering backlog (resilience and
  speed passes).
- `docs/plugins` Added `lifecycle.md` covering boot, validation,
  registration, setup, runtime use, enable/disable/swap, teardown,
  events, versioning, and anti-patterns.
- `claude` Added a "Read first" block to `CLAUDE.md` pointing to
  AGENTS.md, `.specify/`, `docs/spec/`, log, and questions.
- `spec-002` Added Spec Kit feature spec, plan, and tasks for the
  plugin / adapter architecture.
- `spec-001` Added retroactive spec for the monorepo conversion (the
  underlying plan documents in `docs/plans/` are kept untouched per
  Article VIII of the constitution).
- `spec-003`, `spec-004`, `spec-005`, `spec-006`, `spec-007`,
  `spec-008`, `spec-009`, `spec-010`, `spec-011`, `spec-012`,
  `spec-013`, `spec-014`, `spec-015` Added retroactive specs for the
  shipped or in-progress features (auth providers, payment providers,
  i18n, Git CMS, theming, analytics, admin dashboard, e2e test
  coverage, maps, newsletter, notifications, docs translation, Spec
  Kit adoption).
- `constitution` Created `.specify/memory/constitution.md` with ten
  durable principles (Plugin-First, TypeScript-Only, Spec-Before-Code,
  Documentation-First, Performance Budget, Latest Stable Frameworks,
  Reuse Before Build, No Removal Without Migration, Test Coverage
  Bar, Modular Packages).
- `docs/.specify` Added `.specify/README.md`, the constitution, and the
  spec / plan / tasks templates per the [GitHub Spec Kit](https://github.com/github/spec-kit)
  convention.
- `agents` Rewrote `AGENTS.md` to enumerate the cross-cutting rules
  for any AI agent operating in this monorepo (Spec-Driven
  Development, plugin-first, TypeScript-only, performance budget,
  latest frameworks, reuse, no-removal, test bar, docs-first, modular
  packages, safety, continual-improvement runs).
- `index` Linked `.specify/`, `docs/spec/`, `docs/log.md`, and
  `docs/questions.md` from `docs/index.md`.
- `questions` Created `docs/questions.md` to capture open questions
  with chosen defaults.

## 2026-04-26 (pre-Spec-Kit)

- `docs/architecture` Translation work landed for architecture pages
  (PR #681).
- `docs/api` Translation work landed for API pages (PR #680).
- `docs/advanced-guide` `docs/features` `docs/payment` Translations
  landed (PR #677).

## 2026-03-08

- Monorepo conversion design and plan landed in
  [`docs/plans/2026-03-08-monorepo-conversion.md`](plans/2026-03-08-monorepo-conversion.md)
  and
  [`docs/plans/2026-03-08-monorepo-conversion-design.md`](plans/2026-03-08-monorepo-conversion-design.md).
  These remain the definitive source for that effort and are now
  cross-linked from `docs/spec/001-monorepo-conversion/spec.md`.

---

## How to add an entry

1. Append a single line under the most recent date heading; create a
   new date heading for a new day.
2. Keep entries in a stable bullet style (`- area: summary`).
3. If the change implements or amends a spec, link the spec folder.
4. If the change has a PR, mention the PR number in parentheses.
