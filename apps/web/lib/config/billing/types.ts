export type CurrencyCode = 'usd' | 'eur' | 'gbp' | 'cad';
export type PlanName = 'premium' | 'standard' | 'free';
export type Interval = 'monthly' | 'yearly';
export interface AmountConfig {
	monthly?: string;
	yearly?: string;
	setupFee?: string;
}

export interface CurrencyConfig {
	amount: AmountConfig;
	currency?: string;
	symbol?: string;
}

export type PlanConfig = {
	productId: string | undefined;
} & Partial<Record<CurrencyCode, CurrencyConfig>>;

// Whitelist of supported ISO 4217 currency codes
export const SUPPORTED_CURRENCIES = [
	'USD',
	'EUR',
	'GBP',
	'JPY',
	'CNY',
	'CAD',
	'AUD',
	'CHF',
	'INR',
	'BRL',
	'MXN',
	'KRW',
	'RUB',
	'TRY',
	'ZAR',
	'SGD',
	'HKD',
	'NOK',
	'SEK',
	'DKK',
	'PLN',
	'CZK',
	'HUF',
	'NZD',
	'THB',
	'ILS',
	'CLP',
	'PHP',
	'AED',
	'SAR',
	'MYR',
	'IDR',
	'VND',
	'BGN',
	'RON',
	'ISK',
	'BWP',
	'COP',
	'PEN'
] as const;
