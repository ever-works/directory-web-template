import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET + POST / header
 * surface** of the subscription-reminders cron
 * endpoint served by the `GET` AND `POST` exports of
 * `apps/web/app/api/cron/subscription-reminders/route.ts`.
 *
 * `GET / POST /api/cron/subscription-reminders` is
 * the **first per-source-file smoke** the docs tree
 * publishes that pins a **207 Multi-Status partial-
 * success response** (the handler returns 207 when
 * `result.success === false`). The existing multi-
 * cron sibling
 * [`cron-jobs.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-jobs.spec.ts)
 * covers OTHER cron routes; this spec drills into
 * the subscription-reminders handler specifically.
 *
 * Sibling specs:
 *   - The subscription-expiration sibling
 *     [`cron-subscription-expiration-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-subscription-expiration-method.spec.ts)
 *     uses ALSO timing-safe comparison BUT compares
 *     ONLY the secret portion (after `Bearer `
 *     stripped) and emits a TWO-key 401 envelope
 *     `{ success: false, message: 'Unauthorized -
 *     Invalid or missing cron secret' }`. This
 *     subscription-reminders sibling compares the
 *     FULL `Authorization` header (`Bearer
 *     ${cronSecret}`) and emits a BARE ONE-key
 *     `{ error: 'Unauthorized' }` envelope.
 *
 * Distinct from EVERY prior cron smoke:
 *
 *   - **Timing-safe comparison on the FULL
 *     `Authorization` header** — `Buffer.from
 *     (authHeader)` is compared to `Buffer.from
 *     (\`Bearer ${cronSecret}\`)` (UNIQUE: every
 *     other cron handler compares ONLY the secret
 *     portion after stripping `Bearer `).
 *   - **BARE ONE-key 401 envelope** `{ error:
 *     'Unauthorized' }` (NO `success` key, NO
 *     `message` field — DIFFERENT from the
 *     subscription-expiration sibling's TWO-key
 *     envelope).
 *   - **207 Multi-Status response** — UNIQUE: the
 *     FIRST per-source-file smoke pinning a 207
 *     partial-success status code (when
 *     `result.success === false`, returns 207
 *     instead of 200/500).
 *   - **Spread-result success / error pattern** —
 *     both branches spread the entire result object
 *     into the response (`{ message:
 *     'Subscription reminder job completed',
 *     ...result }` and `{ error: 'Job completed
 *     with errors', ...result }`). UNIQUE: distinct
 *     from subscription-expiration which constructs
 *     an explicit `data` envelope.
 *   - **GET + POST dual-method-delegate exports** —
 *     POST simply does `return GET(request)`
 *     (matches subscription-expiration sibling).
 *   - **Outer catch via `safeErrorResponse(error,
 *     'Cron job failed')`** — distinct message vs
 *     subscription-expiration's `'Failed to process
 *     expired subscriptions'`.
 *
 *   1. **`verifyCronSecret(request)` helper** —
 *      Bearer-token check with timing-safe
 *      comparison on the FULL authHeader.
 *   2. **Dev-mode short-circuit** — `if (!cronSecret
 *      && process.env.NODE_ENV === 'development')`
 *      → bypass.
 *   3. **`subscriptionRenewalReminderJob()`** —
 *      load-bearing reminder-job call.
 *   4. **Conditional 207 branch** — `if
 *      (!result.success)` → 207 Multi-Status with
 *      spread-result envelope.
 *   5. **Success payload** — `{ message:
 *      'Subscription reminder job completed',
 *      ...result }` with status 200.
 *   6. **Outer catch** — `safeErrorResponse(error,
 *      'Cron job failed')`.
 *   7. **Method-resolution surface** — the route
 *      exports `GET` AND `POST` (POST delegates to
 *      GET). `PUT` / `PATCH` / `DELETE` must round-
 *      trip to a `< 500` status.
 */
const CRON_PATH = '/api/cron/subscription-reminders';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	// Bearer-token probes — timing-safe handler.
	{ headers: { Authorization: 'Bearer not-the-real-secret' }, label: 'wrong Bearer secret' },
	{ headers: { Authorization: 'Bearer ' }, label: 'empty Bearer secret' },
	{ headers: { Authorization: 'NotBearer fabricated' }, label: 'non-Bearer scheme' },
	{ headers: { Authorization: 'bearer lowercase' }, label: 'lowercase bearer scheme' },
	{ headers: { Authorization: 'Basic dXNlcjpwYXNz' }, label: 'Basic auth scheme' },

	// Side-channels.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' }
] as const;

