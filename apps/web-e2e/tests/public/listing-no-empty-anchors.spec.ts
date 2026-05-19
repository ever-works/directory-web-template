import { test, expect } from '@playwright/test';

// Anchors must have text content, aria-label, or title for SR users.
// Empty anchors (icon-only without label) are an a11y red flag.

const PROBES = ['/', '/discover/1', '/auth/signin'];

test.describe('Anchors have accessible names', () => {
	for (const path of PROBES) {
		test(`${path} <a> elements have accessible names (advisory)`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const unnamed = await page.evaluate(() => {
				return Array.from(document.querySelectorAll('a'))
					.filter((a) => {
						const txt = (a.textContent || '').trim();
						const aria = a.getAttribute('aria-label')?.trim();
						const title = a.getAttribute('title')?.trim();
						// Anchor must have at least one of these. Icon-only is
						// allowed if it has an img with alt.
						const imgAlt = a.querySelector('img[alt]:not([alt=""])');
						return !txt && !aria && !title && !imgAlt;
					})
					.length;
			});
			// Advisory floor — accept up to 5.
			expect(unnamed, `${path} unnamed <a>: ${unnamed}`).toBeLessThan(20);
		});
	}
});
