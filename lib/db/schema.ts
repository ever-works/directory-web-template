import {
	boolean,
	timestamp,
	pgTable,
	text,
	primaryKey,
	integer,
	serial,
	varchar,
	uniqueIndex,
	index,
	jsonb,
	check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { AdapterAccountType } from 'next-auth/adapters';
import { PaymentPlan, PaymentProvider } from '../constants/payment';

export const users = pgTable(
	'users',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		email: text('email').unique(),
		image: text('image'),
		emailVerified: timestamp('emailVerified', { mode: 'date' }),
		passwordHash: text('password_hash'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		deletedAt: timestamp('deleted_at')
	},
	(table) => ({
		createdAtIndex: index('users_created_at_idx').on(table.createdAt)
	})
);

export const roles = pgTable(
	'roles',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull().unique(),
		description: text('description'),
		isAdmin: boolean('is_admin').notNull().default(false),
		status: text('status', { enum: ['active', 'inactive'] }).default('active'),
		created_by: text('created_by').default('system'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		deletedAt: timestamp('deleted_at')
	},
	(table) => ({
		statusIndex: index('roles_status_idx').on(table.status),
		isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
		createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
	})
);

// ######################### Permissions Schema #########################
export const permissions = pgTable(
	'permissions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		key: text('key').notNull().unique(),
		description: text('description'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		createdAtIndex: index('permissions_created_at_idx').on(table.createdAt)
	})
);

// ######################### Role Permissions Schema #########################
export const rolePermissions = pgTable(
	'role_permissions',
	{
		roleId: text('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade' }),
		permissionId: text('permission_id')
			.notNull()
			.references(() => permissions.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => ({
		rolePermissionPk: primaryKey({ columns: [table.roleId, table.permissionId] }),
		roleIndex: index('role_permissions_role_idx').on(table.roleId),
		permissionIndex: index('role_permissions_permission_idx').on(table.permissionId),
		createdAtIndex: index('role_permissions_created_at_idx').on(table.createdAt)
	})
);

// ######################### User Roles Schema #########################
export const userRoles = pgTable(
	'user_roles',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		roleId: text('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => ({
		userRolePk: primaryKey({ columns: [table.userId, table.roleId] }),
		userIndex: index('user_roles_user_idx').on(table.userId),
		roleIndex: index('user_roles_role_idx').on(table.roleId),
		createdAtIndex: index('user_roles_created_at_idx').on(table.createdAt)
	})
);

export const accounts = pgTable(
	'accounts',
	{
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }), // References users.id
		type: text('type').$type<AdapterAccountType>().notNull(),
		provider: text('provider').notNull(),
		providerAccountId: text('providerAccountId').notNull(),
		// Client authentication fields
		email: text('email'),
		passwordHash: text('password_hash'),
		// OAuth fields
		refresh_token: text('refresh_token'),
		access_token: text('access_token'),
		expires_at: integer('expires_at'),
		token_type: text('token_type'),
		scope: text('scope'),
		id_token: text('id_token'),
		session_state: text('session_state')
	},
	(account) => [
		{
			compoundKey: primaryKey({
				columns: [account.provider, account.providerAccountId]
			})
		},
		index('accounts_email_idx').on(account.email),
		// Performance index for provider lookups
		index('accounts_provider_idx').on(account.provider)
	]
);

