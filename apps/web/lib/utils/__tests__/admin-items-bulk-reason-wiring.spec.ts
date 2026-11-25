import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * POST /api/admin/items/bulk checked the reject reason with `reason.trim().length < 10`: a reason that
 * was not a string threw (500, even for approve and delete, which trimmed it too), and a reason of any
 * length was stored on up to 100 items and emailed to every submitter. The bulk reject dialog had the
 * same 10-character floor and no cap. The route imports the DB layer, which cannot load under
 * `tsx --test`, so this guard reads the source; the rules themselves are checked on the helper in
 * `review-notes.spec.ts`.
 */
const read = (p: string) => readFileSync(join(__dirname, p), 'utf8').replace(/\s+/g, ' ');
const route = read('../../../app/api/admin/items/bulk/route.ts');
const dialog = read('../../../components/admin/items/bulk-confirm-dialog.tsx');

describe('admin items bulk route reason wiring', () => {
	it('validates the reject reason with validateReviewNotes', () => {
		assert.ok(
			/import \{ validateReviewNotes \} from '@\/lib\/utils\/review-notes';/.test(route),
			'helper is not imported'
		);
		assert.ok(
			route.includes("if (action === 'reject') { const reasonResult = validateReviewNotes('rejected', reason);"),
			'the reject reason is not validated with validateReviewNotes'
		);
		assert.ok(!route.includes('reason.trim().length < 10'), 'the old untyped 10-character check is still there');
	});

	it('answers 400 for an invalid reason before any item changes', () => {
		const handler = route.indexOf('export async function POST');
		const check = route.indexOf('if (!reasonResult.ok)', handler);
		const review = route.indexOf('await itemRepository.review(', handler);
		assert.ok(check > handler && review > check, 'the reason is not checked before itemRepository.review');
		assert.ok(
			route.includes('{ success: false, error: reasonResult.error }, { status: 400 }'),
			'no 400 response with the helper error'
		);
	});

	it('uses the validated reason for the review and the email, and never trims a raw reason', () => {
		assert.ok(route.includes('rejectionReason = reasonResult.notes;'), 'the validated reason is not kept');
		assert.ok(route.includes('review_notes: rejectionReason'), 'the review does not store the validated reason');
		assert.ok(
			route.includes("sendReviewNotification(item, 'rejected', rejectionReason)"),
			'the email does not carry the validated reason'
		);
		assert.ok(!/reason\??\.trim\(\)/.test(route), 'a raw reason is still trimmed (throws for a non-string)');
		assert.ok(!route.includes('trimmedReason'), 'the unvalidated trimmed reason still reaches a call');
	});
});

describe('admin items bulk reject dialog reason wiring', () => {
	it('uses the shared minimum and cap on the trimmed reason', () => {
		assert.ok(
			/import \{ REJECTION_REASON_MIN_LENGTH, REVIEW_NOTES_MAX_LENGTH \} from ["']@\/lib\/utils\/review-notes["'];/.test(
				dialog
			),
			'the shared constants are not imported'
		);
		assert.ok(
			dialog.includes('const trimmedLength = rejectionReason.trim().length;'),
			'the dialog does not count the trimmed reason'
		);
		assert.ok(dialog.includes('trimmedLength > REVIEW_NOTES_MAX_LENGTH'), 'the dialog has no trimmed 2000 cap');
		assert.ok(
			dialog.includes('trimmedLength >= REJECTION_REASON_MIN_LENGTH && !isReasonTooLong'),
			'the dialog does not apply the shared minimum and the cap'
		);
		assert.ok(!/length >= 10\b/.test(dialog), 'the dialog still hard-codes the 10-character minimum');
	});

	it('shows the trimmed n/2000 counter and disables Reject past the cap, without cutting a paste', () => {
		assert.ok(dialog.includes('{trimmedLength}/{REVIEW_NOTES_MAX_LENGTH}'), 'no trimmed n/2000 counter');
		assert.ok(
			dialog.includes('disabled={isProcessing || !isReasonValid}'),
			'Reject is not disabled for an invalid reason'
		);
		assert.ok(
			dialog.includes('trimmedLength < REJECTION_REASON_MIN_LENGTH'),
			'the minimum-length hint does not follow the trimmed minimum'
		);
		assert.ok(!dialog.includes('maxLength='), 'a raw maxLength would cut a long paste silently');
	});
});
