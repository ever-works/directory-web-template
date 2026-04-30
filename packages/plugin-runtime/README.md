# `@ever-works/plugin-runtime`

> React-aware runtime for the [Directory Web Template](https://github.com/ever-works/directory-web-template)
> plugin system. Hosts the `PluginRegistry`, validates configs, and
> renders the `<SlotHost />` React component.

The framework-agnostic interfaces and `defineDirectoryPlugin` factory
live in [`@ever-works/plugin-sdk`](../plugin-sdk/README.md).

See the architecture overview at
[`docs/architecture/plugin-system.md`](../../docs/architecture/plugin-system.md).

## What you get

- `PluginRegistry` — synchronous reads, async mutations.
- `loadPlugins(registry, [{ plugin, sources }, …])` — config validation
  (Zod) plus per-plugin `setup()` invocation.
- `mergeConfigSources({ env, db, override })` — shallow-merge in
  precedence order (env < db < override).
- `<SlotHost slotId="…" registry={…} />` — renders every contributed
  React component for a slot, in registration order.
- `createTestRegistry({ plugins })` — synthetic registry for unit tests.

## Boot sketch (host app)

```ts
// apps/web/lib/plugins/registry.ts
import { PluginRegistry, loadPlugins } from '@ever-works/plugin-runtime';
import demoPlugin from '@ever-works/plugin-demo';

export const registry = new PluginRegistry({
	persistEnabled: async (name, enabled) => {
		// write to plugin_settings table
	},
});

export async function bootPlugins() {
	await loadPlugins(registry, [{ plugin: demoPlugin }]);
}
```

```tsx
// apps/web/app/[locale]/layout.tsx
import { SlotHost } from '@ever-works/plugin-runtime';
import { registry } from '@/lib/plugins/registry';

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<header>
			<SlotHost slotId="header.right" registry={registry} />
		</header>
	);
}
```

## Status

This is **v0.1**. The runtime is the smallest thing that can host a
plugin and render its slots. Boot integration into `apps/web` lives
behind `Spec 002 / T-004` and is not yet wired up.
