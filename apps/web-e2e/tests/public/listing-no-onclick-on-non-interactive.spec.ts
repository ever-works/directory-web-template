import { test, expect } from '@playwright/test';

// Elements with onclick should be button/a/role=button — not raw div/span.

const PROBES = ['/', '/discover/1'];

test.describe('Click handlers on semantic elements', () => {
	for (const path of PROBES) {
		test(`${path} no onclick attribute on div/span (advisory)`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const bad = await page.evaluate(() =>
				Array.from(document.querySelectorAll('[onclick]'))
					.filter((el) => ['DIV', 'SPAN'].includes(el.tagName) && !el.getAttribute('role'))
					.length
			);
			// Soft warn — modern React rarely uses onclick attribute.
			expect(bad, `${path} div/span with onclick: ${bad}`).toBe(0);
		});
	}
});
