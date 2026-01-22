import { PlanConfig, PlanName, CurrencyCode } from '.';

/**
 * Polar Configuration with Localization Support
 *
 * This module provides Polar configuration that works with the currency localization system.
 * It automatically maps detected ISO 4217 currency codes (USD, EUR, GBP, CAD, etc.) to the
 * appropriate Polar variant IDs configured in environment variables.
 *
 * @example
 * ```ts
 * import { getPolarPriceConfig } from '@/lib/config/billing';
 * import { getUserCurrency } from '@/lib/services/currency.service';
 *
 * // Get user's currency (from profile or auto-detected)
 * const currency = await getUserCurrency(userId, request);
 *
 * // Get the appropriate Polar variant ID for the user's currency
 * const priceConfig = getPolarPriceConfig('premium', currency, 'monthly');
 * if (priceConfig?.priceId) {
 *   // Use priceConfig.priceId for Polar checkout
 *   // Use priceConfig.currency for display
 *   // Use priceConfig.symbol for formatting
 * }
 * ```
 */

/**
 * Maps ISO 4217 currency codes to Polar config keys
 * This allows the system to work with any detected currency
 * by mapping it to the appropriate Polar configuration
 */
const CURRENCY_TO_CONFIG_KEY: Record<string, CurrencyCode> = {
	USD: 'usd',
	EUR: 'eur',
	GBP: 'gbp',
	CAD: 'cad'
};

/**
 * Get Polar config key from ISO currency code
 * Falls back to 'usd' (USD) if currency is not supported
 */
export function getPolarConfigKey(currency: string): CurrencyCode {
	const normalizedCurrency = currency.toUpperCase().trim();
	return CURRENCY_TO_CONFIG_KEY[normalizedCurrency] || 'usd';
}

/**
 * Get Polar price configuration for a plan and currency
 * Returns the configuration for the specified currency or falls back to USD
 */
export function getPolarPriceConfig(
	plan: PlanName,
	currency: string,
	interval: 'monthly' | 'yearly' = 'monthly'
): { priceId: string | undefined; currency: string; symbol: string } | null {
	const config = POLAR_CONFIG[plan];
	if (!config) {
		return null;
	}

	const configKey = getPolarConfigKey(currency);
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
			symbol: usdConfig.symbol || '$'
		};
	}

	return {
		priceId: interval === 'monthly' ? currencyConfig.amount.monthly : currencyConfig.amount.yearly,
		currency: currencyConfig.currency || currency,
		symbol: currencyConfig.symbol || '$'
	};
}

export const POLAR_CONFIG: Record<PlanName, PlanConfig> = {
	premium: {
		productId: process.env.NEXT_PUBLIC_POLAR_PREMIUM_PRODUCT_ID,
		usd: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_POLAR_PREMIUM_MONTHLY_PRICE_ID_USD,
				yearly: process.env.NEXT_PUBLIC_POLAR_PREMIUM_YEARLY_PRICE_ID_USD,
				setupFee: process.env.NEXT_PUBLIC_POLAR_PREMIUM_SETUP_FEE_ID_USD
			},
			currency: 'USD',
			symbol: '$'
		},
		eur: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_POLAR_PREMIUM_MONTHLY_PRICE_ID_EUR,
				yearly: process.env.NEXT_PUBLIC_POLAR_PREMIUM_YEARLY_PRICE_ID_EUR,
				setupFee: process.env.NEXT_PUBLIC_POLAR_PREMIUM_SETUP_FEE_ID_EUR
			},
			currency: 'EUR',
			symbol: '€'
		},
		gbp: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_POLAR_PREMIUM_MONTHLY_PRICE_ID_GBP,
				yearly: process.env.NEXT_PUBLIC_POLAR_PREMIUM_YEARLY_PRICE_ID_GBP,
				setupFee: process.env.NEXT_PUBLIC_POLAR_PREMIUM_SETUP_FEE_ID_GBP
			},
			currency: 'GBP',
			symbol: '£'
		},
		cad: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_POLAR_PREMIUM_MONTHLY_PRICE_ID_CAD,
				yearly: process.env.NEXT_PUBLIC_POLAR_PREMIUM_YEARLY_PRICE_ID_CAD,
				setupFee: process.env.NEXT_PUBLIC_POLAR_PREMIUM_SETUP_FEE_ID_CAD
			},
			currency: 'CAD',
			symbol: 'CA$'
		}
	},
	standard: {
		productId: process.env.NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID,
		usd: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_POLAR_STANDARD_VARIANT_ID,
				yearly: process.env.NEXT_PUBLIC_POLAR_STANDARD_VARIANT_ID,
				setupFee: process.env.NEXT_PUBLIC_POLAR_STANDARD_VARIANT_ID
			},
			currency: 'USD',
			symbol: '$'
		},
		eur: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_POLAR_STANDARD_MONTHLY_PRICE_ID_EUR,
				yearly: process.env.NEXT_PUBLIC_POLAR_STANDARD_YEARLY_PRICE_ID_EUR,
				setupFee: process.env.NEXT_PUBLIC_POLAR_STANDARD_SETUP_FEE_ID_EUR
			},
			currency: 'EUR',
			symbol: '€'
		},
		gbp: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_POLAR_STANDARD_MONTHLY_PRICE_ID_GBP,
				yearly: process.env.NEXT_PUBLIC_POLAR_STANDARD_YEARLY_PRICE_ID_GBP,
				setupFee: process.env.NEXT_PUBLIC_POLAR_STANDARD_SETUP_FEE_ID_GBP
			},
			currency: 'GBP',
			symbol: '£'
		},
		cad: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_POLAR_STANDARD_MONTHLY_PRICE_ID_CAD,
				yearly: process.env.NEXT_PUBLIC_POLAR_STANDARD_YEARLY_PRICE_ID_CAD,
				setupFee: process.env.NEXT_PUBLIC_POLAR_STANDARD_SETUP_FEE_ID_CAD
			},
			currency: 'CAD',
			symbol: 'CA$'
		}
	},
	free: {
		productId: undefined
	}
};
