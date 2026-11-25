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
 * admin could no longer see, and the bar and the confirm dialog counted them (T-2814). The page is a
 * client component that cannot load under `tsx --test`, so this guard reads the source; the browser
 * flow is covered by `apps/web-e2e/tests/admin/bulk-actions.spec.ts`.
 */
const page = readFileSync(join(__dirname, '../../../app/[locale]/admin/items/page.tsx'), 'utf8').replace(/\s+/g, ' ');

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

	it('sends only the visible selection to the bulk actions', () => {
		assert.ok(!page.includes('Array.from(selectedIds)'), 'a bulk handler still sends every selected id');
		assert.ok(
			page.includes('await bulkApprove(Array.from(visibleSelectedIds))'),
			'bulk approve does not send the visible ids'
		);
		assert.ok(
			page.includes('await bulkReject(Array.from(visibleSelectedIds), reason)'),
			'bulk reject does not send the visible ids'
		);
		assert.ok(
			page.includes('await bulkDelete(Array.from(visibleSelectedIds))'),
			'bulk delete does not send the visible ids'
		);
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
