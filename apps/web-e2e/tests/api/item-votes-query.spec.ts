import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the public
 * per-item vote-info endpoint served by
 * `apps/web/app/api/items/[slug]/votes/route.ts`.
 *
 * `GET /api/items/[slug]/votes` is intentionally public — the item
 * detail page hydrates the net vote count and (when authenticated)
 * the current user's vote status from it on every render. The handler
 * signature is:
 *
 *     export async function GET(
 *       request: Request,
 *       context: { params: Promise<{ slug: string }> }
 *     )
 *
 * Note that `request` is **declared** but **never read** — the
 * handler awaits `context.params` and `auth()` together, then calls
 * `getVoteCountForItem(slug)` and (when signed in)
 * `getClientProfileByUserId(...)` + `getVoteByUserIdAndItemId(...)`.
 * There is no `request.url`, `request.headers`, or
 * `searchParams.get(...)` access anywhere inside the function body.
 * The route therefore must be invariant to **any** query parameter
 * the caller appends — present, absent, empty, repeated,
 * special-character, or long.
 *
 * The existing
 * [`item-votes-public.spec.ts`](./item-votes-public.spec.ts) covers
 * the no-arg unknown-slug 5xx-resilience contract; this spec walks
 * the **query-param surface** so a regression that introduces a
 * `request.url`-based wiring (which a future "filter votes by date
 * range" or "include per-vote breakdown" feature might tempt a
 * future contributor into adding) is caught immediately as a
 * status divergence between the no-arg and parameter-laden branches.
 *
 * The route contract is deliberately permissive on the catch path:
 *
 *   - On success: `{ success: true, count: number, userVote: 'up' |
 *     'down' | null }` with status 200.
 *   - On error  : the `try / catch` block degrades to the same
 *     `{ success: true, count: 0, userVote: null }` envelope with
 *     status 200 (logging the error in development only). There is
 *     **no** 5xx branch on this route — the catch swallows
 *     data-layer failures into a zero-vote envelope, the same way
 *     `categories/exists` and `surveys/exists` swallow their own
 *     data-layer failures into a `false` envelope. The matrix below
 *     therefore accepts `< 500` as the dominant happy path and
 *     pins the 200-only contract in the dedicated tests below.
 *
 * Payload shape and `Content-Type` are intentionally not asserted on
 * the bulk loop because the response is the same envelope on both
 * branches (success and graceful-degrade). The single envelope-shape
 * assertions at the bottom pin the contract.
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';

const VOTES_QUERIES = [
	// Baseline — same path as `item-votes-public.spec.ts`. Included so
	// a future reader of this file sees the no-arg case alongside the
	// variants it parametrises.
	`/api/items/${NON_EXISTENT_SLUG}/votes`,

	// `?userId=` — the obvious wiring a future "include a specific
	// user's vote status alongside the count" feature might add. The
	// route reads zero query keys today and resolves the user via
	// `auth()` instead, so this must be silently ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes?userId=42`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?userId=00000000-0000-0000-0000-000000000000`,

	// `?include=` / `?fields=` / `?select=` — the obvious projection
	// keys (return the breakdown by upvote / downvote, not just the
	// net count). The route returns the net count and the current
	// user's vote exclusively today, so any of these must be ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes?include=breakdown`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?include=upvotes,downvotes`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?fields=count,upvotes,downvotes,userVote`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?select=count`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?select=userVote`,

	// `?expand=` — the GraphQL-style hydration key. Same expectation
	// as `?include=`.
	`/api/items/${NON_EXISTENT_SLUG}/votes?expand=user`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?expand=item`,

	// `?refresh=` / `?force=` / `?fresh=` — the obvious cache-busting
	// keys. The handler does not check Next's `cache: 'no-store'` or
	// `revalidate: 0` based on a query param today; any of these must
	// be ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes?refresh=1`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?force=true`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?fresh=true`,

	// `?format=` — the obvious content-negotiation key. The route
	// returns JSON exclusively; no `Accept`-header or `?format=` path
	// today.
	`/api/items/${NON_EXISTENT_SLUG}/votes?format=json`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?format=xml`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?format=csv`,

	// `?locale=` / `?lang=` — the obvious i18n keys. Vote counts are
	// not localised today; any of these must be ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes?locale=en`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?locale=fr`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?lang=zh`,

	// `?since=` / `?from=` / `?until=` — the obvious time-window keys
	// (count of upvotes since a given date, e.g. for a "trending"
	// view). The route returns the all-time net count today; any of
	// these must be ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes?since=2026-01-01`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?from=2026-01-01&until=2026-12-31`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?since=invalid-date`,

	// `?direction=` / `?type=` — the obvious "only upvotes" / "only
	// downvotes" projection keys. Vote counts are net today; any of
	// these must be ignored. Note the deliberate overlap with the
	// POST body's `type: 'up' | 'down'` field — putting `?type=up`
	// in the URL must not influence the GET response either, because
	// the GET handler does not read the URL.
	`/api/items/${NON_EXISTENT_SLUG}/votes?direction=up`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?direction=down`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?type=up`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?type=down`,

	// Empty values — `searchParams.get(key)` on `?key=` returns `''`.
	// The route does not read any key, so empty values must round-trip
	// to the same response as the no-arg case.
	`/api/items/${NON_EXISTENT_SLUG}/votes?userId=`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?include=`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?refresh=`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?type=`,

	// Repeated keys — `searchParams.get(name)` returns the first
	// value, but the route never calls `searchParams.get(...)` at all,
	// so repetition is irrelevant. The response must remain a non-5xx
	// status.
	`/api/items/${NON_EXISTENT_SLUG}/votes?userId=1&userId=2`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?include=upvotes&include=downvotes`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?type=up&type=down`,

	// Special-character values that would tempt a future regex match,
	// LIKE-prefix, or path-injection wiring. The route does not pass
	// any value into a SQL or filesystem path, so they must remain
	// pass-through ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes?userId=%25`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?userId=%2F`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?userId=%5C`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?userId=%27`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?include=%3Cscript%3E`,

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs. The route does not
	// read the value into a SQL parameter, so this must pass through
	// to the canonical branch.
	`/api/items/${NON_EXISTENT_SLUG}/votes?userId=${'x'.repeat(500)}`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?include=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The route reads
	// zero keys, so any combination of unknown keys is silently
	// ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes?unknown=value`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?foo=bar&baz=qux`,
	`/api/items/${NON_EXISTENT_SLUG}/votes?userId=42&unknown=value&foo=bar`
] as const;

