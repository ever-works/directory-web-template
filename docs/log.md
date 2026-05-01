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

## 2026-05-01

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
  `authoring-a-plugin.md`, `lifecycle.md` *See also*,
  `loader.md` *See also*, `registry.md` *See also*,
  `slot-host.md` *See also*, `testing.md` *See also*,
  `testing-a-plugin.md` *See also*, `packages.md` *See also*,
  `capabilities.md` *See also*, `slots.md` *See also*,
  `manifest.md` *See also*, and `docs/index.md`. Spec 002 `T-010`
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
  `authoring-a-plugin.md`, `lifecycle.md` *See also*,
  `testing-a-plugin.md` *See also*, `packages.md` *See also*,
  `capabilities.md` *See also*, `slots.md` *See also*,
  `loader.md` *See also*, `registry.md` *See also*,
  `slot-host.md` *See also*, and `docs/index.md`. Spec 002 `T-010`
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
  `authoring-a-plugin.md`, `lifecycle.md` *See also*,
  `testing-a-plugin.md` *See also*, `packages.md` *See also*,
  `capabilities.md` *See also*, `slots.md` *See also*,
  `loader.md` *See also*, `registry.md` *See also*, and
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
  *See also*, `testing-a-plugin.md` *See also*, `packages.md`
  *See also*, `capabilities.md` *See also*, `slots.md` *See
  also*, `loader.md` *See also*, and `docs/index.md`. Spec 002
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
  `authoring-a-plugin.md`, `lifecycle.md` *See also*,
  `testing-a-plugin.md` *See also*, `packages.md` *See also*,
  `capabilities.md` *See also*, `slots.md` *See also*, and
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
  *See also*, `lifecycle.md` *See also*, `testing-a-plugin.md`
  *See also*, `packages.md` *See also*, and `docs/index.md`.
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
  Playwright smoke specs), an explicit *what not to do* list (don't
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
  example), `packages.md` *See also* section, and `lifecycle.md`
  *See also* section. `docs/index.md` now lists three plugin
  guides under the spec-driven pointers — `Authoring a Plugin`,
  the previously-unlinked `Plugin Lifecycle`, and the new
  `Testing a Plugin`. Spec 002 `tasks.md` `T-010` task list grew
  from "three new pages" to the four canonical
  `docs/plugins/**` pages and now includes
  `docs/plugins/packages.md` + `docs/plugins/testing-a-plugin.md`,
  with an explicit "doc and runtime cannot drift" verification
  bullet.
- `docs/architecture` `plugin-system.md` status block updated from
  *proposed* to *in-progress* (Phase A scaffolding shipped in commit
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
- `spec-017` Status flipped from *in-progress* to **shipped** in
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
  001 row and a clarifying line in *Conventions* explaining when a
  retroactive trio is reconstructed for parity.
- `apps/web-e2e` Added three more smoke spec files closing the
  remaining admin-by-id and client / page-by-id gaps not covered by
  the earlier collection-level specs:
  `api/admin-by-id.spec.ts` (47 — admin per-`[id]` REST routes
  across categories, clients, collections (+ items helper), comments,
  companies, featured-items, items (+ history / review / full
  import), notifications read receipt, reports, roles (+ permissions
  sub-route), sponsor-ads (+ approve / cancel / reject), tags, users
  + settings POST), `api/items-engagement-and-favorites.spec.ts`
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
  `api/surveys.spec.ts` (8 auth-gated CRUD + per-survey responses
  + per-response detail), `api/payment-checkouts.spec.ts` (28
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
- `spec-002` Status moved from *proposed* to *in-progress* in the
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
