import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `GET /api/items/{slug}/comments/rating/{commentId}` needs no session, and comment ids are
 * public (the comments list returns them). It read the comment with `getCommentById`, which
 * keeps soft-deleted rows and has no author or item check, ignored the slug and answered with
 * the raw row. So anyone who saw a comment id could still read it after its author deleted it or
 * a moderator removed it, after its author's account was deactivated, and after its item was
 * rejected or moved back to draft (T-2856). The route now answers only for a comment that the
 * public list of that item would show, with the fields the list returns.
 *
 * The route handler and the query import Next.js / the database and cannot be loaded under
 * `tsx --test`, so these guards read the source.
 */
const read = (relative: string) => readFileSync(join(__dirname, relative), 'utf8');
const collapse = (text: string) => text.replace(/\s+/g, ' ');

// The route without its comments, which may name the old query
const route = collapse(
	read('../../../../app/api/items/[slug]/comments/rating/[commentId]/route.ts')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/\/\/[^\n]*/g, ' ')
);
const queries = collapse(read('../comment.queries.ts'));

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

describe('GET comment by id answers only for a comment the public list shows', () => {
	it('getPublicCommentById skips soft-deleted comments and deactivated authors, within the tenant', () => {
		const body = functionBody(queries, 'export async function getPublicCommentById(').replace(/\s+/g, '');
		assert.ok(
			body.includes('innerJoin(clientProfiles,eq(comments.userId,clientProfiles.id))'),
			'no join to the author profile'
		);
		assert.ok(
			body.includes('innerJoin(users,and(eq(users.id,clientProfiles.userId),isNull(users.deactivatedAt)))'),
			'the query does not skip a deactivated author'
		);
		assert.ok(body.includes('.where(and('), 'the query has no and(...) WHERE');
		const where = body.slice(body.indexOf('.where(and('));
		for (const condition of ['eq(comments.id,id)', 'isNull(comments.deletedAt)', 'eq(comments.tenantId,tenantId)']) {
			assert.ok(where.includes(condition), `the query WHERE is missing ${condition}`);
		}
		assert.ok(body.includes('if(!tenantId)returnnull;'), 'the query does not stop without a tenant');
	});

	it('getPublicCommentById selects exactly the fields the public comments list returns', () => {
		const list = between(
			functionBody(queries, 'export async function getCommentsByItemId('),
			'.select({',
			'.from(comments)'
		);
		const one = between(
			functionBody(queries, 'export async function getPublicCommentById('),
			'.select({',
			'.from(comments)'
		);
		assert.equal(one, list, 'getPublicCommentById must select what getCommentsByItemId selects');
		assert.ok(!one.includes('email'), 'the select carries an email');
	});

	it('getCommentById still returns soft-deleted rows for the admin routes and moderation', () => {
		const body = functionBody(queries, 'export async function getCommentById(');
		assert.ok(!body.includes('isNull(comments.deletedAt)'), 'getCommentById must keep deleted rows');
	});

	it('GET reads the comment with getPublicCommentById, never getCommentById', () => {
		const get = functionBody(route, 'export async function GET(');
		assert.ok(get.includes('getPublicCommentById(commentId)'), 'GET does not call getPublicCommentById');
		assert.ok(!get.includes('getCommentById('), 'GET still calls getCommentById, which returns deleted comments');
		assert.ok(!get.includes('auth()'), 'GET is expected to stay public');
	});

	it('GET answers 404 unless the comment belongs to the public item in the URL', () => {
		const get = functionBody(route, 'export async function GET(');
		assert.ok(get.includes('const { slug, commentId } = await params'), 'GET ignores the slug in the URL');
		const found = get.indexOf('return NextResponse.json(comment)');
		assert.ok(found > 0, 'GET no longer answers with the comment');
		for (const check of [
			'findPublicItem(slug)',
			'getPublicCommentById(commentId)',
			'comment.itemId !== getItemIdFromSlug(slug)'
		]) {
			const at = get.indexOf(check);
			assert.ok(at > 0, `GET does not call ${check}`);
			assert.ok(at < found, `${check} must run before GET answers with the comment`);
		}
		const notFound = get.slice(get.indexOf('if (!comment'), found);
		assert.ok(
			notFound.includes('NextResponse.json({ error: "Comment not found" }, { status: 404 })'),
			'GET does not answer 404 Comment not found when a check fails'
		);
	});
});
