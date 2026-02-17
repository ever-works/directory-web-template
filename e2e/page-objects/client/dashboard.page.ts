import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class ClientDashboardPage extends BasePage {
	readonly heading: Locator;
	readonly statsGrid: Locator;
	readonly welcomeText: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading', { name: /dashboard/i }).first();
		this.statsGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4').first();
		this.welcomeText = page.getByText(/welcome back/i).first();
	}

	async navigate() {
		await this.goto('/client/dashboard');
	}
}
