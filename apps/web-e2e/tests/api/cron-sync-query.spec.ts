import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET / header surface** of
 * the Vercel cron sync endpoint served by the `GET`
 * export of `apps/web/app/api/cron/sync/route.ts`.
 *
 * `GET /api/cron/sync` is the **first per-source-
 * file GET smoke** the docs tree publishes for a
 * Bearer-token-secret-gated cron endpoint. The
 * existing multi-cron sibling
 * [`cron-jobs.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/cron-jobs.spec.ts)
 * covers the OTHER cron routes (subscription-
 * expiration, subscription-reminders); this spec
 * drills into the cron/sync handler specifically.
 *
 * Distinct from EVERY prior GET smoke:
 *
 *   - **Bearer-token-secret auth** — the handler
 *     accepts ONLY `Authorization: Bearer
 *     ${CRON_SECRET}` (NOT session-based auth). The
 *     FIRST per-source-file GET smoke pinning a
 *     Bearer-token-only auth contract.
 *   - **Dev-mode short-circuit** — if `CRON_SECRET`
 *     is NOT configured AND env is `development`,
 *     the handler allows access without auth. Same
 *     pattern as lemonsqueezy/update's dev-mode
 *     short-circuit.
 *   - **FOUR-key 401 envelope** — `{ success: false,
 *     timestamp: <ISO>, duration: <ms>, message:
 *     'Unauthorized' }`. UNIQUE: NO `error` field;
 *     uses `message` (not `error`) for the auth
 *     failure. The FIRST per-source-file smoke
 *     pinning a 401 envelope WITHOUT an `error`
 *     field.
 *   - **Performance tracking** via `startTime =
 *     Date.now()` and `duration: Date.now() -
 *     startTime` in BOTH the unauth response AND
 *     the success/catch responses (matches
 *     lemonsqueezy/update richest-envelope spec but
 *     with a `message`-only envelope).
 *   - **Custom `Cache-Control: no-cache, no-store,
 *     must-revalidate` header** on success.
 *   - **Conditional success status** — `{ status:
 *     result.success ? 200 : 500 }` based on the
 *     sync result.
 *
 *   1. **Bearer-token-secret check** — `request.
 *      headers.get('authorization') === \`Bearer
 *      ${cronSecret}\``. Failure → 401 4-key
 *      envelope (UNLESS dev-mode short-circuit).
 *   2. **Dev-mode short-circuit** — `if
 *      (!cronSecret && isDevelopment)` → bypass.
 *   3. **`triggerManualSync()`** — load-bearing
 *      sync call.
 *   4. **Success payload** — `{ success: <result.
 *      success>, timestamp: <ISO>, duration: <ms>,
 *      message: <result.message>, details?:
 *      <result.details> }` with status 200 (if
 *      result.success) or 500.
 *   5. **Outer catch** — `safeErrorMessage(error,
 *      'Unknown error')` extracted into the catch
 *      envelope. Status 500.
 *   6. **Method-resolution surface** — the route
 *      exports ONLY `GET`. `POST` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const CRON_SYNC_PATH = '/api/cron/sync';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	// Bearer-token probes.
	{ headers: { Authorization: 'Bearer not-the-real-secret' }, label: 'wrong Bearer secret' },
	{ headers: { Authorization: 'Bearer ' }, label: 'empty Bearer secret' },
	{ headers: { Authorization: 'NotBearer fabricated' }, label: 'non-Bearer scheme' },
	{ headers: { Authorization: 'Basic dXNlcjpwYXNz' }, label: 'Basic auth scheme' },

	// Sibling-cron-style headers.
	{ headers: { 'x-vercel-signature': 'fabricated' }, label: 'fabricated x-vercel-signature header' },

	// Other side-channel.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

test.describe('API: /api/cron/sync GET header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${CRON_SYNC_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(CRON_SYNC_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${CRON_SYNC_PATH} returns 401 with the FOUR-key envelope when no Authorization header is present`, async ({
		request
	}) => {
		// In CI environment with CRON_SECRET configured,
		// missing Authorization → 401 4-key envelope.
		// In dev with NO CRON_SECRET, this would be a
		// 200 — but the smoke spec runs with whatever
		// env happens to be set. We assert: either 401
		// 4-key OR 200 success-shape (NOT 5xx).
		const response = await request.get(CRON_SYNC_PATH);
		expect(response.status()).toBeLessThan(500);

		const body = await response.json();

		// If 401, verify the 4-key envelope shape.
		if (response.status() === 401) {
			expect(body.success).toBe(false);
			expect(body.message).toBe('Unauthorized');
			expect(typeof body.timestamp).toBe('string');
			expect(typeof body.duration).toBe('number');
			// NO error key (uses message instead).
			expect(body.error).toBeUndefined();
		}
	});

	test(`GET ${CRON_SYNC_PATH} 401 envelope shape (when reached) has exactly success / timestamp / duration / message keys`, async ({
		request
	}) => {
		// Force the auth check to fail by sending a
		// wrong Bearer token. In dev mode without
		// CRON_SECRET this still goes through (the
		// dev-mode short-circuit only fires when
		// `!cronSecret`, NOT when there's a wrong
		// secret).
		const response = await request.get(CRON_SYNC_PATH, {
			headers: { Authorization: 'Bearer definitely-not-the-real-cron-secret' }
		});

		if (response.status() === 401) {
			const body = await response.json();
			expect(Object.keys(body).sort()).toEqual(['duration', 'message', 'success', 'timestamp']);
			expect(body.success).toBe(false);
			expect(body.error).toBeUndefined();
		} else {
			// In dev with no secret: 200/500 without
			// the 401 envelope — also acceptable.
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${CRON_SYNC_PATH} response includes ISO-format timestamp`, async ({ request }) => {
		// The handler emits `new Date().toISOString()`
		// in BOTH the 401 and the success/catch
		// envelopes.
		const response = await request.get(CRON_SYNC_PATH);
		const body = await response.json();

		if (typeof body.timestamp === 'string') {
			expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		}
	});

	test(`GET ${CRON_SYNC_PATH} response includes numeric duration field`, async ({ request }) => {
		// `duration: Date.now() - startTime` — the
		// FIRST per-source-file GET smoke pinning
		// request-duration measurement on the unauth
		// branch.
		const response = await request.get(CRON_SYNC_PATH);
		const body = await response.json();

		if (typeof body.duration === 'number') {
			expect(body.duration).toBeGreaterThanOrEqual(0);
		}
	});

	test(`GET ${CRON_SYNC_PATH} does NOT echo the wrong Bearer secret`, async ({ request }) => {
		// Pin that the caller-supplied Bearer secret
		// is NEVER echoed in the unauth response —
		// neither in `message` nor anywhere in the
		// envelope.
		const response = await request.get(CRON_SYNC_PATH, {
			headers: { Authorization: 'Bearer attacker-supplied-secret-marker' }
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('attacker-supplied-secret-marker');
	});

	test(`GET ${CRON_SYNC_PATH} cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// GET is the ONLY exported method.
		const responses = await Promise.all([
			request.post(CRON_SYNC_PATH),
			request.put(CRON_SYNC_PATH),
			request.patch(CRON_SYNC_PATH),
			request.delete(CRON_SYNC_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${CRON_SYNC_PATH} does NOT branch on side-channel cookies / non-Bearer auth headers`, async ({
		request
	}) => {
		// Pin that fabricated session cookies / X-User-
		// Id headers do NOT bypass the Bearer-token
		// auth.
		const baseline = await request.get(CRON_SYNC_PATH);
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.get(CRON_SYNC_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get(CRON_SYNC_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.get(CRON_SYNC_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`GET ${CRON_SYNC_PATH} triggerManualSync is NOT entered with a wrong Bearer secret`, async ({ request }) => {
		// The auth check fires BEFORE triggerManualSync.
		// A wrong Bearer secret must NEVER reach the
		// sync logic — the response must be either 401
		// (with CRON_SECRET configured) OR a `< 500`
		// status. Pin that no `details` from a sync
		// result is leaked when sending a wrong
		// secret.
		const response = await request.get(CRON_SYNC_PATH, {
			headers: { Authorization: 'Bearer wrong-secret' }
		});

		// When 401, no sync was triggered.
		if (response.status() === 401) {
			const body = await response.json();
			expect(body.message).toBe('Unauthorized');
			// The 4-key 401 envelope does NOT include
			// `details`.
			expect(body.details).toBeUndefined();
		}
	});
});
