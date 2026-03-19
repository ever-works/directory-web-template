import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the sort dropdown on listing pages.
 */
export class SortMenu {
	readonly page: Page;
	readonly trigger: Locator;
	readonly menuContent: Locator;

	constructor(page: Page) {
		this.page = page;
		this.trigger = page.locator('button[aria-haspopup="menu"]').first();
		this.menuContent = page.locator('[role="menu"]').first();
	}

	async open() {
		await this.trigger.click();
	}

	/** Select a sort option by its visible text */
	async selectOption(text: RegExp) {
		await this.open();
		const option = this.page.locator('[role="menuitemradio"], [role="menuitem"]').filter({ hasText: text }).first();
		await option.click();
	}

	/** Get the current sort label shown in the trigger button */
	async getCurrentLabel(): Promise<string> {
		const text = await this.trigger.textContent();
		return text?.trim() ?? '';
	}
}
