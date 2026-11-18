/**
 * Picks the tenant for output that is cached and shared by every visitor
 * (Spec 061), from at most two rows of the `tenant` table (any status).
 *
 * Only a deployment with exactly one tenant row is unambiguous: whatever the
 * request-based lookup (`getTenantId()`) would match by session or host, it can
 * only land on that row. With two or more rows a visitor may resolve to a
 * different tenant, including an inactive one, so the answer is `null` and
 * callers leave tenant-scoped data out of the shared output. An inactive single
 * tenant is `null` too.
 *
 * `TENANT_ID` does not change that: it is a process-wide override for anonymous
 * requests, but a signed-in visitor resolves to their session's tenant, so with
 * other tenant rows present one tenant's comments would reach another's visitors.
 * When it is set, the single row must be that tenant.
 */
export function pickSharedRenderTenant(
	rows: ReadonlyArray<{ id: string; status: string | null }>,
	envTenantId?: string | null
): string | null {
	if (rows.length !== 1) return null;
	const [only] = rows;
	if (only.status !== 'active') return null;
	if (envTenantId && only.id !== envTenantId) return null;
	return only.id;
}

/**
 * Whether a tenant row just inserted changes what cached item pages may embed, so they
 * must regenerate (Spec 061 R4). Only the step from one tenant row to two does: before
 * it the shared render embedded the single tenant's comments, after it none.
 *
 * @param tenantRowsAfter Rows in the `tenant` table after the insert (counting to 3 is enough).
 */
export function tenantInsertChangesSharedRender(tenantRowsAfter: number): boolean {
	return tenantRowsAfter === 2;
}
