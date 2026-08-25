/** Format a Stripe amount from cents for customer-facing payment emails. */
export function formatAmount(amountInCents: number, currency: string = 'USD'): string {
	return `${(amountInCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

/** Format the payment-method summary used by payment emails. */
export function formatPaymentMethod(paymentMethod: unknown): string {
	if (!paymentMethod || typeof paymentMethod !== 'object') return 'Credit Card';

	const { type, card } = paymentMethod as {
		type?: string;
		card?: { last4?: string; brand?: string };
	};
	if (type === 'card' && card) {
		return `**** **** **** ${card.last4} (${card.brand?.toUpperCase()})`;
	}

	return type || 'Credit Card';
}
