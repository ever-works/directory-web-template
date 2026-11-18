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
 * change, binds a credentials session to the `password_changed_at` value read with the hash it
 * checked (other sign-ins to their sign-in time), and makes the jwt callback end a session once
 * the password changed after it signed in.
 *
 * `sessionPredatesPasswordChange`, `signInPasswordVersion` and `passwordVersionOf` are pure and
 * are tested directly. `lib/auth/index.ts`, the queries
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

type Claims = { signedInAt?: unknown; passwordVersion?: unknown };
type Predicate = (session: Claims, passwordChangedAt: Date | null | undefined) => boolean;
type Version = (fromAuthorize: unknown) => number | null | undefined;
type VersionOf = (passwordChangedAt: Date | null | undefined) => number | null;

/** Loaded per test, so a missing module fails each test on its own. */
const loadPredicate = async (): Promise<Predicate> => {
	const mod = (await import('../password-change')) as { sessionPredatesPasswordChange?: Predicate };
	assert.equal(typeof mod.sessionPredatesPasswordChange, 'function', 'sessionPredatesPasswordChange is not exported');
	return mod.sessionPredatesPasswordChange!;
};

const loadUnreadable = async (): Promise<symbol> => {
	const mod = (await import('../password-change')) as { PASSWORD_CHANGE_UNREADABLE?: symbol };
	assert.equal(typeof mod.PASSWORD_CHANGE_UNREADABLE, 'symbol', 'PASSWORD_CHANGE_UNREADABLE is not exported');
	return mod.PASSWORD_CHANGE_UNREADABLE!;
};

const loadVersion = async (): Promise<Version> => {
	const mod = (await import('../password-change')) as { signInPasswordVersion?: Version };
	assert.equal(typeof mod.signInPasswordVersion, 'function', 'signInPasswordVersion is not exported');
	return mod.signInPasswordVersion!;
};

const loadVersionOf = async (): Promise<VersionOf> => {
	const mod = (await import('../password-change')) as { passwordVersionOf?: VersionOf };
	assert.equal(typeof mod.passwordVersionOf, 'function', 'passwordVersionOf is not exported');
	return mod.passwordVersionOf!;
};

const SIGNED_IN = Date.UTC(2026, 10, 1, 12, 0, 0);

describe('sessionPredatesPasswordChange: sign-ins that checked no password (signedInAt only)', () => {
	it('CONTROL: keeps a session when the password was never changed', async () => {
		const predates = await loadPredicate();
		assert.equal(predates({ signedInAt: SIGNED_IN }, null), false);
		assert.equal(predates({ signedInAt: SIGNED_IN }, undefined), false);
		assert.equal(predates({}, null), false, 'a token from before stamping must survive while nothing changed');
	});

	it('ends a session that signed in before the password was reset or changed', async () => {
		const predates = await loadPredicate();
		assert.equal(predates({ signedInAt: SIGNED_IN }, new Date(SIGNED_IN + 1)), true);
		assert.equal(predates({ signedInAt: SIGNED_IN }, new Date(SIGNED_IN + 24 * 60 * 60 * 1000)), true);
	});

	it('keeps a session that signed in after the change', async () => {
		const predates = await loadPredicate();
		assert.equal(predates({ signedInAt: SIGNED_IN }, new Date(SIGNED_IN - 1)), false);
		assert.equal(predates({ signedInAt: SIGNED_IN }, new Date(SIGNED_IN)), false);
	});

	it('ends a session with no sign-in stamp once the password has changed', async () => {
		const predates = await loadPredicate();
		const changed = new Date(SIGNED_IN);
		assert.equal(predates({}, changed), true);
		assert.equal(predates({ signedInAt: null }, changed), true);
		assert.equal(
			predates({ signedInAt: String(SIGNED_IN + 1000) }, changed),
			true,
			'a stamp that is not a number is no stamp'
		);
		assert.equal(predates({ signedInAt: Number.NaN }, changed), true);
	});

	it('ends a session when password_changed_at could not be read (fails closed)', async () => {
		const [predates, unreadable] = await Promise.all([loadPredicate(), loadUnreadable()]);
		const check = predates as (session: Claims, passwordChangedAt: unknown) => boolean;
		// A database error must not read as "never changed": a reset after a password theft would
		// then be undone for the stolen session for as long as the read fails.
		assert.equal(check({ signedInAt: SIGNED_IN }, unreadable), true, 'a failed read keeps the session');
		assert.equal(check({}, unreadable), true, 'a failed read keeps a session with no stamp');
		assert.equal(
			check({ signedInAt: Number.MAX_SAFE_INTEGER }, unreadable),
			true,
			'a failed read keeps a newer session'
		);
		assert.equal(
			check({ signedInAt: SIGNED_IN, passwordVersion: null }, unreadable),
			true,
			'a failed read keeps a credentials session'
		);
	});
});

