import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminTagsPage extends BasePage {
	readonly heading: Locator;
	readonly addTagButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.addTagButton = page.getByRole('button', { name: /add tag/i }).first();
	}

	async navigate() {
		await this.goto('/admin/tags');
	}

	/** Get a tag row by its name text. */
	getTagByName(name: string): Locator {
		return this.page.locator('div').filter({ hasText: new RegExp(`^${name}`) }).first();
	}

	/** Click the edit button for a specific tag. */
	async editTag(name: string) {
		const tagRow = this.getTagByName(name);
		await tagRow.getByRole('button', { name: /edit/i }).click();
	}

	/** Click the delete button for a specific tag. */
	async deleteTag(name: string) {
		const tagRow = this.getTagByName(name);
		await tagRow.getByRole('button', { name: /delete/i }).click();
	}

	/** Get the tag form modal overlay. */
	get tagFormModal() {
		return this.page.locator('.fixed.inset-0.z-50').first();
	}

	/** Tag form ID input. */
	get tagIdInput() {
		return this.page.locator('#tag-id');
	}

	/** Tag form name input. */
	get tagNameInput() {
		return this.page.locator('#tag-name');
	}

	/** Tag form status toggle. */
	get statusToggle() {
		return this.tagFormModal.locator('[role="switch"]').first();
	}

	/** Cancel button in tag form. */
	get cancelButton() {
		return this.tagFormModal.getByRole('button', { name: /cancel/i });
	}

	/** Create tag button in form. */
	get createTagButton() {
		return this.tagFormModal.getByRole('button', { name: /create tag/i });
	}

	/** Update tag button in form. */
	get updateTagButton() {
		return this.tagFormModal.getByRole('button', { name: /update tag/i });
	}

	/** Fill the tag form with data. */
	async fillTagForm(data: { id?: string; name: string }) {
		if (data.id) {
			await this.tagIdInput.fill(data.id);
		}
		await this.tagNameInput.fill(data.name);
	}
}
