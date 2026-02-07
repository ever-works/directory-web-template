import {
	pgTable,
	unique,
	text,
	boolean,
	timestamp,
	index,
	foreignKey,
	integer,
	serial,
	varchar,
	uniqueIndex,
	primaryKey,
	check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const newsletterSubscriptions = pgTable(
	'newsletterSubscriptions',
	{
		id: text().primaryKey().notNull(),
		email: text().notNull(),
		isActive: boolean('is_active').default(true).notNull(),
		subscribedAt: timestamp('subscribed_at', { mode: 'string' }).defaultNow().notNull(),
		unsubscribedAt: timestamp('unsubscribed_at', { mode: 'string' }),
		lastEmailSent: timestamp('last_email_sent', { mode: 'string' }),
		source: text().default('footer')
	},
	(table) => [unique('newsletterSubscriptions_email_unique').on(table.email)]
);

export const passwordResetTokens = pgTable(
	'passwordResetTokens',
	{
		id: text().primaryKey().notNull(),
		email: text().notNull(),
		token: text().notNull(),
		expires: timestamp({ mode: 'string' }).notNull()
	},
	(table) => [unique('passwordResetTokens_token_unique').on(table.token)]
);

export const verificationTokens = pgTable(
	'verificationTokens',
	{
		identifier: text().notNull(),
		email: text().notNull(),
		token: text().notNull(),
		expires: timestamp({ mode: 'string' }).notNull()
	},
	(table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

export const accounts = pgTable(
	'accounts',
	{
		userId: text().notNull(),
		type: text().notNull(),
		provider: text().notNull(),
		providerAccountId: text().notNull(),
		email: text(),
		passwordHash: text('password_hash'),
		refreshToken: text('refresh_token'),
		accessToken: text('access_token'),
		expiresAt: integer('expires_at'),
		tokenType: text('token_type'),
		scope: text(),
		idToken: text('id_token'),
		sessionState: text('session_state')
	},
	(table) => [
		index('accounts_email_idx').using('btree', table.email.asc().nullsLast().op('text_ops')),
		index('accounts_provider_idx').using('btree', table.provider.asc().nullsLast().op('text_ops')),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'accounts_userId_users_id_fk'
		}).onDelete('cascade')
	]
);

export const activityLogs = pgTable(
	'activityLogs',
	{
		id: serial().primaryKey().notNull(),
		userId: text(),
		clientId: text(),
		action: text().notNull(),
		timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
		ipAddress: varchar('ip_address', { length: 45 })
	},
	(table) => [
		index('activity_logs_action_idx').using('btree', table.action.asc().nullsLast().op('text_ops')),
		index('activity_logs_timestamp_idx').using('btree', table.timestamp.asc().nullsLast().op('timestamp_ops')),
		index('activity_logs_user_idx').using('btree', table.userId.asc().nullsLast().op('text_ops')),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'activityLogs_userId_users_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.clientId],
			foreignColumns: [clientProfiles.id],
			name: 'activityLogs_clientId_client_profiles_id_fk'
		}).onDelete('cascade')
	]
);

export const clientProfiles = pgTable(
	'client_profiles',
	{
		id: text().primaryKey().notNull(),
		userId: text().notNull(),
		email: text().notNull(),
		name: text().notNull(),
		displayName: text('display_name'),
		username: text(),
		bio: text(),
		jobTitle: text('job_title'),
		company: text(),
		industry: text(),
		phone: text(),
		website: text(),
		location: text(),
		avatar: text(),
		accountType: text('account_type').default('individual'),
		status: text().default('active'),
		plan: text().default('free'),
		timezone: text().default('UTC'),
		language: text().default('en'),
		twoFactorEnabled: boolean('two_factor_enabled').default(false),
		emailVerified: boolean('email_verified').default(false),
		totalSubmissions: integer('total_submissions').default(0),
		notes: text(),
		tags: text(),
		warningCount: integer('warning_count').default(0),
		suspendedAt: timestamp('suspended_at', { mode: 'string' }),
		bannedAt: timestamp('banned_at', { mode: 'string' }),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		index('client_profile_account_type_idx').using('btree', table.accountType.asc().nullsLast().op('text_ops')),
		index('client_profile_created_at_idx').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
		index('client_profile_email_idx').using('btree', table.email.asc().nullsLast().op('text_ops')),
		index('client_profile_plan_idx').using('btree', table.plan.asc().nullsLast().op('text_ops')),
		index('client_profile_status_idx').using('btree', table.status.asc().nullsLast().op('text_ops')),
		uniqueIndex('client_profile_user_id_unique_idx').using('btree', table.userId.asc().nullsLast().op('text_ops')),
		index('client_profile_username_idx').using('btree', table.username.asc().nullsLast().op('text_ops')),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'client_profiles_userId_users_id_fk'
		}).onDelete('cascade'),
		unique('client_profiles_username_unique').on(table.username)
	]
);