describe('sessionPredatesPasswordChange: credentials sign-ins (bound to the password version)', () => {
	it('CONTROL: keeps a session while the password version it signed in with is current', async () => {
		const predates = await loadPredicate();
		assert.equal(predates({ signedInAt: SIGNED_IN, passwordVersion: null }, null), false);
		assert.equal(predates({ signedInAt: SIGNED_IN, passwordVersion: null }, undefined), false, 'no users row');
		const changed = new Date(SIGNED_IN - 60_000);
		assert.equal(predates({ signedInAt: SIGNED_IN, passwordVersion: changed.getTime() }, changed), false);
	});

	it('ends the session once the password version changes', async () => {
		const predates = await loadPredicate();
		assert.equal(predates({ signedInAt: SIGNED_IN, passwordVersion: null }, new Date(SIGNED_IN + 1)), true);
		const earlier = SIGNED_IN - 60_000;
		assert.equal(predates({ signedInAt: SIGNED_IN, passwordVersion: earlier }, new Date(SIGNED_IN + 1)), true);
		// The version decides, not the clocks: a version that differs ends the session even when
		// the change looks older than the sign-in.
		assert.equal(predates({ signedInAt: SIGNED_IN, passwordVersion: earlier }, new Date(SIGNED_IN - 1)), true);
		assert.equal(predates({ signedInAt: SIGNED_IN, passwordVersion: Number.NaN }, null), true);
		assert.equal(predates({ signedInAt: SIGNED_IN, passwordVersion: String(earlier) }, new Date(earlier)), true);
	});

	it('REGRESSION: ends a sign-in that read the old hash after the change took its time, before it committed', async () => {
		const [predates, versionOf] = await Promise.all([loadPredicate(), loadVersionOf()]);
		// setUserPasswordHash takes changedAt = +100 and commits at +105. A sign-in starts at +101,
		// and its query, before the commit, reads the OLD hash with the old password_changed_at
		// (null: never changed). The old password passes bcrypt; the jwt callback runs at +106.
		const changedAt = new Date(SIGNED_IN + 100);
		const oldPasswordSignIn = { signedInAt: SIGNED_IN + 106, passwordVersion: versionOf(null) };
		assert.equal(
			predates(oldPasswordSignIn, changedAt),
			true,
			'the session that proved the old password survives the change'
		);
		// The same race against a later change: the old version is the first change's time.
		const secondChange = new Date(SIGNED_IN + 200);
		assert.equal(
			predates({ signedInAt: SIGNED_IN + 206, passwordVersion: versionOf(changedAt) }, secondChange),
			true
		);
		// A sign-in whose query ran after the commit read the new hash with the new version: kept.
		const newPasswordSignIn = { signedInAt: SIGNED_IN + 110, passwordVersion: versionOf(changedAt) };
		assert.equal(predates(newPasswordSignIn, changedAt), false, 'a sign-in with the new password is ended');
	});
});

