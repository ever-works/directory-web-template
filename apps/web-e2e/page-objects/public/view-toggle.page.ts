import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the view toggle component (list/grid/masonry) on listing pages.
 */
export class ViewToggle {
	readonly page: Page;
	readonly listButton: Locator;
	readonly gridButton: Locator;
	readonly masonryButton: Locator;
	readonly mapButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.listButton = page.locator('button[aria-label*="list" i]').first();
		this.gridButton = page.locator('button[aria-label*="grid" i]').first();
		this.masonryButton = page.locator('button[aria-label*="masonry" i]').first();
		this.mapButton = page.locator('button[aria-label*="map" i]').first();
	}

	/** Switch to list view */
	async selectList() {
		await this.listButton.click();
	}

	/** Switch to grid view */
	async selectGrid() {
		await this.gridButton.click();
	}

	/** Switch to masonry view */
	async selectMasonry() {
		await this.masonryButton.click();
	}

	/** Check if a specific view button is the active one (has scale-105 / primary bg) */
	async isActive(button: Locator): Promise<boolean> {
		const classes = await button.getAttribute('class');
		return classes?.includes('scale-105') ?? false;
	}
}
