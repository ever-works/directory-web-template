import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { REJECTION_REASON_MIN_LENGTH, REVIEW_NOTES_MAX_LENGTH, validateReviewNotes } from '../review-notes';

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
