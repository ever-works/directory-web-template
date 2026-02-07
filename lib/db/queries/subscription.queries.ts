import { and, eq, desc, asc, lte, count, gte, sql, lt } from 'drizzle-orm';
import { db } from '../drizzle';
import {
	subscriptions,
	subscriptionHistory,
	users,
	SubscriptionStatus,
	type Subscription,
	type NewSubscription,
	type SubscriptionHistory as SubscriptionHistoryType,
	type NewSubscriptionHistory,
	type SubscriptionWithUser
} from '../schema';
import { PaymentPlan } from '@/lib/constants';
import { getEffectivePlan } from '@/lib/utils/plan-expiration.utils';

/**
 * Get active subscription for a user
 * @param userId - User ID
 * @returns Active subscription or null if not found
 */
export async function getUserActiveSubscription(userId: string): Promise<Subscription | null> {
	const result = await db
		.select()
		.from(subscriptions)
		.where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, SubscriptionStatus.ACTIVE)))
		.limit(1);

	return result[0] || null;
}

/**
 * Get all subscriptions for a user
 * @param userId - User ID
 * @returns Array of user subscriptions ordered by creation date
 */
export async function getUserSubscriptions(userId: string): Promise<Subscription[]> {
	return await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.orderBy(desc(subscriptions.createdAt));
}

/**
 * Get subscription by provider subscription ID
 * @param paymentProvider - Payment provider name
 * @param subscriptionId - Provider's subscription ID
 * @returns Subscription or null if not found
 */
export async function getSubscriptionByProviderSubscriptionId(
	paymentProvider: string,
	subscriptionId: string
): Promise<Subscription | null> {
	const result = await db
		.select()
		.from(subscriptions)
		.where(
			and(eq(subscriptions.paymentProvider, paymentProvider), eq(subscriptions.subscriptionId, subscriptionId))
		)
		.limit(1);

	return result[0] || null;
}

/**
 * Get subscription by user ID and subscription ID
 * @param userId - User ID
 * @param subscriptionId - Provider's subscription ID
 * @returns Subscription or null if not found
 */
export async function getSubscriptionByUserIdAndSubscriptionId(
	userId: string,
	subscriptionId: string
): Promise<Subscription | null> {
	const [subscription] = await db
		.select()
		.from(subscriptions)
		.where(and(eq(subscriptions.userId, userId), eq(subscriptions.subscriptionId, subscriptionId)));

	return subscription || null;
}

/**
 * Update subscription by subscription ID
 * @param updateData - Partial subscription data including subscriptionId
 * @returns Updated subscription or null if not found
 */
export async function updateSubscriptionBySubscriptionId(
	updateData: Partial<NewSubscription>
): Promise<Subscription | null> {
	const result = await db
		.update(subscriptions)
		.set({ ...updateData, updatedAt: new Date() })
		.where(eq(subscriptions.subscriptionId, updateData.subscriptionId!))
		.returning();

	return result[0] || null;
}

/**
 * Create a new subscription
 * @param data - Subscription data
 * @returns Created subscription
 */
export async function createSubscription(data: NewSubscription): Promise<Subscription> {
	const result = await db
		.insert(subscriptions)
		.values({
			...data,
			createdAt: new Date(),
			updatedAt: new Date()
		})
		.returning();

	return result[0];
}

/**
 * Update subscription
 * @param subscriptionId - Subscription ID
 * @param data - Partial subscription data to update
 * @returns Updated subscription or null if not found
 */
export async function updateSubscription(
	subscriptionId: string,
	data: Partial<NewSubscription>
): Promise<Subscription | null> {
	const result = await db
		.update(subscriptions)
		.set({
			...data,
			updatedAt: new Date()
		})
		.where(eq(subscriptions.id, subscriptionId))
		.returning();

	return result[0] || null;
}

/**
 * Update subscription status
 * @param subscriptionId - Subscription ID
 * @param status - New status
 * @param reason - Optional reason for status change
 * @returns Updated subscription or null if not found
 */
export async function updateSubscriptionStatus(
	subscriptionId: string,
	status: string,
	reason?: string
): Promise<Subscription | null> {
	const updateData: Partial<NewSubscription> & { cancelledAt?: Date; cancelReason?: string } = {
		status,
		updatedAt: new Date()
	};

	if (status === SubscriptionStatus.CANCELLED) {
		updateData.cancelledAt = new Date();
		if (reason) {
			updateData.cancelReason = reason;
		}
	}

	const result = await db
		.update(subscriptions)
		.set(updateData)
		.where(eq(subscriptions.id, subscriptionId))
		.returning();

	return result[0] || null;
}

