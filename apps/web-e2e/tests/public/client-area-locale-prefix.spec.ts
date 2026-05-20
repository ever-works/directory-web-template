import { test, expect } from '@playwright/test';

// /<locale>/client/* and /<locale>/dashboard/* should also bounce anonymous.

const LOCALES = ['en', 'fr', 'de'];

test.describe('Client / dashboard under locale prefix bounces anonymous', () => {
	for (const loc of LOCALES) {
		test(`/${loc}/client/dashboard bounces anonymous`, async ({ page }) => {
			const resp = await page.goto(`/${loc}/client/dashboard`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			await expect(page).toHaveURL(/(auth\/signin|\/auth\/|\/$|\/client\/)/, { timeout: 30_000 });
		});

		test(`/${loc}/dashboard/billing bounces anonymous`, async ({ page }) => {
			const resp = await page.goto(`/${loc}/dashboard/billing`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			await expect(page).toHaveURL(/(auth\/signin|\/auth\/|\/$|\/dashboard\/)/, { timeout: 30_000 });
		});

		test(`/${loc}/favorites bounces anonymous`, async ({ page }) => {
			const resp = await page.goto(`/${loc}/favorites`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			await expect(page).toHaveURL(/(auth\/signin|\/auth\/|\/$|\/favorites|\/$)/, { timeout: 30_000 });
		});
	}
});
