import { and, desc, inArray, lt, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { clientProfiles, ItemAuditAction, itemAuditLogs, reports, users } from '@/lib/db/schema';
import type { ItemAuditActionValues } from '@/lib/db/schema';
import type { FeedEntry, FeedQuery, FeedResponse, FeedTarget, FeedTypeFilter } from './types';

const MAX_LIMIT = 200;

/**
 * Build the EW-120 pull-mode response by querying the three DB-backed
 * activity sources (users, items via `itemAuditLogs`, reports), normalising
 * each into the wire `FeedEntry` shape, merging by timestamp DESC, and
 * paginating with a cursor-based `since` strategy.
 *
 * Per-source over-fetch + global merge: we fetch up to `limit` rows from
 * EACH source so the global top-N selection isn't starved when one source
 * dominates the time window. This mirrors the same bug we just fixed on
 * the platform side (EW-120 Codex P1, commit 4070ec08).
 *
 * The `nextCursor` is the timestamp of the last entry returned, exclusive
 * — the platform passes it back as `since` for follow-up pages.
 */
export async function buildActivityFeed(query: FeedQuery, adminBaseUrl: string): Promise<FeedResponse> {
	const limit = Math.min(Math.max(1, query.limit), MAX_LIMIT);
	const filterSet = new Set<FeedTypeFilter>(query.filters);
	const wantAll = filterSet.has('all') || filterSet.size === 0;
	const wantUsers = wantAll || filterSet.has('users');
	const wantItems = wantAll || filterSet.has('items');
	const wantReports = wantAll || filterSet.has('reports');

	const since = query.since;

	const [userRows, itemRows, reportRows] = await Promise.all([
		wantUsers ? fetchUsers(since, limit) : Promise.resolve([]),
		wantItems ? fetchItems(since, limit) : Promise.resolve([]),
		wantReports ? fetchReports(since, limit) : Promise.resolve([])
	]);

	const merged = [...userRows, ...itemRows, ...reportRows];
	merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
	const page = merged.slice(0, limit);
	const nextCursor = page.length === limit ? (page[page.length - 1].timestamp ?? null) : null;

	return {
		entries: page.map((entry) => withAdminUrl(entry, adminBaseUrl)),
		nextCursor,
		serverTime: new Date().toISOString()
	};
}

async function fetchUsers(since: Date | null, limit: number): Promise<FeedEntry[]> {
	// `since` is the cursor from the previous page (== that page's OLDEST
	// timestamp). For newest-first pagination we want rows STRICTLY OLDER
	// than the cursor so pages don't overlap. Using `>` here would make
	// each follow-up page repeat newer rows and pagination would loop.
	const conditions = [sql`${users.createdAt} IS NOT NULL`];
	if (since) conditions.push(lt(users.createdAt, since));

	const rows = await db
		.select({
			id: users.id,
			email: users.email,
			createdAt: users.createdAt,
			profileName: clientProfiles.name,
			profileUsername: clientProfiles.username
		})
		.from(users)
		.leftJoin(clientProfiles, sql`${clientProfiles.userId} = ${users.id}`)
		.where(and(...conditions))
		.orderBy(desc(users.createdAt))
		.limit(limit);

	return rows.map((row) => {
		const displayName = row.profileName ?? row.profileUsername ?? row.email ?? row.id;
		return {
			id: `user:${row.id}`,
			type: 'user_registered',
			timestamp: row.createdAt.toISOString(),
			summary: `${displayName} signed up`,
			actor: { id: row.id, name: displayName, email: row.email ?? null },
			target: {
				id: row.id,
				type: 'user',
				name: displayName,
				adminUrl: `/admin/users/${row.id}`
			}
		};
	});
}

async function fetchItems(since: Date | null, limit: number): Promise<FeedEntry[]> {
	const allowedActions: ItemAuditActionValues[] = [ItemAuditAction.CREATED, ItemAuditAction.STATUS_CHANGED];
	const conditions = [inArray(itemAuditLogs.action, allowedActions)];
	// See `fetchUsers` for cursor-direction rationale.
	if (since) conditions.push(lt(itemAuditLogs.createdAt, since));

	const rows = await db
		.select()
		.from(itemAuditLogs)
		.where(and(...conditions))
		.orderBy(desc(itemAuditLogs.createdAt))
		.limit(limit);

	return rows.map((row) => {
		const isCreate = row.action === 'created';
		const type: FeedEntry['type'] = isCreate ? 'item_created' : 'item_status_changed';
		const summary = isCreate
			? `${row.performedByName ?? 'Someone'} added "${row.itemName}"`
			: `"${row.itemName}" status changed${row.previousStatus && row.newStatus ? ` (${row.previousStatus} → ${row.newStatus})` : ''}`;
		return {
			id: `item:${row.id}`,
			type,
			timestamp: row.createdAt.toISOString(),
			summary,
			actor: row.performedBy
				? { id: row.performedBy, name: row.performedByName ?? 'Unknown', email: null }
				: null,
			target: {
				id: row.itemId,
				type: 'item',
				name: row.itemName,
				adminUrl: `/admin/items/${encodeURIComponent(row.itemId)}`
			}
		};
	});
}

async function fetchReports(since: Date | null, limit: number): Promise<FeedEntry[]> {
	// See `fetchUsers` for cursor-direction rationale.
	const conditions = [sql`${reports.createdAt} IS NOT NULL`];
	if (since) conditions.push(lt(reports.createdAt, since));

	const rows = await db
		.select({
			id: reports.id,
			contentType: reports.contentType,
			contentId: reports.contentId,
			reason: reports.reason,
			createdAt: reports.createdAt,
			reportedBy: reports.reportedBy,
			profileName: clientProfiles.name,
			profileUsername: clientProfiles.username
		})
		.from(reports)
		.leftJoin(clientProfiles, sql`${clientProfiles.id} = ${reports.reportedBy}`)
		.where(and(...conditions))
		.orderBy(desc(reports.createdAt))
		.limit(limit);

	return rows.map((row) => {
		const reporterName = row.profileName ?? row.profileUsername ?? 'a user';
		return {
			id: `report:${row.id}`,
			type: 'report_created',
			timestamp: row.createdAt.toISOString(),
			summary: `${reporterName} reported a ${row.contentType} for ${row.reason}`,
			actor: row.reportedBy
				? { id: row.reportedBy, name: reporterName, email: null }
				: null,
			target: {
				id: row.id,
				type: 'report',
				name: `${row.contentType} report`,
				adminUrl: `/admin/reports/${row.id}`
			}
		};
	});
}

function withAdminUrl(entry: FeedEntry, base: string): FeedEntry {
	const trimmed = base.endsWith('/') ? base.slice(0, -1) : base;
	const target: FeedTarget = {
		...entry.target,
		adminUrl: entry.target.adminUrl.startsWith('http')
			? entry.target.adminUrl
			: `${trimmed}${entry.target.adminUrl}`
	};
	return { ...entry, target };
}
