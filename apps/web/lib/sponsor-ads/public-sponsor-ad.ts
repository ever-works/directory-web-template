import type { PublicSponsorAd } from '@/lib/types/sponsor-ad';

/**
 * The public view of a `sponsor_ads` row, for `GET /api/sponsor-ads`, which
 * needs no session.
 *
 * It copies an allowlist of fields, so the sponsor's user id, the payment
 * provider's customer and subscription ids, the amount paid and the review /
 * cancellation details never leave the server, and a column added to the
 * table later stays private until it is added here.
 *
 * Pure: imports no database code, so it can be unit tested on its own.
 */
export function toPublicSponsorAd(row: PublicSponsorAd): PublicSponsorAd {
	return {
		id: row.id,
		itemSlug: row.itemSlug,
		status: row.status,
		interval: row.interval,
		startDate: row.startDate,
		endDate: row.endDate
	};
}
