import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { providerProvenEmail, recordOAuthLinkEmail } from '../oauth-link-email';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * An OAuth / OIDC link proves a user's address to the LemonSqueezy ownership check only when its
 * row holds that address (`isEmailVerifiedForOwnership`). Auth.js's adapter writes the row without
 * one, so `events.signIn` binds it to the address the provider proved.
 */

describe('providerProvenEmail', () => {
	it('returns the trimmed, lower-cased address of the profile', () => {
		assert.equal(providerProvenEmail({ email: '  Ana@Example.COM ' }), 'ana@example.com');
		assert.equal(providerProvenEmail({ email: 'ana@example.com', email_verified: true }), 'ana@example.com');
		assert.equal(providerProvenEmail({ email: 'ana@example.com', email_verified: 'true' }), 'ana@example.com');
	});

	it('returns null when the provider says the address is not verified', () => {
		assert.equal(providerProvenEmail({ email: 'ana@example.com', email_verified: false }), null);
		// Apple sends the claim as a string.
		assert.equal(providerProvenEmail({ email: 'ana@example.com', email_verified: 'false' }), null);
		// Google's older userinfo endpoint.
		assert.equal(providerProvenEmail({ email: 'ana@example.com', verified_email: false }), null);
	});

	it('returns null without an address', () => {
		for (const profile of [
			undefined,
			null,
			'ana@example.com',
			{},
			{ email: '' },
			{ email: '   ' },
			{ email: 42 }
		]) {
			assert.equal(providerProvenEmail(profile), null);
		}
	});
});

describe('recordOAuthLinkEmail', () => {
	const recorder = () => {
		const writes: Array<[string, string, string | null]> = [];
		const write = async (provider: string, providerAccountId: string, email: string | null) => {
			writes.push([provider, providerAccountId, email]);
		};
		return { writes, write };
	};

	it('binds an OAuth or OIDC link to the address its provider proved', async () => {
		const { writes, write } = recorder();
		assert.equal(
			await recordOAuthLinkEmail(
				{ type: 'oauth', provider: 'github', providerAccountId: '42' },
				{ email: 'A@x.io' },
				write
			),
			true
		);
		assert.equal(
			await recordOAuthLinkEmail(
				{ type: 'oidc', provider: 'google', providerAccountId: 'g-1' },
				{ email: 'b@x.io', email_verified: true },
				write
			),
			true
		);
		assert.deepEqual(writes, [
			['github', '42', 'a@x.io'],
			['google', 'g-1', 'b@x.io']
		]);
	});

	it('clears the address when the provider says it is not verified, so the link vouches for nothing', async () => {
		const { writes, write } = recorder();
		await recordOAuthLinkEmail(
			{ type: 'oidc', provider: 'google', providerAccountId: 'g-1' },
			{ email: 'b@x.io', email_verified: false },
			write
		);
		assert.deepEqual(writes, [['google', 'g-1', null]]);
	});

	it('leaves the row alone when the profile reports no address (declined scope, failed email lookup)', async () => {
		const { writes, write } = recorder();
		for (const profile of [{}, { email: null }, { email: '  ' }, undefined]) {
			assert.equal(
				await recordOAuthLinkEmail(
					{ type: 'oauth', provider: 'github', providerAccountId: '42' },
					profile,
					write
				),
				false
			);
		}
		assert.deepEqual(writes, []);
	});

	it('writes nothing for other sign-ins or an account without a provider id', async () => {
		const { writes, write } = recorder();
		for (const account of [
			undefined,
			null,
			{ type: 'credentials', provider: 'credentials', providerAccountId: 'a@x.io' },
			{ type: 'email', provider: 'resend', providerAccountId: 'a@x.io' },
			{ type: 'webauthn', provider: 'passkey', providerAccountId: 'p-1' },
			{ type: 'oauth', provider: 'github', providerAccountId: '' },
			{ type: 'oauth', provider: '', providerAccountId: '42' },
			{ provider: 'github', providerAccountId: '42' }
		]) {
			assert.equal(await recordOAuthLinkEmail(account, { email: 'a@x.io' }, write), false);
		}
		assert.deepEqual(writes, []);
	});

	it('lets a failed write reach the caller, which logs it and leaves the link unproven', async () => {
		await assert.rejects(
			recordOAuthLinkEmail(
				{ type: 'oauth', provider: 'github', providerAccountId: '42' },
				{ email: 'a@x.io' },
				async () => {
					throw new Error('db down');
				}
			),
			/db down/
		);
	});
});

describe('Auth.js wiring', () => {
	const squash = (text: string) => text.replace(/\s+/g, ' ');
	const auth = squash(readFileSync(join(__dirname, '../index.ts'), 'utf8'));

	it('events.signIn records the link email on the OAuth / OIDC row of the provider account', () => {
		const start = auth.indexOf('signIn: async ({ account, profile }) => {');
		assert.ok(start >= 0, 'lib/auth/index.ts has no events.signIn handler');
		assert.ok(auth.indexOf('events: {') < start, 'the signIn handler is not in events');
		const handler = auth.slice(start, auth.indexOf('signOut: async', start));
		assert.ok(
			handler.includes('await recordOAuthLinkEmail(account, profile,'),
			'events.signIn does not record the link email'
		);
		assert.ok(handler.includes('.update(accounts) .set({ email })'), 'events.signIn does not write accounts.email');
		for (const condition of [
			'eq(accounts.provider, provider)',
			'eq(accounts.providerAccountId, providerAccountId)',
			'inArray(accounts.type, [...OAUTH_ACCOUNT_TYPES])'
		]) {
			assert.ok(handler.includes(condition), `the write is not limited by ${condition}`);
		}
		assert.ok(handler.includes('catch (error)'), 'a failed write would fail the sign-in');
	});

	it('migration 0045 forgets the addresses earlier code copied onto OAuth rows', () => {
		const migrations = join(__dirname, '../../db/migrations');
		const sql = squash(readFileSync(join(migrations, '0045_unbind_oauth_link_emails.sql'), 'utf8'));
		assert.ok(
			sql.includes(`UPDATE "accounts" SET "email" = NULL WHERE "type" IN ('oauth', 'oidc')`),
			'0045 does not clear the OAuth / OIDC link emails'
		);
		const journal = JSON.parse(readFileSync(join(migrations, 'meta/_journal.json'), 'utf8')) as {
			entries: Array<{ tag: string }>;
		};
		assert.ok(
			journal.entries.some((entry) => entry.tag === '0045_unbind_oauth_link_emails'),
			'0045 is not in the journal'
		);
	});

	it('updateUser no longer binds OAuth rows to the previous address on an email change', () => {
		const source = squash(readFileSync(join(__dirname, '../../db/queries/user.queries.ts'), 'utf8'));
		const start = source.indexOf('export async function updateUser(');
		assert.ok(start >= 0, 'updateUser is missing');
		const body = source.slice(start, source.indexOf('export async function', start + 1));
		assert.ok(body.includes('emailVerified: null'), 'updateUser keeps emailVerified when the email changes');
		assert.ok(!body.includes('.update(accounts)'), 'updateUser writes accounts rows on an email change');
	});
});
