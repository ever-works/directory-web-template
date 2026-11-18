import assert from 'node:assert/strict';
import Module from 'node:module';
import { format } from 'node:util';
import { after, beforeEach, describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Behavioural companions to `email-logging.spec.ts`, which reads the source. These load the real
 * modules with their database, auth and mail imports replaced and check what actually reaches the
 * console:
 *
 * - The Polar provider turns a Polar 422 into a message that `createCustomer` and
 *   `createNewPolarCustomer` log and rethrow. Polar's validation body holds the rejected address
 *   in `input`, so the message must not carry it, nor fall back to the raw body.
 * - The change-password route logs that the confirmation email was sent. The mail helper returns
 *   `{ skipped: true }` instead of sending when no email service is configured, and the log must
 *   say so instead of claiming a send.
 *
 * The module graph is CommonJS under `tsx --test`, so intercepting `Module._load` is enough
 * (same approach as `lib/payment/__tests__/payment-account-auth.spec.ts`).
 */
const ADDRESS = 'jane.doe@realmail.org';
const LOCAL_PART = 'jane.doe';

const state: {
	session: { user: { id: string; email: string; name: string } } | null;
	rows: unknown[][];
	mailResult: unknown;
	mailCalls: unknown[][];
} = { session: null, rows: [], mailResult: undefined, mailCalls: [] };

// A real Response subclass, like `NextResponse`, so the route's responses have a status.
class StubNextResponse extends Response {
	static json(body: unknown, init?: ResponseInit) {
		return new StubNextResponse(JSON.stringify(body), {
			...init,
			headers: { 'content-type': 'application/json' }
		});
	}
}

/** `db.select().from().where().limit()` resolves to the next queued row set. */
const db = {
	select: () => {
		const chain = {
			from: () => chain,
			where: () => chain,
			limit: async () => state.rows.shift() ?? []
		};
		return chain;
	}
};

const stubs: Record<string, unknown> = {
	'next/server': { NextResponse: StubNextResponse, NextRequest: Request },
	'@/lib/auth': { auth: async () => state.session },
	'@/lib/auth/tenant': { getTenantId: async () => 'tenant_1' },
	'@/lib/db/drizzle': { db },
	'@/lib/db/schema': { users: {}, accounts: {} },
	'drizzle-orm': { eq: () => ({}), and: () => ({}) },
	'@/lib/db/queries': {
		isUserAdminOrThrow: async () => false,
		// develop's change-password route reads the current hash through this helper (#1150)
		getSignInPasswordHash: async () => 'old-hash',
		setUserPasswordHash: async () => undefined,
		getUserPaymentAccountByProvider: async () => null,
		setupUserPaymentAccount: async () => null
	},
	'@/lib/utils/rate-limit': { ratelimit: async () => ({ success: true }) },
	'@/lib/mail': {
		sendPasswordChangeConfirmationEmail: async (...args: unknown[]) => {
			state.mailCalls.push(args);
			return state.mailResult;
		}
	},
	bcryptjs: {
		compare: async (plain: string, hash: string) => plain === 'Old#Passw0rd' && hash === 'old-hash',
		hash: async () => 'new-hash'
	}
};

const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
	return originalLoad.call(this, request, ...rest);
};
const { PolarProvider } = require('../payment/lib/providers/polar-provider') as {
	PolarProvider: new (config: Record<string, unknown>) => Record<string, any>;
};
const changePassword = require('../../app/api/auth/change-password/route') as {
	POST: (request: Request) => Promise<Response>;
};
loader._load = originalLoad;

/** Runs `fn` with console.log/info/warn/error/debug captured, and returns every printed line. */
async function captureConsole(fn: () => Promise<unknown>): Promise<string[]> {
	const lines: string[] = [];
	const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
	const saved = methods.map((name) => console[name]);
	for (const name of methods) {
		console[name] = (...args: unknown[]) => {
			lines.push(`${name}: ${format(...args)}`);
		};
	}
	try {
		await fn();
	} finally {
		methods.forEach((name, i) => (console[name] = saved[i]));
	}
	return lines;
}

const assertNoAddress = (texts: string[]) => {
	for (const text of texts) {
		assert.ok(!text.includes(ADDRESS), `the address was printed: ${text}`);
		assert.ok(!text.includes(LOCAL_PART), `the address's local part was printed: ${text}`);
	}
};

after(() => {
	loader._load = originalLoad;
});

