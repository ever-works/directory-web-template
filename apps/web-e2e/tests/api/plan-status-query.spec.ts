import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * authenticated user-plan-status endpoint served by
 * `apps/web/app/api/user/plan-status/route.ts`.
 *
 * `GET /api/user/plan-status` is intentionally **session-gated**
 * — it returns the caller's plan id, effective plan, expiration
 * date, days-until-expiration, warning-period flag, feature-access
 * flag, and human-facing warning message, all derived from the
 * caller's session-bearing user id. The handler signature is:
 *
 *     export async function GET(_request: NextRequest) {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.id) {
 *           return NextResponse.json(
 *             { success: false, message: 'Unauthorized' },
 *             { status: 401 }
 *           );
 *         }
 *         const planStatus = await subscriptionService
 *           .getUserPlanWithExpiration(session.user.id);
 *         return NextResponse.json({ success: true, data: { ... } });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, message: 'Failed to get plan status', error: ... },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * Note that `GET` declares the parameter as `_request` —
 * underscored to mark it deliberately unused. The handler reads
 * **zero** query parameters: there is no `request.url`,
 * `request.headers`, or `searchParams.get(...)` access anywhere
 * inside the function body. The route therefore must be invariant
 * to **any** query parameter the caller appends — present, absent,
 * empty, repeated, special-character, or long.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a session
 *     whose `user.id` is missing); the early
 *     `if (!session?.user?.id)` branch fires and the route
 *     returns `{ success: false, message: 'Unauthorized' }` with
 *     status 401. This is the contract every assertion below
 *     pins, because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Authenticated**: the gate falls through to
 *     `subscriptionService.getUserPlanWithExpiration(session.user.id)`
 *     and returns 200 with the canonical
 *     `{ success: true, data: { planId, effectivePlan, isExpired,
 *     expiresAt, daysUntilExpiration, isInWarningPeriod,
 *     canAccessPlanFeatures, warningMessage, status } }` envelope.
 *     Out of scope for this spec.
 *   - **Service throw**: the catch returns 500 with
 *     `{ success: false, message: 'Failed to get plan status',
 *     error: <safeMessage> }`. Out of scope for this spec
 *     because the gate fires before the service call on every
 *     unauth invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec hits. A
 * regression that introduces query-string-based bypass (e.g. a
 * future `?userId=...` impersonation key, a `?token=...`
 * magic-token bypass, a `?effectivePlan=premium` claim that
 * skips the service call) would surface immediately as a status
 * divergence between the no-arg 401 and a parameter-laden
 * non-401.
 */
