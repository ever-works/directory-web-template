import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the theme toggle component in the header.
 */
export class ThemeToggle {
	readonly page: Page;
	readonly toggleButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.toggleButton = page.locator('button[aria-label*="Current theme"]').first();
	}

	/** Get the current theme from the toggle button's aria-label */
	async getCurrentTheme(): Promise<string> {
		const label = await this.toggleButton.getAttribute('aria-label');
		if (label?.includes('light')) return 'light';
		if (label?.includes('dark')) return 'dark';
		return 'unknown';
	}

	/** Open the theme dropdown */
	async open() {
		await this.toggleButton.click();
	}

	/** Select light theme from the dropdown */
	async selectLight() {
		await this.open();
		const lightButton = this.page.getByRole('button', { name: /light/i }).first();
		await lightButton.click();
	}

	/** Select dark theme from the dropdown */
	async selectDark() {
		await this.open();
		const darkButton = this.page.getByRole('button', { name: /dark/i }).first();
		await darkButton.click();
	}

	/** Check if the page has the dark class on <html> */
	async isDarkMode(): Promise<boolean> {
		const htmlClass = await this.page.locator('html').getAttribute('class');
		return htmlClass?.includes('dark') ?? false;
	}
}
