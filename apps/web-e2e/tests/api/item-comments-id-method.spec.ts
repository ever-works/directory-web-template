import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **PUT + DELETE / body / header
 * surface** of the per-comment edit / delete endpoint
 * served by the `PUT` and `DELETE` exports of
 * `apps/web/app/api/items/[slug]/comments/[commentId]/route.ts`.
 *
 * `PUT /api/items/[slug]/comments/[commentId]` and
 * `DELETE /api/items/[slug]/comments/[commentId]` are
 * the **first per-source-file PUT + DELETE smoke** the
 * docs tree publishes for a public per-comment edit /
 * delete route. The companion comment-create POST is
 * documented at
 * [`item-comments-create-body-spec.md`](item-comments-create-body-spec.md);
 * this spec covers the per-`[commentId]` mutating
 * surface.
 *
 * It is also the **first per-source-file PUT or DELETE
 * smoke** the docs tree publishes that pins a
 * **plain-text 401 envelope** instead of a JSON one:
 * the unauth branches return `new NextResponse
 * ('Unauthorized', { status: 401 })` — a plain-text
 * body, NOT JSON. EVERY prior per-source-file
 * mutating-method smoke pins a JSON 401 envelope; this
 * is the FIRST plain-text 401 contract in the rollout.
 *
 * Distinct from the sibling
 * [`item-comments-create-body-spec.md`](item-comments-create-body-spec.md):
 *
 *   - **Plain-text 401 envelope** (NOT JSON like
 *     comments POST).
 *   - **Plain-text 404 / 403 envelopes** for client-
 *     profile / tenant errors (NOT JSON like comments
 *     POST).
 *   - **MIXED-envelope contract:** auth / profile /
 *     tenant errors return PLAIN-TEXT; body-validation
 *     errors (PUT only) return JSON with `{ error }`.
 *     The FIRST per-source-file smoke pinning a mixed
 *     plain-text + JSON envelope contract on the same
 *     handler.
 *   - **Three-step ownership chain:** PUT and DELETE
 *     both call `checkDatabaseAvailability()` first,
 *     then `auth()`, then `getClientProfileByUserId
 *     (...)`, then `getTenantId()`, then a Drizzle
 *     query that filters by `userId === clientProfile.id`
 *     AND `tenantId === <user's tenant>` AND
 *     `deletedAt IS NULL` — embedding the ownership /
 *     tenant / soft-delete filters in a SINGLE query.
 *   - **DELETE returns 204 No Content** (NOT 200 with
 *     a body) — distinct from comments POST's 200
 *     `{ success: true, comment: ... }`.
 *   - **PUT body validation:** `content === undefined
 *     && rating === undefined` → 400 JSON `{ error:
 *     'At least one of content or rating must be
 *     provided' }`. The FIRST per-source-file PUT
 *     smoke pinning a partial-update validation
 *     contract.
 *
 *   1. **`checkDatabaseAvailability()` gate** — load-
 *      bearing FIRST gate. Returns 503 with the
 *      DATABASE_UNAVAILABLE envelope when
 *      `DATABASE_URL` is missing.
 *   2. **`auth()` session lookup** —
 *      `!session?.user?.id` → 401 PLAIN-TEXT
 *      `'Unauthorized'`.
 *   3. **`getClientProfileByUserId(...)` lookup** —
 *      not found → 404 PLAIN-TEXT `'Client profile
 *      not found'`.
 *   4. **`getTenantId()` resolution** — null → 403
 *      PLAIN-TEXT `'Tenant not found'`.
 *   5. **Drizzle ownership query** with embedded
 *      `userId` + `tenantId` + `deletedAt IS NULL`
 *      filters. Comment not found → 404 PLAIN-TEXT
 *      `'Comment not found or not authorized'`.
 *   6. **(PUT only)** body parse + partial-update
 *      validation. Both fields missing → 400 JSON
 *      `{ error: 'At least one of content or rating
 *      must be provided' }`.
 *   7. **(PUT)** `updateComment(...)` →
 *      `commentWithUser` JSON payload (200).
 *      **(DELETE)** `deleteComment(commentId)` →
 *      204 No Content.
 *   8. **Outer catch** — 500 PLAIN-TEXT `'Internal
 *      Server Error'`.
 *   9. **Method-resolution surface** — the route
 *      exports `GET` + `PUT` + `DELETE`. `POST` /
 *      `PATCH` must round-trip to a `< 500` status.
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';
const NON_EXISTENT_COMMENT_ID = '__definitely-not-a-real-comment-id__';
const COMMENTS_ID_PATH = `/api/items/${NON_EXISTENT_SLUG}/comments/${NON_EXISTENT_COMMENT_ID}`;

