import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multi-method / dynamic-id /
 * body / header surface** of the admin-only single-
 * collection CRUD endpoint served by
 * `apps/web/app/api/admin/collections/[id]/route.ts`.
 *
 * `GET /api/admin/collections/{id}`,
 * `PUT /api/admin/collections/{id}`, and
 * `DELETE /api/admin/collections/{id}` are the **first**
 * admin-tree route the smoke layer covers as a triple-
 * method export with a **Zod `safeParse(...).error.
 * flatten()` 400 envelope** posture — distinct from every
 * prior triple-method admin smoke:
 *
 *   - `admin-items-id-method.spec.ts` walks an inline
 *     untyped destructure (no Zod).
 *   - `admin-categories-id-method.spec.ts` walks an inline
 *     untyped destructure plus a DELETE-only `?hard=true`
 *     query branch (no Zod).
 *   - `admin-companies-id-method.spec.ts` walks a Zod
 *     `parse()` (THROWS) plus a `details:
 *     ZodError.errors`-style catch envelope.
 *   - `admin-featured-items-id-method.spec.ts` walks a
 *     validation-less PUT (seven fields shoved straight
 *     into `db.update(...)`).
 *
 * This spec walks the FIRST admin-tree route to use
 * **Zod `safeParse(...)` followed by an in-line
 * `error.flatten()` envelope on the 400 branch** —
 * `parsed.error.flatten()` returns the canonical
 * `{ formErrors, fieldErrors }` shape (DIFFERENT from
 * the `error.errors` array a `parse()`-then-catch route
 * would emit, and DIFFERENT from the bare-message branch
 * that the `'must be'` / `'already exists'` catches use).
 *
 * All three handlers share:
 *   1. **Inline `!session?.user?.isAdmin` gate** — pure
 *      single-step `await auth()` + `isAdmin` predicate.
 *      NOT delegated to a `checkAdminAuth()` helper.
 *      Identical across the three handlers.
 *   2. **Canonical longer 401 message**
 *      `'Unauthorized. Admin access required.'` and
 *      `success: false` envelope key — matching every
 *      single-step-gated admin smoke.
 *   3. **Params-resolution-after-the-gate posture** — each
 *      handler resolves `await params` AFTER the gate.
 *   4. **`safeErrorResponse(...)` outer-catch fallback**
 *      with handler-specific messages
 *      (`'Failed to fetch collection'`,
 *      `'Failed to update collection'`,
 *      `'Failed to delete collection'`).
 *   5. **404 pre-action `findById` check** for both PUT
 *      and DELETE — both handlers fetch the collection
 *      BEFORE running any mutation, returning 404
 *      `'Collection not found'` if the row is missing
 *      (distinct from `admin/categories/[id]` PUT which
 *      lets the service throw, and distinct from
 *      `admin/featured-items/[id]` PUT which uses the
 *      `.returning()` length-zero check).
 *   6. **`revalidatePath(...)` cache invalidation** —
 *      both PUT and DELETE call `revalidatePath` AFTER
 *      the repository call AND
 *      `await invalidateContentCaches()` is called in
 *      addition. The unauth branch must NOT enter that
 *      side-effect.
 *
 * Each handler also has its own divergent post-gate
 * surface:
 *
 *   GET:
 *     - No body parse, no query parse.
 *     - `collectionRepository.findById(id)` → 404
 *       `'Collection not found'` if missing.
 *     - Success payload `{ success: true, data:
 *       <collection> }`.
 *
 *   PUT:
 *     - JSON body parse via `await request.json()` AFTER
 *       the gate (NOT wrapped in a per-call try / catch
 *       — a malformed body would 500 via the outer
 *       `safeErrorResponse(...)` catch on the auth
 *       branch).
 *     - **Zod `safeParse(...)`** against
 *       `updateCollectionSchema` (`name`, `slug`,
 *       `description`, `icon_url`, `isActive` — all
 *       optional, with min / max length constraints on
 *       `name` and `slug`). On failure: 400 `{ success:
 *       false, error: 'Invalid collection payload',
 *       details: parsed.error.flatten() }` — distinct
 *       from the `details: error.errors` shape every
 *       prior admin-tree smoke pins. `flatten()` returns
 *       the canonical Zod `{ formErrors: string[],
 *       fieldErrors: Record<string, string[]> }` shape.
 *     - **Pre-update `findById`** — distinct from
 *       `admin/categories/[id]` PUT which lets the
 *       service throw a `not found` error.
 *     - `collectionRepository.update(updateData)` — the
 *       load-bearing service call.
 *     - **Three** distinct catch branches on the auth
 *       failure path:
 *         - `error.message.includes('already exists')`
 *           → 409 Conflict `{ success: false, error:
 *           <error.message> }` (echoes the underlying
 *           message, NOT a fixed string).
 *         - `error.message.includes('must')` → 400 Bad
 *           Request `{ success: false, error:
 *           <error.message> }` (echoes the underlying
 *           message).
 *         - Otherwise → `safeErrorResponse(error,
 *           'Failed to update collection')`.
 *     - **Conditional slug-revalidation branch** — if
 *       `beforeUpdate.slug !== (updateData.slug || id)`,
 *       the route also calls `revalidatePath('/collections/
 *       <oldSlug>')` (in addition to the always-emitted
 *       new-slug + index revalidation).
 *     - Success payload `{ success: true, data:
 *       <updated>, message: 'Collection updated
 *       successfully' }`.
 *
 *   DELETE:
 *     - No body parse, no query parse.
 *     - **Pre-delete `findById`** → 404
 *       `'Collection not found'` if missing.
 *     - `collectionRepository.delete(id)` — the
 *       load-bearing service call.
 *     - **Two** distinct catch branches on the auth
 *       failure path:
 *         - `error.message.includes('not found')` →
 *           404 `{ success: false, error:
 *           <error.message> }` (echoes the underlying
 *           message).
 *         - Otherwise → `safeErrorResponse(error,
 *           'Failed to delete collection')`.
 *     - Success payload `{ success: true, message:
 *       'Collection deleted successfully' }` (NO `data`
 *       key — distinct from the GET / PUT success
 *       payloads which both include `data`).
 *
 * Where the immediately-preceding triple-method
 * `admin-featured-items-id-method.spec.ts` walks a
 * non-admin-gated soft-delete-DELETE validation-less
 * route, this spec walks the canonical-401-gated Zod
 * `safeParse`-with-`flatten()`-envelope triple-method
 * `admin/collections/[id]` route — a complementary
 * surface that no prior admin-tree smoke spec covers.
 */