/**
 * Cancel subscription
 * @param subscriptionId - Subscription ID
 * @param reason - Optional cancellation reason
 * @param cancelAtPeriodEnd - Whether to cancel at period end or immediately
 * @returns Updated subscription or null if not found
 */
export async function cancelSubscription(
	subscriptionId: string,
	reason?: string,
	cancelAtPeriodEnd: boolean = false
): Promise<Subscription | null> {
	const result = await db
		.update(subscriptions)
		.set({
			status: cancelAtPeriodEnd ? SubscriptionStatus.ACTIVE : SubscriptionStatus.CANCELLED,
			cancelledAt: new Date(),
			cancelReason: reason,
			cancelAtPeriodEnd,
			updatedAt: new Date()
		})
		.where(eq(subscriptions.id, subscriptionId))
		.returning();

	return result[0] || null;
}

/**
 * Get subscription with user details
 * @param subscriptionId - Subscription ID
 * @returns Subscription with user details or null if not found
 */
export async function getSubscriptionWithUser(subscriptionId: string): Promise<SubscriptionWithUser | null> {
	const result = await db
		.select()
		.from(subscriptions)
		.leftJoin(users, eq(subscriptions.userId, users.id))
		.where(eq(subscriptions.id, subscriptionId))
		.limit(1);

	if (!result[0]) return null;

	return {
		...result[0].subscriptions,
		user: result[0].users!
	};
}

/**
 * Get subscriptions expiring soon
 * @param days - Number of days to look ahead (default: 7)
 * @returns Array of subscriptions expiring within the specified days
 */
export async function getSubscriptionsExpiringSoon(days: number = 7): Promise<Subscription[]> {
	const expirationDate = new Date();
	expirationDate.setDate(expirationDate.getDate() + days);

	return await db
		.select()
		.from(subscriptions)
		.where(and(eq(subscriptions.status, SubscriptionStatus.ACTIVE), lte(subscriptions.endDate, expirationDate)))
		.orderBy(asc(subscriptions.endDate));
}

/**
 * Check if user has active subscription
 * @param userId - User ID
 * @returns True if user has active subscription, false otherwise
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
	const result = await db
		.select({ count: count() })
		.from(subscriptions)
		.where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, SubscriptionStatus.ACTIVE)));

	return result[0].count > 0;
}

/**
 * Get user's current plan (checks expiration)
 * @param userId - User ID
 * @returns Effective plan ID (defaults to FREE if no active subscription or expired)
 */
export async function getUserPlan(userId: string): Promise<string> {
	const subscription = await getUserActiveSubscription(userId);
	if (!subscription) return PaymentPlan.FREE;

	// Use expiration utility to get effective plan
	return getEffectivePlan(subscription.planId, subscription.endDate, subscription.status);
}

/**
 * Get user's current plan with full expiration details
 * @param userId - User ID
 * @returns Object with plan ID, effective plan, and expiration info
 */
export async function getUserPlanWithExpiration(userId: string): Promise<{
	planId: string;
	effectivePlan: string;
	isExpired: boolean;
	expiresAt: Date | null;
	status: string | null;
	subscriptionId: string | null;
}> {
	const subscription = await getUserActiveSubscription(userId);

	if (!subscription) {
		return {
			planId: PaymentPlan.FREE,
			effectivePlan: PaymentPlan.FREE,
			isExpired: false,
			expiresAt: null,
			status: null,
			subscriptionId: null
		};
	}

	const effectivePlan = getEffectivePlan(subscription.planId, subscription.endDate, subscription.status);
	const isExpired = effectivePlan !== subscription.planId && subscription.planId !== PaymentPlan.FREE;

	return {
		planId: subscription.planId,
		effectivePlan,
		isExpired,
		expiresAt: subscription.endDate || null,
		status: subscription.status,
		subscriptionId: subscription.id
	};
}

/**
 * Get subscriptions that have expired (past endDate but still marked as active)
 * @returns Array of subscriptions that need to be marked as expired
 */
export async function getExpiredActiveSubscriptions(): Promise<Subscription[]> {
	const now = new Date();

	return await db
		.select()
		.from(subscriptions)
		.where(and(eq(subscriptions.status, SubscriptionStatus.ACTIVE), lt(subscriptions.endDate, now)))
		.orderBy(asc(subscriptions.endDate));
}

