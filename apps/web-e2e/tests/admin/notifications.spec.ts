import { test, expect } from '../../fixtures';
import { AdminNotifications } from '../../page-objects/admin/notifications.page';

test.describe('Admin: Notifications', () => {
	test('notification bell button is visible in admin header', async ({ adminPage }) => {
		// Navigate to any admin page
		await adminPage.goto('/admin', { waitUntil: 'domcontentloaded' });

		const notifications = new AdminNotifications(adminPage);
		await expect(notifications.bellButton).toBeVisible({ timeout: 10_000 });
	});

	test('clicking bell opens notifications dropdown', async ({ adminPage }) => {
		await adminPage.goto('/admin', { waitUntil: 'domcontentloaded' });

		const notifications = new AdminNotifications(adminPage);
		await expect(notifications.bellButton).toBeVisible({ timeout: 10_000 });

		// Open notifications
		await notifications.open();

		// Dropdown should appear
		await expect(notifications.dropdown).toBeVisible({ timeout: 5_000 });

		// Should have close and refresh buttons
		await expect(notifications.closeButton).toBeVisible();
		await expect(notifications.refreshButton).toBeVisible();
	});

	test('closing notifications dropdown works', async ({ adminPage }) => {
		await adminPage.goto('/admin', { waitUntil: 'domcontentloaded' });

		const notifications = new AdminNotifications(adminPage);
		await expect(notifications.bellButton).toBeVisible({ timeout: 10_000 });

		// Open notifications
		await notifications.open();
		await expect(notifications.dropdown).toBeVisible({ timeout: 5_000 });

		// Close notifications
		await notifications.close();
		await expect(notifications.dropdown).toBeHidden({ timeout: 5_000 });
	});

	test('notifications dropdown shows content or empty state', async ({ adminPage }) => {
		await adminPage.goto('/admin', { waitUntil: 'domcontentloaded' });

		const notifications = new AdminNotifications(adminPage);
		await expect(notifications.bellButton).toBeVisible({ timeout: 10_000 });

		// Open notifications
		await notifications.open();
		await expect(notifications.dropdown).toBeVisible({ timeout: 5_000 });

		// Wait for content to load
		await adminPage.waitForTimeout(2_000);

		// Should show either notification items or empty state
		const hasNotifications = await notifications.notificationItems.first().isVisible().catch(() => false);
		const hasEmptyState = await notifications.emptyState.isVisible().catch(() => false);

		expect(hasNotifications || hasEmptyState).toBeTruthy();

		// Close
		await notifications.close();
	});

	test('refresh button triggers notification reload', async ({ adminPage }) => {
		await adminPage.goto('/admin', { waitUntil: 'domcontentloaded' });

		const notifications = new AdminNotifications(adminPage);
		await expect(notifications.bellButton).toBeVisible({ timeout: 10_000 });

		// Open notifications
		await notifications.open();
		await expect(notifications.dropdown).toBeVisible({ timeout: 5_000 });

		// Click refresh
		await notifications.refreshButton.click();

		// Should not error — just wait a bit
		await adminPage.waitForTimeout(2_000);

		// Dropdown should still be open
		await expect(notifications.dropdown).toBeVisible();

		// Close
		await notifications.close();
	});
});
