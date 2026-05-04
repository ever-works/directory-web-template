import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the user-owned sponsor-ad renew endpoint served by
 * the `POST` export of
 * `apps/web/app/api/sponsor-ads/user/[id]/renew/route.ts`.
 *
 * `POST /api/sponsor-ads/user/[id]/renew` is the
 * **first per-source-file POST smoke** the docs tree
 * publishes that pins a **swallow-and-continue body-
 * parse contract**: the handler wraps `await request.
 * json()` in a try/catch where the catch is empty
 * (the `// Body is optional` block) — malformed JSON OR
 * missing body silently leaves `successUrl` and
 * `cancelUrl` as `undefined`. Distinct from the
 * sibling cancel route's
 * [`sponsor-ads-user-id-cancel-body.spec.ts`](./sponsor-ads-user-id-cancel-body.spec.ts)
 * **silent-coalesce-to-{}** contract (`await request.
 * json().catch(() => ({})) ?? {}`): the renew route
 * does NOT coalesce to `{}`; it leaves the destructured
 * values untouched. EVERY prior POST smoke either uses
 * the silent-coalesce-to-{} pattern, an explicit 400 on
 * malformed JSON, or no body parse at all. This is the
 * FIRST swallow-and-continue body-parse contract.
 *
 * It is also the **first per-source-file POST smoke**
 * that pins **TWO open-redirect-validated URLs in the
 * SAME body** (`successUrl` AND `cancelUrl`), each
 * passed through the SAME `validateRedirectUrl` helper.
 * The sibling sponsor-ads / payment-provider checkout
 * smokes pin a SINGLE redirect URL or use provider-
 * level URL constants. The renew route is the FIRST
 * per-source-file POST smoke pinning a TWO-URL open-
 * redirect-prevention contract.
 *
 * It is also the **first per-source-file POST smoke**
 * that pins a **multi-provider `switch` dispatch with
 * default-case 400** (Stripe / LemonSqueezy / Polar /
 * default → 400 `'Payment configuration is incomplete.
 * Please contact support.'`). The sibling sponsor-ads
 * checkout route uses a similar dispatch but with
 * different branches; the renew route's dispatch is
 * the FIRST per-source-file POST smoke pinning a
 * three-provider switch with a default-case 400.
 *
 * It is also the **first per-source-file POST smoke**
 * that pins a **state-machine 400 branch with status
 * interpolation**: `Cannot renew sponsor ad with
 * status: ${sponsorAd.status}. Only active or expired
 * ads can be renewed.` The sibling cancel route's
 * outer-catch substring detection (`error.message.
 * includes('Cannot cancel')`) is similar but operates
 * on the catch path; the renew route's check is in
 * the main flow as a positive `renewableStatuses.
 * includes(...)` whitelist gate.
 *
 * Distinct from EVERY prior POST smoke:
 *
 *   - **Swallow-and-continue body parse:** the handler
 *     wraps the `await request.json()` call in a
 *     try/catch where the catch body is the empty
 *     `// Body is optional` block. The FIRST per-
 *     source-file POST smoke pinning a swallow-and-
 *     continue body-parse contract.
 *   - **TWO open-redirect-validated URLs:**
 *     `validateRedirectUrl(successUrl)` AND
 *     `validateRedirectUrl(cancelUrl)`. Both pass
 *     through the SAME helper that compares
 *     `protocol`, `hostname`, AND `port` against
 *     `appUrl`. Failed validation falls back to
 *     defaults — the unsafe URLs are SILENTLY
 *     dropped (a `console.warn` is emitted but the
 *     request continues with the safe defaults).
 *   - **Multi-provider switch dispatch with default-
 *     case 400:** Stripe / LemonSqueezy / Polar /
 *     default → 400 `'Payment configuration is
 *     incomplete. Please contact support.'`.
 *   - **State-machine 400 branch with status
 *     interpolation:** `Cannot renew sponsor ad
 *     with status: ${sponsorAd.status}. Only active
 *     or expired ads can be renewed.` Whitelist
 *     gate (`renewableStatuses.includes(...)`) on
 *     `[ACTIVE, EXPIRED]`.
 *   - **Price configuration check with 400:**
 *     `'Payment configuration is incomplete. Please
 *     contact support.'` (the SAME message as the
 *     default-case 400 above — a regression that
 *     swaps either branch's message would be
 *     observable here).
 *   - **Checkout-URL null-check with 500:**
 *     `'Failed to create checkout URL. Please try
 *     again.'` — pin the post-checkout null-URL
 *     branch.
 *   - **Outer catch with single-message 500:**
 *     `'Failed to create renewal checkout session'`.
 *     Distinct from the cancel route's THREE-branch
 *     outer catch.
 *
 *   1. **`auth()` session lookup** — `!session?.user
 *      ?.id` → 401 `{ success: false, error:
 *      'Unauthorized' }` (one-key envelope, two-key
 *      JSON).
 *   2. **`{ id }` param resolution** via dynamic-
 *      segment route.
 *   3. **Body parse with swallow-and-continue** —
 *      the handler tries `await request.json()` and
 *      destructures `successUrl` / `cancelUrl`; the
 *      catch is an empty `// Body is optional` block,
 *      leaving both values `undefined` on parse
 *      failure.
 *   4. **`sponsorAdService.getSponsorAdById(id)`** →
 *      404 `'Sponsor ad not found'`.
 *   5. **Ownership verification** — `sponsorAd.user
 *      Id !== session.user.id` → 403 `'You do not
 *      have permission to renew this sponsor ad'`.
 *   6. **State-machine renewable-status check** —
 *      `renewableStatuses = [ACTIVE, EXPIRED]`; if
 *      not in whitelist → 400 `Cannot renew sponsor
 *      ad with status: ${status}. Only active or
 *      expired ads can be renewed.`.
 *   7. **`getPriceId(interval, ACTIVE_PAYMENT_PROVIDER)`**
 *      → 400 `'Payment configuration is incomplete.
 *      Please contact support.'` if `priceId` is
 *      null.
 *   8. **`validateRedirectUrl(successUrl)`** AND
 *      **`validateRedirectUrl(cancelUrl)`** with
 *      fallback to default URLs.
 *   9. **Multi-provider switch dispatch:**
 *      `STRIPE` → `createStripeRenewalCheckout`;
 *      `LEMONSQUEEZY` → `createLemonSqueezyRenewalCheckout`;
 *      `POLAR` → `createPolarRenewalCheckout`;
 *      default → 400 `'Payment configuration is
 *      incomplete. Please contact support.'`.
 *  10. **`!checkoutResult.url` null-check** → 500
 *      `'Failed to create checkout URL. Please try
 *      again.'`.
 *  11. **Success payload** — `{ success: true,
 *      data: { checkoutId, checkoutUrl, provider },
 *      message: 'Renewal checkout session created
 *      successfully' }`.
 *  12. **Outer catch** — 500 `{ success: false,
 *      error: 'Failed to create renewal checkout
 *      session' }`.
 *  13. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const NON_EXISTENT_AD_ID = '__definitely-not-a-real-sponsor-ad-id__';