/**
 * Update expired subscriptions to expired status
 * @returns Array of subscriptions that were updated
 */
export async function updateExpiredSubscriptionsStatus(): Promise<Subscription[]> {
	const now = new Date();

	const result = await db
		.update(subscriptions)
		.set({
			status: SubscriptionStatus.EXPIRED,
			updatedAt: now
		})
		.where(and(eq(subscriptions.status, SubscriptionStatus.ACTIVE), lt(subscriptions.endDate, now)))
		.returning();

	return result;
}

// ===================== Subscription History Queries =====================

/**
 * Create subscription history entry
 * @param data - Subscription history data
 * @returns Created history entry
 */
export async function createSubscriptionHistory(data: NewSubscriptionHistory): Promise<SubscriptionHistoryType> {
	const result = await db
		.insert(subscriptionHistory)
		.values({
			...data,
			createdAt: new Date()
		})
		.returning();

	return result[0];
}

/**
 * Get subscription history
 * @param subscriptionId - Subscription ID
 * @returns Array of subscription history entries ordered by creation date
 */
export async function getSubscriptionHistory(subscriptionId: string): Promise<SubscriptionHistoryType[]> {
	return await db
		.select()
		.from(subscriptionHistory)
		.where(eq(subscriptionHistory.subscriptionId, subscriptionId))
		.orderBy(desc(subscriptionHistory.createdAt));
}

/**
 * Log subscription change
 * @param subscriptionId - Subscription ID
 * @param action - Action taken
 * @param previousStatus - Previous status
 * @param newStatus - New status
 * @param previousPlan - Previous plan
 * @param newPlan - New plan
 * @param reason - Reason for change
 * @param metadata - Additional metadata
 * @returns Created history entry
 */
export async function logSubscriptionChange(
	subscriptionId: string,
	action: string,
	previousStatus?: string,
	newStatus?: string,
	previousPlan?: string,
	newPlan?: string,
	reason?: string,
	metadata?: Record<string, unknown>
): Promise<SubscriptionHistoryType> {
	return await createSubscriptionHistory({
		subscriptionId,
		action,
		previousStatus,
		newStatus,
		previousPlan,
		newPlan,
		reason,
		metadata: metadata ? JSON.stringify(metadata) : null
	});
}

/**
 * Get subscription statistics
 * @returns Subscription statistics including total, active, cancelled, and plan distribution
 */
export async function getSubscriptionStats() {
	const totalSubscriptions = await db.select({ count: count() }).from(subscriptions);

	const activeSubscriptions = await db
		.select({ count: count() })
		.from(subscriptions)
		.where(eq(subscriptions.status, SubscriptionStatus.ACTIVE));

	const cancelledSubscriptions = await db
		.select({ count: count() })
		.from(subscriptions)
		.where(eq(subscriptions.status, SubscriptionStatus.CANCELLED));

	const planDistribution = await db
		.select({
			planId: subscriptions.planId,
			count: count()
		})
		.from(subscriptions)
		.where(eq(subscriptions.status, SubscriptionStatus.ACTIVE))
		.groupBy(subscriptions.planId);

	return {
		total: totalSubscriptions[0].count,
		active: activeSubscriptions[0].count,
		cancelled: cancelledSubscriptions[0].count,
		planDistribution
	};
}

// ===================== Auto-Renewal Queries =====================

/**
 * Get subscriptions due for renewal reminder
 * Returns active subscriptions with auto-renewal enabled that expire within the specified days
 * and haven't received a reminder yet
 * @param days - Number of days before expiration to send reminder (default: 7)
 * @returns Array of subscriptions needing renewal reminders
 */
export async function getSubscriptionsDueForRenewalReminder(days: number = 7): Promise<Subscription[]> {
	const now = new Date();
	const futureDate = new Date();
	futureDate.setDate(futureDate.getDate() + days);

	return await db
		.select()
		.from(subscriptions)
		.where(
			and(
				eq(subscriptions.status, SubscriptionStatus.ACTIVE),
				eq(subscriptions.autoRenewal, true),
				eq(subscriptions.renewalReminderSent, false),
				gte(subscriptions.endDate, now),
				lte(subscriptions.endDate, futureDate)
			)
		)
		.orderBy(asc(subscriptions.endDate));
}

