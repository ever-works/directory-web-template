import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminSponsorshipsPage extends BasePage {
	readonly heading: Locator;
	readonly searchInput: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.searchInput = page.getByRole('searchbox').first();
	}

	async navigate() {
		await this.goto('/admin/sponsorships');
	}

	/** Search sponsorships. */
	async searchSponsorships(term: string) {
		await this.searchInput.fill(term);
	}

	/** Get the reject modal. */
	get rejectModal() {
		return this.page.locator('[role="dialog"][aria-modal="true"]').first();
	}

	/** Rejection reason textarea. */
	get rejectionReasonInput() {
		return this.page.locator('#rejectionReason');
	}

	/** Get the force approve modal (HeroUI Modal). */
	get forceApproveModal() {
		return this.page.locator('[role="dialog"]').filter({ hasText: /force approve/i });
	}
}
