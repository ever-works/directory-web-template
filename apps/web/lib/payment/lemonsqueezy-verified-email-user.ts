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
	/**
	 * The users whose email equals this one ignoring case (two are enough to see it is ambiguous).
	 * Used only when no exact spelling matched: LemonSqueezy may hold the address lower-cased while
	 * an OAuth provider stored it with capitals.
	 */
	getUsersByEmailIgnoringCase?: (email: string) => Promise<ReadonlyArray<{ id: string }>>;
	/** `loadEmailVerificationState`. */
	loadVerificationState: EmailVerificationLookup;
}

export function createVerifiedEmailUserFinder(deps: VerifiedEmailUserDeps) {
	const verifiedUserId = async (userId: string, email: string) =>
		(await isEmailVerifiedForOwnership(userId, email, deps.loadVerificationState)) ? userId : null;

	return async function findUserIdByVerifiedEmail(email: string | null | undefined): Promise<string | null> {
		if (typeof email !== 'string' || !email.trim()) return null;
		const trimmed = email.trim();
		// Exact spellings first: the provider may have lower-cased the address it holds.
		const candidates = trimmed === trimmed.toLowerCase() ? [trimmed] : [trimmed, trimmed.toLowerCase()];
		for (const candidate of candidates) {
			const user = await deps.getUserByEmail(candidate);
			if (!user) continue;
			return verifiedUserId(user.id, candidate);
		}

		// No exact spelling is stored, but a mixed-case one may be. Two users that differ only in case
		// cannot say whose purchase it is, so that matches nobody.
		if (!deps.getUsersByEmailIgnoringCase) return null;
		const users = await deps.getUsersByEmailIgnoringCase(trimmed);
		return users.length === 1 ? verifiedUserId(users[0].id, trimmed) : null;
	};
}
