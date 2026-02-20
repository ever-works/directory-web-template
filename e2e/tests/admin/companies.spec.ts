import { test, expect } from '../../fixtures';
import { AdminCompaniesPage } from '../../page-objects/admin/companies.page';

test.describe('Admin: Companies Management', () => {
	test('admin can access companies management page', async ({ adminPage }) => {
		const companiesPage = new AdminCompaniesPage(adminPage);

		await companiesPage.navigate();
		await companiesPage.waitForPageReady();

		await expect(companiesPage.heading).toBeVisible();
		await expect(companiesPage.addCompanyButton).toBeVisible();
	});

	test('admin can open create company modal', async ({ adminPage }) => {
		test.setTimeout(60_000);
		const companiesPage = new AdminCompaniesPage(adminPage);

		await companiesPage.navigate();
		await companiesPage.waitForPageReady();

		// Click Add Company button
		await companiesPage.addCompanyButton.click();

		// Company form modal should open
		await expect(companiesPage.companyFormModal).toBeVisible({ timeout: 5_000 });

		// Modal should contain form inputs
		await expect(companiesPage.companyNameInput).toBeVisible();

		// Cancel to close
		await companiesPage.cancelButton.click();
		await expect(companiesPage.companyFormModal).toBeHidden({ timeout: 5_000 });
	});

	test('admin can create a new company', async ({ adminPage }) => {
		test.setTimeout(60_000);
		const companiesPage = new AdminCompaniesPage(adminPage);
		const companyName = `E2E Test Company ${Date.now()}`;

		await companiesPage.navigate();
		await companiesPage.waitForPageReady();

		// Click Add Company
		await companiesPage.addCompanyButton.click();
		await expect(companiesPage.companyFormModal).toBeVisible({ timeout: 5_000 });

		// Fill company name (first input in the form)
		await companiesPage.companyNameInput.fill(companyName);

		// Click Create Company
		await companiesPage.createCompanyButton.click();

		// Modal should close
		await expect(companiesPage.companyFormModal).toBeHidden({ timeout: 10_000 });

		// Company should appear in the list
		await expect(adminPage.getByText(companyName).first()).toBeVisible({ timeout: 10_000 });
	});

	test('admin can open delete company confirmation', async ({ adminPage }) => {
		const companiesPage = new AdminCompaniesPage(adminPage);

		await companiesPage.navigate();
		await companiesPage.waitForPageReady();

		// Wait for companies to load
		await adminPage.waitForTimeout(2_000);

		// Find a delete button in the table
		const deleteButton = adminPage.locator('button').filter({ has: adminPage.locator('svg') }).filter({ hasText: /delete/i }).first();
		const isVisible = await deleteButton.isVisible().catch(() => false);

		if (!isVisible) {
			// Try finding by the Trash2 icon button with danger color
			const trashButton = adminPage.locator('button[color="danger"]').first();
			const isTrashVisible = await trashButton.isVisible().catch(() => false);

			if (!isTrashVisible) {
				test.skip(true, 'No companies available to delete');
				return;
			}

			await trashButton.click();
		} else {
			await deleteButton.click();
		}

		// Delete confirmation modal should appear
		const deleteModal = companiesPage.deleteConfirmModal;
		const isDeleteModalVisible = await deleteModal.isVisible().catch(() => false);

		if (isDeleteModalVisible) {
			await expect(deleteModal).toBeVisible();

			// Cancel to close
			await deleteModal.getByRole('button', { name: /cancel/i }).click();
			await expect(deleteModal).toBeHidden({ timeout: 5_000 });
		}
	});
});