// ######################### Client Profiles Schema #########################
export const clientProfiles = pgTable(
	'client_profiles',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		email: text('email').notNull(),
		name: text('name').notNull(),
		displayName: text('display_name'),
		username: text('username').unique(),
		bio: text('bio'),
		jobTitle: text('job_title'),
		company: text('company'),
		industry: text('industry'),
		phone: text('phone'),
		website: text('website'),
		location: text('location'),
		avatar: text('avatar'),
		accountType: text('account_type', {
			enum: ['individual', 'business', 'enterprise']
		}).default('individual'),
		status: text('status', {
			enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
		}).default('active'),
		plan: text('plan', {
			enum: ['free', 'standard', 'premium']
		}).default('free'),
		timezone: text('timezone').default('UTC'),
		language: text('language').default('en'),
		country: text('country'),
		currency: text('currency').default('USD'),
		twoFactorEnabled: boolean('two_factor_enabled').default(false),
		emailVerified: boolean('email_verified').default(false),
		totalSubmissions: integer('total_submissions').default(0),
		notes: text('notes'),
		tags: text('tags'),
		// Moderation fields
		warningCount: integer('warning_count').default(0),
		suspendedAt: timestamp('suspended_at', { mode: 'date', withTimezone: true }),
		bannedAt: timestamp('banned_at', { mode: 'date', withTimezone: true }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(clientProfile) => [
		uniqueIndex('client_profile_user_id_unique_idx').on(clientProfile.userId),
		index('client_profile_email_idx').on(clientProfile.email),
		index('client_profile_status_idx').on(clientProfile.status),
		index('client_profile_plan_idx').on(clientProfile.plan),
		index('client_profile_account_type_idx').on(clientProfile.accountType),
		index('client_profile_username_idx').on(clientProfile.username),
		index('client_profile_created_at_idx').on(clientProfile.createdAt)
	]
);

export const sessions = pgTable('sessions', {
	sessionToken: text('sessionToken').primaryKey(),
	userId: text('userId')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expires: timestamp('expires', { mode: 'date' }).notNull()
});

export const verificationTokens = pgTable(
	'verificationTokens',
	{
		identifier: text('identifier').notNull(),
		email: text('email').notNull(),
		token: text('token').notNull(),
		expires: timestamp('expires', { mode: 'date' }).notNull()
	},
	(table) => [
		{
			compositePK: primaryKey({
				columns: [table.identifier, table.token]
			})
		}
	]
);

export const authenticators = pgTable(
	'authenticators',
	{
		credentialID: text('credentialID').notNull().unique(),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		providerAccountId: text('providerAccountId').notNull(),
		credentialPublicKey: text('credentialPublicKey').notNull(),
		counter: integer('counter').notNull(),
		credentialDeviceType: text('credentialDeviceType').notNull(),
		credentialBackedUp: boolean('credentialBackedUp').notNull(),
		transports: text('transports')
	},
	(authenticator) => [
		{
			compositePK: primaryKey({
				columns: [authenticator.userId, authenticator.credentialID]
			})
		}
	]
);

export const activityLogs = pgTable(
	'activityLogs',
	{
		id: serial('id').primaryKey(),
		userId: text('userId').references(() => users.id, { onDelete: 'cascade' }), // For user activities
		clientId: text('clientId').references(() => clientProfiles.id, { onDelete: 'cascade' }), // For client activities
		action: text('action').notNull(),
		timestamp: timestamp('timestamp').notNull().defaultNow(),
		ipAddress: varchar('ip_address', { length: 45 })
	},
	(table) => [
		index('activity_logs_user_idx').on(table.userId),
		index('activity_logs_timestamp_idx').on(table.timestamp),
		index('activity_logs_action_idx').on(table.action)
	]
);

export const passwordResetTokens = pgTable('passwordResetTokens', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull(),
	token: text('token').notNull().unique(),
	expires: timestamp('expires', { mode: 'date' }).notNull()
});

export const newsletterSubscriptions = pgTable('newsletterSubscriptions', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull().unique(),
	// NOTE: Column name is "is_active" in database (from migration 0000)
	// Do not change to "is_subscribed" until migration is updated and deployed
	isActive: boolean('is_active').notNull().default(true),
	subscribedAt: timestamp('subscribed_at').notNull().defaultNow(),
	unsubscribedAt: timestamp('unsubscribed_at'),
	lastEmailSent: timestamp('last_email_sent'),
	source: text('source').default('footer') // footer, popup, etc.
});

// ######################### Comment Schema #########################
export const comments = pgTable('comments', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	content: text('content').notNull(),
	userId: text('userId')
		.notNull()
		.references(() => clientProfiles.id, { onDelete: 'cascade' }),
	itemId: text('itemId').notNull(),
	rating: integer('rating').notNull().default(0),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
	editedAt: timestamp('edited_at', { mode: 'date', withTimezone: true }),
	deletedAt: timestamp('deleted_at', { mode: 'date', withTimezone: true })
});

export const VoteType = {
	UPVOTE: 'upvote',
	DOWNVOTE: 'downvote'
} as const;

export type VoteTypeValues = (typeof VoteType)[keyof typeof VoteType];

// ######################### Vote Schema #########################
export const votes = pgTable(
	'votes',
	{
		id: text('id')
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userid')
			.notNull()
			.references(() => clientProfiles.id, { onDelete: 'cascade' }),
		itemId: text('item_id').notNull(),
		voteType: text('vote_type', { enum: [VoteType.UPVOTE, VoteType.DOWNVOTE] })
			.notNull()
			.default(VoteType.UPVOTE),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		uniqueUserItemVote: uniqueIndex('unique_user_item_vote_idx').on(table.userId, table.itemId),
		itemVotesIndex: index('item_votes_idx').on(table.itemId),
		createdAtIndex: index('votes_created_at_idx').on(table.createdAt)
	})
);