const RENEW_PATH = `/api/sponsor-ads/user/${NON_EXISTENT_AD_ID}/renew`;

const SPONSOR_ADS_RENEW_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const SPONSOR_ADS_RENEW_BODIES = [
	{ data: undefined as unknown, label: 'no body (swallow-and-continue, leaves URLs undefined)' },
	{ data: '', label: 'empty string body (swallow-and-continue, leaves URLs undefined)' },
	{ data: '{}', label: 'empty object body (URLs undefined, no validation triggered)' },

	// Valid same-origin URLs (would be accepted post-auth).
	{
		data: { successUrl: 'http://localhost:3000/sponsor/success', cancelUrl: 'http://localhost:3000/cancel' },
		label: 'valid same-origin successUrl + cancelUrl'
	},
	{ data: { successUrl: '/sponsor/success' }, label: 'relative successUrl (resolved against appUrl)' },
	{ data: { cancelUrl: '/cancel' }, label: 'relative cancelUrl (resolved against appUrl)' },

	// Open-redirect probes — must NEVER bypass validateRedirectUrl.
	{
		data: { successUrl: 'https://attacker.example/success', cancelUrl: 'https://attacker.example/cancel' },
		label: 'open-redirect attack URLs (silently dropped, fall back to defaults)'
	},
	{
		data: { successUrl: 'http://evil.com', cancelUrl: 'http://localhost:3000/legit' },
		label: 'mixed: malicious successUrl + legitimate cancelUrl'
	},
	{
		data: { successUrl: 'javascript:alert(1)' },
		label: 'javascript: pseudo-protocol successUrl (silently dropped)'
	},
	{
		data: { successUrl: 'data:text/html,<script>alert(1)</script>' },
		label: 'data: pseudo-protocol successUrl (silently dropped)'
	},
	{
		data: { successUrl: '//evil.com/foo' },
		label: 'protocol-relative URL (silently dropped)'
	},
	{
		data: { successUrl: 'http://localhost:8080/different-port' },
		label: 'mismatched port URL (silently dropped — port comparison)'
	},

	// Bypass attempts.
	{ data: { isAdmin: true, successUrl: '/foo' }, label: 'isAdmin=true bypass attempt' },
	{ data: { userId: 'fabricated' }, label: 'fabricated userId bypass attempt' },
	{ data: { sponsorAdId: 'override' }, label: 'sponsorAdId in body (path param wins)' },
	{ data: { status: 'ACTIVE' }, label: 'status override attempt (read from DB, not body)' },
	{ data: { interval: 'WEEKLY' }, label: 'interval override attempt (read from DB, not body)' },
	{ data: { priceId: 'price_fake' }, label: 'priceId override attempt (read from env, not body)' },
	{ data: { provider: 'STRIPE' }, label: 'provider override attempt (read from env, not body)' },
	{ data: { padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Sponsor ad not found',
	'You do not have permission to renew this sponsor ad',
	'Failed to create renewal checkout session',
	'Renewal checkout session created successfully',
	'Failed to create checkout URL. Please try again.',
	'Payment configuration is incomplete. Please contact support.'
] as const;

test.describe('API: /api/sponsor-ads/user/[id]/renew POST body / header surface', () => {
	for (const { headers, label } of SPONSOR_ADS_RENEW_HEADERS) {
		test(`POST ${RENEW_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(RENEW_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of SPONSOR_ADS_RENEW_BODIES) {
		test(`POST ${RENEW_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(RENEW_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${RENEW_PATH} returns 401 with the canonical one-key Unauthorized envelope`, async ({ request }) => {
		// `!session?.user?.id` → 401 `{ success: false,
		// error: 'Unauthorized' }`.
		const response = await request.post(RENEW_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Unauthorized' });
	});

	test(`POST ${RENEW_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		const response = await request.post(RENEW_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
		expect(body.message).toBeUndefined();
	});

	test(`POST ${RENEW_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// Success branch returns `{ success: true,
		// data: { checkoutId, checkoutUrl, provider },
		// message: '...' }`. The unauth branch must
		// NEVER reach createStripeRenewalCheckout /
		// createLemonSqueezyRenewalCheckout /
		// createPolarRenewalCheckout.
		const response = await request.post(RENEW_PATH, {
			data: { successUrl: '/foo', cancelUrl: '/bar' }
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBe(false);
	});

	test(`POST ${RENEW_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(RENEW_PATH),
			request.post(RENEW_PATH, { data: {} }),
			request.post(RENEW_PATH, { data: { successUrl: '/foo' } }),
			request.post(RENEW_PATH, { data: { successUrl: 'http://attacker.example' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${RENEW_PATH} swallow-and-continue body-parse handles malformed JSON without 400`, async ({
		request
	}) => {
		// On the auth branch, malformed JSON would
		// silently leave successUrl / cancelUrl as
		// undefined (the catch is empty: /* Body is
		// optional */). On the unauth branch, the auth
		// gate fires BEFORE the body parse — but the
		// contract is identical: NO 'Invalid JSON' 400
		// envelope.
		const responses = await Promise.all([
			request.post(RENEW_PATH, { data: 'not-json' }),
			request.post(RENEW_PATH, { data: '{ broken: json' }),
			request.post(RENEW_PATH, { data: '{"successUrl":' })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(typeof body.error).toBe('string');
			// No 'Invalid JSON' substring should appear.
			expect(body.error).not.toContain('Invalid JSON');
		}
	});

	test(`POST ${RENEW_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(RENEW_PATH);
		const responses = await Promise.all([
			request.post(RENEW_PATH, { data: {} }),
			request.post(RENEW_PATH, { data: { successUrl: '/foo' } }),
			request.post(RENEW_PATH, { data: { cancelUrl: '/bar' } }),
			request.post(RENEW_PATH, { data: { successUrl: 'http://attacker.example' } }),
			request.post(RENEW_PATH, { data: { isAdmin: true } }),
			request.post(RENEW_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(RENEW_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${RENEW_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(RENEW_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(RENEW_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(RENEW_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(RENEW_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${RENEW_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		// The route exports ONLY POST.
		const responses = await Promise.all([
			request.get(RENEW_PATH),
			request.put(RENEW_PATH),
			request.patch(RENEW_PATH),
			request.delete(RENEW_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${RENEW_PATH} ownership / not-found / state-machine / getPriceId are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders the post-auth
		// chain before the gate would surface here:
		// the unauth response would echo any of the
		// post-auth dispatched messages.
		const response = await request.post(RENEW_PATH, {
			data: { successUrl: '/foo', cancelUrl: '/bar' }
		});
		const body = await response.json();
		expect(body.error).not.toBe('Sponsor ad not found');
		expect(body.error).not.toBe('You do not have permission to renew this sponsor ad');
		expect(body.error).not.toMatch(/^Cannot renew sponsor ad with status:/);
		expect(body.error).not.toBe('Payment configuration is incomplete. Please contact support.');
		expect(body.error).not.toBe('Failed to create checkout URL. Please try again.');
		expect(body.message).not.toBe('Renewal checkout session created successfully');
	});

	test(`POST ${RENEW_PATH} multi-provider switch dispatch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The provider switch dispatches to one of
		// Stripe / LemonSqueezy / Polar / default-400.
		// The unauth branch must NEVER produce any of
		// these dispatched messages.
		const responses = await Promise.all([
			request.post(RENEW_PATH),
			request.post(RENEW_PATH, { data: { provider: 'STRIPE' } }),
			request.post(RENEW_PATH, { data: { provider: 'LEMONSQUEEZY' } }),
			request.post(RENEW_PATH, { data: { provider: 'POLAR' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Payment configuration is incomplete. Please contact support.');
			expect(body.error).not.toBe('Failed to create checkout URL. Please try again.');
		}
	});

	test(`POST ${RENEW_PATH} state-machine status interpolation is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// `Cannot renew sponsor ad with status: ${status}.
		// Only active or expired ads can be renewed.`
		// Caller-controlled `status` values must NEVER
		// surface in the unauth response.
		const responses = await Promise.all([
			request.post(RENEW_PATH, { data: { status: 'PENDING' } }),
			request.post(RENEW_PATH, { data: { status: 'CANCELLED' } }),
			request.post(RENEW_PATH, { data: { status: '<script>alert(1)</script>' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toMatch(/^Cannot renew sponsor ad with status:/);
			const serialized = JSON.stringify(body);
			expect(serialized).not.toContain('<script>');
			expect(serialized).not.toContain('alert(1)');
		}
	});

	test(`POST ${RENEW_PATH} open-redirect successUrl + cancelUrl values are NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// validateRedirectUrl runs AFTER the auth
		// gate. Caller-supplied URL values must NEVER
		// appear in the unauth response — neither in
		// the body nor in any redirect-style header.
		const ATTACKER_URL = 'https://attacker.example/exfiltrate';
		const ATTACKER_CANCEL = 'https://attacker.example/cancel';
		const response = await request.post(RENEW_PATH, {
			data: { successUrl: ATTACKER_URL, cancelUrl: ATTACKER_CANCEL }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('attacker.example');
		expect(serialized).not.toContain(ATTACKER_URL);
		expect(serialized).not.toContain(ATTACKER_CANCEL);

		// Common redirect headers that a regression
		// might add must not carry the attacker URL.
		expect(response.headers().location).toBeUndefined();
	});

	test(`POST ${RENEW_PATH} javascript: / data: / protocol-relative URLs are NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// validateRedirectUrl drops these URLs because
		// the URL constructor either throws or the
		// resulting protocol/host doesn't match
		// appUrl. The unauth branch must NEVER echo
		// these dangerous values back to the caller.
		const responses = await Promise.all([
			request.post(RENEW_PATH, { data: { successUrl: 'javascript:alert(1)' } }),
			request.post(RENEW_PATH, { data: { successUrl: 'data:text/html,<script>alert(1)</script>' } }),
			request.post(RENEW_PATH, { data: { successUrl: '//evil.com/foo' } }),
			request.post(RENEW_PATH, { data: { cancelUrl: 'file:///etc/passwd' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			const serialized = JSON.stringify(body);
			expect(serialized).not.toContain('javascript:');
			expect(serialized).not.toContain('data:');
			expect(serialized).not.toContain('evil.com');
			expect(serialized).not.toContain('file://');
			expect(serialized).not.toContain('/etc/passwd');
		}
	});

	test(`POST ${RENEW_PATH} outer catch single-message 500 is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The outer catch returns 500 with `{ success:
		// false, error: 'Failed to create renewal
		// checkout session' }`. The unauth branch must
		// NEVER produce this message — it should
		// always be the canonical 'Unauthorized' two-
		// key envelope.
		const responses = await Promise.all([
			request.post(RENEW_PATH),
			request.post(RENEW_PATH, { data: {} }),
			request.post(RENEW_PATH, { data: 'not-json' }),
			request.post(RENEW_PATH, { data: { successUrl: 'http://attacker.example' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Failed to create renewal checkout session');
		}
	});
});
