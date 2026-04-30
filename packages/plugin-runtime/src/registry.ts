import type { ComponentType } from 'react';
import type {
	Capability,
	CapabilityProviderMap,
	DirectoryPlugin,
	PluginContext,
	SlotComponentProps,
	SlotId,
} from '@ever-works/plugin-sdk';

/**
 * One row in the registry.
 *
 * Stores the plugin, its validated config, the resolved enable
 * state, and a logger. Slots and providers are derived on access via
 * `slotsFor` / `get` / `list`.
 */
interface RegistryEntry {
	plugin: DirectoryPlugin;
	context: PluginContext;
	enabled: boolean;
}

/**
 * In-memory plugin registry.
 *
 * The registry is intentionally **synchronous** for reads: layouts
 * can call `slotsFor('header.right')` from a server component without
 * paying for an async hop. Mutating operations (`enable`, `disable`)
 * are async because they may persist state via the host app.
 *
 * The registry is framework-agnostic apart from the React `ComponentType`
 * used in slots (and even that is only present at the type level).
 */
export class PluginRegistry {
	private readonly entries = new Map<string, RegistryEntry>();

	/**
	 * Optional callback the host app supplies to persist enable state
	 * (e.g. write to `plugin_settings` row). Tests can omit it.
	 */
	private readonly persistEnabled?: (name: string, enabled: boolean) => Promise<void>;

	constructor(opts?: { persistEnabled?: (name: string, enabled: boolean) => Promise<void> }) {
		this.persistEnabled = opts?.persistEnabled;
	}

	/**
	 * Register a plugin with its already-validated config.
	 *
	 * Throws if a plugin with the same name is already registered.
	 */
	register<TConfig>(plugin: DirectoryPlugin, validatedConfig: TConfig, opts?: { enabled?: boolean }): void {
		if (this.entries.has(plugin.manifest.name)) {
			throw new Error(`Plugin "${plugin.manifest.name}" is already registered`);
		}
		const enabled = opts?.enabled ?? plugin.manifest.defaultEnabled ?? true;
		const context: PluginContext = {
			name: plugin.manifest.name,
			enabled,
			config: validatedConfig,
		};
		this.entries.set(plugin.manifest.name, { plugin, context, enabled });
	}

	/** True if the named plugin is registered AND enabled. */
	isEnabled(name: string): boolean {
		const entry = this.entries.get(name);
		return entry !== undefined && entry.enabled;
	}

	/** True if the named plugin is registered, regardless of enabled state. */
	isRegistered(name: string): boolean {
		return this.entries.has(name);
	}

	/** Enable a registered plugin. Persists if a callback was supplied. */
	async enable(name: string): Promise<void> {
		const entry = this.requireEntry(name);
		if (!entry.enabled) {
			entry.enabled = true;
			entry.context.enabled = true;
			await this.persistEnabled?.(name, true);
		}
	}

	/** Disable a registered plugin. Runs `teardown` if defined. */
	async disable(name: string): Promise<void> {
		const entry = this.requireEntry(name);
		if (entry.enabled) {
			entry.enabled = false;
			entry.context.enabled = false;
			await entry.plugin.teardown?.();
			await this.persistEnabled?.(name, false);
		}
	}

	/**
	 * Return the **first** enabled provider for a capability, or
	 * `undefined` if none.
	 *
	 * Use this when the app expects exactly one provider (e.g. payment).
	 */
	get<C extends keyof CapabilityProviderMap>(capability: C): CapabilityProviderMap[C] | undefined {
		for (const entry of this.entries.values()) {
			if (!entry.enabled) continue;
			const provider = entry.plugin.providers?.[capability as Capability];
			if (provider !== undefined) {
				return provider as CapabilityProviderMap[C];
			}
		}
		return undefined;
	}

	/**
	 * Return **all** enabled providers for a capability.
	 *
	 * Use this for fan-out capabilities (e.g. analytics, where each
	 * enabled provider receives every event).
	 */
	list<C extends keyof CapabilityProviderMap>(capability: C): Array<CapabilityProviderMap[C]> {
		const out: Array<CapabilityProviderMap[C]> = [];
		for (const entry of this.entries.values()) {
			if (!entry.enabled) continue;
			const provider = entry.plugin.providers?.[capability as Capability];
			if (provider !== undefined) {
				out.push(provider as CapabilityProviderMap[C]);
			}
		}
		return out;
	}

	/**
	 * Return all React components registered for a slot, in
	 * registration order.
	 *
	 * Each entry is a `{ component, ctx }` pair so the slot host can
	 * pass the plugin's own context to the component.
	 */
	slotsFor(slotId: SlotId): Array<{
		component: ComponentType<SlotComponentProps>;
		ctx: PluginContext;
		pluginName: string;
	}> {
		const out: Array<{
			component: ComponentType<SlotComponentProps>;
			ctx: PluginContext;
			pluginName: string;
		}> = [];
		for (const entry of this.entries.values()) {
			if (!entry.enabled) continue;
			const component = entry.plugin.slots?.[slotId];
			if (component !== undefined) {
				out.push({
					component: component as ComponentType<SlotComponentProps>,
					ctx: entry.context,
					pluginName: entry.plugin.manifest.name,
				});
			}
		}
		return out;
	}

	/** All registered plugins, both enabled and disabled. */
	list_all(): Array<{ plugin: DirectoryPlugin; enabled: boolean }> {
		const out: Array<{ plugin: DirectoryPlugin; enabled: boolean }> = [];
		for (const entry of this.entries.values()) {
			out.push({ plugin: entry.plugin, enabled: entry.enabled });
		}
		return out;
	}

	private requireEntry(name: string): RegistryEntry {
		const entry = this.entries.get(name);
		if (entry === undefined) {
			throw new Error(`Plugin "${name}" is not registered`);
		}
		return entry;
	}
}
