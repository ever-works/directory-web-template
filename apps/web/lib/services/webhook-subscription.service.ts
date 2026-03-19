/**
 * Webhook Subscription Service
 * Handles all webhook events related to subscriptions
 * Designed for senior-level SaaS subscription management
 */

import * as queries from '@/lib/db/queries';
import {
	SubscriptionStatus,
	type Subscription,
	type NewSubscription,
	type SubscriptionStatusValues
} from '@/lib/db/schema';
import { PaymentPlan, PaymentProvider } from '@/lib/constants';
import { convertCentsToDecimal, convertNumberToDate, WebhookEventType } from '@/lib/payment/types/payment-types';

export interface WebhookSubscriptionData {
	id: string;
	userId: string;
	planId: string;
	status: string;
	startDate: Date;
	endDate: Date;
	subscriptionId: string;
	subscription?: string;
	invoiceId?: string;
	priceId: string;
	customerId: string;
	currency: string;
	amount: number;
	amountDue?: number;
	amountPaid?: number;
	interval: string;
	intervalCount: number;
	trialStart: number;
	trialEnd: number;
	cancelledAt?: Date;
	cancelAtPeriodEnd: boolean;
	cancelReason: string;
	metadata: Record<string, any>;
	createdAt: Date;
	updatedAt: Date;
	paymentProvider?: string;
	customer_email?: string;
	customer_name?: string;
	periodEnd?: number;
	periodStart?: number;
	hostedInvoiceUrl?: string;
	invoicePdf?: string;
}

/**
 * Format webhook data to WebhookSubscriptionData format
 * This is a standalone utility function that can be used outside the class
 */
export const formatData = (
	data: any,
	paymentProvider: PaymentProvider = PaymentProvider.STRIPE
): WebhookSubscriptionData => {
	return {
		id: data.id,
		userId: data.metadata?.userId,
		planId: data.metadata?.planId,
		status: data.status,
		startDate: data.start_date,
		endDate: data.period_end,
		subscriptionId: data.id,
		subscription: data?.parent?.subscription_details?.subscription,
		priceId: data.items?.data?.[0]?.price?.id,
		customerId: data.customer,
		currency: data.currency,
		amount: data.items?.data?.[0]?.price?.unit_amount,
		amountDue: data?.amount_due,
		amountPaid: data?.amount_paid,
		interval: data.items?.data?.[0]?.price?.recurring?.interval,
		intervalCount: data.items?.data?.[0]?.price?.recurring?.interval_count,
		trialStart: data.trial_start,
		trialEnd: data.trial_end,
		cancelledAt: data.cancel_at,
		cancelAtPeriodEnd: data.cancel_at_period_end,
		cancelReason: data.billing_reason,
		invoiceId: data.id,
		metadata: {
			...data.metadata,
			stripeCustomerId: data.customer,
			stripePriceId: data.items?.data?.[0]?.price?.id
		},
		createdAt: new Date(),
		updatedAt: new Date(),
		paymentProvider,
		customer_email: data.customer_email,
		customer_name: data.customer_name,
		periodEnd: data.period_end,
		periodStart: data.period_start,
		hostedInvoiceUrl: data?.hosted_invoice_url,
		invoicePdf: data?.invoice_pdf
	} as WebhookSubscriptionData;
};

export interface WebhookProcessingResult {
	success: boolean;
	message: string;
	subscriptionId?: string;
	customer?: {
		customer_email?: string;
		customer_name?: string;
	};
	error?: string;
	data?: any;
}

export class WebhookSubscriptionService {
	private readonly paymentProvider: PaymentProvider;

	/**
	 * Creates a new WebhookSubscriptionService instance
	 *
	 * @param paymentProvider - The payment provider for this webhook service instance
	 *                         Defaults to STRIPE if not provided
	 */
	constructor(paymentProvider: PaymentProvider = PaymentProvider.STRIPE) {
		this.paymentProvider = paymentProvider;
	}

