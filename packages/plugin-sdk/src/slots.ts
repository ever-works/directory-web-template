/**
 * Canonical slot identifiers for the v1 plugin architecture.
 *
 * Slot ids are stable; renaming a slot is a breaking change. New
 * slot ids land via a small spec under `docs/spec/`. Keeping the
 * canonical list here lets the runtime, plugins, and the docs site
 * share a single source of truth.
 */
export const SLOT_IDS = [
	'header.left',
	'header.right',
	'footer.center',
	'home.before-listing',
	'home.after-listing',
	'item.detail.sidebar',
	'item.detail.afterFooter',
	'item.detail.actions',
	'admin.layout.header.right',
	'admin.settings.section',
	'admin.dashboard.widgets',
	'admin.items.row.actions',
	'admin.items.toolbar',
	'client.dashboard.widgets',
	'client.settings.section',
] as const;

export type SlotId = (typeof SLOT_IDS)[number];

export function isSlotId(value: unknown): value is SlotId {
	return typeof value === 'string' && (SLOT_IDS as readonly string[]).includes(value);
}