export const authenticators = pgTable(
	'authenticators',
	{
		credentialId: text().notNull(),
		userId: text().notNull(),
		providerAccountId: text().notNull(),
		credentialPublicKey: text().notNull(),
		counter: integer().notNull(),
		credentialDeviceType: text().notNull(),
		credentialBackedUp: boolean().notNull(),
		transports: text()
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'authenticators_userId_users_id_fk'
		}).onDelete('cascade'),
		unique('authenticators_credentialID_unique').on(table.credentialId)
	]
);

export const comments = pgTable(
	'comments',
	{
		id: text().primaryKey().notNull(),
		content: text().notNull(),
		userId: text().notNull(),
		itemId: text().notNull(),
		rating: integer().default(0).notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
		deletedAt: timestamp('deleted_at', { mode: 'string' })
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [clientProfiles.id],
			name: 'comments_userId_client_profiles_id_fk'
		}).onDelete('cascade')
	]
);

export const favorites = pgTable(
	'favorites',
	{
		id: text().primaryKey().notNull(),
		userId: text().notNull(),
		itemSlug: text('item_slug').notNull(),
		itemName: text('item_name').notNull(),
		itemIconUrl: text('item_icon_url'),
		itemCategory: text('item_category'),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		index('favorites_created_at_idx').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
		index('favorites_item_slug_idx').using('btree', table.itemSlug.asc().nullsLast().op('text_ops')),
		index('favorites_user_id_idx').using('btree', table.userId.asc().nullsLast().op('text_ops')),
		uniqueIndex('user_item_favorite_unique_idx').using(
			'btree',
			table.userId.asc().nullsLast().op('text_ops'),
			table.itemSlug.asc().nullsLast().op('text_ops')
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'favorites_userId_users_id_fk'
		}).onDelete('cascade')
	]
);

export const notifications = pgTable(
	'notifications',
	{
		id: text().primaryKey().notNull(),
		userId: text('user_id').notNull(),
		type: text().notNull(),
		title: text().notNull(),
		message: text().notNull(),
		data: text(),
		isRead: boolean('is_read').default(false).notNull(),
		readAt: timestamp('read_at', { mode: 'string' }),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		index('notifications_created_at_idx').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
		index('notifications_is_read_idx').using('btree', table.isRead.asc().nullsLast().op('bool_ops')),
		index('notifications_type_idx').using('btree', table.type.asc().nullsLast().op('text_ops')),
		index('notifications_user_idx').using('btree', table.userId.asc().nullsLast().op('text_ops')),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'notifications_user_id_users_id_fk'
		}).onDelete('cascade')
	]
);

export const users = pgTable(
	'users',
	{
		id: text().primaryKey().notNull(),
		email: text(),
		emailVerified: timestamp({ mode: 'string' }),
		passwordHash: text('password_hash'),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
		deletedAt: timestamp('deleted_at', { mode: 'string' }),
		image: text()
	},
	(table) => [
		index('users_created_at_idx').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
		unique('users_email_unique').on(table.email)
	]
);

