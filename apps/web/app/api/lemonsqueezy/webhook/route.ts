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
import {
	getLemonSqueezyEventKey,
	isInitialSubscriptionInvoice,
	parseLemonSqueezyEvent,
	toOrderEmailData,
	toSubscriptionServiceData
} from '@/lib/payment/lemonsqueezy-webhook';

// Rows must be stored under the LemonSqueezy provider (the default is Stripe).
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.LEMONSQUEEZY);

// Per-pod burst de-duplication of redelivered events. The subscription handlers
// are idempotent on (provider, subscription id), which is the durable boundary.
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
			return handleSubscriptionCreated(data);
		case WebhookEventType.SUBSCRIPTION_UPDATED:
			return handleSubscriptionUpdated(data);
		case WebhookEventType.SUBSCRIPTION_CANCELLED:
			return handleSubscriptionCancelled(data);
		case WebhookEventType.PAYMENT_SUCCEEDED:
			return handlePaymentSucceeded(data);
		case WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED:
			return handleSubscriptionPaymentSucceeded(data);
		case WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED:
			return handleSubscriptionPaymentFailed(data);
		case WebhookEventType.PAYMENT_FAILED:
			await handlePaymentFailed(data);
			return true;
		case WebhookEventType.SUBSCRIPTION_TRIAL_ENDING:
			return handleSubscriptionTrialEnding(data);
		default:
			console.log(`Unhandled webhook event: ${eventType}`);
			return true;
	}
}

/**
 * Run one subscription-service call. Returns whether it succeeded so a failed
 * event is not acknowledged and can be redelivered.
 */
