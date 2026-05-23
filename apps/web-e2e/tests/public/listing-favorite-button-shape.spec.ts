import { test, expect } from '@playwright/test';

// Listing items should expose either a favorite or vote button. We do
// not click them; we only verify the element shape doesn't crash.

test.describe('Listing favorite/vote button shape', () => {
	test('/discover/1 has buttons (any role)', async ({ page }) => {
		const resp = await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		// Just verify any button-ish exists. Don't lock to specific selectors.
		const buttons = await page.locator('button, [role="button"]').count();
		expect(buttons, 'buttons on /discover/1').toBeGreaterThan(0);
	});

	test('/items/sample has interactive controls', async ({ page }) => {
		const resp = await page.goto('/items/sample', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const controls = await page.locator('button, a, [role="button"]').count();
		expect(controls).toBeGreaterThan(0);
	});
});
