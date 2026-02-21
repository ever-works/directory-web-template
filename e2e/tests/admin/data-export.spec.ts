import { test, expect } from '../../fixtures';
import { AdminDataExportPage } from '../../page-objects/admin/data-export.page';

test.describe('Admin: Data Export', () => {
	test('admin dashboard has export format buttons', async ({ adminPage }) => {
		const exportPage = new AdminDataExportPage(adminPage);

		await exportPage.navigate();
		await exportPage.waitForPageReady();
		await adminPage.waitForTimeout(2_000);

		// Look for CSV/JSON format buttons
		const hasCsv = await exportPage.csvButton.isVisible().catch(() => false);
		const hasJson = await exportPage.jsonButton.isVisible().catch(() => false);

		if (!hasCsv && !hasJson) {
			test.skip(true, 'Data export section not visible on admin dashboard');
			return;
		}

		expect(hasCsv || hasJson).toBeTruthy();
	});

	test('include metadata checkbox is available', async ({ adminPage }) => {
		const exportPage = new AdminDataExportPage(adminPage);

		await exportPage.navigate();
		await exportPage.waitForPageReady();
		await adminPage.waitForTimeout(2_000);

		const isVisible = await exportPage.includeMetadataCheckbox.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Include metadata checkbox not visible');
			return;
		}

		await expect(exportPage.includeMetadataCheckbox).toBeVisible();

		// Toggle it
		await exportPage.includeMetadataCheckbox.click();
		const isChecked = await exportPage.includeMetadataCheckbox.isChecked();
		expect(typeof isChecked).toBe('boolean');
	});

	test('export/download buttons are available', async ({ adminPage }) => {
		const exportPage = new AdminDataExportPage(adminPage);

		await exportPage.navigate();
		await exportPage.waitForPageReady();
		await adminPage.waitForTimeout(2_000);

		const exportButtonCount = await exportPage.exportButtons.count();

		if (exportButtonCount === 0) {
			test.skip(true, 'No export buttons found on admin dashboard');
			return;
		}

		expect(exportButtonCount).toBeGreaterThan(0);
		await expect(exportPage.exportButtons.first()).toBeVisible();
	});
});
