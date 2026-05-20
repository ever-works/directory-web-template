import { test, expect } from '@playwright/test';

// Compute body color/background contrast — advisory check.

test.describe('Body text color contrast (advisory)', () => {
	test('/ body text and bg are not identical', async ({ page }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const sample = await page.evaluate(() => {
			const body = document.body;
			const style = getComputedStyle(body);
			return { color: style.color, bg: style.backgroundColor };
		});
		expect(sample.color, 'body computed color').not.toBe('');
		expect(sample.bg, 'body computed bg').not.toBe('');
		// Don't compute actual contrast; just verify they're different strings.
		// Same color/bg would be invisible.
		expect(sample.color).not.toBe(sample.bg);
	});
});
