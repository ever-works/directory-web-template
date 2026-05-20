import { test, expect } from '@playwright/test';

// <meta charset> and <meta name="viewport"> must be present on every
// public route. Missing viewport breaks mobile.

const PROBES = ['/', '/about', '/discover/1', '/auth/signin'];

test.describe('html charset / viewport', () => {
	for (const path of PROBES) {
		test(`${path} has meta charset and viewport`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			const charset = await page.locator('meta[charset]').first().getAttribute('charset').catch(() => null);
			expect(charset, `${path} meta charset`).toBeTruthy();
			if (charset) expect(charset.toLowerCase()).toContain('utf');
			const viewport = await page.locator('meta[name="viewport"]').first().getAttribute('content').catch(() => null);
			expect(viewport, `${path} meta viewport`).toBeTruthy();
		});
	}
});
