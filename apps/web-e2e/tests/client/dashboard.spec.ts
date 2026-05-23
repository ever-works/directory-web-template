import { test, expect } from '../../fixtures';

test.describe('Client: Dashboard', () => {
	test('authenticated client can access dashboard', async ({ clientPage }) => {
		await clientPage.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });

		await expect(clientPage).toHaveURL(/\/client\/dashboard/);
		await expect(clientPage.locator('main').first()).toBeVisible();
	});

	test('unauthenticated user is redirected to signin', async ({ page }) => {
		await page.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });

		await page.waitForURL(/\/auth\/signin/);
	});

	test('dashboard displays stats or content area', async ({ clientPage }) => {
		await clientPage.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });

		// Dashboard should have visible content. The heading text is
		// i18n-driven and may not literally say "Dashboard" — accept any
		// heading on the page.
		const heading = clientPage.getByRole('heading').first();
		const mainContent = clientPage.locator('main, [role="main"]').first();
		const headingVisible = await heading.isVisible({ timeout: 10_000 }).catch(() => false);
		const mainVisible = await mainContent.isVisible({ timeout: 5_000 }).catch(() => false);
		expect(headingVisible || mainVisible).toBeTruthy();
	});
});
