export type ListEmailDecision = { allowed: true; email: string } | { allowed: false };

/**
 * Decide whose subscriptions `/api/lemonsqueezy/list` may return.
 *
 * Without a requested email, or with the caller's own email, the session email
 * is used. Another customer's email is only honoured for admins; everyone else
 * is refused so a query parameter can never widen what a user can read.
 */
export function resolveListCustomerEmail(
	session: { email: string; isAdmin?: boolean | null },
	requestedEmail?: string | null
): ListEmailDecision {
	const requested = requestedEmail?.trim();
	if (!requested || requested.toLowerCase() === session.email.trim().toLowerCase()) {
		return { allowed: true, email: session.email };
	}
	if (session.isAdmin === true) {
		return { allowed: true, email: requested };
	}
	return { allowed: false };
}
