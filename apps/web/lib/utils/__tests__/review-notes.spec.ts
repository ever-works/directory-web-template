import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	isItemStatus,
	REJECTION_REASON_MIN_LENGTH,
	REVIEW_NOTES_MAX_LENGTH,
	reviewNotesRuleForUpdate,
	validateReviewNotes
} from '../review-notes';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `POST /api/admin/items/{id}/review` took `review_notes` as sent: a rejection with no reason went
 * through (and the submitter got a decision email with nothing in it), and a non-string or 10 MB note
 * reached the Git write. The bulk route already required 10 characters for a rejection.
 */
describe('validateReviewNotes', () => {
	it('rejects a rejection with a missing, null, empty, short or blank reason', () => {
		for (const raw of [undefined, null, '', '   ', 'too short', ' 123456789 ', '\n\t\n']) {
			const result = validateReviewNotes('rejected', raw);
			assert.equal(result.ok, false, `accepted ${JSON.stringify(raw)}`);
			if (!result.ok) {
				assert.equal(result.error, 'Rejection reason is required (minimum 10 characters)');
			}
		}
	});

	it('accepts a rejection reason of exactly the minimum length, trimmed', () => {
		const result = validateReviewNotes('rejected', `  ${'a'.repeat(REJECTION_REASON_MIN_LENGTH)}  `);
		assert.deepEqual(result, { ok: true, notes: 'a'.repeat(REJECTION_REASON_MIN_LENGTH) });
	});

	it('keeps an ordinary rejection reason unchanged', () => {
		const reason = 'Duplicate of an existing listing.';
		assert.deepEqual(validateReviewNotes('rejected', reason), { ok: true, notes: reason });
	});

	it('keeps an approval without notes working, and stores a blank note as no note', () => {
		for (const raw of [undefined, null, '', '   ']) {
			assert.deepEqual(validateReviewNotes('approved', raw), { ok: true, notes: undefined });
		}
	});

	it('keeps a short approval note (no minimum for an approval)', () => {
		assert.deepEqual(validateReviewNotes('approved', ' Good '), { ok: true, notes: 'Good' });
	});

	it('rejects a note that is not a string, for either decision', () => {
		for (const status of ['approved', 'rejected'] as const) {
			for (const raw of [123, true, {}, ['a long enough reason'], { length: 20 }]) {
				const result = validateReviewNotes(status, raw);
				assert.deepEqual(result, { ok: false, error: 'review_notes must be a string' });
			}
		}
	});

	it('bounds the note length after trimming', () => {
		const atLimit = 'x'.repeat(REVIEW_NOTES_MAX_LENGTH);
		for (const status of ['approved', 'rejected'] as const) {
			assert.deepEqual(validateReviewNotes(status, ` ${atLimit} `), { ok: true, notes: atLimit });
			const over = validateReviewNotes(status, `${atLimit}x`);
			assert.deepEqual(over, { ok: false, error: 'review_notes must be at most 2000 characters' });
		}
	});
});

/**
 * `PUT /api/admin/items/{id}` stored any `status` it was sent ('published', 'Rejected'), and on an item that was
 * already rejected it treated `review_notes` as optional, so `{ "review_notes": "" }` (or null, or "ok") deleted
 * or shortened the reason the submitter reads.
 */
describe('isItemStatus', () => {
	it('accepts every ITEM_STATUSES value', () => {
		for (const status of ['draft', 'pending', 'approved', 'rejected']) {
			assert.equal(isItemStatus(status), true, `refused ${status}`);
		}
	});

	it('refuses any other value, matched exactly', () => {
		for (const raw of [
			'published',
			'Rejected',
			'REJECTED',
			' rejected',
			'rejected ',
			'',
			null,
			1,
			{},
			['rejected']
		]) {
			assert.equal(isItemStatus(raw), false, `accepted ${JSON.stringify(raw)}`);
		}
	});
});

describe('reviewNotesRuleForUpdate', () => {
	it('needs a reason when the update rejects an item that is not already rejected', () => {
		for (const storedStatus of ['draft', 'pending', 'approved']) {
			for (const notesSent of [false, true]) {
				assert.equal(
					reviewNotesRuleForUpdate({ storedStatus, sentStatus: 'rejected', notesSent }),
					'rejected',
					`${storedStatus} -> rejected, notesSent ${notesSent}`
				);
			}
		}
	});

	it('needs a reason when review_notes is sent for an item that stays rejected', () => {
		for (const sentStatus of [undefined, 'rejected'] as const) {
			assert.equal(
				reviewNotesRuleForUpdate({ storedStatus: 'rejected', sentStatus, notesSent: true }),
				'rejected',
				`status ${sentStatus}`
			);
		}
	});

	it('refuses to blank or shorten the reason of an item that stays rejected', () => {
		for (const sentStatus of [undefined, 'rejected'] as const) {
			const rule = reviewNotesRuleForUpdate({ storedStatus: 'rejected', sentStatus, notesSent: true });
			assert.ok(rule, 'no rule for review_notes on a rejected item');
			for (const raw of ['', '   ', null, 'ok', 'too short']) {
				assert.deepEqual(
					validateReviewNotes(rule, raw),
					{ ok: false, error: 'Rejection reason is required (minimum 10 characters)' },
					`accepted ${JSON.stringify(raw)} (status ${sentStatus})`
				);
			}
		}
	});

	it('needs no reason for other edits of an item that is already rejected', () => {
		for (const sentStatus of [undefined, 'rejected'] as const) {
			assert.equal(reviewNotesRuleForUpdate({ storedStatus: 'rejected', sentStatus, notesSent: false }), null);
		}
	});

	it('keeps review_notes optional but bounded when the item does not end up rejected', () => {
		for (const storedStatus of ['draft', 'pending', 'approved', 'rejected']) {
			for (const sentStatus of [undefined, 'draft', 'pending', 'approved'] as const) {
				if (storedStatus === 'rejected' && sentStatus === undefined) continue;
				assert.equal(reviewNotesRuleForUpdate({ storedStatus, sentStatus, notesSent: true }), 'approved');
				assert.equal(reviewNotesRuleForUpdate({ storedStatus, sentStatus, notesSent: false }), null);
			}
		}
	});

	it('checks nothing when neither a rejection nor review_notes is sent and the item was not loaded', () => {
		for (const sentStatus of [undefined, 'draft', 'pending', 'approved'] as const) {
			assert.equal(reviewNotesRuleForUpdate({ storedStatus: undefined, sentStatus, notesSent: false }), null);
		}
	});
});
