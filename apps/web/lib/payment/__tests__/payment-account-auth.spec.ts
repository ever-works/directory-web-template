import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Module from 'node:module';
import { after, beforeEach, describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The route handler imports Next.js, the session helper and the database, none of which load
 * under `tsx --test`, so these guards read the source instead (same approach as
 * `lib/seo/__tests__/item-rating-wiring.spec.ts`).
 *
 * POST/PUT /api/payment/account write payment_account rows. They must only act for the signed-in
 * user, and the payment providers must write through the database layer instead of calling the
 * route over HTTP (a server-side fetch carries no session cookie and would now get a 401).
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

const route = source('../../../app/api/payment/account/route.ts');
const providers = ['stripe', 'lemonsqueezy', 'polar', 'solidgate'].map((name) => ({
	name,
	code: source(`../lib/providers/${name}-provider.ts`)
}));

/** The source of one exported handler, up to the next export (or the end of the file). */
function handler(method: 'POST' | 'PUT'): string {
	const start = route.indexOf(`export async function ${method}(`);
	assert.ok(start >= 0, `${method} handler not found`);
	const next = route.indexOf('export async function', start + 1);
	return route.slice(start, next === -1 ? undefined : next);
}

describe('/api/payment/account write handlers require the owner', () => {
	it('imports auth from the session helper', () => {
		assert.ok(route.includes("import { auth } from '@/lib/auth';"));
	});

	for (const method of ['POST', 'PUT'] as const) {
		it(`${method} returns 401 without a session and 403 for another user, before writing`, () => {
			const body = handler(method);
			// Each guard must be the whole `if` block: the condition, then a return carrying the
			// status, so a loosened condition or a dropped `return` is caught.
			const unauthorizedGuard =
				"if (!session?.user?.id) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }";
			const forbiddenGuard =
				"if (session.user.id !== userId) { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }";

			const authCall = body.indexOf('const session = await auth();');
			const unauthorized = body.indexOf(unauthorizedGuard);
			const bodyParse = body.indexOf('await request.json()');
			const userIdRead = body.search(/const \{[^}]*\buserId\b[^}]*\} = body;/);
			const ownership = body.indexOf(forbiddenGuard);
			const write = body.indexOf('await setupUserPaymentAccount(');

			assert.ok(authCall >= 0, `${method} does not call auth()`);
			assert.ok(unauthorized > authCall, `${method} does not return 401 when there is no session.user.id`);
			assert.ok(unauthorized < bodyParse, `${method} reads the body before the 401 check`);
			assert.ok(userIdRead > unauthorized, `${method} does not read userId from the body`);
			assert.ok(
				ownership > userIdRead,
				`${method} does not return 403 when session.user.id differs from userId`
			);
			assert.ok(write > ownership, `${method} writes before the ownership check`);
			assert.equal(body.split('setupUserPaymentAccount(').length - 1, 1, `${method} has an unguarded write`);
			assert.equal(body.split('session.user.id !== userId').length - 1, 1);
		});
	}
});

/**
 * Behavioural checks: load the real route module with its three imports replaced (the session
 * helper, the database queries and `next/server`) and call POST / PUT. This catches a guard that
 * is present in the source but no longer stops the handler (for example a dropped `return`).
 * The module graph is CommonJS under `tsx --test`, so intercepting `Module._load` is enough.
 */
type Handler = (request: Request) => Promise<Response>;
type Session = { user?: { id?: string } } | null;

const state: { session: Session; writes: unknown[][] } = { session: null, writes: [] };

const stubs: Record<string, unknown> = {
	'next/server': { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
	'@/lib/auth': { auth: async () => state.session },
	'@/lib/db/queries': {
		setupUserPaymentAccount: async (...args: unknown[]) => {
			state.writes.push(args);
			const [providerId, userId, customerId] = args as [string, string, string];
			return { id: 'acc_1', userId, providerId, customerId, createdAt: null, updatedAt: null };
		}
	}
};

const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
	return originalLoad.call(this, request, ...rest);
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const routeModule = require('../../../app/api/payment/account/route') as { POST: Handler; PUT: Handler };
loader._load = originalLoad;

const jsonRequest = (method: string, payload: unknown) =>
	new Request('http://localhost/api/payment/account', {
		method,
		headers: { 'content-type': 'application/json' },
		body: typeof payload === 'string' ? payload : JSON.stringify(payload)
	});

describe('/api/payment/account write handlers (behaviour)', () => {
	beforeEach(() => {
		state.session = null;
		state.writes = [];
	});
	after(() => {
		loader._load = originalLoad;
	});

	const cases: Array<[string, Handler, Record<string, unknown>]> = [
		['POST', routeModule.POST, { provider: 'stripe', userId: 'user_1', customerId: 'cus_1' }],
		['PUT', routeModule.PUT, { id: 'acc_1', provider: 'stripe', userId: 'user_1', customerId: 'cus_1' }]
	];

	for (const [method, handlerFn, payload] of cases) {
		it(`${method} returns 401 and does not write without a session`, async () => {
			state.session = null;
			const response = await handlerFn(jsonRequest(method, payload));
			assert.equal(response.status, 401);
			assert.equal(state.writes.length, 0);
		});

		it(`${method} returns 401 for a session without a user id`, async () => {
			state.session = { user: {} };
			const response = await handlerFn(jsonRequest(method, payload));
			assert.equal(response.status, 401);
			assert.equal(state.writes.length, 0);
		});

		it(`${method} returns 401 before parsing the body when signed out`, async () => {
			const response = await handlerFn(jsonRequest(method, 'not json'));
			assert.equal(response.status, 401);
			assert.equal(state.writes.length, 0);
		});

		it(`${method} returns 403 and does not write for another user's account`, async () => {
			state.session = { user: { id: 'someone_else' } };
			const response = await handlerFn(jsonRequest(method, payload));
			assert.equal(response.status, 403);
			assert.equal(state.writes.length, 0);
		});

		it(`${method} writes once and returns the account for the owner`, async () => {
			state.session = { user: { id: 'user_1' } };
			const response = await handlerFn(jsonRequest(method, payload));
			assert.equal(response.status, 200);
			assert.deepEqual(state.writes, [['stripe', 'user_1', 'cus_1']]);
			const body = (await response.json()) as { userId: string; customerId: string };
			assert.equal(body.userId, 'user_1');
			assert.equal(body.customerId, 'cus_1');
		});

		it(`${method} still returns 400 for a malformed body from the owner`, async () => {
			state.session = { user: { id: 'user_1' } };
			const response = await handlerFn(jsonRequest(method, 'not json'));
			assert.equal(response.status, 400);
			assert.equal(state.writes.length, 0);
		});
	}
});

describe('payment providers persist accounts without an HTTP self-call', () => {
	for (const { name, code } of providers) {
		it(`${name} does not use paymentAccountClient`, () => {
			assert.ok(!code.includes('paymentAccountClient'), `${name} still uses paymentAccountClient`);
			assert.ok(!code.includes('payment-account-client'), `${name} still imports payment-account-client`);
		});

		it(`${name} reads and writes the account through the database queries`, () => {
			assert.ok(
				code.includes("import { getUserPaymentAccountByProvider, setupUserPaymentAccount } from '@/lib/db/queries';"),
				`${name} does not import the payment account queries`
			);
			assert.ok(code.includes(`getUserPaymentAccountByProvider(userId, '${name}')`));
			assert.ok(code.includes(`setupUserPaymentAccount('${name}', userId, customerId)`));
		});
	}
});
