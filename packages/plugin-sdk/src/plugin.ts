import type { ComponentType } from 'react';
import type { z } from 'zod';
import type { Capability } from './capabilities';
import type { CapabilityProviderMap, AnalyticsProvider } from './providers';
import type { PluginManifest, PluginConfig } from './manifest';
import type { SlotId } from './slots';

/**
 * Runtime context passed to a plugin's `setup` hook and slot components.
 */
export interface PluginContext<TConfig = unknown> {
	/** The validated, merged config for this plugin. */
	config: TConfig;
	/** Plugin name (matches manifest.name). */
	name: string;
	/** Whether the plugin is currently enabled. */
	enabled: boolean;
	/**
	 * Optional logger. The runtime injects a namespaced child logger;
	 * plugins should prefer `ctx.logger` over reaching for `console`.
	 */
	logger?: {
		info(msg: string, meta?: Record<string, unknown>): void;
		warn(msg: string, meta?: Record<string, unknown>): void;
		error(msg: string, meta?: Record<string, unknown>): void;
	};
}

/**
 * Slot component props. Every slot component receives the plugin
 * context so it can read its own config.
 */
export interface SlotComponentProps<TConfig = unknown> {
	ctx: PluginContext<TConfig>;
}

/**
 * Provider map for a plugin instance. Keys are capabilities the plugin
 * declares; values are the corresponding interface implementations.
 */
export type PluginProviders = {
	[K in Capability]?: K extends keyof CapabilityProviderMap ? CapabilityProviderMap[K] : never;
};

/**
 * Slot map for a plugin instance. Keys are slot ids; values are React
 * components rendered by the runtime's `<SlotHost />`.
 */
export type PluginSlots<TConfig = unknown> = Partial<
	Record<SlotId, ComponentType<SlotComponentProps<TConfig>>>
>;

/**
 * The plugin shape returned by `defineDirectoryPlugin`.
 */
export interface DirectoryPlugin<C extends z.ZodTypeAny = z.ZodTypeAny> {
	manifest: PluginManifest<C>;
	/**
	 * Optional one-time setup. Runs after config validation and before
	 * the registry exposes the plugin's providers / slots.
	 */
	setup?: (ctx: PluginContext<PluginConfig<C>>) => void | Promise<void>;
	/**
	 * Optional teardown. Runs when the plugin is disabled at runtime.
	 */
	teardown?: () => void | Promise<void>;
	/** React components keyed by slot id. */
	slots?: PluginSlots<PluginConfig<C>>;
	/** Capability provider implementations. */
	providers?: PluginProviders;
}

/**
 * Author-facing factory. Returning `defineDirectoryPlugin({...})`
 * gives plugin authors full type inference for `ctx.config` based on
 * their declared Zod schema.
 *
 * @example
 *   import { defineDirectoryPlugin } from '@ever-works/plugin-sdk';
 *   import { z } from 'zod';
 *
 *   export default defineDirectoryPlugin({
 *     manifest: {
 *       name: 'analytics-posthog',
 *       version: '0.1.0',
 *       templateRange: '>=0.1 <1.0',
 *       capabilities: ['analytics'],
 *       config: z.object({
 *         enabled: z.boolean().default(false),
 *         apiKey: z.string().min(1),
 *       }),
 *     },
 *     providers: { analytics: postHogProvider },
 *   });
 */
export function defineDirectoryPlugin<C extends z.ZodTypeAny>(
	plugin: DirectoryPlugin<C>,
): DirectoryPlugin<C> {
	return plugin;
}

// Re-export AnalyticsProvider so `import { AnalyticsProvider } from '@ever-works/plugin-sdk'`
// works without dipping into `./providers`. Same for other commonly-used
// types — but we keep the surface small for now.
export type { AnalyticsProvider };
