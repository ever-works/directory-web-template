import { User } from '@supabase/auth-js';
import React from 'react';
import crypto from 'crypto';
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
	UIComponents,
	CardBrandIcon,
	PaymentFormProps,
	SetupIntent,
	SubscriptionStatus
} from '../../types/payment-types';
import { paymentAccountClient } from '../client/payment-account-client';
import { PRICES } from '../utils/prices';
import SolidgateElementsWrapper from '../../ui/solidgate/solidgate-elements';

// Placeholder data for Solidgate UI components
const solidgateCardBrands: CardBrandIcon[] = [
	{
		name: 'visa',
		lightIcon: '/assets/payment/solidgate/visa-light.svg',
		darkIcon: '/assets/payment/solidgate/visa-dark.svg',
		width: 40,
		height: 25
	},
	{
		name: 'mastercard',
		lightIcon: '/assets/payment/solidgate/mastercard-light.svg',
		darkIcon: '/assets/payment/solidgate/mastercard-dark.svg',
		width: 40,
		height: 25
	},
	{
		name: 'amex',
		lightIcon: '/assets/payment/solidgate/amex-light.svg',
		darkIcon: '/assets/payment/solidgate/amex-dark.svg',
		width: 40,
		height: 25
	},
	{
		name: 'discover',
		lightIcon: '/assets/payment/solidgate/discover-light.svg',
		darkIcon: '/assets/payment/solidgate/discover-dark.svg',
		width: 40,
		height: 25
	}
];

// Mock translations for Solidgate
const solidgateTranslations = {
	en: {
		cardNumber: 'Card number',
		cardExpiry: 'Expiry date',
		cardCvc: 'CVV',
		submit: 'Pay securely',
		processingPayment: 'Processing your payment...',
		paymentSuccessful: 'Payment completed successfully',
		paymentFailed: 'Your payment could not be processed'
	},
	fr: {
		cardNumber: 'Numéro de carte',
		cardExpiry: "Date d'expiration",
		cardCvc: 'CVV',
		submit: 'Payer en toute sécurité',
		processingPayment: 'Traitement de votre paiement...',
		paymentSuccessful: 'Paiement effectué avec succès',
		paymentFailed: "Votre paiement n'a pas pu être traité"
	}
};

// Solidgate API types
interface SolidgatePaymentRequest {
	amount: number;
	currency: string;
	order_id: string;
	order_description?: string;
	customer_email?: string;
	customer_id?: string;
	redirect_url?: string;
	callback_url?: string;
	metadata?: Record<string, any>;
}

interface SolidgatePaymentResponse {
	status: string;
	data: {
		payment_id: string;
		payment_url: string;
		order_id: string;
	};
}

interface SolidgatePaymentStatus {
	status: string;
	payment_id: string;
	order_id: string;
	amount: number;
	currency: string;
	transaction_status: string;
}

interface SolidgateCustomer {
	id: string;
	email: string;
	name?: string;
}

