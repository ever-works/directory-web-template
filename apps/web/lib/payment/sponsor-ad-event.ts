/**
 * Recognises Stripe objects that belong to a SPONSOR AD rather than to a plan
 * subscription, and decides what a sponsor-ad invoice means (billing audit
 * 2026-09-28, CC05-04).
 *
 * WHY THIS FILE EXISTS
 *
 * The sponsor-ad checkouts stamp a marker and `sponsorAdId` on the Checkout
 * Session and on the subscription (`subscription_data.metadata`):
 *
 *   - `type: 'sponsor_ad'`         — the first purchase
 *                                    (`app/api/sponsor-ads/checkout/route.ts`);
 *   - `type: 'sponsor_ad_renewal'` — a renewal bought for an ACTIVE or EXPIRED ad
 *                                    (`app/api/sponsor-ads/user/[id]/renew/route.ts`),
 *                                    which creates a NEW subscription.
 *
 * The webhook dispatch used to look for `sponsor_ad` only on `object.metadata`,
 * `object.subscription_data.metadata` and `object.subscription.metadata`, and never
 * for `sponsor_ad_renewal` at all. A subscription event carries the marker on
 * `metadata`, so a first purchase's creation and cancellation were recognised — but
 * an INVOICE never is: Stripe sends `invoice.subscription` as a bare id (never
 * expanded in a webhook) and puts the subscription's metadata on
 * `invoice.subscription_details.metadata` (API versions up to 2025-03) or
 * `invoice.parent.subscription_details.metadata` (2025-03-31 and later), and on each
 * subscription line's `metadata`.
 *
 * So every sponsor-ad invoice, and every event of a renewal subscription, fell
 * through to the PLAN path: `webhookSubscriptionService` found no plan subscription
 * for the id and created one, and the buyer got a plan email — a sponsor renewal was
 * booked as a plan purchase, and the sponsor ad itself was never extended.
 *
 * The lookup order is the one `relay-work-id.ts` uses for `work_id`, so the relay's
 * routing key and this classification read the same places — except that invoice
 * LINES count only when they bill a subscription, so a one-off invoice item carrying
 * someone else's metadata cannot reclassify a plan invoice.
 *
 * Kept free of DB / email imports so it can be unit-tested on its own.
 */

/** The marker the first sponsor-ad checkout stamps on every object it creates. */
export const SPONSOR_AD_TYPE = 'sponsor_ad';
/** The marker the renewal checkout stamps on the NEW subscription it creates. */
export const SPONSOR_AD_RENEWAL_TYPE = 'sponsor_ad_renewal';

/** `new` = the first purchase of an ad; `renewal` = a renewal subscription for an existing ad. */
export type SponsorAdKind = 'new' | 'renewal';

export interface SponsorAdMarker {
	kind: SponsorAdKind;
	/** The id from the metadata bag that carries the marker; null when absent or ambiguous. */
	sponsorAdId: string | null;
	/** True when two marked bags name different sponsor ads — never act on such an event. */
	conflict: boolean;
}

type MetadataRecord = Record<string, unknown>;

function asRecord(value: unknown): MetadataRecord | undefined {
	return value && typeof value === 'object' ? (value as MetadataRecord) : undefined;
}

/** An invoice line that bills a subscription (pre- and post-2025-03-31 line shapes). */
function isSubscriptionLine(line: MetadataRecord): boolean {
	return line.type === 'subscription' || asRecord(line.parent)?.type === 'subscription_item_details';
}

/**
 * Every metadata bag a Stripe webhook object can carry the sponsor marker in,
 * most specific first.
 */
function metadataCandidates(object: unknown): MetadataRecord[] {
	const source = asRecord(object);
	if (!source) return [];

	let candidates: Array<MetadataRecord | undefined> = [
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
			const record = asRecord(line);
			if (record && isSubscriptionLine(record)) candidates.push(asRecord(record.metadata));
		}
	}

	return candidates.filter((candidate): candidate is MetadataRecord => candidate !== undefined);
}

function kindOf(metadata: MetadataRecord): SponsorAdKind | null {
	if (metadata.type === SPONSOR_AD_TYPE) return 'new';
	if (metadata.type === SPONSOR_AD_RENEWAL_TYPE) return 'renewal';
	return null;
}

function idOf(metadata: MetadataRecord): string | null {
	const id = metadata.sponsorAdId;
	return typeof id === 'string' && id.trim() ? id.trim() : null;
}

/**
 * The sponsor-ad marker on the object, or null when it is not a sponsor-ad object.
 *
 * Kind and id are both read from the bags that CARRY the marker, so an unmarked bag
 * (an invoice's own `metadata`, say) can never supply the id of the ad to extend.
 */
export function readSponsorAdMarker(object: unknown): SponsorAdMarker | null {
	const marked = metadataCandidates(object).filter((metadata) => kindOf(metadata) !== null);
	if (marked.length === 0) return null;

	const ids = new Set(marked.map(idOf).filter((id): id is string => id !== null));
	const conflict = ids.size > 1;
	return {
		kind: kindOf(marked[0]) as SponsorAdKind,
		sponsorAdId: conflict ? null : (ids.values().next().value ?? null),
		conflict
	};
}

/** True when any metadata location on the object marks it as a sponsor ad (first purchase or renewal). */
export function isSponsorAdObject(object: unknown): boolean {
	return readSponsorAdMarker(object) !== null;
}

/** The sponsor ad id from the marked metadata, or null (absent, or conflicting marked ids). */
export function readSponsorAdId(object: unknown): string | null {
	return readSponsorAdMarker(object)?.sponsorAdId ?? null;
}

/**
 * What a paid sponsor-ad invoice should do.
 *
 * - `renew`   — a paid period that extends the ad:
 *               `billing_reason: 'subscription_cycle'` (any sponsor subscription), or
 *               `'subscription_create'` on a RENEWAL subscription — that first invoice
 *               IS the renewal payment, and nothing else would extend the ad.
 * - `initial` — `'subscription_create'` on a first purchase. Activation is
 *               `customer.subscription.created`'s job (`confirmPayment`), and
 *               `renewSponsorAd` would refuse an ad that is still pending payment or
 *               review — which, through the relay, is a retry that can never succeed.
 *               Acknowledge only.
 * - `other`   — anything else (`subscription_update` proration, `manual`, missing
 *               reason): nothing to extend. Acknowledge only.
 */
export type SponsorAdInvoiceAction = 'renew' | 'initial' | 'other';

export function sponsorAdInvoiceAction(invoice: unknown, kind: SponsorAdKind = 'new'): SponsorAdInvoiceAction {
	const reason = asRecord(invoice)?.billing_reason;
	if (reason === 'subscription_cycle') return 'renew';
	if (reason === 'subscription_create') return kind === 'renewal' ? 'renew' : 'initial';
	return 'other';
}
