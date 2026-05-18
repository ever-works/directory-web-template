/**
 * Spec 027 — GET / PUT /api/client/notifications/preferences
 *
 * Read or upsert the per-user JSONB preference matrix.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { requireClientAuth, badRequestResponse, serverErrorResponse } from '@/lib/utils/client-auth';
import { db } from '@/lib/db/drizzle';
import { notificationPreferences } from '@/lib/db/schema';
import { getTenantId } from '@/lib/auth/tenant';
import type { NotificationPreferencesPayload, NotificationDigest } from '@/lib/notifications/types';
import { NOTIFICATION_CHANNELS, isKnownType } from '@/lib/notifications';

const VALID_DIGEST = new Set<NotificationDigest>(['instant', 'daily', 'weekly', 'off']);

function defaultsPayload(): NotificationPreferencesPayload {
	return {
		preferences: {},
		emailDigest: 'instant',
		quietHoursStart: null,
		quietHoursEnd: null,
		timezone: 'UTC',
		pushEnabled: false
	};
}

export async function GET() {
	const authResult = await requireClientAuth();
	if (!authResult.success) return authResult.response;

	try {
		const rows = await db
			.select()
			.from(notificationPreferences)
			.where(eq(notificationPreferences.userId, authResult.userId))
			.limit(1);

		const row = rows[0];
		if (!row) {
			return NextResponse.json({ success: true, data: defaultsPayload() });
		}

		const payload: NotificationPreferencesPayload = {
			preferences: (row.preferences as NotificationPreferencesPayload['preferences']) ?? {},
			emailDigest: (row.emailDigest as NotificationDigest) ?? 'instant',
			quietHoursStart: row.quietHoursStart,
			quietHoursEnd: row.quietHoursEnd,
			timezone: row.timezone,
			pushEnabled: row.pushEnabled
		};
		return NextResponse.json({ success: true, data: payload });
	} catch (error) {
		return serverErrorResponse(error, 'Failed to load notification preferences');
	}
}

export async function PUT(req: NextRequest) {
	const authResult = await requireClientAuth();
	if (!authResult.success) return authResult.response;

	try {
		const tenantId = await getTenantId();
		if (!tenantId) return badRequestResponse('Tenant ID not found');

		const body = (await req.json().catch(() => null)) as Partial<NotificationPreferencesPayload> | null;
		if (!body) return badRequestResponse('Invalid body');

		if (body.emailDigest && !VALID_DIGEST.has(body.emailDigest)) {
			return badRequestResponse('Invalid emailDigest value');
		}

		const sanitizedMatrix: NotificationPreferencesPayload['preferences'] = {};
		if (body.preferences) {
			for (const [type, channels] of Object.entries(body.preferences)) {
				if (!isKnownType(type)) continue;
				const cleanChannels: Record<string, boolean> = {};
				for (const [ch, on] of Object.entries(channels ?? {})) {
					if ((NOTIFICATION_CHANNELS as readonly string[]).includes(ch)) {
						cleanChannels[ch] = Boolean(on);
					}
				}
				sanitizedMatrix[type] = cleanChannels as NotificationPreferencesPayload['preferences'][typeof type];
			}
		}

		const values: typeof notificationPreferences.$inferInsert = {
			userId: authResult.userId,
			preferences: sanitizedMatrix,
			emailDigest: body.emailDigest ?? 'instant',
			quietHoursStart: body.quietHoursStart ?? null,
			quietHoursEnd: body.quietHoursEnd ?? null,
			timezone: body.timezone ?? 'UTC',
			pushEnabled: Boolean(body.pushEnabled),
			pushTokens: [],
			updatedAt: new Date(),
			tenantId
		};

		const upserted = await db
			.insert(notificationPreferences)
			.values(values)
			.onConflictDoUpdate({
				target: notificationPreferences.userId,
				set: {
					preferences: values.preferences,
					emailDigest: values.emailDigest,
					quietHoursStart: values.quietHoursStart,
					quietHoursEnd: values.quietHoursEnd,
					timezone: values.timezone,
					pushEnabled: values.pushEnabled,
					updatedAt: values.updatedAt
				}
			})
			.returning();

		const row = upserted[0];
		if (!row) return serverErrorResponse(new Error('upsert returned no row'));

		const payload: NotificationPreferencesPayload = {
			preferences: (row.preferences as NotificationPreferencesPayload['preferences']) ?? {},
			emailDigest: row.emailDigest as NotificationDigest,
			quietHoursStart: row.quietHoursStart,
			quietHoursEnd: row.quietHoursEnd,
			timezone: row.timezone,
			pushEnabled: row.pushEnabled
		};
		return NextResponse.json({ success: true, data: payload });
	} catch (error) {
		return serverErrorResponse(error, 'Failed to save notification preferences');
	}
}