const ITEM_COMMENTS_ID_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const ITEM_COMMENTS_PUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (validation) if reachable)' },

	// Valid bodies (would proceed to ownership query if reachable).
	{ data: { content: 'Updated content' }, label: 'content-only update' },
	{ data: { rating: 4 }, label: 'rating-only update' },
	{ data: { content: 'Updated', rating: 5 }, label: 'both content and rating' },

	// Validation probes.
	{ data: { content: '' }, label: 'empty content' },
	{ data: { content: 'X'.repeat(2_000) }, label: 'oversized content (>1000 chars)' },
	{ data: { rating: 99 }, label: 'out-of-range rating' },
	{ data: { rating: '5' }, label: 'string rating' },

	// Bypass attempts.
	{ data: { content: 'X', rating: 5, isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { content: 'X', userId: 'fabricated' }, label: 'fabricated userId bypass attempt' }
] as const;

test.describe('API: /api/items/[slug]/comments/[commentId] PUT + DELETE body / header surface', () => {
	for (const { headers, label } of ITEM_COMMENTS_ID_HEADERS) {
		test(`PUT ${COMMENTS_ID_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(COMMENTS_ID_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`DELETE ${COMMENTS_ID_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(COMMENTS_ID_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ITEM_COMMENTS_PUT_BODIES) {
		test(`PUT ${COMMENTS_ID_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(COMMENTS_ID_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`PUT ${COMMENTS_ID_PATH} returns 401 with PLAIN-TEXT Unauthorized body`, async ({ request }) => {
		// `!session?.user?.id` → 401 PLAIN-TEXT
		// `'Unauthorized'` body. NOT JSON. The FIRST
		// per-source-file PUT/DELETE smoke pinning a
		// plain-text 401 envelope.
		const response = await request.put(COMMENTS_ID_PATH);
		expect(response.status()).toBe(401);

		const text = await response.text();
		expect(text).toBe('Unauthorized');

		// Verify it is NOT JSON.
		const contentType = response.headers()['content-type'] || '';
		expect(contentType).not.toContain('application/json');
	});

	test(`DELETE ${COMMENTS_ID_PATH} returns 401 with PLAIN-TEXT Unauthorized body`, async ({ request }) => {
		const response = await request.delete(COMMENTS_ID_PATH);
		expect(response.status()).toBe(401);

		const text = await response.text();
		expect(text).toBe('Unauthorized');

		const contentType = response.headers()['content-type'] || '';
		expect(contentType).not.toContain('application/json');
	});

	test(`PUT ${COMMENTS_ID_PATH} unauth body is NOT a JSON envelope`, async ({ request }) => {
		// Defensive assertion: the unauth body must NOT
		// parse as JSON. A regression that switched to
		// JSON would break clients that expect plain
		// text.
		const response = await request.put(COMMENTS_ID_PATH);
		const text = await response.text();
		// The body should be exactly 'Unauthorized'
		// (no JSON wrapping).
		expect(text).not.toMatch(/^\s*\{/);
		expect(text).not.toMatch(/^\s*\[/);
	});

	test(`DELETE ${COMMENTS_ID_PATH} unauth body is NOT a JSON envelope`, async ({ request }) => {
		const response = await request.delete(COMMENTS_ID_PATH);
		const text = await response.text();
		expect(text).not.toMatch(/^\s*\{/);
		expect(text).not.toMatch(/^\s*\[/);
	});

	test(`PUT ${COMMENTS_ID_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		// The post-auth flow surfaces 'Client profile
		// not found' (404 plain), 'Tenant not found'
		// (403 plain), 'Comment not found or not
		// authorized' (404 plain), 'At least one of
		// content or rating must be provided' (400
		// JSON). The unauth branch must NEVER emit any
		// of these.
		const responses = await Promise.all([
			request.put(COMMENTS_ID_PATH),
			request.put(COMMENTS_ID_PATH, { data: {} }),
			request.put(COMMENTS_ID_PATH, { data: { content: 'X', rating: 5 } })
		]);

		const FORBIDDEN_POST_AUTH_TEXTS = [
			'Client profile not found',
			'Tenant not found',
			'Comment not found or not authorized',
			'At least one of content or rating must be provided',
			'Internal Server Error'
		];

		for (const response of responses) {
			const text = await response.text();
			for (const forbidden of FORBIDDEN_POST_AUTH_TEXTS) {
				expect(text).not.toContain(forbidden);
			}
		}
	});

	test(`DELETE ${COMMENTS_ID_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.delete(COMMENTS_ID_PATH),
			request.delete(COMMENTS_ID_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(COMMENTS_ID_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		const FORBIDDEN_POST_AUTH_TEXTS = [
			'Client profile not found',
			'Tenant not found',
			'Comment not found or not authorized',
			'Internal Server Error'
		];

		for (const response of responses) {
			const text = await response.text();
			for (const forbidden of FORBIDDEN_POST_AUTH_TEXTS) {
				expect(text).not.toContain(forbidden);
			}
		}
	});

	test(`PUT ${COMMENTS_ID_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.put(COMMENTS_ID_PATH);
		const responses = await Promise.all([
			request.put(COMMENTS_ID_PATH, { data: {} }),
			request.put(COMMENTS_ID_PATH, { data: { content: 'X' } }),
			request.put(COMMENTS_ID_PATH, { data: { content: 'X', rating: 5 } }),
			request.put(COMMENTS_ID_PATH, { data: { content: 'X', isAdmin: true } }),
			request.put(COMMENTS_ID_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.put(COMMENTS_ID_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`DELETE ${COMMENTS_ID_PATH} has a stable status across header permutations`, async ({ request }) => {
		const baseline = await request.delete(COMMENTS_ID_PATH);
		const responses = await Promise.all([
			request.delete(COMMENTS_ID_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(COMMENTS_ID_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.delete(COMMENTS_ID_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.delete(COMMENTS_ID_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`Cross-method probe (POST / PATCH) on ${COMMENTS_ID_PATH} does NOT 5xx`, async ({ request }) => {
		// The route exports GET + PUT + DELETE. POST
		// and PATCH must round-trip to `< 500`.
		const responses = await Promise.all([
			request.post(COMMENTS_ID_PATH, { data: { content: 'X' } }),
			request.patch(COMMENTS_ID_PATH, { data: { content: 'X' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${COMMENTS_ID_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// PUT body parse happens AFTER auth + profile
		// + tenant gates. Malformed JSON on the unauth
		// branch must still produce 401 plain-text.
		const responses = await Promise.all([
			request.put(COMMENTS_ID_PATH, { data: 'not-json' }),
			request.put(COMMENTS_ID_PATH, { data: '{ broken: json' }),
			request.put(COMMENTS_ID_PATH, { data: '{"content":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const text = await response.text();
			expect(text).toBe('Unauthorized');
		}
	});

	test(`PUT ${COMMENTS_ID_PATH} body validation chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, an empty PUT body
		// surfaces JSON `{ error: 'At least one of
		// content or rating must be provided' }`. The
		// unauth branch must NEVER emit this JSON
		// envelope — the response must be plain-text.
		const responses = await Promise.all([
			request.put(COMMENTS_ID_PATH, { data: {} }),
			request.put(COMMENTS_ID_PATH, { data: { otherField: 'X' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const text = await response.text();
			expect(text).toBe('Unauthorized');
			// Auth-branch JSON message must NOT appear.
			expect(text).not.toContain('At least one of content or rating');
		}
	});

	test(`PUT + DELETE ${COMMENTS_ID_PATH} ownership Drizzle query is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders the Drizzle
		// ownership query before the auth gate would
		// surface here: the unauth response would echo
		// 'Comment not found or not authorized' (404
		// plain-text). Pin that the unauth branch
		// returns ONLY 'Unauthorized'.
		const responses = await Promise.all([
			request.put(COMMENTS_ID_PATH, { data: { content: 'X' } }),
			request.delete(COMMENTS_ID_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const text = await response.text();
			expect(text).toBe('Unauthorized');
			expect(text).not.toContain('Comment not found');
		}
	});

	test(`PUT + DELETE ${COMMENTS_ID_PATH} updateComment / deleteComment are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders the comment-write
		// logic before the gate would surface here. The
		// unauth response must NEVER be a 204 No Content
		// (DELETE success) or a 200 with a comment body
		// (PUT success).
		const putResponse = await request.put(COMMENTS_ID_PATH, {
			data: { content: 'Updated', rating: 5 }
		});
		expect(putResponse.status()).toBe(401);

		const deleteResponse = await request.delete(COMMENTS_ID_PATH);
		expect(deleteResponse.status()).toBe(401);
		// 204 would be the success branch; assert NOT.
		expect(deleteResponse.status()).not.toBe(204);
	});
});
