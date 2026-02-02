import { db } from '@/lib/db/drizzle';
import { notifications, type Notification } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export interface CreateNotificationData {
	userId: string;
	type:
		| 'item_submission'
		| 'comment_reported'
		| 'item_reported'
		| 'user_registered'
		| 'payment_failed'
		| 'system_alert';
	title: string;
	message: string;
	data?: Record<string, unknown>;
	tenantId: string;
}

export interface NotificationStats {
	total: number;
	unread: number;
	byType: Record<string, number>;
}

export class NotificationService {
	/**
	 * Create a new notification
	 */
	static async create(data: CreateNotificationData) {
		try {
			const newNotification = await db
				.insert(notifications)
				.values({
					userId: data.userId,
					type: data.type,
					title: data.title,
					message: data.message,
					data: data.data ? JSON.stringify(data.data) : null,
					tenantId: data.tenantId
				})
				.returning();

			return {
				success: true,
				notification: newNotification[0]
			};
		} catch (error) {
			console.error('Error creating notification:', error);
			return {
				success: false,
				error: 'Failed to create notification'
			};
		}
	}

	/**
	 * Create notification for item submission
	 */
	static async createItemSubmissionNotification(
		adminUserId: string,
		itemId: string,
		itemName: string,
		submittedBy: string,
		tenantId: string
	) {
		return this.create({
			userId: adminUserId,
			type: 'item_submission',
			title: 'New Item Submission',
			message: `A new item "${itemName}" has been submitted by ${submittedBy} and requires review.`,
			data: {
				itemId,
				itemName,
				submittedBy,
				actionUrl: `/admin/items/${itemId}`
			},
			tenantId
		});
	}

	/**
	 * Create notification for reported comment
	 */
	static async createCommentReportedNotification(
		adminUserId: string,
		commentId: string,
		commentContent: string,
		reportedBy: string,
		tenantId: string
	) {
		return this.create({
			userId: adminUserId,
			type: 'comment_reported',
			title: 'Comment Reported',
			message: `A comment has been reported by ${reportedBy} and requires review.`,
			data: {
				commentId,
				commentContent: commentContent.substring(0, 100) + '...',
				reportedBy,
				actionUrl: `/admin/comments/${commentId}`
			},
			tenantId
		});
	}

	/**
	 * Create notification for reported item
	 */
	static async createItemReportedNotification(
		adminUserId: string,
		reportId: string,
		itemId: string,
		itemName: string,
		reportedBy: string,
		reason: string,
		tenantId: string
	) {
		return this.create({
			userId: adminUserId,
			type: 'item_reported',
			title: 'Item Reported',
			message: `The item "${itemName}" has been reported for ${reason} by ${reportedBy}.`,
			data: {
				reportId,
				itemId,
				itemName,
				reportedBy,
				reason,
				actionUrl: `/admin/reports`
			},
			tenantId
		});
	}

	/**
	 * Create notification for new user registration
	 */
	static async createUserRegisteredNotification(
		adminUserId: string,
		userId: string,
		userEmail: string,
		tenantId: string
	) {
		return this.create({
			userId: adminUserId,
			type: 'user_registered',
			title: 'New User Registration',
			message: `A new user has registered with email: ${userEmail}`,
			data: {
				userId,
				userEmail,
				actionUrl: `/admin/users/${userId}`
			},
			tenantId
		});
	}

	/**
	 * Create notification for payment failure
	 */
	static async createPaymentFailedNotification(
		adminUserId: string,
		userId: string,
		userEmail: string,
		amount: number,
		reason: string,
		tenantId: string
	) {
		return this.create({
			userId: adminUserId,
			type: 'payment_failed',
			title: 'Payment Failure',
			message: `Payment failed for user ${userEmail} (${amount} USD). Reason: ${reason}`,
			data: {
				userId,
				userEmail,
				amount,
				reason,
				actionUrl: `/admin/users/${userId}`
			},
			tenantId
		});
	}

	/**
	 * Create system alert notification
	 */
	static async createSystemAlertNotification(
		adminUserId: string,
		title: string,
		message: string,
		tenantId: string,
		data?: Record<string, unknown>
	) {
		return this.create({
			userId: adminUserId,
			type: 'system_alert',
			title,
			message,
			data,
			tenantId
		});
	}

	/**
	 * Get notification statistics for a user
	 */
	static async getNotificationStats(userId: string, tenantId: string): Promise<NotificationStats> {
		try {
			const userNotifications = await db
				.select()
				.from(notifications)
				.where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId)));

			const total = userNotifications.length;
			const unread = userNotifications.filter((n: Notification) => !n.isRead).length;

			const byType = userNotifications.reduce(
				(acc: Record<string, number>, notification: Notification) => {
					acc[notification.type] = (acc[notification.type] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			);

			return { total, unread, byType };
		} catch (error) {
			console.error('Error getting notification stats:', error);
			return { total: 0, unread: 0, byType: {} };
		}
	}

	/**
	 * Mark notification as read
	 */
	static async markAsRead(notificationId: string, userId: string, tenantId: string) {
		try {
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
						eq(notifications.userId, userId),
						eq(notifications.tenantId, tenantId)
					)
				)
				.returning();

			return {
				success: true,
				notification: updatedNotification[0]
			};
		} catch (error) {
			console.error('Error marking notification as read:', error);
			return {
				success: false,
				error: 'Failed to mark notification as read'
			};
		}
	}

	/**
	 * Mark all notifications as read for a user
	 */
	static async markAllAsRead(userId: string, tenantId: string) {
		try {
			const updatedNotifications = await db
				.update(notifications)
				.set({
					isRead: true,
					readAt: new Date(),
					updatedAt: new Date()
				})
				.where(
					and(
						eq(notifications.userId, userId),
						eq(notifications.isRead, false),
						eq(notifications.tenantId, tenantId)
					)
				)
				.returning();

			return {
				success: true,
				updatedCount: updatedNotifications.length
			};
		} catch (error) {
			console.error('Error marking all notifications as read:', error);
			return {
				success: false,
				error: 'Failed to mark all notifications as read'
			};
		}
	}

	/**
	 * Delete old notifications (cleanup)
	 */
	static async cleanupOldNotifications(tenantId: string, daysOld: number = 90) {
		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - daysOld);

			const deletedNotifications = await db
				.delete(notifications)
				.where(
					and(
						eq(notifications.isRead, true),
						eq(notifications.tenantId, tenantId)
						// Add date condition when the field is available
						// lt(notifications.createdAt, cutoffDate)
					)
				)
				.returning();

			return {
				success: true,
				deletedCount: deletedNotifications.length
			};
		} catch (error) {
			console.error('Error cleaning up old notifications:', error);
			return {
				success: false,
				error: 'Failed to cleanup old notifications'
			};
		}
	}
}
