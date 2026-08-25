import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { verifyPlatformSignature } from '@/lib/services/platform-activity-feed/hmac';
import { mapStripeEventToWebhookResult } from '@/lib/payment/lib/providers/stripe-event-map';
import { dispatchWebhookEvent } from '@/lib/payment/webhook-dispatch';
import { RelayEventCoordinator } from '@/lib/payment/relay-event-coordinator';
import { extractRelayWorkId } from '@/lib/payment/relay-work-id';

/**
 * Inbound endpoint for the Ever Works **shared Stripe webhook relay**.
 *
 * Stripe caps an account at 16 live webhook endpoints, so one endpoint per
 * directory cannot scale — the shared account is already full and several
 * directories have none. The platform therefore owns a SINGLE Stripe endpoint,
 * verifies the Stripe signature once, resolves the owning Work from
 * `metadata.work_id`, and forwards the event here.
 *
 * Spec: `EVER_WORKS_STRIPE_WEBHOOK_RELAY.md` in `ever-works/workspace`.
 *
 * ## Authentication
 *
 * Deliberately NOT a Stripe signature — this request comes from the platform,
 * not Stripe, so there is no `stripe-signature` to reconstruct. It reuses the
 * platform→site HMAC channel already shipped for the activity feed:
 *
 *   Authorization: Bearer HMAC-SHA256(PLATFORM_SYNC_SECRET,
 *                                     `${timestamp}:${sha256(rawBody)}:${workId}`)
 *   x-platform-ts: <ISO timestamp>
 *
 * The body **digest** occupies the slot the activity feed uses for its
 * canonical query, so `verifyPlatformSignature` is reused unchanged — same
 * ±5-minute drift window, same `timingSafeEqual` comparison, same reason codes.
 * The workId is inside the signed payload, so a signature leaked from one
 * directory cannot be replayed against another.
 *
 * 🛑 The raw body must be signed and verified byte-for-byte. Re-serialising the
 * JSON changes the digest and every request fails.
 *
 * Fulfilment is shared with the direct route via `lib/payment/webhook-dispatch.ts`,
 * so both delivery paths run one definition of the payment handlers.
 */

/** Status codes follow the activity-feed convention so the platform can classify. */
const NOT_PROVISIONED = 503; // platform sync not configured here
const UNAUTHORIZED = 401; // any signature-related failure

/**
 * Event ids already handled, so a Stripe retry (or a relay retry) is a no-op.
 *
 * In-memory and therefore per-pod: it collapses the common burst case without a
 * schema change. It is NOT a correctness guarantee across pods or restarts —
 * the handlers must stay idempotent in their own right, which is the same
 * assumption the direct `/api/stripe/webhook` route already makes.
 */
const relayEvents = new RelayEventCoordinator();

export async function POST(request: NextRequest): Promise<NextResponse> {
	const secret = process.env.PLATFORM_SYNC_SECRET;
	const workId = process.env.PLATFORM_WORK_ID || process.env.WORK_ID;

	if (!secret || !workId) {
		return NextResponse.json(
			{ error: 'platform sync not configured on this directory' },
			{ status: NOT_PROVISIONED }
		);
	}

	// Read the body EXACTLY as sent — the signature covers these bytes.
	const rawBody = await request.text();
	const bodyDigest = createHash('sha256').update(rawBody, 'utf8').digest('hex');

	const verdict = verifyPlatformSignature({
		authorizationHeader: request.headers.get('authorization'),
		timestampHeader: request.headers.get('x-platform-ts'),
		canonicalQuery: bodyDigest,
		workId,
		secret
	});
	if (!verdict.ok) {
		return NextResponse.json({ error: 'unauthorized', reason: verdict.reason }, { status: UNAUTHORIZED });
	}

	let event: Stripe.Event;
	try {
		event = JSON.parse(rawBody) as Stripe.Event;
	} catch {
		// 400, not 500: a malformed body is the sender's bug and retrying cannot help.
		return NextResponse.json({ error: 'invalid json' }, { status: 400 });
	}

	if (!event?.id || !event?.type) {
		return NextResponse.json({ error: 'not a stripe event' }, { status: 400 });
	}

	// Reject an event routed to the wrong directory even if the signature checks
	// out, so a platform-side routing bug cannot cross-contaminate two sites.
	const eventWorkId = extractRelayWorkId(event);
	if (!eventWorkId || eventWorkId !== workId) {
		return NextResponse.json(
			{ error: eventWorkId ? 'event does not belong to this directory' : 'event has no ownership key' },
			{ status: 409 }
		);
	}

	const result = mapStripeEventToWebhookResult(event);

	// The Stripe signature was verified once, centrally, by the platform before it
	// relayed this event; the request's authenticity was established above by the
	// platform HMAC. From here the event is fulfilled by EXACTLY the same code as a
	// direct Stripe delivery — a subscription activated via the relay is activated
	// by the same handler as one activated directly.
	//
	const outcome = await relayEvents.process(event.id, () => dispatchWebhookEvent(result));
	if (outcome === 'duplicate') {
		return NextResponse.json({ received: true, duplicate: true });
	}
	if (outcome === 'retry') {
		// 503 is reserved for "platform sync not provisioned". Use 502 here so
		// operators can distinguish a transient fulfilment failure; the platform
		// safely propagates every site 5xx as a Stripe retry.
		return NextResponse.json({ received: false, retry: true }, { status: 502 });
	}

	return NextResponse.json({ received: true, type: result.type, dispatched: true });
}
