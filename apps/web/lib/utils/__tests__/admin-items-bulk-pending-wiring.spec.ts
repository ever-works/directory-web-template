import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * POST /api/admin/items/bulk called itemRepository.review and sent the decision email for every id,
 * whatever the item's status, and neither the repository nor the git service checks it. With the
 * page sending every ticked row, a bulk reject on the All tab took approved listings offline and
 * emailed each submitter, and a bulk approve published drafts and items rejected before (T-2824).
 * Approve and reject now load each item first and leave it alone unless it is pending. The route
 * imports the DB layer, which cannot load under `tsx --test`, so this guard reads the source.
 */
const route = readFileSync(join(__dirname, '../../../app/api/admin/items/bulk/route.ts'), 'utf8').replace(/\s+/g, ' ');

const handler = route.indexOf('export async function POST');
const loop = route.indexOf('for (const id of ids) {', handler);
const firstReview = route.indexOf('await itemRepository.review(', loop);
const firstEmail = route.indexOf('sendReviewNotification(item,', loop);

describe('admin items bulk route pending-only review wiring', () => {
	it('finds the per-id loop and its review calls', () => {
		assert.ok(handler >= 0, 'POST handler not found');
		assert.ok(loop > handler, 'per-id loop not found');
		assert.ok(firstReview > loop, 'itemRepository.review is not called in the loop');
		assert.ok(firstEmail > loop, 'sendReviewNotification is not called in the loop');
	});

	it('loads the item and checks it is pending before any review or email', () => {
		const beforeReview = route.slice(loop, Math.min(firstReview, firstEmail));
		const gate = beforeReview.indexOf("if (action === 'approve' || action === 'reject') {");
		assert.ok(gate >= 0, 'approve and reject are not gated before the review');
		const load = beforeReview.indexOf('await itemRepository.findById(id)', gate);
		assert.ok(load > gate, 'the item is not loaded with itemRepository.findById before the review');
		const check = beforeReview.indexOf("?.status !== 'pending'", load);
		assert.ok(check > load, 'a missing or non-pending item is not caught before the review');
		assert.ok(
			beforeReview
				.slice(check)
				.includes('{ results.push({ id, success: false, error: NOT_PENDING_ERROR }); continue; }'),
			'a missing or non-pending item is not reported as failed and skipped'
		);
	});

	it('reports a skipped item with one fixed message', () => {
		assert.ok(
			route.includes("const NOT_PENDING_ERROR = 'Item is not pending review';"),
			'no NOT_PENDING_ERROR message'
		);
	});

	it('still deletes every id, without the pending check', () => {
		assert.ok(
			route.includes("} else if (action === 'delete') { await itemRepository.delete(id, auditUser);"),
			'bulk delete no longer deletes each id'
		);
		const gate = route.indexOf("if (action === 'approve' || action === 'reject') {", loop);
		assert.ok(!route.slice(gate, firstReview).includes("'delete'"), 'the pending check also stops bulk delete');
	});

	it('documents the pending-only rule in the swagger text', () => {
		const swagger = route.slice(0, handler);
		assert.ok(swagger.includes('Item is not pending review'), 'the swagger text does not name the failed result');
	});
});
