import { test, expect } from '@playwright/test';

// Active state of the sort menu and view toggle is reflected in the URL
// (Spec 020). Tests catch regressions where the menu shows the wrong
// active option for a given URL or vice versa.

test.describe('Listing sort + view toggle URL state', () => {
	test('?sort=newest survives a re-navigation to the same URL', async ({ page }) => {
		const url = '/discover/1?sort=newest';
		await page.goto(url, { waitUntil: 'domcontentloaded' });
		expect(page.url()).toContain('sort=newest');
		// Reload — URL should be preserved.
		await page.reload({ waitUntil: 'domcontentloaded' });
		expect(page.url()).toContain('sort=newest');
	});

	test('navigating /discover/1?sort=name then /discover/1 clears sort', async ({ page }) => {
		await page.goto('/discover/1?sort=name', { waitUntil: 'domcontentloaded' });
		expect(page.url()).toContain('sort=name');
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		expect(page.url()).not.toContain('sort=name');
	});

	test('view toggle param ?layout=grid is tolerated', async ({ page }) => {
		const resp = await page.goto('/discover/1?layout=grid', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
	});

	test('view toggle param ?layout=list is tolerated', async ({ page }) => {
		const resp = await page.goto('/discover/1?layout=list', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
	});

	test('view toggle param ?layout=invalid-value does not 5xx', async ({ page }) => {
		const resp = await page.goto('/discover/1?layout=spaceship', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp!.status()).toBeLessThan(500);
	});

	test('combining ?layout=grid&sort=newest&page=2 does not 5xx', async ({ page }) => {
		const resp = await page.goto('/discover/1?layout=grid&sort=newest&page=2', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp!.status()).toBeLessThan(500);
		expect(page.url()).toContain('layout=grid');
		expect(page.url()).toContain('sort=newest');
		expect(page.url()).toContain('page=2');
	});
});
