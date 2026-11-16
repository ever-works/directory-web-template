export type ListEmailDecision = { allowed: true; email: string } | { allowed: false };

export type ListAccessDecision =
	| { allowed: true; email: string }
	| { allowed: false; reason: 'ACCESS_DENIED' | 'EMAIL_NOT_VERIFIED' };

/** The lookups {@link resolveListAccess} needs; the route passes the database-backed ones. */
export interface ListAccessChecks {
	/** Live role lookup (`isAdmin` in `lib/db/roles`), never the JWT claim. */
	isAdmin: (userId: string) => Promise<boolean>;
	/** `isEmailVerifiedForOwnership` bound to `loadEmailVerificationState`. */
	isEmailVerified: (userId: string | null | undefined, email: string) => Promise<boolean>;
}

/**
 * True when `requestedEmail` names someone other than the signed-in user (compared
 * trimmed and case-insensitively). Only then does the route need the admin lookup.
 */
export function requestsAnotherCustomer(sessionEmail: string, requestedEmail?: string | null): boolean {
	const requested = requestedEmail?.trim();
	return !!requested && requested.toLowerCase() !== sessionEmail.trim().toLowerCase();
}

/**
 * Decide whose subscriptions `/api/lemonsqueezy/list` may return.
 *
 * Without a requested email, or with the caller's own email, the session email
 * is used. Another customer's email is only honoured for admins; everyone else
 * is refused so a query parameter can never widen what a user can read.
 *
 * `isAdmin` must come from a live role lookup, not the JWT claim, which stays
 * set for the token's 30-day lifetime after the role is removed.
 */
export function resolveListCustomerEmail(
	session: { email: string; isAdmin?: boolean | null },
	requestedEmail?: string | null
): ListEmailDecision {
	if (!requestsAnotherCustomer(session.email, requestedEmail)) {
		return { allowed: true, email: session.email };
	}
	if (session.isAdmin === true) {
		return { allowed: true, email: requestedEmail!.trim() };
	}
	return { allowed: false };
}

/**
 * Whose LemonSqueezy purchases `/api/lemonsqueezy/list` (GET and POST) may return,
 * decided before LemonSqueezy is called.
 *
 * - Another customer's email: only for a live admin (the role lookup runs only then);
 *   everyone else is `ACCESS_DENIED`. The caller's own email verification is not
 *   consulted: the admin role is granted by an operator and cannot be obtained by
 *   registering someone else's address, and the email being read is not the admin's.
 * - The caller's own email: the list matches purchases by that address, and credentials
 *   sign-up does not verify it, so someone who registered another person's address first
 *   would read that person's purchases. It is only returned when the address is verified
 *   (`EMAIL_NOT_VERIFIED` otherwise), the same rule the four LemonSqueezy write routes use.
 */
export async function resolveListAccess(
	user: { id?: string | null; email: string },
	requestedEmail: string | null | undefined,
	checks: ListAccessChecks
): Promise<ListAccessDecision> {
	if (requestsAnotherCustomer(user.email, requestedEmail)) {
		const callerIsAdmin = user.id ? await checks.isAdmin(user.id) : false;
		const decision = resolveListCustomerEmail({ email: user.email, isAdmin: callerIsAdmin }, requestedEmail);
		return decision.allowed ? decision : { allowed: false, reason: 'ACCESS_DENIED' };
	}
	if (!(await checks.isEmailVerified(user.id, user.email))) {
		return { allowed: false, reason: 'EMAIL_NOT_VERIFIED' };
	}
	return { allowed: true, email: user.email };
}
