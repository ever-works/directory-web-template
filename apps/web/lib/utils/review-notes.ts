/**
 * Validation of the `review_notes` field of `POST /api/admin/items/{id}/review`.
 *
 * The bulk route and the admin reject dialog already require a rejection reason of at least
 * `REJECTION_REASON_MIN_LENGTH` characters, because the submitter reads it in the decision email and
 * on their submissions page. The single-item route accepted a rejection with no reason at all, a
 * non-string value, or a note of any size. Here a rejection needs a trimmed reason within bounds,
 * an approval note is optional but bounded, and an empty approval note is stored as "no note".
 */

/** Shortest accepted rejection reason, after trimming (same rule as the bulk route). */
export const REJECTION_REASON_MIN_LENGTH = 10;

/** Longest accepted review note, after trimming. */
export const REVIEW_NOTES_MAX_LENGTH = 2000;

export type ReviewNotesResult = { ok: true; notes: string | undefined } | { ok: false; error: string };

export function validateReviewNotes(status: 'approved' | 'rejected', raw: unknown): ReviewNotesResult {
	if (raw !== undefined && raw !== null && typeof raw !== 'string') {
		return { ok: false, error: 'review_notes must be a string' };
	}

	const notes = typeof raw === 'string' ? raw.trim() : '';

	if (status === 'rejected' && notes.length < REJECTION_REASON_MIN_LENGTH) {
		return {
			ok: false,
			error: `Rejection reason is required (minimum ${REJECTION_REASON_MIN_LENGTH} characters)`
		};
	}

	if (notes.length > REVIEW_NOTES_MAX_LENGTH) {
		return { ok: false, error: `review_notes must be at most ${REVIEW_NOTES_MAX_LENGTH} characters` };
	}

	return { ok: true, notes: notes || undefined };
}
