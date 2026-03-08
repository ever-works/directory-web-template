import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminClientsPage extends BasePage {
	readonly heading: Locator;
	readonly addClientButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.addClientButton = page.getByRole('button', { name: /add client/i }).first();
	}

	async navigate() {
		await this.goto('/admin/clients');
	}

	/** Get the client form modal overlay. */
	get clientFormModal() {
		return this.page.locator('.fixed.inset-0.z-50').first();
	}

	/** Get the delete confirmation modal. */
	get deleteConfirmModal() {
		return this.page.locator('.fixed.inset-0.z-50').filter({ hasText: /delete client/i });
	}

	/** Confirm delete button. */
	get confirmDeleteButton() {
		return this.deleteConfirmModal.getByRole('button', { name: /^delete$/i });
	}

	/** Cancel delete button. */
	get cancelDeleteButton() {
		return this.deleteConfirmModal.getByRole('button', { name: /cancel/i });
	}
}
