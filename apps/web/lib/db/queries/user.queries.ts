import { eq, sql, and, inArray, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../drizzle';
import { users, clientProfiles, accounts, roles, userRoles, type NewUser, type User } from '../schema';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * Get user by email address
 * @param email - User email
 * @returns User object or null if not found
 */
export async function getUserByEmail(email: string): Promise<User | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	// Check if DATABASE_URL is set
	if (!process.env.DATABASE_URL) {
		console.warn('DATABASE_URL is not set. User validation is disabled.');
		return null;
	}

	try {
		const usersList = await db
			.select()
			.from(users)
			.where(and(eq(users.email, email), eq(users.tenantId, tenantId)))
			.limit(1);

		if (usersList.length === 0) {
			console.warn('User validation failed: No user found for the given email');
			return null;
		}

		return usersList[0];
	} catch (error) {
		// Only catch actual database errors
		console.error('Database error in getUserByEmail:', error);
		return null;
	}
}

/**
 * Get user by ID
 * @param id - User ID
 * @returns User object or null if not found
 */
export async function getUserById(id: string): Promise<User | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	if (!process.env.DATABASE_URL) {
		console.warn('DATABASE_URL is not set. User validation is disabled.');
		return null;
	}

	try {
		const usersList = await db
			.select()
			.from(users)
			.where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
			.limit(1);

		if (usersList.length === 0) {
			console.warn(`User validation failed: No user found with id ${id}`);
			return null;
		}

		return usersList[0];
	} catch (error) {
		// Only catch actual database errors
		console.error('Database error in getUserById:', error);
		return null;
	}
}

/**
 * Insert a new user
 * @param user - New user data
 * @returns Created user
 */
export async function insertNewUser(user: NewUser): Promise<User[]> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	return db
		.insert(users)
		.values({ ...user, tenantId })
		.returning();
}

/**
 * Update user password
 * @param newPasswordHash - New password hash
 * @param userId - User ID
 */
export async function updateUserPassword(newPasswordHash: string, userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	return db
		.update(users)
		.set({ passwordHash: newPasswordHash })
		.where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
}

/**
 * Store a new password hash where sign-in reads it (password reset and change).
 * Client sign-in (`verifyClientPassword`) reads only the hash on the user's `credentials`
 * row in `accounts`; admin sign-in reads `users.passwordHash`. One transaction writes the
 * credentials account of this user in this tenant, and the users row only when it already
 * has a hash (the admin case), so a user without one does not gain a second password store.
 * A user with no credentials account keeps the old behaviour: the users row is written, so
 * an admin who signed up through OAuth can still set a password with a reset.
 * The same transaction stamps `users.password_changed_at` for admins and clients alike, which
 * ends every session that signed in before the change (the jwt callback in lib/auth).
 * @param userId - User ID
 * @param newPasswordHash - New password hash
 * @returns How many `accounts` and `users` rows now hold the new hash
 */
export async function setUserPasswordHash(userId: string, newPasswordHash: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	return db.transaction(async (tx) => {
		const updatedAccounts = await tx
			.update(accounts)
			.set({ passwordHash: newPasswordHash })
			.where(
				and(eq(accounts.userId, userId), eq(accounts.provider, 'credentials'), eq(accounts.tenantId, tenantId))
			)
			.returning({ userId: accounts.userId });
		const updatedUsers = await tx
			.update(users)
			.set({ passwordHash: newPasswordHash, updatedAt: new Date() })
			.where(
				and(
					eq(users.id, userId),
					eq(users.tenantId, tenantId),
					updatedAccounts.length > 0 ? isNotNull(users.passwordHash) : undefined
				)
			)
			.returning({ id: users.id });
		// Taken after the updates above hold the row locks, so a concurrent change that commits
		// later also stamps a later time. A credentials session is bound to the value its sign-in
		// query read together with the hash, not to this time, so a sign-in that reads the old hash
		// before this transaction commits still ends (lib/auth/password-change.ts).
		const changedAt = new Date();
		// Not tied to the condition above: a client's users row holds no hash and is skipped
		// there, but its sessions must end too.
		await tx
			.update(users)
			.set({ passwordChangedAt: changedAt })
			.where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
		return { accounts: updatedAccounts.length, users: updatedUsers.length };
	});
}

