import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class SignInPage extends BasePage {
	readonly emailInput: Locator;
	readonly passwordInput: Locator;
	readonly submitButton: Locator;
	readonly forgotPasswordLink: Locator;
	readonly errorAlert: Locator;
	readonly successAlert: Locator;

	constructor(page: Page) {
		super(page);
		this.emailInput = page.locator('#email');
		this.passwordInput = page.locator('#password');
		this.submitButton = page.locator('button[type="submit"]');
		this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
		this.errorAlert = page.locator('.bg-red-50').first();
		this.successAlert = page.locator('.bg-green-50').first();
	}

	async navigate() {
		await this.goto('/auth/signin');
	}

	async signIn(email: string, password: string) {
		await this.emailInput.fill(email);
		await this.passwordInput.fill(password);
		await this.submitButton.click();
	}

	async signInAndWaitForRedirect(email: string, password: string, expectedUrl: string | RegExp) {
		await this.signIn(email, password);
		await this.page.waitForURL(expectedUrl, { timeout: 60_000 });
	}
}