export const paymentAccounts = pgTable(
	'paymentAccounts',
	{
		id: text().primaryKey().notNull(),
		userId: text().notNull(),
		providerId: text().notNull(),
		customerId: text().notNull(),
		accountId: text(),
		lastUsed: timestamp({ mode: 'string' }),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('customer_provider_unique_idx').using(
			'btree',
			table.customerId.asc().nullsLast().op('text_ops'),
			table.providerId.asc().nullsLast().op('text_ops')
		),
		index('payment_account_created_at_idx').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
		index('payment_account_customer_id_idx').using('btree', table.customerId.asc().nullsLast().op('text_ops')),
		index('payment_account_provider_idx').using('btree', table.providerId.asc().nullsLast().op('text_ops')),
		uniqueIndex('user_provider_unique_idx').using(
			'btree',
			table.userId.asc().nullsLast().op('text_ops'),
			table.providerId.asc().nullsLast().op('text_ops')
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'paymentAccounts_userId_users_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.providerId],
			foreignColumns: [paymentProviders.id],
			name: 'paymentAccounts_providerId_paymentProviders_id_fk'
		}).onDelete('cascade')
	]
);

export const paymentProviders = pgTable(
	'paymentProviders',
	{
		id: text().primaryKey().notNull(),
		name: text().default('stripe').notNull(),
		isActive: boolean('is_active').default(true).notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		index('payment_provider_active_idx').using('btree', table.isActive.asc().nullsLast().op('bool_ops')),
		index('payment_provider_created_at_idx').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
		unique('paymentProviders_name_unique').on(table.name)
	]
);

export const roles = pgTable(
	'roles',
	{
		id: text().primaryKey().notNull(),
		name: text().notNull(),
		description: text(),
		isAdmin: boolean('is_admin').default(false).notNull(),
		status: text().default('active'),
		permissions: text().notNull(),
		createdBy: text('created_by').default('system'),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		index('roles_created_at_idx').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
		index('roles_is_admin_idx').using('btree', table.isAdmin.asc().nullsLast().op('bool_ops')),
		index('roles_status_idx').using('btree', table.status.asc().nullsLast().op('text_ops'))
	]
);

export const permissions = pgTable(
	'permissions',
	{
		id: text().primaryKey().notNull(),
		key: text().notNull(),
		description: text(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		index('permissions_created_at_idx').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
		unique('permissions_key_unique').on(table.key)
	]
);

export const sessions = pgTable(
	'sessions',
	{
		sessionToken: text().primaryKey().notNull(),
		userId: text().notNull(),
		expires: timestamp({ mode: 'string' }).notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'sessions_userId_users_id_fk'
		}).onDelete('cascade')
	]
);

export const subscriptions = pgTable(
	'subscriptions',
	{
		id: text().primaryKey().notNull(),
		userId: text().notNull(),
		planId: text('plan_id').default('free').notNull(),
		status: text().default('pending').notNull(),
		startDate: timestamp('start_date', { mode: 'string' }).defaultNow().notNull(),
		endDate: timestamp('end_date', { mode: 'string' }),
		paymentProvider: text('payment_provider').default('stripe').notNull(),
		subscriptionId: text('subscription_id'),
		invoiceId: text('invoice_id'),
		amountDue: integer('amount_due').default(0),
		amountPaid: integer('amount_paid').default(0),
		priceId: text('price_id'),
		customerId: text('customer_id'),
		currency: text().default('usd'),
		amount: integer().default(0),
		interval: text().default('month'),
		intervalCount: integer('interval_count').default(1),
		trialStart: timestamp('trial_start', { mode: 'string' }),
		trialEnd: timestamp('trial_end', { mode: 'string' }),
		autoRenewal: boolean('auto_renewal').default(true),
		renewalReminderSent: boolean('renewal_reminder_sent').default(false),
		lastRenewalAttempt: timestamp('last_renewal_attempt', { mode: 'string' }),
		failedPaymentCount: integer('failed_payment_count').default(0),
		cancelledAt: timestamp('cancelled_at', { mode: 'string' }),
		cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
		cancelReason: text('cancel_reason'),
		hostedInvoiceUrl: text('hosted_invoice_url'),
		invoicePdf: text('invoice_pdf'),
		metadata: text(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('provider_subscription_idx').using(
			'btree',
			table.paymentProvider.asc().nullsLast().op('text_ops'),
			table.subscriptionId.asc().nullsLast().op('text_ops')
		),
		index('subscription_created_at_idx').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
		index('subscription_plan_idx').using('btree', table.planId.asc().nullsLast().op('text_ops')),
		index('subscription_status_idx').using('btree', table.status.asc().nullsLast().op('text_ops')),
		index('user_subscription_idx').using('btree', table.userId.asc().nullsLast().op('text_ops')),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'subscriptions_userId_users_id_fk'
		}).onDelete('cascade'),
		check('auto_renewal_check', sql`NOT (${table.autoRenewal} AND ${table.cancelAtPeriodEnd})`)
	]
);

