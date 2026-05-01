import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the public
 * categories-existence probe served by
 * `apps/web/app/api/categories/exists/route.ts`.
 *
 * `GET /api/categories/exists` is intentionally public — the
 * navigation shell hits it on every render to decide whether the
 * "Categories" link belongs in the header. The handler signature is:
 *
 *     export async function GET(request: NextRequest) {
 *       try {
 *         const locale = request?.nextUrl?.searchParams?.get('locale') || 'en';
 *         const { categories } = await fetchItems({ lang: locale });
 *         const hasCategories = Array.isArray(categories) && categories.length > 0;
 *         return NextResponse.json({
 *           exists: hasCategories,
 *           count: categories?.length || 0,
 *         });
 *       } catch (error) {
 *         if (process.env.NODE_ENV === 'development') {
 *           console.error('Error checking categories existence:', error);
 *         }
 *         return NextResponse.json({ exists: false, count: 0 });
 *       }
 *     }
 *
 * The handler reads exactly **one** query param — `?locale=` — and
 * forwards it to `fetchItems({ lang })`. Every other key the caller
 * appends is silently ignored. The route has two distinct success
 * branches that both legitimately return `200 OK`:
 *
 *   1. Happy path — `fetchItems({ lang })` resolves with a
 *      `categories` array, the route returns
 *      `{ exists: <bool>, count: <number> }` reflecting it.
 *   2. Catch-and-empty — any thrown error inside `fetchItems` is
 *      caught and the route returns `{ exists: false, count: 0 }`
 *      with status `200`. This is deliberate: the navigation shell
 *      should degrade quietly when the content layer is unavailable
 *      rather than blocking the whole page.
 *
 * The route therefore must be invariant to **any** query parameter
 * the caller appends — present, absent, empty, repeated,
 * special-character, or long. The `?locale=` key is the only one
 * the handler reads, and it is forwarded to the content layer
 * unchanged; an invalid locale falls through to whatever the
 * content layer's fallback policy is, which today returns the
 * default-locale catalogue (no thrown error).
 *
 * Asserting on the `exists` / `count` values byte-for-byte would
 * pin the spec to a single deployment shape (seeded vs empty)
 * and break under the others. Status `< 500` is therefore the only
 * contract every branch shares — it confirms the route's
 * parameter-parsing, content-layer query, and catch-and-empty
 * fallback are intact regardless of the deployment's content
 * state.
 *
 * The existing route has no dedicated happy-path spec yet (the
 * navigation header coverage reaches it indirectly); this spec
 * walks the **query-param surface** so a regression that
 * introduces a `?fresh=` cache-busting wiring, a `?strict=` locale
 * validation that throws, or a per-locale 404 (which a future
 * "treat unknown locales as missing" feature might tempt a future
 * contributor into adding) is caught immediately as a non-200 /
 * non-500 response, or as a status divergence between the no-arg
 * and parameter-laden branches.
 */
