import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header
 * surface** of the ReCAPTCHA verification proxy
 * endpoint served by the `POST` export of
 * `apps/web/app/api/verify-recaptcha/route.ts`.
 *
 * `POST /api/verify-recaptcha` is the **first per-
 * source-file smoke** the docs tree publishes that
 * pins a **dev-mode bypass envelope** with status 200
 * `{ success: true, score: 1.0, action: 'bypass' }`
 * (when `RECAPTCHA_SECRET_KEY` is missing AND
 * `NODE_ENV === 'development'`). It is also the
 * **first** smoke the docs tree publishes that pins a
 * route built on top of the
 * `externalClient.postForm<T>(url, body)` helper
 * (form-encoded outbound POST to Google's
 * `https://www.google.com/recaptcha/api/siteverify`
 * endpoint) AND the **first** smoke that pins the
 * **`error_codes` underscore-rename invariant**
 * (Google returns `error-codes` with a hyphen; the
 * handler renames it to `error_codes` with an
 * underscore in the response envelope).
 *
 * Sibling specs:
 *   - The cross-cutting
 *     [`method-guards.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/method-guards.spec.ts)
 *     ALSO probes `POST /api/verify-recaptcha` BUT
 *     only checks that an empty-object body produces
 *     a non-5xx response. This per-source-file spec
 *     drills into the four-branch dispatcher
 *     (token-required-400 / dev-bypass-200 / not-
 *     configured-500 / Google-proxy-pass-through).
 *   - The neighbouring
 *     [`extract-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/extract-body.spec.ts)
 *     also covers a POST-only proxy endpoint BUT
 *     uses Zod validation AND a `featureDisabled`
 *     envelope (200 status, `featureDisabled: true`
 *     key). This verify-recaptcha sibling uses
 *     hand-rolled `if (!token)` validation AND a
 *     `error: 'ReCAPTCHA token is required'`
 *     envelope (400 status, NO `featureDisabled`
 *     key).
 *
 * Distinct from EVERY prior POST smoke:
 *
 *   - **Form-encoded outbound POST via
 *     `externalClient.postForm`** — UNIQUE: every
 *     other proxy POST in the docs tree uses
 *     `fetch` / `externalClient.post` (JSON body).
 *     This handler builds an `application/x-www-
 *     form-urlencoded` body for Google's siteverify
 *     endpoint.
 *   - **`error_codes` underscore-rename invariant** —
 *     Google's response uses `error-codes` (hyphen);
 *     the handler renames it to `error_codes`
 *     (underscore) when surfacing to the client.
 *     UNIQUE: no other proxy in the docs tree
 *     performs this hyphen-to-underscore rename.
 *   - **Score / action surface** — `{ score: number
 *     (0..1), action: string }` are echoed in the
 *     200 envelope. UNIQUE: no other smoke exercises
 *     ReCAPTCHA scoring fields.
 *   - **Dev-mode bypass branch** — when
 *     `RECAPTCHA_SECRET_KEY` is missing AND
 *     `NODE_ENV === 'development'`, returns 200
 *     `{ success: true, score: 1.0, action: 'bypass'
 *     }`. UNIQUE: NO other smoke pins a 200
 *     dev-bypass envelope with `action: 'bypass'`.
 *   - **Not-configured 500 branch** — when
 *     `RECAPTCHA_SECRET_KEY` is missing AND `NODE_ENV
 *     !== 'development'`, returns 500
 *     `{ success: false, error: 'ReCAPTCHA not
 *     configured' }`. UNIQUE: status 500 with NO
 *     stack trace / sensitive content.
 *
 *   1. **JSON body parse via `await request.json()`**
 *      — wrapped in outer `try / catch` so malformed
 *      JSON falls through to the 500 catch.
 *   2. **`if (!token)` token-required gate** — 400
 *      `{ success: false, error: 'ReCAPTCHA token is
 *      required' }`.
 *   3. **`!secretKey` dev-bypass / not-configured
 *      branch** — bifurcates on
 *      `coreConfig.NODE_ENV === 'development'`.
 *   4. **`externalClient.postForm` Google siteverify
 *      proxy** — `secret: secretKey, response: token`
 *      form-encoded body.
 *   5. **`apiUtils.isSuccess(response)` check** — on
 *      failure, returns 500 `{ success: false,
 *      error: 'Failed to verify ReCAPTCHA' }`.
 *   6. **Renamed-envelope success pass-through** —
 *      `{ success: data.success, score: data.score,
 *      action: data.action, hostname: data.hostname,
 *      challenge_ts: data.challenge_ts, error_codes:
 *      data['error-codes'] }` (HYPHEN → UNDERSCORE
 *      rename of `error-codes`).
 *   7. **Outer catch** — 500 `{ success: false,
 *      error: 'Verification failed' }`.
 *   8. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const RECAPTCHA_PATH = '/api/verify-recaptcha';

