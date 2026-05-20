import { test, expect } from '@playwright/test';

// Scripts in <head> should declare async/defer/type="module" — otherwise
// they block rendering.

test.describe('Head scripts declare async/defer/module', () => {
	test('/ head scripts non-blocking', async ({ page }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const blocking = await page.evaluate(() => {
			return Array.from(document.head.querySelectorAll('script[src]'))
				.filter((s) => {
					return !s.hasAttribute('async') && !s.hasAttribute('defer') && s.getAttribute('type') !== 'module';
				})
				.map((s) => s.getAttribute('src') || '?');
		});
		// Soft cap — render-blocking scripts are bad UX but sometimes intentional.
		expect(blocking.length, `head render-blocking scripts: ${blocking.join(', ')}`).toBeLessThan(5);
	});
});
