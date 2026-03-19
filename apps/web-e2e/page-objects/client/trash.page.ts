import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the client submissions trash page.
 */
export class ClientTrashPage extends BasePage {
	readonly heading: Locator;
	readonly backLink: Locator;
	readonly trashItems: Locator;
	readonly emptyState: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.backLink = page.locator('a[href*="/client/submissions"]').first();
		this.trashItems = page.locator('button').filter({ hasText: /restore/i });
		this.emptyState = page.getByText(/trash.*empty|no.*deleted/i).first();
	}

	async navigate() {
		await this.goto('/client/submissions/trash');
	}

	/** Click the restore button on the first trashed item */
	async restoreFirst() {
		await this.trashItems.first().click();
	}
}
