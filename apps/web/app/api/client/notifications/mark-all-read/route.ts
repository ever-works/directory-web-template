/**
 * Spec 027 — POST /api/client/notifications/mark-all-read
 *
 * Marks every unread notification for the authenticated user as read,
 * scoped to the current tenant.
 */

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { requireClientAuth, badRequestResponse, serverErrorResponse } from '@/lib/utils/client-auth';
import { db } from '@/lib/db/drizzle';
import { notifications } from '@/lib/db/schema';
import { getTenantId } from '@/lib/auth/tenant';

export async function POST() {
	const authResult = await requireClientAuth();
	if (!authResult.success) return authResult.response;

	try {
		const tenantId = await getTenantId();
		if (!tenantId) return badRequestResponse('Tenant ID not found');

		const updated = await db
			.update(notifications)
			.set({ isRead: true, readAt: new Date(), updatedAt: new Date() })
			.where(
				and(
					eq(notifications.userId, authResult.userId),
					eq(notifications.tenantId, tenantId),
					eq(notifications.isRead, false)
				)
			)
			.returning({ id: notifications.id });

		return NextResponse.json({ success: true, data: { updatedCount: updated.length } });
	} catch (error) {
		return serverErrorResponse(error, 'Failed to mark all notifications as read');
	}
}
