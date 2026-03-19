import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminSettingsPage extends BasePage {
	readonly heading: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
	}

	async navigate() {
		await this.goto('/admin/settings');
	}

	/** Open an accordion section by its value/label. */
	async openSection(sectionName: string) {
		const trigger = this.page.getByRole('button', { name: new RegExp(sectionName, 'i') }).first();
		await trigger.click();
	}

	/** Get all toggle switches on the page. */
	get switches() {
		return this.page.locator('[role="switch"]');
	}

	/** Get all select dropdowns on the page. */
	get selects() {
		return this.page.locator('select');
	}
}
