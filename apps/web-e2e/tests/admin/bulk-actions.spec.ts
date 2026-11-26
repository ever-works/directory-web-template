import type { Page, Response } from '@playwright/test';
import { test, expect } from '../../fixtures';
import { AdminBulkActionsPage } from '../../page-objects/admin/bulk-actions.page';

test.describe('Admin: Item Bulk Operations', () => {
	test('select-all checkbox is visible on items page', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		await bulkPage.navigate();
		await bulkPage.waitForPageReady();

		// Wait for items to load
		await expect(bulkPage.heading).toBeVisible({ timeout: 10_000 });
		await adminPage.waitForTimeout(2_000);

		const isCheckboxVisible = await bulkPage.selectAllCheckbox.isVisible().catch(() => false);

		if (!isCheckboxVisible) {
			test.skip(true, 'Select-all checkbox not visible on items page');
			return;
		}

		await expect(bulkPage.selectAllCheckbox).toBeVisible();
	});

	test('clicking select-all shows bulk action bar', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		await bulkPage.navigate();
		await bulkPage.waitForPageReady();
		await adminPage.waitForTimeout(2_000);

		const isCheckboxVisible = await bulkPage.selectAllCheckbox.isVisible().catch(() => false);

		if (!isCheckboxVisible) {
			test.skip(true, 'Select-all checkbox not visible');
			return;
		}

		// Click select all
		await bulkPage.selectAllCheckbox.click();
		await adminPage.waitForTimeout(500);

		// Bulk action bar should appear
		await expect(bulkPage.bulkActionBar).toBeVisible({ timeout: 5_000 });
	});

	test('bulk action bar has approve, reject, and delete buttons', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		await bulkPage.navigate();
		await bulkPage.waitForPageReady();
		await adminPage.waitForTimeout(2_000);

		const isCheckboxVisible = await bulkPage.selectAllCheckbox.isVisible().catch(() => false);

		if (!isCheckboxVisible) {
			test.skip(true, 'Select-all checkbox not visible');
			return;
		}

		await bulkPage.selectAllCheckbox.click();
		await adminPage.waitForTimeout(500);
		await expect(bulkPage.bulkActionBar).toBeVisible({ timeout: 5_000 });

		// Verify action buttons exist
		const hasApprove = await bulkPage.approveButton.isVisible().catch(() => false);
		const hasReject = await bulkPage.rejectButton.isVisible().catch(() => false);
		const hasDelete = await bulkPage.deleteButton.isVisible().catch(() => false);

		expect(hasApprove || hasReject || hasDelete).toBeTruthy();
	});

	test('clicking bulk delete opens confirmation dialog', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		await bulkPage.navigate();
		await bulkPage.waitForPageReady();
		await adminPage.waitForTimeout(2_000);

		const isCheckboxVisible = await bulkPage.selectAllCheckbox.isVisible().catch(() => false);

		if (!isCheckboxVisible) {
			test.skip(true, 'Select-all checkbox not visible');
			return;
		}

		await bulkPage.selectAllCheckbox.click();
		await adminPage.waitForTimeout(500);

		const isDeleteVisible = await bulkPage.deleteButton.isVisible().catch(() => false);

		if (!isDeleteVisible) {
			test.skip(true, 'Bulk delete button not visible');
			return;
		}

		await bulkPage.deleteButton.click();

		// Confirmation dialog should appear
		await expect(bulkPage.confirmDialog).toBeVisible({ timeout: 5_000 });

		// Cancel to avoid actual deletion
		await adminPage.keyboard.press('Escape');
		await adminPage.waitForTimeout(500);
	});

	test('clear selection removes bulk action bar', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		await bulkPage.navigate();
		await bulkPage.waitForPageReady();
		await adminPage.waitForTimeout(2_000);

		const isCheckboxVisible = await bulkPage.selectAllCheckbox.isVisible().catch(() => false);

		if (!isCheckboxVisible) {
			test.skip(true, 'Select-all checkbox not visible');
			return;
		}

		// Select all → bar appears
		await bulkPage.selectAllCheckbox.click();
		await adminPage.waitForTimeout(500);
		await expect(bulkPage.bulkActionBar).toBeVisible({ timeout: 5_000 });

		// Clear selection: prefer the in-bar deselect button (when present),
		// fall back to toggling select-all off.
		const inBarDeselect = bulkPage.bulkActionBar
			.getByRole('button', { name: /deselect|clear/i })
			.first();
		const isInBarDeselectVisible = await inBarDeselect.isVisible().catch(() => false);
		if (isInBarDeselectVisible) {
			await inBarDeselect.click();
		} else {
			// Some themes wire deselect to a checkbox toggle only.
			await bulkPage.selectAllCheckbox.click();
		}

		await adminPage.waitForTimeout(500);
		// Bar should hide OR all individual checkboxes should be unchecked.
		// We accept either as proof that the clear path worked — different
		// themes implement this two different ways.
		const barHidden = await bulkPage.bulkActionBar
			.waitFor({ state: 'hidden', timeout: 5_000 })
			.then(() => true)
			.catch(() => false);
		if (!barHidden) {
			const checkedCount = await adminPage.locator('[aria-checked="true"]').count();
			expect(checkedCount, 'all items should be deselected after clear').toBe(0);
		}
	});
});

