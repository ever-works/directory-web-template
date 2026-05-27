/**
 * Currencies a {@link PlanConfig} can carry an explicit price in.
 *
 * Deliberately narrower than {@link SUPPORTED_CURRENCIES} below: this
 * is the set of currencies the project actually maintains per-plan
 * price points for (the upstream payment providers — Stripe,
 * LemonSqueezy, Polar — each require a separate product/price object
 * per currency, so we cap the set we author by hand here). Adding a
 * currency to this union does NOT make the platform charge in it
 * automatically; the per-provider config files (stripe.config.ts
 * etc.) need a matching `productId` entry too.
 *
 * Lowercase to match the canonical form Stripe accepts in its API.
 */
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

/**
 * Full ISO 4217 allow-list the UI may surface (currency switcher,
 * user-preferred display currency, geo-detection fallback).
 *
 * NOT the same as {@link CurrencyCode} — that one is just the
 * currencies we hand-author per-plan prices for. A user can pick any
 * of these 39 currencies as their display currency; under the hood
 * the payment provider converts to the nearest CurrencyCode for
 * checkout. Uppercase to match ISO 4217.
 */
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
