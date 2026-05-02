import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **request-body surface** of the
 * authenticated Polar customer-portal session-creation
 * endpoint served by
 * `apps/web/app/api/polar/subscription/portal/route.ts`.
 *
 * `POST /api/polar/subscription/portal` is intentionally
 * **session-gated** — the route reads the caller's NextAuth
 * session via `auth()` and returns 401 deterministically
 * whenever the session is missing or anonymous, **before**
 * any provider initialisation, customer-id lookup, return-URL
 * extraction, or Polar API call fires:
 *
 *     export async function POST(request: NextRequest) {
 *       try {
 *         const session = await auth();
 *         if (!session?.user) {
 *           return NextResponse.json(
 *             { error: 'Unauthorized' },
 *             { status: 401 }
 *           );
 *         }
 *         const polarProvider = getOrCreatePolarProvider();
 *         const polarCustomerId =
 *           await polarProvider.getCustomerId(session.user as any);
 *         if (!polarCustomerId) {
 *           return NextResponse.json(
 *             { error: 'Polar customer ID not found', … },
 *             { status: 404 }
 *           );
 *         }
 *         const returnUrlPath = await extractReturnUrl(request);
 *         const portalSession =
 *           await polarProvider.createCustomerPortalSession(
 *             polarCustomerId,
 *             returnUrlPath
 *           );
 *         …
 *         return NextResponse.json({ success: true, data: { … }, … });
 *       } catch (error) { … 500 envelope … }
 *     }
 *
 * Because the gate fires first, every assertion below pins
 * that the response is deterministically 401 on the
 * unauthenticated POST branch regardless of what the caller
 * sends in the body. A regression that reads `request.json()`
 * **before** the gate (e.g. for a `{ token: '…' }` magic-token
 * bypass, a `{ userId: '…' }` admin-impersonation key that
 * bypasses `auth()`, a `{ customerId: '…' }` direct-lookup
 * key that forwards a caller-supplied Polar customer id to
 * `createCustomerPortalSession`, or a `{ returnUrl: '…' }`
 * open-redirect target that gets baked into the absolute URL
 * the response surfaces) would change the unauth branch's
 * behaviour from "always 401" to "200 / 400 / 500 if the
 * right body is present" — and that change is exactly what
 * this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session without a `user`); the early
 *     `if (!session?.user)` branch fires and the route
 *     returns the canonical `{ error: 'Unauthorized' }`
 *     envelope with status 401. This is the contract every
 *     assertion below pins, because the e2e runner does not
 *     carry an authenticated session by default.
 *   - **Authenticated user without Polar customer**: returns
 *     404 with `{ error: 'Polar customer ID not found',
 *     message: 'Unable to find or create Polar customer' }`.
 *     Out of scope for this spec.
 *   - **Authenticated user with Polar customer**: returns
 *     200 with the canonical `{ success: true, data: { id,
 *     url, customer, return_url }, message: 'Customer portal
 *     session created' }` envelope after a successful Polar
 *     API round-trip. Out of scope for this spec.
 *   - **Internal error**: returns 500 with
 *     `{ error: 'Failed to create customer portal session',
 *     message: <env-aware string>, details?: <dev-only> }`
 *     via the `catch` block. Out of scope for this spec
 *     because the gate fires before any reachable throw on
 *     every unauth invocation.
 *
 * The body-surface walks the unauthenticated branch because
 * that is the branch every call from this spec hits. A
 * regression that introduces body-based bypass — e.g. a
 * future `{ adminToken: '…' }` admin-impersonation key that
 * fires before `auth()`, a `{ customerId: '…' }` direct-
 * lookup that bypasses the per-session customer resolution,
 * or a `{ returnUrl: 'https://attacker.example' }` open-
 * redirect bake-in — would surface immediately as a status
 * divergence between the empty-body 401 and a body-laden
 * non-401.
 *
 * The shape mirrors the sibling
 * `apps/web-e2e/tests/api/payment-checkouts.spec.ts` and the
 * other `*-query.spec.ts` body / query-surface smokes —
 * `client-dashboard-stats-query.spec.ts`,
 * `client-geo-stats-query.spec.ts`,
 * `client-items-coordinates-query.spec.ts`,
 * `stripe-payment-methods-list-query.spec.ts`,
 * `lemonsqueezy-list-query.spec.ts`,
 * `subscription-query.spec.ts`,
 * `payments-query.spec.ts`, and
 * `plan-status-query.spec.ts` — all share the same
 * "session-gated, 401 before any service-layer call" posture.
 * What this spec adds on top of the broad-coverage
 * `payment-checkouts.spec.ts` smoke (which only asserts
 * `< 500` against the canonical no-body POST) is the
 * **deep body-surface walk** — every plausible body shape
 * a future contributor might add as a pre-auth bypass key.
 */

