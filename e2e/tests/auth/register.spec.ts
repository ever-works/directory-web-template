import { test, expect } from '@playwright/test';
import { TEST_DATA } from '../../helpers/test-data';

test.describe('Auth: Registration', () => {
	test('shows registration form with name, email, and password fields', async ({ page }) => {
		await page.goto('/auth/register');

		const form = page.locator('form').filter({ has: page.locator('#email') });
		await expect(form.locator('#name')).toBeVisible();
		await expect(form.locator('#email')).toBeVisible();
		await expect(form.locator('#password')).toBeVisible();
		await expect(form.locator('button[type="submit"]')).toBeVisible();
	});

	test('can register a new user and redirect to dashboard', async ({ page }) => {
		await page.goto('/auth/register');

		const form = page.locator('form').filter({ has: page.locator('#email') });
		const uniqueEmail = TEST_DATA.generateClientEmail();
		await form.locator('#name').fill('E2E Registration Test');
		await form.locator('#email').fill(uniqueEmail);
		await form.locator('#password').fill(TEST_DATA.CLIENT_PASSWORD);
		await form.locator('button[type="submit"]').click();

		await page.waitForURL(/\/client\/dashboard/, { timeout: 60_000 });
	});

	test('shows error when using existing email', async ({ page }) => {
		await page.goto('/auth/register');

		const form = page.locator('form').filter({ has: page.locator('#email') });
		await form.locator('#name').fill('Duplicate User');
		await form.locator('#email').fill(TEST_DATA.ADMIN_EMAIL);
		await form.locator('#password').fill(TEST_DATA.CLIENT_PASSWORD);
		await form.locator('button[type="submit"]').click();

		await expect(page.locator('.bg-red-50').first()).toBeVisible();
	});

	test('has link to sign in', async ({ page }) => {
		await page.goto('/auth/register');

		const signInLink = page.getByRole('link', { name: /sign in/i }).first();
		await expect(signInLink).toBeVisible();
	});
});
