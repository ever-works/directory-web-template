import { test, expect } from '@playwright/test';

// We don't ban inline styles, but huge inline <style> blobs (>500KB)
// are usually accidental "shipped entire CSS module into HTML" bugs.

test.describe('Inline <style> block size sanity', () => {
	test('/ has no inline <style> block > 500KB', async ({ page }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const sizes = await page.evaluate(() =>
			Array.from(document.querySelectorAll('style')).map((s) => s.textContent?.length || 0)
		);
		const max = sizes.length ? Math.max(...sizes) : 0;
		expect(max, `largest inline <style>: ${max} bytes`).toBeLessThan(500_000);
	});

	test('/discover/1 has no inline <style> block > 800KB', async ({ page }) => {
		const resp = await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const sizes = await page.evaluate(() =>
			Array.from(document.querySelectorAll('style')).map((s) => s.textContent?.length || 0)
		);
		const max = sizes.length ? Math.max(...sizes) : 0;
		expect(max).toBeLessThan(800_000);
	});
});
