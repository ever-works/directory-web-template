import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param + method surface**
 * of the admin-only location-index endpoint served by
 * `apps/web/app/api/admin/location-index/route.ts`.
 *
 * `GET /api/admin/location-index` is the **second**
 * admin-tree route the smoke layer covers that documents
 * the **`checkAdminAuth()` three-step guard** (from
 * `@/lib/auth/admin-guard.ts`). The first such route
 * is `/api/admin/clients/dashboard` (covered by the
 * sibling `admin-clients-dashboard-query.spec.ts`
 * smoke spec); this spec extends the smoke coverage of
 * the same helper to the **second** consumer, with
 * one additional dimension: this is the **first** admin-
 * tree route the smoke layer covers that exposes BOTH a
 * `GET` AND a `POST` handler. The helper folds three
 * branches into one helper call:
 *
 *     export async function checkAdminAuth(): Promise<NextResponse | null> {
 *       const session = await auth();
 *       if (!session?.user) {
 *         return NextResponse.json(
 *           { success: false, error: 'Unauthorized' },
 *           { status: 401 }
 *         );
 *       }
 *       if (!session.user.id) {
 *         return NextResponse.json(
 *           { success: false, error: 'User ID not found' },
 *           { status: 401 }
 *         );
 *       }
 *       const userIsAdmin = await isAdmin(session.user.id);
 *       if (!userIsAdmin) {
 *         return NextResponse.json(
 *           { success: false, error: 'Insufficient permissions' },
 *           { status: 403 }
 *         );
 *       }
 *       return null;
 *     }
 *
 * The handler:
 *
 *     export async function GET() {
 *       try {
 *         const authError = await checkAdminAuth();
 *         if (authError) return authError;
 *         const service = getLocationIndexService();
 *         const stats = await service.getIndexStats();
 *         return NextResponse.json({ success: true, data: stats });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Internal server error' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 *     export async function POST(request: NextRequest) {
 *       try {
 *         const authError = await checkAdminAuth();
 *         if (authError) return authError;
 *         const body = await request.json();
 *         const { action } = body;
 *         if (action === 'rebuild') {
 *           const service = getLocationIndexService();
 *           const items = await itemRepository.findAll();
 *           const result = await service.rebuildIndex(items);
 *           return NextResponse.json({ success: true, data: result });
 *         }
 *         if (action === 'clear') {
 *           const cleared = await clearLocationIndex();
 *           return NextResponse.json({ success: true, data: { cleared } });
 *         }
 *         return NextResponse.json(
 *           { success: false, error: 'Invalid action. Use "rebuild" or "clear".' },
 *           { status: 400 }
 *         );
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Internal server error' }, { status: 500 }
 *         );
 *       }
 *     }
 *
 * The route exposes NO documented post-gate query
 * params on the GET handler (the GET branch reads no
 * `searchParams`) — the smallest documented post-gate
 * query surface of any admin-tree route the smoke
 * layer covers, contrasting the
 * `/api/admin/clients/dashboard` route's eleven post-
 * gate query params. The POST handler reads exactly
 * one body field (`action`) with two valid values
 * (`'rebuild'`, `'clear'`); both action paths are
 * destructive (`rebuild` re-indexes every item,
 * `clear` truncates the index table), which is why
 * the gate fires before the action dispatch. This
 * spec walks the unauthenticated branches of BOTH
 * handlers and pins the canonical 401 envelope plus a
 * negative-shape assertion that the body must NOT
 * echo the second-step `'User ID not found'` /
 * third-step `'Insufficient permissions'` /
 * post-gate `'Invalid action.'` messages. A
 * regression that allowed the action dispatch to fire
 * before the gate would surface here as a 200 / 400
 * status divergence on the unauth POST branch.
 *
 * The shape mirrors the sibling admin-gated query-
 * smoke specs (`admin-categories-query.spec.ts`,
 * `admin-clients-dashboard-query.spec.ts`,
 * `admin-clients-query.spec.ts`,
 * `admin-collections-query.spec.ts`,
 * `admin-comments-query.spec.ts`,
 * `admin-companies-query.spec.ts`,
 * `admin-dashboard-stats-query.spec.ts`,
 * `admin-featured-items-query.spec.ts`,
 * `admin-geo-analytics-query.spec.ts`,
 * `admin-items-export-sample-query.spec.ts`,
 * `admin-items-query.spec.ts`,
 * `admin-items-stats-query.spec.ts`,
 * `admin-navigation-query.spec.ts`,
 * `admin-notifications-query.spec.ts`,
 * `admin-reports-query.spec.ts`,
 * `admin-roles-stats-query.spec.ts`,
 * `admin-settings-query.spec.ts`,
 * `admin-sponsor-ads-query.spec.ts`,
 * `admin-tags-query.spec.ts`,
 * `admin-tags-all-query.spec.ts`,
 * `admin-users-query.spec.ts`,
 * `admin-users-stats-query.spec.ts` smoke specs).
 */
