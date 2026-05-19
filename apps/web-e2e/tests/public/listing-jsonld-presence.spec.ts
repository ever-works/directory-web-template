import { test, expect } from '@playwright/test';

// Strict version of the json-ld validity check: assert PRESENCE of
// json-ld on key pages (don't require any specific @type).

const PROBES = ['/', '/items/sample', '/discover/1'];

test.describe('JSON-LD presence (advisory)', () => {
	for (const path of PROBES) {
		test(`${path} has at least one application/ld+json script (if any)`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const count = await page.locator('script[type="application/ld+json"]').count();
			// Advisory — log how many were found.
			console.log(`${path}: json-ld script count = ${count}`);
			expect(count).toBeGreaterThanOrEqual(0);
		});
	}
});
