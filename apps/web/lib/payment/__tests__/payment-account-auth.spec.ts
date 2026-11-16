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
 * POST/PUT /api/payment/account write payment_account rows, and the Stripe billing portal, the
 * invoice list and the Polar ownership check trust the stored customer id. They are admin-only
 * (the /api/admin guard), and the payment providers write through the database layer instead of
 * calling the route over HTTP (a server-side fetch carries no session cookie).
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

describe('/api/payment/account write handlers are admin-only', () => {
	it('imports the admin guard', () => {
		assert.ok(route.includes("import { requireAdminSession } from '@/lib/auth/admin-guard';"));
		assert.ok(!route.includes("from '@/lib/auth';"), 'the route still reads the session directly');
	});

	for (const method of ['POST', 'PUT'] as const) {
		it(`${method} runs the admin guard before reading the body and before writing`, () => {
			const body = handler(method);
			// The guard must be the whole `if` block: the condition, then a return of the guard's
			// response, so a loosened condition or a dropped `return` is caught.
			const guard =
				'const adminResult = await requireAdminSession(); if (adminResult instanceof NextResponse) { return adminResult; }';

			const guardAt = body.indexOf(guard);
			const bodyParse = body.indexOf('await request.json()');
			const write = body.indexOf('await setupUserPaymentAccount(');

			assert.ok(guardAt >= 0, `${method} does not return the admin guard's response`);
			assert.ok(guardAt < bodyParse, `${method} reads the body before the admin check`);
			assert.ok(write > guardAt, `${method} writes before the admin check`);
			assert.equal(body.split('setupUserPaymentAccount(').length - 1, 1, `${method} has an unguarded write`);
			assert.equal(body.split('requireAdminSession(').length - 1, 1);
		});

		it(`${method} refuses provider names the app does not ship, before writing`, () => {
			// setupUserPaymentAccount inserts a payment_provider row for any unknown name.
			const body = handler(method);
			const allowlist = body.indexOf(
				"if (!SUPPORTED_PROVIDERS.has(provider)) { return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 }); }"
			);
			assert.ok(allowlist >= 0, `${method} does not check the provider against SUPPORTED_PROVIDERS`);
			assert.ok(allowlist < body.indexOf('await setupUserPaymentAccount('), `${method} writes before the provider check`);
		});
	}

	it('builds the provider allowlist from the PaymentProvider enum', () => {
		assert.ok(route.includes("import { PaymentProvider } from '@/lib/constants/payment';"));
		assert.ok(route.includes('const SUPPORTED_PROVIDERS: ReadonlySet<string> = new Set(Object.values(PaymentProvider));'));
	});
});

describe('server code does not pull the providers into the browser bundle', () => {
	// lib/payment/index.ts re-exports the 'use client' usePayment hook. When a server module imports
	// that barrel, Next bundles the hook's graph (PaymentService -> factory -> providers ->
	// @/lib/db/queries -> postgres) for the browser and `next build` fails on fs/net/tls.
	const manager = source('../config/payment-provider-manager.ts');

	it('payment-provider-manager imports each provider from its own file', () => {
		assert.ok(!/from '\.\.';/.test(manager), 'payment-provider-manager imports the lib/payment barrel');
		for (const [name, cls] of [
			['stripe', 'StripeProvider'],
			['lemonsqueezy', 'LemonSqueezyProvider'],
			['polar', 'PolarProvider'],
			['solidgate', 'SolidgateProvider']
		]) {
			assert.ok(
				manager.includes(`import { ${cls} } from '../lib/providers/${name}-provider';`),
				`payment-provider-manager does not import ${cls} from its own file`
			);
		}
	});
});

/**
 * Behavioural checks: load the real route module with its three imports replaced (the admin
 * guard, the database queries and `next/server`) and call POST / PUT. This catches a guard that
 * is present in the source but no longer stops the handler (for example a dropped `return`).
 * The guard stub mirrors `requireAdminSession`: 401 without a user id, 403 for a non-admin, the
 * session otherwise. The module graph is CommonJS under `tsx --test`, so intercepting
 * `Module._load` is enough.
 */
type Handler = (request: Request) => Promise<Response>;
type Session = { user?: { id?: string } } | null;

const state: { session: Session; admin: boolean; writes: unknown[][] } = { session: null, admin: false, writes: [] };

// The route tests `result instanceof NextResponse`, so the stub must be a real class.
class StubNextResponse extends Response {
	static json(body: unknown, init?: ResponseInit) {
		return new StubNextResponse(JSON.stringify(body), {
			...init,
			headers: { 'content-type': 'application/json' }
		});
	}
}

const stubs: Record<string, unknown> = {
	'next/server': { NextResponse: StubNextResponse },
	'@/lib/auth/admin-guard': {
		requireAdminSession: async () => {
			if (!state.session?.user?.id) {
				return StubNextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
			}
			if (!state.admin) {
				return StubNextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
			}
			return { session: state.session };
		}
	},
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
		state.admin = false;
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

		it(`${method} returns 403 and does not write for a signed-in non-admin who owns the account`, async () => {
			// Owning the row is no longer enough: the stored customer id is trusted by the billing
			// portal and the invoice list, so a user must not be able to repoint their own row.
			state.session = { user: { id: 'user_1' } };
			const response = await handlerFn(jsonRequest(method, payload));
			assert.equal(response.status, 403);
			assert.equal(state.writes.length, 0);
		});

		it(`${method} writes once and returns the account for an admin`, async () => {
			state.session = { user: { id: 'admin_1' } };
			state.admin = true;
			const response = await handlerFn(jsonRequest(method, payload));
			assert.equal(response.status, 200);
			assert.deepEqual(state.writes, [['stripe', 'user_1', 'cus_1']]);
			const body = (await response.json()) as { userId: string; customerId: string };
			assert.equal(body.userId, 'user_1');
			assert.equal(body.customerId, 'cus_1');
		});

		it(`${method} still returns 400 for a malformed body from an admin`, async () => {
			state.session = { user: { id: 'admin_1' } };
			state.admin = true;
			const response = await handlerFn(jsonRequest(method, 'not json'));
			assert.equal(response.status, 400);
			assert.equal(state.writes.length, 0);
		});

		it(`${method} still refuses a provider the app does not ship, even from an admin`, async () => {
			state.session = { user: { id: 'admin_1' } };
			state.admin = true;
			const response = await handlerFn(jsonRequest(method, { ...payload, provider: 'not-a-provider' }));
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
