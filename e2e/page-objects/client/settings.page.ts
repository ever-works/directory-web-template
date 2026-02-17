import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class ClientSettingsPage extends BasePage {
	readonly heading: Locator;
	readonly settingsGrid: Locator;
	readonly basicInfoLink: Locator;
	readonly securityLink: Locator;
	readonly billingLink: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading', { level: 1 }).first();
		this.settingsGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-2').first();
		this.basicInfoLink = page.getByRole('link', { name: /basic info/i }).first();
		this.securityLink = page.getByRole('link', { name: /security/i }).first();
		this.billingLink = page.getByRole('link', { name: /billing/i }).first();
	}

	async navigate() {
		await this.goto('/client/settings');
	}
}
