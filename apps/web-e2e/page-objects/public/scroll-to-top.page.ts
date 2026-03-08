import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the scroll-to-top button.
 */
export class ScrollToTop {
	readonly page: Page;
	readonly button: Locator;

	constructor(page: Page) {
		this.page = page;
		this.button = page.locator('button[aria-label="Scroll to top"]');
	}

	/** Scroll down to trigger the button to appear */
	async scrollDown(pixels = 500) {
		await this.page.evaluate((px) => window.scrollBy(0, px), pixels);
	}

	/** Click the scroll-to-top button */
	async click() {
		await this.button.click();
	}

	/** Get current scroll position */
	async getScrollY(): Promise<number> {
		return this.page.evaluate(() => window.scrollY);
	}
}