	/**
	 * Process subscription created webhook
	 * Creates new subscription record and logs history
	 */
	async handleSubscriptionCreated(data: any): Promise<WebhookProcessingResult> {
		const response = formatData(data, this.paymentProvider);
		try {
			const existingSubscription = await queries.getSubscriptionByProviderSubscriptionId(
				this.paymentProvider,
				response.subscriptionId
			);

			if (existingSubscription) {
				return {
					success: true,
					message: 'Subscription already exists',
					subscriptionId: existingSubscription.id
				};
			}
			const userId = await this.findUserByCustomerData(response);
			if (!userId) {
				throw new Error(`User not found for customer: ${data.customerId}`);
			}
			const newSubscription: NewSubscription = {
				userId: response.userId,
				planId: (response?.planId as any) || PaymentPlan.STANDARD,
				status: this.mapProviderStatusToInternal(response.status),
				startDate: new Date(),
				endDate: new Date() || null,
				paymentProvider: this.paymentProvider,
				subscriptionId: response.subscriptionId,
				priceId: response.priceId || null,
				customerId: response.customerId,
				currency: response.currency || 'usd',
				amount: convertCentsToDecimal(response.amount) || null,
				interval: response.interval || 'month',
				intervalCount: response.intervalCount || 1,
				trialStart: convertNumberToDate(response.trialStart) || null,
				trialEnd: convertNumberToDate(response.trialEnd) || null,
				cancelledAt: null,
				cancelAtPeriodEnd: response.cancelAtPeriodEnd || false,
				cancelReason: null,
				metadata: response.metadata ? JSON.stringify(response.metadata) : null,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const subscription = await queries.createSubscription(newSubscription);
			await queries.logSubscriptionChange(
				subscription.id,
				'subscription_created',
				undefined,
				subscription.status,
				undefined,
				subscription.planId,
				'Subscription created via webhook',
				{
					provider: response.paymentProvider,
					webhookEvent: WebhookEventType.SUBSCRIPTION_CREATED,
					providerSubscriptionId: response.subscriptionId
				}
			);

			console.log(`✅ Subscription created successfully: ${subscription.id}`);

			return {
				success: true,
				message: 'Subscription created successfully',
				subscriptionId: subscription.id,
				data: subscription
			};
		} catch (error) {
			console.error('❌ Error handling subscription created:', error);
			return {
				success: false,
				message: 'Failed to create subscription',
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Process subscription updated webhook
	 * Updates existing subscription and logs changes
	 */
	async handleSubscriptionUpdated(data: any): Promise<WebhookProcessingResult> {
		const response = formatData(data, this.paymentProvider);
		try {
			// Find existing subscription
			const existingSubscription = await queries.getSubscriptionByProviderSubscriptionId(
				this.paymentProvider,
				response.subscriptionId
			);

			if (!existingSubscription) {
				console.log(existingSubscription, `⚠️ Subscription not found, creating new one: ${data}`);
				return await this.handleSubscriptionCreated(response);
			}

			// Prepare update data
			const previousStatus = existingSubscription.status;
			const previousPlan = existingSubscription.planId;
			const newStatus = this.mapProviderStatusToInternal(response.status);
			const trialStart = convertNumberToDate(response.trialStart) || existingSubscription.trialStart;
			const trialEnd = convertNumberToDate(response.trialEnd) || existingSubscription.trialEnd;

			const updateData = {
				status: newStatus,
				planId: response.planId || existingSubscription.planId,
				endDate: response.endDate || existingSubscription.endDate,
				amount:
					response.planId === 'free'
						? 0
						: response.amount > 0
							? convertCentsToDecimal(response.amount)
							: existingSubscription.amount,
				priceId: response.priceId || existingSubscription.priceId,
				currency: response.currency || existingSubscription.currency,
				interval: response.interval || existingSubscription.interval,
				intervalCount: response.intervalCount || existingSubscription.intervalCount,
				trialStart: trialStart !== undefined ? trialStart : existingSubscription.trialStart,
				trialEnd: trialEnd !== undefined ? trialEnd : existingSubscription.trialEnd,
				cancelAtPeriodEnd:
					response.cancelAtPeriodEnd !== undefined
						? response.cancelAtPeriodEnd
						: existingSubscription.cancelAtPeriodEnd,
				metadata: response.metadata ? JSON.stringify(response.metadata) : existingSubscription.metadata,
				updatedAt: new Date()
			};

			// Update subscription
			const updatedSubscription = await queries.updateSubscription(existingSubscription.id, updateData);

			if (!updatedSubscription) {
				throw new Error('Failed to update subscription');
			}

			// Log subscription update
			await queries.logSubscriptionChange(
				existingSubscription.id,
				'subscription_updated',
				previousStatus,
				newStatus,
				previousPlan,
				updateData.planId,
				'Subscription updated via webhook',
				{
					provider: data.paymentProvider,
					webhookEvent: WebhookEventType.SUBSCRIPTION_UPDATED,
					providerSubscriptionId: data.subscriptionId,
					changes: this.getChangedFields(existingSubscription, updateData)
				}
			);

			console.log(`✅ Subscription updated successfully: ${existingSubscription.id}`);

			return {
				success: true,
				message: 'Subscription updated successfully',
				subscriptionId: existingSubscription.id,
				data: updatedSubscription
			};
		} catch (error) {
			console.error('❌ Error handling subscription updated:', error);
			return {
				success: false,
				message: 'Failed to update subscription',
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Process subscription cancelled webhook
	 * Marks subscription as cancelled and logs the cancellation
	 */
	async handleSubscriptionCancelled(data: any): Promise<WebhookProcessingResult> {
		const response = formatData(data, this.paymentProvider);
		try {
			console.log(`🔄 Processing subscription cancelled: ${data.subscriptionId}`);

			// Find existing subscription
			const existingSubscription = await queries.getSubscriptionByProviderSubscriptionId(
				this.paymentProvider,
				response.subscriptionId
			);

			if (!existingSubscription) {
				throw new Error(`Subscription not found: ${data.subscriptionId}`);
			}

			const previousStatus = existingSubscription.status;
			const cancelReason = response.metadata?.cancel_reason || 'Cancelled via webhook';

			// Update subscription to cancelled
			const updateData = {
				status: SubscriptionStatus.CANCELLED,
				cancelledAt: response.cancelledAt || new Date(),
				cancelAtPeriodEnd: response.cancelAtPeriodEnd ?? false,
				cancelReason,
				updatedAt: new Date()
			};

			const updatedSubscription = await queries.updateSubscription(existingSubscription.id, updateData);

			if (!updatedSubscription) {
				throw new Error('Failed to cancel subscription');
			}

			// Log subscription cancellation
			await queries.logSubscriptionChange(
				existingSubscription.id,
				'subscription_cancelled',
				previousStatus,
				SubscriptionStatus.CANCELLED,
				existingSubscription.planId,
				existingSubscription.planId,
				cancelReason,
				{
					provider: response.paymentProvider,
					webhookEvent: WebhookEventType.SUBSCRIPTION_CANCELLED,
					providerSubscriptionId: response.subscriptionId,
					cancelAtPeriodEnd: response.cancelAtPeriodEnd
				}
			);

			console.log(`✅ Subscription cancelled successfully: ${existingSubscription.id}`);

			return {
				success: true,
				message: 'Subscription cancelled successfully',
				subscriptionId: existingSubscription.id,
				data: updatedSubscription
			};
		} catch (error) {
			console.error('❌ Error handling subscription cancelled:', error);
			return {
				success: false,
				message: 'Failed to cancel subscription',
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Process subscription payment succeeded webhook
	 * Updates subscription status and extends period if needed
	 */
	async handleSubscriptionPaymentSucceeded(data: any): Promise<WebhookProcessingResult> {
		const response = formatData(data, this.paymentProvider);
		try {
			const existingSubscription = await queries.getSubscriptionByProviderSubscriptionId(
				this.paymentProvider,
				response.subscription!
			);

			if (!existingSubscription) {
				console.log(existingSubscription, `⚠️ Subscription not found for payment success: ${response}`);
				return await this.handleSubscriptionCreated(data);
			}
			const previousStatus = existingSubscription.status;
			// Update subscription with successful payment
			const updateData = {
				status: SubscriptionStatus.ACTIVE,
				endDate: convertNumberToDate(response.periodEnd!),
				amountDue: convertCentsToDecimal(response.amountDue!),
				amountPaid: convertCentsToDecimal(response.amountPaid!),
				periodEnd: convertNumberToDate(response.periodEnd),
				periodStart: convertNumberToDate(response.periodStart),
				invoicePdf: response.invoicePdf,
				hostedInvoiceUrl: response.hostedInvoiceUrl,
				invoiceId: response.invoiceId,
				updatedAt: new Date()
			};
			const updatedSubscription = await queries.updateSubscription(existingSubscription.id, updateData);
			if (!updatedSubscription) {
				throw new Error('Failed to update subscription after payment success');
			}
			// Log payment success
			await queries.logSubscriptionChange(
				existingSubscription.id,
				'payment_succeeded',
				previousStatus,
				SubscriptionStatus.ACTIVE,
				existingSubscription.planId,
				existingSubscription.planId,
				'Subscription payment succeeded',
				{
					provider: response.paymentProvider,
					webhookEvent: WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED,
					providerSubscriptionId: response.subscriptionId,
					amount: convertCentsToDecimal(response.amount),
					currency: response.currency
				}
			);

			console.log(`✅ Subscription payment processed successfully: ${existingSubscription.id}`);

			return {
				success: true,
				message: 'Subscription payment processed successfully',
				subscriptionId: existingSubscription.id,
				data: updatedSubscription,
				customer: {
					customer_email: response.customer_email,
					customer_name: response.customer_name
				}
			};
		} catch (error) {
			console.error('❌ Error handling subscription payment succeeded:', error);
			return {
				success: false,
				message: 'Failed to process subscription payment',
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Process subscription payment failed webhook
	 * Updates subscription status and handles retry logic
	 */
	async handleSubscriptionPaymentFailed(data: any): Promise<WebhookProcessingResult> {
		const response = formatData(data, this.paymentProvider);
		try {
			console.log(`🔄 Processing subscription payment failed: ${data.subscriptionId}`);

			// Find existing subscription
			const existingSubscription = await queries.getSubscriptionByProviderSubscriptionId(
				this.paymentProvider,
				response.subscriptionId
			);

			if (!existingSubscription) {
				throw new Error(`Subscription not found: ${data.subscriptionId}`);
			}

			const previousStatus = existingSubscription.status;
			const failureReason = response.metadata?.failure_reason || 'Payment failed';

			// Determine new status based on failure context
			let newStatus: SubscriptionStatusValues = SubscriptionStatus.ACTIVE; // Keep active for retry attempts

			// If this is a final failure or subscription should be paused
			if (data.metadata?.final_failure || data.status === 'past_due') {
				newStatus = SubscriptionStatus.PAUSED;
			}

			const updateData = {
				status: newStatus,
				updatedAt: new Date()
			};

			const updatedSubscription = await queries.updateSubscription(existingSubscription.id, updateData);

			if (!updatedSubscription) {
				throw new Error('Failed to update subscription after payment failure');
			}

			// Log payment failure
			await queries.logSubscriptionChange(
				existingSubscription.id,
				'payment_failed',
				previousStatus,
				newStatus,
				existingSubscription.planId,
				existingSubscription.planId,
				failureReason,
				{
					provider: data.paymentProvider,
					webhookEvent: WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
					providerSubscriptionId: data.subscriptionId,
					failureReason,
					retryAttempt: data.metadata?.retry_attempt || 1
				}
			);

			console.log(`✅ Subscription payment failure processed: ${existingSubscription.id}`);

			return {
				success: true,
				message: 'Subscription payment failure processed',
				subscriptionId: existingSubscription.id,
				data: updatedSubscription
			};
		} catch (error) {
			console.error('❌ Error handling subscription payment failed:', error);
			return {
				success: false,
				message: 'Failed to process subscription payment failure',
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Process payment succeeded webhook
	 */
	async handlePaymentSucceeded(data: any): Promise<WebhookProcessingResult> {
		const response = formatData(data, this.paymentProvider);
		try {
			console.log(`✅ Payment succeeded: ${data.id}`);
			// Log payment success
			// Note: For one-time payments, we might want to update an order or similar entity
			// Since we don't have a generic "Payment" entity, we'll just log it for now
			// but this structure allows adding that logic easily later

			return {
				success: true,
				message: 'Payment succeeded processed',
				data: response
			};
		} catch (error) {
			console.error('❌ Error handling payment succeeded:', error);
			return {
				success: false,
				message: 'Failed to process payment success',
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Process payment failed webhook
	 */
	async handlePaymentFailed(data: any): Promise<WebhookProcessingResult> {
		const response = formatData(data, this.paymentProvider);
		try {
			console.log(`❌ Payment failed: ${data.id}`);

			return {
				success: true,
				message: 'Payment failed processed',
				data: response
			};
		} catch (error) {
			console.error('❌ Error handling payment failed:', error);
			return {
				success: false,
				message: 'Failed to process payment failure',
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Process subscription trial ending webhook
	 * Notifies about trial ending and prepares for billing
	 */
	async handleSubscriptionTrialEnding(data: WebhookSubscriptionData): Promise<WebhookProcessingResult> {
		try {
			const response = formatData(data, this.paymentProvider);
			console.log(`🔄 Processing subscription trial ending: ${data.subscriptionId}`);

			// Find existing subscription
			const existingSubscription = await queries.getSubscriptionByProviderSubscriptionId(
				this.paymentProvider,
				response.subscriptionId
			);

			if (!existingSubscription) {
				throw new Error(`Subscription not found: ${data.subscriptionId}`);
			}

			// Log trial ending event
			await queries.logSubscriptionChange(
				existingSubscription.id,
				'trial_ending',
				existingSubscription.status,
				existingSubscription.status,
				existingSubscription.planId,
				existingSubscription.planId,
				'Trial period ending soon',
				{
					provider: response.paymentProvider,
					webhookEvent: WebhookEventType.SUBSCRIPTION_TRIAL_ENDING,
					providerSubscriptionId: response.subscriptionId,
					trialEndDate: convertNumberToDate(response.trialEnd)
				}
			);

			console.log(`✅ Subscription trial ending processed: ${existingSubscription.id}`);

			return {
				success: true,
				message: 'Subscription trial ending processed',
				subscriptionId: existingSubscription.id,
				data: existingSubscription
			};
		} catch (error) {
			console.error('❌ Error handling subscription trial ending:', error);
			return {
				success: false,
				message: 'Failed to process subscription trial ending',
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Find user by customer data (customer ID or metadata)
	 */
	private async findUserByCustomerData(response: any): Promise<string | null> {
		const data = formatData(response, this.paymentProvider);
		try {
			// First try to find by userId in metadata
			if (data.userId) {
				const user = await queries.getUserById(data.userId);
				if (user) return user.id;
			}

			// Try to find by metadata userId
			if (data.metadata?.userId) {
				const user = await queries.getUserById(data.metadata.userId);
				if (user) return user.id;
			}

			// Try to find by customer email in metadata
			if (data.customer_email) {
				const user = await queries.getUserByEmail(data.customer_email);
				if (user) return user.id;
			}

			// If no user found, this might be a new customer
			console.warn(`⚠️ User not found for customer: ${data.customerId}`);
			return null;
		} catch (error) {
			console.error('Error finding user by customer data:', error);
			return null;
		}
	}

	/**
	 * Map provider-specific status to internal status
	 */
	private mapProviderStatusToInternal(providerStatus: string): SubscriptionStatusValues {
		const statusMap: Record<string, SubscriptionStatusValues> = {
			// Stripe statuses
			active: SubscriptionStatus.ACTIVE,
			canceled: SubscriptionStatus.CANCELLED,
			incomplete: SubscriptionStatus.PENDING,
			incomplete_expired: SubscriptionStatus.EXPIRED,
			past_due: SubscriptionStatus.PAUSED,
			trialing: SubscriptionStatus.ACTIVE,
			unpaid: SubscriptionStatus.PAUSED,

			// LemonSqueezy statuses
			on_trial: SubscriptionStatus.ACTIVE,
			cancelled: SubscriptionStatus.CANCELLED,
			expired: SubscriptionStatus.EXPIRED,
			paused: SubscriptionStatus.PAUSED,

			// SolidGate statuses
			pending: SubscriptionStatus.PENDING,
			failed: SubscriptionStatus.PAUSED
		};

		return statusMap[providerStatus.toLowerCase()] || SubscriptionStatus.PENDING;
	}

	/**
	 * Get changed fields between old and new subscription data
	 */
	private getChangedFields(oldData: Subscription, newData: any): Record<string, { old: any; new: any }> {
		const changes: Record<string, { old: any; new: any }> = {};

		const fieldsToCheck = ['status', 'planId', 'amount', 'currency', 'interval', 'endDate'];

		fieldsToCheck.forEach((field) => {
			if (oldData[field as keyof Subscription] !== newData[field]) {
				changes[field] = {
					old: oldData[field as keyof Subscription],
					new: newData[field]
				};
			}
		});

		return changes;
	}

	/**
	 * Validate webhook subscription data
	 */
	validateWebhookData(data: any): data is WebhookSubscriptionData {
		const required = ['subscriptionId', 'customerId', 'paymentProvider', 'status', 'currentPeriodStart'];

		for (const field of required) {
			if (!data[field]) {
				console.error(`Missing required field: ${field}`, data);
				return false;
			}
		}

		// Validate payment provider
		if (!Object.values(PaymentProvider).includes(data.paymentProvider)) {
			console.error(`Invalid payment provider: ${data.paymentProvider}`);
			return false;
		}

		// Validate currentPeriodStart is a valid Date
		if (!(data.currentPeriodStart instanceof Date) || isNaN(data.currentPeriodStart.getTime())) {
			console.error(`Invalid currentPeriodStart date: ${data.currentPeriodStart}`);
			return false;
		}

		return true;
	}

	private sanitizeMetadata(metadata: any): Record<string, any> {
		if (!metadata || typeof metadata !== 'object') return {};

		const sanitized: Record<string, any> = {};
		for (const [key, value] of Object.entries(metadata)) {
			// Only allow primitive types and arrays of primitives
			if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
				sanitized[key] = value;
			} else if (
				Array.isArray(value) &&
				value.every((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
			) {
				sanitized[key] = value;
			}
		}
		return sanitized;
	}

	/**
	 * Process webhook event based on type
	 */
	async processWebhookEvent(
		eventType: WebhookEventType,
		data: WebhookSubscriptionData
	): Promise<WebhookProcessingResult> {
		// Validate data first
		if (!this.validateWebhookData(data)) {
			return {
				success: false,
				message: 'Invalid webhook data',
				error: 'Webhook data validation failed'
			};
		}

		switch (eventType) {
			case WebhookEventType.SUBSCRIPTION_CREATED:
				return await this.handleSubscriptionCreated(data);

			case WebhookEventType.SUBSCRIPTION_UPDATED:
				return await this.handleSubscriptionUpdated(data);

			case WebhookEventType.SUBSCRIPTION_CANCELLED:
				return await this.handleSubscriptionCancelled(data);

			case WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED:
				return await this.handleSubscriptionPaymentSucceeded(data);

			case WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED:
				return await this.handleSubscriptionPaymentFailed(data);

			case WebhookEventType.SUBSCRIPTION_TRIAL_ENDING:
				return await this.handleSubscriptionTrialEnding(data);

			default:
				console.log(`⚠️ Unhandled webhook event type: ${eventType}`);
				return {
					success: false,
					message: `Unhandled webhook event type: ${eventType}`,
					error: 'Event type not supported'
				};
		}
	}
}
