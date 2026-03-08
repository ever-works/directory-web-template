import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the profile dropdown menu in the header.
 */
export class ProfileDropdown {
	readonly page: Page;
	readonly triggerButton: Locator;
	readonly menu: Locator;
	readonly menuItems: Locator;
	readonly logoutButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.triggerButton = page.locator('#user-menu-button');
		this.menu = page.locator('#profile-menu');
		this.menuItems = this.menu.locator('[role="menuitem"]');
		this.logoutButton = this.menu.locator('[role="menuitem"]').last();
	}

	async open() {
		await this.triggerButton.click();
	}

	async isOpen(): Promise<boolean> {
		const expanded = await this.triggerButton.getAttribute('aria-expanded');
		return expanded === 'true';
	}

	async clickMenuItem(name: RegExp) {
		const item = this.menuItems.filter({ hasText: name }).first();
		await item.click();
	}

	async logout() {
		await this.logoutButton.click();
	}
}
