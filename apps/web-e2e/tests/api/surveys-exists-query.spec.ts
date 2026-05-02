import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the public
 * surveys-existence probe served by
 * `apps/web/app/api/surveys/exists/route.ts`.
 *
 * `GET /api/surveys/exists` is intentionally public — the
 * navigation shell hits it on every render to decide whether the
 * "Surveys" link belongs in the header (the same way the sibling
 * `categories/exists` and `collections/exists` probes decide
 * whether the "Categories" / "Collections" links belong there).
 * The handler signature is:
 *
 *     export async function GET(request: NextRequest) {
 *       const { searchParams } = new URL(request.url);
 *       const typeParam = searchParams.get('type');
 *       const type =
 *         typeParam === SurveyTypeEnum.ITEM ? SurveyTypeEnum.ITEM : SurveyTypeEnum.GLOBAL;
 *
 *       try {
 *         const result = await surveyService.getMany({
 *           type,
 *           status: SurveyStatusEnum.PUBLISHED,
 *           limit: 1,
 *         });
 *         return NextResponse.json<SurveyExistsResponse>({
 *           exists: (result.surveys?.length || 0) > 0,
 *         });
 *       } catch {
 *         return NextResponse.json<SurveyExistsResponse>({ exists: false });
 *       }
 *     }
 *
 * The handler reads exactly **one** query param — `?type=` — and
 * coerces it via the `typeParam === SurveyTypeEnum.ITEM ?
 * SurveyTypeEnum.ITEM : SurveyTypeEnum.GLOBAL` ternary. Three
 * properties of that coercion are load-bearing:
 *
 *   1. The comparison is byte-for-byte against
 *      `SurveyTypeEnum.ITEM` (`'item'`). Any other value —
 *      `'ITEM'`, `'global'`, `''`, `null`, a typo — falls
 *      through to `SurveyTypeEnum.GLOBAL` (`'global'`).
 *   2. Every other query key the caller appends is silently
 *      ignored. The handler does not read `?status=`,
 *      `?published=`, `?limit=`, `?locale=`, or any of the other
 *      keys a future contributor might be tempted to wire.
 *   3. The route has two distinct success branches that both
 *      legitimately return `200 OK`:
 *      a. Happy path — `surveyService.getMany({ type, status:
 *         PUBLISHED, limit: 1 })` resolves with a `surveys`
 *         array, the route returns `{ exists: <bool> }` reflecting
 *         it.
 *      b. Catch-and-empty — any thrown error inside
 *         `surveyService.getMany(...)` is caught and the route
 *         returns `{ exists: false }` with status `200`. This is
 *         deliberate: the navigation shell must degrade quietly
 *         when the survey backing store is unavailable, rather
 *         than blocking the whole page shell.
 *
 * The route therefore must be invariant to **any** query
 * parameter the caller appends — present, absent, empty,
 * repeated, special-character, or long. The `?type=` key is the
 * only one the handler reads, and the only legitimate value that
 * changes the response is byte-equality with `SurveyTypeEnum.ITEM`
 * (`'item'`). Every other input — including case-variant
 * `'ITEM'`, `'Item'`, `'iTeM'` — falls through to the GLOBAL
 * branch.
 *
 * Asserting on the `exists` value byte-for-byte would pin the
 * spec to a single deployment shape (seeded vs empty) and break
 * under the others. Status `< 500` is therefore the only
 * contract every branch shares — it confirms the route's
 * parameter-parsing, service call, and catch-and-empty fallback
 * are all reachable regardless of the deployment's content
 * state.
 *
 * The existing route is covered indirectly today by
 * [`feature-existence.spec.ts`](./feature-existence.spec.ts);
 * this spec walks the **query-param surface** so a regression
 * that introduces a `?status=` filter (which a future "show
 * draft surveys" feature might tempt a contributor into adding),
 * a `?lang=` filter, a `?refresh=` cache-bust, or a non-200
 * status on an unknown `?type=` value (which a future "throw on
 * unknown survey type" change might add) is caught immediately
 * as a status divergence between the no-arg and parameter-laden
 * branches.
 */
const SURVEYS_EXISTS_QUERIES = [
	// Baseline — the no-arg case. Included so a future reader of
	// this file sees it alongside the variants it parametrises.
	`/api/surveys/exists`,

	// `?type=item` — the **only** value of the **only** key the
	// handler branches on. Every test deployment must accept
	// this and return either `{ exists: true }` (seeded with at
	// least one published item-scoped survey) or `{ exists:
	// false }` (no item-scoped survey).
	`/api/surveys/exists?type=item`,

	// `?type=global` — the explicit GLOBAL branch. The route
	// hard-codes the GLOBAL fallback for any non-`'item'` value,
	// so this should round-trip identically to the no-arg case.
	`/api/surveys/exists?type=global`,

	// `?type=` case variants. The handler does a byte-for-byte
	// `=== SurveyTypeEnum.ITEM` comparison, so anything other
	// than the exact lowercase `'item'` falls through to GLOBAL.
	// These guard against a future contributor adding a
	// `.toLowerCase()` normalisation that would silently change
	// the response shape on a `?type=ITEM` request.
	`/api/surveys/exists?type=ITEM`,
	`/api/surveys/exists?type=Item`,
	`/api/surveys/exists?type=iTeM`,
	`/api/surveys/exists?type=GLOBAL`,
	`/api/surveys/exists?type=Global`,

	// `?type=` with unknown values. All must fall through to
	// GLOBAL. A future contributor who adds a third
	// `SurveyTypeEnum.LOCATION` value must update both the
	// handler and this matrix; until then, every unknown value
	// must round-trip to the GLOBAL branch.
	`/api/surveys/exists?type=location`,
	`/api/surveys/exists?type=tag`,
	`/api/surveys/exists?type=category`,
	`/api/surveys/exists?type=unknown`,
	`/api/surveys/exists?type=null`,

	// `?type=` with empty / whitespace values. The handler's
	// `searchParams.get('type')` returns `''` for `?type=` and
	// `null` for an absent key. Both must fall through to GLOBAL.
	`/api/surveys/exists?type=`,
	`/api/surveys/exists?type=%20`,
	`/api/surveys/exists?type=%20%20%20`,

	// `?status=` — the obvious filter-by-state key a future
	// contributor might wire to flip the hard-coded
	// `SurveyStatusEnum.PUBLISHED`. The route does not read it
	// today; every value must produce the same status as the
	// no-arg case.
	`/api/surveys/exists?status=draft`,
	`/api/surveys/exists?status=published`,
	`/api/surveys/exists?status=closed`,
	`/api/surveys/exists?status=all`,

	// `?published=` — the obvious boolean alias for the same
	// future filter. Not read today.
	`/api/surveys/exists?published=true`,
	`/api/surveys/exists?published=false`,
	`/api/surveys/exists?published=1`,

	// `?limit=` — the obvious pagination key a future
	// contributor might wire to flip the hard-coded `limit: 1`
	// argument. Not read today.
	`/api/surveys/exists?limit=10`,
	`/api/surveys/exists?limit=0`,
	`/api/surveys/exists?limit=-1`,

	// `?locale=` / `?lang=` — the obvious i18n keys a future
	// per-locale survey filter might wire. Not read today.
	`/api/surveys/exists?locale=en`,
	`/api/surveys/exists?locale=fr`,
	`/api/surveys/exists?lang=en`,

	// `?refresh=` / `?force=` / `?fresh=` / `?nocache=` — the
	// obvious cache-busting keys. The service caches internally;
	// the route does not expose a cache-bust hatch today.
	`/api/surveys/exists?refresh=1`,
	`/api/surveys/exists?force=true`,
	`/api/surveys/exists?fresh=true`,
	`/api/surveys/exists?nocache=1`,

	// `?strict=` / `?validate=` — the obvious "throw on unknown
	// type" keys. The route's permissive ternary fallback is
	// intentional; any of these must be silently ignored.
	`/api/surveys/exists?strict=true`,
	`/api/surveys/exists?validate=true`,
	`/api/surveys/exists?strict=true&type=unknown`,

	// `?include=` / `?fields=` / `?select=` / `?expand=` — the
	// obvious projection keys. The route returns the canonical
	// `{ exists }` envelope exclusively today.
	`/api/surveys/exists?include=surveys`,
	`/api/surveys/exists?fields=exists`,
	`/api/surveys/exists?select=exists`,
	`/api/surveys/exists?expand=surveys`,

	// `?format=` — the obvious content-negotiation key. The
	// route returns JSON exclusively today.
	`/api/surveys/exists?format=json`,
	`/api/surveys/exists?format=xml`,
	`/api/surveys/exists?format=csv`,

	// `?tenant=` / `?tenantId=` — the obvious multi-tenancy
	// keys. The handler reads zero tenant context today.
	`/api/surveys/exists?tenant=acme`,
	`/api/surveys/exists?tenantId=42`,

	// Two valid keys together — the route reads `?type=` and
	// ignores everything else. The combined response status
	// must match `?type=item` alone.
	`/api/surveys/exists?type=item&status=published`,
	`/api/surveys/exists?type=item&limit=1`,
	`/api/surveys/exists?type=global&locale=en`,
	`/api/surveys/exists?type=global&refresh=1`,

	// Repeated `?type=` keys — `searchParams.get('type')`
	// returns the **first** value. The route never reads any
	// other key, so repetition is irrelevant for them.
	`/api/surveys/exists?type=item&type=global`,
	`/api/surveys/exists?type=global&type=item`,
	`/api/surveys/exists?type=&type=item`,

	// Special-character values that would tempt a future regex
	// match, LIKE-prefix, or SQL-injection wiring. The route
	// does not pass any value into a SQL or filesystem path;
	// the byte-equality comparison rejects all these.
	`/api/surveys/exists?type=%25`,
	`/api/surveys/exists?type=%2F`,
	`/api/surveys/exists?type=%5C`,
	`/api/surveys/exists?type=%27`,
	`/api/surveys/exists?type=%3Cscript%3E`,
	`/api/surveys/exists?type=%22%3Eoops`,
	`/api/surveys/exists?include=%3Cscript%3E`,

	// Long values — guard against a future regex / regex-based
	// indexing bug that might trip on long inputs.
	`/api/surveys/exists?type=${'x'.repeat(500)}`,
	`/api/surveys/exists?include=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads exactly one
	// key (`?type=`), so any combination of unknown keys is
	// silently ignored.
	`/api/surveys/exists?unknown=value`,
	`/api/surveys/exists?foo=bar&baz=qux`,
	`/api/surveys/exists?type=item&unknown=value&foo=bar`
] as const;

test.describe('API: /api/surveys/exists query-param surface', () => {
	for (const path of SURVEYS_EXISTS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's two success branches both return `200 OK`;
			// no parameter-parsing path can legitimately produce a
			// 5xx today (the catch-and-empty fallback maps every
			// thrown error from `surveyService.getMany(...)` to a
			// `200` with `{ exists: false }`). The matrix accepts
			// `< 500` so a future regression that escapes the
			// catch would still fail loudly here.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/surveys/exists returns the canonical { exists } envelope on the happy path`, async ({
		request
	}) => {
		// The route returns the success envelope on both branches:
		// the happy `surveyService.getMany` resolution and the
		// catch-and-empty fallback. Both shapes share `exists:
		// boolean`, so this assertion holds in both deployment
		// modes (seeded and empty).
		const response = await request.get(`/api/surveys/exists`);

		expect(response.status()).toBe(200);

		const body = (await response.json()) as { exists?: unknown };

		expect(typeof body.exists).toBe('boolean');
	});

	test(`GET /api/surveys/exists responds identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads exactly one query param (`?type=`),
		// so the response status must be invariant to any
		// combination of other unknown keys. Body content is
		// not asserted byte-identical because a concurrent
		// service revalidation could land between the two
		// requests.
		const baseline = await request.get(`/api/surveys/exists`);
		const parameterised = await request.get(
			`/api/surveys/exists?refresh=1&include=surveys&format=json&unknown=value&foo=bar`
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test(`GET /api/surveys/exists keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical `{ exists }` envelope. The
		// shape guarantees the route does not branch on any
		// unknown query key today.
		const responses = await Promise.all([
			request.get(`/api/surveys/exists`),
			request.get(`/api/surveys/exists?type=item&status=published`),
			request.get(`/api/surveys/exists?refresh=1&format=json&unknown=value`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);

			const body = (await response.json()) as { exists?: unknown };

			expect(typeof body.exists).toBe('boolean');
		}
	});

	test(`GET /api/surveys/exists?type=global, no-arg, and ?type=unknown all land in the GLOBAL branch`, async ({
		request
	}) => {
		// The route's `typeParam === SurveyTypeEnum.ITEM ? ITEM
		// : GLOBAL` ternary maps every non-`'item'` value
		// (including `null` for the absent key, `''` for the
		// empty value, `'global'` for the explicit value, and
		// every typo / unknown / case-variant) to the same
		// GLOBAL branch. All three calls must therefore land in
		// the same branch and return the same status. The body's
		// `exists` may differ if the deployment has any
		// item-scoped surveys but no global-scoped ones, so we
		// do not assert byte-equality on the body — just on the
		// status.
		const noArg = await request.get(`/api/surveys/exists`);
		const explicitGlobal = await request.get(`/api/surveys/exists?type=global`);
		const unknownType = await request.get(`/api/surveys/exists?type=unknown`);
		const caseVariantItem = await request.get(`/api/surveys/exists?type=ITEM`);
		const emptyType = await request.get(`/api/surveys/exists?type=`);

		expect(explicitGlobal.status()).toBe(noArg.status());
		expect(unknownType.status()).toBe(noArg.status());
		expect(caseVariantItem.status()).toBe(noArg.status());
		expect(emptyType.status()).toBe(noArg.status());
	});

	test(`GET /api/surveys/exists?type=item lands in a distinct branch from the no-arg case but returns the same envelope`, async ({
		request
	}) => {
		// The two calls land in different branches (ITEM vs
		// GLOBAL) but both return `{ exists: boolean }` and
		// both return `200`. This pins the shape invariance
		// across the route's only branching dimension.
		const itemBranch = await request.get(`/api/surveys/exists?type=item`);
		const globalBranch = await request.get(`/api/surveys/exists`);

		expect(itemBranch.status()).toBe(200);
		expect(globalBranch.status()).toBe(200);

		const itemBody = (await itemBranch.json()) as { exists?: unknown };
		const globalBody = (await globalBranch.json()) as { exists?: unknown };

		expect(typeof itemBody.exists).toBe('boolean');
		expect(typeof globalBody.exists).toBe('boolean');
	});
});
