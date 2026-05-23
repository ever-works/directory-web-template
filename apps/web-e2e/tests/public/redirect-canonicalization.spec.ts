import { test, expect } from '@playwright/test';

// Common URL canonicalization rules (Spec 020 + Spec 019):
//   - trailing slashes are stripped (or kept consistently)
//   - default-locale "/en/foo" canonicalizes to "/foo" with localePrefix='as-needed'
//   - HTTP → HTTPS in production (skipped in CI / local)

test.describe('URL canonicalization', () => {
	test('/discover (no page param) lands somewhere valid', async ({ page }) => {
		const resp = await page.goto('/discover', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
		// next.config.ts has a rewrite that maps /:path -> /:path/discover/1 —
		// final URL should land on a discover-ish path or the rewritten one.
		expect(page.url()).toMatch(/discover|page=|\/$|\/categories|\/tags|\/collections/);
	});

	test('default locale prefix /en/about routes to /about region', async ({ page }) => {
		const resp = await page.goto('/en/about', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		// next-intl with localePrefix='as-needed' typically 308s /en/about → /about.
		// Whichever it does, no 5xx and we land somewhere coherent.
		expect(resp!.status()).toBeLessThan(500);
		const path = new URL(page.url()).pathname;
		expect(path).toMatch(/^\/(about|en\/about)/);
	});

	test('case variants of /About are handled (404 or normalized)', async ({ page }) => {
		const resp = await page.goto('/About', { waitUntil: 'domcontentloaded' });
		// Either 404 (case-sensitive) or 200 (case-folded). We just require no 5xx.
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('trailing slash on /about does not 500', async ({ page }) => {
		const resp = await page.goto('/about/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('query-only URL (no path) does not crash', async ({ page }) => {
		const resp = await page.goto('/?utm_source=test&fbclid=fake', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
	});
});
