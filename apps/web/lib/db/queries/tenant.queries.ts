import { eq } from 'drizzle-orm';
import { db } from '../drizzle';
import { tenant, users } from '../schema';

export type Tenant = typeof tenant.$inferSelect;

/**
 * Get a tenant by its ID
 */
export async function getTenantById(id: string): Promise<Tenant | null> {
	if (!process.env.DATABASE_URL) {
		console.warn('DATABASE_URL is not set. Tenant lookup is disabled.');
		return null;
	}

	try {
		const result = await db.select().from(tenant).where(eq(tenant.id, id)).limit(1);
		return result[0] ?? null;
	} catch (error) {
		console.error('Database error in getTenantById:', error);
		return null;
	}
}

/**
 * Get the tenant associated with a user
 */
export async function getTenantByUserId(userId: string): Promise<Tenant | null> {
	if (!process.env.DATABASE_URL) {
		console.warn('DATABASE_URL is not set. Tenant lookup is disabled.');
		return null;
	}

	try {
		const result = await db
			.select({ tenant })
			.from(users)
			.innerJoin(tenant, eq(users.tenantId, tenant.id))
			.where(eq(users.id, userId))
			.limit(1);

		return result[0]?.tenant ?? null;
	} catch (error) {
		console.error('Database error in getTenantByUserId:', error);
		return null;
	}
}

/**
 * Get a tenant by its slug
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
	if (!process.env.DATABASE_URL) {
		console.warn('DATABASE_URL is not set. Tenant lookup is disabled.');
		return null;
	}

	try {
		const result = await db.select().from(tenant).where(eq(tenant.slug, slug)).limit(1);
		return result[0] ?? null;
	} catch (error) {
		console.error('Database error in getTenantBySlug:', error);
		return null;
	}
}

/**
 * Get a tenant by its domain
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
	if (!process.env.DATABASE_URL) {
		console.warn('DATABASE_URL is not set. Tenant lookup is disabled.');
		return null;
	}

	try {
		const result = await db.select().from(tenant).where(eq(tenant.domain, domain)).limit(1);
		return result[0] ?? null;
	} catch (error) {
		console.error('Database error in getTenantByDomain:', error);
		return null;
	}
}
