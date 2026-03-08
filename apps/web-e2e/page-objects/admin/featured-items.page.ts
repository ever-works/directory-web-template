import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminFeaturedItemsPage extends BasePage {
	readonly heading: Locator;
	readonly addButton: Locator;
	readonly searchInput: Locator;
	readonly activeOnlyToggle: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.addButton = page.getByRole('button', { name: /add featured item/i }).first();
		this.searchInput = page.getByRole('textbox').first();
		this.activeOnlyToggle = page.locator('#active-only');
	}

	async navigate() {
		await this.goto('/admin/featured-items');
	}

	/** Search featured items. */
	async search(term: string) {
		await this.searchInput.fill(term);
	}

	/** Clear search. */
	async clearSearch() {
		await this.searchInput.clear();
	}

	/** Get the featured item modal. */
	get featuredItemModal() {
		return this.page.locator('[role="dialog"]').first();
	}

	/** Get featured item count from stats. */
	get statsCards() {
		return this.page.locator('.grid').first();
	}
}