const PLAN_STATUS_QUERIES = [
	// Baseline — the no-arg unauthenticated case. Included so a
	// future reader of this file sees the canonical case alongside
	// the variants it parametrises.
	'/api/user/plan-status',

	// `?userId=` / `?user_id=` / `?uid=` — the obvious wiring a
	// future "admin-views-other-user's-plan" feature might add as
	// an authenticated-admin override. The route does not read
	// any user-id query key today and reads the user id from the
	// session exclusively. A regression that reads
	// `searchParams.get('userId')` as a fallback for
	// `session.user.id` would change the unauth branch from
	// "always 401" to "200 if ?userId=… is present" and break
	// this assertion.
	'/api/user/plan-status?userId=anything',
	'/api/user/plan-status?user_id=anything',
	'/api/user/plan-status?uid=anything',
	'/api/user/plan-status?id=anything',
	'/api/user/plan-status?userId=00000000-0000-0000-0000-000000000000',

	// `?planId=` / `?effectivePlan=` / `?plan=` — the obvious
	// "claim a different plan" keys. The route derives plan
	// state from the database via `subscriptionService` today
	// and does not trust caller-controlled values.
	'/api/user/plan-status?planId=premium',
	'/api/user/plan-status?effectivePlan=premium',
	'/api/user/plan-status?plan=standard',
	'/api/user/plan-status?plan=free',

	// `?token=` / `?secret=` / `?api_key=` / `?authorization=` —
	// the obvious "I have a magic auth token, let me through"
	// keys. The route authenticates via NextAuth session cookie
	// only today and must never start trusting query-string
	// credentials.
	'/api/user/plan-status?token=anything',
	'/api/user/plan-status?secret=anything',
	'/api/user/plan-status?api_key=anything',
	'/api/user/plan-status?authorization=Bearer+anything',
	'/api/user/plan-status?session=anything',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` — the
	// obvious cache-busting keys. The handler does not branch on
	// any cache-control query param today.
	'/api/user/plan-status?refresh=1',
	'/api/user/plan-status?force=true',
	'/api/user/plan-status?fresh=true',
	'/api/user/plan-status?cache=bypass',
	'/api/user/plan-status?nocache=1',

	// `?format=` — the obvious content-negotiation key. The
	// route returns JSON exclusively today.
	'/api/user/plan-status?format=json',
	'/api/user/plan-status?format=xml',
	'/api/user/plan-status?format=csv',

	// `?include=` / `?fields=` / `?expand=` — the obvious
	// field-selection keys a future "lite plan-status"
	// optimisation might wire. The route returns the full
	// envelope today and does not branch on any field-selection
	// key.
	'/api/user/plan-status?include=expiresAt,daysUntilExpiration',
	'/api/user/plan-status?fields=planId,effectivePlan',
	'/api/user/plan-status?expand=warning',

	// `?at=` / `?asOf=` / `?date=` — the obvious "compute plan
	// state at a point in time" keys a future "preview-expiry"
	// feature might add. The route resolves expiration relative
	// to the server clock today and does not honour any
	// caller-supplied timestamp.
	'/api/user/plan-status?at=2026-01-01T00:00:00Z',
	'/api/user/plan-status?asOf=2026-01-01',
	'/api/user/plan-status?date=2030-12-31',

	// `?warning=` / `?warningPeriod=` — the obvious "override
	// the warning-period threshold" keys. The route uses the
	// service-layer threshold (currently 7 days) today and does
	// not honour any caller-supplied window.
	'/api/user/plan-status?warning=14',
	'/api/user/plan-status?warningPeriod=30',
	'/api/user/plan-status?days=14',

	// `?tenant=` / `?tenantId=` / `?org=` — the obvious
	// multi-tenancy keys a future feature might wire. The
	// handler does not read any tenant context from the URL
	// today.
	'/api/user/plan-status?tenant=acme',
	'/api/user/plan-status?tenantId=42',
	'/api/user/plan-status?org=ever-works',

	// `?locale=` / `?lang=` / `?language=` — the obvious
	// localisation keys for the human-facing `warningMessage`
	// field. The route returns a single locale today.
	'/api/user/plan-status?locale=en',
	'/api/user/plan-status?lang=fr',
	'/api/user/plan-status?language=zh',

	// Empty values — `searchParams.get(key)` on `?key=` returns
	// `''`. The route reads zero keys, so empty values must
	// round-trip to the same response as the no-arg case.
	'/api/user/plan-status?userId=',
	'/api/user/plan-status?planId=',
	'/api/user/plan-status?token=',
	'/api/user/plan-status?refresh=',
	'/api/user/plan-status?format=',

	// Repeated keys — `searchParams.get(name)` returns the first
	// value, but the route never calls `searchParams.get(...)`
	// at all, so repetition is irrelevant.
	'/api/user/plan-status?userId=foo&userId=bar',
	'/api/user/plan-status?plan=premium&plan=free',
	'/api/user/plan-status?refresh=1&refresh=0',

	// Special-character values that would tempt a future regex
	// match, LIKE-prefix, or path-injection wiring. The route
	// does not pass any value into a SQL or filesystem path, so
	// they must remain pass-through ignored.
	'/api/user/plan-status?userId=%25',
	'/api/user/plan-status?userId=%2F',
	'/api/user/plan-status?userId=%5C',
	'/api/user/plan-status?userId=%27%20OR%201%3D1',
	'/api/user/plan-status?planId=%3Cscript%3E',

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs. The route
	// does not read the value into any parameter today.
	`/api/user/plan-status?userId=${'x'.repeat(500)}`,
	`/api/user/plan-status?token=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero keys,
	// so any combination of unknown keys is silently ignored.
	'/api/user/plan-status?unknown=value',
	'/api/user/plan-status?foo=bar&baz=qux',
	'/api/user/plan-status?userId=alice&unknown=value&foo=bar'
] as const;

