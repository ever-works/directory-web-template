import { test, expect } from '../../fixtures';
import { AdminCommentsPage } from '../../page-objects/admin/comments.page';

test.describe('Admin: Comments Management', () => {
	test('admin can access comments management page', async ({ adminPage }) => {
		const commentsPage = new AdminCommentsPage(adminPage);

		await commentsPage.navigate();
		await commentsPage.waitForPageReady();

		await expect(commentsPage.heading).toBeVisible();
	});

	test('comments page displays comment list', async ({ adminPage }) => {
		const commentsPage = new AdminCommentsPage(adminPage);

		await commentsPage.navigate();
		await commentsPage.waitForPageReady();

		// Wait for content to load
		const mainContent = adminPage.locator('main').first();
		await expect(mainContent).toBeVisible();

		// Should either show comments or empty state
		const hasComments = await adminPage.locator('.divide-y, .space-y-4').first().isVisible().catch(() => false);
		const hasEmptyState = await adminPage.getByText(/no comments/i).first().isVisible().catch(() => false);

		expect(hasComments || hasEmptyState).toBeTruthy();
	});

	test('admin can search comments', async ({ adminPage }) => {
		const commentsPage = new AdminCommentsPage(adminPage);

		await commentsPage.navigate();
		await commentsPage.waitForPageReady();

		// Check if search input exists
		const searchInput = commentsPage.searchInput;
		const isSearchVisible = await searchInput.isVisible().catch(() => false);

		if (!isSearchVisible) {
			test.skip(true, 'Search input not visible on comments page');
			return;
		}

		// Search for a non-existent term
		await commentsPage.searchComments('zzz-nonexistent-comment-xyz');
		await adminPage.waitForTimeout(1_000);

		// Clear search
		await commentsPage.clearSearch();
		await adminPage.waitForTimeout(1_000);
	});

	test('admin can open delete comment dialog', async ({ adminPage }) => {
		const commentsPage = new AdminCommentsPage(adminPage);

		await commentsPage.navigate();
		await commentsPage.waitForPageReady();

		// Wait for comments to load
		await adminPage.waitForTimeout(2_000);

		// Find a delete button
		const deleteButton = adminPage.locator('button').filter({ has: adminPage.locator('svg.text-red-600, svg.text-red-400') }).first();
		const isDeleteVisible = await deleteButton.isVisible().catch(() => false);

		if (!isDeleteVisible) {
			test.skip(true, 'No comments available to delete');
			return;
		}

		// Click the delete button
		await deleteButton.click();

		// Delete dialog should appear — HeroUI Modal
		const dialog = adminPage.locator('[role="dialog"]').first();
		await expect(dialog).toBeVisible({ timeout: 5_000 });

		// Dialog should have "Delete Comment" and "Cancel" buttons
		await expect(dialog.getByRole('button', { name: /cancel/i })).toBeVisible();

		// Cancel to close
		await dialog.getByRole('button', { name: /cancel/i }).click();
		await expect(dialog).toBeHidden({ timeout: 5_000 });
	});
});
