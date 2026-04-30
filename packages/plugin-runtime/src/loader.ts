import type { DirectoryPlugin } from '@ever-works/plugin-sdk';
import type { PluginRegistry } from './registry';

/**
 * Per-plugin configuration sources, deep-merged in this order:
 *
 *   env baseline  ⊆  DB row  ⊆  explicit override
 *
 * The runtime validates the merged value against the plugin's Zod
 * schema and only registers the plugin if validation succeeds.
 */
export interface PluginConfigSources {
	env?: Record<string, unknown>;
	db?: Record<string, unknown>;
	override?: Record<string, unknown>;
}

export interface LoadPluginsResult {
	/** Plugins that registered successfully. */
	registered: string[];
	/** Plugins whose config failed Zod validation. */
	rejected: Array<{ name: string; reason: string }>;
}

/**
 * Shallow-merge config sources in precedence order.
 *
 * We intentionally use a shallow merge (not deep) for v1: every
 * plugin's Zod schema is the source of truth for nested shape.
 * Plugins that need nested overrides can flatten their schema or
 * graduate to a deep merge in a follow-up spec.
 */
export function mergeConfigSources(sources: PluginConfigSources): Record<string, unknown> {
	return {
		...(sources.env ?? {}),
		...(sources.db ?? {}),
		...(sources.override ?? {}),
	};
}

/**
 * Validate and register a list of plugins.
 *
 * Each entry pairs a plugin module with its config sources. The
 * loader runs each plugin's Zod schema, registers the validated
 * value, and then invokes `setup()` if defined. Failures are
 * reported per-plugin without aborting the whole boot.
 */
export async function loadPlugins(
	registry: PluginRegistry,
	plugins: Array<{ plugin: DirectoryPlugin; sources?: PluginConfigSources; enabled?: boolean }>,
): Promise<LoadPluginsResult> {
	const registered: string[] = [];
	const rejected: Array<{ name: string; reason: string }> = [];

	for (const entry of plugins) {
		const { plugin, sources, enabled } = entry;
		const merged = mergeConfigSources(sources ?? {});
		const parsed = plugin.manifest.config.safeParse(merged);
		if (!parsed.success) {
			rejected.push({
				name: plugin.manifest.name,
				reason: parsed.error.message,
			});
			continue;
		}

		registry.register(plugin, parsed.data, { enabled });
		registered.push(plugin.manifest.name);

		if (registry.isEnabled(plugin.manifest.name) && plugin.setup) {
			try {
				await plugin.setup({
					name: plugin.manifest.name,
					enabled: true,
					config: parsed.data,
				});
			} catch (e) {
				rejected.push({
					name: plugin.manifest.name,
					reason: `setup failed: ${e instanceof Error ? e.message : String(e)}`,
				});
			}
		}
	}

	return { registered, rejected };
}
