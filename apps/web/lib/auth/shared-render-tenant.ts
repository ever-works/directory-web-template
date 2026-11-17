/**
 * Picks the tenant for output that is cached and shared by every visitor
 * (Spec 061), from at most two rows of the `tenant` table (any status).
 *
 * Only a deployment with exactly one tenant row is unambiguous: whatever the
 * request-based lookup (`getTenantId()`) would match by host, it can only land
 * on that row. With two or more rows a host may map to a different tenant,
 * including an inactive one, so the answer is `null` and callers leave
 * tenant-scoped data out of the shared output. An inactive single tenant is
 * `null` too.
 */
export function pickSharedRenderTenant(rows: ReadonlyArray<{ id: string; status: string | null }>): string | null {
	if (rows.length !== 1) return null;
	const [only] = rows;
	return only.status === 'active' ? only.id : null;
}