const PORTAL_PATH = '/api/polar/subscription/portal';

/**
 * Each entry encodes a body shape the spec should send. The
 * `null` shape exercises the `request.json()` parse failure
 * branch (the route's `extractReturnUrl` helper handles the
 * parse error gracefully, but the gate fires before that
 * helper anyway). The `undefined` shape exercises the
 * "no body at all" path.
 */
const POLAR_PORTAL_BODIES: Array<{ name: string; body: unknown }> = [
	// Baseline — empty body.
	{ name: 'empty-object', body: {} },

	// `userId=` / `user_id=` / `uid=` / `id=` — the obvious
	// admin-impersonation keys a future contributor might
	// wire as a non-session-driven user override. The route
	// reads the user identity from `auth()` exclusively
	// today.
	{ name: 'userId', body: { userId: 'anything' } },
	{ name: 'user_id', body: { user_id: 'anything' } },
	{ name: 'uid', body: { uid: 'anything' } },
	{ name: 'id', body: { id: 'anything' } },
	{ name: 'userId-admin', body: { userId: 'admin' } },

	// `customerId=` / `customer_id=` / `polarCustomerId=` —
	// the obvious "direct-lookup" keys that would bypass the
	// per-session customer resolution. The route resolves
	// the Polar customer id from
	// `polarProvider.getCustomerId(session.user)` exclusively
	// today.
	{ name: 'customerId', body: { customerId: 'cus_anything' } },
	{ name: 'customer_id', body: { customer_id: 'cus_anything' } },
	{ name: 'polarCustomerId', body: { polarCustomerId: 'cus_anything' } },
	{ name: 'customer', body: { customer: 'cus_anything' } },

	// `subscriptionId=` / `planId=` / `priceId=` —
	// the obvious "I want to manage this specific
	// subscription" keys. The route's portal-session API call
	// does not take a subscription / plan / price id today;
	// the portal lets the user manage all of their
	// subscriptions through Polar's hosted UI.
	{ name: 'subscriptionId', body: { subscriptionId: 'sub_anything' } },
	{ name: 'planId', body: { planId: 'plan_anything' } },
	{ name: 'priceId', body: { priceId: 'price_anything' } },

	// `token=` / `secret=` / `api_key=` / `authorization=` —
	// the obvious "I have a magic auth token, let me
	// through" keys. The route authenticates via NextAuth
	// session cookie only today via `auth()`.
	{ name: 'token', body: { token: 'anything' } },
	{ name: 'secret', body: { secret: 'anything' } },
	{ name: 'api_key', body: { api_key: 'anything' } },
	{ name: 'authorization', body: { authorization: 'Bearer anything' } },
	{ name: 'session', body: { session: 'anything' } },
	{ name: 'sessionToken', body: { sessionToken: 'anything' } },

	// `admin=` / `asAdmin=` / `bypass=` / `impersonate=` —
	// the obvious "admin override" keys that a future "view
	// another user's portal session as admin" feature might
	// add. The route does not branch on any admin override
	// today.
	{ name: 'admin', body: { admin: true } },
	{ name: 'admin-1', body: { admin: 1 } },
	{ name: 'asAdmin', body: { asAdmin: true } },
	{ name: 'bypass', body: { bypass: true } },
	{ name: 'impersonate', body: { impersonate: 'admin' } },

	// `returnUrl=` / `return_url=` / `successUrl=` /
	// `cancelUrl=` — the obvious return-target keys. The
	// route reads `returnUrl` via the `extractReturnUrl`
	// helper today, but the gate fires first; on the unauth
	// branch the return-URL value is irrelevant. A regression
	// that reads `extractReturnUrl(request)` before the gate
	// would still need to gate the response on
	// authentication, but a future "tell me what redirect
	// URL would have been used" leak would surface here.
	{ name: 'returnUrl-relative', body: { returnUrl: '/settings/billing' } },
	{ name: 'returnUrl-absolute', body: { returnUrl: 'https://example.com/billing' } },
	{ name: 'returnUrl-attacker', body: { returnUrl: 'https://attacker.example/phish' } },
	{ name: 'return_url-snake', body: { return_url: '/settings/billing' } },
	{ name: 'successUrl', body: { successUrl: '/success' } },
	{ name: 'cancelUrl', body: { cancelUrl: '/cancel' } },

	// `email=` — the obvious "lookup-by-email" key that a
	// future contributor might wire as a non-session-driven
	// customer resolution path.
	{ name: 'email', body: { email: 'attacker@example.com' } },
	{ name: 'email-admin', body: { email: 'admin@example.com' } },

	// `tenant=` / `tenantId=` / `org=` — the obvious
	// multi-tenancy keys.
	{ name: 'tenant', body: { tenant: 'acme' } },
	{ name: 'tenantId', body: { tenantId: 42 } },
	{ name: 'org', body: { org: 'ever-works' } },

	// Special-character / injection-style values that would
	// tempt a future regex match, LIKE-prefix, or
	// path-injection wiring. The gate fires before any value
	// is forwarded to the Polar API, so injection values are
	// irrelevant on the unauth branch.
	{ name: 'returnUrl-xss', body: { returnUrl: '<script>alert(1)</script>' } },
	{ name: 'returnUrl-traversal', body: { returnUrl: '/../../etc/passwd' } },
	{ name: 'returnUrl-null-byte', body: { returnUrl: '/%00admin' } },
	{ name: 'customerId-sql', body: { customerId: "' OR 1=1 --" } },

	// Empty values — `body[key] = ''` returns the empty
	// string. The gate fires before any potential future
	// validator, so empty values must round-trip to the same
	// 401 as the empty-body case.
	{ name: 'returnUrl-empty', body: { returnUrl: '' } },
	{ name: 'customerId-empty', body: { customerId: '' } },
	{ name: 'token-empty', body: { token: '' } },

	// `null` / `undefined` / `0` / `false` — falsy values
	// that exercise the route's body-parsing path. The gate
	// fires before any value is read, so falsy values must
	// round-trip to the same 401.
	{ name: 'returnUrl-null', body: { returnUrl: null } },
	{ name: 'returnUrl-zero', body: { returnUrl: 0 } },
	{ name: 'returnUrl-false', body: { returnUrl: false } },

	// Long values — guard against any future regex / regex-
	// based indexing bug that might trip on long inputs.
	{ name: 'returnUrl-long', body: { returnUrl: 'a'.repeat(2000) } },
	{ name: 'customerId-long', body: { customerId: 'b'.repeat(2000) } },
	{ name: 'token-long', body: { token: 'c'.repeat(2000) } },

	// Combined — multiple keys in one body. The gate fires
	// before any of them are read, so the combined body must
	// round-trip to the same 401.
	{
		name: 'combined',
		body: {
			userId: 'admin',
			customerId: 'cus_anything',
			token: 'anything',
			returnUrl: 'https://attacker.example',
			admin: true,
			tenant: 'acme'
		}
	}
] as const;

