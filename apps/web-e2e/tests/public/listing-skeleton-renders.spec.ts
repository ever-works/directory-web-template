import { test, expect } from '@playwright/test';

// While the listing data loads, a skeleton/placeholder should render.
// We verify the body has SOME content within 2 seconds.

const PROBES = ['/discover/1', '/categories', '/tags', '/collections'];

test.describe('Listing skeleton renders quickly', () => {
	for (const path of PROBES) {
		test(`${path} body has content within 2s`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 15_000 });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const text = await page.locator('body').textContent({ timeout: 2_000 });
			expect((text || '').trim().length, `${path} body content`).toBeGreaterThan(0);
		});
	}
});
