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

	it('the reject dialog applies the same trimmed minimum and the 2000 cap', () => {
		const read = (p: string) => readFileSync(join(__dirname, p), 'utf8').replace(/\s+/g, ' ');
		const modal = read('../../../components/admin/items/item-reject-modal.tsx');
		const page = read('../../../app/[locale]/admin/items/page.tsx');
		assert.ok(
			modal.includes('rejectionReason.trim().length >= REJECTION_REASON_MIN_LENGTH'),
			'the dialog counts untrimmed characters'
		);
		assert.ok(modal.includes('maxLength={REVIEW_NOTES_MAX_LENGTH}'), 'the dialog textarea has no 2000 cap');
		assert.ok(
			page.includes('rejectionReason.trim().length < REJECTION_REASON_MIN_LENGTH'),
			'the page sends an untrimmed-length reason'
		);
	});
});
