import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminSurveysPage extends BasePage {
	readonly heading: Locator;
	readonly createSurveyButton: Locator;

	constructor(page: Page) {
		super(page);
		this.heading = page.locator('h1').first();
		this.createSurveyButton = page.getByRole('button', { name: /create survey/i }).first();
	}

	async navigate() {
		await this.goto('/admin/surveys');
	}

	/** Select a filter option: All, Global, or Items. */
	async selectFilter(filter: 'all' | 'global' | 'item') {
		const filterMap: Record<string, RegExp> = {
			all: /all surveys/i,
			global: /global/i,
			item: /items/i,
		};
		await this.page.getByRole('button', { name: filterMap[filter] }).first().click();
	}

	/** Get survey edit button by survey title attribute. */
	getEditButton(index: number) {
		return this.page.locator('button[title*="Edit"]').nth(index);
	}

	/** Get survey delete button by index. */
	getDeleteButton(index: number) {
		return this.page.locator('button[title*="Delete"]').nth(index);
	}
}
