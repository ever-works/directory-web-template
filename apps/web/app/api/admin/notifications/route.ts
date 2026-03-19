import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db/drizzle';
import { notifications } from '@/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * @swagger
 * /api/admin/notifications:
 *   get:
 *     tags: ["Admin - Notifications"]
 *     summary: "Get admin notifications"
 *     description: "Retrieves the latest 50 notifications for the authenticated admin user, ordered by creation date (newest first). Also returns the count of unread notifications. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Notifications retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: "Notification ID"
 *                             example: "notif_123abc"
 *                           userId:
 *                             type: string
 *                             description: "User ID who receives the notification"
 *                             example: "user_456def"
 *                           type:
 *                             type: string
 *                             description: "Notification type"
 *                             example: "item_approved"
 *                           title:
 *                             type: string
 *                             description: "Notification title"
 *                             example: "Item Approved"
 *                           message:
 *                             type: string
 *                             description: "Notification message"
 *                             example: "Your item 'Awesome Tool' has been approved and is now live."
 *                           data:
 *                             type: string
 *                             nullable: true
 *                             description: "Additional data as JSON string"
 *                             example: '{"itemId": "item_789ghi", "itemName": "Awesome Tool"}'
 *                           isRead:
 *                             type: boolean
 *                             description: "Whether the notification has been read"
 *                             example: false
 *                           readAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             description: "When the notification was read"
 *                             example: null
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: "When the notification was created"
 *                             example: "2024-01-20T10:30:00.000Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             description: "When the notification was last updated"
 *                             example: "2024-01-20T10:30:00.000Z"
 *                     unreadCount:
 *                       type: integer
 *                       description: "Number of unread notifications"
 *                       example: 3
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 notifications:
 *                   - id: "notif_123abc"
 *                     userId: "user_456def"
 *                     type: "item_approved"
 *                     title: "Item Approved"
 *                     message: "Your item 'Awesome Tool' has been approved and is now live."
 *                     data: '{"itemId": "item_789ghi", "itemName": "Awesome Tool"}'
 *                     isRead: false
 *                     readAt: null
 *                     createdAt: "2024-01-20T10:30:00.000Z"
 *                     updatedAt: "2024-01-20T10:30:00.000Z"
 *                   - id: "notif_234bcd"
 *                     userId: "user_456def"
 *                     type: "comment_received"
 *                     title: "New Comment"
 *                     message: "Someone commented on your item 'Great App'."
 *                     data: '{"itemId": "item_890jkl", "commentId": "comment_345efg"}'
 *                     isRead: true
 *                     readAt: "2024-01-19T16:45:00.000Z"
 *                     createdAt: "2024-01-19T15:20:00.000Z"
 *                     updatedAt: "2024-01-19T16:45:00.000Z"
 *                 unreadCount: 3
 *       401:
 *         description: "Unauthorized - Authentication required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: "Forbidden - Admin access required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Forbidden"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}
		const isAdmin = session.user.isAdmin;
		if (!isAdmin) {
			return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 403 });
		}

		// Get notifications for the admin user
		const userNotifications = await db
			.select()
			.from(notifications)
			.where(and(eq(notifications.userId, session.user.id), eq(notifications.tenantId, tenantId)))
			.orderBy(desc(notifications.createdAt))
			.limit(50);

		const unreadCountResult = await db
			.select({ count: count() })
			.from(notifications)
			.where(
				and(
					eq(notifications.userId, session.user.id),
					eq(notifications.isRead, false),
					eq(notifications.tenantId, tenantId)
				)
			);

		return NextResponse.json({
			success: true,
			data: {
				notifications: userNotifications,
				unreadCount: unreadCountResult[0]?.count || 0
			}
		});
	} catch (error) {
		console.error('Error fetching notifications:', error);
		return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/admin/notifications:
 *   post:
 *     tags: ["Admin - Notifications"]
 *     summary: "Create new notification"
 *     description: "Creates a new notification for a specific user. The notification will be delivered to the specified user and can include additional data as JSON. Requires authentication."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: "Notification type identifier"
 *                 example: "item_approved"
 *               title:
 *                 type: string
 *                 description: "Notification title"
 *                 example: "Item Approved"
 *               message:
 *                 type: string
 *                 description: "Notification message content"
 *                 example: "Your item 'Awesome Tool' has been approved and is now live."
 *               userId:
 *                 type: string
 *                 description: "ID of the user who will receive the notification"
 *                 example: "user_456def"
 *               data:
 *                 type: object
 *                 description: "Optional additional data (will be JSON stringified)"
 *                 example:
 *                   itemId: "item_789ghi"
 *                   itemName: "Awesome Tool"
 *                   action: "approved"
 *             required: ["type", "title", "message", "userId"]
 *     responses:
 *       200:
 *         description: "Notification created successfully"
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
 *                       description: "Generated notification ID"
 *                       example: "notif_123abc"
 *                     userId:
 *                       type: string
 *                       description: "User ID who receives the notification"
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
 *                       example: '{"itemId": "item_789ghi", "itemName": "Awesome Tool", "action": "approved"}'
 *                     isRead:
 *                       type: boolean
 *                       description: "Read status (always false for new notifications)"
 *                       example: false
 *                     readAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: "Read timestamp (null for new notifications)"
 *                       example: null
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: "Creation timestamp"
 *                       example: "2024-01-20T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: "Last update timestamp"
 *                       example: "2024-01-20T10:30:00.000Z"
 *               required: ["success", "notification"]
 *             example:
 *               success: true
 *               notification:
 *                 id: "notif_123abc"
 *                 userId: "user_456def"
 *                 type: "item_approved"
 *                 title: "Item Approved"
 *                 message: "Your item 'Awesome Tool' has been approved and is now live."
 *                 data: '{"itemId": "item_789ghi", "itemName": "Awesome Tool", "action": "approved"}'
 *                 isRead: false
 *                 readAt: null
 *                 createdAt: "2024-01-20T10:30:00.000Z"
 *                 updatedAt: "2024-01-20T10:30:00.000Z"
 *       400:
 *         description: "Bad request - Missing required fields"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Missing required fields"
 *       401:
 *         description: "Unauthorized - Authentication required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
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
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
export async function POST(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}
		const body = await request.json();
		const { type, title, message, data, userId } = body;

		if (!type || !title || !message || !userId) {
			return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
		}

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 403 });
		}

		const newNotification = await db
			.insert(notifications)
			.values({
				userId,
				type,
				title,
				message,
				data: data ? JSON.stringify(data) : null,
				tenantId
			})
			.returning();

		return NextResponse.json({
			success: true,
			notification: newNotification[0]
		});
	} catch (error) {
		console.error('Error creating notification:', error);
		return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
}
