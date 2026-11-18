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
 *   `PUT`/`DELETE /api/stripe/subscription` use {@link isOwnStripeSubscription},
 *   which also accepts a subscription whose row the webhook has not written yet.
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

/** Stripe subscription ids; anything else is refused without calling Stripe. */
const STRIPE_SUBSCRIPTION_ID = /^sub_[A-Za-z0-9]{1,250}$/;

/** What {@link isOwnStripeSubscription} reads. */
export interface StripeSubscriptionOwnershipLookups {
	/** The local row for a Stripe subscription id (`getSubscriptionByProviderSubscriptionId` under `stripe`). */
	findRow: (subscriptionId: string) => Promise<{ userId: string | null } | null | undefined>;
	/** The user's own Stripe customer id: their `stripe` payment account, which only the server and admins write. */
	findUserCustomerId: (userId: string) => Promise<string | null | undefined>;
	/** The customer Stripe bills the subscription to; `null` when Stripe does not know the id. */
	fetchSubscriptionCustomerId: (subscriptionId: string) => Promise<string | null | undefined>;
}

/**
 * True when `userId` may change the Stripe subscription `subscriptionId`.
 *
 * The local row decides whenever there is one, as in {@link findOwnedProviderSubscription}.
 * `POST /api/stripe/subscription` returns the subscription before the `customer.subscription.created`
 * webhook writes that row, so while no row exists for the id the subscription is the user's when
 * Stripe bills it to the user's own Stripe customer. A row of another user, or a missing customer on
 * either side, refuses.
 */
export async function isOwnStripeSubscription(
	userId: string | null | undefined,
	subscriptionId: unknown,
	lookups: StripeSubscriptionOwnershipLookups
): Promise<boolean> {
	if (!isNonBlank(userId) || !isNonBlank(subscriptionId)) return false;
	const row = await lookups.findRow(subscriptionId);
	if (row) return row.userId === userId;
	if (!STRIPE_SUBSCRIPTION_ID.test(subscriptionId)) return false;
	const customerId = await lookups.findUserCustomerId(userId);
	if (!isNonBlank(customerId)) return false;
	const subscriptionCustomerId = await lookups.fetchSubscriptionCustomerId(subscriptionId);
	return isNonBlank(subscriptionCustomerId) && subscriptionCustomerId === customerId;
}

/** Body of the 403 a LemonSqueezy route returns when the signed-in email is not verified. */
export const EMAIL_NOT_VERIFIED_MESSAGE =
	'Verify your email address before managing a subscription: open the verification link we email you (you can resend it from your profile), or sign in again with a connected account that uses this address.';

/** What {@link isEmailVerifiedForOwnership} needs to know about a user. */
export interface EmailVerificationState {
	/** `users.email` as stored now. */
	email: string | null | undefined;
	/** `users.emailVerified`: set once the user confirmed the address in `email`. */
	emailVerified: Date | string | null | undefined;
	/**
	 * Linked OAuth / OIDC rows in `accounts` (the provider verified an address).
	 * `email` is the address the provider proved at the last sign-in through it
	 * (`lib/auth/oauth-link-email.ts`), or null when none was recorded: a link made before
	 * links were bound, or a provider that reported no verified address.
	 */
	oauthAccounts: ReadonlyArray<{ email: string | null | undefined }>;
	/**
	 * The user can sign in with a password (`users.passwordHash`, or any `accounts` row
	 * that is not `oauth` / `oidc`, such as the `credentials` row sign-up writes). Then
	 * `email` was typed in, not taken from a provider, and an OAuth row only shows that
	 * the user linked some provider account while signed in (Auth.js links any OAuth
	 * account to the signed-in user, whatever its address), so it proves nothing.
	 */
	hasPasswordSignIn: boolean;
}

/** Loads {@link EmailVerificationState}; `null` when the user does not exist. */
export type EmailVerificationLookup = (userId: string) => Promise<EmailVerificationState | null | undefined>;

/**
 * True when `email` - the address a LemonSqueezy subscription is matched against - is
 * proven to belong to the user. Credentials sign-up does not verify the address, so
 * without this check someone could register another person's email first and take
 * over that person's subscriptions.
 *
 * The proof has to be about the address being matched, not just about the user:
 * - `email` must be the address stored on the user now. A session carries the address
 *   from sign-in, and an address change must not inherit an earlier verification.
 * - `users.emailVerified` being set counts (`updateUser` clears it on an address change).
 * - A linked OAuth / OIDC account counts (Auth.js leaves `emailVerified` null for these
 *   users) only when the address its provider proved is this one. A row bound to another
 *   address proves nothing about this one, and neither does a row with no address: Auth.js
 *   links any provider account to the signed-in user whatever its address, so after an
 *   address change a newly linked account would otherwise vouch for an address nobody
 *   proved. A link made before links were bound has no address until the user signs in
 *   through that provider again; until then the user verifies the address by email.
 * - The OAuth shortcut is only for users without a password: a user who signed up with
 *   a password and then linked their own Google or GitHub account has proven nothing
 *   about the address they typed, so they must verify it by email.
 *
 * A missing user id, email or user never counts.
 */
export async function isEmailVerifiedForOwnership(
	userId: string | null | undefined,
	email: string | null | undefined,
	lookup: EmailVerificationLookup
): Promise<boolean> {
	if (!isNonBlank(userId) || !isNonBlank(email)) return false;
	const state = await lookup(userId);
	if (!state || !isNonBlank(state.email)) return false;
	const current = normaliseEmail(state.email);
	if (normaliseEmail(email) !== current) return false;
	if (state.emailVerified) return true;
	// Fail closed when the lookup does not say.
	if (state.hasPasswordSignIn !== false) return false;
	return state.oauthAccounts.some(
		(account) => isNonBlank(account.email) && normaliseEmail(account.email) === current
	);
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
