/**
 * Spec 027 — GET /api/client/notifications
 *
 * Page-based paginated list for the authenticated user, scoped to
 * their tenant.  Supports tab filter, type filter, priority filter,
 * search, and date range.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, count, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';

import { requireClientAuth, badRequestResponse, serverErrorResponse } from '@/lib/utils/client-auth';
import { db } from '@/lib/db/drizzle';
import { notifications } from '@/lib/db/schema';
import { getTenantId } from '@/lib/auth/tenant';
import { rowToListItem } from '@/lib/services/notification.service';
import { isKnownType, NOTIFICATION_PRIORITIES } from '@/lib/notifications';
import type { NotificationListResponse } from '@/lib/notifications/types';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
	const authResult = await requireClientAuth();
	if (!authResult.success) return authResult.response;

	try {
		const tenantId = await getTenantId();
		if (!tenantId) return badRequestResponse('Tenant ID not found');

		const url = new URL(req.url);
		const tab = url.searchParams.get('tab') ?? 'all';
		const typeParams = url.searchParams.getAll('type').filter(isKnownType);
		const priorityParams = url.searchParams
			.getAll('priority')
			.filter((p): p is (typeof NOTIFICATION_PRIORITIES)[number] =>
				(NOTIFICATION_PRIORITIES as readonly string[]).includes(p)
			);
		const q = url.searchParams.get('q')?.trim() ?? '';
		const dateFrom = url.searchParams.get('dateFrom');
		const dateTo = url.searchParams.get('dateTo');
		const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
		const limit = clampLimit(url.searchParams.get('limit'));

		const where = and(
			eq(notifications.userId, authResult.userId),
			eq(notifications.tenantId, tenantId),
			sql`${notifications.archivedAt} IS NULL`,
			tab === 'unread' ? eq(notifications.isRead, false) : undefined,
			tab === 'system'
				? or(
						eq(notifications.category, 'system'),
						eq(notifications.category, 'account'),
						eq(notifications.type, 'payment_failed')
					)
				: undefined,
			typeParams.length > 0 ? inArray(notifications.type, typeParams) : undefined,
			priorityParams.length > 0 ? inArray(notifications.priority, priorityParams) : undefined,
			q
				? or(ilike(notifications.title, `%${q}%`), ilike(notifications.message, `%${q}%`))
				: undefined,
			dateFrom ? gte(notifications.createdAt, new Date(dateFrom)) : undefined,
			dateTo ? lte(notifications.createdAt, new Date(dateTo)) : undefined
		);

		const [totalResult, rows, unreadResult] = await Promise.all([
			db.select({ count: count() }).from(notifications).where(where),
			db
				.select()
				.from(notifications)
				.where(where)
				.orderBy(desc(notifications.createdAt))
				.limit(limit)
				.offset((page - 1) * limit),
			db
				.select({ count: count() })
				.from(notifications)
				.where(
					and(
						eq(notifications.userId, authResult.userId),
						eq(notifications.tenantId, tenantId),
						eq(notifications.isRead, false),
						sql`${notifications.archivedAt} IS NULL`
					)
				)
		]);

		const total = totalResult[0]?.count ?? 0;
		const totalPages = Math.max(1, Math.ceil(total / limit));

		const body: NotificationListResponse = {
			notifications: rows.map(rowToListItem),
			total,
			page,
			totalPages,
			unreadCount: unreadResult[0]?.count ?? 0
		};

		return NextResponse.json({ success: true, data: body });
	} catch (error) {
		return serverErrorResponse(error, 'Failed to load notifications');
	}
}

function clampLimit(raw: string | null): number {
	if (!raw) return DEFAULT_LIMIT;
	const n = Number.parseInt(raw, 10);
	if (Number.isNaN(n) || n <= 0) return DEFAULT_LIMIT;
	return Math.min(n, MAX_LIMIT);
}
