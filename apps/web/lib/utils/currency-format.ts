/**
 * Currency Formatting Utilities
 *
 * Provides consistent currency formatting across the application
 * Uses user's detected currency preference
 */

/**
 * Get the number of decimal places for a currency
 * Some currencies like JPY, KRW don't use decimal places
 */
function getCurrencyDecimalPlaces(currency: string): number {
	const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'IDR'];
	return zeroDecimalCurrencies.includes(currency.toUpperCase()) ? 0 : 2;
}

/**
 * Format amount in minor units (cents for most currencies) to currency string
 * Uses user's currency preference if available
 * Falls back to simple format if currency code is invalid
 * Intl.NumberFormat automatically handles currency-specific decimal places
 * For zero-decimal currencies (JPY, KRW, etc.), amount is already in major units
 */
export function formatCurrency(amountInMinorUnits: number, currency: string = 'USD', locale: string = 'en-US'): string {
	const currencyUpper = currency.toUpperCase();
	const decimalPlaces = getCurrencyDecimalPlaces(currencyUpper);

	// For currencies without minor units (0 decimals), amount is already in major units
	// For currencies with minor units (2 decimals), divide by 100 to convert to major units
	const amount = decimalPlaces === 0 ? amountInMinorUnits : amountInMinorUnits / 100;

	try {
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: currencyUpper
		}).format(amount);
	} catch (error) {
		// Fallback to simple format if currency code is invalid (RangeError)
		// or if locale is invalid
		if (error instanceof RangeError) {
			return formatAmountWithSymbol(amount, currency);
		}
		// Re-throw other errors
		throw error;
	}
}

/**
 * Format amount (already in major units) to currency string
 * Falls back to simple format if currency code is invalid
 * Intl.NumberFormat automatically handles currency-specific decimal places
 */
export function formatCurrencyAmount(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
	const currencyUpper = currency.toUpperCase();

	try {
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: currencyUpper
		}).format(amount);
	} catch (error) {
		// Fallback to simple format if currency code is invalid (RangeError)
		// or if locale is invalid
		if (error instanceof RangeError) {
			return formatAmountWithSymbol(amount, currency);
		}
		// Re-throw other errors
		throw error;
	}
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currency: string): string {
	const currencySymbols: Record<string, string> = {
		USD: '$',
		EUR: '€',
		GBP: '£',
		JPY: '¥',
		CNY: '¥',
		CAD: 'C$',
		AUD: 'A$',
		CHF: 'CHF',
		INR: '₹',
		BRL: 'R$',
		MXN: '$',
		KRW: '₩',
		RUB: '₽',
		TRY: '₺',
		ZAR: 'R',
		SGD: 'S$',
		HKD: 'HK$',
		NOK: 'kr',
		SEK: 'kr',
		DKK: 'kr',
		PLN: 'zł',
		CZK: 'Kč',
		HUF: 'Ft'
	};

	return currencySymbols[currency.toUpperCase()] || currency.toUpperCase();
}

/**
 * Format amount with currency symbol (simple format)
 * Respects currency decimal conventions (e.g., JPY has 0 decimals)
 */
export function formatAmountWithSymbol(amount: number, currency: string = 'USD'): string {
	const symbol = getCurrencySymbol(currency);
	const decimalPlaces = getCurrencyDecimalPlaces(currency);
	return `${symbol}${amount.toFixed(decimalPlaces)}`;
}
