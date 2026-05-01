---
id: testing-a-plugin
title: Testing a Plugin
sidebar_label: Testing a Plugin
sidebar_position: 4
---

# Testing a Plugin

> **Status.** Targets the architecture defined in
> [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> Phase A of the spec ships the SDK and the runtime — including the
> `createTestRegistry` test helper documented below. The
> end-to-end `apps/web-e2e/tests/plugins/**` specs land with **Phase B**
> (`T-009`) once the host app wires the registry into the public and
> admin layouts.

This page is the **author-facing testing reference** for plugins built
on top of `@ever-works/plugin-sdk` and `@ever-works/plugin-runtime`.
It complements the [authoring guide](./authoring-a-plugin.md) — the
authoring guide shows how to *write* a plugin, this page shows how to
*verify* one.

## 1. What to test, and at which level

A plugin has three observable surfaces. Test each at the cheapest
level that gives a useful signal:

| Surface                                     | Cheapest useful test            | Where it lives                                    |
| ------------------------------------------- | ------------------------------- | ------------------------------------------------- |
| **Manifest + Zod config schema**            | Static type-check + Zod parse   | Inside the plugin package (`packages/plugin-<name>/`) |
| **Capability provider** (`AnalyticsProvider`, `PaymentProvider`, …) | Provider unit test through `createTestRegistry` | Plugin package, or `apps/web/lib/<area>/__tests__` |
| **Slot component** (React UI in a slot)     | Playwright spec under `apps/web-e2e/tests/plugins/<name>.spec.ts` | `apps/web-e2e/` |

The runtime exports a small but sufficient set of test seams:

```ts
// packages/plugin-runtime/src/index.ts
export { PluginRegistry } from './registry';
export { loadPlugins, mergeConfigSources } from './loader';
export { SlotHost } from './SlotHost';
export { createTestRegistry } from './testing';
```

You should not need to import anything from `apps/web/**` to test a
plugin. If you do, that is a smell — file a follow-up so the test seam
moves into the runtime package.

## 2. Test the manifest

Every plugin must declare a Zod config schema. Use that schema as the
test surface — if the schema is wrong, every other test built on it is
brittle.

```ts
// packages/plugin-mything/src/__tests__/config.test.ts
import { describe, it, expect } from 'vitest'; // or any TS test runner
import { ConfigSchema } from '../config';

describe('mything config schema', () => {
  it('applies defaults for an empty config', () => {
    const parsed = ConfigSchema.parse({});
    expect(parsed.message).toBe('Welcome 👋');
    expect(parsed.level).toBe('info');
  });

  it('rejects an unknown level', () => {
    expect(() => ConfigSchema.parse({ level: 'critical' })).toThrow();
  });
});
```

> **Why.** This guarantees that `loadPlugins` will accept a
> bare-minimum config with `defaultEnabled` and that the merged
> `env < db < override` value cannot smuggle an invalid `level`
> through.

## 3. Test the registry round-trip with `createTestRegistry`

For provider plugins (analytics, payments, search, maps, …) the
fastest end-to-end check is "load it through the runtime as the host
app would, then assert on `registry.get('<capability>')`":

```ts
// packages/plugin-mything/src/__tests__/registry.test.ts
import { describe, it, expect } from 'vitest';
import { createTestRegistry } from '@ever-works/plugin-runtime/testing';
import myThing from '../index';

describe('mything plugin → registry', () => {
  it('registers and exposes the capability', async () => {
    const registry = await createTestRegistry({ plugins: [myThing] });

    expect(registry.isRegistered('mything')).toBe(true);
    expect(registry.isEnabled('mything')).toBe(true);

    // Capability lookup — replace `'analytics'` with your capability id.
    const provider = registry.get('analytics');
    expect(provider).toBeDefined();
  });
});
```

`createTestRegistry` runs the same path as the production loader:
`mergeConfigSources({}) → ConfigSchema.safeParse(...) → register(...) → setup?.()`.
That makes it the highest-confidence unit test you can write without
booting Next.js.

### 3.1 Forcing a non-default config

When the plugin's schema requires a non-default field (e.g.
`apiKey: z.string().min(1)`), pass an `override` source via
`loadPlugins` directly instead of `createTestRegistry`:

```ts
import { describe, it, expect } from 'vitest';
import { PluginRegistry, loadPlugins } from '@ever-works/plugin-runtime';
import myThing from '../index';

describe('mything plugin → loader (with override)', () => {
  it('rejects an empty apiKey', async () => {
    const registry = new PluginRegistry();
    const result = await loadPlugins(registry, [
      { plugin: myThing, sources: { override: { apiKey: '' } } },
    ]);

    expect(result.registered).toEqual([]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].name).toBe('mything');
  });

  it('accepts a valid apiKey via override', async () => {
    const registry = new PluginRegistry();
    const result = await loadPlugins(registry, [
      { plugin: myThing, sources: { override: { apiKey: 'sk-test' } } },
    ]);

    expect(result.registered).toEqual(['mything']);
    expect(registry.isEnabled('mything')).toBe(true);
  });
});
```

`PluginRegistry` and `loadPlugins` are the **same** classes the host
app boots — there is no "test mode" path that diverges from
production.

### 3.2 Asserting on slot contributions

A plugin that contributes to a slot can be verified without rendering
React, because `slotsFor` is a pure read on the registry:

