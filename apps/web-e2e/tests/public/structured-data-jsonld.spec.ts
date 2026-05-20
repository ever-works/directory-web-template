import { test, expect } from '@playwright/test';

// JSON-LD structured data should be parseable on pages that include it.
// Spec doesn't require any specific schema — only that IF a script[type=ld+json]
// exists, its contents are valid JSON (otherwise google search console screams).

const JSONLD_PROBES = ['/', '/about', '/discover/1', '/items/sample'];

test.describe('JSON-LD structured data parseable', () => {
	for (const path of JSONLD_PROBES) {
		test(`${path} JSON-LD is valid JSON if present`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
			for (const [i, raw] of scripts.entries()) {
				try {
					const parsed = JSON.parse(raw);
					expect(parsed, `script[type=ld+json] #${i} on ${path}`).toBeTruthy();
				} catch {
					throw new Error(`script[type=ld+json] #${i} on ${path} is NOT valid JSON`);
				}
			}
		});
	}
});
