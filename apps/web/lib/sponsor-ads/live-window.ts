/**
 * When is an `active` sponsor ad actually on display?
 *
 * An ad is bought for a window (`startDate` -> `endDate`: one week or one month). Nothing in
 * the app flips a row from `active` to `expired` when that window closes (the service names
 * "a separate job" for it, but none exists), so a sponsor who paid for a week stayed in the
 * public sponsor slots for as long as the row said `active`. A renewal moves `endDate` forward
 * (`renewSponsorAd`), so `endDate` is the source of truth for "paid until".
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
