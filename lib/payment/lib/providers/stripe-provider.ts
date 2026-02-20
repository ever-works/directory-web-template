import Stripe from 'stripe';
import React from 'react';
import { User } from '@supabase/supabase-js';
import {
	PaymentProviderInterface,
	PaymentIntent,
	PaymentVerificationResult,
	WebhookResult,
	CreatePaymentParams,
	ClientConfig,
	PaymentProviderConfig,
	CreateCustomerParams,
	CustomerResult,
	CreateSubscriptionParams,
	SubscriptionInfo,
	SubscriptionStatus,
	UpdateSubscriptionParams,
	UIComponents,
	CardBrandIcon,
	PaymentFormProps,
	SetupIntent
} from '../../types/payment-types';
import StripeElementsWrapper from '../../ui/stripe/stripe-elements';
import { PRICES } from '../utils/prices';
import { paymentAccountClient } from '../client/payment-account-client';

const stripeCardBrands: CardBrandIcon[] = [
	{
		name: 'visa',
		lightIcon: '/assets/payment/stripe/visa-light.svg',
		darkIcon: '/assets/payment/stripe/visa-dark.svg',
		width: 40,
		height: 25
	},
	{
		name: 'mastercard',
		lightIcon: '/assets/payment/stripe/mastercard-light.svg',
		darkIcon: '/assets/payment/stripe/mastercard-dark.svg',
		width: 40,
		height: 25
	},
	{
		name: 'amex',
		lightIcon: '/assets/payment/stripe/amex-light.svg',
		darkIcon: '/assets/payment/stripe/amex-dark.svg',
		width: 40,
		height: 25
	},
	{
		name: 'discover',
		lightIcon: '/assets/payment/stripe/discover-light.svg',
		darkIcon: '/assets/payment/stripe/discover-dark.svg',
		width: 40,
		height: 25
	}
];

// Mock translations - would be actual translations in real implementation
const stripeTranslations = {
	en: {
		cardNumber: 'Card number',
		cardExpiry: 'Expiration date',
		cardCvc: 'CVC',
		submit: 'Pay now',
		processingPayment: 'Processing payment...',
		paymentSuccessful: 'Payment successful',
		paymentFailed: 'Payment failed'
	},
	fr: {
		cardNumber: 'Card number',
		cardExpiry: 'Expiration date',
		cardCvc: 'CVC',
		submit: 'Pay now',
		processingPayment: 'Processing payment...',
		paymentSuccessful: 'Payment successful',
		paymentFailed: 'Payment failed'
	}
};

export class StripeProvider implements PaymentProviderInterface {
	private stripe: Stripe;
	private webhookSecret: string;
	private publishableKey: string;

	constructor(config: PaymentProviderConfig) {
		this.stripe = new Stripe(config.apiKey, {
			apiVersion: '2025-07-30.basil' as Stripe.LatestApiVersion
		});
		this.webhookSecret = config.webhookSecret!;
		this.publishableKey = config.options?.publishableKey || '';
	}

	// Public method to get Stripe instance
	public getStripeInstance(): Stripe {
		return this.stripe;
	}

	hasCustomerId(user: User | null): boolean {
		return !!user?.user_metadata?.stripe_customer_id;
	}

	async getCustomerId(user: User | null): Promise<string | null> {
		const userId = user?.id;
		if (!this.isValidUser(user)) {
			this.logger.warn('getCustomerId: Invalid or disconnected user', { userId: userId || 'undefined' });
			return null;
		}
		const validatedUserId = user.id;
		this.logger.info('Starting Stripe customer retrieval/creation', { userId: validatedUserId });

		try {
			const customerIdFromMetadata = this.extractCustomerIdFromMetadata(user);
			if (customerIdFromMetadata) {
				this.logger.info('Stripe customer retrieved from metadata', {
					userId: validatedUserId,
					customerId: customerIdFromMetadata
				});
				return customerIdFromMetadata;
			}
			const customerIdFromDatabase = await this.retrieveCustomerIdFromDatabase(validatedUserId);
			if (customerIdFromDatabase) {
				this.logger.info('Stripe customer retrieved from database', {
					userId: validatedUserId,
					customerId: customerIdFromDatabase
				});
				return customerIdFromDatabase;
			}
			this.logger.info('Creating new Stripe customer', { userId: validatedUserId });
			const newCustomer = await this.createNewStripeCustomer(user);
			await this.synchronizePaymentAccount(validatedUserId, newCustomer.id);

			this.logger.info('New Stripe customer created successfully', {
				userId: validatedUserId,
				customerId: newCustomer.id
			});
			return newCustomer.id;
		} catch (error) {
			const errorMessage = this.formatErrorMessage(error);
			this.logger.error('Failed to retrieve/create Stripe customer', {
				userId: validatedUserId,
				error: errorMessage
			});
			throw new Error(`Unable to retrieve/create Stripe customer: ${errorMessage}`);
		}
	}