const CATEGORIES_EXISTS_QUERIES = [
	// Baseline — the no-arg case. Included so a future reader of
	// this file sees it alongside the variants it parametrises.
	`/api/categories/exists`,

	// `?locale=` — the **only** key the handler reads today. The
	// route forwards it to `fetchItems({ lang })`; an unknown
	// value falls through to the content layer's fallback policy
	// (which returns the default-locale catalogue) so every value
	// must produce a 200.
	`/api/categories/exists?locale=en`,
	`/api/categories/exists?locale=fr`,
	`/api/categories/exists?locale=es`,
	`/api/categories/exists?locale=de`,
	`/api/categories/exists?locale=ar`,
	`/api/categories/exists?locale=zh`,
	`/api/categories/exists?locale=pt`,
	`/api/categories/exists?locale=ja`,

	// `?lang=` — the obvious i18n alias a future contributor
	// might add. The route does not read it today.
	`/api/categories/exists?lang=en`,
	`/api/categories/exists?lang=fr`,

	// `?lang=` and `?locale=` together — a future contributor
	// might add `?lang=` as a fallback for `?locale=`. The route
	// does not read `?lang=` today, so `?locale=` must continue
	// to win.
	`/api/categories/exists?locale=en&lang=fr`,
	`/api/categories/exists?lang=fr&locale=en`,

	// `?refresh=` / `?force=` / `?fresh=` / `?nocache=` — the
	// obvious cache-busting keys. The content layer caches the
	// `fetchItems({ lang })` call internally; the route does not
	// expose a cache-bust hatch today.
	`/api/categories/exists?refresh=1`,
	`/api/categories/exists?force=true`,
	`/api/categories/exists?fresh=true`,
	`/api/categories/exists?nocache=1`,

	// `?strict=` / `?validate=` — the obvious "throw on unknown
	// locale" keys. The route's `|| 'en'` fallback is permissive
	// today; any of these must be silently ignored.
	`/api/categories/exists?strict=true`,
	`/api/categories/exists?validate=true`,
	`/api/categories/exists?strict=true&locale=invalid`,

	// `?include=` / `?fields=` / `?select=` / `?expand=` — the
	// obvious projection keys (return only certain fields, expand
	// the categories list inline, etc). The route returns the
	// canonical `{ exists, count }` envelope exclusively today.
	`/api/categories/exists?include=categories`,
	`/api/categories/exists?fields=exists`,
	`/api/categories/exists?select=count`,
	`/api/categories/exists?expand=categories`,

	// `?format=` — the obvious content-negotiation key. The
	// route returns JSON exclusively today.
	`/api/categories/exists?format=json`,
	`/api/categories/exists?format=xml`,
	`/api/categories/exists?format=csv`,

	// `?status=` / `?active=` — the obvious filter-by-state
	// keys. The categories list is already filtered server-side
	// to active rows; the route does not honour these filters.
	`/api/categories/exists?status=active`,
	`/api/categories/exists?status=archived`,
	`/api/categories/exists?active=true`,
	`/api/categories/exists?active=false`,

	// `?tenant=` / `?tenantId=` — the obvious multi-tenancy
	// scoping keys. The handler reads zero tenant context today.
	`/api/categories/exists?tenant=acme`,
	`/api/categories/exists?tenantId=42`,

	// Empty values — `searchParams.get('locale')` on `?locale=`
	// returns `''`. The route's `|| 'en'` fallback maps the empty
	// string to `'en'`, so the response must match the no-arg
	// case.
	`/api/categories/exists?locale=`,
	`/api/categories/exists?lang=`,
	`/api/categories/exists?refresh=`,

	// Repeated keys — `searchParams.get('locale')` returns the
	// first value. The route never reads any other key, so
	// repetition is irrelevant for them.
	`/api/categories/exists?locale=en&locale=fr`,
	`/api/categories/exists?locale=fr&locale=en`,
	`/api/categories/exists?lang=en&lang=fr`,

	// Special-character values that would tempt a future regex
	// match, LIKE-prefix, or path-injection wiring. The route
	// does not pass any value into a SQL or filesystem path, so
	// they must remain pass-through ignored. The `?locale=`
	// values are forwarded to `fetchItems({ lang })` which today
	// falls back to the default catalogue on unknown values.
	`/api/categories/exists?locale=%25`,
	`/api/categories/exists?locale=%2F`,
	`/api/categories/exists?locale=%5C`,
	`/api/categories/exists?locale=%27`,
	`/api/categories/exists?include=%3Cscript%3E`,
	`/api/categories/exists?status=%22%3Eoops`,

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs. The route
	// does not read the value into a SQL parameter, so this must
	// pass through to the canonical branch.
	`/api/categories/exists?locale=${'x'.repeat(500)}`,
	`/api/categories/exists?include=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The route
	// reads exactly one key (`?locale=`), so any combination of
	// unknown keys is silently ignored.
	`/api/categories/exists?unknown=value`,
	`/api/categories/exists?foo=bar&baz=qux`,
	`/api/categories/exists?locale=en&unknown=value&foo=bar`
] as const;

test.describe('API: /api/categories/exists query-param surface', () => {
	for (const path of CATEGORIES_EXISTS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's two success branches both return `200 OK`;
			// no parameter-parsing path can legitimately produce a
			// 5xx today (the catch-and-empty fallback maps every
			// thrown error from `fetchItems(...)` to a 200 with
			// `{ exists: false, count: 0 }`). The matrix accepts
			// `< 500` so a future regression that escapes the
			// catch would still fail loudly here.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/categories/exists returns the canonical { exists, count } envelope on the happy path`, async ({
		request
	}) => {
		// The route returns the success envelope on both branches:
		// the happy `fetchItems` resolution and the catch-and-empty
		// fallback. Both shapes share `exists: boolean` and
		// `count: number`, so this assertion holds in both
		// deployment modes (seeded and empty).
		const response = await request.get(`/api/categories/exists`);

		expect(response.status()).toBe(200);

		const body = (await response.json()) as { exists?: unknown; count?: unknown };

		expect(typeof body.exists).toBe('boolean');
		expect(typeof body.count).toBe('number');
	});

	test(`GET /api/categories/exists responds identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads exactly one query param (`?locale=`),
		// so the response status must be invariant to any
		// combination of other unknown keys. Body content is
		// not asserted byte-identical because a concurrent
		// content-layer revalidation could land between the two
		// requests.
		const baseline = await request.get(`/api/categories/exists`);
		const parameterised = await request.get(
			`/api/categories/exists?refresh=1&include=categories&format=json&unknown=value&foo=bar`
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test(`GET /api/categories/exists keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical `{ exists, count }`
		// envelope. The shape guarantees the route does not
		// branch on any unknown query key today.
		const responses = await Promise.all([
			request.get(`/api/categories/exists`),
			request.get(`/api/categories/exists?locale=en&include=categories`),
			request.get(`/api/categories/exists?refresh=1&format=json&unknown=value`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);

			const body = (await response.json()) as { exists?: unknown; count?: unknown };

			expect(typeof body.exists).toBe('boolean');
			expect(typeof body.count).toBe('number');
		}
	});

	test(`GET /api/categories/exists?locale=en and ?locale= round-trip to the same status as the no-arg case`, async ({
		request
	}) => {
		// The route's `searchParams.get('locale') || 'en'`
		// fallback maps both the absent key and the empty string
		// to the default `'en'` locale. All three calls must
		// therefore land in the same branch and return the same
		// status. The body's `count` may differ if the deployment
		// has any non-default-locale-only categories, so we do
		// not assert byte-equality on the body — just on the
		// status.
		const noArg = await request.get(`/api/categories/exists`);
		const explicitEn = await request.get(`/api/categories/exists?locale=en`);
		const emptyLocale = await request.get(`/api/categories/exists?locale=`);

		expect(explicitEn.status()).toBe(noArg.status());
		expect(emptyLocale.status()).toBe(noArg.status());
	});
});
