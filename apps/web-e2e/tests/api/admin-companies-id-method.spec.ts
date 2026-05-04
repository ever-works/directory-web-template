import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multi-method / dynamic-id /
 * body / header surface** of the admin-only single-company
 * CRUD endpoint served by
 * `apps/web/app/api/admin/companies/[id]/route.ts`.
 *
 * `GET /api/admin/companies/{id}`,
 * `PUT /api/admin/companies/{id}`, and
 * `DELETE /api/admin/companies/{id}` are the **first**
 * admin-tree routes the smoke layer covers as a triple-
 * method export that combines:
 *   - the **bare `{ error: 'Unauthorized' }` 401
 *     envelope** (NO `success: false` key) — matching the
 *     `admin/clients/[clientId]` shape, AND
 *   - a **Zod `parse()` (NOT `safeParse()`) body-
 *     validation step** wrapped in an inline try/catch
 *     that builds a custom `details: [{field, message}]`
 *     400 response — distinct from every prior PUT smoke
 *     which either uses `safeParse()` (sponsor-ad reject /
 *     cancel) or manual validation (items / users), AND
 *   - **TWO `409 Conflict` pre-update uniqueness checks**
 *     (`getCompanyByDomain(...)` and `getCompanyBySlug
 *     (...)`) with **dynamically-interpolated** 409 error
 *     messages (`'Company with domain '<domain>' already
 *     exists'` / `'Company with slug '<slug>' already
 *     exists'`), AND
 *   - an **outer-catch unique-constraint translation
 *     chain** that maps `error.message.includes('unique
 *     constraint' | 'duplicate key')` to 409 with three
 *     distinct message variants based on whether
 *     `domain` / `slug` / neither appears in the error
 *     message — distinct from every prior smoke's catch
 *     posture.
 *
 * All three handlers share:
 *   1. **Single-step inline `!session?.user?.isAdmin`
 *      gate** → 401 `{ error: 'Unauthorized' }` (bare
 *      envelope, NO `success` key — matching the
 *      `admin/clients/[clientId]` shape).
 *   2. **Bare 401 envelope** with NO `success` key on
 *      the 401 branch — distinct from the canonical-
 *      longer envelope of `admin/items/[id]` and from
 *      the hybrid `success: false` + bare envelope of
 *      `admin/users/[id]`.
 *   3. **Dynamic `[id]` segment** resolved AFTER the
 *      gate.
 *   4. **`console.error` + bare `{ error: '<msg>' }`
 *      catch** with handler-specific 500 messages
 *      (`'Failed to fetch company'` / `'Failed to update
 *      company'` / `'Failed to delete company'`).
 *
 * Each handler also has its own divergent post-gate
 * surface:
 *
 *   GET:
 *     - `getCompanyById(id)` → 404
 *       `{ error: 'Company not found' }` if missing.
 *     - Success payload `{ success: true, data:
 *       <company> }`.
 *
 *   PUT (the load-bearing surface):
 *     - **Existence check FIRST** —
 *       `getCompanyById(id)` → 404 if missing
 *       (BEFORE the body parse — distinct from every
 *       prior PUT smoke where the body parse runs
 *       first).
 *     - JSON body parse via `await request.json()`.
 *     - **Zod `parse()` (NOT `safeParse()`) inside an
 *       inline try/catch** — `updateCompanySchema.parse({
 *       id, ...body })`. Catches `ZodError` and returns
 *       400 with a custom `details: [{field, message}]`
 *       array (a UNIQUE envelope key no prior admin-tree
 *       smoke pins — distinct from every prior smoke
 *       which uses a flat `error` string).
 *     - **TWO 409 Conflict pre-update uniqueness
 *       checks**:
 *         - `getCompanyByDomain(...)` → 409
 *           `'Company with domain '<domain>' already
 *           exists'` (dynamic interpolation).
 *         - `getCompanyBySlug(...)` → 409 `'Company
 *           with slug '<slug>' already exists'` (dynamic
 *           interpolation).
 *     - `updateCompany(id, updateData)` after all
 *       pre-update checks pass.
 *     - 404 `'Company not found'` if `updateCompany(...)`
 *       returns falsy.
 *     - **Optional CRM sync** gated by
 *       `process.env.TWENTY_CRM_ENABLED !== 'false'`,
 *       wrapped in its own try/catch.
 *     - Success payload `{ success: true, data:
 *       <company> }`.
 *     - **Outer catch unique-constraint translation
 *       chain** — `error.message.includes('unique
 *       constraint' | 'duplicate key')` followed by
 *       `domain` / `slug` substring checks → 409 with
 *       three distinct message variants. Else 500
 *       `'Failed to update company'`.
 *
 *   DELETE:
 *     - `deleteCompany(id)` returns boolean.
 *     - 404 `'Company not found'` if `success === false`.
 *     - Success payload `{ success: true, message:
 *       'Company deleted successfully' }`.
 *
 * Where the immediately-preceding 403-on-unauth triple-
 * method `admin-comments-id-method.spec.ts` walks a route
 * with `getTenantId()` post-gate tenant resolution and
 * inline Drizzle queries, this spec walks the bare-
 * envelope triple-method `admin/companies/[id]` route
 * with Zod `parse()` (not `safeParse()`), the
 * `details: [...]` 400-validation-envelope key, two pre-
 * update uniqueness checks, and the outer-catch unique-
 * constraint translation chain — a complementary surface
 * that no prior admin-tree smoke spec covers.
 */
