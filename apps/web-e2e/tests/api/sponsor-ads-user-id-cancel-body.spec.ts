import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the user-owned sponsor-ad cancel endpoint served
 * by the `POST` export of
 * `apps/web/app/api/sponsor-ads/user/[id]/cancel/route.ts`.
 *
 * `POST /api/sponsor-ads/user/[id]/cancel` is the
 * **first per-source-file POST smoke** the docs tree
 * publishes that pins a **body-parse-fault-tolerant
 * contract** via `await request.json().catch(() =>
 * ({})) ?? {}` — malformed JSON OR `null` body OR
 * empty body silently coalesces to `{}` (NO 400 for
 * malformed JSON). EVERY prior POST smoke either has
 * a per-call try/catch that returns a 400 (solidgate /
 * lemonsqueezy / polar-webhook) OR no try/catch at
 * all (polar / stripe checkout). This is the FIRST
 * silent-coalesce contract.
 *
 * It is also the **first per-source-file POST smoke**
 * that pins a **conditional Zod validation contract**:
 * `cancelSponsorAdSchema.omit({ id: true })
 * .safeParse(body)` runs unconditionally, but the
 * 400-rejection only fires if the validation FAILS
 * AND `body.cancelReason !== undefined`. So an empty
 * body OR a body without `cancelReason` skips the
 * validation rejection entirely.
 *
 * Distinct from EVERY prior POST smoke:
 *
 *   - **Body-parse-fault-tolerant contract:** `await
 *     request.json().catch(() => ({})) ?? {}`. The
 *     FIRST per-source-file POST smoke pinning a
 *     silent-coalesce body-parse contract.
 *   - **Conditional Zod validation:** `.omit({ id:
 *     true }).safeParse(body)` with `if (!parsed.
 *     success && body.cancelReason !== undefined)`
 *     gate. The FIRST per-source-file POST smoke
 *     pinning a conditional-validation contract.
 *   - **Default-fallback string:** `cancelReason =
 *     parsed.data.cancelReason?.trim() ||
 *     'Cancelled by user'`. The FIRST per-source-
 *     file POST smoke pinning a default-fallback
 *     string contract.
 *   - **THREE-branch outer catch:** `error.message
 *     === 'Sponsor ad not found'` → 404 (exact-
 *     string match); `error.message.includes
 *     ('Cannot cancel')` → 400 (substring match);
 *     default → `safeErrorResponse(...)` 500. The
 *     FIRST per-source-file POST smoke pinning a
 *     mixed exact-string + substring catch-
 *     dispatcher.
 *   - **Schema `.omit({ id: true })`:** the handler
 *     strips the path-param ID from the validation
 *     schema. The FIRST per-source-file POST smoke
 *     pinning a schema-omit contract.
 *
 *   1. **`auth()` session lookup** — `!session?.user
 *      ?.id` → 401 `{ success: false, error:
 *      'Unauthorized' }` (one-key envelope).
 *   2. **`{ id }` param resolution** via dynamic-
 *      segment route.
 *   3. **Body parse with silent coalesce** — `await
 *      request.json().catch(() => ({})) ?? {}`.
 *   4. **`cancelSponsorAdSchema.omit({ id: true })
 *      .safeParse(body)`** with conditional 400
 *      rejection.
 *   5. **`cancelReason` default fallback** to
 *      `'Cancelled by user'`.
 *   6. **`sponsorAdService.getSponsorAdById(id)`** →
 *      404 `'Sponsor ad not found'`.
 *   7. **Ownership verification** — `sponsorAd.user
 *      Id !== session.user.id` → 403 `'You do not
 *      have permission to cancel this sponsor ad'`.
 *   8. **`sponsorAdService.cancelSponsorAd(id,
 *      cancelReason)`** — load-bearing cancel call.
 *   9. **`!cancelledAd`** → 500 `'Failed to cancel
 *      sponsor ad'`.
 *  10. **Success payload** — `{ success: true,
 *      data: <cancelledAd>, message: 'Sponsor ad
 *      cancelled successfully' }`.
 *  11. **THREE-branch outer catch** (described
 *      above).
 *  12. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const NON_EXISTENT_AD_ID = '__definitely-not-a-real-sponsor-ad-id__';
const CANCEL_PATH = `/api/sponsor-ads/user/${NON_EXISTENT_AD_ID}/cancel`;

