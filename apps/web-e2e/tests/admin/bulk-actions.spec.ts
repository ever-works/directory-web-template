import type { Page, Response } from '@playwright/test';
import { test, expect } from '../../fixtures';
import { AdminBulkActionsPage } from '../../page-objects/admin/bulk-actions.page';

/**
 * Open /admin/items and wait for the All tab's list (T-2825).
 *
 * These cases used to wait a fixed 2 s and then skip when the select-all checkbox was not there
 * yet. Under `next dev` the first compile and load of the page takes longer than that, so all five
 * skipped and a broken bulk bar still passed. They now wait for the list response and skip only
 * when it has no item; the select-all checkbox renders once the list has rows, so it must show.
 * The wait gets the navigation budget: the first `next dev` compile of the page and of the list
 * route took about 31 s here, past the 30 s default.
 */
async function openAllItems(page: Page, bulkPage: AdminBulkActionsPage): Promise<ListedItem[]> {
	const allList = page.waitForResponse(
		(response) => response.request().method() === 'GET' && isItemsList(response.url(), null),
		{ timeout: 60_000 }
	);
	await bulkPage.navigate();
	await bulkPage.waitForPageReady();
	expect(page.url(), 'admin should not be bounced to signin').not.toMatch(/\/auth\/signin/);
	const listed = await readListed(await allList);
	test.skip(listed.length === 0, 'No item on the All tab to select');
	await expect(bulkPage.selectAllCheckbox).toBeVisible();
	return listed;
}

/**
 * Select every row on the All tab and wait for the bulk bar to show them.
 *
 * The bar stays in the page while nothing is selected, faded out (opacity 0) and not clickable, and
 * Playwright counts an element with opacity 0 as visible. So toBeVisible() alone passes before any
 * click: the count badge and the opacity are what show the bar opened.
 */
async function selectAllRows(bulkPage: AdminBulkActionsPage, listed: ListedItem[]): Promise<void> {
	await bulkPage.selectAllCheckbox.click();
	await expect(bulkPage.selectAllCheckbox).toBeChecked();
	await expect(bulkPage.bulkActionBar).toBeVisible();
	await expect(bulkPage.bulkActionBar.getByTestId('bulk-selected-count')).toHaveText(String(listed.length));
	await expect(bulkPage.bulkActionBar, 'the bulk bar did not fade in').toHaveCSS('opacity', '1');
}

test.describe('Admin: Item Bulk Operations', () => {
	test('select-all checkbox is visible on items page', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		await openAllItems(adminPage, bulkPage);

		await expect(bulkPage.heading).toBeVisible();
		await expect(bulkPage.selectAllCheckbox).toBeVisible();
		await expect(bulkPage.selectAllCheckbox).not.toBeChecked();
	});

	test('clicking select-all shows bulk action bar', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		const listed = await openAllItems(adminPage, bulkPage);
		await expect(bulkPage.bulkActionBar, 'the bulk bar shows before any row is selected').toHaveCSS('opacity', '0');

		await selectAllRows(bulkPage, listed);
	});

	test('bulk action bar has approve, reject, and delete buttons', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		const listed = await openAllItems(adminPage, bulkPage);
		await selectAllRows(bulkPage, listed);

		for (const name of [/^approve$/i, /^reject$/i, /^delete$/i]) {
			await expect(bulkPage.bulkActionBar.getByRole('button', { name })).toBeVisible();
		}
	});

	test('clicking bulk delete opens confirmation dialog', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);
		// Cancel must send nothing; if it did, the fake answer keeps the seeded items
		const bulkBodies = await fakeBulkRoute(adminPage);

		const listed = await openAllItems(adminPage, bulkPage);
		await selectAllRows(bulkPage, listed);

		const deleteButton = bulkPage.bulkActionBar.getByRole('button', { name: /^delete$/i });
		await expect(deleteButton).toBeEnabled();
		await deleteButton.click();

		const dialog = bulkPage.confirmDialog.filter({ hasText: /delete items/i });
		await expect(dialog).toBeVisible();
		await expect(dialog).toContainText(new RegExp(`\\b${listed.length} items?\\b`));

		await dialog.getByRole('button', { name: /^cancel$/i }).click();
		await expect(dialog).toBeHidden();
		expect(bulkBodies, 'Cancel sent a bulk request').toHaveLength(0);
	});

	test('clear selection removes bulk action bar', async ({ adminPage }) => {
		const bulkPage = new AdminBulkActionsPage(adminPage);

		const listed = await openAllItems(adminPage, bulkPage);
		await selectAllRows(bulkPage, listed);

		await bulkPage.bulkActionBar.getByRole('button', { name: /deselect|clear/i }).click();

		await expect(bulkPage.bulkActionBar.getByTestId('bulk-selected-count')).toHaveText('0');
		await expect(adminPage.getByRole('checkbox', { checked: true }), 'a row is still ticked').toHaveCount(0);
		await expect(bulkPage.bulkActionBar, 'the bulk bar did not fade out').toHaveCSS('opacity', '0');
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
