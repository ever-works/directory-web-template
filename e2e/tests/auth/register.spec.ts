import { test, expect } from '@playwright/test';
import { TEST_DATA } from '../../helpers/test-data';

test.describe('Auth: Registration', () => {
	test('shows registration form with name, email, and password fields', async ({ page }) => {
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

		await expect(page.locator('#name')).toBeVisible();
		await expect(page.locator('#email')).toBeVisible();
		await expect(page.locator('#password')).toBeVisible();
		await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
	});

	test('can register a new user and redirect to dashboard', async ({ page }) => {
		test.setTimeout(60_000);
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

		const uniqueEmail = TEST_DATA.generateClientEmail();
		await page.locator('#name').fill('E2E Registration Test');
		await page.locator('#email').fill(uniqueEmail);
		await page.locator('#password').fill(TEST_DATA.CLIENT_PASSWORD);
		await page.locator('#password').press('Enter');

		await page.waitForURL(/\/client\/dashboard/, { timeout: 60_000, waitUntil: 'domcontentloaded' });
	});

	test('shows error when using existing email', async ({ page }) => {
		test.setTimeout(60_000);
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

		await page.locator('#name').fill('Duplicate User');
		await page.locator('#email').fill(TEST_DATA.ADMIN_EMAIL);
		await page.locator('#password').fill(TEST_DATA.CLIENT_PASSWORD);
		await page.locator('#password').press('Enter');

		await expect(page.locator('.bg-red-50').first()).toBeVisible();
	});

	test('has link to sign in', async ({ page }) => {
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

		const signInLink = page.locator('a[href*="/auth/signin"]').first();
		await expect(signInLink).toBeVisible();
	});
});
