---
id: plugin-loader
title: Plugin Loader Reference
sidebar_label: Loader Reference
sidebar_position: 8
---

# Plugin Loader Reference

> **Status.** Authoritative reference for the v1 loader surface
> defined in [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The loader API is locked by [`packages/plugin-runtime/src/loader.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/loader.ts);
> when the runtime adds, removes, or renames an export update **this**
> page in the same change so the doc and the runtime cannot drift.

The **loader** is the runtime entry point that the host app calls
once at boot. Given a [`PluginRegistry`](./packages.md#ever-worksplugin-runtime)
and a list of plugin modules — each with optional config sources —
it merges configs, runs every plugin's Zod schema, registers
validated plugins, and then invokes their optional
[`setup()`](./lifecycle.md#5-setup-hook-optional) hook. Failures are
collected per-plugin so a single misconfigured plugin does not
crash the whole boot.

The loader is **synchronous-friendly for production builds**: a
typical app calls `loadPlugins(...)` once from
`apps/web/instrumentation.ts` (or a dedicated `apps/web/lib/boot.ts`).
After that, every read in the request path goes through the
synchronous registry methods documented in
[Plugin Lifecycle § Runtime use](./lifecycle.md#6-runtime-use).

## At a glance

| Export                  | Kind        | Purpose                                                            |
| ----------------------- | ----------- | ------------------------------------------------------------------ |
| `loadPlugins`           | function    | Validate, register, and `setup()` a list of plugins.               |
| `mergeConfigSources`    | function    | Shallow-merge env / DB / override config sources.                  |
| `PluginConfigSources`   | type        | Per-plugin shape passed in via `sources`.                          |
| `LoadPluginsResult`     | type        | Return shape of `loadPlugins`: `registered` + `rejected`.          |

All four exports also re-export through the runtime's barrel:

```ts
import {
  loadPlugins,
  mergeConfigSources,
  type PluginConfigSources,
  type LoadPluginsResult,
} from '@ever-works/plugin-runtime';
```

## `loadPlugins(registry, plugins)` — register a list of plugins

```ts
async function loadPlugins(
  registry: PluginRegistry,
  plugins: Array<{
    plugin: DirectoryPlugin;
    sources?: PluginConfigSources;
    enabled?: boolean;
  }>,
): Promise<LoadPluginsResult>;
```

The loader iterates the list and, for each entry:

1. **Merges** `sources` via `mergeConfigSources` (defaulting to
   an empty object when `sources` is omitted).
2. **Validates** the merged config against `plugin.manifest.config`
   — the plugin's Zod schema.
3. On parse failure, pushes the plugin onto the `rejected` array
   with the Zod error message and continues to the next plugin.
4. On parse success, calls `registry.register(plugin, parsed.data, { enabled })`
   so the registry stores the validated config and the resolved
   enable state.
5. If the plugin is enabled and defines `plugin.setup`, calls it
   with a fresh `PluginContext`. A throwing `setup` is caught and
   reported in the `rejected` array — the plugin stays registered
   (already added to the registry) but is treated as failed for
   reporting purposes.

The loader **does not** abort on failure. The caller is responsible
for deciding whether `result.rejected.length > 0` should crash boot,
log a warning, or surface an admin notification.

```ts
import { PluginRegistry, loadPlugins } from '@ever-works/plugin-runtime';
import { plugin as demo } from '@ever-works/plugin-demo';

const registry = new PluginRegistry();
const result = await loadPlugins(registry, [
  {
    plugin: demo,
    sources: {
      env: { message: process.env.DEMO_MESSAGE ?? 'Demo plugin loaded' },
    },
  },
]);

if (result.rejected.length > 0) {
  // crash boot, or surface to admins — host's choice
  throw new Error(
    `Plugins failed to load: ${result.rejected
      .map(r => `${r.name} (${r.reason})`)
      .join(', ')}`,
  );
}
```

### `enabled` precedence

If `enabled` is omitted on the entry the registry falls back to
`plugin.manifest.defaultEnabled` (and finally to `true`). To force a
plugin off without removing it from the bundled list — for staged
rollouts or feature flags — pass `enabled: false`. The plugin still
goes through validation; `setup()` is **not** invoked while
disabled. The admin can flip it later via `registry.enable(name)`.

### What `setup()` receives

The loader passes a synthetic `PluginContext` with three fields
fixed at register time:

```ts
{ name: plugin.manifest.name, enabled: true, config: parsed.data }
```

Long-running side effects do not belong here — the boot sequence
awaits every `setup()` before the app starts serving traffic. Defer
warm-up tasks to background jobs.

## `mergeConfigSources(sources)` — combine env / DB / override

```ts
function mergeConfigSources(
  sources: PluginConfigSources,
): Record<string, unknown>;
```

Shallow-merges the three sources in this **precedence order**
(later wins):

```
env  ⊆  db  ⊆  override
```

- **`env`** — operator-controlled baseline. Typical use: read
  `process.env.<PLUGIN>__<KEY>` in the host's boot module and pass
  the parsed object through here.
- **`db`** — admin-controlled value persisted in `plugin_settings`.
  Empty when no row exists.
- **`override`** — host-controlled escape hatch for tests, feature
  flags, and one-off rollouts.

```ts
const merged = mergeConfigSources({
  env:      { mode: 'preview', region: 'eu' },
  db:       { region: 'us' },
  override: { mode: 'live'    },
});
// → { mode: 'live', region: 'us' }
```

The merge is intentionally **shallow** in v1: nested objects are
replaced wholesale, not merged. Plugins that need granular nested
overrides should flatten their schema (`db.region` not
`db: { region }`) or graduate to a deep merge in a follow-up spec.

> **Why shallow?** Each plugin's Zod schema is the source of truth
> for the merged shape. A shallow merge is predictable, debuggable,
> and makes it impossible to silently inherit a stale nested value
> from a lower-precedence source.

## `PluginConfigSources` — the input shape

```ts
interface PluginConfigSources {
  env?:      Record<string, unknown>;
  db?:       Record<string, unknown>;
  override?: Record<string, unknown>;
}
```

All three keys are optional — omitting them is the same as passing
an empty object. The loader does **not** read environment variables
or query the database itself; it only consumes whatever the host
already collected. This keeps the runtime free of a hard dependency
on `process.env` parsing or a DB driver, so the same package runs
unchanged in tests, in `apps/web`, in Storybook, and in future
React-Native or Electron hosts.

The host-app side of this contract — env-key conventions
(`<PLUGIN_NAME>__<KEY>`), the `plugin_settings` schema, and the
admin REST endpoints that mutate it — is tracked under
[Spec 002 / Phase C](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/tasks.md)
(`T-007`, `T-008`).

## `LoadPluginsResult` — the return shape

```ts
interface LoadPluginsResult {
  registered: string[];
  rejected:   Array<{ name: string; reason: string }>;
}
```

- `registered` lists the plugin names that passed validation, in
  the order they appeared in the input. Useful for boot logging
  and admin diagnostics.
- `rejected` lists every plugin that **failed validation** *or*
  whose `setup()` threw. Each entry carries the plugin name and a
  human-readable reason (the Zod issue summary or the setup error
  message, prefixed with `setup failed: `).

The two arrays are **disjoint** for validation failures — a plugin
that fails Zod parse never registers and never appears in
`registered`. A plugin whose `setup()` throws appears in **both**
arrays: it is registered (config was valid) but reported as failed
for the host to react to.

## Failure matrix

| Scenario                                  | Registered? | In `rejected`? | `setup()` invoked? |
| ----------------------------------------- | ----------- | -------------- | ------------------ |
| Config passes Zod                         | yes         | no             | yes (if defined)   |
| Config fails Zod                          | no          | yes            | no                 |
| Config passes; `setup()` throws           | yes         | yes            | yes                |
| `enabled: false` + valid config           | yes         | no             | no                 |
| Plugin name already registered            | throws      | n/a            | n/a                |
| Empty `plugins` array                     | n/a         | empty          | n/a                |

The "name already registered" case throws synchronously from
`PluginRegistry.register` — `loadPlugins` does not swallow it
because a duplicate plugin name is a programming error, not an
operational one.

## Testing the loader directly

`createTestRegistry` from
[`packages/plugin-runtime/src/testing.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/testing.ts)
wraps `loadPlugins` for the common case (one plugin, no overrides).
For richer scenarios — verifying override precedence, asserting on
`rejected`, or simulating a thrown `setup()` — call `loadPlugins`
directly:

```ts
import { PluginRegistry, loadPlugins } from '@ever-works/plugin-runtime';
import { plugin as mything } from '@ever-works/plugin-mything';

describe('mything plugin → loader', () => {
  it('override beats db beats env', async () => {
    const registry = new PluginRegistry();
    const result = await loadPlugins(registry, [
      {
        plugin: mything,
        sources: {
          env:      { region: 'eu' },
          db:       { region: 'us' },
          override: { region: 'apac' },
        },
      },
    ]);
    expect(result.rejected).toEqual([]);
    expect(result.registered).toEqual(['mything']);
  });

  it('rejects an invalid config without crashing other plugins', async () => {
    const registry = new PluginRegistry();
    const result = await loadPlugins(registry, [
      { plugin: mything, sources: { env: { region: 12345 as any } } },
    ]);
    expect(result.registered).toEqual([]);
    expect(result.rejected[0]?.name).toBe('mything');
  });
});
```

See [Testing a Plugin § 5 — Loader integration](./testing-a-plugin.md#5-end-to-end-with-playwright)
for the host-app smoke layer.

## Adding a new loader feature

Loader features are part of the public runtime surface. The
minimal change set is:

1. Add the new export (or new option on an existing export) to
   [`packages/plugin-runtime/src/loader.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/loader.ts).
2. Re-export from
   [`packages/plugin-runtime/src/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/index.ts).
3. Add a section to **this** page describing the signature, the
   semantics, and any failure modes.
4. Update the **At a glance** table at the top.
5. Append a line to [`docs/log.md`](../log.md) and reference the
   feature spec under `docs/spec/<NNN>-<slug>/`.

Do **not** rename an existing export. If the semantics drift, add
a new export, deprecate the old one in this reference, and remove
it only when no bundled plugin still uses it (Article VIII of the
[constitution](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)).

## See also

- [Plugin System (Architecture)](../architecture/plugin-system.md)
- [Authoring a Plugin](./authoring-a-plugin.md)
- [Plugin Lifecycle](./lifecycle.md) — the lifecycle context for
  the boot phase the loader implements.
- [Testing a Plugin](./testing-a-plugin.md)
- [Plugin Capabilities Reference](./capabilities.md) — the
  per-capability reference paired with `providers.ts`.
- [Plugin Slots Reference](./slots.md) — the per-slot reference
  paired with `slots.ts`.
- [Plugin Registry Reference](./registry.md) — the per-API
  reference for `PluginRegistry`, the class the loader populates.
- [Plugin SlotHost Reference](./slot-host.md) — the per-component
  reference paired with `SlotHost.tsx`; the host that ultimately
  renders every plugin the loader registers.
- [Plugin Testing Reference](./testing.md) — the per-helper
  reference paired with `testing.ts`; documents `createTestRegistry`
  as a thin wrapper that delegates to `loadPlugins` with empty
  config sources, and points back at this reference for the explicit
  cases (config-required plugins, persistence callbacks, rejection
  inspection) where tests must call `loadPlugins` directly so they
  can pass `sources` and inspect `LoadPluginsResult.rejected`.
- [Plugin Manifest Reference](./manifest.md) — the per-field
  reference paired with `manifest.ts`; documents every field this
  loader reads (`name`, `version`, `templateRange`, `capabilities`,
  `config`, `defaultEnabled`, `adminToggleable`, `homepage`) and
  the failure-matrix entries that map straight onto
  `LoadPluginsResult.rejected[name].reason`.
- [Plugin Packages](./packages.md)
- [Plugin Definition Reference](./plugin.md) — per-export reference paired with `plugin.ts`; documents the `DirectoryPlugin<C>` shape `loadPlugins` consumes, the `PluginContext` it builds for `setup`, and the `defineDirectoryPlugin` factory that gives `setup`'s `ctx.config` its inferred `z.infer<C>` type.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
- [`packages/plugin-runtime/src/loader.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/loader.ts) — the source of truth.
