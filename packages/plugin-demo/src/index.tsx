import { defineDirectoryPlugin } from '@ever-works/plugin-sdk';
import { ConfigSchema } from './config';
import { DemoHeaderBadge } from './Header';

/**
 * Reference / demo plugin.
 *
 * Renders a small badge in the public header's `header.right` slot.
 * Used by Spec 002 e2e tests as a known-good plugin to verify the
 * registry, slot host, and admin enable/disable flow.
 */
const demoPlugin = defineDirectoryPlugin({
	manifest: {
		name: 'demo',
		version: '0.1.0',
		description: 'Reference / demo plugin used in tests and as a teaching example.',
		templateRange: '>=0.1 <1.0',
		capabilities: ['ui-slot'],
		config: ConfigSchema,
		defaultEnabled: true,
		adminToggleable: true,
	},
	slots: {
		'header.right': DemoHeaderBadge,
	},
});

export default demoPlugin;
