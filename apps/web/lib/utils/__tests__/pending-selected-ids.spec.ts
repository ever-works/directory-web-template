import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pendingSelectedIds } from '../pending-selected-ids';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * On /admin/items the bulk confirm dialog counted only the ticked pending rows for approve and
 * reject, but the handlers sent every ticked row. Select all on the All tab (one pending item and
 * some approved, draft or rejected ones), reject, and the dialog said "1 item" while every ticked
 * item was rejected and each submitter was emailed (T-2824). The handlers now send this helper's
 * ids, the same list the dialog counts.
 */
const items = [
	{ id: 'approved-1', status: 'approved' },
	{ id: 'pending-1', status: 'pending' },
	{ id: 'draft-1', status: 'draft' },
	{ id: 'rejected-1', status: 'rejected' },
	{ id: 'pending-2', status: 'pending' },
	{ id: 'pending-3', status: 'pending' }
];

describe('pendingSelectedIds', () => {
	it('keeps only the ticked rows that are pending, in list order', () => {
		const selected = new Set(['approved-1', 'pending-1', 'draft-1', 'rejected-1', 'pending-2']);
		assert.deepEqual(pendingSelectedIds(items, selected), ['pending-1', 'pending-2']);
	});

	it('returns every pending id when every row is ticked', () => {
		const selected = new Set(items.map((item) => item.id));
		assert.deepEqual(pendingSelectedIds(items, selected), ['pending-1', 'pending-2', 'pending-3']);
	});

	it('returns nothing when no ticked row is pending', () => {
		assert.deepEqual(pendingSelectedIds(items, new Set(['approved-1', 'draft-1', 'rejected-1'])), []);
		assert.deepEqual(pendingSelectedIds(items, new Set()), []);
		assert.deepEqual(pendingSelectedIds([], new Set(['pending-1'])), []);
	});

	it('ignores a ticked id that is not on screen', () => {
		assert.deepEqual(pendingSelectedIds(items, new Set(['pending-1', 'gone-pending'])), ['pending-1']);
	});

	it('lists a pending id once even when the list repeats it', () => {
		// The bulk route answers duplicate ids with a 400, so a repeated row must not repeat the id
		const repeated = [...items, { id: 'pending-1', status: 'pending' }];
		assert.deepEqual(pendingSelectedIds(repeated, new Set(['pending-1'])), ['pending-1']);
	});
});
