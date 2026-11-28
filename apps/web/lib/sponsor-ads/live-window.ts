/**
 * When is an `active` sponsor ad actually on display?
 *
 * An ad is bought for a window (`startDate` -> `endDate`: one week or one month). A renewal
 * moves `endDate` forward (`renewSponsorAd`), so `endDate` is the source of truth for "paid
 * until". The daily expiration job sets ended `active` rows to `expired`
 * (`expireEndedSponsorAds`, see `isSponsorAdDueForExpiry` below), but between two runs a row
 * can still say `active` after its window closed, so every reader that means "on display"
 * applies this rule rather than the status alone.
 *
 * The repository applies the same rule in SQL (`status = 'active' AND (end_date IS NULL OR
 * end_date > now)`); this pure function is the documented semantics and is what the tests pin.
 *
 * - `endDate` missing: shown. An ad activated before windows were recorded must not vanish.
 * - `endDate` exactly `now`: not shown; the window is over at its end instant.
 *
 * Pure: imports no database code, so it can be unit tested on its own.
 */
export function isSponsorAdWithinPaidWindow(
	ad: { status: string; endDate?: Date | null },
	now: Date = new Date()
): boolean {
	if (ad.status !== 'active') return false;
	if (!ad.endDate) return true;
	return ad.endDate.getTime() > now.getTime();
}

/**
 * Should the daily sweep set this ad to `expired`? Exactly the `active` ads whose paid window
 * has closed: an `endDate` at or before `now`, the complement of the rule above. An ad with no
 * `endDate` stays `active` (it is still shown), and no other status is touched.
 *
 * SQL form: `expireEndedSponsorAds` in `lib/repositories/sponsor-ad.repository.ts`
 * (`status = 'active' AND end_date <= now`). Keep the two in step.
 */
export function isSponsorAdDueForExpiry(
	ad: { status: string; endDate?: Date | null },
	now: Date = new Date()
): boolean {
	if (ad.status !== 'active' || !ad.endDate) return false;
	return ad.endDate.getTime() <= now.getTime();
}
