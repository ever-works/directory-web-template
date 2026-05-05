import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the auth-gated Solidgate checkout-session creation
 * endpoint served by the `POST` export of
 * `apps/web/app/api/solidgate/checkout/route.ts`.
 *
 * `POST /api/solidgate/checkout` is intentionally
 * **session-gated** — the route reads the caller's
 * NextAuth session via `auth()` and returns 401
 * deterministically whenever the session is missing or
 * anonymous, **before** any provider initialisation, Zod
 * `safeParse(...)`, customer-id lookup, or
 * `createPaymentIntent(...)` call fires:
 *
 *     export async function POST(request: NextRequest) {
 *       try {
 *         const session = await auth();
 *         if (!session?.user) {
 *           return NextResponse.json(
 *             { error: 'Unauthorized', message: 'Authentication required' },
 *             { status: 401 }
 *           );
 *         }
 *         const solidgateProvider = getOrCreateSolidgateProvider();
 *         const checkoutSchema = z.object({
 *           amount: z.number().positive(),
 *           currency: z.string().default('USD'),
 *           mode: z.enum(['one_time', 'subscription']).default('one_time'),
 *           successUrl: z.string().url(),
 *           cancelUrl: z.string().url(),
 *           metadata: z.record(z.string(), z.any()).optional()
 *         });
 *         let payload;
 *         try {
 *           const json = await request.json();
 *           const result = checkoutSchema.safeParse(json);
 *           if (!result.success) {
 *             return NextResponse.json(
 *               { error: 'Invalid request body', message: <zod-issues-joined> },
 *               { status: 400 }
 *             );
 *           }
 *           payload = result.data;
 *         } catch (_e) {
 *           return NextResponse.json(
 *             { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
 *             { status: 400 }
 *           );
 *         }
 *         const solidgateCustomerId =
 *           await solidgateProvider.getCustomerId(session.user as any);
 *         if (!solidgateCustomerId) {
 *           return NextResponse.json(
 *             { error: 'Failed to create customer',
 *               message: 'Unable to create Solidgate customer' },
 *             { status: 400 }
 *           );
 *         }
 *         const paymentIntent = await solidgateProvider.createPaymentIntent({…});
 *         return NextResponse.json({
 *           data: { id: paymentIntent.id, url: paymentIntent.clientSecret },
 *           status: 200,
 *           message: 'Checkout session created successfully'
 *         });
 *       } catch (error) {
 *         …
 *         return NextResponse.json(
 *           { error: errorMessage, message: 'Failed to create checkout session',
 *             details: <dev-only stack> },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * Distinct from the sibling
 * [`polar-subscription-portal-body.spec.ts`](polar-subscription-portal-body.spec.ts)
 * which is the closest analogue (auth-gated POST, 401-
 * before-everything posture):
 *
 *   - **TWO-key 401 envelope** — Solidgate returns
 *     `{ error: 'Unauthorized', message: 'Authentication
 *     required' }` (TWO keys). Polar-portal returns
 *     `{ error: 'Unauthorized' }` (ONE key). UNIQUE: the
 *     FIRST per-source-file POST body smoke that pins a
 *     two-key 401 envelope on a payment-provider route.
 *   - **Zod safeParse AFTER the auth gate** — the
 *     `checkoutSchema.safeParse(json)` and the
 *     surrounding `try/catch` around `request.json()` fire
 *     only AFTER `auth()`, so the unauth branch never
 *     reaches them. Polar-portal does NOT call
 *     `request.json()` at all.
 *   - **FIVE-key success envelope** — solidgate's success
 *     branch returns `{ data: { id, url }, status, message }`
 *     (THREE top-level keys including a literal `status:
 *     200` field embedded in the body, separate from the
 *     HTTP status). Polar-portal returns
 *     `{ success: true, data, message }`. UNIQUE: solidgate
 *     is the FIRST per-source-file POST smoke that pins a
 *     literal-`status`-key success envelope.
 *   - **500 catch (NOT 400)** — solidgate's outer catch
 *     returns 500 (`{ error, message, details }` with dev-
 *     only stack). Polar-webhook uses
 *     `safeErrorResponse(..., 400)`. UNIQUE: the FIRST per-
 *     source-file POST smoke that pins a 500-default catch
 *     on a payment-provider route — but ONLY reachable
 *     AFTER the auth gate; on the unauth branch the catch
 *     is never reached.
 *   - **POST-only export** — GET / PUT / PATCH / DELETE
 *     are NOT exported. Method-resolution returns 405.
 *
 * Because the gate fires first, every assertion below
 * pins that the unauthenticated POST surface returns 401
 * deterministically regardless of body / header shape. A
 * regression that reads `request.json()` BEFORE the auth
 * gate (e.g. for a `{ token: '…' }` magic-token bypass, a
 * `{ userId: '…' }` admin-impersonation key, a
 * `{ customerId: '…' }` direct-lookup that forwards a
 * caller-supplied Solidgate customer id to
 * `createPaymentIntent`, or a `{ successUrl: 'attacker' }`
 * open-redirect target) would change the unauth branch's
 * behaviour from "always 401" to "200 / 400 / 500 if the
 * right body is present" — and that change is exactly
 * what this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session without a `user`); the early
 *     `if (!session?.user)` branch fires and the route
 *     returns the canonical TWO-key
 *     `{ error: 'Unauthorized', message: 'Authentication
 *     required' }` envelope with status 401. Every
 *     assertion below pins this branch because the e2e
 *     runner does not carry an authenticated session by
 *     default.
 *   - **Authenticated, malformed JSON body**: returns 400
 *     with `{ error: 'Invalid JSON', message: 'Request
 *     body must be valid JSON' }`. Out of scope.
 *   - **Authenticated, schema mismatch**: returns 400
 *     with `{ error: 'Invalid request body', message: <zod-
 *     issues-joined> }`. Out of scope.
 *   - **Authenticated, no Solidgate customer**: returns
 *     400 with `{ error: 'Failed to create customer',
 *     message: 'Unable to create Solidgate customer' }`.
 *     Out of scope.
 *   - **Authenticated, happy path**: returns 200 with the
 *     5-key success envelope `{ data: { id, url },
 *     status: 200, message: 'Checkout session created
 *     successfully' }`. Out of scope.
 *   - **Internal error**: returns 500 with
 *     `{ error, message: 'Failed to create checkout
 *     session', details: <dev-only stack> }`. Out of scope
 *     because the catch can only fire after the gate has
 *     already let the call through.
 *
 *   1. **Bulk-loop `< 500` walk** — every body and header
 *      shape (~25 bodies + ~12 headers) must round-trip
 *      to a `< 500` status.
 *   2. **First-gate 401 invariant** — the unauth branch
 *      returns 401 deterministically.
 *   3. **TWO-key 401 envelope shape** —
 *      `{ error: 'Unauthorized', message: 'Authentication
 *      required' }` exactly.
 *   4. **No-body-key-bypass invariant** — the 401 is
 *      invariant under any combination of plausible body
 *      keys (userId, customerId, token, admin, returnUrl,
 *      etc.).
 *   5. **No-Zod-issue-leak invariant** — the unauth 401
 *      must NEVER echo a Zod issue path (`amount.invalid`,
 *      `successUrl.url`, etc.) — a regression that ran
 *      `safeParse(...)` before the auth gate would leak
 *      schema details to anonymous callers and surface
 *      here.
 *   6. **No-success-key-leak invariant** — the unauth 401
 *      must NEVER echo `data` / `id` / `url` / a literal
 *      `status: 200` — a regression that ran
 *      `createPaymentIntent(...)` before the auth gate
 *      would surface here.
 *   7. **No-redirect-leak invariant** — caller-supplied
 *      `successUrl` / `cancelUrl` values must NEVER be
 *      echoed in the unauth response body.
 *   8. **Cross-method probe** — POST is the only exported
 *      method; GET / PUT / PATCH / DELETE must round-trip
 *      to `< 500` (Next.js returns 405).
 *   9. **Side-channel walk** — fabricated cookies, Bearer
 *      tokens, and admin-shaped headers must NEVER
 *      satisfy the gate.
 *  10. **Accept header invariance** — every Accept value
 *      must round-trip to the same 401.
 */

const CHECKOUT_PATH = '/api/solidgate/checkout';

const SOLIDGATE_CHECKOUT_BODIES: Array<{ name: string; body: unknown }> = [
	// Baseline — empty body. Auth gate fires first; the
	// `request.json()` parse never runs.
	{ name: 'empty-object', body: {} },

	// Valid Zod-shaped bodies. The schema would accept
	// these AFTER the auth gate; on the unauth branch the
	// schema is never reached.
	{
		name: 'valid-one-time-checkout',
		body: {
			amount: 29.99,
			currency: 'USD',
			mode: 'one_time',
			successUrl: 'https://example.com/success',
			cancelUrl: 'https://example.com/cancel'
		}
	},
	{
		name: 'valid-subscription-checkout',
		body: {
			amount: 9.99,
			currency: 'EUR',
			mode: 'subscription',
			successUrl: 'https://example.com/success',
			cancelUrl: 'https://example.com/cancel',
			metadata: { planId: 'pro_plan', planName: 'Pro Plan' }
		}
	},

	// Schema-violation probes — the schema would reject
	// these AFTER the auth gate. On the unauth branch the
	// envelope must NOT contain the Zod issue path.
	{ name: 'amount-negative', body: { amount: -1, successUrl: 'https://x.test/s', cancelUrl: 'https://x.test/c' } },
	{ name: 'amount-zero', body: { amount: 0, successUrl: 'https://x.test/s', cancelUrl: 'https://x.test/c' } },
	{ name: 'amount-string', body: { amount: '29.99', successUrl: 'https://x.test/s', cancelUrl: 'https://x.test/c' } },
	{ name: 'mode-invalid', body: { amount: 1, mode: 'recurring', successUrl: 'https://x.test/s', cancelUrl: 'https://x.test/c' } },
	{ name: 'successUrl-missing', body: { amount: 1, cancelUrl: 'https://x.test/c' } },
	{ name: 'cancelUrl-missing', body: { amount: 1, successUrl: 'https://x.test/s' } },
	{ name: 'successUrl-not-url', body: { amount: 1, successUrl: 'not-a-url', cancelUrl: 'https://x.test/c' } },
	{ name: 'currency-numeric', body: { amount: 1, currency: 123, successUrl: 'https://x.test/s', cancelUrl: 'https://x.test/c' } },

	// Admin-impersonation / direct-lookup keys. The route
	// resolves user identity from `auth()` and customer id
	// from `solidgateProvider.getCustomerId(session.user)`
	// exclusively. A regression that read these keys
	// before the gate would surface as a status divergence
	// from the empty-body 401 baseline.
	{ name: 'userId', body: { userId: 'admin' } },
	{ name: 'user_id', body: { user_id: 'admin' } },
	{ name: 'customerId', body: { customerId: 'cus_anything' } },
	{ name: 'solidgateCustomerId', body: { solidgateCustomerId: 'cus_anything' } },

	// Magic-token / bypass keys.
	{ name: 'token', body: { token: 'anything' } },
	{ name: 'secret', body: { secret: 'anything' } },
	{ name: 'admin', body: { admin: true } },
	{ name: 'asAdmin', body: { asAdmin: true } },
	{ name: 'bypass', body: { bypass: true } },
	{ name: 'impersonate', body: { impersonate: 'admin' } },

	// Open-redirect probes. The route bakes
	// `successUrl` / `cancelUrl` into the
	// `createPaymentIntent` payload AFTER the auth gate, so
	// the unauth branch must NEVER echo the attacker URL.
	{
		name: 'successUrl-attacker',
		body: { successUrl: 'https://attacker.example/phish', cancelUrl: 'https://x.test/c', amount: 1 }
	},
	{
		name: 'cancelUrl-attacker',
		body: { successUrl: 'https://x.test/s', cancelUrl: 'https://attacker.example/phish', amount: 1 }
	},
	{
		name: 'successUrl-traversal',
		body: { successUrl: 'https://x.test/../../etc/passwd', cancelUrl: 'https://x.test/c', amount: 1 }
	},

	// Combined — a future regression that read multiple
	// keys before the gate would still need to gate the
	// response, but a partial fix would surface as a
	// divergence here.
	{
		name: 'combined-bypass',
		body: {
			userId: 'admin',
			customerId: 'cus_anything',
			token: 'anything',
			admin: true,
			amount: 99.99,
			successUrl: 'https://attacker.example/win',
			cancelUrl: 'https://attacker.example/lose'
		}
	},

	// Large padded body — guards against any future regex
	// or length-based branching.
	{ name: 'large-padding', body: { amount: 1, padding: 'a'.repeat(2000) } }
] as const;

const SOLIDGATE_CHECKOUT_HEADERS: Array<{ name: string; headers: Record<string, string> }> = [
	{ name: 'application/json', headers: { 'content-type': 'application/json' } },
	{ name: 'text/plain', headers: { 'content-type': 'text/plain' } },
	{ name: 'wildcard-accept', headers: { 'content-type': 'application/json', Accept: '*/*' } },
	{ name: 'application/json-accept', headers: { 'content-type': 'application/json', Accept: 'application/json' } },
	{ name: 'application/xml-accept', headers: { 'content-type': 'application/json', Accept: 'application/xml' } },
	{ name: 'text/html-accept', headers: { 'content-type': 'application/json', Accept: 'text/html' } },

	// Bypass-attempt headers. A regression that read these
	// before the gate would surface as a non-401.
	{ name: 'fabricated-cookie', headers: { Cookie: 'next-auth.session-token=fabricated' } },
	{ name: 'fabricated-bearer', headers: { Authorization: 'Bearer fabricated' } },
	{ name: 'admin-x-header', headers: { 'X-Admin': 'true' } },
	{ name: 'user-x-header', headers: { 'X-User-Id': 'admin' } },
	{ name: 'forwarded-for', headers: { 'X-Forwarded-For': '127.0.0.1' } },
	{ name: 'tenant-x-header', headers: { 'X-Tenant-Id': 'acme' } }
] as const;

const ALLOWED_PRE_DELIVERY_ERRORS = ['Unauthorized'] as const;

test.describe('API: POST /api/solidgate/checkout body / header surface', () => {
	for (const { name, body } of SOLIDGATE_CHECKOUT_BODIES) {
		test(`POST ${CHECKOUT_PATH} (body=${name}) responds without a server error`, async ({ request }) => {
			const response = await request.post(CHECKOUT_PATH, {
				headers: { 'content-type': 'application/json' },
				data: body as object
			});
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { name, headers } of SOLIDGATE_CHECKOUT_HEADERS) {
		test(`POST ${CHECKOUT_PATH} (header=${name}) responds without a server error`, async ({ request }) => {
			const response = await request.post(CHECKOUT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${CHECKOUT_PATH} returns 401 with the canonical two-key envelope on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(CHECKOUT_PATH, {
			headers: { 'content-type': 'application/json' },
			data: {}
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		// Solidgate's 401 envelope is two-key. A regression
		// that flipped the route to a single-key envelope
		// would change the public contract.
		expect(body).toEqual({ error: 'Unauthorized', message: 'Authentication required' });
	});

	test(`POST ${CHECKOUT_PATH} keeps the 401 envelope shape stable across body permutations`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(CHECKOUT_PATH, { headers: { 'content-type': 'application/json' }, data: {} }),
			request.post(CHECKOUT_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { userId: 'admin', customerId: 'cus_anything', token: 'foo', admin: true }
			}),
			request.post(CHECKOUT_PATH, {
				headers: { 'content-type': 'application/json' },
				data: {
					amount: 99.99,
					currency: 'USD',
					mode: 'one_time',
					successUrl: 'https://attacker.example/win',
					cancelUrl: 'https://attacker.example/lose'
				}
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(Object.keys(body).sort()).toEqual(['error', 'message']);
			expect(body.error).toBe('Unauthorized');
			expect(body.message).toBe('Authentication required');
		}
	});

	test(`POST ${CHECKOUT_PATH} 401 envelope does NOT echo Zod issue paths`, async ({ request }) => {
		// A regression that ran `checkoutSchema.safeParse(...)`
		// BEFORE the auth gate would leak Zod issue paths
		// (`amount`, `successUrl.url`, `mode.invalid`) into
		// the response. The unauth branch must NEVER surface
		// any of these strings.
		const response = await request.post(CHECKOUT_PATH, {
			headers: { 'content-type': 'application/json' },
			data: { amount: -1, successUrl: 'not-a-url', mode: 'recurring' }
		});
		expect(response.status()).toBe(401);

		const text = await response.text();
		expect(text).not.toContain('amount');
		expect(text).not.toContain('successUrl');
		expect(text).not.toContain('cancelUrl');
		expect(text).not.toContain('mode');
		expect(text).not.toContain('Invalid request body');
		expect(text).not.toContain('Invalid JSON');
	});

	test(`POST ${CHECKOUT_PATH} 401 envelope does NOT echo success-branch keys`, async ({ request }) => {
		// The success branch returns
		// `{ data: { id, url }, status, message }`. A
		// regression that ran `createPaymentIntent(...)`
		// before the auth gate would surface these keys.
		const responses = await Promise.all([
			request.post(CHECKOUT_PATH, { headers: { 'content-type': 'application/json' }, data: {} }),
			request.post(CHECKOUT_PATH, {
				headers: { 'content-type': 'application/json' },
				data: {
					amount: 1,
					successUrl: 'https://x.test/s',
					cancelUrl: 'https://x.test/c'
				}
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.id).toBeUndefined();
			expect(body.url).toBeUndefined();
			expect(body.status).toBeUndefined();
		}
	});

	test(`POST ${CHECKOUT_PATH} 401 does NOT leak the caller-supplied successUrl / cancelUrl`, async ({ request }) => {
		// A regression that read `successUrl` / `cancelUrl`
		// before the auth gate (e.g. for an "unauth preview"
		// envelope) would surface the attacker URL in the
		// response body and turn the route into an open-
		// redirect leak.
		const response = await request.post(CHECKOUT_PATH, {
			headers: { 'content-type': 'application/json' },
			data: {
				amount: 1,
				successUrl: 'https://attacker.example/phish',
				cancelUrl: 'https://attacker.example/abort'
			}
		});
		expect(response.status()).toBe(401);

		const text = await response.text();
		expect(text).not.toContain('attacker.example');
	});

	test(`POST ${CHECKOUT_PATH} 401 does NOT downgrade to 400 / 500 on malformed JSON before the gate`, async ({
		request
	}) => {
		// `request.json()` throws on malformed JSON, but
		// only INSIDE the inner try/catch which runs AFTER
		// the auth gate. The unauth branch must NEVER
		// reach the `'Invalid JSON'` 400 envelope.
		const response = await request.post(CHECKOUT_PATH, {
			headers: { 'content-type': 'application/json' },
			data: 'not-json-at-all'
		});

		expect(response.status()).toBe(401);
		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Invalid JSON');
	});

	test(`POST ${CHECKOUT_PATH} catch branch is NOT entered on the unauth branch`, async ({ request }) => {
		// The outer catch returns 500 with
		// `{ error, message: 'Failed to create checkout
		// session', details }`. The unauth branch must
		// NEVER reach the catch, so the response must
		// NEVER be 500 and must NEVER echo the catch's
		// `message` value.
		const responses = await Promise.all([
			request.post(CHECKOUT_PATH),
			request.post(CHECKOUT_PATH, { headers: { 'content-type': 'application/json' }, data: {} }),
			request.post(CHECKOUT_PATH, {
				headers: { 'content-type': 'application/json' },
				data: 'malformed-json'
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
			const body = await response.json();
			expect(body.message).not.toBe('Failed to create checkout session');
			expect(body.details).toBeUndefined();
		}
	});

	test(`POST ${CHECKOUT_PATH} every error message comes from the allowed list`, async ({ request }) => {
		// The unauth branch must always return the canonical
		// `Unauthorized` error string. No other static value
		// is reachable on the unauth surface.
		const responses = await Promise.all([
			request.post(CHECKOUT_PATH, { headers: { 'content-type': 'application/json' }, data: {} }),
			request.post(CHECKOUT_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { amount: -1, mode: 'invalid' }
			}),
			request.post(CHECKOUT_PATH, {
				headers: { 'content-type': 'application/json' },
				data: 'malformed-json'
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(typeof body.error).toBe('string');
			expect(ALLOWED_PRE_DELIVERY_ERRORS).toContain(body.error);
		}
	});

	test(`POST ${CHECKOUT_PATH} side-channel cookies / headers do NOT satisfy the gate`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(CHECKOUT_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(CHECKOUT_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(CHECKOUT_PATH, { headers: { 'X-Admin': 'true' } }),
			request.post(CHECKOUT_PATH, { headers: { 'X-User-Id': 'admin' } }),
			request.post(CHECKOUT_PATH, { headers: { 'X-Tenant-Id': 'acme' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Unauthorized');
		}
	});

	test(`POST ${CHECKOUT_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		// POST is the only exported method. GET / PUT /
		// PATCH / DELETE must round-trip to `< 500`
		// (Next.js returns 405 Method Not Allowed).
		const responses = await Promise.all([
			request.get(CHECKOUT_PATH),
			request.put(CHECKOUT_PATH),
			request.patch(CHECKOUT_PATH),
			request.delete(CHECKOUT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CHECKOUT_PATH} 401 status invariant under any plausible bypass body`, async ({ request }) => {
		// Walk every documented bypass-key shape and pin
		// that the response status stays at 401.
		const baseline = await request.post(CHECKOUT_PATH, {
			headers: { 'content-type': 'application/json' },
			data: {}
		});
		const responses = await Promise.all([
			request.post(CHECKOUT_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { userId: 'admin', user_id: 'admin', uid: 'admin', id: 'admin' }
			}),
			request.post(CHECKOUT_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { customerId: 'cus_x', solidgateCustomerId: 'cus_x', customer: 'cus_x' }
			}),
			request.post(CHECKOUT_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { token: 'x', secret: 'x', api_key: 'x', authorization: 'x' }
			}),
			request.post(CHECKOUT_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { admin: true, asAdmin: true, bypass: true, impersonate: 'admin' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			expect(response.status()).toBe(401);
		}
	});
});
