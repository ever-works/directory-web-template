import type Stripe from 'stripe';

import type { WebhookResult } from '../../types/payment-types';

/**
 * Maps a Stripe event onto this app's generic webhook shape.
 *
 * Extracted verbatim from `StripeProvider.handleWebhook` so it has exactly ONE
 * definition. Two callers need it and they authenticate differently:
 *
 *  - `POST /api/stripe/webhook`         — Stripe signs it; the provider verifies
 *                                          with `constructEvent`, then maps.
 *  - `POST /api/stripe/platform-webhook` — the Ever Works platform relay signs it
 *                                          (the Stripe signature was already
 *                                          verified once, centrally), so there is
 *                                          no `stripe-signature` to reconstruct
 *                                          and `constructEvent` cannot be used.
 *
 * Keeping the mapping here means a new event type is wired up once and both
 * paths agree. See `EVER_WORKS_STRIPE_WEBHOOK_RELAY.md` in `ever-works/workspace`.
 *
 * 🛑 This function performs NO authentication. Every caller must have
 * established authenticity before calling it.
 */
export function mapStripeEventToWebhookResult(event: Stripe.Event): WebhookResult {
	let eventType: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let eventData: any = {};

	switch (event.type) {
		case 'payment_intent.succeeded':
			eventType = 'payment_succeeded';
			eventData = event.data.object;
			break;
		case 'payment_intent.payment_failed':
			eventType = 'payment_failed';
			eventData = event.data.object;
			break;
		case 'customer.subscription.created':
			eventType = 'subscription_created';
			eventData = event.data.object;
			break;
		case 'customer.subscription.updated':
			eventType = 'subscription_updated';
			eventData = event.data.object;
			break;
		case 'customer.subscription.deleted':
			eventType = 'subscription_cancelled';
			eventData = event.data.object;
			break;
		case 'customer.subscription.trial_will_end':
			eventType = 'subscription_trial_ending';
			eventData = event.data.object;
			break;
		case 'invoice.payment_succeeded':
			eventType = 'subscription_payment_succeeded';
			eventData = event.data.object;
			break;
		case 'invoice.payment_failed':
			eventType = 'subscription_payment_failed';
			eventData = event.data.object;
			break;
		default:
			// Unknown types are passed through rather than dropped: the route's
			// `switch` falls through to `default` and no-ops, which is what makes
			// an unknown-type probe a safe liveness check.
			eventType = event.type;
			eventData = event.data.object;
	}

	return {
		received: true,
		type: eventType,
		id: event.id,
		data: eventData
	};
}
