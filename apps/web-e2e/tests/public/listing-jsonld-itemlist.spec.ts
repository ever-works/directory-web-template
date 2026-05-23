import { test, expect } from '@playwright/test';

// Discover listings should expose JSON-LD ItemList for SEO (or nothing —
// but if present, it must parse). We DO NOT require a specific schema.

const LISTING_PAGES = ['/discover/1', '/categories', '/tags', '/collections'];

test.describe('Listing JSON-LD parseable', () => {
	for (const path of LISTING_PAGES) {
		test(`${path} JSON-LD scripts all parse`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
			for (const [i, raw] of scripts.entries()) {
				const trimmed = raw.trim();
				if (!trimmed) continue;
				try {
					JSON.parse(trimmed);
				} catch {
					throw new Error(`${path}: script[type=ld+json] #${i} not valid JSON`);
				}
			}
		});
	}
});
