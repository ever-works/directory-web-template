import { User } from '@supabase/auth-js';
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
	UpdateSubscriptionParams,
	SubscriptionInfo,
	SetupIntent,
	UIComponents,
	CheckoutParams,
	SubscriptionStatus,
	CheckoutListResult,
	CheckoutData
} from '../../types/payment-types';
import {
	createCheckout,
	createCustomer,
	getOrder,
	cancelSubscription,
	updateSubscription,
	lemonSqueezySetup,
	listSubscriptions,
	Variant,
	listVariants,
	getPrice
} from '@lemonsqueezy/lemonsqueezy.js';

import { env } from '@/lib/config/env';
import { paymentAccountClient } from '../client/payment-account-client';

export interface LemonSqueezyConfig extends PaymentProviderConfig {
	apiKey: string;
	webhookSecret: string;
	options?: {
		storeId?: string;
		testMode?: boolean;
	};
}

// Types for better code organization
// Types for better code organization
export const statuses = ['active', 'cancelled', 'expired', 'on_trial', 'past_due', 'paused', 'unpaid'] as const;
interface ListCheckoutsOptions {
	status?: (typeof statuses)[number];
	limit?: number;
	page?: number;
	customerEmail?: string;
	dateFrom?: Date;
	dateTo?: Date;
}

interface ApiFilter {
	storeId: number;
	status?: (typeof statuses)[number];
	userEmail?: string;
	dateFrom?: Date;
	dateTo?: Date;
}

interface PaginationConfig {
	size: number;
	number: number;
}

export class LemonSqueezyProvider implements PaymentProviderInterface {
	private apiKey: string;
	private webhookSecret: string;
	private storeId?: string;
	private testMode: boolean;

	constructor(config: LemonSqueezyConfig) {
		this.apiKey = config.apiKey;
		this.webhookSecret = config.webhookSecret;
		this.storeId = config.options?.storeId;
		this.testMode = config.options?.testMode || false;
		if (!this.storeId || !Number.isFinite(Number(this.storeId))) {
			throw new Error('LemonSqueezyProvider: a valid numeric storeId is required');
		}
		lemonSqueezySetup({ apiKey: this.apiKey });
	}