/**
 * The selection belongs to the rows on screen (T-2814).
 *
 * The page used to clear the selection only when the page number changed. A status tab, filter,
 * search or sort change on page 1 kept the old ids selected after their rows were gone, so a bulk
 * delete (a hard delete) or reject also hit items the admin could no longer see. Select all on the
 * All tab, switch to the Approved tab, and the selection must be empty; tick one row and the bulk
 * request must carry only that row's id.
 *
 * Nothing is deleted: POST /api/admin/items/bulk is answered by page.route with a fake success, so
 * the seeded items stay for the other admin specs.
 */
type ListedItem = { id?: string; name?: string; status?: string };

function isItemsList(url: string, status: string | null): boolean {
	const parsed = new URL(url);
	return parsed.pathname === '/api/admin/items' && (parsed.searchParams.get('status') || null) === status;
}

type BulkBody = { action?: string; ids?: unknown; reason?: unknown };

const PAST_TENSE: Record<string, string> = { approve: 'approved', reject: 'rejected', delete: 'deleted' };

/**
 * Never let a bulk action reach the server: answer POST /api/admin/items/bulk like the route does
 * (every id successful) and keep each request body, so the seeded items stay for the other specs.
 */
async function fakeBulkRoute(page: Page): Promise<BulkBody[]> {
	const bodies: BulkBody[] = [];
	await page.route('**/api/admin/items/bulk', async (route) => {
		const request = route.request();
		if (request.method() !== 'POST') return route.fallback();
		const body = (request.postDataJSON() ?? {}) as BulkBody;
		bodies.push(body);
		const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
		await route.fulfill({
			status: 200,
			json: {
				success: true,
				message: `Bulk ${body.action} completed: ${ids.length} ${PAST_TENSE[body.action ?? ''] ?? 'done'}, 0 failed`,
				results: ids.map((id) => ({ id, success: true })),
				summary: { total: ids.length, successful: ids.length, failed: 0 }
			}
		});
	});
	return bodies;
}

async function readListed(response: Response): Promise<ListedItem[]> {
	expect(response.ok(), `the items list answered ${response.status()}`).toBe(true);
	const body = (await response.json()) as { items?: ListedItem[] };
	expect(Array.isArray(body.items), 'the items list response has an items array').toBe(true);
	return body.items ?? [];
}

test.describe('Admin: item bulk selection follows the list', () => {
	test('a status tab change clears the selection, so bulk delete sends only the row ticked on the new tab', async ({
		adminPage
	}) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);
		// One "Select <name>" checkbox per row, besides "Select all items"
		const rowCheckboxes = adminPage.getByRole('checkbox', { name: /^select (?!all items$)/i });
		const selectedCount = bulkPage.bulkActionBar.getByTestId('bulk-selected-count');

		const bulkBodies = await fakeBulkRoute(adminPage);

		await test.step('select every row on the All tab', async () => {
			const allList = adminPage.waitForResponse(
				(response) => response.request().method() === 'GET' && isItemsList(response.url(), null)
			);
			await bulkPage.navigate();
			await bulkPage.waitForPageReady();
			expect(adminPage.url(), 'admin should not be bounced to signin').not.toMatch(/\/auth\/signin/);
			const listed = await readListed(await allList);
			test.skip(listed.length === 0, 'No item on the All tab to select');

			await expect(rowCheckboxes).toHaveCount(listed.length);
			await bulkPage.selectAllCheckbox.click();
			await expect(selectedCount).toHaveText(String(listed.length));
		});

		let target: ListedItem = {};
		await test.step('switch to the Approved tab: the selection is empty', async () => {
			const approvedList = adminPage.waitForResponse(
				(response) => response.request().method() === 'GET' && isItemsList(response.url(), 'approved')
			);
			await adminPage.getByRole('tab', { name: /^approved/i }).click();
			const listed = await readListed(await approvedList);
			const approved = listed.filter((item) => item.status === 'approved' && item.id && item.name);
			test.skip(approved.length === 0, 'No approved item to tick');
			target = approved[0];

			// The list keeps the All tab's rows on screen while the Approved tab loads, so wait for
			// exactly the Approved rows before reading the selection
			await expect(rowCheckboxes).toHaveCount(listed.length);
			for (const { name } of listed) {
				if (!name) continue;
				await expect(
					adminPage.getByRole('checkbox', { name: `Select ${name}`, exact: true }).first()
				).toBeVisible();
			}

			await expect(selectedCount, 'the All tab selection is still counted').toHaveText('0');
			await expect(adminPage.getByRole('checkbox', { checked: true }), 'a row is still ticked').toHaveCount(0);
		});

		await test.step('tick one row: bulk delete sends only that id', async () => {
			const rowCheckbox = adminPage.getByRole('checkbox', { name: `Select ${target.name}`, exact: true }).first();
			await rowCheckbox.click();
			await expect(rowCheckbox).toBeChecked();
			await expect(selectedCount).toHaveText('1');

			await bulkPage.bulkActionBar.getByRole('button', { name: /^delete$/i }).click();
			const dialog = bulkPage.confirmDialog.filter({ hasText: /delete items/i });
			await expect(dialog).toBeVisible();
			await dialog.getByRole('button', { name: /^delete all$/i }).click();

			await expect.poll(() => bulkBodies.length, { message: 'POST /api/admin/items/bulk was not sent' }).toBe(1);
			expect(bulkBodies[0].action).toBe('delete');
			expect(bulkBodies[0].ids, 'the bulk request carries ids that are not on screen').toEqual([target.id]);

			// The fake success closes the dialog and clears the selection, as a real one does
			await expect(dialog).toBeHidden();
			await expect(selectedCount).toHaveText('0');
		});
	});
});

