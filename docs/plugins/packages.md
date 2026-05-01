---
id: plugins-packages
title: Plugin Packages — SDK, Runtime, Demo
sidebar_label: Plugin Packages
sidebar_position: 5
---

# Plugin Packages

> **Status.** Phase A of [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
> is **shipped** (`done 2026-04-30`). The three packages below are
> scaffolded, type-check cleanly, and are ready to be wired into
> `apps/web` in Phase B (`T-004..T-006`).

The plugin system is split into three packages so that authors get a
small, framework-agnostic SDK and the host app gets a focused React
runtime. The split mirrors the [authoring guide](./authoring-a-plugin.md)
and the [architecture overview](../architecture/plugin-system.md).

## At a glance

| Package | Lives in | Depends on | Used by |
| --- | --- | --- | --- |
| [`@ever-works/plugin-sdk`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk) | `packages/plugin-sdk/` | `zod`, optional `react` types | Plugin authors, runtime, host app |
| [`@ever-works/plugin-runtime`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime) | `packages/plugin-runtime/` | `plugin-sdk`, `react` | Host app boot + slot rendering |
| [`@ever-works/plugin-demo`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo) | `packages/plugin-demo/` | `plugin-sdk`, `zod`, `react` | Reference plugin used in docs and tests |

All three are workspace packages (`private: true`, `type: "module"`).
They expose source files directly via `package.json#exports` so that
Turborepo's incremental build does not need a tsc step before the web
app can import them.

## `@ever-works/plugin-sdk`

The framework-agnostic core. Plugin authors only ever import from this
package.

**Exports**

- `defineDirectoryPlugin({...})` — the author-facing factory.
- `Capability`, `CAPABILITIES` — canonical capability list.
- `SlotId`, `SLOT_IDS` — canonical slot id list.
- `PluginManifest`, `PluginContext`, `DirectoryPlugin` — manifest and
  runtime types.
- One interface per capability: `AuthProvider`, `PaymentProvider`,
  `AnalyticsProvider`, `SearchProvider`, `ContentSource`,
  `MapsProvider`, `NewsletterProvider`, `NotificationsProvider`,
  `AIProvider`.

**Sub-paths**

- `@ever-works/plugin-sdk/capabilities` — the capability constants.
- `@ever-works/plugin-sdk/slots` — the slot id constants.

## `@ever-works/plugin-runtime`

The React-aware runtime that the host app boots.

**Exports**

- `PluginRegistry` — synchronous reads, async mutations
  (`register`, `enable`, `disable`, `isEnabled`, `get`, `list`,
  `slotsFor`).
- `loadPlugins(registry, [{ plugin, sources }, …])` — Zod config
  validation plus per-plugin `setup()` invocation.
- `mergeConfigSources({ env, db, override })` — shallow merge with
  precedence `env < db < override`.
- `<SlotHost slotId="…" registry={…} />` — renders every contributed
  component for a slot in registration order.
- `createTestRegistry({ plugins })` — synthetic registry for unit
  tests; no DB writes.

The runtime is intentionally thin. Any feature beyond
**register / enable / disable / load / render** belongs in a host-app
module that wraps the registry (e.g. an admin REST handler).

## `@ever-works/plugin-demo`

A reference plugin that contributes a "Demo plugin loaded" badge to
the `header.right` slot. Used by:

- the [authoring guide](./authoring-a-plugin.md) as the worked example;
- e2e tests under `apps/web-e2e/tests/plugins/` (per
  [Spec 002 / T-009](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/tasks.md));
- the bundled smoke check that confirms the registry loads, validates
  config, and renders a slot end-to-end.

## What ships next

Boot wire-up (`apps/web/lib/plugins/registry.ts`,
`apps/web/lib/plugins/loader.ts`, `<SlotHost />` in the public and
admin layouts) is tracked under **Phase B** of [Spec 002 — Tasks](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/tasks.md)
(`T-004`, `T-005`, `T-006`). Persisted state and the admin REST
endpoints land in **Phase C** (`T-007`, `T-008`).

## See also

- [Plugin System (Architecture)](../architecture/plugin-system.md)
- [Authoring a Plugin](./authoring-a-plugin.md)
- [Plugin Lifecycle](./lifecycle.md)
- [Testing a Plugin](./testing-a-plugin.md) — covers `createTestRegistry`, slot rendering, and Playwright smoke specs.
- [Plugin Capabilities Reference](./capabilities.md) — per-capability interfaces, single vs fan-out lookup, and the rules for adding a new capability.
- [Plugin Slots Reference](./slots.md) — per-slot contract, where each slot renders, composition rules, and the checklist for adding a new slot id.
- [Plugin Loader Reference](./loader.md) — per-API reference for `loadPlugins` / `mergeConfigSources`, the env / DB / override precedence, the failure matrix, and the checklist for adding a new loader feature.
- [Plugin Registry Reference](./registry.md) — per-API reference for `PluginRegistry`, the read / write surface summary, the failure matrix (duplicate-name, unregistered, throwing teardown), and the checklist for adding a new method.
- [Plugin SlotHost Reference](./slot-host.md) — per-component reference for `<SlotHost />` paired with `SlotHost.tsx`; documents the `slotId` / `registry` / `fallback` props, the Fragment-only output, server-friendliness, and the failure matrix that ties stable React keys to the registry's duplicate-name guarantee.
- [Plugin Testing Reference](./testing.md) — per-helper reference for `createTestRegistry` paired with `testing.ts`; documents the helper's four-step internal flow over the `@ever-works/plugin-runtime` barrel and the `@ever-works/plugin-runtime/testing` sub-path (both resolve to the same export), the read / write surface summary, the failure matrix, and the explicit non-goals that point at [`loadPlugins`](./loader.md) and [`new PluginRegistry()`](./registry.md) for non-default config, persistence-callback assertions, and rejection inspection.
- [Plugin Manifest Reference](./manifest.md) — per-field reference for `PluginManifest<C>` paired with `manifest.ts`; documents every field of the manifest the SDK ships (`name`, `version`, `description`, `templateRange`, `capabilities`, `config`, `defaultEnabled`, `adminToggleable`, `homepage`), the `PluginConfig<C>` type alias, the failure matrix mapped onto `LoadPluginsResult.rejected`, and the checklist for adding a new manifest field.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md) — Article I (Plugin-First).
