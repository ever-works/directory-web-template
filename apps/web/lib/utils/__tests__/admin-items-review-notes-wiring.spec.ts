import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * POST /api/admin/items/{id}/review passed `review_notes` straight to the repository, so a rejection
 * needed no reason. The route imports the DB layer, which cannot load under `tsx --test`, so this guard
 * reads the source; the rules themselves are checked on the helper in `review-notes.spec.ts`.
 */
const routePath = join(__dirname, '../../../app/api/admin/items/[id]/review/route.ts');
const source = readFileSync(routePath, 'utf8').replace(/\s+/g, ' ');

describe('admin item review route review_notes wiring', () => {
	it('validates review_notes with validateReviewNotes', () => {
		assert.ok(source.includes("from '@/lib/utils/review-notes'"), 'helper is not imported');
		assert.ok(source.includes('validateReviewNotes(status, rawReviewNotes)'), 'notes are not validated');
	});

	it('answers 400 for invalid notes before the repository call', () => {
		const handler = source.indexOf('export async function POST');
		const check = source.indexOf('if (!notesResult.ok)', handler);
		const review = source.indexOf('await itemRepository.review(');
		assert.ok(check > handler && review > check, 'notes are not checked before itemRepository.review');
		assert.ok(
			source.includes('{ success: false, error: notesResult.error }, { status: 400 }'),
			'no 400 response for invalid notes'
		);
	});

	it('passes only the validated notes to the repository and the email', () => {
		assert.ok(source.includes('const review_notes = notesResult.notes;'), 'validated notes are not used');
		assert.ok(!source.includes('rawReviewNotes,'), 'the raw value still reaches a call');
	});

	it('the reject dialog applies the same trimmed minimum and trimmed 2000 cap, without cutting a paste', () => {
		const read = (p: string) => readFileSync(join(__dirname, p), 'utf8').replace(/\s+/g, ' ');
		const modal = read('../../../components/admin/items/item-reject-modal.tsx');
		const page = read('../../../app/[locale]/admin/items/page.tsx');
		assert.ok(
			modal.includes('const trimmedLength = rejectionReason.trim().length;'),
			'the dialog counts untrimmed characters'
		);
		assert.ok(
			modal.includes('trimmedLength >= REJECTION_REASON_MIN_LENGTH && !isReasonTooLong'),
			'the dialog does not apply the trimmed minimum and the cap'
		);
		assert.ok(modal.includes('trimmedLength > REVIEW_NOTES_MAX_LENGTH'), 'the dialog has no trimmed 2000 cap');
		assert.ok(!modal.includes('maxLength='), 'a raw maxLength would cut a long paste silently');
		assert.ok(
			page.includes('const reasonLength = rejectionReason.trim().length;'),
			'the page sends an untrimmed-length reason'
		);
		assert.ok(
			page.includes('reasonLength < REJECTION_REASON_MIN_LENGTH') &&
				page.includes('reasonLength > REVIEW_NOTES_MAX_LENGTH'),
			'the page does not apply the trimmed minimum and cap'
		);
	});

	const modalPath = join(__dirname, '../../../components/admin/items/item-reject-modal.tsx');
	const readModal = () => readFileSync(modalPath, 'utf8').replace(/\s+/g, ' ');

	it('the reject dialog marks a too-short reason aria-invalid, like the rule that disables Reject', () => {
		const modal = readModal();
		assert.ok(
			modal.includes('aria-invalid={rejectionReason.length > 0 && !isReasonValid}'),
			'a too-short reason is not marked aria-invalid'
		);
		assert.ok(!modal.includes('aria-invalid={isReasonTooLong}'), 'aria-invalid still covers only the 2000 cap');
	});

	it('the reject dialog links its min-length message to the textarea while it shows, keeping the counter', () => {
		const modal = readModal();
		assert.ok(
			modal.includes('{isReasonTooShort && ( <p id="rejectionReasonMinLength"'),
			'the min-length message has no id'
		);
		const describedBy = /aria-describedby=\{([^}]*)\}/.exec(modal)?.[1].trim() ?? '';
		assert.equal(
			describedBy,
			"isReasonTooShort ? 'rejectionReasonCount rejectionReasonMinLength' : 'rejectionReasonCount'",
			'aria-describedby does not name the min-length message while it shows'
		);
		assert.ok(modal.includes('<p id="rejectionReasonCount"'), 'the counter lost its id');
	});
});
