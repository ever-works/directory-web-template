import { test, expect } from '../../fixtures';
import { ThemeToggle } from '../../page-objects/public/theme-toggle.page';

test.describe('UI: Theme Toggle', () => {
	test('theme toggle button is visible in header', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const themeToggle = new ThemeToggle(page);
		await expect(themeToggle.toggleButton).toBeVisible({ timeout: 10_000 });
	});

	test('clicking theme toggle opens dropdown', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const themeToggle = new ThemeToggle(page);
		await expect(themeToggle.toggleButton).toBeVisible({ timeout: 10_000 });

		await themeToggle.open();

		// The dropdown should show light and dark options
		const expanded = await themeToggle.toggleButton.getAttribute('aria-expanded');
		expect(expanded).toBe('true');
	});

	test('switching to dark mode applies dark class to html', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const themeToggle = new ThemeToggle(page);
		await expect(themeToggle.toggleButton).toBeVisible({ timeout: 10_000 });

		// Switch to dark mode
		await themeToggle.selectDark();
		await page.waitForTimeout(500);

		// Verify dark class is on <html>
		const isDark = await themeToggle.isDarkMode();
		expect(isDark).toBe(true);
	});

	test('switching to light mode removes dark class from html', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const themeToggle = new ThemeToggle(page);
		await expect(themeToggle.toggleButton).toBeVisible({ timeout: 10_000 });

		// Ensure dark mode first
		await themeToggle.selectDark();
		await page.waitForTimeout(500);
		expect(await themeToggle.isDarkMode()).toBe(true);

		// Switch back to light
		await themeToggle.selectLight();
		await page.waitForTimeout(500);

		const isDark = await themeToggle.isDarkMode();
		expect(isDark).toBe(false);
	});
});
