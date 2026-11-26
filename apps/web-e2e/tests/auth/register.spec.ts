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

		// A password no other part of the page or the response could contain by chance.
		const submittedPassword = `Taken-Email-${Date.now()}-Pw!`;
		await page.locator('#name').fill('Duplicate User');
		await page.locator('#email').fill(TEST_DATA.ADMIN_EMAIL);
		await page.locator('#password').fill(submittedPassword);

		// The register form posts to the signUp server action (a POST with a Next-Action header).
		const actionAnswer = page.waitForResponse(
			(response) => response.request().method() === 'POST' && !!response.request().headers()['next-action'],
			{ timeout: 60_000 }
		);
		await page.locator('#password').press('Enter');

		// A taken email says the account exists and how to get in (sign in or reset the password), not
		// the generic "An error occurred. Please try again.", which every retry would show again.
		expect(EMAIL_ALREADY_REGISTERED_MESSAGE, 'en.json has the taken-email message').toBeTruthy();
		const errorMessage = page.locator('[data-testid="auth-error"]');
		await expect(errorMessage).toHaveText(EMAIL_ALREADY_REGISTERED_MESSAGE, { timeout: 60_000 });
		await expect(errorMessage).not.toHaveText(GENERIC_ERROR_MESSAGE);

		// The action result goes to the browser and stays in the form's state, so it must not carry the
		// password back (T-2855): it used to echo every submitted field, password and captcha token too.
		const response = await actionAnswer;
		expect(
			response.request().postDataBuffer()?.toString('utf8') ?? '',
			'the checked request is the submission that carried the password'
		).toContain(submittedPassword);
		const responseBody = await response.text();
		expect(responseBody, 'the server action answered with the taken-email error').toContain(
			'EMAIL_ALREADY_REGISTERED'
		);
		expect(responseBody, 'the server action response sends the submitted password back').not.toContain(
			submittedPassword
		);

		// The form still fills the name and the email in again from the error result.
		await expect(page.locator('#name')).toHaveValue('Duplicate User');
		await expect(page.locator('#email')).toHaveValue(TEST_DATA.ADMIN_EMAIL);

		// The sign-in link stays under the form.
		await expect(page.locator('a[href*="/auth/signin"]').first()).toBeVisible();
	});

	test('has link to sign in', async ({ page }) => {
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

		const signInLink = page.locator('a[href*="/auth/signin"]').first();
		await expect(signInLink).toBeVisible();
	});
});
