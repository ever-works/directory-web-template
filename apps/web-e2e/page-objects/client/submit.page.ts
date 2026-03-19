import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the client submit form (/submit).
 * 3-step form: Basic Info → Payment (plan selection) → Review & Submit
 */
export class ClientSubmitPage extends BasePage {
	readonly nameInput: Locator;
	readonly descriptionInput: Locator;
	readonly linkUrlInput: Locator;
	readonly categoriesButton: Locator;
	readonly nextStepButton: Locator;
	readonly previousButton: Locator;
	readonly submitButton: Locator;

	constructor(page: Page) {
		super(page);
		this.nameInput = page.locator('#name');
		this.descriptionInput = page.locator('#description');
		// The main link URL input has type="url" inside the LinkInput component
		this.linkUrlInput = page.locator('input[type="url"]').first();
		this.categoriesButton = page.locator('#categories');
		this.nextStepButton = page.getByRole('button', { name: /next step/i });
		this.previousButton = page.getByRole('button', { name: /previous/i });
		this.submitButton = page.getByRole('button', { name: /submit product/i });
	}

	async navigate() {
		await this.goto('/submit');
	}

	/** Fill the basic info step fields. */
	async fillBasicInfo(data: { name: string; url: string; description: string }) {
		await this.linkUrlInput.fill(data.url);
		await this.nameInput.fill(data.name);
		await this.descriptionInput.fill(data.description);
	}

	/** Select a category from the dropdown by clicking the combobox then the option. */
	async selectCategory(categoryName: string) {
		await this.categoriesButton.click();
		await this.page.getByRole('option', { name: categoryName }).first().click();
	}

	/** Select a tag by clicking the tag button. */
	async selectTag(tagName: string) {
		await this.page.getByRole('button', { name: tagName, exact: true }).click();
	}

	/** Select the free plan on the payment step. */
	async selectFreePlan() {
		await this.page.getByRole('button', { name: /get started free|select free/i }).first().click();
	}
}
