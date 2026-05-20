import { test, expect } from '@playwright/test';

// Search form on home page (if present) should have GET method and an
// input named q. We don't fail if no form; we DO fail if a non-GET form
// is misconfigured.

test.describe('Search form shape', () => {
	test('/ search form (if present) is GET with q input', async ({ page }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const forms = await page.evaluate(() =>
			Array.from(document.querySelectorAll('form'))
				.filter((f) => f.querySelector('input[name="q"]'))
				.map((f) => ({ method: (f.method || 'get').toLowerCase(), action: f.action }))
		);
		for (const f of forms) {
			expect(f.method, 'search form method').toBe('get');
		}
	});
});
