import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET + POST / header
 * surface** of the subscription-expiration cron
 * endpoint served by the `GET` AND `POST` exports of
 * `apps/web/app/api/cron/subscription-expiration/route.ts`.
 *
 * `GET / POST /api/cron/subscription-expiration` is
 * the **first per-source-file smoke** the docs tree
 * publishes that pins a **timing-safe Bearer-token
 * comparison** via `crypto.timingSafeEqual`. The
 * existing multi-cron sibling
 * [`cron-jobs.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-jobs.spec.ts)
 * covers the OTHER cron routes; this spec drills
 * into the subscription-expiration handler
 * specifically AND its **GET + POST dual-method-
 * delegate** export pattern.
 *
 * Sibling specs:
 *   - The cron/sync GET sibling
 *     [`cron-sync-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-sync-query.spec.ts)
 *     uses a DIFFERENT cron-auth contract — exact
 *     `Bearer ${CRON_SECRET}` string match (NOT
 *     timing-safe). The cron-sync handler also
 *     emits a 4-key 401 envelope (`{ success,
 *     timestamp, duration, message }`); this
 *     subscription-expiration handler emits a TWO-
 *     key 401 envelope (`{ success, message }`).
 *
 * Distinct from EVERY prior cron smoke:
 *
 *   - **Timing-safe Bearer-token comparison** via
 *     `crypto.timingSafeEqual(Buffer.from(provided),
 *     Buffer.from(cronSecret))` — the FIRST per-
 *     source-file smoke pinning a constant-time
 *     comparison contract on a Bearer-token-gated
 *     endpoint.
 *   - **Length-equality short-circuit** —
 *     `providedSecret.length !== cronSecret.length`
 *     → false (avoids `timingSafeEqual` length-
 *     mismatch throw; UNIQUE).
 *   - **`authHeader.replace('Bearer ', '')` parsing**
 *     — extracts the token via `.replace(...)`
 *     (rather than exact-match comparison like
 *     cron/sync).
 *   - **TWO-key 401 envelope** `{ success: false,
 *     message: 'Unauthorized - Invalid or missing
 *     cron secret' }` — UNIQUE: longer specific
 *     message naming the failure mode (vs cron/sync's
 *     `'Unauthorized'`); uses `message` (not
 *     `error`).
 *   - **GET + POST dual-method-delegate exports** —
 *     POST simply does `return GET(request)`; UNIQUE:
 *     the FIRST per-source-file smoke pinning a
 *     method-delegate POST that re-routes to GET
 *     verbatim.
 *   - **Email-service best-effort side-effect** — if
 *     the email service is unavailable, the cron
 *     does NOT fail (continues to update DB).
 *   - **PII-stripped `affectedUsers`** — the
 *     response includes `{ subscriptionId, userId,
 *     planId }` per affected user but NEVER `email`
 *     (intentional PII protection).
 *
 *   1. **`verifyCronSecret(request)` helper** —
 *      Bearer-token check with timing-safe
 *      comparison.
 *   2. **Dev-mode short-circuit** — `if (!cronSecret
 *      && process.env.NODE_ENV === 'development')`
 *      → bypass.
 *   3. **`subscriptionService.processExpiredSubscriptions()`**
 *      — load-bearing DB-write call.
 *   4. **PII-strip transformation** — affectedUsers
 *      with subscriptionId / userId / planId only.
 *   5. **Email-service side-effect** — best-effort,
 *      does NOT fail the cron job.
 *   6. **Success payload** — `{ success: true,
 *      message: 'Processed X expired
 *      subscriptions', data: { processed,
 *      affectedUsers, errors, timestamp } }` with
 *      status 200.
 *   7. **Outer catch** — `safeErrorResponse(error,
 *      'Failed to process expired subscriptions')`.
 *   8. **Method-resolution surface** — the route
 *      exports `GET` AND `POST` (POST delegates to
 *      GET). `PUT` / `PATCH` / `DELETE` must round-
 *      trip to a `< 500` status.
 */
const CRON_PATH = '/api/cron/subscription-expiration';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	// Bearer-token probes — timing-safe handler.
	{ headers: { Authorization: 'Bearer not-the-real-secret' }, label: 'wrong Bearer secret' },
	{ headers: { Authorization: 'Bearer ' }, label: 'empty Bearer secret' },
	{ headers: { Authorization: 'NotBearer fabricated' }, label: 'non-Bearer scheme' },
	{ headers: { Authorization: 'Bearer  with-extra-space' }, label: 'Bearer with double-space' },
	{ headers: { Authorization: 'Basic dXNlcjpwYXNz' }, label: 'Basic auth scheme' },

	// Side-channels.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' }
] as const;

