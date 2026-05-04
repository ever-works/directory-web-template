import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the public per-item vote-casting endpoint served
 * by the `POST` export of
 * `apps/web/app/api/items/[slug]/votes/route.ts`.
 *
 * `POST /api/items/[slug]/votes` is the **first non-
 * admin per-source-file POST smoke** the docs tree
 * publishes that pins a **moderation-status gate**:
 * after the auth + body-validation + client-profile
 * gates, the handler runs `isUserBlocked(clientProfile.
 * status)` from
 * `apps/web/lib/db/queries/moderation.queries.ts` and
 * returns 403 with a **dynamic message** from
 * `getBlockReasonMessage(clientProfile.status)` if the
 * client is suspended or banned. No prior POST smoke
 * covers a moderation-status gate of this shape.
 *
 * The companion public GET smoke is
 * [`item-votes-public.spec.ts`](item-votes-public.spec.ts)
 * which covers the GET surface (zero-vote fallback for
 * unknown slugs). The mutating POST and DELETE
 * surfaces have only generic `< 500` coverage in
 * `items-engagement-and-favorites.spec.ts`; this spec
 * drills into the POST surface specifically.
 *
 *   1. **`auth()` session lookup + slug param
 *      resolution** via `Promise.all([auth(),
 *      Promise.resolve(params.params)])`.
 *   2. **`!session?.user?.id` gate** → 401 `{ success:
 *      false, error: 'Unauthorized' }` (canonical
 *      envelope with `success: false` AND short
 *      `'Unauthorized'` message).
 *   3. **JSON body parse via `await request.json()`**
 *      AFTER the auth gate.
 *   4. **Vote-type enum validation** — `if (!type ||
 *      (type !== 'up' && type !== 'down'))` → 400
 *      `{ success: false, error: "Invalid vote type.
 *      Must be 'up' or 'down'" }`.
 *   5. **`getClientProfileByUserId(session.user.id)`
 *      lookup** — if not found → 404 `{ success:
 *      false, error: 'Client profile not found' }`.
 *   6. **`isUserBlocked(clientProfile.status)`
 *      moderation-status gate** — the load-bearing
 *      moderation invariant. If true → 403
 *      `{ success: false, error:
 *      getBlockReasonMessage(clientProfile.status) }`
 *      with a DYNAMIC message (block-reason varies
 *      by status: suspended / banned / etc.).
 *   7. **Existing-votes lookup + replace** —
 *      `getVoteByUserIdAndItemId(clientProfile.id,
 *      slug)`; if any exist, calls `deleteVote(id)`
 *      to replace.
 *   8. **`createVote({ userId, itemId, voteType })`**
 *      — load-bearing vote-creation call. `voteType`
 *      derived from `type === 'up' ? VoteType.UPVOTE
 *      : VoteType.DOWNVOTE`.
 *   9. **`getVoteCountForItem(slug)`** — the post-
 *      write count read.
 *  10. **Success payload** — `{ success: true,
 *      count, userVote: type }` with status 200.
 *  11. **Outer catch** — `console.error` + 500
 *      `{ success: false, error: 'Internal server
 *      error' }`.
 *  12. **Method-resolution surface** — the route
 *      exports `GET` + `POST` + `DELETE`. `PUT` /
 *      `PATCH` must round-trip to a `< 500` status.
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';
const VOTES_PATH = `/api/items/${NON_EXISTENT_SLUG}/votes`;

