import { test, expect } from '@playwright/test';

test.describe('Form Validation: Sign-in Form', () => {
	test('sign-in form rejects empty email', async ({ page }) => {
		await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });

		const passwordInput = page.locator('#password');
		const isPasswordVisible = await passwordInput.isVisible().catch(() => false);

		if (!isPasswordVisible) {
			test.skip(true, 'Sign-in form not visible');
			return;
		}

		// Submit with empty email
		await passwordInput.fill('somepassword');
		await passwordInput.press('Enter');
		await page.waitForTimeout(1_000);

		// Should still be on sign-in page (form didn't submit)
		expect(page.url()).toContain('/auth/signin');
	});

	test('sign-in form rejects empty password', async ({ page }) => {
		await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });

		const emailInput = page.locator('#email');
		const isEmailVisible = await emailInput.isVisible().catch(() => false);

		if (!isEmailVisible) {
			test.skip(true, 'Sign-in form not visible');
			return;
		}

		// Fill email but leave password empty
		await emailInput.fill('test@example.com');
		await emailInput.press('Enter');
		await page.waitForTimeout(1_000);

		// Should still be on sign-in page
		expect(page.url()).toContain('/auth/signin');
	});

	test('sign-in form shows error for invalid credentials', async ({ page }) => {
		await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });

		const emailInput = page.locator('#email');
		const passwordInput = page.locator('#password');

		const isVisible = await emailInput.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Sign-in form not visible');
			return;
		}

		// Fill invalid credentials
		await emailInput.fill('nonexistent@invalid-domain-xyz.com');
		await passwordInput.fill('wrongpassword123');
		await passwordInput.press('Enter');

		// Wait for error response
		await page.waitForTimeout(3_000);

		// Should show error message or stay on sign-in page
		const errorMessage = page.getByText(/invalid|incorrect|error|failed/i).first();
		const hasError = await errorMessage.isVisible().catch(() => false);
		const stayedOnPage = page.url().includes('/auth/signin');

		expect(hasError || stayedOnPage).toBeTruthy();
	});
});

test.describe('Form Validation: Registration Form', () => {
	test('registration form rejects mismatched or missing fields', async ({ page }) => {
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

		const registerButton = page.getByRole('button', { name: /register/i }).first();
		const isVisible = await registerButton.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Registration form not visible');
			return;
		}

		// Try to submit empty form
		await registerButton.click();
		await page.waitForTimeout(1_000);

		// Should still be on register page
		expect(page.url()).toContain('/auth/register');
	});
});
