/**
 * Currencies the payment providers (Stripe, and LemonSqueezy, which follows it) send
 * without a minor unit: Stripe's zero-decimal list. Not the display-formatting list in
 * `lib/utils/currency-format.ts`: that one treats e.g. IDR, HUF and ISK as having no
 * decimals, while Stripe sends their amounts in hundredths (Rp10,000 arrives as 1000000).
 */
const ZERO_DECIMAL = new Set([
	'BIF',
	'CLP',
	'DJF',
	'GNF',
	'JPY',
	'KMF',
	'KRW',
	'MGA',
	'PYG',
	'RWF',
	'UGX',
	'VND',
	'VUV',
	'XAF',
	'XOF',
	'XPF'
]);

/** Stripe's three-decimal currencies: amounts arrive in thousandths. */
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

/** How many provider units make one major unit of `currency` (a missing currency counts as USD). */
export function providerMinorUnitFactor(currency?: string | null): number {
	const code = (currency || 'USD').toUpperCase();
	if (ZERO_DECIMAL.has(code)) return 1;
	if (THREE_DECIMAL.has(code)) return 1000;
	return 100;
}

/**
 * `subscriptions.amount`, `amount_due` and `amount_paid` are integer columns that
 * hold major units (the billing UI and the payment report read them that way).
 * Providers send the smallest currency unit, so divide by the provider's factor for
 * that currency (100 for USD or IDR, 1 for JPY, 1000 for KWD) and round to whole units:
 * a decimal such as 19.99 makes Postgres reject the write. A missing or non-finite
 * value is 0 rather than NaN; a missing currency counts as USD.
 */
export function toStoredAmount(minorAmount: number | null | undefined, currency?: string | null): number {
	if (typeof minorAmount !== 'number' || !Number.isFinite(minorAmount)) return 0;
	return Math.round(minorAmount / providerMinorUnitFactor(currency));
}
