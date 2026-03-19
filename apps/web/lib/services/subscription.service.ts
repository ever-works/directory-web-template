import * as queries from '@/lib/db/queries';
import { SubscriptionStatus, type Subscription, type NewSubscription } from '@/lib/db/schema';
import { PaymentPlan, PaymentProvider, PAYMENT_PLAN_NAMES } from '../constants';
import {
	getDaysUntilExpiration,
	isInExpirationWarningPeriod,
	formatExpirationMessage
} from '@/lib/utils/plan-expiration.utils';

export interface CreateSubscriptionData {
	userId: string;
	planId: PaymentPlan;
	paymentProvider: PaymentProvider;
	subscriptionId: string;
	priceId?: string;
	customerId?: string;
	currency?: string;
	amount?: number;
	interval?: string;
	intervalCount?: number;
	startDate: Date;
	endDate?: Date;
	trialStart?: Date;
	trialEnd?: Date;
	metadata?: any;
}

export interface UpdateSubscriptionData {
	planId?: string;
	status?: string;
	endDate?: Date;
	amount?: number;
	interval?: string;
	intervalCount?: number;
	priceId?: string;
	metadata?: any;
}

export class SubscriptionService {
	/**
	 * Create a new subscription
	 */
	async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
		const newSubscription: NewSubscription = {
			userId: data.userId,
			planId: data.planId,
			status: SubscriptionStatus.PENDING,
			startDate: data.startDate,
			endDate: data.endDate,
			paymentProvider: data.paymentProvider,
			subscriptionId: data.subscriptionId,
			priceId: data.priceId,
			customerId: data.customerId,
			currency: data.currency || 'usd',
			amount: data.amount,
			interval: data.interval || 'month',
			intervalCount: data.intervalCount || 1,
			trialStart: data.trialStart,
			trialEnd: data.trialEnd,
			metadata: data.metadata ? JSON.stringify(data.metadata) : null
		};

		const subscription = await queries.createSubscription(newSubscription);

		// Log the creation
		await queries.logSubscriptionChange(
			subscription.id,
			'created',
			undefined,
			subscription.status,
			undefined,
			subscription.planId,
			'Subscription created',
			{ source: 'subscription_service' }
		);