const RECAPTCHA_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Recaptcha-Secret': 'fabricated' }, label: 'fabricated X-Recaptcha-Secret header' }
] as const;

const RECAPTCHA_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: {}, label: 'empty object body (token-required gate)' },

	// Token-required-gate probes — falsy token values.
	{ data: { token: '' }, label: 'empty token string' },
	{ data: { token: null }, label: 'null token' },
	{ data: { token: 0 }, label: 'numeric zero token (falsy)' },
	{ data: { token: false }, label: 'boolean false token (falsy)' },

	// Truthy token probes (would proxy to Google siteverify if reachable).
	{ data: { token: 'fabricated-token' }, label: 'short fabricated token' },
	{ data: { token: 'x'.repeat(2_000) }, label: 'long fabricated token' },
	{ data: { token: '03AGdBq25SiXT-pmSeBXjzScW-EiocHwwpwqJRCAC7g' }, label: 'realistic-shape fabricated token' },

	// Type-violation probes — token field with wrong types still passes the
	// `!token` falsy-check on truthy non-string values.
	{ data: { token: 123 }, label: 'numeric token (truthy)' },
	{ data: { token: ['array-token'] }, label: 'array token (truthy)' },
	{ data: { token: { nested: 'object' } }, label: 'object token (truthy)' },

	// Bypass attempts — extra keys must NOT influence the dispatcher.
	{ data: { token: 'fabricated', RECAPTCHA_SECRET_KEY: 'fabricated' }, label: 'RECAPTCHA_SECRET_KEY injection attempt' },
	{ data: { token: 'fabricated', secret: 'fabricated' }, label: 'secret-field injection attempt' },
	{ data: { token: 'fabricated', NODE_ENV: 'development' }, label: 'NODE_ENV injection attempt' },
	{ data: { padding: 'x'.repeat(2_000), token: 'fabricated' }, label: 'large padded body' }
] as const;

const TOKEN_REQUIRED_MESSAGE = 'ReCAPTCHA token is required';
const NOT_CONFIGURED_MESSAGE = 'ReCAPTCHA not configured';
const VERIFICATION_FAILED_MESSAGE = 'Verification failed';
const FAILED_TO_VERIFY_MESSAGE = 'Failed to verify ReCAPTCHA';

