import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the language switcher component in the header.
 */
export class LanguageSwitcher {
	readonly page: Page;
	readonly button: Locator;

	constructor(page: Page) {
		this.page = page;
		this.button = page.locator('button[aria-label="Select language"]').first();
	}

	/** Open the language dropdown */
	async open() {
		await this.button.click();
	}

	/** Select a locale by its full name (e.g. "Français", "Español") */
	async selectLanguage(fullName: string) {
		await this.open();
		const langButton = this.page.locator(`button[aria-label="Switch to ${fullName}"]`);
		await langButton.click();
	}

	/** Get the currently displayed locale code from the button text */
	async getCurrentLocaleCode(): Promise<string> {
		const text = await this.button.textContent();
		return text?.trim().toUpperCase() ?? '';
	}

	/** Check if the dropdown is expanded */
	async isOpen(): Promise<boolean> {
		const expanded = await this.button.getAttribute('aria-expanded');
		return expanded === 'true';
	}
}
