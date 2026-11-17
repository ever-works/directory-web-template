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

	it('setUserPasswordHash updates users.passwordHash only where the user already has one (the admin case)', () => {
		const helper = functionBody(userQueries, 'export async function setUserPasswordHash(');
		assert.ok(helper.includes('.update(users)'), 'setUserPasswordHash does not update users');
		assert.ok(
			helper.includes('isNotNull(users.passwordHash)'),
			'setUserPasswordHash writes users.passwordHash for users that have none'
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

	it('the change-password route checks the credentials account hash first, then users.passwordHash', () => {
		const post = functionBody(changePasswordRoute, 'export async function POST(');
		assert.ok(post.includes('.from(accounts)'), 'POST does not read the credentials account');
		assert.ok(
			post.includes("eq(accounts.provider, 'credentials')"),
			"POST does not filter accounts by provider 'credentials'"
		);
		assert.ok(post.includes('eq(accounts.userId, user.id)'), 'POST does not read the account of this user');
		assert.ok(post.includes('eq(accounts.tenantId, tenantId)'), 'POST does not read the account of this tenant');
		assert.ok(
			post.includes('const storedHashes = [credentialsAccount?.passwordHash, user.passwordHash];') &&
				post.includes('findMatchingHash(currentPassword, storedHashes)'),
			'POST does not try the credentials account hash before users.passwordHash'
		);
		const matcher = changePasswordRoute.slice(changePasswordRoute.indexOf('async function findMatchingHash('));
		assert.ok(
			/^async function findMatchingHash\([^)]*\)[^{]*\{ for \(const hash of hashes\) \{ if \(hash && \(await bcrypt\.compare\(password, hash\)\)\) return hash; \} return null; \}/.test(
				matcher
			),
			'findMatchingHash no longer returns the first stored hash the password matches'
		);
		assert.ok(
			post.includes('bcrypt.compare(newPassword, currentHash)'),
			'POST does not run the same-password check against the hash the current password matched'
		);
		assert.ok(
			!post.includes('bcrypt.compare(currentPassword, user.passwordHash)'),
			'POST still checks the current password against users.passwordHash only'
		);
	});

	it('the change-password route answers the OAuth 400 only when neither hash exists', () => {
		const post = functionBody(changePasswordRoute, 'export async function POST(');
		const oauth = post.indexOf(OAUTH_ERROR);
		assert.ok(oauth >= 0, 'POST lost the OAuth-account answer');
		const guard = post.lastIndexOf('if (', oauth);
		assert.ok(
			post.slice(guard, oauth).startsWith('if (!credentialsAccount?.passwordHash && !user.passwordHash)'),
			'the OAuth answer is not limited to users with no hash in either store'
		);
	});
});
