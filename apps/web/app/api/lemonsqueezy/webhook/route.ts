import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { WebhookEventType } from '@/lib/payment/types/payment-types';
import {
    paymentEmailService,
    extractCustomerInfo,
    formatAmount,
    formatPaymentMethod
} from '@/lib/payment/services/payment-email.service';

// Import server configuration utility
import { getEmailConfig } from '@/lib/config/server-config';
import { WebhookSubscriptionService } from '@/lib/services/webhook-subscription.service';
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';
import { getOrCreateLemonsqueezyProvider } from '@/lib/auth';
import { PaymentProvider } from '@/lib/constants';
import { RelayEventCoordinator } from '@/lib/payment/relay-event-coordinator';
import { getLemonSqueezyEventKey, parseLemonSqueezyEvent, toOrderEmailData } from '@/lib/payment/lemonsqueezy-webhook';
import { createLemonSqueezySubscriptionEvents } from '@/lib/payment/lemonsqueezy-subscription-events';
import { loadLemonSqueezyVariantCatalog } from '@/lib/payment/lemonsqueezy-variant-catalog';
import { createLemonSqueezyPriceLoader } from '@/lib/payment/lemonsqueezy-price';
import { createVerifiedEmailUserFinder } from '@/lib/payment/lemonsqueezy-verified-email-user';
import { getUsersByEmailIgnoringCase, loadEmailVerificationState } from '@/lib/payment/subscription-email-verification';
import { getUserByEmail } from '@/lib/db/queries';

// Rows must be stored under the LemonSqueezy provider (the default is Stripe).
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.LEMONSQUEEZY);

// Plans come from the paid variant and sponsor ads from variant + binding, never from the
// buyer-controlled custom data (spec 060 R9-R11).
const subscriptionEvents = createLemonSqueezySubscriptionEvents({
	plans: webhookSubscriptionService,
	sponsorAds: sponsorAdService,
	loadVariantCatalog: loadLemonSqueezyVariantCatalog,
	// An event with no user id in its custom data is matched by a verified email (spec 060 R14).
	findUserIdByVerifiedEmail: createVerifiedEmailUserFinder({
		getUserByEmail,
		getUsersByEmailIgnoringCase,
		loadVerificationState: loadEmailVerificationState
	}),
	// Subscription events carry no amount or interval: read them from the subscription's price.
	loadBillingDetails: createLemonSqueezyPriceLoader((priceId) =>
		getOrCreateLemonsqueezyProvider().getPriceAttributes(priceId)
	)
});

// Per-pod burst de-duplication of redelivered events, bounded (the coordinator clears its keys
// after 1000 events). Only subscription rows are idempotent on (provider, subscription id); an
// order email is sent again and a sponsor-ad renewal extends the ad again if a redelivery gets past it.
const processedEvents = new RelayEventCoordinator();

// Utility function to create email data with secure configuration
function createEmailData(baseData: any, emailConfig: Awaited<ReturnType<typeof getEmailConfig>>) {
	return {
		...baseData,
		appName: emailConfig.companyName, // Use companyName as appName
		supportEmail: emailConfig.supportEmail,
		companyName: emailConfig.companyName,
		websiteUrl: emailConfig.companyUrl // Use companyUrl instead of websiteUrl
	};
}