test.describe('API: /api/user/plan-status query-param surface', () => {
	for (const path of PLAN_STATUS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's auth gate fires before any
			// service-layer call, so the unauth branch returns
			// 401 deterministically. There is no 5xx branch
			// reachable on the unauthenticated GET surface
			// because the catch can only fire after the gate has
			// already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/user/plan-status returns 401 with the canonical { success: false, message } envelope on the unauth branch`, async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the auth gate must fire before any
		// service-layer call and must return 401 with the
		// `{ success: false, message: 'Unauthorized' }`
		// envelope. A regression that bypasses the gate would
		// surface here as a non-401 status or a `success: true`
		// payload.
		const response = await request.get('/api/user/plan-status');

		expect(response.status()).toBe(401);

		const body = (await response.json()) as {
			success?: unknown;
			message?: unknown;
		};

		expect(body.success).toBe(false);
		expect(typeof body.message).toBe('string');
	});

	test(`GET /api/user/plan-status returns 401 identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params on the GET surface,
		// so the response status must be invariant to any
		// combination of unknown keys. Body content is not
		// asserted byte-identical because the message wording
		// is allowed to evolve.
		const baseline = await request.get('/api/user/plan-status');
		const parameterised = await request.get(
			'/api/user/plan-status?userId=alice&plan=premium&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(401);
	});

	test(`GET /api/user/plan-status?userId=… does NOT bypass the session gate`, async ({
		request
	}) => {
		// The most important assertion in this file. A future
		// contributor who reads `searchParams.get('userId')` as a
		// fallback for `session.user.id` would change the unauth
		// branch from "always 401" to "200 if ?userId=… is
		// present" and silently grant any anonymous caller
		// arbitrary-user impersonation. This assertion catches
		// that change immediately because the no-arg and
		// `?userId=…` calls must always return the same status
		// on the unauth branch.
		const baseline = await request.get('/api/user/plan-status');
		const withUserId = await request.get('/api/user/plan-status?userId=alice');
		const withUid = await request.get('/api/user/plan-status?uid=bob');
		const withId = await request.get(
			'/api/user/plan-status?id=00000000-0000-0000-0000-000000000000'
		);

		expect(withUserId.status()).toBe(baseline.status());
		expect(withUid.status()).toBe(baseline.status());
		expect(withId.status()).toBe(baseline.status());
	});

	test(`GET /api/user/plan-status?token=… does NOT introduce a query-token auth bypass`, async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today. A future contributor who adds a magic-token
		// bypass for the session gate would change the unauth
		// branch's behaviour. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/user/plan-status');
		const withToken = await request.get('/api/user/plan-status?token=anything');
		const withSecret = await request.get('/api/user/plan-status?secret=anything');
		const withApiKey = await request.get('/api/user/plan-status?api_key=anything');
		const withAuthQuery = await request.get(
			'/api/user/plan-status?authorization=Bearer+anything'
		);

		expect(withToken.status()).toBe(baseline.status());
		expect(withSecret.status()).toBe(baseline.status());
		expect(withApiKey.status()).toBe(baseline.status());
		expect(withAuthQuery.status()).toBe(baseline.status());
	});

	test(`GET /api/user/plan-status?plan=… does NOT spoof the effective plan`, async ({
		request
	}) => {
		// The route derives the effective plan from
		// `subscriptionService.getUserPlanWithExpiration(session.user.id)`
		// today and never trusts any caller-supplied plan
		// claim. A regression that surfaces a `?plan=` /
		// `?effectivePlan=` / `?planId=` short-circuit before
		// the gate would surface here as a non-401 status on a
		// parameter-laden call.
		const baseline = await request.get('/api/user/plan-status');
		const withPlan = await request.get('/api/user/plan-status?plan=premium');
		const withEffective = await request.get(
			'/api/user/plan-status?effectivePlan=premium'
		);
		const withPlanId = await request.get('/api/user/plan-status?planId=premium');

		expect(withPlan.status()).toBe(baseline.status());
		expect(withEffective.status()).toBe(baseline.status());
		expect(withPlanId.status()).toBe(baseline.status());
	});

	test(`GET /api/user/plan-status keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical 401 envelope on the unauth
		// branch. The shape guarantees the route does not branch
		// on any query key today.
		const responses = await Promise.all([
			request.get('/api/user/plan-status'),
			request.get('/api/user/plan-status?userId=alice'),
			request.get('/api/user/plan-status?refresh=1&plan=premium&token=foo&unknown=bar')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);

			const body = (await response.json()) as {
				success?: unknown;
				message?: unknown;
			};

			expect(body.success).toBe(false);
			expect(typeof body.message).toBe('string');
		}
	});
});
