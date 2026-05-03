import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **request-body / header surface**
 * of the admin-only check-email endpoint served by
 * `apps/web/app/api/admin/users/check-email/route.ts`.
 *
 * `POST /api/admin/users/check-email` is **admin-gated**
 * via a **two-step `auth()` chain** that splits the
 * unauthenticated and authenticated-non-admin branches
 * into two distinct envelopes (401 for missing session,
 * 403 for missing `isAdmin`). The route's gate is:
 *
 *     export async function POST(request: NextRequest) {
 *       try {
 *         const session = await auth();
 *         if (!session?.user) {
 *           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *         }
 *         if (!session.user.isAdmin) {
 *           return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 *         }
 *         const body = await request.json();
 *         const { email, excludeId } = body;
 *         if (!email) {
 *           return NextResponse.json(
 *             { error: 'Email is required' },
 *             { status: 400 }
 *           );
 *         }
 *         const userRepository = new UserRepository();
 *         const exists = await userRepository.emailExists(email, excludeId);
 *         return NextResponse.json({ available: !exists, exists });
 *       } catch (error) {
 *         console.error('Error in POST /api/admin/users/check-email:', error);
 *         return NextResponse.json(
 *           { error: 'Internal server error' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The route is the **first** admin-tree route the smoke
 * layer covers that documents the unique combination of:
 *
 *   1. **Two-step `auth()` chain** that splits 401 vs 403
 *      — distinct from the sibling
 *      `admin/twenty-crm/test-connection` route's
 *      single-step gate that collapses both into 401, and
 *      distinct from the sibling
 *      `admin/items/export` route's single-step
 *      `isAdmin`-only gate that emits the canonical
 *      `'Unauthorized. Admin access required.'` longer
 *      message. The check-email route uses the **bare
 *      shorter messages** (`'Unauthorized'` / `'Forbidden'`)
 *      and lacks the `success: false` envelope key — a
 *      regression that swaps either message would change
 *      the client-side error-handling contract for every
 *      consumer of the admin user-form widget.
 *   2. **Body parse via `await request.json()`** AFTER
 *      the gate — distinct from the sibling
 *      `admin/twenty-crm/test-connection` route which has
 *      a bare `POST()` handler and never reads the body
 *      at all. A regression that runs `request.json()`
 *      before the gate would 400 on an empty body even
 *      when the caller has no session — the smoke walk
 *      pins the gate-before-body-parse order.
 *   3. **Body-validation step `if (!email)`** AFTER the
 *      gate AND AFTER the body parse — distinct from
 *      every other admin-tree spec. A regression that
 *      moves this validation before the gate would
 *      change the unauth-branch from "always 401" to
 *      "400 if no email provided / 401 if email
 *      provided" — and that change is exactly what this
 *      spec catches.
 *   4. **Internal-error catch with `console.error`** —
 *      the catch logs the error (a side-channel observable
 *      via the server log) before returning the bare
 *      `'Internal server error'` envelope. Out of scope
 *      for the unauth branch (the gate fires before the
 *      catch can fire) but documented here for
 *      completeness.
 *   5. **Per-user PII non-disclosure on the unauth branch**
 *      — the success branch reads `userRepository.emailExists(email, excludeId)`
 *      which returns whether a given email exists in the
 *      user table. The unauth branch must NEVER reach
 *      that read. This spec includes a deliberate negative-
 *      string assertion that the unauth response body does
 *      NOT contain the canonical `available` / `exists`
 *      response keys, which would indicate the gate was
 *      bypassed.
 *
 * Where the sibling
 * `admin-twenty-crm-test-connection-body.spec.ts` walks
 * the body surface of a `POST` route with a single-step
 * gate and the longer `'Unauthorized. Admin access
 * required.'` envelope, this spec walks the body surface
 * of a `POST` route with a two-step gate and the bare
 * `'Unauthorized'` / `'Forbidden'` envelopes — a
 * complementary surface that no prior admin-tree smoke
 * spec covers.
 */
const ADMIN_USERS_CHECK_EMAIL_BODIES = [
	// Baseline — the no-body unauthenticated case.
	{ data: undefined as unknown, contentType: undefined as string | undefined, label: 'no body, no Content-Type' },

	// Empty bodies of varying shapes.
	{ data: '', contentType: 'application/json', label: 'empty string body' },
	{ data: '{}', contentType: 'application/json', label: 'empty object body' },
	{ data: '[]', contentType: 'application/json', label: 'empty array body' },
	{ data: 'null', contentType: 'application/json', label: 'null literal body' },
	{ data: 'true', contentType: 'application/json', label: 'true literal body' },
	{ data: '0', contentType: 'application/json', label: 'numeric body' },
	{ data: '"string"', contentType: 'application/json', label: 'string-literal body' },

	// Bodies containing only the documented keys.
	{ data: { email: 'test@example.com' }, contentType: 'application/json', label: 'documented email only' },
	{ data: { email: 'test@example.com', excludeId: 'user_123abc' }, contentType: 'application/json', label: 'documented email + excludeId' },
	{ data: { email: '' }, contentType: 'application/json', label: 'empty-string email (would 400 on auth branch)' },
	{ data: { email: null }, contentType: 'application/json', label: 'null email (would 400 on auth branch)' },
	{ data: { email: 0 }, contentType: 'application/json', label: 'falsy-number email' },
	{ data: { email: false }, contentType: 'application/json', label: 'falsy-boolean email' },
	{ data: { email: 'not-an-email' }, contentType: 'application/json', label: 'non-email-shape email (route does not validate format on auth branch)' },
	{ data: { email: 'a'.repeat(2_000) + '@example.com' }, contentType: 'application/json', label: 'oversize email' },
	{ data: { excludeId: 'user_123abc' }, contentType: 'application/json', label: 'excludeId without email (would 400 on auth branch)' },

	// Bodies that look like impersonation / bypass attempts.
	{ data: { isAdmin: true }, contentType: 'application/json', label: 'isAdmin=true bypass attempt' },
	{ data: { admin: true }, contentType: 'application/json', label: 'admin=true bypass attempt' },
	{ data: { bypass: true }, contentType: 'application/json', label: 'bypass=true attempt' },
	{ data: { override: true }, contentType: 'application/json', label: 'override=true attempt' },
	{ data: { force: true }, contentType: 'application/json', label: 'force=true attempt' },
	{ data: { userId: 'admin' }, contentType: 'application/json', label: 'userId=admin attempt' },
	{ data: { user: { isAdmin: true } }, contentType: 'application/json', label: 'nested user.isAdmin attempt' },
	{ data: { session: { user: { isAdmin: true } } }, contentType: 'application/json', label: 'nested session.user.isAdmin attempt' },

	// Bodies that look like injected session payloads.
	{ data: { session: 'fabricated' }, contentType: 'application/json', label: 'session injection attempt' },
	{ data: { authjs: { sessionToken: 'fabricated' } }, contentType: 'application/json', label: 'authjs nested session injection' },

	// Bodies that look like magic-token attempts.
	{ data: { token: 'anything' }, contentType: 'application/json', label: 'token attempt' },
	{ data: { secret: 'anything' }, contentType: 'application/json', label: 'secret attempt' },
	{ data: { authorization: 'Bearer anything' }, contentType: 'application/json', label: 'authorization in body' },
	{ data: { adminToken: 'anything' }, contentType: 'application/json', label: 'adminToken attempt' },
	{ data: { apiKey: 'anything' }, contentType: 'application/json', label: 'apiKey attempt' },

	// Bodies with combined documented keys + bypass attempts — the
	// bypass keys must NEVER short-circuit the gate.
	{ data: { email: 'admin@example.com', isAdmin: true }, contentType: 'application/json', label: 'email + isAdmin bypass' },
	{ data: { email: 'admin@example.com', token: 'anything' }, contentType: 'application/json', label: 'email + token bypass' },

	// Wrong / unusual Content-Type with valid JSON-shaped string body.
	{ data: '{"isAdmin":true}', contentType: 'text/plain', label: 'JSON shape with text/plain content-type' },
	{ data: '{"isAdmin":true}', contentType: 'application/x-www-form-urlencoded', label: 'JSON shape with form content-type' },
	{ data: '{"isAdmin":true}', contentType: 'application/xml', label: 'JSON shape with xml content-type' },
	{ data: '{"email":"test@example.com"}', contentType: 'text/plain', label: 'documented JSON shape with text/plain' },

	// Form-encoded bodies.
	{ data: 'isAdmin=true&admin=1', contentType: 'application/x-www-form-urlencoded', label: 'form-encoded bypass attempt' },
	{ data: 'email=test@example.com', contentType: 'application/x-www-form-urlencoded', label: 'form-encoded documented email' },

	// Malformed JSON.
	{ data: '{not json', contentType: 'application/json', label: 'malformed JSON' },
	{ data: '{"unterminated":', contentType: 'application/json', label: 'unterminated JSON' },

	// Large body to defend against mistakenly-pre-gate body parsing.
	{ data: { padding: 'x'.repeat(2_000) }, contentType: 'application/json', label: 'large padded body' },

	// Email-shape boundary fuzzing — these are the values a regression
	// that ran the email validation before the gate would fail on.
	{ data: { email: 'admin@example.com\x00malicious@evil.com' }, contentType: 'application/json', label: 'null-byte email injection' },
	{ data: { email: 'admin@example.com\nBcc: evil@evil.com' }, contentType: 'application/json', label: 'CRLF email-header injection' },
	{ data: { email: '<script>alert(1)</script>' }, contentType: 'application/json', label: 'XSS-shape email' },
	{ data: { email: "' OR '1'='1" }, contentType: 'application/json', label: "SQL-shape email" }
] as const;

test.describe('API: /api/admin/users/check-email request-body / header surface', () => {
	for (const { data, contentType, label } of ADMIN_USERS_CHECK_EMAIL_BODIES) {
		test(`POST /api/admin/users/check-email (${label}) responds without a server error`, async ({
			request
		}) => {
			// The route's two-step gate fires before any body
			// parse or repository call. The unauthenticated
			// POST surface returns a 4xx (specifically 401)
			// deterministically. A 500 is reachable only if
			// the catch fires after the gate has let the call
			// through (e.g. `userRepository.emailExists(...)`
			// throws, or `request.json()` throws on
			// authenticated-admin malformed body), which
			// never happens on the unauth branch.
			const response = await request.post('/api/admin/users/check-email', {
				data,
				headers: contentType ? { 'Content-Type': contentType } : undefined
			});

			expect(response.status()).toBeLessThan(500);
		});
	}

	test('POST /api/admin/users/check-email returns 401 with the bare Unauthorized envelope', async ({
		request
	}) => {
		// The unauthenticated POST branch is the load-bearing
		// invariant: the first step of the gate
		// `if (!session?.user)` fires, returning 401 with the
		// bare `{ error: 'Unauthorized' }` envelope (NO
		// `success: false` key, distinct from the sibling
		// `admin/twenty-crm/test-connection` and
		// `admin/items/export` longer-message routes). A
		// regression that swaps the error string would
		// surface here as a body-divergence assertion failure.
		const response = await request.post('/api/admin/users/check-email');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			error: 'Unauthorized'
		});
	});

	test('POST /api/admin/users/check-email does NOT echo the success-branch keys on the unauth branch', async ({
		request
	}) => {
		// The success branch returns
		// `{ available: !exists, exists }`. The unauth
		// branch must NEVER reach the
		// `userRepository.emailExists(...)` call, so the
		// response body must NOT contain `available` /
		// `exists` keys. A regression that bypasses the
		// gate would surface here.
		const response = await request.post('/api/admin/users/check-email', {
			data: { email: 'admin@example.com' }
		});

		const body = await response.json();
		expect(body).not.toHaveProperty('available');
		expect(body).not.toHaveProperty('exists');
	});

	test('POST /api/admin/users/check-email has a stable status across body permutations', async ({
		request
	}) => {
		// The route's auth gate fires before any body parse.
		// Every body permutation must round-trip to the same
		// status on the unauth branch.
		const baseline = await request.post('/api/admin/users/check-email');
		const responses = await Promise.all([
			request.post('/api/admin/users/check-email', { data: {} }),
			request.post('/api/admin/users/check-email', { data: { email: 'admin@example.com' } }),
			request.post('/api/admin/users/check-email', { data: { email: 'admin@example.com', isAdmin: true } }),
			request.post('/api/admin/users/check-email', { data: { isAdmin: true } }),
			request.post('/api/admin/users/check-email', { data: { token: 'anything' } }),
			request.post('/api/admin/users/check-email', {
				data: 'email=test@example.com',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('POST /api/admin/users/check-email malformed-body permutations do NOT 5xx on the unauth branch', async ({
		request
	}) => {
		// The route reads the body via `await request.json()`
		// AFTER the gate, so malformed JSON cannot reach the
		// catch (and thus cannot 500) on the unauth branch.
		// A regression that runs `request.json()` before the
		// gate would surface here as a 400 / 500 on the
		// malformed-JSON cases distinct from the no-body
		// baseline.
		const baseline = await request.post('/api/admin/users/check-email');
		const responses = await Promise.all([
			request.post('/api/admin/users/check-email', {
				data: '{not json',
				headers: { 'Content-Type': 'application/json' }
			}),
			request.post('/api/admin/users/check-email', {
				data: '{"unterminated":',
				headers: { 'Content-Type': 'application/json' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('POST /api/admin/users/check-email does NOT branch on side-channel cookies / headers', async ({
		request
	}) => {
		// A regression that switches the gate to a custom
		// auth resolver that consults `request.cookies` /
		// `request.geo` / `request.ip` would change the
		// unauth-branch behaviour.
		const responses = await Promise.all([
			request.post('/api/admin/users/check-email', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post('/api/admin/users/check-email', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.post('/api/admin/users/check-email', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.post('/api/admin/users/check-email', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('POST /api/admin/users/check-email cross-method probe does NOT 5xx', async ({
		request
	}) => {
		// The route only exports `POST`, so `GET` /
		// `PUT` / `DELETE` / `PATCH` should round-trip
		// to a 405 (Method Not Allowed) deterministically.
		// A 5xx here would indicate the Next.js routing
		// layer crashed before the method-resolution
		// returned its canonical 405.
		const responses = await Promise.all([
			request.get('/api/admin/users/check-email'),
			request.put('/api/admin/users/check-email'),
			request.delete('/api/admin/users/check-email'),
			request.patch('/api/admin/users/check-email')
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('POST /api/admin/users/check-email Unauthorized error envelope does NOT echo the success-branch shape', async ({
		request
	}) => {
		// The unauth envelope is `{ error: 'Unauthorized' }`
		// — only the `error` key, no `success: false` key,
		// no `available` / `exists` keys. A regression that
		// emits any other shape would change the client-side
		// error-handling contract.
		const response = await request.post('/api/admin/users/check-email');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error']);
		expect(body.error).toBe('Unauthorized');
		expect(body).not.toHaveProperty('success');
		expect(body).not.toHaveProperty('available');
		expect(body).not.toHaveProperty('exists');
	});
});
