import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class DiscoverPage extends BasePage {
	readonly itemLinks: Locator;
	readonly pagination: Locator;
	readonly heading: Locator;

	constructor(page: Page) {
		super(page);
		this.itemLinks = page.locator('a[href*="/items/"]');
		this.pagination = page.locator('nav[aria-label*="pagination"], nav[aria-label*="Pagination"]');
		this.heading = page.getByRole('heading', { level: 1 });
	}

	async navigate(pageNum = 1) {
		await this.goto(`/discover/${pageNum}`);
	}

	async getItemCount(): Promise<number> {
		return this.itemLinks.count();
	}

	async clickFirstItem() {
		await this.itemLinks.first().click();
	}
}
