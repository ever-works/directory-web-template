import { z } from 'zod';
import type { Capability } from './capabilities';

/**
 * Plugin manifest — the metadata every plugin declares.
 *
 * `config` is a Zod schema used at boot to validate the merged
 * configuration (env < DB < explicit override). The schema's inferred
 * type is exposed via `PluginConfig<C>`.
 */
export interface PluginManifest<C extends z.ZodTypeAny = z.ZodTypeAny> {
	/** Globally unique plugin name, e.g. `analytics-posthog`. */
	name: string;
	/** Semantic version of this plugin. */
	version: string;
	/** Optional human description. */
	description?: string;
	/**
	 * Compatible template version range, semver. The runtime refuses
	 * to load plugins that fall outside this range.
	 */
	templateRange: string;
	/** What this plugin can do. At least one. */
	capabilities: readonly Capability[];
	/** Zod schema for the plugin's configuration. */
	config: C;
	/** Whether the plugin is enabled by default when no DB row exists. */
	defaultEnabled?: boolean;
	/** Whether admins can enable / disable the plugin from the UI. */
	adminToggleable?: boolean;
	/** Optional homepage / docs URL. */
	homepage?: string;
}

export type PluginConfig<C extends z.ZodTypeAny> = z.infer<C>;
