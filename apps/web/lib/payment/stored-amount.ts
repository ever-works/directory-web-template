/**
 * Currencies Stripe sends without a minor unit: its zero-decimal list, less UGX, which Stripe
 * still sends in hundredths for backwards compatibility (5 UGX arrives as 500). Not the
 * display-formatting list in `lib/utils/currency-format.ts`: that one treats e.g. IDR, HUF and
 * ISK as having no decimals, while Stripe sends their amounts in hundredths (Rp10,000 arrives
 * as 1000000). LemonSqueezy sends cents for every currency (see `toStoredAmount`).
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
	'VND',
	'VUV',
	'XAF',
	'XOF',
	'XPF'
]);

/** Stripe's three-decimal currencies: amounts arrive in thousandths. */
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

/**
 * How many provider units make one major unit of `currency` (a missing currency counts as USD).
 * Stripe follows the currency's minor unit; LemonSqueezy documents its amounts as cents, so it
 * is 100 for every currency.
 */
export function providerMinorUnitFactor(currency?: string | null, provider?: string | null): number {
	if (provider === 'lemonsqueezy') return 100;
	const code = (currency || 'USD').toUpperCase();
	if (ZERO_DECIMAL.has(code)) return 1;
	if (THREE_DECIMAL.has(code)) return 1000;
	return 100;
}

/**
 * `subscriptions.amount`, `amount_due` and `amount_paid` are integer columns that
 * hold major units (the billing UI and the payment report read them that way).
 * Providers send the smallest currency unit, so divide by the provider's factor for
 * that currency (at Stripe 100 for USD or IDR, 1 for JPY, 1000 for KWD; at LemonSqueezy always 100) and round to whole units:
 * a decimal such as 19.99 makes Postgres reject the write. A missing or non-finite
 * value is 0 rather than NaN; a missing currency counts as USD.
 */
export function toStoredAmount(
	minorAmount: number | null | undefined,
	currency?: string | null,
	provider?: string | null
): number {
	if (typeof minorAmount !== 'number' || !Number.isFinite(minorAmount)) return 0;
	return Math.round(minorAmount / providerMinorUnitFactor(currency, provider));
}

/**
 * The `subscriptions.amount` a subscription update stores (`handleSubscriptionUpdated`). The price's
 * own amount when the event carries one: a zero price is stored as 0, and a price with no flat amount
 * (`unit_amount: null`: tiered, usage-based) clears it, so a plan change never keeps the previous
 * price's amount. Only an event that carries no price amount at all keeps the stored one. The free
 * plan is always 0.
 */
export function updatedSubscriptionAmount(input: {
	planId?: string | null;
	/** `items.data[0].price.unit_amount` of the event, in the provider's minor unit. */
	minorAmount: unknown;
	currency?: string | null;
	provider?: string | null;
	storedAmount: number | null;
}): number | null {
	if (input.planId === 'free') return 0;
	if (input.minorAmount === null) return null;
	if (typeof input.minorAmount === 'number' && Number.isFinite(input.minorAmount) && input.minorAmount >= 0) {
		return toStoredAmount(input.minorAmount, input.currency, input.provider);
	}
	return input.storedAmount;
}
