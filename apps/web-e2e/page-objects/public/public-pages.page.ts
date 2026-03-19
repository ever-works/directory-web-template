import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for public content pages (collections, categories, tags, cookies, pricing).
 */
export class PublicPagesPage extends BasePage {
	readonly heading: Locator;
	readonly mainContent: Locator;
	readonly breadcrumb: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.mainContent = page.locator('main').first();
		this.breadcrumb = page.locator('nav[aria-label*="breadcrumb" i], nav ol').first();
	}

	async navigateToCollections() {
		await this.goto('/collections');
	}

	async navigateToCategories() {
		await this.goto('/categories');
	}

	async navigateToTags() {
		await this.goto('/tags');
	}

	async navigateToCookies() {
		await this.goto('/cookies');
	}

	async navigateToPricing() {
		await this.goto('/pricing');
	}

	async navigateToSponsor() {
		await this.goto('/sponsor');
	}
}

/**
 * Page object for error pages (404, unauthorized).
 */
export class ErrorPage extends BasePage {
	readonly heading: Locator;
	readonly errorCode: Locator;
	readonly goHomeButton: Locator;
	readonly goBackButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.getByRole('heading').first();
		this.errorCode = page.getByText(/404|403/);
		this.goHomeButton = page.getByRole('link', { name: /home/i }).first();
		this.goBackButton = page.getByRole('button', { name: /go back/i }).first();
	}
}
