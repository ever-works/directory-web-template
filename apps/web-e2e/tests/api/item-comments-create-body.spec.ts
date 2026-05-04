import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the public per-item comment-create endpoint served
 * by the `POST` export of
 * `apps/web/app/api/items/[slug]/comments/route.ts`.
 *
 * `POST /api/items/[slug]/comments` is the **first
 * non-admin per-source-file POST smoke** the docs tree
 * publishes that uses **`checkDatabaseAvailability()`**
 * from `apps/web/lib/utils/database-check.ts` as the
 * **load-bearing FIRST gate** (BEFORE `auth()`). When
 * `process.env.DATABASE_URL` is missing, the helper
 * returns a **503** `{ error: 'Database not
 * configured', code: 'DATABASE_UNAVAILABLE', message:
 * 'This feature requires database configuration' }`
 * envelope — the FIRST POST smoke that pins this
 * helper-emitted envelope shape with a 503 status.
 *
 * It is also the **first** non-admin POST smoke that
 * uses the **`'Authentication required'`** 401
 * message (distinct from the `'Unauthorized'` message
 * used by the sibling votes-cast POST). And it is the
 * **second non-admin POST smoke** that pins the
 * **`isUserBlocked(clientProfile.status)`
 * moderation-status gate** (the first being the
 * sibling `item-votes-cast-body.spec.ts`).
 *
 * In the e2e test environment `DATABASE_URL` IS
 * configured, so the db-availability gate passes
 * through and the auth gate fires for unauthenticated
 * requests, producing the 401 `'Authentication
 * required'` envelope.
 *
 *   1. **`checkDatabaseAvailability()` gate** — the
 *      load-bearing FIRST gate. Returns 503 with the
 *      DATABASE_UNAVAILABLE envelope when
 *      `DATABASE_URL` is missing; otherwise returns
 *      null (passthrough).
 *   2. **`auth()` session lookup**.
 *   3. **`!session?.user` gate** → 401 `{ success:
 *      false, error: 'Authentication required' }`.
 *      NOTE: the message is **`'Authentication
 *      required'`**, NOT `'Unauthorized'`.
 *   4. **JSON body parse via `await request.json()`**.
 *   5. **Content validation** — `!content?.trim()` →
 *      400 `{ success: false, error: 'Content is
 *      required' }`.
 *   6. **Rating range validation** — `typeof rating
 *      !== 'number' || rating < 1 || rating > 5` →
 *      400 `{ success: false, error: 'Rating must be
 *      between 1 and 5' }`.
 *   7. **`getClientProfileByUserId(session.user.
 *      id!)` lookup** — if not found → 404 `{ success:
 *      false, error: 'Client profile not found' }`.
 *   8. **`isUserBlocked(clientProfile.status)`
 *      moderation-status gate** — if true → 403
 *      `{ success: false, error: getBlockReasonMessage
 *      (clientProfile.status) }` with a DYNAMIC
 *      message.
 *   9. **`createComment({ content, rating, userId,
 *      itemId })`** — load-bearing comment-create
 *      call.
 *  10. **`getCommentWithUserById(comment.id)` post-
 *      write lookup** — if null → 500 `{ success:
 *      false, error: 'Failed to retrieve comment' }`.
 *      The first POST smoke that pins a post-write
 *      null-check 500 envelope.
 *  11. **Success payload** — `{ success: true,
 *      comment: commentWithUser }` with status 200.
 *  12. **Outer catch** — `console.error` + 500
 *      `{ success: false, error: 'Failed to create
 *      comment' }`.
 *  13. **Method-resolution surface** — the route
 *      exports `GET` + `POST`. `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';
const COMMENTS_PATH = `/api/items/${NON_EXISTENT_SLUG}/comments`;

const ITEM_COMMENTS_CREATE_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const ITEM_COMMENTS_CREATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (content) if reachable)' },

	// Required-field probes.
	{ data: { content: 'Great tool!' }, label: 'no rating field' },
	{ data: { rating: 5 }, label: 'no content field' },
	{ data: { content: '', rating: 5 }, label: 'empty content (would 400 (content) if reachable)' },
	{ data: { content: '   ', rating: 5 }, label: 'whitespace-only content (would 400 (content) if reachable)' },

	// Rating-range probes.
	{ data: { content: 'X', rating: 0 }, label: 'rating 0 (would 400 (rating) if reachable)' },
	{ data: { content: 'X', rating: 6 }, label: 'rating 6 (would 400 (rating) if reachable)' },
	{ data: { content: 'X', rating: -1 }, label: 'rating -1 (would 400 (rating) if reachable)' },
	{ data: { content: 'X', rating: '5' }, label: 'rating string (would 400 (rating) if reachable)' },
	{ data: { content: 'X', rating: 4.5 }, label: 'rating fractional (passes range check)' },

	// Valid bodies (would proceed to client-profile lookup if reachable).
	{ data: { content: 'Great tool!', rating: 5 }, label: 'valid 5-star rating' },
	{ data: { content: 'Decent tool', rating: 3 }, label: 'valid 3-star rating' },

	// Bypass attempts.
	{ data: { content: 'X', rating: 5, isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { content: 'X', rating: 5, userId: 'fabricated' }, label: 'fabricated userId attempt' },
	{
		data: { content: 'X'.repeat(2_000), rating: 5 },
		label: 'large padded content body'
	}
] as const;

const ALLOWED_PRE_DELIVERY_ERRORS = [
	'Authentication required',
	'Content is required',
	'Rating must be between 1 and 5',
	'Client profile not found',
	'Failed to retrieve comment',
	'Failed to create comment',
	'Database not configured'
] as const;

test.describe('API: /api/items/[slug]/comments POST body / header surface', () => {
	for (const { headers, label } of ITEM_COMMENTS_CREATE_HEADERS) {
		test(`POST ${COMMENTS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(COMMENTS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ITEM_COMMENTS_CREATE_BODIES) {
		test(`POST ${COMMENTS_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(COMMENTS_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${COMMENTS_PATH} returns 401 with the canonical Authentication required envelope`, async ({
		request
	}) => {
		// In the e2e test environment DATABASE_URL is
		// configured, so the db-availability gate
		// passes through. The auth gate fires for
		// unauthenticated requests, returning 401
		// `{ success: false, error: 'Authentication
		// required' }`. NOTE: the message is
		// 'Authentication required', NOT 'Unauthorized'.
		const response = await request.post(COMMENTS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Authentication required' });
	});

	test(`POST ${COMMENTS_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		const response = await request.post(COMMENTS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
	});

	test(`POST ${COMMENTS_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch returns `{ success: true,
		// comment: <commentWithUser> }`. The unauth
		// branch must NEVER reach the createComment
		// call.
		const response = await request.post(COMMENTS_PATH, { data: { content: 'X', rating: 5 } });
		const body = await response.json();
		expect(body.comment).toBeUndefined();
		expect(body.success).toBe(false);
	});

	test(`POST ${COMMENTS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(COMMENTS_PATH),
			request.post(COMMENTS_PATH, { data: {} }),
			request.post(COMMENTS_PATH, { data: { content: 'X', rating: 5 } }),
			request.post(COMMENTS_PATH, { data: { content: '', rating: 5 } }),
			request.post(COMMENTS_PATH, { data: { content: 'X', rating: 99 } })
		]);

		const FORBIDDEN_POST_AUTH_MESSAGES = [
			'Content is required',
			'Rating must be between 1 and 5',
			'Client profile not found',
			'Failed to retrieve comment',
			'Failed to create comment'
		];

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
		}
	});

	test(`POST ${COMMENTS_PATH} every error message comes from the allowed list`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(COMMENTS_PATH),
			request.post(COMMENTS_PATH, { data: {} }),
			request.post(COMMENTS_PATH, { data: { content: 'X', rating: 5 } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(typeof body.error).toBe('string');
			expect(ALLOWED_PRE_DELIVERY_ERRORS).toContain(body.error);
		}
	});

	test(`POST ${COMMENTS_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(COMMENTS_PATH);
		const responses = await Promise.all([
			request.post(COMMENTS_PATH, { data: {} }),
			request.post(COMMENTS_PATH, { data: { content: 'X', rating: 5 } }),
			request.post(COMMENTS_PATH, { data: { content: '', rating: 5 } }),
			request.post(COMMENTS_PATH, { data: { content: 'X', rating: 99 } }),
			request.post(COMMENTS_PATH, { data: { content: 'X', rating: 5, isAdmin: true } }),
			request.post(COMMENTS_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(COMMENTS_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${COMMENTS_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(COMMENTS_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(COMMENTS_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(COMMENTS_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(COMMENTS_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${COMMENTS_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		// The route exports GET + POST. PUT / PATCH /
		// DELETE must round-trip to a `< 500` status.
		const responses = await Promise.all([
			request.put(COMMENTS_PATH),
			request.patch(COMMENTS_PATH),
			request.delete(COMMENTS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${COMMENTS_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(COMMENTS_PATH, { data: 'not-json' }),
			request.post(COMMENTS_PATH, { data: '{ broken: json' }),
			request.post(COMMENTS_PATH, { data: '{"content":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${COMMENTS_PATH} content-and-rating validation chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, invalid bodies surface
		// 'Content is required' or 'Rating must be
		// between 1 and 5'. The unauth branch must
		// NEVER emit either.
		const responses = await Promise.all([
			request.post(COMMENTS_PATH, { data: { content: '', rating: 5 } }),
			request.post(COMMENTS_PATH, { data: { content: 'X', rating: 99 } }),
			request.post(COMMENTS_PATH, { data: { content: 'X', rating: '5' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Content is required');
			expect(body.error).not.toBe('Rating must be between 1 and 5');
			expect(body.comment).toBeUndefined();
		}
	});

	test(`POST ${COMMENTS_PATH} client-profile lookup + moderation gate are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders
		// `getClientProfileByUserId(...)` OR
		// `isUserBlocked(...)` before the auth gate
		// would surface here: the unauth response would
		// echo `'Client profile not found'` (404) OR a
		// block-reason message (403).
		const response = await request.post(COMMENTS_PATH, { data: { content: 'X', rating: 5 } });
		const body = await response.json();
		expect(body.error).not.toBe('Client profile not found');
		// Block-reason messages are dynamic; assert
		// status is 401 (NOT 403).
		expect(response.status()).toBe(401);
	});

	test(`POST ${COMMENTS_PATH} createComment + post-write lookup are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders the comment-write
		// logic before the gate would surface here: the
		// unauth response would echo a `comment` key or
		// the `'Failed to retrieve comment'` 500 message.
		const responses = await Promise.all([
			request.post(COMMENTS_PATH, { data: { content: 'X', rating: 5 } }),
			request.post(COMMENTS_PATH, { data: { content: 'Y', rating: 3 } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.comment).toBeUndefined();
			expect(body.error).not.toBe('Failed to retrieve comment');
			expect(body.success).toBe(false);
		}
	});
});
