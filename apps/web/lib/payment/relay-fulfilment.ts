/** Convert a logged service-level failure into a relay-level retry signal. */
export function assertRelayFulfilment(success: boolean, label: string): asserts success {
	if (!success) throw new Error(`${label} failed`);
}

/**
 * Record a failed customer NOTIFICATION without failing the webhook (billing audit
 * 2026-09-28, CC05-03).
 *
 * An email is a courtesy, not fulfilment. The payment handlers used to pass a failed
 * send to `assertRelayFulfilment`, so a directory with no email provider configured
 * (every send returns "Email service not configured") answered every relayed plan
 * event with 502. The platform relays a 5xx back to Stripe as a retry, Stripe retried
 * for days, and each retry re-ran the database side of an event that had already
 * been fulfilled — for a failure no retry could ever fix.
 *
 * Use this for the email step ONLY. A failed database or sponsor-ad update still goes
 * through `assertRelayFulfilment`: that is real fulfilment, and a retry can fix it.
 *
 * Returns the line it logged so a test can pin the wording operators grep for.
 */
export function reportNotificationFailure(label: string, error: unknown): string {
	const reason = error instanceof Error ? error.message : typeof error === 'string' ? error : 'unknown error';
	const line = `⚠️ ${label} not sent (${reason}); the event is still acknowledged — notifications are not retried`;
	console.error(line);
	return line;
}