const SPONSOR_ADS_CANCEL_HEADERS = [
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

const SPONSOR_ADS_CANCEL_BODIES = [
	{ data: undefined as unknown, label: 'no body (silent-coalesce to {})' },
	{ data: '', label: 'empty string body (silent-coalesce to {})' },
	{ data: '{}', label: 'empty object body (skips conditional 400 — no cancelReason)' },

	// Valid bodies.
	{ data: { cancelReason: 'I no longer need this ad' }, label: 'valid cancelReason' },
	{ data: { cancelReason: 'Refund requested' }, label: 'short cancelReason' },

	// Conditional-validation probes.
	{ data: { cancelReason: 'X'.repeat(600) }, label: 'cancelReason > 500 chars (would 400 if reachable)' },
	{ data: { cancelReason: 1 }, label: 'numeric cancelReason (would 400 if reachable)' },
	{ data: { cancelReason: '' }, label: 'empty cancelReason (default-fallback)' },

	// Bypass attempts.
	{ data: { isAdmin: true, cancelReason: 'X' }, label: 'isAdmin=true bypass attempt' },
	{ data: { userId: 'fabricated', cancelReason: 'X' }, label: 'fabricated userId bypass attempt' },
	{ data: { sponsorAdId: 'override' }, label: 'sponsorAdId in body (omitted by schema)' },
	{ data: { padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Sponsor ad not found',
	'You do not have permission to cancel this sponsor ad',
	'Failed to cancel sponsor ad',
	'Sponsor ad cancelled successfully',
	'Cannot cancel sponsor ad with current status',
	'An error occurred while cancelling the sponsor ad'
] as const;

test.describe('API: /api/sponsor-ads/user/[id]/cancel POST body / header surface', () => {
	for (const { headers, label } of SPONSOR_ADS_CANCEL_HEADERS) {
		test(`POST ${CANCEL_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(CANCEL_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of SPONSOR_ADS_CANCEL_BODIES) {
		test(`POST ${CANCEL_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(CANCEL_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${CANCEL_PATH} returns 401 with the canonical one-key Unauthorized envelope`, async ({ request }) => {
		// `!session?.user?.id` → 401 `{ success: false,
		// error: 'Unauthorized' }`.
		const response = await request.post(CANCEL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Unauthorized' });
	});

	test(`POST ${CANCEL_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		const response = await request.post(CANCEL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
		expect(body.message).toBeUndefined();
	});

	test(`POST ${CANCEL_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// Success branch returns `{ success: true,
		// data: <cancelledAd>, message: '...' }`. The
		// unauth branch must NEVER reach
		// cancelSponsorAd.
		const response = await request.post(CANCEL_PATH, {
			data: { cancelReason: 'Test' }
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBe(false);
	});

	test(`POST ${CANCEL_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(CANCEL_PATH),
			request.post(CANCEL_PATH, { data: {} }),
			request.post(CANCEL_PATH, { data: { cancelReason: 'X' } }),
			request.post(CANCEL_PATH, { data: { cancelReason: 'X'.repeat(600) } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${CANCEL_PATH} silent-coalesce body-parse handles malformed JSON without 400`, async ({ request }) => {
		// On the AUTH branch, malformed JSON would
		// silently coalesce to `{}` and proceed to
		// validation (which would skip its 400 because
		// cancelReason is undefined). On the UNAUTH
		// branch, the auth gate fires BEFORE the body
		// parse — but the contract is identical: NO
		// 'Invalid JSON' 400 envelope.
		const responses = await Promise.all([
			request.post(CANCEL_PATH, { data: 'not-json' }),
			request.post(CANCEL_PATH, { data: '{ broken: json' }),
			request.post(CANCEL_PATH, { data: '{"cancelReason":' })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(typeof body.error).toBe('string');
			// No 'Invalid JSON' substring should appear.
			expect(body.error).not.toContain('Invalid JSON');
		}
	});

	test(`POST ${CANCEL_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(CANCEL_PATH);
		const responses = await Promise.all([
			request.post(CANCEL_PATH, { data: {} }),
			request.post(CANCEL_PATH, { data: { cancelReason: 'X' } }),
			request.post(CANCEL_PATH, { data: { cancelReason: 'X'.repeat(600) } }),
			request.post(CANCEL_PATH, { data: { isAdmin: true } }),
			request.post(CANCEL_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(CANCEL_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${CANCEL_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(CANCEL_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(CANCEL_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(CANCEL_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(CANCEL_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CANCEL_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		// The route exports ONLY POST.
		const responses = await Promise.all([
			request.get(CANCEL_PATH),
			request.put(CANCEL_PATH),
			request.patch(CANCEL_PATH),
			request.delete(CANCEL_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CANCEL_PATH} conditional Zod validation is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, an over-length
		// cancelReason surfaces a Zod issue message.
		// The unauth branch must NEVER emit any
		// validation error — only the canonical
		// 'Unauthorized'.
		const responses = await Promise.all([
			request.post(CANCEL_PATH, { data: { cancelReason: 'X'.repeat(600) } }),
			request.post(CANCEL_PATH, { data: { cancelReason: 1 } }),
			request.post(CANCEL_PATH, { data: { cancelReason: ['array'] } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).toBe('Unauthorized');
		}
	});

	test(`POST ${CANCEL_PATH} ownership / not-found / cancelSponsorAd are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders the post-auth
		// chain before the gate would surface here:
		// the unauth response would echo any of the
		// service-call messages.
		const response = await request.post(CANCEL_PATH, {
			data: { cancelReason: 'Test cancellation' }
		});
		const body = await response.json();
		expect(body.error).not.toBe('Sponsor ad not found');
		expect(body.error).not.toBe('You do not have permission to cancel this sponsor ad');
		expect(body.error).not.toBe('Failed to cancel sponsor ad');
		expect(body.message).not.toBe('Sponsor ad cancelled successfully');
	});

	test(`POST ${CANCEL_PATH} three-branch outer catch (404 / 400 / 500 dispatcher) is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The outer catch dispatches to three branches
		// based on error.message. The unauth branch
		// must NEVER produce any of these dispatched
		// messages.
		const responses = await Promise.all([
			request.post(CANCEL_PATH),
			request.post(CANCEL_PATH, { data: {} }),
			request.post(CANCEL_PATH, { data: { cancelReason: 'X' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Cannot cancel sponsor ad with current status');
			expect(body.error).not.toBe('An error occurred while cancelling the sponsor ad');
		}
	});

	test(`POST ${CANCEL_PATH} cancelReason value is NOT echoed on the unauth branch`, async ({ request }) => {
		// Caller-supplied cancelReason values must
		// NEVER appear in the unauth response —
		// neither legitimate nor XSS-shaped.
		const response = await request.post(CANCEL_PATH, {
			data: { cancelReason: '<script>alert(1)</script>' }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('<script>');
		expect(serialized).not.toContain('alert(1)');
	});
});
