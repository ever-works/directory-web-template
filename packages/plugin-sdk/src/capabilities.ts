/**
 * Plugin capability identifiers.
 *
 * The full v1 capability set as defined in
 * `docs/architecture/plugin-system.md`. Each capability has a
 * matching interface declared in this SDK; plugins implement one or
 * more capabilities by attaching providers to those keys.
 */
export const CAPABILITIES = [
	'auth',
	'payment',
	'analytics',
	'search',
	'content-source',
	'maps',
	'newsletter',
	'notifications',
	'ai',
	'ui-slot',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export function isCapability(value: unknown): value is Capability {
	return typeof value === 'string' && (CAPABILITIES as readonly string[]).includes(value);
}
