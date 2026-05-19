import { test, expect } from '@playwright/test';

const LOCALES = ['en', 'fr', 'es', 'de'];

test.describe('Pricing locale prefix', () => {
	for (const loc of LOCALES) {
		test(`/${loc}/pricing non-5xx`, async ({ page }) => {
			const resp = await page.goto(`/${loc}/pricing`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `/${loc}/pricing`).toBeLessThan(500);
		});

		test(`/${loc}/pricing/success non-5xx`, async ({ page }) => {
			const resp = await page.goto(`/${loc}/pricing/success`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `/${loc}/pricing/success`).toBeLessThan(500);
		});

		test(`/${loc}/sponsor non-5xx`, async ({ page }) => {
			const resp = await page.goto(`/${loc}/sponsor`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `/${loc}/sponsor`).toBeLessThan(500);
		});
	}
});
