import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminDashboardPage extends BasePage {
	readonly mainContent: Locator;
	readonly tabList: Locator;
	readonly refreshButton: Locator;

	constructor(page: Page) {
		super(page);
		this.mainContent = page.locator('#main-content');
		this.tabList = page.getByRole('tablist');
		this.refreshButton = page.getByRole('button', { name: /refresh/i }).first();
	}

	async navigate() {
		await this.goto('/admin');
	}

	async selectTab(tabName: string) {
		await this.tabList.getByRole('tab', { name: new RegExp(tabName, 'i') }).click();
	}
}
