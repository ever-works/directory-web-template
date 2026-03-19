import { User } from '@supabase/auth-js';
import Stripe from 'stripe';

export interface PriceDetails {
	amount: number;
	formatted: string;
}

export interface SubscriptionDetails extends OneTimeDetails {
	weekly?: PriceDetails;
}

export interface OneTimeDetails extends PriceDetails {
	collect_tax: boolean;
}

export interface CountryPricing {
	country: string;
	currency: string;
	symbol: string;
	subscription: SubscriptionDetails;
	oneTime: OneTimeDetails;
	free: OneTimeDetails;
}

export interface PaymentIntent {
	id: string;
	amount: number;
	currency: string;
	status: string;
	clientSecret?: string;
	customerId?: string;
}

export interface SetupIntent extends Stripe.SetupIntent {
	id: string;
	clientSecret: string;
}

export interface SubscriptionInfo {
	id: string;
	customerId: string;
	status: SubscriptionStatus;
	currentPeriodEnd?: number | null;
	cancelAtPeriodEnd?: boolean;
	cancelAt?: number | null;
	trialEnd?: number | null;
	priceId: string;
	paymentIntentId?: string;
	checkoutData?: Record<string, any>;
}

export enum SubscriptionStatus {
	INCOMPLETE = 'incomplete',
	INCOMPLETE_EXPIRED = 'incomplete_expired',
	TRIALING = 'trialing',
	ACTIVE = 'active',
	PAST_DUE = 'past_due',
	CANCELED = 'canceled',
	UNPAID = 'unpaid'
}

export enum SubscriptionPlanType {
	TRIAL = 'trial', // 7-day trial that converts to recurring
	RECURRING = 'recurring' // Direct recurring subscription (1-month)
}

export interface PaymentVerificationResult {
	isValid: boolean;
	paymentId: string;
	status: string;
	details?: any;
}

export interface WebhookResult {
	received: boolean;
	type: string;
	id: string;
	data?: any;
}

// UI Component Interfaces for Payment Providers
export interface PaymentFormProps {
	onSuccess: (paymentId: string) => void;
	onError: (error: Error) => void;
	amount: number;
	currency: string;
	isSubscription: boolean;
	clientSecret?: string;
	customerId?: string;
	billingDetails?: BillingDetails;
	successUrl?: string;
	cancelUrl?: string;
	metadata?: Record<string, any>;
}

export interface BillingDetails {
	name?: string;
	email?: string;
	phone?: string;
	address?: {
		line1?: string;
		line2?: string;
		city?: string;
		state?: string;
		postalCode?: string;
		country?: string;
	};
}

export interface CardBrandIcon {
	name: string;
	lightIcon: string;
	darkIcon: string;
	width: number;
	height: number;
}

export interface CheckoutParams {
	priceId?: string;
	variantId?: number;
	quantity?: number;
	successUrl?: string;
	cancelUrl?: string;
	customerEmail?: string;
	email?: string;
	customPrice?: number;
	metadata?: Record<string, any>;
	dark?: boolean;
}

/**
 * Standardized checkout data structure
 */
export interface CheckoutData {
	id: string;
	checkoutId: string;
	storeId: number;
	customerEmail?: string;
	productName?: string;
	variantName?: string;
	amount: number;
	currency: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
	metadata: Record<string, any>;
}

/**
 * Result structure for checkout listing operations
 */
export interface CheckoutListResult {
	checkouts: CheckoutData[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
}

export interface UIComponents {
	// The main payment form component
	PaymentForm: React.ComponentType<PaymentFormProps>;

	// Icons and visual elements
	logo: string;
	cardBrands: CardBrandIcon[];

	// Display options
	supportedPaymentMethods: string[];

	// Localization
	translations: Record<string, Record<string, string>>;
}

export interface PaymentProviderInterface {
	// Methods to create and manage payments
	createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
	confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
	verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
	createSetupIntent(user: User | null): Promise<SetupIntent>;
	// createPaymentMethod(params: CreatePaymentMethodParams): Promise<{ clientSecret: string, isSubscription: boolean }>;

	// Methods to manage subscriptions
	createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;
	createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
	cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
	updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;
	hasCustomerId(user: User | null): boolean;
	getCustomerId(user: User | null): Promise<string | null>;

	// Methods for webhooks
	handleWebhook(
		payload: any,
		signature: string,
		rawBody?: string,
		timestamp?: string,
		webhookId?: string
	): Promise<WebhookResult>;

	// Methods for refunds
	refundPayment(paymentId: string, amount?: number): Promise<any>;

	// Method to get the front-end configurations
	getClientConfig(): ClientConfig;

	// Method to create a custom checkout
	// createCustomCheckout(params: CheckoutParams): Promise<string>;

