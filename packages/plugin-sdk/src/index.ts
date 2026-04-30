/**
 * `@ever-works/plugin-sdk` — public surface.
 *
 * The SDK is **framework-agnostic** apart from optional React types
 * for slot components. Anything React-specific lives in
 * `@ever-works/plugin-runtime`.
 *
 * See [`docs/architecture/plugin-system.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/architecture/plugin-system.md)
 * for the design rationale.
 */
export { CAPABILITIES, isCapability } from './capabilities';
export type { Capability } from './capabilities';

export { SLOT_IDS, isSlotId } from './slots';
export type { SlotId } from './slots';

export type { PluginManifest, PluginConfig } from './manifest';

export type {
	AuthProvider,
	PaymentProvider,
	AnalyticsProvider,
	SearchProvider,
	ContentSource,
	MapsProvider,
	NewsletterProvider,
	NotificationsProvider,
	AIProvider,
	CapabilityProviderMap,
} from './providers';

export { defineDirectoryPlugin } from './plugin';
export type {
	DirectoryPlugin,
	PluginContext,
	SlotComponentProps,
	PluginProviders,
	PluginSlots,
} from './plugin';