const ITEM_VOTES_CAST_HEADERS = [
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

const ITEM_VOTES_CAST_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (vote-type) if reachable)' },

	// Valid bodies (would proceed to client-profile lookup if reachable).
	{ data: { type: 'up' }, label: 'valid up vote' },
	{ data: { type: 'down' }, label: 'valid down vote' },

	// Invalid vote-type probes.
	{ data: { type: '' }, label: 'empty type string' },
	{ data: { type: 'UP' }, label: 'wrong-case type (uppercase)' },
	{ data: { type: 'cancel' }, label: 'invalid type cancel' },
	{ data: { type: 'remove' }, label: 'invalid type remove' },
	{ data: { type: 1 }, label: 'numeric type' },

	// Bypass attempts.
	{ data: { type: 'up', isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { type: 'up', userId: 'fabricated' }, label: 'fabricated userId attempt' },
	{ data: { type: 'up', clientProfileId: 'fabricated' }, label: 'fabricated clientProfileId attempt' },
	{ data: { type: 'up', padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const ALLOWED_PRE_DELIVERY_ERRORS = [
	'Unauthorized',
	"Invalid vote type. Must be 'up' or 'down'",
	'Client profile not found',
	'Internal server error'
] as const;

test.describe('API: /api/items/[slug]/votes POST body / header surface', () => {
	for (const { headers, label } of ITEM_VOTES_CAST_HEADERS) {
		test(`POST ${VOTES_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(VOTES_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ITEM_VOTES_CAST_BODIES) {
		test(`POST ${VOTES_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(VOTES_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${VOTES_PATH} returns 401 with the canonical-envelope bare-message envelope`, async ({ request }) => {
		// The unauthenticated POST branch is the load-
		// bearing invariant: `!session?.user?.id` fires
		// returning 401 `{ success: false, error:
		// 'Unauthorized' }`.
		const response = await request.post(VOTES_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Unauthorized' });
	});

	test(`POST ${VOTES_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		// Strict envelope-shape assertion: the canonical
		// envelope is `{ success: false, error: '...' }`.
		const response = await request.post(VOTES_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
	});

	test(`POST ${VOTES_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// Success branch returns `{ success: true,
		// count, userVote }` with status 200. The
		// unauth branch must NEVER reach the
		// vote-creation call.
		const response = await request.post(VOTES_PATH, { data: { type: 'up' } });
		const body = await response.json();
		expect(body.count).toBeUndefined();
		expect(body.userVote).toBeUndefined();
		expect(body.success).toBe(false);
	});

	test(`POST ${VOTES_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(VOTES_PATH),
			request.post(VOTES_PATH, { data: {} }),
			request.post(VOTES_PATH, { data: { type: 'up' } }),
			request.post(VOTES_PATH, { data: { type: 'invalid' } })
		]);

		const FORBIDDEN_POST_AUTH_MESSAGES = [
			"Invalid vote type. Must be 'up' or 'down'",
			'Client profile not found',
			'Internal server error'
		];

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
		}
	});

	test(`POST ${VOTES_PATH} every error message comes from the allowed list`, async ({ request }) => {
		// Every error message on a non-block branch
		// MUST come from the static-string allow-list
		// (the moderation-block branch uses dynamic
		// messages and is not exercised here because
		// it requires an authenticated blocked client).
		const responses = await Promise.all([
			request.post(VOTES_PATH),
			request.post(VOTES_PATH, { data: {} }),
			request.post(VOTES_PATH, { data: { type: 'up' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(typeof body.error).toBe('string');
			expect(ALLOWED_PRE_DELIVERY_ERRORS).toContain(body.error);
		}
	});

	test(`POST ${VOTES_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(VOTES_PATH);
		const responses = await Promise.all([
			request.post(VOTES_PATH, { data: {} }),
			request.post(VOTES_PATH, { data: { type: 'up' } }),
			request.post(VOTES_PATH, { data: { type: 'down' } }),
			request.post(VOTES_PATH, { data: { type: 'invalid' } }),
			request.post(VOTES_PATH, { data: { type: 'up', isAdmin: true } }),
			request.post(VOTES_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(VOTES_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${VOTES_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(VOTES_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(VOTES_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(VOTES_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(VOTES_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${VOTES_PATH} cross-method probe (PUT / PATCH) does NOT 5xx`, async ({ request }) => {
		// The route exports GET + POST + DELETE. PUT
		// and PATCH must round-trip to a `< 500` status.
		const responses = await Promise.all([request.put(VOTES_PATH), request.patch(VOTES_PATH)]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${VOTES_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(VOTES_PATH, { data: 'not-json' }),
			request.post(VOTES_PATH, { data: '{ broken: json' }),
			request.post(VOTES_PATH, { data: '{"type":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${VOTES_PATH} vote-type validation is NOT entered on the unauth branch`, async ({ request }) => {
		// On the auth branch, invalid vote types surface
		// "Invalid vote type. Must be 'up' or 'down'".
		// The unauth branch must NEVER emit this 400
		// message regardless of the body.
		const responses = await Promise.all([
			request.post(VOTES_PATH, { data: { type: 'invalid' } }),
			request.post(VOTES_PATH, { data: { type: '' } }),
			request.post(VOTES_PATH, { data: { type: 'UP' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe("Invalid vote type. Must be 'up' or 'down'");
			expect(body.count).toBeUndefined();
		}
	});

	test(`POST ${VOTES_PATH} client-profile lookup + moderation gate are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders
		// `getClientProfileByUserId(...)` OR
		// `isUserBlocked(...)` before the auth gate
		// would surface here: the unauth response would
		// echo `'Client profile not found'` (404) OR a
		// block-reason message (403).
		const response = await request.post(VOTES_PATH, { data: { type: 'up' } });
		const body = await response.json();
		expect(body.error).not.toBe('Client profile not found');
		// Block-reason messages are dynamic; we can't
		// pin the exact string, but we CAN assert that
		// the response is the canonical 401, NOT a 403.
		expect(response.status()).toBe(401);
	});

	test(`POST ${VOTES_PATH} createVote + getVoteCountForItem are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders the vote-write
		// logic before the gate would surface here: the
		// unauth response would echo a `count` (number)
		// or `userVote` ('up' / 'down') from the
		// success branch.
		const responses = await Promise.all([
			request.post(VOTES_PATH, { data: { type: 'up' } }),
			request.post(VOTES_PATH, { data: { type: 'down' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.count).toBeUndefined();
			expect(body.userVote).toBeUndefined();
			expect(body.success).toBe(false);
		}
	});
});
