/**
 * `subscriptions.amount`, `amount_due` and `amount_paid` are integer columns that
 * hold major units (the billing UI and the payment report read them that way).
 * A decimal such as 19.99 makes Postgres reject the write, so round to whole
 * units; a missing or non-finite value is 0 rather than NaN.
 */
export function toStoredAmount(cents: number | null | undefined): number {
	if (typeof cents !== 'number' || !Number.isFinite(cents)) return 0;
	return Math.round(cents / 100);
}
