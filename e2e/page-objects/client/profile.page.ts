import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the client profile/settings pages.
 */
export class ClientProfilePage extends BasePage {
	readonly heading: Locator;
	readonly settingsCards: Locator;

	// Basic Info form fields
	readonly displayNameInput: Locator;
	readonly usernameInput: Locator;
	readonly bioInput: Locator;
	readonly locationInput: Locator;
	readonly companyInput: Locator;
	readonly jobTitleInput: Locator;
	readonly websiteInput: Locator;
	readonly saveButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.settingsCards = page.locator('.grid').first();

		// Basic Info form
		this.displayNameInput = page.locator('#displayName');
		this.usernameInput = page.locator('#username');
		this.bioInput = page.locator('#bio');
		this.locationInput = page.locator('#location');
		this.companyInput = page.locator('#company');
		this.jobTitleInput = page.locator('#jobTitle');
		this.websiteInput = page.locator('#website');
		this.saveButton = page.getByRole('button', { name: /save/i }).first();
	}

	async navigateToSettings() {
		await this.goto('/client/settings');
	}

	async navigateToBasicInfo() {
		await this.goto('/client/settings/profile/basic-info');
	}
}
