import { test, expect } from '../../fixtures';
import { AdminItemsPage } from '../../page-objects/admin/items.page';

test.describe('Admin: Item Review (Approve/Reject)', () => {
	test('admin can approve a pending item from the actions menu', async ({ adminPage }) => {
		const itemsPage = new AdminItemsPage(adminPage);

		await itemsPage.navigate();
		await itemsPage.waitForPageReady();

		// Filter to show only pending items
		await itemsPage.selectStatusTab('Pending');
		await adminPage.waitForTimeout(1_000);

		// Check if there are any pending items
		const pendingItems = adminPage.locator('h4');
		const count = await pendingItems.count();

		if (count === 0) {
			test.skip(true, 'No pending items available to approve');
			return;
		}

		// Get the first pending item's name
		const firstItemName = await pendingItems.first().textContent();
		expect(firstItemName).toBeTruthy();

		// Open actions menu and click "Approve"
		await itemsPage.openActionsMenu(firstItemName!.trim());
		await itemsPage.clickAction('Approve');

		// Wait for the approving spinner to finish
		await expect(adminPage.getByText(/approving/i)).toBeHidden({ timeout: 15_000 });

		// Verify the item is no longer in the pending tab
		// (it should have moved to approved)
		await itemsPage.selectStatusTab('Approved');
		await adminPage.waitForTimeout(1_000);

		await expect(adminPage.getByText(firstItemName!.trim()).first()).toBeVisible({ timeout: 10_000 });
	});

	test('admin can reject a pending item with a reason', async ({ adminPage }) => {
		const itemsPage = new AdminItemsPage(adminPage);
		const rejectionReason = 'This item does not meet the quality standards for E2E testing purposes.';

		await itemsPage.navigate();
		await itemsPage.waitForPageReady();

		// Filter to show only pending items
		await itemsPage.selectStatusTab('Pending');
		await adminPage.waitForTimeout(1_000);

		// Check if there are any pending items
		const pendingItems = adminPage.locator('h4');
		const count = await pendingItems.count();

		if (count === 0) {
			test.skip(true, 'No pending items available to reject');
			return;
		}

		// Get the first pending item's name
		const firstItemName = await pendingItems.first().textContent();
		expect(firstItemName).toBeTruthy();

		// Open actions menu and click "Reject"
		await itemsPage.openActionsMenu(firstItemName!.trim());
		await itemsPage.clickAction('Reject');

		// Reject modal should open
		const rejectModal = itemsPage.rejectModal;
		await expect(rejectModal).toBeVisible();

		// The confirm button should be disabled until reason >= 10 chars
		const confirmButton = rejectModal.getByRole('button', { name: /reject item/i });
		await expect(confirmButton).toBeDisabled();

		// Type a short reason (< 10 chars) — button should stay disabled
		await itemsPage.rejectionReasonInput.fill('Short');
		await expect(confirmButton).toBeDisabled();

		// Type a valid reason (>= 10 chars) — button should enable
		await itemsPage.rejectionReasonInput.clear();
		await itemsPage.rejectionReasonInput.fill(rejectionReason);
		await expect(confirmButton).toBeEnabled();

		// Submit the rejection
		await confirmButton.click();

		// Modal should close
		await expect(rejectModal).toBeHidden({ timeout: 15_000 });

		// Verify the item appears in the rejected tab
		await itemsPage.selectStatusTab('Rejected');
		await adminPage.waitForTimeout(1_000);

		await expect(adminPage.getByText(firstItemName!.trim()).first()).toBeVisible({ timeout: 10_000 });
	});
});
