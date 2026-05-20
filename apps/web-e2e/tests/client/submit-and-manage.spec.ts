import { test, expect } from '../../fixtures';
import { ClientSubmitPage } from '../../page-objects/client/submit.page';
import { ClientSubmissionsPage } from '../../page-objects/client/submissions.page';
import { TEST_DATA } from '../../helpers/test-data';

test.describe('Client: Submit & Submission Management', () => {
	test.describe.configure({ mode: 'serial' });

	const testItemName = TEST_DATA.generateItemName();
	const testItemUrl = TEST_DATA.generateItemUrl();
	const testDescription = 'This is an E2E test submission for client flow testing.';

	test('client can submit a new item via the submit form', async ({ clientPage }) => {
		test.setTimeout(60_000);

		const submitPage = new ClientSubmitPage(clientPage);
		await submitPage.navigate();

		// Step 1: Fill basic info
		await submitPage.fillBasicInfo({
			name: testItemName,
			url: testItemUrl,
			description: testDescription,
		});

		// Select a category. The combobox is rendered whenever categories
		// are enabled in settings; when present, category is a REQUIRED
		// field and the Submit button stays disabled until something is
		// selected. Retry the open+pick interaction up to 10s so a
		// cold-start combobox that hasn't hydrated yet still resolves.
		const categoriesBtn = submitPage.categoriesButton;
		const isCategoriesVisible = await categoriesBtn.isVisible().catch(() => false);
		if (isCategoriesVisible) {
			const deadline = Date.now() + 10_000;
			let selected = false;
			while (Date.now() < deadline && !selected) {
				try {
					await categoriesBtn.click({ timeout: 2_000 });
					const firstOption = clientPage.getByRole('option').first();
					await firstOption.waitFor({ state: 'visible', timeout: 2_000 });
					await firstOption.click();
					selected = true;
				} catch {
					await clientPage.waitForTimeout(250);
				}
			}
			expect(selected, 'category combobox is visible — selection is required for Submit').toBe(true);
		}

		// Click "Next Step" to go to payment step
		await expect(submitPage.nextStepButton).toBeEnabled({ timeout: 15_000 });
		await submitPage.nextStepButton.click();

		// Step 2: Select free plan
		await submitPage.selectFreePlan();

		// Click "Next Step" to go to review step
		await expect(submitPage.nextStepButton).toBeEnabled({ timeout: 15_000 });
		await submitPage.nextStepButton.click();

		// Step 3: Review — click "Submit Product". Use a wider timeout
		// because the submit button can stay disabled while reCAPTCHA
		// verifies (browser-side challenge) and form-level validation
		// settles after the step transition's hydration.
		await expect(submitPage.submitButton).toBeEnabled({ timeout: 20_000 });
		await submitPage.submitButton.click();

		// Should redirect to submissions page
		await clientPage.waitForURL(/\/client\/submissions/, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
	});

	test('client can view submission details', async ({ clientPage }) => {
		const submissionsPage = new ClientSubmissionsPage(clientPage);
		await submissionsPage.navigate();
		await submissionsPage.waitForPageReady();

		// Wait for submissions to load
		const firstSubmission = clientPage.locator('h3').first();
		await expect(firstSubmission).toBeVisible({ timeout: 10_000 });

		// Click the view button on the first submission
		const viewButton = clientPage.locator('button[title="View submission"]').first();
		await viewButton.click();

		// Detail modal should appear with submission info
		const detailModal = submissionsPage.detailModal;
		await expect(detailModal).toBeVisible();

		// Close the modal
		const closeButton = detailModal.getByRole('button', { name: /close/i });
		await closeButton.click();
		await expect(detailModal).toBeHidden();
	});

	test('client can edit a submission', async ({ clientPage }) => {
		const submissionsPage = new ClientSubmissionsPage(clientPage);
		const updatedDescription = 'Updated description for E2E test submission.';

		await submissionsPage.navigate();
		await submissionsPage.waitForPageReady();

		// Wait for submissions to load
		await expect(clientPage.locator('h3').first()).toBeVisible({ timeout: 10_000 });

		// Click the edit button on the first submission
		const editButton = clientPage.locator('button[title="Edit submission"]').first();
		await editButton.click();

		// Edit modal should appear with form
		const editModal = submissionsPage.editModal;
		await expect(editModal).toBeVisible();

		// Update the description
		const descriptionInput = editModal.locator('#description');
		await descriptionInput.clear();
		await descriptionInput.fill(updatedDescription);

		// Save changes
		const saveButton = editModal.getByRole('button', { name: /save changes/i });
		await expect(saveButton).toBeEnabled();
		await saveButton.click();

		// Modal should close after save
		await expect(editModal).toBeHidden({ timeout: 10_000 });
	});

	test('client can delete a submission', async ({ clientPage }) => {
		const submissionsPage = new ClientSubmissionsPage(clientPage);

		await submissionsPage.navigate();
		await submissionsPage.waitForPageReady();

		// Wait for submissions to load
		await expect(clientPage.locator('h3').first()).toBeVisible({ timeout: 10_000 });

		// Get initial submission count
		const initialCount = await clientPage.locator('h3').count();

		// Click the delete button on the first submission
		const deleteButton = clientPage.locator('button[title="Delete submission"]').first();
		await deleteButton.click();

		// Delete confirmation dialog should appear
		const deleteDialog = submissionsPage.deleteDialog;
		await expect(deleteDialog).toBeVisible();

		// Click the "Delete" confirmation button
		const confirmButton = deleteDialog.getByRole('button', { name: /^delete$/i });
		await confirmButton.click();

		// Dialog should close
		await expect(deleteDialog).toBeHidden({ timeout: 10_000 });

		// Submission count should decrease (or show empty state)
		if (initialCount > 1) {
			const newCount = await clientPage.locator('h3').count();
			expect(newCount).toBeLessThan(initialCount);
		}
	});
});
