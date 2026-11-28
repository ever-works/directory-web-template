import type { NewSponsorAd } from '@/lib/db/schema';

/**
 * The `sponsor_ads` row `createSponsorAd` inserts: the fields the service built, the tenant the
 * repository resolved, and the creation time.
 *
 * `tenant_id` has no default, and every reader (checkout's `getSponsorAdById`, the owner's
 * `getSponsorAdsByUserId`, the admin list, the expiry sweep) filters by the current tenant, so a
 * row stored without it is invisible until the startup NULL-tenant backfill moves it to the
 * default tenant. The tenant always comes from the `tenantId` argument: one in `data` is replaced,
 * so a caller cannot file an ad under another tenant.
 *
 * Pure: imports no database code, so it can be unit tested on its own.
 */
export function newSponsorAdRow(data: NewSponsorAd, tenantId: string, now: Date = new Date()): NewSponsorAd {
	if (!tenantId) throw new Error('Tenant ID not found');
	return {
		...data,
		tenantId,
		createdAt: now,
		updatedAt: now
	};
}
