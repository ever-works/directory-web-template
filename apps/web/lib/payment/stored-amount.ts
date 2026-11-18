import { currencyMinorUnitFactor } from '@/lib/utils/currency-format';

/**
 * `subscriptions.amount`, `amount_due` and `amount_paid` are integer columns that
 * hold major units (the billing UI and the payment report read them that way).
 * Providers send the smallest currency unit, so divide by that currency's factor
 * (100 for USD, 1 for zero-decimal currencies such as JPY) and round to whole
 * units: a decimal such as 19.99 makes Postgres reject the write. A missing or
 * non-finite value is 0 rather than NaN; a missing currency counts as USD.
 */
export function toStoredAmount(minorAmount: number | null | undefined, currency?: string | null): number {
	if (typeof minorAmount !== 'number' || !Number.isFinite(minorAmount)) return 0;
	return Math.round(minorAmount / currencyMinorUnitFactor(currency || undefined));
}