async function runSubscriptionHandler(
	label: string,
	run: () => Promise<{ success: boolean; error?: string }>
): Promise<boolean> {
	try {
		const result = await run();
		if (result.success) {
			console.log(`✅ LemonSqueezy ${label} handled successfully`);
			return true;
		}
		console.error(`❌ Failed to handle ${label}:`, result.error);
		return false;
	} catch (error) {
		console.error(`❌ Error handling ${label}:`, error);
		return false;
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

// Webhook event handlers
async function handleSubscriptionCreated(data: any): Promise<boolean> {
	// Check if this is a sponsor ad subscription
	if (isSponsorAdSubscription(data)) {
		console.log('📢 LemonSqueezy sponsor ad subscription detected');
		return handleSponsorAdActivation(data);
	}

	return runSubscriptionHandler('subscription created', () =>
		webhookSubscriptionService.handleSubscriptionCreated(toSubscriptionServiceData(data))
	);
}

async function handleSubscriptionUpdated(data: any): Promise<boolean> {
	// A sponsor-ad subscription is not a plan subscription. The plan service creates a
	// plan row for a subscription it cannot find, so letting this through would book
	// every sponsor-ad purchase as a Standard plan (same guard as the Stripe dispatch, CC05-04).
	if (isSponsorAdSubscription(data)) {
		console.log('📢 LemonSqueezy sponsor ad subscription update acknowledged');
		return true;
	}

	return runSubscriptionHandler('subscription updated', () =>
		webhookSubscriptionService.handleSubscriptionUpdated(toSubscriptionServiceData(data))
	);
}

async function handleSubscriptionCancelled(data: any): Promise<boolean> {
	// Check if this is a sponsor ad subscription
	if (isSponsorAdSubscription(data)) {
		console.log('📢 LemonSqueezy sponsor ad subscription cancellation detected');
		return handleSponsorAdCancellation(data);
	}

	return runSubscriptionHandler('subscription cancelled', () =>
		webhookSubscriptionService.handleSubscriptionCancelled(toSubscriptionServiceData(data))
	);
}

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

async function handleSubscriptionPaymentSucceeded(data: any): Promise<boolean> {
	// Check if this is a sponsor ad subscription (for renewals)
	if (isSponsorAdSubscription(data)) {
		// The first invoice pays for the period subscription_created already confirmed;
		// only later invoices extend the ad.
		if (isInitialSubscriptionInvoice(data)) {
			console.log('📢 LemonSqueezy sponsor ad initial payment acknowledged');
			return true;
		}
		console.log('📢 LemonSqueezy sponsor ad payment succeeded (renewal)');
		return handleSponsorAdRenewal(data);
	}

	return runSubscriptionHandler('subscription payment succeeded', () =>
		webhookSubscriptionService.handleSubscriptionPaymentSucceeded(toSubscriptionServiceData(data))
	);
}

async function handleSubscriptionPaymentFailed(data: any): Promise<boolean> {
	// Sponsor-ad subscriptions have no plan row to update.
	if (isSponsorAdSubscription(data)) {
		console.log('📢 LemonSqueezy sponsor ad payment failure acknowledged');
		return true;
	}

	return runSubscriptionHandler('subscription payment failed', () =>
		webhookSubscriptionService.handleSubscriptionPaymentFailed(toSubscriptionServiceData(data))
	);
}

async function handleSubscriptionTrialEnding(data: any): Promise<boolean> {
	return runSubscriptionHandler('subscription trial ending', () =>
		webhookSubscriptionService.handleSubscriptionTrialEnding(toSubscriptionServiceData(data))
	);
}

// ######################### Sponsor Ad Webhook Handlers #########################

/**
 * Check if subscription custom data indicates a sponsor ad
 * LemonSqueezy uses custom_data field for metadata
 */
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
	const customData = data.custom_data as Record<string, string> | undefined;
	const meta = data.meta as Record<string, unknown> | undefined;
	const metaCustomData = meta?.custom_data as Record<string, string> | undefined;

	return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}

/**
 * Get sponsor ad ID from subscription custom data
 */
function getSponsorAdId(data: Record<string, unknown>): string | null {
	const customData = data.custom_data as Record<string, string> | undefined;
	const meta = data.meta as Record<string, unknown> | undefined;
	const metaCustomData = meta?.custom_data as Record<string, string> | undefined;

	return customData?.sponsorAdId || metaCustomData?.sponsorAdId || null;
}

/**
 * Handle sponsor ad subscription created/payment succeeded
 */
async function handleSponsorAdActivation(data: Record<string, unknown>): Promise<boolean> {
	const sponsorAdId = getSponsorAdId(data);

	if (!sponsorAdId) {
		console.error('❌ Sponsor ad ID not found in LemonSqueezy custom data');
		return true; // redelivery cannot fix a missing id
	}

	try {
		const subscriptionId = (data.id as string) || (data.attributes as Record<string, unknown>)?.id as string;
		const customerId = (data.customer_id as string) || (data.attributes as Record<string, unknown>)?.customer_id as string;

		console.log(`🔄 Confirming payment for sponsor ad via LemonSqueezy: ${sponsorAdId}`);

		const confirmedAd = await sponsorAdService.confirmPayment(
			sponsorAdId,
			subscriptionId,
			customerId
		);

		if (confirmedAd) {
			console.log(`✅ Sponsor ad payment confirmed, now pending admin review: ${sponsorAdId}`);
		} else {
			console.error(`❌ Failed to confirm sponsor ad payment: ${sponsorAdId}`);
		}
		return true;
	} catch (error) {
		console.error('❌ Error confirming sponsor ad payment:', error);
		return false;
	}
}

/**
 * Handle sponsor ad subscription cancelled
 */
async function handleSponsorAdCancellation(data: Record<string, unknown>): Promise<boolean> {
	const sponsorAdId = getSponsorAdId(data);

	if (!sponsorAdId) {
		console.error('❌ Sponsor ad ID not found in LemonSqueezy custom data');
		return true; // redelivery cannot fix a missing id
	}

	try {
		console.log(`🔄 Cancelling sponsor ad via LemonSqueezy: ${sponsorAdId}`);

		const cancelledAd = await sponsorAdService.cancelSponsorAd(
			sponsorAdId,
			'LemonSqueezy subscription cancelled'
		);

		if (cancelledAd) {
			console.log(`✅ Sponsor ad cancelled successfully: ${sponsorAdId}`);
		} else {
			console.error(`❌ Failed to cancel sponsor ad: ${sponsorAdId}`);
		}
		return true;
	} catch (error) {
		console.error('❌ Error cancelling sponsor ad:', error);
		return false;
	}
}

/**
 * Handle sponsor ad subscription renewal
 */
async function handleSponsorAdRenewal(data: Record<string, unknown>): Promise<boolean> {
	const sponsorAdId = getSponsorAdId(data);

	if (!sponsorAdId) {
		console.error('❌ Sponsor ad ID not found in LemonSqueezy custom data');
		return true; // redelivery cannot fix a missing id
	}

	try {
		console.log(`🔄 Renewing sponsor ad via LemonSqueezy: ${sponsorAdId}`);

		const renewedAd = await sponsorAdService.renewSponsorAd(sponsorAdId);

		if (renewedAd) {
			console.log(`✅ Sponsor ad renewed successfully: ${sponsorAdId}`);
		} else {
			console.error(`❌ Failed to renew sponsor ad: ${sponsorAdId}`);
		}
		return true;
	} catch (error) {
		console.error('❌ Error renewing sponsor ad:', error);
		return false;
	}
}
