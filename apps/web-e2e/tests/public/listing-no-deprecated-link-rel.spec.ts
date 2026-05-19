import { test, expect } from '@playwright/test';

// Deprecated/uncommon link rel values shouldn't appear in head.

const DEPRECATED = ['shortcut icon', 'mask-icon'];  // mask-icon is deprecated in iOS

const PROBES = ['/', '/about'];

test.describe('Deprecated link rel values', () => {
	for (const path of PROBES) {
		test(`${path} no deprecated rel values (advisory)`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const used = await page.evaluate(() => {
				return Array.from(document.querySelectorAll('link[rel]'))
					.map((l) => (l.getAttribute('rel') || '').toLowerCase());
			});
			for (const dep of DEPRECATED) {
				// We don't fail — soft warning only.
				const count = used.filter((r) => r === dep || r.includes(dep)).length;
				console.log(`${path}: link rel="${dep}" count=${count}`);
			}
		});
	}
});
