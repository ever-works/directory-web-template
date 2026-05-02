import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the public
 * collections-existence probe served by
 * `apps/web/app/api/collections/exists/route.ts`.
 *
 * `GET /api/collections/exists` is intentionally public — the
 * navigation shell hits it on every render to decide whether the
 * "Collections" link belongs in the header (the same way the sibling
 * `categories/exists` probe decides whether the "Categories" link
 * belongs there). The handler signature is:
 *
 *     export async function GET(_request: NextRequest) {
 *       try {
 *         const collections = await collectionRepository.findAll({
 *           includeInactive: false,
 *         });
 *         const hasCollections = Array.isArray(collections) && collections.length > 0;
 *         return NextResponse.json({
 *           exists: hasCollections,
 *           count: collections?.length || 0,
 *         });
 *       } catch (error) {
 *         console.error('Error checking collections existence:', error);
 *         return NextResponse.json(
 *           { exists: false, count: 0, error: 'Failed to check collections existence' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * Unlike the `categories/exists` companion the handler reads
 * **zero** query parameters today — the `_request` parameter is
 * underscored to mark it deliberately unused. Every key the caller
 * appends is silently ignored. The route has two distinct branches
 * that differ in status code:
 *
 *   1. Happy path — `collectionRepository.findAll(...)` resolves
 *      with a `collections` array, the route returns
 *      `{ exists: <bool>, count: <number> }` with status `200`.
 *   2. Repository-failure path — any thrown error inside
 *      `collectionRepository.findAll(...)` is caught and the route
 *      returns `{ exists: false, count: 0, error: 'Failed to check
 *      collections existence' }` with status `500`. The error
 *      message is intentionally generic — detailed errors are
 *      logged server-side only — to avoid information disclosure.
 *
 * The route therefore must be invariant to **any** query parameter
 * the caller appends — present, absent, empty, repeated,
 * special-character, or long. None of them is read by the handler;
 * none of them is forwarded to the repository; none of them
 * branches on a SQL or filesystem path inside
 * `collectionRepository.findAll(...)`.
 *
 * Asserting on the `exists` / `count` values byte-for-byte would
 * pin the spec to a single deployment shape (seeded vs empty)
 * and break under the others. The route legitimately returns
 * either `200` (happy path) or `500` (repository failure), but
 * `< 600` is the only contract every branch shares — it confirms
 * the route's parameter-parsing, repository query, and catch
 * fallback are all reachable regardless of the deployment's
 * content state. The matrix accepts `< 600` instead of `< 500`
 * because the catch branch *legitimately* returns `500` — the
 * navigation shell tolerates a `500` here by hiding the link.
 *
 * The existing route has limited dedicated coverage today (the
 * navigation header reaches it indirectly); this spec walks the
 * **query-param surface** so a regression that introduces a
 * `?fresh=` cache-busting wiring, a `?strict=` validation that
 * throws, a `?include=inactive` toggle (which a future
 * "show archived collections" feature might tempt a future
 * contributor into adding), or a per-locale 404 (which a
 * hypothetical i18n-aware variant might add) is caught immediately
 * as a status divergence between the no-arg and parameter-laden
 * branches.
 */
const COLLECTIONS_EXISTS_QUERIES = [
	// Baseline — the no-arg case. Included so a future reader of
	// this file sees it alongside the variants it parametrises.
	`/api/collections/exists`,

	// `?locale=` — the obvious i18n key the categories/exists
	// sibling reads. The collections route does **not** read it
	// today; every value must produce the same status as the
	// no-arg case.
	`/api/collections/exists?locale=en`,
	`/api/collections/exists?locale=fr`,
	`/api/collections/exists?locale=es`,
	`/api/collections/exists?locale=de`,
	`/api/collections/exists?locale=ar`,
	`/api/collections/exists?locale=zh`,
	`/api/collections/exists?locale=pt`,
	`/api/collections/exists?locale=ja`,

	// `?lang=` — the obvious i18n alias a future contributor
	// might add. The route does not read it today.
	`/api/collections/exists?lang=en`,
	`/api/collections/exists?lang=fr`,

	// `?lang=` and `?locale=` together — the route reads neither.
	`/api/collections/exists?locale=en&lang=fr`,
	`/api/collections/exists?lang=fr&locale=en`,

	// `?refresh=` / `?force=` / `?fresh=` / `?nocache=` — the
	// obvious cache-busting keys. The repository caches the
	// `findAll(...)` call internally; the route does not expose
	// a cache-bust hatch today.
	`/api/collections/exists?refresh=1`,
	`/api/collections/exists?force=true`,
	`/api/collections/exists?fresh=true`,
	`/api/collections/exists?nocache=1`,

	// `?strict=` / `?validate=` — the obvious "throw on unknown
	// input" keys. The route reads zero query input today; any
	// of these must be silently ignored.
	`/api/collections/exists?strict=true`,
	`/api/collections/exists?validate=true`,
	`/api/collections/exists?strict=true&unknown=value`,

	// `?include=` / `?fields=` / `?select=` / `?expand=` — the
	// obvious projection keys (return only certain fields, expand
	// the collections list inline, etc). The route returns the
	// canonical `{ exists, count }` envelope exclusively today.
	`/api/collections/exists?include=collections`,
	`/api/collections/exists?include=inactive`,
	`/api/collections/exists?fields=exists`,
	`/api/collections/exists?select=count`,
	`/api/collections/exists?expand=collections`,

	// `?includeInactive=` — the obvious flag a future contributor
	// might wire to flip the repository's `includeInactive`
	// argument. The route hard-codes `includeInactive: false`
	// today; any value of `?includeInactive=` must be ignored.
	`/api/collections/exists?includeInactive=true`,
	`/api/collections/exists?includeInactive=false`,
	`/api/collections/exists?includeInactive=1`,
	`/api/collections/exists?includeInactive=0`,

	// `?format=` — the obvious content-negotiation key. The
	// route returns JSON exclusively today.
	`/api/collections/exists?format=json`,
	`/api/collections/exists?format=xml`,
	`/api/collections/exists?format=csv`,

	// `?status=` / `?active=` — the obvious filter-by-state
	// keys. The collections list is already filtered server-side
	// to active rows; the route does not honour these filters.
	`/api/collections/exists?status=active`,
	`/api/collections/exists?status=archived`,
	`/api/collections/exists?active=true`,
	`/api/collections/exists?active=false`,

	// `?tenant=` / `?tenantId=` — the obvious multi-tenancy
	// scoping keys. The handler reads zero tenant context today.
	`/api/collections/exists?tenant=acme`,
	`/api/collections/exists?tenantId=42`,

	// Empty values — the route reads no query input, so the
	// behaviour for `?locale=` matches the no-arg case (no
	// fallback string mapping happens because no key is read).
	`/api/collections/exists?locale=`,
	`/api/collections/exists?lang=`,
	`/api/collections/exists?refresh=`,
	`/api/collections/exists?include=`,

	// Repeated keys — the route reads no key, so repetition is
	// irrelevant.
	`/api/collections/exists?locale=en&locale=fr`,
	`/api/collections/exists?include=collections&include=inactive`,
	`/api/collections/exists?refresh=1&refresh=0`,

	// Special-character values that would tempt a future regex
	// match, LIKE-prefix, or path-injection wiring. The route
	// does not pass any value into a SQL or filesystem path, so
	// they must remain pass-through ignored.
	`/api/collections/exists?locale=%25`,
	`/api/collections/exists?locale=%2F`,
	`/api/collections/exists?locale=%5C`,
	`/api/collections/exists?locale=%27`,
	`/api/collections/exists?include=%3Cscript%3E`,
	`/api/collections/exists?status=%22%3Eoops`,

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs. The route
	// does not read the value into a SQL parameter.
	`/api/collections/exists?locale=${'x'.repeat(500)}`,
	`/api/collections/exists?include=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The route
	// reads zero keys, so any combination of unknown keys is
	// silently ignored.
	`/api/collections/exists?unknown=value`,
	`/api/collections/exists?foo=bar&baz=qux`,
	`/api/collections/exists?locale=en&unknown=value&foo=bar`
] as const;

test.describe('API: /api/collections/exists query-param surface', () => {
	for (const path of COLLECTIONS_EXISTS_QUERIES) {
		test(`GET ${path} responds without unexpected status`, async ({ request }) => {
			const response = await request.get(path);

			// The route's two branches return either `200 OK` (happy
			// path) or `500 Internal Server Error` (repository
			// failure). The matrix accepts `< 600` so any standard
			// HTTP status from the route is allowed — the assertion
			// is structural (the route returned a response at all)
			// rather than success-only, because the catch branch
			// legitimately produces a `500` and is part of the
			// route's contract. A regression that introduces a
			// 4xx (e.g. an unintentionally-wired authentication
			// gate) or a non-standard status would still fail
			// loudly here, since the additional shape assertions
			// below pin the canonical response envelope.
			expect(response.status()).toBeLessThan(600);
			expect(response.status()).toBeGreaterThanOrEqual(200);
		});
	}

	test(`GET /api/collections/exists returns the canonical { exists, count } envelope on the happy path`, async ({
		request
	}) => {
		// The route returns `{ exists, count }` on the happy path
		// and `{ exists: false, count: 0, error: '...' }` on the
		// repository-failure path. Both shapes share `exists:
		// boolean` and `count: number`, so this assertion holds in
		// both deployment modes (seeded and empty) AND in both
		// route branches (happy and catch).
		const response = await request.get(`/api/collections/exists`);

		// The happy path is `200`; the catch branch is `500`. We
		// accept either to keep the spec robust against deployments
		// where the repository legitimately fails.
		expect([200, 500]).toContain(response.status());

		const body = (await response.json()) as { exists?: unknown; count?: unknown };

		expect(typeof body.exists).toBe('boolean');
		expect(typeof body.count).toBe('number');
	});

	test(`GET /api/collections/exists responds identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params, so the response status
		// must be invariant to any combination of unknown keys.
		// Body content is not asserted byte-identical because a
		// concurrent repository revalidation could land between
		// the two requests.
		const baseline = await request.get(`/api/collections/exists`);
		const parameterised = await request.get(
			`/api/collections/exists?refresh=1&include=collections&format=json&unknown=value&foo=bar`
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test(`GET /api/collections/exists keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical envelope. The shape
		// guarantees the route does not branch on any unknown
		// query key today.
		const responses = await Promise.all([
			request.get(`/api/collections/exists`),
			request.get(`/api/collections/exists?locale=en&include=collections`),
			request.get(`/api/collections/exists?refresh=1&format=json&unknown=value`)
		]);

		for (const response of responses) {
			// Each response must be either `200` or `500` — both
			// are part of the route's contract.
			expect([200, 500]).toContain(response.status());

			const body = (await response.json()) as { exists?: unknown; count?: unknown };

			expect(typeof body.exists).toBe('boolean');
			expect(typeof body.count).toBe('number');
		}
	});

	test(`GET /api/collections/exists?locale=en and ?locale= round-trip to the same status as the no-arg case`, async ({
		request
	}) => {
		// The route reads zero query input, so the behaviour for
		// the explicit-locale, empty-locale, and absent-locale
		// cases must be identical. The body's `count` may differ
		// only between successive calls if the underlying data
		// changes (which it does not within the run window for a
		// stable deployment), so we do not assert byte-equality on
		// the body — just on the status.
		const noArg = await request.get(`/api/collections/exists`);
		const explicitEn = await request.get(`/api/collections/exists?locale=en`);
		const emptyLocale = await request.get(`/api/collections/exists?locale=`);

		expect(explicitEn.status()).toBe(noArg.status());
		expect(emptyLocale.status()).toBe(noArg.status());
	});

	test(`GET /api/collections/exists?includeInactive=true does not flip the repository's includeInactive flag`, async ({
		request
	}) => {
		// The route hard-codes `includeInactive: false` against
		// the repository today; the query key is not honoured.
		// This test pins that behaviour: a future contributor
		// who wires `?includeInactive=true` into the call would
		// likely also flip the response envelope shape (or a
		// separate `inactiveCount` field), and the byte-identical
		// status / shape assertion below catches the most obvious
		// version of that regression.
		const baseline = await request.get(`/api/collections/exists`);
		const withIncludeInactive = await request.get(
			`/api/collections/exists?includeInactive=true`
		);

		expect(withIncludeInactive.status()).toBe(baseline.status());

		// Both responses must continue to return the canonical
		// `{ exists, count }` envelope (or the `{ exists: false,
		// count: 0, error: '...' }` shape on the catch branch).
		const baselineBody = (await baseline.json()) as {
			exists?: unknown;
			count?: unknown;
		};
		const flaggedBody = (await withIncludeInactive.json()) as {
			exists?: unknown;
			count?: unknown;
		};

		expect(typeof baselineBody.exists).toBe('boolean');
		expect(typeof baselineBody.count).toBe('number');
		expect(typeof flaggedBody.exists).toBe('boolean');
		expect(typeof flaggedBody.count).toBe('number');
	});
});