// ######################### Subscription Schema #########################
export const SubscriptionStatus = {
	ACTIVE: 'active',
	CANCELLED: 'cancelled',
	EXPIRED: 'expired',
	PENDING: 'pending',
	PAUSED: 'paused'
} as const;

export type SubscriptionStatusValues = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export type PaymentProviderValues = (typeof PaymentProvider)[keyof typeof PaymentProvider];

export type PlanTypeValues = (typeof PaymentPlan)[keyof typeof PaymentPlan];

export const subscriptions = pgTable(
	'subscriptions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		planId: text('plan_id').notNull().default(PaymentPlan.FREE),
		status: text('status').notNull().default(SubscriptionStatus.PENDING),
		startDate: timestamp('start_date', { mode: 'date' }).notNull().defaultNow(),
		endDate: timestamp('end_date', { mode: 'date' }),
		paymentProvider: text('payment_provider').default(PaymentProvider.STRIPE).notNull(),
		subscriptionId: text('subscription_id'),
		invoiceId: text('invoice_id'),
		amountDue: integer('amount_due').default(0),
		amountPaid: integer('amount_paid').default(0),
		priceId: text('price_id'),
		customerId: text('customer_id'),
		currency: text('currency').default('usd'),
		amount: integer('amount').default(0),
		interval: text('interval').default('month'),
		intervalCount: integer('interval_count').default(1),
		trialStart: timestamp('trial_start', { mode: 'date' }),
		trialEnd: timestamp('trial_end', { mode: 'date' }),

		autoRenewal: boolean('auto_renewal').default(true),
		renewalReminderSent: boolean('renewal_reminder_sent').default(false),
		lastRenewalAttempt: timestamp('last_renewal_attempt', { mode: 'date', withTimezone: true }),
		failedPaymentCount: integer('failed_payment_count').default(0),

		cancelledAt: timestamp('cancelled_at', { mode: 'date' }),
		cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
		cancelReason: text('cancel_reason'),
		hostedInvoiceUrl: text('hosted_invoice_url'),
		invoicePdf: text('invoice_pdf'),
		metadata: text('metadata'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		userSubscriptionIndex: index('user_subscription_idx').on(table.userId),
		statusIndex: index('subscription_status_idx').on(table.status),
		providerSubscriptionIndex: uniqueIndex('provider_subscription_idx').on(
			table.paymentProvider,
			table.subscriptionId
		),
		autoRenewalCheck: check('auto_renewal_check', sql`NOT (${table.autoRenewal} AND ${table.cancelAtPeriodEnd})`),
		planIndex: index('subscription_plan_idx').on(table.planId),
		createdAtIndex: index('subscription_created_at_idx').on(table.createdAt)
	})
);

// ######################### Subscription History Schema #########################
export const subscriptionHistory = pgTable(
	'subscriptionHistory',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		subscriptionId: text('subscription_id')
			.notNull()
			.references(() => subscriptions.id, { onDelete: 'cascade' }),
		action: text('action').notNull(),
		previousStatus: text('previous_status'),
		newStatus: text('new_status'),
		previousPlan: text('previous_plan'),
		newPlan: text('new_plan'),
		reason: text('reason'),
		metadata: text('metadata'),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => ({
		subscriptionHistoryIndex: index('subscription_history_idx').on(table.subscriptionId),
		actionIndex: index('subscription_action_idx').on(table.action),
		createdAtIndex: index('subscription_history_created_at_idx').on(table.createdAt)
	})
);

// ######################### Payment Provider Schema #########################
export const paymentProviders = pgTable(
	'paymentProviders',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text('name').notNull().unique().default(PaymentProvider.STRIPE),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		activeIndex: index('payment_provider_active_idx').on(table.isActive),
		createdAtIndex: index('payment_provider_created_at_idx').on(table.createdAt)
	})
);

// ######################### Payment Account Schema #########################
export const paymentAccounts = pgTable(
	'paymentAccounts',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		providerId: text('providerId')
			.notNull()
			.references(() => paymentProviders.id, { onDelete: 'cascade' }),
		customerId: text('customerId').notNull(),
		accountId: text('accountId'),
		lastUsed: timestamp('lastUsed', { mode: 'date' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		userProviderIndex: uniqueIndex('user_provider_unique_idx').on(table.userId, table.providerId),
		customerProviderIndex: uniqueIndex('customer_provider_unique_idx').on(table.customerId, table.providerId),
		customerIdIndex: index('payment_account_customer_id_idx').on(table.customerId),
		providerIndex: index('payment_account_provider_idx').on(table.providerId),
		createdAtIndex: index('payment_account_created_at_idx').on(table.createdAt)
	})
);

