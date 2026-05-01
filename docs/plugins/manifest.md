---
id: plugin-manifest
title: Plugin Manifest Reference
sidebar_label: Manifest Reference
sidebar_position: 12
---

# Plugin Manifest Reference

> **Status.** Authoritative reference for the v1 manifest surface
> defined in [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The manifest shape is locked by [`packages/plugin-sdk/src/manifest.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/manifest.ts);
> when the SDK adds, removes, or renames a manifest field update
> **this** page in the same change so the doc and the SDK cannot
> drift.

The **manifest** is the metadata block every plugin declares as the
first key of its [`defineDirectoryPlugin({...})`](./authoring-a-plugin.md#3-define-the-manifest)
call. It is read by the
[loader](./loader.md) at boot to:

- enforce a [unique name](#name) across the registry,
- validate the [template version range](#templaterange) the plugin
  was authored against,
- declare which [capabilities](./capabilities.md) the plugin
  implements,
- run the plugin's [Zod config schema](#config) against the merged
  env / DB / override sources,
- decide [whether the plugin is enabled by default](#defaultenabled)
  when no `plugin_settings` row exists yet, and
- decide [whether admins can toggle it from the UI](#admintoggleable).

This page is the **per-field reference** that pairs with
[`manifest.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/manifest.ts)
exactly the way [`capabilities.md`](./capabilities.md) pairs with
`capabilities.ts`, [`slots.md`](./slots.md) pairs with `slots.ts`,
[`loader.md`](./loader.md) pairs with `loader.ts`,
[`registry.md`](./registry.md) pairs with `registry.ts`,
[`slot-host.md`](./slot-host.md) pairs with `SlotHost.tsx`, and
[`testing.md`](./testing.md) pairs with `testing.ts`. For the
end-to-end author workflow that wires a manifest into a working
plugin, see [Authoring a Plugin](./authoring-a-plugin.md) — this
page is the *contract*, that page is the *workflow*.

## At a glance

| Field              | Type                          | Required? | Default          | Read by                                              |
| ------------------ | ----------------------------- | --------- | ---------------- | ---------------------------------------------------- |
| `name`             | `string`                      | yes       | —                | [`PluginRegistry.register`](./registry.md#registerplugin-validatedconfig-opts--add-a-plugin) |
| `version`          | `string` (semver)             | yes       | —                | logging, admin UI, plugin lists                      |
| `description`      | `string`                      | no        | `undefined`      | admin UI                                             |
| `templateRange`    | `string` (semver range)       | yes       | —                | [boot-time compatibility check](./lifecycle.md#7-version-compatibility) |
| `capabilities`     | `readonly Capability[]`       | yes       | —                | [`PluginRegistry.list<C>`](./registry.md#listcapability--enumerate-providers-by-capability) |
| `config`           | `z.ZodTypeAny`                | yes       | —                | [`loadPlugins`](./loader.md#loadpluginsregistry-plugins--register-a-list-of-plugins) — Zod schema run on merged sources |
| `defaultEnabled`   | `boolean`                     | no        | `false`          | initial enable state when no `plugin_settings` row   |
| `adminToggleable`  | `boolean`                     | no        | `true`           | admin UI: hides the toggle when `false`              |
| `homepage`         | `string` (URL)                | no        | `undefined`      | admin UI: external link on the plugin card           |

The manifest is exposed as the typed
[`PluginManifest<C>`](#pluginmanifestc-type) interface; the type is
re-exported through the SDK barrel:

```ts
import type { PluginManifest, PluginConfig } from '@ever-works/plugin-sdk';
```

A plugin author **never** instantiates `PluginManifest` directly —
it is the inner shape of `defineDirectoryPlugin({...}).manifest`,
and `defineDirectoryPlugin` is the only public factory. See
[`plugin.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/plugin.ts)
for the factory definition.

## `name`

```ts
name: string;
```

Globally unique plugin name. Used by the
[registry](./registry.md) as the primary key for `register`,
`isRegistered`, `enable`, `disable`, `get`, and the duplicate-name
guard that powers stable React keys in
[`<SlotHost />`](./slot-host.md#duplicate-name-guard). Persisted as
the `plugin_settings.name` row when an admin enables / disables
the plugin.

Conventions:

- Lowercase kebab-case (`analytics-posthog`, `payments-stripe`).
- Prefer a `<capability>-<provider>` shape so the name reads as
  "the X plugin that uses Y" — the
  [capabilities reference](./capabilities.md#authoring-a-plugin-summary)
  lists the canonical prefixes.
- A plugin that adds a UI feature without a 1:1 capability mapping
  (a banner, a header CTA, a footer widget) names itself after the
  feature, not the slot.

The name is **never** localized or user-rewritable. It is the
identifier the registry, the loader, and the admin UI all key on,
and a rename is a breaking change for any host that has stored a
`plugin_settings` row.

## `version`

```ts
version: string;
```

Semantic version of this plugin (`MAJOR.MINOR.PATCH`). Surfaced in
the admin UI's plugin list and in any structured log line the
runtime emits about the plugin (`info`, `warn`, `error` via
`ctx.logger`). Independent of the host template's version — see
[`templateRange`](#templaterange) for compatibility.

## `description`

```ts
description?: string;
```

Optional one-line human description shown in the admin UI's plugin
list. Plain text; no Markdown is rendered. Localization is the
host app's job — a plugin that wants its description translated
should ship a `description` matching the source locale and let the
host pick that up via i18n keys.

## `templateRange`

```ts
templateRange: string;
```

Semver range of host template versions this plugin is compatible
with (e.g. `'>=0.1 <1.0'`). The
[loader](./loader.md) compares this against `templateVersion` at
boot and **refuses to load** a plugin whose range falls outside —
the plugin appears in
[`LoadPluginsResult.rejected`](./loader.md#loadpluginsresult-and-pluginconfigsources)
with reason `templateRange`. Refer to
[Plugin Lifecycle § Version compatibility](./lifecycle.md#7-version-compatibility)
for the boot-time decision tree.

Authoring guidance:

- Use a **range**, not a pin — `>=0.2 <0.3` rather than `0.2.4`.
  The host's patch version is irrelevant.
- Bump the lower bound of the range when the plugin starts using a
  new SDK feature; bump the upper bound only when a breaking change
  in the host is known to be safe.

## `capabilities`

```ts
capabilities: readonly Capability[];
```

The non-empty list of [capabilities](./capabilities.md) this plugin
implements. Each entry must be a member of
[`CAPABILITIES`](./capabilities.md#capabilities-and-capability) — the
SDK exposes [`isCapability`](./capabilities.md#iscapabilityvalue) for
runtime-narrowed checks. The
[registry](./registry.md#listcapability--enumerate-providers-by-capability)
indexes plugins by this list so `list<C>(capability)` can return
every provider that contributes to a given capability.

A plugin **must** ship a `providers[capability]` implementation for
every capability it declares — the [loader](./loader.md) does not
currently enforce this at boot, but the
[capabilities reference](./capabilities.md) treats the pair
`(capabilities, providers)` as the contract every plugin signs.
A plugin that contributes only a UI slot should declare the
[`ui-slot`](./capabilities.md#ui-slot) capability and provide its
component(s) via the
[`slots`](./slots.md) map instead of the `providers` map.

## `config`

```ts
config: z.ZodTypeAny;
```

A [Zod](https://zod.dev) schema that validates the merged
configuration the [loader](./loader.md#mergeconfigsourcessources--shallow-merge-config-sources)
produces from env / DB / override sources. The schema's inferred
type is exposed as [`PluginConfig<C>`](#pluginconfigc-type) and
becomes the type of `ctx.config` inside the plugin's
[`setup`](./lifecycle.md#5-setup-hook-optional) hook and inside any
slot component the plugin renders.

Authoring rules:

- Use `.default(...)` on every optional field so a fresh install
  with no env vars and no DB row still produces a valid config.
  This is what makes
  [`createTestRegistry({ plugins })`](./testing.md#createtestregistry-plugins-)
  work for the common case — empty sources are run through the
  schema, and defaults fill in the gaps.
- Use `.transform(...)` (not custom code in `setup`) for any
  derived value the runtime needs; that keeps the validated shape
  serializable for admin previews.
- Use `z.record(z.string(), …)` (not `z.object({...}).passthrough()`)
  if the plugin genuinely takes an open-ended map — the loader's
  shallow merge treats nested objects as opaque values per the
  [`mergeConfigSources` failure matrix](./loader.md#mergeconfigsourcessources--shallow-merge-config-sources).

A schema that fails validation lands the plugin in
[`LoadPluginsResult.rejected`](./loader.md#loadpluginsresult-and-pluginconfigsources)
with reason `config`; the loader does **not** throw, so a
single misconfigured plugin never crashes the boot.

## `defaultEnabled`

```ts
defaultEnabled?: boolean;
```

Whether the plugin is enabled when no `plugin_settings` row exists
for it yet. Defaults to `false` if omitted — a fresh install will
register the plugin but keep it disabled until an admin opts in
through the UI (or the host writes the row directly).

Use `defaultEnabled: true` for plugins that the template wants
on by default in every fresh install — for example, a default
analytics provider or the bundled newsletter form. Combine with
[`adminToggleable: false`](#admintoggleable) for plugins that
must always run.

## `adminToggleable`

```ts
adminToggleable?: boolean;
```

Whether admins can enable / disable the plugin from the admin UI.
Defaults to `true` if omitted. A plugin with
`adminToggleable: false` still records its state in the
`plugin_settings` row — the admin UI just hides the toggle so a
mis-click cannot turn the plugin off. The
[registry's](./registry.md#enablename---enable-a-registered-plugin)
`enable` / `disable` mutations still work programmatically; this
flag only governs the UI surface.

Use `adminToggleable: false` for plugins whose behavior is
load-bearing for the host (the bundled auth provider, the bundled
content source) — the host can still swap them out by registering
a different plugin with the same capability at boot.

## `homepage`

```ts
homepage?: string;
```

Optional fully-qualified URL shown as an external link on the
plugin's admin-UI card. Use the plugin's repository, marketing
page, or docs page — whichever is most useful to a maintainer
auditing what is installed on the host.

The runtime does not validate the URL; the admin UI passes it
straight through to an `<a target="_blank" rel="noopener">`.
A plugin that omits this field renders no link.

## `PluginManifest<C>` type

```ts
export interface PluginManifest<C extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  version: string;
  description?: string;
  templateRange: string;
  capabilities: readonly Capability[];
  config: C;
  defaultEnabled?: boolean;
  adminToggleable?: boolean;
  homepage?: string;
}
```

The compile-time shape every plugin author signs by writing a
manifest. The generic `C` is captured by
[`defineDirectoryPlugin`](./authoring-a-plugin.md#3-define-the-manifest)
so `ctx.config` inside `setup` and slot components is typed as
[`PluginConfig<C>`](#pluginconfigc-type) — there is no need to
write the inferred type by hand.

`PluginManifest` is **read-only at runtime**: the loader treats
the value the author exported as immutable for the lifetime of
the process. An admin enable / disable does not mutate the
manifest; it mutates the `plugin_settings` row that the
[registry](./registry.md) reads.

## `PluginConfig<C>` type

```ts
export type PluginConfig<C extends z.ZodTypeAny> = z.infer<C>;
```

A small alias around `z.infer<C>` that gives the validated config
type matching a manifest's `config` schema. Plugin authors can
use it to type helper functions that take the validated config
shape:

```ts
import type { PluginConfig } from '@ever-works/plugin-sdk';
import { z } from 'zod';

const Config = z.object({ apiKey: z.string().min(1) });

function requestHeaders(config: PluginConfig<typeof Config>) {
  return { authorization: `Bearer ${config.apiKey}` };
}
```

## Failure matrix

What happens for every observable failure mode of a manifest at
boot. The loader is deliberately tolerant — a single misconfigured
plugin lands in
[`LoadPluginsResult.rejected`](./loader.md#loadpluginsresult-and-pluginconfigsources)
without aborting the boot of every other plugin.

| What goes wrong                                                                | Where the failure is observed                                                            |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Two plugins share the same `name`.                                             | `loadPlugins` propagates a duplicate-name throw out of [`PluginRegistry.register`](./registry.md#registerplugin-validatedconfig-opts--add-a-plugin) — this is the only manifest-level throw. |
| `templateRange` is invalid semver.                                             | Plugin lands in `rejected` with reason `templateRange`; the rest of the boot continues.   |
| `templateRange` does not include the host `templateVersion`.                   | Same as above — `rejected[name].reason === 'templateRange'`.                              |
| `capabilities` is empty.                                                       | TypeScript already rejects this at author time; the loader treats an empty array as "no capabilities" and indexes nothing under [`list<C>`](./registry.md#listcapability--enumerate-providers-by-capability). |
| `config` schema rejects the merged sources.                                    | Plugin lands in `rejected` with reason `config`; `rejected[name].error` is the Zod issue list. |
| `defaultEnabled: true` but admin has disabled the plugin in `plugin_settings`. | Registry honors the DB row — the manifest default is the bootstrap fallback, not an override. |
| `adminToggleable: false` but the host calls [`registry.disable(name)`](./registry.md#disablename--disable-a-registered-plugin) directly. | The mutation succeeds — `adminToggleable` is a UI hint, not an authorization check.       |
| `homepage` is not a URL.                                                       | Not validated by the runtime; the admin UI renders whatever string the plugin shipped.    |

## How to add a new manifest field

1. Add the field to the
   [`PluginManifest<C>`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/manifest.ts)
   interface in [`packages/plugin-sdk/src/manifest.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/manifest.ts).
2. Wire the new field through the [loader](./loader.md) and / or
   the [registry](./registry.md) wherever it has runtime semantics
   — and add the corresponding entry to the failure matrix on
   that page.
3. Add a section to **this** page describing the field's type,
   semantics, default, and any failure modes.
4. Update the **At a glance** table at the top.
5. Append a line to [`docs/log.md`](../log.md) and reference the
   feature spec under `docs/spec/<NNN>-<slug>/`.

Do **not** rename an existing field. If the semantics drift, add
a new field, deprecate the old one in this reference, and remove
it only when no bundled plugin still uses it (Article VIII of the
[constitution](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)).

## See also

- [Plugin System (Architecture)](../architecture/plugin-system.md)
- [Authoring a Plugin](./authoring-a-plugin.md) — the end-to-end
  workflow that wires a manifest into a runnable plugin via
  `defineDirectoryPlugin`.
- [Plugin Lifecycle](./lifecycle.md) — the boot-time decision tree
  the manifest's `templateRange`, `config`, and `defaultEnabled`
  fields drive.
- [Plugin Capabilities Reference](./capabilities.md) — every
  member of the `capabilities` array, paired with its provider
  interface in [`providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts).
- [Plugin Slots Reference](./slots.md) — every slot id a plugin
  with the `ui-slot` capability can contribute a component to.
- [Plugin Loader Reference](./loader.md) — the boot phase that
  reads every manifest, runs each `config` schema, and either
  registers the plugin or appends it to
  `LoadPluginsResult.rejected`.
- [Plugin Registry Reference](./registry.md) — the in-memory store
  the loader populates; keys plugins on `manifest.name` and indexes
  them by `manifest.capabilities`.
- [Plugin SlotHost Reference](./slot-host.md) — the React component
  that ultimately renders every plugin whose manifest declares the
  `ui-slot` capability.
- [Plugin Testing Reference](./testing.md) — the per-helper
  reference paired with `testing.ts`; documents how
  `createTestRegistry` runs a plugin's manifest through the same
  loader the production boot uses.
- [Testing a Plugin](./testing-a-plugin.md) — manifest tests,
  capability tests, slot tests, and Playwright smoke specs.
- [Plugin Packages](./packages.md) — the three workspace packages
  the manifest lives in (`@ever-works/plugin-sdk`).
- [Plugin Definition Reference](./plugin.md) — per-export reference paired with `plugin.ts`; documents `defineDirectoryPlugin`, `DirectoryPlugin<C>`, `PluginContext<TConfig>`, `SlotComponentProps<TConfig>`, `PluginProviders`, and `PluginSlots<TConfig>` — the surface that consumes every manifest field documented on this page.
- [Plugin Providers Reference](./providers.md) — per-export reference paired with `providers.ts`; documents every concrete provider interface (`AuthProvider` … `AIProvider`) and the `CapabilityProviderMap` mapped type that ties each member of `manifest.capabilities` to the implementation a plugin must attach through [`PluginProviders`](./plugin.md#pluginproviders).
- [Reference Plugin (`@ever-works/plugin-demo`)](./plugin-demo.md) — per-source-file reference paired with `packages/plugin-demo/src/`; documents the demo plugin's exact manifest values (name `'demo'`, `templateRange '>=0.1 <1.0'`, `'ui-slot'` capability, `defaultEnabled: true`, `adminToggleable: true`) as the in-tree worked example for every field on this page, including the `ConfigSchema` that drives the `config` field's Zod validation, the `defaultEnabled` flag the e2e smoke check relies on, and the `adminToggleable` flag the admin REST endpoint reads at runtime.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
- [`packages/plugin-sdk/src/manifest.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/manifest.ts) — the source of truth.
