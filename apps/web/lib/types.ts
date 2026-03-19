import { Session } from 'next-auth';
import { PricingPlanConfig, PricingConfig } from './content';
import { PaymentInterval, PaymentPlan, PaymentProvider } from './constants';
import { getStripePriceConfig } from './config/billing/stripe.config';
import { getLemonSqueezyPriceConfig } from './config/billing/lemonsqueezy.config';

export type SessionProps = {
	session: Session | null;
};

/**
 * Helper function to get LemonSqueezy variant ID based on authorization flag
 * Selects setup-fee variant when authorization is enabled, otherwise uses standard variant
 */
function getLemonVariantId(standardVariantEnv: string | undefined, setupFeeVariantEnv: string | undefined): string {
	const isAuthorized = process.env.NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT === 'true';
	if (isAuthorized && setupFeeVariantEnv) {
		return setupFeeVariantEnv;
	}
	return standardVariantEnv || '';
}

/**
 * Type guard to validate that a string is a valid PaymentPlan enum value
 */
function isValidPaymentPlan(value: string): value is PaymentPlan {
	return Object.values(PaymentPlan).includes(value as PaymentPlan);
}

/**
 * Maps PaymentPlan enum to PlanName type used by billing configs
 */
function mapPaymentPlanToPlanName(plan: PaymentPlan): 'free' | 'standard' | 'premium' {
	switch (plan) {
		case PaymentPlan.FREE:
			return 'free';
		case PaymentPlan.STANDARD:
			return 'standard';
		case PaymentPlan.PREMIUM:
			return 'premium';
		default:
			return 'standard';
	}
}

/**
 * Enriches a pricing config with currency-aware price IDs from billing configs
 * This function updates the config with the correct price IDs based on the user's currency
 */
function enrichPricingConfigWithCurrency(
	config: PricingConfig,
	currency: string,
	provider: PaymentProvider
): PricingConfig {
	if (!isValidPaymentPlan(config.id)) {
		throw new Error(
			`Invalid PaymentPlan value: ${config.id}. Expected one of: ${Object.values(PaymentPlan).join(', ')}`
		);
	}
	const planName = mapPaymentPlanToPlanName(config.id);
	const interval = config.interval === PaymentInterval.YEARLY ? 'yearly' : 'monthly';

	// Get currency-aware price config based on provider
	if (provider === PaymentProvider.STRIPE) {
		const monthlyConfig = getStripePriceConfig(planName, currency, 'monthly');
		const yearlyConfig = getStripePriceConfig(planName, currency, 'yearly');

		if (monthlyConfig || yearlyConfig) {
			return {
				...config,
				stripePriceId: monthlyConfig?.priceId || config.stripePriceId,
				annualPriceId: yearlyConfig?.priceId || config.annualPriceId
			};
		}
	} else if (provider === PaymentProvider.LEMONSQUEEZY) {
		const lemonConfig = getLemonSqueezyPriceConfig(planName, currency, interval);
		if (lemonConfig && lemonConfig.priceId) {
			// Use currency-aware variant from billing config
			// Note: Setup-fee variants are handled separately at checkout time
			// The billing configs provide the standard variants per currency
			return {
				...config,
				lemonVariantId: lemonConfig.priceId
			};
		}
	}

	return config;
}

/**
 * Base pricing configuration (USD default)
 * This is the static fallback configuration used when currency is not available
 */