export async function POST(request: NextRequest) {
	try {
		// Read the body exactly once: the signature covers these raw bytes.
		const body = await request.text();
		const headersList = await headers();
		const signature = headersList.get('x-signature');

		if (!signature) {
			return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
		}

		// Get or create LemonSqueezy provider (singleton). It verifies the signature
		// over the raw body, then parses that same text.
		const lemonSqueezyProvider = getOrCreateLemonsqueezyProvider();
		const webhookResult = await lemonSqueezyProvider.handleWebhook(null, signature, body);

		if (!webhookResult.received) {
			return NextResponse.json({ error: 'Webhook not processed' }, { status: 400 });
		}

		const event = parseLemonSqueezyEvent(body);
		if (!event) {
			return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
		}

		// Only a successfully handled event is remembered as done. A failed one (or a
		// concurrent redelivery still in flight) gets a non-2xx so LemonSqueezy retries it.
		const outcome = await processedEvents.process(getLemonSqueezyEventKey(event, body), () =>
			dispatchEvent(webhookResult.type, webhookResult.data)
		);

		if (outcome === 'retry') {
			return NextResponse.json({ error: 'Event not processed, retry later' }, { status: 503 });
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error('LemonSqueezy webhook error:', error);
		return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
	}
}

/** Resolves true when the event was handled, false when it should be retried. */
async function dispatchEvent(lemonsqueezyEventType: string, data: any): Promise<boolean> {
	// Map LemonSqueezy event types to our generic types
	const eventType = mapLemonSqueezyEventType(lemonsqueezyEventType);

	switch (eventType) {
		case WebhookEventType.SUBSCRIPTION_CREATED:
			return subscriptionEvents.created(data);
		case WebhookEventType.SUBSCRIPTION_UPDATED:
			return subscriptionEvents.updated(data);
		case WebhookEventType.SUBSCRIPTION_CANCELLED:
			return subscriptionEvents.cancelled(data);
		case WebhookEventType.PAYMENT_SUCCEEDED:
			return handlePaymentSucceeded(data);
		case WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED:
			return subscriptionEvents.paymentSucceeded(data);
		case WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED:
			return subscriptionEvents.paymentFailed(data);
		case WebhookEventType.PAYMENT_FAILED:
			await handlePaymentFailed(data);
			return true;
		case WebhookEventType.SUBSCRIPTION_TRIAL_ENDING:
			return subscriptionEvents.trialEnding(data);
		default:
			console.log(`Unhandled webhook event: ${eventType}`);
			return true;
	}
}

// Map LemonSqueezy event types to our generic webhook event types
function mapLemonSqueezyEventType(lemonsqueezyEventType: string): string {
	const eventMapping: Record<string, string> = {
		'subscription_created': WebhookEventType.SUBSCRIPTION_CREATED,
		'subscription_updated': WebhookEventType.SUBSCRIPTION_UPDATED,
		'subscription_cancelled': WebhookEventType.SUBSCRIPTION_CANCELLED,
		// These carry the subscription with its new status; the updated handler stores it.
		'subscription_resumed': WebhookEventType.SUBSCRIPTION_UPDATED,
		'subscription_expired': WebhookEventType.SUBSCRIPTION_UPDATED,
		'subscription_paused': WebhookEventType.SUBSCRIPTION_UPDATED,
		'subscription_unpaused': WebhookEventType.SUBSCRIPTION_UPDATED,
		'subscription_payment_success': WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED,
		'subscription_payment_failed': WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
		'subscription_trial_will_end': WebhookEventType.SUBSCRIPTION_TRIAL_ENDING,
		'order_created': WebhookEventType.PAYMENT_SUCCEEDED,
		'order_refunded': WebhookEventType.REFUND_SUCCEEDED,
	};

	return eventMapping[lemonsqueezyEventType] || lemonsqueezyEventType;
}

// Webhook event handlers (subscription events: lib/payment/lemonsqueezy-subscription-events.ts)

// The confirmation email is best effort: a mail failure must not make LemonSqueezy
// redeliver the order (which would send it again), so this always resolves true.
async function handlePaymentSucceeded(resource: any): Promise<boolean> {
	try {
		const data = toOrderEmailData(resource);
		const emailConfig = await getEmailConfig();
		
		// Extract customer info from LemonSqueezy data
		const customerInfo = extractCustomerInfo(data);
		const paymentMethod = formatPaymentMethod('card'); // LemonSqueezy typically uses card payments
		
		const baseEmailData = {
			customerName: customerInfo.customerName,
			customerEmail: customerInfo.customerEmail,
			// Note: formatAmount expects cents and handles conversion internally (divides by 100).
			// LemonSqueezy API returns amounts in cents, so pass data.total directly.
			// Previously had "data.total / 100" which caused double division (amounts 100× too small).
			amount: formatAmount(data.total, data.currency),
			currency: data.currency?.toUpperCase() || 'USD',
			paymentMethod: paymentMethod,
			transactionId: data.id,
			receiptUrl: data.urls?.receipt
		};

		const emailData = createEmailData(baseEmailData, emailConfig);

		// Send confirmation email
		const emailResult = await paymentEmailService.sendPaymentSuccessEmail(emailData);

		if (emailResult.success) {
			console.log('✅ LemonSqueezy payment success email sent successfully');
		} else {
			console.error('❌ Failed to send payment success email:', emailResult.error);
		}
	} catch (error) {
		console.error('❌ Error handling payment succeeded:', error);
	}
	return true;
}

async function handlePaymentFailed(data: any) {
	console.log('LemonSqueezy payment failed:', data.id);
	// Add specific handling for failed payments if needed
}
