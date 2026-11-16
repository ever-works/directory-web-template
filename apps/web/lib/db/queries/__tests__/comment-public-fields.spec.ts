import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Item comments are public: `GET /api/items/{slug}/comments` needs no session, and the
 * item page prefetches the same query into its HTML through `HydrationBoundary`. So the
 * `user` object of a comment may only carry public profile fields, never the commenter's
 * email. The queries and the route handler import the database / Next.js and cannot be
 * loaded under `tsx --test`, so these guards read the source.
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

const queries = source('../comment.queries.ts');
const commentRoute = source('../../../../app/api/items/[slug]/comments/[commentId]/route.ts');
const listRoute = source('../../../../app/api/items/[slug]/comments/route.ts');
const commentType = source('../../../types/comment.ts');
const queryTypes = source('../types.ts');

/** The text of one exported function, up to the next top-level export. */
const functionBody = (src: string, signature: string) => {
	const start = src.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found`);
	const next = src.indexOf(' export ', start + signature.length);
	return src.slice(start, next < 0 ? undefined : next);
};

/** The text from `marker` up to the first `end` after it. */
const between = (src: string, marker: string, end: string) => {
	const start = src.indexOf(marker);
	assert.ok(start >= 0, `${marker} not found`);
	const stop = src.indexOf(end, start + marker.length);
	assert.ok(stop > start, `${end} not found after ${marker}`);
	return src.slice(start, stop);
};

/** Each select must still project the public profile fields, so the cut is the right one. */
const assertPublicUserOnly = (select: string, label: string) => {
	assert.ok(select.includes('user: {'), `${label} no longer selects a user object`);
	assert.ok(select.includes('name: clientProfiles.name'), `${label} lost the commenter name`);
	assert.ok(select.includes('image: clientProfiles.avatar'), `${label} lost the commenter avatar`);
	assert.ok(!select.includes('clientProfiles.email'), `${label} selects clientProfiles.email`);
	assert.ok(!/\bemail\s*:/.test(select), `${label} puts an email field in the comment`);
};

describe('public comment responses do not expose commenter emails', () => {
	it('getCommentsByItemId (public GET list and item page HTML) selects no email', () => {
		const body = functionBody(queries, 'export async function getCommentsByItemId(');
		assertPublicUserOnly(between(body, '.select({', '.from(comments)'), 'getCommentsByItemId');
	});

	it('getCommentWithUserById (POST response) selects no email', () => {
		const body = functionBody(queries, 'export async function getCommentWithUserById(');
		assertPublicUserOnly(between(body, '.select({', '.from(comments)'), 'getCommentWithUserById');
	});

	it('the comment PUT response selects no email', () => {
		const put = functionBody(commentRoute, 'export async function PUT(');
		assertPublicUserOnly(between(put, 'const [updatedComment] = await db .select({', '.from(comments)'), 'PUT');
	});

	it('the GET route still answers with getCommentsByItemId, without a session', () => {
		const get = functionBody(listRoute, 'export async function GET(');
		assert.ok(get.includes('getCommentsByItemId('), 'GET no longer reads getCommentsByItemId');
		assert.ok(!get.includes('auth()'), 'GET is expected to stay public');
	});

	it('the CommentWithUser user shapes have no email field', () => {
		for (const [label, src] of [
			['lib/types/comment.ts', commentType],
			['lib/db/queries/types.ts', queryTypes]
		] as const) {
			const user = between(src, 'user: {', '};');
			assert.ok(user.includes('name: string | null;'), `${label} CommentWithUser lost user.name`);
			assert.ok(!/\bemail\s*:/.test(user), `${label} CommentWithUser still declares user.email`);
		}
	});

	it('the OpenAPI comments of both routes document no commenter email', () => {
		for (const [label, src] of [
			['comments/route.ts', listRoute],
			['comments/[commentId]/route.ts', commentRoute]
		] as const) {
			assert.ok(!/[\w.+-]+@example\.com/.test(src), `${label} still shows an example email address`);
			assert.ok(!/\* email:/.test(src), `${label} still documents an email field`);
		}
	});
});
