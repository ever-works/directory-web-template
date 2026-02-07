import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Default tenant ID for single-tenant deployments or as fallback
const DEFAULT_TENANT_NAME = 'Default Organization';
const DEFAULT_TENANT_ID = 'default-tenant';

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

/**
 * Gets or creates the default tenant for single-tenant deployments.
 * Used during user registration when no tenant context exists.
 */
export async function getOrCreateDefaultTenant(): Promise<string> {
	try {
		// Check if default tenant exists
		const existing = await db
			.select({ id: tenants.id })
			.from(tenants)
			.where(eq(tenants.id, DEFAULT_TENANT_ID))
			.limit(1);

		if (existing.length > 0) {
			return existing[0].id;
		}

		// Create default tenant
		const [created] = await db
			.insert(tenants)
			.values({
				id: DEFAULT_TENANT_ID,
				name: DEFAULT_TENANT_NAME,
				description: 'Default organization for single-tenant deployment'
			})
			.returning({ id: tenants.id });

		return created.id;
	} catch (error) {
		console.error('Error creating default tenant:', error);
		throw new Error('Failed to initialize default tenant');
	}
}

/**
 * Resolves the tenant ID with fallback strategy.
 *
 * Strategy:
 * 1. First attempts to get tenant from authenticated session
 * 2. Falls back to system/default tenant for unauthenticated contexts
 *
 * Use cases:
 * - Webhook handlers (Stripe, LemonSqueezy, Polar) - no session available
 * - User registration - user doesn't have tenant yet
 * - Public pages - content displayed without authentication
 *
 * @returns The resolved tenant ID (never undefined)
 */
export async function getTenantIdWithFallback(): Promise<string> {
	return (await getTenantIdSafe()) || (await getOrCreateDefaultTenant());
}

/**
 * @deprecated Use `getTenantIdWithFallback` instead. Will be removed in future version.
 */
export const getDefaultTenantId = getTenantIdWithFallback;
