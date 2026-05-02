import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the public
 * feature-existence endpoints — the four GET handlers the
 * marketing surface uses to gate UI (e.g. hide the Categories link
 * if there are no categories, hide the Surveys link in the nav,
 * gate the export button on `/api/items/export/settings`, etc):
 *
 *   - `apps/web/app/api/categories/exists/route.ts` — reads `?locale`
 *     (defaults to `'en'`); returns `{ exists, count }`.
 *   - `apps/web/app/api/collections/exists/route.ts` — **no-arg**;
 *     returns `{ exists, count }` (or `{ exists: false, count: 0,
 *     error }` on a 500 path).
 *   - `apps/web/app/api/surveys/exists/route.ts` — reads `?type`
 *     (`'item'` | `'global'`, defaults to `'global'`); returns
 *     `{ exists }`.
 *   - `apps/web/app/api/items/export/settings/route.ts` — **no-arg**;
 *     returns `{ export_enabled: boolean }`.
 *
 * The existing
 * [`feature-existence.spec.ts`](./feature-existence.spec.ts) covers
 * the no-arg / single-canonical-arg happy path for each endpoint;
 * this spec walks the **query-param surface** so a regression that
 * introduces a typo'd `searchParams.get(...)` call (which a future
 * filter / pagination / sort wiring might tempt a future contributor
 * into adding) is caught immediately as a non-200 / non-500 response.
 *
 * The route contracts are deliberately permissive:
 *
 *   - `categories/exists` reads exactly one key (`locale`) and
 *     applies a `|| 'en'` default. Any other query parameter is
 *     silently ignored.
 *   - `collections/exists` reads **zero** keys. The `request`
 *     parameter is named `_request` to make the no-read intent
 *     explicit. Any query parameter is silently ignored.
 *   - `surveys/exists` reads exactly one key (`type`) and gates it
 *     through a strict `=== SurveyTypeEnum.ITEM` check that
 *     defaults to `SurveyTypeEnum.GLOBAL` for any other value
 *     (including missing). Any other query parameter is silently
 *     ignored.
 *   - `items/export/settings` reads **zero** keys. The handler is
 *     `export async function GET()` (no `request` parameter).
 *
 * Payload shape and `Content-Type` are intentionally not asserted on
 * the bulk loop because the response can be either the success
 * envelope or the catch-and-degrade envelope (every endpoint
 * deliberately swallows its data-layer errors and returns a
 * `{ exists: false, ... }` shape so the marketing surface keeps
 * rendering). The single envelope-shape assertions at the bottom
 * pin the contract for each endpoint.
 */
