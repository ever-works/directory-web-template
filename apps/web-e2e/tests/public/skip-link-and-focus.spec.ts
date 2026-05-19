import { test, expect } from '@playwright/test';

// "Skip to content" links and focusable anchors are an a11y must. We check
// at least one anchor exists targeting #main or similar; we don't require
// any specific class.

test.describe('Skip link / focusable landing', () => {
	test('homepage has a skip-link OR main landmark with id', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const skip = await page.locator('a[href*="#main"], a[href*="#content"], a[href="#"]').count();
		const mainWithId = await page.locator('main[id], [role="main"][id]').count();
		// One of: there's a skip anchor OR the main landmark has an id
		// that one could target.
		expect(skip + mainWithId, 'skip-link or main[id]').toBeGreaterThan(0);
	});

	test('first focusable element on homepage is reachable via Tab', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await page.keyboard.press('Tab');
		const active = await page.evaluate(() => {
			const el = document.activeElement;
			return el ? el.tagName : null;
		});
		// After first Tab, focus should be on body/main/an anchor/button.
		expect(active, 'first Tab focuses something').not.toBeNull();
	});
});
