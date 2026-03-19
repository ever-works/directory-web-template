import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the star rating picker component.
 */
export class StarRating {
	readonly page: Page;
	readonly container: Locator;

	constructor(page: Page) {
		this.page = page;
		this.container = page.locator('[role="radiogroup"][aria-label="Rating"]').first();
	}

	/** Get a specific star button (1-5) */
	star(n: number): Locator {
		return this.container.locator(`button[aria-label*="${n} star"]`);
	}

	/** Rate by clicking the nth star */
	async rate(n: number) {
		await this.star(n).click();
	}

	/** Get the currently selected rating value */
	async getValue(): Promise<number> {
		for (let i = 5; i >= 1; i--) {
			const checked = await this.star(i).getAttribute('aria-checked');
			if (checked === 'true') return i;
		}
		return 0;
	}
}