/**
 * The one password hash sign-in accepts for this user (`lib/auth/credentials.ts`): an admin with
 * a `users.passwordHash` signs in with that hash only, everyone else with the hash on their
 * `credentials` row in `accounts`. Check a password that a signed-in user submits to confirm a
 * sensitive action (change password, delete or deactivate the account) against this hash alone.
 * Accepting a match in either store would let a stale hash authorize the action, e.g. the seed
 * password still on a seeded admin's credentials row after a change that wrote `users` only.
 * A user with no credentials account hash gets `users.passwordHash`, the only hash they have
 * (compatibility only: sign-in never reads it for a non-admin).
 * Fails closed: a missing tenant or a failed role lookup throws instead of reading as "not an
 * admin", which would check an admin against the credentials account hash.
 * @param user - The user's `users` row (`id` and `passwordHash`)
 * @returns The hash, or null when the user has no hash in either store (OAuth only)
 */
export async function getSignInPasswordHash(user: Pick<User, 'id' | 'passwordHash'>): Promise<string | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	if (user.passwordHash && (await isUserAdminOrThrow(user.id))) {
		return user.passwordHash;
	}
	const [credentialsAccount] = await db
		.select({ passwordHash: accounts.passwordHash })
		.from(accounts)
		.where(and(eq(accounts.userId, user.id), eq(accounts.provider, 'credentials'), eq(accounts.tenantId, tenantId)))
		.limit(1);
	return credentialsAccount?.passwordHash ?? user.passwordHash;
}

/**
 * Update user details
 * @param values - User values to update
 * @param userId - User ID
 */
export async function updateUser(values: Pick<NewUser, 'email'>, userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	const where = and(eq(users.id, userId), eq(users.tenantId, tenantId));
	return db.transaction(async (tx) => {
		const [current] = await tx.select({ email: users.email }).from(users).where(where).limit(1);
		const normalise = (email: string | null | undefined) => (email ?? '').trim().toLowerCase();
		const previousEmail = current?.email ?? null;
		const emailChanged = current !== undefined && values.email !== undefined && normalise(previousEmail) !== normalise(values.email);
		if (!emailChanged) return tx.update(users).set(values).where(where);

		// A verification belongs to the address that was verified. Clear it, and bind the
		// user's OAuth rows to the address they verified, so neither proves the new one
		// (see `isEmailVerifiedForOwnership`).
		await tx
			.update(accounts)
			.set({ email: previousEmail })
			.where(and(eq(accounts.userId, userId), inArray(accounts.type, ['oauth', 'oidc']), isNull(accounts.email)));
		return tx
			.update(users)
			.set({ ...values, emailVerified: null })
			.where(where);
	});
}

/**
 * Update user email verification status
 * @param email - User email
 * @param verified - Verification status
 */
export async function updateUserVerification(email: string, verified: boolean) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	return db
		.update(users)
		.set({ emailVerified: verified ? new Date() : null })
		.where(and(eq(users.email, email), eq(users.tenantId, tenantId)));
}

/**
 * Hard delete a user. Cascade-deletes everything the user owns (accounts,
 * clientProfiles, submissions, sponsorships, activityLogs.userId, …). Audit
 * columns elsewhere that reference users.id with onDelete: 'set null'
 * (actor_id, reviewed_by, performed_by) keep their rows; only the user link
 * is nulled, so audit history of OTHER actors' actions is preserved.
 *
 * Use this for self-service account deletion from the client Danger Zone.
 * Use `softDeleteUser` only when the caller specifically wants the email
 * mangling / deletedAt sentinel behaviour instead.
 */
export async function hardDeleteUser(userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	return db.delete(users).where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
}

