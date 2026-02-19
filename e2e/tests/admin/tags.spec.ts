import { test, expect } from '../../fixtures';
import { AdminTagsPage } from '../../page-objects/admin/tags.page';

test.describe('Admin: Tags Management', () => {
	test('admin can access tags management page', async ({ adminPage }) => {
		const tagsPage = new AdminTagsPage(adminPage);

		await tagsPage.navigate();
		await tagsPage.waitForPageReady();

		await expect(tagsPage.heading).toBeVisible();
		await expect(tagsPage.addTagButton).toBeVisible();
	});

	test('admin can create a new tag', async ({ adminPage }) => {
		const tagsPage = new AdminTagsPage(adminPage);
		const tagId = `e2e-tag-${Date.now()}`;
		const tagName = `E2E Test Tag ${Date.now()}`;

		await tagsPage.navigate();
		await tagsPage.waitForPageReady();

		// Click Add Tag button
		await tagsPage.addTagButton.click();

		// Tag form modal should open
		await expect(tagsPage.tagFormModal).toBeVisible();

		// Fill form
		await tagsPage.fillTagForm({ id: tagId, name: tagName });

		// Click Create Tag
		await tagsPage.createTagButton.click();

		// Modal should close
		await expect(tagsPage.tagFormModal).toBeHidden({ timeout: 10_000 });

		// The tag should appear in the list
		await expect(adminPage.getByText(tagName).first()).toBeVisible({ timeout: 10_000 });
	});

	test('admin can edit an existing tag', async ({ adminPage }) => {
		const tagsPage = new AdminTagsPage(adminPage);

		await tagsPage.navigate();
		await tagsPage.waitForPageReady();

		// Wait for tags to load
		const firstTag = adminPage.locator('h4').first();
		await expect(firstTag).toBeVisible({ timeout: 10_000 });
		const originalName = await firstTag.textContent();
		expect(originalName).toBeTruthy();

		// Hover over the tag row to reveal action buttons
		const tagRow = firstTag.locator('xpath=ancestor::div[contains(@class, "group")]').first();
		await tagRow.hover();

		// Click the edit button (first small button in the row)
		const editButton = tagRow.locator('button').filter({ has: adminPage.locator('svg') }).first();
		await editButton.click();

		// Tag form modal should open
		await expect(tagsPage.tagFormModal).toBeVisible();

		// Update the name
		const updatedName = `${originalName} Updated`;
		await tagsPage.tagNameInput.clear();
		await tagsPage.tagNameInput.fill(updatedName);

		// Click Update Tag
		await tagsPage.updateTagButton.click();

		// Modal should close
		await expect(tagsPage.tagFormModal).toBeHidden({ timeout: 10_000 });
	});

	test('admin can delete a tag using native confirm dialog', async ({ adminPage }) => {
		const tagsPage = new AdminTagsPage(adminPage);

		await tagsPage.navigate();
		await tagsPage.waitForPageReady();

		// Wait for tags to load
		const firstTag = adminPage.locator('h4').first();
		await expect(firstTag).toBeVisible({ timeout: 10_000 });
		const tagName = await firstTag.textContent();
		expect(tagName).toBeTruthy();

		// Set up dialog handler to accept the native confirm
		adminPage.on('dialog', async (dialog) => {
			await dialog.accept();
		});

		// Hover over the tag row to reveal action buttons
		const tagRow = firstTag.locator('xpath=ancestor::div[contains(@class, "group")]').first();
		await tagRow.hover();

		// Click the delete button (second button with Trash icon)
		const deleteButton = tagRow.locator('button').filter({ has: adminPage.locator('svg') }).last();
		await deleteButton.click();

		// The tag should be removed from the list
		await expect(adminPage.getByText(tagName!.trim()).first()).toBeHidden({ timeout: 10_000 });
	});

	test('tags page shows tag count in stats', async ({ adminPage }) => {
		const tagsPage = new AdminTagsPage(adminPage);

		await tagsPage.navigate();
		await tagsPage.waitForPageReady();

		await expect(tagsPage.heading).toBeVisible();

		// Stats cards should be visible (Total Tags, Active Tags)
		const statsGrid = adminPage.locator('.grid').first();
		await expect(statsGrid).toBeVisible({ timeout: 10_000 });
	});
});
