import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { TEST_DATA } from '../../helpers/test-data';

// Copy read from the app's English messages, so a wording change does not break the test.
const credentialsFormMessages = (
	JSON.parse(readFileSync(path.resolve(__dirname, '../../../web/messages/en.json'), 'utf8')) as {
		admin: { CREDENTIALS_FORM: Record<string, string> };
	}
).admin.CREDENTIALS_FORM;
const EMAIL_ALREADY_REGISTERED_MESSAGE = credentialsFormMessages.EMAIL_ALREADY_REGISTERED;
const GENERIC_ERROR_MESSAGE = credentialsFormMessages.GENERIC_ERROR_MESSAGE;

test.describe('Auth: Registration', () => {
	test('shows registration form with name, email, and password fields', async ({ page }) => {
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

		await expect(page.locator('#name')).toBeVisible();
		await expect(page.locator('#email')).toBeVisible();
		await expect(page.locator('#password')).toBeVisible();
		await expect(page.getByRole('button', { name: /register/i })).toBeVisible();
	});

	test('can register a new user and redirect to dashboard', async ({ page }) => {
		test.setTimeout(120_000);
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

		const uniqueEmail = TEST_DATA.generateClientEmail();
		await page.locator('#name').fill('E2E Registration Test');
		await page.locator('#email').fill(uniqueEmail);
		await page.locator('#password').fill(TEST_DATA.CLIENT_PASSWORD);
		await page.locator('#password').press('Enter');

		await page.waitForURL(/\/client\/dashboard/, { timeout: 120_000, waitUntil: 'domcontentloaded' });
	});

	test('shows error when using existing email', async ({ page }) => {
		test.setTimeout(60_000);
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

		await page.locator('#name').fill('Duplicate User');
		await page.locator('#email').fill(TEST_DATA.ADMIN_EMAIL);
		await page.locator('#password').fill(TEST_DATA.CLIENT_PASSWORD);
		await page.locator('#password').press('Enter');

		// A taken email says the account exists and how to get in (sign in or reset the password), not
		// the generic "An error occurred. Please try again.", which every retry would show again.
		expect(EMAIL_ALREADY_REGISTERED_MESSAGE, 'en.json has the taken-email message').toBeTruthy();
		const errorMessage = page.locator('[data-testid="auth-error"]');
		await expect(errorMessage).toHaveText(EMAIL_ALREADY_REGISTERED_MESSAGE, { timeout: 60_000 });
		await expect(errorMessage).not.toHaveText(GENERIC_ERROR_MESSAGE);

		// The sign-in link stays under the form.
		await expect(page.locator('a[href*="/auth/signin"]').first()).toBeVisible();
	});

	test('has link to sign in', async ({ page }) => {
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

		const signInLink = page.locator('a[href*="/auth/signin"]').first();
		await expect(signInLink).toBeVisible();
	});
});
