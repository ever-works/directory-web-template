import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminReportsPage extends BasePage {
	readonly heading: Locator;
	readonly searchInput: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.searchInput = page.getByRole('searchbox').first();
	}

	async navigate() {
		await this.goto('/admin/reports');
	}

	/** Select a status tab. */
	async selectStatusTab(status: 'All' | 'Pending' | 'Reviewed' | 'Resolved' | 'Dismissed') {
		await this.page.getByRole('button', { name: new RegExp(`^${status}`, 'i') }).first().click();
	}

	/** Search reports. */
	async searchReports(term: string) {
		await this.searchInput.fill(term);
	}

	/** Get the review dialog. */
	get reviewDialog() {
		return this.page.locator('[role="dialog"]').first();
	}

	/** Get all review buttons. */
	get reviewButtons() {
		return this.page.getByRole('button', { name: /review/i });
	}

	/** Get report cards. */
	get reportCards() {
		return this.page.locator('.border-l-4');
	}
}
