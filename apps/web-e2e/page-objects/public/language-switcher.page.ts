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

	/** Open the language dropdown and wait for it to actually expand.
	 *  React only attaches the onClick handler at hydrate time — there's
	 *  no way for Playwright to *test* "the handler is attached," so on a
	 *  cold-start server the first click can land on un-hydrated HTML
	 *  and silently no-op. We retry the click until `aria-expanded` flips
	 *  to "true" (the visible side-effect React would produce), giving up
	 *  after a generous timeout. */
	async open() {
		await expect(this.button).toBeVisible({ timeout: 15_000 });
		await expect(this.button).toBeEnabled({ timeout: 15_000 });

		const deadline = Date.now() + 20_000;
		let lastErr: unknown;
		while (Date.now() < deadline) {
			try {
				await this.button.click();
				// Quick check — if hydration already attached the handler,
				// the dropdown opens within a frame.
				await expect(this.button).toHaveAttribute('aria-expanded', 'true', { timeout: 1_500 });
				return;
			} catch (err) {
				lastErr = err;
				// Click again — most likely the prior click was a no-op
				// because React hadn't attached the handler yet.
				await this.page.waitForTimeout(250);
			}
		}
		throw lastErr ?? new Error('Language switcher never opened (aria-expanded never became "true")');
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
