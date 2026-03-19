import { User } from '@supabase/auth-js';
import React from 'react';
import { Polar } from '@polar-sh/sdk';
import { validateEvent } from '@polar-sh/sdk/webhooks';

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
	UpdateSubscriptionParams,
	SetupIntent,
	UIComponents,
	CardBrandIcon,
	PaymentFormProps,
	SubscriptionStatus
} from '../../types/payment-types';
import { paymentAccountClient } from '../client/payment-account-client';
import {
	getPolarSubscription,
	cancelSubscriptionImmediately,
	cancelSubscriptionAtPeriodEnd,
	reactivatePolarSubscription,
	validateReactivateInputs,
	isScheduledForCancellation,
	createUserFriendlyError,
	mapPolarSubscriptionToInfo,
	validateSubscriptionId,
	type PolarCancelSubscriptionParams,
	type PolarReactivateSubscriptionParams
} from '../utils/polar-subscription-helpers';

/**
 * Custom error class for fatal Polar API errors that should not trigger fallback
 */
class PolarFatalError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PolarFatalError';
		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, PolarFatalError);
		}
	}
}

export interface PolarConfig extends PaymentProviderConfig {
	apiKey: string;
	webhookSecret: string;
	options?: {
		organizationId?: string;
		appUrl?: string;
		sandbox?: boolean;
		apiUrl?: string;
	};
}

const polarCardBrands: CardBrandIcon[] = [
	{
		name: 'visa',
		lightIcon: '/assets/payment/polar/visa-light.svg',
		darkIcon: '/assets/payment/polar/visa-dark.svg',
		width: 40,
		height: 25
	},
	{
		name: 'mastercard',
		lightIcon: '/assets/payment/polar/mastercard-light.svg',
		darkIcon: '/assets/payment/polar/mastercard-dark.svg',
		width: 40,
		height: 25
	},
	{
		name: 'amex',
		lightIcon: '/assets/payment/polar/amex-light.svg',
		darkIcon: '/assets/payment/polar/amex-dark.svg',
		width: 40,
		height: 25
	}
];

// Mock translations - would be actual translations in real implementation
const polarTranslations = {
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
		cardNumber: 'Numéro de carte',
		cardExpiry: "Date d'expiration",
		cardCvc: 'CVC',
		submit: 'Payer maintenant',
		processingPayment: 'Traitement du paiement...',
		paymentSuccessful: 'Paiement réussi',
		paymentFailed: 'Échec du paiement'
	}
};

const defaultAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://demo.ever.works';

/**
 * Cache entry for webhook ID deduplication
 * Stores webhook IDs with TTL to prevent replay attacks
 */
interface WebhookIdCacheEntry {
	webhookId: string;
	processedAt: number;
	expiresAt: number;
}

export class PolarProvider implements PaymentProviderInterface {
	private polar: Polar;
	private webhookSecret: string;
	private organizationId?: string;
	private appUrl?: string;
	private apiKey: string;
	private isSandbox: boolean = false;
	private configuredApiUrl?: string;
	// In-memory cache for webhook ID deduplication (replay protection)
	// Key: webhook-id, Value: cache entry with expiration
	private webhookIdCache: Map<string, WebhookIdCacheEntry> = new Map();
	// Default replay protection window: ±300 seconds (5 minutes)
	private readonly REPLAY_PROTECTION_WINDOW_SECONDS: number = 300;
	// TTL for webhook ID cache entries: window * 2 + 60 seconds buffer (660 seconds = 11 minutes)
	private readonly WEBHOOK_ID_CACHE_TTL_MS: number = 660000; // (300 * 2 + 60) * 1000

