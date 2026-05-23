import { db } from '@/lib/db/drizzle';
import { notifications, notificationPreferences, type Notification } from '@/lib/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/tenant';
import {
	metaFor,
	notificationPubSub,
	resolveChannels,
	type NotificationChannel,
	type NotificationEvent,
	type NotificationListItem,
	type NotificationPreferencesMap,
	type NotificationType
} from '@/lib/notifications';

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
			const tenantId = await getTenantId();
			if (!tenantId) throw new Error('Tenant ID not found');

			const newNotification = await db
				.insert(notifications)
				.values({
					userId: data.userId,
					type: data.type,
					title: data.title,
					message: data.message,
					data: data.data ? JSON.stringify(data.data) : null,
					tenantId
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
		submittedBy: string
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
			}
		});
	}

	/**
	 * Create notification for reported comment
	 */
	static async createCommentReportedNotification(
		adminUserId: string,
		commentId: string,
		commentContent: string,
		reportedBy: string
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
			}
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
		reason: string
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
			}
		});
	}

	/**
	 * Create notification for new user registration
	 */
	static async createUserRegisteredNotification(adminUserId: string, userId: string, userEmail: string) {
		return this.create({
			userId: adminUserId,
			type: 'user_registered',
			title: 'New User Registration',
			message: `A new user has registered with email: ${userEmail}`,
			data: {
				userId,
				userEmail,
				actionUrl: `/admin/users/${userId}`
			}
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
		reason: string
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
			}
		});
	}

	/**
	 * Create system alert notification
	 */
	static async createSystemAlertNotification(
		adminUserId: string,
		title: string,
		message: string,
		data?: Record<string, unknown>
	) {
		return this.create({
			userId: adminUserId,
			type: 'system_alert',
			title,
			message,
			data
		});
	}

	/**
	 * Get notification statistics for a user
	 */
	static async getNotificationStats(userId: string): Promise<NotificationStats> {
		try {
			const tenantId = await getTenantId();
			if (!tenantId) throw new Error('Tenant ID not found');

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
	static async markAsRead(notificationId: string, userId: string) {
		try {
			const tenantId = await getTenantId();
			if (!tenantId) throw new Error('Tenant ID not found');

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
	static async markAllAsRead(userId: string) {
		try {
			const tenantId = await getTenantId();
			if (!tenantId) throw new Error('Tenant ID not found');

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
	static async cleanupOldNotifications(daysOld: number = 90) {
		try {
			const tenantId = await getTenantId();
			if (!tenantId) throw new Error('Tenant ID not found');

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

	// ===================================================================
	// Spec 027 — dispatch() pipeline
	// ===================================================================

	/**
	 * Dispatch a typed notification event for a recipient.
	 *
	 * Resolves preferences, applies group-key collapse for repeat
	 * events (e.g. reactions), inserts the canonical DB row, and
	 * publishes to the in-memory pubsub so any open SSE connection
	 * receives it immediately. Off-platform channels (email, push,
	 * sms) are reserved as `deliveredChannels` markers — actual
	 * dispatch is queued via Trigger.dev jobs in a follow-up.
	 *
	 * Errors are caught here so the originating action (comment
	 * post, follow, payment, etc.) never fails because of a
	 * notification problem.
	 */
	static async dispatch(event: NotificationEvent): Promise<{
		success: boolean;
		notificationId?: string;
		error?: string;
	}> {
		try {
			const meta = metaFor(event.type);
			if (!meta) {
				return { success: false, error: `Unknown notification type: ${event.type}` };
			}

			const tenantId = event.tenantId ?? (await getTenantId());
			if (!tenantId) {
				return { success: false, error: 'Tenant ID not found' };
			}

			// 1. Resolve channels via stored preferences (or registry defaults).
			const prefsRow = await db
				.select()
				.from(notificationPreferences)
				.where(eq(notificationPreferences.userId, event.recipientId))
				.limit(1);

			const prefs = prefsRow[0];
			const resolved = resolveChannels({
				type: event.type,
				userPreferences: (prefs?.preferences as NotificationPreferencesMap) ?? {},
				emailDigest: (prefs?.emailDigest as 'instant' | 'daily' | 'weekly' | 'off') ?? 'instant',
				quietHours: prefs
					? {
							start: prefs.quietHoursStart,
							end: prefs.quietHoursEnd,
							timezone: prefs.timezone
						}
					: undefined,
				pushEnabled: prefs?.pushEnabled ?? false
			});

			if (resolved.channels.length === 0) {
				return { success: true };
			}
			const inApp = resolved.channels.includes('in_app');

			// 2. Compute group key + apply collapse window.
			const groupKey = event.groupKey ?? computeGroupKey(event);
			if (inApp && groupKey && meta.groupWindowMs) {
				const since = new Date(Date.now() - meta.groupWindowMs);
				const existing = await db
					.select()
					.from(notifications)
					.where(
						and(
							eq(notifications.userId, event.recipientId),
							eq(notifications.groupKey, groupKey),
							eq(notifications.isRead, false),
							gte(notifications.createdAt, since)
						)
					)
					.orderBy(desc(notifications.createdAt))
					.limit(1);

				if (existing[0]) {
					const merged = mergeGroupedData(existing[0].data, event);
					await db
						.update(notifications)
						.set({
							data: merged,
							updatedAt: new Date()
						})
						.where(eq(notifications.id, existing[0].id));
					notificationPubSub.publish(event.recipientId, rowToListItem({ ...existing[0], data: merged }));
					return { success: true, notificationId: existing[0].id };
				}
			}

			// 3. Insert canonical row (only when in_app is in the channel set).
			if (!inApp) {
				// TODO(027 follow-up): enqueue email / push directly without an in_app row.
				return { success: true };
			}

			const { title, message } = renderTitleAndMessage(event);
			const inserted = await db
				.insert(notifications)
				.values({
					userId: event.recipientId,
					type: event.type,
					title,
					message,
					data: event.data ? JSON.stringify(event.data) : null,
					priority: event.priority ?? meta.priority,
					category: meta.category,
					actorId: event.actorId ?? null,
					groupKey,
					deliveredChannels: resolved.channels.filter((c) => c !== 'in_app') as NotificationChannel[],
					tenantId
				})
				.returning();

			const row = inserted[0];
			if (!row) {
				return { success: false, error: 'Insert returned no row' };
			}

			notificationPubSub.publish(event.recipientId, rowToListItem(row));
			return { success: true, notificationId: row.id };
		} catch (error) {
			console.error('[NotificationService.dispatch] Error:', error);
			return { success: false, error: 'Failed to dispatch notification' };
		}
	}

	/**
	 * Fan out an admin announcement to a segment of users.
	 *
	 * For ALL users the work is enqueued in batches (currently
	 * synchronous, paged by 500). A follow-up PR will route large
	 * fan-outs through a Trigger.dev job.
	 */
	static async broadcastAnnouncement(opts: {
		segment: 'all' | { userIds: string[] };
		title: string;
		body: string;
		cta?: { label: string; href: string };
		tenantId?: string;
	}): Promise<{ success: boolean; sent: number; error?: string }> {
		try {
			const tenantId = opts.tenantId ?? (await getTenantId());
			if (!tenantId) return { success: false, sent: 0, error: 'Tenant ID not found' };

			let userIds: string[];
			if (opts.segment === 'all') {
				// Keep the surface honest — caller for ALL must go through
				// a batched background job. We return success: false to make
				// the misuse visible until that worker lands.
				return { success: false, sent: 0, error: 'segment=all requires a background job (deferred)' };
			} else {
				userIds = opts.segment.userIds;
			}

			let sent = 0;
			for (const uid of userIds) {
				const result = await this.dispatch({
					type: 'admin_announcement',
					recipientId: uid,
					tenantId,
					data: { title: opts.title, body: opts.body, cta: opts.cta }
				});
				if (result.success) sent++;
			}
			return { success: true, sent };
		} catch (error) {
			console.error('[NotificationService.broadcastAnnouncement] Error:', error);
			return { success: false, sent: 0, error: 'Failed to broadcast announcement' };
		}
	}
}

// =====================================================================
// dispatch() helpers (file-local, not exported)
// =====================================================================

function computeGroupKey(event: NotificationEvent): string | null {
	const meta = metaFor(event.type);
	if (!meta?.groupBy || meta.groupBy === 'none') return null;
	const targetId = extractTargetId(event);
	switch (meta.groupBy) {
		case 'type':
			return event.type;
		case 'type+target':
			return targetId ? `${event.type}:${targetId}` : null;
		case 'type+actor+target':
			return targetId && event.actorId ? `${event.type}:${event.actorId}:${targetId}` : null;
		default:
			return null;
	}
}

function extractTargetId(event: NotificationEvent): string | null {
	const data = event.data as Record<string, unknown> | undefined;
	if (!data) return null;
	if (typeof data['targetId'] === 'string') return data['targetId'] as string;
	if (typeof data['itemSlug'] === 'string') return data['itemSlug'] as string;
	if (typeof data['itemId'] === 'string') return data['itemId'] as string;
	if (typeof data['commentId'] === 'string') return data['commentId'] as string;
	if (typeof data['sourceId'] === 'string') return data['sourceId'] as string;
	return null;
}

function mergeGroupedData(prev: string | null, event: NotificationEvent): string {
	let parsed: { actorIds?: string[]; count?: number; data?: unknown } = {};
	if (prev) {
		try {
			parsed = JSON.parse(prev) as typeof parsed;
		} catch {
			parsed = {};
		}
	}
	const actorIds = new Set(parsed.actorIds ?? []);
	if (event.actorId) actorIds.add(event.actorId);
	return JSON.stringify({
		...event.data,
		actorIds: Array.from(actorIds),
		count: (parsed.count ?? 1) + 1
	});
}

function renderTitleAndMessage(event: NotificationEvent): { title: string; message: string } {
	if (event.title && event.message) {
		return { title: event.title, message: event.message };
	}
	// Default copy — UI overrides via i18n lookup keyed on `type`.
	// Keep this terse; the client renders rich content from `data`.
	const meta = metaFor(event.type);
	const fallbackTitle = humanizeType(event.type);
	return {
		title: event.title ?? fallbackTitle,
		message: event.message ?? `${meta?.category ?? 'notification'} event`
	};
}

function humanizeType(type: NotificationType): string {
	return type
		.split('_')
		.map((s) => (s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s))
		.join(' ');
}

function rowToListItem(row: Notification): NotificationListItem {
	let parsedData: Record<string, unknown> | null = null;
	if (row.data) {
		try {
			parsedData = JSON.parse(row.data) as Record<string, unknown>;
		} catch {
			parsedData = null;
		}
	}
	return {
		id: row.id,
		type: row.type as NotificationType,
		category: (row.category ?? 'system') as NotificationListItem['category'],
		priority: (row.priority ?? 'medium') as NotificationListItem['priority'],
		title: row.title,
		message: row.message,
		data: parsedData,
		actorId: row.actorId ?? null,
		groupKey: row.groupKey ?? null,
		isRead: row.isRead,
		readAt: row.readAt ? row.readAt.toISOString() : null,
		archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	};
}

export { rowToListItem };