```ts
import { describe, it, expect } from 'vitest';
import { createTestRegistry } from '@ever-works/plugin-runtime/testing';
import myThing from '../index';

describe('mything plugin → slot wiring', () => {
  it('contributes to home.before-listing', async () => {
    const registry = await createTestRegistry({ plugins: [myThing] });
    const contributions = registry.slotsFor('home.before-listing');
    expect(contributions).toHaveLength(1);
    expect(contributions[0].pluginName).toBe('mything');
  });

  it('does not contribute when disabled', async () => {
    const registry = await createTestRegistry({ plugins: [myThing] });
    await registry.disable('mything');
    expect(registry.slotsFor('home.before-listing')).toHaveLength(0);
  });
});
```

> **Note.** `createTestRegistry` enables every plugin by default —
> `defaultEnabled: false` is honoured. This mirrors how the production
> registry resolves the initial enable state.

## 4. Render the slot in isolation

When the slot component has non-trivial UI logic, render it through
`<SlotHost />` against a test registry. The host app uses the very
same component, so any rendering bug surfaces here too.

```tsx
import { render, screen } from '@testing-library/react';
import { createTestRegistry } from '@ever-works/plugin-runtime/testing';
import { SlotHost } from '@ever-works/plugin-runtime/SlotHost';
import myThing from '../index';

it('renders the banner with the configured message', async () => {
  const registry = await createTestRegistry({ plugins: [myThing] });
  render(<SlotHost slotId="home.before-listing" registry={registry} />);
  expect(
    screen.getByRole('region', { name: /welcome/i }),
  ).toBeInTheDocument();
});
```

`<SlotHost />` falls back to `null` when no plugin contributes to the
slot, or to a caller-supplied `fallback` when one is passed. That is
worth a separate test if your plugin is the only contributor and the
layout depends on it being present.

## 5. End-to-end with Playwright

Once the host app is wired (Spec 002 / `T-005`, `T-006`) and your
plugin is in `apps/web/lib/plugins/registry.ts`, add a Playwright
spec under `apps/web-e2e/tests/plugins/<name>.spec.ts`. Follow the
existing smoke-spec conventions (no-5xx contract, role / label / test
id selectors, no copy assertions):

```ts
// apps/web-e2e/tests/plugins/mything.spec.ts
import { test, expect } from '@playwright/test';

test('mything plugin renders its banner above the home listing', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('region', { name: /mything/i }),
  ).toBeVisible();
});

test('mything plugin disappears when admin disables it', async ({ adminPage, page }) => {
  // 1. As admin, toggle the plugin off via the admin REST endpoint.
  await adminPage.request.post('/api/admin/plugins/mything/disable');

  // 2. As a public visitor, reload and confirm the slot is empty.
  await page.goto('/');
  await expect(
    page.getByRole('region', { name: /mything/i }),
  ).toHaveCount(0);
});
```

The auth-gated `adminPage` fixture is set up in
[`apps/web-e2e/global-setup.ts`](https://github.com/ever-works/directory-web-template/blob/develop/apps/web-e2e/global-setup.ts).
You should **not** sign in inside the test body.

Add the spec file to
[`apps/web-e2e/E2E-TESTS.md`](https://github.com/ever-works/directory-web-template/blob/develop/apps/web-e2e/E2E-TESTS.md)
under the *Continual-improvement additions* table or the active
plugin-spec section, depending on where the work lands.

## 6. CI expectations

- The plugin package's tests run as part of `pnpm --filter
  @ever-works/<plugin-name> test` once the package adds a `test`
  script. The runtime package itself is exercised transitively whenever
  any plugin imports `@ever-works/plugin-runtime/testing`.
- Playwright specs run on every PR and on every push to
  `develop` / `main` per [Spec 010](../spec/010-e2e-test-coverage/spec.md).
- Type-check failures in any plugin package fail the `Web CI` job
  because the workspace-wide `pnpm tsc --noEmit` run sees them.

## 7. What **not** to do

- Do **not** mock `PluginRegistry`. It is intentionally synchronous on
  reads and small enough to be the real thing in tests.
- Do **not** import host-app modules to set up a registry. If you find
  yourself reaching into `apps/web/lib/plugins/**`, the missing seam
  belongs in `@ever-works/plugin-runtime`.
- Do **not** assert on copy that your messages JSON owns — assert on
  roles, labels, or `data-testid` so translations don't break the
  test.
- Do **not** skip the manifest schema test. Shipping a plugin whose
  defaults silently changed is the most common cause of "works on my
  machine".

## See also

- [Authoring a Plugin](./authoring-a-plugin.md) — write the plugin
  this page is testing.
- [Plugin Lifecycle](./lifecycle.md) — `setup` / `teardown` /
  `enable` / `disable` semantics that your tests rely on.
- [Plugin Packages](./packages.md) — SDK / runtime / demo packages
  overview, including the `createTestRegistry` location.
- [Plugin Capabilities Reference](./capabilities.md) — lookup style
  per capability (single vs fan-out) — useful when asserting on
  `registry.get(...)` versus `registry.list(...)`.
- [Plugin Slots Reference](./slots.md) — per-slot contract — useful
  when asserting on `registry.slotsFor(...)` results or when picking
  the role / `data-testid` selector for a Playwright spec.
- [Plugin Loader Reference](./loader.md) — per-API reference for
  `loadPlugins` / `mergeConfigSources`, including a worked test for
  override precedence and the validation-failure path.
- [Plugin System (Architecture)](../architecture/plugin-system.md)
- [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)
- [Spec 010 — End-to-End Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
- [`packages/plugin-runtime/src/testing.ts`](https://github.com/ever-works/directory-web-template/blob/develop/packages/plugin-runtime/src/testing.ts) —
  source of `createTestRegistry`.
