import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
	OAUTH_ACCOUNT_TYPES,
	isOAuthAccountType,
	summarizeConnectedAccounts,
	wouldLeaveNoSignInMethod,
	type ConnectedAccountRow
} from '../connected-accounts';

/** Run with: `pnpm --filter @ever-works/web test:unit` */
const row = (type: string, provider: string, extra: Partial<ConnectedAccountRow> = {}): ConnectedAccountRow => ({
	provider,
	providerAccountId: `${provider}-id`,
	email: null,
	type,
	passwordHash: null,
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
		const { data } = summarizeConnectedAccounts([
			passwordRow,
			row('oidc', 'google', { email: 'a@example.com' })
		]);
		assert.deepEqual(data, [
			{ provider: 'google', providerAccountId: 'google-id', email: 'a@example.com', canDisconnect: true }
		]);
	});

	it('lists oauth and oidc rows together and never the password row', () => {
		const { data, hasPassword } = summarizeConnectedAccounts([
			passwordRow,
			row('oauth', 'github'),
			row('oidc', 'google')
		]);
		assert.deepEqual(data.map((a) => a.provider), ['github', 'google']);
		assert.equal(hasPassword, true);
	});

	it('does not let the only oidc link be disconnected without a password', () => {
		const { data, hasPassword } = summarizeConnectedAccounts([row('oidc', 'google')]);
		assert.equal(hasPassword, false);
		assert.equal(data[0].canDisconnect, false);
	});

	it('counts oidc rows when deciding whether another sign-in method remains', () => {
		const { data } = summarizeConnectedAccounts([row('oidc', 'google'), row('oauth', 'github')]);
		assert.deepEqual(data.map((a) => a.canDisconnect), [true, true]);
	});

	it('a password row without a hash is not a sign-in method', () => {
		const { hasPassword, data } = summarizeConnectedAccounts([
			row('credentials', 'credentials'),
			row('oidc', 'google')
		]);
		assert.equal(hasPassword, false);
		assert.equal(data[0].canDisconnect, false);
	});

	it('refuses to remove the last sign-in method', () => {
		assert.equal(wouldLeaveNoSignInMethod(false, 1), true);
		assert.equal(wouldLeaveNoSignInMethod(false, 0), true);
		assert.equal(wouldLeaveNoSignInMethod(false, 2), false);
		assert.equal(wouldLeaveNoSignInMethod(true, 1), false);
	});

	// The routes import Next.js, auth and the database and cannot be loaded under
	// `tsx --test`, so the wiring is read from source.
	describe('routes', () => {
		const read = (file: string) =>
			readFileSync(join(__dirname, '../../../app/api/auth/security/connected-accounts', file), 'utf8');

		it('the disconnect route counts and deletes oauth/oidc rows only, via the shared set', () => {
			const source = read('[provider]/route.ts');
			assert.equal(source.includes("'oauth'"), false, 'a hard-coded oauth literal is back');
			assert.equal(source.match(/inArray\(accounts\.type, \[\.\.\.OAUTH_ACCOUNT_TYPES\]\)/g)?.length, 2);
			assert.ok(source.includes('wouldLeaveNoSignInMethod(hasPassword, oauthCount)'));
		});

		it('the auth adapter records the tenant when it links an OAuth/OIDC account', () => {
			const source = readFileSync(join(__dirname, '../index.ts'), 'utf8').replace(/\s+/g, ' ');
			const start = source.indexOf('linkAccount: async');
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
			assert.ok(source.includes('summarizeConnectedAccounts(connectedAccounts)'));
		});
	});
});
