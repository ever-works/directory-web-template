import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the public
 * per-item comments-list endpoint served by
 * `apps/web/app/api/items/[slug]/comments/route.ts`.
 *
 * `GET /api/items/[slug]/comments` is intentionally public — the
 * item detail page hydrates its comment list from it on every
 * render. The handler signature is:
 *
 *     export async function GET(
 *       request: Request,
 *       { params }: { params: Promise<{ slug: string }> }
 *     )
 *
 * Note that `request: Request` is **declared** but **never read** —
 * the handler only awaits `params.slug`, calls
 * `checkDatabaseAvailability()` (which short-circuits to an empty
 * list when no DB is configured), and otherwise calls
 * `getCommentsByItemId(slug)`. There is no `request.url`,
 * `request.headers`, or `searchParams.get(...)` access anywhere
 * inside the function body. The route therefore must be invariant
 * to **any** query parameter the caller appends — present, absent,
 * empty, repeated, special-character, or long.
 *
 * The route has three distinct success branches that all
 * legitimately return `200 OK` with different payloads:
 *
 *   1. `checkDatabaseAvailability()` short-circuit — when the DB
 *      is not configured, the route returns `{ success: true,
 *      comments: [] }` without touching the data layer.
 *   2. The happy-path `getCommentsByItemId(slug)` query, returning
 *      the comments list (possibly empty for an unknown slug).
 *   3. The `try / catch` empty-list fallback, which logs in dev
 *      and returns `{ success: true, comments: [] }` even on
 *      internal errors.
 *
 * Asserting on the `comments` array byte-for-byte would pin the
 * spec to a single branch and break under the others. Status
 * `< 500` is therefore the only contract every branch shares — it
 * confirms the route's parameter-parsing, DB-availability check,
 * and catch-and-empty fallback are intact regardless of the
 * deployment's database state.
 *
 * The existing
 * [`comments.spec.ts`](./comments.spec.ts) covers the no-arg happy
 * path against a real item discovered through the listing page;
 * this spec walks the **query-param surface** against an
 * intentionally non-existent slug so a regression that introduces
 * a `request.url`-based wiring (which a future "filter by
 * rating", "include only top-level", "sort by helpfulness" or
 * "paginate" feature might tempt a future contributor into
 * adding) is caught immediately as a non-200 / non-500 response,
 * or as a status divergence between the no-arg and
 * parameter-laden branches.
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';

