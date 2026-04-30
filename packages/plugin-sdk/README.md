# `@ever-works/plugin-sdk`

> Plugin SDK for the [Directory Web Template](https://github.com/ever-works/directory-web-template).
> Defines the manifest format, capability interfaces, slot ids, and the
> `defineDirectoryPlugin` author-facing factory.

This package is **framework-agnostic** apart from optional React types
for slot components. The runtime (registry, slot host, config loader)
lives in [`@ever-works/plugin-runtime`](../plugin-runtime/README.md).

See the architecture overview at
[`docs/architecture/plugin-system.md`](../../docs/architecture/plugin-system.md)
and the author's guide at
[`docs/plugins/authoring-a-plugin.md`](../../docs/plugins/authoring-a-plugin.md).

## What you get

- `defineDirectoryPlugin({...})` — the factory plugins call.
- `Capability` / `CAPABILITIES` — the canonical capability list.
- `SlotId` / `SLOT_IDS` — the canonical slot id list.
- `PluginManifest`, `PluginContext`, `DirectoryPlugin` — types.
- One interface per capability: `AuthProvider`, `PaymentProvider`,
  `AnalyticsProvider`, `SearchProvider`, `ContentSource`,
  `MapsProvider`, `NewsletterProvider`, `NotificationsProvider`,
  `AIProvider`.

## Installing

This package is internal to the monorepo. Add it as a workspace
dependency in your plugin's `package.json`:

```json
{
  "dependencies": {
    "@ever-works/plugin-sdk": "workspace:*",
    "zod": "^4.0.5"
  }
}
```

## Authoring a plugin

```ts
import { defineDirectoryPlugin } from '@ever-works/plugin-sdk';
import { z } from 'zod';

const ConfigSchema = z.object({
	enabled: z.boolean().default(true),
	greeting: z.string().default('hello'),
});

export default defineDirectoryPlugin({
	manifest: {
		name: 'demo',
		version: '0.1.0',
		templateRange: '>=0.1 <1.0',
		capabilities: ['ui-slot'],
		config: ConfigSchema,
		defaultEnabled: true,
		adminToggleable: true,
	},
	slots: {
		'header.right': ({ ctx }) => <span>{ctx.config.greeting}</span>,
	},
});
```

## Versioning

Plugins declare a `templateRange` (semver). The runtime refuses to
register a plugin that falls outside the running template version.

## Status

This is **v0.1**. The interfaces here are stable enough for
documentation and the demo plugin (per
[Spec 002](../../docs/spec/002-plugin-architecture/spec.md)). Provider
contracts grow per their dedicated specs (003 auth, 004 payments,
008 analytics, 011 maps, 012 newsletter, 013 notifications).