export const subscriptionHistory = pgTable(
	'subscriptionHistory',
	{
		id: text().primaryKey().notNull(),
		subscriptionId: text('subscription_id').notNull(),
		action: text().notNull(),
		previousStatus: text('previous_status'),
		newStatus: text('new_status'),
		previousPlan: text('previous_plan'),
		newPlan: text('new_plan'),
		reason: text(),
		metadata: text(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		index('subscription_action_idx').using('btree', table.action.asc().nullsLast().op('text_ops')),
		index('subscription_history_created_at_idx').using(
			'btree',
			table.createdAt.asc().nullsLast().op('timestamp_ops')
		),
		index('subscription_history_idx').using('btree', table.subscriptionId.asc().nullsLast().op('text_ops')),
		foreignKey({
			columns: [table.subscriptionId],
			foreignColumns: [subscriptions.id],
			name: 'subscriptionHistory_subscription_id_subscriptions_id_fk'
		}).onDelete('cascade')
	]
);

export const votes = pgTable(
	'votes',
	{
		id: text().primaryKey().notNull(),
		userid: text().notNull(),
		itemId: text('item_id').notNull(),
		voteType: text('vote_type').default('upvote').notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		index('item_votes_idx').using('btree', table.itemId.asc().nullsLast().op('text_ops')),
		uniqueIndex('unique_user_item_vote_idx').using(
			'btree',
			table.userid.asc().nullsLast().op('text_ops'),
			table.itemId.asc().nullsLast().op('text_ops')
		),
		index('votes_created_at_idx').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
		foreignKey({
			columns: [table.userid],
			foreignColumns: [clientProfiles.id],
			name: 'votes_userid_client_profiles_id_fk'
		}).onDelete('cascade')
	]
);

export const rolePermissions = pgTable(
	'role_permissions',
	{
		roleId: text('role_id').notNull(),
		permissionId: text('permission_id').notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		index('role_permissions_created_at_idx').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
		index('role_permissions_permission_idx').using('btree', table.permissionId.asc().nullsLast().op('text_ops')),
		index('role_permissions_role_idx').using('btree', table.roleId.asc().nullsLast().op('text_ops')),
		foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: 'role_permissions_role_id_roles_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: 'role_permissions_permission_id_permissions_id_fk'
		}).onDelete('cascade'),
		primaryKey({ columns: [table.roleId, table.permissionId], name: 'role_permissions_role_id_permission_id_pk' })
	]
);

export const userRoles = pgTable(
	'user_roles',
	{
		userId: text('user_id').notNull(),
		roleId: text('role_id').notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		index('user_roles_created_at_idx').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
		index('user_roles_role_idx').using('btree', table.roleId.asc().nullsLast().op('text_ops')),
		index('user_roles_user_idx').using('btree', table.userId.asc().nullsLast().op('text_ops')),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'user_roles_user_id_users_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: 'user_roles_role_id_roles_id_fk'
		}).onDelete('cascade'),
		primaryKey({ columns: [table.userId, table.roleId], name: 'user_roles_user_id_role_id_pk' })
	]
);
