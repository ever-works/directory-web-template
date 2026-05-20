/**
 * Spec 027 — PATCH / DELETE /api/client/notifications/[id]
 *
 * Owner-scoped mutations on a single notification row.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import {
	requireClientAuth,
	badRequestResponse,
	notFoundResponse,
	serverErrorResponse
} from '@/lib/utils/client-auth';
import { db } from '@/lib/db/drizzle';
import { notifications } from '@/lib/db/schema';
import { getTenantId } from '@/lib/auth/tenant';
import { rowToListItem } from '@/lib/services/notification.service';

interface PatchBody {
	isRead?: boolean;
	archive?: boolean;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const authResult = await requireClientAuth();
	if (!authResult.success) return authResult.response;

	try {
		const { id } = await params;
		if (!id) return badRequestResponse('Missing notification id');
		const tenantId = await getTenantId();
		if (!tenantId) return badRequestResponse('Tenant ID not found');

		const body = (await req.json().catch(() => ({}))) as PatchBody;
		const set: Partial<typeof notifications.$inferInsert> = { updatedAt: new Date() };
		if (typeof body.isRead === 'boolean') {
			set.isRead = body.isRead;
			set.readAt = body.isRead ? new Date() : null;
		}
		if (body.archive === true) {
			set.archivedAt = new Date();
		}

		const updated = await db
			.update(notifications)
			.set(set)
			.where(
				and(
					eq(notifications.id, id),
					eq(notifications.userId, authResult.userId),
					eq(notifications.tenantId, tenantId)
				)
			)
			.returning();

		const row = updated[0];
		if (!row) return notFoundResponse('Notification not found');
		return NextResponse.json({ success: true, data: rowToListItem(row) });
	} catch (error) {
		return serverErrorResponse(error, 'Failed to update notification');
	}
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const authResult = await requireClientAuth();
	if (!authResult.success) return authResult.response;

	try {
		const { id } = await params;
		if (!id) return badRequestResponse('Missing notification id');
		const tenantId = await getTenantId();
		if (!tenantId) return badRequestResponse('Tenant ID not found');

		const deleted = await db
			.delete(notifications)
			.where(
				and(
					eq(notifications.id, id),
					eq(notifications.userId, authResult.userId),
					eq(notifications.tenantId, tenantId)
				)
			)
			.returning({ id: notifications.id });

		if (deleted.length === 0) return notFoundResponse('Notification not found');
		return NextResponse.json({ success: true, data: { id } });
	} catch (error) {
		return serverErrorResponse(error, 'Failed to delete notification');
	}
}
