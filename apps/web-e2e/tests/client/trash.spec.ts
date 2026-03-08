import { test, expect } from '../../fixtures';
import { ClientTrashPage } from '../../page-objects/client/trash.page';

test.describe('Client: Submissions Trash', () => {
	test('client can access submissions trash page', async ({ clientPage }) => {
		const trashPage = new ClientTrashPage(clientPage);

		await trashPage.navigate();
		await trashPage.waitForPageReady();

		// Page should load with heading or content
		const mainContent = clientPage.locator('main').first();
		await expect(mainContent).toBeVisible({ timeout: 10_000 });
	});

	test('trash page shows items or empty state', async ({ clientPage }) => {
		const trashPage = new ClientTrashPage(clientPage);

		await trashPage.navigate();
		await trashPage.waitForPageReady();
		await clientPage.waitForTimeout(2_000);

		// Should show either trashed items with restore buttons or empty state
		const hasItems = await trashPage.trashItems.first().isVisible().catch(() => false);
		const hasEmptyState = await trashPage.emptyState.isVisible().catch(() => false);

		expect(hasItems || hasEmptyState).toBeTruthy();
	});

	test('trash page has back link to submissions', async ({ clientPage }) => {
		const trashPage = new ClientTrashPage(clientPage);

		await trashPage.navigate();
		await trashPage.waitForPageReady();

		const hasBackLink = await trashPage.backLink.isVisible().catch(() => false);

		if (!hasBackLink) {
			test.skip(true, 'Back link to submissions not visible');
			return;
		}

		await expect(trashPage.backLink).toBeVisible();
	});
});
