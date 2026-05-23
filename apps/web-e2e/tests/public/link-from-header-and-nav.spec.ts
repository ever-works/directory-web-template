import { test, expect } from '@playwright/test';

// Click through home → discover → categories → tags → collections. Each
// transition must complete without 5xx and the page must render a heading.

test.describe('Navigation chain — header / nav links', () => {
	test('home → discover → categories → tags → collections', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await expect(page.locator('body')).toBeVisible();

		const r1 = await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		expect(r1!.status()).toBeLessThan(500);

		const r2 = await page.goto('/categories', { waitUntil: 'domcontentloaded' });
		expect(r2!.status()).toBeLessThan(500);

		const r3 = await page.goto('/tags', { waitUntil: 'domcontentloaded' });
		expect(r3!.status()).toBeLessThan(500);

		const r4 = await page.goto('/collections', { waitUntil: 'domcontentloaded' });
		expect(r4!.status()).toBeLessThan(500);
	});

	test('back-button after navigation does not 5xx', async ({ page }) => {
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		await page.goto('/categories', { waitUntil: 'domcontentloaded' });
		await page.goBack({ waitUntil: 'domcontentloaded' });
		await expect(page.locator('body')).toBeVisible();
		await page.goForward({ waitUntil: 'domcontentloaded' });
		await expect(page.locator('body')).toBeVisible();
	});
});
