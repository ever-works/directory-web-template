/**
 * Spec 027 — GET /api/client/notifications/stats
 *
 * Returns total + unread + per-tab counts. Used by the bell badge and tab labels.
 */

import { NextResponse } from 'next/server';
import { and, eq, or, sql } from 'drizzle-orm';

import { requireClientAuth, badRequestResponse, serverErrorResponse } from '@/lib/utils/client-auth';
import { db } from '@/lib/db/drizzle';
import { notifications } from '@/lib/db/schema';
import { getTenantId } from '@/lib/auth/tenant';
import type { NotificationStatsResponse } from '@/lib/notifications/types';

export async function GET() {
	const authResult = await requireClientAuth();
	if (!authResult.success) return authResult.response;

	try {
		const tenantId = await getTenantId();
		if (!tenantId) return badRequestResponse('Tenant ID not found');

		const baseScope = and(
			eq(notifications.userId, authResult.userId),
			eq(notifications.tenantId, tenantId),
			sql`${notifications.archivedAt} IS NULL`
		);

		const isSystemNotification = or(
			eq(notifications.category, 'system'),
			eq(notifications.category, 'account'),
			eq(notifications.type, 'payment_failed')
		);

		const counts = await db
			.select({
				total: sql<number>`count(*)::int`,
				unread: sql<number>`count(*) filter (where ${notifications.isRead} = false)::int`,
				systemUnread: sql<number>`count(*) filter (where ${notifications.isRead} = false and (${isSystemNotification}))::int`
			})
			.from(notifications)
			.where(baseScope);

		const row = counts[0];
		const unread = row?.unread ?? 0;
		const body: NotificationStatsResponse = {
			total: row?.total ?? 0,
			unread,
			// byTab is an "has unread" signal per tab — the UI renders a dot
			// indicator (not a number) when a value here is > 0.
			byTab: {
				all: unread,
				unread,
				system: row?.systemUnread ?? 0
			}
		};
		return NextResponse.json({ success: true, data: body });
	} catch (error) {
		return serverErrorResponse(error, 'Failed to load notification stats');
	}
}