/**
 * Get subscriptions with auto-renewal disabled at period end
 * These subscriptions should be cancelled when their period ends
 * @returns Array of subscriptions to cancel
 */
export async function getSubscriptionsToCancel(): Promise<Subscription[]> {
	const now = new Date();

	return await db
		.select()
		.from(subscriptions)
		.where(
			and(
				eq(subscriptions.status, SubscriptionStatus.ACTIVE),
				eq(subscriptions.autoRenewal, false),
				lte(subscriptions.endDate, now)
			)
		);
}

/**
 * Update auto-renewal status for a subscription
 * @param subscriptionId - Subscription ID
 * @param enabled - Whether auto-renewal should be enabled
 * @returns Updated subscription or null if not found
 */
export async function setAutoRenewal(subscriptionId: string, enabled: boolean): Promise<Subscription | null> {
	const result = await db
		.update(subscriptions)
		.set({
			autoRenewal: enabled,
			cancelAtPeriodEnd: !enabled,
			updatedAt: new Date()
		})
		.where(eq(subscriptions.id, subscriptionId))
		.returning();

	return result[0] || null;
}

/**
 * Reset renewal reminder flag after billing cycle
 * Should be called after successful payment to allow future reminders
 * @param subscriptionId - Subscription ID
 * @returns Updated subscription or null if not found
 */
export async function resetRenewalReminderSent(subscriptionId: string): Promise<Subscription | null> {
	const result = await db
		.update(subscriptions)
		.set({
			renewalReminderSent: false,
			updatedAt: new Date()
		})
		.where(eq(subscriptions.id, subscriptionId))
		.returning();

	return result[0] || null;
}

/**
 * Mark renewal reminder as sent for a subscription
 * @param subscriptionId - Subscription ID
 * @returns Updated subscription or null if not found
 */
export async function markRenewalReminderSent(subscriptionId: string): Promise<Subscription | null> {
	const result = await db
		.update(subscriptions)
		.set({
			renewalReminderSent: true,
			updatedAt: new Date()
		})
		.where(eq(subscriptions.id, subscriptionId))
		.returning();

	return result[0] || null;
}

/**
 * Increment failed payment count for a subscription
 * @param subscriptionId - Subscription ID
 * @returns Updated subscription or null if not found
 */
export async function incrementFailedPaymentCount(subscriptionId: string): Promise<Subscription | null> {
	const result = await db
		.update(subscriptions)
		.set({
			failedPaymentCount: sql`COALESCE(${subscriptions.failedPaymentCount}, 0) + 1`,
			lastRenewalAttempt: new Date(),
			updatedAt: new Date()
		})
		.where(eq(subscriptions.id, subscriptionId))
		.returning();

	return result[0] || null;
}

/**
 * Reset failed payment count after successful payment
 * @param subscriptionId - Subscription ID
 * @returns Updated subscription or null if not found
 */
export async function resetFailedPaymentCount(subscriptionId: string): Promise<Subscription | null> {
	const result = await db
		.update(subscriptions)
		.set({
			failedPaymentCount: 0,
			lastRenewalAttempt: new Date(),
			updatedAt: new Date()
		})
		.where(eq(subscriptions.id, subscriptionId))
		.returning();

	return result[0] || null;
}

/**
 * Get subscriptions with failed payment counts exceeding threshold
 * @param threshold - Minimum failed payment count (default: 3)
 * @returns Array of subscriptions with too many failed payments
 */
export async function getSubscriptionsWithFailedPayments(threshold: number = 3): Promise<Subscription[]> {
	return await db
		.select()
		.from(subscriptions)
		.where(
			and(eq(subscriptions.status, SubscriptionStatus.ACTIVE), gte(subscriptions.failedPaymentCount, threshold))
		);
}

/**
 * Atomically reset renewal state after successful payment
 * Resets both renewalReminderSent and failedPaymentCount in a single transaction
 * to ensure data consistency
 * @param subscriptionId - Subscription ID
 * @returns Updated subscription or null if not found
 */
export async function resetRenewalStateAtomic(subscriptionId: string): Promise<Subscription | null> {
	// Use a single update with both fields to ensure atomicity
	const result = await db
		.update(subscriptions)
		.set({
			renewalReminderSent: false,
			failedPaymentCount: 0,
			lastRenewalAttempt: new Date(),
			updatedAt: new Date()
		})
		.where(eq(subscriptions.id, subscriptionId))
		.returning();

	return result[0] || null;
}