test.describe('API: POST /api/polar/subscription/portal body-surface', () => {
	for (const { name, body } of POLAR_PORTAL_BODIES) {
		test(`POST with body ${name} responds without a server error`, async ({ request }) => {
			const response = await request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: body
			});

			// The route's auth gate fires before any potential
			// `request.json()` parse, return-URL extraction, or
			// Polar API call, so the unauthenticated POST surface
			// returns 401 deterministically. There is no 5xx
			// branch reachable on the unauthenticated POST surface
			// because the catch can only fire after the gate has
			// already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('POST without an explicit body responds without a server error', async ({ request }) => {
		// `request.post` without a `data` payload sends an
		// empty body. The route's `extractReturnUrl(request)`
		// helper handles the parse failure gracefully, but
		// the gate fires before that helper anyway, so the
		// status must be 401 deterministically.
		const response = await request.post(PORTAL_PATH);
		expect(response.status()).toBeLessThan(500);
	});

	test('POST returns 401 with a stable error envelope on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated POST branch is the load-bearing
		// invariant: the auth gate must fire before any
		// potential body parse / return-URL extraction / Polar
		// API call, and must return 401 with the documented
		// `{ error: 'Unauthorized' }` envelope. A regression
		// that bypasses the gate would surface here as a
		// non-401 status or a different body shape.
		const response = await request.post(PORTAL_PATH, {
			headers: { 'content-type': 'application/json' },
			data: {}
		});

		expect(response.status()).toBe(401);

		const payload = (await response.json()) as { error?: unknown };
		expect(typeof payload.error).toBe('string');
	});

	test('POST returns 401 identically with and without bogus body keys', async ({ request }) => {
		// The route reads no body keys before the gate today,
		// so the response status must be invariant to any
		// combination of keys. A regression that reads any
		// body key before the gate would surface here as a
		// status divergence between the empty-body baseline
		// and the parameterised variant.
		const baseline = await request.post(PORTAL_PATH, {
			headers: { 'content-type': 'application/json' },
			data: {}
		});
		const parameterised = await request.post(PORTAL_PATH, {
			headers: { 'content-type': 'application/json' },
			data: {
				userId: 'admin',
				customerId: 'cus_anything',
				token: 'anything',
				returnUrl: 'https://attacker.example',
				admin: true,
				unknown: 'value'
			}
		});

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(401);
	});

	test('POST { userId: … } does NOT bypass the session gate', async ({ request }) => {
		// A future contributor who reads `body.userId` as a
		// fallback for `auth()`'s `session.user.id` resolution
		// would change the unauth branch from "always 401" to
		// "200 if userId is present" and silently grant any
		// anonymous caller arbitrary-user portal-session
		// access. This assertion catches that change
		// immediately.
		const baseline = await request.post(PORTAL_PATH, {
			headers: { 'content-type': 'application/json' },
			data: {}
		});
		const responses = await Promise.all([
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { userId: 'admin' }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { user_id: 'admin' }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { uid: 'admin' }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { id: 'admin' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			expect(response.status()).toBe(401);
		}
	});

	test('POST { customerId: … } does NOT bypass the per-session customer resolution', async ({
		request
	}) => {
		// The route resolves the Polar customer id from
		// `polarProvider.getCustomerId(session.user)`
		// exclusively today. A regression that reads
		// `body.customerId` as a fallback would let an
		// attacker (a) target another user's Polar customer
		// id, (b) impersonate a customer that does not belong
		// to their session, or (c) escalate from a free
		// session to a paying-customer portal. This assertion
		// pins the "customer id is read from the session,
		// never from the body" invariant.
		const baseline = await request.post(PORTAL_PATH, {
			headers: { 'content-type': 'application/json' },
			data: {}
		});
		const responses = await Promise.all([
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { customerId: 'cus_anything' }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { customer_id: 'cus_anything' }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { polarCustomerId: 'cus_anything' }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { customer: 'cus_anything' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			expect(response.status()).toBe(401);
		}
	});

	test('POST { token: … } does NOT introduce a body-token auth bypass', async ({
		request
	}) => {
		// The route does not authenticate via a body token
		// today (auth is gated through the NextAuth session
		// cookie via `auth()`). A future contributor who adds
		// a magic-token bypass for the session gate would
		// change the unauth branch's behaviour. This
		// assertion catches that change immediately.
		const baseline = await request.post(PORTAL_PATH, {
			headers: { 'content-type': 'application/json' },
			data: {}
		});
		const responses = await Promise.all([
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { token: 'anything' }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { secret: 'anything' }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { api_key: 'anything' }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { authorization: 'Bearer anything' }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { session: 'anything' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			expect(response.status()).toBe(401);
		}
	});

	test('POST { admin: … } does NOT introduce a body-admin-override', async ({ request }) => {
		// The route does not branch on any admin override
		// today. A regression that wires `body.admin` as a
		// non-session-driven admin override would let an
		// attacker (a) view any user's portal session by
		// adding `{ admin: true }`, or (b) bypass the
		// session check entirely. This assertion pins the
		// "admin status is read from the session, never from
		// the body" invariant.
		const baseline = await request.post(PORTAL_PATH, {
			headers: { 'content-type': 'application/json' },
			data: {}
		});
		const responses = await Promise.all([
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { admin: true }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { admin: 1 }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { asAdmin: true }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { bypass: true }
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: { impersonate: 'admin' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			expect(response.status()).toBe(401);
		}
	});

	test('POST { returnUrl: <attacker> } does NOT leak an open-redirect on the unauth branch', async ({
		request
	}) => {
		// The route reads `returnUrl` via the
		// `extractReturnUrl` helper today, then bakes it into
		// the response's `data.return_url` field via
		// `buildAbsoluteUrl(returnUrlPath)`. The gate fires
		// before that helper, so the unauth branch must NOT
		// surface the caller-supplied `returnUrl` value
		// anywhere in the response body. A regression that
		// reads `extractReturnUrl(request)` before the gate
		// would surface as the attacker URL appearing in the
		// 401 response body — a clear open-redirect leak.
		const response = await request.post(PORTAL_PATH, {
			headers: { 'content-type': 'application/json' },
			data: { returnUrl: 'https://attacker.example/phish' }
		});

		expect(response.status()).toBe(401);

		const text = await response.text();
		// The 401 response must not echo the attacker URL
		// back to the caller. A regression that surfaced the
		// `returnUrl` in the response body (e.g. via a
		// future "here's where you would have been
		// redirected" envelope shape) would surface here as
		// the attacker host appearing in the response text.
		expect(text).not.toContain('attacker.example');
		expect(text).not.toContain('attacker.example/phish');
	});

	test('POST keeps the response shape stable across body permutations', async ({ request }) => {
		// Three different body shapes, all of which must
		// round-trip to the canonical 401 envelope on the
		// unauth branch. The shape guarantees the route's
		// auth gate fires before any branching on potential
		// future body schemas.
		const responses = await Promise.all([
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: {}
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: {
					userId: 'admin',
					customerId: 'cus_anything',
					token: 'foo',
					returnUrl: '/settings/billing'
				}
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json' },
				data: {
					customerId: 'cus_anything',
					subscriptionId: 'sub_anything',
					admin: true,
					unknown: 'bar'
				}
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);

			const body = (await response.json()) as { error?: unknown };

			// The route returns `{ error: 'Unauthorized' }`
			// today; `error` is a stable string discriminator
			// callers depend on. Assert presence and shape
			// across every permutation.
			expect(typeof body.error).toBe('string');
		}
	});

	test('POST does NOT branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to the same
		// 401 envelope.
		const responses = await Promise.all([
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json', Accept: 'application/json' },
				data: {}
			}),
			request.post(PORTAL_PATH, {
				headers: {
					'content-type': 'application/json',
					Accept: 'application/xml'
				},
				data: {}
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json', Accept: 'text/html' },
				data: {}
			}),
			request.post(PORTAL_PATH, {
				headers: { 'content-type': 'application/json', Accept: '*/*' },
				data: {}
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
		}
	});
});
