/**
 * Stop the provider subscription behind a sponsor ad that the app itself ends
 * (billing audit 2026-10-03, "in-app sponsor-ad cancel doesn't cancel the Stripe subscription").
 *
 * Before this, cancelling an ad from the client dashboard or the admin panel, or rejecting a
 * paid ad, only changed the row. The Stripe subscription kept billing every cycle, and each
 * cycle invoice arrived for an ad that could no longer be renewed (see
 * `sponsor-ad-lifecycle.ts`, which acknowledges those invoices instead of looping on them).
 *
 * Rules:
 * - **Provider first, row second.** The caller marks the ad cancelled/rejected only after this
 *   resolves. If the provider call fails, the ad stays as it was and the user can retry, so
 *   the app never shows "cancelled" while the card keeps being charged. If the provider call
 *   succeeds and the row update then fails, the provider's own "subscription deleted" webhook
 *   cancels the ad (the cancellation table answers `act` for pending/active ads).
 * - **Immediate, not at period end.** The cancel dialog promises: "Your sponsorship will be
 *   cancelled immediately and you will lose any remaining time." No refund is issued here.
 * - **Webhook-driven cancels must NOT call this**: there the subscription is already gone.
 * - A subscription the provider reports as missing or already cancelled counts as stopped.
 */

/** The fields of a sponsor ad this helper reads. */
export interface SponsorAdSubscriptionRef {
	paymentProvider?: string | null;
	subscriptionId?: string | null;
}

/** The one provider capability this helper needs (every payment provider implements it). */
export interface SubscriptionCanceller {
	cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<unknown>;
}

export type SubscriptionProviderResolver = (providerName: string) => SubscriptionCanceller;

/**
 * `no-subscription` = nothing to stop (e.g. checkout never completed);
 * `cancelled` = the provider cancelled it now;
 * `already-ended` = the provider says it no longer exists or is already cancelled.
 */
export type SponsorAdSubscriptionStop = 'no-subscription' | 'cancelled' | 'already-ended';

const DEFAULT_PROVIDER = 'stripe';

/** True when the provider error means the subscription is already gone, so there is nothing left to stop. */
export function isSubscriptionAlreadyEnded(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false;
	const { code, statusCode, message } = error as { code?: unknown; statusCode?: unknown; message?: unknown };
	if (code === 'resource_missing' || statusCode === 404) return true;
	return typeof message === 'string' && /already (been )?cancel(l)?ed|no such subscription/i.test(message);
}

export async function stopSponsorAdSubscription(
	ad: SponsorAdSubscriptionRef,
	resolveProvider: SubscriptionProviderResolver
): Promise<SponsorAdSubscriptionStop> {
	const subscriptionId = ad.subscriptionId?.trim();
	if (!subscriptionId) return 'no-subscription';

	const provider = resolveProvider(ad.paymentProvider?.trim() || DEFAULT_PROVIDER);
	try {
		await provider.cancelSubscription(subscriptionId, false);
		return 'cancelled';
	} catch (error) {
		if (isSubscriptionAlreadyEnded(error)) return 'already-ended';
		throw error;
	}
}
