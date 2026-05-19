import { test, expect } from '@playwright/test';

// Overshoot pagination: requesting a page far beyond the actual items
// should return an empty-state UI, NOT 5xx or a crash. Empty-state
// behavior may be 200 (empty list), 404, or 308 to /discover/1.

const OVERSHOOT_PROBES = [
	{ path: '/discover/100', desc: 'page 100' },
	{ path: '/discover/9999', desc: 'page 9999' },
	{ path: '/tags/paging/100', desc: 'tags p100' },
	{ path: '/tags/paging/9999', desc: 'tags p9999' },
	{ path: '/collections/paging/100', desc: 'collections p100' },
	{ path: '/collections/paging/9999', desc: 'collections p9999' }
];

test.describe('Listing overshoot pagination', () => {
	for (const { path, desc } of OVERSHOOT_PROBES) {
		test(`${desc} (${path}) non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