	hasCustomerId(user: User | null): boolean {
		return !!user?.user_metadata?.lemonsqueezy_customer_id;
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

	async getCustomerId(user: User | null): Promise<string | null> {
		const userId = user?.id;
		if (!this.isValidUser(user)) {
			this.logger.warn('getCustomerId: Invalid or disconnected user', { userId: userId || 'undefined' });
			return null;
		}
		const validatedUserId = user?.id;
		this.logger.info('Starting LemonSqueezy customer retrieval/creation', { userId: validatedUserId });

		try {
			const customerIdFromMetadata = this.extractCustomerIdFromMetadata(user);
			if (customerIdFromMetadata) {
				this.logger.info('LemonSqueezy customer retrieved from metadata', {
					userId: validatedUserId,
					customerId: customerIdFromMetadata
				});
				return customerIdFromMetadata;
			}
			const customerIdFromDatabase = await this.retrieveCustomerIdFromDatabase(validatedUserId);
			if (customerIdFromDatabase) {
				this.logger.info('LemonSqueezy customer retrieved from database', {
					userId: validatedUserId,
					customerId: customerIdFromDatabase
				});
				return customerIdFromDatabase;
			}
			this.logger.info('Creating new LemonSqueezy customer', { userId: validatedUserId });
			const newCustomer = await this.createNewLemonSqueezyCustomer(user);
			await this.synchronizePaymentAccount(validatedUserId, newCustomer.id);

			this.logger.info('New LemonSqueezy customer created successfully', {
				userId: validatedUserId,
				customerId: newCustomer.id
			});
			return newCustomer.id;
		} catch (error) {
			const errorMessage = this.formatErrorMessage(error);
			this.logger.error('Failed to retrieve/create LemonSqueezy customer', {
				userId: validatedUserId,
				error: errorMessage
			});
			throw new Error(`Unable to retrieve/create LemonSqueezy customer: ${errorMessage}`);
		}
	}

	private async retrieveCustomerIdFromDatabase(userId: string): Promise<string | null> {
		try {
			const existingPaymentAccount = await paymentAccountClient.getPaymentAccount(userId, 'lemonsqueezy');

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

	async createCustomer(params: CreateCustomerParams): Promise<CustomerResult> {
		try {
			const { data, error } = await createCustomer(Number(this.storeId), {
				email: params.email,
				name: params.name || '',
				city: params.metadata?.city || '',
				region: params.metadata?.region || '',
				country: params.metadata?.country || ''
			});

			if (error) {
				throw new Error(`LemonSqueezy error: ${error.message}`);
			}
			return {
				id: data?.data?.id,
				email: data?.data?.attributes?.email,
				name: data?.data?.attributes?.name,
				metadata: {
					city: data?.data?.attributes?.city,
					region: data?.data?.attributes?.region,
					country: data?.data?.attributes?.country
				}
			};
		} catch (error) {
			console.error('Error creating LemonSqueezy customer:', error);
			throw new Error('Failed to create customer');
		}
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
				console.log(`[LemonSqueezyProvider] ${message}`, context || ''),
			warn: (message: string, context?: Record<string, any>) =>
				console.warn(`[LemonSqueezyProvider] ${message}`, context || ''),
			error: (message: string, context?: Record<string, any>) =>
				console.error(`[LemonSqueezyProvider] ${message}`, context || ''),
			debug: (message: string, context?: Record<string, any>) =>
				console.log(`[LemonSqueezyProvider] ${message}`, context || '')
		};
	}

	private async createNewLemonSqueezyCustomer(user: User): Promise<CustomerResult> {
		const customerData = this.buildCustomerData(user);
		try {
			const customer = await this.createCustomer(customerData);
			this.logger.debug('LemonSqueezy customer created successfully', {
				userId: user.id,
				customerId: customer.id,
				email: customer.email
			});
			return customer;
		} catch (error) {
			this.logger.error('Failed to create LemonSqueezy customer', {
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
				provider: 'lemonsqueezy',
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
					const existingAccount = await paymentAccountClient.getPaymentAccount(userId, 'lemonsqueezy');
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

	async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
		try {
			return {
				id: '',
				amount: params.amount,
				currency: params.currency,
				status: 'requires_payment_method',
				clientSecret: '',
				customerId: params.customerId
			};
		} catch (error) {
			console.error('Error creating LemonSqueezy checkout:', error);
			throw new Error('Failed to create payment intent');
		}
	}

	async confirmPayment(paymentId: string): Promise<PaymentIntent> {
		// LemonSqueezy doesn't have a separate confirm step, return the payment intent
		return this.verifyPayment(paymentId).then((result) => {
			if (result.isValid) {
				return {
					id: paymentId,
					amount: 0,
					currency: 'usd',
					status: result.status,
					clientSecret: ''
				};
			}
			throw new Error('Payment confirmation failed');
		});
	}

	async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
		try {
			const order = await getOrder(Number(paymentId));
			return {
				isValid: true,
				paymentId: paymentId,
				status: order?.data?.data?.attributes?.status || 'failed',
				details: order?.data?.data?.attributes?.currency || 'failed'
			};
		} catch (error) {
			console.error('Error verifying LemonSqueezy payment:', error);
			return {
				isValid: false,
				paymentId: paymentId,
				status: 'failed',
				details: error
			};
		}
	}

	async createSetupIntent(): Promise<SetupIntent> {
		// LemonSqueezy doesn't use setup intents like Stripe
		// This is a placeholder implementation
		throw new Error('Setup intents not supported by LemonSqueezy');
	}

	async createCustomCheckout(params: CheckoutParams): Promise<string> {
		try {
			const { data, error } = await createCheckout(Number(this.storeId), Number(params.variantId), {
				customPrice: params.customPrice,
				productOptions: {
					redirectUrl: `${env.API_BASE_URL}/billing/success`,
					receiptButtonText: 'View Receipt',
					receiptLinkUrl: `${env.API_BASE_URL}/billing/receipt`,
					receiptThankYouNote: 'Thank you for your purchase!',
					enabledVariants: [Number(params.variantId)],
					name: params.metadata?.name || 'Subscription',
					description: params.metadata?.description || 'Subscription checkout for ' + params.metadata?.name,
					media: []
				},
				checkoutOptions: {
					embed: true,
					media: false,
					logo: false,
					dark: params.dark
				},
				checkoutData: {
					email: params.email,
					custom: params.metadata ?? {},
					variantQuantities: [
						{
							variantId: Number(params.variantId),
							quantity: 1
						}
					]
				},
				preview: false,
				testMode: process.env.NODE_ENV === 'development',
				expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() // 30 days
			});

			if (error) {
				throw new Error(`Lemonsqueezy checkout error: ${error.message || 'Unknown error'}`);
			}

			if (!data?.data?.attributes?.url) {
				throw new Error('Invalid response from Lemonsqueezy: missing checkout URL');
			}

			return data.data.attributes.url;
		} catch (error) {
			console.error('Error creating LemonSqueezy subscription:', error);
			throw new Error('Failed to create subscription');
		}
	}

	async createSubscription(params: CheckoutParams): Promise<SubscriptionInfo> {
		try {
			const { variantId, email, customPrice, metadata } = params;

			const finalProductId = variantId;
			if (!finalProductId) {
				throw new Error('Product ID is required');
			}

			const { data, error } = await createCheckout(Number(this.storeId), finalProductId, {
				customPrice,
				productOptions: {
					enabledVariants: [Number(variantId)],
					redirectUrl: metadata?.successUrl || '',
					name: metadata?.name || 'Subscription',
					description: metadata?.description || 'Subscription checkout',
					media: []
				},
				checkoutOptions: {
					embed: true,
					media: false,
					logo: true,
					dark: true,
					subscriptionPreview: true
				},
				checkoutData: {
					email: email || '',
					custom: metadata ?? {}
				},
				preview: false,
				testMode: process.env.NODE_ENV === 'development'
			});

			if (error) {
				throw new Error(`Lemonsqueezy checkout error: ${error.message || 'Unknown error'}`);
			}

			if (!data?.data?.attributes?.url) {
				throw new Error('Invalid response from Lemonsqueezy: missing checkout URL');
			}
			return {
				id: data.data.id,
				customerId: '',
				status: 'pending' as SubscriptionStatus,
				priceId: '',
				cancelAtPeriodEnd: false,
				checkoutData: {
					...data.data.attributes,
					relationships: data.data.relationships,
					type: data.data.type,
					links: data.data.links
				}
			};
		} catch (error) {
			console.error('Error creating LemonSqueezy subscription:', error);
			throw new Error('Failed to create subscription');
		}
	}

	async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo> {
		try {
			const { data, error } = await cancelSubscription(Number(subscriptionId));

			if (error) throw new Error(`Lemonsqueezy cancel subscription error: ${error.message || 'Unknown error'}`);
			return {
				id: subscriptionId,
				customerId: '',
				status: 'canceled' as SubscriptionStatus,
				priceId: '',
				cancelAtPeriodEnd: cancelAtPeriodEnd,
				checkoutData: {
					...data?.data?.attributes,
					relationships: data?.data?.relationships,
					type: data?.data?.type,
					links: data?.data?.links
				}
			};
		} catch (error) {
			console.error('Error cancelling LemonSqueezy subscription:', error);
			throw new Error('Failed to cancel subscription');
		}
	}

	async listVariants(): Promise<Variant[]> {
		const { data, error } = await listVariants({
			filter: {
				productId: Number(this.storeId)
			}
		});
		if (error) throw new Error(`Lemonsqueezy list variants error: ${error.message || 'Unknown error'}`);
		return data.data as unknown as Variant[];
	}

	async getSubscription(subscriptionId: string): Promise<any> {
		try {
			const { data, error } = await listSubscriptions({
				filter: {
					storeId: Number(this.storeId)
				}
			});
			const price = await getPrice(Number(subscriptionId));
			console.log('Price:', price.data?.data?.attributes || 'No price found');
			if (error) {
				console.error('Error fetching subscriptions:', error);
				return null;
			}

			if (data.data && data.data.length > 0) {
				const subscription = data.data.find((sub: any) => sub.id === Number(subscriptionId));
				return subscription || null;
			}

			return null;
		} catch (error) {
			console.error('Error getting subscription:', error);
			return null;
		}
	}

	async updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo> {
		try {
			const currentSubscription = await this.getSubscription(params.subscriptionId);
			if (!currentSubscription) {
				throw new Error(`Subscription ${params.subscriptionId} not found`);
			}

			if (currentSubscription.status === 'cancelled' || currentSubscription.status === 'expired') {
				if (!params.metadata?.resumeAction && !params.metadata?.reactivateAction) {
					throw new Error(`Cannot modify subscription in ${currentSubscription.status} status`);
				}
			}
			if (
				params.priceId &&
				currentSubscription.status !== 'active' &&
				currentSubscription.status !== 'on_trial' &&
				currentSubscription.status !== 'past_due'
			) {
				throw new Error(
					`Cannot update plan for subscription in ${currentSubscription.status} status. Only active, trial, or past due subscriptions can be updated.`
				);
			}

			const updatePayload: {
				variantId?: number;
				pause?: {
					mode: 'void' | 'free';
					resumesAt?: string | null;
				} | null;
				cancelled?: boolean;
				trialEndsAt?: string | null;
				billingAnchor?: number | null;
				invoiceImmediately?: boolean;
				disableProrations?: boolean;
			} = {};

			if (params.priceId) {
				const variantId = Number(params.priceId);
				if (isNaN(variantId)) {
					throw new Error(`Invalid variant ID: ${params.priceId}. Must be a valid number.`);
				}
				updatePayload.variantId = variantId; // Use variantId as per LemonSqueezy types
			}

			if (params.cancelAtPeriodEnd !== undefined) {
				updatePayload.cancelled = params.cancelAtPeriodEnd;
			}

			if (params.metadata?.pauseMode) {
				updatePayload.pause = {
					mode: params.metadata.pauseMode as 'void' | 'free',
					resumesAt: params.metadata.pauseUntil || null
				};
				console.log('Pause action: Using LemonSqueezy pause object');
			}

			if (params.metadata?.resumeAction) {
				if (currentSubscription?.status === 'paused') {
					updatePayload.pause = null;
				} else if (currentSubscription?.status === 'cancelled') {
					updatePayload.cancelled = false;
					console.log('Resume action: Reactivating cancelled subscription');
				} else {
					throw new Error(
						`Cannot resume subscription in ${currentSubscription?.status} status. Only paused or cancelled subscriptions can be resumed.`
					);
				}
			}

			if (params.metadata?.reactivateAction) {
				updatePayload.cancelled = false;
			}
			if (params.metadata?.billingAnchor !== undefined) {
				updatePayload.billingAnchor = params.metadata.billingAnchor;
			}
			if (params.metadata?.invoiceImmediately !== undefined) {
				updatePayload.invoiceImmediately = params.metadata.invoiceImmediately;
			}
			if (params.metadata?.disableProrations !== undefined) {
				updatePayload.disableProrations = params.metadata.disableProrations;
			}

			if (params.metadata?.trialEndsAt !== undefined) {
				updatePayload.trialEndsAt = params.metadata.trialEndsAt;
			}
			if (process.env.NODE_ENV === 'development') {
				updatePayload.trialEndsAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
				console.log('LemonSqueezy update payload:', {
					subscriptionId: params.subscriptionId,
					payload: updatePayload,
					metadata: params.metadata,
					currentStatus: currentSubscription?.status
				});
			}
			console.log('LemonSqueezy update payload:', {
				subscriptionId: params.subscriptionId,
				payload: updatePayload,
				metadata: params.metadata,
				currentStatus: currentSubscription?.status,
				variantId: Number(params.priceId)
			});
			const { data, error } = await updateSubscription(Number(params.subscriptionId), {
				...updatePayload,
				variantId: Number(params.priceId)
			});
			console.log('Subscription updated:', data);
			if (error) {
				console.error('LemonSqueezy API error details:', {
					error,
					payload: updatePayload,
					subscriptionId: params.subscriptionId,
					currentStatus: currentSubscription?.status
				});
				throw new Error(`Lemonsqueezy update subscription error: ${error.message || 'Unknown error'}`);
			}

			return {
				id: params.subscriptionId,
				customerId: '',
				status: 'active' as SubscriptionStatus,
				priceId: params.priceId || '',
				cancelAtPeriodEnd: params.cancelAtPeriodEnd || false,
				checkoutData: {
					...data?.data?.attributes,
					relationships: data?.data?.relationships,
					type: data?.data?.type,
					links: data?.data?.links
				}
			};
		} catch (error) {
			console.error('Error updating LemonSqueezy subscription:', error);
			throw new Error('Failed to update subscription');
		}
	}

	async handleWebhook(
		payload: unknown,
		signature: string,
		rawBody?: string,
		timestamp?: string,
		webhookId?: string
	): Promise<WebhookResult> {
		try {
			// Convert webhook secret to key for Web Crypto API
			const encoder = new TextEncoder();
			const keyData = encoder.encode(this.webhookSecret);
			// Use rawBody when available to avoid signature verification failures
			// caused by JSON re-serialization differences (whitespace, key order, etc.)
			const messageData = encoder.encode(rawBody ?? JSON.stringify(payload));

			// Import key for HMAC
			const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, [
				'sign'
			]);

			// Sign the message
			const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
			const hashArray = Array.from(new Uint8Array(signatureBuffer));
			const calculatedSignature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

			if (calculatedSignature !== signature) {
				return {
					received: false,
					type: 'verification_failed',
					id: '',
					data: { error: 'Invalid signature' }
				};
			}

			const event = payload as { meta: { event_name: string }; data: { id: string } };
			return {
				received: true,
				type: event.meta.event_name,
				id: event.data.id,
				data: event.data
			};
		} catch (error) {
			console.error('Error handling LemonSqueezy webhook:', error);
			return {
				received: false,
				type: 'processing_error',
				id: '',
				data: { error: 'Webhook processing failed' }
			};
		}
	}

	async listCheckouts(options: ListCheckoutsOptions = {}): Promise<CheckoutListResult> {
		const { status, limit = 50, page = 1, customerEmail, dateFrom, dateTo } = options;

		try {
			this.logger.info('Fetching LemonSqueezy checkouts', { storeId: this.storeId, ...options });

			this.validateStoreId();
			const pageConfig = this.buildPaginationConfig(limit, page);
			const apiFilter = this.buildApiFilter({ status, customerEmail, dateFrom, dateTo });

			const response = await this.fetchSubscriptions(apiFilter);

			const responseData = this.validateResponse(response);
			if (!responseData) {
				return this.createEmptyResult(pageConfig);
			}

			const checkouts = this.processCheckouts(responseData.data, { dateFrom, dateTo });
			const result = this.buildResult(checkouts, pageConfig, responseData.meta);

			this.logger.info('Successfully fetched LemonSqueezy checkouts', {
				count: checkouts.length,
				total: result.total,
				hasMore: result.hasMore
			});

			return result;
		} catch (error) {
			return this.handleError(error, 'Failed to fetch LemonSqueezy checkouts');
		}
	}

	// Private helper methods for better code organization
	private validateStoreId(): void {
		if (!this.storeId || !Number.isFinite(Number(this.storeId))) {
			throw new Error('Invalid store ID for LemonSqueezy checkouts');
		}
	}

	private buildPaginationConfig(limit: number, page: number): PaginationConfig {
		return {
			size: Math.min(limit, 100), // LemonSqueezy max is 100
			number: Math.max(page, 1)
		};
	}

	private buildApiFilter(filters: Partial<ListCheckoutsOptions>): ApiFilter {
		const apiFilter: ApiFilter = {
			storeId: Number(this.storeId)
		};

		if (filters.status) apiFilter.status = filters.status;
		if (filters.customerEmail) apiFilter.userEmail = filters.customerEmail;
		if (filters.dateFrom) apiFilter.dateFrom = filters.dateFrom;
		if (filters.dateTo) apiFilter.dateTo = filters.dateTo;

		return apiFilter;
	}

	private async fetchSubscriptions(apiFilter: ApiFilter) {
		return await listSubscriptions({
			filter: apiFilter,
			include: [
				'store',
				'variant',
				'customer',
				'order',
				'order-item',
				'product',
				'subscription-items',
				'subscription-invoices'
			]
		});
	}

	private validateResponse(response: any): any {
		const responseData = response.data as any;

		if (responseData && responseData.errors) {
			this.logger.error('LemonSqueezy API returned errors', { errors: responseData.errors });
			throw new Error(`LemonSqueezy API errors: ${JSON.stringify(responseData.errors)}`);
		}

		if (!responseData || !responseData.data) {
			this.logger.warn('No checkout data received from LemonSqueezy', { responseData });
			return null;
		}

		if (!Array.isArray(responseData.data)) {
			this.logger.error('LemonSqueezy response.data.data is not an array', {
				responseDataType: typeof responseData.data,
				responseData: responseData.data
			});
			return null;
		}

		return responseData;
	}

	private createEmptyResult(pageConfig: PaginationConfig): CheckoutListResult {
		return {
			checkouts: [],
			total: 0,
			page: pageConfig.number,
			limit: pageConfig.size,
			hasMore: false
		};
	}

	private processCheckouts(data: any[], dateFilters: { dateFrom?: Date; dateTo?: Date }): CheckoutData[] {
		return data
			.map((checkout: any) => this.transformCheckoutData(checkout))
			.filter((checkout: any) => {
				if (dateFilters.dateFrom && new Date(checkout.createdAt) < dateFilters.dateFrom) {
					return false;
				}
				if (dateFilters.dateTo && new Date(checkout.createdAt) > dateFilters.dateTo) {
					return false;
				}
				return true;
			});
	}

	private buildResult(checkouts: CheckoutData[], pageConfig: PaginationConfig, meta: any): CheckoutListResult {
		return {
			checkouts,
			total: checkouts.length,
			page: pageConfig.number,
			limit: pageConfig.size,
			hasMore: meta?.page?.last_page > pageConfig.number
		};
	}

	private handleError(error: any, message: string): never {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		this.logger.error(message, {
			error: errorMessage,
			storeId: this.storeId,
			stack: error instanceof Error ? error.stack : undefined
		});

		if (errorMessage.includes('map is not a function')) {
			throw new Error(
				'LemonSqueezy API response format error: response.data is not an array. Please check your API configuration.'
			);
		}

		throw new Error(`${message}: ${errorMessage}`);
	}

	private transformCheckoutData(checkout: any): CheckoutData {
		let amount = 0;
		const attrs = checkout.attributes || {};
		if (attrs.total) {
			amount = attrs.total / 100;
		} else if (attrs.unit_price) {
			amount = attrs.unit_price / 100;
		} else if (attrs.price) {
			amount = attrs.price / 100;
		} else if (attrs.amount) {
			amount = attrs.amount / 100;
		} else if (attrs.first_subscription_item?.price_id) {
			amount = (attrs.first_subscription_item.unit_price || 0) / 100;
		}

		// Extract all relationship data
		const relationships = checkout.relationships || {};
		const included = checkout.included || [];

		// Helper function to find included data by type and id
		const findIncluded = (type: string, id: string) => {
			return included.find((item: any) => item.type === type && item.id === id);
		};

		// Extract specific relationship data
		const store = relationships.store?.data ? findIncluded('stores', relationships.store.data.id) : null;
		const customer = relationships.customer?.data
			? findIncluded('customers', relationships.customer.data.id)
			: null;
		const order = relationships.order?.data ? findIncluded('orders', relationships.order.data.id) : null;
		const orderItem = relationships['order-item']?.data
			? findIncluded('order-items', relationships['order-item'].data.id)
			: null;
		const product = relationships.product?.data ? findIncluded('products', relationships.product.data.id) : null;
		const variant = relationships.variant?.data ? findIncluded('variants', relationships.variant.data.id) : null;
		const subscriptionItems = relationships['subscription-items']?.data || [];
		const subscriptionInvoices = relationships['subscription-invoices']?.data || [];

		const transformed = {
			id: checkout.id.toString(),
			checkoutId: attrs.checkout_id || attrs.subscription_id || checkout.id.toString(),
			storeId: attrs.store_id || Number(this.storeId),
			customerEmail: attrs.customer_email || attrs.user_email,
			productName: attrs.product_name,
			variantName: attrs.variant_name,
			amount: amount,
			currency: attrs.currency || 'USD',
			status: attrs.status || 'unknown',
			createdAt: attrs.first_subscription_item?.created_at || attrs.created_at,
			updatedAt: attrs.first_subscription_item?.updated_at || attrs.updated_at,
			completedAt: attrs.completed_at,
			metadata: {
				...attrs.custom_data,
				priceId: attrs.first_subscription_item?.price_id,
				quantity: attrs.first_subscription_item?.quantity,
				isUsageBased: attrs.first_subscription_item?.is_usage_based,
				// Include all relationship data
				relationships: {
					store: store?.attributes || null,
					customer: customer?.attributes || null,
					order: order?.attributes || null,
					orderItem: orderItem?.attributes || null,
					product: product?.attributes || null,
					variant: variant?.attributes || null,
					subscriptionItems: subscriptionItems.map(
						(item: any) => findIncluded('subscription-items', item.id)?.attributes || null
					),
					subscriptionInvoices: subscriptionInvoices.map(
						(item: any) => findIncluded('subscription-invoices', item.id)?.attributes || null
					)
				},
				// Include all raw relationship data for debugging
				rawRelationships: relationships,
				rawIncluded: included
			}
		};

		console.log('Date information:', {
			originalCreatedAt: attrs.created_at,
			originalUpdatedAt: attrs.updated_at,
			originalCompletedAt: attrs.completed_at,
			subscriptionCreatedAt: attrs.first_subscription_item?.created_at,
			subscriptionUpdatedAt: attrs.first_subscription_item?.updated_at,
			finalCreatedAt: transformed.createdAt,
			finalUpdatedAt: transformed.updatedAt,
			finalCompletedAt: transformed.completedAt
		});

		return transformed;
	}

	/**
	 * Get checkout by ID
	 * @param checkoutId - The checkout ID to retrieve
	 * @returns Promise<CheckoutData | null>
	 */
	async getCheckout(checkoutId: string): Promise<CheckoutData | null> {
		try {
			this.logger.info('Fetching LemonSqueezy checkout by ID', { checkoutId });

			const result = await this.listCheckouts({ limit: 100 });
			const checkout = result.checkouts.find((c: CheckoutData) => c.checkoutId === checkoutId);

			if (!checkout) {
				this.logger.warn('Checkout not found', { checkoutId });
				return null;
			}

			this.logger.info('Successfully fetched checkout', { checkoutId });
			return checkout;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error('Failed to fetch checkout by ID', {
				error: errorMessage,
				checkoutId
			});
			throw new Error(`Failed to fetch checkout: ${errorMessage}`);
		}
	}

	async refundPayment(): Promise<any> {
		// LemonSqueezy doesn't have a direct refund API
		// Refunds are typically handled through the dashboard
		throw new Error('Refunds must be processed through LemonSqueezy dashboard');
	}

	getClientConfig(): ClientConfig {
		return {
			publicKey: this.apiKey,
			paymentGateway: 'lemonsqueezy',
			options: {
				storeId: this.storeId,
				testMode: this.testMode
			}
		};
	}

	getUIComponents(): UIComponents {
		return {
			PaymentForm: () => null, // Placeholder component
			logo: '/logos/lemonsqueezy-logo.svg',
			cardBrands: [],
			supportedPaymentMethods: ['card', 'paypal'],
			translations: {
				en: {
					'button.pay': 'Pay with LemonSqueezy',
					'button.subscribe': 'Subscribe with LemonSqueezy'
				}
			}
		};
	}
}
