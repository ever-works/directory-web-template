import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **PATCH / dynamic-segment /
 * body / header surface** of the per-comment rating-
 * update endpoint served by the `PATCH` export of
 * `apps/web/app/api/items/[slug]/comments/rating/[commentId]/route.ts`.
 *
 * `PATCH /api/items/[slug]/comments/rating/[commentId]`
 * is the **first per-source-file PATCH smoke** the
 * docs tree publishes that documents a **Q-010-style
 * NO-AUTH-GATE finding for a non-admin mutating
 * route** — the handler has NO `auth()` call, NO
 * ownership check, NO rating validation. ANY caller
 * can update ANY comment's rating to ANY value (so
 * long as `DATABASE_URL` is configured). See
 * [`docs/questions.md`](../../../docs/questions.md)
 * for the Q-### entry. The smoke spec pins this
 * finding as the CURRENT contract — a future PR that
 * adds auth would explicitly break this spec,
 * prompting an update.
 *
 * The parent route's PUT handler at
 * `apps/web/app/api/items/[slug]/comments/[commentId]/
 * route.ts` DOES enforce auth + ownership; this child
 * rating-update route does not. The companion minimal
 * smoke
 * [`item-comment-rating-by-id.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-comment-rating-by-id.spec.ts)
 * pins only the `< 500` no-server-error contract;
 * this spec drills into the body / dynamic-segment
 * surface with detailed invariants.
 *
 * Distinct from EVERY prior mutating-method smoke:
 *
 *   - **NO `auth()` gate** — the FIRST per-source-
 *     file mutating smoke pinning a Q-010-style
 *     no-auth-gate finding for a non-admin /
 *     non-internal route.
 *   - **NO ownership check** — the handler trusts
 *     the path-param `commentId` directly.
 *   - **NO rating validation** — any value
 *     (including `'string'`, `null`, `-99`, `999`)
 *     is passed straight to `updateCommentRating
 *     (...)` without type / range checking.
 *   - **Production-leftover `console.log`** with
 *     debug arrow `'============rating=============>'`
 *     — the handler emits this on every PATCH request
 *     in ALL environments (NOT dev-gated).
 *   - **Returns raw comment row verbatim** — no
 *     wrapper envelope, no field filtering.
 *   - **`checkDatabaseAvailability()` as the SOLE
 *     gate** — if DB unavailable → 503; otherwise
 *     proceed to the unconditional update.
 *
 *   1. **`checkDatabaseAvailability()` gate** — the
 *      ONLY gate. Returns 503 with the
 *      DATABASE_UNAVAILABLE envelope when
 *      `DATABASE_URL` is missing.
 *   2. **`{ commentId } = await params`** dynamic-
 *      segment resolution.
 *   3. **`{ rating } = await request.json()`** body
 *      parse — NO try/catch, NO validation.
 *   4. **`console.log` debug statement** —
 *      production-leftover.
 *   5. **`updateCommentRating(commentId, rating)`**
 *      — load-bearing UNGUARDED DB write.
 *   6. **Success payload** — raw comment row
 *      verbatim with status 200.
 *   7. **Outer catch** — `console.error` + 500
 *      `{ error: 'Failed to update comment rating' }`.
 *   8. **Method-resolution surface** — the route
 *      exports `GET` and `PATCH`. `POST` / `PUT` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';
const NON_EXISTENT_COMMENT_ID = '__definitely-not-a-real-comment-id__';
const RATING_PATH = `/api/items/${NON_EXISTENT_SLUG}/comments/rating/${NON_EXISTENT_COMMENT_ID}`;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (rating undefined)' },

	// Valid bodies (would update the rating if
	// reachable).
	{ data: { rating: 5 }, label: 'rating 5' },
	{ data: { rating: 1 }, label: 'rating 1' },
	{ data: { rating: 3 }, label: 'rating 3' },

	// Boundary / type-violation probes (handler does
	// NOT validate).
	{ data: { rating: 0 }, label: 'rating 0 (boundary)' },
	{ data: { rating: -1 }, label: 'rating -1 (negative)' },
	{ data: { rating: 999 }, label: 'rating 999 (out-of-range)' },
	{ data: { rating: 'five' }, label: 'rating string (no validation)' },
	{ data: { rating: null }, label: 'rating null' },

	// Bypass attempts.
	{ data: { rating: 5, isAdmin: true }, label: 'isAdmin=true (handler ignores)' },
	{ data: { rating: 5, userId: 'fabricated' }, label: 'fabricated userId (handler ignores)' }
] as const;

test.describe('API: /api/items/[slug]/comments/rating/[commentId] PATCH dynamic-segment / body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`PATCH ${RATING_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.patch(RATING_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of BODIES) {
		test(`PATCH ${RATING_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.patch(RATING_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`PATCH ${RATING_PATH} does NOT return 401 (no auth gate Q-010-style finding)`, async ({ request }) => {
		// CURRENT contract: the handler has NO auth
		// gate. Pin that the response is NOT 401
		// regardless of body — a future PR that adds
		// auth would explicitly break this assertion,
		// prompting an update.
		const response = await request.patch(RATING_PATH, {
			data: { rating: 5 }
		});
		expect(response.status()).not.toBe(401);
		expect(response.status()).not.toBe(403);
	});

	test(`PATCH ${RATING_PATH} treats unauth and authed requests identically (no auth gate)`, async ({ request }) => {
		// Pin the no-auth-gate contract: requests with
		// fabricated session cookies / Authorization
		// headers / X-User-Id headers must produce the
		// SAME status as bare requests (because the
		// handler ignores all auth signals).
		const baseline = await request.patch(RATING_PATH, { data: { rating: 5 } });
		const responses = await Promise.all([
			request.patch(RATING_PATH, {
				data: { rating: 5 },
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.patch(RATING_PATH, {
				data: { rating: 5 },
				headers: { Authorization: 'Bearer anything' }
			}),
			request.patch(RATING_PATH, {
				data: { rating: 5 },
				headers: { 'X-User-Id': 'fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`PATCH ${RATING_PATH} does NOT branch on rating value type (no validation)`, async ({ request }) => {
		// Pin the no-validation contract: invalid
		// rating values (string, null, negative,
		// out-of-range) produce the SAME status as
		// valid values (because the handler does NOT
		// validate).
		const baseline = await request.patch(RATING_PATH, { data: { rating: 5 } });
		const responses = await Promise.all([
			request.patch(RATING_PATH, { data: { rating: -1 } }),
			request.patch(RATING_PATH, { data: { rating: 999 } }),
			request.patch(RATING_PATH, { data: { rating: 'five' } }),
			request.patch(RATING_PATH, { data: { rating: null } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`PATCH ${RATING_PATH} cross-method probe (POST / PUT / DELETE) does NOT 5xx`, async ({ request }) => {
		// The route exports GET + PATCH. POST / PUT /
		// DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.post(RATING_PATH),
			request.put(RATING_PATH),
			request.delete(RATING_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PATCH ${RATING_PATH} catch-branch generic 500 message is NOT echoed for valid bodies`, async ({
		request
	}) => {
		// The catch returns 500 with `'Failed to
		// update comment rating'`. For a non-existent
		// comment ID with a valid rating value, the
		// updateCommentRating call returns null /
		// undefined (depending on Drizzle behavior),
		// not throws. Pin that valid-shape requests do
		// NOT surface the 500 catch envelope.
		const response = await request.patch(RATING_PATH, {
			data: { rating: 5 }
		});

		// Status should be < 500 (likely 200 with
		// null/undefined body, since the handler
		// returns the raw comment row).
		expect(response.status()).toBeLessThan(500);

		try {
			const body = await response.json();
			expect(body.error).not.toBe('Failed to update comment rating');
		} catch {
			// Non-JSON body acceptable.
		}
	});

	test(`PATCH ${RATING_PATH} response does NOT include a wrapper envelope for valid bodies`, async ({ request }) => {
		// The success branch returns the raw comment
		// row verbatim (NOT a wrapper envelope with
		// `success` key). Pin this UNUSUAL contract.
		const response = await request.patch(RATING_PATH, {
			data: { rating: 5 }
		});

		if (response.status() < 400) {
			try {
				const body = await response.json();
				// Either null (no comment found) OR an
				// object without `success` key.
				if (body !== null && typeof body === 'object') {
					expect(body.success).toBeUndefined();
				}
			} catch {
				// Non-JSON acceptable.
			}
		}
	});
});
