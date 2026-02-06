import { Session } from 'next-auth';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Retrieves the tenant ID from the session, falling back to the database if necessary.
 * This is useful when the session might be stale or missing the tenantId property.
 *
 * @param session The user session object
 * @returns The tenantId string if found, otherwise undefined
 */
export async function getTenantId(session: Session | null): Promise<string | undefined> {
	if (!session?.user) return undefined;

	// First try to get it directly from the session
	if (session.user.tenantId) {
		return session.user.tenantId;
	}

	// Fallback: fetch user from DB if tenantId is missing in session but user ID exists
	if (session.user.id) {
		try {
			const usersList = await db
				.select({ tenantId: users.tenantId })
				.from(users)
				.where(eq(users.id, session.user.id))
				.limit(1);

			if (usersList[0]?.tenantId) {
				return usersList[0].tenantId;
			}
		} catch (dbError) {
			console.error('[SessionUtils] Failed to fetch tenantId fallback:', dbError);
		}
	}

	return undefined;
}
