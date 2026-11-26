import { ITEM_STATUSES, type ItemData, type ItemLocationData } from '@/lib/types/item';

type IndexCandidate = Pick<ItemData, 'status' | 'deleted_at' | 'location'>;

/**
 * Whether an item belongs in the location index (`item_location_index`).
 *
 * The index has no status column, and `GET /api/location/coordinates`, `/api/location/search`,
 * `/api/location/cities` and `/api/location/countries` answer anyone from it. So only an item the
 * public may see goes in: approved (exactly), not soft-deleted, and with location data. A draft,
 * pending or rejected item, whose address the submitter has not published, stays out (spec 063).
 */
export function isLocationIndexable<T extends IndexCandidate>(item: T): item is T & { location: ItemLocationData } {
	return item.status === ITEM_STATUSES.APPROVED && !item.deleted_at && Boolean(item.location);
}
