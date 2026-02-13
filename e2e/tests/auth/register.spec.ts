import { test, expect } from '@playwright/test';
import { TEST_DATA } from '../../helpers/test-data';

test.describe('Auth: Registration', () => {
	test('shows registration form with name, email, and password fields', async ({ page }) => {
		await page.goto('/auth/register');

		await expect(page.locator('#name')).toBeVisible();
		await expect(page.locator('#email')).toBeVisible();
		await expect(page.locator('#password')).toBeVisible();
		await expect(page.locator('button[type="submit"]')).toBeVisible();
	});

	test('can register a new user and redirect to dashboard', async ({ page }) => {
		await page.goto('/auth/register');

		const uniqueEmail = TEST_DATA.generateClientEmail();
		await page.locator('#name').fill('E2E Registration Test');
		await page.locator('#email').fill(uniqueEmail);
		await page.locator('#password').fill(TEST_DATA.CLIENT_PASSWORD);
		await page.locator('button[type="submit"]').click();

		await page.waitForURL(/\/client\/dashboard/, { timeout: 20_000 });
	});

	test('shows error when using existing email', async ({ page }) => {
		await page.goto('/auth/register');

		await page.locator('#name').fill('Duplicate User');
		await page.locator('#email').fill(TEST_DATA.ADMIN_EMAIL);
		await page.locator('#password').fill(TEST_DATA.CLIENT_PASSWORD);
		await page.locator('button[type="submit"]').click();

		await expect(page.locator('.bg-red-50').first()).toBeVisible({ timeout: 10_000 });
	});

	test('has link to sign in', async ({ page }) => {
		await page.goto('/auth/register');

		const signInLink = page.getByRole('link', { name: /sign in/i }).first();
		await expect(signInLink).toBeVisible();
	});
});
