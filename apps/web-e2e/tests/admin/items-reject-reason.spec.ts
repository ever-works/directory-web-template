import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../fixtures';
import { AdminItemsPage } from '../../page-objects/admin/items.page';

/**
 * Single-item reject dialog on /admin/items: what the reason textarea tells assistive
 * technology (T-2795, #1195).
 *
 * "Reject item" stays disabled until the trimmed reason has 10 to 2000 characters. The
 * textarea must say the same thing: `aria-invalid="true"` for a typed reason that is too
 * short or over the cap, and an `aria-describedby` that names the `n/2000` counter, plus
 * the minimum-length message while that message shows. It must never name an id that is
 * not in the page.
 *
 * Nothing is submitted: the dialog is closed with Cancel, so the seeded pending item stays
 * pending for items-review.spec.ts.
 */

const COUNT_ID = 'rejectionReasonCount';
const MIN_LENGTH_ID = 'rejectionReasonMinLength';
const MAX_LENGTH = 2000;

/** Every id in the textarea's aria-describedby must point at exactly one element. */
async function expectDescribedByResolves(page: Page, textarea: Locator): Promise<string[]> {
	const ids = ((await textarea.getAttribute('aria-describedby')) ?? '').split(/\s+/).filter(Boolean);
	expect(ids, 'aria-describedby names the n/2000 counter').toContain(COUNT_ID);
	for (const id of ids) {
		await expect(page.locator(`[id="${id}"]`), `aria-describedby names "${id}", which is not in the page`).toHaveCount(1);
	}
	return ids;
}

test.describe('Admin: single-item reject reason (a11y)', () => {
	test('the reason textarea reports a too-short or over-cap reason as invalid and links its messages', async ({
		adminPage,
	}) => {
		const itemsPage = new AdminItemsPage(adminPage);

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
		test.skip(!itemName, 'No pending item available to open the reject dialog');

		await itemsPage.openActionsMenu(itemName!);
		await itemsPage.clickAction('Reject');

		const dialog = itemsPage.rejectModal;
		await expect(dialog).toBeVisible();
		const textarea = itemsPage.rejectionReasonInput;
		const confirmButton = dialog.getByRole('button', { name: /reject item/i });
		const counter = adminPage.locator(`#${COUNT_ID}`);
		const minLengthMessage = adminPage.locator(`#${MIN_LENGTH_ID}`);

		await test.step('empty reason: Reject is disabled and the textarea is not reported invalid', async () => {
			await expect(textarea).toHaveValue('');
			await expect(confirmButton).toBeDisabled();
			await expect(textarea).not.toHaveAttribute('aria-invalid', 'true');
			await expect(minLengthMessage).toHaveCount(0);
			await expect(counter).toHaveText(`0/${MAX_LENGTH}`);
			expect(await expectDescribedByResolves(adminPage, textarea)).not.toContain(MIN_LENGTH_ID);
		});

		await test.step('too-short reason: invalid, and the min-length message is shown and linked', async () => {
			// 12 characters typed, 5 after trimming: the trimmed length is what counts
			await textarea.fill('   Short    ');
			await expect(textarea).toHaveAttribute('aria-invalid', 'true');
			await expect(minLengthMessage).toBeVisible();
			await expect(textarea).toHaveAttribute('aria-describedby', new RegExp(`\\b${MIN_LENGTH_ID}\\b`));
			await expect(counter).toHaveText(`5/${MAX_LENGTH}`);
			await expect(confirmButton).toBeDisabled();
			expect(await expectDescribedByResolves(adminPage, textarea)).toEqual([COUNT_ID, MIN_LENGTH_ID]);
		});

		await test.step('valid reason: not invalid, the min-length message and its reference are gone', async () => {
			await textarea.fill('This reason is long enough to reject the item.');
			await expect(textarea).not.toHaveAttribute('aria-invalid', 'true');
			await expect(minLengthMessage).toHaveCount(0);
			await expect(textarea).not.toHaveAttribute('aria-describedby', new RegExp(`\\b${MIN_LENGTH_ID}\\b`));
			await expect(confirmButton).toBeEnabled();
			expect(await expectDescribedByResolves(adminPage, textarea)).toEqual([COUNT_ID]);
		});

		await test.step('over-cap reason: invalid, the counter shows it is over 2000, Reject is disabled', async () => {
			const overCap = 'a'.repeat(MAX_LENGTH + 1);
			await textarea.fill(overCap);
			// No maxLength on the textarea: the whole paste stays, and Reject is blocked instead
			await expect(textarea).toHaveValue(overCap);
			await expect(textarea).toHaveAttribute('aria-invalid', 'true');
			await expect(counter).toHaveText(`${MAX_LENGTH + 1}/${MAX_LENGTH}`);
			await expect(confirmButton).toBeDisabled();
			await expect(minLengthMessage).toHaveCount(0);
			expect(await expectDescribedByResolves(adminPage, textarea)).toEqual([COUNT_ID]);
		});

		await test.step('Cancel closes the dialog without rejecting the item', async () => {
			await dialog.getByRole('button', { name: /^cancel$/i }).click();
			await expect(dialog).toBeHidden();
		});
	});
});