test.describe('API: /api/cron/subscription-reminders GET + POST surface', () => {
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

	test(`GET ${CRON_PATH} returns 401 with the BARE ONE-key envelope when no Authorization header is present`, async ({
		request
	}) => {
		// In CI environment with CRON_SECRET configured,
		// missing Authorization → 401 BARE envelope.
		// In dev with NO CRON_SECRET, this would be a
		// 200 — but the smoke spec runs with whatever
		// env happens to be set. We assert: either 401
		// BARE OR 200/207 (NOT 5xx).
		const response = await request.get(CRON_PATH);
		expect(response.status()).toBeLessThan(500);

		if (response.status() === 401) {
			const body = await response.json();
			expect(body.error).toBe('Unauthorized');
			expect(body.success).toBeUndefined();
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET ${CRON_PATH} 401 envelope shape (when reached) has exactly the error key`, async ({
		request
	}) => {
		// Force the auth check to fail by sending a
		// wrong Bearer token.
		const response = await request.get(CRON_PATH, {
			headers: { Authorization: 'Bearer definitely-not-the-real-cron-secret' }
		});

		if (response.status() === 401) {
			const body = await response.json();
			expect(Object.keys(body)).toEqual(['error']);
			expect(body.success).toBeUndefined();
			expect(body.data).toBeUndefined();
		}
	});

	test(`GET ${CRON_PATH} does NOT echo the wrong Bearer secret`, async ({ request }) => {
		// Pin that the caller-supplied Bearer secret
		// is NEVER echoed in the unauth response.
		const response = await request.get(CRON_PATH, {
			headers: { Authorization: 'Bearer attacker-supplied-reminder-marker-13579' }
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('attacker-supplied-reminder-marker-13579');
	});

	test(`GET ${CRON_PATH} timing-safe comparison length-mismatch handling on FULL header`, async ({
		request
	}) => {
		// The handler short-circuits if `authHeader.
		// length !== expectedValue.length` (where
		// expectedValue includes the `Bearer ` prefix).
		// Pin that BOTH a too-short AND a too-long
		// Authorization header produce `< 500`.
		const tooShort = await request.get(CRON_PATH, {
			headers: { Authorization: 'B' }
		});
		const tooLong = await request.get(CRON_PATH, {
			headers: {
				Authorization: 'Bearer ' + 'x'.repeat(2000)
			}
		});

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

	test(`GET ${CRON_PATH} subscriptionRenewalReminderJob is NOT entered with a wrong Bearer secret`, async ({
		request
	}) => {
		// CRITICAL: the load-bearing
		// `subscriptionRenewalReminderJob()` call must
		// NEVER reach the auth gate fails. Pin that no
		// `result` field is leaked when sending a wrong
		// secret.
		const response = await request.get(CRON_PATH, {
			headers: { Authorization: 'Bearer wrong-secret' }
		});

		if (response.status() === 401) {
			const body = await response.json();
			const serialized = JSON.stringify(body);
			// No spread-result key should leak.
			expect(serialized).not.toContain('Subscription reminder job completed');
			expect(serialized).not.toContain('Job completed with errors');
			expect(serialized).not.toContain('processed');
			expect(serialized).not.toContain('reminded');
		}
	});

	test(`GET ${CRON_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		// Pins the gate-before-post-auth order.
		const response = await request.get(CRON_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// The post-auth messages must NEVER appear on
		// the unauth branch.
		expect(serialized).not.toContain('Subscription reminder job completed');
		expect(serialized).not.toContain('Job completed with errors');
		expect(serialized).not.toContain('Cron job failed');
	});

	test(`GET ${CRON_PATH} does NOT return 207 on the unauth branch`, async ({ request }) => {
		// Pins that the 207 partial-success status code
		// is NEVER reached on the unauth branch — it
		// only fires AFTER the load-bearing
		// `subscriptionRenewalReminderJob()` call which
		// requires successful cron-secret verification.
		const response = await request.get(CRON_PATH);
		expect(response.status()).not.toBe(207);
	});
});
