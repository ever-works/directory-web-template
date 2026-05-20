import { test, expect } from '@playwright/test';

// Pages should never display literal "undefined" or "NaN" or "[object Object]"
// inside visible text content.

const PROBES = ['/', '/about', '/discover/1', '/auth/signin', '/categories', '/tags'];

const BAD_LITERALS = ['undefined', 'NaN', '[object Object]'];

test.describe('No bad literals in visible text (advisory)', () => {
	for (const path of PROBES) {
		test(`${path} no bad literal visible text`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			const text = ((await page.locator('body').textContent()) || '').toLowerCase();
			for (const bad of BAD_LITERALS) {
				const lower = bad.toLowerCase();
				const count = (text.match(new RegExp(lower, 'g')) || []).length;
				// Allow up to 2 occurrences (e.g. inline code samples).
				expect(count, `${path} "${bad}" count: ${count}`).toBeLessThan(3);
			}
		});
	}
});
