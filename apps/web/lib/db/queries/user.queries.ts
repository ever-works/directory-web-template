import { eq, sql, and } from 'drizzle-orm';
import { db } from '../drizzle';
import { users, clientProfiles, roles, userRoles, type NewUser, type User } from '../schema';
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
			console.warn(`User validation failed: No user found with email ${email}`);
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
 * Update user details
 * @param values - User values to update
 * @param userId - User ID
 */
export async function updateUser(values: Pick<NewUser, 'email'>, userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	return db
		.update(users)
		.set(values)
		.where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
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
 * Soft delete a user by marking as deleted
 * @param userId - User ID to delete
 */
export async function softDeleteUser(userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	return db
		.update(users)
		.set({
			deletedAt: sql`CURRENT_TIMESTAMP`,
			email: sql`CONCAT(email, '-', id, '-deleted')`
		})
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
 * Check if a user has an admin role
 * @param userId - User ID
 * @returns true if user has an admin role, false otherwise
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
	if (!process.env.DATABASE_URL) {
		console.warn('DATABASE_URL is not set. Admin check is disabled.');
		return false;
	}

	try {
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
	} catch (error) {
		console.error('Database error in isUserAdmin:', error);
		return false;
	}
}
