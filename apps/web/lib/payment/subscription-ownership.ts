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
 *   The email is only trusted when {@link isEmailVerifiedForOwnership} is true,
 *   so each LemonSqueezy route answers 403 before the owner lookup otherwise.
 *   The database lookup lives in `subscription-email-verification.ts`.
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

/** Body of the 403 a LemonSqueezy route returns when the signed-in email is not verified. */
export const EMAIL_NOT_VERIFIED_MESSAGE =
	'Verify your email address before managing a subscription. Check your inbox for the verification link.';

/** What {@link isEmailVerifiedForOwnership} needs to know about a user. */
export interface EmailVerificationState {
	/** `users.emailVerified`: set once the user confirmed the address. */
	emailVerified: Date | string | null | undefined;
	/** The user has a linked OAuth / OIDC row in `accounts` (the provider verified the address). */
	hasOAuthAccount: boolean;
}

/** Loads {@link EmailVerificationState}; `null` when the user does not exist. */
export type EmailVerificationLookup = (userId: string) => Promise<EmailVerificationState | null | undefined>;

/**
 * True when the email on the user's account is proven to belong to them, so it may
 * be used as the identity for a LemonSqueezy subscription (which is matched by
 * customer email). Credentials sign-up does not verify the address, so without this
 * check someone could register another person's email first and take over that
 * person's subscriptions. OAuth sign-ins verify the address at the provider, and
 * Auth.js leaves `users.emailVerified` null for them, so a linked OAuth / OIDC
 * account counts too. A missing user id or user never counts.
 */
export async function isEmailVerifiedForOwnership(
	userId: string | null | undefined,
	lookup: EmailVerificationLookup
): Promise<boolean> {
	if (!isNonBlank(userId)) return false;
	const state = await lookup(userId);
	if (!state) return false;
	return Boolean(state.emailVerified) || state.hasOAuthAccount === true;
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