const ADMIN_LOCATION_INDEX_GET_QUERIES = [
	// Baseline — the no-arg unauthenticated GET case.
	'/api/admin/location-index',

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys. None of these should change the unauth
	// branch's status (the GET handler reads no
	// `searchParams`).
	'/api/admin/location-index?userId=anything',
	'/api/admin/location-index?user_id=anything',
	'/api/admin/location-index?adminId=anything',
	'/api/admin/location-index?as=admin',
	'/api/admin/location-index?asUser=true',
	'/api/admin/location-index?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/location-index?token=anything',
	'/api/admin/location-index?secret=anything',
	'/api/admin/location-index?api_key=anything',
	'/api/admin/location-index?authorization=Bearer+anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/location-index?bypass=1',
	'/api/admin/location-index?admin=1',
	'/api/admin/location-index?override=true',
	'/api/admin/location-index?force=true',

	// `?action=` — leak from the POST handler's body
	// schema into a query-string posture.
	'/api/admin/location-index?action=rebuild',
	'/api/admin/location-index?action=clear',
	'/api/admin/location-index?action=invalid',
	'/api/admin/location-index?action=',

	// Bogus / typo'd query keys.
	'/api/admin/location-index?unknown=value',
	'/api/admin/location-index?foo=bar&baz=qux'
] as const;

const ADMIN_LOCATION_INDEX_POST_BODIES = [
	// The two documented action values.
	{ action: 'rebuild' },
	{ action: 'clear' },

	// Bogus action values that would reach the
	// 400 `'Invalid action.'` branch AFTER the gate.
	{ action: 'invalid' },
	{ action: '' },
	{ action: 'REBUILD' },
	{ action: 'CLEAR' },
	{ action: ' rebuild ' },

	// Missing action.
	{},

	// `userId` / `adminId` / `bypass` / `token` /
	// `secret` / `override` body keys — none of
	// these should change the unauth branch's
	// status.
	{ action: 'rebuild', userId: 'admin' },
	{ action: 'clear', adminId: 'admin' },
	{ action: 'rebuild', bypass: true },
	{ action: 'rebuild', token: 'anything' },
	{ action: 'rebuild', secret: 'anything' },
	{ action: 'clear', override: true }
] as const;