const FEATURE_EXISTENCE_QUERIES = [
	// Baseline — same paths as `feature-existence.spec.ts`. Included
	// so the query-param surface enumeration starts from the no-arg
	// (or single-canonical-arg) case.
	'/api/categories/exists',
	'/api/collections/exists',
	'/api/surveys/exists',
	'/api/items/export/settings',

	// `?locale=` — read by `categories/exists`; ignored by the other
	// three. The route's `|| 'en'` default means unknown / empty
	// locales fall back to English; the data layer does the rest.
	'/api/categories/exists?locale=en',
	'/api/categories/exists?locale=fr',
	'/api/categories/exists?locale=es',
	'/api/categories/exists?locale=de',
	'/api/categories/exists?locale=ar',
	'/api/categories/exists?locale=zh',
	'/api/categories/exists?locale=',
	'/api/categories/exists?locale=invalid-locale',
	'/api/collections/exists?locale=fr',
	'/api/surveys/exists?locale=fr',
	'/api/items/export/settings?locale=fr',

	// `?type=` — read by `surveys/exists`; ignored by the other
	// three. The route's strict `=== SurveyTypeEnum.ITEM` check
	// means any value other than `'item'` (including `'global'`,
	// `'GLOBAL'`, `''`, `'unknown'`) maps to the default
	// `SurveyTypeEnum.GLOBAL` query.
	'/api/surveys/exists?type=item',
	'/api/surveys/exists?type=global',
	'/api/surveys/exists?type=ITEM',
	'/api/surveys/exists?type=GLOBAL',
	'/api/surveys/exists?type=',
	'/api/surveys/exists?type=unknown',
	'/api/categories/exists?type=item',
	'/api/collections/exists?type=item',
	'/api/items/export/settings?type=item',

	// `?limit=` / `?offset=` / `?page=` / `?pageSize=` — the obvious
	// pagination keys a future contributor might add when wiring up
	// "show me the first N categories" UI. None of them are read
	// today; all of them must produce the same response as the
	// no-arg case.
	'/api/categories/exists?limit=10',
	'/api/categories/exists?offset=5',
	'/api/categories/exists?page=2',
	'/api/categories/exists?pageSize=25',
	'/api/collections/exists?limit=10',
	'/api/collections/exists?offset=5',
	'/api/surveys/exists?limit=10',
	'/api/surveys/exists?offset=5',
	'/api/items/export/settings?limit=10',
	'/api/items/export/settings?offset=5',

	// `?q=` / `?search=` / `?filter=` / `?prefix=` — the obvious
	// type-ahead keys. Today none of the four endpoints filter by
	// substring; a future filter wiring would need a Spec Kit
	// change.
	'/api/categories/exists?q=Tech',
	'/api/categories/exists?search=Tech',
	'/api/categories/exists?filter=name',
	'/api/categories/exists?prefix=T',
	'/api/collections/exists?q=Tech',
	'/api/surveys/exists?q=Survey',
	'/api/items/export/settings?q=enabled',

	// `?sort=` / `?order=` / `?direction=` — the obvious sort keys.
	// None of the four endpoints sort their output today; the
	// existence-only contract returns a boolean (and a count, where
	// applicable), so sorting is meaningless. The keys must remain
	// ignored.
	'/api/categories/exists?sort=name',
	'/api/categories/exists?sort=name&order=asc',
	'/api/categories/exists?direction=desc',
	'/api/collections/exists?sort=name',
	'/api/surveys/exists?sort=name',
	'/api/items/export/settings?sort=name',

	// `?lang=` — the legacy alias for `locale`. Today none of the
	// four endpoints read this key; only `categories/exists` reads
	// `locale`. A regression that adds a `?lang=` fallback would
	// land here as the test shifting to an unexpected response.
	'/api/categories/exists?lang=fr',
	'/api/collections/exists?lang=fr',
	'/api/surveys/exists?lang=fr',
	'/api/items/export/settings?lang=fr',

	// Empty values for any of the above keys. `searchParams.get(...)`
	// on `?key=` returns `''`; `categories/exists` falls through its
	// `|| 'en'` default for empty `locale`, and `surveys/exists`
	// strict-checks `'' === 'item'` which evaluates `false` →
	// `SurveyTypeEnum.GLOBAL`. The response shape must remain
	// identical to the canonical case.
	'/api/categories/exists?locale=',
	'/api/categories/exists?q=',
	'/api/collections/exists?type=',
	'/api/surveys/exists?type=',
	'/api/surveys/exists?q=',
	'/api/items/export/settings?q=',

	// Repeated keys — `searchParams.get(name)` returns the **first**
	// value. `categories/exists?locale=fr&locale=en` reads `'fr'`
	// (the first `locale`); `surveys/exists?type=item&type=global`
	// reads `'item'` (the first `type`). The response must remain a
	// non-5xx status code in both cases.
	'/api/categories/exists?locale=fr&locale=en',
	'/api/surveys/exists?type=item&type=global',
	'/api/surveys/exists?type=global&type=item',
	'/api/categories/exists?limit=10&limit=20',
	'/api/collections/exists?limit=10&limit=20',

	// Special-character values that would tempt a future regex
	// match, LIKE-prefix, or path-injection wiring. The four routes
	// do not pass any of these values into a SQL or filesystem
	// path, so they must remain pass-through ignored.
	'/api/categories/exists?locale=%25', // %
	'/api/categories/exists?locale=%2F', // /
	'/api/categories/exists?locale=%5C', // \
	'/api/categories/exists?locale=%27', // '
	'/api/surveys/exists?type=%25',
	'/api/surveys/exists?type=%2F',
	'/api/surveys/exists?type=%5C',

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs. The route does
	// not read the value into a SQL parameter, so this must pass
	// through to the canonical branch and respond either 200 or
	// the catch-and-degrade success envelope, never 5xx.
	`/api/categories/exists?locale=${'x'.repeat(500)}`,
	`/api/surveys/exists?type=${'y'.repeat(500)}`,
	`/api/collections/exists?q=${'z'.repeat(500)}`,
	`/api/items/export/settings?q=${'w'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The routes read
	// at most one key each (`locale` for categories, `type` for
	// surveys, none for collections / export-settings), so any
	// combination of unknown keys is silently ignored.
	'/api/categories/exists?unknown=value',
	'/api/categories/exists?foo=bar&baz=qux',
	'/api/categories/exists?locale=fr&unknown=value&foo=bar',
	'/api/collections/exists?unknown=value',
	'/api/collections/exists?foo=bar&baz=qux',
	'/api/surveys/exists?unknown=value',
	'/api/surveys/exists?foo=bar&baz=qux',
	'/api/surveys/exists?type=item&unknown=value&foo=bar',
	'/api/items/export/settings?unknown=value',
	'/api/items/export/settings?foo=bar&baz=qux'
] as const;

test.describe('API: Public feature-existence endpoints query-param surface', () => {
	for (const path of FEATURE_EXISTENCE_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// `categories/exists` and `surveys/exists` deliberately
			// catch their data-layer errors and degrade to a
			// `{ exists: false, ... }` 200; `collections/exists`
			// returns a 500 + degraded envelope on the catch path
			// (the only one of the four that surfaces a non-2xx),
			// but never a 5xx with no body. The bulk loop accepts
			// anything below 500 (the dominant happy path) and
			// the explicit 500-with-envelope path is asserted in
			// the dedicated `collections/exists` test below.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/categories/exists always returns the canonical { exists, count } envelope', async ({ request }) => {
		// The route's catch path returns `{ exists: false, count: 0 }`
		// with a 200 status — there is no 5xx branch. The success
		// path returns `{ exists: boolean, count: number }`. Both
		// branches share the same envelope shape, so the assertion
		// is single-pass.
		const response = await request.get('/api/categories/exists');

		expect(response.status()).toBe(200);

		const body = (await response.json()) as { exists?: unknown; count?: unknown };

		expect(typeof body.exists).toBe('boolean');
		expect(typeof body.count).toBe('number');
		expect(body.count as number).toBeGreaterThanOrEqual(0);
	});

	test('GET /api/categories/exists responds identically with and without bogus query parameters', async ({
		request
	}) => {
		// The route reads at most `?locale`, so any other parameter
		// must not affect the response status. Body content is not
		// asserted byte-identical because the data layer's natural
		// content may shift between calls if a concurrent admin
		// write lands between the two requests.
		const baseline = await request.get('/api/categories/exists');
		const parameterised = await request.get(
			'/api/categories/exists?limit=10&offset=5&sort=name&order=asc&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/collections/exists always returns the canonical envelope', async ({ request }) => {
		// On the success path: `{ exists: boolean, count: number }`
		// with a 200. On the catch path: `{ exists: false, count: 0,
		// error: 'Failed to check collections existence' }` with a
		// 500. Either branch must have `exists` as boolean and
		// `count` as a non-negative number.
		const response = await request.get('/api/collections/exists');

		expect([200, 500]).toContain(response.status());

		const body = (await response.json()) as {
			exists?: unknown;
			count?: unknown;
			error?: unknown;
		};

		expect(typeof body.exists).toBe('boolean');
		expect(typeof body.count).toBe('number');
		expect(body.count as number).toBeGreaterThanOrEqual(0);

		if (response.status() === 500) {
			expect(typeof body.error).toBe('string');
		}
	});

	test('GET /api/collections/exists responds identically with and without bogus query parameters', async ({
		request
	}) => {
		// `collections/exists` reads zero query params (the handler
		// names its parameter `_request`); status must be invariant
		// to any combination of unknown keys.
		const baseline = await request.get('/api/collections/exists');
		const parameterised = await request.get('/api/collections/exists?type=item&limit=10&sort=name&unknown=value');

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/surveys/exists always returns the canonical { exists } envelope', async ({ request }) => {
		// The route's catch path returns `{ exists: false }` with a
		// 200 — there is no 5xx branch. The success path returns
		// `{ exists: boolean }`. Both branches share the same
		// envelope shape.
		const response = await request.get('/api/surveys/exists');

		expect(response.status()).toBe(200);

		const body = (await response.json()) as { exists?: unknown };

		expect(typeof body.exists).toBe('boolean');
	});

	test('GET /api/surveys/exists responds identically for ?type=item and ?type=global', async ({ request }) => {
		// Both values are valid in the route's strict-equality check.
		// The two responses may have different `exists` payloads (a
		// directory may have item-scoped surveys but no global ones),
		// but the response status code must be identical for both.
		const itemResponse = await request.get('/api/surveys/exists?type=item');
		const globalResponse = await request.get('/api/surveys/exists?type=global');

		expect(itemResponse.status()).toBe(globalResponse.status());
		expect(itemResponse.status()).toBe(200);
	});

	test('GET /api/items/export/settings always returns { export_enabled: boolean }', async ({ request }) => {
		// The route is the simplest of the four: a `GET()` with no
		// arguments that returns the boolean output of
		// `getExportEnabled()`. There is no 5xx branch, no catch
		// path, and no query-param dependency. The envelope is a
		// single key.
		const response = await request.get('/api/items/export/settings');

		expect(response.status()).toBe(200);

		const body = (await response.json()) as { export_enabled?: unknown };

		expect(typeof body.export_enabled).toBe('boolean');
	});

	test('GET /api/items/export/settings responds identically with and without bogus query parameters', async ({
		request
	}) => {
		// The handler signature is `export async function GET()` —
		// no `request` parameter, no `searchParams.get()` call. Any
		// query string the caller appends must be silently ignored,
		// and the status must remain 200.
		const baseline = await request.get('/api/items/export/settings');
		const parameterised = await request.get(
			'/api/items/export/settings?type=item&limit=10&unknown=value&q=enabled'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(200);
	});
});
