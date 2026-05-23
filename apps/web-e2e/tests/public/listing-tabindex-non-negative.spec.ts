import { test, expect } from '@playwright/test';

// Positive tabindex values are an a11y anti-pattern. tabindex="-1" is OK
// (programmatic focus only). 0 is OK (natural order). >0 is bad.

const PROBES = ['/', '/auth/signin', '/discover/1'];

test.describe('No positive tabindex values', () => {
	for (const path of PROBES) {
		test(`${path} no elements with tabindex>0`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			const positives = await page.evaluate(() =>
				Array.from(document.querySelectorAll('[tabindex]'))
					.map((el) => parseInt(el.getAttribute('tabindex') || '', 10))
					.filter((n) => Number.isFinite(n) && n > 0)
			);
			expect(positives, `${path} positive tabindex: ${positives.join(', ')}`).toEqual([]);
		});
	}
});
