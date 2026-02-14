import { test, expect } from '@playwright/test';

test.describe('i18n: Locale Routing and RTL', () => {
	test('default locale (en) has no URL prefix', async ({ page }) => {
		await page.goto('/');

		// localePrefix: "as-needed" means default locale has no prefix
		expect(page.url()).not.toMatch(/\/en(\/|$)/);
	});

	test('non-default locale uses URL prefix', async ({ page }) => {
		const response = await page.goto('/fr');

		expect(response?.status()).toBeLessThan(400);
		await expect(page).toHaveURL(/\/fr/);
	});

	test('RTL locale (ar) sets dir="rtl" on html element', async ({ page }) => {
		await page.goto('/ar');

		const dir = await page.locator('html').getAttribute('dir');
		expect(dir).toBe('rtl');
	});

	test('RTL locale (he) sets dir="rtl" on html element', async ({ page }) => {
		await page.goto('/he');

		const dir = await page.locator('html').getAttribute('dir');
		expect(dir).toBe('rtl');
	});

	test('LTR locale (fr) sets dir="ltr" on html element', async ({ page }) => {
		await page.goto('/fr');

		const dir = await page.locator('html').getAttribute('dir');
		expect(dir).toBe('ltr');
	});

	test('localized auth page loads correctly', async ({ page }) => {
		const response = await page.goto('/fr/auth/signin');

		expect(response?.status()).toBeLessThan(400);
		await expect(page).toHaveURL(/\/fr\/auth\/signin/);
		await expect(page.locator('body')).toBeVisible();
	});
});
