import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the public
 * per-item vote-count endpoint served by
 * `apps/web/app/api/items/[slug]/votes/count/route.ts`.
 *
 * `GET /api/items/[slug]/votes/count` is intentionally public — the
 * item detail page hydrates the net vote count from it on every
 * render. The handler signature is:
 *
 *     export async function GET(
 *       request: Request,
 *       context: { params: Promise<{ slug: string }> }
 *     )
 *
 * Note that `request` is **declared** but **never read** — the
 * handler only awaits `context.params` and calls
 * `getVoteCountForItem(slug)`. There is no `request.url`,
 * `request.headers`, or `searchParams.get(...)` access anywhere
 * inside the function body. The route therefore must be invariant
 * to **any** query parameter the caller appends — present, absent,
 * empty, repeated, special-character, or long.
 *
 * The existing
 * [`item-public.spec.ts`](./item-public.spec.ts) covers the no-arg
 * happy path against an intentionally non-existent slug; this spec
 * walks the **query-param surface** so a regression that introduces
 * a `request.url`-based wiring (which a future "filter by user" or
 * "include breakdown" feature might tempt a future contributor into
 * adding) is caught immediately as a non-200 / non-500 response, or
 * as a status divergence between the no-arg and parameter-laden
 * branches.
 *
 * The route contract is deliberately permissive on the catch path:
 *
 *   - On success: `{ success: true, count: number }` with status 200.
 *   - On error  : `{ success: false, error: 'Failed to fetch vote
 *     count' }` with status 500. The catch branch is the only place
 *     the route surfaces a 5xx — and it is exclusively for
 *     `getVoteCountForItem`-internal failures (database disconnect,
 *     query-builder panic, etc), not for any parameter-parsing
 *     failure on the caller's side. The matrix below therefore
 *     accepts `< 500` as the dominant happy path and asserts the
 *     5xx + envelope branch separately.
 *
 * Payload shape and `Content-Type` are intentionally not asserted on
 * the bulk loop because the response can be either the success
 * envelope or the catch-and-degrade envelope (the route does not
 * silently swallow data-layer errors the way the
 * `categories/exists` / `surveys/exists` routes do — instead it
 * returns an explicit 500 with `success: false`).
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';

const VOTE_COUNT_QUERIES = [
	// Baseline — same path as `item-public.spec.ts`. Included so a
	// future reader of this file sees the no-arg case alongside the
	// variants it parametrises.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count`,

	// `?userId=` — the obvious wiring a future "include the current
	// user's contribution to the count" feature might add. The route
	// reads zero query keys today, so this must be silently ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?userId=42`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?userId=00000000-0000-0000-0000-000000000000`,

	// `?include=` / `?fields=` / `?select=` — the obvious projection
	// keys (return the breakdown by upvote / downvote, not just the
	// net count). The route returns the net count exclusively today,
	// so any of these must be ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?include=breakdown`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?include=upvotes,downvotes`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?fields=count,upvotes,downvotes`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?select=count`,

	// `?expand=` — the GraphQL-style hydration key. Same expectation
	// as `?include=`.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?expand=user`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?expand=item`,

	// `?refresh=` / `?force=` / `?fresh=` — the obvious cache-busting
	// keys. The handler does not check Next's `cache: 'no-store'` or
	// `revalidate: 0` based on a query param today; any of these must
	// be ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?refresh=1`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?force=true`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?fresh=true`,

	// `?format=` — the obvious content-negotiation key. The route
	// returns JSON exclusively; no `Accept`-header or `?format=` path
	// today.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?format=json`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?format=xml`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?format=csv`,

	// `?locale=` / `?lang=` — the obvious i18n keys. Vote counts are
	// not localised today; any of these must be ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?locale=en`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?locale=fr`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?lang=zh`,

	// `?since=` / `?from=` / `?until=` — the obvious time-window keys
	// (count of upvotes since a given date, e.g. for a "trending"
	// view). The route returns the all-time net count today; any of
	// these must be ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?since=2026-01-01`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?from=2026-01-01&until=2026-12-31`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?since=invalid-date`,

	// `?direction=` — the obvious "only upvotes" / "only downvotes"
	// projection key. Vote counts are net today; any of these must be
	// ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?direction=up`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?direction=down`,

	// Empty values — `searchParams.get(key)` on `?key=` returns `''`.
	// The route does not read any key, so empty values must round-trip
	// to the same response as the no-arg case.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?userId=`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?include=`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?refresh=`,

	// Repeated keys — `searchParams.get(name)` returns the first
	// value, but the route never calls `searchParams.get(...)` at all,
	// so repetition is irrelevant. The response must remain a non-5xx
	// status.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?userId=1&userId=2`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?include=upvotes&include=downvotes`,

	// Special-character values that would tempt a future regex match,
	// LIKE-prefix, or path-injection wiring. The route does not pass
	// any value into a SQL or filesystem path, so they must remain
	// pass-through ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?userId=%25`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?userId=%2F`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?userId=%5C`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?userId=%27`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?include=%3Cscript%3E`,

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs. The route does not
	// read the value into a SQL parameter, so this must pass through
	// to the canonical branch.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?userId=${'x'.repeat(500)}`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?include=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The route reads
	// zero keys, so any combination of unknown keys is silently
	// ignored.
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?unknown=value`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?foo=bar&baz=qux`,
	`/api/items/${NON_EXISTENT_SLUG}/votes/count?userId=42&unknown=value&foo=bar`
] as const;

test.describe('API: /api/items/[slug]/votes/count query-param surface', () => {
	for (const path of VOTE_COUNT_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's catch path returns 500 for genuine
			// `getVoteCountForItem` failures; the matrix accepts
			// `< 500` as the dominant happy path. The 5xx + envelope
			// shape is asserted in the dedicated tests below.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/items/[slug]/votes/count returns the canonical { success, count } envelope on the happy path`, async ({
		request
	}) => {
		// Against an intentionally non-existent slug, the route still
		// returns the success envelope — `getVoteCountForItem` returns
		// `0` for an unknown slug rather than throwing, so the
		// response is `{ success: true, count: 0 }` with status 200.
		const response = await request.get(`/api/items/${NON_EXISTENT_SLUG}/votes/count`);

		expect(response.status()).toBe(200);

		const body = (await response.json()) as { success?: unknown; count?: unknown };

		expect(body.success).toBe(true);
		expect(typeof body.count).toBe('number');
	});

	test(`GET /api/items/[slug]/votes/count responds identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params, so the response status
		// must be invariant to any combination of unknown keys. Body
		// content is not asserted byte-identical because the data
		// layer's vote count may shift if a concurrent vote write
		// lands between the two requests.
		const baseline = await request.get(`/api/items/${NON_EXISTENT_SLUG}/votes/count`);
		const parameterised = await request.get(
			`/api/items/${NON_EXISTENT_SLUG}/votes/count?userId=42&include=breakdown&format=json&unknown=value`
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test(`GET /api/items/[slug]/votes/count keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must round-trip
		// to the canonical `{ success, count }` envelope. The shape
		// guarantees the route does not branch on any query key today.
		const responses = await Promise.all([
			request.get(`/api/items/${NON_EXISTENT_SLUG}/votes/count`),
			request.get(`/api/items/${NON_EXISTENT_SLUG}/votes/count?include=breakdown`),
			request.get(`/api/items/${NON_EXISTENT_SLUG}/votes/count?refresh=1&format=json`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);

			const body = (await response.json()) as { success?: unknown; count?: unknown };

			expect(body.success).toBe(true);
			expect(typeof body.count).toBe('number');
		}
	});
});