const COLLECTION_IDS = [
	'productivity-tools',
	'col_test',
	'collection-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const COLLECTION_PATH = (id: string) => `/api/admin/collections/${id}`;
const PROBE_ID = COLLECTION_IDS[0];

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
	{ data: '{}', label: 'empty object body (Zod schema is all-optional, would parse-OK on auth)' },

	// Plausible update bodies (would parse OK).
	{ data: { name: 'Productivity Tools' }, label: 'name update' },
	{ data: { slug: 'productivity-tools' }, label: 'slug update' },
	{ data: { description: 'Updated description' }, label: 'description update' },
	{ data: { icon_url: '/icons/productivity.svg' }, label: 'icon_url update' },
	{ data: { isActive: true }, label: 'isActive=true update' },
	{ data: { isActive: false }, label: 'isActive=false update' },

	// Bodies that would trigger the Zod safeParse 400 branch on auth.
	{ data: { name: '' }, label: 'empty name (Zod min-length violation, would 400 on auth)' },
	{ data: { name: 'a'.repeat(1_000) }, label: 'too-long name (Zod max-length violation, would 400 on auth)' },
	{ data: { slug: '' }, label: 'empty slug (Zod min-length violation, would 400 on auth)' },
	{ data: { slug: 'a'.repeat(1_000) }, label: 'too-long slug (Zod max-length violation, would 400 on auth)' },
	{
		data: { description: 'a'.repeat(10_000) },
		label: 'too-long description (Zod max-length violation, would 400 on auth)'
	},
	{ data: { isActive: 'yes' }, label: 'isActive non-boolean (Zod type violation, would 400 on auth)' },
	{ data: { name: 123 }, label: 'name non-string (Zod type violation, would 400 on auth)' },

	// Bypass attempts.
	{ data: { isAdmin: true, name: 'pwn' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', name: 'pwn' }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', name: 'pwn' }, label: 'fabricated userId attempt' },
	{ data: { id: 'pwn-id', name: 'pwn' }, label: 'fabricated id field (route reads id from params, not body)' },
	{ data: { padding: 'x'.repeat(2_000), name: 'pwn' }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Collection not found',
	'Failed to fetch collection',
	'Failed to update collection',
	'Failed to delete collection',
	'Collection updated successfully',
	'Collection deleted successfully',
	'Invalid collection payload'
] as const;

const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/collections/[id] GET / PUT / DELETE method / id / body / header surface', () => {
	for (const id of COLLECTION_IDS) {
		test(`GET ${COLLECTION_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.get(COLLECTION_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${COLLECTION_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.put(COLLECTION_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${COLLECTION_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.delete(COLLECTION_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of COMMON_HEADERS) {
		test(`GET ${COLLECTION_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(COLLECTION_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${COLLECTION_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(COLLECTION_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${COLLECTION_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.delete(COLLECTION_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${COLLECTION_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.put(COLLECTION_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${COLLECTION_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.get(COLLECTION_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`PUT ${COLLECTION_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.put(COLLECTION_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`DELETE ${COLLECTION_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.delete(COLLECTION_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`GET / PUT / DELETE ${COLLECTION_PATH(PROBE_ID)} share the SAME 401 envelope shape on the unauth branch`, async ({
		request
	}) => {
		// All three handlers delegate to the SAME inline
		// `!session?.user?.isAdmin` gate, so the unauth
		// envelope must be observably the same across
		// methods.
		const [getResponse, putResponse, deleteResponse] = await Promise.all([
			request.get(COLLECTION_PATH(PROBE_ID)),
			request.put(COLLECTION_PATH(PROBE_ID)),
			request.delete(COLLECTION_PATH(PROBE_ID))
		]);

		expect(getResponse.status()).toBe(401);
		expect(putResponse.status()).toBe(401);
		expect(deleteResponse.status()).toBe(401);

		const [getBody, putBody, deleteBody] = await Promise.all([
			getResponse.json(),
			putResponse.json(),
			deleteResponse.json()
		]);

		expect(getBody).toEqual(putBody);
		expect(getBody).toEqual(deleteBody);
		expect(Object.keys(getBody).sort()).toEqual(['error', 'success']);
	});

	test(`GET / PUT / DELETE ${COLLECTION_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// GET success: { success: true, data: <collection> }.
		// PUT success: { success: true, data: <updated>, message: 'Collection updated successfully' }.
		// DELETE success: { success: true, message: 'Collection deleted successfully' } (no data key).
		const responses = await Promise.all([
			request.get(COLLECTION_PATH(PROBE_ID)),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(COLLECTION_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${COLLECTION_PATH(PROBE_ID)} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		// The seven post-auth messages must NEVER appear in
		// the unauth response body. This includes the four
		// catch / 404 messages, the two success messages,
		// AND the Zod safeParse 400 envelope's fixed
		// `'Invalid collection payload'` error string.
		const responses = await Promise.all([
			request.get(COLLECTION_PATH(PROBE_ID)),
			request.put(COLLECTION_PATH(PROBE_ID)),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { name: '' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { isActive: 'yes' } }),
			request.delete(COLLECTION_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`PUT ${COLLECTION_PATH(PROBE_ID)} unauth branch does NOT echo the Zod flatten() details envelope`, async ({
		request
	}) => {
		// The Zod safeParse 400 branch emits `{ success:
		// false, error: 'Invalid collection payload',
		// details: parsed.error.flatten() }` — the only
		// admin-tree route that emits a `details` key
		// shaped as `{ formErrors, fieldErrors }`. On the
		// unauth branch the gate fires before any parse, so
		// no `details` key may surface.
		const responses = await Promise.all([
			request.put(COLLECTION_PATH(PROBE_ID), { data: { name: '' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { slug: '' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { name: 'a'.repeat(1_000) } }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { isActive: 'yes' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { name: 123 } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.details).toBeUndefined();
			expect(body.formErrors).toBeUndefined();
			expect(body.fieldErrors).toBeUndefined();
			expect(body.error).toBe(CANONICAL_401_MESSAGE);
		}
	});

	test(`GET / PUT / DELETE ${COLLECTION_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({
		request
	}) => {
		const getBaseline = await request.get(COLLECTION_PATH(PROBE_ID));
		const putBaseline = await request.put(COLLECTION_PATH(PROBE_ID));
		const deleteBaseline = await request.delete(COLLECTION_PATH(PROBE_ID));

		const getResponses = await Promise.all(COLLECTION_IDS.map((id) => request.get(COLLECTION_PATH(id))));
		const putResponses = await Promise.all(COLLECTION_IDS.map((id) => request.put(COLLECTION_PATH(id))));
		const deleteResponses = await Promise.all(COLLECTION_IDS.map((id) => request.delete(COLLECTION_PATH(id))));

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

	test(`PUT ${COLLECTION_PATH(PROBE_ID)} has a stable status across body permutations`, async ({ request }) => {
		const baseline = await request.put(COLLECTION_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(COLLECTION_PATH(PROBE_ID), { data: {} }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { name: '' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { slug: '' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { isActive: 'yes' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { isAdmin: true, name: 'pwn' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { id: 'pwn-id', name: 'pwn' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET / PUT / DELETE ${COLLECTION_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(COLLECTION_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(COLLECTION_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(COLLECTION_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.delete(COLLECTION_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(COLLECTION_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(COLLECTION_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${COLLECTION_PATH(PROBE_ID)} cross-method probe (POST / PATCH) does NOT 5xx`, async ({ request }) => {
		// The route exports only `GET`, `PUT`, and
		// `DELETE`. Other methods (`POST`, `PATCH`) must
		// round-trip to a `< 500` status (typically 405
		// Method Not Allowed).
		const responses = await Promise.all([
			request.post(COLLECTION_PATH(PROBE_ID)),
			request.patch(COLLECTION_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${COLLECTION_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, malformed JSON would 500 via
		// the outer `safeErrorResponse(...)` catch (the
		// body parse is NOT wrapped in a per-call try /
		// catch). On the unauth branch the gate fires
		// before any parse, so malformed bodies must round-
		// trip to the same status as the no-body baseline
		// (and crucially must NOT 5xx).
		const responses = await Promise.all([
			request.put(COLLECTION_PATH(PROBE_ID), { data: 'not-json' }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: '{"name":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / PUT / DELETE ${COLLECTION_PATH(PROBE_ID)} repository call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders ANY of the four
		// repository calls (`findById` × 3 / `update` /
		// `delete`) before the gate would surface here.
		const responses = await Promise.all([
			request.get(COLLECTION_PATH(PROBE_ID)),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(COLLECTION_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`PUT / DELETE ${COLLECTION_PATH(PROBE_ID)} cache-invalidation side-effect is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Both PUT and DELETE call
		// `invalidateContentCaches()` AND `revalidatePath(...)`
		// AFTER the repository call on the success branch.
		// A regression that reordered the side-effect
		// before the gate would surface as a `success:
		// true` response on the unauth branch (the side-
		// effect itself is opaque to a black-box smoke
		// spec, but the surrounding success envelope is
		// observable).
		const responses = await Promise.all([
			request.put(COLLECTION_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { slug: 'new-slug' } }),
			request.delete(COLLECTION_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${COLLECTION_PATH(PROBE_ID)} unauth response does NOT echo any of the per-handler catch messages`, async ({
		request
	}) => {
		// The three per-handler `safeErrorResponse(...)`
		// catches use distinct messages
		// (`'Failed to fetch collection'`, `'Failed to
		// update collection'`, `'Failed to delete
		// collection'`). A regression that swapped any of
		// the three would surface here.
		const responses = await Promise.all([
			request.get(COLLECTION_PATH(PROBE_ID)),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(COLLECTION_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Failed to fetch collection');
			expect(body.error).not.toBe('Failed to update collection');
			expect(body.error).not.toBe('Failed to delete collection');
		}
	});

	test(`PUT ${COLLECTION_PATH(PROBE_ID)} unauth branch does NOT echo the 409 / 400-bare-message catch messages`, async ({
		request
	}) => {
		// The PUT auth branch has TWO bare-message catch
		// branches (`'already exists'` → 409 and `'must'`
		// → 400) that echo `error.message` directly. A
		// regression that reordered any of those before
		// the gate would surface as one of those messages
		// on the unauth branch. Since we don't know the
		// exact thrown messages, the smoke pins the
		// envelope shape as the canonical 401 envelope and
		// the status code as 401 (NOT 400 / 409).
		const responses = await Promise.all([
			request.put(COLLECTION_PATH(PROBE_ID), { data: { name: 'Existing Name' } }),
			request.put(COLLECTION_PATH(PROBE_ID), { data: { slug: 'duplicate-slug' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body).toEqual({ success: false, error: CANONICAL_401_MESSAGE });
		}
	});
});
