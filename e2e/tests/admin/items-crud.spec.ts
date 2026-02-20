import { test, expect } from '../../fixtures';
import { AdminItemsPage } from '../../page-objects/admin/items.page';
import { AdminItemFormPage } from '../../page-objects/admin/item-form.page';
import { TEST_DATA } from '../../helpers/test-data';

test.describe('Admin: Item CRUD Operations', () => {
	test.describe.configure({ mode: 'serial' });

	const testItemName = TEST_DATA.generateItemName();
	const testItemUrl = TEST_DATA.generateItemUrl();
	const testItemDescription = 'This is an E2E test item description for CRUD testing.';

	test('admin can create a new item via multi-step form', async ({ adminPage }) => {
		const itemsPage = new AdminItemsPage(adminPage);
		const formPage = new AdminItemFormPage(adminPage);

		await itemsPage.navigate();
		await itemsPage.waitForPageReady();

		// Click "Add Item" to open create modal
		await itemsPage.addItemButton.click();
		await formPage.waitForOpen();

		// Step 1: Basic Info — fill name and description (id and slug auto-generate)
		await formPage.nameInput.fill(testItemName);
		await formPage.descriptionInput.fill(testItemDescription);

		// Wait for validation to pass, then go to next step
		await expect(formPage.nextButton).toBeEnabled();
		await formPage.goToNextStep();

		// Step 2: Media & Links — fill source URL (required)
		await formPage.sourceUrlInput.fill(testItemUrl);

		await expect(formPage.nextButton).toBeEnabled();
		await formPage.goToNextStep();

		// Step 3: Classification — add at least 1 category and 1 tag
		await formPage.addCategory('Web Development');
		await formPage.addTag('e2e-test');

		await expect(formPage.nextButton).toBeEnabled();
		await formPage.goToNextStep();

		// Step 4 (or last): Review — submit the form
		// If location step exists, skip it
		const isCreateVisible = await formPage.createButton.isVisible().catch(() => false);
		if (!isCreateVisible) {
			// Location step — just click next (location is optional)
			await expect(formPage.nextButton).toBeEnabled();
			await formPage.goToNextStep();
		}

		// Now on review step — click "Create Item"
		await expect(formPage.createButton).toBeVisible();
		await formPage.submitCreate();

		// Modal should close after successful creation
		await formPage.waitForClosed();

		// Verify the created item appears in the list
		await expect(adminPage.getByText(testItemName)).toBeVisible({ timeout: 10_000 });
	});

	test('admin can edit an existing item', async ({ adminPage }) => {
		const itemsPage = new AdminItemsPage(adminPage);
		const formPage = new AdminItemFormPage(adminPage);
		const updatedName = `${testItemName} Updated`;

		await itemsPage.navigate();
		await itemsPage.waitForPageReady();

		// Open the actions menu for the test item and click "Edit"
		await itemsPage.openActionsMenu(testItemName);
		await itemsPage.clickAction('Edit');

		// The edit modal should open
		await formPage.waitForOpen();

		// Update the name on Step 1
		await formPage.nameInput.clear();
		await formPage.nameInput.fill(updatedName);

		// Navigate through all steps to reach the review step
		await expect(formPage.nextButton).toBeEnabled();
		await formPage.goToNextStep(); // → Media & Links

		await expect(formPage.nextButton).toBeEnabled();
		await formPage.goToNextStep(); // → Classification

		await expect(formPage.nextButton).toBeEnabled();
		await formPage.goToNextStep(); // → Review (or Location)

		// If on location step, skip it
		const isUpdateVisible = await formPage.updateButton.isVisible().catch(() => false);
		if (!isUpdateVisible) {
			await expect(formPage.nextButton).toBeEnabled();
			await formPage.goToNextStep();
		}

		// Click "Update Item"
		await expect(formPage.updateButton).toBeVisible();
		await formPage.submitUpdate();

		// Modal should close after successful update
		await formPage.waitForClosed();

		// Verify the updated name appears
		await expect(adminPage.getByText(updatedName)).toBeVisible({ timeout: 10_000 });
	});

	test('admin can delete an item', async ({ adminPage }) => {
		const itemsPage = new AdminItemsPage(adminPage);
		const updatedName = `${testItemName} Updated`;

		await itemsPage.navigate();
		await itemsPage.waitForPageReady();

		// Set up the native confirm dialog handler before triggering delete
		adminPage.on('dialog', async (dialog) => {
			expect(dialog.type()).toBe('confirm');
			await dialog.accept();
		});

		// Open actions menu and click "Delete"
		await itemsPage.openActionsMenu(updatedName);
		await itemsPage.clickAction('Delete');

		// Wait for the item to disappear from the list
		await expect(adminPage.getByText(updatedName).first()).toBeHidden({ timeout: 10_000 });
	});
});
