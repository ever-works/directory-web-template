import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the public search bar on the listing/home page.
 */
export class SearchBar {
	readonly page: Page;
	readonly input: Locator;
	readonly clearButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.input = page.locator('input[placeholder*="Search" i]').first();
		this.clearButton = this.input.locator('..').locator('button').first();
	}

	/** Type a search term into the search input */
	async search(term: string) {
		await this.input.fill(term);
	}

	/** Clear the search input */
	async clear() {
		await this.input.clear();
	}

	/** Get current value of the search input */
	async getValue(): Promise<string> {
		return (await this.input.inputValue()) ?? '';
	}
}
