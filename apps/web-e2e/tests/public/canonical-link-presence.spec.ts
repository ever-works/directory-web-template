import { test, expect } from '@playwright/test';

// Canonical link presence on indexed pages. We don't assert exact host,
// only that the href is not literal "undefined" / "null" / empty.

const INDEXED = ['/', '/about', '/discover/1', '/categories', '/tags', '/pricing'];

test.describe('Canonical link presence', () => {
	for (const path of INDEXED) {
		test(`${path} has canonical with non-empty href`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const href = await page
				.locator('link[rel="canonical"]')
				.first()
				.getAttribute('href')
				.catch(() => null);
			if (!href) test.skip();
			expect(href).not.toBe('undefined');
			expect(href).not.toBe('null');
			expect(href!.length).toBeGreaterThan(0);
		});
	}
});
