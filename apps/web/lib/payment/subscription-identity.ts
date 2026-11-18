/**
 * Fields that tie a local subscription row to a customer at a payment provider.
 * They are set when the row is created (by the checkout flow or an admin) and must
 * never be rewritten through a user-facing update: a row whose provider id points at
 * another customer's subscription would let its holder cancel or change that
 * subscription through the provider calls the payment routes make.
 */
export const IMMUTABLE_SUBSCRIPTION_FIELDS = [
	'id',
	'userId',
	'tenantId',
	'paymentProvider',
	'subscriptionId',
	'customerId',
	'createdAt'
] as const;

/**
 * Return a copy of `data` without the identity fields above. Anything else is kept.
 * A non-object input yields an empty object.
 */
export function omitImmutableSubscriptionFields(data: unknown): Record<string, unknown> {
	if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
	const blocked = new Set<string>(IMMUTABLE_SUBSCRIPTION_FIELDS);
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		if (!blocked.has(key)) result[key] = value;
	}
	return result;
}
