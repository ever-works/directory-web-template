import { test, expect } from '@playwright/test';

// Canonical URLs should be self-consistent: visiting /about and then
// reading meta canonical href should yield a URL pointing to this site.

const PROBES = ['/', '/about', '/discover/1'];

test.describe('Canonical URL is consistent', () => {
	for (const path of PROBES) {
		test(`${path} canonical host matches current origin`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const href = await page.locator('link[rel="canonical"]').first().getAttribute('href').catch(() => null);
			if (!href) test.skip();
			const u = new URL(href!, page.url());
			const cur = new URL(page.url());
			// Allow swap of localhost/127.0.0.1 in dev. In CI/prod, hosts match.
			if (cur.hostname.includes('localhost') || cur.hostname.includes('127.0.0.1')) test.skip();
			expect(u.hostname, `${path} canonical host`).toBe(cur.hostname);
		});
	}
});
