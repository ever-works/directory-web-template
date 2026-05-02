---
id: gitignore
title: Workspace .gitignore (.gitignore)
sidebar_label: Workspace .gitignore
sidebar_position: 360
---

# Workspace `.gitignore` — `.gitignore`

Per-source-file reference for the monorepo's workspace-root
git-ignore manifest paired with
[`.gitignore`](https://github.com/ever-works/directory-web-template/tree/develop/.gitignore),
the **single git-ignore boundary** that gates every file the
workspace-root `git status`, every `pnpm install`, every
`pnpm tsc --noEmit`, every `pnpm build`, every `pnpm test:e2e`
run, and every CI `actions/checkout` step decide whether to
track. Sits at the root the same way
[`pnpm-workspace.md`](pnpm-workspace.md) sits at the root for
workspace membership and [`turbo-config.md`](turbo-config.md)
sits at the root for task orchestration.

Where `pnpm-workspace.md` documents the **workspace-membership
boundary** and `turbo-config.md` documents the **task-graph
boundary**, this page documents the **tracked-file boundary** —
which artefacts the workspace deliberately keeps out of source
control, why each pattern is in the file, what the consumers
expect, and what the failure modes look like when an entry
drifts.

## At a glance

| Section                | Patterns                                                                                                                                                                  | Purpose                                                                                                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `# dependencies`       | `node_modules` / `.pnp` / `.pnp.*` / `.yarn/*` / `!.yarn/patches` / `!.yarn/plugins` / `!.yarn/releases` / `!.yarn/versions` / `.pnp.js`                                  | Keeps every package manager's installed-modules tree out of the repo. Workspace-wide `node_modules/` plus per-package `node_modules/` (pnpm hoisting). The `!.yarn/*` re-include set covers a future Yarn Berry adoption that ships PnP patches / plugins in-tree. |
| `# turbo`              | `.turbo`                                                                                                                                                                  | Turborepo's per-task local cache directory. Documented in [`turbo-config.md`](turbo-config.md) as the read-write target the runner persists to.                                                                                                                    |
| `# testing`            | `coverage` / `**/auth-states/` / `**/test-results/` / `**/playwright-report/` / `**/.playwright/`                                                                         | Test runtime artefacts: Istanbul coverage output (future Vitest), Playwright auth-state cache (per [`auth-fixture.md`](auth-fixture.md) / [`global-setup.md`](global-setup.md)), Playwright per-spec trace / video / screenshot output, Playwright internal cache.  |
| `# next.js`            | `.next/` / `out/`                                                                                                                                                         | Next 16 build output (`.next/`) plus the static-export target (`out/`) that older `next export` flows produced. Both are reproducible from source.                                                                                                                 |
| `# docusaurus`         | `**/build/` / `**/.docusaurus/`                                                                                                                                            | Docusaurus build output and per-package internal cache. Applies to `apps/docs/` and any future docs workspace member.                                                                                                                                              |
| `# production`         | `dist`                                                                                                                                                                    | Generic library bundle output for any future workspace member that builds a `dist/` directory.                                                                                                                                                                     |
| `# misc`               | `.DS_Store` / `*.pem`                                                                                                                                                     | macOS Finder metadata (universal-developer hygiene); per-developer TLS / SSH key files (security hygiene).                                                                                                                                                         |
| `# debug`              | `npm-debug.log*` / `yarn-debug.log*` / `yarn-error.log*` / `.pnpm-debug.log*`                                                                                              | Per-package-manager debug logs — npm, yarn, pnpm. Glob suffix covers timestamped variants (`npm-debug.log.123`).                                                                                                                                                   |
| `# env files`          | `.env*` / `!.env.example`                                                                                                                                                 | Every `.env*` variant (`.env`, `.env.local`, `.env.development`, `.env.production`, `.env.test`) is excluded, with `.env.example` re-included so the template ships the canonical env-var list. The single line that matters most for the security posture.       |
| `# vercel`             | `.vercel`                                                                                                                                                                 | Vercel CLI's per-project link directory (`.vercel/project.json`) — couples the local checkout to a specific Vercel project, which a contributor PR must not propagate.                                                                                             |
| `# typescript`         | `*.tsbuildinfo` / `next-env.d.ts`                                                                                                                                         | TypeScript incremental-build cache (`tsc --incremental` output) plus Next's auto-generated ambient types file. Both are reproducible from source.                                                                                                                  |
| `# content`            | `.content` / `analyze/`                                                                                                                                                   | The Git-based CMS content directory cloned by `apps/web/scripts/clone.cjs` from `DATA_REPOSITORY` (gitignored because it lives in a separate repo and is regenerated on every `dev` / `build`); plus `analyze/` for `@next/bundle-analyzer` HTML output.            |
| `# vscode AI rules`    | `.github/instructions/codacy.instructions.md`                                                                                                                              | Single-file exclusion for an editor-specific Codacy instructions file that does not belong in the shipped repo.                                                                                                                                                    |
| `# cache`              | `.cache` / `.pnpm-debug.log`                                                                                                                                              | Generic-library cache directory plus a duplicate of the `.pnpm-debug.log` debug pattern (without the `*` suffix). The duplicate is harmless but worth noting because git treats both as separate entries.                                                          |
| `# OpenAPI backups`    | `public/openapi.backup.json` / `**/*.backup.openapi.json` / `**/openapi.backup.json`                                                                                      | Backup files written by the `apps/web/scripts/generate-openapi.ts` script before it overwrites the canonical `openapi.json`. Backups are intentionally gitignored so contributors do not accidentally commit them.                                                 |
| `# claude`             | `.claude`                                                                                                                                                                 | The Claude Code CLI's per-checkout directory (project state, skills cache, todo state). Gitignored because it is per-developer and the workspace ships its rules through `CLAUDE.md` / `AGENTS.md` / `.specify/`.                                                  |

## File contents

```gitignore
# dependencies
node_modules
.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions
.pnp.js

# turbo
.turbo

# testing
coverage
**/auth-states/
**/test-results/
**/playwright-report/
**/.playwright/

# next.js
.next/
out/

# docusaurus
**/build/
**/.docusaurus/

# production
dist

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files
.env*
!.env.example

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# content
.content
analyze/

# vscode AI rules
.github/instructions/codacy.instructions.md

# cache
.cache
.pnpm-debug.log

# OpenAPI backups / generated artifacts
public/openapi.backup.json
**/*.backup.openapi.json
**/openapi.backup.json

# claude
.claude
```

## Why a single workspace-root `.gitignore` and not per-package files

Git resolves `.gitignore` patterns hierarchically — a deeper
`.gitignore` extends the workspace-root one, and a `!`
re-include in a deeper file overrides the root for the
matched path. The template uses a **single workspace-root
`.gitignore`** today and no per-package `.gitignore` files.
Three rejected alternatives:

1. **Per-package `.gitignore` for each workspace member**
   (`apps/web/.gitignore`, `apps/web-e2e/.gitignore`,
   `apps/docs/.gitignore`, `packages/ui/.gitignore`, …).
   The maintenance burden multiplies with every new
   workspace member — a Next 16 update that adds a new
   internal cache directory has to be propagated to every
   package's `.gitignore`. The `**/`-anchored patterns at
   the root cover every workspace member with one entry.
2. **A `.gitignore` only at directories that need extra
   exclusions** (e.g. `apps/web/.gitignore` for `.next/`).
   The pattern at the root with a `**/` prefix already
   covers `apps/web/.next/`, so the per-directory file is
   redundant.
3. **A workspace-root `.gitignore` plus `.gitignore_global`
   for per-developer files** (editor configs, OS metadata).
   The template ships `.DS_Store` and `*.pem` in the
   workspace-root file so a fresh contributor on macOS or
   Windows does not need to configure their own
   `core.excludesFile` to start contributing. Per-developer
   editor exclusions (`.idea/`, `.vscode/settings.json`,
   `.cursor/`) are deliberately **not** in this file —
   contributors who want them should set their own
   `~/.gitignore_global`.

The single-file posture is the same shape as
[`workspace-root-manifest.md`](workspace-root-manifest.md)'s
"single root `package.json` for cross-cutting fields like
`prettier`, `engines`, `packageManager`" choice — the root
file owns the concerns that span every workspace member.

## Why `**/auth-states/` and not just `auth-states/`

[`auth-fixture.md`](auth-fixture.md) and
[`global-setup.md`](global-setup.md) both reference the
`auth-states/` directory under `apps/web-e2e/`. That
directory is **created by `global-setup.ts`** at runtime via
`mkdirSync(auth-states/, { recursive: true })` and contains
two persisted-storage-state files (`admin.json`,
`client.json`) that hold the seeded admin and client
authentication cookies plus any `localStorage` set during
sign-in.

The pattern uses `**/` because:

1. **Resolves at any depth.** The `auth-states/` directory
   lives at `apps/web-e2e/auth-states/`, not at the
   workspace root. A bare `auth-states/` at the workspace
   root would only match the workspace-root path and miss
   the actual location. The `**/` prefix matches any depth.
2. **Future-proofs against directory moves.** A future
   refactor that moves the e2e suite to `tests/e2e/` or
   splits it across `apps/web-e2e/`,
   `apps/admin-e2e/`, `apps/api-e2e/` keeps the same
   protection.
3. **Symmetric with the other test patterns** —
   `**/test-results/`, `**/playwright-report/`, and
   `**/.playwright/` all use the same anchor for the same
   reason. Three of the four test patterns being `**/`
   anchored makes the fourth (`coverage`) stand out as a
   future-prepared placeholder for a not-yet-introduced
   Vitest config.

The `**/` prefix matters most for the **security
posture** — the persisted-storage-state files contain
NextAuth session cookies that grant administrative access
when restored. A leaked auth-state file is a leaked
admin / client account. The pattern must catch the
directory regardless of where the e2e suite lives.

## Why `.env*` plus `!.env.example` and not a positive include list

The two-line shape:

```gitignore
.env*
!.env.example
```

deliberately uses **glob-then-re-include** instead of an
explicit positive list (`.env.local`, `.env.development`,
`.env.production`, `.env.test`, `.env.staging`, …). Three
reasons:

1. **Defence in depth against future env-file conventions.**
   Next 16 supports `.env.local` / `.env.development` /
   `.env.production` / `.env.test` today; a future Next
   release that adds `.env.preview` or `.env.staging`
   variants is automatically excluded. An explicit positive
   list would silently leak a new file the moment Next adds
   support for it.
2. **Defence against typos.** A contributor who accidentally
   creates `.env.locall` (typo) is still protected — the
   `.env*` glob catches everything that starts with `.env`.
   An explicit list misses the typo.
3. **`.env.example` is the documentation surface.** The
   `!.env.example` re-include is the **only** env-file
   contributors should ever commit; it documents the canonical
   set of env-vars without exposing any secret value. Every
   other `.env*` variant is per-developer or per-environment
   and must stay out.

The shape is symmetric with the `# dependencies` block's
`.yarn/*` glob plus `!.yarn/patches` / `!.yarn/plugins` /
`!.yarn/releases` / `!.yarn/versions` re-includes — the
same defence-in-depth posture against future Yarn Berry
adoption.

## Why `.content` is gitignored

The `.content/` directory at `apps/web/.content/` is
**cloned at runtime** by `apps/web/scripts/clone.cjs` from
the URL configured in `DATA_REPOSITORY`. The script runs
before `pnpm dev`, `pnpm build`, and `pnpm start` (wired
through `prepublish` / `predev` hooks in the host app's
`package.json`). The directory contains the Git-based CMS
content (categories, tags, items, collections — the
directory listings the template renders).

Three reasons it must stay out of source control:

1. **It lives in a separate repo.** The template's content
   lives at <https://github.com/ever-works/awesome-time-tracking-data>
   for the default demo content. Each customer / deployment
   points `DATA_REPOSITORY` at their own content repo. A
   `.content/` checked in to the template would diverge
   immediately from the source repo on every content
   update.
2. **Regenerated on every `dev` / `build`.** The clone
   script is idempotent — it pulls the latest content on
   every invocation. A checked-in `.content/` would mask
   stale content with the local copy and produce silently
   wrong builds.
3. **Per-deployment customisation.** A customer who points
   `DATA_REPOSITORY` at their private content repo must not
   accidentally commit that content into the template repo.
   The gitignore is the single chokepoint that prevents
   that leak.

## Why `.claude` is gitignored

Claude Code (the AI coding tool that
[`CLAUDE.md`](https://github.com/ever-works/directory-web-template/tree/develop/CLAUDE.md)
configures) writes per-checkout state to a `.claude/`
directory at the workspace root. The directory contains
session state, skills cache, and todo state for the local
contributor's CLI session. Three reasons it must stay out
of source control:

1. **Per-developer state.** Different contributors run
   different Claude sessions; a checked-in `.claude/` would
   force every contributor to inherit the last committer's
   session state.
2. **Cache freshness.** The skills cache rotates as
   Anthropic publishes new versions; a checked-in cache
   would silently expire and confuse the CLI.
3. **The workspace ships its rules through `CLAUDE.md` /
   `AGENTS.md` / `.specify/`.** Those files are the
   canonical AI-agent contract; the per-checkout `.claude/`
   directory is implementation detail of the local CLI.

## Why the OpenAPI backup patterns repeat across `**/`

The OpenAPI section has three patterns:

```gitignore
public/openapi.backup.json
**/*.backup.openapi.json
**/openapi.backup.json
```

The duplication is deliberate:

1. **`public/openapi.backup.json`** — the canonical-path
   pattern matching the file the host app's
   `apps/web/scripts/generate-openapi.ts` script writes
   before it overwrites `apps/web/public/openapi.json`. The
   bare path matches `apps/web/public/openapi.backup.json`
   at any package depth (git's `.gitignore` resolution
   walks up from the file).
2. **`**/*.backup.openapi.json`** — the suffix pattern
   matching any future `*.backup.openapi.json` variant a
   contributor might author (e.g.
   `apps/web/.openapi-snapshots/2026-04-01.backup.openapi.json`).
3. **`**/openapi.backup.json`** — the bare-name pattern
   matching the canonical filename anywhere in the tree,
   not just under `public/`.

The three patterns together exhaustively cover the file
shape regardless of where a future contributor moves the
script's output.

## Failure matrix

| Mistake                                                       | What surfaces                                                                                                                                                                                  | Where it surfaces                                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Drop `node_modules`                                           | `pnpm install` outputs hundreds of thousands of files into the worktree; first `git status` shows them all; first `git add .` would commit them.                                               | First `pnpm install` after the change.                                                             |
| Drop `.next/`                                                 | Every `next dev` / `next build` writes ~10k generated files into the worktree and pollutes `git status`.                                                                                       | First `pnpm dev` / `pnpm build` after the change.                                                  |
| Drop `**/auth-states/`                                        | Persisted NextAuth session cookies for the seeded admin / client accounts get committed to source. **Security regression.** Anyone with read access to the repo can replay the admin session.  | First `pnpm test:e2e` run after the change; first `git status` after `global-setup.ts` runs.       |
| Narrow `**/auth-states/` to `auth-states/`                    | The pattern only matches the workspace root; the actual `apps/web-e2e/auth-states/` directory becomes trackable.                                                                               | Same as above — first e2e run.                                                                     |
| Drop `**/test-results/`                                       | Every Playwright spec writes a per-spec subdirectory of `trace.zip` / `video.webm` / `screenshot.png` into the worktree.                                                                       | Same as above.                                                                                     |
| Drop `**/playwright-report/`                                  | The HTML report directory and its embedded screenshots / videos get committed.                                                                                                                 | Same as above.                                                                                     |
| Drop `.env*`                                                  | Every `.env.local` / `.env.development` / `.env.production` becomes trackable. **Security regression.** Production secrets (`AUTH_SECRET`, `STRIPE_SECRET_KEY`, etc.) leak on the first commit. | First `cp .env.example .env.local` after the change.                                               |
| Drop `!.env.example`                                          | Sometimes the most-needed file (`.env.example`) becomes ignored if the contributor first creates a `.env` then renames; counterintuitively, the re-include is what makes the canonical file trackable. | First fresh checkout that needs to read the canonical env-var list.                                |
| Switch `.env*` to a positive list (`.env.local`, `.env.development`) | Future Next env conventions (`.env.preview`) silently leak; typo'd files (`.env.locall`) silently leak.                                                                                       | Next time Next adds a new env convention OR a contributor typos a filename.                        |
| Drop `.content`                                               | The Git-CMS content cloned by `apps/web/scripts/clone.cjs` becomes trackable; first `pnpm dev` writes ~MBs of content into the worktree and the next `git add .` would commit it.              | First `pnpm dev` after the change.                                                                 |
| Drop `.vercel`                                                | The Vercel CLI's per-project link gets committed; every CI deploy from a different worktree would clobber it.                                                                                  | First `vercel link` or `vercel dev` after the change.                                              |
| Drop `*.tsbuildinfo`                                          | TypeScript incremental cache files (one per workspace member) get committed; cross-developer cache contamination produces ghost rebuilds.                                                      | First `pnpm tsc --noEmit` after the change.                                                        |
| Drop `next-env.d.ts`                                          | Next's auto-generated ambient-types file gets committed; contributors with different Next versions diverge on the file's contents.                                                             | First `next dev` / `next build` after the change.                                                  |
| Drop `.turbo`                                                 | Turborepo's per-task local cache gets committed; cache invalidation drifts across developers.                                                                                                  | First Turborepo run after the change.                                                              |
| Drop `**/build/`                                              | Docusaurus and any future workspace-member build output gets committed.                                                                                                                        | First `pnpm --filter @ever-works/docs build` after the change.                                     |
| Drop `**/.docusaurus/`                                        | Docusaurus internal cache gets committed; cross-developer cache contamination.                                                                                                                  | Same as above.                                                                                     |
| Drop `*.pem`                                                  | TLS / SSH key files get committed. **Security regression.**                                                                                                                                    | First time a contributor stages a `.pem` for any reason.                                           |
| Drop `.DS_Store`                                              | macOS Finder metadata files get committed across the tree; cross-platform contributors see noise diffs.                                                                                        | First contributor on macOS.                                                                        |
| Drop `npm-debug.log*` / `yarn-debug.log*` / `.pnpm-debug.log*` | Per-package-manager debug logs get committed when an `install` fails.                                                                                                                          | First failing install on any package manager.                                                      |
| Drop `.cache`                                                 | Generic-library caches (Vite, SWC, Babel, ESLint, Prettier) get committed.                                                                                                                     | First tool run that writes to `.cache/`.                                                           |
| Drop `analyze/`                                               | `@next/bundle-analyzer` HTML output gets committed.                                                                                                                                            | First `pnpm analyze` run.                                                                          |
| Drop `.claude`                                                | Per-developer Claude Code session state gets committed; future contributors inherit committer's session.                                                                                       | First Claude Code run after the change.                                                            |
| Drop the OpenAPI backup patterns                              | `apps/web/scripts/generate-openapi.ts` writes a `.backup.openapi.json` next to the canonical `openapi.json` before overwriting; the backup gets committed every time the script runs.          | First `pnpm generate-openapi` run.                                                                 |
| Drop the `.github/instructions/codacy.instructions.md` line   | The file gets committed and ships an editor-specific Codacy-AI ruleset to every contributor (most of whom do not use Codacy).                                                                  | First contributor whose editor writes the file.                                                    |
| Add `.idea/` / `.vscode/` / `.cursor/` to the file            | Every contributor's editor configs become workspace-managed; per-developer customisations leak across the team.                                                                                | First commit after the change.                                                                    |
| Switch a `**/`-anchored pattern to a bare pattern             | The pattern only matches at the workspace root; the actual nested location becomes trackable. Most dangerous for `**/auth-states/` (security) and `**/test-results/` (noise).                  | First test run after the change.                                                                  |
| Move the file from `.gitignore`                               | Git stops reading any pattern in this file; mass-trackable artefacts.                                                                                                                          | First `git status` after the change.                                                               |
| Switch the file extension to `.gitignore.txt`                 | Same as above — git only reads files literally named `.gitignore`.                                                                                                                              | Same as above.                                                                                     |
| Ship the file with a CRLF line ending                         | Older git versions (~2.0) misparse CRLF-terminated patterns; the file appears empty.                                                                                                            | First contributor on a stale git version.                                                          |

## Per-section walkthrough

| Lines | Section                | Walk-through                                                                                                                                                                                                                                                  |
| ----- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-10  | `# dependencies`       | `node_modules` (workspace-root + per-package via pnpm hoisting), `.pnp` / `.pnp.*` / `.pnp.js` for Yarn PnP, `.yarn/*` with four re-includes for Yarn Berry's in-tree patches / plugins / releases / versions.                                                  |
| 12-13 | `# turbo`              | Single line — Turborepo's per-task local cache.                                                                                                                                                                                                              |
| 15-20 | `# testing`            | Five test artefact patterns. The four `**/` ones are the highest-stakes for the security and noise postures of the e2e suite.                                                                                                                                |
| 22-24 | `# next.js`            | `.next/` build output and the legacy `out/` static-export target.                                                                                                                                                                                            |
| 26-28 | `# docusaurus`         | `**/build/` and `**/.docusaurus/` for the docs workspace member at `apps/docs/`.                                                                                                                                                                              |
| 30-31 | `# production`         | Generic `dist` for any future library workspace member.                                                                                                                                                                                                       |
| 33-35 | `# misc`               | macOS Finder metadata and TLS / SSH key files.                                                                                                                                                                                                                |
| 37-41 | `# debug`              | Four package-manager debug log patterns.                                                                                                                                                                                                                      |
| 43-45 | `# env files`          | The two-line `.env*` glob plus `!.env.example` re-include — the single most security-critical block in the file.                                                                                                                                              |
| 47-48 | `# vercel`             | Vercel CLI per-project link.                                                                                                                                                                                                                                  |
| 50-52 | `# typescript`         | TypeScript incremental cache and Next-generated ambient types.                                                                                                                                                                                                |
| 54-56 | `# content`            | Git-CMS content directory cloned at runtime, plus bundle-analyzer HTML output.                                                                                                                                                                                |
| 58-59 | `# vscode AI rules`    | Single-file exclusion for an editor-specific Codacy file.                                                                                                                                                                                                     |
| 61-63 | `# cache`              | Generic `.cache` directory plus a duplicate `.pnpm-debug.log` (without the trailing `*`).                                                                                                                                                                     |
| 65-68 | `# OpenAPI backups`    | Three patterns covering the OpenAPI script's backup output regardless of location.                                                                                                                                                                            |
| 70-71 | `# claude`             | Single line — Claude Code per-checkout state.                                                                                                                                                                                                                 |

## `.gitignore`-change checklist

When you change the contents of `.gitignore`, walk this
checklist before merging:

- **`git status` after every `pnpm install` / `pnpm dev` /
  `pnpm build` / `pnpm test:e2e`.** Run the four primary
  workflows after the change; `git status` must remain
  clean except for the change itself. Any new tracked file
  is a regression.
- **[`auth-fixture.md`](auth-fixture.md) cross-check.** The
  `**/auth-states/` pattern is the security boundary that
  the auth fixture's persisted storage states depend on. A
  change that narrows the pattern requires a paired
  reviewer pass on the fixture file.
- **[`global-setup.md`](global-setup.md) cross-check.** The
  `mkdirSync('auth-states/')` call writes into the
  gitignored directory. A change to the `AUTH_STATE_DIR`
  constant in [`e2e-test-data.md`](e2e-test-data.md)
  requires a paired update to this file's pattern.
- **[`e2e-test-data.md`](e2e-test-data.md) cross-check.**
  The `AUTH_STATE_DIR` literal `'auth-states'` must match
  the gitignore pattern. A rename from `auth-states/` to
  `.auth/` or `auth-states-private/` requires touching both
  files.
- **[`playwright-config.md`](playwright-config.md) cross-check.**
  The Playwright config's `outputDir`, `reporter`,
  `webServer.cwd`, and trace / video / screenshot settings
  determine which directories appear in the worktree
  during a test run. A change to any of those values may
  require a new gitignore entry.
- **[`workspace-root-manifest.md`](workspace-root-manifest.md)
  cross-check.** A new `scripts.*` entry that writes new
  files to the worktree (a new generator script, a new
  cache directory, a new build output) may require a new
  gitignore entry.
- **[`turbo-config.md`](turbo-config.md) cross-check.** The
  `.turbo` cache directory is the boundary every Turborepo
  task respects. A change to the cache layout (e.g. moving
  the cache to `.cache/turbo/`) requires a paired update
  to this file.
- **`.env.example` cross-check.** Any change to the
  `# env files` block that drops `!.env.example`
  effectively makes the canonical env-var list
  un-trackable; a paired update to `.env.example` itself
  must verify the file remains trackable.
- **CI `actions/checkout` cross-check.** Some CI steps run
  `git status` to verify the worktree is clean before / after
  a build; a regression that introduces tracked files would
  surface as a CI failure on those steps.
- **Reviewer pass.** Walk the failure matrix above against
  the diff to confirm no row's mistake has been introduced.
- **[`docs/log.md`](../log.md) entry.** Append a single-line
  entry summarising the change and linking to this file.
- **[Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  cross-link.** If the change introduces a new test-related
  exclusion (a new Playwright artefact directory, a new
  coverage tool's output, a new auth-state shape), that
  concept lands in the spec first as a tasks/plan entry.
