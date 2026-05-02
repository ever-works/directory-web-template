---
id: plugin-demo
title: Reference Plugin (`@ever-works/plugin-demo`)
sidebar_label: Demo Plugin Reference
sidebar_position: 15
---

# Reference Plugin Reference

> **Status.** Authoritative reference for the bundled reference /
> demo plugin defined in [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The plugin's manifest, config schema, and slot component are
> locked by [`packages/plugin-demo/src/index.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/src/index.tsx),
> [`packages/plugin-demo/src/config.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/src/config.ts),
> and [`packages/plugin-demo/src/Header.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/src/Header.tsx).
> When the demo plugin's manifest, schema, slot binding, or rendered
> markup changes update **this** page in the same change so the doc
> and the package cannot drift.

`@ever-works/plugin-demo` is the **bundled reference plugin** that
serves three concrete jobs:

- a **worked example** for [Authoring a Plugin](./authoring-a-plugin.md)
  — every shape introduced there (`manifest`, [`PluginManifest.config`](./manifest.md#config),
  `slots`, [`SlotComponentProps`](./plugin.md#slotcomponentpropstconfig))
  has a real corresponding line in this package;
- a **fixture** for the e2e smoke check (Spec 002 / `T-009`) that
  proves the [registry](./registry.md), the
  [`<SlotHost />`](./slot-host.md), and the admin enable / disable
  flow work end-to-end against a known-good plugin;
- a **regression anchor** for the [loader](./loader.md) — the demo
  plugin exercises Zod validation, the `defaultEnabled` boot path,
  and the `'header.right'` slot contribution all in a single
  workspace package, so any change to those surfaces shows up as a
  visible change to the demo's behaviour.

This page is the **per-source-file reference** that pairs with the
three files under [`packages/plugin-demo/src/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/src)
the same way [`manifest.md`](./manifest.md) pairs with `manifest.ts`,
[`capabilities.md`](./capabilities.md) pairs with `capabilities.ts`,
[`slots.md`](./slots.md) pairs with `slots.ts`,
[`providers.md`](./providers.md) pairs with `providers.ts`,
[`plugin.md`](./plugin.md) pairs with `plugin.ts`,
[`loader.md`](./loader.md) pairs with `loader.ts`,
[`registry.md`](./registry.md) pairs with `registry.ts`,
[`slot-host.md`](./slot-host.md) pairs with `SlotHost.tsx`, and
[`testing.md`](./testing.md) pairs with `testing.ts`.

## At a glance

| Aspect | Value |
| --- | --- |
| Package name | `@ever-works/plugin-demo` |
| Package path | [`packages/plugin-demo/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo) |
| `package.json#main` / `#types` | `./src/index.tsx` |
| `package.json#exports['.']` | `./src/index.tsx` |
| Plugin name (registry key) | `'demo'` |
| Plugin version | `0.1.0` |
| `templateRange` | `>=0.1 <1.0` |
| Capabilities | `['ui-slot']` |
| Slot contributions | `'header.right'` |
| `defaultEnabled` | `true` |
| `adminToggleable` | `true` |

## File map

The package is intentionally three files. Each has a single
responsibility that mirrors the part of the SDK it consumes:

| File | Responsibility | Pairs with |
| --- | --- | --- |
| [`src/config.ts`](#srcconfigts--zod-config-schema) | Declare the `enabled` / `greeting` config schema | [`manifest.md#config`](./manifest.md#config) |
| [`src/Header.tsx`](#srcheadertsx--demoheaderbadge) | Render the `header.right` slot component | [`plugin.md#slotcomponentpropstconfig`](./plugin.md#slotcomponentpropstconfig) |
| [`src/index.tsx`](#srcindextsx--default-export) | Compose manifest + slots into the `DirectoryPlugin` default export | [`plugin.md#definedirectoryplugin`](./plugin.md#definedirectoryplugin) |

The package has **no** `src/index.ts` barrel — the plugin is its
own default export, so the entry point doubles as the public
surface.

## `src/config.ts` — Zod config schema

```ts
import { z } from 'zod';

export const ConfigSchema = z.object({
  enabled: z.boolean().default(true),
  greeting: z.string().default('Demo plugin loaded'),
});

export type DemoConfig = z.infer<typeof ConfigSchema>;
```

### `ConfigSchema` — the validated shape

`ConfigSchema` is the Zod object handed to the
[`manifest.config`](./manifest.md#config) field. It is what the
[`loader`](./loader.md) calls `.parse(...)` on at boot for the demo
plugin's merged config sources, so:

- a missing or unknown key falls back to the schema default;
- a wrong-type value (e.g. `enabled: 'yes'`) fails the parse and
  the loader rejects the plugin via `safeErrorResponse`-style
  surfacing so the host stays up;
- the **two** keys, `enabled` and `greeting`, are the only public
  config surface — extending the schema is the only way to add more.

The `.default(...)` calls on each member matter: they let the demo
plugin boot **without any config sources at all**, which is the
case the e2e smoke check exercises (no DB, no env, no admin
override).

### `DemoConfig` — the inferred type

`DemoConfig` is `z.infer<typeof ConfigSchema>`. It is the
`TConfig` generic that flows into:

- [`SlotComponentProps<DemoConfig>`](./plugin.md#slotcomponentpropstconfig)
  — the typed props of [`DemoHeaderBadge`](#demoheaderbadge);
- the [`PluginContext<DemoConfig>`](./plugin.md#plugincontexttconfig)
  the slot component receives via `props.ctx`;
- any future `setup(ctx)` hook the demo plugin grows — `ctx.config`
  would be typed as `DemoConfig` automatically.

The `.default(true)` and `.default(...)` on the schema members make
both fields **non-optional** in the inferred type even though they
are optional in the input shape. That is deliberate: the slot
component reads `ctx.config.enabled` and `ctx.config.greeting`
unconditionally, and the schema guarantees both are present after
parse.

## `src/Header.tsx` — `DemoHeaderBadge`

```tsx
import type { SlotComponentProps } from '@ever-works/plugin-sdk';
import type { DemoConfig } from './config';

export function DemoHeaderBadge({ ctx }: SlotComponentProps<DemoConfig>) {
  if (!ctx.config.enabled) return null;
  return (
    <span
      data-plugin="demo"
      data-testid="demo-plugin-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        background: 'rgba(0,0,0,0.06)',
      }}
    >
      {ctx.config.greeting}
    </span>
  );
}
```

### Props

`DemoHeaderBadge` accepts exactly one prop, typed as
[`SlotComponentProps<DemoConfig>`](./plugin.md#slotcomponentpropstconfig).
Concretely that is `{ ctx: PluginContext<DemoConfig> }`. The
component only reads `ctx.config.enabled` and `ctx.config.greeting`;
it never touches the rest of the context (`name`, `version`,
`logger`, `signal`).

### Render contract

The component is **pure**: same `ctx.config` always renders the
same DOM. It exposes two stable hooks for tests:

- `data-plugin="demo"` — selectable by the registry / e2e specs to
  assert the demo plugin in particular is rendering, not "any"
  plugin.
- `data-testid="demo-plugin-badge"` — selectable by Playwright /
  RTL using the `getByTestId` API the project already uses for
  other identifiers.

The inline styles are intentionally framework-free. The demo plugin
must not import the host app's design system — slot components ship
in a workspace package and have no guarantee a specific UI library
is loaded.

### Disabled config branch

`if (!ctx.config.enabled) return null;` is the single early-return
path. It is also the path the loader exercises when an admin
override sets `{ enabled: false }`: the slot host still calls the
component (slot contributions are not unregistered on disable —
config sources are merged at render time), but the component itself
short-circuits to `null` and the host renders nothing for the demo
plugin's `'header.right'` contribution while still rendering any
other plugin's contribution to the same slot.

## `src/index.tsx` — default export

```tsx
import { defineDirectoryPlugin } from '@ever-works/plugin-sdk';
import { ConfigSchema } from './config';
import { DemoHeaderBadge } from './Header';

const demoPlugin = defineDirectoryPlugin({
  manifest: {
    name: 'demo',
    version: '0.1.0',
    description: 'Reference / demo plugin used in tests and as a teaching example.',
    templateRange: '>=0.1 <1.0',
    capabilities: ['ui-slot'],
    config: ConfigSchema,
    defaultEnabled: true,
    adminToggleable: true,
  },
  slots: {
    'header.right': DemoHeaderBadge,
  },
});

export default demoPlugin;
```

### `defineDirectoryPlugin` invocation

The default export is a [`DirectoryPlugin<DemoConfig>`](./plugin.md#directorypluginc)
returned by [`defineDirectoryPlugin`](./plugin.md#definedirectoryplugin).
The factory infers `TConfig = DemoConfig` from
`manifest.config = ConfigSchema`, so the
[`SlotComponentProps<DemoConfig>`](./plugin.md#slotcomponentpropstconfig)
prop type on `DemoHeaderBadge` is **not** a coincidence — it is
the same type the factory threads through `slots`.

### Manifest fields, line by line

- `name: 'demo'` — the registry key. Must be unique across the
  registry; the loader rejects a second plugin that tries to
  register under the same name.
- `version: '0.1.0'` — semver, written by the plugin author.
- `description: '...'` — optional, surfaced in admin UIs.
- `templateRange: '>=0.1 <1.0'` — the semver range of the host
  template the plugin was authored against; the loader rejects
  the plugin if the running template version falls outside the
  range.
- `capabilities: ['ui-slot']` — the demo plugin only contributes a
  slot, not a capability provider, so `'ui-slot'` is the only
  declared capability. See
  [`capabilities.md#ui-slot`](./capabilities.md) for the lockout
  that prevents a `providers: { 'ui-slot': anything }` value.
- `config: ConfigSchema` — the Zod schema from
  [`config.ts`](#srcconfigts--zod-config-schema). The loader runs
  `.parse(merged)` against this for the demo plugin and threads
  the parsed result into the `PluginContext.config` slot prop.
- `defaultEnabled: true` — the plugin is enabled at boot when no
  admin override exists. The e2e smoke check relies on this so it
  can assert the badge renders without first calling the admin
  enable endpoint.
- `adminToggleable: true` — the admin REST endpoint may flip the
  enable state at runtime. If a future change ships an "always-on"
  built-in plugin, that plugin's manifest would set this to
  `false` and the admin UI would hide its toggle.

### `slots` binding

`slots: { 'header.right': DemoHeaderBadge }` is the only entry of
the [`PluginSlots<DemoConfig>`](./plugin.md#pluginslotstconfig)
map. The key is one of the literal members of
[`SlotId`](./slots.md), so a typo (`'header.rright'`) is a
compile-time error. The value is a component whose props are
typed `SlotComponentProps<DemoConfig>` — the `TConfig` generic is
the same one the schema exposes, so the slot component cannot drift
out of sync with the config schema.

`<SlotHost slotId="header.right" registry={...} />` is what
ultimately calls `DemoHeaderBadge`. See
[`slot-host.md`](./slot-host.md) for the full call path, including
the registration-order guarantee that makes the demo plugin's badge
render in a stable position when more than one plugin contributes
to the same slot.

### What the default export is **not**

- It is **not** a class — `defineDirectoryPlugin` returns a frozen
  object literal; there is no `new DemoPlugin()` form.
- It is **not** a React component — the default export is the
  `DirectoryPlugin` definition; the slot component
  ([`DemoHeaderBadge`](#demoheaderbadge)) is a separate named
  export from `Header.tsx`.
- It does **not** call into `apps/web` — the package depends only
  on `@ever-works/plugin-sdk`, `zod`, and React types. Importing
  any host-app module would break the workspace boundary.

## How the demo plugin is consumed

The demo plugin has three call sites, each documented on its own
reference page:

1. **Loader.** [`loadPlugins(registry, [{ plugin: demoPlugin, sources: { ... } }])`](./loader.md)
   merges the demo plugin's config sources, runs `ConfigSchema.parse`,
   and registers it. The demo plugin's
   [`config.ts`](#srcconfigts--zod-config-schema) is the schema
   the loader parses against for this entry.
2. **Registry.** [`PluginRegistry`](./registry.md) keys the demo
   plugin under `'demo'`. The registry's `get('ui-slot')` lookup
   does **not** return the demo plugin — `'ui-slot'` is the
   capability the plugin **declares**, not a capability it
   **provides**, and the [`capabilities.md`](./capabilities.md) page
   spells out the lockout that keeps `ui-slot` out of the
   `CapabilityProviderMap`.
3. **Slot host.** [`<SlotHost slotId="header.right" registry={...} />`](./slot-host.md)
   walks the registry's slot map, finds the demo plugin's
   `'header.right'` contribution, and calls `DemoHeaderBadge` with
   `{ ctx }` synthesised from the registered plugin's
   [`PluginContext<DemoConfig>`](./plugin.md#plugincontexttconfig).

## Failure matrix

The demo plugin participates in the same failure matrices documented
on the loader / registry / slot-host pages. The rows below summarise
the demo-specific manifestations.

| Scenario | Surfacing | Owner |
| --- | --- | --- |
| Config source sets `enabled: 'yes'` (string, not boolean) | `loadPlugins` rejects via Zod, demo plugin not registered | [`loader.md`](./loader.md) |
| Config source sets `greeting: 42` (number, not string) | `loadPlugins` rejects via Zod, demo plugin not registered | [`loader.md`](./loader.md) |
| No config sources at all | Schema defaults apply (`enabled: true`, `greeting: 'Demo plugin loaded'`) | [`config.ts`](#srcconfigts--zod-config-schema) |
| `templateRange` mismatch (template `1.x`, demo `>=0.1 <1.0`) | `loadPlugins` rejects, registry never sees the plugin | [`manifest.md#templaterange`](./manifest.md#templaterange) |
| Admin override sets `{ enabled: false }` after boot | `DemoHeaderBadge` short-circuits to `null` next render; slot still renders other contributions | [`Header.tsx`](#srcheadertsx--demoheaderbadge) |
| Admin disables the plugin via `adminToggleable: true` | Registry's `isEnabled('demo')` flips to `false`, slot host skips it for `'header.right'` | [`registry.md`](./registry.md) |
| Two plugins try to register `name: 'demo'` | Loader rejects the second registration | [`loader.md`](./loader.md) |

## Replacing the demo plugin

The demo plugin is intended to be **replaceable** — the entire
plugin system is built so that any plugin can be swapped for another
that contributes the same slot or implements the same capability.
Concretely, to ship a different `'header.right'` plugin while still
keeping the demo plugin available:

1. Add the new plugin's package under `packages/plugin-<name>/`
   (per [`packages.md`](./packages.md)).
2. Register it through the same `loadPlugins(...)` call and let
   the registry's deterministic order place it before or after the
   demo plugin's contribution; see
   [`slot-host.md`](./slot-host.md#registration-order) for the
   ordering guarantee.
3. Either disable the demo plugin via `adminToggleable: true` at
   admin runtime or set `defaultEnabled: false` in a host-side
   manifest override; see
   [`manifest.md#defaultenabled`](./manifest.md#defaultenabled).

The demo plugin itself is **not** removed from the codebase even
when a different plugin takes over the slot — keeping the
reference plugin in tree is what guarantees the loader / registry /
slot host stay covered by the e2e smoke check at all times.

## How to evolve the demo plugin

When a future change adds a new top-level demo capability, slot
contribution, or config field follow the same checklist established
by the per-source-file references — `manifest.md`, `slots.md`,
`capabilities.md`, `providers.md`, `plugin.md`, `loader.md`,
`registry.md`, `slot-host.md`, and `testing.md`:

1. Update the relevant file under
   [`packages/plugin-demo/src/`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo)
   — `config.ts` for a new config key, `Header.tsx` for new
   rendered output, `index.tsx` for a new slot or capability
   binding.
2. Update the matching SDK reference page if (and only if) the
   change exercises a new SDK surface. For example, adding a
   `setup(ctx)` hook to `index.tsx` updates this page **and**
   adds an example to [`plugin.md#setup`](./plugin.md#setup).
3. Add or update the e2e smoke test under
   [`apps/web-e2e/tests/plugins/`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests)
   so the change is observable end-to-end, not just at the unit
   level.
4. Append a `YYYY-MM-DD docs/plugins:` entry to
   [`docs/log.md`](../log.md) describing the change, the source
   file, and the ref entry that proves the doc and the package
   cannot drift.

## See also

- [Authoring a Plugin](./authoring-a-plugin.md) — the workflow this
  package is the worked example for.
- [Plugin Lifecycle](./lifecycle.md) — boot order, enable / disable
  transitions, and where the demo plugin's `defaultEnabled: true`
  flag fits in.
- [Plugin Manifest Reference](./manifest.md) — every manifest field
  the demo plugin sets.
- [Plugin Definition Reference](./plugin.md) — the
  `defineDirectoryPlugin` factory, `DirectoryPlugin<C>`,
  `PluginContext<TConfig>`, and `SlotComponentProps<TConfig>` types
  the demo plugin consumes.
- [Plugin Capabilities Reference](./capabilities.md) — the
  `'ui-slot'` capability the demo plugin declares and the lockout
  that keeps it out of `CapabilityProviderMap`.
- [Plugin Slots Reference](./slots.md) — the `'header.right'` slot
  id the demo plugin contributes to.
- [Plugin Loader Reference](./loader.md) — the runtime that parses
  the demo plugin's config and registers it.
- [Plugin Registry Reference](./registry.md) — the registry the
  demo plugin lives in at runtime.
- [Plugin SlotHost Reference](./slot-host.md) — the React component
  that renders the demo plugin's badge.
- [Plugin Testing Reference](./testing.md) — the
  `createTestRegistry({ plugins })` helper used by the demo plugin's
  unit tests.
- [Plugin Providers Reference](./providers.md) — the nine concrete
  provider interfaces the demo plugin does **not** implement (it
  only declares `'ui-slot'`).
- [Plugin Packages](./packages.md) — overview of how
  `@ever-works/plugin-sdk`, `@ever-works/plugin-runtime`, and
  `@ever-works/plugin-demo` fit together.