describe('Polar rejects the customer email: logs and errors carry no address', () => {
	/** A Polar 422 body, as the SDK puts it in the error message. */
	const polarError = (detail: Record<string, unknown>) =>
		new Error(
			`API error occurred: Status 422 ${JSON.stringify({ detail: [{ loc: ['body', 'email'], ...detail }] })}`
		);

	const provider = () => {
		let instance: Record<string, any> | undefined;
		return captureConsole(async () => {
			instance = new PolarProvider({
				apiKey: 'polar_test_key',
				webhookSecret: 'whsec_test',
				options: { organizationId: 'org_test', sandbox: true }
			});
		}).then(() => instance!);
	};

	const cases: Array<[string, Error]> = [
		[
			'a domain Polar does not accept',
			polarError({
				type: 'value_error',
				msg: 'value is not a valid email address: The domain name realmail.org does not accept email.',
				input: ADDRESS
			})
		],
		['a rejection without a message (no fallback to the raw body)', polarError({ input: ADDRESS })]
	];

	for (const [label, rejection] of cases) {
		it(`createCustomer, ${label}`, async () => {
			const polar = await provider();
			polar.polar = {
				customers: {
					create: async () => {
						throw rejection;
					}
				}
			};

			let thrown: unknown;
			const lines = await captureConsole(async () => {
				await polar.createCustomer({ email: ADDRESS, name: 'Jane Doe' }).catch((error: unknown) => {
					thrown = error;
				});
			});

			assert.ok(thrown instanceof Error, 'createCustomer should rethrow the rejection');
			assert.ok(lines.some((line) => line.includes('Failed to create Polar customer')));
			assert.match(thrown.message, /Invalid email address|not a valid email address/);
			assertNoAddress([...lines, thrown.message]);
		});

		it(`createNewPolarCustomer, ${label}`, async () => {
			const polar = await provider();
			polar.polar = {
				customers: {
					create: async () => {
						throw rejection;
					}
				}
			};

			let thrown: unknown;
			const lines = await captureConsole(async () => {
				await polar
					.createNewPolarCustomer({ id: 'user_1', email: ADDRESS, user_metadata: { name: 'Jane Doe' } })
					.catch((error: unknown) => {
						thrown = error;
					});
			});

			assert.ok(thrown instanceof Error);
			assert.equal(lines.filter((line) => line.includes('Failed to create Polar customer')).length, 2);
			assertNoAddress([...lines, thrown.message]);
		});
	}
});

describe('change-password: the confirmation email log matches what the mail helper did', () => {
	beforeEach(() => {
		state.session = { user: { id: 'user_1', email: ADDRESS, name: 'Jane Doe' } };
		// The user row (no admin hash), then the credentials account row.
		state.rows = [[{ id: 'user_1', email: ADDRESS, passwordHash: null }], [{ passwordHash: 'old-hash' }]];
		state.mailCalls = [];
	});

	const changeRequest = () =>
		new Request('http://localhost/api/auth/change-password', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
			body: JSON.stringify({
				currentPassword: 'Old#Passw0rd',
				newPassword: 'New#Passw0rd',
				confirmPassword: 'New#Passw0rd'
			})
		});

	async function run(): Promise<{ status: number; lines: string[] }> {
		let status = 0;
		const lines = await captureConsole(async () => {
			status = (await changePassword.POST(changeRequest())).status;
		});
		return { status, lines };
	}

	it('says the email was skipped, not sent, when no email service is configured', async () => {
		state.mailResult = { skipped: true, reason: 'Email service not configured' };
		const { status, lines } = await run();

		assert.equal(status, 200);
		assert.equal(state.mailCalls.length, 1, 'the route should call the mail helper');
		assert.ok(
			lines.some(
				(line) => line.startsWith('warn: ') && line.includes('confirmation email skipped for user user_1')
			),
			`no skipped warning in:\n${lines.join('\n')}`
		);
		assert.ok(!lines.some((line) => line.includes('email sent')), `a send was logged:\n${lines.join('\n')}`);
		assertNoAddress(lines);
	});

	it('says the email was sent when the helper sent it, without logging the provider result', async () => {
		state.mailResult = { messageId: 'msg_1', accepted: [ADDRESS], envelope: { to: [ADDRESS] } };
		const { status, lines } = await run();

		assert.equal(status, 200);
		assert.ok(lines.some((line) => line.includes('confirmation email sent for user user_1')));
		assert.ok(!lines.some((line) => line.includes('skipped')));
		assertNoAddress(lines);
	});
});