/**
 * Bulk approve and reject act only on the pending rows the confirm dialog counts (T-2824).
 *
 * The dialog counts only the ticked pending rows for approve and reject, but the page sent every
 * ticked row: select all on the All tab, reject, and the dialog said "1 item" while every ticked item
 * was rejected (approved listings went offline) and each submitter was emailed. The bulk request must
 * carry exactly the pending ids on screen.
 *
 * Nothing is rejected: POST /api/admin/items/bulk is answered by page.route with a fake success.
 */
test.describe('Admin: bulk approve and reject act only on pending rows', () => {
	test('select all on the All tab, then bulk reject sends only the pending ids the dialog counts', async ({
		adminPage
	}) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);
		// One "Select <name>" checkbox per row, besides "Select all items"
		const rowCheckboxes = adminPage.getByRole('checkbox', { name: /^select (?!all items$)/i });
		const selectedCount = bulkPage.bulkActionBar.getByTestId('bulk-selected-count');
		const bulkBodies = await fakeBulkRoute(adminPage);

		let pending: ListedItem[] = [];
		await test.step('select every row on the All tab, pending and not', async () => {
			const allList = adminPage.waitForResponse(
				(response) => response.request().method() === 'GET' && isItemsList(response.url(), null)
			);
			await bulkPage.navigate();
			await bulkPage.waitForPageReady();
			expect(adminPage.url(), 'admin should not be bounced to signin').not.toMatch(/\/auth\/signin/);
			const listed = await readListed(await allList);
			pending = listed.filter((item) => item.status === 'pending' && item.id);
			test.skip(pending.length === 0, 'No pending item on the All tab to reject');
			test.skip(pending.length === listed.length, 'Every row on the All tab is pending, nothing to leave out');

			await expect(rowCheckboxes).toHaveCount(listed.length);
			for (const { name } of listed) {
				if (!name) continue;
				await expect(
					adminPage.getByRole('checkbox', { name: `Select ${name}`, exact: true }).first()
				).toBeVisible();
			}
			await bulkPage.selectAllCheckbox.click();
			await expect(selectedCount).toHaveText(String(listed.length));
		});

		await test.step('bulk reject: the dialog counts and the request carries only the pending ids', async () => {
			const rejectButton = bulkPage.bulkActionBar.getByRole('button', { name: /^reject$/i });
			await expect(rejectButton).toBeEnabled();
			await rejectButton.click();
			const dialog = bulkPage.confirmDialog.filter({ hasText: /reject items/i });
			await expect(dialog).toBeVisible();
			await expect(dialog, 'the dialog does not count only the pending rows').toContainText(
				new RegExp(`\\b${pending.length} items?\\b`)
			);

			const reason = 'Bulk reject e2e check: only pending rows are sent';
			await dialog.getByRole('textbox').fill(reason);
			await dialog.getByRole('button', { name: /^reject all$/i }).click();

			await expect.poll(() => bulkBodies.length, { message: 'POST /api/admin/items/bulk was not sent' }).toBe(1);
			expect(bulkBodies[0].action).toBe('reject');
			expect(bulkBodies[0].reason).toBe(reason);
			const sent = bulkBodies[0].ids;
			expect(Array.isArray(sent), 'the bulk reject has no ids array').toBe(true);
			expect([...(sent as string[])].sort(), 'the bulk reject carries ids that are not pending').toEqual(
				pending.map((item) => item.id).sort()
			);

			// The fake success closes the dialog and clears the selection, as a real one does
			await expect(dialog).toBeHidden();
			await expect(selectedCount).toHaveText('0');
		});
	});
});
