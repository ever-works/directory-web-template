import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
	OAUTH_ACCOUNT_TYPES,
	canDisconnectProvider,
	hasPasswordSignIn,
	isOAuthAccountType,
	summarizeConnectedAccounts,
	type ConnectedAccountRow
} from '../connected-accounts';

/** Run with: `pnpm --filter @ever-works/web test:unit` */
const TENANT = 'tenant-a';
const row = (type: string, provider: string, extra: Partial<ConnectedAccountRow> = {}): ConnectedAccountRow => ({
	provider,
	providerAccountId: `${provider}-id`,
	email: null,
	type,
	passwordHash: null,
	tenantId: TENANT,
	...extra
});
const passwordRow = row('credentials', 'credentials', { passwordHash: 'hash' });

describe('connected accounts', () => {
	it('treats oauth and oidc as linked providers and nothing else', () => {
		assert.deepEqual([...OAUTH_ACCOUNT_TYPES], ['oauth', 'oidc']);
		assert.equal(isOAuthAccountType('oauth'), true);
		assert.equal(isOAuthAccountType('oidc'), true);
		for (const type of ['credentials', 'email', 'webauthn', '']) {
			assert.equal(isOAuthAccountType(type), false, type);
		}
	});

	it('lists an oidc Google row, with its email', () => {
		const { data } = summarizeConnectedAccounts(
			[passwordRow, row('oidc', 'google', { email: 'a@example.com' })],
			TENANT
		);
		assert.deepEqual(data, [
			{ provider: 'google', providerAccountId: 'google-id', email: 'a@example.com', canDisconnect: true }
		]);
	});

	it('lists oauth and oidc rows together and never the password row', () => {
		const { data, hasPassword } = summarizeConnectedAccounts(
			[passwordRow, row('oauth', 'github'), row('oidc', 'google')],
			TENANT
		);
		assert.deepEqual(data.map((a) => a.provider), ['github', 'google']);
		assert.equal(hasPassword, true);
	});

	it('does not let the only oidc link be disconnected without a password', () => {
		const { data, hasPassword } = summarizeConnectedAccounts([row('oidc', 'google')], TENANT);
		assert.equal(hasPassword, false);
		assert.equal(data[0].canDisconnect, false);
	});

	it('counts oidc rows when deciding whether another sign-in method remains', () => {
		const { data } = summarizeConnectedAccounts([row('oidc', 'google'), row('oauth', 'github')], TENANT);
		assert.deepEqual(data.map((a) => a.canDisconnect), [true, true]);
	});

	it('a password row without a hash is not a sign-in method', () => {
		const { hasPassword, data } = summarizeConnectedAccounts(
			[row('credentials', 'credentials'), row('oidc', 'google')],
			TENANT
		);
		assert.equal(hasPassword, false);
		assert.equal(data[0].canDisconnect, false);
	});

	it('refuses to remove the last sign-in method', () => {
		assert.equal(canDisconnectProvider([row('oidc', 'google')], 'google', TENANT), false);
		assert.equal(canDisconnectProvider([], 'google', TENANT), false);
		assert.equal(canDisconnectProvider([row('oidc', 'google'), row('oauth', 'github')], 'google', TENANT), true);
		assert.equal(canDisconnectProvider([passwordRow, row('oidc', 'google')], 'google', TENANT), true);
		assert.equal(canDisconnectProvider([passwordRow], 'google', TENANT), true);
	});

	// The disconnect route deletes every row of the provider, so two links of the same
	// provider (two Google accounts) must not count as each other's fallback.
	it('a second link of the same provider is not another sign-in method', () => {
		const rows = [row('oidc', 'google'), row('oidc', 'google', { providerAccountId: 'google-id-2' })];
		assert.equal(canDisconnectProvider(rows, 'google', TENANT), false);
		assert.deepEqual(summarizeConnectedAccounts(rows, TENANT).data.map((a) => a.canDisconnect), [false, false]);
		assert.equal(canDisconnectProvider([...rows, row('oauth', 'github')], 'google', TENANT), true);
	});

	it('counts a legacy password row written as type email under the credentials provider', () => {
		const legacy = row('email', 'credentials', { passwordHash: 'hash' });
		assert.equal(hasPasswordSignIn([legacy], TENANT), true);
		assert.equal(hasPasswordSignIn([row('email', 'credentials')], TENANT), false, 'no hash, no password');
		assert.equal(hasPasswordSignIn([row('webauthn', 'passkey', { passwordHash: 'x' })], TENANT), false);
		const { data, hasPassword } = summarizeConnectedAccounts([legacy, row('oauth', 'github')], TENANT);
		assert.equal(hasPassword, true);
		assert.deepEqual(data.map((a) => [a.provider, a.canDisconnect]), [['github', true]]);
	});


	// Client sign-in reads the password row of the current tenant only, while Auth.js signs
	// in by provider account and writes link rows without a tenant.
	it('a password row outside the tenant is not a sign-in method, a link without a tenant is', () => {
		const nullTenantPassword = row('credentials', 'credentials', { passwordHash: 'hash', tenantId: null });
		const otherTenantPassword = row('credentials', 'credentials', { passwordHash: 'hash', tenantId: 'tenant-b' });
		assert.equal(hasPasswordSignIn([nullTenantPassword, otherTenantPassword], TENANT), false);
		assert.equal(canDisconnectProvider([nullTenantPassword, row('oidc', 'google')], 'google', TENANT), false);
		assert.equal(
			canDisconnectProvider([row('oidc', 'google'), row('oauth', 'github', { tenantId: null })], 'google', TENANT),
			true
		);
	});

	// The routes import Next.js, auth and the database and cannot be loaded under
	// `tsx --test`, so the wiring is read from source.
	describe('routes', () => {
		const read = (file: string) =>
			readFileSync(join(__dirname, '../../../app/api/auth/security/connected-accounts', file), 'utf8');

		it('the disconnect route deletes oauth/oidc rows only, after the shared check, under a lock', () => {
			const source = read('[provider]/route.ts');
			assert.equal(source.includes("'oauth'"), false, 'a hard-coded oauth literal is back');
			assert.equal(source.match(/inArray\(accounts\.type, \[\.\.\.OAUTH_ACCOUNT_TYPES\]\)/g)?.length, 1);
			const check = source.indexOf('canDisconnectProvider(rows, provider, tenantId)');
			const lock = source.indexOf(".for('update')");
			const remove = source.indexOf('.delete(accounts)');
			assert.ok(check > 0, 'the disconnect route no longer runs the shared last-sign-in-method check');
			assert.ok(lock > 0 && lock < check, 'the check does not run under the user row lock');
			assert.ok(check < remove, 'the delete runs before the check');
			const transaction = source.indexOf('db.transaction(');
			assert.ok(transaction > 0 && transaction < lock, 'the lock is not inside a transaction');
		});

		it('the auth adapter records the tenant when it links an OAuth/OIDC account', () => {
			const source = readFileSync(join(__dirname, '../index.ts'), 'utf8').replace(/\s+/g, ' ');
			const start = source.search(/linkAccount: \(?async/);
			assert.ok(start >= 0, 'the adapter no longer wraps linkAccount');
			assert.ok(
				source.slice(start, start + 300).includes('baseAdapter.linkAccount!(tenantId ? { ...data, tenantId } : data)'),
				'linkAccount does not pass the tenant to the base adapter'
			);
		});

		// Rows linked before that (or without a resolvable tenant) keep a NULL tenant: the Auth.js adapter links OAuth/OIDC accounts without a tenant, so their
		// `tenant_id` is NULL; an exact tenant match would hide them from both routes.
		it('both routes also match account rows with a NULL tenant', () => {
			for (const file of ['route.ts', '[provider]/route.ts']) {
				const source = read(file);
				assert.ok(
					source.includes('or(eq(accounts.tenantId, tenantId), isNull(accounts.tenantId))'),
					`${file} filters by tenant without allowing a NULL tenant`
				);
				// No bare tenant equality left as a query condition.
				assert.equal(/^\s*eq\(accounts\.tenantId, tenantId\)\s*$/m.test(source), false, file);
			}
		});

		it('the list route builds its response from the shared helper', () => {
			const source = read('route.ts');
			assert.equal(source.includes("'oauth'"), false, 'a hard-coded oauth literal is back');
			assert.ok(source.includes('summarizeConnectedAccounts(connectedAccounts, tenantId)'));
		});
	});
});
