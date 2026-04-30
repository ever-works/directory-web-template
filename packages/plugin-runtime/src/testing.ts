import type { DirectoryPlugin } from '@ever-works/plugin-sdk';
import { PluginRegistry } from './registry';
import { loadPlugins } from './loader';

/**
 * Spin up a registry pre-loaded with the given plugins.
 *
 * Each plugin's config schema is run with empty config sources, which
 * exercises the Zod defaults. Plugins whose schema requires non-default
 * fields should pass an `override` source via `loadPlugins` directly.
 *
 * Intended for unit tests of plugin-aware code paths.
 */
export async function createTestRegistry(opts: {
	plugins: DirectoryPlugin[];
}): Promise<PluginRegistry> {
	const registry = new PluginRegistry();
	await loadPlugins(
		registry,
		opts.plugins.map((plugin) => ({ plugin })),
	);
	return registry;
}