const COMPANY_IDS = [
	'company_1',
	'company_test',
	'company-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const COMPANY_PATH = (id: string) => `/api/admin/companies/${id}`;
const PROBE_ID = COMPANY_IDS[0];

const COMMON_HEADERS = [
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

const PUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Plausible update bodies.
	{ data: { name: 'Acme Updated' }, label: 'name-only update' },
	{ data: { website: 'https://acme.com' }, label: 'website-only update' },
	{ data: { domain: 'acme.com' }, label: 'domain update (would 409 if duplicate domain reachable)' },
	{ data: { slug: 'acme-updated' }, label: 'slug update (would 409 if duplicate slug reachable)' },
	{ data: { status: 'active' }, label: 'status active update' },
	{ data: { status: 'inactive' }, label: 'status inactive update' },

	// Zod schema invalid probes.
	{ data: { slug: 'INVALID UPPERCASE' }, label: 'invalid slug pattern (would 400 ZodError if reachable)' },
	{ data: { website: 'not-a-uri' }, label: 'invalid website URI (would 400 ZodError if reachable)' },
	{ data: { name: 'a'.repeat(256) }, label: 'too-long name (would 400 ZodError if reachable)' },
	{ data: { status: 'invalid-status' }, label: 'invalid status enum (would 400 ZodError if reachable)' },

	// Bypass attempts.
	{ data: { isAdmin: true, name: 'pwn' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', name: 'pwn' }, label: 'fabricated tenantId attempt' },
	{ data: { padding: 'x'.repeat(2_000), name: 'pwn' }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Company not found',
	'Failed to fetch company',
	'Failed to update company',
	'Failed to delete company',
	'Validation error',
	'Company deleted successfully',
	'Company with this information already exists',
	'Company with this domain already exists',
	'Company with this slug already exists'
] as const;

const FORBIDDEN_409_PREFIXES = [
	/^Company with domain '/,
	/^Company with slug '/
] as const;

const FORBIDDEN_KEYS = ['data', 'details'] as const;

const CANONICAL_LONGER_401_MESSAGE = 'Unauthorized. Admin access required.';
const BARE_401_MESSAGE = 'Unauthorized';

test.describe('API: /api/admin/companies/[id] GET / PUT / DELETE method / id / body / header surface', () => {
	for (const id of COMPANY_IDS) {
		test(`GET ${COMPANY_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.get(COMPANY_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${COMPANY_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.put(COMPANY_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${COMPANY_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.delete(COMPANY_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of COMMON_HEADERS) {
		test(`GET ${COMPANY_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(COMPANY_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${COMPANY_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(COMPANY_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${COMPANY_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(COMPANY_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${COMPANY_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(COMPANY_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${COMPANY_PATH(PROBE_ID)} returns 401 with the bare Unauthorized envelope (NOT canonical longer)`, async ({
		request
	}) => {
		const response = await request.get(COMPANY_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: BARE_401_MESSAGE });
		expect(body.error).not.toBe(CANONICAL_LONGER_401_MESSAGE);
	});

	test(`PUT ${COMPANY_PATH(PROBE_ID)} returns 401 with the bare Unauthorized envelope (NOT canonical longer)`, async ({
		request
	}) => {
		const response = await request.put(COMPANY_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: BARE_401_MESSAGE });
		expect(body.error).not.toBe(CANONICAL_LONGER_401_MESSAGE);
	});

	test(`DELETE ${COMPANY_PATH(PROBE_ID)} returns 401 with the bare Unauthorized envelope (NOT canonical longer)`, async ({
		request
	}) => {
		const response = await request.delete(COMPANY_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: BARE_401_MESSAGE });
		expect(body.error).not.toBe(CANONICAL_LONGER_401_MESSAGE);
	});

	test(`GET / PUT / DELETE ${COMPANY_PATH(PROBE_ID)} unauth envelope has NO success key`, async ({ request }) => {
		const responses = await Promise.all([
			request.get(COMPANY_PATH(PROBE_ID)),
			request.put(COMPANY_PATH(PROBE_ID)),
			request.delete(COMPANY_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(Object.keys(body)).toEqual(['error']);
			expect(body.success).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${COMPANY_PATH(PROBE_ID)} share the SAME 401 envelope shape on the unauth branch`, async ({
		request
	}) => {
		const [getResponse, putResponse, deleteResponse] = await Promise.all([
			request.get(COMPANY_PATH(PROBE_ID)),
			request.put(COMPANY_PATH(PROBE_ID)),
			request.delete(COMPANY_PATH(PROBE_ID))
		]);

		const [getBody, putBody, deleteBody] = await Promise.all([
			getResponse.json(),
			putResponse.json(),
			deleteResponse.json()
		]);

		expect(getBody).toEqual(putBody);
		expect(getBody).toEqual(deleteBody);
	});

	test(`GET / PUT / DELETE ${COMPANY_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// GET / PUT success: { success: true, data: <company> }.
		// DELETE success: { success: true, message: 'Company deleted successfully' }.
		// PUT 400 (Zod): { error: 'Validation error', details: [...] }.
		// The unauth branch must NEVER contain a `data`,
		// `details`, or `message` key, must NOT contain
		// `success: true`.
		const responses = await Promise.all([
			request.get(COMPANY_PATH(PROBE_ID)),
			request.put(COMPANY_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(COMPANY_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const key of FORBIDDEN_KEYS) {
				expect(body[key]).toBeUndefined();
			}
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${COMPANY_PATH(PROBE_ID)} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(COMPANY_PATH(PROBE_ID)),
			request.put(COMPANY_PATH(PROBE_ID)),
			request.put(COMPANY_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { slug: 'INVALID UPPERCASE' } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { domain: 'acme.com' } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { slug: 'duplicate-slug' } }),
			request.delete(COMPANY_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
			// The dynamic 409 messages
			// `'Company with domain '<domain>' already
			// exists'` and `'Company with slug '<slug>'
			// already exists'` are interpolated, so we
			// use regex prefix checks.
			if (typeof body.error === 'string') {
				for (const re of FORBIDDEN_409_PREFIXES) {
					expect(body.error).not.toMatch(re);
				}
			}
		}
	});

	test(`GET / PUT / DELETE ${COMPANY_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({
		request
	}) => {
		const getBaseline = await request.get(COMPANY_PATH(PROBE_ID));
		const putBaseline = await request.put(COMPANY_PATH(PROBE_ID));
		const deleteBaseline = await request.delete(COMPANY_PATH(PROBE_ID));

		const getResponses = await Promise.all(COMPANY_IDS.map((id) => request.get(COMPANY_PATH(id))));
		const putResponses = await Promise.all(COMPANY_IDS.map((id) => request.put(COMPANY_PATH(id))));
		const deleteResponses = await Promise.all(COMPANY_IDS.map((id) => request.delete(COMPANY_PATH(id))));

		for (const response of getResponses) {
			expect(response.status()).toBe(getBaseline.status());
		}
		for (const response of putResponses) {
			expect(response.status()).toBe(putBaseline.status());
		}
		for (const response of deleteResponses) {
			expect(response.status()).toBe(deleteBaseline.status());
		}
	});

	test(`PUT ${COMPANY_PATH(PROBE_ID)} has a stable status across body permutations`, async ({ request }) => {
		const baseline = await request.put(COMPANY_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(COMPANY_PATH(PROBE_ID), { data: {} }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { domain: 'acme.com' } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { slug: 'INVALID UPPERCASE' } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { website: 'not-a-uri' } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { isAdmin: true, name: 'pwn' } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { status: 'invalid' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET / PUT / DELETE ${COMPANY_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(COMPANY_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(COMPANY_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(COMPANY_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.put(COMPANY_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(COMPANY_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(COMPANY_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.delete(COMPANY_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(COMPANY_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(COMPANY_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${COMPANY_PATH(PROBE_ID)} cross-method probe (POST / PATCH) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(COMPANY_PATH(PROBE_ID)),
			request.patch(COMPANY_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${COMPANY_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.put(COMPANY_PATH(PROBE_ID), { data: 'not-json' }),
			request.put(COMPANY_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.put(COMPANY_PATH(PROBE_ID), { data: '{"name":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / PUT / DELETE ${COMPANY_PATH(PROBE_ID)} service / DB call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders any of the
		// `getCompanyById` / `getCompanyByDomain` /
		// `getCompanyBySlug` / `updateCompany` /
		// `deleteCompany` calls before the gate would
		// surface here.
		const responses = await Promise.all([
			request.get(COMPANY_PATH(PROBE_ID)),
			request.put(COMPANY_PATH(PROBE_ID), { data: { domain: 'acme.com' } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { slug: 'acme-updated' } }),
			request.delete(COMPANY_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const key of FORBIDDEN_KEYS) {
				expect(body[key]).toBeUndefined();
			}
			expect(body.success).not.toBe(true);
		}
	});

	test(`PUT ${COMPANY_PATH(PROBE_ID)} Zod validation chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, every invalid body shape
		// triggers a Zod `parse()` throw that the inline
		// try/catch catches and translates to a 400 with
		// `details: [{field, message}]`. On the unauth
		// branch the gate fires before any parse, so the
		// unauth response must NEVER contain a `details`
		// key and must NEVER echo `'Validation error'`.
		const responses = await Promise.all([
			request.put(COMPANY_PATH(PROBE_ID), { data: { slug: 'INVALID UPPERCASE' } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { website: 'not-a-uri' } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { name: 'a'.repeat(256) } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { status: 'invalid-status' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.details).toBeUndefined();
			expect(body.error).not.toBe('Validation error');
		}
	});

	test(`PUT ${COMPANY_PATH(PROBE_ID)} uniqueness-check 409 branch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, `getCompanyByDomain(...)`
		// and `getCompanyBySlug(...)` pre-update checks
		// can return 409 with dynamically-interpolated
		// messages. The unauth branch must NEVER reach
		// either check, so the unauth response must
		// NEVER match the regex prefixes
		// `/^Company with domain '/` or
		// `/^Company with slug '/`.
		const responses = await Promise.all([
			request.put(COMPANY_PATH(PROBE_ID), { data: { domain: 'acme.com' } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { slug: 'acme-updated' } }),
			request.put(COMPANY_PATH(PROBE_ID), {
				data: { domain: 'duplicate.com', slug: 'duplicate' }
			})
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

	test(`PUT ${COMPANY_PATH(PROBE_ID)} unique-constraint outer-catch chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, the outer catch maps DB
		// `'unique constraint'` / `'duplicate key'`
		// errors to one of three 409 envelopes (`'Company
		// with this domain already exists'`, `'Company
		// with this slug already exists'`, `'Company
		// with this information already exists'`). The
		// unauth branch must NEVER reach this catch, so
		// the unauth response must NEVER echo any of the
		// three.
		const responses = await Promise.all([
			request.put(COMPANY_PATH(PROBE_ID), { data: { domain: 'acme.com' } }),
			request.put(COMPANY_PATH(PROBE_ID), { data: { slug: 'acme-updated' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Company with this domain already exists');
			expect(body.error).not.toBe('Company with this slug already exists');
			expect(body.error).not.toBe('Company with this information already exists');
		}
	});

	test(`GET / PUT / DELETE ${COMPANY_PATH(PROBE_ID)} unauth response does NOT echo any of the per-handler catch messages`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(COMPANY_PATH(PROBE_ID)),
			request.put(COMPANY_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(COMPANY_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Failed to fetch company');
			expect(body.error).not.toBe('Failed to update company');
			expect(body.error).not.toBe('Failed to delete company');
		}
	});
});
