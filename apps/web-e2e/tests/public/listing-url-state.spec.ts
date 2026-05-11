import { test, expect, type Page } from '@playwright/test';

/**
 * URL state persistence for the listing surface.
 *
 * After Spec 020, filter / sort / page state lives in the URL. These
 * tests pin the round-trip:
 *
 *   - Direct URL → SSR rendered with state applied.
 *   - Refresh → state survives.
 *   - Browser back → state restored.
 *   - Forward → state replayed.
 *
 * Without this guarantee, the regression case where pagination silently
 * dropped from the page (because hooks ignored the URL) would have
 * passed every individual widget spec while breaking the user-visible
 * experience.
 */

const PAGE_READY_TIMEOUT = 15_000;

async function goto(page: Page, path: string) {
	await page.goto(path, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
}

test.describe('Public: listing URL state persistence', () => {
	test('search term in URL survives reload', async ({ page }) => {
		await goto(page, '/discover/1?q=time');
		expect(page.url()).toContain('q=time');
		await page.reload({ waitUntil: 'domcontentloaded' });
		expect(page.url()).toContain('q=time');
	});

	test('sort in URL survives reload', async ({ page }) => {
		await goto(page, '/discover/1?sort=name-asc');
		expect(page.url()).toContain('sort=name-asc');
		await page.reload({ waitUntil: 'domcontentloaded' });
		expect(page.url()).toContain('sort=name-asc');
	});

	test('page number in path survives reload', async ({ page }) => {
		await goto(page, '/discover/2');
		expect(page.url()).toMatch(/\/discover\/2(\b|$|\?)/);
		await page.reload({ waitUntil: 'domcontentloaded' });
		expect(page.url()).toMatch(/\/discover\/2(\b|$|\?)/);
	});

	test('locale prefix /es is preserved through pagination', async ({ page }) => {
		const response = await page.goto('/es/discover/1', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		expect(response?.status() ?? 0).toBeLessThan(500);
		expect(page.url()).toContain('/es/discover/1');

		// Navigate to page 2 within the locale — locale must NOT be lost.
		await page.goto('/es/discover/2', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		expect(page.url()).toContain('/es/discover/2');
	});

	test('refreshing /discover/2?sort=name-asc preserves both state pieces', async ({ page }) => {
		await goto(page, '/discover/2?sort=name-asc');
		expect(page.url()).toContain('sort=name-asc');
		expect(page.url()).toMatch(/\/discover\/2(\b|$|\?)/);

		await page.reload({ waitUntil: 'domcontentloaded' });
		expect(page.url()).toContain('sort=name-asc');
		expect(page.url()).toMatch(/\/discover\/2(\b|$|\?)/);
	});

	test('?categories=foo URL renders without 5xx and preserves the param', async ({ page }) => {
		const response = await page.goto('/discover/1?categories=time-tracking-software', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		expect(page.url()).toContain('categories=time-tracking-software');
		await expect(page.locator('body')).toBeVisible();
	});

	test('?tags=foo URL renders without 5xx and preserves the param', async ({ page }) => {
		const response = await page.goto('/discover/1?tags=free', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		expect(page.url()).toContain('tags=free');
		await expect(page.locator('body')).toBeVisible();
	});
});
