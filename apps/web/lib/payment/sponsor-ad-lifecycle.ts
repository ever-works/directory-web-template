import type { SponsorAdStatusValues } from '@/lib/db/schema';

/**
 * What a relayed Stripe event may do to a sponsor ad in a given status (billing audit
 * 2026-09-28, CC05-04 review).
 *
 * Every relayed event the directory cannot fulfil is answered with 502, and the platform
 * relays a 5xx back to Stripe as a retry, for up to about three days. A retry carries the
 * SAME payload and meets the SAME ad, so an outcome that no retry can change must be
 * acknowledged (and logged loudly), never thrown:
 *
 * - the ad no longer exists, or is in a status the action can never apply to
 *   (cancelled / rejected / expired for a cancellation; cancelled / rejected for a renewal);
 * - the event's metadata names no ad, or names two different ads.
 *
 * Only a status that can still change into an actionable one stays retryable: a renewal
 * paid while the ad is still pending (payment or admin review).
 *
 * Nothing in the app cancels the Stripe subscription when an ad is cancelled by its owner
 * or rejected by an admin, so those ads keep billing and their cycle invoices keep
 * arriving. That is a separate product finding; here they are acknowledged, not looped.
 *
 * The service (`sponsor-ad.service.ts`) uses the same tables, so the webhook and the
 * service cannot drift apart on which statuses are renewable or cancellable.
 */

/** `act` = apply the change; `acknowledge` = log and answer 200; `retry` = answer 502. */
export type SponsorAdEventDecision = 'act' | 'acknowledge' | 'retry';

const RENEWAL_BY_STATUS: Record<SponsorAdStatusValues, SponsorAdEventDecision> = {
	active: 'act',
	expired: 'act',
	// The owner cancelled or an admin rejected the ad, but the subscription still bills.
	cancelled: 'acknowledge',
	rejected: 'acknowledge',
	// Payment confirmation or admin review may still land; a retry can succeed.
	pending_payment: 'retry',
	pending: 'retry'
};

const CANCELLATION_BY_STATUS: Record<SponsorAdStatusValues, SponsorAdEventDecision> = {
	pending_payment: 'act',
	pending: 'act',
	active: 'act',
	// Already over: a cancellation (or a duplicate delivery of one) has nothing to do.
	cancelled: 'acknowledge',
	expired: 'acknowledge',
	rejected: 'acknowledge'
};

const ACTIVATION_BY_STATUS: Record<SponsorAdStatusValues, SponsorAdEventDecision> = {
	pending_payment: 'act',
	// Payment already confirmed (a duplicate delivery), or the ad moved on since.
	pending: 'acknowledge',
	active: 'acknowledge',
	expired: 'acknowledge',
	cancelled: 'acknowledge',
	rejected: 'acknowledge'
};

function decide(
	table: Record<SponsorAdStatusValues, SponsorAdEventDecision>,
	status: string | null | undefined
): SponsorAdEventDecision {
	// A missing ad, or a status this code does not know, will not change on a retry.
	if (!status) return 'acknowledge';
	return Object.prototype.hasOwnProperty.call(table, status) ? table[status as SponsorAdStatusValues] : 'acknowledge';
}

/** May a paid renewal period extend an ad in this status? `null`/`undefined` = ad not found. */
export function sponsorAdRenewalDecision(status: string | null | undefined): SponsorAdEventDecision {
	return decide(RENEWAL_BY_STATUS, status);
}

/** May a deleted subscription cancel an ad in this status? `null`/`undefined` = ad not found. */
export function sponsorAdCancellationDecision(status: string | null | undefined): SponsorAdEventDecision {
	return decide(CANCELLATION_BY_STATUS, status);
}

/** May a created subscription confirm payment for an ad in this status? */
export function sponsorAdActivationDecision(status: string | null | undefined): SponsorAdEventDecision {
	return decide(ACTIVATION_BY_STATUS, status);
}

/**
 * Where a renewed period starts: at the current end date while it is still ahead, or now.
 *
 * Starting from a past end date would "renew" an ad that expired more than one interval
 * ago into a period that is already over (a weekly ad that expired three weeks ago came
 * out ACTIVE with an end date two weeks in the past).
 */
export function renewalStartDate(currentEndDate: Date | null | undefined, now: Date = new Date()): Date {
	if (currentEndDate && currentEndDate.getTime() > now.getTime()) return new Date(currentEndDate);
	return new Date(now);
}
