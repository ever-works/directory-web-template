import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminCommentsPage extends BasePage {
	readonly heading: Locator;
	readonly searchInput: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.searchInput = page.getByRole('searchbox').first();
	}

	async navigate() {
		await this.goto('/admin/comments');
	}

	/** Search comments. */
	async searchComments(term: string) {
		await this.searchInput.fill(term);
	}

	/** Clear search. */
	async clearSearch() {
		await this.searchInput.clear();
	}

	/** Get the delete comment dialog. */
	get deleteCommentDialog() {
		return this.page.locator('[role="dialog"]').filter({ hasText: /delete/i });
	}

	/** Get all delete buttons for comments. */
	get deleteButtons() {
		return this.page.locator('button[color="danger"], button.text-red-600');
	}
}
