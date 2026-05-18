/**
 * Spec 027 — Notification public types.
 *
 * Discriminated unions force every dispatch call-site to provide the
 * correct payload shape for its event type. UI types lean on the
 * Drizzle-inferred row but normalise the JSON `data` field.
 */

import type { NotificationCategory, NotificationChannel, NotificationPriority, NotificationType } from './registry';

export type { NotificationCategory, NotificationChannel, NotificationPriority, NotificationType };

export type NotificationDigest = 'instant' | 'daily' | 'weekly' | 'off';

/** JSONB matrix shape persisted on `notification_preferences.preferences`. */
export type NotificationPreferencesMap = {
	[K in NotificationType]?: Partial<Record<NotificationChannel, boolean>>;
};

export interface NotificationPreferencesPayload {
	preferences: NotificationPreferencesMap;
	emailDigest: NotificationDigest;
	quietHoursStart: string | null;
	quietHoursEnd: string | null;
	timezone: string;
	pushEnabled: boolean;
}

// ---------------------------------------------------------------------
// Event payloads (discriminated union)
// ---------------------------------------------------------------------

interface BaseEvent<T extends NotificationType, D = Record<string, unknown>> {
	type: T;
	recipientId: string;
	actorId?: string | null;
	tenantId?: string | null;
	/** Optional override; defaults to the registry value. */
	priority?: NotificationPriority;
	/** Optional pre-rendered title + message; if omitted, the dispatcher will fall back to type-default i18n keys. */
	title?: string;
	message?: string;
	data?: D;
	/** Pre-computed group key (overrides registry-derived). */
	groupKey?: string | null;
	/** ISO date string for testability / idempotency. */
	occurredAt?: string;
}

export type NotificationEvent =
	| BaseEvent<'user_followed', { followerUsername: string; followerSlug?: string }>
	| BaseEvent<'user_mentioned', { sourceType: 'comment' | 'review' | 'item'; sourceId: string; excerpt?: string; actionUrl?: string }>
	| BaseEvent<'comment_received', { itemSlug: string; commentId: string; excerpt: string; actionUrl?: string }>
	| BaseEvent<'comment_reply', { parentCommentId: string; commentId: string; excerpt: string; actionUrl?: string }>
	| BaseEvent<'reaction_received', { targetType: 'comment' | 'item' | 'review'; targetId: string; reaction?: string; actionUrl?: string }>
	| BaseEvent<'review_received', { itemSlug: string; rating: number; reviewId: string; actionUrl?: string }>
	| BaseEvent<'rating_received', { itemSlug: string; rating: number; actionUrl?: string }>
	| BaseEvent<'item_submission', { itemId: string; itemName: string; submittedBy: string; actionUrl?: string }>
	| BaseEvent<'item_approved', { itemSlug: string; itemName: string; actionUrl?: string }>
	| BaseEvent<'item_rejected', { itemSlug: string; itemName: string; reason?: string; actionUrl?: string }>
	| BaseEvent<'item_featured', { itemSlug: string; itemName: string; actionUrl?: string }>
	| BaseEvent<'item_published', { itemSlug: string; itemName: string; actionUrl?: string }>
	| BaseEvent<'comment_reported', { commentId: string; reportId: string; actionUrl?: string }>
	| BaseEvent<'item_reported', { itemSlug: string; reportId: string; actionUrl?: string }>
	| BaseEvent<'content_removed', { contentType: 'comment' | 'item' | 'review'; contentId: string; reason?: string }>
	| BaseEvent<'payment_failed', { invoiceId?: string; amount?: number; currency?: string; actionUrl?: string }>
	| BaseEvent<'payment_succeeded', { invoiceId?: string; amount?: number; currency?: string }>
	| BaseEvent<'subscription_renewed', { subscriptionId: string; nextRenewalAt?: string }>
	| BaseEvent<'subscription_expiring', { subscriptionId: string; expiresAt: string }>
	| BaseEvent<'subscription_cancelled', { subscriptionId: string }>
	| BaseEvent<'sponsor_ad_approved', { sponsorAdId: string; actionUrl?: string }>
	| BaseEvent<'sponsor_ad_rejected', { sponsorAdId: string; reason?: string }>
	| BaseEvent<'sponsor_ad_expiring', { sponsorAdId: string; expiresAt: string }>
	| BaseEvent<'user_registered', { newUserId: string; email?: string }>
	| BaseEvent<'security_alert', { eventCode: 'new_device' | 'password_reset' | 'mfa_disabled' | 'suspicious_login'; ip?: string; userAgent?: string }>
	| BaseEvent<'password_changed', Record<string, never>>
	| BaseEvent<'new_login', { ip?: string; userAgent?: string; location?: string }>
	| BaseEvent<'system_alert', { code?: string; details?: string; actionUrl?: string }>
	| BaseEvent<'admin_announcement', { title: string; body: string; cta?: { label: string; href: string } }>;

// ---------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------

export interface NotificationListItem {
	id: string;
	type: NotificationType;
	category: NotificationCategory;
	priority: NotificationPriority;
	title: string;
	message: string;
	data: Record<string, unknown> | null;
	actorId: string | null;
	groupKey: string | null;
	isRead: boolean;
	readAt: string | null;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface NotificationListResponse {
	notifications: NotificationListItem[];
	nextCursor: string | null;
	unreadCount: number;
}

export interface NotificationStatsResponse {
	total: number;
	unread: number;
	byTab: {
		all: number;
		unread: number;
		mentions: number;
		system: number;
	};
}

export interface NotificationListQuery {
	tab?: 'all' | 'unread' | 'mentions' | 'system';
	type?: NotificationType | NotificationType[];
	priority?: NotificationPriority | NotificationPriority[];
	q?: string;
	dateFrom?: string;
	dateTo?: string;
	cursor?: string;
	limit?: number;
}

export type BulkAction = 'read' | 'unread' | 'archive' | 'delete';

export interface BulkRequest {
	ids?: string[];
	filter?: { tab?: 'all' | 'unread' | 'mentions' | 'system'; type?: NotificationType };
	action: BulkAction;
}

export interface DispatchResult {
	success: boolean;
	notificationIds?: string[];
	error?: string;
}
