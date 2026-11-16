/**
 * Subscription ownership checks for payment routes.
 *
 * Routes that cancel, reactivate or change a subscription take the provider
 * subscription id from the request. A signed-in user must only be able to act on
 * their own subscription, so each route resolves it through one of these helpers
 * before it changes anything at the payment provider or in the database.
 *
 * The helpers are free of database and SDK imports: the route passes the lookup in.
 *
 * - Stripe: {@link findOwnedProviderSubscription} with
 *   `getSubscriptionByProviderSubscriptionId`. The provider filter is required.
 *   `(payment_provider, subscription_id)` is unique, but the same id may exist
 *   under another provider name, and `POST /api/stripe/subscriptions` lets a user
 *   insert a row with any provider name and id. A lookup by user id and
 *   subscription id alone would accept that row as proof of ownership.
 * - LemonSqueezy: {@link findOwnedLemonSqueezySubscription} asks LemonSqueezy
 *   for the subscription and compares its customer email with the signed-in
 *   user's email. That is the same identity `GET /api/lemonsqueezy/list` uses to
 *   show a user their subscriptions. The local table cannot be used: the
 *   LemonSqueezy webhook does not write owner rows, and users can insert rows.
 */

/** Body of the 404 every route returns when a helper gives `null`. */
export const SUBSCRIPTION_NOT_FOUND_MESSAGE = 'Subscription not found or access denied';

const isNonBlank = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** Loads the local row for a provider's subscription id (`getSubscriptionByProviderSubscriptionId`). */
export type ProviderSubscriptionLookup<T> = (
	paymentProvider: string,
	subscriptionId: string
) => Promise<T | null | undefined>;

/**
 * Returns the local subscription row for `paymentProvider` + `subscriptionId` when
 * it belongs to `userId`, otherwise `null`. A missing user id or an empty / blank
 * subscription id never reaches the lookup.
 */
export async function findOwnedProviderSubscription<T extends { userId: string | null }>(
	userId: string | null | undefined,
	paymentProvider: string,
	subscriptionId: unknown,
	lookup: ProviderSubscriptionLookup<T>
): Promise<T | null> {
	if (!isNonBlank(userId) || !isNonBlank(paymentProvider) || !isNonBlank(subscriptionId)) return null;
	const row = await lookup(paymentProvider, subscriptionId);
	return row && row.userId === userId ? row : null;
}

/** What the owner check needs from a LemonSqueezy subscription. */
export interface LemonSqueezySubscriptionOwner {
	id: string;
	userEmail: string | null | undefined;
}

/**
 * Reads one subscription from LemonSqueezy. Returns `null` when it does not exist
 * (or belongs to another store) and throws when LemonSqueezy cannot be reached.
 */
export type LemonSqueezySubscriptionFetcher<T extends LemonSqueezySubscriptionOwner> = (
	subscriptionId: string
) => Promise<T | null | undefined>;

const LEMONSQUEEZY_SUBSCRIPTION_ID = /^[1-9]\d{0,18}$/;

const normaliseEmail = (email: string) => email.trim().toLowerCase();

/**
 * Returns the LemonSqueezy subscription when its customer email is `userEmail`,
 * otherwise `null`. LemonSqueezy ids are numeric, so anything else is refused
 * without calling LemonSqueezy. A missing or blank email never matches.
 */
export async function findOwnedLemonSqueezySubscription<T extends LemonSqueezySubscriptionOwner>(
	userEmail: string | null | undefined,
	subscriptionId: unknown,
	fetchSubscription: LemonSqueezySubscriptionFetcher<T>
): Promise<T | null> {
	if (!isNonBlank(userEmail)) return null;
	if (typeof subscriptionId !== 'string' || !LEMONSQUEEZY_SUBSCRIPTION_ID.test(subscriptionId)) return null;
	const subscription = await fetchSubscription(subscriptionId);
	if (!subscription || String(subscription.id) !== subscriptionId) return null;
	if (!isNonBlank(subscription.userEmail)) return null;
	return normaliseEmail(subscription.userEmail) === normaliseEmail(userEmail) ? subscription : null;
}
