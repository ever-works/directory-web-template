import { PlanConfig, PlanName, CurrencyCode } from '.';

/**
 * LemonSqueezy Configuration with Localization Support
 *
 * This module provides LemonSqueezy configuration that works with the currency localization system.
 * It automatically maps detected ISO 4217 currency codes (USD, EUR, GBP, CAD, etc.) to the
 * appropriate LemonSqueezy variant IDs configured in environment variables.
 *
 * @example
 * ```ts
 * import { getLemonSqueezyPriceConfig } from '@/lib/config/billing';
 * import { getUserCurrency } from '@/lib/services/currency.service';
 *
 * // Get user's currency (from profile or auto-detected)
 * const currency = await getUserCurrency(userId, request);
 *
 * // Get the appropriate LemonSqueezy variant ID for the user's currency
 * const priceConfig = getLemonSqueezyPriceConfig('premium', currency, 'monthly');
 * if (priceConfig?.priceId) {
 *   // Use priceConfig.priceId for LemonSqueezy checkout
 *   // Use priceConfig.currency for display
 *   // Use priceConfig.symbol for formatting
 * }
 * ```
 *
 * @example
 * ```ts
 * // In a React component with currency context
 * import { useCurrencyContext } from '@/components/context/currency-provider';
 * import { getLemonSqueezyPriceConfig } from '@/lib/config/billing';
 *
 * function CheckoutButton({ plan }: { plan: PlanName }) {
 *   const { currency } = useCurrencyContext();
 *   const priceConfig = getLemonSqueezyPriceConfig(plan, currency, 'monthly');
 *
 *   return (
 *     <button onClick={() => createCheckout(priceConfig?.priceId)}>
 *       Subscribe for {priceConfig?.symbol}{price}
 *     </button>
 *   );
 * }
 * ```
 */

/**
 * Maps ISO 4217 currency codes to LemonSqueezy config keys
 * This allows the system to work with any detected currency
 * by mapping it to the appropriate LemonSqueezy configuration
 */
const CURRENCY_TO_CONFIG_KEY: Record<string, CurrencyCode> = {
	USD: 'usd',
	EUR: 'eur',
	GBP: 'gbp',
	CAD: 'cad'
};

/**
 * Get LemonSqueezy config key from ISO currency code
 * Falls back to 'usd' (USD) if currency is not supported
 */
export function getLemonSqueezyConfigKey(currency: string): CurrencyCode {
	const normalizedCurrency = currency.toUpperCase().trim();
	return CURRENCY_TO_CONFIG_KEY[normalizedCurrency] || 'usd';
}

/**
 * Get LemonSqueezy price configuration for a plan and currency
 * Returns the configuration for the specified currency or falls back to USD
 */
export function getLemonSqueezyPriceConfig(
	plan: PlanName,
	currency: string,
	interval: 'monthly' | 'yearly' = 'monthly'
): { priceId: string | undefined; currency: string; symbol: string } | null {
	const config = LEMONSQUEEZY_CONFIG[plan];
	if (!config) {
		return null;
	}

	const configKey = getLemonSqueezyConfigKey(currency);
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

export const LEMONSQUEEZY_CONFIG: Record<PlanName, PlanConfig> = {
	premium: {
		productId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID,
		usd: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_USD,
				yearly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_USD,
				setupFee: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_USD
			},
			currency: 'USD',
			symbol: '$'
		},
		eur: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_EUR,
				yearly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_EUR,
				setupFee: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_EUR
			},
			currency: 'EUR',
			symbol: '€'
		},
		gbp: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_GBP,
				yearly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_GBP,
				setupFee: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_GBP
			},
			currency: 'GBP',
			symbol: '£'
		},
		cad: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_CAD,
				yearly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_CAD,
				setupFee: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_CAD
			},
			currency: 'CAD',
			symbol: 'CA$'
		}
	},
	standard: {
		productId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID,
		usd: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_USD,
				yearly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_USD,
				setupFee: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_USD
			},
			currency: 'USD',
			symbol: '$'
		},
		eur: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_EUR,
				yearly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_EUR,
				setupFee: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_EUR
			},
			currency: 'EUR',
			symbol: '€'
		},
		gbp: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_GBP,
				yearly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_GBP,
				setupFee: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_GBP
			},
			currency: 'GBP',
			symbol: '£'
		},
		cad: {
			amount: {
				monthly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_CAD,
				yearly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_CAD,
				setupFee: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_CAD
			},
			currency: 'CAD',
			symbol: 'CA$'
		}
	},
	free: {
		productId: undefined
	}
};
