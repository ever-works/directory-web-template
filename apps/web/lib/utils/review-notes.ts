/**
 * Validation of the `review_notes` field of `POST /api/admin/items/{id}/review`.
 *
 * The bulk route and the admin reject dialog already require a rejection reason of at least
 * `REJECTION_REASON_MIN_LENGTH` characters, because the submitter reads it in the decision email and
 * on their submissions page. The single-item route accepted a rejection with no reason at all, a
 * non-string value, or a note of any size. Here a rejection needs a trimmed reason within bounds,
 * an approval note is optional but bounded, and an empty approval note is stored as "no note".
 *
 * `PUT /api/admin/items/{id}` picks which of those rules applies with `reviewNotesRuleForUpdate`, and checks
 * the `status` it stores with `isItemStatus`.
 */

import { ITEM_STATUSES, type ItemStatus } from '@/lib/types/item';

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

const ITEM_STATUS_VALUES: readonly string[] = Object.values(ITEM_STATUSES);

/** True for one of `ITEM_STATUSES`, matched exactly: 'published' or 'Rejected' is not a status. */
export function isItemStatus(value: unknown): value is ItemStatus {
	return typeof value === 'string' && ITEM_STATUS_VALUES.includes(value);
}

/**
 * The `review_notes` rule of an admin item update (`PUT /api/admin/items/{id}`):
 * - 'rejected' (a reason is required) when the item ends up rejected (the sent status, else the stored one) and
 *   either it was not rejected before or the request sends `review_notes`. Rejecting an item is a review
 *   decision its submitter reads, and a note sent for an item that stays rejected replaces that reason, so it
 *   can be neither left out nor blanked or shortened.
 * - 'approved' (optional, bounded) when `review_notes` is sent for an item that does not end up rejected.
 * - null when `review_notes` is not sent and the item is not newly rejected: other edits need no reason.
 *
 * `storedStatus` may be undefined when the route did not load the item (no rejection and no `review_notes`).
 */
export function reviewNotesRuleForUpdate({
	storedStatus,
	sentStatus,
	notesSent
}: {
	storedStatus: string | undefined;
	sentStatus: ItemStatus | undefined;
	notesSent: boolean;
}): 'approved' | 'rejected' | null {
	const resultingStatus = sentStatus ?? storedStatus;
	if (resultingStatus === ITEM_STATUSES.REJECTED && (storedStatus !== ITEM_STATUSES.REJECTED || notesSent)) {
		return 'rejected';
	}
	return notesSent ? 'approved' : null;
}