/**
 * Soft delete a user by marking as deleted
 * @param userId - User ID to delete
 *
 * Also neuters the user's rows in the `accounts` table so the credentials
 * provider (which authenticates against accounts.email + accounts.passwordHash
 * via verifyClientPassword) cannot mint a fresh session for a soft-deleted
 * user. Without this, login by the original email keeps succeeding because
 * the accounts row is untouched.
 */
export async function softDeleteUser(userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	return db.transaction(async (tx) => {
		await tx
			.update(users)
			.set({
				deletedAt: sql`CURRENT_TIMESTAMP`,
				email: sql`CONCAT(email, '-', id, '-deleted')`
			})
			.where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

		await tx
			.update(accounts)
			.set({
				email: sql`CONCAT(COALESCE(${accounts.email}, ''), '-', ${accounts.userId}, '-deleted')`,
				passwordHash: null
			})
			.where(and(eq(accounts.userId, userId), eq(accounts.tenantId, tenantId)));
	});
}

/**
 * Deactivate a user account (reversible soft-pause).
 * Sets deactivatedAt to the current timestamp. The user's email and credentials
 * remain intact so they can log back in and reactivate. This is separate from
 * softDeleteUser / hardDeleteUser which are not reversible.
 */
export async function deactivateUser(userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	return db
		.update(users)
		.set({ deactivatedAt: sql`CURRENT_TIMESTAMP`, updatedAt: new Date() })
		.where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
}

/**
 * The columns that decide whether a user's session still holds: `password_changed_at` (a reset or
 * change ends older sessions, spec-003 AC-9) and `deactivated_at`. Read by user id without the
 * tenant, like the jwt callback in lib/auth/index.ts, which reads the same two columns. The
 * notifications stream re-reads them on every ping (lib/notifications/stream.ts).
 * @returns The two columns, or undefined when there is no users row; throws on a database error
 */
export async function getUserSessionState(
	userId: string
): Promise<{ passwordChangedAt: Date | null; deactivatedAt: Date | null } | undefined> {
	const [row] = await db
		.select({ passwordChangedAt: users.passwordChangedAt, deactivatedAt: users.deactivatedAt })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	return row;
}

/**
 * Reactivate a previously deactivated user account.
 * Clears deactivatedAt, restoring the account to active status.
 */
export async function reactivateUser(userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	return db
		.update(users)
		.set({ deactivatedAt: null, updatedAt: new Date() })
		.where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
}

/**
 * Update client profile name
 * @param userId - User ID
 * @param name - New name
 */
export async function updateClientProfileName(userId: string, name: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	return db
		.update(clientProfiles)
		.set({ name, updatedAt: new Date() })
		.where(and(eq(clientProfiles.userId, userId), eq(clientProfiles.tenantId, tenantId)));
}

/**
 * Check if a user has an admin role, failing closed: a missing tenant or a database error
 * throws instead of reading as "not an admin". Use it where a wrong `false` would pick a
 * weaker check, such as the password store `getSignInPasswordHash` picks.
 * @param userId - User ID
 * @returns true if user has an admin role, false otherwise
 */
export async function isUserAdminOrThrow(userId: string): Promise<boolean> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	const result = await db
		.select({ isAdmin: roles.isAdmin })
		.from(userRoles)
		.innerJoin(roles, eq(userRoles.roleId, roles.id))
		.where(
			and(
				eq(userRoles.userId, userId),
				eq(roles.isAdmin, true),
				eq(roles.status, 'active'),
				eq(userRoles.tenantId, tenantId)
			)
		)
		.limit(1);

	return result.length > 0;
}

/**
 * Check if a user has an admin role
 * @param userId - User ID
 * @returns true if user has an admin role, false otherwise (also on a database error)
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
	if (!process.env.DATABASE_URL) {
		console.warn('DATABASE_URL is not set. Admin check is disabled.');
		return false;
	}

	try {
		return await isUserAdminOrThrow(userId);
	} catch (error) {
		console.error('Database error in isUserAdmin:', error);
		return false;
	}
}
