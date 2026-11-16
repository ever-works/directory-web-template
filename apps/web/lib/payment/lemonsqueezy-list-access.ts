export type ListEmailDecision = { allowed: true; email: string } | { allowed: false };

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
