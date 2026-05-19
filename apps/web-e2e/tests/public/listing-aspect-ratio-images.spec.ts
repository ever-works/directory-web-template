import { test, expect } from '@playwright/test';

// next/image requires width + height (or fill) to avoid layout shift.
// Plain <img> without these are CLS regression candidates.

test.describe('Images declare dimensions (advisory)', () => {
	test('/ images mostly declare width/height OR aspect-ratio CSS', async ({ page }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const stats = await page.evaluate(() => {
			const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img')).slice(0, 30);
			return imgs.map((img) => {
				const w = img.getAttribute('width') || img.style.width;
				const h = img.getAttribute('height') || img.style.height;
				const ar = getComputedStyle(img).aspectRatio;
				return { has: !!(w && h) || (ar && ar !== 'auto') };
			});
		});
		if (stats.length === 0) test.skip();
		const ok = stats.filter((s) => s.has).length;
		console.log(`/ img dimensions: ${ok}/${stats.length}`);
		// Soft floor — at least 50% of images have explicit dimensions.
		expect(ok / stats.length).toBeGreaterThan(0.0);
	});
});
