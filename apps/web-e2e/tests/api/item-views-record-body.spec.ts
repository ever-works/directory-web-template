import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the public per-item view-tracking endpoint served by
 * the `POST` export of
 * `apps/web/app/api/items/[slug]/views/route.ts`.
 *
 * `POST /api/items/[slug]/views` is the **first non-admin
 * POST smoke** the docs tree publishes that pins a
 * **bot-detection graceful-degradation branch** AS the
 * load-bearing test invariant: the route under test
 * imports `isBot()` from
 * `apps/web/lib/utils/bot-detection.ts`, whose
 * `BOT_PATTERNS` regex array contains `/bot/i`,
 * `/crawl/i`, `/spider/i`, `/playwright/i`,
 * `/puppeteer/i`, `/headless/i`, `/curl/i`,
 * `/python-requests/i`, `/axios/i`, `/node-fetch/i` —
 * AND treats an empty UA as a bot. The smoke spec
 * **explicitly sets** a known-bot User-Agent
 * (`Googlebot/2.1`) on the deterministic-assertion tests
 * so the bot gate fires regardless of the Playwright
 * runtime's default UA, BEFORE the route ever calls
 * `itemRepository.findBySlug(...)`, the `auth()` owner
 * check, the `cookies()` viewer-id read, OR the
 * `recordItemView(...)` write — making the canonical
 * envelope `{ success: true, counted: false, reason:
 * 'bot' }` (status 200) the load-bearing invariant for
 * the spec.
 *
 * It is also the **first POST smoke** the docs tree
 * publishes that pins a **synthetic-User-Agent override
 * branch** — the same endpoint, called with a non-bot
 * UA against an intentionally non-existent slug,
 * progresses past the bot gate, reaches
 * `itemRepository.findBySlug(slug)`, and lands on the
 * `if (!item) return 404 { success: false, error:
 * 'Item not found' }` branch. The two branches together
 * surface the gate-before-find order as a load-bearing
 * invariant: a regression that re-orders the
 * `findBySlug(...)` call before the bot gate would
 * surface here as a `data`-key disclosure on the bot
 * branch OR as a status-code change.
 *
 *   1. **Database availability gate** — `if
 *      (!process.env.DATABASE_URL) return 503 { error:
 *      'Database not configured', code:
 *      'DATABASE_UNAVAILABLE', message: '<long
 *      message>' }`. In the e2e environment
 *      `DATABASE_URL` IS set (the test harness boots
 *      the local SQLite database), so this branch must
 *      NOT fire — the matrix asserts a `< 500` status
 *      AND specifically asserts `response.status() !==
 *      503` for the no-arg POST.
 *   2. **Bot-detection gate** — `if (isBot(userAgent))
 *      return 200 { success: true, counted: false,
 *      reason: 'bot' }`. The `BOT_PATTERNS` array
 *      includes `/bot/i`, `/crawl/i`, `/spider/i`,
 *      `/playwright/i`, `/puppeteer/i`, `/headless/i`,
 *      `/curl/i` etc, AND treats an empty UA as a bot.
 *      The deterministic-assertion tests below set a
 *      known-bot UA (`Googlebot/2.1`) explicitly to
 *      pin this branch.
 *   3. **Item existence check** — `const item = await
 *      itemRepository.findBySlug(slug); if (!item)
 *      return 404 { success: false, error: 'Item not
 *      found' }`. Reachable ONLY when the UA is
 *      overridden to a non-bot string.
 *   4. **Owner exclusion gate** — `const session =
 *      await auth(); if (session?.user?.id &&
 *      item.submitted_by === session.user.id) return
 *      200 { success: true, counted: false, reason:
 *      'owner' }`. Reachable ONLY for an authenticated
 *      session whose `user.id` matches the item's
 *      `submitted_by`. The matrix below is anonymous,
 *      so this branch must NEVER fire.
 *   5. **Viewer-cookie read / write** — reads the
 *      `ever_viewer_id` cookie via `cookies()`,
 *      generates a `crypto.randomUUID()` if absent,
 *      sets the cookie with `httpOnly: true`,
 *      `sameSite: 'lax'`, `path: '/'`, and `maxAge:
 *      VIEWER_COOKIE_MAX_AGE` (365 days) on the
 *      first-write branch.
 *   6. **View recording** — `recordItemView({ itemId:
 *      slug, viewerId, viewedDateUtc })` returns
 *      `counted: boolean`. Response: `{ success: true,
 *      counted }`.
 *   7. **Outer catch** — `console.error` (dev-only) +
 *      500 `{ success: false, error: 'Failed to record
 *      view' }`. Out of scope for the bot branch (gate
 *      fires BEFORE the try block's risky calls).
 *   8. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status
 *      (typically 405 Method Not Allowed).
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';
const VIEWS_PATH = `/api/items/${NON_EXISTENT_SLUG}/views`;

// Explicit known-bot UA — `/bot/i` AND `/googlebot/i` from
// `BOT_PATTERNS`. Used to pin the bot branch
// deterministically regardless of the Playwright runtime's
// default UA.
const KNOWN_BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

// Vanilla Chrome UA — does NOT match any `BOT_PATTERNS`
// regex. Used to progress past the bot gate to the
// item-not-found 404 branch.
const NON_BOT_UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const ITEM_VIEWS_RECORD_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { Cookie: 'ever_viewer_id=fabricated-viewer-id' }, label: 'fabricated ever_viewer_id cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Bot-Bypass': 'true' }, label: 'fabricated X-Bot-Bypass header' },

	// UA-override probes — explicitly walk the bot vs non-bot
	// dispatcher surface.
	{ headers: { 'User-Agent': KNOWN_BOT_UA }, label: 'known-bot User-Agent override' },
	{ headers: { 'User-Agent': NON_BOT_UA }, label: 'non-bot User-Agent override' },
	{ headers: { 'User-Agent': '' }, label: 'empty User-Agent override (treated as bot)' }
] as const;

