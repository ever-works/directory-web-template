import { parse } from 'date-fns';

/** The form the data repositories write `updated_at` in. */
export const ITEM_UPDATED_AT_FORMAT = 'yyyy-MM-dd HH:mm';

/**
 * An item YAML's `updated_at` as a `Date`, or `undefined` when it is missing or is not a date.
 *
 * The field is optional. date-fns `parse(undefined, ...)` throws, and that used to drop the
 * whole item. It also accepts the other forms the `Date` constructor reads (an ISO timestamp,
 * a bare `yyyy-MM-dd`), which used to give an Invalid Date. An item without a date is still
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
	const loose = new Date(value);
	return Number.isNaN(loose.getTime()) ? undefined : loose;
}

/** Epoch milliseconds of an item date (a `Date`, or a string after a JSON round trip); 0 when there is none. */
export function itemDateMs(value: Date | string | null | undefined): number {
	if (!value) return 0;
	const time = (value instanceof Date ? value : new Date(value)).getTime();
	return Number.isNaN(time) ? 0 : time;
}
