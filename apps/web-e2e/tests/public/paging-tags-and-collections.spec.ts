import { test, expect } from '@playwright/test';

// Paginated index pages: /tags/paging/[page] and /collections/paging/[page].
// Edge cases: page 0 (invalid), page 1 (always valid), page 99999 (overshoot),
// negative number, non-numeric.

const PAGING_PROBES = [
	{ path: '/tags/paging/1', name: 'tags p1' },
	{ path: '/tags/paging/0', name: 'tags p0' },
	{ path: '/tags/paging/-1', name: 'tags p-1' },
	{ path: '/tags/paging/abc', name: 'tags pabc' },
	{ path: '/tags/paging/99999', name: 'tags p99999' },
	{ path: '/collections/paging/1', name: 'collections p1' },
	{ path: '/collections/paging/0', name: 'collections p0' },
	{ path: '/collections/paging/abc', name: 'collections pabc' },
	{ path: '/collections/paging/99999', name: 'collections p99999' }
];

test.describe('Pagination edge tolerance — tags/collections', () => {
	for (const { path, name } of PAGING_PROBES) {
		test(`${name} (${path}) does not 5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}
});
