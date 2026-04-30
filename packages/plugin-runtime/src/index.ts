/**
 * `@ever-works/plugin-runtime` — public surface.
 *
 * The runtime is React-aware. It owns the `PluginRegistry`, the
 * deep-merge config loader, and the `<SlotHost />` component.
 *
 * See [`docs/architecture/plugin-system.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/architecture/plugin-system.md).
 */
export { PluginRegistry } from './registry';
export { loadPlugins, mergeConfigSources } from './loader';
export type { PluginConfigSources, LoadPluginsResult } from './loader';
export { SlotHost } from './SlotHost';
export type { SlotHostProps } from './SlotHost';
export { createTestRegistry } from './testing';
