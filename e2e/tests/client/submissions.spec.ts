import { test, expect } from '../../fixtures';

test.describe('Client: Submissions', () => {
	test('submit page loads for authenticated client', async ({ clientPage }) => {
		await clientPage.goto('/submit');

		await expect(clientPage.locator('body')).toBeVisible();
		// Submit page should show a form or pricing gate
		const mainContent = clientPage.locator('main, [role="main"], body');
		await expect(mainContent).toBeVisible();
	});

	test('submissions list page loads for authenticated client', async ({ clientPage }) => {
		await clientPage.goto('/client/submissions');

		await expect(clientPage.locator('body')).toBeVisible();
	});

	test('unauthenticated user is redirected from submissions', async ({ page }) => {
		await page.goto('/client/submissions');

		await page.waitForURL(/\/auth\/signin/, { timeout: 15_000 });
	});
});
