---
id: plugin-plugin
title: Plugin Definition Reference
sidebar_label: Plugin Reference
sidebar_position: 13
---

# Plugin Definition Reference

> **Status.** Authoritative reference for the v1 plugin definition
> surface defined in [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The plugin shape, the `PluginContext` runtime context, the
> `SlotComponentProps` slot-component contract, and the
> `defineDirectoryPlugin` factory are all locked by
> [`packages/plugin-sdk/src/plugin.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/plugin.ts).
> When the SDK adds, removes, or renames a member of any of those
> types update **this** page in the same change so the doc and the
> SDK cannot drift.

`@ever-works/plugin-sdk` exposes one author-facing factory —
[`defineDirectoryPlugin`](#definedirectoryplugin) — and the four
types that plugin authors interact with most often:

- [`DirectoryPlugin<C>`](#directorypluginc) — the shape the factory
  returns.
- [`PluginContext<TConfig>`](#plugincontexttconfig) — the runtime
  context handed to the [`setup`](#setup) hook and to every slot
  component.
- [`SlotComponentProps<TConfig>`](#slotcomponentpropstconfig) — the
  props every slot component must accept.
- [`PluginProviders`](#pluginproviders) and
  [`PluginSlots<TConfig>`](#pluginslotstconfig) — the typed maps that
  back `plugin.providers` and `plugin.slots`.

This page is the **per-export reference** that pairs with
[`plugin.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/plugin.ts)
exactly the way [`capabilities.md`](./capabilities.md) pairs with
`capabilities.ts`, [`slots.md`](./slots.md) pairs with `slots.ts`,
[`manifest.md`](./manifest.md) pairs with `manifest.ts`,
[`loader.md`](./loader.md) pairs with `loader.ts`,
[`registry.md`](./registry.md) pairs with `registry.ts`,
[`slot-host.md`](./slot-host.md) pairs with `SlotHost.tsx`, and
[`testing.md`](./testing.md) pairs with `testing.ts`. For the
end-to-end author workflow that wires a `defineDirectoryPlugin`
call into a working plugin package, see
[Authoring a Plugin](./authoring-a-plugin.md) — this page is the
*contract*, that page is the *workflow*.

## At a glance

| Surface                          | Kind             | Async? | Throws?  | Read by                                                                   |
| -------------------------------- | ---------------- | ------ | -------- | ------------------------------------------------------------------------- |
| `defineDirectoryPlugin(plugin)`  | factory          | no     | no       | plugin module default export                                              |
| `DirectoryPlugin<C>`             | interface        | —      | —        | [`loadPlugins`](./loader.md), [`PluginRegistry.register`](./registry.md)  |
| `PluginContext<TConfig>`         | interface        | —      | —        | [`setup`](#setup), [slot components](#slotcomponentpropstconfig)          |
| `SlotComponentProps<TConfig>`    | interface        | —      | —        | every slot component declared in `plugin.slots`                           |
| `PluginProviders`                | type alias       | —      | —        | `plugin.providers` — typed by [capability](./capabilities.md)             |
| `PluginSlots<TConfig>`           | type alias       | —      | —        | `plugin.slots` — typed by [slot id](./slots.md)                           |

All five types are re-exported through the SDK barrel so a plugin
author never imports from `./plugin` directly:

```ts
import {
  defineDirectoryPlugin,
  type DirectoryPlugin,
  type PluginContext,
  type SlotComponentProps,
  type PluginProviders,
  type PluginSlots,
} from '@ever-works/plugin-sdk';
```

## `defineDirectoryPlugin`

```ts
export function defineDirectoryPlugin<C extends z.ZodTypeAny>(
  plugin: DirectoryPlugin<C>,
): DirectoryPlugin<C>;
```

The single author-facing factory. It takes a plugin definition and
returns it unchanged — its job is **type inference**, not validation.
Calling `defineDirectoryPlugin({...})` lets TypeScript infer the
plugin's `C extends z.ZodTypeAny` from the
[`manifest.config`](./manifest.md#config) Zod schema and propagate
the inferred config type into:

- [`PluginContext<PluginConfig<C>>.config`](#config) — the
  validated, merged config the [`setup`](#setup) hook receives.
- [`SlotComponentProps<PluginConfig<C>>.ctx.config`](#slotcomponentpropstconfig) —
  the same validated config every slot component receives.
- The whole [`DirectoryPlugin<C>`](#directorypluginc) shape so
  `setup`, `slots`, and `providers` all type-check against the
  inferred config.

This is why the factory is the **only** supported way to author a
plugin — a hand-rolled `export default { manifest: { ... } }` object
loses the `C` parameter and any reference to `ctx.config` in a slot
component will fall back to `unknown`. The factory does **not**:

- run the [Zod schema](./manifest.md#config) — that happens inside
  [`loadPlugins`](./loader.md#loadpluginsregistry-plugins--register-a-list-of-plugins)
  during boot, after merging env / DB / override config sources.
- check the [`templateRange`](./manifest.md#templaterange) — also
  the loader's job at boot.
- mutate the plugin in any way — it returns the same object reference
  it received. A test can compare `plugin === defineDirectoryPlugin(plugin)`
  and the assertion holds.

## `DirectoryPlugin<C>`

```ts
export interface DirectoryPlugin<C extends z.ZodTypeAny = z.ZodTypeAny> {
  manifest: PluginManifest<C>;
  setup?: (ctx: PluginContext<PluginConfig<C>>) => void | Promise<void>;
  teardown?: () => void | Promise<void>;
  slots?: PluginSlots<PluginConfig<C>>;
  providers?: PluginProviders;
}
```

The shape every plugin module's default export must satisfy. The
generic parameter `C` is the
[Zod schema](./manifest.md#config) declared on `manifest.config`; it
flows through `setup`, `slots`, and (transitively, via the slot
component's `ctx`) every slot component's props.

### `manifest`

```ts
manifest: PluginManifest<C>;
```

The metadata block. **Required.** See the
[Plugin Manifest Reference](./manifest.md) for every field
(`name`, `version`, `description`, `templateRange`, `capabilities`,
`config`, `defaultEnabled`, `adminToggleable`, `homepage`).

The loader reads `manifest.name` to enforce uniqueness, then
`manifest.config` to validate the merged
[config sources](./loader.md#loadpluginsregistry-plugins--register-a-list-of-plugins),
then `manifest.templateRange` against the host
`templateVersion`, then `manifest.capabilities` to index the plugin
in the registry's [`list<C>`](./registry.md#listcapability--enumerate-providers-by-capability)
view, then `manifest.defaultEnabled` to decide the initial enable
state when no `plugin_settings` row exists. The plugin is registered
with all of those checks already passing — by the time `setup`
runs, the plugin's manifest is known-good.

### `setup`

```ts
setup?: (ctx: PluginContext<PluginConfig<C>>) => void | Promise<void>;
```

Optional one-time setup. Called by
[`loadPlugins`](./loader.md#loadpluginsregistry-plugins--register-a-list-of-plugins)
**after** the Zod schema has validated the merged config, but
**before** the registry exposes the plugin's
[`providers`](#pluginproviders) and
[`slots`](#pluginslotstconfig) to the rest of the host. The hook
receives a [`PluginContext<PluginConfig<C>>`](#plugincontexttconfig)
whose `config` field is the parsed schema output (so a plugin that
declared `z.object({ apiKey: z.string().min(1) })` sees
`ctx.config.apiKey: string`, not `string | undefined`).

Use `setup` for:

- network handshakes (analytics SDK init, AI client warm-up,
  newsletter API ping) where you need the parsed config and want a
  clear failure point at boot.
- one-time logger lines (`ctx.logger?.info('connected', { region })`)
  that confirm the plugin is wired against the right environment.
- cross-plugin coordination via shared module-level state — a
  pattern that should remain rare; prefer a capability if the
  coordination has any structure.

`setup` is **not** the right place for:

- DOM mutation — slots are React components, not imperative hooks.
- registering with the [`PluginRegistry`](./registry.md) — the
  loader does that for you, before `setup` runs.
- reading or mutating other plugins' state — capabilities are the
  only stable cross-plugin contract.

If `setup` throws (sync) or rejects (async), the loader records the
plugin in
[`LoadPluginsResult.rejected[name]`](./loader.md#loadpluginsresult-and-pluginconfigsources)
with `reason: 'setup'` and the registry never registers it. The
host's other plugins are unaffected — failure is plugin-local.

### `teardown`

```ts
teardown?: () => void | Promise<void>;
```

Optional cleanup. Called by
[`PluginRegistry.disable`](./registry.md#disablename--turn-a-plugin-off-at-runtime)
when an admin (or the host's own code) turns the plugin off at
runtime. A throwing `teardown` is **swallowed** by `disable` — the
plugin still moves to the disabled state, and the failure surfaces
through the
[`PluginRegistry` failure matrix](./registry.md#failure-matrix)
rather than propagating into the admin UI's HTTP response.

`teardown` does **not** run at host shutdown — the runtime relies on
process exit for that. It runs only when the registry's enabled
state flips a plugin from `true` to `false`.

### `slots`

```ts
slots?: PluginSlots<PluginConfig<C>>;
```

The map of slot-component contributions. Keys are
[slot ids](./slots.md), values are React components that receive
[`SlotComponentProps<PluginConfig<C>>`](#slotcomponentpropstconfig).
Components are rendered by [`<SlotHost />`](./slot-host.md) in
registration order, each wrapped in a Fragment keyed by
`manifest.name`. A plugin may contribute to as many slots as it
wants — and a single slot id may receive contributions from any
number of plugins, so a host layout doesn't need to know which
plugins exist to render the slot.

### `providers`

```ts
providers?: PluginProviders;
```

The map of [capability](./capabilities.md) provider implementations.
Keys are capability ids, values are the corresponding interface
implementations from
[`providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts).
The registry indexes providers by capability so a host can call
[`registry.get('analytics')`](./registry.md#getcapability--read-the-active-provider-for-a-capability)
or
[`registry.list('analytics')`](./registry.md#listcapability--enumerate-providers-by-capability)
without knowing which plugin attached the provider.

A plugin may declare a capability in `manifest.capabilities`
**without** attaching a provider in `providers` (a `ui-slot`-only
plugin is the canonical case — the
[capabilities reference](./capabilities.md#ui-slot--no-provider-interface)
explains why `ui-slot` ships no programmatic provider).

## `PluginContext<TConfig>`

```ts
export interface PluginContext<TConfig = unknown> {
  config: TConfig;
  name: string;
  enabled: boolean;
  logger?: {
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
  };
}
```

The runtime context handed to [`setup`](#setup) and to every slot
component (via [`SlotComponentProps.ctx`](#slotcomponentpropstconfig)).
A plugin's slot component calls `ctx.config.apiKey` exactly the
same way `setup` does — both read from the same merged, validated
source — so a plugin author has one mental model for "where my
config comes from" and one mental model for "where my logger lives".

### `config`

```ts
config: TConfig;
```

The validated, merged config for this plugin. Where it comes from:

1. The loader merges
   [config sources](./loader.md#loadpluginsregistry-plugins--register-a-list-of-plugins)
   (env vars, the
   [`plugin_settings.config_json`](./lifecycle.md#5-persistence-plugin_settings)
   row, and any per-test override) with
   [`mergeConfigSources`](./loader.md#mergeconfigsources--merge-env--db--override-config).
2. The merged JSON is parsed through the plugin's
   [`manifest.config`](./manifest.md#config) Zod schema — a failure
   here puts the plugin in
   [`LoadPluginsResult.rejected`](./loader.md#loadpluginsresult-and-pluginconfigsources)
   with `reason: 'config'` and the plugin is never registered.
3. The parsed schema output is what `ctx.config` exposes to `setup`
   and every slot component.

`TConfig` is `unknown` by default for type-erased call sites; the
[`defineDirectoryPlugin`](#definedirectoryplugin) factory infers it
to `z.infer<C>` for plugin authors so `ctx.config` is fully typed.

### `name`

```ts
name: string;
```

Mirrors [`manifest.name`](./manifest.md#name). Useful for log lines
(`ctx.logger?.info('warmed up', { name: ctx.name })`) and for slot
components that want to render a stable, plugin-specific
`data-plugin` attribute. **Never** localized — see
[`manifest.name`](./manifest.md#name) for the reasoning.

### `enabled`

```ts
enabled: boolean;
```

Whether the plugin is currently enabled in the registry. Inside
`setup`, `enabled` is **always `true`** — the loader only runs
`setup` for plugins that pass the
[`defaultEnabled`](./manifest.md#defaultenabled) +
`plugin_settings` resolution as enabled. Slot components see the
current value at render time; a host that disables a plugin via
[`PluginRegistry.disable`](./registry.md#disablename--turn-a-plugin-off-at-runtime)
will simply stop receiving the plugin's slot contributions, so a
slot component does not normally need to read `ctx.enabled`. It is
exposed for completeness and for tests that need to assert on the
flag without re-reading the registry.

### `logger`

```ts
logger?: {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
};
```

Optional namespaced logger. The runtime injects a child logger
scoped to the plugin's `name` so a host's structured logs stay
plugin-attributable. Plugins should prefer `ctx.logger` over
reaching for `console` so that a host that swaps the logger
implementation (pino, structlog, the eventual
[`016-typed-analytics-events`](../spec/016-typed-analytics-events/spec.md)
sink, …) does not need to chase down `console.*` calls. The field
is optional so hand-built test contexts (and the v1 runtime, which
ships without an injected logger) can omit it without a type error.

## `SlotComponentProps<TConfig>`

```ts
export interface SlotComponentProps<TConfig = unknown> {
  ctx: PluginContext<TConfig>;
}
```

The props every slot component receives. The single field is the
plugin's [`PluginContext`](#plugincontexttconfig) — a slot component
reads its own config (`props.ctx.config`), its own name
(`props.ctx.name`), and (rarely) its enabled flag and logger from
the context. A slot component does **not** receive any extra props
from [`<SlotHost />`](./slot-host.md) — the host explicitly does
not forward props through the slot interface, because every slot id
is contributed to by an open set of plugins and stable per-slot
prop shapes would couple the host's layout to the plugin set.

If a slot component needs page-scoped or request-scoped data, it
reads it the way any other React component reads it — via Next.js
`headers()` / `cookies()`, the host's React Query client, or a
context provider that the host layout mounts above
[`<SlotHost />`](./slot-host.md).

## `PluginProviders`

```ts
export type PluginProviders = {
  [K in Capability]?: K extends keyof CapabilityProviderMap
    ? CapabilityProviderMap[K]
    : never;
};
```

The typed map that backs [`plugin.providers`](#providers). Keys are
[capability ids](./capabilities.md), values are the matching
provider interface from
[`providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts)
via the
[`CapabilityProviderMap`](./capabilities.md#capabilityprovidermap)
lookup table. The mapped type is `Partial`, so a plugin that
declares `manifest.capabilities: ['analytics']` may still ship
`providers: {}` — the registry treats the absence of a provider
for a declared capability as "the plugin claims the capability but
has no programmatic implementation" and surfaces it via
[`registry.list<C>`](./registry.md#listcapability--enumerate-providers-by-capability)
without an entry. The
[`ui-slot`](./capabilities.md#ui-slot--no-provider-interface)
capability has `never` as its provider type, so attempting
`providers: { 'ui-slot': anything }` is a TypeScript error at the
plugin author's call site.

## `PluginSlots<TConfig>`

```ts
export type PluginSlots<TConfig = unknown> = Partial<
  Record<SlotId, ComponentType<SlotComponentProps<TConfig>>>
>;
```

The typed map that backs [`plugin.slots`](#slots). Keys are
[slot ids](./slots.md), values are React components whose props
match [`SlotComponentProps<TConfig>`](#slotcomponentpropstconfig).
The `Partial<Record<...>>` shape means a plugin may contribute to
zero, one, or many slot ids; an unknown key is a TypeScript error
because [`SlotId`](./slots.md#slotid) is a string literal union.

The map is consumed by
[`PluginRegistry.slotsFor`](./registry.md#slotsforslotid--enumerate-slot-contributions)
when a layout asks "which plugins contribute to this slot?" — that
read is what
[`<SlotHost slotId={...} registry={...} />`](./slot-host.md) does
at render time.

## Failure matrix

The factory itself never throws — every observable failure flows
through the loader / registry layer it returns into.

| Trigger                                                                 | Where it surfaces                                                                                                                                              | Notes                                                                                                                          |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Hand-rolled plugin object (no `defineDirectoryPlugin`).                  | TypeScript: `ctx.config` is `unknown` instead of `z.infer<C>`.                                                                                                  | Author error caught at compile time. The plugin still works at runtime; it just loses inference.                                |
| `manifest.name` collision across plugins.                                | [`PluginRegistry.register`](./registry.md#registerplugin-validatedconfig-opts--add-a-plugin) **throws** — the only manifest-level propagated failure.            | Same as the [`manifest.md` failure matrix](./manifest.md#failure-matrix). Hand-roll a different `name` or remove the duplicate. |
| `manifest.config` rejects the merged config.                             | [`LoadPluginsResult.rejected[name]`](./loader.md#loadpluginsresult-and-pluginconfigsources) with `reason: 'config'`. Plugin is never registered.                | Silent rejection, by design — a single bad plugin must not break the host. See [Loader Reference § Failure matrix](./loader.md#failure-matrix). |
| `manifest.templateRange` is invalid semver or doesn't match the host.    | [`LoadPluginsResult.rejected[name]`](./loader.md#loadpluginsresult-and-pluginconfigsources) with `reason: 'templateRange'`.                                     | Same flow as `config`; no throw.                                                                                                |
| `setup` throws or rejects.                                               | [`LoadPluginsResult.rejected[name]`](./loader.md#loadpluginsresult-and-pluginconfigsources) with `reason: 'setup'`. Plugin is never registered.                 | Plugin-local failure. Other plugins continue loading.                                                                           |
| `teardown` throws on `disable`.                                          | Swallowed by [`PluginRegistry.disable`](./registry.md#disablename--turn-a-plugin-off-at-runtime); plugin still becomes disabled.                                | Same row as the [`registry.md` failure matrix](./registry.md#failure-matrix).                                                   |
| Slot component throws on render.                                         | Bubbles through React when [`<SlotHost />`](./slot-host.md) calls it.                                                                                            | Wrap the slot in an `<ErrorBoundary>` if isolation is required. See [`slot-host.md` failure matrix](./slot-host.md#failure-matrix). |
| `providers: { 'ui-slot': anything }`.                                    | TypeScript error at the plugin author's call site (`never` value).                                                                                              | Caught at compile time by the [`PluginProviders`](#pluginproviders) mapped type.                                                |
| Slot id outside [`SlotId`](./slots.md#slotid).                           | TypeScript error at the plugin author's call site.                                                                                                              | Caught at compile time by the [`PluginSlots`](#pluginslotstconfig) mapped type.                                                 |

The matrix has no row for "config not validated" — every plugin
that ends up registered has had its config parsed by the
[manifest's Zod schema](./manifest.md#config), so the `TConfig`
type parameter on `PluginContext` is a safe assumption inside
`setup` and inside every slot component.

## Read / write surface summary

| Caller                                                | Reads                                                                                          | Writes                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Plugin author                                         | `defineDirectoryPlugin` factory; `DirectoryPlugin<C>` interface; `PluginContext`/`SlotComponentProps` types. | The default-exported plugin module — `defineDirectoryPlugin({...})`. |
| [`loadPlugins`](./loader.md)                          | `plugin.manifest`, `plugin.setup`, `plugin.providers`, `plugin.slots`.                          | Calls `setup(ctx)` once per plugin after Zod-validating config.    |
| [`PluginRegistry.register`](./registry.md)            | `plugin.manifest`, `plugin.providers`, `plugin.slots`.                                          | Indexes the plugin under `name`, capability, and slot id.          |
| [`PluginRegistry.disable`](./registry.md)             | `plugin.teardown`.                                                                              | Calls `teardown()` once per `disable(name)` transition.            |
| [`<SlotHost />`](./slot-host.md)                      | `plugin.slots[slotId]` via `slotsFor`.                                                          | Renders each contribution; passes `ctx: PluginContext` as the only prop. |
| [`createTestRegistry`](./testing.md)                  | The full `DirectoryPlugin[]` argument.                                                          | Re-routes through `loadPlugins` and `PluginRegistry`; same write surface. |
| Slot component                                        | `props.ctx.config`, `props.ctx.name`, `props.ctx.enabled`, `props.ctx.logger`.                  | None — slot components are pure renders.                           |

The table mirrors the
[registry read / write surface summary](./registry.md#read--write-surface-summary)
and the
[manifest read / write surface summary](./manifest.md#read--write-surface-summary)
so a contributor reading any of the three can navigate to the
matching surface in the other two without re-reading source.

## Worked examples

### Minimal `defineDirectoryPlugin` call

```ts
import { defineDirectoryPlugin } from '@ever-works/plugin-sdk';
import { z } from 'zod';

export default defineDirectoryPlugin({
  manifest: {
    name: 'analytics-posthog',
    version: '0.1.0',
    templateRange: '>=0.1 <1.0',
    capabilities: ['analytics'],
    config: z.object({
      enabled: z.boolean().default(false),
      apiKey: z.string().min(1),
    }),
  },
  providers: {
    analytics: {
      id: 'posthog',
      forward(name, payload) {
        if (!this.client) return;
        this.client.capture({ event: name, properties: payload });
      },
    },
  },
});
```

The plugin's `ctx.config` is fully typed as
`{ enabled: boolean; apiKey: string }` because the factory
inferred `C` from the `z.object({...})` literal.

### `setup` with the typed `ctx.config`

```ts
import { defineDirectoryPlugin } from '@ever-works/plugin-sdk';
import { z } from 'zod';

export default defineDirectoryPlugin({
  manifest: {
    name: 'analytics-posthog',
    version: '0.1.0',
    templateRange: '>=0.1 <1.0',
    capabilities: ['analytics'],
    config: z.object({ apiKey: z.string().min(1) }),
  },
  setup(ctx) {
    // ctx.config.apiKey is `string`, not `string | undefined`,
    // because the Zod schema enforces `min(1)` at boot.
    ctx.logger?.info('booting', { name: ctx.name });
  },
});
```

### Slot component reading `props.ctx`

```tsx
import { defineDirectoryPlugin, type SlotComponentProps } from '@ever-works/plugin-sdk';
import { z } from 'zod';

const Schema = z.object({ label: z.string().default('Beta') });
type Cfg = z.infer<typeof Schema>;

function Badge({ ctx }: SlotComponentProps<Cfg>) {
  return <span data-plugin={ctx.name}>{ctx.config.label}</span>;
}

export default defineDirectoryPlugin({
  manifest: {
    name: 'ui-beta-badge',
    version: '0.1.0',
    templateRange: '>=0.1 <1.0',
    capabilities: ['ui-slot'],
    config: Schema,
  },
  slots: { 'header.left': Badge },
});
```

The component is pure: every input it cares about flows through
`ctx`, and `<SlotHost />` is the only thing that ever calls it.

## How to add a new plugin field

When a future change adds a new top-level field to
`DirectoryPlugin<C>` (a third lifecycle hook, a server-only setup,
a request-scoped finaliser, …) follow the same checklist established
by the per-source-file references — `capabilities.md`, `slots.md`,
`loader.md`, `registry.md`, `slot-host.md`, `testing.md`, and
`manifest.md`:

1. Add the field to `DirectoryPlugin<C>` in
   [`packages/plugin-sdk/src/plugin.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/plugin.ts);
   re-export it through the SDK barrel
   ([`packages/plugin-sdk/src/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/index.ts))
   if the field's type is something a plugin author needs to import.
2. Wire the field into [`loadPlugins`](./loader.md) and / or
   [`PluginRegistry`](./registry.md) — whichever calls the new
   surface — and document the wiring in the matching reference.
3. Add a row to the [Failure matrix](#failure-matrix) for every
   observable failure mode the new field introduces, mirroring the
   way `setup` and `teardown` are listed today.
4. Append a section to this page that mirrors the structure of the
   existing field sections (signature, "where it runs", "use it
   for", "do not use it for", "what happens if it throws").
5. Append a `YYYY-MM-DD docs/plugins:` entry to
   [`docs/log.md`](../log.md) describing the field, the source
   change, and the ref entry that proves the doc and SDK cannot
   drift.

## See also

- [Authoring a Plugin](./authoring-a-plugin.md) — the workflow that
  this reference's contracts power.
- [Plugin Lifecycle](./lifecycle.md) — boot order, enable / disable
  transitions, and where `setup` / `teardown` slot in.
- [Plugin Manifest Reference](./manifest.md) — the
  [`manifest`](#manifest) field, every other manifest field, and
  the manifest failure matrix.
- [Plugin Capabilities Reference](./capabilities.md) — the
  capability ids and provider interfaces the
  [`providers`](#pluginproviders) field is keyed on.
- [Plugin Slots Reference](./slots.md) — the slot ids the
  [`slots`](#pluginslotstconfig) field is keyed on.
- [Plugin Loader Reference](./loader.md) — the runtime that calls
  [`setup`](#setup) and rejects plugins on Zod / `templateRange` /
  `setup` failures.
- [Plugin Registry Reference](./registry.md) — the runtime that
  registers the plugin and calls [`teardown`](#teardown).
- [Plugin SlotHost Reference](./slot-host.md) — the React component
  that renders the [`slots`](#pluginslotstconfig) field's
  contributions.
- [Plugin Testing Reference](./testing.md) — the
  `createTestRegistry({ plugins })` helper that drives the same
  `DirectoryPlugin[]` shape this page documents.
- [Plugin Packages](./packages.md) — overview of how
  `@ever-works/plugin-sdk`, `@ever-works/plugin-runtime`, and
  `@ever-works/plugin-demo` fit together.
