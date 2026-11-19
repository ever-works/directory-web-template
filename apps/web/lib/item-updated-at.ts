import { parse, parseISO } from 'date-fns';

/** The form the data repositories write `updated_at` in. */
export const ITEM_UPDATED_AT_FORMAT = 'yyyy-MM-dd HH:mm';

/**
 * An item YAML's `updated_at` as a `Date`, or `undefined` when it is missing or is not a date.
 *
 * The field is optional. date-fns `parse(undefined, ...)` throws, and that used to drop the
 * whole item. It also accepts an ISO timestamp or a bare `yyyy-MM-dd` (local midnight), which
 * used to give an Invalid Date. Both parsers reject a calendar-invalid date (`2025-02-30`)
 * instead of rolling it over to the next month. An item without a date is still
 * listed: it sorts as the oldest, has no recency score, uses the sitemap's fallback date and
 * is left out of the feeds (the same rule as an undated blog post).
 *
 * There is no fallback to the file's last commit date: the data repository is a full-history
 * isomorphic-git clone, and walking its log for every undated file on each listing build costs
 * more than the date is worth.
 */
export function parseItemUpdatedAt(raw: unknown): Date | undefined {
	if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? undefined : raw;
	if (typeof raw !== 'string') return undefined;
	const value = raw.trim();
	if (!value) return undefined;
	const strict = parse(value, ITEM_UPDATED_AT_FORMAT, new Date());
	if (!Number.isNaN(strict.getTime())) return strict;
	const iso = parseISO(value);
	return Number.isNaN(iso.getTime()) ? undefined : iso;
}

/**
 * Epoch milliseconds of an item date (a `Date`, or a string after a JSON round trip), for
 * sorting; 0 when there is none, so an undated item sorts as the oldest. Use
 * `parseItemUpdatedAt` to ask whether an item has a date.
 */
export function itemDateMs(value: Date | string | null | undefined): number {
	if (!value) return 0;
	const time = (value instanceof Date ? value : new Date(value)).getTime();
	return Number.isNaN(time) ? 0 : time;
}