const basePricingConfig: PricingPlanConfig = {
	provider: PaymentProvider.STRIPE,
	lemonCheckoutUrl: '',
	currency: '$',

	plans: {
		FREE: {
			id: PaymentPlan.FREE,
			name: 'Free Plan',
			description: 'Access basic features and submit content for free.',
			price: 0,
			interval: PaymentInterval.PER_SUBMISSION,
			isActive: true,
			isPremium: false,
			isFeatured: false,
			disabled: false,
			annualDiscount: 0,
			popular: false,
			// Legacy env vars - for multi-currency, use lib/config/billing/stripe.config.ts
			stripeProductId: process.env.NEXT_PUBLIC_STRIPE_FREE_PRODUCT_ID,
			stripePriceId: process.env.NEXT_PUBLIC_STRIPE_FREE_PRICE || '',
			annualPriceId: process.env.NEXT_PUBLIC_STRIPE_FREE_PRICE || '',
			lemonVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID || '',
			lemonCheckoutUrl: '',
			lemonProductId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_FREE_PRODUCT_ID,
			polarFreePlanId: process.env.NEXT_PUBLIC_POLAR_FREE_PLAN_ID || '',
			polarProductId: process.env.NEXT_PUBLIC_POLAR_FREE_PLAN_ID || '',
			envKey: 'FREE_PLAN'
		},

		STANDARD: {
			id: PaymentPlan.STANDARD,
			name: 'Standard Plan',
			description: 'Get more visibility and unlock additional directory features.',
			price: 19,
			interval: PaymentInterval.MONTHLY,
			isActive: true,
			isPremium: true,
			isFeatured: true,
			// Legacy env vars - for multi-currency, use lib/config/billing/stripe.config.ts
			stripeProductId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID,
			stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID || '',
			annualPriceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID || '',
			trialAmountId: process.env.NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID || '',
			isAuthorizedTrialAmount: process.env.NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT === 'true',
			annualDiscount: 10,
			disabled: false,
			popular: true,
			envKey: 'STANDARD_PLAN',
			trialPeriodDays: 4,
			// LemonSqueezy configuration - selects setup-fee variant when authorization flag is true
			lemonVariantId: getLemonVariantId(
				process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID,
				process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID
			),
			lemonCheckoutUrl: '',
			lemonProductId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID,
			polarStandardPlanId: process.env.NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID || '',
			polarProductId: process.env.NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID || ''
		},

		PREMIUM: {
			id: PaymentPlan.PREMIUM,
			name: 'Premium Plan',
			description: 'Maximum exposure and premium support for directory listings.',
			price: 49,
			interval: PaymentInterval.MONTHLY,
			isActive: true,
			isPremium: true,
			isFeatured: true,
			// Legacy env vars - for multi-currency, use lib/config/billing/stripe.config.ts
			stripeProductId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID,
			stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || '',
			annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || '',
			annualDiscount: 10,
			disabled: true,
			trialPeriodDays: 4,
			popular: false,
			isAuthorizedTrialAmount: process.env.NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT === 'true',
			trialAmountId: process.env.NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID || '',
			envKey: 'PREMIUM_PLAN',
			// LemonSqueezy configuration - selects setup-fee variant when authorization flag is true
			lemonVariantId: getLemonVariantId(
				process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID,
				process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID
			),
			lemonCheckoutUrl: '',
			lemonProductId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID,
			polarPremiumPlanId: process.env.NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID || '',
			polarProductId: process.env.NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID || ''
		}
	}
};

export const defaultPricingConfig: PricingPlanConfig = basePricingConfig;

export function getDefaultPricingConfigWithCurrency(
	currency: string = 'USD',
	provider: PaymentProvider = PaymentProvider.STRIPE
): PricingPlanConfig {
	const baseConfig = { ...basePricingConfig, plans: structuredClone(basePricingConfig.plans) };
	const normalizedCurrency = currency.toUpperCase().trim() || 'USD';

	// Get currency symbol from billing configs
	let currencySymbol = '$';
	if (provider === PaymentProvider.STRIPE) {
		const stripeConfig = getStripePriceConfig('standard', normalizedCurrency, 'monthly');
		if (stripeConfig) {
			currencySymbol = stripeConfig.symbol;
		}
	} else if (provider === PaymentProvider.LEMONSQUEEZY) {
		const lemonConfig = getLemonSqueezyPriceConfig('standard', normalizedCurrency, 'monthly');
		if (lemonConfig) {
			currencySymbol = lemonConfig.symbol;
		}
	}

	// Enrich each plan with currency-aware price IDs
	return {
		...baseConfig,
		provider,
		currency: currencySymbol,
		plans: {
			FREE: enrichPricingConfigWithCurrency(baseConfig.plans.FREE, normalizedCurrency, provider),
			STANDARD: enrichPricingConfigWithCurrency(baseConfig.plans.STANDARD, normalizedCurrency, provider),
			PREMIUM: enrichPricingConfigWithCurrency(baseConfig.plans.PREMIUM, normalizedCurrency, provider)
		}
	};
}