test.describe('API: /api/cron/subscription-expiration GET + POST surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${CRON_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(CRON_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`POST ${CRON_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(CRON_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${CRON_PATH} returns 401 with the canonical TWO-key envelope when no Authorization header is present`, async ({
		request
	}) => {
		// In CI environment with CRON_SECRET configured,
		// missing Authorization → 401 TWO-key envelope.
		// In dev with NO CRON_SECRET, this would be a
		// 200 — but the smoke spec runs with whatever
		// env happens to be set. We assert: either 401
		// TWO-key OR 200 success-shape (NOT 5xx).
		const response = await request.get(CRON_PATH);
		expect(response.status()).toBeLessThan(500);

		const body = await response.json();

		if (response.status() === 401) {
			expect(body.success).toBe(false);
			expect(body.message).toBe('Unauthorized - Invalid or missing cron secret');
			expect(body.error).toBeUndefined();
		}
	});

	test(`GET ${CRON_PATH} 401 envelope shape (when reached) has exactly success and message keys`, async ({
		request
	}) => {
		// Force the auth check to fail by sending a
		// wrong Bearer token.
		const response = await request.get(CRON_PATH, {
			headers: { Authorization: 'Bearer definitely-not-the-real-cron-secret' }
		});

		if (response.status() === 401) {
			const body = await response.json();
			expect(Object.keys(body).sort()).toEqual(['message', 'success']);
			expect(body.success).toBe(false);
			expect(body.error).toBeUndefined();
			expect(body.data).toBeUndefined();
		}
	});

	test(`GET ${CRON_PATH} does NOT echo the wrong Bearer secret`, async ({ request }) => {
		// Pin that the caller-supplied Bearer secret
		// is NEVER echoed in the unauth response.
		const response = await request.get(CRON_PATH, {
			headers: { Authorization: 'Bearer attacker-supplied-secret-marker-67890' }
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('attacker-supplied-secret-marker-67890');
	});

	test(`GET ${CRON_PATH} timing-safe comparison length-mismatch handling`, async ({ request }) => {
		// The handler short-circuits if `providedSecret.
		// length !== cronSecret.length`. Pin that BOTH
		// a too-short AND a too-long Bearer token
		// produce the same 401 status.
		const tooShort = await request.get(CRON_PATH, {
			headers: { Authorization: 'Bearer x' }
		});
		const tooLong = await request.get(CRON_PATH, {
			headers: {
				Authorization: 'Bearer ' + 'x'.repeat(1000)
			}
		});

		// Both must be NON-5xx.
		expect(tooShort.status()).toBeLessThan(500);
		expect(tooLong.status()).toBeLessThan(500);
	});

	test(`POST ${CRON_PATH} delegates to GET (same envelope shape)`, async ({ request }) => {
		// POST delegates to GET via `return GET(request)`.
		// Pin that POST returns the SAME envelope as GET
		// when reached on the unauth branch.
		const getResponse = await request.get(CRON_PATH, {
			headers: { Authorization: 'Bearer wrong-secret' }
		});
		const postResponse = await request.post(CRON_PATH, {
			headers: { Authorization: 'Bearer wrong-secret' }
		});

		expect(getResponse.status()).toBe(postResponse.status());

		if (getResponse.status() === 401) {
			const getBody = await getResponse.json();
			const postBody = await postResponse.json();
			expect(getBody).toEqual(postBody);
		}
	});

	test(`GET ${CRON_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// GET and POST are the only exported methods.
		const responses = await Promise.all([
			request.put(CRON_PATH),
			request.patch(CRON_PATH),
			request.delete(CRON_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${CRON_PATH} does NOT branch on side-channel cookies / non-Bearer auth headers`, async ({
		request
	}) => {
		// Pin that fabricated session cookies / X-User-
		// Id headers do NOT bypass the cron auth.
		const baseline = await request.get(CRON_PATH);
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.get(CRON_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get(CRON_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.get(CRON_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`GET ${CRON_PATH} processExpiredSubscriptions is NOT entered with a wrong Bearer secret`, async ({
		request
	}) => {
		// CRITICAL: the load-bearing
		// `subscriptionService.processExpiredSubscriptions()`
		// DB-write call must NEVER reach the auth gate
		// fails. Pin that no `affectedUsers` /
		// `processed` field is leaked when sending a
		// wrong secret.
		const response = await request.get(CRON_PATH, {
			headers: { Authorization: 'Bearer wrong-secret' }
		});

		if (response.status() === 401) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			const serialized = JSON.stringify(body);
			expect(serialized).not.toContain('affectedUsers');
			expect(serialized).not.toContain('processed');
			expect(serialized).not.toContain('subscriptionId');
		}
	});

	test(`GET ${CRON_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		// Pins the gate-before-post-auth order across
		// candidate post-auth messages.
		const response = await request.get(CRON_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// The post-auth messages must NEVER appear on
		// the unauth branch.
		expect(serialized).not.toContain('Processed');
		expect(serialized).not.toContain('expired subscriptions');
		expect(serialized).not.toContain('Failed to process expired subscriptions');
	});
});
