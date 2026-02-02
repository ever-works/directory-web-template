import { auth } from '@/lib/auth';

/**
 * Retrieves the current tenant ID from the authenticated session.
 * Throws an error or redirects if the user is not authenticated or lacks a tenant ID.
 * This function should be used in Server Components, Server Actions, and API Routes.
 */
export async function getTenantId(): Promise<string> {
	const session = await auth();

	if (!session?.user?.tenantId) {
		// In a production app, you might want to redirect to login or show an error page.
		// However, throwing an error here ensures that data access is strictly gated.
		throw new Error('Unauthorized: No tenant ID found in session');
	}

	return session.user.tenantId;
}

/**
 * Retrieves the current tenant ID safely, returning null if not found.
 * Useful for public pages or checking authentication state without throwing.
 */
export async function getTenantIdSafe(): Promise<string | null> {
	const session = await auth();
	return session?.user?.tenantId || null;
}