	constructor(config: PolarConfig) {
		if (!config.apiKey) {
			throw new Error('Polar API key is required');
		}

		this.apiKey = config.apiKey;
		this.isSandbox = config.options?.sandbox || false;

		console.log('[PolarProvider] Initializing with config:', {
			isSandbox: this.isSandbox,
			apiKeyPrefix: this.apiKey.substring(0, 10) + '...',
			apiKeyLength: this.apiKey.length,
			organizationId: config.options?.organizationId
		});

		this.polar = new Polar({
			accessToken: config.apiKey,
			server: this.isSandbox ? 'sandbox' : 'production'
		});
		this.webhookSecret = config.webhookSecret || '';
		this.organizationId = config.options?.organizationId;
		const rawAppUrl = config.options?.appUrl || defaultAppUrl;
		this.appUrl = rawAppUrl
			.trim()
			.replace(/^["']|["']$/g, '')
			.replace(/\/+$/, '');

		this.configuredApiUrl = config.options?.apiUrl;
		if (!this.organizationId) {
			throw new Error('Polar organization ID is required');
		}
	}

	hasCustomerId(user: User | null): boolean {
		return !!user?.user_metadata?.polar_customer_id;
	}

	private isValidUser(user: User | null): user is User {
		return user !== null && typeof user.id === 'string' && user.id.length > 0;
	}

	private extractCustomerIdFromMetadata(user: User): string | null {
		if (!this.hasCustomerId(user)) {
			return null;
		}

		const customerId = user.user_metadata?.polar_customer_id;
		return typeof customerId === 'string' && customerId.length > 0 ? customerId : null;
	}

	async getCustomerId(user: User | null): Promise<string | null> {
		const userId = user?.id;
		if (!this.isValidUser(user)) {
			this.logger.warn('getCustomerId: Invalid or disconnected user', { userId: userId || 'undefined' });
			return null;
		}
		const validatedUserId = user.id;
		this.logger.info('Starting Polar customer retrieval/creation', { userId: validatedUserId });

		try {
			const customerIdFromMetadata = this.extractCustomerIdFromMetadata(user);
			if (customerIdFromMetadata) {
				this.logger.info('Polar customer retrieved from metadata', {
					userId: validatedUserId,
					customerId: customerIdFromMetadata
				});
				return customerIdFromMetadata;
			}
			const customerIdFromDatabase = await this.retrieveCustomerIdFromDatabase(validatedUserId);
			if (customerIdFromDatabase) {
				this.logger.info('Polar customer retrieved from database', {
					userId: validatedUserId,
					customerId: customerIdFromDatabase
				});
				return customerIdFromDatabase;
			}
			this.logger.info('Creating new Polar customer', { userId: validatedUserId });
			const newCustomer = await this.createNewPolarCustomer(user);
			await this.synchronizePaymentAccount(validatedUserId, newCustomer.id);

			this.logger.info('New Polar customer created successfully', {
				userId: validatedUserId,
				customerId: newCustomer.id
			});
			return newCustomer.id;
		} catch (error) {
			const errorMessage = this.formatErrorMessage(error);
			this.logger.error('Failed to retrieve/create Polar customer', {
				userId: validatedUserId,
				error: errorMessage
			});
			throw new Error(`Unable to retrieve/create Polar customer: ${errorMessage}`);
		}
	}

	private async retrieveCustomerIdFromDatabase(userId: string): Promise<string | null> {
		try {
			const existingPaymentAccount = await paymentAccountClient.getPaymentAccount(userId, 'polar');

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

	private async createNewPolarCustomer(user: User): Promise<CustomerResult> {
		const customerData = this.buildCustomerData(user);
		try {
			const customer = await this.createCustomer(customerData);
			this.logger.debug('Polar customer created successfully', {
				userId: user.id,
				customerId: customer.id,
				email: customer.email
			});
			return customer;
		} catch (error) {
			this.logger.error('Failed to create Polar customer', {
				userId: user.id,
				error: this.formatErrorMessage(error),
				customerData
			});
			throw error;
		}
	}

	/**
	 * Remove undefined values from metadata object
	 * Polar doesn't accept undefined values in metadata
	 */
	private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
		const sanitized: Record<string, any> = {};
		for (const [key, value] of Object.entries(metadata)) {
			if (value !== undefined && value !== null) {
				sanitized[key] = value;
			}
		}
		return sanitized;
	}

	private buildCustomerData(user: User): CreateCustomerParams {
		const metadata: Record<string, any> = {
			userId: user.id
		};

		// Only add optional fields if they exist
		if (user.user_metadata?.planId) {
			metadata.planId = user.user_metadata.planId;
		}
		if (user.user_metadata?.planName) {
			metadata.planName = user.user_metadata.planName;
		}
		if (user.user_metadata?.billingInterval) {
			metadata.billingInterval = user.user_metadata.billingInterval;
		}

		return {
			email: user.email || '',
			name: user.user_metadata?.name || undefined,
			metadata: this.sanitizeMetadata(metadata)
		};
	}

	private async synchronizePaymentAccount(userId: string, customerId: string): Promise<void> {
		try {
			const paymentAccount = await paymentAccountClient.setupPaymentAccount({
				provider: 'polar',
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
					const existingAccount = await paymentAccountClient.getPaymentAccount(userId, 'polar');
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
			// Check if it's a Polar API error with validation details
			const errorMessage = error.message;

			// Check for payment setup errors
			if (
				errorMessage.includes('Payments are currently unavailable') ||
				errorMessage.includes('needs to complete their payment setup') ||
				errorMessage.includes('payment setup') ||
				errorMessage.includes('complete their payment')
			) {
				return 'Polar payment setup incomplete: The organization needs to complete payment configuration in the Polar dashboard before payments can be processed. Please contact the administrator or complete the payment setup in your Polar dashboard.';
			}

			// Try to parse Polar API error response
			try {
				// Check if error message contains JSON
				if (errorMessage.includes('{') || errorMessage.includes('detail')) {
					// Try to extract meaningful error from Polar API response
					const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
					if (jsonMatch) {
						const errorData = JSON.parse(jsonMatch[0]);

						// Handle Polar validation errors
						if (errorData.detail && Array.isArray(errorData.detail)) {
							const emailError = errorData.detail.find(
								(err: any) => err.loc && Array.isArray(err.loc) && err.loc.includes('email')
							);

							if (emailError) {
								// Check if it's an invalid email domain error
								if (emailError.msg && emailError.msg.includes('does not accept email')) {
									return `Invalid email address: ${emailError.input}. Polar requires a valid email address with a real domain. Test domains like 'example.com' are not accepted. Please use a real email address.`;
								}
								return emailError.msg || errorMessage;
							}

							// Return first error message
							const firstError = errorData.detail[0];
							if (firstError && firstError.msg) {
								// Check for payment setup errors in parsed response
								if (
									firstError.msg.includes('Payments are currently unavailable') ||
									firstError.msg.includes('needs to complete their payment setup')
								) {
									return 'Polar payment setup incomplete: The organization needs to complete payment configuration in the Polar dashboard before payments can be processed. Please contact the administrator or complete the payment setup in your Polar dashboard.';
								}
								return firstError.msg;
							}
						}

						// Check for payment setup errors in error message field
						if (
							errorData.message &&
							(errorData.message.includes('Payments are currently unavailable') ||
								errorData.message.includes('needs to complete their payment setup'))
						) {
							return 'Polar payment setup incomplete: The organization needs to complete payment configuration in the Polar dashboard before payments can be processed. Please contact the administrator or complete the payment setup in your Polar dashboard.';
						}
					}
				}
			} catch (_parseError) {
				// If parsing fails, return original message
			}

			return errorMessage;
		}
		if (typeof error === 'string') {
			// Check for payment setup errors in string errors
			if (
				error.includes('Payments are currently unavailable') ||
				error.includes('needs to complete their payment setup')
			) {
				return 'Polar payment setup incomplete: The organization needs to complete payment configuration in the Polar dashboard before payments can be processed. Please contact the administrator or complete the payment setup in your Polar dashboard.';
			}
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
				console.log(`[PolarProvider] ${message}`, context || ''),
			warn: (message: string, context?: Record<string, any>) =>
				console.warn(`[PolarProvider] ${message}`, context || ''),
			error: (message: string, context?: Record<string, any>) =>
				console.error(`[PolarProvider] ${message}`, context || ''),
			debug: (message: string, context?: Record<string, any>) =>
				console.log(`[PolarProvider] ${message}`, context || '')
		};
	}

	async createSetupIntent(_user: User | null): Promise<SetupIntent> {
		// Polar doesn't have a direct setup intent equivalent
		// Return a mock setup intent for compatibility
		return {
			id: 'polar_setup_' + Date.now(),
			client_secret: '',
			status: 'requires_payment_method',
			payment_method_types: ['card']
		} as SetupIntent;
	}

	async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
		try {
			const { amount, currency, metadata, customerId, productId } = params;

			if (!productId) {
				throw new Error('Product ID is required for payment intent');
			}

			// Sanitize metadata to remove undefined values
			const sanitizedMetadata = metadata ? this.sanitizeMetadata(metadata) : {};

			// Create a checkout link for Polar
			// Polar expects 'products' as an array, not 'productId'
			const checkout = await this.polar.checkouts.create({
				products: [productId], // Polar requires products as an array
				organizationId: this.organizationId!,
				amount: Math.round(amount * 100), // Convert to cents
				currency: currency.toUpperCase(),
				successUrl: params.successUrl || `${this.appUrl}/pricing/success`,
				customerId: customerId,
				metadata: sanitizedMetadata
			} as any);

			return {
				id: checkout.id || '',
				amount: amount,
				currency: currency,
				status: 'requires_payment_method',
				clientSecret: (checkout as any).clientSecret || undefined,
				customerId: customerId
			};
		} catch (error) {
			this.logger.error('Failed to create Polar payment intent', {
				error: this.formatErrorMessage(error),
				params
			});
			throw new Error(`Failed to create payment intent: ${this.formatErrorMessage(error)}`);
		}
	}

	async confirmPayment(paymentId: string, _paymentMethodId: string): Promise<PaymentIntent> {
		// Polar handles payment confirmation through webhooks
		// This method is kept for interface compatibility
		try {
			const payment = await this.polar.payments.get({ id: paymentId } as any);

			return {
				id: payment.id || paymentId,
				amount: ((payment as any).amount || 0) / 100, // Convert from cents
				currency: ((payment as any).currency || 'usd').toLowerCase(),
				status: (payment as any).status || 'succeeded',
				customerId: (payment as any).customerId
			};
		} catch (error) {
			this.logger.error('Failed to confirm Polar payment', {
				error: this.formatErrorMessage(error),
				paymentId
			});
			throw new Error(`Failed to confirm payment: ${this.formatErrorMessage(error)}`);
		}
	}

	async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
		try {
			const payment = await this.polar.payments.get({ id: paymentId } as any);
			const status = (payment as any).status || 'unknown';

			return {
				isValid: status === 'succeeded',
				paymentId: (payment as any).id || paymentId,
				status: status,
				details: payment
			};
		} catch (error) {
			this.logger.error('Failed to verify Polar payment', {
				error: this.formatErrorMessage(error),
				paymentId
			});
			return {
				isValid: false,
				paymentId,
				status: 'error',
				details: { error: this.formatErrorMessage(error) }
			};
		}
	}

	async createCustomer(params: CreateCustomerParams): Promise<CustomerResult> {
		try {
			// Validate email format before sending to Polar
			if (!params.email || !this.isValidEmail(params.email)) {
				throw new Error(`Invalid email address: ${params.email}. Please provide a valid email address.`);
			}

			// Check for test domains that Polar rejects
			const testDomains = ['example.com', 'test.com', 'invalid.com'];
			const emailDomain = params.email.split('@')[1]?.toLowerCase();
			if (emailDomain && testDomains.includes(emailDomain)) {
				throw new Error(
					`Email domain '${emailDomain}' is not accepted by Polar. Please use a real email address with a valid domain.`
				);
			}

			// Sanitize metadata to remove undefined values
			const sanitizedMetadata = params.metadata ? this.sanitizeMetadata(params.metadata) : {};

			const customer = await this.polar.customers.create({
				email: params.email,
				name: params.name,
				metadata: sanitizedMetadata
			} as any);

			return {
				id: (customer as any).id || '',
				email: (customer as any).email || params.email,
				name: (customer as any).name || params.name,
				metadata: (customer as any).metadata || params.metadata || {}
			};
		} catch (error) {
			const errorMessage = this.formatErrorMessage(error);
			this.logger.error('Failed to create Polar customer', {
				error: errorMessage,
				email: params.email,
				hasName: !!params.name
			});
			throw new Error(`Failed to create customer: ${errorMessage}`);
		}
	}

	/**
	 * Basic email validation
	 */
	private isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
		try {
			const { customerId, priceId, metadata } = params;

			if (!priceId) {
				throw new Error('Product ID is required for subscription');
			}

			// Sanitize metadata to remove undefined values
			const sanitizedMetadata = metadata ? this.sanitizeMetadata(metadata) : {};

			// Create a checkout for subscription
			// Polar expects 'products' as an array, not 'productId'
			const checkout = await this.polar.checkouts.create({
				products: [priceId], // Polar requires products as an array
				organizationId: this.organizationId!,
				customerId: customerId,
				successUrl: metadata?.successUrl || `${this.appUrl}/pricing/success`,
				cancelUrl: metadata?.cancelUrl || `${this.appUrl}/pricing`,
				metadata: sanitizedMetadata
			} as any);

			// Get subscription from checkout if available
			const subscriptionId = (checkout as any).subscriptionId;
			let subscription: any = null;
			if (subscriptionId) {
				try {
					subscription = await this.polar.subscriptions.get({ id: subscriptionId } as any);
				} catch (_err) {
					this.logger.warn('Could not fetch subscription after checkout creation', { subscriptionId });
				}
			}

			return {
				id: (subscription as any)?.id || (checkout as any).id || '',
				customerId: customerId,
				status: this.mapSubscriptionStatus((subscription as any)?.status || 'incomplete'),
				currentPeriodEnd: (subscription as any)?.currentPeriodEnd
					? new Date((subscription as any).currentPeriodEnd).getTime() / 1000
					: undefined,
				cancelAtPeriodEnd: (subscription as any)?.cancelAtPeriodEnd || false,
				priceId: priceId,
				checkoutData: {
					checkoutId: (checkout as any).id,
					url: (checkout as any).url
				}
			};
		} catch (error) {
			this.logger.error('Failed to create Polar subscription', {
				error: this.formatErrorMessage(error),
				params
			});
			throw new Error(`Failed to create subscription: ${this.formatErrorMessage(error)}`);
		}
	}

	async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<SubscriptionInfo> {
		try {
			const subscription = await getPolarSubscription(subscriptionId, this.polar, {
				formatErrorMessage: this.formatErrorMessage.bind(this),
				logger: this.logger
			});

			// Prepare common parameters for utility functions
			const params: PolarCancelSubscriptionParams = {
				subscriptionId,
				apiKey: this.apiKey,
				apiUrl: this.getPolarApiUrl(),
				formatErrorMessage: this.formatErrorMessage.bind(this),
				logger: this.logger
			};

			// Cancel immediately or at the end of the period
			if (!cancelAtPeriodEnd) {
				return await cancelSubscriptionImmediately(subscriptionId, subscription, params);
			} else {
				return await cancelSubscriptionAtPeriodEnd(subscriptionId, subscription, params);
			}
		} catch (error) {
			this.logger.error('Failed to cancel Polar subscription', {
				error: this.formatErrorMessage(error),
				subscriptionId,
				cancelAtPeriodEnd
			});
			throw new Error(`Failed to cancel subscription: ${this.formatErrorMessage(error)}`);
		}
	}

	/**
	 * Reactivate a cancelled Polar subscription
	 * Removes the cancellation flag so the subscription continues after the current period
	 * @param subscriptionId - Polar subscription ID to reactivate
	 * @returns SubscriptionInfo with updated subscription details
	 * @throws Error if reactivation fails
	 */
	async reactivateSubscription(subscriptionId: string): Promise<SubscriptionInfo> {
		// Validate inputs
		validateReactivateInputs(subscriptionId, this.apiKey);

		const normalizedSubscriptionId = subscriptionId.trim();

		this.logger.info('Starting subscription reactivation', {
			subscriptionId: normalizedSubscriptionId
		});

		try {
			// Get the current subscription to validate it exists
			const currentSubscription = await getPolarSubscription(
				normalizedSubscriptionId,
				this.polar,
				{
					formatErrorMessage: this.formatErrorMessage.bind(this),
					logger: this.logger
				},
				'reactivation'
			);

			if (!currentSubscription) {
				throw new Error(`Subscription not found: ${normalizedSubscriptionId}`);
			}

			// Check if subscription is actually scheduled for cancellation
			const isScheduled = isScheduledForCancellation(currentSubscription);
			if (!isScheduled) {
				this.logger.warn('Attempted to reactivate subscription that is not scheduled for cancellation', {
					subscriptionId: normalizedSubscriptionId,
					status: (currentSubscription as any).status
				});
				// Still proceed, as the subscription might already be active
			}

			// Prepare parameters for reactivation
			const params: PolarReactivateSubscriptionParams = {
				subscriptionId: normalizedSubscriptionId,
				apiKey: this.apiKey,
				apiUrl: this.getPolarApiUrl(),
				formatErrorMessage: this.formatErrorMessage.bind(this),
				logger: this.logger,
				timeout: 30000
			};

			// Reactivate the subscription
			const result = await reactivatePolarSubscription(normalizedSubscriptionId, currentSubscription, params);

			this.logger.info('Subscription reactivated successfully', {
				subscriptionId: normalizedSubscriptionId,
				resultStatus: result.status
			});

			return result;
		} catch (error) {
			const errorMessage = this.formatErrorMessage(error);
			const errorContext = {
				subscriptionId: normalizedSubscriptionId,
				error: errorMessage,
				timestamp: new Date().toISOString()
			};

			this.logger.error('Failed to reactivate Polar subscription', errorContext);

			// Create user-friendly error message
			throw createUserFriendlyError(errorMessage, normalizedSubscriptionId);
		}
	}

	async updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo> {
		try {
			const { subscriptionId, priceId, cancelAtPeriodEnd, metadata } = params;

			// Validate and sanitize subscription ID to prevent SSRF attacks
			const validatedSubscriptionId = validateSubscriptionId(subscriptionId);

			// Get the current subscription first to use as fallback
			const currentSubscription = await getPolarSubscription(validatedSubscriptionId, this.polar, {
				formatErrorMessage: this.formatErrorMessage.bind(this),
				logger: this.logger
			});

			// Special case: if cancelAtPeriodEnd is false, use reactivateSubscription
			// Polar requires using reactivate endpoint to set cancel_at_period_end to false
			if (cancelAtPeriodEnd === false) {
				const isCurrentlyScheduled = isScheduledForCancellation(currentSubscription);
				if (isCurrentlyScheduled) {
					// Use reactivateSubscription to remove cancellation flag
					const reactivated = await this.reactivateSubscription(validatedSubscriptionId);

					// If metadata needs to be updated, do it in a separate call
					if (metadata && Object.keys(this.sanitizeMetadata(metadata)).length > 0) {
						return await this.updateSubscriptionMetadata(validatedSubscriptionId, metadata, reactivated);
					}

					return reactivated;
				}
			}

			// Build the update body using REST API format (snake_case)
			const updateBody: any = {};

			// Polar API uses product_id for product changes, not priceId
			if (priceId) {
				updateBody.product_id = priceId;
			}

			// Polar API expects cancel_at_period_end (snake_case)
			// Only include if it's true (false case handled above via reactivate)
			if (cancelAtPeriodEnd === true) {
				updateBody.cancel_at_period_end = true;
			}

			// Sanitize metadata to remove undefined values
			if (metadata) {
				const sanitized = this.sanitizeMetadata(metadata);
				if (Object.keys(sanitized).length > 0) {
					updateBody.metadata = sanitized;
				}
			}

			// If updateBody is empty, nothing to update
			if (Object.keys(updateBody).length === 0) {
				this.logger.warn('No update parameters provided', { subscriptionId: validatedSubscriptionId });
				return mapPolarSubscriptionToInfo(
					currentSubscription,
					validatedSubscriptionId,
					currentSubscription,
					currentSubscription?.status || 'active',
					currentSubscription?.cancel_at_period_end ?? currentSubscription?.cancelAtPeriodEnd ?? false
				);
			}

			// Use REST API directly (more reliable than SDK for updates)
			const apiUrl = this.getPolarApiUrl();
			const response = await fetch(`${apiUrl}/v1/subscriptions/${validatedSubscriptionId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updateBody)
			});

			if (!response.ok) {
				const errorText = await response.text().catch(() => 'Unknown error');
				this.logger.error('Failed to update Polar subscription via REST API', {
					status: response.status,
					error: errorText,
					subscriptionId: validatedSubscriptionId,
					updateBody
				});
				throw new Error(`Failed to update subscription: ${errorText}`);
			}

			const updatedSubscription = await response.json().catch(() => currentSubscription);

			// Use the helper function to map the response
			return mapPolarSubscriptionToInfo(
				updatedSubscription,
				validatedSubscriptionId,
				currentSubscription,
				updatedSubscription?.status || currentSubscription?.status || 'active',
				updatedSubscription?.cancel_at_period_end ??
					updatedSubscription?.cancelAtPeriodEnd ??
					cancelAtPeriodEnd ??
					false
			);
		} catch (error) {
			this.logger.error('Failed to update Polar subscription', {
				error: this.formatErrorMessage(error),
				params
			});
			throw new Error(`Failed to update subscription: ${this.formatErrorMessage(error)}`);
		}
	}

	/**
	 * Helper method to update only subscription metadata
	 */
	private async updateSubscriptionMetadata(
		subscriptionId: string,
		metadata: Record<string, any>,
		fallbackSubscription?: SubscriptionInfo
	): Promise<SubscriptionInfo> {
		const validatedSubscriptionId = validateSubscriptionId(subscriptionId);
		const sanitized = this.sanitizeMetadata(metadata);

		if (Object.keys(sanitized).length === 0) {
			// No metadata to update, return fallback or get current subscription
			if (fallbackSubscription) {
				return fallbackSubscription;
			}
			const current = await getPolarSubscription(validatedSubscriptionId, this.polar, {
				formatErrorMessage: this.formatErrorMessage.bind(this),
				logger: this.logger
			});
			return mapPolarSubscriptionToInfo(
				current,
				validatedSubscriptionId,
				current,
				current?.status || 'active',
				current?.cancel_at_period_end ?? current?.cancelAtPeriodEnd ?? false
			);
		}

		// Get current subscription to extract product_id
		// Polar API requires product_id for SubscriptionUpdateProduct type when updating metadata
		const currentSubscription = await getPolarSubscription(validatedSubscriptionId, this.polar, {
			formatErrorMessage: this.formatErrorMessage.bind(this),
			logger: this.logger
		});

		// Extract product_id from current subscription (supports multiple formats)
		const productId =
			currentSubscription?.product?.id ||
			currentSubscription?.productId ||
			currentSubscription?.product_id ||
			null;

		if (!productId) {
			this.logger.warn('Cannot update metadata: product_id not found in current subscription', {
				subscriptionId: validatedSubscriptionId
			});
			// Return fallback or current subscription if we can't update
			if (fallbackSubscription) {
				return fallbackSubscription;
			}
			return mapPolarSubscriptionToInfo(
				currentSubscription,
				validatedSubscriptionId,
				currentSubscription,
				currentSubscription?.status || 'active',
				currentSubscription?.cancel_at_period_end ?? currentSubscription?.cancelAtPeriodEnd ?? false
			);
		}

		// Build update body with product_id and metadata
		// This makes it a valid SubscriptionUpdateProduct request
		const updateBody: any = {
			product_id: productId,
			metadata: sanitized
		};

		const apiUrl = this.getPolarApiUrl();
		const response = await fetch(`${apiUrl}/v1/subscriptions/${validatedSubscriptionId}`, {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(updateBody)
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error');
			this.logger.error('Failed to update Polar subscription metadata', {
				status: response.status,
				error: errorText,
				subscriptionId: validatedSubscriptionId
			});
			// If fallback exists, return it gracefully; otherwise propagate the error
			if (fallbackSubscription) {
				return fallbackSubscription;
			}
			throw new Error(`Failed to update subscription metadata: ${errorText}`);
		}

		const updated = await response.json().catch(() => null);

		// Reuse the currentSubscription we already fetched earlier
		// If we need to refresh it and don't have a fallback, try to get updated version
		// Otherwise, use the one we already have
		let subscriptionForMapping = currentSubscription;
		if (!fallbackSubscription && !updated) {
			try {
				subscriptionForMapping = await getPolarSubscription(validatedSubscriptionId, this.polar, {
					formatErrorMessage: this.formatErrorMessage.bind(this),
					logger: this.logger
				});
			} catch (error) {
				this.logger.warn(
					'Failed to get current subscription after metadata update, using previously fetched version',
					{
						subscriptionId: validatedSubscriptionId,
						error: this.formatErrorMessage(error)
					}
				);
				// Keep using currentSubscription we already have
			}
		}

		// Determine cancel_at_period_end value
		let cancelAtPeriodEndValue = false;
		if (updated?.cancel_at_period_end !== undefined) {
			cancelAtPeriodEndValue = updated.cancel_at_period_end;
		} else if (updated?.cancelAtPeriodEnd !== undefined) {
			cancelAtPeriodEndValue = updated.cancelAtPeriodEnd;
		} else if (subscriptionForMapping?.cancel_at_period_end !== undefined) {
			cancelAtPeriodEndValue = subscriptionForMapping.cancel_at_period_end;
		} else if (subscriptionForMapping?.cancelAtPeriodEnd !== undefined) {
			cancelAtPeriodEndValue = subscriptionForMapping.cancelAtPeriodEnd;
		} else if (fallbackSubscription?.cancelAtPeriodEnd !== undefined) {
			cancelAtPeriodEndValue = fallbackSubscription.cancelAtPeriodEnd;
		}

		return mapPolarSubscriptionToInfo(
			updated || subscriptionForMapping,
			validatedSubscriptionId,
			subscriptionForMapping || (fallbackSubscription as any),
			updated?.status || subscriptionForMapping?.status || fallbackSubscription?.status || 'active',
			cancelAtPeriodEndValue
		);
	}

	/**
	 * Handles incoming Polar webhook events
	 * Verifies webhook signature and maps event types to internal format
	 *
	 * @param payload - Parsed webhook payload
	 * @param signature - Webhook signature from header (hex encoded)
	 * @param rawBody - Raw request body for signature verification (required for verification)
	 * @param timestamp - Webhook timestamp from header (optional, used for replay protection)
	 * @param webhookId - Webhook ID from header (optional, not used in signature)
	 * @returns WebhookResult with normalized event data
	 * @throws Error if signature verification fails
	 */
	async handleWebhook(
		payload: any,
		signature: string,
		rawBody?: string,
		timestamp?: string,
		webhookId?: string
	): Promise<WebhookResult> {
		try {
			// Verify webhook signature if secret is configured
			if (this.webhookSecret) {
				this.verifyWebhookSignature(signature, rawBody, payload, timestamp, webhookId);
			} else {
				this.logger.warn('Webhook secret not configured, skipping signature verification');
			}

			// Map Polar event type to internal format
			const { eventType, eventData } = this.mapWebhookEventType(payload);

			// Extract event ID from payload
			const eventId = payload.id || payload.data?.id || '';

			return {
				received: true,
				type: eventType,
				id: eventId,
				data: eventData
			};
		} catch (error) {
			this.logger.error('Polar webhook handling error', {
				error: this.formatErrorMessage(error),
				eventId: payload?.id || payload?.data?.id || 'unknown',
				eventType: payload?.type || 'unknown'
			});
			throw error;
		}
	}

	/**
	 * Verifies webhook signature using Polar SDK's validateEvent function
	 * Uses the official @polar-sh/sdk webhook validation utility
	 * Also implements replay protection via timestamp and webhook-id checks
	 *
	 * @param signature - Received signature header value (should include "v1," prefix, e.g., "v1,<hex_signature>")
	 * @param rawBody - Raw request body (required, no fallback)
	 * @param payload - Parsed payload (unused, kept for compatibility)
	 * @param timestamp - Webhook timestamp (optional, used for replay protection)
	 * @param webhookId - Webhook ID (optional, used for idempotency/replay protection)
	 * @throws Error if signature verification fails or replay protection checks fail
	 */
	private verifyWebhookSignature(
		signature: string,
		rawBody: string | undefined,
		payload: any,
		timestamp: string | undefined,
		webhookId: string | undefined
	): void {
		// Require raw body - Polar calculates signature on raw body only
		if (!rawBody || typeof rawBody !== 'string') {
			this.logger.error('Missing raw request body for signature verification', {
				hasRawBody: !!rawBody,
				hasPayload: !!payload
			});
			throw new Error('Raw request body is required for signature verification');
		}

		// Ensure a signature header was actually provided
		if (!signature || typeof signature !== 'string') {
			this.logger.error('Missing webhook signature header', {
				hasSignature: !!signature,
				bodyLength: rawBody.length
			});
			throw new Error('Missing webhook-signature header required for signature verification');
		}

		try {
			// Build headers object for validateEvent
			// Polar SDK validateEvent expects headers with webhook-signature (full value including "v1," prefix),
			// webhook-timestamp, and webhook-id
			// The signature should be in format "v1,<hex_signature>" as sent by Polar
			const headers: Record<string, string> = {
				'webhook-signature': signature
			};

			if (timestamp) {
				headers['webhook-timestamp'] = timestamp;
			}

			if (webhookId) {
				headers['webhook-id'] = webhookId;
			}

			// Step 1: Verify HMAC signature using Polar SDK
			// validateEvent takes the raw body, headers object, and secret
			// It expects the webhook-signature header to contain the full value "v1,<signature>"
			validateEvent(rawBody, headers, this.webhookSecret);

			this.logger.debug('Webhook signature verified successfully using @polar-sh/sdk validateEvent', {
				bodyLength: rawBody.length,
				hasTimestamp: !!timestamp,
				signatureFormat: signature.startsWith('v1,') ? 'v1,<signature>' : 'raw'
			});

			// Step 2: Replay protection - Timestamp validation
			// Reject webhooks outside the acceptable time window (±300 seconds by default)
			this.validateWebhookTimestamp(timestamp, rawBody.length, webhookId);

			// Step 3: Replay protection - Idempotency check via webhook-id
			// Ensure we haven't processed this webhook-id before
			this.checkWebhookIdempotency(webhookId, rawBody.length, timestamp);
		} catch (error) {
			// Re-throw errors from replay protection checks as-is
			if (
				error instanceof Error &&
				(error.message.includes('timestamp') || error.message.includes('webhook-id'))
			) {
				throw error;
			}

			this.logger.error('Webhook signature verification failed', {
				error: error instanceof Error ? error.message : String(error),
				bodyLength: rawBody.length,
				hasTimestamp: !!timestamp,
				hasWebhookId: !!webhookId,
				signatureFormat: signature.startsWith('v1,') ? 'v1,<signature>' : 'raw'
			});
			throw new Error(
				`Invalid webhook signature: ${error instanceof Error ? error.message : 'Verification failed'}`
			);
		}
	}

	/**
	 * Validates webhook timestamp to prevent replay attacks
	 * Rejects webhooks outside the acceptable time window
	 *
	 * @param timestamp - Webhook timestamp from header (Unix timestamp as string)
	 * @param bodyLength - Length of the request body (for logging)
	 * @param webhookId - Webhook ID (for logging)
	 * @throws Error if timestamp is missing, invalid, or outside acceptable window
	 */
	private validateWebhookTimestamp(
		timestamp: string | undefined,
		bodyLength: number,
		webhookId: string | undefined
	): void {
		// Timestamp is required for replay protection
		if (!timestamp || typeof timestamp !== 'string' || timestamp.trim().length === 0) {
			this.logger.error('Webhook timestamp missing or invalid', {
				bodyLength,
				webhookId: webhookId || 'unknown',
				hasTimestamp: !!timestamp
			});
			throw new Error('Webhook timestamp is required for replay protection');
		}

		// Parse timestamp (Polar sends Unix timestamp as string)
		const webhookTimestamp = parseInt(timestamp, 10);
		if (isNaN(webhookTimestamp) || webhookTimestamp <= 0) {
			this.logger.error('Webhook timestamp is not a valid number', {
				bodyLength,
				webhookId: webhookId || 'unknown',
				timestamp
			});
			throw new Error(`Invalid webhook timestamp format: ${timestamp}`);
		}

		// Calculate time difference in seconds
		const currentTimestamp = Math.floor(Date.now() / 1000);
		const timeDifference = Math.abs(currentTimestamp - webhookTimestamp);

		// Reject if timestamp is outside acceptable window
		if (timeDifference > this.REPLAY_PROTECTION_WINDOW_SECONDS) {
			this.logger.error('Webhook timestamp outside acceptable window', {
				bodyLength,
				webhookId: webhookId || 'unknown',
				webhookTimestamp,
				currentTimestamp,
				timeDifferenceSeconds: timeDifference,
				windowSeconds: this.REPLAY_PROTECTION_WINDOW_SECONDS,
				isTooOld: webhookTimestamp < currentTimestamp
			});
			throw new Error(
				`Webhook timestamp outside acceptable window: ${timeDifference} seconds difference (max: ${this.REPLAY_PROTECTION_WINDOW_SECONDS} seconds)`
			);
		}

		this.logger.debug('Webhook timestamp validation passed', {
			bodyLength,
			webhookId: webhookId || 'unknown',
			timeDifferenceSeconds: timeDifference
		});
	}

	/**
	 * Checks webhook idempotency to prevent duplicate processing
	 * Uses in-memory cache with TTL to track processed webhook IDs
	 *
	 * @param webhookId - Webhook ID from header
	 * @param bodyLength - Length of the request body (for logging)
	 * @param timestamp - Webhook timestamp (for logging)
	 * @throws Error if webhook-id is missing or has already been processed
	 */
	private checkWebhookIdempotency(
		webhookId: string | undefined,
		bodyLength: number,
		timestamp: string | undefined
	): void {
		// Webhook ID is required for idempotency checks
		if (!webhookId || typeof webhookId !== 'string' || webhookId.trim().length === 0) {
			this.logger.error('Webhook ID missing or invalid', {
				bodyLength,
				timestamp: timestamp || 'unknown',
				hasWebhookId: !!webhookId
			});
			throw new Error('Webhook ID is required for idempotency protection');
		}

		// Clean up expired cache entries periodically (every 100 checks, approximately)
		if (Math.random() < 0.01) {
			this.cleanupExpiredWebhookIds();
		}

		// Check if webhook ID was already processed
		const existingEntry = this.webhookIdCache.get(webhookId);
		const now = Date.now();

		if (existingEntry) {
			// Check if entry is still valid (not expired)
			if (existingEntry.expiresAt > now) {
				this.logger.error('Webhook ID already processed (duplicate/replay detected)', {
					bodyLength,
					webhookId,
					timestamp: timestamp || 'unknown',
					previouslyProcessedAt: new Date(existingEntry.processedAt).toISOString(),
					timeSinceFirstProcessing: Math.floor((now - existingEntry.processedAt) / 1000) + ' seconds'
				});
				throw new Error(`Webhook ID already processed: ${webhookId} (replay attack detected)`);
			} else {
				// Entry expired, remove it
				this.webhookIdCache.delete(webhookId);
			}
		}

		// Record this webhook ID with TTL
		const cacheEntry: WebhookIdCacheEntry = {
			webhookId,
			processedAt: now,
			expiresAt: now + this.WEBHOOK_ID_CACHE_TTL_MS
		};

		this.webhookIdCache.set(webhookId, cacheEntry);

		this.logger.debug('Webhook ID recorded for idempotency', {
			bodyLength,
			webhookId,
			timestamp: timestamp || 'unknown',
			expiresAt: new Date(cacheEntry.expiresAt).toISOString()
		});
	}

	/**
	 * Cleans up expired webhook ID cache entries
	 * Removes entries that have exceeded their TTL
	 */
	private cleanupExpiredWebhookIds(): void {
		const now = Date.now();
		let cleanedCount = 0;

		for (const [webhookId, entry] of this.webhookIdCache.entries()) {
			if (entry.expiresAt <= now) {
				this.webhookIdCache.delete(webhookId);
				cleanedCount++;
			}
		}

		if (cleanedCount > 0) {
			this.logger.debug('Cleaned up expired webhook ID cache entries', {
				cleanedCount,
				remainingEntries: this.webhookIdCache.size
			});
		}
	}

	/**
	 * Maps Polar webhook event types to internal event format
	 *
	 * @param event - Polar webhook event payload
	 * @returns Normalized event type and data
	 */
	private mapWebhookEventType(event: any): { eventType: string; eventData: any } {
		const eventTypeMap: Record<string, string> = {
			'checkout.succeeded': 'payment_succeeded',
			'checkout.failed': 'payment_failed',
			'subscription.created': 'subscription_created',
			'subscription.updated': 'subscription_updated',
			'subscription.canceled': 'subscription_cancelled',
			'subscription.trial_will_end': 'subscription_trial_ending',
			'subscription.payment_succeeded': 'subscription_payment_succeeded',
			'subscription.payment_failed': 'subscription_payment_failed',
			'invoice.paid': 'subscription_payment_succeeded',
			'invoice.payment_failed': 'subscription_payment_failed',
			'customer.state_changed': 'customer_state_changed',
			'customer.created': 'customer_created'
		};

		const eventType = eventTypeMap[event.type] || event.type;
		const eventData = event.data || {};

		return { eventType, eventData };
	}

	async refundPayment(paymentId: string, amount?: number): Promise<any> {
		try {
			// Note: Adjust API call based on actual Polar SDK documentation
			const refund = await (this.polar.payments as any).refund({
				id: paymentId,
				amount: amount ? Math.round(amount * 100) : undefined // Convert to cents
			} as any);

			return {
				id: (refund as any).id || '',
				amount: ((refund as any).amount || 0) / 100, // Convert from cents
				status: (refund as any).status || 'succeeded'
			};
		} catch (error) {
			this.logger.error('Failed to refund Polar payment', {
				error: this.formatErrorMessage(error),
				paymentId
			});
			throw new Error(`Failed to refund payment: ${this.formatErrorMessage(error)}`);
		}
	}

	/**
	 * Create a customer portal session for managing subscriptions and billing.
	 *
	 * This method creates a pre-authenticated session that allows customers to access
	 * their Polar portal to manage subscriptions, payment methods, and billing history.
	 *
	 * @param customerId - Polar customer ID (required)
	 * @param returnUrl - Optional absolute URL to redirect after portal session ends
	 * @returns Promise resolving to session object with `id` and `url` properties
	 * @throws {Error} If customer ID is invalid, API key is missing, or session creation fails
	 *
	 * @example
	 * ```typescript
	 * const session = await provider.createCustomerPortalSession(
	 *   'cus_123',
	 *   'https://example.com/settings/billing'
	 * );
	 * // Redirect user to session.url
	 * ```
	 */
	async createCustomerPortalSession(customerId: string, returnUrl?: string): Promise<{ url: string; id: string }> {
		this.validateCustomerPortalSessionInputs(customerId);

		const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);
		const apiUrl = this.getPolarApiUrl();

		// Primary approach: REST API (more reliable, better error handling)
		const restApiResult = await this.createPortalSessionViaRestApi(customerId, normalizedReturnUrl, apiUrl);
		if (restApiResult) {
			return restApiResult;
		}

		// Fallback approach: SDK (if REST API fails)
		const sdkResult = await this.createPortalSessionViaSdk(customerId, normalizedReturnUrl);
		if (sdkResult) {
			return sdkResult;
		}

		// Both approaches failed
		throw new Error(
			'Failed to create customer portal session: All methods exhausted. ' +
				'Please verify your Polar API configuration and customer ID.'
		);
	}

	/**
	 * Validates inputs for customer portal session creation
	 */
	private validateCustomerPortalSessionInputs(customerId: string): void {
		if (!customerId || typeof customerId !== 'string' || customerId.trim().length === 0) {
			throw new Error('Customer ID is required and must be a non-empty string');
		}

		if (!this.apiKey) {
			throw new Error('Polar API key is not configured. Please set POLAR_ACCESS_TOKEN environment variable.');
		}
	}

	/**
	 * Normalizes and validates the return URL
	 * Prevents open-redirect vulnerabilities by rejecting all absolute URLs
	 * and only allowing relative paths that are resolved against this.appUrl
	 * Removes encoding artifacts, ensures absolute URL format
	 * Uses safe string methods to avoid ReDoS vulnerabilities
	 */
	private normalizeReturnUrl(returnUrl?: string): string {
		// Default to relative path (will be resolved against this.appUrl)
		const defaultPath = '/settings/billing';
		let url = returnUrl ?? defaultPath;

		// Remove encoding artifacts (quotes, escaped characters)
		// Use safe string methods instead of regex to prevent ReDoS attacks
		url = url.trim();

		// Remove surrounding quotes (safe, bounded operations)
		// Only remove one layer of quotes to avoid DoS on nested quotes
		if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
			url = url.slice(1, -1).trim();
		}

		// Remove escaped quotes using simple string operations
		// Split and join is safer than regex for escaping
		url = url.split('\\"').join('').split("\\'").join('');

		// Security: Reject all absolute URLs to prevent open-redirect attacks
		// If an absolute URL is provided, immediately fall back to default path
		if (url.startsWith('http://') || url.startsWith('https://')) {
			// Absolute URL detected - reject and use default path
			// This prevents open-redirect attacks even if the URL appears to be from the same origin
			this.logger.warn('Absolute return URL rejected, using default path', {
				rejectedUrl: url,
				fallbackPath: defaultPath
			});
			url = defaultPath;
		}

		// Validate appUrl is configured before constructing absolute URL
		if (!this.appUrl) {
			throw new Error('App URL is not configured. Cannot construct return URL.');
		}

		// Build absolute URL from relative path
		// Handle leading slash properly and ensure appUrl doesn't have trailing slash
		const relativePath = url.startsWith('/') ? url : `/${url}`;
		// Ensure appUrl doesn't have trailing slash to avoid double slashes
		const cleanAppUrl = this.appUrl.replace(/\/+$/, '');
		const absoluteUrl = `${cleanAppUrl}${relativePath}`;

		// Validate the constructed URL format and origin
		try {
			const validatedUrl = new URL(absoluteUrl);
			const appUrlObj = new URL(this.appUrl);

			// Double-check that the origin matches (defense in depth)
			if (validatedUrl.origin !== appUrlObj.origin) {
				throw new Error('URL origin mismatch');
			}

			return absoluteUrl;
		} catch (error) {
			// Preserve specific error messages
			if (error instanceof Error && error.message === 'URL origin mismatch') {
				throw error;
			}
			// Generic error for invalid URL format
			throw new Error(
				`Invalid return URL format: ${absoluteUrl}. Must be a valid absolute URL from the same origin.`
			);
		}
	}

	/**
	 * Gets the Polar API base URL from environment or defaults
	 * Uses sandbox URL if in sandbox mode, otherwise production
	 */
	private getPolarApiUrl(): string {
		if (this.configuredApiUrl) {
			return this.configuredApiUrl;
		}
		// Use sandbox URL if sandbox mode is enabled
		return this.isSandbox ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';
	}

	/**
	 * Creates portal session using Polar REST API directly
	 * This is the preferred method as it avoids SDK serialization issues
	 */
	private async createPortalSessionViaRestApi(
		customerId: string,
		returnUrl: string,
		apiUrl: string
	): Promise<{ url: string; id: string } | null> {
		try {
			const requestBody = this.buildRestApiRequestBody(customerId, returnUrl);

			this.logger.info('Creating Polar customer portal session via REST API', {
				endpoint: `${apiUrl}/v1/customer-sessions`,
				customerId,
				hasReturnUrl: !!requestBody.return_url
			});

			const response = await fetch(`${apiUrl}/v1/customer-sessions`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				// handleRestApiError throws for fatal errors (401, 403, 404, 400, 429)
				// and returns true for recoverable errors (allowing fallback)
				const _shouldFallback = await this.handleRestApiError(response, customerId);
				// If we reach here, it's a recoverable error - allow fallback
				return null;
			}

			const session = await response.json();
			const portalSession = this.extractPortalSessionFromResponse(session);

			if (portalSession) {
				this.logger.info('Polar customer portal session created successfully via REST API', {
					sessionId: portalSession.id,
					customerId
				});
				return portalSession;
			}

			this.logger.warn('REST API response missing portal URL', {
				responseKeys: Object.keys(session),
				customerId
			});
			return null;
		} catch (error) {
			// Check if this is a fatal error (PolarFatalError)
			// Fatal errors should be propagated immediately, not caught
			if (error instanceof PolarFatalError) {
				// This is a fatal error - propagate it to the caller
				throw error;
			}

			// Otherwise, it's a recoverable error (network, etc.) - allow fallback
			const errorMsg = this.formatErrorMessage(error);
			this.logger.warn('REST API portal session creation failed, attempting SDK fallback', {
				error: errorMsg,
				customerId
			});
			return null;
		}
	}

	/**
	 * Builds request body for REST API call
	 */
	private buildRestApiRequestBody(
		customerId: string,
		returnUrl: string
	): { customer_id: string; return_url?: string } {
		const body: { customer_id: string; return_url?: string } = {
			customer_id: customerId
		};

		// Only include return_url if it's a valid absolute URL
		if (returnUrl && (returnUrl.startsWith('http://') || returnUrl.startsWith('https://'))) {
			body.return_url = returnUrl;
		}

		return body;
	}

	/**
	 * Handles REST API error responses with appropriate error messages
	 * @returns false if error is fatal (should throw), true if recoverable (allow fallback)
	 * @throws Error for fatal errors (401, 403, 404, 400, 429, 5xx)
	 */
	private async handleRestApiError(response: Response, customerId: string): Promise<boolean> {
		const errorText = await response.text().catch(() => 'Unable to read error response');

		this.logger.error('Polar REST API customer-sessions request failed', {
			status: response.status,
			statusText: response.statusText,
			error: errorText,
			customerId
		});

		// Map HTTP status codes to specific error messages
		// Fatal errors (client errors and rate limits) should be thrown immediately
		switch (response.status) {
			case 404:
				throw new PolarFatalError(
					`Customer not found: ${customerId}. Please verify the customer exists in Polar.`
				);
			case 401:
			case 403:
				throw new PolarFatalError(
					'Polar API authentication failed. Please verify your POLAR_ACCESS_TOKEN is correct and has the required permissions.'
				);
			case 400:
				throw new PolarFatalError(
					`Invalid request to Polar API: ${errorText}. Please check your customer ID and return URL format.`
				);
			case 429:
				throw new PolarFatalError('Polar API rate limit exceeded. Please try again later.');
			case 500:
			case 502:
			case 503:
				// Server errors are recoverable - allow fallback to SDK
				this.logger.warn('Polar API server error, will attempt SDK fallback', {
					status: response.status,
					customerId
				});
				return true; // Allow fallback
			default:
				// Unknown errors - allow fallback to SDK
				this.logger.warn('Polar API unknown error, will attempt SDK fallback', {
					status: response.status,
					customerId
				});
				return true; // Allow fallback
		}
	}

	/**
	 * Extracts portal session data from API response
	 * Handles various response formats from Polar API
	 */
	private extractPortalSessionFromResponse(session: any): { url: string; id: string } | null {
		// Try multiple possible field names for portal URL
		const portalUrlFields = [
			'customer_portal_url', // Primary field (snake_case)
			'customerPortalUrl', // camelCase variant
			'portal_url',
			'portalUrl',
			'url'
		];

		const sessionUrl = portalUrlFields
			.map((field) => session[field])
			.find((url) => url && typeof url === 'string' && url.length > 0);

		if (!sessionUrl) {
			return null;
		}

		const sessionId = session.id || session.session_id || `cs_${Date.now()}`;

		return {
			id: sessionId,
			url: sessionUrl
		};
	}

	/**
	 * Creates portal session using Polar SDK (fallback method)
	 */
	private async createPortalSessionViaSdk(
		customerId: string,
		returnUrl: string
	): Promise<{ url: string; id: string } | null> {
		if (!this.isSdkCustomerSessionsAvailable()) {
			this.logger.debug('Polar SDK customerSessions not available, skipping SDK approach');
			return null;
		}

		try {
			const sessionParams = this.buildSdkSessionParams(customerId, returnUrl);

			this.logger.info('Creating Polar customer portal session via SDK (fallback)', {
				customerId,
				hasReturnUrl: !!sessionParams.returnUrl
			});

			const session = await (this.polar.customerSessions as any).create(sessionParams);
			const portalSession = this.extractPortalSessionFromResponse(session);

			if (portalSession) {
				this.logger.info('Polar customer portal session created successfully via SDK', {
					sessionId: portalSession.id,
					customerId
				});
				return portalSession;
			}

			this.logger.warn('SDK response missing portal URL', {
				responseKeys: Object.keys(session || {}),
				customerId
			});
			return null;
		} catch (error) {
			const errorMsg = this.formatErrorMessage(error);
			this.logger.error('Polar SDK customerSessions.create failed', {
				error: errorMsg,
				customerId,
				errorType: error instanceof Error ? error.constructor.name : typeof error,
				...(error instanceof Error && {
					stack: error.stack,
					message: error.message
				})
			});
			return null;
		}
	}

	/**
	 * Checks if SDK customerSessions API is available
	 */
	private isSdkCustomerSessionsAvailable(): boolean {
		return !!(this.polar.customerSessions && typeof (this.polar.customerSessions as any).create === 'function');
	}

	/**
	 * Builds parameters for SDK customerSessions.create call
	 */
	private buildSdkSessionParams(customerId: string, returnUrl: string): { customerId: string; returnUrl?: string } {
		const params: { customerId: string; returnUrl?: string } = {
			customerId
		};

		// Only include returnUrl if it's a valid absolute URL
		if (returnUrl && (returnUrl.startsWith('http://') || returnUrl.startsWith('https://'))) {
			params.returnUrl = returnUrl;
		}

		return params;
	}

	getClientConfig(): ClientConfig {
		return {
			publicKey: this.organizationId || '',
			paymentGateway: 'polar',
			options: {
				organizationId: this.organizationId,
				appUrl: this.appUrl
			}
		};
	}

	getUIComponents(): UIComponents {
		return {
			PaymentForm: this.getPaymentFormComponent(),
			logo: '/assets/payment/polar/logo.svg',
			cardBrands: polarCardBrands,
			supportedPaymentMethods: ['card'],
			translations: polarTranslations
		};
	}

	private mapSubscriptionStatus(status: string): SubscriptionStatus {
		const statusMap: Record<string, SubscriptionStatus> = {
			active: SubscriptionStatus.ACTIVE,
			trialing: SubscriptionStatus.TRIALING,
			past_due: SubscriptionStatus.PAST_DUE,
			canceled: SubscriptionStatus.CANCELED,
			unpaid: SubscriptionStatus.UNPAID,
			incomplete: SubscriptionStatus.INCOMPLETE,
			incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED
		};

		return statusMap[status.toLowerCase()] || SubscriptionStatus.INCOMPLETE;
	}

	private getPaymentFormComponent(): React.ComponentType<PaymentFormProps> {
		// Return a simple payment form component
		// In a real implementation, this would use Polar's checkout embed
		const PolarPaymentForm = ({ onSuccess, onError: _onError, amount: _amount, currency: _currency }: PaymentFormProps) => {
			return React.createElement(
				'div',
				{ className: 'polar-payment-form' },
				React.createElement('p', null, 'Polar payment form - redirect to checkout'),
				React.createElement(
					'button',
					{
						onClick: () => {
							// In real implementation, redirect to Polar checkout
							onSuccess('polar_checkout_' + Date.now());
						}
					},
					'Proceed to Payment'
				)
			);
		};
		return PolarPaymentForm;
	}
}
