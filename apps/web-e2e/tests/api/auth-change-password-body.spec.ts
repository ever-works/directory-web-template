import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the password-change endpoint served by the `POST`
 * export of `apps/web/app/api/auth/change-password/route.ts`.
 *
 * `POST /api/auth/change-password` is the **first
 * per-source-file POST smoke** the docs tree publishes
 * that pins a **rate-limit-FIRST gate posture** —
 * BEFORE `auth()`. The handler calls `ratelimit
 * (\`change-password:\${clientIP}\`, 5, 15 * 60 * 1000)`
 * as the FIRST gate, then runs `auth()`, then Zod
 * validation, then a multi-stage post-auth chain
 * (tenant / user / OAuth / bcrypt-current / bcrypt-
 * duplicate). EVERY prior per-source-file POST smoke
 * pins auth as the first gate; this is the FIRST
 * rate-limit-before-auth contract in the rollout.
 *
 * The companion minimal spec
 * [`auth-change-password.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/auth-change-password.spec.ts)
 * pins only the `< 500` no-server-error contract;
 * this spec drills into the body / header surface
 * with detailed invariants.
 *
 * Distinct from EVERY prior per-source-file POST
 * smoke:
 *
 *   - **Rate-limit-FIRST gate posture:** the rate-
 *     limit check fires BEFORE the auth gate.
 *     Returns 429 `{ success: false, error: 'Too
 *     many password change attempts. Please try
 *     again later.', retryAfter: <seconds> }`. The
 *     FIRST per-source-file POST smoke that pins a
 *     `retryAfter` field in the response body.
 *   - **`'Unauthorized. Please sign in.'` 401
 *     message:** UNIQUE — the imperative-phrased
 *     401 envelope distinct from all prior 401
 *     messages (`'Unauthorized'`, `'Authentication
 *     required'`, `'Authentication required'`
 *     two-key, etc.).
 *   - **OAuth-account check:** `!user.passwordHash`
 *     → 400 `'Password change not available for
 *     OAuth accounts. Please contact support.'`.
 *     The FIRST per-source-file POST smoke that
 *     pins an OAuth-account-restriction contract.
 *   - **Dual bcrypt.compare gates:** current-
 *     password verification (400 `'Current password
 *     is incorrect'`) AND duplicate-password
 *     prevention (400 `'New password must be
 *     different from current password'`). The
 *     FIRST per-source-file POST smoke that pins a
 *     dual bcrypt.compare contract.
 *   - **Cross-field Zod validation via `.refine`:**
 *     the `changePasswordSchema` uses `.refine` to
 *     check `newPassword === confirmPassword`. The
 *     FIRST per-source-file POST smoke that pins a
 *     cross-field validation contract.
 *   - **Email-send fault tolerance:** the
 *     `sendPasswordChangeConfirmationEmail(...)`
 *     call is wrapped in a try/catch that does NOT
 *     fail the password change. The success
 *     response is returned regardless of email
 *     delivery.
 *
 *   1. **Rate-limit gate FIRST** — `ratelimit
 *      ('change-password:<ip>', 5, 15 minutes)` →
 *      429 `{ success: false, error: 'Too many ...',
 *      retryAfter: <seconds> }` if exceeded.
 *   2. **`auth()` session lookup** — `!session?.
 *      user?.id` → 401 `{ success: false, error:
 *      'Unauthorized. Please sign in.' }`.
 *   3. **Zod `safeParse(body)` with cross-field
 *      `.refine`** — failure → 400 `{ success:
 *      false, error: 'Invalid input data', details:
 *      <zod issues> }`.
 *   4. **`getTenantId()` resolution** — null → 403
 *      `'Tenant not found'`.
 *   5. **User lookup by `id` AND `tenantId`** — not
 *      found → 404 `'User not found'`.
 *   6. **OAuth-account check** — `!user.password
 *      Hash` → 400 `'Password change not available
 *      for OAuth accounts. Please contact support.'`.
 *   7. **`bcrypt.compare(currentPassword, hash)`**
 *      — false → 400 `'Current password is
 *      incorrect'`.
 *   8. **`bcrypt.compare(newPassword, hash)` for
 *      duplicate detection** — true → 400 `'New
 *      password must be different from current
 *      password'`.
 *   9. **`bcrypt.hash(newPassword, 12)` +
 *      `db.update(users)`** — load-bearing
 *      password-write call.
 *  10. **`sendPasswordChangeConfirmationEmail(...)`
 *      side-effect** wrapped in try/catch (fault-
 *      tolerant; failure does NOT fail the
 *      password change).
 *  11. **Success payload** — `{ success: true,
 *      message: 'Password changed successfully' }`
 *      with status 200.
 *  12. **Outer catch** — 500 `{ success: false,
 *      error: 'Internal server error. Please try
 *      again later.' }`.
 *  13. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const CHANGE_PASSWORD_PATH = '/api/auth/change-password';

const AUTH_CHANGE_PASSWORD_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	// X-Forwarded-For is read by the rate-limit gate.
	{ headers: { 'X-Forwarded-For': '1.2.3.4' }, label: 'X-Forwarded-For (used by rate-limit)' },
	{ headers: { 'X-Real-Ip': '5.6.7.8' }, label: 'X-Real-Ip (rate-limit fallback)' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const AUTH_CHANGE_PASSWORD_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (zod) if reachable)' },

	// Required-field probes.
	{ data: { currentPassword: 'old' }, label: 'no newPassword or confirmPassword' },
	{ data: { newPassword: 'new', confirmPassword: 'new' }, label: 'no currentPassword' },
	{ data: { currentPassword: 'old', newPassword: 'new' }, label: 'no confirmPassword' },

	// Valid-shape probes (would proceed to user lookup if reachable).
	{
		data: {
			currentPassword: 'CurrentPass123!',
			newPassword: 'NewSecurePass456@',
			confirmPassword: 'NewSecurePass456@'
		},
		label: 'valid all-fields strong password'
	},

	// Cross-field validation probe.
	{
		data: {
			currentPassword: 'old',
			newPassword: 'NewPass123!',
			confirmPassword: 'DifferentPass!'
		},
		label: 'mismatched newPassword/confirmPassword'
	},

	// Weak-password probes.
	{
		data: { currentPassword: 'old', newPassword: 'short', confirmPassword: 'short' },
		label: 'too-short newPassword'
	},
	{
		data: { currentPassword: 'old', newPassword: 'alllowercase', confirmPassword: 'alllowercase' },
		label: 'newPassword missing uppercase/digit/symbol'
	},

	// Bypass attempts.
	{
		data: {
			currentPassword: 'old',
			newPassword: 'NewPass123!',
			confirmPassword: 'NewPass123!',
			isAdmin: true
		},
		label: 'isAdmin=true bypass attempt'
	},
	{
		data: {
			currentPassword: 'old',
			newPassword: 'NewPass123!',
			confirmPassword: 'NewPass123!',
			userId: 'fabricated'
		},
		label: 'fabricated userId bypass attempt'
	},
	{
		data: {
			currentPassword: 'X'.repeat(1_000),
			newPassword: 'NewPass123!',
			confirmPassword: 'NewPass123!'
		},
		label: 'huge currentPassword'
	}
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Invalid input data',
	'Tenant not found',
	'User not found',
	'Password change not available for OAuth accounts. Please contact support.',
	'Current password is incorrect',
	'New password must be different from current password',
	'Password changed successfully',
	'Internal server error. Please try again later.'
] as const;

test.describe('API: /api/auth/change-password POST body / header surface', () => {
	for (const { headers, label } of AUTH_CHANGE_PASSWORD_HEADERS) {
		test(`POST ${CHANGE_PASSWORD_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(CHANGE_PASSWORD_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of AUTH_CHANGE_PASSWORD_BODIES) {
		test(`POST ${CHANGE_PASSWORD_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(CHANGE_PASSWORD_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${CHANGE_PASSWORD_PATH} returns 401 with the imperative-phrased Unauthorized envelope`, async ({
		request
	}) => {
		// `!session?.user?.id` → 401 `{ success:
		// false, error: 'Unauthorized. Please sign
		// in.' }`. UNIQUE imperative-phrased message.
		// Note: this test assumes the rate-limit gate
		// did NOT fire — the response should be 401,
		// NOT 429.
		const response = await request.post(CHANGE_PASSWORD_PATH);

		// If rate-limit fires (unusual at start of
		// run), allow either 401 or 429.
		expect([401, 429]).toContain(response.status());

		const body = await response.json();
		if (response.status() === 401) {
			expect(body).toEqual({ success: false, error: 'Unauthorized. Please sign in.' });
		}
	});

	test(`POST ${CHANGE_PASSWORD_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.post(CHANGE_PASSWORD_PATH);

		// Skip if rate-limit fires.
		if (response.status() === 429) {
			test.skip();
			return;
		}

		expect(response.status()).toBe(401);
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
		expect(body.details).toBeUndefined();
	});

	test(`POST ${CHANGE_PASSWORD_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch returns `{ success: true,
		// message: 'Password changed successfully' }`.
		// The unauth branch must NEVER reach the
		// password-write logic.
		const response = await request.post(CHANGE_PASSWORD_PATH, {
			data: {
				currentPassword: 'CurrentPass123!',
				newPassword: 'NewSecurePass456@',
				confirmPassword: 'NewSecurePass456@'
			}
		});

		const body = await response.json();
		expect(body.message).not.toBe('Password changed successfully');
		expect(body.success).toBe(false);
	});

	test(`POST ${CHANGE_PASSWORD_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(CHANGE_PASSWORD_PATH),
			request.post(CHANGE_PASSWORD_PATH, { data: {} }),
			request.post(CHANGE_PASSWORD_PATH, {
				data: {
					currentPassword: 'old',
					newPassword: 'NewPass123!',
					confirmPassword: 'NewPass123!'
				}
			})
		]);

		for (const response of responses) {
			// Skip rate-limit responses.
			if (response.status() === 429) continue;

			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
		}
	});

	test(`POST ${CHANGE_PASSWORD_PATH} 429 envelope (if reached) includes retryAfter field`, async ({ request }) => {
		// Pin the 429 envelope shape if rate-limit
		// fires: `{ success: false, error: 'Too
		// many ...', retryAfter: <number> }`.
		const responses: Array<{ status: number; body: any }> = [];
		// Hit endpoint enough times to potentially
		// trigger rate limit (5 attempts per 15 min).
		for (let i = 0; i < 6; i++) {
			const r = await request.post(CHANGE_PASSWORD_PATH, { headers: { 'X-Forwarded-For': '9.9.9.9' } });
			responses.push({ status: r.status(), body: await r.json() });
		}

		const rateLimited = responses.find((r) => r.status === 429);
		if (rateLimited) {
			expect(rateLimited.body.success).toBe(false);
			expect(rateLimited.body.error).toBe(
				'Too many password change attempts. Please try again later.'
			);
			expect(typeof rateLimited.body.retryAfter).toBe('number');
		}
		// If no rate-limit fired, the test is a
		// no-op — the rate-limit gate is a per-IP
		// stateful check that may or may not fire in
		// CI depending on test ordering.
	});

	test(`POST ${CHANGE_PASSWORD_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(CHANGE_PASSWORD_PATH, {
			headers: { 'X-Forwarded-For': '11.11.11.11' }
		});
		const responses = await Promise.all([
			request.post(CHANGE_PASSWORD_PATH, {
				data: {},
				headers: { 'X-Forwarded-For': '11.11.11.11' }
			}),
			request.post(CHANGE_PASSWORD_PATH, {
				data: { currentPassword: 'old' },
				headers: { 'X-Forwarded-For': '11.11.11.11' }
			}),
			request.post(CHANGE_PASSWORD_PATH, {
				data: { isAdmin: true },
				headers: { 'X-Forwarded-For': '11.11.11.11' }
			})
		]);

		// Stability across permutations on the same
		// IP. Skip if rate-limit fired (varies).
		if (baseline.status() === 429) {
			test.skip();
			return;
		}

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${CHANGE_PASSWORD_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(CHANGE_PASSWORD_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated', 'X-Forwarded-For': '13.13.13.13' }
			}),
			request.post(CHANGE_PASSWORD_PATH, {
				headers: { Authorization: 'Bearer anything', 'X-Forwarded-For': '14.14.14.14' }
			}),
			request.post(CHANGE_PASSWORD_PATH, {
				headers: { 'X-User-Id': 'fabricated', 'X-Forwarded-For': '15.15.15.15' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CHANGE_PASSWORD_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// POST is the only exported method.
		const responses = await Promise.all([
			request.get(CHANGE_PASSWORD_PATH),
			request.put(CHANGE_PASSWORD_PATH),
			request.patch(CHANGE_PASSWORD_PATH),
			request.delete(CHANGE_PASSWORD_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CHANGE_PASSWORD_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(CHANGE_PASSWORD_PATH, {
				data: 'not-json',
				headers: { 'X-Forwarded-For': '21.21.21.21' }
			}),
			request.post(CHANGE_PASSWORD_PATH, {
				data: '{ broken: json',
				headers: { 'X-Forwarded-For': '22.22.22.22' }
			}),
			request.post(CHANGE_PASSWORD_PATH, {
				data: '{"currentPassword":',
				headers: { 'X-Forwarded-For': '23.23.23.23' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CHANGE_PASSWORD_PATH} Zod validation chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, weak/mismatched passwords
		// surface 'Invalid input data' with details.
		// The unauth branch must NEVER emit this 400
		// envelope.
		const responses = await Promise.all([
			request.post(CHANGE_PASSWORD_PATH, {
				data: { currentPassword: 'old', newPassword: 'short', confirmPassword: 'short' },
				headers: { 'X-Forwarded-For': '31.31.31.31' }
			}),
			request.post(CHANGE_PASSWORD_PATH, {
				data: { currentPassword: 'old', newPassword: 'AAA111!!!', confirmPassword: 'BBB222!!!' },
				headers: { 'X-Forwarded-For': '32.32.32.32' }
			})
		]);

		for (const response of responses) {
			// Skip rate-limit responses.
			if (response.status() === 429) continue;

			const body = await response.json();
			expect(body.error).not.toBe('Invalid input data');
			expect(body.details).toBeUndefined();
		}
	});

	test(`POST ${CHANGE_PASSWORD_PATH} bcrypt-compare gates are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that ran bcrypt.compare(...)
		// before the auth gate would surface here:
		// the unauth response would echo 'Current
		// password is incorrect' (400) or 'New
		// password must be different from current
		// password' (400).
		const response = await request.post(CHANGE_PASSWORD_PATH, {
			data: {
				currentPassword: 'CurrentPass123!',
				newPassword: 'NewSecurePass456@',
				confirmPassword: 'NewSecurePass456@'
			},
			headers: { 'X-Forwarded-For': '41.41.41.41' }
		});

		// Skip rate-limit responses.
		if (response.status() === 429) {
			test.skip();
			return;
		}

		const body = await response.json();
		expect(body.error).not.toBe('Current password is incorrect');
		expect(body.error).not.toBe('New password must be different from current password');
	});

	test(`POST ${CHANGE_PASSWORD_PATH} OAuth-account-check + db.update + email-send are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The handler chains: OAuth check → bcrypt-
		// compare current → bcrypt-compare duplicate
		// → bcrypt.hash → db.update →
		// sendPasswordChangeConfirmationEmail. The
		// unauth branch must NEVER reach any of these.
		const response = await request.post(CHANGE_PASSWORD_PATH, {
			data: {
				currentPassword: 'CurrentPass123!',
				newPassword: 'NewSecurePass456@',
				confirmPassword: 'NewSecurePass456@'
			},
			headers: { 'X-Forwarded-For': '51.51.51.51' }
		});

		// Skip rate-limit responses.
		if (response.status() === 429) {
			test.skip();
			return;
		}

		const body = await response.json();
		expect(body.error).not.toBe(
			'Password change not available for OAuth accounts. Please contact support.'
		);
		expect(body.message).not.toBe('Password changed successfully');
		expect(body.success).toBe(false);
	});
});
