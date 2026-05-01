---
id: plugin-testing
title: Plugin Testing Reference
sidebar_label: Testing Reference
sidebar_position: 11
---

# Plugin Testing Reference

> **Status.** Authoritative reference for the v1 `createTestRegistry`
> helper defined in [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> The helper contract is locked by [`packages/plugin-runtime/src/testing.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/testing.ts);
> when the runtime adds, removes, or renames a test seam update
> **this** page in the same change so the doc and the runtime cannot
> drift.

`createTestRegistry` is the **only** public test seam that
`@ever-works/plugin-runtime` ships. It is intentionally tiny: it
takes a list of plugin modules, wires them through the same
[`loadPlugins`](./loader.md) path that production uses, and returns
a fully-loaded [`PluginRegistry`](./registry.md) ready for unit
tests, integration tests, and React Testing Library renders.

This page is the **per-helper reference** that pairs with
[`testing.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/testing.ts)
exactly the way [`registry.md`](./registry.md) pairs with
`registry.ts`, [`loader.md`](./loader.md) pairs with `loader.ts`,
and [`slot-host.md`](./slot-host.md) pairs with `SlotHost.tsx`.
For task-driven testing patterns (manifest tests, capability tests,
slot tests, Playwright smoke specs, fixtures) see the
[Testing a Plugin](./testing-a-plugin.md) guide — this page is the
*contract*, that page is the *workflow*.

## At a glance

| Surface                          | Kind     | Async? | Throws?                                |
| -------------------------------- | -------- | ------ | -------------------------------------- |
| `createTestRegistry({ plugins })` | factory  | yes    | propagates — Zod / `setup` / `register` |

The helper is exported through both the runtime barrel and the
`testing` sub-path:

```ts
// Preferred — barrel import. Matches every other runtime export
// and keeps the test surface beside the production runtime so a
// consumer cannot accidentally import a "test" helper into a
// production code path that would tree-shake differently.
import { createTestRegistry } from '@ever-works/plugin-runtime';

// Sub-path import — useful when a test file only needs the test
// seam and wants to keep the import surface narrow for code-search
// and tree-shaking observability. Both forms resolve to the same
// function and have identical behavior.
import { createTestRegistry } from '@ever-works/plugin-runtime/testing';
```

The sub-path is intentionally listed in the runtime's
[`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/package.json)
`exports` map so a test file can opt into the narrow surface
without depending on the rest of the runtime's barrel.

## `createTestRegistry({ plugins })`

```ts
export async function createTestRegistry(opts: {
  plugins: DirectoryPlugin[];
}): Promise<PluginRegistry>;
```

Spin up a fresh [`PluginRegistry`](./registry.md) pre-loaded with
the given plugins. Each plugin's [Zod config schema](./capabilities.md#config-schema)
is run with **empty config sources** (`{}`), which exercises the
schema's defaults. Plugins whose schema requires non-default fields
should call [`loadPlugins`](./loader.md) directly with an `override`
source — see the [worked example](#worked-example-2-config-required-plugin)
below.

The helper performs the following four steps in order:

1. **Construct.** Calls `new PluginRegistry()` with **no** options.
   The returned registry has `persistEnabled` undefined — `enable`
   and `disable` work in memory but do not persist.
2. **Map.** Wraps each plugin in a `{ plugin }` envelope so
   `loadPlugins` can read it. No `sources` and no `enabled` flag
   are passed — the loader uses the plugin manifest's
   `defaultEnabled` (defaulting to `true`) for each entry.
3. **Load.** Awaits `loadPlugins(registry, entries)`. This is the
   exact same loader the host app boots with — same Zod validation,
   same `setup()` invocation, same per-plugin failure isolation.
4. **Return.** Returns the now-loaded registry. Any rejected
   plugins (Zod failures, `setup` throws) are silently dropped from
   the registry and **not** surfaced through the helper's return
   value. If a test needs visibility into rejections, call
   [`loadPlugins`](./loader.md) directly and inspect
   `LoadPluginsResult.rejected`.

### Read / write surface summary

| Caller                                  | What they call                              | Notes                                                                                  |
| --------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| Plugin package unit tests               | `createTestRegistry({ plugins: [pluginUnderTest] })` | The 90% case. One plugin, default config, exercises Zod defaults.                      |
| Capability composition tests            | `createTestRegistry({ plugins: [a, b] })`   | Two plugins contributing the same capability — verifies registration order and `list`. |
| Slot composition tests                  | `createTestRegistry({ plugins: [a, b] })`   | Two plugins contributing the same slot — verifies `slotsFor` ordering.                 |
| Admin enable / disable tests            | `createTestRegistry({ plugins: [p] })` then `await registry.disable("p")` | `persistEnabled` is undefined, so the disable is purely in-memory.                     |
| Config-required plugins                 | **Not this helper** — call `loadPlugins(registry, [{ plugin, sources: { override: { … } } }])` directly. | The helper passes empty sources only; tests must use the loader for non-default config. |
| Tests that assert on rejections         | **Not this helper** — call `loadPlugins(registry, [...])` directly and inspect `result.rejected`. | The helper's return type does not surface rejections.                                  |
| Persistence-callback tests              | **Not this helper** — construct the registry directly with `new PluginRegistry({ persistEnabled })`. | The helper hard-codes `persistEnabled` undefined.                                      |

The helper is the **fast path** for the four common cases at the
top of the table. The bottom three are explicit non-goals — keep
those tests in a single file and use the underlying primitives
([`PluginRegistry`](./registry.md), [`loadPlugins`](./loader.md))
so the contract is visible at the call site.

## Failure matrix

| Scenario                                                                    | Outcome                                                                                                                | Where it surfaces                                                                                            |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Plugin's Zod schema rejects the empty merged config                         | Plugin is dropped from the registry **silently**. `createTestRegistry` resolves; `registry.isRegistered(name)` is `false`. | Bubble through `registry.isRegistered(name)`; for visibility, call [`loadPlugins`](./loader.md) directly.    |
| Plugin's `setup()` throws                                                   | Plugin is registered but reported as **rejected** by the loader. The helper still resolves; the throw does **not** propagate.        | `registry.isRegistered(name)` is `true`; `registry.isEnabled(name)` may be `true` even though `setup` failed.|
| Two plugins share the same `manifest.name`                                  | Loader calls `registry.register` twice with the same name; the second call **throws** (per the registry contract).      | The throw propagates out of `await createTestRegistry(...)` — wrap in `expect(...).rejects` to assert on it. |
| `plugins` array is empty (`createTestRegistry({ plugins: [] })`)            | Loader is called with `[]` — no-op. Returns an empty registry.                                                          | Useful as a baseline. `registry.list_all()` returns `[]`.                                                    |
| Plugin manifest has `defaultEnabled: false`                                 | Plugin is registered but `isEnabled(name)` returns `false`. `setup()` is **not** invoked.                               | Use `await registry.enable(name)` to flip it on for tests.                                                   |
| Plugin contributes a slot component that throws on render                   | The throw surfaces during the React render of `<SlotHost />`, **not** during `createTestRegistry`.                      | See the [SlotHost failure matrix](./slot-host.md#failure-matrix); wrap the render in an `<ErrorBoundary>`.   |

The helper's failure surface is intentionally narrow: the only path
that throws **out of** `createTestRegistry` is the duplicate-name
case (because `register` throws synchronously and the loader does
not catch it). Every other failure mode is observable through the
returned registry's read methods, so a test that wants to assert on
rejection can call `registry.isRegistered(name)` after the helper
resolves.

## Worked example 1 — happy path

```ts
import { describe, it, expect } from 'vitest';
import { createTestRegistry } from '@ever-works/plugin-runtime';
import demoPlugin from '@ever-works/plugin-demo';

describe('demo plugin', () => {
  it('registers and contributes the header.right slot', async () => {
    const registry = await createTestRegistry({ plugins: [demoPlugin] });

    expect(registry.isRegistered('demo')).toBe(true);
    expect(registry.isEnabled('demo')).toBe(true);
    expect(registry.slotsFor('header.right')).toHaveLength(1);
  });
});
```

This is the **canonical** unit-test shape: one plugin, default
config, one assertion per observable surface (registered, enabled,
slot contribution). The same shape extends to capability lookups
(`registry.get('analytics')`) and capability lists
(`registry.list('payment')`).

## Worked example 2 — config-required plugin

When a plugin's Zod schema requires fields with no default, the
helper's empty-config call drops the plugin silently. Use
[`loadPlugins`](./loader.md) directly so the test can pass an
`override` source:

```ts
import { describe, it, expect } from 'vitest';
import { PluginRegistry, loadPlugins } from '@ever-works/plugin-runtime';
import postHogPlugin from '@ever-works/plugin-analytics-posthog';

describe('posthog plugin', () => {
  it('registers when an apiKey override is provided', async () => {
    const registry = new PluginRegistry();
    const result = await loadPlugins(registry, [
      {
        plugin: postHogPlugin,
        sources: { override: { apiKey: 'phc_test_123' } },
      },
    ]);

    expect(result.rejected).toEqual([]);
    expect(registry.isRegistered('analytics-posthog')).toBe(true);
  });
});
```

This is the explicit escape hatch documented in the
[read / write surface summary](#read--write-surface-summary). The
helper does not paper over it — it points at the loader as the
right tool because the loader's return value carries
`rejected: { name, reason }[]`, which is what the test wants to
assert on.

## Worked example 3 — disable round-trip

```ts
import { describe, it, expect } from 'vitest';
import { createTestRegistry } from '@ever-works/plugin-runtime';
import demoPlugin from '@ever-works/plugin-demo';

describe('demo plugin disable round-trip', () => {
  it('disappears from slotsFor when disabled, reappears when enabled', async () => {
    const registry = await createTestRegistry({ plugins: [demoPlugin] });

    expect(registry.slotsFor('header.right')).toHaveLength(1);

    await registry.disable('demo');
    expect(registry.isEnabled('demo')).toBe(false);
    expect(registry.slotsFor('header.right')).toHaveLength(0);

    await registry.enable('demo');
    expect(registry.isEnabled('demo')).toBe(true);
    expect(registry.slotsFor('header.right')).toHaveLength(1);
  });
});
```

This covers the **same** disable / enable round-trip that
[`apps/web-e2e/tests/plugins/admin-toggle.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/plugins)
will cover at the Playwright layer (per
[Spec 002 / T-009](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/tasks.md)),
but at the unit-test layer where it is fast, deterministic, and
runnable in a plugin package without spinning up Next.js. Test
authors should always start at this layer and only graduate to
Playwright when the contract being verified actually crosses the
HTTP boundary.

## Anti-patterns

The helper is intentionally narrow. Things it is **not**:

1. **Not a registry constructor.** If a test needs to construct a
   registry without loading any plugins (e.g. to inject a plugin by
   hand via `registry.register(...)` to exercise an edge case),
   call `new PluginRegistry()` directly — `createTestRegistry({ plugins: [] })`
   would also work, but the direct constructor signals intent
   better at the call site.
2. **Not a config harness.** It does not accept `sources` or
   `overrides`. Tests that need non-default config must use
   [`loadPlugins`](./loader.md) directly.
3. **Not a rejection inspector.** It does not surface
   `LoadPluginsResult.rejected`. Tests that want to assert on
   *which* plugins were rejected must use the loader directly.
4. **Not a persistence harness.** It hard-codes
   `persistEnabled: undefined`. Tests that need to assert on the
   persistence callback must construct the registry directly with
   `new PluginRegistry({ persistEnabled: vi.fn() })` and load with
   `loadPlugins`.
5. **Not a render harness.** It returns a `PluginRegistry`, not a
   rendered React tree. To render slot contributions in a test, pass
   the returned registry to [`<SlotHost />`](./slot-host.md) inside
   a React Testing Library `render(...)`.
6. **Not async-cleanup-aware.** Plugins that register intervals or
   subscriptions in `setup()` will keep them alive after the test
   completes. Use the plugin's `teardown()` (invoked by
   [`registry.disable(name)`](./registry.md#disablename)) in an
   `afterEach` to clean them up, or rely on Vitest's worker
   isolation if the cost is acceptable.

These five exclusions are deliberate. The point of a tiny helper is
that it does **one** thing well; the moment a test needs more, the
underlying primitives are right there and well-documented in
[`registry.md`](./registry.md) and [`loader.md`](./loader.md).

## Server-friendliness

`createTestRegistry` itself is server-friendly: it has no
`"use client"`, no client-only hooks, and no `react-dom` imports.
The returned [`PluginRegistry`](./registry.md) is also
synchronously-readable, so server components in tests can call
`registry.slotsFor(...)` without an `await`.

The helper is, however, **async** — it returns a `Promise<PluginRegistry>`
because `loadPlugins` is async (it `await`s each plugin's
`setup()`). Tests that want to instantiate a registry inside a
server component's render path should pre-load it in a fixture
rather than calling `createTestRegistry` from inside the render —
mirroring the production pattern where the registry is built once
in `instrumentation.ts` and read many times.

## How to add a new test seam

Per [Article I (Plugin-First)](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md)
the runtime's surface is intentionally tiny. Adding a new helper
should be rare and follows the same five-step pattern as new
capabilities, slot ids, and `<SlotHost />` props:

1. **Open a spec under [`docs/spec/`](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec)**
   describing the use case, the helper name, and why a thin wrapper
   over [`PluginRegistry`](./registry.md) /
   [`loadPlugins`](./loader.md) is not enough.
2. **Update [`packages/plugin-runtime/src/testing.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/testing.ts)**
   — add the helper, keep its body small, and document the
   contract in a JSDoc block immediately above the export.
3. **Re-export the helper** from
   [`packages/plugin-runtime/src/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/index.ts)
   so both the barrel and the `testing` sub-path resolve to it.
4. **Update this page** — the `At a glance` table, a per-helper
   section with the full TypeScript signature, the failure matrix,
   and at least one worked example.
5. **Update [Spec 002 / T-010](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/tasks.md)**
   to flag the doc as updated for this change so the doc-and-runtime
   anti-drift bullet is preserved.

## See also

- [Testing a Plugin](./testing-a-plugin.md) — the **task-driven
  guide** for plugin authors: manifest tests, capability tests, slot
  tests, Playwright smoke specs, fixtures, and the table of which
  surface to test at which level. This page is the contract; that
  page is the workflow.
- [Plugin Registry Reference](./registry.md) — the underlying
  primitive `createTestRegistry` returns; full read / write surface,
  duplicate-name failure matrix, and the disable / re-enable
  semantics that worked example 3 exercises.
- [Plugin Loader Reference](./loader.md) — the underlying loader
  `createTestRegistry` delegates to; env / DB / override
  precedence, the `LoadPluginsResult.rejected` shape that worked
  example 2 inspects, and the per-plugin failure isolation rules.
- [Plugin SlotHost Reference](./slot-host.md) — the React component
  consumers pair with the returned registry to render slot
  contributions in unit tests.
- [Plugin Capabilities Reference](./capabilities.md) — the
  capability surface (`get` / `list`) that returned-registry tests
  exercise alongside `slotsFor`.
- [Plugin Slots Reference](./slots.md) — the per-slot contract;
  worked example 1 asserts on `header.right`, the canonical demo
  slot.
- [Authoring a Plugin](./authoring-a-plugin.md) — how a plugin
  declares the manifest, config schema, and slot / capability
  contributions that this helper loads.
- [Plugin Manifest Reference](./manifest.md) — per-field reference
  paired with `manifest.ts`; documents the `name`, `templateRange`,
  `capabilities`, `config`, and `defaultEnabled` fields that
  `createTestRegistry` exercises through `loadPlugins`, and the
  failure-matrix entries that map onto the helper's silent
  Zod-drop vs propagated duplicate-name throw distinction.
- [Plugin Lifecycle](./lifecycle.md) — the boot / setup / teardown
  phases the helper exercises through `loadPlugins`.
- [Plugin Packages — SDK, Runtime, Demo](./packages.md) — the
  package-level overview; this helper lives in
  `@ever-works/plugin-runtime/testing` per the boundary documented
  there.
- [Plugin System (Architecture)](../architecture/plugin-system.md) —
  high-level diagram showing where the test seam sits relative to
  production boot.
- [Plugin Definition Reference](./plugin.md) — per-export reference paired with `plugin.ts`; documents the `DirectoryPlugin[]` shape `createTestRegistry({ plugins })` accepts, the `PluginContext` and `SlotComponentProps` types worked-example slot components on this page rely on, and the `defineDirectoryPlugin` factory tests use to author fixture plugins.
- [Plugin Providers Reference](./providers.md) — per-export reference paired with `providers.ts`; documents every concrete provider interface a fixture plugin's `providers` map can attach (so `registry.get<C>` / `list<C>` assertions in worked-example tests are statically typed), the `(string & {})` literal-with-fallback trick on `PaymentProvider.id`, and the `'ui-slot' = never` lockout that catches mis-typed fixture plugins at compile time before they reach `createTestRegistry`.
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
- [`.specify/memory/constitution.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/memory/constitution.md) — Article I (Plugin-First), Article IX (Test Coverage Bar).
