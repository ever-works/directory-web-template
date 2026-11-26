import { test, expect } from '../../fixtures';
import { AdminItemsPage } from '../../page-objects/admin/items.page';
import { AdminItemFormPage } from '../../page-objects/admin/item-form.page';

/**
 * Rejection reason on the Review step of the admin Edit form on /admin/items (T-2810, #1193).
 *
 * Choosing Rejected for an item that is not rejected yet is a review decision its submitter
 * reads, so the step then asks for a reason, like the reject dialog: "Update Item" stays
 * disabled until the trimmed reason has 10 to 2000 characters. Without the field an admin
 * could reject an item from this form and leave its submitter no reason at all.
 *
 * Nothing is saved: the form is closed with Cancel, so the seeded pending item stays
 * pending for items-review.spec.ts.
 */

const REASON_ID = 'review_notes';
const COUNT_ID = 'review_notes_count';
const ERROR_ID = 'review_notes_error';
const MAX_LENGTH = 2000;

test.describe('Admin: rejection reason on the item edit form', () => {
	test('rejecting a pending item on the Review step needs a 10 to 2000 character reason', async ({ adminPage }) => {
		const itemsPage = new AdminItemsPage(adminPage);
		const formPage = new AdminItemFormPage(adminPage);

		await itemsPage.navigate();
		await itemsPage.waitForPageReady();
		expect(adminPage.url(), 'admin should not be bounced to signin').not.toMatch(/\/auth\/signin/);

		// The list keeps the previous tab's rows on screen while the next tab loads, so take
		// the item from the pending list response rather than from whatever row shows first.
		const pendingList = adminPage.waitForResponse((response) => {
			const url = new URL(response.url());
			return url.pathname === '/api/admin/items' && url.searchParams.get('status') === 'pending';
		});
		await itemsPage.selectStatusTab('Pending');
		const body = (await (await pendingList).json().catch(() => ({}))) as {
			items?: Array<{ name?: string; status?: string }>;
		};
		const itemName = body.items?.find((item) => item.status === 'pending' && item.name)?.name;
		test.skip(!itemName, 'No pending item available to open the edit form');

		// Every write to an item is recorded, so the spec can show that it saved nothing.
		const itemWrites: string[] = [];
		adminPage.on('request', (request) => {
			if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith('/api/admin/items/')) {
				itemWrites.push(`${request.method()} ${new URL(request.url()).pathname}`);
			}
		});

		await itemsPage.openActionsMenu(itemName!);
		await itemsPage.clickAction('Edit');
		await expect(formPage.nameInput).toHaveValue(itemName!);

		await test.step('walk the Edit form to the Review step', async () => {
			await expect(formPage.nextButton).toBeEnabled();
			await formPage.goToNextStep();

			await expect(formPage.sourceUrlInput).toBeVisible();
			await expect(formPage.nextButton).toBeEnabled();
			await formPage.goToNextStep();

			await expect(formPage.categoryInput).toBeVisible();
			// The step needs a category and a tag to go on, and the item may lack one, so add one
			// of each. Nothing is saved.
			await formPage.addCategory('Web Development');
			await formPage.addTag('e2e-edit-reject-reason');
			await expect(formPage.nextButton).toBeEnabled();
			await formPage.goToNextStep();

			await expect(formPage.categoryInput).toBeHidden();
			if (!(await formPage.updateButton.isVisible())) {
				// The Location step shows only when the location feature is on; it is optional.
				await expect(formPage.nextButton).toBeEnabled();
				await formPage.goToNextStep();
			}
			await expect(formPage.updateButton).toBeVisible();
		});

		const reason = formPage.modal.locator(`#${REASON_ID}`);
		const counter = formPage.modal.locator(`#${COUNT_ID}`);
		const minLengthMessage = formPage.modal.locator(`#${ERROR_ID}`);

		await test.step('status unchanged: no reason field, and Update is enabled', async () => {
			await expect(reason).toHaveCount(0);
			await expect(formPage.updateButton).toBeEnabled();
		});

		await test.step('choose Rejected: the reason field shows at 0/2000 and Update is disabled', async () => {
			// The status control is a button that names the current status; its options are buttons too.
			await formPage.modal.getByRole('button', { name: /^pending review/i }).click();
			await formPage.modal.getByRole('button', { name: /^rejected/i }).click();

			await expect(reason).toBeVisible();
			await expect(reason).toHaveValue('');
			await expect(counter).toHaveText(`0/${MAX_LENGTH}`);
			await expect(formPage.updateButton).toBeDisabled();
		});

		await test.step('too-short reason: invalid, the min-length message shows, Update is disabled', async () => {
			// 12 characters typed, 5 after trimming: the trimmed length is what counts
			await reason.fill('   Short    ');
			await expect(counter).toHaveText(`5/${MAX_LENGTH}`);
			await expect(reason).toHaveAttribute('aria-invalid', 'true');
			await expect(minLengthMessage).toBeVisible();
			await expect(reason).toHaveAttribute('aria-describedby', new RegExp(`\\b${ERROR_ID}\\b`));
			await expect(formPage.updateButton).toBeDisabled();
		});

		await test.step('reason of 10 characters or more: Update is enabled', async () => {
			await reason.fill('This item does not meet the listing guidelines.');
			await expect(reason).not.toHaveAttribute('aria-invalid', 'true');
			await expect(minLengthMessage).toHaveCount(0);
			await expect(formPage.updateButton).toBeEnabled();
		});

		await test.step('reason over 2000 characters: the whole paste stays and Update is disabled', async () => {
			const overCap = 'a'.repeat(MAX_LENGTH + 1);
			await reason.fill(overCap);
			// No maxLength on the textarea: the whole paste stays, and Update is blocked instead
			await expect(reason).toHaveValue(overCap);
			await expect(counter).toHaveText(`${MAX_LENGTH + 1}/${MAX_LENGTH}`);
			await expect(reason).toHaveAttribute('aria-invalid', 'true');
			await expect(formPage.updateButton).toBeDisabled();
		});

		await test.step('Cancel closes the form without saving the item', async () => {
			await formPage.cancel();
			await formPage.waitForClosed();
			expect(itemWrites, 'the edit form saved the item').toEqual([]);
		});
	});
});
