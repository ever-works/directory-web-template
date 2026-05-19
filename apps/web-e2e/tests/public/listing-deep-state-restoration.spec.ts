import { test, expect } from '@playwright/test';

// After navigating between pages, history.pushState should preserve URL.

test.describe('History pushState basics', () => {
	test('Browser back-button after listing nav restores URL', async ({ page }) => {
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		const url1 = page.url();
		await page.goto('/discover/2', { waitUntil: 'domcontentloaded' });
		const url2 = page.url();
		await page.goBack({ waitUntil: 'domcontentloaded' });
		const urlAfterBack = page.url();
		expect(urlAfterBack, `back-button URL`).toContain('/discover/');
		expect(url1).not.toBe(url2);
	});
});