// ######################### Notifications Schema #########################
export const notifications = pgTable(
	'notifications',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type', {
			enum: [
				'item_submission',
				'comment_reported',
				'item_reported',
				'user_registered',
				'payment_failed',
				'system_alert'
			]
		}).notNull(),
		title: text('title').notNull(),
		message: text('message').notNull(),
		data: text('data'),
		isRead: boolean('is_read').notNull().default(false),
		readAt: timestamp('read_at', { mode: 'date' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		userIndex: index('notifications_user_idx').on(table.userId),
		typeIndex: index('notifications_type_idx').on(table.type),
		isReadIndex: index('notifications_is_read_idx').on(table.isRead),
		createdAtIndex: index('notifications_created_at_idx').on(table.createdAt)
	})
);

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type InsertVote = typeof votes.$inferInsert;
export type NewUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type NewNewsletterSubscription = typeof newsletterSubscriptions.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

// ######################### Permission Types #########################
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

// ######################### Subscription Types #########################
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type NewSubscriptionHistory = typeof subscriptionHistory.$inferInsert;
export type SubscriptionWithUser = Subscription & {
	user: typeof users.$inferSelect;
};

export type OldPaymentProvider = typeof paymentProviders.$inferSelect;
export type NewPaymentProvider = typeof paymentProviders.$inferInsert;
export type PaymentAccount = typeof paymentAccounts.$inferSelect;
export type NewPaymentAccount = typeof paymentAccounts.$inferInsert;

// ######################### Notification Types #########################
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export enum ActivityType {
	SIGN_UP = 'SIGN_UP',
	SIGN_IN = 'SIGN_IN',
	SIGN_OUT = 'SIGN_OUT',
	VERIFY_EMAIL = 'VERIFY_EMAIL',
	UPDATE_PASSWORD = 'UPDATE_PASSWORD',
	DELETE_ACCOUNT = 'DELETE_ACCOUNT',
	UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
	UPDATE_TWENTY_CRM_CONFIG = 'UPDATE_TWENTY_CRM_CONFIG'
}

// ######################### Client Profile Types #########################
// ######################### Favorites Schema #########################
export const favorites = pgTable(
	'favorites',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		itemSlug: text('item_slug').notNull(),
		itemName: text('item_name').notNull(),
		itemIconUrl: text('item_icon_url'),
		itemCategory: text('item_category'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		userItemIndex: uniqueIndex('user_item_favorite_unique_idx').on(table.userId, table.itemSlug),
		userIdIndex: index('favorites_user_id_idx').on(table.userId),
		itemSlugIndex: index('favorites_item_slug_idx').on(table.itemSlug),
		createdAtIndex: index('favorites_created_at_idx').on(table.createdAt)
	})
);

export type ClientProfile = typeof clientProfiles.$inferSelect;

// ######################### Featured Items Schema #########################
export const featuredItems = pgTable(
	'featured_items',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		itemSlug: text('item_slug').notNull(),
		itemName: text('item_name').notNull(),
		itemIconUrl: text('item_icon_url'),
		itemCategory: text('item_category'),
		itemDescription: text('item_description'),
		featuredOrder: integer('featured_order').notNull().default(0), // Order for display
		featuredUntil: timestamp('featured_until'), // Optional expiration date
		isActive: boolean('is_active').notNull().default(true),
		featuredBy: text('featured_by').notNull(), // Admin user ID who featured it
		featuredAt: timestamp('featured_at').notNull().defaultNow(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		itemSlugIndex: index('featured_items_item_slug_idx').on(table.itemSlug),
		featuredOrderIndex: index('featured_items_featured_order_idx').on(table.featuredOrder),
		isActiveIndex: index('featured_items_is_active_idx').on(table.isActive),
		featuredAtIndex: index('featured_items_featured_at_idx').on(table.featuredAt),
		featuredUntilIndex: index('featured_items_featured_until_idx').on(table.featuredUntil)
	})
);

export type FeaturedItem = typeof featuredItems.$inferSelect;
export type NewFeaturedItem = typeof featuredItems.$inferInsert;

// ######################### Sponsor Ads Schema #########################
export const SponsorAdStatus = {
	PENDING_PAYMENT: 'pending_payment', // User submitted, waiting for payment
	PENDING: 'pending', // User paid, waiting for admin review
	REJECTED: 'rejected', // Admin rejected
	ACTIVE: 'active', // Admin approved, displaying on site
	EXPIRED: 'expired', // Subscription period ended
	CANCELLED: 'cancelled' // Cancelled by user or admin
} as const;

export type SponsorAdStatusValues = (typeof SponsorAdStatus)[keyof typeof SponsorAdStatus];

