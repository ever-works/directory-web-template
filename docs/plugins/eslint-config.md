---
id: plugin-eslint-config
title: Shared ESLint Config (`@ever-works/eslint-config`)
sidebar_label: Shared ESLint Config
sidebar_position: 22
---

# Shared ESLint Config (`@ever-works/eslint-config`)

> **Status.** Authoritative reference for the workspace's shared
> ESLint flat config defined in
> [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The configuration is locked by
> [`packages/eslint-config/nextjs.mjs`](https://github.com/ever-works/directory-web-template/tree/develop/packages/eslint-config/nextjs.mjs)
> and the package is described in
> [`packages/eslint-config/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/eslint-config/package.json).
> When the lint rule set, the parser configuration, the ignored
> globs, or the peer-dep range changes, update **this** page in the
> same change so the doc and the package cannot drift.

`@ever-works/eslint-config` is the **shared workspace tooling**
package that exports an ESLint 9 flat config preset for Next.js
apps. It sits at the same level as
[`@ever-works/tsconfig`](./plugin-tsconfigs.md): both packages
factor a workspace-wide convention into a single workspace package
so the host app
([`apps/web/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web)),
the docs app
([`apps/docs/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/docs)),
the e2e suite
([`apps/web-e2e/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e)),
and any future plugin package can import the same posture without
copying the rule set into every consumer's own `eslint.config.mjs`.

This page is the **per-source-file reference** that pairs with
[`packages/eslint-config/nextjs.mjs`](https://github.com/ever-works/directory-web-template/tree/develop/packages/eslint-config/nextjs.mjs)
and
[`packages/eslint-config/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/eslint-config/package.json)
the same way
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
[`plugin-demo.md`](./plugin-demo.md) pairs with the bundled reference
plugin under `packages/plugin-demo/src/`.

## At a glance

| Aspect                     | Value                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Package name               | `@ever-works/eslint-config`                                                                                           |
| Package path               | [`packages/eslint-config/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/eslint-config) |
| Visibility                 | `private: true` — workspace-only, never published                                                                     |
| License                    | `AGPL-3.0`                                                                                                            |
| Entry point                | `./nextjs.mjs` (single export at sub-path `./nextjs`)                                                                 |
| Default export             | `function nextjsConfig(tsconfigPath = './tsconfig.json'): FlatConfig[]`                                               |
| ESLint flat config version | 9 (the `flat` config format introduced in ESLint v9)                                                                  |
| Peer dependency            | `eslint@^9`                                                                                                           |
| Direct dependencies        | `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-plugin-react`, `eslint-plugin-react-hooks`   |
| Lint rule count            | Five rules across two file-type scopes (`*.{js,jsx,ts,tsx}` and `*.{ts,tsx}`)                                         |

The package is **deliberately minimal** — it ships exactly one
factory function that produces the flat config array. There is no
intermediate `.eslintrc.cjs`, no preset variants beyond `nextjs`, and
no rule overrides for app-specific code. Per-app overrides live in
the consuming app's own `eslint.config.mjs` next to the
`nextjsConfig(...)` call.

## File map

The package is intentionally two files. Each has a single
responsibility:

| File                                                                                                                    | Responsibility                                                                      | Pairs with                             |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------- |
| [`nextjs.mjs`](https://github.com/ever-works/directory-web-template/tree/develop/packages/eslint-config/nextjs.mjs)     | Export the `nextjsConfig(tsconfigPath)` flat-config factory                         | The `default` export consumed by hosts |
| [`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/eslint-config/package.json) | Declare the `./nextjs` sub-path, the four direct deps, and the `eslint@^9` peer-dep | Node's resolution and pnpm's workspace |

There is no `src/` directory and no separate barrel — the package
ships a single `.mjs` artefact directly. The choice mirrors the
plugin-system packages (which ship `.ts` directly) but uses ESM
`.mjs` because ESLint loads flat configs through Node's native ESM
loader, not through TypeScript.

## `nextjs.mjs` — the flat-config factory

The file's single export is a default function:

```text
export default function nextjsConfig(tsconfigPath = './tsconfig.json') {
    return [
        // Block 1 — ignores config
        // Block 2 — JS/TS shared rules
        // Block 3 — TS-only typed rules
    ];
}
```

The factory takes one optional argument:

- **`tsconfigPath`** (default `'./tsconfig.json'`) — the path to the
  consumer's TypeScript project file, resolved **relative to the
  consumer's `eslint.config.mjs` working directory**. The factory
  threads this value into the `parserOptions.project` field of the
  TypeScript-only rule block so `@typescript-eslint/parser` can
  resolve the consumer's `compilerOptions.paths` aliases at lint
  time.

A consumer's `eslint.config.mjs` looks like this:

```js
import nextjsConfig from '@ever-works/eslint-config/nextjs';

export default nextjsConfig('./tsconfig.json');
```

The path is passed as a **string literal** rather than imported from
the consumer's `tsconfig.json` because the flat-config factory must
remain framework-agnostic and JSON-import-free.

### The three blocks the factory returns

The returned array has exactly three blocks. Each one is a separate
flat-config entry so ESLint v9's "first match wins per file" merge
logic can compose them deterministically.

#### Block 1 — `ignores`

```js
{
	ignores: [
		'**/node_modules/**',
		'**/.next/**',
		'**/out/**',
		'**/build/**',
		'**/dist/**',
		'**/*.config.js',
		'**/*.config.ts',
		'**/*.config.mjs',
	],
}
```

The eight ignore patterns cover:

- **`**/node_modules/**`** — the standard "never lint vendored code"
  exclusion.
- **`**/.next/**`** — Next.js build artefacts. The host app's
  `pnpm build` writes here, and linting the build output would chase
  every transformer-emitted bug.
- **`**/out/**`** — Next.js's static-export output directory.
- **`**/build/**`** — the Docusaurus output directory used by
  `apps/docs` and any future site that builds into `build/`.
- **`**/dist/**`** — the conventional library-build output. None of
  the workspace packages produce a `dist/` today (see
  [`plugin-tsconfigs.md`](./plugin-tsconfigs.md)), but the entry
  guards against future build steps.
- **`**/\*.config.{js,ts,mjs}`** — the catch-all for tooling configs.
ESLint flat configs themselves, Tailwind configs, PostCSS configs,
Vite / Vitest configs, Drizzle configs all match. The rationale is
that tooling configs are short, hand-edited, and have their own
lint posture (often relaxed types, often `module.exports = ...`)
  that doesn't belong under the same rule set as the application
  source.

The ignore block is the **first** block in the returned array
because ESLint's flat config requires `ignores` to be applied
**before** the file-matching blocks; otherwise an `ignores` entry
later in the array can be overridden by an earlier `files` entry.

#### Block 2 — JS/TS shared rules (`*.{js,jsx,ts,tsx}`)

```js
{
	files: ['**/*.{js,jsx,ts,tsx}'],
	languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
	plugins: { react, 'react-hooks': reactHooks },
	settings: { react: { version: 'detect' } },
	rules: {
		'no-unused-vars': 'off',
		'no-console': 'off',
		'react-hooks/rules-of-hooks': 'error',
		'react-hooks/exhaustive-deps': 'warn',
	},
},
```

The block matches every JavaScript and TypeScript source file under
the consumer's lint scope. The four configured rules are:

- **`no-unused-vars: 'off'`** — disabled because the TS-only block
  below uses `@typescript-eslint/no-unused-vars` instead, which
  understands type-only imports and underscore-prefix conventions.
  Leaving the JS rule enabled would double-count.
- **`no-console: 'off'`** — disabled because the host app
  intentionally uses `console.log` / `console.error` for structured
  logging in the API routes (see the `[SYNC_API]` prefix in
  `apps/web/app/api/version/sync/route.ts` for an example), and the
  rule's stock configuration would flag every legitimate usage.
- **`react-hooks/rules-of-hooks: 'error'`** — the load-bearing
  React-Hooks rule. Catches the "calling a hook conditionally" or
  "calling a hook from a non-component" mistakes that produce
  runtime crashes.
- **`react-hooks/exhaustive-deps: 'warn'`** — a hint, not a hard
  error, because legitimate "I want a stable callback that captures
  the latest prop" patterns trip the rule. The warning level lets
  reviewers see the candidate dependency, judge it, and either add
  it or silence it with the inline comment.

The `settings.react.version: 'detect'` line tells
`eslint-plugin-react` to read the React version from the consumer's
installed `react` package rather than guess. The host app pins
`react@19.2.5`; this `detect` setting picks that up automatically so
deprecated-API rules fire correctly.

#### Block 3 — TS-only typed rules (`*.{ts,tsx}`)

```js
{
	files: ['**/*.{ts,tsx}'],
	languageOptions: {
		parser: typescriptParser,
		ecmaVersion: 'latest',
		sourceType: 'module',
		parserOptions: { ecmaFeatures: { jsx: true }, project: tsconfigPath },
	},
	plugins: { '@typescript-eslint': typescriptEslint },
	rules: {
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': [
			'warn',
			{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
		],
		'no-console': 'off',
	},
},
```

The block matches only TypeScript files (`.ts` / `.tsx`). It swaps
in `@typescript-eslint/parser` so type-aware rules can resolve types
through the consumer's `tsconfigPath`. The single rule that's not a
disable is:

- **`@typescript-eslint/no-unused-vars`** — fires on unused
  `import`s, unused locals, unused function parameters, and unused
  destructured names. The three `argsIgnorePattern` / `varsIgnorePattern`
  / `caughtErrorsIgnorePattern: '^_'` clauses establish the workspace
  convention: a `_`-prefixed name signals "intentionally unused, don't
  flag me." Examples in the codebase:
    - `function GET(_request: NextRequest) { ... }` — the
      `collections/exists` and similar API routes that don't read the
      request URL.
    - `try { ... } catch (_) { ... }` — an intentionally-discarded
      error in graceful-degrade paths.
    - `const [_first, ...rest] = arr;` — destructuring with the head
      discarded.

The rule is set to `'warn'` (not `'error'`) so a stale unused
import on an in-progress branch doesn't block local `pnpm dev`.
A regression that flips this to `'error'` would force every
work-in-progress to clean up before a single line passes the lint
gate, which is the wrong friction point for an iterative codebase.

The two `'off'` rules in this block — `no-unused-vars` and
`no-console` — are **re-disabled** here even though they're
already off in the JS/TS shared block above. ESLint flat config
applies blocks in order, and a later block can re-enable a rule
disabled in an earlier block (e.g. the consumer's own
`eslint.config.mjs` could). The explicit `'off'` here pins the
disable per-file-type so a downstream override that re-enables
`no-unused-vars` must do so at the same scope.

## `package.json` — the manifest

The package manifest is **deliberately the smallest of the workspace's
shared packages**:

```jsonc
{
	"name": "@ever-works/eslint-config",
	"version": "0.0.0",
	"private": true,
	"license": "AGPL-3.0",
	"exports": {
		"./nextjs": "./nextjs.mjs"
	},
	"dependencies": {
		"@typescript-eslint/eslint-plugin": "^8.48.0",
		"@typescript-eslint/parser": "^8.48.0",
		"eslint-plugin-react": "^7.37.5",
		"eslint-plugin-react-hooks": "^7.0.1"
	},
	"peerDependencies": {
		"eslint": "^9"
	}
}
```

Each field's purpose:

- **`name: "@ever-works/eslint-config"`** — the scoped workspace
  name. Consumers put `"@ever-works/eslint-config": "workspace:*"`
  in their own `package.json`'s `devDependencies`.
- **`version: "0.0.0"`** — the version is intentionally `0.0.0`
  because the package is `private: true` and consumed only via
  `workspace:*`. The version field is unused at install time but
  must be present for `pnpm` to accept the manifest.
- **`private: true`** — blocks accidental `pnpm publish`. The
  package is consumed via `workspace:*` only.
- **`license: "AGPL-3.0"`** — the project's license. The
  configuration itself is lint metadata (not redistributable as a
  binary), but the package inherits the workspace's license posture.
- **`exports: { "./nextjs": "./nextjs.mjs" }`** — the **single
  sub-path** the package exposes. The barrel-only `./nextjs` entry
  forces consumers to import via the full sub-path
  (`@ever-works/eslint-config/nextjs`), which is the deliberate
  forcing function for "if you want a different preset, add a new
  sub-path; don't shoehorn it into the existing one." Today there's
  only one preset; future presets (`./node`, `./web-component`)
  would land as additional entries here.
- **`dependencies`** — the four ESLint plugins the factory imports
  at top-level. The `^8.48.0` / `^7.37.5` / `^7.0.1` ranges are the
  workspace's stable floor; bumping any of them must run a full
  `turbo run lint` against `apps/web/` and `apps/docs/` to check
  for new rule defaults.
- **`peerDependencies: { "eslint": "^9" }`** — ESLint itself is a
  **peer** because the consuming app installs the ESLint binary
  that runs the configuration. The `^9` range pins the flat-config
  format; ESLint 8 would break because flat configs are an
  ESLint-9 feature.

There is no `dependencies.eslint` (it's a peer), no
`devDependencies.@types/...` (the package is plain JS), no
`scripts` block (the package has nothing to build, type-check, or
lint — its single file runs as plain Node ESM at consumer-time),
and no `files` array (the workspace ships from the package root
and `private: true` is the publish guard).

## How consumers use the package

The four current consumers are:

| Consumer                                                                                         | `eslint.config.mjs` shape                                                                        |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [`apps/web`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web)         | `import nextjsConfig from '@ever-works/eslint-config/nextjs'; export default nextjsConfig();`    |
| [`apps/docs`](https://github.com/ever-works/directory-web-template/tree/develop/apps/docs)       | Inherits the workspace's lint posture; Docusaurus's own preset is layered on top.                |
| [`apps/web-e2e`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e) | Currently has no `eslint.config.mjs`; the `package.json#scripts.lint` is an intentional `echo`.  |
| Plugin packages                                                                                  | Currently have no `eslint.config.mjs`; the `package.json#scripts.lint` is an intentional `echo`. |

The plugin packages will gain their own `eslint.config.mjs` in
**Phase D** of [Spec 002](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
once the per-package lint gate is wired through Turborepo. Until
then, the manifests' `scripts.lint: "echo 'No lint configured for
plugin-X'"` is the intentional no-op so `turbo run lint` succeeds
across the whole workspace.

## Failure matrix

These are the manifestations of an `@ever-works/eslint-config`
mistake mapped back to where they surface:

| Manifestation                                                                              | What changed                                                                                                                                                 | Where it surfaces                                                                 |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `Cannot find module '@ever-works/eslint-config/nextjs'`                                    | `package.json#exports` lost the `./nextjs` entry, or a consumer imports from the bare package name without the sub-path.                                     | `pnpm lint` in any consuming app on the first run after the regression.           |
| `Parsing error: Cannot find module '@typescript-eslint/parser'`                            | A consumer's lockfile resolved `@typescript-eslint/parser` from a stale ESLint-8 version that doesn't satisfy the `^8.48.0` workspace range.                 | `pnpm lint` against any `.ts` / `.tsx` file.                                      |
| `Configuration for rule "react-hooks/rules-of-hooks" is invalid`                           | A consumer pinned `eslint-plugin-react-hooks` to a version older than the package's `^7.0.1` floor.                                                          | `pnpm lint` on the first React component that uses a hook.                        |
| `'_request' is defined but never used.  no-unused-vars`                                    | A regression that re-enabled the JS `no-unused-vars` rule (which doesn't honour the underscore-prefix convention).                                           | `pnpm lint` against any API route with the `function GET(_request)` form.         |
| `'console' is not defined.`                                                                | A regression that flipped `no-console` to `'error'` and removed `globals.console`.                                                                           | `pnpm lint` against any `console.log` / `console.error` call site.                |
| `Each child in a list should have a unique "key" prop` (raised as an error, not a warning) | A consumer's own `eslint.config.mjs` raised the `react/jsx-key` rule level above the package's default warn-only posture without coordinating with the team. | `pnpm lint` against any component that maps over an array.                        |
| `tsconfigPath '/abs/path/that/doesnt-exist/tsconfig.json' could not be opened`             | The consumer passed an invalid `tsconfigPath` to `nextjsConfig(...)`.                                                                                        | `pnpm lint` against any TS file in the consumer.                                  |
| Lint runs against the `.next/` build output                                                | A regression that removed `**/.next/**` from the ignores block.                                                                                              | `pnpm lint` wall-clock (10x baseline) and a flood of build-emitted-code warnings. |
| Lint runs against `tailwind.config.js` / `next.config.mjs` / `vite.config.ts`              | A regression that removed `**/*.config.{js,ts,mjs}` from the ignores block.                                                                                  | `pnpm lint` flagging the workspace's tooling configs as application source.       |
| ESLint flat config rejected with `Configuration for rule "no-unused-vars" is invalid`      | A regression that mixed flat-config syntax with eslintrc syntax (e.g. `extends:` at the top level).                                                          | `pnpm lint` exit code 2 (config error, not lint failure).                         |
| `eslint@9.x not found`                                                                     | A consumer pinned `eslint@^8` and the peer-dep range refused to install.                                                                                     | `pnpm install` warns, `pnpm lint` fails immediately.                              |

## Public-surface change checklist

When the configuration in `nextjs.mjs` or the manifest changes:

- [ ] **Update this page**. The lint rules and ignore globs cited
      here are load-bearing; the doc can never lag the file.
- [ ] **Cross-check
      [Plugin Package TypeScript Configurations](./plugin-tsconfigs.md)**.
      The shared TS posture and the shared lint posture move
      together; a change to one often implies the other (e.g.
      tightening `strict` in `tsconfig` may need a new lint rule
      to enforce a related runtime invariant).
- [ ] **Cross-check
      [Authoring a Plugin](./authoring-a-plugin.md)**. The author's
      guide cites the lint rules a downstream plugin author should
      respect even before the per-package lint gate ships in Phase D.
- [ ] **Cross-check `apps/web/eslint.config.mjs`** and any other
      consumer that calls `nextjsConfig(...)`. A change to the
      factory's return shape, the `tsconfigPath` parameter, or the
      rule severities propagates to every consumer.
- [ ] **Run `pnpm lint` from the workspace root.** A new rule that
      compiles cleanly in isolation can still flag legacy code in
      `apps/web/` that was written before the rule existed.
- [ ] **Run `pnpm install` after a `package.json` change.** A
      bumped `^8.48.0` → `^9.0.0` range on a `@typescript-eslint/*`
      dependency will break the workspace lockfile if the new major
      drops a rule the package's factory still references.
- [ ] **Append a `docs/log.md` entry** under today's date. The line
      should mention the rule (or field), the old value, the new
      value, and the cross-link to this page.
- [ ] **Add or update an entry in
      [`docs/questions.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/questions.md)**
      if the change opens a configuration choice (e.g. "should
      `no-console` flip to error and require a `console.error`
      whitelist?"). Default to the most conservative option and
      let the user override later.
- [ ] **Update the
      [Constitution Check](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
      note** in the PR description if the change affects Article II
      (TypeScript-Only) or Article IX (Test Coverage Bar).

## Cross-references

- [Plugin Package TypeScript Configurations](./plugin-tsconfigs.md)
  — the analogous reference for the workspace's shared TypeScript
  configuration. The two packages
  (`@ever-works/eslint-config` + `@ever-works/tsconfig`) move in
  lock-step on parser versions, target language features, and the
  `.tsx` / `.ts` file-type split.
- [Authoring a Plugin](./authoring-a-plugin.md) — the author's
  guide that cites the lint rules a plugin author should respect.
- [Plugin Packages overview](./packages.md) — the table that lists
  the three plugin packages with the same field-by-field treatment
  in summary form.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
  — the source-of-truth spec that locks the workspace's
  package-level contract, including the per-package lint gate
  scheduled for Phase D.
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
  — Article II (TypeScript-Only) and Article IX (Test Coverage
  Bar) are the two articles this configuration supports at the
  source-quality boundary.
