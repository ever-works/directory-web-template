import { auth } from '@/lib/auth';

/**
 * Cached default tenant ID (resolved once per process lifetime)
 * Avoids repeated DB lookups for the fallback tenant.
 */
let cachedDefaultTenantId: string | null = null;

/**
 * Server-side helper to get the current tenant ID.
 * Resolution order:
 * 1. Authenticated session (user.tenantId)
 * 2. Environment variable TENANT_ID (for single-tenant deployments)
 * 3. Database lookup: first active tenant (single-tenant fallback)
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

	// 3. Database fallback: get first active tenant (cached per process)
	if (cachedDefaultTenantId) {
		return cachedDefaultTenantId;
	}

	try {
		const { db } = await import('@/lib/db/drizzle');
		const { tenant } = await import('@/lib/db/schema');
		const { eq } = await import('drizzle-orm');

		const result = await db
			.select({ id: tenant.id })
			.from(tenant)
			.where(eq(tenant.status, 'active'))
			.limit(1);

		if (result[0]?.id) {
			cachedDefaultTenantId = result[0].id;
			return cachedDefaultTenantId;
		}
	} catch (error) {
		console.error('[getTenantId] Fallback DB lookup failed:', error instanceof Error ? error.message : error);
	}

	return null;
}