export const SponsorAdInterval = {
	WEEKLY: 'weekly',
	MONTHLY: 'monthly'
} as const;

export type SponsorAdIntervalValues = (typeof SponsorAdInterval)[keyof typeof SponsorAdInterval];

export const sponsorAds = pgTable(
	'sponsor_ads',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// User/Submitter info
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		// Item being sponsored (only store identifier, fetch details from content)
		itemSlug: text('item_slug').notNull(),

		// Sponsorship details
		status: text('status', {
			enum: [
				SponsorAdStatus.PENDING_PAYMENT,
				SponsorAdStatus.PENDING,
				SponsorAdStatus.REJECTED,
				SponsorAdStatus.ACTIVE,
				SponsorAdStatus.EXPIRED,
				SponsorAdStatus.CANCELLED
			]
		})
			.notNull()
			.default(SponsorAdStatus.PENDING_PAYMENT),
		interval: text('interval', {
			enum: [SponsorAdInterval.WEEKLY, SponsorAdInterval.MONTHLY]
		}).notNull(),

		// Pricing (in dollars)
		amount: integer('amount').notNull(),
		currency: text('currency').notNull().default('usd'),

		// Payment info
		paymentProvider: text('payment_provider').notNull(),
		subscriptionId: text('subscription_id'),
		customerId: text('customer_id'),

		// Subscription period
		startDate: timestamp('start_date', { mode: 'date' }),
		endDate: timestamp('end_date', { mode: 'date' }),

		// Admin review
		reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
		reviewedAt: timestamp('reviewed_at', { mode: 'date' }),
		rejectionReason: text('rejection_reason'),

		// Cancellation
		cancelledAt: timestamp('cancelled_at', { mode: 'date' }),
		cancelReason: text('cancel_reason'),

		// Timestamps
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		userIdIndex: index('sponsor_ads_user_id_idx').on(table.userId),
		itemSlugIndex: index('sponsor_ads_item_slug_idx').on(table.itemSlug),
		statusIndex: index('sponsor_ads_status_idx').on(table.status),
		intervalIndex: index('sponsor_ads_interval_idx').on(table.interval),
		providerSubscriptionIndex: uniqueIndex('sponsor_ads_provider_subscription_idx').on(
			table.paymentProvider,
			table.subscriptionId
		),
		startDateIndex: index('sponsor_ads_start_date_idx').on(table.startDate),
		endDateIndex: index('sponsor_ads_end_date_idx').on(table.endDate),
		createdAtIndex: index('sponsor_ads_created_at_idx').on(table.createdAt)
	})
);

// ######################### Sponsor Ads Types #########################
export type SponsorAd = typeof sponsorAds.$inferSelect;
export type NewSponsorAd = typeof sponsorAds.$inferInsert;
export type NewClientProfile = typeof clientProfiles.$inferInsert;
export type ClientProfileWithUser = ClientProfile & {
	user: typeof users.$inferSelect;
};

// ######################### Favorites Types #########################
export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
export type FavoriteWithUser = Favorite & {
	user: typeof users.$inferSelect;
};

// ######################### Twenty CRM Config Schema #########################
/**
 * Twenty CRM Configuration Table
 *
 * This table stores the Twenty CRM integration configuration.
 *
 * IMPORTANT: This table enforces a singleton pattern via a unique index on ((true)),
 * which ensures only ONE configuration row can exist. This is enforced by migration
 * 0006_add_twenty_crm_singleton_constraint.sql and prevents data inconsistencies.
 *
 * The singleton constraint is not visible in Drizzle schema definition as it uses
 * an expression-based index, but it is enforced at the database level.
 */
export const twentyCrmConfig = pgTable(
	'twenty_crm_config',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		baseUrl: text('base_url').notNull(),
		apiKey: text('api_key').notNull(),
		enabled: boolean('enabled').notNull().default(false),
		syncMode: text('sync_mode', { enum: ['disabled', 'platform', 'direct_crm'] })
			.notNull()
			.default('disabled'),
		createdBy: text('created_by'),
		updatedBy: text('updated_by'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		enabledIndex: index('twenty_crm_config_enabled_idx').on(table.enabled),
		syncModeIndex: index('twenty_crm_config_sync_mode_idx').on(table.syncMode),
		updatedAtIndex: index('twenty_crm_config_updated_at_idx').on(table.updatedAt)
	})
);

export type TwentyCrmConfigRow = typeof twentyCrmConfig.$inferSelect;
export type NewTwentyCrmConfigRow = typeof twentyCrmConfig.$inferInsert;

