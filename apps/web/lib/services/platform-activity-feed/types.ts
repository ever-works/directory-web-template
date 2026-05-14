/**
 * Wire types for the EW-120 Activity Feed pull contract. These shapes are
 * consumed verbatim by the platform's `DirectoryWebsiteClient` — change
 * them only in lockstep with the platform side (see
 * `apps/api/src/works/activity-feed/directory-website-client.service.ts`
 * and `dto/feed-entry.dto.ts` on the ever-works repo).
 */

export type EntryType = 'user_registered' | 'item_created' | 'item_status_changed' | 'report_created';
export type TargetType = 'user' | 'item' | 'report';

/** `types` query param filter — `'all'` means "no filter". */
export type FeedTypeFilter = 'users' | 'items' | 'reports' | 'all';
export const FEED_TYPE_FILTERS: readonly FeedTypeFilter[] = ['users', 'items', 'reports', 'all'];

export interface FeedActor {
	id: string;
	name: string;
	email?: string | null;
}

export interface FeedTarget {
	id: string;
	type: TargetType;
	name: string;
	/** Operator-side click-through URL on the deployed site (admin panel). */
	adminUrl: string;
}

export interface FeedEntry {
	id: string;
	type: EntryType;
	/** ISO 8601 timestamp. */
	timestamp: string;
	summary: string;
	actor?: FeedActor | null;
	target: FeedTarget;
}

export interface FeedResponse {
	entries: FeedEntry[];
	/**
	 * Opaque cursor for the next page or `null` when no more results. The
	 * platform threads this back as `since` on the follow-up request.
	 */
	nextCursor: string | null;
	/** ISO 8601 server time used for drift detection. */
	serverTime: string;
}

export interface FeedQuery {
	/** Lower bound (exclusive) on entry timestamps. */
	since: Date | null;
	/** Upper page size — caller-supplied, clamped by the route. */
	limit: number;
	/** Subset of entry kinds to return. */
	filters: FeedTypeFilter[];
}
