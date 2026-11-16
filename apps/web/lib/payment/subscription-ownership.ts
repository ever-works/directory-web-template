/**
 * Subscription ownership check for payment routes.
 *
 * Routes that cancel, reactivate or change a subscription take the provider
 * subscription id from the request. A signed-in user must only be able to act on
 * their own subscription, so each route resolves the row through this helper
 * before it calls a payment provider or writes to the database.
 *
 * It is deliberately free of database imports: the route passes the owner-scoped
 * query (`getSubscriptionByUserIdAndSubscriptionId`) as `lookup`. It does not
 * filter by provider, because rows created from the LemonSqueezy webhook are
 * not stored under a LemonSqueezy provider name.
 */
export type OwnedSubscriptionLookup<T> = (userId: string, subscriptionId: string) => Promise<T | null | undefined>;

/**
 * Returns the subscription row when it belongs to `userId`, otherwise `null`.
 * A missing user id or an empty / blank subscription id never reaches the lookup.
 */
export async function findOwnedSubscription<T>(
	userId: string | null | undefined,
	subscriptionId: string | null | undefined,
	lookup: OwnedSubscriptionLookup<T>
): Promise<T | null> {
	if (typeof userId !== 'string' || userId.trim() === '') return null;
	if (typeof subscriptionId !== 'string' || subscriptionId.trim() === '') return null;
	return (await lookup(userId, subscriptionId)) ?? null;
}

/** Body of the 404 every route returns when {@link findOwnedSubscription} gives `null`. */
export const SUBSCRIPTION_NOT_FOUND_MESSAGE = 'Subscription not found or access denied';
