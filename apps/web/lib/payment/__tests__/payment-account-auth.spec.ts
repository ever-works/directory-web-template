import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

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