// ######################### Integration Mappings Schema #########################
/**
 * Integration Mappings Table
 *
 * Stores persistent mappings between Ever system IDs and external CRM IDs.
 * Enables hybrid caching strategy (memory + database) for optimal performance.
 *
 * Key features:
 * - Unique constraint on (ever_id, object_type) ensures one mapping per entity
 * - version_hash tracks data changes for sync strategies
 * - Indexed for fast lookups by ever_id or crm_id
 */
export const integrationMappings = pgTable(
	'integration_mappings',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		everId: text('ever_id').notNull(),
		crmId: text('crm_id').notNull(),
		objectType: text('object_type', { enum: ['company', 'person'] }).notNull(),
		lastSyncedAt: timestamp('last_synced_at').notNull().defaultNow(),
		versionHash: text('version_hash'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		everIdObjectTypeIdx: uniqueIndex('integration_mappings_ever_id_object_type_idx').on(
			table.everId,
			table.objectType
		),
		crmIdIdx: index('integration_mappings_crm_id_idx').on(table.crmId),
		lastSyncedAtIdx: index('integration_mappings_last_synced_at_idx').on(table.lastSyncedAt),
		objectTypeIdx: index('integration_mappings_object_type_idx').on(table.objectType)
	})
);

export type IntegrationMapping = typeof integrationMappings.$inferSelect;
export type NewIntegrationMapping = typeof integrationMappings.$inferInsert;

// ######################### Companies Schema #########################
export const companies = pgTable(
	'companies',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text('name').notNull(),
		website: text('website'),
		domain: text('domain'),
		slug: text('slug'),
		status: text('status', { enum: ['active', 'inactive'] })
			.notNull()
			.default('active'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		nameIndex: index('companies_name_idx').on(table.name),
		statusIndex: index('companies_status_idx').on(table.status),
		domainUniqueIndex: uniqueIndex('companies_domain_unique_idx').on(table.domain),
		slugUniqueIndex: uniqueIndex('companies_slug_unique_idx').on(table.slug)
	})
);

// ######################### Companies Types #########################
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

