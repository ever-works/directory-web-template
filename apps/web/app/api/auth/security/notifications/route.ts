import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { notificationPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/tenant';
import { z } from 'zod';

const SECURITY_TYPES = ['security_alert', 'password_changed'] as const;
type SecurityType = (typeof SECURITY_TYPES)[number];

const channelUpdateSchema = z.object({
	security_alert: z
		.object({
			in_app: z.boolean().optional(),
			email: z.boolean().optional(),
		})
		.optional(),
	password_changed: z
		.object({
			in_app: z.boolean().optional(),
			email: z.boolean().optional(),
		})
		.optional(),
});

const DEFAULT_PREFS: Record<SecurityType, { in_app: boolean; email: boolean }> = {
	security_alert: { in_app: true, email: true },
	password_changed: { in_app: true, email: true },
};

function extractSecurityPrefs(
	raw: Record<string, unknown>
): Record<SecurityType, { in_app: boolean; email: boolean }> {
	const result = { ...DEFAULT_PREFS };
	for (const type of SECURITY_TYPES) {
		const entry = raw[type] as Record<string, unknown> | undefined;
		if (entry && typeof entry === 'object') {
			result[type] = {
				in_app: typeof entry.in_app === 'boolean' ? entry.in_app : DEFAULT_PREFS[type].in_app,
				email: typeof entry.email === 'boolean' ? entry.email : DEFAULT_PREFS[type].email,
			};
		}
	}
	return result;
}

/**
 * @swagger
 * /api/auth/security/notifications:
 *   get:
 *     tags: ["Authentication"]
 *     summary: "Get security notification preferences"
 *     description: "Returns email and in-app channel settings for security events."
 *     security:
 *       - sessionAuth: []
 */
export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
		}

		const userId = session.user.id;

		const [row] = await db
			.select({ preferences: notificationPreferences.preferences })
			.from(notificationPreferences)
			.where(eq(notificationPreferences.userId, userId))
			.limit(1);

		const raw = (row?.preferences as Record<string, unknown>) ?? {};
		const data = extractSecurityPrefs(raw);

		return NextResponse.json({ success: true, data });
	} catch (error) {
		console.error('Security notifications GET error:', error);
		return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/auth/security/notifications:
 *   patch:
 *     tags: ["Authentication"]
 *     summary: "Update security notification preferences"
 *     description: "Merges the supplied channel toggles into the user's notification preferences."
 *     security:
 *       - sessionAuth: []
 */
export async function PATCH(req: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
		}

		const tenantId = await getTenantId();

		const body = await req.json();
		const parsed = channelUpdateSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, error: 'Invalid request body.', details: parsed.error.flatten() },
				{ status: 422 }
			);
		}

		const userId = session.user.id;

		const [existing] = await db
			.select({ preferences: notificationPreferences.preferences })
			.from(notificationPreferences)
			.where(eq(notificationPreferences.userId, userId))
			.limit(1);

		const currentPrefs = (existing?.preferences as Record<string, unknown>) ?? {};

		const merged: Record<string, unknown> = { ...currentPrefs };
		for (const type of SECURITY_TYPES) {
			const update = parsed.data[type];
			if (!update) continue;
			const current = (merged[type] as Record<string, unknown>) ?? {};
			merged[type] = { ...current, ...update };
		}

		await db
			.insert(notificationPreferences)
			.values({
				userId,
				preferences: merged,
				tenantId: tenantId ?? null,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: notificationPreferences.userId,
				set: {
					preferences: merged,
					updatedAt: new Date(),
				},
			});

		return NextResponse.json({ success: true, data: extractSecurityPrefs(merged) });
	} catch (error) {
		console.error('Security notifications PATCH error:', error);
		return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
	}
}
