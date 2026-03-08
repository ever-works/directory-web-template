import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the share button dropdown on item detail pages.
 */
export class ShareButton {
	readonly page: Page;
	readonly trigger: Locator;
	readonly copyLinkItem: Locator;
	readonly twitterItem: Locator;
	readonly facebookItem: Locator;
	readonly linkedinItem: Locator;

	constructor(page: Page) {
		this.page = page;
		this.trigger = page.locator('button').filter({ hasText: /share/i }).first();
		this.copyLinkItem = page.locator('[role="menuitem"]').filter({ hasText: /copy link/i }).first();
		this.twitterItem = page.locator('[role="menuitem"]').filter({ hasText: /twitter|x \(/i }).first();
		this.facebookItem = page.locator('[role="menuitem"]').filter({ hasText: /facebook/i }).first();
		this.linkedinItem = page.locator('[role="menuitem"]').filter({ hasText: /linkedin/i }).first();
	}

	async open() {
		await this.trigger.click();
	}

	async copyLink() {
		await this.open();
		await this.copyLinkItem.click();
	}
}
