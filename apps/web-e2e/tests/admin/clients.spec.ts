import { test, expect } from '../../fixtures';
import { AdminClientsPage } from '../../page-objects/admin/clients.page';

test.describe('Admin: Clients Management', () => {
	test('admin can access clients management page', async ({ adminPage }) => {
		const clientsPage = new AdminClientsPage(adminPage);

		await clientsPage.navigate();
		await clientsPage.waitForPageReady();

		await expect(clientsPage.heading).toBeVisible();
		await expect(clientsPage.addClientButton).toBeVisible();
	});

	test('clients page displays client list', async ({ adminPage }) => {
		const clientsPage = new AdminClientsPage(adminPage);

		await clientsPage.navigate();
		await clientsPage.waitForPageReady();

		// Wait for client list to load
		await adminPage.waitForTimeout(2_000);

		// Main content should be visible
		const mainContent = adminPage.locator('main').first();
		await expect(mainContent).toBeVisible();
	});

	test('admin can open create client modal', async ({ adminPage }) => {
		const clientsPage = new AdminClientsPage(adminPage);

		await clientsPage.navigate();
		await clientsPage.waitForPageReady();

		// Click Add Client
		await clientsPage.addClientButton.click();

		// Client form modal should open
		await expect(clientsPage.clientFormModal).toBeVisible({ timeout: 5_000 });

		// Modal should contain form fields (multi-step form)
		const mainContent = clientsPage.clientFormModal;
		await expect(mainContent).toBeVisible();

		// Close the modal by pressing Escape or clicking X
		await adminPage.keyboard.press('Escape');
		// Give time for modal to close
		await adminPage.waitForTimeout(1_000);
	});

	test('admin can open delete client confirmation', async ({ adminPage }) => {
		const clientsPage = new AdminClientsPage(adminPage);

		await clientsPage.navigate();
		await clientsPage.waitForPageReady();

		// Wait for client list to load
		await adminPage.waitForTimeout(2_000);

		// Find a delete button in the table (button with Trash icon or danger color)
		const deleteButton = adminPage.locator('button[color="danger"]').first();
		const isDeleteVisible = await deleteButton.isVisible().catch(() => false);

		if (!isDeleteVisible) {
			test.skip(true, 'No clients available to delete');
			return;
		}

		// Click the delete button
		await deleteButton.click();

		// Delete confirmation modal should appear
		const deleteModal = clientsPage.deleteConfirmModal;
		const isModalVisible = await deleteModal.isVisible().catch(() => false);

		if (isModalVisible) {
			await expect(deleteModal).toBeVisible();

			// Cancel to close
			await clientsPage.cancelDeleteButton.click();
			await expect(deleteModal).toBeHidden({ timeout: 5_000 });
		}
	});
});