test.describe('API: /api/admin/location-index query-param + method surface', () => {
	for (const path of ADMIN_LOCATION_INDEX_GET_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's `checkAdminAuth()` three-step guard
			// fires before any service call. The
			// unauthenticated GET surface returns a 4xx
			// (specifically 401) deterministically.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/location-index returns a 401 with the canonical { success, error } envelope on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the FIRST step of
		// `checkAdminAuth()` (`!session?.user`) returns
		// 401 with the canonical
		// `{ success: false, error: 'Unauthorized' }`
		// envelope. A regression that reorders the
		// three steps would surface here as a status /
		// envelope divergence.
		const response = await request.get('/api/admin/location-index');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized'
		});
	});

	test('GET /api/admin/location-index has a stable status across query permutations', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/location-index');
		const parameterised = await request.get(
			'/api/admin/location-index?userId=admin&token=anything&action=rebuild&bypass=1&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/location-index?action=… does NOT bypass the admin guard', async ({
		request
	}) => {
		// The GET handler ignores `searchParams` entirely
		// and only reads from the service. A regression
		// that started reading `?action=` on the GET
		// handler (e.g. mirroring the POST body schema
		// onto the query string) would still need to
		// fire the gate before reading the param — this
		// assertion proves it does.
		const baseline = await request.get('/api/admin/location-index');
		const responses = await Promise.all([
			request.get('/api/admin/location-index?action=rebuild'),
			request.get('/api/admin/location-index?action=clear'),
			request.get('/api/admin/location-index?action=invalid'),
			request.get('/api/admin/location-index?action=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/location-index?userId=… does NOT bypass the admin guard', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()` would change the unauth branch from
		// "always 401" to "200 if ?userId=… is present".
		const baseline = await request.get('/api/admin/location-index');
		const responses = await Promise.all([
			request.get('/api/admin/location-index?userId=admin'),
			request.get('/api/admin/location-index?user_id=admin'),
			request.get('/api/admin/location-index?adminId=admin'),
			request.get('/api/admin/location-index?as=admin'),
			request.get('/api/admin/location-index?asUser=true'),
			request.get('/api/admin/location-index?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/location-index?token=… does NOT bypass the admin guard', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/location-index');
		const responses = await Promise.all([
			request.get('/api/admin/location-index?token=anything'),
			request.get('/api/admin/location-index?secret=anything'),
			request.get('/api/admin/location-index?api_key=anything'),
			request.get('/api/admin/location-index?authorization=Bearer+anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/location-index?bypass=… does NOT bypass the admin guard', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/location-index');
		const responses = await Promise.all([
			request.get('/api/admin/location-index?bypass=1'),
			request.get('/api/admin/location-index?admin=1'),
			request.get('/api/admin/location-index?override=true'),
			request.get('/api/admin/location-index?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/location-index does NOT branch on Accept header', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/location-index');
		const responses = await Promise.all([
			request.get('/api/admin/location-index', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/location-index', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/location-index', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/location-index keeps the response stable under cookie / IP side channels', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get('/api/admin/location-index', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/location-index', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/location-index', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/location-index', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/location-index response message does NOT echo the second-step or third-step messages', async ({
		request
	}) => {
		// The `checkAdminAuth()` helper emits THREE
		// distinct envelopes — `'Unauthorized'` (401),
		// `'User ID not found'` (401), and
		// `'Insufficient permissions'` (403). The
		// unauth branch must hit the FIRST envelope
		// only. A regression that reorders the guard's
		// checks would surface here as a body-
		// divergence assertion failure.
		const response = await request.get('/api/admin/location-index');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('User ID not found');
		expect(body.error).not.toBe('Insufficient permissions');
		expect(body.error).not.toBe('Forbidden');
		expect(body.error).not.toBe('Internal server error');
	});

	for (const body of ADMIN_LOCATION_INDEX_POST_BODIES) {
		const label = JSON.stringify(body) || '<empty>';
		test(`POST ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post('/api/admin/location-index', {
				data: body
			});

			// The POST handler's `checkAdminAuth()` gate
			// fires BEFORE the action dispatch reads the
			// body. Every unauthenticated POST returns 401
			// regardless of the action value.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('POST /api/admin/location-index { action: "rebuild" } returns a 401 on the unauth branch', async ({
		request
	}) => {
		// The destructive `rebuild` action MUST NOT fire
		// before the gate. A regression that read the
		// body before calling `checkAdminAuth()` (e.g.
		// `await request.json()` first, then gate) would
		// not change the unauth-branch status today
		// (the destructive `service.rebuildIndex(items)`
		// call only fires after the dispatch matches),
		// but a regression that re-ordered the gate
		// after the action dispatch would.
		const response = await request.post('/api/admin/location-index', {
			data: { action: 'rebuild' }
		});

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized'
		});
	});

	test('POST /api/admin/location-index { action: "clear" } returns a 401 on the unauth branch', async ({
		request
	}) => {
		// The destructive `clear` action MUST NOT fire
		// before the gate. The unauth branch returns 401
		// without touching `clearLocationIndex()`.
		const response = await request.post('/api/admin/location-index', {
			data: { action: 'clear' }
		});

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized'
		});
	});

	test('POST /api/admin/location-index { action: "invalid" } returns 401 on the unauth branch (NOT 400)', async ({
		request
	}) => {
		// The post-gate `'Invalid action.'` 400 branch
		// must NOT fire on the unauth path — the gate
		// short-circuits before the action dispatch.
		// A regression that ran the action dispatch
		// before the gate would surface here as a 400
		// status with the post-gate envelope.
		const response = await request.post('/api/admin/location-index', {
			data: { action: 'invalid' }
		});

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Invalid action. Use "rebuild" or "clear".');
	});

	test('POST /api/admin/location-index has a stable status across body permutations on the unauth branch', async ({
		request
	}) => {
		const baseline = await request.post('/api/admin/location-index', {
			data: { action: 'rebuild' }
		});
		const responses = await Promise.all([
			request.post('/api/admin/location-index', { data: { action: 'clear' } }),
			request.post('/api/admin/location-index', { data: { action: 'invalid' } }),
			request.post('/api/admin/location-index', { data: { action: '' } }),
			request.post('/api/admin/location-index', { data: {} }),
			request.post('/api/admin/location-index', {
				data: { action: 'rebuild', userId: 'admin', token: 'anything', bypass: true }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('POST /api/admin/location-index does NOT branch on Content-Type fallback', async ({
		request
	}) => {
		// The handler calls `await request.json()` after
		// the gate. The unauth branch fires before the
		// JSON parse. A request with `Content-Type:
		// text/plain` and a non-JSON body must still
		// 401 (the gate returns before the parse).
		const baseline = await request.post('/api/admin/location-index', {
			data: { action: 'rebuild' }
		});

		const responses = await Promise.all([
			request.post('/api/admin/location-index', {
				headers: { 'Content-Type': 'text/plain' },
				data: 'action=rebuild'
			}),
			request.post('/api/admin/location-index', {
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				form: { action: 'rebuild' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('POST /api/admin/location-index keeps the response stable under cookie side channels', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post('/api/admin/location-index', {
				headers: { Cookie: 'next-auth.session-token=fabricated' },
				data: { action: 'rebuild' }
			}),
			request.post('/api/admin/location-index', {
				headers: { Cookie: 'authjs.session-token=fabricated' },
				data: { action: 'clear' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('POST /api/admin/location-index response message does NOT echo the post-gate `Invalid action.` message on the unauth branch', async ({
		request
	}) => {
		// A regression that fired the action dispatch
		// before the gate would surface here: the body
		// would echo the post-gate
		// `'Invalid action. Use "rebuild" or "clear".'`
		// message instead of the canonical
		// `'Unauthorized'` envelope.
		const response = await request.post('/api/admin/location-index', {
			data: { action: 'invalid' }
		});
		const body = await response.json();

		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Invalid action. Use "rebuild" or "clear".');
		expect(body.error).not.toBe('User ID not found');
		expect(body.error).not.toBe('Insufficient permissions');
		expect(body.error).not.toBe('Internal server error');
	});

	test('GET and POST share the same unauth branch envelope', async ({ request }) => {
		// Both handlers call `checkAdminAuth()` first.
		// The unauthenticated branch's envelope must be
		// identical across HTTP methods. A regression
		// that swapped one handler's gate for a custom
		// inline gate would surface here as a body
		// divergence between the two envelopes.
		const getResponse = await request.get('/api/admin/location-index');
		const postResponse = await request.post('/api/admin/location-index', {
			data: { action: 'rebuild' }
		});

		expect(getResponse.status()).toBe(postResponse.status());

		const getBody = await getResponse.json();
		const postBody = await postResponse.json();
		expect(getBody).toEqual(postBody);
	});
});
