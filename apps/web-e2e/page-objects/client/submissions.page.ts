import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the client submissions management page (/client/submissions).
 */
export class ClientSubmissionsPage extends BasePage {
	readonly heading: Locator;
	readonly newSubmissionLink: Locator;
	readonly trashLink: Locator;
	readonly searchInput: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading', { level: 1 }).first();
		this.newSubmissionLink = page.getByRole('link', { name: /new submission/i });
		this.trashLink = page.getByRole('link', { name: /trash/i });
		this.searchInput = page.locator('input[type="text"][placeholder*="earch"]').first();
	}

	async navigate() {
		await this.goto('/client/submissions');
	}

	/** Click a status filter tab. */
	async selectStatusFilter(status: 'all' | 'pending' | 'approved' | 'rejected') {
		await this.page.getByRole('button', { name: new RegExp(`^${status}`, 'i') }).first().click();
	}

	/** Get a submission item by its title text. */
	getSubmissionByTitle(title: string): Locator {
		return this.page.locator('h3').filter({ hasText: title }).first().locator('..').locator('..');
	}

	/** Click the view (eye) button on a submission. */
	async viewSubmission(title: string) {
		const row = this.getSubmissionByTitle(title);
		await row.locator('button[title*="iew"]').click();
	}

	/** Click the edit (pencil) button on a submission. */
	async editSubmission(title: string) {
		const row = this.getSubmissionByTitle(title);
		await row.locator('button[title*="dit"]').click();
	}

	/** Click the delete (trash) button on a submission. */
	async deleteSubmission(title: string) {
		const row = this.getSubmissionByTitle(title);
		await row.locator('button[title*="elete"]').click();
	}

	/** Get the submission detail modal. */
	get detailModal() {
		return this.page.locator('[role="dialog"]').first();
	}

	/** Get the edit submission modal. */
	get editModal() {
		return this.page.locator('[role="dialog"]').filter({ has: this.page.locator('#name') });
	}

	/** Get the delete confirmation dialog. */
	get deleteDialog() {
		return this.page.locator('[role="dialog"]').filter({ hasText: /delete/i });
	}
}
