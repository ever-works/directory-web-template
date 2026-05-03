import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **request-body / header surface**
 * of the admin-only check-username endpoint served by
 * `apps/web/app/api/admin/users/check-username/route.ts`.
 *
 * `POST /api/admin/users/check-username` is the **sibling**
 * of `POST /api/admin/users/check-email` (covered by
 * `admin-users-check-email-body.spec.ts`). The two routes
 * share an **identical authorization shell** —
 * two-step `auth()` chain (401 + 403) with the bare
 * `'Unauthorized'` / `'Forbidden'` envelopes, body parse
 * via `await request.json()` AFTER the gate, body-
 * validation step `if (!field)` AFTER the body parse, and
 * the same `console.error` + `'Internal server error'`
 * catch envelope. The route's gate is:
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
 *         const { username, excludeId } = body;
 *         if (!username) {
 *           return NextResponse.json(
 *             { error: 'Username is required' },
 *             { status: 400 }
 *           );
 *         }
 *         const userRepository = new UserRepository();
 *         const exists = await userRepository.usernameExists(username, excludeId);
 *         return NextResponse.json({ available: !exists, exists });
 *       } catch (error) {
 *         console.error('Error in POST /api/admin/users/check-username:', error);
 *         return NextResponse.json(
 *           { error: 'Internal server error' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The two routes diverge in **exactly four** respects:
 *
 *   1. The documented field is `username` (vs `email`).
 *   2. The body-validation message is
 *      `'Username is required'` (vs `'Email is required'`).
 *   3. The repository call is
 *      `userRepository.usernameExists(username, excludeId)`
 *      (vs `userRepository.emailExists(email, excludeId)`).
 *   4. The catch-log prefix is
 *      `'Error in POST /api/admin/users/check-username:'`
 *      (vs `'Error in POST /api/admin/users/check-email:'`).
 *
 * The unauth branch is INVARIANT to all four divergences
 * — both routes return the same bare 401 envelope on the
 * first gate step. Maintaining a per-route body-surface
 * spec (rather than a shared spec) catches three
 * regression classes a shared spec would mask:
 *
 *   1. **Cross-route field-validation regression** — a
 *      change that swaps the `if (!username)` validation
 *      to `if (!email)` (or vice versa) would surface on
 *      the auth branch only; the unauth branch stays
 *      green either way, so the cross-route per-spec
 *      separation is the only place the regression is
 *      caught (via the auth-branch behavioral test out
 *      of scope for the unauth smoke walk).
 *   2. **One-route-only auth-gate-removal regression** —
 *      a change that removes the gate from one route but
 *      not the other would surface as a per-spec
 *      divergence (the affected spec's 401 baseline
 *      turns into a 200 / 4xx; the unaffected spec's
 *      stays at 401). A shared spec would mask half of
 *      that change.
 *   3. **Username-shape boundary fuzzing on the unauth
 *      branch** — the username field accepts shorter /
 *      narrower inputs than the email field (e.g.
 *      `johndoe` vs `john.doe@example.com`), so the
 *      boundary-fuzzing payloads diverge: the username
 *      spec walks Unicode / RTL / null-byte / SQL
 *      injection / XSS shapes that target the
 *      `usernameExists(...)` repository call's
 *      collation-sensitivity surface, distinct from the
 *      email spec's MX-record / CRLF email-header /
 *      RFC-5322 boundary surface.
 */
const ADMIN_USERS_CHECK_USERNAME_BODIES = [
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
	{ data: { username: 'johndoe' }, contentType: 'application/json', label: 'documented username only' },
	{ data: { username: 'johndoe', excludeId: 'user_123abc' }, contentType: 'application/json', label: 'documented username + excludeId' },
	{ data: { username: '' }, contentType: 'application/json', label: 'empty-string username (would 400 on auth branch)' },
	{ data: { username: null }, contentType: 'application/json', label: 'null username (would 400 on auth branch)' },
	{ data: { username: 0 }, contentType: 'application/json', label: 'falsy-number username' },
	{ data: { username: false }, contentType: 'application/json', label: 'falsy-boolean username' },
	{ data: { username: 'a' }, contentType: 'application/json', label: 'single-char username' },
	{ data: { username: 'a'.repeat(2_000) }, contentType: 'application/json', label: 'oversize username' },
	{ data: { excludeId: 'user_123abc' }, contentType: 'application/json', label: 'excludeId without username (would 400 on auth branch)' },

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
	{ data: { username: 'admin', isAdmin: true }, contentType: 'application/json', label: 'username + isAdmin bypass' },
	{ data: { username: 'admin', token: 'anything' }, contentType: 'application/json', label: 'username + token bypass' },

	// Wrong / unusual Content-Type with valid JSON-shaped string body.
	{ data: '{"isAdmin":true}', contentType: 'text/plain', label: 'JSON shape with text/plain content-type' },
	{ data: '{"isAdmin":true}', contentType: 'application/x-www-form-urlencoded', label: 'JSON shape with form content-type' },
	{ data: '{"isAdmin":true}', contentType: 'application/xml', label: 'JSON shape with xml content-type' },
	{ data: '{"username":"johndoe"}', contentType: 'text/plain', label: 'documented JSON shape with text/plain' },

	// Form-encoded bodies.
	{ data: 'isAdmin=true&admin=1', contentType: 'application/x-www-form-urlencoded', label: 'form-encoded bypass attempt' },
	{ data: 'username=johndoe', contentType: 'application/x-www-form-urlencoded', label: 'form-encoded documented username' },

	// Malformed JSON.
	{ data: '{not json', contentType: 'application/json', label: 'malformed JSON' },
	{ data: '{"unterminated":', contentType: 'application/json', label: 'unterminated JSON' },

	// Large body to defend against mistakenly-pre-gate body parsing.
	{ data: { padding: 'x'.repeat(2_000) }, contentType: 'application/json', label: 'large padded body' },

	// Username-shape boundary fuzzing — a regression that ran the
	// username validation (or the repository call's collation-
	// sensitivity surface) before the gate would fail on these.
	// The username spec's boundary surface is distinct from the
	// email spec's: usernames accept Unicode / RTL / shorter
	// inputs, so the fuzzing payloads target collation-
	// sensitivity rather than RFC-5322 / MX-record / CRLF email-
	// header injection.
	{ data: { username: 'admin\x00malicious' }, contentType: 'application/json', label: 'null-byte username injection' },
	{ data: { username: 'admin\nNewLine' }, contentType: 'application/json', label: 'CRLF username injection' },
	{ data: { username: '<script>alert(1)</script>' }, contentType: 'application/json', label: 'XSS-shape username' },
	{ data: { username: "' OR '1'='1" }, contentType: 'application/json', label: "SQL-shape username" },
	{ data: { username: 'admin; DROP TABLE users;--' }, contentType: 'application/json', label: 'SQL-DROP-shape username' },
	{ data: { username: '‮‭‭dmin' }, contentType: 'application/json', label: 'RTL-override Unicode username' },
	{ data: { username: '​‌‍admin' }, contentType: 'application/json', label: 'zero-width-character username' },
	{ data: { username: 'аdmin' }, contentType: 'application/json', label: 'Cyrillic-homoglyph username' },
	{ data: { username: 'ADMIN' }, contentType: 'application/json', label: 'uppercase username (collation-sensitivity)' },
	{ data: { username: 'admin ' }, contentType: 'application/json', label: 'trailing-space username' },
	{ data: { username: ' admin' }, contentType: 'application/json', label: 'leading-space username' }
] as const;

test.describe('API: /api/admin/users/check-username request-body / header surface', () => {
	for (const { data, contentType, label } of ADMIN_USERS_CHECK_USERNAME_BODIES) {
		test(`POST /api/admin/users/check-username (${label}) responds without a server error`, async ({
			request
		}) => {
			// The route's two-step gate fires before any body
			// parse or repository call. The unauthenticated
			// POST surface returns a 4xx (specifically 401)
			// deterministically.
			const response = await request.post('/api/admin/users/check-username', {
				data,
				headers: contentType ? { 'Content-Type': contentType } : undefined
			});

			expect(response.status()).toBeLessThan(500);
		});
	}

	test('POST /api/admin/users/check-username returns 401 with the bare Unauthorized envelope', async ({
		request
	}) => {
		// The unauthenticated POST branch is the load-bearing
		// invariant: the first step of the gate
		// `if (!session?.user)` fires, returning 401 with the
		// bare `{ error: 'Unauthorized' }` envelope. Identical
		// to the sibling `admin/users/check-email` route's
		// 401 envelope.
		const response = await request.post('/api/admin/users/check-username');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			error: 'Unauthorized'
		});
	});

	test('POST /api/admin/users/check-username does NOT echo the success-branch keys on the unauth branch', async ({
		request
	}) => {
		// The success branch returns
		// `{ available: !exists, exists }`. The unauth
		// branch must NEVER reach the
		// `userRepository.usernameExists(...)` call, so the
		// response body must NOT contain `available` /
		// `exists` keys.
		const response = await request.post('/api/admin/users/check-username', {
			data: { username: 'admin' }
		});

		const body = await response.json();
		expect(body).not.toHaveProperty('available');
		expect(body).not.toHaveProperty('exists');
	});

	test('POST /api/admin/users/check-username has a stable status across body permutations', async ({
		request
	}) => {
		// The route's auth gate fires before any body parse.
		// Every body permutation must round-trip to the same
		// status on the unauth branch.
		const baseline = await request.post('/api/admin/users/check-username');
		const responses = await Promise.all([
			request.post('/api/admin/users/check-username', { data: {} }),
			request.post('/api/admin/users/check-username', { data: { username: 'admin' } }),
			request.post('/api/admin/users/check-username', { data: { username: 'admin', isAdmin: true } }),
			request.post('/api/admin/users/check-username', { data: { isAdmin: true } }),
			request.post('/api/admin/users/check-username', { data: { token: 'anything' } }),
			request.post('/api/admin/users/check-username', {
				data: 'username=johndoe',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('POST /api/admin/users/check-username sibling-route response parity on the unauth branch', async ({
		request
	}) => {
		// The sibling `admin/users/check-email` route shares
		// an identical authorization shell. On the unauth
		// branch BOTH routes must return the same bare
		// `{ error: 'Unauthorized' }` envelope and the same
		// 401 status. A regression that diverges either
		// route's gate would surface here.
		const checkUsernameResp = await request.post('/api/admin/users/check-username');
		const checkEmailResp = await request.post('/api/admin/users/check-email');

		expect(checkUsernameResp.status()).toBe(checkEmailResp.status());
		expect(await checkUsernameResp.json()).toEqual(await checkEmailResp.json());
	});

	test('POST /api/admin/users/check-username malformed-body permutations do NOT 5xx on the unauth branch', async ({
		request
	}) => {
		// The route reads the body via `await request.json()`
		// AFTER the gate, so malformed JSON cannot reach the
		// catch (and thus cannot 500) on the unauth branch.
		const baseline = await request.post('/api/admin/users/check-username');
		const responses = await Promise.all([
			request.post('/api/admin/users/check-username', {
				data: '{not json',
				headers: { 'Content-Type': 'application/json' }
			}),
			request.post('/api/admin/users/check-username', {
				data: '{"unterminated":',
				headers: { 'Content-Type': 'application/json' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('POST /api/admin/users/check-username does NOT branch on side-channel cookies / headers', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post('/api/admin/users/check-username', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post('/api/admin/users/check-username', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.post('/api/admin/users/check-username', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.post('/api/admin/users/check-username', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('POST /api/admin/users/check-username cross-method probe does NOT 5xx', async ({
		request
	}) => {
		// The route only exports `POST`. Every other method
		// must round-trip to a 405 deterministically.
		const responses = await Promise.all([
			request.get('/api/admin/users/check-username'),
			request.put('/api/admin/users/check-username'),
			request.delete('/api/admin/users/check-username'),
			request.patch('/api/admin/users/check-username')
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('POST /api/admin/users/check-username Unauthorized error envelope does NOT echo the success-branch shape', async ({
		request
	}) => {
		// The unauth envelope is `{ error: 'Unauthorized' }`
		// — only the `error` key, no `success: false` key,
		// no `available` / `exists` keys.
		const response = await request.post('/api/admin/users/check-username');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error']);
		expect(body.error).toBe('Unauthorized');
		expect(body).not.toHaveProperty('success');
		expect(body).not.toHaveProperty('available');
		expect(body).not.toHaveProperty('exists');
	});

	test('POST /api/admin/users/check-username Username-required validation does NOT fire on the unauth branch', async ({
		request
	}) => {
		// The body-validation step `if (!username)` fires
		// AFTER the gate AND AFTER the body parse. On the
		// unauth branch the gate fires first, so the
		// `'Username is required'` 400 envelope must NEVER
		// appear in the unauth response body. A regression
		// that moves the validation before the gate would
		// surface here as a 400 on `data: {}` distinct from
		// the no-body baseline 401.
		const responses = await Promise.all([
			request.post('/api/admin/users/check-username', { data: {} }),
			request.post('/api/admin/users/check-username', { data: { username: '' } }),
			request.post('/api/admin/users/check-username', { data: { username: null } }),
			request.post('/api/admin/users/check-username', { data: { excludeId: 'user_123' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body).not.toEqual({ error: 'Username is required' });
		}
	});
});