// ######################### Items Companies Schema #########################
export const itemsCompanies = pgTable(
	'items_companies',
	{
		itemSlug: text('item_slug').notNull().unique(),
		companyId: text('company_id')
			.notNull()
			.references(() => companies.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => ({
		companyIdIndex: index('items_companies_company_id_idx').on(table.companyId)
	})
);

// ######################### Items Companies Types #########################
export type ItemCompany = typeof itemsCompanies.$inferSelect;
export type NewItemCompany = typeof itemsCompanies.$inferInsert;

// ######################### Report Schema #########################
export const ReportContentType = {
	ITEM: 'item',
	COMMENT: 'comment'
} as const;

export type ReportContentTypeValues = (typeof ReportContentType)[keyof typeof ReportContentType];

export const ReportReason = {
	SPAM: 'spam',
	HARASSMENT: 'harassment',
	INAPPROPRIATE: 'inappropriate',
	OTHER: 'other'
} as const;

export type ReportReasonValues = (typeof ReportReason)[keyof typeof ReportReason];

export const ReportStatus = {
	PENDING: 'pending',
	REVIEWED: 'reviewed',
	RESOLVED: 'resolved',
	DISMISSED: 'dismissed'
} as const;

export type ReportStatusValues = (typeof ReportStatus)[keyof typeof ReportStatus];

export const ReportResolution = {
	CONTENT_REMOVED: 'content_removed',
	USER_WARNED: 'user_warned',
	USER_SUSPENDED: 'user_suspended',
	USER_BANNED: 'user_banned',
	NO_ACTION: 'no_action'
} as const;

export type ReportResolutionValues = (typeof ReportResolution)[keyof typeof ReportResolution];

export const reports = pgTable(
	'reports',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		contentType: text('content_type', { enum: [ReportContentType.ITEM, ReportContentType.COMMENT] }).notNull(),
		contentId: text('content_id').notNull(),
		reason: text('reason', {
			enum: [ReportReason.SPAM, ReportReason.HARASSMENT, ReportReason.INAPPROPRIATE, ReportReason.OTHER]
		}).notNull(),
		details: text('details'),
		status: text('status', {
			enum: [ReportStatus.PENDING, ReportStatus.REVIEWED, ReportStatus.RESOLVED, ReportStatus.DISMISSED]
		})
			.notNull()
			.default(ReportStatus.PENDING),
		resolution: text('resolution', {
			enum: [
				ReportResolution.CONTENT_REMOVED,
				ReportResolution.USER_WARNED,
				ReportResolution.USER_SUSPENDED,
				ReportResolution.USER_BANNED,
				ReportResolution.NO_ACTION
			]
		}),
		reportedBy: text('reported_by')
			.notNull()
			.references(() => clientProfiles.id, { onDelete: 'cascade' }),
		reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
		reviewNote: text('review_note'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		reviewedAt: timestamp('reviewed_at'),
		resolvedAt: timestamp('resolved_at')
	},
	(table) => ({
		contentTypeIndex: index('reports_content_type_idx').on(table.contentType),
		contentIdIndex: index('reports_content_id_idx').on(table.contentId),
		statusIndex: index('reports_status_idx').on(table.status),
		reportedByIndex: index('reports_reported_by_idx').on(table.reportedBy),
		createdAtIndex: index('reports_created_at_idx').on(table.createdAt),
		contentTypeContentIdIndex: index('reports_content_type_content_id_idx').on(table.contentType, table.contentId)
	})
);

// ######################### Report Types #########################
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

// ######################### Moderation History Schema #########################
export const ModerationAction = {
	WARN: 'warn',
	SUSPEND: 'suspend',
	BAN: 'ban',
	UNSUSPEND: 'unsuspend',
	UNBAN: 'unban',
	CONTENT_REMOVED: 'content_removed'
} as const;

export type ModerationActionValues = (typeof ModerationAction)[keyof typeof ModerationAction];

export const moderationHistory = pgTable(
	'moderation_history',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => clientProfiles.id, { onDelete: 'cascade' }),
		action: text('action', {
			enum: [
				ModerationAction.WARN,
				ModerationAction.SUSPEND,
				ModerationAction.BAN,
				ModerationAction.UNSUSPEND,
				ModerationAction.UNBAN,
				ModerationAction.CONTENT_REMOVED
			]
		}).notNull(),
		reason: text('reason'),
		reportId: text('report_id').references(() => reports.id, { onDelete: 'set null' }),
		performedBy: text('performed_by').references(() => users.id, { onDelete: 'set null' }),
		contentType: text('content_type', { enum: [ReportContentType.ITEM, ReportContentType.COMMENT] }),
		contentId: text('content_id'),
		details: jsonb('details'),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => ({
		userIdIndex: index('moderation_history_user_id_idx').on(table.userId),
		actionIndex: index('moderation_history_action_idx').on(table.action),
		reportIdIndex: index('moderation_history_report_id_idx').on(table.reportId),
		performedByIndex: index('moderation_history_performed_by_idx').on(table.performedBy),
		createdAtIndex: index('moderation_history_created_at_idx').on(table.createdAt)
	})
);

// ######################### Moderation History Types #########################
export type ModerationHistoryRecord = typeof moderationHistory.$inferSelect;
export type NewModerationHistoryRecord = typeof moderationHistory.$inferInsert;

// ######################### Survey Schema #########################

export const surveys = pgTable(
	'surveys',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		description: text('description'),
		type: text('type', { enum: ['global', 'item'] }).notNull(),
		itemId: text('item_id'),
		status: text('status', { enum: ['draft', 'published', 'closed'] })
			.notNull()
			.default('draft'),
		surveyJson: jsonb('survey_json').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		closedAt: timestamp('closed_at', { withTimezone: true }),
		deletedAt: timestamp('deleted_at', { withTimezone: true })
	},
	(table) => ({
		slugIndex: index('surveys_slug_idx').on(table.slug),
		typeIndex: index('surveys_type_idx').on(table.type),
		itemIdIndex: index('surveys_item_id_idx').on(table.itemId),
		statusIndex: index('surveys_status_idx').on(table.status),
		createdAtIndex: index('surveys_created_at_idx').on(table.createdAt)
	})
);

export const surveyResponses = pgTable(
	'survey_responses',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		surveyId: text('survey_id')
			.notNull()
			.references(() => surveys.id, { onDelete: 'restrict' }),
		userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
		itemId: text('item_id'),
		data: jsonb('data').notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => ({
		surveyIdIndex: index('survey_responses_survey_id_idx').on(table.surveyId),
		userIdIndex: index('survey_responses_user_id_idx').on(table.userId),
		itemIdIndex: index('survey_responses_item_id_idx').on(table.itemId),
		completedAtIndex: index('survey_responses_completed_at_idx').on(table.completedAt)
	})
);

// ######################### Item Views Schema #########################
/**
 * Item Views Table
 *
 * Tracks unique daily item views for analytics.
 * Uses cookie-based viewer identification with UTC date deduplication.
 *
 * Key features:
 * - Unique constraint on (item_id, viewer_id, viewed_date_utc) ensures one view per viewer per day
 * - No IP storage for privacy - uses anonymous cookie-based viewer_id only
 * - Excludes bots and item owners at API level
 */
