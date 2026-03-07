import { auth } from '@/lib/auth';

/**
 * TTL-based cache for the default tenant ID.
 * Re-validates from the DB every CACHE_TTL_MS to handle tenant
 * deactivation in long-lived production workers.
 */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cachedDefaultTenantId: string | null = null;
let cachedAt = 0;

function isCacheValid(): boolean {
	return cachedDefaultTenantId !== null && Date.now() - cachedAt < CACHE_TTL_MS;
}

/**
 * Server-side helper to get the current tenant ID.
 * Resolution order:
 * 1. Authenticated session (user.tenantId)
 * 2. Environment variable TENANT_ID (for single-tenant deployments)
 * 3. Database lookup: first active tenant (cached with TTL)
 *
 * @returns The tenant ID string or null if not resolvable
 */
export async function getTenantId(): Promise<string | null> {
	// 1. Try session-based resolution (only works inside a request scope)
	try {
		const session = await auth();
		if (session?.user?.tenantId) {
			return session.user.tenantId;
		}
	} catch {
		// auth() calls headers() which fails outside request scope
		// (e.g. during instrumentation) — fall through to fallbacks
	}

	// 2. Environment variable fallback (ideal for single-tenant deployments)
	if (process.env.TENANT_ID) {
		return process.env.TENANT_ID;
	}

	// 3. Database fallback: get first active tenant (cached with TTL)
	if (isCacheValid()) {
		return cachedDefaultTenantId;
	}

	try {
		const { db } = await import('@/lib/db/drizzle');
		const { tenant } = await import('@/lib/db/schema');
		const { eq, asc } = await import('drizzle-orm');

		const result = await db
			.select({ id: tenant.id })
			.from(tenant)
			.where(eq(tenant.status, 'active'))
			.orderBy(asc(tenant.createdAt))
			.limit(1);

		if (result[0]?.id) {
			cachedDefaultTenantId = result[0].id;
			cachedAt = Date.now();
			return cachedDefaultTenantId;
		} else {
			// Tenant was deactivated or deleted — invalidate cache
			cachedDefaultTenantId = null;
			cachedAt = 0;
		}
	} catch (error) {
		console.error('[getTenantId] Fallback DB lookup failed:', error instanceof Error ? error.message : error);
	}

	return null;
}

