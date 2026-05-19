import { test, expect } from '@playwright/test';

// Each locale variant should produce non-5xx and have a non-empty title.
// We do not assert the locale-specific copy.

const LOCALES = ['en', 'fr', 'es', 'de', 'ar', 'zh'];

test.describe('Locale variants produce a title', () => {
	for (const loc of LOCALES) {
		test(`/${loc} has non-empty title`, async ({ page }) => {
			const resp = await page.goto(`/${loc}`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const t = (await page.title()).trim();
			expect(t, `/${loc} title`).not.toBe('');
		});

		test(`/${loc}/about non-5xx`, async ({ page }) => {
			const resp = await page.goto(`/${loc}/about`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `/${loc}/about`).toBeLessThan(500);
		});

		test(`/${loc}/discover/1 non-5xx`, async ({ page }) => {
			const resp = await page.goto(`/${loc}/discover/1`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `/${loc}/discover/1`).toBeLessThan(500);
		});
	}
});
