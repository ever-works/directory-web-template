import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../drizzle';
import { portfolioProjects, type NewPortfolioProject, type PortfolioProject } from '../schema';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * List portfolio projects for a client profile, scoped to current tenant.
 * Featured projects first, then by position ascending, then by creation date desc.
 */
export async function listPortfolioProjectsForProfile(clientProfileId: string): Promise<PortfolioProject[]> {
	const tenantId = await getTenantId();
	if (!tenantId) return [];

	return await db
		.select()
		.from(portfolioProjects)
		.where(
			and(eq(portfolioProjects.clientProfileId, clientProfileId), eq(portfolioProjects.tenantId, tenantId))
		)
		.orderBy(desc(portfolioProjects.isFeatured), asc(portfolioProjects.position), desc(portfolioProjects.createdAt));
}

/**
 * Get a single portfolio project by id within the current tenant.
 */
export async function getPortfolioProjectById(id: string): Promise<PortfolioProject | null> {
	const tenantId = await getTenantId();
	if (!tenantId) return null;

	const [project] = await db
		.select()
		.from(portfolioProjects)
		.where(and(eq(portfolioProjects.id, id), eq(portfolioProjects.tenantId, tenantId)))
		.limit(1);

	return project ?? null;
}

/**
 * Create a portfolio project for the given client profile.
 */
export async function createPortfolioProject(
	clientProfileId: string,
	data: Omit<NewPortfolioProject, 'id' | 'clientProfileId' | 'tenantId' | 'createdAt' | 'updatedAt'>
): Promise<PortfolioProject | null> {
	const tenantId = await getTenantId();
	if (!tenantId) return null;

	const [project] = await db
		.insert(portfolioProjects)
		.values({
			clientProfileId,
			tenantId,
			...data
		})
		.returning();

	return project ?? null;
}

/**
 * Update a portfolio project owned by the given client profile within the current tenant.
 */
export async function updatePortfolioProject(
	id: string,
	clientProfileId: string,
	data: Partial<Omit<NewPortfolioProject, 'id' | 'clientProfileId' | 'tenantId' | 'createdAt' | 'updatedAt'>>
): Promise<PortfolioProject | null> {
	const tenantId = await getTenantId();
	if (!tenantId) return null;

	const [project] = await db
		.update(portfolioProjects)
		.set({ ...data, updatedAt: new Date() })
		.where(
			and(
				eq(portfolioProjects.id, id),
				eq(portfolioProjects.clientProfileId, clientProfileId),
				eq(portfolioProjects.tenantId, tenantId)
			)
		)
		.returning();

	return project ?? null;
}

/**
 * Delete a portfolio project owned by the given client profile within the current tenant.
 * Returns true if a row was deleted.
 */
export async function deletePortfolioProject(id: string, clientProfileId: string): Promise<boolean> {
	const tenantId = await getTenantId();
	if (!tenantId) return false;

	const [project] = await db
		.delete(portfolioProjects)
		.where(
			and(
				eq(portfolioProjects.id, id),
				eq(portfolioProjects.clientProfileId, clientProfileId),
				eq(portfolioProjects.tenantId, tenantId)
			)
		)
		.returning();

	return !!project;
}
