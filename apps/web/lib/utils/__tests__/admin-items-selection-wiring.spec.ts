import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * /admin/items cleared the bulk selection only when the page number changed. A status tab, filter,
 * search, sort or view change on page 1 kept the old ids selected after their rows were gone, and the
 * bulk handlers sent every selected id, so a bulk delete (a hard delete) or reject also hit items the
 * admin could no longer see, and the bar and the confirm dialog counted them (T-2814). The confirm
 * dialog counts only the ticked pending rows for approve and reject, but those handlers still sent
 * every ticked row, so a reject on the All tab said "1 item" and rejected (and emailed) every ticked
 * one (T-2824). The page is a client component that cannot load under `tsx --test`, so this guard
 * reads the source; the browser flow is covered by `apps/web-e2e/tests/admin/bulk-actions.spec.ts`.
 */
const page = readFileSync(join(__dirname, '../../../app/[locale]/admin/items/page.tsx'), 'utf8').replace(/\s+/g, ' ');

/** One useCallback handler, from its declaration to the end of its dependency list. */
function handler(name: string): string {
	const start = page.indexOf(`const ${name} = useCallback(`);
	assert.ok(start >= 0, `${name} not found`);
	const end = page.indexOf(']);', start);
	assert.ok(end > start, `${name} has no dependency list`);
	return page.slice(start, end + 3);
}

const QUERY_FIELDS = [
	'currentPage',
	'statusFilter',
	'categoriesFilter',
	'tagsFilter',
	'debouncedSearchTerm',
	'sortBy',
	'sortOrder',
	'viewMode'
];

describe('admin items page bulk selection wiring', () => {
	it('clears the selection whenever the list query changes', () => {
		const resets = [...page.matchAll(/useEffect\(\(\) => \{ setSelectedIds\(new Set\(\)\); \}, \[([^\]]*)\]\);/g)];
		assert.equal(resets.length, 1, 'expected one effect that clears the selection');
		const deps = resets[0][1]
			.split(',')
			.map((dep) => dep.trim())
			.filter(Boolean);
		assert.deepEqual(
			[...deps].sort(),
			[...QUERY_FIELDS].sort(),
			`the selection is cleared on [${deps.join(', ')}], not on every list query field`
		);
	});

	it('keeps only the ids of the rows on screen', () => {
		assert.ok(
			page.includes(
				'const visibleSelectedIds = useMemo( () => new Set(items.filter((item) => selectedIds.has(item.id)).map((item) => item.id)), [items, selectedIds] );'
			),
			'no visibleSelectedIds derived from the current items'
		);
	});

	it('sends only the visible selection to bulk delete', () => {
		assert.ok(!page.includes('Array.from(selectedIds)'), 'a bulk handler still sends every selected id');
		assert.ok(
			handler('handleBulkDelete').includes('await bulkDelete(Array.from(visibleSelectedIds))'),
			'bulk delete does not send the visible ids'
		);
	});

	it('closes the confirm dialog without a delete request when no ticked row is left on screen', () => {
		// The list can refresh while the dialog is open and drop every ticked row; the route answers an
		// empty ids list with a 400, so the handler must close the dialog instead of sending one
		const body = handler('handleBulkDelete');
		const guard = body.indexOf('if (visibleSelectedIds.size === 0) { setBulkAction(null); return; }');
		assert.ok(guard >= 0, 'handleBulkDelete sends a bulk request when no ticked row is on screen');
		assert.ok(guard < body.indexOf('await bulkDelete('), 'handleBulkDelete checks the selection after sending');
	});

	it('works out the ticked pending ids with the shared helper, and counts them for the dialog', () => {
		assert.ok(
			/import \{ pendingSelectedIds \} from ["']@\/lib\/utils\/pending-selected-ids["'];/.test(page),
			'pendingSelectedIds is not imported'
		);
		assert.ok(
			page.includes(
				'const selectedPendingIds = useMemo( () => pendingSelectedIds(items, visibleSelectedIds), [items, visibleSelectedIds] );'
			),
			'no selectedPendingIds derived from the rows on screen with pendingSelectedIds'
		);
		assert.ok(
			page.includes('const pendingSelectedCount = selectedPendingIds.length;'),
			'the dialog count is not the length of the ids approve and reject send'
		);
		assert.ok(page.includes('pendingCount={pendingSelectedCount}'), 'the confirm dialog lost its pending count');
		assert.ok(
			!page.includes("item.status === 'pending'"),
			'the page still counts pending rows with its own filter instead of the helper'
		);
	});

	it('sends approve and reject only for the ticked pending rows the dialog counts', () => {
		for (const [name, call, deps] of [
			[
				'handleBulkApprove',
				'await bulkApprove(selectedPendingIds)',
				'}, [selectedPendingIds, bulkApprove, clearSelection]);'
			],
			[
				'handleBulkReject',
				'await bulkReject(selectedPendingIds, reason)',
				'}, [selectedPendingIds, bulkReject, clearSelection]);'
			]
		]) {
			const body = handler(name);
			assert.ok(body.includes(call), `${name} does not send the ticked pending ids`);
			assert.ok(
				!body.includes('visibleSelectedIds'),
				`${name} still sends every ticked row, not only pending ones`
			);
			assert.ok(body.endsWith(deps), `${name} does not depend on selectedPendingIds`);
		}
	});

	it('closes the confirm dialog without an approve or reject request when no ticked pending row is left', () => {
		// The list can refresh while the dialog is open: the ticked pending rows can be gone or no longer
		// pending. Then there is nothing the dialog counted, so the handler closes it and sends nothing
		for (const [name, call] of [
			['handleBulkApprove', 'await bulkApprove('],
			['handleBulkReject', 'await bulkReject(']
		]) {
			const body = handler(name);
			const guard = body.indexOf('if (selectedPendingIds.length === 0) { setBulkAction(null); return; }');
			assert.ok(guard >= 0, `${name} sends a bulk request when no ticked pending row is on screen`);
			assert.ok(guard < body.indexOf(call), `${name} checks the pending ids after sending`);
		}
	});

	it('counts only the visible selection in the checkbox state, the bar and the confirm dialog', () => {
		assert.ok(
			page.includes('const isAllSelected = items.length > 0 && visibleSelectedIds.size === items.length;'),
			'select-all is not computed from the visible selection'
		);
		assert.ok(
			page.includes(
				'const isPartiallySelected = visibleSelectedIds.size > 0 && visibleSelectedIds.size < items.length;'
			),
			'the partly ticked state is not computed from the visible selection'
		);
		assert.ok(!page.includes('prev.size === items.length'), 'select-all still compares the whole selection');
		assert.ok(page.includes('selectedIds={visibleSelectedIds}'), 'the bulk action bar counts hidden ids');
		assert.ok(page.includes('selectedCount={visibleSelectedIds.size}'), 'the confirm dialog counts hidden ids');
	});
});