		return subscription;
	}

	/**
	 * Get subscription by ID
	 */
	async getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
		return await queries.getSubscriptionWithUser(subscriptionId);
	}

	/**
	 * Get user's active subscription
	 */
	async getUserActiveSubscription(userId: string): Promise<Subscription | null> {
		return await queries.getUserActiveSubscription(userId);
	}

	/**
	 * Get all user subscriptions
	 */
	async getUserSubscriptions(userId: string): Promise<Subscription[]> {
		return await queries.getUserSubscriptions(userId);
	}

	/**
	 * Get subscription by provider subscription ID
	 */
	async getSubscriptionByProviderSubscriptionId(
		paymentProvider: string,
		subscriptionId: string
	): Promise<Subscription | null> {
		return await queries.getSubscriptionByProviderSubscriptionId(paymentProvider, subscriptionId);
	}

	/**
	 * Check if user has active subscription
	 */
	async hasActiveSubscription(userId: string): Promise<boolean> {
		return await queries.hasActiveSubscription(userId);
	}

	/**
	 * Get user's current plan
	 */
	async getUserPlan(userId: string): Promise<string> {
		return await queries.getUserPlan(userId);
	}
	/**
	 * Get user's current plan with full expiration details
	 */
	async getUserPlanWithExpiration(userId: string): Promise<{
		planId: string;
		effectivePlan: string;
		isExpired: boolean;
		expiresAt: Date | null;
		daysUntilExpiration: number | null;
		isInWarningPeriod: boolean;
		canAccessPlanFeatures: boolean;
		warningMessage: string | null;
		status: string | null;
	}> {
		const planData = await queries.getUserPlanWithExpiration(userId);
		const daysUntil = getDaysUntilExpiration(planData.expiresAt);
		const isInWarningPeriod = isInExpirationWarningPeriod(planData.expiresAt);
		const planName = this.getPlanDisplayName(planData.planId);

		return {
			planId: planData.planId,
			effectivePlan: planData.effectivePlan,
			isExpired: planData.isExpired,
			expiresAt: planData.expiresAt,
			daysUntilExpiration: daysUntil,
			isInWarningPeriod,
			canAccessPlanFeatures: !planData.isExpired,
			warningMessage: formatExpirationMessage(planName, daysUntil, planData.isExpired),
			status: planData.status
		};
	}

	/**
	 * Process expired subscriptions - update status and prepare for notifications
	 * Returns list of subscriptions that were updated
	 * Uses the result from updateExpiredSubscriptionsStatus() to ensure consistency
	 * and prevent race conditions between query and update operations
	 */
	async processExpiredSubscriptions(): Promise<{
		processed: number;
		subscriptions: Subscription[];
		errors: string[];
	}> {
		const errors: string[] = [];

		try {
			// Update expired subscriptions and get the actual updated records
			// This is atomic - we get exactly the subscriptions that were updated,
			// preventing race conditions where subscriptions expire between separate query and update
			const updatedSubscriptions = await queries.updateExpiredSubscriptionsStatus();

			if (updatedSubscriptions.length === 0) {
				return { processed: 0, subscriptions: [], errors: [] };
			}

			// Log the changes for each subscription that was actually updated
			for (const subscription of updatedSubscriptions) {
				try {
					await queries.logSubscriptionChange(
						subscription.id,
						'subscription_expired',
						SubscriptionStatus.ACTIVE,
						SubscriptionStatus.EXPIRED,
						subscription.planId,
						PaymentPlan.FREE,
						'Subscription expired - end date passed',
						{ source: 'expiration_cron', endDate: subscription.endDate }
					);
				} catch (error) {
					errors.push(`Failed to log change for subscription ${subscription.id}: ${error}`);
				}
			}

			return {
				processed: updatedSubscriptions.length,
				subscriptions: updatedSubscriptions,
				errors
			};
		} catch (error) {
			errors.push(`Failed to process expired subscriptions: ${error}`);
			return { processed: 0, subscriptions: [], errors };
		}
	}
	/**
	 * Get subscription history
	 */
	async getSubscriptionHistory(subscriptionId: string) {
		return await queries.getSubscriptionHistory(subscriptionId);
	}

	/**
	 * Get subscriptions expiring soon
	 */
	async getSubscriptionsExpiringSoon(days: number = 7): Promise<Subscription[]> {
		return await queries.getSubscriptionsExpiringSoon(days);
	}

	/**
	 * Get subscription statistics
	 */
	async getSubscriptionStats() {
		return await queries.getSubscriptionStats();
	}

	/**
	 * Update subscription
	 */
	async updateSubscription(subscriptionId: string, data: UpdateSubscriptionData): Promise<Subscription | null> {
		const updateData: any = {
			...data,
			metadata: data.metadata ? JSON.stringify(data.metadata) : undefined
		};

		return await queries.updateSubscription(subscriptionId, updateData);
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(
		subscriptionId: string,
		reason?: string,
		cancelAtPeriodEnd: boolean = false
	): Promise<Subscription | null> {
		return await queries.cancelSubscription(subscriptionId, reason, cancelAtPeriodEnd);
	}

	/**
	 * Check if plan allows feature
	 */
	async canAccessFeature(userId: string, feature: string): Promise<boolean> {
		const plan = await queries.getUserPlan(userId);

		const planFeatures = this.getPlanFeatures(plan);
		return planFeatures.includes(feature);
	}

	/**
	 * Get plan features
	 */
	private getPlanFeatures(planId: string): string[] {
		const features: Record<string, string[]> = {
			[PaymentPlan.FREE]: ['basic_access'],
			[PaymentPlan.STANDARD]: ['basic_access', 'advanced_features', 'pro_features', 'priority_support'],
			[PaymentPlan.PREMIUM]: [
				'basic_access',
				'advanced_features',
				'pro_features',
				'priority_support',
				'premium_features',
				'enterprise_features'
			]
		};

		return features[planId] || features[PaymentPlan.FREE];
	}

	/**
	 * Get plan display name
	 */
	getPlanDisplayName(planId: string): string {
		return PAYMENT_PLAN_NAMES[planId as PaymentPlan] || 'Unknown Plan';
	}

	/**
	 * Get plan limits
	 */
	getPlanLimits(planId: string): Record<string, number> {
		const limits: Record<string, Record<string, number>> = {
			[PaymentPlan.FREE]: {
				projects: 1,
				storage: 100, // MB
				users: 1,
				apiCalls: 1000
			},
			[PaymentPlan.STANDARD]: {
				projects: 5,
				storage: 1000, // MB
				users: 5,
				apiCalls: 10000
			},
			[PaymentPlan.PREMIUM]: {
				projects: 100,
				storage: 50000, // MB
				users: 100,
				apiCalls: 500000
			}
		};

		return limits[planId] || limits[PaymentPlan.FREE];
	}

	// ===================== Auto-Renewal Methods =====================

	/**
	 * Enable/disable auto-renewal for a subscription
	 * @param subscriptionId - Internal subscription ID
	 * @param enabled - Whether to enable auto-renewal
	 * @returns Updated subscription or null
	 */
	async setAutoRenewal(subscriptionId: string, enabled: boolean): Promise<Subscription | null> {
		const subscription = await this.getSubscriptionById(subscriptionId);
		if (!subscription) return null;

		// Update local database
		const updated = await queries.setAutoRenewal(subscriptionId, enabled);
		if (!updated) return null;

		// Log the change
		await queries.logSubscriptionChange(
			subscriptionId,
			enabled ? 'auto_renewal_enabled' : 'auto_renewal_disabled',
			undefined,
			undefined,
			undefined,
			undefined,
			enabled ? 'User enabled auto-renewal' : 'User disabled auto-renewal',
			{ autoRenewal: enabled }
		);

		return updated;
	}

	/**
	 * Get subscriptions due for renewal reminder
	 * @param days - Number of days look-ahead (default: 7)
	 * @returns Array of subscriptions needing reminders
	 */
	async getSubscriptionsDueForRenewalReminder(days: number = 7): Promise<Subscription[]> {
		return await queries.getSubscriptionsDueForRenewalReminder(days);
	}

	/**
	 * Mark renewal reminder as sent
	 * @param subscriptionId - Subscription ID
	 * @returns Updated subscription or null
	 */
	async markRenewalReminderSent(subscriptionId: string): Promise<Subscription | null> {
		return await queries.markRenewalReminderSent(subscriptionId);
	}

	/**
	 * Reset renewal state after successful payment
	 * Called when payment succeeds to reset reminder and failure counters
	 * Uses atomic update to ensure data consistency
	 * @param subscriptionId - Subscription ID
	 * @throws Error if subscription is not found
	 */
	async handleSuccessfulRenewal(subscriptionId: string): Promise<void> {
		// Use atomic reset to ensure both fields are updated together
		const updated = await queries.resetRenewalStateAtomic(subscriptionId);

		if (!updated) {
			throw new Error(`Subscription not found: ${subscriptionId}`);
		}

		await queries.logSubscriptionChange(
			subscriptionId,
			'renewal_succeeded',
			undefined,
			undefined,
			undefined,
			undefined,
			'Subscription renewed successfully',
			{ timestamp: new Date().toISOString() }
		);
	}

	/**
	 * Handle failed payment
	 * Increments failure counter and logs the event
	 * @param subscriptionId - Subscription ID
	 * @returns Current failed payment count
	 * @throws Error if subscription is not found
	 */
	async handleFailedPayment(subscriptionId: string): Promise<number> {
		const updated = await queries.incrementFailedPaymentCount(subscriptionId);

		if (!updated) {
			throw new Error(`Subscription not found: ${subscriptionId}`);
		}

		const failedCount = updated.failedPaymentCount ?? 0;

		await queries.logSubscriptionChange(
			subscriptionId,
			'payment_failed',
			undefined,
			undefined,
			undefined,
			undefined,
			`Payment attempt failed (attempt ${failedCount})`,
			{ failedPaymentCount: failedCount, timestamp: new Date().toISOString() }
		);

		return failedCount;
	}
}
// Export singleton instance
export const subscriptionService = new SubscriptionService();