const appUrl =
	process.env.NEXT_PUBLIC_APP_URL ??
	(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://demo.ever.works');

const SOLIDGATE_API_BASE_URL = process.env.SOLIDGATE_API_BASE_URL || 'https://api.solidgate.com/v1';

export class SolidgateProvider implements PaymentProviderInterface {
	private apiKey: string;
	private secretKey: string;
	private webhookSecret: string;
	private publishableKey: string;
	private apiBaseUrl: string;
	private merchantId: string;

	constructor(config: PaymentProviderConfig) {
		this.apiKey = config.apiKey;
		this.secretKey = config.secretKey || config.apiKey; // Use apiKey as secretKey if not provided
		this.webhookSecret = config.webhookSecret || '';
		this.publishableKey = config.options?.publishableKey || config.apiKey;
		this.apiBaseUrl = config.options?.apiBaseUrl || SOLIDGATE_API_BASE_URL;
		this.merchantId = config.options?.merchantId || '';

		if (!this.apiKey) {
			throw new Error('Solidgate API key is required');
		}
	}

	private get logger() {
		return {
			info: (message: string, context?: Record<string, any>) =>
				console.log(`[SolidgateProvider] ${message}`, context || ''),
			warn: (message: string, context?: Record<string, any>) =>
				console.warn(`[SolidgateProvider] ${message}`, context || ''),
			error: (message: string, context?: Record<string, any>) =>
				console.error(`[SolidgateProvider] ${message}`, context || ''),
			debug: (message: string, context?: Record<string, any>) =>
				console.log(`[SolidgateProvider] ${message}`, context || '')
		};
	}

	private async makeApiRequest<T>(
		endpoint: string,
		method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
		body?: any
	): Promise<T> {
		const url = `${this.apiBaseUrl}${endpoint}`;
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${this.apiKey}`
		};

		try {
			const response = await fetch(url, {
				method,
				headers,
				body: body ? JSON.stringify(body) : undefined
			});

			if (!response.ok) {
				const errorText = await response.text();
				this.logger.error('Solidgate API error', {
					status: response.status,
					statusText: response.statusText,
					error: errorText
				});
				throw new Error(`Solidgate API error: ${response.status} ${response.statusText} - ${errorText}`);
			}

			return await response.json();
		} catch (error) {
			this.logger.error('Solidgate API request failed', { error, endpoint, method });
			throw error;
		}
	}

	private generateSignature(data: string, secret: string): string {
		return crypto.createHmac('sha256', secret).update(data).digest('hex');
	}

	/**
	 * Generate signature for Solidgate payment intent
	 * Required for the React SDK
	 */
	private generatePaymentIntentSignature(paymentIntent: string, merchantId: string): string {
		const data = `${merchantId}${paymentIntent}`;
		return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');
	}

	/**
	 * Get merchant ID from configuration or extract from API key
	 */
	private getMerchantId(): string {
		// Use merchant ID from configuration if provided
		if (this.merchantId) {
			return this.merchantId;
		}
		// Try to extract from API key format or use first part
		return this.apiKey.split('_')[0] || this.apiKey.substring(0, 20) || 'default_merchant';
	}

	hasCustomerId(user: User | null): boolean {
		return !!user?.user_metadata?.solidgate_customer_id;
	}

	private isValidUser(user: User | null): user is User {
		return user !== null && typeof user.id === 'string' && user.id.length > 0;
	}

	private extractCustomerIdFromMetadata(user: User): string | null {
		if (!this.hasCustomerId(user)) {
			return null;
		}

		const customerId = user.user_metadata?.solidgate_customer_id;
		return typeof customerId === 'string' && customerId.length > 0 ? customerId : null;
	}

	async getCustomerId(user: User | null): Promise<string | null> {
		const userId = user?.id;
		if (!this.isValidUser(user)) {
			this.logger.warn('getCustomerId: Invalid or disconnected user', { userId: userId || 'undefined' });
			return null;
		}
		const validatedUserId = user.id;
		this.logger.info('Starting Solidgate customer retrieval/creation', { userId: validatedUserId });

		try {
			const customerIdFromMetadata = this.extractCustomerIdFromMetadata(user);
			if (customerIdFromMetadata) {
				this.logger.info('Solidgate customer retrieved from metadata', {
					userId: validatedUserId,
					customerId: customerIdFromMetadata
				});
				return customerIdFromMetadata;
			}
			const customerIdFromDatabase = await this.retrieveCustomerIdFromDatabase(validatedUserId);
			if (customerIdFromDatabase) {
				this.logger.info('Solidgate customer retrieved from database', {
					userId: validatedUserId,
					customerId: customerIdFromDatabase
				});
				return customerIdFromDatabase;
			}
			this.logger.info('Creating new Solidgate customer', { userId: validatedUserId });
			const newCustomer = await this.createNewSolidgateCustomer(user);
			await this.synchronizePaymentAccount(validatedUserId, newCustomer.id);

			this.logger.info('New Solidgate customer created successfully', {
				userId: validatedUserId,
				customerId: newCustomer.id
			});
			return newCustomer.id;
		} catch (error) {
			const errorMessage = this.formatErrorMessage(error);
			this.logger.error('Failed to retrieve/create Solidgate customer', {
				userId: validatedUserId,
				error: errorMessage
			});
			throw new Error(`Unable to retrieve/create Solidgate customer: ${errorMessage}`);
		}
	}

	private async retrieveCustomerIdFromDatabase(userId: string): Promise<string | null> {
		try {
			const existingPaymentAccount = await paymentAccountClient.getPaymentAccount(userId, 'solidgate');

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

	private async createNewSolidgateCustomer(user: User): Promise<CustomerResult> {
		const customerData = this.buildCustomerData(user);
		try {
			const customer = await this.createCustomer(customerData);
			this.logger.debug('Solidgate customer created successfully', {
				userId: user.id,
				customerId: customer.id,
				email: customer.email
			});
			return customer;
		} catch (error) {
			this.logger.error('Failed to create Solidgate customer', {
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
				provider: 'solidgate',
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
					const existingAccount = await paymentAccountClient.getPaymentAccount(userId, 'solidgate');
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

	async createSetupIntent(user: User | null): Promise<SetupIntent> {
		// Solidgate doesn't have a setup intent concept like Stripe
		// Return a mock setup intent for compatibility
		return {
			id: `seti_${crypto.randomUUID()}`,
			client_secret: `seti_${crypto.randomUUID()}_secret`,
			status: 'requires_payment_method',
			payment_method_types: ['card']
		} as SetupIntent;
	}

	async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
		try {
			const { amount, currency, metadata, customerId, successUrl, cancelUrl } = params;

			const orderId = `order_${crypto.randomUUID()}`;
			const paymentIntentId = `pi_${crypto.randomUUID()}`;
			const paymentAmount = Math.round(
				metadata?.planId === '1'
					? (PRICES.us?.free?.amount || amount) * 100
					: metadata?.planId === '2'
						? (PRICES.us?.oneTime?.amount || amount) * 100
						: (PRICES.us?.subscription?.amount || amount) * 100
			);

			const paymentRequest: SolidgatePaymentRequest = {
				amount: paymentAmount,
				currency: (PRICES.us?.currency || currency).toUpperCase(),
				order_id: orderId,
				order_description: metadata?.planName || 'Payment',
				customer_email: metadata?.email || customerId,
				redirect_url: successUrl || `${appUrl}/payment/success`,
				callback_url: `${appUrl}/api/solidgate/webhook`,
				metadata: {
					...metadata,
					customerId,
					paymentIntentId
				}
			};

			// Create payment via API
			const response = await this.makeApiRequest<SolidgatePaymentResponse>('/payments', 'POST', paymentRequest);

			// Return payment intent with ID that can be used with React SDK
			// The clientSecret contains the payment URL for redirect flow
			// The payment intent ID is used for the SDK embedded form
			return {
				id: response.data.payment_id,
				amount: paymentAmount / 100,
				currency: paymentRequest.currency.toLowerCase(),
				status: 'requires_payment_method',
				clientSecret: paymentIntentId // Store payment intent ID for SDK use
			};
		} catch (error) {
			this.logger.error('Solidgate createPaymentIntent error:', { error: this.formatErrorMessage(error) });
			throw error;
		}
	}

	async confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent> {
		// Solidgate handles payment confirmation through redirect flow
		// This method is mainly for compatibility
		try {
			const paymentStatus = await this.verifyPayment(paymentId);
			return {
				id: paymentId,
				amount: paymentStatus.details?.amount || 0,
				currency: paymentStatus.details?.currency || 'usd',
				status: paymentStatus.status
			};
		} catch (error) {
			this.logger.error('Solidgate confirmPayment error:', { error: this.formatErrorMessage(error) });
			throw error;
		}
	}

	async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
		try {
			const response = await this.makeApiRequest<SolidgatePaymentStatus>(`/payments/${paymentId}`, 'GET');

			const isSuccess = response.transaction_status === 'success' || response.transaction_status === 'completed';

			return {
				isValid: isSuccess,
				paymentId: response.payment_id,
				status: response.transaction_status,
				details: {
					amount: response.amount / 100,
					currency: response.currency.toLowerCase(),
					orderId: response.order_id
				}
			};
		} catch (error) {
			this.logger.error('Solidgate verifyPayment error:', { error: this.formatErrorMessage(error) });
			throw error;
		}
	}

	async createCustomer(params: CreateCustomerParams): Promise<CustomerResult> {
		try {
			const { email, name, metadata } = params;

			// Solidgate customer creation endpoint
			const customerData = {
				email,
				name,
				metadata
			};

			const response = await this.makeApiRequest<{ data: SolidgateCustomer }>('/customers', 'POST', customerData);

			return {
				id: response.data.id,
				email: response.data.email || email,
				name: response.data.name || name,
				metadata
			};
		} catch (error) {
			this.logger.error('Solidgate createCustomer error:', { error: this.formatErrorMessage(error) });
			throw error;
		}
	}

	async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
		try {
			const { customerId, priceId, metadata } = params;

			// Solidgate subscription creation
			const subscriptionData = {
				customer_id: customerId,
				plan_id: priceId,
				metadata
			};

			const response = await this.makeApiRequest<{
				data: {
					id: string;
					customer_id: string;
					status: string;
					current_period_end?: number;
					plan_id: string;
				};
			}>('/subscriptions', 'POST', subscriptionData);

			return {
				id: response.data.id,
				customerId: response.data.customer_id,
				status: this.mapSubscriptionStatus(response.data.status),
				currentPeriodEnd: response.data.current_period_end,
				cancelAtPeriodEnd: false,
				cancelAt: null,
				trialEnd: null,
				priceId: response.data.plan_id
			};
		} catch (error) {
			this.logger.error('Solidgate createSubscription error:', { error: this.formatErrorMessage(error) });
			throw error;
		}
	}

	async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<SubscriptionInfo> {
		try {
			const endpoint = cancelAtPeriodEnd
				? `/subscriptions/${subscriptionId}/cancel`
				: `/subscriptions/${subscriptionId}/cancel-immediate`;

			const response = await this.makeApiRequest<{
				data: {
					id: string;
					customer_id: string;
					status: string;
					current_period_end?: number;
					plan_id: string;
				};
			}>(endpoint, 'POST');

			return {
				id: response.data.id,
				customerId: response.data.customer_id,
				status: this.mapSubscriptionStatus(response.data.status),
				currentPeriodEnd: response.data.current_period_end,
				cancelAtPeriodEnd,
				cancelAt: cancelAtPeriodEnd ? response.data.current_period_end || null : Date.now() / 1000,
				trialEnd: null,
				priceId: response.data.plan_id
			};
		} catch (error) {
			this.logger.error('Solidgate cancelSubscription error:', { error: this.formatErrorMessage(error) });
			throw error;
		}
	}

	async updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo> {
		try {
			const { subscriptionId, priceId, cancelAtPeriodEnd, metadata } = params;

			const updateData: any = {};
			if (priceId) updateData.plan_id = priceId;
			if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;
			if (metadata) updateData.metadata = metadata;

			const response = await this.makeApiRequest<{
				data: {
					id: string;
					customer_id: string;
					status: string;
					current_period_end?: number;
					plan_id: string;
				};
			}>(`/subscriptions/${subscriptionId}`, 'PUT', updateData);

			return {
				id: response.data.id,
				customerId: response.data.customer_id,
				status: this.mapSubscriptionStatus(response.data.status),
				currentPeriodEnd: response.data.current_period_end,
				cancelAtPeriodEnd: cancelAtPeriodEnd || false,
				cancelAt: null,
				trialEnd: null,
				priceId: response.data.plan_id
			};
		} catch (error) {
			this.logger.error('Solidgate updateSubscription error:', { error: this.formatErrorMessage(error) });
			throw error;
		}
	}

	async handleWebhook(
		payload: any,
		signature: string,
		rawBody?: string,
		timestamp?: string,
		webhookId?: string
	): Promise<WebhookResult> {
		try {
			// Verify webhook signature
			if (this.webhookSecret && rawBody) {
				const expectedSignature = this.generateSignature(rawBody, this.webhookSecret);
				if (signature !== expectedSignature) {
					throw new Error('Invalid webhook signature');
				}
			}

			const event = typeof payload === 'string' ? JSON.parse(payload) : payload;

			let eventType: string;
			let eventData: any = {};

			// Map Solidgate event types to generic types
			switch (event.type || event.event_type) {
				case 'payment.succeeded':
				case 'payment.completed':
					eventType = 'payment_succeeded';
					eventData = event.data || event;
					break;
				case 'payment.failed':
				case 'payment.declined':
					eventType = 'payment_failed';
					eventData = event.data || event;
					break;
				case 'subscription.created':
					eventType = 'subscription_created';
					eventData = event.data || event;
					break;
				case 'subscription.updated':
					eventType = 'subscription_updated';
					eventData = event.data || event;
					break;
				case 'subscription.cancelled':
				case 'subscription.canceled':
					eventType = 'subscription_cancelled';
					eventData = event.data || event;
					break;
				case 'refund.processed':
				case 'refund.completed':
					eventType = 'refund_succeeded';
					eventData = event.data || event;
					break;
				default:
					eventType = event.type || event.event_type || 'unknown';
					eventData = event.data || event;
			}

			return {
				received: true,
				type: eventType,
				id: event.id || event.payment_id || webhookId || crypto.randomUUID(),
				data: eventData
			};
		} catch (error) {
			this.logger.error('Solidgate webhook handling error:', { error: this.formatErrorMessage(error) });
			throw error;
		}
	}

	async refundPayment(paymentId: string, amount?: number): Promise<any> {
		try {
			const refundData: any = {
				payment_id: paymentId
			};

			if (amount) {
				refundData.amount = Math.round(amount * 100);
			}

			const response = await this.makeApiRequest<{
				data: {
					id: string;
					amount: number;
					status: string;
				};
			}>('/refunds', 'POST', refundData);

			return {
				id: response.data.id,
				amount: response.data.amount / 100,
				status: response.data.status
			};
		} catch (error) {
			this.logger.error('Solidgate refundPayment error:', { error: this.formatErrorMessage(error) });
			throw error;
		}
	}

	async createCustomCheckout(): Promise<string> {
		// This method is used for creating custom checkout URLs
		// Implementation depends on Solidgate's checkout flow
		return '';
	}

	getClientConfig(): ClientConfig {
		return {
			publicKey: this.publishableKey,
			paymentGateway: 'solidgate'
		};
	}

	getUIComponents(): UIComponents {
		// Create a function that will inject the required props into the SolidgateElements component
		const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
			// Generate payment intent and signature for the SDK
			const paymentIntent = props.clientSecret || `payment_${crypto.randomUUID()}`;
			const merchantId = this.getMerchantId();
			const signature = this.generatePaymentIntentSignature(paymentIntent, merchantId);

			return React.createElement(SolidgateElementsWrapper, {
				...props,
				solidgatePublicKey: this.publishableKey,
				merchantId: merchantId,
				paymentIntent: paymentIntent,
				signature: signature
			});
		};

		return {
			// We use our wrapper function to configure the component with the required props
			PaymentForm: SolidgatePaymentFormWithConfig,
			logo: '/assets/payment/solidgate/solidgate-logo.svg',
			cardBrands: solidgateCardBrands,
			supportedPaymentMethods: ['card'],
			translations: solidgateTranslations
		};
	}

	// Utility function to map Solidgate subscription statuses to our own statuses
	private mapSubscriptionStatus(solidgateStatus: string): SubscriptionStatus {
		switch (solidgateStatus.toLowerCase()) {
			case 'active':
				return SubscriptionStatus.ACTIVE;
			case 'cancelled':
			case 'canceled':
				return SubscriptionStatus.CANCELED;
			case 'past_due':
				return SubscriptionStatus.PAST_DUE;
			case 'trialing':
			case 'trial':
				return SubscriptionStatus.TRIALING;
			case 'unpaid':
				return SubscriptionStatus.UNPAID;
			case 'incomplete':
				return SubscriptionStatus.INCOMPLETE;
			case 'incomplete_expired':
				return SubscriptionStatus.INCOMPLETE_EXPIRED;
			default:
				return SubscriptionStatus.INCOMPLETE;
		}
	}
}