	private isValidUser(user: User | null): user is User {
		return user !== null && typeof user.id === 'string' && user.id.length > 0;
	}

	private extractCustomerIdFromMetadata(user: User): string | null {
		if (!this.hasCustomerId(user)) {
			return null;
		}

		const customerId = user.user_metadata?.customerId;
		return typeof customerId === 'string' && customerId.length > 0 ? customerId : null;
	}

	async createCustomCheckout(): Promise<string> {
		return '';
	}

	private async retrieveCustomerIdFromDatabase(userId: string): Promise<string | null> {
		try {
			const existingPaymentAccount = await paymentAccountClient.getPaymentAccount(userId, 'stripe');

			if (existingPaymentAccount?.customerId) {
				this.logger.debug('Existing PaymentAccount found in database', {
					userId,
					accountId: existingPaymentAccount.id,
					customerId: existingPaymentAccount.customerId
				});
				return existingPaymentAccount.customerId;
			}

			this.logger.debug('No existing PaymentAccount found in database', { userId });
			return null;
		} catch (error) {
			// Handle 404 errors gracefully (account doesn't exist yet)
			if (error instanceof Error && error.message.includes('404')) {
				this.logger.debug('Payment account not found (404) - this is expected for new users', { userId });
				return null;
			}

			this.logger.warn('Error retrieving from database', {
				userId,
				error: this.formatErrorMessage(error)
			});
			return null;
		}
	}

	private async createNewStripeCustomer(user: User): Promise<CustomerResult> {
		const customerData = this.buildCustomerData(user);
		try {
			const customer = await this.createCustomer(customerData);
			this.logger.debug('Stripe customer created successfully', {
				userId: user.id,
				customerId: customer.id,
				email: customer.email
			});
			return customer;
		} catch (error) {
			this.logger.error('Failed to create Stripe customer', {
				userId: user.id,
				error: this.formatErrorMessage(error),
				customerData
			});
			throw error;
		}
	}

	private buildCustomerData(user: User): CreateCustomerParams {
		return {
			email: user.email || '',
			name: user.user_metadata?.name || undefined,
			metadata: {
				userId: user.id,
				planId: user.user_metadata?.planId || undefined,
				planName: user.user_metadata?.planName || undefined,
				billingInterval: user.user_metadata?.billingInterval || undefined
			}
		};
	}

