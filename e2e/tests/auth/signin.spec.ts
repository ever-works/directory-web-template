import { test, expect } from '@playwright/test';
import { SignInPage } from '../../page-objects/auth/signin.page';
import { TEST_DATA } from '../../helpers/test-data';

test.describe('Auth: Sign In', () => {
	test('shows sign-in form with email and password fields', async ({ page }) => {
		const signInPage = new SignInPage(page);
		await signInPage.navigate();

		await expect(signInPage.emailInput).toBeVisible();
		await expect(signInPage.passwordInput).toBeVisible();
		await expect(signInPage.submitButton).toBeVisible();
	});

	test('shows error for invalid credentials', async ({ page }) => {
		const signInPage = new SignInPage(page);
		await signInPage.navigate();

		await signInPage.signIn('nonexistent@test.local', 'WrongPassword123!');

		await expect(signInPage.errorAlert).toBeVisible({ timeout: 10_000 });
	});

	test('successful admin login redirects to admin or dashboard', async ({ page }) => {
		const signInPage = new SignInPage(page);
		await signInPage.navigate();

		await signInPage.signInAndWaitForRedirect(
			TEST_DATA.ADMIN_EMAIL,
			TEST_DATA.ADMIN_PASSWORD,
			/\/(admin|client\/dashboard)/
		);
	});

	test('has link to forgot password', async ({ page }) => {
		const signInPage = new SignInPage(page);
		await signInPage.navigate();

		await expect(signInPage.forgotPasswordLink).toBeVisible();
	});

	test('has link to create account', async ({ page }) => {
		const signInPage = new SignInPage(page);
		await signInPage.navigate();

		const createAccountLink = page.getByRole('link', { name: /create account/i }).first();
		await expect(createAccountLink).toBeVisible();
	});
});
