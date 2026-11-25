import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../fixtures';
import { AdminBulkActionsPage } from '../../page-objects/admin/bulk-actions.page';

/**
 * Bulk reject dialog on /admin/items: what the reason textarea tells assistive
 * technology (T-2808).
 *
 * "Reject All" stays disabled until the trimmed reason has 10 to 2000 characters. The
 * textarea must say the same thing: `aria-invalid="true"` for a typed reason that is too
 * short, and an `aria-describedby` that names the `n/2000` counter, plus the
 * minimum-length message while that message shows. It must never name an id that is not
 * in the page.
 *
 * Nothing is submitted: the dialog is closed with Cancel, so the seeded pending items stay
 * pending for items-review.spec.ts and items-reject-reason.spec.ts.
 */

const TEXTAREA_ID = 'bulkRejectionReason';
const COUNT_ID = 'bulkRejectionReasonCount';
const MIN_LENGTH_ID = 'bulkRejectionReasonMinLength';
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

test.describe('Admin: bulk reject reason (a11y)', () => {
	test('the bulk reason textarea reports a too-short reason as invalid and links its messages', async ({
		adminPage,
	}) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		await bulkPage.navigate();
		await bulkPage.waitForPageReady();
		expect(adminPage.url(), 'admin should not be bounced to signin').not.toMatch(/\/auth\/signin/);

		// The list keeps the previous tab's rows on screen while the next tab loads, so read the
		// pending items from the list response and wait until the page shows exactly those rows.
		const pendingList = adminPage.waitForResponse((response) => {
			const url = new URL(response.url());
			return url.pathname === '/api/admin/items' && url.searchParams.get('status') === 'pending';
		});
		await adminPage.getByRole('tab', { name: /^pending/i }).click();
		const body = (await (await pendingList).json().catch(() => ({}))) as {
			items?: Array<{ name?: string; status?: string }>;
		};
		const listed = body.items ?? [];
		test.skip(
			!listed.some((item) => item.status === 'pending'),
			'No pending item available to open the bulk reject dialog'
		);

		// One "Select <name>" checkbox per row, besides "Select all items"
		await expect(adminPage.getByRole('checkbox', { name: /^select (?!all items$)/i })).toHaveCount(listed.length);
		await bulkPage.selectAllCheckbox.click();
		await expect(bulkPage.bulkActionBar).toBeVisible();

		const bulkReject = bulkPage.bulkActionBar.getByRole('button', { name: /^reject$/i });
		await expect(bulkReject, 'bulk Reject needs a pending item in the selection').toBeEnabled();
		await bulkReject.click();

		const dialog = bulkPage.confirmDialog.filter({ hasText: /reject items/i });
		await expect(dialog).toBeVisible();
		const textarea = dialog.locator(`#${TEXTAREA_ID}`);
		const confirmButton = dialog.getByRole('button', { name: /reject all/i });
		const counter = adminPage.locator(`#${COUNT_ID}`);
		const minLengthMessage = adminPage.locator(`#${MIN_LENGTH_ID}`);

		await test.step('empty reason: Reject All is disabled and the textarea is not reported invalid', async () => {
			await expect(textarea).toHaveValue('');
			await expect(confirmButton).toBeDisabled();
			await expect(textarea).not.toHaveAttribute('aria-invalid', 'true');
			await expect(minLengthMessage).toHaveCount(0);
			await expect(counter).toHaveText(`0/${MAX_LENGTH}`);
			expect(await expectDescribedByResolves(adminPage, textarea)).toEqual([COUNT_ID]);
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
			await textarea.fill('This reason is long enough to reject the items.');
			await expect(textarea).not.toHaveAttribute('aria-invalid', 'true');
			await expect(minLengthMessage).toHaveCount(0);
			await expect(textarea).not.toHaveAttribute('aria-describedby', new RegExp(`\\b${MIN_LENGTH_ID}\\b`));
			await expect(confirmButton).toBeEnabled();
			expect(await expectDescribedByResolves(adminPage, textarea)).toEqual([COUNT_ID]);
		});

		await test.step('Cancel closes the dialog without rejecting the items', async () => {
			await dialog.getByRole('button', { name: /^cancel$/i }).click();
			await expect(dialog).toBeHidden();
		});
	});
});
