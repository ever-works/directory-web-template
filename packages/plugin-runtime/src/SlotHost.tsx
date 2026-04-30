import { Fragment, type ReactNode } from 'react';
import type { SlotId } from '@ever-works/plugin-sdk';
import type { PluginRegistry } from './registry';

export interface SlotHostProps {
	/** Canonical slot identifier (typed via `SlotId` from the SDK). */
	slotId: SlotId;
	/** Registry to read components from. */
	registry: PluginRegistry;
	/**
	 * Optional fallback rendered when no plugin contributes to this slot.
	 * Lets layouts default to non-empty content (e.g. a built-in widget)
	 * while still being plugin-extensible.
	 */
	fallback?: ReactNode;
}

/**
 * Render every plugin-contributed component for `slotId`, in
 * registration order. Each component receives the plugin's own
 * `ctx` so it can read its own typed config.
 */
export function SlotHost({ slotId, registry, fallback }: SlotHostProps): ReactNode {
	const components = registry.slotsFor(slotId);
	if (components.length === 0) {
		return fallback ?? null;
	}
	return (
		<>
			{components.map(({ component: Component, ctx, pluginName }) => (
				<Fragment key={pluginName}>
					<Component ctx={ctx} />
				</Fragment>
			))}
		</>
	);
}
