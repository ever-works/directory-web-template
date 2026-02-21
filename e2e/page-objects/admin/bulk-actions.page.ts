import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for admin items bulk operations.
 */
export class AdminBulkActionsPage extends BasePage {
	readonly heading: Locator;
	readonly selectAllCheckbox: Locator;
	readonly bulkActionBar: Locator;
	readonly approveButton: Locator;
	readonly rejectButton: Locator;
	readonly deleteButton: Locator;
	readonly clearSelectionButton: Locator;
	readonly confirmDialog: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.selectAllCheckbox = page.locator('[aria-label*="Select all" i], [aria-label*="SELECT_ALL" i]').first();
		this.bulkActionBar = page.locator('[role="toolbar"]').first();
		this.approveButton = page.getByRole('button', { name: /approve/i }).first();
		this.rejectButton = page.getByRole('button', { name: /reject/i }).first();
		this.deleteButton = page.getByRole('button', { name: /delete/i }).first();
		this.clearSelectionButton = page.getByRole('button', { name: /deselect|clear/i }).first();
		this.confirmDialog = page.locator('[role="dialog"][aria-modal="true"]').first();
	}

	async navigate() {
		await this.goto('/admin/items');
	}

	/** Get all individual item checkboxes */
	get itemCheckboxes(): Locator {
		return this.page.locator('[aria-label*="Select" i]').filter({ hasNotText: /all/i });
	}
}
