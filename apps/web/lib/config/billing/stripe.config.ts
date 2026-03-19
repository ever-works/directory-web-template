import { PlanConfig, PlanName, CurrencyCode } from '.';

/**
 * Check if Stripe dynamic pricing is enabled
 * When enabled, products and prices are fetched from Stripe API
 * instead of using hardcoded environment variables
 */
export function isStripeDynamicPricingEnabled(): boolean {
	return process.env.NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING === 'true';
}

/**
 * Product metadata keys used for dynamic pricing
 * Products in Stripe must have these metadata fields set
 */
export const STRIPE_PRODUCT_METADATA_KEYS = {
	/** Plan type: 'free' | 'standard' | 'premium' | 'sponsor_weekly' | 'sponsor_monthly' */
	PLAN: 'plan',
	/** Product type: 'subscription' | 'sponsor_ad' */
	TYPE: 'type',
	/** JSON array of feature strings */
	FEATURES: 'features',
	/** Annual discount percentage (e.g., '20' for 20% off) */
	ANNUAL_DISCOUNT: 'annualDiscount'
} as const;

// ============================================
// CURRENCY CONFIGURATION
// ============================================

/**
 * Maps ISO 4217 currency codes to Stripe config keys
 * This allows the system to work with any detected currency
 * by mapping it to the appropriate Stripe configuration
 */
const CURRENCY_TO_CONFIG_KEY: Record<string, CurrencyCode> = {
	USD: 'usd',
	EUR: 'eur',
	GBP: 'gbp',
	CAD: 'cad'
};

/**
 * Get Stripe config key from ISO currency code
 * Falls back to 'usd' (USD) if currency is not supported
 */
export function getStripeConfigKey(currency: string): CurrencyCode {
	const normalizedCurrency = currency.toUpperCase().trim();
	return CURRENCY_TO_CONFIG_KEY[normalizedCurrency] || 'usd';
}

/**
 * Get Stripe price configuration for a plan and currency
 * Returns the configuration for the specified currency or falls back to USD
 */
export function getStripePriceConfig(
	plan: PlanName,
	currency: string,
	interval: 'monthly' | 'yearly' = 'monthly'
): { priceId: string | undefined; currency: string; symbol: string; setupFeeId: string | undefined } | null {
	const config = STRIPE_CONFIG[plan];
	if (!config) {
		return null;
	}

	const configKey = getStripeConfigKey(currency);
	const currencyConfig = config[configKey];

	if (!currencyConfig) {
		// Fallback to USD if currency not found
		const usdConfig = config.usd;
		if (!usdConfig) {
			return null;
		}
		return {
			priceId: interval === 'monthly' ? usdConfig.amount.monthly : usdConfig.amount.yearly,
			currency: usdConfig.currency || 'USD',
			symbol: usdConfig.symbol || '$',
			setupFeeId: usdConfig.amount.setupFee
		};
	}

	return {
		priceId: interval === 'monthly' ? currencyConfig.amount.monthly : currencyConfig.amount.yearly,
		currency: currencyConfig.currency || currency,
		symbol: currencyConfig.symbol || '$',
		setupFeeId: currencyConfig.amount.setupFee
	};
}

export const STRIPE_CONFIG: Record<PlanName, PlanConfig> = {
	premium: {
		productId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID,
		usd: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD,
				yearly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_USD,
				setupFee: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_USD
			},
			currency: 'USD',
			symbol: '$'
		},
		eur: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_EUR,
				yearly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_EUR,
				setupFee: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_EUR
			},
			currency: 'EUR',
			symbol: '€'
		},
		gbp: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_GBP,
				yearly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_GBP,
				setupFee: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_GBP
			},
			currency: 'GBP',
			symbol: '£'
		},
		cad: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_CAD,
				yearly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_CAD,
				setupFee: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_CAD
			},
			currency: 'CAD',
			symbol: 'CA$'
		}
	},
	standard: {
		productId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID,
		usd: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD,
				yearly: process.env.NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD,
				setupFee: process.env.NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD
			},
			currency: 'USD',
			symbol: '$'
		},
		eur: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR,
				yearly: process.env.NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR,
				setupFee: process.env.NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_EUR
			},
			currency: 'EUR',
			symbol: '€'
		},
		gbp: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP,
				yearly: process.env.NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_GBP,
				setupFee: process.env.NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP
			},
			currency: 'GBP',
			symbol: '£'
		},
		cad: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD,
				yearly: process.env.NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_CAD,
				setupFee: process.env.NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_CAD
			},
			currency: 'CAD',
			symbol: 'CA$'
		}
	},
	free: {
		productId: undefined
	}
};
