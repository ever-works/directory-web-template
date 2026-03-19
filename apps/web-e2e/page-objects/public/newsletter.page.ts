import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the newsletter signup form in the footer.
 */
export class Newsletter {
	readonly page: Page;
	readonly emailInput: Locator;
	readonly submitButton: Locator;
	readonly errorMessage: Locator;

	constructor(page: Page) {
		this.page = page;
		this.emailInput = page.locator('input[type="email"][name="email"]').first();
		this.submitButton = this.emailInput.locator('..').locator('button[type="submit"]');
		this.errorMessage = page.locator('p.text-red-600, p.text-red-400').first();
	}

	/** Fill the email and submit */
	async subscribe(email: string) {
		await this.emailInput.fill(email);
		await this.submitButton.click();
	}

	/** Check if the success toast appeared */
	async hasSuccessToast(): Promise<boolean> {
		const toast = this.page.locator('[data-sonner-toast]').first();
		return toast.isVisible().catch(() => false);
	}
}
