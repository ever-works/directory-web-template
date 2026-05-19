import { test, expect } from '@playwright/test';

// On a category/tag page, the active filter chip should set aria-current
// or aria-pressed for SR users. We don't enforce — just verify it doesn't
// crash on weird input.

test.describe('Listing aria attributes survive weird filters', () => {
	test('discover with empty filters does not crash', async ({ page }) => {
		const resp = await page.goto('/discover/1?category=&tag=&q=', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
		await expect(page.locator('body')).toBeVisible();
	});

	test('discover with all filters set does not crash', async ({ page }) => {
		const resp = await page.goto('/discover/1?category=sample&tag=sample&q=hello&sort=newest&view=grid', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('discover with non-string filter values does not crash', async ({ page }) => {
		const resp = await page.goto('/discover/1?category[]=a&category[]=b', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});
});
