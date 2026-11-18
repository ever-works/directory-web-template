import { coreConfig } from '@/lib/config/config-service';
import { tenantHostFromHeaders } from './tenant-host';
import { pickSharedRenderTenant, tenantInsertChangesSharedRender } from './shared-render-tenant';

// --- Configuration & Caching --- //

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
	id: string;
	cachedAt: number;
}

let cachedDefaultTenantId: string | null = null;
let defaultTenantCachedAt = 0;

const domainTenantCache = new Map<string, CacheEntry>();
let hasSilencedTenantLookupError = false;

function isDefaultCacheValid(): boolean {
	return cachedDefaultTenantId !== null && (Date.now() - defaultTenantCachedAt < CACHE_TTL_MS);
}

function getCachedDomainTenant(domain: string): string | null {
	const cached = domainTenantCache.get(domain);
	if (cached && (Date.now() - cached.cachedAt < CACHE_TTL_MS)) {
		return cached.id;
	}
	return null;
}

// --- Resolution Strategies --- //

/**
 * 1. Resolves tenant from the authenticated session.
 */
async function resolveFromSession(): Promise<string | null> {
	try {
		const { auth } = await import('@/lib/auth');
		const session = await auth();
		const tenantId = session?.user?.tenantId || null;
		if (tenantId) {
			// Ensure it exists in DB (fake data pattern)
			await ensureTenantExists(tenantId, 'Session Tenant');
		}
		return tenantId;
	} catch {
		return null;
	}
}

/**
 * Ensures fake tenant data gets created dynamically in database
 * Keeps track using a memory Set to avoid hitting DB constantly
 */
const ensuredTenants = new Set<string>();

async function ensureTenantExists(tenantId: string, name: string) {
	if (ensuredTenants.has(tenantId)) return;
	
	try {
		const { db } = await import('@/lib/db/drizzle');
		const { tenant } = await import('@/lib/db/schema');
		
		const inserted = await db.insert(tenant).values({
			id: tenantId,
			name,
			status: 'active'
		}).onConflictDoNothing().returning({ id: tenant.id });

		ensuredTenants.add(tenantId);
		console.log(`[DB Init] Ensured tenant '${tenantId}' (${name}) exists`);
		if (inserted.length > 0 && !process.env.TENANT_ID) {
			// Cached item pages embed the comments of what was the only tenant
			// (getTenantIdForSharedRender, Spec 061): with a second tenant they must regenerate
			// without them. Only that step changes them: with TENANT_ID set the shared render
			// ignores other rows, and from two tenants on it prefetches nothing. Skipped where
			// Next cannot revalidate (a render); ISR then regenerates them within 10 minutes.
			const rows = await db.select({ id: tenant.id }).from(tenant).limit(3);
			if (tenantInsertChangesSharedRender(rows.length, process.env.TENANT_ID)) {
				const { revalidateItemPages } = await import('@/lib/cache-invalidation');
				revalidateItemPages();
			}
		}
	} catch (e) {
		console.warn(`[DB Init] Could not ensure tenant exists:`, e);
	}
}

/**
 * 2. Resolves tenant from environment variables.
 * Ideal for single-tenant or default deployments.
 */
async function resolveFromEnv(): Promise<string | null> {
	try {
		const { env } = await import('../config/env');
		const tenantId = env.TENANT_ID || null;
		if (tenantId) {
			await ensureTenantExists(tenantId, 'Environment Tenant');
		}
		return tenantId;
	} catch {
		// Fallback to process.env if config fails
		const tenantId = process.env.TENANT_ID || null;
		if (tenantId) await ensureTenantExists(tenantId, 'Environment Tenant Fallback');
		return tenantId;
	}
}

/**
 * 3. Resolves tenant from HTTP headers (`x-tenant-domain`, falling back to
 * the request's own `host`). Supports Subdomain/Domain routing.
 */
async function resolveFromHeaders(): Promise<string | null> {
	try {
		const { headers } = await import('next/headers');
		const headersList = await headers();
		const domain = tenantHostFromHeaders(headersList);

		if (!domain) return null;

		const cachedId = getCachedDomainTenant(domain);
		if (cachedId) return cachedId;

		const { db } = await import('@/lib/db/drizzle');
		const { tenant } = await import('@/lib/db/schema');
		const { eq, or } = await import('drizzle-orm');

		const baseDomain = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : '';
		let slug = domain;

		if (baseDomain && domain.endsWith(`.${baseDomain}`)) {
			slug = domain.replace(`.${baseDomain}`, '');
		} else if (domain.includes(':')) {
			const withoutPort = domain.split(':')[0];
			slug = withoutPort === 'localhost' ? '' : withoutPort;
		}

		const [result] = await db
			.select({ id: tenant.id })
			.from(tenant)
			.where(
				or(eq(tenant.domain, domain), eq(tenant.slug, slug))
			)
			.limit(1);

		if (result?.id) {
			domainTenantCache.set(domain, { id: result.id, cachedAt: Date.now() });
			return result.id;
		}
	} catch {
		// Ignore header errors outside request scope
	}
	
	return null;
}

