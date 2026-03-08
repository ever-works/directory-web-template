import { test, expect } from '@playwright/test';

test.describe('Public: Surveys', () => {
	test('surveys page loads or returns 404 if disabled', async ({ page }) => {
		const response = await page.goto('/surveys', { waitUntil: 'domcontentloaded' });

		// Surveys might be disabled (returns 404) or enabled (loads page)
		const status = response?.status() ?? 500;

		if (status === 404) {
			test.skip(true, 'Surveys feature is disabled');
			return;
		}

		expect(status).toBeLessThan(400);
		await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 });
	});

	test('surveys page shows heading', async ({ page }) => {
		const response = await page.goto('/surveys', { waitUntil: 'domcontentloaded' });

		if (response?.status() === 404) {
			test.skip(true, 'Surveys feature is disabled');
			return;
		}

		await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
	});

	test('surveys page displays survey cards or empty state', async ({ page }) => {
		const response = await page.goto('/surveys', { waitUntil: 'domcontentloaded' });

		if (response?.status() === 404) {
			test.skip(true, 'Surveys feature is disabled');
			return;
		}

		await page.waitForTimeout(2_000);

		// Should show survey cards or "No surveys available" message
		const surveyLinks = page.locator('a[href*="/surveys/"]');
		const emptyMessage = page.getByText(/no surveys/i).first();

		const hasSurveys = await surveyLinks.first().isVisible().catch(() => false);
		const hasEmpty = await emptyMessage.isVisible().catch(() => false);

		expect(hasSurveys || hasEmpty).toBeTruthy();
	});
});
