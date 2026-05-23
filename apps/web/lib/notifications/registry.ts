/**
 * Spec 027 — Notification registry.
 *
 * Single source of truth that maps every notification `type` to its
 * category, priority, default channel matrix, lock flag, icon key, and
 * i18n label key. UI (icon-map, card accents) and the service-layer
 * `dispatch()` (default channels, locked-bypass) both read from here.
 *
 * Adding a new notification type = adding an entry here, expanding the
 * Drizzle enum, and (optionally) a translation in `messages/en.json`.
 *
 * Trimmed to 15 types in spec 027 v2: only events with a clear
 * implementation hook in this codebase ship.  Speculative types
 * (mentions, replies, reactions, reviews, ratings, content lifecycle
 * variants beyond approved/rejected, sponsor_*, new_login, subscription
 * renewal/cancellation) were removed.
 */

export const NOTIFICATION_CATEGORIES = [
	'social',
	'item',
	'moderation',
	'billing',
	'account',
	'system'
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'push', 'sms'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TAB_VALUES = ['all', 'unread', 'system'] as const;
export type NotificationTab = (typeof NOTIFICATION_TAB_VALUES)[number];

export type ChannelMatrix = Partial<Record<NotificationChannel, boolean>>;

export interface NotificationTypeMeta {
	category: NotificationCategory;
	priority: NotificationPriority;
	/** lucide-react icon name; rendered via the icon-map module. */
	icon: string;
	/** When true, in-app delivery cannot be muted (security / billing / account). */
	locked: boolean;
	/** Defaults applied when the user has no preference for this type. */
	defaultChannels: ChannelMatrix;
	/** Used by `dispatch()` to compute `groupKey`. `'type'` collapses by type only. */
	groupBy?: 'none' | 'type' | 'type+target' | 'type+actor+target';
	/** Time window for groupKey collapse in milliseconds. */
	groupWindowMs?: number;
}

const FIVE_MIN = 5 * 60 * 1000;

/**
 * Order matters only for the preferences page rendering — the matrix is
 * grouped by category and within a category, sorted by registry order.
 */
export const NOTIFICATION_TYPES = [
	// Social
	'user_followed',
	'comment_received',
	// Item lifecycle
	'item_submission',
	'item_approved',
	'item_rejected',
	// Moderation
	'comment_reported',
	'item_reported',
	// Billing
	'payment_failed',
	'payment_succeeded',
	'subscription_expiring',
	// Account & system
	'user_registered',
	'security_alert',
	'password_changed',
	'system_alert',
	'admin_announcement'
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_REGISTRY: Record<NotificationType, NotificationTypeMeta> = {
	// Social ---------------------------------------------------------
	user_followed: {
		category: 'social',
		priority: 'low',
		icon: 'UserPlus',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	comment_received: {
		category: 'social',
		priority: 'medium',
		icon: 'MessageSquare',
		locked: false,
		defaultChannels: { in_app: true, email: true },
		groupBy: 'type+target',
		groupWindowMs: FIVE_MIN
	},
	// Item lifecycle -------------------------------------------------
	item_submission: {
		category: 'item',
		priority: 'medium',
		icon: 'Inbox',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	item_approved: {
		category: 'item',
		priority: 'high',
		icon: 'CheckCircle2',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	item_rejected: {
		category: 'item',
		priority: 'high',
		icon: 'XCircle',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	// Moderation -----------------------------------------------------
	comment_reported: {
		category: 'moderation',
		priority: 'medium',
		icon: 'Flag',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	item_reported: {
		category: 'moderation',
		priority: 'medium',
		icon: 'Flag',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	// Billing --------------------------------------------------------
	payment_failed: {
		category: 'billing',
		priority: 'critical',
		icon: 'AlertOctagon',
		locked: true,
		defaultChannels: { in_app: true, email: true }
	},
	payment_succeeded: {
		category: 'billing',
		priority: 'low',
		icon: 'BadgeCheck',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	subscription_expiring: {
		category: 'billing',
		priority: 'high',
		icon: 'Clock',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	// Account & system ----------------------------------------------
	user_registered: {
		category: 'account',
		priority: 'low',
		icon: 'UserPlus',
		locked: false,
		defaultChannels: { in_app: true }
	},
	security_alert: {
		category: 'system',
		priority: 'critical',
		icon: 'ShieldAlert',
		locked: true,
		defaultChannels: { in_app: true, email: true }
	},
	password_changed: {
		category: 'account',
		priority: 'high',
		icon: 'KeyRound',
		locked: true,
		defaultChannels: { in_app: true, email: true }
	},
	system_alert: {
		category: 'system',
		priority: 'high',
		icon: 'AlertTriangle',
		locked: false,
		defaultChannels: { in_app: true }
	},
	admin_announcement: {
		category: 'system',
		priority: 'medium',
		icon: 'Megaphone',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	}
};

/**
 * Types that count toward the System tab — anything in the system or
 * account category, plus the locked billing alert.
 */
export function isSystemType(type: NotificationType): boolean {
	const meta = NOTIFICATION_REGISTRY[type];
	if (!meta) return false;
	return meta.category === 'system' || meta.category === 'account' || type === 'payment_failed';
}

export function metaFor(type: string): NotificationTypeMeta | undefined {
	return NOTIFICATION_REGISTRY[type as NotificationType];
}

export function isKnownType(type: string): type is NotificationType {
	return type in NOTIFICATION_REGISTRY;
}