describe('signInPasswordVersion and passwordVersionOf', () => {
	it('stores what authorize read: a version or null', async () => {
		const version = await loadVersion();
		assert.equal(version(SIGNED_IN), SIGNED_IN);
		assert.equal(version(null), null, 'a password never changed is version null, not "no version"');
	});

	it('CONTROL: a sign-in that checked no password (OAuth, email link) gets no version', async () => {
		const version = await loadVersion();
		assert.equal(version(undefined), undefined);
		assert.equal(version(String(SIGNED_IN)), undefined);
		assert.equal(version(Number.NaN), undefined);
	});

	it('passwordVersionOf is password_changed_at in ms, or null', async () => {
		const versionOf = await loadVersionOf();
		assert.equal(versionOf(new Date(SIGNED_IN)), SIGNED_IN);
		assert.equal(versionOf(null), null);
		assert.equal(versionOf(undefined), null);
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
		// The definition after the column name must be a bare timestamp: NOT NULL cannot be added to
		// a populated users table without values, and a default would backfill every row, which ends
		// every session issued before the release (migration 0043 leaves the rows NULL on purpose).
		const columnDefinition = (sql: string) =>
			/ALTER TABLE "users" ADD COLUMN (?:IF NOT EXISTS )?"password_changed_at"([^;]*);/.exec(sql)?.[1].trim();
		const BARE_TIMESTAMP = /^timestamp(?: with(?:out)? time zone)?$/i;
		for (const rejected of ['timestamp NOT NULL', 'timestamp DEFAULT now()', 'timestamp DEFAULT now() NOT NULL']) {
			const definition = columnDefinition(
				`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" ${rejected};`
			);
			assert.equal(definition, rejected, `the column definition is not read whole: ${rejected}`);
			assert.doesNotMatch(definition, BARE_TIMESTAMP, `the check accepts ${rejected}`);
		}
		const migrations = join(WEB, 'lib/db/migrations');
		const adding = readdirSync(migrations)
			.filter((name) => name.endsWith('.sql'))
			.filter((name) => columnDefinition(readFileSync(join(migrations, name), 'utf8')) !== undefined);
		assert.equal(adding.length, 1, 'no migration (or more than one) adds users.password_changed_at');
		assert.match(
			columnDefinition(readFileSync(join(migrations, adding[0]), 'utf8')) ?? '',
			BARE_TIMESTAMP,
			'the migration does not add users.password_changed_at as a nullable timestamp without a default'
		);
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
		// Taken after the hash updates hold the row locks, right before the stamp, so a concurrent
		// change that commits later stamps a later time (a different password version).
		const changedAtIndex = helper.indexOf('const changedAt = new Date();');
		// indexOf answers -1 for a missing update, which would pass the ordering check below.
		const accountsUpdate = helper.indexOf('.update(accounts)');
		const usersHashUpdate = helper.indexOf('.set({ passwordHash: newPasswordHash, updatedAt:');
		assert.ok(accountsUpdate >= 0, 'setUserPasswordHash no longer updates the credentials account hash');
		assert.ok(usersHashUpdate >= 0, 'setUserPasswordHash no longer updates users.passwordHash');
		assert.ok(
			changedAtIndex > accountsUpdate && changedAtIndex > usersHashUpdate && changedAtIndex < stamp,
			'the change time is not taken after the hash updates, right before the stamp'
		);
	});

	it('the credentials authorize returns the password version read in the same query as the hash it checks', () => {
		const src = code('lib/auth/credentials.ts');
		const start = src.indexOf('authorize: async (credentials) => {');
		assert.ok(start >= 0, 'authorize not found');
		const authorize = src.slice(start);
		// Admin: getUserByEmail reads the whole users row, hash and password_changed_at together.
		assert.ok(
			authorize.includes('passwordVersion: passwordVersionOf(foundUser.passwordChangedAt)'),
			'the admin user does not carry the version read with users.passwordHash'
		);
		const getUserByEmail = functionBody(
			code('lib/db/queries/user.queries.ts'),
			'export async function getUserByEmail('
		);
		assert.ok(
			getUserByEmail.includes('.select() .from(users)'),
			'getUserByEmail no longer reads the hash and password_changed_at in one row read'
		);
		// Client: the hash lives on accounts, so the check joins users in the same statement.
		assert.ok(
			authorize.includes('const clientPassword = await verifyClientPasswordForSignIn(email, password);'),
			'the client password is not checked with verifyClientPasswordForSignIn'
		);
		assert.ok(
			!authorize.includes('verifyClientPassword('),
			'authorize checks a client password without reading its version'
		);
		assert.ok(
			authorize.includes('passwordVersion: passwordVersionOf(clientPassword.passwordChangedAt)'),
			'the client user does not carry the version read with the credentials account hash'
		);
		// The sign-in identity is the account whose hash matched, from the same row, not the
		// account a separate lookup by email found (the email can move between the two statements).
		assert.ok(
			authorize.includes('getClientProfileByUserId(clientPassword.userId)'),
			'the client profile is not loaded for the account whose password was checked'
		);
		assert.ok(
			!authorize.includes('clientAccount.userId'),
			'authorize takes the client identity from the separate lookup by email'
		);
		const returned = authorize.match(/passwordVersion: passwordVersionOf\(/g) ?? [];
		assert.equal(returned.length, 2, 'the admin and the client user do not both carry a password version');
		const verify = functionBody(
			code('lib/db/queries/client.queries.ts'),
			'export async function verifyClientPasswordForSignIn('
		);
		assert.ok(
			verify.includes(
				'.select({ userId: accounts.userId, passwordHash: accounts.passwordHash, passwordChangedAt: users.passwordChangedAt }) .from(accounts) .leftJoin(users, eq(users.id, accounts.userId))'
			),
			'verifyClientPasswordForSignIn does not read the account, the hash and password_changed_at in one statement'
		);
		assert.ok(
			verify.includes('const valid = await comparePasswords(password, account.passwordHash); if (!valid) {'),
			'verifyClientPasswordForSignIn does not check the hash it read'
		);
		assert.ok(
			verify.includes(
				'return { valid, userId: account.userId, passwordChangedAt: account.passwordChangedAt ?? null };'
			),
			'verifyClientPasswordForSignIn does not return the account and the version read with the hash'
		);
	});

	it('the jwt callback stamps the sign-in only when a user signs in', () => {
		const jwt = jwtCallback();
		assert.ok(
			jwt.includes(
				'if (user) { token.signedInAt = Date.now(); const passwordVersion = signInPasswordVersion(extendedUser?.passwordVersion); if (passwordVersion !== undefined) { token.passwordVersion = passwordVersion; } }'
			),
			'the sign-in time and the password version are not stamped on sign-in'
		);
		const writes = jwt.match(/token\.signedInAt =/g) ?? [];
		assert.equal(writes.length, 1, 'token.signedInAt is written somewhere other than on sign-in');
		const versionWrites = jwt.match(/token\.passwordVersion =/g) ?? [];
		assert.equal(versionWrites.length, 1, 'token.passwordVersion is written somewhere other than on sign-in');
		// `trigger: 'update'` carries data the browser sends; it must never move the stamp.
		assert.ok(!/signedInAt[^;]*session\./.test(jwt), 'the stamp is taken from update data');
		assert.ok(!/passwordVersion[^;]*session\./.test(jwt), 'the password version is taken from update data');
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
			/if \(sessionPredatesPasswordChange\(token, passwordChangedAt\)\) \{ return null; \}/.test(branch),
			'the refresh branch does not end (return null for) a session older than the password change'
		);
		assert.ok(
			code('lib/auth/index.ts').includes(
				"import { PASSWORD_CHANGE_UNREADABLE, sessionPredatesPasswordChange, signInPasswordVersion, type PasswordChangeRead } from './password-change';"
			),
			'lib/auth/index.ts does not import PASSWORD_CHANGE_UNREADABLE, sessionPredatesPasswordChange and signInPasswordVersion'
		);
	});

	it('the jwt callback ends the session when the password_changed_at read fails', () => {
		const jwt = jwtCallback();
		const refresh = jwt.indexOf('if (!user && token.userId && isDatabaseAvailable) {');
		assert.ok(refresh >= 0, 'the refresh branch is gone');
		const branch = jwt.slice(refresh, jwt.indexOf('if (sessionPredatesPasswordChange(', refresh));
		assert.ok(
			branch.includes('let passwordChangedAt: PasswordChangeRead;'),
			'passwordChangedAt cannot hold a failed read'
		);
		// The catch of the refresh query must mark the read as failed; leaving it undefined reads as
		// "never changed" and keeps the session (fails open).
		assert.ok(
			/\} catch \(error\) \{ passwordChangedAt = PASSWORD_CHANGE_UNREADABLE;/.test(branch),
			'a database error while reading password_changed_at keeps the session'
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
		// SECURITY_QUERY_KEYS (hooks/use-security-settings.ts) are all under "security".
		assert.ok(
			success.includes('queryClient.removeQueries({ queryKey: ["security"] });'),
			'a successful change leaves the security queries in the cache'
		);
		assert.ok(
			code('hooks/use-security-settings.ts').includes('settings: ["security", "settings"]'),
			'the security settings key is no longer under "security"'
		);
	});

	it('the proxy does not bounce a session away from /auth/signin or the reset page', () => {
		const proxy = code('proxy.ts');
		const start = proxy.indexOf("if (pathWithoutLocale.startsWith('/auth/')) {");
		assert.ok(start >= 0, 'the /auth/* redirect in proxy.ts not found');
		// /auth/new-password is the page the reset email links to.
		assert.ok(
			code('lib/mail/index.ts').includes('/auth/new-password?token=${token}'),
			'the reset link no longer opens /auth/new-password'
		);
		assert.ok(
			proxy.includes(
				"const keepSessionOnPage = pathWithoutLocale === '/auth/signin' || pathWithoutLocale === '/auth/new-password';"
			),
			'the proxy has no /auth/signin and /auth/new-password exception'
		);
		const branch = proxy.slice(start);
		const bounces =
			branch.match(/const token = await getToken\(\{ req, secret: authSecret[^}]*\}\); if \(token[^)]*\)/g) ?? [];
		assert.equal(bounces.length, 2, 'the next-auth and both branches were not both found');
		for (const bounce of bounces) {
			assert.ok(bounce.endsWith('if (token && !keepSessionOnPage)'), `bounces from a kept page: ${bounce}`);
		}
	});

	it("with provider 'both', the sign-in check reads the NextAuth cookie the request protocol selects", () => {
		const proxy = code('proxy.ts');
		assert.ok(
			proxy.includes(
				"function isSecureRequest(req: NextRequest): boolean { return req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'; }"
			),
			'isSecureRequest does not read the protocol and x-forwarded-proto'
		);
		// The /client/* guard (decodeAuthJsToken) and the sign-in check use the same setting.
		assert.ok(proxy.includes('const isSecure = isSecureRequest(req);'), 'decodeAuthJsToken does not use isSecureRequest');
		const start = proxy.indexOf("if (pathWithoutLocale.startsWith('/auth/')) {");
		const both = proxy.indexOf("} else if (cfg.provider === 'both') {", start);
		assert.ok(start >= 0 && both > start, "the 'both' branch of the /auth/* redirect not found");
		// Without secureCookie getToken reads only the unprefixed cookie, so over HTTPS it misses
		// `__Secure-authjs.session-token` and a Supabase user is sent to the dashboard.
		assert.ok(
			proxy
				.slice(both)
				.includes('const token = await getToken({ req, secret: authSecret, secureCookie: isSecureRequest(req) });'),
			"the 'both' sign-in check does not read the __Secure- cookie over HTTPS"
		);
	});

	it("with provider 'both', /auth/signin renders for a NextAuth token and for a Supabase user without one", () => {
		const proxy = code('proxy.ts');
		const start = proxy.indexOf("if (pathWithoutLocale.startsWith('/auth/')) {");
		assert.ok(start >= 0, 'the /auth/* redirect in proxy.ts not found');
		const both = proxy.indexOf("} else if (cfg.provider === 'both') {", start);
		assert.ok(both > start, "the 'both' branch of the /auth/* redirect not found");
		const branch = proxy.slice(both);
		// An ended NextAuth token still decodes, and after a change the hook signs NextAuth out
		// while Supabase keeps its user. The dashboard reads only auth() and sends both back to
		// /auth/signin, so a redirect to the dashboard from there loops either way.
		const bounce = branch.indexOf('if (token && !keepSessionOnPage)');
		const keep = branch.indexOf('if (keepSessionOnPage) { return intlResponse; }');
		const supabase = branch.indexOf('.auth.getUser()');
		const supabaseRedirect = branch.indexOf("const target = isAdmin ? '/admin' : '/client/dashboard';");
		assert.ok(bounce >= 0, "the 'both' branch no longer bounces a NextAuth token from other /auth/* pages");
		assert.ok(keep >= 0, "the 'both' branch does not render the kept pages whatever the session");
		assert.ok(supabase >= 0 && supabaseRedirect > supabase, "the 'both' branch Supabase redirect not found");
		assert.ok(
			bounce < keep && keep < supabase,
			'a kept page (a NextAuth token, or a Supabase user without one) reaches the Supabase redirect'
		);
		// The early return must not depend on a NextAuth token, or a Supabase user without one loops.
		assert.ok(
			!branch.slice(bounce, supabase).includes('if (token) { return intlResponse; }'),
			'only a NextAuth token skips the Supabase redirect on /auth/signin'
		);
	});
});
