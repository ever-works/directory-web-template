import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminCollectionsPage extends BasePage {
	readonly heading: Locator;
	readonly addCollectionButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.addCollectionButton = page.getByRole('button', { name: /add collection/i }).first();
	}

	async navigate() {
		await this.goto('/admin/collections');
	}

	/** Get a collection row by its name text. */
	getCollectionByName(name: string): Locator {
		return this.page.locator('div').filter({ hasText: new RegExp(name, 'i') }).first();
	}

	/** Click the edit button for a specific collection. */
	async editCollection(name: string) {
		const row = this.getCollectionByName(name);
		await row.getByRole('button', { name: /edit/i }).click();
	}

	/** Click the delete button for a specific collection. */
	async deleteCollection(name: string) {
		const row = this.getCollectionByName(name);
		await row.getByRole('button', { name: /delete/i }).click();
	}

	/** Get the collection form modal overlay. */
	get collectionFormModal() {
		return this.page.locator('.fixed.inset-0.z-50').first();
	}

	/** Collection form ID input (uses HeroUI Input — target by placeholder). */
	get collectionIdInput() {
		return this.collectionFormModal.getByPlaceholder(/frontend-frameworks/i);
	}

	/** Collection form name input. */
	get collectionNameInput() {
		return this.collectionFormModal.getByPlaceholder(/collection name/i);
	}

	/** Collection form icon input. */
	get collectionIconInput() {
		return this.collectionFormModal.getByPlaceholder('🤖');
	}

	/** Collection form description textarea. */
	get collectionDescriptionInput() {
		return this.collectionFormModal.getByPlaceholder(/short description/i);
	}

	/** Collection form active toggle. */
	get activeToggle() {
		return this.collectionFormModal.locator('[role="switch"]').first();
	}

	/** Cancel button in collection form. */
	get cancelButton() {
		return this.collectionFormModal.getByRole('button', { name: /cancel/i });
	}

	/** Create collection button. */
	get createButton() {
		return this.collectionFormModal.getByRole('button', { name: /create collection/i });
	}

	/** Save changes button (edit mode). */
	get saveButton() {
		return this.collectionFormModal.getByRole('button', { name: /save changes/i });
	}

	/** Fill the collection form. */
	async fillCollectionForm(data: { id?: string; name: string; description?: string }) {
		if (data.id) {
			await this.collectionIdInput.fill(data.id);
		}
		await this.collectionNameInput.fill(data.name);
		if (data.description) {
			await this.collectionDescriptionInput.fill(data.description);
		}
	}
}
