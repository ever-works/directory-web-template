import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminItemsPage extends BasePage {
	readonly heading: Locator;
	readonly addItemButton: Locator;
	readonly searchBar: Locator;
	readonly itemsList: Locator;
	readonly pagination: Locator;
	readonly selectAllCheckbox: Locator;
	readonly bulkActionBar: Locator;
	readonly bulkApproveButton: Locator;
	readonly bulkRejectButton: Locator;
	readonly bulkDeleteButton: Locator;
	readonly bulkDeselectButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.addItemButton = page.getByRole('button', { name: /add item|create item/i }).first();
		// AdminSearchBar renders <input type="text"> (no role=searchbox).
		// Match by placeholder text the component uses, with a fallback
		// to the generic text input inside the filter toolbar.
		this.searchBar = page
			.getByRole('searchbox')
			.or(page.locator('input[type="search"]'))
			.or(page.locator('input[placeholder*="search" i]'))
			.first();
		this.itemsList = page.locator('.space-y-4').first();
		this.pagination = page.locator('nav[aria-label*="pagination"], nav[aria-label*="Pagination"]');
		this.selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i });
		this.bulkActionBar = page.locator('[role="toolbar"][aria-label*="ulk"]');
		this.bulkApproveButton = this.bulkActionBar.getByRole('button', { name: /^approve$/i });
		this.bulkRejectButton = this.bulkActionBar.getByRole('button', { name: /^reject$/i });
		this.bulkDeleteButton = this.bulkActionBar.getByRole('button', { name: /^delete$/i });
		this.bulkDeselectButton = this.bulkActionBar.getByRole('button', { name: /deselect/i });
	}

	async navigate() {
		await this.goto('/admin/items');
	}

	/** Click a status tab to filter items. Pass empty string for "All". */
	async selectStatusTab(status: 'All' | 'Approved' | 'Pending' | 'Draft' | 'Rejected') {
		await this.page.getByRole('tab', { name: new RegExp(`^${status}`, 'i') }).click();
	}

	/** Search items using the search bar. */
	async searchItems(term: string) {
		await this.searchBar.fill(term);
	}

	/** Clear the search bar. */
	async clearSearch() {
		await this.searchBar.clear();
	}

	/** Get an item row by its name text — scoped to the row container
	 *  (`div.group`) so we don't accidentally match the footer when an
	 *  item name coincidentally appears outside the list. */
	getItemByName(name: string): Locator {
		return this.page
			.locator('div.group')
			.filter({ has: this.page.locator('h4').filter({ hasText: name }) })
			.first();
	}

	/** Open the actions menu (three-dot) for a specific item by name. */
	async openActionsMenu(itemName: string) {
		const itemRow = this.getItemByName(itemName);
		// Hover first — some themes hide the menu trigger until row
		// hover. The actions button has aria-label sourced from i18n
		// key ACTIONS (English: "Actions"). If the role match fails
		// (icon-only theme), fall back to the rightmost icon button.
		await itemRow.hover().catch(() => {});
		const byRole = itemRow.getByRole('button', { name: /actions/i }).first();
		const hasByRole = await byRole.isVisible({ timeout: 2_000 }).catch(() => false);
		if (hasByRole) {
			await byRole.click();
			return;
		}
		const iconButton = itemRow
			.locator('button')
			.filter({ has: this.page.locator('svg') })
			.last();
		await iconButton.click();
	}

	/** Click an action from an open dropdown menu. */
	async clickAction(actionName: string) {
		await this.page.getByRole('menuitem', { name: new RegExp(actionName, 'i') }).click();
	}

	/** Select an item's checkbox by name. */
	async selectItem(itemName: string) {
		const checkbox = this.page.getByRole('checkbox', { name: new RegExp(`select ${itemName}`, 'i') });
		await checkbox.click();
	}

	/** Get the reject modal. */
	get rejectModal() {
		return this.page.locator('[role="dialog"][aria-modal="true"]').filter({ hasText: /reject item/i });
	}

	/** Get the rejection reason textarea. */
	get rejectionReasonInput() {
		return this.rejectModal.locator('#rejectionReason');
	}

	/** Get the bulk confirm dialog. */
	get bulkConfirmDialog() {
		return this.page.locator('[role="dialog"][aria-modal="true"]').filter({ hasText: /approve items|reject items|delete items/i });
	}
}
