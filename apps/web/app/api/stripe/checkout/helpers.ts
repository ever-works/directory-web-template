import { CheckoutSessionParams } from '@/lib/payment/types/payment-types';
import Stripe from 'stripe';

/**
 * Builds line items array for Stripe checkout session.
 *
 * Order matters: trial items must precede the main subscription price
 * to ensure proper billing sequence in Stripe.
 *
 * @param priceId - Main subscription/product price ID (required)
 * @param trialAmountId - Trial period price ID (optional)
 * @param hasTrial - Whether to include trial line item
 * @returns Array of Stripe line items
 */
export function buildCheckoutLineItems(
	priceId: string,
	trialAmountId?: string,
	hasTrial: boolean = false
): Stripe.Checkout.SessionCreateParams.LineItem[] {
	const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

	if (hasTrial && trialAmountId) {
		lineItems.push({
			price: trialAmountId,
			quantity: 1
		});
	}

	lineItems.push({
		price: priceId,
		quantity: 1
	});

	return lineItems;
}

/**
 * Applies subscription-specific configuration to checkout params.
 *
 * @param params - Base checkout parameters to extend
 * @param options - Subscription configuration options
 */
export function applySubscriptionConfig(
	params: CheckoutSessionParams,
	options: {
		userId: string;
		planId?: string;
		planName?: string;
		billingInterval: string;
		trialPeriodDays: number;
	}
): void {
	// Ensure all metadata values are strings (Stripe requirement)
	params.subscription_data = {
		metadata: {
			userId: String(options.userId),
			planId: String(options.planId || ''),
			planName: String(options.planName || ''),
			billingInterval: String(options.billingInterval)
		}
	};

	if (options.trialPeriodDays > 0) {
		params.subscription_data.trial_period_days = options.trialPeriodDays;
	}

	params.billing_address_collection = 'auto';
	params.customer_update = {
		address: 'auto',
		name: 'auto'
	};
	params.allow_promotion_codes = true;
}

/**
 * Converts metadata values to strings as required by Stripe API.
 * Stripe metadata only accepts string values.
 *
 * @param metadata - Metadata object with potentially non-string values
 * @returns Metadata object with all values converted to strings
 */
function sanitizeMetadata(metadata: Record<string, any>): Record<string, string> {
	const sanitized: Record<string, string> = {};
	for (const [key, value] of Object.entries(metadata)) {
		if (value !== null && value !== undefined) {
			sanitized[key] = String(value);
		}
	}
	return sanitized;
}

/**
 * Creates base checkout session parameters.
 *
 * @param options - Base checkout configuration
 * @returns Base checkout parameters object
 */
export function createBaseCheckoutParams(options: {
	customerId: string;
	mode: 'payment' | 'setup' | 'subscription';
	lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
	successUrl: string;
	cancelUrl: string;
	metadata: Record<string, any>;
	billingInterval: string;
}): CheckoutSessionParams {
	// Sanitize metadata to ensure all values are strings (Stripe requirement)
	const sanitizedMetadata = sanitizeMetadata({
		...options.metadata,
		billingInterval: options.billingInterval
	});

	return {
		customer: options.customerId,
		mode: options.mode,
		line_items: options.lineItems,
		success_url: options.successUrl,
		cancel_url: options.cancelUrl,
		billing_address_collection: 'auto',
		metadata: sanitizedMetadata,
		ui_mode: 'hosted',
		custom_text: {
			submit: {
				message: 'Your subscription will be activated immediately after payment.'
			}
		}
	};
}
