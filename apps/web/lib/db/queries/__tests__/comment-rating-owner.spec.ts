import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Comment ids are public (the comments list returns them), so only the author of a
 * review may change its star rating. The route handler and the query import Next.js /
 * the database and cannot be loaded under `tsx --test`, so these guards read the source.
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

const route = source('../../../../app/api/items/[slug]/comments/rating/[commentId]/route.ts');
const queries = source('../comment.queries.ts');

/** The text of one exported function, up to the next top-level export. */
const functionBody = (src: string, signature: string) => {
	const start = src.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found`);
	const next = src.indexOf(' export ', start + signature.length);
	return src.slice(start, next < 0 ? undefined : next);
};

describe('comment rating is author-only', () => {
	const patch = functionBody(route, 'export async function PATCH(');

	it('PATCH resolves the caller client profile and uses the owner-scoped update', () => {
		const profile = patch.indexOf('getClientProfileByUserId(session.user.id)');
		const update = patch.indexOf('updateCommentRatingForOwner(commentId, clientProfile.id, rating)');
		assert.ok(profile > 0, 'PATCH does not resolve the client profile of the caller');
		assert.ok(update > profile, 'PATCH does not call updateCommentRatingForOwner with the caller profile id');
	});

	it('PATCH no longer calls an unscoped rating update', () => {
		assert.ok(!/updateCommentRating\(/.test(route), 'the route still calls updateCommentRating');
		assert.ok(!/export async function updateCommentRating\(/.test(queries), 'the unscoped query still exists');
	});

	it('PATCH requires a session user id before it resolves the profile', () => {
		const guard = patch.indexOf('if (!session?.user?.id)');
		assert.ok(guard > 0, 'PATCH does not require session.user.id');
		assert.ok(
			guard < patch.indexOf('getClientProfileByUserId('),
			'the user id guard must run before the profile lookup'
		);
	});

	it('PATCH only accepts an integer rating from 1 to 5', () => {
		assert.ok(patch.includes('!Number.isInteger(rating)'), 'PATCH accepts a non-integer rating');
		assert.ok(patch.includes('rating < 1 || rating > 5'), 'PATCH does not bound the rating to 1-5');
	});

	it('PATCH returns 404 when the caller has no profile or the update matches no row', () => {
		const noProfile = patch.indexOf('if (!clientProfile)');
		const update = patch.indexOf('updateCommentRatingForOwner(');
		assert.ok(noProfile > 0, 'PATCH does not handle a missing client profile');
		// Only the text between the profile check and the update call, so the later
		// "not found" 404 cannot satisfy this assertion.
		const profileBranch = patch.slice(noProfile, update);
		assert.ok(profileBranch.includes('status: 404'), 'PATCH does not return 404 when the caller has no profile');
		const afterUpdate = patch.slice(update);
		assert.ok(
			afterUpdate.includes('"Comment not found or not authorized"') && afterUpdate.includes('status: 404'),
			'PATCH does not return 404 when no row is updated'
		);
	});

	it('the rating update WHERE includes the comment author and skips deleted comments', () => {
		const update = functionBody(queries, 'export async function updateCommentRatingForOwner(').replace(/\s+/g, '');
		const where = update.slice(update.indexOf('.where(and('));
		assert.ok(update.includes('.where(and('), 'the rating update has no and(...) WHERE');
		for (const condition of [
			'eq(comments.id,id)',
			'eq(comments.userId,clientProfileId)',
			'isNull(comments.deletedAt)',
			'eq(comments.tenantId,tenantId)'
		]) {
			assert.ok(where.includes(condition), `the rating update WHERE is missing ${condition}`);
		}
	});

	it('GET stays public and unscoped', () => {
		const get = functionBody(route, 'export async function GET(');
		assert.ok(get.includes('getCommentById(commentId)'));
		assert.ok(!get.includes('getClientProfileByUserId'));
	});
});
