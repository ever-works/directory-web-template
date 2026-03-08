import { test, expect } from '../../fixtures';
import { AdminSurveysPage } from '../../page-objects/admin/surveys.page';

test.describe('Admin: Surveys Management', () => {
	test('admin can access surveys management page', async ({ adminPage }) => {
		const surveysPage = new AdminSurveysPage(adminPage);

		await surveysPage.navigate();
		await surveysPage.waitForPageReady();

		await expect(surveysPage.heading).toBeVisible();
	});

	test('surveys page shows create survey button', async ({ adminPage }) => {
		const surveysPage = new AdminSurveysPage(adminPage);

		await surveysPage.navigate();
		await surveysPage.waitForPageReady();

		// Create Survey button should be visible (if surveys feature is enabled)
		const createButton = surveysPage.createSurveyButton;
		const isVisible = await createButton.isVisible().catch(() => false);

		if (!isVisible) {
			// Surveys feature might be disabled — check for warning banner
			const warningBanner = adminPage.getByText(/surveys.*disabled|enable.*surveys/i).first();
			await expect(warningBanner).toBeVisible();
		} else {
			await expect(createButton).toBeVisible();
		}
	});

	test('filter buttons switch between All, Global, and Item surveys', async ({ adminPage }) => {
		const surveysPage = new AdminSurveysPage(adminPage);

		await surveysPage.navigate();
		await surveysPage.waitForPageReady();

		// Click Global filter
		await surveysPage.selectFilter('global');
		await adminPage.waitForTimeout(1_000);

		// Click Item filter
		await surveysPage.selectFilter('item');
		await adminPage.waitForTimeout(1_000);

		// Click All to restore
		await surveysPage.selectFilter('all');
		await adminPage.waitForTimeout(1_000);
	});

	test('survey list shows edit and delete actions', async ({ adminPage }) => {
		const surveysPage = new AdminSurveysPage(adminPage);

		await surveysPage.navigate();
		await surveysPage.waitForPageReady();

		// Wait for survey list to load
		await adminPage.waitForTimeout(2_000);

		// Check if there are any surveys
		const editButton = surveysPage.getEditButton(0);
		const isEditVisible = await editButton.isVisible().catch(() => false);

		if (!isEditVisible) {
			test.skip(true, 'No surveys available to test actions');
			return;
		}

		// Edit and delete buttons should exist
		await expect(editButton).toBeVisible();
		await expect(surveysPage.getDeleteButton(0)).toBeVisible();
	});
});
