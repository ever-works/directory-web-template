import { isOAuthAccountType } from './connected-accounts';

/**
 * Binds each OAuth / OIDC account link (`accounts` row) to the email address its provider vouched for.
 *
 * The LemonSqueezy ownership check (`isEmailVerifiedForOwnership` in
 * `lib/payment/subscription-ownership.ts`) counts a linked provider account as proof of the user's
 * address only when the row's `email` is that address. Auth.js's adapter `linkAccount` receives the
 * tokens but not the provider profile, so the row is written without an email. Auth.js then calls
 * `events.signIn` in the same callback with the provider's profile, for a first sign-in, for a link
 * made while signed in, and for every later sign-in through that provider; `lib/auth/index.ts` calls
 * {@link recordOAuthLinkEmail} there.
 *
 * The row holds the address the provider proved at the last sign-in through it, so a link made
 * before this existed (no email; migration 0045 cleared the rest) is bound the next time the user
 * signs in with that provider. A provider that reports the address but says it is not verified
 * (`email_verified: false`, Google's older `verified_email: false`) clears it: the link then proves
 * no address. A profile with no address at all (a declined email scope, a failed GitHub
 * `/user/emails` call) says nothing new, so the row keeps what it had.
 *
 * Kept free of database imports so it can be unit-tested.
 */

/** Reads the provider's `email_verified` style claim; `false` only when the provider says so. */
function saysUnverified(value: unknown): boolean {
	return value === false || (typeof value === 'string' && value.trim().toLowerCase() === 'false');
}

/**
 * The address the provider profile vouches for, trimmed and lower-cased, or `null` when it has none
 * or says it is not verified.
 */
export function providerProvenEmail(profile: unknown): string | null {
	if (!profile || typeof profile !== 'object') return null;
	const { email, email_verified: emailVerified, verified_email: verifiedEmail } = profile as Record<string, unknown>;
	if (typeof email !== 'string' || !email.trim()) return null;
	if (saysUnverified(emailVerified) || saysUnverified(verifiedEmail)) return null;
	return email.trim().toLowerCase();
}

/** The `account` Auth.js passes to `events.signIn`. */
export interface SignInAccount {
	type?: string | null;
	provider?: string | null;
	providerAccountId?: string | null;
}

/** Sets `accounts.email` on the OAuth / OIDC row `(provider, providerAccountId)`. */
export type OAuthLinkEmailWriter = (
	provider: string,
	providerAccountId: string,
	email: string | null
) => Promise<unknown>;

/**
 * Writes the provider-proven address (or `null` for an address the provider says is unverified) on
 * the account row of an OAuth / OIDC sign-in. Returns false, writing nothing, for any other sign-in
 * (credentials, email link), an account without a provider id, or a profile with no address.
 */
export async function recordOAuthLinkEmail(
	account: SignInAccount | null | undefined,
	profile: unknown,
	write: OAuthLinkEmailWriter
): Promise<boolean> {
	if (!account || typeof account.type !== 'string' || !isOAuthAccountType(account.type)) return false;
	const { provider, providerAccountId } = account;
	if (typeof provider !== 'string' || !provider || typeof providerAccountId !== 'string' || !providerAccountId) {
		return false;
	}
	const reported = profile && typeof profile === 'object' ? (profile as Record<string, unknown>).email : undefined;
	if (typeof reported !== 'string' || !reported.trim()) return false;
	await write(provider, providerAccountId, providerProvenEmail(profile));
	return true;
}
