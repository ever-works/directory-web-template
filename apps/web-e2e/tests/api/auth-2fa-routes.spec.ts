import { test, expect } from '@playwright/test';

/**
 * Contract coverage for the email two-factor endpoints added by spec 046
 * (EW-137 enable/disable, EW-138/EW-140 resend, EW-142 OAuth gate):
 *
 *   POST /api/auth/security/2fa/enable
 *   POST /api/auth/security/2fa/disable
 *   POST /api/auth/2fa/resend
 *
 * The e2e request context carries no session by default, so the invariant
 * these specs pin is the **authentication gate** on the two security
 * routes and the **enumeration-resistant** shape of the resend route:
 *
 *   - `enable` / `disable` answer 401 `{ success: false, error: … }` for an
 *     unauthenticated caller, before any tenant lookup or profile write.
 *     Their OAuth refusal (403 + `code: 'OAUTH_ACCOUNT'`) sits *behind*
 *     that gate and is exercised through the UI in
 *     `tests/auth/two-factor-login.spec.ts`.
 *   - `resend` is deliberately session-free (there is no session mid-login)
 *     and re-checks the account password instead. It answers 400 for a
 *     malformed body and 200 for a well-formed one whatever the account
 *     state, so the body cannot be used to probe which addresses exist.
 *     429 is the only other distinguishable answer, once the 3-per-10-minutes
 *     budget is spent.
 *
 * The 404-tolerance in the "route exists" assertions keeps this spec honest
 * on a deployment that has not shipped spec 046 yet, in the same spirit as
 * the other skip-on-absence probes in this suite.
 */

const ENABLE = '/api/auth/security/2fa/enable';
const DISABLE = '/api/auth/security/2fa/disable';
const RESEND = '/api/auth/2fa/resend';

test.describe('API: 2FA enable/disable are session-gated (EW-137)', () => {
	for (const path of [ENABLE, DISABLE]) {
		test(`POST ${path} rejects an unauthenticated caller with 401`, async ({ request }) => {
			const response = await request.post(path, { data: {} });

			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body).toMatchObject({ success: false });
			expect(typeof body.error).toBe('string');
		});

		test(`GET ${path} is not a valid method`, async ({ request }) => {
			// Only POST is exported, so Next answers 405 for anything else.
			const response = await request.get(path);
			expect([404, 405]).toContain(response.status());
		});
	}

	test('an unauthenticated caller never learns whether 2FA is on', async ({ request }) => {
		const response = await request.get('/api/auth/security/settings');
		expect(response.status()).toBe(401);
		const body = await response.json();
		expect(body.data).toBeUndefined();
	});
});

test.describe('API: 2FA resend is enumeration-resistant (EW-138/EW-140)', () => {
	test('rejects a malformed body with 400', async ({ request }) => {
		const response = await request.post(RESEND, { data: { email: 'not-an-email' } });
		expect([400, 429]).toContain(response.status());
		if (response.status() === 400) {
			const body = await response.json();
			expect(body).toMatchObject({ success: false });
		}
	});

	test('requires a password — email alone is not a valid request', async ({ request }) => {
		const response = await request.post(RESEND, { data: { email: 'someone@example.com' } });
		expect([400, 429]).toContain(response.status());
	});

	test('answers 200 for an unknown account, leaking nothing about it', async ({ request }) => {
		const response = await request.post(RESEND, {
			data: { email: `no-such-user-${Date.now()}@test.local`, password: 'not-the-password' }
		});

		// 429 is legitimate when a previous test in the same worker already
		// spent the per-IP budget; both answers are enumeration-safe.
		expect([200, 429]).toContain(response.status());
		if (response.status() === 200) {
			const body = await response.json();
			expect(body.success).toBe(true);
			// Nothing in the payload distinguishes a real account from a miss.
			expect(Object.keys(body.data ?? {})).toEqual(['expiresInMinutes']);
			expect(body.data.expiresInMinutes).toBeGreaterThan(0);
		}
	});

	test('spends its per-IP budget and then answers 429', async ({ request }) => {
		const email = `rate-limit-probe-${Date.now()}@test.local`;
		const statuses: number[] = [];

		// The budget is 3 per 10 minutes per IP and per email; six attempts
		// must therefore hit it regardless of what earlier tests consumed.
		for (let i = 0; i < 6; i++) {
			const response = await request.post(RESEND, { data: { email, password: 'not-the-password' } });
			statuses.push(response.status());
		}

		expect(statuses).toContain(429);
		expect(statuses.every((status) => status === 200 || status === 429)).toBe(true);
	});
});
