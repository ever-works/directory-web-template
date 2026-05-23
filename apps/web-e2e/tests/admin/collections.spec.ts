import { test, expect } from '../../fixtures';
import { AdminCollectionsPage } from '../../page-objects/admin/collections.page';

test.describe('Admin: Collections Management', () => {
	test('admin can access collections management page', async ({ adminPage }) => {
		const collectionsPage = new AdminCollectionsPage(adminPage);

		await collectionsPage.navigate();
		await collectionsPage.waitForPageReady();

		await expect(collectionsPage.heading).toBeVisible();
		await expect(collectionsPage.addCollectionButton).toBeVisible();
	});

	test('admin can create a new collection', async ({ adminPage }) => {
		test.setTimeout(60_000);
		const collectionsPage = new AdminCollectionsPage(adminPage);
		const collectionId = `e2e-collection-${Date.now()}`;
		const collectionName = `E2E Test Collection ${Date.now()}`;

		await collectionsPage.navigate();
		await collectionsPage.waitForPageReady();

		// Click Add Collection button
		await collectionsPage.addCollectionButton.click();

		// Collection form modal should open
		await expect(collectionsPage.collectionFormModal).toBeVisible();

		// Fill form
		await collectionsPage.fillCollectionForm({
			id: collectionId,
			name: collectionName,
			description: 'E2E test collection description',
		});

		// Click Create Collection
		await collectionsPage.createButton.click();

		// Modal should close
		await expect(collectionsPage.collectionFormModal).toBeHidden({ timeout: 10_000 });

		// The collection should appear in the list
		await expect(adminPage.getByText(collectionName).first()).toBeVisible({ timeout: 10_000 });
	});

	test('admin can edit an existing collection', async ({ adminPage }) => {
		const collectionsPage = new AdminCollectionsPage(adminPage);

		await collectionsPage.navigate();
		await collectionsPage.waitForPageReady();

		// Restrict the row-name lookup to actual collection rows (the
		// page renders each row inside a `div.group` whose innermost
		// `<h4>` carries the collection name). Searching for any
		// `h3/h4` previously matched footer headings ("Connect with us")
		// when the collections list was empty / still loading.
		const collectionRowLocator = adminPage.locator('div.group').filter({ has: adminPage.locator('h4') });
		const rowCount = await collectionRowLocator.count();
		if (rowCount === 0) {
			test.skip(true, 'No collections present to edit');
			return;
		}
		const firstRow = collectionRowLocator.first();
		const firstHeading = firstRow.locator('h4').first();
		await expect(firstHeading).toBeVisible({ timeout: 10_000 });
		const originalName = (await firstHeading.textContent())?.trim();
		expect(originalName).toBeTruthy();

		// Hover over the actual collection row to reveal action buttons
		await firstRow.hover();

		// Click the Edit button on that row
		const editButton = firstRow.getByRole('button', { name: /edit/i }).first();
		await editButton.click();

		// Collection form modal should open
		await expect(collectionsPage.collectionFormModal).toBeVisible();

		// Update the name
		const updatedName = `${originalName} Updated`;
		await collectionsPage.collectionNameInput.clear();
		await collectionsPage.collectionNameInput.fill(updatedName);

		// Click Save Changes
		await collectionsPage.saveButton.click();

		// Modal should close
		await expect(collectionsPage.collectionFormModal).toBeHidden({ timeout: 10_000 });
	});

	test('admin can delete a collection using native confirm dialog', async ({ adminPage }) => {
		const collectionsPage = new AdminCollectionsPage(adminPage);

		await collectionsPage.navigate();
		await collectionsPage.waitForPageReady();

		// Restrict the row-name lookup to actual collection rows (see
		// edit test for context — `h3/h4` alone leaks the footer).
		const collectionRowLocator = adminPage.locator('div.group').filter({ has: adminPage.locator('h4') });
		const rowCount = await collectionRowLocator.count();
		if (rowCount === 0) {
			test.skip(true, 'No collections present to delete');
			return;
		}
		const firstRow = collectionRowLocator.first();
		const firstHeading = firstRow.locator('h4').first();
		await expect(firstHeading).toBeVisible({ timeout: 10_000 });
		const collectionName = (await firstHeading.textContent())?.trim();
		expect(collectionName).toBeTruthy();

		// Set up dialog handler to accept the native confirm
		adminPage.on('dialog', async (dialog) => {
			await dialog.accept();
		});

		// Hover to reveal action buttons + click Delete on the actual row
		await firstRow.hover();
		const deleteButton = firstRow.getByRole('button', { name: /delete/i }).first();
		await deleteButton.click();

		// The collection should be removed from the list (look inside
		// the row container, not the whole page — the page chrome may
		// contain the same word incidentally).
		await expect(adminPage.locator('div.group').filter({ hasText: collectionName! }).first()).toBeHidden({ timeout: 10_000 });
	});

	test('collections page displays stats cards', async ({ adminPage }) => {
		const collectionsPage = new AdminCollectionsPage(adminPage);

		await collectionsPage.navigate();
		await collectionsPage.waitForPageReady();

		await expect(collectionsPage.heading).toBeVisible();

		// Stats grid should be visible (Total, Active, Items Assigned)
		const statsGrid = adminPage.locator('.grid').first();
		await expect(statsGrid).toBeVisible({ timeout: 10_000 });
	});
});
