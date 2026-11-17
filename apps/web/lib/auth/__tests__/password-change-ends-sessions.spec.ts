import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Sessions are JWTs that live for 30 days, and the server had no way to end one early. A password
 * reset or change did not end the sessions already signed in, so a reset after a password theft
 * left the attacker signed in. The fix stamps `users.password_changed_at` on every reset and
 * change, stamps the sign-in time on the token, and makes the jwt callback end a session that
 * signed in before the last change.
 *
 * `sessionPredatesPasswordChange` is pure and is tested directly. `lib/auth/index.ts`, the queries
 * and the route handler import NextAuth, the database or Next.js and cannot be loaded under
 * `tsx --test`, so those guards read the source (same approach as
 * `lib/db/queries/__tests__/password-store.spec.ts`).
 */

const WEB = join(__dirname, '../../..');

/**
 * Code only, on one line: block comments and whole-line `//` comments are dropped, since
 * comments may name the old calls when they explain the change.
 */
const code = (relative: string) =>
	readFileSync(join(WEB, relative), 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/^\s*\/\/.*$/gm, ' ')
		.replace(/\s+/g, ' ');

/** The text of one exported function, up to the next top-level export. */
const functionBody = (src: string, signature: string) => {
	const start = src.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found`);
	const next = src.indexOf(' export ', start + signature.length);
	return src.slice(start, next < 0 ? undefined : next);
};

/** The jwt callback of the NextAuth config, up to the session callback that follows it. */
const jwtCallback = () => {
	const src = code('lib/auth/index.ts');
	const start = src.indexOf('jwt: async (');
	assert.ok(start >= 0, 'jwt callback not found');
	const end = src.indexOf('session: async (', start);
	assert.ok(end > start, 'session callback after the jwt callback not found');
	return src.slice(start, end);
};

type Predicate = (signedInAt: unknown, passwordChangedAt: Date | null | undefined) => boolean;

/** Loaded per test, so a missing module fails each test on its own. */
const loadPredicate = async (): Promise<Predicate> => {
	const mod = (await import('../password-change')) as { sessionPredatesPasswordChange?: Predicate };
	assert.equal(typeof mod.sessionPredatesPasswordChange, 'function', 'sessionPredatesPasswordChange is not exported');
	return mod.sessionPredatesPasswordChange!;
};

const SIGNED_IN = Date.UTC(2026, 10, 1, 12, 0, 0);

describe('sessionPredatesPasswordChange', () => {
	it('CONTROL: keeps a session when the password was never changed', async () => {
		const predates = await loadPredicate();
		assert.equal(predates(SIGNED_IN, null), false);
		assert.equal(predates(SIGNED_IN, undefined), false);
		assert.equal(
			predates(undefined, null),
			false,
			'a token from before stamping must survive while nothing changed'
		);
	});

	it('ends a session that signed in before the password was reset or changed', async () => {
		const predates = await loadPredicate();
		assert.equal(predates(SIGNED_IN, new Date(SIGNED_IN + 1)), true);
		assert.equal(predates(SIGNED_IN, new Date(SIGNED_IN + 24 * 60 * 60 * 1000)), true);
	});

	it('keeps a session that signed in with the new password, after the change', async () => {
		const predates = await loadPredicate();
		assert.equal(predates(SIGNED_IN, new Date(SIGNED_IN - 1)), false);
		assert.equal(predates(SIGNED_IN, new Date(SIGNED_IN)), false);
	});

	it('ends a session with no sign-in stamp once the password has changed', async () => {
		const predates = await loadPredicate();
		const changed = new Date(SIGNED_IN);
		assert.equal(predates(undefined, changed), true);
		assert.equal(predates(null, changed), true);
		assert.equal(predates(String(SIGNED_IN + 1000), changed), true, 'a stamp that is not a number is no stamp');
		assert.equal(predates(Number.NaN, changed), true);
	});
});

describe('a password reset or change ends the sessions signed in before it', () => {
	it('users has a nullable password_changed_at column, added by a migration', () => {
		const schema = code('lib/db/schema.ts');
		const start = schema.indexOf("export const users = pgTable( 'users',");
		assert.ok(start >= 0, 'users table not found');
		const table = schema.slice(start, schema.indexOf('export const ', start + 1));
		assert.ok(
			/passwordChangedAt: timestamp\('password_changed_at'\)(?!\.notNull)/.test(table),
			'users has no nullable passwordChangedAt column'
		);
		const migrations = join(WEB, 'lib/db/migrations');
		const adding = readdirSync(migrations)
			.filter((name) => name.endsWith('.sql'))
			.filter((name) =>
				/ALTER TABLE "users" ADD COLUMN (IF NOT EXISTS )?"password_changed_at" timestamp/.test(
					readFileSync(join(migrations, name), 'utf8')
				)
			);
		assert.equal(adding.length, 1, 'no migration (or more than one) adds users.password_changed_at');
		const journal = readFileSync(join(migrations, 'meta/_journal.json'), 'utf8');
		assert.ok(
			journal.includes(`"tag": "${adding[0].replace(/\.sql$/, '')}"`),
			'the password_changed_at migration is not in the drizzle journal'
		);
	});

	it('setUserPasswordHash stamps password_changed_at in its transaction, for admins and clients', () => {
		const helper = functionBody(
			code('lib/db/queries/user.queries.ts'),
			'export async function setUserPasswordHash('
		);
		const tx = helper.indexOf('db.transaction(');
		assert.ok(tx >= 0, 'setUserPasswordHash does not run in a transaction');
		const stamp = helper.indexOf('passwordChangedAt: changedAt');
		assert.ok(stamp > tx, 'setUserPasswordHash does not set passwordChangedAt inside the transaction');
		// A client's users row holds no hash, so the hash update skips it. The stamp must not be
		// tied to that condition, or a client reset would end nothing.
		assert.ok(
			helper.includes(
				'tx .update(users) .set({ passwordChangedAt: changedAt }) .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))'
			),
			'setUserPasswordHash does not stamp the users row of every user, whatever store holds the hash'
		);
		assert.ok(helper.includes('const changedAt = new Date();'), 'the change time is not taken once, as now');
	});

	it('the jwt callback stamps the sign-in time only when a user signs in', () => {
		const jwt = jwtCallback();
		assert.ok(
			jwt.includes('if (user) { token.signedInAt = Date.now(); }'),
			'the sign-in time is not stamped on sign-in'
		);
		const writes = jwt.match(/token\.signedInAt =/g) ?? [];
		assert.equal(writes.length, 1, 'token.signedInAt is written somewhere other than on sign-in');
		// `trigger: 'update'` carries data the browser sends; it must never move the stamp.
		assert.ok(!/signedInAt[^;]*session\./.test(jwt), 'the stamp is taken from update data');
		assert.ok(!jwt.includes('token.iat'), 'the callback reads iat, which Auth.js re-issues on refresh');
	});

	it('the jwt callback reads password_changed_at with deactivatedAt on refresh and ends an older session', () => {
		const jwt = jwtCallback();
		const refresh = jwt.indexOf('if (!user && token.userId && isDatabaseAvailable) {');
		assert.ok(refresh >= 0, 'the refresh branch is gone');
		const branch = jwt.slice(refresh);
		assert.ok(
			branch.includes(
				'.select({ deactivatedAt: users.deactivatedAt, passwordChangedAt: users.passwordChangedAt })'
			),
			'the refresh query does not read passwordChangedAt with deactivatedAt'
		);
		assert.ok(
			/if \(sessionPredatesPasswordChange\(token\.signedInAt, passwordChangedAt\)\) \{ return null; \}/.test(
				branch
			),
			'the refresh branch does not end (return null for) a session older than the password change'
		);
		assert.ok(
			code('lib/auth/index.ts').includes("import { sessionPredatesPasswordChange } from './password-change';"),
			'lib/auth/index.ts does not import sessionPredatesPasswordChange'
		);
	});

	it('the security settings route returns password_changed_at as lastPasswordChange', () => {
		const route = code('app/api/auth/security/settings/route.ts');
		assert.ok(
			route.includes('passwordChangedAt: users.passwordChangedAt'),
			'the security settings route does not read passwordChangedAt'
		);
		assert.ok(
			route.includes('lastPasswordChange: user.passwordChangedAt?.toISOString() ?? null'),
			'lastPasswordChange is not users.password_changed_at'
		);
		assert.ok(!route.includes('user.updatedAt'), 'lastPasswordChange still reports users.updated_at');
	});

	it('after a password change the client signs out and is sent to sign in', () => {
		const hook = code('hooks/use-change-password.ts');
		const onSuccess = hook.indexOf('onSuccess:');
		const onError = hook.indexOf('onError:', onSuccess);
		assert.ok(onSuccess >= 0 && onError > onSuccess, 'onSuccess not found');
		const success = hook.slice(onSuccess, onError);
		assert.ok(hook.includes('import { signOut } from "next-auth/react";'), 'the hook does not import signOut');
		assert.ok(success.includes('await signOut({ redirect: false });'), 'a successful change does not sign out');
		assert.ok(success.includes('router.replace("/auth/signin");'), 'a successful change does not go to sign in');
	});
});