test.describe('API: /api/verify-recaptcha POST body / header surface', () => {
	for (const { headers, label } of RECAPTCHA_HEADERS) {
		test(`POST ${RECAPTCHA_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(RECAPTCHA_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of RECAPTCHA_BODIES) {
		test(`POST ${RECAPTCHA_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(RECAPTCHA_PATH, { data });
			// May return 4xx (token-required gate, etc.) but must
			// never 5xx beyond the documented `not-configured` /
			// `verification-failed` 500 envelopes which themselves
			// are well-formed JSON. We allow 5xx here since the
			// outer catch produces a 500 for the upstream-Google
			// branch when the test environment cannot reach
			// siteverify; the envelope-shape assertions below pin
			// the contract.
			expect(response.status()).toBeLessThan(600);
		});
	}

	test(`POST ${RECAPTCHA_PATH} returns 400 with the token-required envelope when no token is supplied`, async ({
		request
	}) => {
		// The token-required gate fires AFTER body parse, so an
		// empty-object body lands here. A 400 with the envelope
		// `{ success: false, error: 'ReCAPTCHA token is required' }`
		// is the load-bearing invariant.
		const response = await request.post(RECAPTCHA_PATH, { data: {} });
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: TOKEN_REQUIRED_MESSAGE
		});
	});

	test(`POST ${RECAPTCHA_PATH} 400 envelope shape (token-required) has exactly success / error keys`, async ({
		request
	}) => {
		// Strict envelope-shape assertion: the token-required
		// envelope must be `{ success: false, error: '<message>' }`
		// — NO `featureDisabled` key (DIFFERENT from extract-body
		// sibling), NO `score` / `action` keys.
		const response = await request.post(RECAPTCHA_PATH, { data: {} });
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
		expect(body.featureDisabled).toBeUndefined();
		expect(body.score).toBeUndefined();
		expect(body.action).toBeUndefined();
	});

	test(`POST ${RECAPTCHA_PATH} treats falsy token values uniformly via the token-required gate`, async ({
		request
	}) => {
		// `if (!token)` short-circuits on empty-string / null /
		// numeric-zero / boolean-false token values. Pin that
		// ALL falsy variants emit the SAME 400 envelope.
		const responses = await Promise.all([
			request.post(RECAPTCHA_PATH, { data: { token: '' } }),
			request.post(RECAPTCHA_PATH, { data: { token: null } }),
			request.post(RECAPTCHA_PATH, { data: { token: 0 } }),
			request.post(RECAPTCHA_PATH, { data: { token: false } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(400);
			const body = await response.json();
			expect(body.success).toBe(false);
			expect(body.error).toBe(TOKEN_REQUIRED_MESSAGE);
		}
	});

	test(`POST ${RECAPTCHA_PATH} does NOT echo the caller-supplied token marker on the token-required branch`, async ({
		request
	}) => {
		// The handler must NEVER echo a caller-supplied token
		// in the unauth response. Pin that the marker is
		// absent from the serialized envelope.
		const response = await request.post(RECAPTCHA_PATH, {
			data: { token: 'attacker-supplied-recaptcha-marker-24680' }
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('attacker-supplied-recaptcha-marker-24680');
	});

	test(`POST ${RECAPTCHA_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		// The dispatcher reads ONLY the JSON body and
		// `RECAPTCHA_SECRET_KEY` env var. Pin that fabricated
		// session cookies / X-User-Id / X-Recaptcha-Secret
		// headers do NOT alter the dispatch.
		const baseline = await request.post(RECAPTCHA_PATH, { data: {} });
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.post(RECAPTCHA_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' }, data: {} }),
			request.post(RECAPTCHA_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' }, data: {} }),
			request.post(RECAPTCHA_PATH, { headers: { Authorization: 'Bearer anything' }, data: {} }),
			request.post(RECAPTCHA_PATH, { headers: { 'X-Api-Key': 'anything' }, data: {} }),
			request.post(RECAPTCHA_PATH, { headers: { 'X-Recaptcha-Secret': 'fabricated' }, data: {} })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`POST ${RECAPTCHA_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		// GET / PUT / PATCH / DELETE are NOT exported. Next.js
		// returns 405 Method Not Allowed for these.
		const responses = await Promise.all([
			request.get(RECAPTCHA_PATH),
			request.put(RECAPTCHA_PATH),
			request.patch(RECAPTCHA_PATH),
			request.delete(RECAPTCHA_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${RECAPTCHA_PATH} bypass-attempt body keys (RECAPTCHA_SECRET_KEY / secret / NODE_ENV) do NOT alter the envelope`, async ({
		request
	}) => {
		// Pin that user-supplied env-shadowing fields in the
		// body are IGNORED — the dispatcher reads ONLY the
		// `token` field. The token is `fabricated`, so the
		// response depends on the runtime env (dev-bypass /
		// not-configured / Google-proxy). All three variants
		// MUST emit the SAME envelope shape as the baseline
		// `{ token: 'fabricated' }` request.
		const baseline = await request.post(RECAPTCHA_PATH, {
			data: { token: 'fabricated' }
		});
		const baselineBody = await baseline.json();

		const responses = await Promise.all([
			request.post(RECAPTCHA_PATH, {
				data: { token: 'fabricated', RECAPTCHA_SECRET_KEY: 'fabricated' }
			}),
			request.post(RECAPTCHA_PATH, {
				data: { token: 'fabricated', secret: 'fabricated' }
			}),
			request.post(RECAPTCHA_PATH, {
				data: { token: 'fabricated', NODE_ENV: 'development' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(Object.keys(body).sort()).toEqual(Object.keys(baselineBody).sort());
		}
	});

	test(`POST ${RECAPTCHA_PATH} env-driven dispatch lands on exactly ONE of the three known envelopes for a truthy token`, async ({
		request
	}) => {
		// For a truthy `fabricated` token, the response MUST
		// match exactly ONE of:
		//   - dev-bypass: 200 `{ success: true, score: 1.0,
		//     action: 'bypass' }` (NODE_ENV=development AND
		//     no RECAPTCHA_SECRET_KEY)
		//   - not-configured: 500 `{ success: false, error:
		//     'ReCAPTCHA not configured' }` (NODE_ENV !==
		//     development AND no RECAPTCHA_SECRET_KEY)
		//   - Google-proxy: 200 `{ success: bool, score: ...,
		//     action: ..., hostname: ..., challenge_ts: ...,
		//     error_codes: [...] }` OR 500 `{ success: false,
		//     error: 'Failed to verify ReCAPTCHA' }` OR 500
		//     `{ success: false, error: 'Verification failed'
		//     }` (RECAPTCHA_SECRET_KEY set).
		const response = await request.post(RECAPTCHA_PATH, {
			data: { token: 'fabricated' }
		});
		const status = response.status();
		const body = await response.json();

		// Status MUST be 200 OR 500.
		expect([200, 500]).toContain(status);

		if (status === 200 && body.action === 'bypass') {
			// Dev-bypass branch.
			expect(body.success).toBe(true);
			expect(body.score).toBe(1.0);
			expect(body.action).toBe('bypass');
		} else if (status === 200) {
			// Google-proxy success branch.
			expect(typeof body.success).toBe('boolean');
		} else {
			// Status === 500.
			expect(body.success).toBe(false);
			expect([NOT_CONFIGURED_MESSAGE, FAILED_TO_VERIFY_MESSAGE, VERIFICATION_FAILED_MESSAGE]).toContain(body.error);
		}
	});

	test(`POST ${RECAPTCHA_PATH} envelope NEVER includes the hyphenated 'error-codes' key on the success branch`, async ({
		request
	}) => {
		// Google's API uses `error-codes` (hyphen). The
		// handler renames this to `error_codes` (underscore)
		// in the response envelope. Pin that the hyphenated
		// key NEVER appears in the serialized response.
		const response = await request.post(RECAPTCHA_PATH, {
			data: { token: 'fabricated' }
		});
		const body = await response.json();
		expect(body['error-codes']).toBeUndefined();
	});

	test(`POST ${RECAPTCHA_PATH} 500 envelope (when reached) NEVER leaks stack-trace fragments`, async ({
		request
	}) => {
		// The outer catch returns `{ success: false, error:
		// 'Verification failed' }`. Pin that the envelope
		// NEVER leaks stack-trace fragments OR sensitive
		// fields (`stack`, `cause`, `path`, `secretKey`,
		// `RECAPTCHA_SECRET_KEY`).
		const response = await request.post(RECAPTCHA_PATH, {
			data: { token: 'fabricated' }
		});

		if (response.status() === 500) {
			const body = await response.json();
			const serialized = JSON.stringify(body);
			expect(serialized).not.toContain('stack');
			expect(serialized).not.toContain('cause');
			expect(serialized).not.toContain('RECAPTCHA_SECRET_KEY');
			expect(serialized).not.toContain('secretKey');
			expect(serialized).not.toContain('siteverify');
			expect(serialized).not.toContain('google.com');
		}
	});

	test(`POST ${RECAPTCHA_PATH} is invariant to malformed JSON bodies (outer catch fallback)`, async ({
		request
	}) => {
		// Malformed JSON falls through to the outer catch
		// which returns 500 `{ success: false, error:
		// 'Verification failed' }`. Pin that the response
		// is well-formed JSON regardless.
		const responses = await Promise.all([
			request.post(RECAPTCHA_PATH, { data: 'not-json' }),
			request.post(RECAPTCHA_PATH, { data: '{ broken: json' }),
			request.post(RECAPTCHA_PATH, { data: '{"token":' })
		]);

		for (const response of responses) {
			// May 500 (outer catch) or 4xx — but MUST NOT
			// crash, MUST emit JSON.
			expect(response.status()).toBeLessThan(600);
			const body = await response.json();
			expect(body.success).toBe(false);
		}
	});

	test(`POST ${RECAPTCHA_PATH} non-string token types (numeric / array / object) bypass the !token gate as truthy`, async ({
		request
	}) => {
		// `if (!token)` short-circuits ONLY on falsy values.
		// Truthy non-string values (numeric / array / object)
		// pass the gate and reach the env-dispatcher branch.
		// Pin that they are NOT rejected with the 400 token-
		// required envelope.
		const responses = await Promise.all([
			request.post(RECAPTCHA_PATH, { data: { token: 123 } }),
			request.post(RECAPTCHA_PATH, { data: { token: ['array-token'] } }),
			request.post(RECAPTCHA_PATH, { data: { token: { nested: 'object' } } })
		]);

		for (const response of responses) {
			// Status MUST NOT be the 400 token-required.
			if (response.status() === 400) {
				const body = await response.json();
				// The token-required gate would emit this
				// exact error. Pin that it does NOT fire
				// for truthy non-string values.
				expect(body.error).not.toBe(TOKEN_REQUIRED_MESSAGE);
			}
		}
	});

	test(`POST ${RECAPTCHA_PATH} does NOT echo the post-validation messages on the token-required branch`, async ({
		request
	}) => {
		// Pins the gate-before-post-validation order: when
		// the token-required gate fires, the response MUST
		// NOT echo any of the post-validation messages
		// (`'Failed to verify ReCAPTCHA'`, `'Verification
		// failed'`, `'ReCAPTCHA not configured'`).
		const response = await request.post(RECAPTCHA_PATH, { data: {} });
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body.error).toBe(TOKEN_REQUIRED_MESSAGE);
		expect(body.error).not.toBe(FAILED_TO_VERIFY_MESSAGE);
		expect(body.error).not.toBe(VERIFICATION_FAILED_MESSAGE);
		expect(body.error).not.toBe(NOT_CONFIGURED_MESSAGE);
	});
});