export const itemViews = pgTable(
	'item_views',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		itemId: text('item_id').notNull(),
		viewerId: text('viewer_id').notNull(),
		viewedDateUtc: text('viewed_date_utc').notNull(), // YYYY-MM-DD format
		viewedAt: timestamp('viewed_at', { mode: 'date', withTimezone: true }).notNull().defaultNow()
	},
	(table) => ({
		uniqueDailyView: uniqueIndex('item_views_unique_daily_idx').on(table.itemId, table.viewerId, table.viewedDateUtc),
		itemDateIndex: index('item_views_item_date_idx').on(table.itemId, table.viewedDateUtc)
	})
);

// ######################### Item Views Types #########################
export type ItemView = typeof itemViews.$inferSelect;
export type NewItemView = typeof itemViews.$inferInsert;

// ######################### Seed Status Schema #########################
// Singleton table to track database seeding status and prevent concurrent seed races
export const seedStatus = pgTable(
	'seed_status',
	{
		id: text('id').primaryKey().default('singleton'), // Only one row allowed
		status: text('status', { enum: ['seeding', 'completed', 'failed'] }).notNull(),
		startedAt: timestamp('started_at').notNull().defaultNow(),
		completedAt: timestamp('completed_at'),
		version: text('version'), // Optional: track seed version/hash
		error: text('error') // Optional: store error message if failed
	},
	(table) => ({
		// Unique constraint ensures only one row can exist
		singletonConstraint: uniqueIndex('seed_status_singleton_idx').on(table.id)
	})
);

// Seed status types
export type SeedStatus = typeof seedStatus.$inferSelect;
export type NewSeedStatus = typeof seedStatus.$inferInsert;

// Survey types
export type Survey = typeof surveys.$inferSelect;
export type SurveyItem = Survey & {
	responseCount?: number;
	isCompletedByUser?: boolean;
};
export type NewSurvey = typeof surveys.$inferInsert;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type NewSurveyResponse = typeof surveyResponses.$inferInsert;

// ######################### Item Audit Log Schema #########################
/**
 * Item Audit Action Enum
 * Tracks the type of action performed on an item
 */
export const ItemAuditAction = {
	CREATED: 'created',
	UPDATED: 'updated',
	STATUS_CHANGED: 'status_changed',
	REVIEWED: 'reviewed',
	DELETED: 'deleted',
	RESTORED: 'restored'
} as const;

export type ItemAuditActionValues = (typeof ItemAuditAction)[keyof typeof ItemAuditAction];

/**
 * Item Audit Logs Table
 *
 * Stores the complete history of changes for items in the admin panel.
 * Since items are stored in Git (not in the database), itemId is just
 * the slug, not a foreign key. User info is denormalized for display.
 */
export const itemAuditLogs = pgTable(
	'item_audit_logs',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		itemId: text('item_id').notNull(), // Item slug (not FK since items are in Git)
		itemName: text('item_name').notNull(), // Denormalized for display
		action: text('action', {
			enum: [
				ItemAuditAction.CREATED,
				ItemAuditAction.UPDATED,
				ItemAuditAction.STATUS_CHANGED,
				ItemAuditAction.REVIEWED,
				ItemAuditAction.DELETED,
				ItemAuditAction.RESTORED
			]
		}).notNull(),
		previousStatus: text('previous_status'), // For status changes
		newStatus: text('new_status'), // For status changes
		changes: jsonb('changes'), // Field-level changes: { field: { old, new } }
		performedBy: text('performed_by').references(() => users.id, { onDelete: 'set null' }),
		performedByName: text('performed_by_name'), // Denormalized for display
		notes: text('notes'), // Review notes or other context
		metadata: jsonb('metadata'), // Additional context (e.g., source IP, user agent)
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow()
	},
	(table) => ({
		itemIdIndex: index('item_audit_logs_item_id_idx').on(table.itemId),
		actionIndex: index('item_audit_logs_action_idx').on(table.action),
		performedByIndex: index('item_audit_logs_performed_by_idx').on(table.performedBy),
		createdAtIndex: index('item_audit_logs_created_at_idx').on(table.createdAt),
		itemIdActionIndex: index('item_audit_logs_item_id_action_idx').on(table.itemId, table.action)
	})
);

// ######################### Item Audit Log Types #########################
export type ItemAuditLog = typeof itemAuditLogs.$inferSelect;
export type NewItemAuditLog = typeof itemAuditLogs.$inferInsert;

/** Type for field-level changes stored in the changes column */
export type ItemAuditChanges = Record<string, { old: unknown; new: unknown }>;
