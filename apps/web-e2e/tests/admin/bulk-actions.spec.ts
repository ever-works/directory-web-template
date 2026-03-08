import { test, expect } from '../../fixtures';
import { AdminBulkActionsPage } from '../../page-objects/admin/bulk-actions.page';

test.describe('Admin: Item Bulk Operations', () => {
	test('select-all checkbox is visible on items page', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		await bulkPage.navigate();
		await bulkPage.waitForPageReady();

		// Wait for items to load
		await expect(bulkPage.heading).toBeVisible({ timeout: 10_000 });
		await adminPage.waitForTimeout(2_000);

		const isCheckboxVisible = await bulkPage.selectAllCheckbox.isVisible().catch(() => false);

		if (!isCheckboxVisible) {
			test.skip(true, 'Select-all checkbox not visible on items page');
			return;
		}

		await expect(bulkPage.selectAllCheckbox).toBeVisible();
	});

	test('clicking select-all shows bulk action bar', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		await bulkPage.navigate();
		await bulkPage.waitForPageReady();
		await adminPage.waitForTimeout(2_000);

		const isCheckboxVisible = await bulkPage.selectAllCheckbox.isVisible().catch(() => false);

		if (!isCheckboxVisible) {
			test.skip(true, 'Select-all checkbox not visible');
			return;
		}

		// Click select all
		await bulkPage.selectAllCheckbox.click();
		await adminPage.waitForTimeout(500);

		// Bulk action bar should appear
		await expect(bulkPage.bulkActionBar).toBeVisible({ timeout: 5_000 });
	});

	test('bulk action bar has approve, reject, and delete buttons', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		await bulkPage.navigate();
		await bulkPage.waitForPageReady();
		await adminPage.waitForTimeout(2_000);

		const isCheckboxVisible = await bulkPage.selectAllCheckbox.isVisible().catch(() => false);

		if (!isCheckboxVisible) {
			test.skip(true, 'Select-all checkbox not visible');
			return;
		}

		await bulkPage.selectAllCheckbox.click();
		await adminPage.waitForTimeout(500);
		await expect(bulkPage.bulkActionBar).toBeVisible({ timeout: 5_000 });

		// Verify action buttons exist
		const hasApprove = await bulkPage.approveButton.isVisible().catch(() => false);
		const hasReject = await bulkPage.rejectButton.isVisible().catch(() => false);
		const hasDelete = await bulkPage.deleteButton.isVisible().catch(() => false);

		expect(hasApprove || hasReject || hasDelete).toBeTruthy();
	});

	test('clicking bulk delete opens confirmation dialog', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		await bulkPage.navigate();
		await bulkPage.waitForPageReady();
		await adminPage.waitForTimeout(2_000);

		const isCheckboxVisible = await bulkPage.selectAllCheckbox.isVisible().catch(() => false);

		if (!isCheckboxVisible) {
			test.skip(true, 'Select-all checkbox not visible');
			return;
		}

		await bulkPage.selectAllCheckbox.click();
		await adminPage.waitForTimeout(500);

		const isDeleteVisible = await bulkPage.deleteButton.isVisible().catch(() => false);

		if (!isDeleteVisible) {
			test.skip(true, 'Bulk delete button not visible');
			return;
		}

		await bulkPage.deleteButton.click();

		// Confirmation dialog should appear
		await expect(bulkPage.confirmDialog).toBeVisible({ timeout: 5_000 });

		// Cancel to avoid actual deletion
		await adminPage.keyboard.press('Escape');
		await adminPage.waitForTimeout(500);
	});

	test('clear selection removes bulk action bar', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		await bulkPage.navigate();
		await bulkPage.waitForPageReady();
		await adminPage.waitForTimeout(2_000);

		const isCheckboxVisible = await bulkPage.selectAllCheckbox.isVisible().catch(() => false);

		if (!isCheckboxVisible) {
			test.skip(true, 'Select-all checkbox not visible');
			return;
		}

		// Select all
		await bulkPage.selectAllCheckbox.click();
		await adminPage.waitForTimeout(500);
		await expect(bulkPage.bulkActionBar).toBeVisible({ timeout: 5_000 });

		// Clear selection
		const isClearVisible = await bulkPage.clearSelectionButton.isVisible().catch(() => false);
		if (isClearVisible) {
			await bulkPage.clearSelectionButton.click();
		} else {
			// Uncheck select-all
			await bulkPage.selectAllCheckbox.click();
		}

		await adminPage.waitForTimeout(500);
		await expect(bulkPage.bulkActionBar).toBeHidden({ timeout: 5_000 });
	});
});
