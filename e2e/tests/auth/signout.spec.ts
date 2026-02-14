import { test, expect } from '../../fixtures';
import { TEST_DATA } from '../../helpers/test-data';
import { SignInPage } from '../../page-objects/auth/signin.page';

test.describe('Auth: Sign Out', () => {
	test('authenticated client can access dashboard', async ({ clientPage }) => {
		await clientPage.goto('/client/dashboard');
		await expect(clientPage).toHaveURL(/\/client\/dashboard/);
	});

	test('unauthenticated user is redirected from dashboard to signin', async ({ page }) => {
		await page.goto('/client/dashboard');
		await page.waitForURL(/\/auth\/signin/, { timeout: 60_000 });
	});

	test('after signing in and clearing cookies, dashboard redirects to signin', async ({ page }) => {
		const signInPage = new SignInPage(page);
		await signInPage.navigate();

		await signInPage.signInAndWaitForRedirect(
			TEST_DATA.ADMIN_EMAIL,
			TEST_DATA.ADMIN_PASSWORD,
			/\/(admin|client\/dashboard)/
		);

		// Clear all cookies to simulate sign-out
		await page.context().clearCookies();

		await page.goto('/client/dashboard');
		await page.waitForURL(/\/auth\/signin/, { timeout: 60_000 });
	});
});
