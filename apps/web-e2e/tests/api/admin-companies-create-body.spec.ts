import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the admin-only collection-level company-create endpoint
 * served by the `POST` export of
 * `apps/web/app/api/admin/companies/route.ts`.
 *
 * The companion `apps/web-e2e/tests/api/admin-companies-
 * query.spec.ts` covers the GET (paginated list) surface
 * of the same route. This spec covers the POST (create)
 * surface that no prior admin-tree smoke spec touches.
 *
 * `POST /api/admin/companies` is the sibling of the
 * `PUT /api/admin/companies/{id}` route covered by
 * `admin-companies-id-method.spec.ts`. They share the
 * SAME bare `{ error: 'Unauthorized' }` envelope, the
 * SAME Zod `parse()`-with-`details: [{field, message}]`
 * 400 envelope (NOT `safeParse()`), the SAME TWO 409
 * pre-create/-update uniqueness checks (with dynamically-
 * interpolated messages), and the SAME outer-catch
 * unique-constraint translation chain. The POST diverges
 * on:
 *   - **NO existence check** — distinct from the PUT
 *     which checks the existing company FIRST.
 *   - **`createCompany(validatedData)` call** instead of
 *     `updateCompany(id, ...)`.
 *   - **Status 201 success branch** with `{ success:
 *     true, data: <company> }`.
 *
 * The smoke layer pins the same family of unauth-branch
 * invariants here as on the PUT sibling, but for the
 * collection-level create surface.
 *
 *   1. **Single-step inline `!session?.user?.isAdmin`
 *      gate** → 401 `{ error: 'Unauthorized' }` (BARE
 *      envelope, NO `success` key).
 *   2. **JSON body parse via `await request.json()`**
 *      AFTER the gate. NOT wrapped in a per-call
 *      try/catch.
 *   3. **Zod `parse()` (NOT `safeParse()`) inside an
 *      inline try/catch** — `createCompanySchema.parse(
 *      body)`. Catches `ZodError` and returns 400 with
 *      a custom `details: [{field, message}]` array.
 *   4. **TWO 409 Conflict pre-create uniqueness
 *      checks**:
 *        (a) `getCompanyByDomain(...)` → 409 `'Company
 *            with domain '<domain>' already exists'`
 *            (dynamically-interpolated).
 *        (b) `getCompanyBySlug(...)` → 409 `'Company
 *            with slug '<slug>' already exists'`
 *            (dynamically-interpolated).
 *   5. **`createCompany(validatedData)` call** AFTER
 *      all pre-create checks pass.
 *   6. **Success payload** — `{ success: true, data:
 *      <company> }` with status 201.
 *   7. **Outer-catch unique-constraint translation
 *      chain** — `error.message.includes('unique
 *      constraint' \| 'duplicate key')` followed by
 *      `domain` / `slug` substring checks → 409 with
 *      three distinct message variants. Else 500
 *      `{ error: 'Failed to create company' }`.
 *   8. **Method-resolution surface** — the route
 *      exports `GET` and `POST`. PUT / PATCH / DELETE
 *      must round-trip to a `< 500` status.
 *
 * Where the immediately-preceding `admin-clients-
 * create-body.spec.ts` walks the bare-envelope POST
 * with a get-or-create user side-effect, this spec
 * walks the bare-envelope POST with a Zod-`parse()`-
 * with-`details`-envelope validation chain and the
 * same uniqueness checks as its PUT sibling — a
 * complementary surface that no prior admin-tree
 * smoke spec covers.
 */
const COMPANIES_PATH = '/api/admin/companies';

const ADMIN_COMPANIES_CREATE_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { Cookie: 'authjs.session-token=fabricated' }, label: 'fabricated authjs session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { Authorization: 'Basic anything' }, label: 'Basic authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const VALID_BODY = {
	name: 'Acme Corporation',
	website: 'https://acme.com',
	domain: 'acme.com',
	slug: 'acme-corporation',
	status: 'active' as const
};

