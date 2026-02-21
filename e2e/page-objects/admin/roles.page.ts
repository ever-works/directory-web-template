import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminRolesPage extends BasePage {
	readonly heading: Locator;
	readonly addRoleButton: Locator;
	readonly searchInput: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.addRoleButton = page.getByRole('button', { name: /add role/i }).first();
		this.searchInput = page.locator('input[type="text"]').first();
	}

	async navigate() {
		await this.goto('/admin/roles');
	}

	/** Search roles. */
	async searchRoles(term: string) {
		await this.searchInput.fill(term);
	}

	/** Select a status filter option. */
	async selectStatusFilter(status: string) {
		const select = this.page.locator('select').first();
		await select.selectOption(status.toLowerCase());
	}

	/** Select a role type filter option. */
	async selectTypeFilter(type: string) {
		const select = this.page.locator('select').nth(1);
		await select.selectOption(type.toLowerCase());
	}

	/** Get the role form modal overlay. */
	get roleFormModal() {
		return this.page.locator('.fixed.inset-0.z-50').first();
	}

	/** Get the delete role dialog. */
	get deleteRoleDialog() {
		return this.page.locator('.fixed.inset-0.z-50').filter({ hasText: /delete/i });
	}

	/** Get the permissions modal. */
	get permissionsModal() {
		return this.page.locator('.fixed.inset-0.z-50').filter({ hasText: /permission/i });
	}
}
