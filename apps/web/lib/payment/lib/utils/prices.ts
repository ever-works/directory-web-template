import { CountryPricing } from '../../types/payment-types';
import { pricingConfig } from '@/lib/config/client';

// Get prices from centralized client config
const standardPrice = pricingConfig.standard;
const premiumPrice = pricingConfig.premium;
const freePrice = pricingConfig.free;

export const PRICES: Record<string, CountryPricing> = {
	us: {
		country: 'us',
		currency: 'usd',
		symbol: '$',
		subscription: {
			amount: standardPrice,
			formatted: `$${standardPrice}`,
			collect_tax: false
		},
		oneTime: {
			amount: premiumPrice,
			formatted: `$${premiumPrice}`,
			collect_tax: false
		},
		free: {
			amount: freePrice,
			formatted: `$${freePrice}`,
			collect_tax: false
		}
	}
};

/**
 * Get the number of decimal places for a currency
 * @param currency - The currency code
 * @returns The number of decimal places
 */
export function getCurrencyDecimalPlaces(currency: string): number {
	const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'IDR'];
	const normalizedCurrency = currency.toUpperCase();
	return zeroDecimalCurrencies.includes(normalizedCurrency) ? 0 : 2;
}

/**
 * Format an amount for a currency
 * @param amount - The amount to format
 * @param currency - The currency code
 * @returns The formatted amount
 */
export function formatAmountForCurrency(amount: number, currency: string): number {
	const decimalPlaces = getCurrencyDecimalPlaces(currency);
	if (decimalPlaces === 0) {
		return Math.round(amount);
	}
	return Math.round(amount * 100);
}