const COMMENTS_QUERIES = [
	// Baseline — the no-arg case. Included so a future reader of
	// this file sees it alongside the variants it parametrises.
	`/api/items/${NON_EXISTENT_SLUG}/comments`,

	// `?limit=` / `?offset=` / `?page=` / `?pageSize=` — the
	// obvious pagination keys a future contributor might add when
	// wiring up "show me the first N comments" UI. None of them
	// are read today.
	`/api/items/${NON_EXISTENT_SLUG}/comments?limit=10`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?offset=5`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?page=2`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?pageSize=25`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?limit=10&offset=20`,

	// `?sort=` / `?order=` / `?orderBy=` — the obvious sort keys
	// (newest / oldest / most-helpful). The route returns the
	// data-layer's default order today; any of these must be
	// ignored.
	`/api/items/${NON_EXISTENT_SLUG}/comments?sort=newest`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?sort=oldest`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?sort=helpful`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?order=asc`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?order=desc`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?orderBy=createdAt`,

	// `?rating=` / `?minRating=` / `?maxRating=` — the obvious
	// filter-by-rating keys. The route does not filter today.
	`/api/items/${NON_EXISTENT_SLUG}/comments?rating=5`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?minRating=3`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?maxRating=4`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?rating=1&rating=2`,

	// `?include=` / `?fields=` / `?select=` — the obvious
	// projection keys (return only certain fields, expand
	// replies, etc). The route returns the canonical envelope
	// exclusively today.
	`/api/items/${NON_EXISTENT_SLUG}/comments?include=user`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?include=replies,user`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?fields=id,content,rating`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?select=id`,

	// `?expand=` — the GraphQL-style hydration key. Same
	// expectation as `?include=`.
	`/api/items/${NON_EXISTENT_SLUG}/comments?expand=user`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?expand=replies`,

	// `?userId=` — the obvious "comments by a specific user"
	// filter. The route does not filter by user today.
	`/api/items/${NON_EXISTENT_SLUG}/comments?userId=42`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?userId=00000000-0000-0000-0000-000000000000`,

	// `?status=` / `?moderation=` — the obvious moderation-state
	// filter (approved / pending / hidden). The route returns
	// the unfiltered list today; the moderation tier is enforced
	// inside `getCommentsByItemId`.
	`/api/items/${NON_EXISTENT_SLUG}/comments?status=approved`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?status=pending`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?moderation=visible`,

	// `?refresh=` / `?force=` / `?fresh=` — the obvious
	// cache-busting keys. The route is not cached at this layer
	// today.
	`/api/items/${NON_EXISTENT_SLUG}/comments?refresh=1`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?force=true`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?fresh=true`,

	// `?format=` — the obvious content-negotiation key. The
	// route returns JSON exclusively today.
	`/api/items/${NON_EXISTENT_SLUG}/comments?format=json`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?format=xml`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?format=csv`,

	// `?locale=` / `?lang=` — the obvious i18n keys. Comment
	// content is user-generated and not localised today.
	`/api/items/${NON_EXISTENT_SLUG}/comments?locale=en`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?locale=fr`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?lang=zh`,

	// `?since=` / `?from=` / `?until=` — the obvious time-window
	// keys. The route returns the all-time list today.
	`/api/items/${NON_EXISTENT_SLUG}/comments?since=2026-01-01`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?from=2026-01-01&until=2026-12-31`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?since=invalid-date`,

	// Empty values — `searchParams.get(key)` on `?key=` returns
	// `''`. The route does not read any key, so empty values
	// must round-trip to the same response as the no-arg case.
	`/api/items/${NON_EXISTENT_SLUG}/comments?userId=`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?include=`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?sort=`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?refresh=`,

	// Repeated keys — `searchParams.get(name)` returns the first
	// value, but the route never calls `searchParams.get(...)` at
	// all, so repetition is irrelevant.
	`/api/items/${NON_EXISTENT_SLUG}/comments?userId=1&userId=2`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?include=user&include=replies`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?sort=newest&sort=oldest`,

	// Special-character values that would tempt a future regex
	// match, LIKE-prefix, or path-injection wiring. The route
	// does not pass any value into a SQL or filesystem path, so
	// they must remain pass-through ignored.
	`/api/items/${NON_EXISTENT_SLUG}/comments?userId=%25`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?userId=%2F`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?userId=%5C`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?userId=%27`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?include=%3Cscript%3E`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?sort=%22%3Eoops`,

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs. The route
	// does not read the value into a SQL parameter, so this must
	// pass through to the canonical branch.
	`/api/items/${NON_EXISTENT_SLUG}/comments?userId=${'x'.repeat(500)}`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?include=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The route
	// reads zero keys, so any combination of unknown keys is
	// silently ignored.
	`/api/items/${NON_EXISTENT_SLUG}/comments?unknown=value`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?foo=bar&baz=qux`,
	`/api/items/${NON_EXISTENT_SLUG}/comments?userId=42&unknown=value&foo=bar`
] as const;

test.describe('API: /api/items/[slug]/comments query-param surface', () => {
	for (const path of COMMENTS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's three success branches all return `200 OK`;
			// no parameter-parsing path can legitimately produce a
			// 5xx today. The matrix accepts `< 500` so a future
			// data-layer panic that escapes the catch-and-empty
			// fallback would still fail loudly here.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/items/[slug]/comments returns the canonical { success, comments } envelope on the happy path`, async ({
		request
	}) => {
		// Against an intentionally non-existent slug, the route
		// returns the success envelope — `getCommentsByItemId`
		// returns `[]` for an unknown slug rather than throwing,
		// so the response is `{ success: true, comments: [] }`
		// with status 200. The DB-unavailable branch produces the
		// same shape, so this assertion holds in both deployment
		// modes.
		const response = await request.get(`/api/items/${NON_EXISTENT_SLUG}/comments`);

		expect(response.status()).toBe(200);

		const body = (await response.json()) as { success?: unknown; comments?: unknown };

		expect(body.success).toBe(true);
		expect(Array.isArray(body.comments)).toBe(true);
	});

	test(`GET /api/items/[slug]/comments responds identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params, so the response
		// status must be invariant to any combination of unknown
		// keys. Body content is not asserted byte-identical
		// because a concurrent comment write could land between
		// the two requests.
		const baseline = await request.get(`/api/items/${NON_EXISTENT_SLUG}/comments`);
		const parameterised = await request.get(
			`/api/items/${NON_EXISTENT_SLUG}/comments?userId=42&include=user&sort=newest&format=json&unknown=value`
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test(`GET /api/items/[slug]/comments keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical `{ success, comments }`
		// envelope. The shape guarantees the route does not
		// branch on any query key today.
		const responses = await Promise.all([
			request.get(`/api/items/${NON_EXISTENT_SLUG}/comments`),
			request.get(`/api/items/${NON_EXISTENT_SLUG}/comments?include=user&sort=newest`),
			request.get(`/api/items/${NON_EXISTENT_SLUG}/comments?refresh=1&format=json&limit=10`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);

			const body = (await response.json()) as { success?: unknown; comments?: unknown };

			expect(body.success).toBe(true);
			expect(Array.isArray(body.comments)).toBe(true);
		}
	});
});
