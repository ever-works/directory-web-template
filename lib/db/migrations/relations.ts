import { relations } from "drizzle-orm/relations";
import { users, accounts, activityLogs, clientProfiles, authenticators, comments, favorites, notifications, paymentAccounts, paymentProviders, sessions, subscriptions, subscriptionHistory, votes, roles, rolePermissions, permissions, userRoles } from "./schema";

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	accounts: many(accounts),
	activityLogs: many(activityLogs),
	clientProfiles: many(clientProfiles),
	authenticators: many(authenticators),
	favorites: many(favorites),
	notifications: many(notifications),
	paymentAccounts: many(paymentAccounts),
	sessions: many(sessions),
	subscriptions: many(subscriptions),
	userRoles: many(userRoles),
}));

export const activityLogsRelations = relations(activityLogs, ({one}) => ({
	user: one(users, {
		fields: [activityLogs.userId],
		references: [users.id]
	}),
	clientProfile: one(clientProfiles, {
		fields: [activityLogs.clientId],
		references: [clientProfiles.id]
	}),
}));

export const clientProfilesRelations = relations(clientProfiles, ({one, many}) => ({
	activityLogs: many(activityLogs),
	user: one(users, {
		fields: [clientProfiles.userId],
		references: [users.id]
	}),
	comments: many(comments),
	votes: many(votes),
}));

export const authenticatorsRelations = relations(authenticators, ({one}) => ({
	user: one(users, {
		fields: [authenticators.userId],
		references: [users.id]
	}),
}));

export const commentsRelations = relations(comments, ({one}) => ({
	clientProfile: one(clientProfiles, {
		fields: [comments.userId],
		references: [clientProfiles.id]
	}),
}));

export const favoritesRelations = relations(favorites, ({one}) => ({
	user: one(users, {
		fields: [favorites.userId],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const paymentAccountsRelations = relations(paymentAccounts, ({one}) => ({
	user: one(users, {
		fields: [paymentAccounts.userId],
		references: [users.id]
	}),
	paymentProvider: one(paymentProviders, {
		fields: [paymentAccounts.providerId],
		references: [paymentProviders.id]
	}),
}));

export const paymentProvidersRelations = relations(paymentProviders, ({many}) => ({
	paymentAccounts: many(paymentAccounts),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({one, many}) => ({
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id]
	}),
	subscriptionHistories: many(subscriptionHistory),
}));

export const subscriptionHistoryRelations = relations(subscriptionHistory, ({one}) => ({
	subscription: one(subscriptions, {
		fields: [subscriptionHistory.subscriptionId],
		references: [subscriptions.id]
	}),
}));

export const votesRelations = relations(votes, ({one}) => ({
	clientProfile: one(clientProfiles, {
		fields: [votes.userid],
		references: [clientProfiles.id]
	}),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id]
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	rolePermissions: many(rolePermissions),
	userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
}));