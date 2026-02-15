import { test, expect } from '@playwright/test';

test.describe('i18n: Locale Routing and RTL', () => {
	test('default locale (en) has no URL prefix', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		// localePrefix: "as-needed" means default locale has no prefix
		expect(page.url()).not.toMatch(/\/en(\/|$)/);
	});

	test('non-default locale uses URL prefix', async ({ page }) => {
		const response = await page.goto('/fr', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBeLessThan(400);
		await expect(page).toHaveURL(/\/fr/);
	});

	test('RTL locale (ar) sets dir="rtl" on html element', async ({ page }) => {
		await page.goto('/ar', { waitUntil: 'domcontentloaded' });

		const dir = await page.locator('html').getAttribute('dir');
		expect(dir).toBe('rtl');
	});

	test('RTL locale (he) sets dir="rtl" on html element', async ({ page }) => {
		await page.goto('/he', { waitUntil: 'domcontentloaded' });

		const dir = await page.locator('html').getAttribute('dir');
		expect(dir).toBe('rtl');
	});

	test('LTR locale (fr) sets dir="ltr" on html element', async ({ page }) => {
		await page.goto('/fr', { waitUntil: 'domcontentloaded' });

		const dir = await page.locator('html').getAttribute('dir');
		expect(dir).toBe('ltr');
	});

	test('localized auth page loads correctly', async ({ page }) => {
		const response = await page.goto('/fr/auth/signin', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBeLessThan(400);
		await expect(page).toHaveURL(/\/fr\/auth\/signin/);
		await expect(page.locator('body')).toBeVisible();
	});
});