	// Method to get the UI components
	getUIComponents(): UIComponents;
}

export interface CreatePaymentParams {
	amount: number;
	currency: string;
	metadata?: Record<string, any>;
	customerId?: string;
	productId?: string;
	successUrl?: string;
	cancelUrl?: string;
}

export interface CreatePaymentMethodParams {
	user: User | null;
	plan: {
		id: number | string;
		period: string;
		price?: number;
		name?: string;
	};
}

export interface CreateCustomerParams {
	email: string;
	name?: string;
	metadata?: Record<string, any>;
}

export interface CustomerResult {
	id: string;
	email: string;
	name?: string;
	metadata?: Record<string, any>;
}

export interface CreateSubscriptionParams {
	customerId: string;
	priceId: string;
	paymentMethodId?: string;
	trialPeriodDays?: number;
	metadata?: Record<string, any>;
}

export interface UpdateSubscriptionParams {
	subscriptionId: string;
	priceId?: string;
	cancelAtPeriodEnd?: boolean;
	cancelAt?: number | null;
	metadata?: Record<string, any>;
}

// Client configuration for frontend integration
export interface ClientConfig {
	publicKey: string;
	paymentGateway: 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
	options?: Record<string, any>;
}

// Webhook event type
export enum WebhookEventType {
	PAYMENT_SUCCEEDED = 'payment_succeeded',
	PAYMENT_FAILED = 'payment_failed',
	REFUND_SUCCEEDED = 'refund_succeeded',
	CUSTOMER_STATE_CHANGED = 'customer_state_changed',
	CUSTOMER_CREATED = 'customer_created',
	SUBSCRIPTION_CREATED = 'subscription_created',
	SUBSCRIPTION_UPDATED = 'subscription_updated',
	SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
	SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
	SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
	SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',

	PAYMENT_INTENT_SUCCEEDED = 'payment_intent_succeeded',
	PAYMENT_INTENT_FAILED = 'payment_intent_failed',
	CHARGE_SUCCEEDED = 'charge_succeeded',
	CHARGE_FAILED = 'charge_failed',
	INVOICE_PAID = 'invoice_paid',
	INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',
	REFUND_CREATED = 'refund_created',

	BILLING_PORTAL_SESSION_CREATED = 'billing_portal_session_created',
	BILLING_PORTAL_SESSION_EXPIRED = 'billing_portal_session_expired',
	BILLING_PORTAL_SESSION_UPDATED = 'billing_portal_session_updated',
	BILLING_PORTAL_SESSION_DELETED = 'billing_portal_session_deleted',
	BILLING_PORTAL_SESSION_VIEWED = 'billing_portal_session_viewed',
	BILLING_PORTAL_SESSION_VIEWED_EXPIRED = 'billing_portal_session_viewed_expired',
	BILLING_PORTAL_SESSION_VIEWED_UPDATED = 'billing_portal_session_viewed_updated',
	BILLING_PORTAL_SESSION_VIEWED_DELETED = 'billing_portal_session_viewed_deleted'
}

// Supported providers type
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';

// Interface for the configuration of a provider
export interface PaymentProviderConfig {
	apiKey: string;
	webhookSecret?: string;
	secretKey?: string;
	options?: Record<string, any>;
}

// Interface for the service configuration
export interface PaymentServiceConfig {
	provider: SupportedProvider;
	config: PaymentProviderConfig;
}

// Payment type
export enum PaymentType {
	ONE_TIME = 'one_time',
	SUBSCRIPTION = 'subscription',
	FREE = 'free'
}

export interface CheckoutSessionParams extends Omit<Stripe.Checkout.SessionCreateParams, 'mode'> {
	mode: 'payment' | 'setup' | 'subscription';
}
/*
 * Formats an amount in cents to a currency string.
 * @param cents The amount in cents.
 * @param currency The currency code.
 * @param locale The locale to use for formatting.
 * @returns The formatted currency string.
 */
export function formatCentsToCurrency(cents: number, currency: string = 'USD', locale: string = 'en-US'): string {
	const amount = cents / 100;
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(amount);
}

/*
 * Converts an amount in cents to a decimal amount.
 * @param cents The amount in cents.
 * @returns The amount as a decimal.
 */
export function convertCentsToDecimal(cents: number): number {
	return parseFloat((cents / 100).toFixed(2));
}

export function convertDecimalToCents(decimal: number): number {
	return Math.round(decimal * 100);
}

/*
 * Converts a timestamp in seconds to a Date object.
 * @param timestamp The timestamp in seconds.
 * @returns The Date object.
 */
export function convertNumberToDate(timestamp?: number): Date | null {
	if (typeof timestamp !== 'number' || isNaN(timestamp)) {
		return null;
	}

	const date = new Date(timestamp * 1000);
	return isNaN(date.getTime()) ? null : date;
}

/**
 * Safely convert timestamp to Date, handling null/undefined values
 */
export function safeTimestampToDate(timestamp: number | null | undefined): Date | undefined {
	if (!timestamp || isNaN(timestamp)) {
		return undefined;
	}

	// Handle both seconds and milliseconds timestamps
	const ts = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
	const date = new Date(ts);

	// Validate the resulting date
	if (isNaN(date.getTime())) {
		console.warn(`Invalid timestamp: ${timestamp}`);
		return undefined;
	}

	return date;
}
