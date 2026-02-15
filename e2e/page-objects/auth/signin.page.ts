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
		const authForm = page.locator('form').filter({ has: page.locator('#email') });
		this.emailInput = authForm.locator('#email');
		this.passwordInput = authForm.locator('#password');
		this.submitButton = page.getByRole('button', { name: /sign in/i });
		this.forgotPasswordLink = authForm.locator('a[href*="forgot-password"]');
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
