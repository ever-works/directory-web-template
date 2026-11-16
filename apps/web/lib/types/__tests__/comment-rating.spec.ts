import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { EMPTY_COMMENT_RATING, type CommentRatingSummary } from '../comment-rating';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `useComments` needs React and a query client, which `tsx --test` does not provide, so the
 * default is tested here and the hook is checked by reading its source.
 */
const hookSource = readFileSync(join(__dirname, '../../../hooks/use-comments.ts'), 'utf8').replace(/\s+/g, ' ');

describe('commentRating default', () => {
	it('has the same shape the rating route answers with', () => {
		const sample: CommentRatingSummary = { averageRating: 4.2, totalRatings: 15 };
		assert.deepEqual(Object.keys(EMPTY_COMMENT_RATING).sort(), Object.keys(sample).sort());
		assert.equal(EMPTY_COMMENT_RATING.averageRating, 0);
		assert.equal(EMPTY_COMMENT_RATING.totalRatings, 0);
	});

	it('cannot be changed by a consumer', () => {
		assert.ok(Object.isFrozen(EMPTY_COMMENT_RATING));
	});
});

describe('useComments commentRating', () => {
	it('types the query as the summary object and defaults to the empty summary', () => {
		assert.match(hookSource, /commentRating = EMPTY_COMMENT_RATING/);
		assert.match(hookSource, /useQuery<CommentRatingSummary>\(/);
	});

	it('no longer defaults to the number 0', () => {
		assert.doesNotMatch(hookSource, /commentRating = 0\b/);
	});
});
