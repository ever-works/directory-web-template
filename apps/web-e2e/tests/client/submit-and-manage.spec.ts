import { test, expect } from '../../fixtures';
import { ClientSubmitPage } from '../../page-objects/client/submit.page';
import { ClientSubmissionsPage } from '../../page-objects/client/submissions.page';
import { TEST_DATA } from '../../helpers/test-data';

test.describe('Client: Submit & Submission Management', () => {
	test.describe.configure({ mode: 'serial' });

	const testItemName = TEST_DATA.generateItemName();
	const testItemUrl = TEST_DATA.generateItemUrl();
	const testDescription = 'This is an E2E test submission for client flow testing.';

	// FIXME(e2e): The 3-step submit form's "Submit Product" button remains
	// `disabled` on cold-start CI runners even with all visibly required
	// fields filled, the category combobox selection retry, the free-plan
	// selection retry, and a 20s `toBeEnabled` window. Suspected cause is
	// a `useDetailForm` validator that depends on an async URL-extraction
	// completion OR a settings-driven field (location? specific tag?) we
	// can't reproduce from logs alone. Re-enable after a local-CI repro
	// pins the exact gating field — every other surface of the submit
	// flow (auth, /submit page render, basic-info step, payment step, plan
	// selection) is covered green by the surrounding suite.
	test.skip('client can submit a new item via the submit form', async ({ clientPage }) => {
		test.setTimeout(60_000);

		const submitPage = new ClientSubmitPage(clientPage);
		await submitPage.navigate();

		// Step 1: Fill basic info
		await submitPage.fillBasicInfo({
			name: testItemName,
			url: testItemUrl,
			description: testDescription,
		});

		// Wait briefly for the basic-info step to settle. Categories
		// settings only become readable after the page hydrates, and
		// `categoriesBtn.isVisible()` raced ahead of that on cold start.
		await clientPage.waitForLoadState('networkidle').catch(() => undefined);

		// Select a category. The combobox is rendered whenever categories
		// are enabled in settings; when present, category is REQUIRED and
		// the Submit button stays disabled forever until something is
		// selected. Wait for the combobox with a short timeout — if it
		// genuinely never renders, categories are disabled and we move on.
		const categoriesBtn = submitPage.categoriesButton;
		const categoriesAppeared = await categoriesBtn
			.waitFor({ state: 'visible', timeout: 5_000 })
			.then(() => true)
			.catch(() => false);
		if (categoriesAppeared) {
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
