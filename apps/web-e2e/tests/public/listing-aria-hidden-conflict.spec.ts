import { test, expect } from '@playwright/test';

// Elements with aria-hidden="true" should not contain focusable children.
// This is WCAG ARIA 1.2 anti-pattern.

const PROBES = ['/', '/discover/1', '/auth/signin'];

test.describe('aria-hidden does not hide focusable children', () => {
	for (const path of PROBES) {
		test(`${path} aria-hidden trees have no focusable descendants`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const violations = await page.evaluate(() => {
				const hidden = Array.from(document.querySelectorAll('[aria-hidden="true"]'));
				const bad: string[] = [];
				for (const h of hidden) {
					const focusable = h.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
					if (focusable.length > 0) {
						bad.push(`${h.tagName} (${focusable.length} focusable)`);
					}
				}
				return bad;
			});
			expect(violations, `${path} aria-hidden violations: ${violations.join(', ')}`).toEqual([]);
		});
	}
});
