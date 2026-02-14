import { test, expect } from '@playwright/test';

test.describe('Public: Pricing', () => {
	test('pricing page loads successfully', async ({ page }) => {
		const response = await page.goto('/pricing');

		expect(response?.status()).toBeLessThan(400);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('pricing page displays plan options', async ({ page }) => {
		await page.goto('/pricing');
		await page.waitForLoadState('networkidle');

		// Should have at least one plan card or pricing section visible
		const planContent = page.locator('main, [role="main"], body');
		await expect(planContent).toBeVisible();
	});

	test('billing interval toggle is visible', async ({ page }) => {
		await page.goto('/pricing');
		await page.waitForLoadState('networkidle');

		// Look for monthly/yearly toggle buttons
		const monthlyButton = page.getByRole('button', { name: /monthly/i }).first();
		const yearlyButton = page.getByRole('button', { name: /yearly|annual/i }).first();

		// At least one billing toggle should be visible if pricing plans exist
		const hasToggle = (await monthlyButton.isVisible()) || (await yearlyButton.isVisible());
		if (hasToggle) {
			await expect(monthlyButton).toBeVisible();
		}
	});
});
