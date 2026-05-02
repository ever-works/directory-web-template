---
id: plugin-registry
title: Plugin Registry Reference
sidebar_label: Registry Reference
sidebar_position: 9
---

# Plugin Registry Reference

> **Status.** Authoritative reference for the v1 `PluginRegistry`
> defined in [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The class API is locked by [`packages/plugin-runtime/src/registry.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/registry.ts);
> when the runtime adds, removes, or renames a public method update
> **this** page in the same change so the doc and the runtime cannot
> drift.

The **registry** is the in-memory store the runtime uses to remember
every loaded plugin, its validated config, its resolved enable
state, and the slots and providers it contributes. The host app
constructs **one** registry at boot, hands it to
[`loadPlugins(...)`](./loader.md), and then every layout, server
component, and admin endpoint reads from the same instance.

`PluginRegistry` is intentionally **synchronous on reads** so a
layout can call `registry.slotsFor("header.right")` from a server
component without paying for an async hop. **Mutations**
(`enable` / `disable`) are async because they may persist enable
state through a host-supplied callback.

## At a glance

| Surface                         | Kind          | Async? | Throws?                                |
| ------------------------------- | ------------- | ------ | -------------------------------------- |
| `new PluginRegistry({ … })`     | constructor   | no     | no                                     |
| `register(plugin, cfg, opts?)`  | mutation      | no     | yes — duplicate name                   |
| `isEnabled(name)`               | read          | no     | no                                     |
| `isRegistered(name)`            | read          | no     | no                                     |
| `enable(name)`                  | mutation      | yes    | yes — unregistered name                |
| `disable(name)`                 | mutation      | yes    | yes — unregistered name                |
| `get<C>(capability)`            | read          | no     | no                                     |
| `list<C>(capability)`           | read          | no     | no                                     |
| `slotsFor(slotId)`              | read          | no     | no                                     |
| `list_all()`                    | read          | no     | no                                     |

All of the above are exported through the runtime's barrel:

```ts
import { PluginRegistry } from '@ever-works/plugin-runtime';
```

## `new PluginRegistry({ persistEnabled? })`

```ts
constructor(opts?: {
  persistEnabled?: (name: string, enabled: boolean) => Promise<void>;
});
```

Construct an empty registry. The optional `persistEnabled` callback
is invoked from `enable` / `disable` so the host app can persist the
new state to its `plugin_settings` row. Tests typically omit it —
no callback means changes only live in memory for the test run.

```ts
const registry = new PluginRegistry({
  persistEnabled: async (name, enabled) => {
    await db.update(pluginSettings).set({ enabled }).where(eq(pluginSettings.name, name));
  },
});
```

The callback is **fire-and-await** — `enable` / `disable` resolve
*after* the persistence write completes. Throwing from the callback
propagates out of the mutation so the host can decide whether to
crash, retry, or surface an admin error.

## `register(plugin, validatedConfig, opts?)` — add a plugin

```ts
register<TConfig>(
  plugin: DirectoryPlugin,
  validatedConfig: TConfig,
  opts?: { enabled?: boolean },
): void;
```

Synchronously add a plugin to the registry with its **already-validated**
config. The name comes from `plugin.manifest.name`. Throws if a plugin
with the same name is already registered — duplicate names are a
programming error, not an operational one.

The resolved enable state follows this precedence:

```
opts?.enabled  ??  plugin.manifest.defaultEnabled  ??  true
```

The host app should rarely call `register` directly — most code
goes through [`loadPlugins`](./loader.md), which validates the
config first. Direct calls are useful for tests that want to skip
the Zod hop and assert on lookup behaviour.

```ts
registry.register(myPlugin, { region: 'eu' }, { enabled: false });
```

## `isEnabled(name)` / `isRegistered(name)` — membership checks

```ts
isEnabled(name: string): boolean;
isRegistered(name: string): boolean;
```

Two distinct booleans:

- `isRegistered("mything")` — `true` once `register` has succeeded,
  regardless of enabled state. Used by the admin UI to list every
  plugin (including disabled ones).
- `isEnabled("mything")` — `true` only if the plugin is registered
  **and** currently enabled. Used by feature flags and capability
  lookups.

Neither method throws — an unknown name returns `false`.

## `enable(name)` / `disable(name)` — flip the toggle

```ts
async enable(name: string): Promise<void>;
async disable(name: string): Promise<void>;
```

Both methods are **idempotent**: calling `enable` on an already-enabled
plugin is a no-op, and so is `disable` on a disabled plugin. In the
no-op case the persistence callback is **not** invoked.

`disable` runs the plugin's optional `teardown()` hook **before**
persisting and reports nothing if it throws — by convention,
`teardown` should log and return rather than throwing. If the plugin
later re-enables, `setup()` does **not** re-run; the plugin keeps
its registration but its slot contributions and provider lookups
become live again.

Both methods **throw `Error`** if the named plugin is not registered.
Use `isRegistered(name)` first if you cannot guarantee the name.

```ts
await registry.disable('analytics-posthog'); // teardown + persist
await registry.enable('analytics-posthog');  // persist (no setup re-run)
```

## `get<C>(capability)` — single-provider lookup

```ts
get<C extends keyof CapabilityProviderMap>(
  capability: C,
): CapabilityProviderMap[C] | undefined;
```

Return the **first** enabled provider for `capability`, or
`undefined` if none. "First" means **registration order** — the
order in which plugins were `register`-ed (which matches the order
they appear in `apps/web/lib/plugins/registry.ts` after
[`loadPlugins`](./loader.md) runs).

Use `get` for capabilities where the host expects exactly one
provider per session: `auth`, `payment`, `search`, `content-source`,
`maps`, `ai`. See the
[Capabilities Reference](./capabilities.md#how-the-runtime-resolves-multiple-providers)
for the full list and the rationale.

```ts
const auth = registry.get('auth');
if (auth) {
  await auth.signIn?.();
}
```

`get` is generic over `keyof CapabilityProviderMap`, so the return
type is the matching capability interface — no manual casting.

## `list<C>(capability)` — fan-out lookup

```ts
list<C extends keyof CapabilityProviderMap>(
  capability: C,
): Array<CapabilityProviderMap[C]>;
```

Return **every** enabled provider for `capability`, in registration
order. The array is fresh on each call — it is safe to mutate the
returned value, but the registry is unaffected.

Use `list` for fan-out capabilities where each provider observes
the same event: `analytics`, `newsletter`, `notifications`. The
host iterates and forwards the event to every provider:

```ts
const analytics = registry.list('analytics');
for (const provider of analytics) {
  await provider.track(eventName, props);
}
```

`list` returns an empty array — never `null` or `undefined` — so
consumers can iterate without a falsy check.

## `slotsFor(slotId)` — slot-component lookup

```ts
slotsFor(slotId: SlotId): Array<{
  component: ComponentType<SlotComponentProps>;
  ctx: PluginContext;
  pluginName: string;
}>;
```

Return every React component contributed to `slotId`, in
registration order, paired with the contributing plugin's own
[`PluginContext`](./lifecycle.md#runtime-context-pluginContext).
The runtime's [`<SlotHost />`](./packages.md#ever-worksplugin-runtime)
calls this internally — application code rarely needs to invoke it
directly.

The returned objects are **value rows**, not React elements — the
caller decides how to render them. `<SlotHost />` wraps each in a
`Fragment` keyed by `pluginName` so React can reconcile contributions
across renders without remounting them when a sibling plugin enables
or disables.

`slotsFor` is the only registry read that returns a non-empty
discriminator (`pluginName`) alongside the value, because slot
hosts need a stable React key.

## `list_all()` — admin-side enumeration

```ts
list_all(): Array<{ plugin: DirectoryPlugin; enabled: boolean }>;
```

Return **every** registered plugin, including disabled ones, paired
with its current enable state. Used by the admin plugin manager to
render the on / off switch grid; not part of the request-time hot
path.

```ts
const rows = registry.list_all();
return Response.json(rows.map(({ plugin, enabled }) => ({
  name: plugin.manifest.name,
  version: plugin.manifest.version,
  enabled,
})));
```

`list_all` is intentionally underscore-cased to flag it as the
admin-side counterpart of `list` (which is the per-capability
fan-out lookup). Renaming will happen in a future spec if a more
idiomatic name lands; for v1 the underscore is the contract.

## Read / write surface summary

| Caller             | Reads                                      | Writes                       |
| ------------------ | ------------------------------------------ | ---------------------------- |
| Layouts (RSC)      | `slotsFor`                                 | none                         |
| Capability code    | `get`, `list`                              | none                         |
| Admin UI / API     | `list_all`, `isEnabled`, `isRegistered`    | `enable`, `disable`          |
| Boot / loader      | none                                       | `register`                   |
| Tests              | all reads                                  | `register`, `enable`/`disable`|

Layouts must not mutate the registry — flipping enable state mid-render
would break React reconciliation. Confine mutations to admin
endpoints and the boot path.

## Failure matrix

| Scenario                                  | Outcome                                          |
| ----------------------------------------- | ------------------------------------------------ |
| `register` with a duplicate name          | throws `Error('Plugin "<name>" is already registered')` |
| `enable` / `disable` for unknown name     | throws `Error('Plugin "<name>" is not registered')`     |
| `enable` on already-enabled plugin        | no-op; callback **not** invoked                  |
| `disable` on already-disabled plugin      | no-op; `teardown` **not** invoked                |
| `get` / `list` for unknown capability     | returns `undefined` / `[]` respectively          |
| `slotsFor` with no contributors           | returns `[]`                                     |
| `persistEnabled` callback throws          | error propagates out of the mutation             |
| `teardown` throws inside `disable`        | error propagates; the plugin **stays disabled** in memory |

The "stays disabled in memory" semantics for a throwing `teardown`
matters for retries: callers can safely call `disable` again after
fixing the underlying issue, and the registry will be a no-op
because the plugin is already disabled.

## Testing the registry directly

`createTestRegistry` from
[`packages/plugin-runtime/src/testing.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/testing.ts)
loads a list of plugins through the same `loadPlugins` path the
host app uses. For richer scenarios — verifying mutation order,
asserting on `list_all`, or simulating a duplicate-name throw —
construct a `PluginRegistry` directly:

```ts
import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '@ever-works/plugin-runtime';
import myThing from '../index';

describe('mything plugin → registry semantics', () => {
  it('disable runs teardown and removes the slot contribution', async () => {
    const registry = new PluginRegistry();
    registry.register(myThing, { region: 'eu' });
    expect(registry.slotsFor('home.before-listing')).toHaveLength(1);

    await registry.disable('mything');
    expect(registry.slotsFor('home.before-listing')).toHaveLength(0);
    expect(registry.isRegistered('mything')).toBe(true);
    expect(registry.isEnabled('mything')).toBe(false);
  });

  it('throws on duplicate registration', () => {
    const registry = new PluginRegistry();
    registry.register(myThing, { region: 'eu' });
    expect(() => registry.register(myThing, { region: 'us' })).toThrow(
      /already registered/i,
    );
  });
});
```

See [Testing a Plugin § 3.1 — Registry round-trip](./testing-a-plugin.md#3-test-the-registry-round-trip)
for the canonical higher-level path.

## Adding a new registry method

A new method on `PluginRegistry` is part of the public runtime
surface. The minimal change set is:

1. Add the method to
   [`packages/plugin-runtime/src/registry.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/registry.ts).
2. Re-export from
   [`packages/plugin-runtime/src/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/index.ts)
   if it surfaces a new type alongside the class.
3. Add a section to **this** page documenting the signature, the
   semantics, and any failure modes.
4. Update the **At a glance** and **Read / write surface summary**
   tables.
5. Append a line to [`docs/log.md`](../log.md) and reference the
   feature spec under `docs/spec/<NNN>-<slug>/`.

Do **not** rename an existing method. If the semantics drift, add
a new method, deprecate the old one in this reference, and remove
it only when no bundled plugin or host call site still uses it
(Article VIII of the
[constitution](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)).

## See also

- [Plugin System (Architecture)](../architecture/plugin-system.md)
- [Authoring a Plugin](./authoring-a-plugin.md)
- [Plugin Lifecycle](./lifecycle.md) — the lifecycle context for
  the boot phase that populates the registry, and for the
  enable / disable / teardown pattern.
- [Plugin Loader Reference](./loader.md) — the per-API reference
  paired with `loader.ts`; the loader is the only caller that
  invokes `register` in production.
- [Testing a Plugin](./testing-a-plugin.md)
- [Plugin Capabilities Reference](./capabilities.md) — the
  per-capability reference paired with `providers.ts`; explains
  which capabilities are single-lookup vs fan-out.
- [Plugin Slots Reference](./slots.md) — the per-slot reference
  paired with `slots.ts`; documents how `slotsFor` results are
  consumed by `<SlotHost />`.
- [Plugin SlotHost Reference](./slot-host.md) — per-component
  reference paired with `SlotHost.tsx`; the only caller in production
  that invokes `slotsFor`, plus the `fallback` semantics, the
  Fragment-only output, and the failure matrix that anchors React
  keys on the registry's duplicate-name guarantee.
- [Plugin Testing Reference](./testing.md) — per-helper reference
  paired with `testing.ts`; the canonical way to construct a
  registry in unit tests, and the failure matrix that ties
  `createTestRegistry`'s **only** propagated throw (duplicate-name)
  back to the registry's `register` contract documented above.
- [Plugin Manifest Reference](./manifest.md) — per-field reference
  paired with `manifest.ts`; documents `manifest.name` (the key
  this registry stores under), `manifest.capabilities` (the index
  `list<C>` reads), and the duplicate-name / rename guarantees
  the registry depends on.
- [Plugin Packages](./packages.md)
- [Plugin Definition Reference](./plugin.md) — per-export reference paired with `plugin.ts`; documents the `DirectoryPlugin<C>` shape `register` accepts, the `PluginProviders` and `PluginSlots<TConfig>` maps the registry indexes, and the `setup` / `teardown` hooks `register` / `disable` orchestrate.
- [Plugin Providers Reference](./providers.md) — per-export reference paired with `providers.ts`; documents the nine concrete provider interfaces `registry.get<C>` and `registry.list<C>` return, the `CapabilityProviderMap` mapped type that types both lookups generically (`get<C extends keyof CapabilityProviderMap>(c: C): CapabilityProviderMap[C] | undefined`), and the failure matrix that pairs every observable failure (compile-time mis-typing, throwing `setup`, fan-out swallow, single-lookup propagation) to the layer that surfaces it.
- [Reference Plugin (`@ever-works/plugin-demo`)](./plugin-demo.md) — per-source-file reference paired with `packages/plugin-demo/src/`; the demo plugin is keyed in this registry under `name: 'demo'` and is the in-tree worked example of every registry contract on this page (the `'demo'` key uniqueness guarantee, the `slotsFor('header.right')` fan-out result the `<SlotHost />` consumer reads, the `isEnabled('demo')` flip the `adminToggleable: true` admin flow exercises, and the duplicate-name throw any second `register` call with the same key would produce).
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
- [`packages/plugin-runtime/src/registry.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/registry.ts) — the source of truth.
