---
id: authoring-a-plugin
title: Authoring a Plugin
sidebar_label: Authoring a Plugin
---

# Authoring a Plugin

> **Status.** Targets the architecture defined in
> [Spec 002 — Plugin Architecture](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture).
> Some interfaces below ship as the SDK lands; treat this page as the
> author-facing reference.

This guide walks through creating a new plugin for the Directory Web
Template. By the end you will have a `packages/plugin-<name>/`
package that the runtime registers at boot and that contributes a
slot, a capability, or both.

## 1. Decide what you’re building

A plugin can contribute one or more of these:

- **Capabilities** — implement a well-known interface
  (`AuthProvider`, `PaymentProvider`, `AnalyticsProvider`,
  `SearchProvider`, `ContentSource`, `MapsProvider`,
  `NewsletterProvider`, `NotificationsProvider`, `AIProvider`).
- **Slots** — register React components into named slots in the
  layout, header, footer, item detail page, dashboard, etc.

If the plugin only contributes a slot (e.g. a banner), no capability
is needed.

## 2. Scaffold the package

```bash
# from the monorepo root
mkdir -p packages/plugin-mything/src
cat > packages/plugin-mything/package.json <<'JSON'
{
  "name": "@ever-works/plugin-mything",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "@ever-works/plugin-sdk": "workspace:*",
    "zod": "^3.23.0"
  },
  "peerDependencies": {
    "react": "^19"
  }
}
JSON
```

Then add a TS config that extends the shared one:

```jsonc
// packages/plugin-mything/tsconfig.json
{
  "extends": "../../packages/tsconfig/base.json",
  "include": ["src/**/*"]
}
```

## 3. Define the manifest

```ts
// packages/plugin-mything/src/index.tsx
import { z } from 'zod';
import { defineDirectoryPlugin } from '@ever-works/plugin-sdk';
import { Banner } from './Banner';

const Config = z.object({
  message: z.string().min(1).default('Welcome 👋'),
  level: z.enum(['info', 'warn']).default('info'),
});

export const plugin = defineDirectoryPlugin({
  manifest: {
    name: 'mything',
    version: '0.1.0',
    description: 'A friendly banner above the home listing.',
    templateRange: '>=0.1 <1.0',
    capabilities: ['ui-slot'],
    config: Config,
    defaultEnabled: true,
    adminToggleable: true,
  },
  slots: {
    'home.before-listing': Banner,
  },
});
```

`Banner` is a regular React component receiving `{ ctx }` as props.
`ctx.config` is the validated config; `ctx.t` is a translation
function.

## 4. Localise

Place message JSON files alongside the component:

```ts
// packages/plugin-mything/src/messages/en.json
{
  "title": "{message}"
}
```

The runtime merges plugin messages into the `next-intl` namespace
keyed by plugin name (e.g. `mything.title`).

## 5. Register the plugin in the app

Add the plugin to the bundled plugin list:

```ts
// apps/web/lib/plugins/registry.ts
import { plugin as mything } from '@ever-works/plugin-mything';

export const bundledPlugins = [
  // … existing plugins
  mything,
];
```

## 6. Test it

Three layers, cheapest first — see the dedicated
[Testing a Plugin](./testing-a-plugin.md) guide for the full set of
patterns, including how to use `createTestRegistry` to round-trip the
manifest + Zod schema without booting Next.js.

A minimal end-to-end smoke spec:

```ts
// apps/web-e2e/tests/plugins/mything.spec.ts
import { test, expect } from '@playwright/test';

test('mything plugin renders its banner above the home listing', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: /mything/i })).toBeVisible();
});
```

## 7. Document it

- Add a feature page under `docs/features/<name>.md` (or
  `docs/plugins/<name>.md`).
- Link it from `docs/index.md`.
- Append a line to `docs/log.md`.

## 8. Ship it

- Open a PR; reference the spec/plan/tasks if you authored a new
  feature.
- Confirm CI green.
- The PR description should include a Constitution Check note.

## See also

- [`/docs/architecture/plugin-system`](/architecture/plugin-system) — architecture overview.
- [`/docs/plugins/lifecycle`](/plugins/lifecycle) — boot, validation, enable/disable.
- [`/docs/plugins/testing-a-plugin`](/plugins/testing-a-plugin) — manifest tests, `createTestRegistry`, slot rendering, and Playwright smoke specs.
- [`/docs/plugins/capabilities`](/plugins/capabilities) — the complete capability surface (`auth`, `payment`, `analytics`, …) with provider-resolution rules.
- [`/docs/plugins/slots`](/plugins/slots) — the complete slot surface (`header.right`, `home.before-listing`, `admin.dashboard.widgets`, …) with the per-slot component contract.
- [Spec 002](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture/spec.md)
- [`.specify/templates/spec-template.md`](https://github.com/ever-works/directory-web-template/tree/develop/.specify/templates/spec-template.md)
