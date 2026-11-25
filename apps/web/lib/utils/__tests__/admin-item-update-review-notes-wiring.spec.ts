import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * PUT /api/admin/items/{id} spread the body straight into the update, so the admin edit form (Review step,
 * status Rejected) or a direct PUT rejected an item with no reason, and a review_notes value that was not a
 * string, or of any size, was stored. The route imports the DB layer and the form is React, neither of which
 * loads under `tsx --test`, so this guard reads the source; the rules themselves are checked on the helper
 * in `review-notes.spec.ts`.
 */
const read = (p: string) => readFileSync(join(__dirname, p), 'utf8').replace(/\s+/g, ' ');
const route = read('../../../app/api/admin/items/[id]/route.ts');
const putSwagger = route
	.slice(route.indexOf(' put: '), route.indexOf('export async function PUT'))
	.replace(/ \*(?= )/g, '');
const putHandler = route.slice(
	route.indexOf('export async function PUT'),
	route.indexOf('export async function DELETE')
);
const reviewStep = read('../../../components/admin/items/form-steps/review-step.tsx');
const form = read('../../../components/admin/items/multi-step-item-form.tsx');

describe('admin item update (PUT) review_notes wiring', () => {
	it('validates review_notes with validateReviewNotes', () => {
		assert.ok(route.includes("from '@/lib/utils/review-notes'"), 'helper is not imported');
		assert.ok(
			putHandler.includes("validateReviewNotes(isNewRejection ? 'rejected' : 'approved', body.review_notes)"),
			'review_notes is not validated'
		);
	});

	it('loads the stored item for a rejection and needs a reason only when the item is not already rejected', () => {
		const statusCheck = putHandler.indexOf('if (body?.status === ITEM_STATUSES.REJECTED)');
		// includeDeleted: the same items itemRepository.update reads, so a soft-deleted item does not turn into a 404
		const load = putHandler.indexOf('await itemRepository.findById(resolvedParams.id, true)');
		assert.ok(statusCheck >= 0 && load > statusCheck, 'the stored item is not loaded for a rejection');
		assert.ok(
			putHandler.includes('isNewRejection = existing.status !== ITEM_STATUSES.REJECTED;'),
			'editing an item that is already rejected would need a new reason'
		);
		assert.ok(
			putHandler.includes('if (isNewRejection || body?.review_notes !== undefined)'),
			'review_notes is not checked whenever it is sent'
		);
	});

	it('answers 400 for invalid notes before itemRepository.update and stores only the trimmed notes', () => {
		const check = putHandler.indexOf('if (!notesResult.ok)');
		const store = putHandler.indexOf('updateData.review_notes = notesResult.notes;');
		const update = putHandler.indexOf('await itemRepository.update(');
		assert.ok(check >= 0 && update > check, 'notes are not checked before itemRepository.update');
		assert.ok(
			putHandler.includes('{ success: false, error: notesResult.error }, { status: 400 }'),
			'no 400 response for invalid notes'
		);
		assert.ok(store > check && update > store, 'the raw review_notes value reaches the update');
	});

	it('documents the rule in the swagger block and in openapi.json', () => {
		assert.ok(putSwagger.includes('review_notes: type: string'), 'the swagger block does not list review_notes');
		assert.ok(putSwagger.includes('400: description:'), 'the swagger block has no 400 response');
		const spec = JSON.parse(readFileSync(join(__dirname, '../../../public/openapi.json'), 'utf8'));
		const put = spec.paths['/api/admin/items/{id}'].put;
		const notes = put.requestBody.content['application/json'].schema.properties.review_notes;
		assert.equal(notes?.type, 'string', 'openapi.json does not list review_notes');
		assert.match(notes.description, /rejected/, 'openapi.json does not describe the rejection rule');
		assert.ok(put.responses['400'], 'openapi.json has no 400 response');
	});
});

describe('admin edit form Review step rejection reason wiring', () => {
	it('asks for a reason only when the edit rejects an item that is not already rejected', () => {
		assert.ok(
			form.includes(
				"const rejectionReasonRequired = mode === 'edit' && formData.review.status === ITEM_STATUSES.REJECTED && item?.status !== ITEM_STATUSES.REJECTED;"
			),
			'the form does not work out when a reason is needed'
		);
		assert.ok(
			form.includes('rejectionReasonRequired={rejectionReasonRequired}'),
			'the Review step is not told a reason is needed'
		);
		assert.ok(reviewStep.includes('{rejectionReasonRequired && ('), 'the Review step has no reason textarea');
	});

	it('applies the trimmed minimum and the trimmed n/2000 counter of the reject dialog, without cutting a paste', () => {
		assert.ok(reviewStep.includes("from '@/lib/utils/review-notes'"), 'the shared limits are not imported');
		assert.ok(
			reviewStep.includes("const reasonLength = (data.review_notes ?? '').trim().length;"),
			'the step counts untrimmed characters'
		);
		assert.ok(
			reviewStep.includes('reasonLength >= REJECTION_REASON_MIN_LENGTH && !isReasonTooLong'),
			'the step does not apply the trimmed minimum and the cap'
		);
		assert.ok(reviewStep.includes('reasonLength > REVIEW_NOTES_MAX_LENGTH'), 'the step has no trimmed 2000 cap');
		assert.ok(reviewStep.includes('{reasonLength}/{REVIEW_NOTES_MAX_LENGTH}'), 'the step has no n/2000 counter');
		assert.ok(
			reviewStep.includes('if (rejectionReasonRequired && !isReasonValid)'),
			'an invalid reason does not block saving'
		);
		assert.ok(!reviewStep.includes('maxLength='), 'a raw maxLength would cut a long paste silently');
	});

	it('sends the reason as review_notes only with that rejection', () => {
		assert.ok(
			form.includes('const { review_notes: reviewNotes, ...review } = formData.review;'),
			'the reason is not split from the other review fields'
		);
		assert.ok(
			form.includes('...(rejectionReasonRequired ? { review_notes: reviewNotes } : {})'),
			'the reason is not sent as review_notes with the rejection'
		);
	});
});
