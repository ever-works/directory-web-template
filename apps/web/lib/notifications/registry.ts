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
 */

export const NOTIFICATION_CATEGORIES = [
	'social',
	'item',
	'moderation',
	'billing',
	'sponsorship',
	'account',
	'system'
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'push', 'sms'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TAB_VALUES = ['all', 'unread', 'mentions', 'system'] as const;
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
	'user_mentioned',
	'comment_received',
	'comment_reply',
	'reaction_received',
	'review_received',
	'rating_received',
	// Item lifecycle
	'item_submission',
	'item_approved',
	'item_rejected',
	'item_featured',
	'item_published',
	// Moderation
	'comment_reported',
	'item_reported',
	'content_removed',
	// Billing
	'payment_failed',
	'payment_succeeded',
	'subscription_renewed',
	'subscription_expiring',
	'subscription_cancelled',
	// Sponsorship
	'sponsor_ad_approved',
	'sponsor_ad_rejected',
	'sponsor_ad_expiring',
	// Account & system
	'user_registered',
	'security_alert',
	'password_changed',
	'new_login',
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
		defaultChannels: { in_app: true, email: true },
		groupBy: 'type+actor+target',
		groupWindowMs: FIVE_MIN
	},
	user_mentioned: {
		category: 'social',
		priority: 'high',
		icon: 'AtSign',
		locked: false,
		defaultChannels: { in_app: true, email: true, push: true }
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
	comment_reply: {
		category: 'social',
		priority: 'medium',
		icon: 'CornerDownRight',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	reaction_received: {
		category: 'social',
		priority: 'low',
		icon: 'Heart',
		locked: false,
		defaultChannels: { in_app: true },
		groupBy: 'type+target',
		groupWindowMs: FIVE_MIN
	},
	review_received: {
		category: 'social',
		priority: 'medium',
		icon: 'Star',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	rating_received: {
		category: 'social',
		priority: 'low',
		icon: 'Star',
		locked: false,
		defaultChannels: { in_app: true },
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
		defaultChannels: { in_app: true, email: true, push: true }
	},
	item_rejected: {
		category: 'item',
		priority: 'high',
		icon: 'XCircle',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	item_featured: {
		category: 'item',
		priority: 'medium',
		icon: 'Sparkles',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	item_published: {
		category: 'item',
		priority: 'low',
		icon: 'Globe',
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
	content_removed: {
		category: 'moderation',
		priority: 'high',
		icon: 'ShieldAlert',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	// Billing --------------------------------------------------------
	payment_failed: {
		category: 'billing',
		priority: 'critical',
		icon: 'AlertOctagon',
		locked: true,
		defaultChannels: { in_app: true, email: true, push: true }
	},
	payment_succeeded: {
		category: 'billing',
		priority: 'low',
		icon: 'BadgeCheck',
		locked: false,
		defaultChannels: { email: true }
	},
	subscription_renewed: {
		category: 'billing',
		priority: 'low',
		icon: 'RefreshCw',
		locked: false,
		defaultChannels: { email: true }
	},
	subscription_expiring: {
		category: 'billing',
		priority: 'high',
		icon: 'Clock',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	subscription_cancelled: {
		category: 'billing',
		priority: 'medium',
		icon: 'XCircle',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	// Sponsorship ----------------------------------------------------
	sponsor_ad_approved: {
		category: 'sponsorship',
		priority: 'medium',
		icon: 'Megaphone',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	sponsor_ad_rejected: {
		category: 'sponsorship',
		priority: 'high',
		icon: 'Megaphone',
		locked: false,
		defaultChannels: { in_app: true, email: true }
	},
	sponsor_ad_expiring: {
		category: 'sponsorship',
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
		defaultChannels: { in_app: true, email: true, push: true }
	},
	password_changed: {
		category: 'account',
		priority: 'high',
		icon: 'KeyRound',
		locked: true,
		defaultChannels: { in_app: true, email: true }
	},
	new_login: {
		category: 'account',
		priority: 'medium',
		icon: 'LogIn',
		locked: false,
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

/** Types that count toward the Mentions tab. */
export const MENTION_TYPES: ReadonlySet<NotificationType> = new Set([
	'user_mentioned',
	'comment_reply'
]);

/** Types that count toward the System tab (anything in `account` or `system` category + payment_failed). */
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
