import { test, expect } from '@playwright/test';

// Tags / collections expose their own paginated sub-routes
// (/tags/paging/[page], /collections/paging/[page]) in addition to the
// flat index. Same for the listing rewrite to /:path/discover/1. Tests
// here ensure each variant tolerates edge inputs (page=0, abc, huge).

const PAGING_VARIANTS: Array<{ path: string; name: string }> = [
	{ path: '/tags/paging/1', name: 'tags paging p1' },
	{ path: '/tags/paging/2', name: 'tags paging p2' },
	{ path: '/tags/paging/0', name: 'tags paging p0 (edge)' },
	{ path: '/tags/paging/9999', name: 'tags paging huge' },
	{ path: '/tags/paging/abc', name: 'tags paging non-numeric' },
	{ path: '/tags/paging', name: 'tags paging no page' },
	{ path: '/collections/paging/1', name: 'collections paging p1' },
	{ path: '/collections/paging/2', name: 'collections paging p2' },
	{ path: '/collections/paging/0', name: 'collections paging p0' },
	{ path: '/collections/paging/9999', name: 'collections paging huge' },
	{ path: '/collections/paging/abc', name: 'collections paging non-numeric' },
	{ path: '/collections/paging', name: 'collections paging no page' }
];

test.describe('Tag + collection paging sub-route edge inputs', () => {
	for (const { path, name } of PAGING_VARIANTS) {
		test(`${name} (${path}) does not 5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}
});

test.describe('Categorized listing rewrite tolerance', () => {
	test('/<arbitrary-path>/discover/1 (top-level rewrite) does not crash', async ({ page }) => {
		// next.config.ts rewrites /:path → /:path/discover/1 for *some* paths.
		// We exercise this with a plausible top-level segment.
		const resp = await page.goto('/categories/discover/1', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/categories/category/[...] deeply nested tolerates 1 segment', async ({ page }) => {
		const resp = await page.goto('/categories/category/zz-fake', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/categories/category/[...] tolerates many segments', async ({ page }) => {
		const resp = await page.goto('/categories/category/a/b/c/d/e/f/g', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/tags/tag/[...tags] tolerates many segments', async ({ page }) => {
		const resp = await page.goto('/tags/tag/a/b/c/d/e', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});
});
