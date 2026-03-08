import { test, expect } from '../../fixtures';
import { LanguageSwitcher } from '../../page-objects/public/language-switcher.page';

test.describe('UI: Language Switcher', () => {
	test('language switcher button is visible in header', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const langSwitcher = new LanguageSwitcher(page);
		await expect(langSwitcher.button).toBeVisible({ timeout: 10_000 });
	});

	test('clicking language switcher opens dropdown', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const langSwitcher = new LanguageSwitcher(page);
		await expect(langSwitcher.button).toBeVisible({ timeout: 10_000 });

		await langSwitcher.open();

		const isOpen = await langSwitcher.isOpen();
		expect(isOpen).toBe(true);
	});

	test('selecting French navigates to /fr locale', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const langSwitcher = new LanguageSwitcher(page);
		await expect(langSwitcher.button).toBeVisible({ timeout: 10_000 });

		await langSwitcher.selectLanguage('Français');

		// URL should change to include /fr prefix
		await page.waitForURL(/\/fr/, { waitUntil: 'domcontentloaded', timeout: 15_000 });
		expect(page.url()).toContain('/fr');
	});

	test('selecting Spanish navigates to /es locale', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const langSwitcher = new LanguageSwitcher(page);
		await expect(langSwitcher.button).toBeVisible({ timeout: 10_000 });

		await langSwitcher.selectLanguage('Español');

		await page.waitForURL(/\/es/, { waitUntil: 'domcontentloaded', timeout: 15_000 });
		expect(page.url()).toContain('/es');
	});
});
