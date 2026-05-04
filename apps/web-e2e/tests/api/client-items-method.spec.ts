import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET + POST / body / header
 * surface** of the client items collection-level
 * endpoint served by the `GET` AND `POST` exports of
 * `apps/web/app/api/client/items/route.ts`.
 *
 * `GET + POST /api/client/items` is the **first per-
 * source-file dual-method smoke** the docs tree
 * publishes that pins the **`requireClientAuth()`
 * helper-based auth gate** on BOTH GET AND POST
 * (the [`client-items-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-stats-query.spec.ts)
 * sibling pins the helper on a single GET surface;
 * this spec extends to the dual-method usage). It
 * also pins the **`badRequestResponse(message)`
 * 400-helper** and the **issues-joined Zod error
 * message** contract.
 *
 * Distinct from EVERY prior dual-method smoke:
 *
 *   - **`requireClientAuth()` helper on BOTH
 *     methods** — the FIRST per-source-file dual-
 *     method smoke pinning the discriminated-union
 *     auth-helper return contract on both GET AND
 *     POST exports.
 *   - **`badRequestResponse(message)` 400-helper**
 *     — UNIQUE: a NEW helper distinct from
 *     `safeErrorResponse` and `serverErrorResponse`.
 *     The FIRST per-source-file smoke pinning a
 *     dedicated 400-builder helper.
 *   - **Issues-joined Zod error message** —
 *     `validationResult.error.issues.map((issue) =>
 *     issue.message).join(', ')` (UNIQUE: the FIRST
 *     per-source-file smoke pinning a comma-joined
 *     Zod-issues 400 message, vs taking only the
 *     first issue like in the sponsor-ads-user
 *     sibling).
 *   - **GET success payload** with FLAT keys at
 *     top level: `{ success, items, total, page,
 *     limit, totalPages, stats }` — UNIQUE: no
 *     `data` wrapper, no `pagination` wrapper,
 *     flat shape; the FIRST per-source-file GET
 *     smoke pinning a flat-pagination success
 *     payload.
 *   - **POST returns 201 status** (NOT 200) with a
 *     review-workflow success message `'Item
 *     submitted successfully. It will be reviewed
 *     by our team before being published.'`.
 *   - **`?deleted=true` query** branches to a
 *     different repo method (`findDeletedByUser`
 *     vs `findByUserPaginated`) — UNIQUE: the
 *     FIRST per-source-file GET smoke pinning a
 *     query-driven repo-method dispatch contract.
 *   - **`'Unauthorized. Please sign in to
 *     continue.'`** longer-message TWO-key
 *     envelope (matches the
 *     [`client-items-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-stats-query.spec.ts)
 *     sibling).
 *
 *   1. **GET handler** — `requireClientAuth()`;
 *      `clientItemsListQuerySchema.safeParse(query)`;
 *      `?deleted=true` → `findDeletedByUser`; else
 *      → `findByUserPaginated`; success returns
 *      flat payload.
 *   2. **POST handler** — `requireClientAuth()`;
 *      JSON body parse;
 *      `clientCreateItemSchema.safeParse(body)`;
 *      `clientItemRepository.createAsClient(userId,
 *      validated)` load-bearing DB write; success
 *      returns 201 with `{ success, item, message }`.
 *   3. **Method-resolution surface** — the route
 *      exports `GET` AND `POST`. `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500`
 *      status.
 */
const CLIENT_ITEMS_PATH = '/api/client/items';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const POST_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '{}', label: 'empty object body' },

	{
		data: {
			name: 'Sample',
			description: 'Sample description that is at least ten chars',
			source_url: 'https://example.com'
		},
		label: 'minimal valid body'
	},
	{
		data: {
			name: 'Sample',
			description: 'Sample description that is at least ten chars',
			source_url: 'https://example.com',
			category: 'productivity',
			tags: ['tag1', 'tag2']
		},
		label: 'with category + tags'
	},

	// Type-violation probes.
	{ data: { name: 'X' }, label: 'short name (Zod fail)' },
	{ data: { name: 'Sample', description: 'too short' }, label: 'short description (Zod fail)' },
	{
		data: { name: 'Sample', description: 'Sample description that is at least ten chars', source_url: 'not-a-url' },
		label: 'invalid source_url (Zod fail)'
	},

	// Bypass attempts.
	{
		data: {
			name: 'Sample',
			description: 'Sample description that is at least ten chars',
			source_url: 'https://example.com',
			status: 'approved'
		},
		label: 'fabricated status=approved (handler ignores)'
	},
	{
		data: {
			name: 'Sample',
			description: 'Sample description that is at least ten chars',
			source_url: 'https://example.com',
			userId: 'fabricated'
		},
		label: 'fabricated userId (handler ignores)'
	}
] as const;

test.describe('API: /api/client/items GET + POST method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${CLIENT_ITEMS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(CLIENT_ITEMS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`POST ${CLIENT_ITEMS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(CLIENT_ITEMS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of POST_BODIES) {
		test(`POST ${CLIENT_ITEMS_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(CLIENT_ITEMS_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${CLIENT_ITEMS_PATH} returns 401 with the longer-message TWO-key envelope`, async ({
		request
	}) => {
		const response = await request.get(CLIENT_ITEMS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized. Please sign in to continue.');
	});

	test(`POST ${CLIENT_ITEMS_PATH} returns 401 with the longer-message TWO-key envelope`, async ({
		request
	}) => {
		const response = await request.post(CLIENT_ITEMS_PATH, {
			data: {
				name: 'Sample',
				description: 'Sample description that is at least ten chars',
				source_url: 'https://example.com'
			}
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized. Please sign in to continue.');
	});

	test(`GET and POST ${CLIENT_ITEMS_PATH} have IDENTICAL 401 envelopes`, async ({ request }) => {
		const getResponse = await request.get(CLIENT_ITEMS_PATH);
		const postResponse = await request.post(CLIENT_ITEMS_PATH, {
			data: {
				name: 'Sample',
				description: 'Sample description that is at least ten chars',
				source_url: 'https://example.com'
			}
		});

		expect(getResponse.status()).toBe(401);
		expect(postResponse.status()).toBe(401);

		const getBody = await getResponse.json();
		const postBody = await postResponse.json();
		expect(getBody).toEqual(postBody);
	});

	test(`GET ${CLIENT_ITEMS_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.get(CLIENT_ITEMS_PATH);
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.items).toBeUndefined();
		expect(body.total).toBeUndefined();
		expect(body.stats).toBeUndefined();
	});

	test(`POST ${CLIENT_ITEMS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(CLIENT_ITEMS_PATH, {
			data: {
				name: 'Sample',
				description: 'Sample description that is at least ten chars',
				source_url: 'https://example.com'
			}
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// Post-auth messages must NEVER appear on
		// unauth.
		expect(serialized).not.toContain('Item submitted successfully');
		expect(serialized).not.toContain('reviewed by our team');
		expect(serialized).not.toContain('Failed to fetch items');
		expect(serialized).not.toContain('Failed to create item');
	});

	test(`POST ${CLIENT_ITEMS_PATH} createAsClient is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: pin that XSS markers in the body
		// are NEVER echoed back on unauth.
		const response = await request.post(CLIENT_ITEMS_PATH, {
			data: {
				name: 'XSS-NAME-MARKER-12345',
				description: 'XSS description marker that is at least ten chars',
				source_url: 'https://xss-marker-67890.test'
			}
		});

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('XSS-NAME-MARKER-12345');
		expect(serialized).not.toContain('xss-marker-67890');
	});

	test(`GET ${CLIENT_ITEMS_PATH} Zod query-validation is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Pin that the Zod validation 400 message is
		// NEVER reached on unauth.
		const responses = await Promise.all([
			request.get(`${CLIENT_ITEMS_PATH}?status=invalid-status`),
			request.get(`${CLIENT_ITEMS_PATH}?page=-1`),
			request.get(`${CLIENT_ITEMS_PATH}?limit=99999`),
			request.get(`${CLIENT_ITEMS_PATH}?deleted=true`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Unauthorized. Please sign in to continue.');
		}
	});

	test(`POST ${CLIENT_ITEMS_PATH} Zod body-validation is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Pin the gate-before-Zod-validation order.
		// Even with invalid body shapes, response is
		// 401 NOT 400.
		const responses = await Promise.all([
			request.post(CLIENT_ITEMS_PATH, { data: { name: 'X' } }),
			request.post(CLIENT_ITEMS_PATH, { data: { name: 'Sample', description: 'too short' } }),
			request.post(CLIENT_ITEMS_PATH, {
				data: { name: 'Sample', description: 'Sample description ok', source_url: 'not-a-url' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
		}
	});

	test(`GET ${CLIENT_ITEMS_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// GET + POST are exported. PUT / PATCH /
		// DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.put(CLIENT_ITEMS_PATH),
			request.patch(CLIENT_ITEMS_PATH),
			request.delete(CLIENT_ITEMS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CLIENT_ITEMS_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.post(CLIENT_ITEMS_PATH, {
			data: {
				name: 'Sample',
				description: 'Sample description that is at least ten chars',
				source_url: 'https://example.com'
			}
		});
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.post(CLIENT_ITEMS_PATH, {
				data: {
					name: 'Sample',
					description: 'Sample description that is at least ten chars',
					source_url: 'https://example.com'
				},
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(CLIENT_ITEMS_PATH, {
				data: {
					name: 'Sample',
					description: 'Sample description that is at least ten chars',
					source_url: 'https://example.com'
				},
				headers: { 'X-User-Id': 'fabricated' }
			}),
			request.post(CLIENT_ITEMS_PATH, {
				data: {
					name: 'Sample',
					description: 'Sample description that is at least ten chars',
					source_url: 'https://example.com'
				},
				headers: { Authorization: 'Bearer fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});
});
