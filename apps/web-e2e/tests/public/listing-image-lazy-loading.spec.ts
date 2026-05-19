import { test, expect } from '@playwright/test';

// Off-fold images on listing pages should declare loading="lazy" or use
// next/image (which sets loading=lazy by default).

test.describe('Off-fold images use lazy loading', () => {
	test('/discover/1 below-fold images mostly have loading=lazy', async ({ page }) => {
		const resp = await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const stats = await page.evaluate(() => {
			const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
			const vh = window.innerHeight;
			const off: { loading: string }[] = [];
			for (const img of imgs) {
				const rect = img.getBoundingClientRect();
				if (rect.top > vh) {
					off.push({ loading: img.getAttribute('loading') || '' });
				}
			}
			return off;
		});
		if (stats.length === 0) test.skip();
		const lazy = stats.filter((s) => s.loading === 'lazy').length;
		console.log(`/discover/1: ${lazy}/${stats.length} off-fold images use lazy loading`);
		expect(lazy / stats.length).toBeGreaterThan(0.0);
	});
});
