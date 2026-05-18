/**
 * Spec 027 — POST /api/client/notifications/bulk
 *
 * Bulk read/unread/archive/delete by explicit id list or by filter
 * (tab + type). Owner-scoped.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, or, sql } from 'drizzle-orm';

import { requireClientAuth, badRequestResponse, serverErrorResponse } from '@/lib/utils/client-auth';
import { db } from '@/lib/db/drizzle';
import { notifications } from '@/lib/db/schema';
import { getTenantId } from '@/lib/auth/tenant';
import { isKnownType, MENTION_TYPES, NOTIFICATION_TYPES } from '@/lib/notifications';
import type { BulkRequest } from '@/lib/notifications/types';

const VALID_ACTIONS = new Set(['read', 'unread', 'archive', 'delete']);

export async function POST(req: NextRequest) {
	const authResult = await requireClientAuth();
	if (!authResult.success) return authResult.response;

	try {
		const tenantId = await getTenantId();
		if (!tenantId) return badRequestResponse('Tenant ID not found');

		const body = (await req.json().catch(() => null)) as BulkRequest | null;
		if (!body || !body.action || !VALID_ACTIONS.has(body.action)) {
			return badRequestResponse('Invalid bulk action');
		}
		if ((!body.ids || body.ids.length === 0) && !body.filter) {
			return badRequestResponse('Must provide ids or filter');
		}

		const tabClause =
			body.filter?.tab === 'unread'
				? eq(notifications.isRead, false)
				: body.filter?.tab === 'mentions'
					? inArray(
							notifications.type,
							Array.from(MENTION_TYPES) as (typeof NOTIFICATION_TYPES)[number][]
						)
					: body.filter?.tab === 'system'
						? or(
								eq(notifications.category, 'system'),
								eq(notifications.category, 'account'),
								eq(notifications.type, 'payment_failed')
							)
						: undefined;

		const typeClause =
			body.filter?.type && isKnownType(body.filter.type) ? eq(notifications.type, body.filter.type) : undefined;

		const idClause = body.ids && body.ids.length > 0 ? inArray(notifications.id, body.ids) : undefined;

		const scope = and(
			eq(notifications.userId, authResult.userId),
			eq(notifications.tenantId, tenantId),
			idClause,
			tabClause,
			typeClause
		);

		let updatedCount = 0;
		switch (body.action) {
			case 'read': {
				const updated = await db
					.update(notifications)
					.set({ isRead: true, readAt: new Date(), updatedAt: new Date() })
					.where(scope)
					.returning({ id: notifications.id });
				updatedCount = updated.length;
				break;
			}
			case 'unread': {
				const updated = await db
					.update(notifications)
					.set({ isRead: false, readAt: null, updatedAt: new Date() })
					.where(scope)
					.returning({ id: notifications.id });
				updatedCount = updated.length;
				break;
			}
			case 'archive': {
				const updated = await db
					.update(notifications)
					.set({ archivedAt: new Date(), updatedAt: new Date() })
					.where(and(scope, sql`${notifications.archivedAt} IS NULL`))
					.returning({ id: notifications.id });
				updatedCount = updated.length;
				break;
			}
			case 'delete': {
				const deleted = await db.delete(notifications).where(scope).returning({ id: notifications.id });
				updatedCount = deleted.length;
				break;
			}
		}

		return NextResponse.json({ success: true, data: { updatedCount } });
	} catch (error) {
		return serverErrorResponse(error, 'Failed to perform bulk action');
	}
}
