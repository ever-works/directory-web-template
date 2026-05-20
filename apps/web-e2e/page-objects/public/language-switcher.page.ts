import { expect } from '@playwright/test';
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

	/** Open the language dropdown and wait for it to actually expand. */
	async open() {
		// Make sure the button is hydrated & clickable before pressing it.
		// On a cold-start server the header can render its HTML before React
		// has attached the onClick handler — clicking too early is a no-op
		// and the dropdown never opens, blowing the 30s click timeout on the
		// dropdown item.
		await expect(this.button).toBeVisible({ timeout: 15_000 });
		await expect(this.button).toBeEnabled({ timeout: 15_000 });
		await this.button.click();
		// Wait for the dropdown to actually open before resolving.
		await expect(this.button).toHaveAttribute('aria-expanded', 'true', { timeout: 5_000 });
	}

	/** Select a locale by its full name (e.g. "Français", "Español") */
	async selectLanguage(fullName: string) {
		await this.open();
		const langButton = this.page.locator(`button[aria-label="Switch to ${fullName}"]`);
		await expect(langButton).toBeVisible({ timeout: 5_000 });
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
