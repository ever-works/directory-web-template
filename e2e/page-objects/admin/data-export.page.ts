import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the admin data export component.
 */
export class AdminDataExportPage extends BasePage {
	readonly heading: Locator;
	readonly csvButton: Locator;
	readonly jsonButton: Locator;
	readonly includeMetadataCheckbox: Locator;
	readonly exportButtons: Locator;
	readonly progressBar: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.csvButton = page.getByRole('button', { name: /^CSV$/i }).first();
		this.jsonButton = page.getByRole('button', { name: /^JSON$/i }).first();
		this.includeMetadataCheckbox = page.locator('#include-metadata');
		this.exportButtons = page.getByRole('button', { name: /export|download/i });
		this.progressBar = page.locator('[role="progressbar"], .bg-blue-600.rounded-full').first();
	}

	async navigate() {
		await this.goto('/admin');
	}
}
