import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { notifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

/**
 * @swagger
 * /api/admin/notifications/{id}/read:
 *   patch:
 *     tags: ["Admin - Notifications"]
 *     summary: "Mark specific notification as read"
 *     description: "Marks a specific notification as read by its ID. Updates the isRead flag to true, sets readAt timestamp, and updates the updatedAt timestamp. Only the notification owner can mark their own notifications as read. Requires authentication."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Notification ID to mark as read"
 *         example: "notif_123abc"
 *     responses:
 *       200:
 *         description: "Notification marked as read successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 notification:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: "Notification ID"
 *                       example: "notif_123abc"
 *                     userId:
 *                       type: string
 *                       description: "User ID who owns the notification"
 *                       example: "user_456def"
 *                     type:
 *                       type: string
 *                       description: "Notification type"
 *                       example: "item_approved"
 *                     title:
 *                       type: string
 *                       description: "Notification title"
 *                       example: "Item Approved"
 *                     message:
 *                       type: string
 *                       description: "Notification message"
 *                       example: "Your item 'Awesome Tool' has been approved and is now live."
 *                     data:
 *                       type: string
 *                       nullable: true
 *                       description: "Additional data as JSON string"
 *                       example: '{"itemId": "item_789ghi", "itemName": "Awesome Tool"}'
 *                     isRead:
 *                       type: boolean
 *                       description: "Read status (will be true after this operation)"
 *                       example: true
 *                     readAt:
 *                       type: string
 *                       format: date-time
 *                       description: "When the notification was marked as read"
 *                       example: "2024-01-20T16:45:00.000Z"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: "When the notification was created"
 *                       example: "2024-01-20T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: "When the notification was last updated"
 *                       example: "2024-01-20T16:45:00.000Z"
 *               required: ["success", "notification"]
 *             example:
 *               success: true
 *               notification:
 *                 id: "notif_123abc"
 *                 userId: "user_456def"
 *                 type: "item_approved"
 *                 title: "Item Approved"
 *                 message: "Your item 'Awesome Tool' has been approved and is now live."
 *                 data: '{"itemId": "item_789ghi", "itemName": "Awesome Tool"}'
 *                 isRead: true
 *                 readAt: "2024-01-20T16:45:00.000Z"
 *                 createdAt: "2024-01-20T10:30:00.000Z"
 *                 updatedAt: "2024-01-20T16:45:00.000Z"
 *       400:
 *         description: "Bad request - Missing notification ID"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Notification ID is required"
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
 *       403:
 *         description: "Forbidden - Tenant not found"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Tenant not found"
 *       404:
 *         description: "Notification not found or not owned by user"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Notification not found"
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
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id: notificationId } = await params;

		if (!notificationId) {
			return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
		}

		const tenantId = session.user.tenantId;
		if (!tenantId) {
			return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
		}

		const updatedNotification = await db
			.update(notifications)
			.set({
				isRead: true,
				readAt: new Date(),
				updatedAt: new Date()
			})
			.where(
				and(
					eq(notifications.id, notificationId),
					eq(notifications.userId, session.user.id),
					eq(notifications.tenantId, tenantId)
				)
			)
			.returning();

		if (updatedNotification.length === 0) {
			return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			notification: updatedNotification[0]
		});
	} catch (error) {
		console.error('Error marking notification as read:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
