import type { Page, Locator } from '@playwright/test';

export class BasePage {
	readonly page: Page;
	readonly header: Locator;
	readonly footer: Locator;
	readonly navLinks: Locator;

	constructor(page: Page) {
		this.page = page;
		this.header = page.locator('header').first();
		this.footer = page.locator('footer').first();
		this.navLinks = this.header.getByRole('link');
	}

	async goto(path: string) {
		await this.page.goto(path);
	}

	async gotoLocalized(path: string, locale: string) {
		const prefix = locale === 'en' ? '' : `/${locale}`;
		await this.page.goto(`${prefix}${path}`);
	}

	async waitForPageReady() {
		await this.page.waitForLoadState('networkidle');
	}

	async getTitle(): Promise<string> {
		return this.page.title();
	}
}