const ADMIN_COMPANIES_CREATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (Zod) if reachable)' },

	// Zod-valid bodies (would proceed to dup-domain/-slug checks if reachable).
	{ data: VALID_BODY, label: 'fully-valid body' },
	{ data: { name: 'Acme' }, label: 'name-only body (smaller subset, would 400 if other fields required by schema)' },
	{ data: { ...VALID_BODY, domain: 'duplicate.com' }, label: 'valid + duplicate domain (would 409 (a) if reachable)' },
	{ data: { ...VALID_BODY, slug: 'duplicate' }, label: 'valid + duplicate slug (would 409 (b) if reachable)' },

	// Zod-invalid probes.
	{ data: { ...VALID_BODY, slug: 'INVALID UPPERCASE' }, label: 'invalid slug pattern (would 400 ZodError if reachable)' },
	{ data: { ...VALID_BODY, website: 'not-a-uri' }, label: 'invalid website URI (would 400 ZodError if reachable)' },
	{ data: { ...VALID_BODY, name: 'a'.repeat(256) }, label: 'too-long name (would 400 ZodError if reachable)' },
	{ data: { ...VALID_BODY, status: 'invalid-status' }, label: 'invalid status enum (would 400 ZodError if reachable)' },

	// Bypass attempts.
	{ data: { ...VALID_BODY, isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { ...VALID_BODY, tenantId: 'fabricated' }, label: 'fabricated tenantId attempt' },
	{ data: { ...VALID_BODY, padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Validation error',
	'Failed to create company',
	'Company with this information already exists',
	'Company with this domain already exists',
	'Company with this slug already exists'
] as const;

const FORBIDDEN_409_PREFIXES = [
	/^Company with domain '/,
	/^Company with slug '/
] as const;

const FORBIDDEN_KEYS = ['data', 'details', 'success'] as const;

const BARE_401_MESSAGE = 'Unauthorized';
const CANONICAL_LONGER_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/companies POST body / header surface', () => {
	for (const { headers, label } of ADMIN_COMPANIES_CREATE_HEADERS) {
		test(`POST ${COMPANIES_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(COMPANIES_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_COMPANIES_CREATE_BODIES) {
		test(`POST ${COMPANIES_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(COMPANIES_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${COMPANIES_PATH} returns 401 with the bare Unauthorized envelope (NOT canonical longer)`, async ({
		request
	}) => {
		const response = await request.post(COMPANIES_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: BARE_401_MESSAGE });
		expect(body.error).not.toBe(CANONICAL_LONGER_401_MESSAGE);
	});

	test(`POST ${COMPANIES_PATH} unauth envelope has NO success key`, async ({ request }) => {
		const response = await request.post(COMPANIES_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
	});

	test(`POST ${COMPANIES_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// Success branch: status 201 with `{ success:
		// true, data: <company> }`. Zod 400 envelope:
		// `{ error: 'Validation error', details: [...] }`.
		// The unauth branch must NEVER reach either.
		const response = await request.post(COMPANIES_PATH, { data: VALID_BODY });
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
	});

	test(`POST ${COMPANIES_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(COMPANIES_PATH),
			request.post(COMPANIES_PATH, { data: {} }),
			request.post(COMPANIES_PATH, { data: VALID_BODY }),
			request.post(COMPANIES_PATH, { data: { ...VALID_BODY, slug: 'INVALID UPPERCASE' } }),
			request.post(COMPANIES_PATH, { data: { ...VALID_BODY, domain: 'duplicate.com' } }),
			request.post(COMPANIES_PATH, { data: { ...VALID_BODY, slug: 'duplicate' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
			// Dynamic 409 messages.
			if (typeof body.error === 'string') {
				for (const re of FORBIDDEN_409_PREFIXES) {
					expect(body.error).not.toMatch(re);
				}
			}
		}
	});

	test(`POST ${COMPANIES_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(COMPANIES_PATH);
		const responses = await Promise.all([
			request.post(COMPANIES_PATH, { data: {} }),
			request.post(COMPANIES_PATH, { data: VALID_BODY }),
			request.post(COMPANIES_PATH, { data: { ...VALID_BODY, slug: 'INVALID UPPERCASE' } }),
			request.post(COMPANIES_PATH, { data: { ...VALID_BODY, isAdmin: true } }),
			request.post(COMPANIES_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(COMPANIES_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${COMPANIES_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(COMPANIES_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(COMPANIES_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(COMPANIES_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(COMPANIES_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(COMPANIES_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(COMPANIES_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(COMPANIES_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(COMPANIES_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${COMPANIES_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.put(COMPANIES_PATH),
			request.patch(COMPANIES_PATH),
			request.delete(COMPANIES_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${COMPANIES_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(COMPANIES_PATH, { data: 'not-json' }),
			request.post(COMPANIES_PATH, { data: '{ broken: json' }),
			request.post(COMPANIES_PATH, { data: '{"name":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${COMPANIES_PATH} Zod validation chain is NOT entered on the unauth branch`, async ({ request }) => {
		// On the auth branch, every Zod-invalid body shape
		// triggers a `ZodError` that the inline try/catch
		// catches and translates to a 400 with `details:
		// [{field, message}]`. The unauth branch must
		// NEVER contain a `details` key and must NEVER
		// echo `'Validation error'`.
		const responses = await Promise.all([
			request.post(COMPANIES_PATH, { data: { ...VALID_BODY, slug: 'INVALID UPPERCASE' } }),
			request.post(COMPANIES_PATH, { data: { ...VALID_BODY, website: 'not-a-uri' } }),
			request.post(COMPANIES_PATH, { data: { ...VALID_BODY, name: 'a'.repeat(256) } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.details).toBeUndefined();
			expect(body.error).not.toBe('Validation error');
		}
	});

	test(`POST ${COMPANIES_PATH} uniqueness-check 409 branch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(COMPANIES_PATH, { data: { ...VALID_BODY, domain: 'duplicate.com' } }),
			request.post(COMPANIES_PATH, { data: { ...VALID_BODY, slug: 'duplicate' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			if (typeof body.error === 'string') {
				for (const re of FORBIDDEN_409_PREFIXES) {
					expect(body.error).not.toMatch(re);
				}
			}
		}
	});

	test(`POST ${COMPANIES_PATH} createCompany call is NOT entered on the unauth branch`, async ({ request }) => {
		// A regression that re-orders `createCompany(...)`
		// before the gate would surface here: the unauth
		// response would have status 201 with a `data`
		// key.
		const response = await request.post(COMPANIES_PATH, { data: VALID_BODY });
		expect(response.status()).not.toBe(201);
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBeUndefined();
	});

	test(`POST ${COMPANIES_PATH} unique-constraint outer-catch chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The outer catch maps DB unique-constraint
		// errors to one of three 409 envelopes. The
		// unauth branch must NEVER reach this catch.
		const response = await request.post(COMPANIES_PATH, { data: { ...VALID_BODY, domain: 'acme.com' } });
		const body = await response.json();
		expect(body.error).not.toBe('Company with this domain already exists');
		expect(body.error).not.toBe('Company with this slug already exists');
		expect(body.error).not.toBe('Company with this information already exists');
	});
});
