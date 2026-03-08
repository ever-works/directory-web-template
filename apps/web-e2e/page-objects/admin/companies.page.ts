import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminCompaniesPage extends BasePage {
	readonly heading: Locator;
	readonly addCompanyButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.addCompanyButton = page.getByRole('button', { name: /add company/i }).first();
	}

	async navigate() {
		await this.goto('/admin/companies');
	}

	/** Get the company form modal overlay. */
	get companyFormModal() {
		return this.page.locator('.fixed.inset-0.z-50').first();
	}

	/** Company form name input (by label text). */
	get companyNameInput() {
		return this.companyFormModal.locator('input').first();
	}

	/** Cancel button in company form. */
	get cancelButton() {
		return this.companyFormModal.getByRole('button', { name: /cancel/i });
	}

	/** Create company button. */
	get createCompanyButton() {
		return this.companyFormModal.getByRole('button', { name: /create company/i });
	}

	/** Update company button. */
	get updateCompanyButton() {
		return this.companyFormModal.getByRole('button', { name: /update company/i });
	}

	/** Get the delete confirmation modal. */
	get deleteConfirmModal() {
		return this.page.locator('.fixed.inset-0.z-50').filter({ hasText: /delete company/i });
	}

	/** Confirm delete button. */
	get confirmDeleteButton() {
		return this.deleteConfirmModal.getByRole('button', { name: /^delete$/i });
	}
}
