/**
 * Recognises Stripe objects that belong to a SPONSOR AD rather than to a plan
 * subscription, and decides what a sponsor-ad invoice means (billing audit
 * 2026-09-28, CC05-04).
 *
 * WHY THIS FILE EXISTS
 *
 * The sponsor-ad checkout (`app/api/sponsor-ads/checkout/route.ts`) stamps
 * `type: 'sponsor_ad'` and `sponsorAdId` on the Checkout Session and on the
 * subscription (`subscription_data.metadata`). The webhook dispatch used to look
 * for that marker only on `object.metadata`, `object.subscription_data.metadata`
 * and `object.subscription.metadata`. A subscription event carries it on
 * `metadata`, so creation and cancellation were recognised — but an INVOICE never
 * does: Stripe sends `invoice.subscription` as a bare id (never expanded in a
 * webhook) and puts the subscription's metadata on
 * `invoice.subscription_details.metadata` (API versions up to 2025-03) or
 * `invoice.parent.subscription_details.metadata` (2025-03-31 and later), and on
 * each subscription line's `metadata`.
 *
 * So every sponsor-ad invoice fell through to the PLAN path:
 * `webhookSubscriptionService.handleSubscriptionPaymentSucceeded` found no plan
 * subscription for the id and created one from the invoice, and the buyer got a
 * plan "payment succeeded" email — a sponsor renewal was booked as a plan
 * purchase, and the sponsor ad itself was never extended. The same fall-through
 * hit `customer.subscription.updated`, which the dispatch never checked for the
 * marker at all and which the plan service also turns into a new plan
 * subscription when it cannot find one.
 *
 * The lookup order is the one `relay-work-id.ts` uses for `work_id`, so the
 * relay's routing key and this classification read the same places.
 *
 * Kept free of DB / email imports so it can be unit-tested on its own.
 */

/** The metadata value the sponsor-ad checkout stamps on every object it creates. */
export const SPONSOR_AD_TYPE = 'sponsor_ad';

type MetadataRecord = Record<string, unknown>;

function asRecord(value: unknown): MetadataRecord | undefined {
	return value && typeof value === 'object' ? (value as MetadataRecord) : undefined;
}

/**
 * Every metadata bag a Stripe webhook object can carry the sponsor marker in,
 * most specific first.
 */
function metadataCandidates(object: unknown): MetadataRecord[] {
	const source = asRecord(object);
	if (!source) return [];

	const candidates: Array<MetadataRecord | undefined> = [
		asRecord(source.metadata),
		// Checkout Session (`subscription_data`) and an expanded subscription.
		asRecord(asRecord(source.subscription_data)?.metadata),
		asRecord(asRecord(source.subscription)?.metadata),
		// Invoice, API 2025-03-31 and later.
		asRecord(asRecord(asRecord(source.parent)?.subscription_details)?.metadata),
		// Invoice, earlier API versions.
		asRecord(asRecord(source.subscription_details)?.metadata)
	];

	const lines = asRecord(source.lines)?.data;
	if (Array.isArray(lines)) {
		for (const line of lines) {
			candidates.push(asRecord(asRecord(line)?.metadata));
		}
	}

	return candidates.filter((candidate): candidate is MetadataRecord => candidate !== undefined);
}

/** True when any metadata location on the object marks it as a sponsor ad. */
export function isSponsorAdObject(object: unknown): boolean {
	return metadataCandidates(object).some((metadata) => metadata.type === SPONSOR_AD_TYPE);
}

/** The sponsor ad id from the first metadata location that carries one, or null. */
export function readSponsorAdId(object: unknown): string | null {
	for (const metadata of metadataCandidates(object)) {
		const id = metadata.sponsorAdId;
		if (typeof id === 'string' && id.trim()) return id.trim();
	}
	return null;
}

/**
 * What a paid sponsor-ad invoice should do.
 *
 * - `renew`        — `billing_reason: 'subscription_cycle'`: a new period was paid
 *                    for, so the ad's end date moves forward.
 * - `initial`      — `billing_reason: 'subscription_create'`: the first payment.
 *                    Activation is `customer.subscription.created`'s job
 *                    (`confirmPayment`), and `renewSponsorAd` would refuse an ad
 *                    that is still pending payment or review — which, through the
 *                    relay, is a retry that can never succeed. Acknowledge only.
 * - `other`        — anything else (`subscription_update` proration, `manual`,
 *                    missing reason): nothing to extend. Acknowledge only.
 */
export type SponsorAdInvoiceAction = 'renew' | 'initial' | 'other';

export function sponsorAdInvoiceAction(invoice: unknown): SponsorAdInvoiceAction {
	const reason = asRecord(invoice)?.billing_reason;
	if (reason === 'subscription_cycle') return 'renew';
	if (reason === 'subscription_create') return 'initial';
	return 'other';
}
