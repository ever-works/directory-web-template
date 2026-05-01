---
id: plugin-lifecycle
title: Plugin Lifecycle (Boot, Validation, Enable/Disable)
sidebar_label: Plugin Lifecycle
---

# Plugin Lifecycle

> **Status.** Targets the architecture defined in
> [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> Where the runtime described below is not yet shipped, this page is
> the **forward-looking reference** that the implementation must match.
> See [`docs/architecture/plugin-system`](../architecture/plugin-system.md)
> for the bigger picture.

This page describes the **lifecycle** of a plugin in the Directory
Web Template: how it gets loaded, validated, registered, made
visible, enabled / disabled, and torn down. Plugin authors should
read this before publishing to make sure they cooperate with the
runtime instead of fighting it.

## Phases

```mermaid
flowchart TB
  A[Process boot] --> B[Read bundled plugin list]
  B --> C[Resolve config: env &lt; DB &lt; override]
  C --> D{Zod validate?}
  D -- "fail" --> E[Boot crashes with human-readable error]
  D -- "ok" --> F[register(plugin) in PluginRegistry]
  F --> G[plugin.setup ctx if defined]
  G --> H[Runtime ready]
  H --> I[SlotHost lookups]
  H --> J[Capability lookups e.g. getAuthProvider]
  H --> K[Admin: enable/disable/swap]
  K --> L[Persist to plugin_settings DB row]
  L --> M[Cache tag invalidation]
  M --> H
```

### 1. Process boot

`apps/web/instrumentation.ts` (or a dedicated `apps/web/lib/boot.ts`)
imports the canonical list of bundled plugins from
`apps/web/lib/plugins/registry.ts`:

```ts
// apps/web/lib/plugins/registry.ts
import { plugin as analyticsPosthog } from '@ever-works/plugin-analytics-posthog';
import { plugin as authGoogle } from '@ever-works/plugin-auth-google';
// … one import per bundled plugin
export const bundledPlugins = [analyticsPosthog, authGoogle, /* … */];
```

Bundled plugins are **enumerated explicitly** — there is no dynamic
`import()` of arbitrary paths. This keeps the bundle deterministic and
trustworthy.

### 2. Config resolution

For each bundled plugin, the runtime resolves config in this order:

1. **Environment variables** (`<PLUGIN_NAME>__<KEY>`). Lowest
   precedence, useful for ops-level toggles.
2. **`plugin_settings` DB row** (if the row exists). Higher
   precedence, written by the admin UI.
3. **Explicit override** passed to `loadPlugins({ overrides })` —
   intended for tests and feature-flag systems.

```ts
const merged = { ...envConfig, ...dbConfig, ...overrideConfig };
```

### 3. Validation

The merged config is run through the plugin’s Zod `config` schema:

```ts
const validated = manifest.config.parse(merged);
```

If validation fails:

- Boot **crashes loudly** with a human-readable error pointing at
  the offending key.
- The error message includes the plugin name, the failing path, and
  the Zod issue summary.
- Misconfigured plugins must never silently disable themselves —
  better to fail boot than to ship in an unknown state.

### 4. Registration

Plugins that pass validation are added to a singleton
`PluginRegistry`:

```ts
registry.register(plugin);
```

The registry indexes plugins by **name**, by **capability**, and by
each **slot id** they contribute to. All lookups are O(1) Map reads.

### 5. Setup hook (optional)

If a plugin defines a `setup(ctx)` function, the runtime calls it
exactly once after registration. The `ctx` argument provides:

- `ctx.config` — the validated config.
- `ctx.logger` — a scoped logger (`logger.child({ plugin })`).
- `ctx.t` — translation function bound to the plugin namespace.
- `ctx.events` — internal event bus (see "Events" below).
- `ctx.db` — Drizzle client for plugins that need persistence.

`setup` is **async-friendly** but should resolve quickly — the boot
sequence awaits all setup hooks in parallel before the app starts
serving traffic. Long-running tasks belong in background jobs (see
[`docs/architecture/background-jobs-system`](../architecture/background-jobs-system.md))
or in lazy paths.

### 6. Runtime use

Once boot completes:

- **Slot lookups.**
  `<SlotHost slotId="header.right" ctx={…} />` queries
  `registry.slotsFor("header.right")` and renders the registered
  components. RSC by default; client slots opt in via `next/dynamic`.
- **Capability lookups.**
  `registry.get<AuthProvider>("auth")` returns the active provider
  for the capability; `registry.list<AnalyticsProvider>("analytics")`
  returns every active analytics provider (multiple providers can be
  enabled simultaneously for that capability).

### 7. Enable / disable / swap (admin)

The admin UI talks to four REST endpoints:

| Verb   | Path                                         | Purpose                       |
| ------ | -------------------------------------------- | ----------------------------- |
| `GET`  | `/api/admin/plugins`                         | List registered plugins      |
| `POST` | `/api/admin/plugins/:name/enable`            | Mark plugin enabled           |
| `POST` | `/api/admin/plugins/:name/disable`           | Mark plugin disabled          |
| `PUT`  | `/api/admin/plugins/:name/config`            | Update config (Zod-validated) |

Each handler:

1. Authenticates the request as an admin.
2. Validates the body against the plugin’s Zod schema.
3. Persists to the `plugin_settings` table.
4. Invalidates the relevant **cache tags** so RSC pages re-render.
5. Returns the new state.

Enable / disable updates take effect on the **next request**. The
running registry is refreshed via a versioned cache key; there is no
hot-reload of code.

### 8. Teardown

Long-running processes (job workers) call `registry.dispose()` on
graceful shutdown. The registry walks every plugin in registration
order and awaits each plugin’s `teardown()` hook (if defined). This
gives plugins a chance to flush analytics events, close DB
connections, or clean up locks.

Teardown is best-effort: if a `teardown()` throws, the runtime logs
the error and continues with the next plugin.

## Events

The runtime exposes a small in-process event bus for plugin-to-core
and plugin-to-plugin communication:

```ts
ctx.events.on('item.created', async (item) => { /* … */ });
ctx.events.emit('plugin.mything.tick', { now: Date.now() });
```

Conventions:

- Core emits a short, documented set of events
  (`item.{created,updated,deleted}`, `user.signed-in`,
  `submission.approved`, …). The list is in
  [`apps/web/lib/events.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/lib).
- Plugins **may** emit additional events under a `plugin.<name>.*`
  namespace.
- Plugins **must not** emit core events — only core does.
- Subscriptions are scoped to the plugin and removed at teardown.

## Versioning & compatibility

Each plugin declares a `templateRange` semver string in its
manifest. At boot the runtime checks `templateVersion` against this
range:

- If incompatible, the plugin is **registered but disabled** with a
  warning, and the admin UI surfaces the version mismatch.
- This is preferable to hard-failing boot because it lets the rest
  of the app keep running while the operator upgrades the plugin.

## Anti-patterns to avoid

- **Importing `apps/web/**`** from inside a plugin package. Use
  interfaces in `@ever-works/plugin-sdk` instead.
- **Relying on global mutable state** that lives outside the plugin
  package. Stash plugin-scoped state on `ctx`.
- **Long-running work in `setup()`**. Push to a background job.
- **Throwing in `teardown()`**. Log and return; never throw.
- **Reading other plugins’ DB tables** directly. Either expose a
  capability or use the event bus.

## See also

- [Architecture overview](../architecture/plugin-system.md)
- [Authoring a plugin](authoring-a-plugin.md)
- [Testing a plugin](testing-a-plugin.md) — `createTestRegistry`, slot rendering, and Playwright specs.
- [Plugin Capabilities Reference](capabilities.md) — interfaces and lookup-style for each capability touched by `setup` / `teardown` / `enable` / `disable`.
- [Plugin Slots Reference](slots.md) — per-slot contract; slot contributions disappear immediately when a plugin is disabled at runtime.
- [Plugin Loader Reference](loader.md) — per-API reference for the boot-time `loadPlugins` / `mergeConfigSources` surface implementing the config-resolution and validation phases above.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
- Constitution Article I (Plugin-First) in
  [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/blob/develop/.specify/memory/constitution.md).
