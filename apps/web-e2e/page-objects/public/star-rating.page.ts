import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the star rating picker component.
 *
 * The item-detail page mounts multiple `<Rating>` widgets — the
 * read-only "average rating" display, the read-only display of each
 * existing comment, AND the interactive picker inside the new-comment
 * and edit-comment forms. We target the INTERACTIVE one (the first
 * radiogroup whose buttons aren't `disabled`) so click() doesn't no-op
 * against the readonly average.
 */
export class StarRating {
	readonly page: Page;
	readonly container: Locator;

	constructor(page: Page) {
		this.page = page;
		// Find the radiogroup that contains at least one non-disabled star.
		// `:has()` is supported by Playwright's locator engine.
		this.container = page
			.locator('[role="radiogroup"][aria-label="Rating"]:has(button:not([disabled]))')
			.first();
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
