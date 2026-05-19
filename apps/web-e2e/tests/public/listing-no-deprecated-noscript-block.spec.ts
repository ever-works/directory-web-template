import { test, expect } from '@playwright/test';

// noscript content should be reasonable — not a giant inline app. We
// flag a noscript block > 5KB as a regression.

const PROBES = ['/', '/about', '/discover/1'];

test.describe('noscript block size budget', () => {
	for (const path of PROBES) {
		test(`${path} noscript content < 5KB`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const sizes = await page.evaluate(() =>
				Array.from(document.querySelectorAll('noscript')).map((n) => n.textContent?.length || 0)
			);
			const max = sizes.length ? Math.max(...sizes) : 0;
			expect(max, `largest noscript: ${max} bytes`).toBeLessThan(5000);
		});
	}
});
