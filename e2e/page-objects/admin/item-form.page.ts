import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the admin multi-step item creation/edit form modal.
 */
export class AdminItemFormPage {
	readonly page: Page;
	readonly modal: Locator;
	readonly modalTitle: Locator;

	// Step 1: Basic Info
	readonly idInput: Locator;
	readonly nameInput: Locator;
	readonly slugInput: Locator;
	readonly descriptionInput: Locator;

	// Step 2: Media & Links
	readonly iconUrlInput: Locator;
	readonly sourceUrlInput: Locator;

	// Step 3: Classification
	readonly categoryInput: Locator;
	readonly tagInput: Locator;

	// Last Step: Review & Submit
	readonly statusSelect: Locator;
	readonly featuredSwitch: Locator;

	// Navigation
	readonly cancelButton: Locator;
	readonly previousButton: Locator;
	readonly nextButton: Locator;
	readonly createButton: Locator;
	readonly updateButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.modal = page.locator('[role="dialog"][aria-modal="true"]');
		this.modalTitle = this.modal.locator('h2');

		// Step 1: Basic Info
		this.idInput = this.modal.locator('#id');
		this.nameInput = this.modal.locator('#name');
		this.slugInput = this.modal.locator('#slug');
		this.descriptionInput = this.modal.locator('#description');

		// Step 2: Media & Links
		this.iconUrlInput = this.modal.locator('#icon_url');
		this.sourceUrlInput = this.modal.locator('#source_url');

		// Step 3: Classification — inputs have no id, use placeholder/position
		this.categoryInput = this.modal.locator('input[type="text"]').first();
		this.tagInput = this.modal.locator('input[type="text"]').nth(1);

		// Last Step: Review
		this.statusSelect = this.modal.locator('select');
		this.featuredSwitch = this.modal.locator('[role="switch"]');

		// Navigation buttons
		this.cancelButton = this.modal.getByRole('button', { name: /cancel/i });
		this.previousButton = this.modal.getByRole('button', { name: /previous/i });
		this.nextButton = this.modal.getByRole('button', { name: /next/i });
		this.createButton = this.modal.getByRole('button', { name: /create item/i });
		this.updateButton = this.modal.getByRole('button', { name: /update item/i });
	}

	async waitForOpen() {
		await this.modal.waitFor({ state: 'visible' });
	}

	async waitForClosed() {
		await this.modal.waitFor({ state: 'hidden' });
	}

	async fillBasicInfo(data: { id?: string; name: string; slug?: string; description: string }) {
		if (data.id) {
			await this.idInput.fill(data.id);
		}
		await this.nameInput.fill(data.name);
		if (data.slug) {
			await this.slugInput.fill(data.slug);
		}
		await this.descriptionInput.fill(data.description);
	}

	async fillMediaLinks(data: { sourceUrl: string; iconUrl?: string }) {
		await this.sourceUrlInput.fill(data.sourceUrl);
		if (data.iconUrl) {
			await this.iconUrlInput.fill(data.iconUrl);
		}
	}

	async addCategory(name: string) {
		await this.categoryInput.fill(name);
		await this.categoryInput.press('Enter');
	}

	async addTag(name: string) {
		await this.tagInput.fill(name);
		await this.tagInput.press('Enter');
	}

	async goToNextStep() {
		await this.nextButton.click();
	}

	async goToPreviousStep() {
		await this.previousButton.click();
	}

	async submitCreate() {
		await this.createButton.click();
	}

	async submitUpdate() {
		await this.updateButton.click();
	}

	async cancel() {
		await this.cancelButton.click();
	}
}
