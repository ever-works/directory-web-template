import { buildCatalog, toDataset, type DirectoryInput } from '../dataset';

/**
 * A small directory in the shape `getCachedItems()` returns: categories and
 * tags already populated as `{ id, name }`, plus a few raw strings and one
 * reference that is not in categories.yml.
 */
export const fixtureInput: DirectoryInput = {
	baseUrl: 'https://tools.example.com/',
	name: 'Example Tools',
	description: 'The best time tracking tools.',
	itemName: 'Tool',
	itemsName: 'Tools',
	categories: [
		{ id: 'time-tracking', name: 'Time Tracking', description: 'Track hours.' },
		{ id: 'invoicing', name: 'Invoicing' },
		{ id: 'empty-category', name: 'Empty Category' }
	],
	tags: [
		{ id: 'open-source', name: 'Open Source' },
		{ id: 'free', name: 'Free' },
		{ id: 'mobile', name: 'Mobile' }
	],
	items: [
		{
			slug: 'toggl',
			name: 'Toggl',
			description: 'Simple time tracker for teams.',
			source_url: 'https://toggl.com',
			category: [{ id: 'time-tracking', name: 'Time Tracking' }],
			tags: [{ id: 'free', name: 'Free' }, { id: 'mobile', name: 'Mobile' }],
			featured: true,
			icon_url: '/logos/toggl.png',
			updated_at: '2026-10-01T10:00:00.000Z',
			brand: { name: 'Toggl OÜ' },
			images: ['https://cdn.example.com/toggl-1.png', '/shots/toggl-2.png', 'javascript:alert(1)']
		},
		{
			slug: 'kimai',
			name: 'Kimai',
			description: 'Open source time tracking for freelancers.',
			source_url: 'https://www.kimai.org',
			category: { id: 'time-tracking', name: 'Time Tracking' },
			tags: [{ id: 'open-source', name: 'Open Source' }, 'Free'],
			updated_at: '2026-11-05'
		},
		{
			slug: 'invoice-ninja',
			name: 'Invoice Ninja',
			description: 'Invoices and time tracking, open source.',
			source_url: '',
			category: ['invoicing', 'Time Tracking'],
			tags: [{ id: 'open-source', name: 'Open Source' }],
			brand_logo_url: 'https://cdn.example.com/ninja.svg',
			publisher: 'Invoice Ninja LLC'
		},
		{
			slug: 'timer',
			name: 'Timer',
			description: 'A plain timer.',
			category: 'Unknown Stuff',
			tags: []
		},
		// Dropped: no slug, and a duplicate slug.
		{ name: 'No slug' },
		{ slug: 'toggl', name: 'Toggl duplicate' }
	],
	collectionsCount: 2,
	comparisonsCount: 1,
	dataRepository: 'https://github.com/ever-works/awesome-time-tracking-data',
	submitUrl: '/submit'
};

export function fixtureCatalog() {
	return buildCatalog(fixtureInput);
}

export function fixtureDataset(markdown: Record<string, string> = { toggl: '# Toggl\n\nTrack time.' }) {
	return toDataset(fixtureCatalog(), async (slug) => markdown[slug] ?? null);
}