/**
 * Default tenant ID used as a final fallback. Lazy-created when a deployment
 * has a database but no tenant row exists yet (e.g. fresh template install,
 * demo). Avoids every tenant-scoped query throwing `Tenant ID not found` for
 * anonymous traffic on an unprovisioned deployment.
 */
const DEFAULT_TENANT_ID = 'default';

/**
 * 5. Final fallback: lazy-create a default tenant when the database is
 * reachable but no tenant exists. Single-tenant deployments work
 * out-of-the-box without manual seeding.
 */
async function resolveByCreatingDefault(): Promise<string | null> {
	if (!coreConfig.DATABASE_URL) return null;

	// `ensureTenantExists` is idempotent: it inserts on first call (with
	// `onConflictDoNothing`) and short-circuits via the in-memory dedup set
	// on subsequent calls. Safe to call on every miss.
	await ensureTenantExists(DEFAULT_TENANT_ID, 'Default');

	// Re-run the active-tenant lookup so the `status='active'` gate is
	// preserved. If an admin later flipped the row to `inactive`, the
	// in-memory dedup flag would still be set, but `resolveFromDatabase`
	// will return `null` (fail-closed) — which is the correct behavior.
	// Reusing it also reuses its 5-min TTL cache for the happy path.
	return await resolveFromDatabase();
}

/**
 * 4. Resolves the default active tenant from the database.
 */
async function resolveFromDatabase(): Promise<string | null> {
	if (isDefaultCacheValid()) {
		return cachedDefaultTenantId;
	}

	try {
		const { db } = await import('@/lib/db/drizzle');
		const { tenant } = await import('@/lib/db/schema');
		const { eq, asc } = await import('drizzle-orm');

		const [result] = await db
			.select({ id: tenant.id })
			.from(tenant)
			.where(eq(tenant.status, 'active'))
			.orderBy(asc(tenant.createdAt))
			.limit(1);

		if (result?.id) {
			cachedDefaultTenantId = result.id;
			defaultTenantCachedAt = Date.now();
			return cachedDefaultTenantId;
		}
		
		// Tenant was deactivated or deleted — invalidate cache
		cachedDefaultTenantId = null;
		defaultTenantCachedAt = 0;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const isExpectedUnavailable = !coreConfig.DATABASE_URL || isTenantTableUnavailable(message);

		if (!isExpectedUnavailable) {
			console.error('[getTenantId] Fallback DB lookup failed:', message);
		} else if (coreConfig.NODE_ENV !== 'production' && !hasSilencedTenantLookupError) {
			hasSilencedTenantLookupError = true;
			console.warn('[getTenantId] Tenant lookup unavailable; continuing without database-backed tenant resolution.');
		}
	}

	return null;
}

/**
 * Tenant for output that is cached and served to every visitor, such as an
 * ISR item page (Spec 061). It must not read the session or the request:
 * `cookies()` / `headers()` would make the page render per request.
 *
 * `TENANT_ID` when set, else the tenant of a single-tenant database (see
 * `pickSharedRenderTenant`). `null` when the deployment has several tenants or
 * the lookup fails: callers then leave tenant-scoped data out of the shared
 * output and let the browser load it through the API, which resolves the tenant
 * per request. Not cached: a tenant added at runtime must take effect on the
 * next render, and the query only runs when a cached page is (re)generated.
 */
export async function getTenantIdForSharedRender(): Promise<string | null> {
	const fromEnv = await resolveFromEnv();
	if (fromEnv) return fromEnv;
	if (!coreConfig.DATABASE_URL) return null;

	try {
		const { db } = await import('@/lib/db/drizzle');
		const { tenant } = await import('@/lib/db/schema');
		const rows = await db.select({ id: tenant.id, status: tenant.status }).from(tenant).limit(2);
		return pickSharedRenderTenant(rows);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		// An unmigrated database is expected (see resolveFromDatabase): no error per render.
		if (!isTenantTableUnavailable(message)) {
			console.error(
				'[getTenantIdForSharedRender] Tenant lookup failed; rendering without tenant-scoped data:',
				message
			);
		}
		return null;
	}
}

/** The tenant table is missing or the schema is behind: expected on a fresh or unmigrated database. */
function isTenantTableUnavailable(message: string): boolean {
	return /relation "tenant" does not exist/i.test(message) || /schema may be out of sync/i.test(message);
}

// --- Main Export --- //

/**
 * Server-side helper to get the current tenant ID.
 *
 * Resolution order:
 * 1. Authenticated session (`user.tenantId`)
 * 2. Environment variable (`TENANT_ID`)
 * 3. HTTP Header (`x-tenant-domain`, or the request's own `host` — the
 *    middleware matcher excludes `/api`, so the injected header is absent
 *    there) via Subdomain routing
 * 4. Database fallback (first active tenant)
 * 5. Lazy-create the `default` tenant (single-tenant / demo deployments)
 *
 * @returns The tenant ID string or null if not resolvable
 */
export async function getTenantId(): Promise<string | null> {
	return (
		(await resolveFromSession()) ??
		(await resolveFromEnv()) ??
		(await resolveFromHeaders()) ??
		(await resolveFromDatabase()) ??
		(await resolveByCreatingDefault())
	);
}