test.describe('API: /api/items/[slug]/votes query-param surface', () => {
	for (const path of VOTES_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's catch path degrades to the success envelope
			// (status 200) rather than producing a 5xx — there is no
			// 5xx branch on this handler.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/items/[slug]/votes returns the canonical { success, count, userVote } envelope on the happy path`, async ({
		request
	}) => {
		// Against an intentionally non-existent slug, the route still
		// returns the success envelope — `getVoteCountForItem` returns
		// `0` for an unknown slug rather than throwing, and the
		// unauthenticated branch sets `userVote: null`. The response
		// is therefore `{ success: true, count: 0, userVote: null }`
		// with status 200.
		const response = await request.get(`/api/items/${NON_EXISTENT_SLUG}/votes`);

		expect(response.status()).toBe(200);

		const body = (await response.json()) as {
			success?: unknown;
			count?: unknown;
			userVote?: unknown;
		};

		expect(body.success).toBe(true);
		expect(typeof body.count).toBe('number');
		// `userVote` is `'up' | 'down' | null`. For an unauthenticated
		// (or session-less) request against an unknown slug the
		// expected value is `null`. The contract is "either a known
		// vote string or `null`".
		if (body.userVote !== null) {
			expect(['up', 'down']).toContain(body.userVote);
		}
	});

	test(`GET /api/items/[slug]/votes responds identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params, so the response status
		// must be invariant to any combination of unknown keys. Body
		// content is not asserted byte-identical because the data
		// layer's vote count may shift if a concurrent vote write
		// lands between the two requests.
		const baseline = await request.get(`/api/items/${NON_EXISTENT_SLUG}/votes`);
		const parameterised = await request.get(
			`/api/items/${NON_EXISTENT_SLUG}/votes?userId=42&include=breakdown&format=json&unknown=value`
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(200);
	});

	test(`GET /api/items/[slug]/votes keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must round-trip
		// to the canonical `{ success, count, userVote }` envelope.
		// The shape guarantees the route does not branch on any query
		// key today.
		const responses = await Promise.all([
			request.get(`/api/items/${NON_EXISTENT_SLUG}/votes`),
			request.get(`/api/items/${NON_EXISTENT_SLUG}/votes?include=breakdown`),
			request.get(`/api/items/${NON_EXISTENT_SLUG}/votes?refresh=1&format=json&type=up`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);

			const body = (await response.json()) as {
				success?: unknown;
				count?: unknown;
				userVote?: unknown;
			};

			expect(body.success).toBe(true);
			expect(typeof body.count).toBe('number');
			if (body.userVote !== null) {
				expect(['up', 'down']).toContain(body.userVote);
			}
		}
	});
});
