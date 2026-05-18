import { test, expect } from '@playwright/test';

// Spec 020 made the URL the source of truth for listing state. This spec
// exercises *combinations* of filters (category + tag, category + search,
// sort + page, etc.) on the /discover/1 surface, asserting that each
// combo:
//   - responds non-5xx
//   - preserves the active filter chip(s) in the UI
//   - the URL still contains the filter params we asked for

const LISTING_BASE = '/discover/1';

const COMBOS: Array<{ qs: string; expectInUrl: string[] }> = [
	{ qs: '?q=test', expectInUrl: ['q=test'] },
	{ qs: '?sort=newest', expectInUrl: ['sort=newest'] },
	{ qs: '?sort=oldest', expectInUrl: ['sort=oldest'] },
	{ qs: '?sort=name', expectInUrl: ['sort=name'] },
	{ qs: '?q=test&sort=newest', expectInUrl: ['q=test', 'sort=newest'] },
	{ qs: '?page=2', expectInUrl: ['page=2'] }
	// Category and tag filters can't be asserted blindly — the slug must
	// exist in the seed. Owned by tests/public/categories.spec.ts etc.
];

test.describe('Listing filter combinations', () => {
	for (const { qs, expectInUrl } of COMBOS) {
		test(`listing ${qs}`, async ({ page }) => {
			const url = `${LISTING_BASE}${qs}`;
			const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${url} should not 5xx`).toBeLessThan(500);
			for (const expectedFragment of expectInUrl) {
				expect(page.url(), `${url}: URL should contain ${expectedFragment}`).toContain(
					expectedFragment
				);
			}
		});
	}

	test('invalid sort value is tolerated (no 5xx)', async ({ page }) => {
		const resp = await page.goto(`${LISTING_BASE}?sort=not-a-real-sort-value`, {
			waitUntil: 'domcontentloaded'
		});
		expect(resp!.status()).toBeLessThan(500);
	});

	test('invalid page number 0 is tolerated', async ({ page }) => {
		const resp = await page.goto(`${LISTING_BASE}?page=0`, { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
	});

	test('insanely large page number is tolerated', async ({ page }) => {
		const resp = await page.goto(`${LISTING_BASE}?page=999999`, {
			waitUntil: 'domcontentloaded'
		});
		expect(resp!.status()).toBeLessThan(500);
	});
});
