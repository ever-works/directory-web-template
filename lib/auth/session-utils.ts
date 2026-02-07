import { Session } from 'next-auth';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/** Prefix pour les logs de ce module */
const LOG_PREFIX = '[SessionUtils]';

/**
 * Retrieves the tenant ID from the session, falling back to the database if necessary.
 * This is useful when the session might be stale or missing the tenantId property.
 *
 * @param session - The user session object (can be null)
 * @returns The tenantId string if found, otherwise undefined
 *
 * @example
 * ```ts
 * const tenantId = await getTenantId(session);
 * if (!tenantId) {
 *   return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
 * }
 * ```
 */
export async function getTenantId(session: Session | null): Promise<string | undefined> {
	// Early return for invalid session
	if (!session?.user) {
		return undefined;
	}

	const { user } = session;

	// Fast path: tenant ID available in session (most common case)
	if (user.tenantId) {
		return user.tenantId;
	}

	// Cannot fetch from DB without user ID
	if (!user.id) {
		return undefined;
	}

	// Slow path: fetch from database as fallback
	return fetchTenantIdFromDatabase(user.id);
}

/**
 * Fetches the tenant ID from the database for a given user ID.
 * This is an internal helper function used as a fallback mechanism.
 *
 * @param userId - The user's unique identifier
 * @returns The tenantId if found, otherwise undefined
 */
async function fetchTenantIdFromDatabase(userId: string): Promise<string | undefined> {
	try {
		const [userRecord] = await db
			.select({ tenantId: users.tenantId })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		return userRecord?.tenantId ?? undefined;
	} catch (error) {
		console.error(`${LOG_PREFIX} Failed to fetch tenantId from database:`, error);
		return undefined;
	}
}