const ITEM_VIEWS_RECORD_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// The route never reads the request body; these MUST be ignored.
	{ data: { counted: true }, label: 'counted=true bypass attempt' },
	{ data: { reason: 'human' }, label: 'reason=human bypass attempt' },
	{ data: { isBot: false }, label: 'isBot=false bypass attempt' },
	{ data: { viewerId: 'fabricated-viewer-id' }, label: 'fabricated viewerId field' },
	{ data: { itemId: 'fabricated-item-id' }, label: 'fabricated itemId field' },
	{ data: { submitted_by: 'fabricated-user-id' }, label: 'fabricated submitted_by field' },

	// Bypass attempts targeting the bot gate.
	{ data: { userAgent: NON_BOT_UA }, label: 'userAgent override in body (would NOT be read)' },
	{ data: { 'user-agent': NON_BOT_UA }, label: 'user-agent override in body (would NOT be read)' },

	{ data: { padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Item not found',
	'Failed to record view',
	'Database not configured'
] as const;

const FORBIDDEN_KEYS_ON_BOT_BRANCH = ['error', 'data', 'code'] as const;

const BOT_BRANCH_REASON = 'bot' as const;
const ITEM_NOT_FOUND_MESSAGE = 'Item not found' as const;

test.describe('API: /api/items/[slug]/views POST body / header surface', () => {
	for (const { headers, label } of ITEM_VIEWS_RECORD_HEADERS) {
		test(`POST ${VIEWS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(VIEWS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ITEM_VIEWS_RECORD_BODIES) {
		test(`POST ${VIEWS_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(VIEWS_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${VIEWS_PATH} returns 200 with the bot-branch envelope under a known-bot User-Agent`, async ({
		request
	}) => {
		// Pinned with an explicit `Googlebot/2.1` UA that
		// matches `/bot/i` AND `/googlebot/i` in the route's
		// `BOT_PATTERNS` array, so the bot gate fires
		// BEFORE the `findBySlug(...)` call regardless of
		// the Playwright runtime's default UA. The
		// canonical envelope is `{ success: true, counted:
		// false, reason: 'bot' }` with status 200.
		const response = await request.post(VIEWS_PATH, {
			headers: { 'User-Agent': KNOWN_BOT_UA }
		});
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toEqual({ success: true, counted: false, reason: BOT_BRANCH_REASON });
	});

	test(`POST ${VIEWS_PATH} envelope shape on the bot branch has exactly success / counted / reason keys`, async ({
		request
	}) => {
		// Strict envelope-shape assertion: the bot envelope
		// is `{ success: true, counted: false, reason:
		// 'bot' }`. No other keys must appear — in
		// particular NO `error` (would indicate the
		// `findBySlug(...)` 404 branch fired) and NO
		// `data` (no such success-branch key exists, but
		// pinning it guards against a future refactor that
		// adds one).
		const response = await request.post(VIEWS_PATH, {
			headers: { 'User-Agent': KNOWN_BOT_UA }
		});
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['counted', 'reason', 'success']);
		expect(body.success).toBe(true);
		expect(body.counted).toBe(false);
		expect(body.reason).toBe(BOT_BRANCH_REASON);
	});

	test(`POST ${VIEWS_PATH} does NOT echo the post-bot-gate keys on the bot branch`, async ({ request }) => {
		// The 404 branch returns `{ success: false, error:
		// 'Item not found' }`. The 503 branch returns
		// `{ error: '...', code: 'DATABASE_UNAVAILABLE',
		// message: '...' }`. The catch branch returns
		// `{ success: false, error: 'Failed to record
		// view' }`. The bot branch must NEVER echo any of
		// these keys.
		const response = await request.post(VIEWS_PATH, {
			headers: { 'User-Agent': KNOWN_BOT_UA },
			data: { someBypass: 'attempt' }
		});
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS_ON_BOT_BRANCH) {
			expect(body[key]).toBeUndefined();
		}
		expect(body.success).toBe(true);
	});

	test(`POST ${VIEWS_PATH} does NOT echo any of the post-bot-gate messages on the bot branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(VIEWS_PATH, { headers: { 'User-Agent': KNOWN_BOT_UA } }),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA },
				data: {}
			}),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA },
				data: { itemId: 'fabricated' }
			}),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA },
				data: { viewerId: 'fabricated' }
			}),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA, Cookie: 'ever_viewer_id=fabricated' }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${VIEWS_PATH} has a stable status across header / body permutations on the bot branch`, async ({
		request
	}) => {
		const baseline = await request.post(VIEWS_PATH, { headers: { 'User-Agent': KNOWN_BOT_UA } });
		const responses = await Promise.all([
			request.post(VIEWS_PATH, { headers: { 'User-Agent': KNOWN_BOT_UA }, data: {} }),
			request.post(VIEWS_PATH, { headers: { 'User-Agent': KNOWN_BOT_UA }, data: { reason: 'human' } }),
			request.post(VIEWS_PATH, { headers: { 'User-Agent': KNOWN_BOT_UA }, data: { isBot: false } }),
			request.post(VIEWS_PATH, { headers: { 'User-Agent': KNOWN_BOT_UA }, data: { viewerId: 'fabricated' } }),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA, 'X-Tenant-Id': 'fabricated' }
			}),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA, Authorization: 'Bearer anything' }
			}),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA, Cookie: 'ever_viewer_id=fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${VIEWS_PATH} does NOT branch on side-channel cookies / headers on the bot branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA, Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA, Cookie: 'ever_viewer_id=fabricated-viewer-id' }
			}),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA, 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA, 'X-Tenant-Id': 'fabricated' }
			}),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA, 'X-User-Id': 'fabricated' }
			}),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA, Authorization: 'Bearer anything' }
			}),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA, 'X-Api-Key': 'anything' }
			}),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA, 'X-Bot-Bypass': 'true' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${VIEWS_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.get(VIEWS_PATH),
			request.put(VIEWS_PATH),
			request.patch(VIEWS_PATH),
			request.delete(VIEWS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${VIEWS_PATH} is invariant to malformed JSON bodies on the bot branch`, async ({ request }) => {
		// The bot gate fires BEFORE the body is read (the
		// route never calls `request.json()`), so malformed
		// JSON bodies still land on the same 200 envelope.
		const responses = await Promise.all([
			request.post(VIEWS_PATH, { headers: { 'User-Agent': KNOWN_BOT_UA }, data: 'not-json' }),
			request.post(VIEWS_PATH, { headers: { 'User-Agent': KNOWN_BOT_UA }, data: '{ broken: json' }),
			request.post(VIEWS_PATH, { headers: { 'User-Agent': KNOWN_BOT_UA }, data: '{"counted":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${VIEWS_PATH} item-not-found 404 branch is NOT entered on the bot branch`, async ({ request }) => {
		// Under the explicit known-bot UA the bot gate
		// fires FIRST, so the route never calls
		// `itemRepository.findBySlug(slug)` and the 404
		// `'Item not found'` envelope must NEVER appear in
		// any response.
		const responses = await Promise.all([
			request.post(VIEWS_PATH, { headers: { 'User-Agent': KNOWN_BOT_UA } }),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA },
				data: { someBypass: 'attempt' }
			}),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': KNOWN_BOT_UA, Cookie: 'ever_viewer_id=fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).not.toBe(404);
			const body = await response.json();
			expect(body.error).not.toBe(ITEM_NOT_FOUND_MESSAGE);
		}
	});

	test(`POST ${VIEWS_PATH} database-unavailable 503 branch is NOT entered when DATABASE_URL is configured`, async ({
		request
	}) => {
		// In the e2e environment `DATABASE_URL` is
		// configured (the test harness boots the local
		// SQLite database). The 503 envelope `{ error:
		// 'Database not configured', code:
		// 'DATABASE_UNAVAILABLE', message: '...' }` must
		// NEVER appear.
		const response = await request.post(VIEWS_PATH, {
			headers: { 'User-Agent': KNOWN_BOT_UA }
		});
		expect(response.status()).not.toBe(503);

		const body = await response.json();
		expect(body.code).not.toBe('DATABASE_UNAVAILABLE');
		expect(body.error).not.toBe('Database not configured');
	});

	test(`POST ${VIEWS_PATH} with a non-bot User-Agent override progresses past the bot gate to the item-not-found 404 branch`, async ({
		request
	}) => {
		// Synthetic-UA override — overrides the default
		// Playwright UA with a vanilla Chrome UA that does
		// NOT match any of the `BOT_PATTERNS` regexes. The
		// route progresses past the bot gate, calls
		// `itemRepository.findBySlug(slug)` against the
		// non-existent slug, and lands on the 404 branch.
		// This pins the gate-before-find order: a
		// regression that re-orders the `findBySlug(...)`
		// call before the bot gate would surface here as
		// either a 5xx, a `data` key disclosure, or a
		// status-code change.
		const response = await request.post(VIEWS_PATH, {
			headers: { 'User-Agent': NON_BOT_UA }
		});
		expect(response.status()).toBe(404);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: ITEM_NOT_FOUND_MESSAGE });
	});

	test(`POST ${VIEWS_PATH} with a non-bot User-Agent override does NOT echo the bot-branch envelope`, async ({
		request
	}) => {
		// The 404 branch returns `{ success: false, error:
		// 'Item not found' }`. The bot envelope `{ success:
		// true, counted: false, reason: 'bot' }` must
		// NEVER appear under a non-bot UA — a regression
		// that flipped the gate order would surface here
		// as a `reason: 'bot'` echo on the non-bot branch.
		const response = await request.post(VIEWS_PATH, {
			headers: { 'User-Agent': NON_BOT_UA }
		});

		const body = await response.json();
		expect(body.reason).toBeUndefined();
		expect(body.counted).toBeUndefined();
		expect(body.success).toBe(false);
	});

	test(`POST ${VIEWS_PATH} owner-exclusion branch is NOT entered on an anonymous request`, async ({ request }) => {
		// The owner-exclusion gate requires `session?.user
		// ?.id && item.submitted_by === session.user.id`.
		// An anonymous request can NEVER satisfy the first
		// conjunct (no session). The bot branch and the
		// item-not-found branch must NEVER echo `reason:
		// 'owner'` on an anonymous request.
		const responses = await Promise.all([
			request.post(VIEWS_PATH, { headers: { 'User-Agent': KNOWN_BOT_UA } }),
			request.post(VIEWS_PATH, { headers: { 'User-Agent': NON_BOT_UA } }),
			request.post(VIEWS_PATH, {
				headers: { 'User-Agent': NON_BOT_UA },
				data: { submitted_by: 'fabricated-user-id' }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.reason).not.toBe('owner');
		}
	});
});
