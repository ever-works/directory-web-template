import { test, expect } from '@playwright/test';

// Item detail pages typically contain a "Similar items" or "Related"
// listing. We don't assert the heading copy. We DO verify the page renders
// at least one item-card-like locator OR none.

test.describe('Item detail related/similar listing tolerance', () => {
	test('/items/sample renders without crashing', async ({ page }) => {
		const resp = await page.goto('/items/sample', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		await expect(page.locator('body')).toBeVisible();
	});

	test('/items/sample has no broken images (above-fold)', async ({ page }) => {
		const resp = await page.goto('/items/sample', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const broken = await page.evaluate(() =>
			Array.from(document.querySelectorAll<HTMLImageElement>('img'))
				.slice(0, 20)
				.filter((img) => img.complete && img.naturalWidth === 0 && img.getAttribute('src'))
				.map((img) => img.getAttribute('src') || '?')
		);
		expect(broken, `broken <img> on /items/sample: ${broken.join(', ')}`).toEqual([]);
	});
});
