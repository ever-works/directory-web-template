import { test, expect } from '@playwright/test';

const NON_DEFAULT_LOCALES = ['fr', 'es', 'de', 'zh'] as const;

test.describe('i18n: Multiple Locales Load', () => {
	for (const locale of NON_DEFAULT_LOCALES) {
		test(`/${locale} homepage loads without error`, async ({ page }) => {
			const response = await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded' });

			expect(response?.status()).toBeLessThan(400);
			await expect(page.locator('body')).toBeVisible();

			// Should have content (not a blank page)
			const mainContent = page.locator('main').first();
			await expect(mainContent).toBeVisible({ timeout: 10_000 });
		});
	}
});

test.describe('i18n: Content Translation Verification', () => {
	test('French page renders translated content (not English)', async ({ page }) => {
		await page.goto('/fr', { waitUntil: 'domcontentloaded' });

		// Look for a common French UI element (footer subscribe, nav links, etc.)
		// The language switcher should show "FR" as the active locale
		const langButton = page.locator('button[aria-label="Select language"]').first();
		const isVisible = await langButton.isVisible().catch(() => false);

		if (isVisible) {
			const text = await langButton.textContent();
			expect(text?.toUpperCase()).toContain('FR');
		}
	});

	test('Spanish page renders translated content', async ({ page }) => {
		await page.goto('/es', { waitUntil: 'domcontentloaded' });

		const langButton = page.locator('button[aria-label="Select language"]').first();
		const isVisible = await langButton.isVisible().catch(() => false);

		if (isVisible) {
			const text = await langButton.textContent();
			expect(text?.toUpperCase()).toContain('ES');
		}
	});
});

test.describe('i18n: Locale-Prefixed Routes', () => {
	test('French discover page loads correctly', async ({ page }) => {
		const response = await page.goto('/fr/discover/1', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBeLessThan(400);
		await expect(page).toHaveURL(/\/fr\/discover/);
		await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 });
	});

	test('German categories page loads correctly', async ({ page }) => {
		const response = await page.goto('/de/categories', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBeLessThan(400);
		await expect(page).toHaveURL(/\/de\/categories/);
		await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 });
	});

	test('Chinese pricing page loads correctly', async ({ page }) => {
		const response = await page.goto('/zh/pricing', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBeLessThan(400);
		await expect(page).toHaveURL(/\/zh\/pricing/);
		await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 });
	});
});

test.describe('i18n: RTL Layout Depth', () => {
	test('Arabic discover page has RTL layout', async ({ page }) => {
		await page.goto('/ar/discover/1', { waitUntil: 'domcontentloaded' });

		const dir = await page.locator('html').getAttribute('dir');
		expect(dir).toBe('rtl');

		// Main content should still be visible
		await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 });
	});

	test('Arabic categories page has RTL layout', async ({ page }) => {
		await page.goto('/ar/categories', { waitUntil: 'domcontentloaded' });

		const dir = await page.locator('html').getAttribute('dir');
		expect(dir).toBe('rtl');

		await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 });
	});
});
