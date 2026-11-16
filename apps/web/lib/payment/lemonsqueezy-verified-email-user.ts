import { isEmailVerifiedForOwnership, type EmailVerificationLookup } from './subscription-ownership';

/**
 * Finds the user a LemonSqueezy purchase belongs to when the event carries no user id in its custom
 * data (spec 060 R14): a checkout link can be opened without our checkout route, so only the
 * customer's email is known.
 *
 * The email is buyer-controlled, so a user is returned only when the address is proven to be theirs:
 * `users.emailVerified`, or a linked OAuth / OIDC account for a user without a password
 * (`isEmailVerifiedForOwnership`, the rule the LemonSqueezy management routes use). Anything else
 * returns `null` and the event is handled as before (no user, nothing written, redelivered).
 *
 * The lookups are injected so this can be unit-tested without a database.
 */
export interface VerifiedEmailUserDeps {
	/** `getUserByEmail`: the user with that exact email, or `null`. */
	getUserByEmail: (email: string) => Promise<{ id: string } | null | undefined>;
	/** `loadEmailVerificationState`. */
	loadVerificationState: EmailVerificationLookup;
}

export function createVerifiedEmailUserFinder(deps: VerifiedEmailUserDeps) {
	return async function findUserIdByVerifiedEmail(email: string | null | undefined): Promise<string | null> {
		if (typeof email !== 'string' || !email.trim()) return null;
		const trimmed = email.trim();
		// Stored addresses are matched exactly; the provider may have lower-cased the one it holds.
		const candidates = trimmed === trimmed.toLowerCase() ? [trimmed] : [trimmed, trimmed.toLowerCase()];
		for (const candidate of candidates) {
			const user = await deps.getUserByEmail(candidate);
			if (!user) continue;
			return (await isEmailVerifiedForOwnership(user.id, candidate, deps.loadVerificationState)) ? user.id : null;
		}
		return null;
	};
}
