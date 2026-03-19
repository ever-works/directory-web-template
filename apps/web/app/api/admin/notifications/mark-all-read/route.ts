import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { notifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * @swagger
 * /api/admin/notifications/mark-all-read:
 *   patch:
 *     tags: ["Admin - Notifications"]
 *     summary: "Mark all notifications as read"
 *     description: "Marks all unread notifications for the authenticated user as read. Updates the isRead flag to true, sets readAt timestamp, and updates the updatedAt timestamp. Returns the count of notifications that were updated. Requires authentication."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "All notifications marked as read successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 updatedCount:
 *                   type: integer
 *                   description: "Number of notifications that were marked as read"
 *                   example: 5
 *               required: ["success", "updatedCount"]
 *             example:
 *               success: true
 *               updatedCount: 5
 *       401:
 *         description: "Unauthorized - Authentication required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
export async function PATCH() {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const tenantId = session.user.tenantId;
		if (!tenantId) {
			return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
		}

		const updatedNotifications = await db
			.update(notifications)
			.set({
				isRead: true,
				readAt: new Date(),
				updatedAt: new Date()
			})
			.where(
				and(
					eq(notifications.userId, session.user.id),
					eq(notifications.isRead, false),
					eq(notifications.tenantId, tenantId)
				)
			)
			.returning();

		return NextResponse.json({
			success: true,
			updatedCount: updatedNotifications.length
		});
	} catch (error) {
		console.error('Error marking all notifications as read:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
