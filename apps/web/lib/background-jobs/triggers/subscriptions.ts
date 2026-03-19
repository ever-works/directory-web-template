/**
 * Subscription renewal reminder task identifiers and cron schedules.
 */

export const SubscriptionTaskIds = {
	renewalReminder: 'subscription-renewal-reminder',
	expiredCleanup: 'subscription-expired-cleanup'
} as const;

export type SubscriptionTaskId = (typeof SubscriptionTaskIds)[keyof typeof SubscriptionTaskIds];

export const SubscriptionCrons: Record<keyof typeof SubscriptionTaskIds, string> = {
	// Every day at 09:00 - send renewal reminders
	renewalReminder: '0 9 * * *',
	// Every day at 00:00 - clean up expired subscriptions
	expiredCleanup: '0 0 * * *'
};

export type SubscriptionCronKey = keyof typeof SubscriptionCrons;
