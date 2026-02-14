import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminItemsPage extends BasePage {
	readonly heading: Locator;
	readonly addItemButton: Locator;
	readonly searchBar: Locator;
	readonly itemsList: Locator;
	readonly pagination: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading', { level: 1 }).first();
		this.addItemButton = page.getByRole('button', { name: /add item|create item/i }).first();
		this.searchBar = page.getByRole('searchbox').first();
		this.itemsList = page.locator('.space-y-4').first();
		this.pagination = page.locator('nav[aria-label*="pagination"], nav[aria-label*="Pagination"]');
	}

	async navigate() {
		await this.goto('/admin/items');
	}
}
