/**
 * Payment configuration schema
 * Defines payment provider settings (Stripe, LemonSqueezy, Polar)
 */

import { z } from 'zod';

/**
 * Product pricing display configuration
 */
export const productPricingSchema = z.object({
	free: z.number().default(0),
	standard: z.number().default(10),
	premium: z.number().default(20)
});

/**
 * Trial amount configuration
 */
export const trialAmountSchema = z.object({
	standardTrialAmountId: z.string().optional(),
	premiumTrialAmountId: z.string().optional(),
	authorized: z.boolean().default(false)
});

/**
 * Stripe configuration schema
 */
export const stripeConfigSchema = z
	.object({
		secretKey: z.string().optional(),
		publishableKey: z.string().optional(),
		webhookSecret: z.string().optional(),
		// Price IDs
		freePriceId: z.string().optional(),
		standardPriceId: z.string().optional(),
		premiumPriceId: z.string().optional()
	})
	.transform((data) => ({
		...data,
		enabled: Boolean(data.secretKey && data.publishableKey)
	}));

/**
 * LemonSqueezy configuration schema
 */
export const lemonSqueezyConfigSchema = z
	.object({
		apiKey: z.string().optional(),
		storeId: z.string().optional(),
		webhookSecret: z.string().optional(),
		webhookUrl: z.string().url().optional().catch(undefined),
		testMode: z.boolean().default(false),
		variantId: z.string().optional(),
		// Variant IDs
		freeVariantId: z.string().optional(),
		standardVariantId: z.string().optional(),
		premiumVariantId: z.string().optional()
	})
	.transform((data) => ({
		...data,
		enabled: Boolean(data.apiKey && data.storeId)
	}));

/**
 * Polar configuration schema
 */
export const polarConfigSchema = z
	.object({
		accessToken: z.string().optional(),
		webhookSecret: z.string().optional(),
		organizationId: z.string().optional(),
		sandbox: z.boolean().default(true),
		apiUrl: z.string().url().optional().catch(undefined),
		// Plan IDs
		freePlanId: z.string().optional(),
		standardPlanId: z.string().optional(),
		premiumPlanId: z.string().optional()
	})
	.transform((data) => ({
		...data,
		enabled: Boolean(data.accessToken && data.organizationId)
	}));

/**
 * Payment configuration schema
 */
export const paymentConfigSchema = z.object({
	// Product pricing (display values)
	pricing: productPricingSchema.optional().default({ free: 0, standard: 10, premium: 20 }),

	// Trial amounts
	trial: trialAmountSchema.optional().default({ authorized: false }),

	// Payment providers
	stripe: stripeConfigSchema.optional().default({ enabled: false }),
	lemonSqueezy: lemonSqueezyConfigSchema.optional().default({ enabled: false, testMode: false }),
	polar: polarConfigSchema.optional().default({ enabled: false, sandbox: true })
});

/**
 * Type inference for payment configuration
 */
export type PaymentConfig = z.infer<typeof paymentConfigSchema>;

/**
 * Safely parses a float, returning undefined if NaN
 */
function parseFloatOrUndefined(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const parsed = parseFloat(value);
	return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Collects payment configuration from environment variables
 */
export function collectPaymentConfig(): z.input<typeof paymentConfigSchema> {
	return {
		pricing: {
			free: parseFloatOrUndefined(process.env.NEXT_PUBLIC_PRODUCT_PRICE_FREE),
			standard: parseFloatOrUndefined(process.env.NEXT_PUBLIC_PRODUCT_PRICE_STANDARD),
			premium: parseFloatOrUndefined(process.env.NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM)
		},
		trial: {
			standardTrialAmountId: process.env.NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID,
			premiumTrialAmountId: process.env.NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID,
			authorized: process.env.NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT === 'true'
		},
		stripe: {
			secretKey: process.env.STRIPE_SECRET_KEY,
			publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY,
			webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
			freePriceId: process.env.NEXT_PUBLIC_STRIPE_FREE_PRICE,
			standardPriceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID,
			premiumPriceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
		},
		lemonSqueezy: {
			apiKey: process.env.LEMONSQUEEZY_API_KEY,
			storeId: process.env.LEMONSQUEEZY_STORE_ID,
			webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
			webhookUrl: process.env.LEMONSQUEEZY_WEBHOOK_URL,
			testMode: process.env.LEMONSQUEEZY_TEST_MODE === 'true',
			variantId: process.env.LEMONSQUEEZY_VARIANT_ID,
			freeVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID,
			standardVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID,
			premiumVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID
		},
		polar: {
			accessToken: process.env.POLAR_ACCESS_TOKEN,
			webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
			organizationId: process.env.POLAR_ORGANIZATION_ID,
			sandbox: process.env.POLAR_SANDBOX !== 'false',
			apiUrl: process.env.POLAR_API_URL,
			freePlanId: process.env.NEXT_PUBLIC_POLAR_FREE_PLAN_ID,
			standardPlanId: process.env.NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID,
			premiumPlanId: process.env.NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID
		}
	};
}

// payment page|| payment form

export const paymentModeSchema = z.object({
	stripe: z.boolean().optional().default(false),
	lemonSqueezy: z.boolean().optional().default(false),
	polar: z.boolean().optional().default(false)
});

export function collectPaymentModeConfig(): z.input<typeof paymentModeSchema> {
	return {
		stripe: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED === 'true',
		lemonSqueezy: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED === 'true',
		polar: process.env.NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED === 'true'
	};
}
