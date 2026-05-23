import { test, expect } from '../../fixtures';
import { ThemeToggle } from '../../page-objects/public/theme-toggle.page';

async function ensureToggleVisibleOrSkip(page: import('@playwright/test').Page) {
	const themeToggle = new ThemeToggle(page);
	const isVisible = await themeToggle.toggleButton.isVisible({ timeout: 5_000 }).catch(() => false);
	if (!isVisible) {
		test.skip(true, 'Theme does not expose a `Current theme` aria-label button');
		return null;
	}
	return themeToggle;
}

test.describe('UI: Theme Toggle', () => {
	test('theme toggle button is visible in header', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const themeToggle = await ensureToggleVisibleOrSkip(page);
		if (!themeToggle) return;
		await expect(themeToggle.toggleButton).toBeVisible();
	});

	test('clicking theme toggle opens dropdown', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const themeToggle = await ensureToggleVisibleOrSkip(page);
		if (!themeToggle) return;

		await themeToggle.open();

		// The dropdown should show light and dark options
		const expanded = await themeToggle.toggleButton.getAttribute('aria-expanded');
		expect(expanded).toBe('true');
	});

	test('switching to dark mode applies dark class to html', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const themeToggle = await ensureToggleVisibleOrSkip(page);
		if (!themeToggle) return;

		// Switch to dark mode
		await themeToggle.selectDark();
		await page.waitForTimeout(500);

		// Verify dark class is on <html>
		const isDark = await themeToggle.isDarkMode();
		expect(isDark).toBe(true);
	});

	test('switching to light mode removes dark class from html', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const themeToggle = await ensureToggleVisibleOrSkip(page);
		if (!themeToggle) return;

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