	private async synchronizePaymentAccount(userId: string, customerId: string): Promise<void> {
		try {
			const paymentAccount = await paymentAccountClient.setupPaymentAccount({
				provider: 'stripe',
				userId,
				customerId
			});
			this.logger.info('PaymentAccount synchronized successfully in database', {
				userId,
				customerId,
				accountId: paymentAccount.id,
				providerId: paymentAccount.providerId
			});
		} catch (error) {
			// Handle duplicate key constraint violations
			if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
				this.logger.warn('Payment account already exists - attempting to update', {
					userId,
					customerId,
					error: this.formatErrorMessage(error)
				});

				// Try to get the existing account and update it
				try {
					const existingAccount = await paymentAccountClient.getPaymentAccount(userId, 'stripe');
					if (existingAccount) {
						this.logger.info('Found existing payment account - synchronization completed', {
							userId,
							customerId,
							accountId: existingAccount.id
						});
						return;
					}
				} catch (updateError) {
					this.logger.error('Failed to retrieve existing payment account', {
						userId,
						customerId,
						error: this.formatErrorMessage(updateError)
					});
				}
			}

			this.logger.error('Failed to synchronize PaymentAccount in database', {
				userId,
				customerId,
				error: this.formatErrorMessage(error)
			});

			this.reportSynchronizationFailure(userId, customerId, error);
		}
	}

	private formatErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}
		if (typeof error === 'string') {
			return error;
		}
		return 'Unknown error';
	}

	private reportSynchronizationFailure(userId: string, customerId: string, error: unknown): void {
		this.logger.warn('Synchronization failure reported', {
			userId,
			customerId,
			error: this.formatErrorMessage(error),
			timestamp: new Date().toISOString()
		});
	}

	private get logger() {
		return {
			info: (message: string, context?: Record<string, any>) =>
				console.log(`[StripeProvider] ${message}`, context || ''),
			warn: (message: string, context?: Record<string, any>) =>
				console.warn(`[StripeProvider] ${message}`, context || ''),
			error: (message: string, context?: Record<string, any>) =>
				console.error(`[StripeProvider] ${message}`, context || ''),
			debug: (message: string, context?: Record<string, any>) =>
				console.log(`[StripeProvider] ${message}`, context || '')
		};
	}

	async createSetupIntent(user: User | null): Promise<SetupIntent> {
		const customerId = user?.user_metadata?.customerId;
		const setupIntent = await this.stripe.setupIntents.create({
			customer: customerId,
			payment_method_types: ['card']
		});

		return { ...setupIntent, clientSecret: setupIntent.client_secret! };
	}

	async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
		try {
			const { amount, currency, metadata, customerId, productId } = params;

			const stripeParams: Stripe.PaymentIntentCreateParams = {
				amount:
					metadata?.planId === '1'
						? Math.round((PRICES.us?.free?.amount || amount) * 100)
						: metadata?.planId === '2'
							? Math.round((PRICES.us?.oneTime?.amount || amount) * 100)
							: Math.round((PRICES.us?.subscription?.amount || amount) * 100),
				// Stripe expects amount in cents
				currency: PRICES.us?.currency || currency,
				setup_future_usage: 'off_session',
				automatic_payment_methods: { enabled: true },
				metadata
			};

			// Add the productId to the metadata if it is defined
			if (productId) {
				stripeParams.metadata!.productId = productId;
			}

			// Add the customerId only if it is defined
			if (customerId) {
				stripeParams.customer = customerId;
			}

			const paymentIntent = await this.stripe.paymentIntents.create(stripeParams);

			return {
				id: paymentIntent.id,
				amount: paymentIntent.amount / 100, // Convert back to decimal
				currency: paymentIntent.currency,
				status: paymentIntent.status,
				clientSecret: paymentIntent.client_secret || '',
				customerId: (paymentIntent.customer as string) || undefined
			};
		} catch (error) {
			console.error('Stripe createPaymentIntent error:', error);
			throw error;
		}
	}

	async confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent> {
		try {
			const paymentIntent = await this.stripe.paymentIntents.confirm(paymentId, {
				payment_method: paymentMethodId
			});

			return {
				id: paymentIntent.id,
				amount: paymentIntent.amount / 100,
				currency: paymentIntent.currency,
				status: paymentIntent.status,
				clientSecret: paymentIntent.client_secret || '',
				customerId: (paymentIntent.customer as string) || undefined
			};
		} catch (error) {
			console.error('Stripe confirmPayment error:', error);
			throw error;
		}
	}

	async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
		try {
			const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

			return {
				isValid: paymentIntent.status === 'succeeded',
				paymentId: paymentIntent.id,
				status: paymentIntent.status,
				details: {
					amount: paymentIntent.amount / 100,
					currency: paymentIntent.currency,
					metadata: paymentIntent.metadata,
					customerId: paymentIntent.customer
				}
			};
		} catch (error) {
			console.error('Stripe verifyPayment error:', error);
			throw error;
		}
	}

	async createCustomer(params: CreateCustomerParams): Promise<CustomerResult> {
		try {
			const { email, name, metadata } = params;

			const customer = await this.stripe.customers.create({
				email,
				name,
				metadata
			});

			return {
				id: customer.id,
				email: customer.email || email,
				name: customer.name || undefined,
				metadata: customer.metadata
			};
		} catch (error) {
			console.error('Stripe createCustomer error:', error);
			throw error;
		}
	}

	async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
		try {
			const { customerId, paymentMethodId, priceId, trialPeriodDays, metadata } = params;


			// If a paymentMethodId is provided, we need to first attach it to the client
			if (paymentMethodId) {
				await this.stripe.paymentMethods.attach(paymentMethodId, {
					customer: customerId
				});

				// Set this payment method as the default payment method
				await this.stripe.customers.update(customerId, {
					invoice_settings: {
						default_payment_method: paymentMethodId
					}
				});
			}

			// Create the subscription
			const subscriptionParams: Stripe.SubscriptionCreateParams = {
				customer: customerId,
				description: 'Annual subscription created',
				items: [{ price: priceId }],
				default_payment_method: paymentMethodId,
				expand: ['latest_invoice'],
				metadata,
				collection_method: 'charge_automatically'
			};

			// For subscriptions without trial period
			if (trialPeriodDays === 0) {
				// Options to charge immediately
				subscriptionParams.off_session = true;
				subscriptionParams.payment_settings = {
					save_default_payment_method: 'on_subscription'
				};
			} else {
				subscriptionParams.trial_period_days = trialPeriodDays;
			}

			const subscription = await this.stripe.subscriptions.create(subscriptionParams);

			// Get the payment_intent_id if available
			let paymentIntentId: string | undefined;
			if (subscription.latest_invoice && typeof subscription.latest_invoice !== 'string') {
				// Use a type assertion with additional check
				const invoice = subscription.latest_invoice as any;
				if (invoice && invoice.payment_intent && typeof invoice.payment_intent !== 'string') {
					paymentIntentId = invoice.payment_intent.id;
				}
			}

			return {
				id: subscription.id,
				customerId: subscription.customer as string,
				status: this.mapSubscriptionStatus(subscription.status),
				currentPeriodEnd: subscription.items.data[0]?.current_period_end,
				cancelAtPeriodEnd: subscription.cancel_at_period_end,
				cancelAt: subscription.cancel_at || null,
				trialEnd: subscription.trial_end || null,
				priceId: subscription.items.data[0]?.price?.id || priceId,
				paymentIntentId
			};
		} catch (error) {
			console.error('Stripe createSubscription error:', error);
			throw error;
		}
	}

	async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<SubscriptionInfo> {
		try {
			let subscription: Stripe.Subscription;

			if (cancelAtPeriodEnd) {
				// Cancel at the end of the current period
				subscription = await this.stripe.subscriptions.update(subscriptionId, {
					cancel_at_period_end: true
				});
			} else {
				// Cancel immediately
				subscription = await this.stripe.subscriptions.cancel(subscriptionId);
			}

			return {
				id: subscription.id,
				customerId: subscription.customer as string,
				status: this.mapSubscriptionStatus(subscription.status),
				currentPeriodEnd: subscription.items.data[0]?.current_period_end,
				cancelAtPeriodEnd: subscription.cancel_at_period_end,
				cancelAt: subscription.cancel_at || null,
				trialEnd: subscription.trial_end || null,
				priceId: subscription.items.data[0]?.price?.id || ''
			};
		} catch (error) {
			console.error('Stripe cancelSubscription error:', error);
			throw error;
		}
	}

	async updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo> {
		try {
			const { subscriptionId, priceId, cancelAtPeriodEnd, cancelAt, metadata } = params;

			const updateParams: Stripe.SubscriptionUpdateParams = {};

			if (priceId) {
				const existingSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
				if (existingSubscription.items.data[0]) {
					updateParams.items = [
						{
							id: existingSubscription.items.data[0].id,
							price: priceId
						}
					];
				}
			}

			if (cancelAtPeriodEnd !== undefined) {
				updateParams.cancel_at_period_end = cancelAtPeriodEnd;
			}

			if (cancelAt !== undefined) {
				updateParams.cancel_at = cancelAt;
			}

			if (metadata) {
				updateParams.metadata = metadata;
			}

			const subscription = await this.stripe.subscriptions.update(subscriptionId, updateParams);
			// Log only non-sensitive subscription fields
			if (process.env.NODE_ENV === 'development') {
				console.log('Stripe updateSubscription:', {
					id: subscription.id,
					status: subscription.status,
					cancelAtPeriodEnd: subscription.cancel_at_period_end,
					cancelAt: subscription.cancel_at,
					trialEnd: subscription.trial_end,
					priceId: subscription.items.data[0]?.price?.id
				});
			}
			return {
				id: subscription.id,
				customerId: subscription.customer as string,
				status: this.mapSubscriptionStatus(subscription.status),
				currentPeriodEnd: subscription.items.data[0]?.current_period_end,
				cancelAtPeriodEnd: subscription.cancel_at_period_end,
				cancelAt: subscription.cancel_at || null,
				trialEnd: subscription.trial_end || null,
				priceId: subscription.items.data[0]?.price?.id || ''
			};
		} catch (error) {
			console.error('Stripe updateSubscription error:', error);
			throw error;
		}
	}

	async handleWebhook(
		payload: any,
		signature: string,
		_rawBody?: string,
		_timestamp?: string,
		_webhookId?: string
	): Promise<WebhookResult> {
		try {
			const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);

			let eventType: string;
			let eventData: any = {};

			// Map Stripe event types to generic types
			switch (event.type) {
				case 'payment_intent.succeeded':
					eventType = 'payment_succeeded';
					eventData = event.data.object;
					break;
				case 'payment_intent.payment_failed':
					eventType = 'payment_failed';
					eventData = event.data.object;
					break;
				case 'customer.subscription.created':
					eventType = 'subscription_created';
					eventData = event.data.object;
					break;
				case 'customer.subscription.updated':
					eventType = 'subscription_updated';
					eventData = event.data.object;
					break;
				case 'customer.subscription.deleted':
					eventType = 'subscription_cancelled';
					eventData = event.data.object;
					break;
				case 'customer.subscription.trial_will_end':
					eventType = 'subscription_trial_ending';
					eventData = event.data.object;
					break;
				case 'invoice.payment_succeeded':
					eventType = 'subscription_payment_succeeded';
					eventData = event.data.object;
					break;
				case 'invoice.payment_failed':
					eventType = 'subscription_payment_failed';
					eventData = event.data.object;
					break;
				default:
					eventType = event.type;
					eventData = event.data.object;
			}

			return {
				received: true,
				type: eventType,
				id: event.id,
				data: eventData
			};
		} catch (error) {
			console.error('Stripe webhook handling error:', error);
			throw error;
		}
	}

	async refundPayment(paymentId: string, amount?: number): Promise<any> {
		try {
			const refundParams: Stripe.RefundCreateParams = {
				payment_intent: paymentId
			};

			if (amount) {
				refundParams.amount = Math.round(amount * 100);
			}

			const refund = await this.stripe.refunds.create(refundParams);

			return {
				id: refund.id,
				amount: refund.amount / 100,
				status: refund.status
			};
		} catch (error) {
			console.error('Stripe refundPayment error:', error);
			throw error;
		}
	}

	getClientConfig(): ClientConfig {
		return {
			publicKey: this.publishableKey,
			paymentGateway: 'stripe'
		};
	}

	getUIComponents(): UIComponents {
		// Create a function that will inject the public key into the StripeElements component
		const StripePaymentFormWithConfig = (props: PaymentFormProps) => {
			return React.createElement(StripeElementsWrapper, {
				...props,
				stripePublicKey: this.publishableKey
			});
		};

		return {
			// We use our wrapper function to configure the component with the public key
			PaymentForm: StripePaymentFormWithConfig,

			// Visual elements
			logo: '/assets/payment/stripe/stripe-logo.svg',
			cardBrands: stripeCardBrands,

			// Supported payment methods - Stripe automatically handles Apple Pay and Google Pay buttons
			// if they are enabled in the Stripe dashboard and the browser supports them
			supportedPaymentMethods: ['card'],

			// Translations
			translations: stripeTranslations
		};
	}

	// Utility function to map Stripe subscription statuses to our own statuses
	private mapSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
		switch (stripeStatus) {
			case 'incomplete':
				return SubscriptionStatus.INCOMPLETE;
			case 'incomplete_expired':
				return SubscriptionStatus.INCOMPLETE_EXPIRED;
			case 'trialing':
				return SubscriptionStatus.TRIALING;
			case 'active':
				return SubscriptionStatus.ACTIVE;
			case 'past_due':
				return SubscriptionStatus.PAST_DUE;
			case 'canceled':
				return SubscriptionStatus.CANCELED;
			case 'unpaid':
				return SubscriptionStatus.UNPAID;
			default:
				return SubscriptionStatus.INCOMPLETE;
		}
	}
}
