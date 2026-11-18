import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Two password stores coexist. Client sign-in (`verifyClientPassword`) reads only the hash on
 * the user's `credentials` row in `accounts`; admin sign-in reads `users.passwordHash`. A
 * password reset or change that writes `users.passwordHash` alone leaves a client's old
 * password working and the new one rejected, so a reset after a compromise does not lock the
 * attacker out. Both paths must write through `setUserPasswordHash`, which updates the
 * credentials account. The queries, the server action and the route handler import the
 * database / Next.js and cannot be loaded under `tsx --test`, so these guards read the source.
 */
/**
 * Code only, on one line: block comments and whole-line `//` comments are dropped, since
 * comments may name the old calls when they explain the change.
 */
const code = (relative: string) =>
	readFileSync(join(__dirname, relative), 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/^\s*\/\/.*$/gm, ' ')
		.replace(/\s+/g, ' ');

const userQueries = code('../user.queries.ts');
const authActions = code('../../../../app/[locale]/auth/actions.ts');
const changePasswordRoute = code('../../../../app/api/auth/change-password/route.ts');

/** The text of one exported function, up to the next top-level export. */
const functionBody = (src: string, signature: string) => {
	const start = src.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found`);
	const next = src.indexOf(' export ', start + signature.length);
	return src.slice(start, next < 0 ? undefined : next);
};

const OAUTH_ERROR = 'Password change not available for OAuth accounts';

describe('password reset and change write the hash client sign-in reads', () => {
	it('setUserPasswordHash updates the credentials account of the user in the tenant, in one transaction', () => {
		const helper = functionBody(userQueries, 'export async function setUserPasswordHash(');
		assert.ok(helper.includes('db.transaction('), 'setUserPasswordHash does not run in a transaction');
		assert.ok(helper.includes('.update(accounts)'), 'setUserPasswordHash does not update accounts');
		assert.ok(
			helper.includes("eq(accounts.provider, 'credentials')"),
			"setUserPasswordHash does not filter accounts by provider 'credentials'"
		);
		assert.ok(
			helper.includes('eq(accounts.userId, userId)'),
			'setUserPasswordHash does not filter accounts by user'
		);
		assert.ok(
			helper.includes('eq(accounts.tenantId, tenantId)'),
			'setUserPasswordHash does not filter accounts by tenant'
		);
		assert.ok(
			/\.update\(accounts\) \.set\(\{ passwordHash: newPasswordHash/.test(helper),
			'setUserPasswordHash does not write the new hash to accounts.passwordHash'
		);
	});

	it('setUserPasswordHash updates users.passwordHash where the user already has one, or has no credentials account', () => {
		const helper = functionBody(userQueries, 'export async function setUserPasswordHash(');
		assert.ok(helper.includes('.update(users)'), 'setUserPasswordHash does not update users');
		assert.ok(
			helper.includes('updatedAccounts.length > 0 ? isNotNull(users.passwordHash) : undefined'),
			'setUserPasswordHash gives a client with a credentials account a users.passwordHash, or never writes users for a user with no credentials account'
		);
		assert.ok(helper.includes('eq(users.id, userId)'), 'setUserPasswordHash does not filter users by id');
		assert.ok(
			helper.includes('eq(users.tenantId, tenantId)'),
			'setUserPasswordHash does not filter users by tenant'
		);
	});

	it('newPasswordAction (password reset) stores the new hash with setUserPasswordHash', () => {
		const action = functionBody(authActions, 'export const newPasswordAction =');
		assert.ok(
			action.includes('setUserPasswordHash(result.userId, hashedPassword)'),
			'newPasswordAction does not call setUserPasswordHash'
		);
		assert.ok(!action.includes('updateUserPassword('), 'newPasswordAction still writes users.passwordHash only');
		assert.ok(!action.includes('.update(users)'), 'newPasswordAction updates users directly');
	});

	it('the change-password route stores the new hash with setUserPasswordHash', () => {
		const post = functionBody(changePasswordRoute, 'export async function POST(');
		assert.ok(post.includes('setUserPasswordHash('), 'POST does not call setUserPasswordHash');
		assert.ok(!post.includes('updateUserPassword('), 'POST writes users.passwordHash only');
		assert.ok(!post.includes('.update(users)'), 'POST still updates users directly');
	});

	it('the change-password route checks the current password against the hash sign-in accepts, not either store', () => {
		const post = functionBody(changePasswordRoute, 'export async function POST(');
		// The store is picked in one place, getSignInPasswordHash (see the guards below), so the
		// route, account deletion and deactivation cannot drift apart.
		assert.ok(
			post.includes('const currentHash = await getSignInPasswordHash(user);'),
			'POST does not take the current hash from getSignInPasswordHash'
		);
		assert.ok(!post.includes('.from(accounts)'), 'POST picks the password store itself');
		assert.ok(!post.includes('isUserAdmin'), 'POST runs its own role lookup to pick the password store');
		assert.ok(
			post.includes('!(await bcrypt.compare(currentPassword, currentHash))'),
			'POST does not check the current password against the sign-in hash'
		);
		assert.ok(!post.includes('findMatchingHash('), 'POST accepts a match in either password store');
		assert.ok(
			post.includes('bcrypt.compare(newPassword, currentHash)'),
			'POST does not run the same-password check against the sign-in hash'
		);
		assert.ok(
			!post.includes('bcrypt.compare(currentPassword, user.passwordHash)'),
			'POST still checks the current password against users.passwordHash only'
		);
	});

	it('isUserAdminOrThrow lets a lookup error through, and isUserAdmin still reads it as false', () => {
		const strict = functionBody(userQueries, 'export async function isUserAdminOrThrow(');
		assert.ok(strict.includes('eq(roles.isAdmin, true)'), 'isUserAdminOrThrow does not check the admin flag');
		assert.ok(!strict.includes('catch'), 'isUserAdminOrThrow swallows a lookup error');
		const lenient = functionBody(userQueries, 'export async function isUserAdmin(');
		assert.ok(
			lenient.includes('return await isUserAdminOrThrow(userId);'),
			'isUserAdmin does not delegate to isUserAdminOrThrow'
		);
		assert.ok(lenient.includes('return false;'), 'isUserAdmin no longer answers false on an error');
	});

	it('the change-password route answers the OAuth 400 only when neither hash exists', () => {
		const post = functionBody(changePasswordRoute, 'export async function POST(');
		const oauth = post.indexOf(OAUTH_ERROR);
		assert.ok(oauth >= 0, 'POST lost the OAuth-account answer');
		const guard = post.lastIndexOf('if (', oauth);
		// getSignInPasswordHash returns null only when the user has no hash in either store.
		assert.ok(
			post.slice(guard, oauth).startsWith('if (!currentHash)'),
			'the OAuth answer is not limited to users with no hash in either store'
		);
	});
});

/**
 * Account deletion and deactivation (the danger-zone forms) asked for the password and accepted
 * a match in either store: `verifyClientPassword(...) || comparePasswords(password,
 * dbUser.passwordHash)`. Before #1140, resets and changes wrote `users.passwordHash` only, so
 * deployed databases still hold stale hashes in the other store: a seeded admin who changed the
 * seed password keeps the seed hash on their credentials row. Anyone holding that admin's
 * session could delete or deactivate the account with the old default password. Every check of
 * a password a signed-in user submits must use the one hash sign-in accepts.
 */
describe('confirming a sensitive action checks the one hash sign-in accepts', () => {
	const DANGER_ZONE_ACTIONS = ['export const deleteAccount =', 'export const deactivateAccount ='];

	it('getSignInPasswordHash returns users.passwordHash for an admin that has one, and the credentials account hash otherwise', () => {
		const helper = functionBody(userQueries, 'export async function getSignInPasswordHash(');
		// Sign-in (lib/auth/credentials.ts): an admin with users.passwordHash signs in with that
		// hash only; everyone else with the hash on their credentials row in accounts.
		assert.ok(
			helper.includes(
				'if (user.passwordHash && (await isUserAdminOrThrow(user.id))) { return user.passwordHash; }'
			),
			'getSignInPasswordHash does not return users.passwordHash for an admin that has one'
		);
		assert.ok(helper.includes('.from(accounts)'), 'getSignInPasswordHash does not read the credentials account');
		assert.ok(
			helper.includes("eq(accounts.provider, 'credentials')"),
			"getSignInPasswordHash does not filter accounts by provider 'credentials'"
		);
		assert.ok(
			helper.includes('eq(accounts.userId, user.id)'),
			'getSignInPasswordHash does not read the account of this user'
		);
		assert.ok(
			helper.includes('eq(accounts.tenantId, tenantId)'),
			'getSignInPasswordHash does not read the account of this tenant'
		);
		// users.passwordHash only when there is no credentials account hash: then it is the only
		// hash the user has, and null means no password at all (OAuth only).
		assert.ok(
			helper.includes('return credentialsAccount?.passwordHash ?? user.passwordHash;'),
			'getSignInPasswordHash does not prefer the credentials account hash for a non-admin'
		);
	});

	it('getSignInPasswordHash fails closed when the role lookup errors', () => {
		const helper = functionBody(userQueries, 'export async function getSignInPasswordHash(');
		// isUserAdmin reads a database error as "not an admin", which would check an admin
		// against the (possibly stale) credentials account hash.
		assert.ok(!helper.includes('isUserAdmin('), 'getSignInPasswordHash reads a lookup error as "not an admin"');
		assert.ok(!helper.includes('catch'), 'getSignInPasswordHash swallows a lookup error');
		assert.ok(
			helper.includes("if (!tenantId) throw new Error('Tenant ID not found');"),
			'getSignInPasswordHash does not refuse a missing tenant'
		);
	});

	for (const signature of DANGER_ZONE_ACTIONS) {
		const name = signature.replace('export const ', '').replace(' =', '');

		it(`${name} checks the password against getSignInPasswordHash`, () => {
			const action = functionBody(authActions, signature);
			assert.ok(
				action.includes(
					'const isPasswordValid = await comparePasswords(password, await getSignInPasswordHash(dbUser));'
				),
				`${name} does not check the password against the hash sign-in accepts`
			);
		});

		it(`${name} no longer accepts a match in either password store`, () => {
			const action = functionBody(authActions, signature);
			// develop had `const isClientPasswordValid = await verifyClientPassword(user.email!, password);`
			// then `isClientPasswordValid || (await comparePasswords(password, dbUser.passwordHash))`.
			assert.ok(
				!/\|\|\s*\(?\s*await comparePasswords\(/.test(action),
				`${name} still accepts verifyClientPassword(...) || comparePasswords(...)`
			);
			assert.ok(
				!action.includes('verifyClientPassword('),
				`${name} still checks the credentials account by email`
			);
			assert.ok(
				!action.includes('comparePasswords(password, dbUser.passwordHash)'),
				`${name} still checks users.passwordHash for every user`
			);
		});
	}

	it('updatePassword checks the hash sign-in accepts and writes with setUserPasswordHash', () => {
		const action = functionBody(authActions, 'export const updatePassword =');
		assert.ok(
			action.includes('comparePasswords(currentPassword, await getSignInPasswordHash(dbUser))'),
			'updatePassword does not check the current password against the hash sign-in accepts'
		);
		assert.ok(
			!action.includes('comparePasswords(currentPassword, dbUser.passwordHash)'),
			'updatePassword still checks users.passwordHash for every user'
		);
		assert.ok(
			action.includes('setUserPasswordHash(dbUser.id, newPasswordHash)'),
			'updatePassword does not write through setUserPasswordHash'
		);
		assert.ok(!action.includes('updateUserPassword('), 'updatePassword still writes users.passwordHash only');
	});
});
