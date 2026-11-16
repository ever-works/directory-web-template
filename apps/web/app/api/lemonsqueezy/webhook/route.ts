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

		const outcome = await processedEvents.process(getLemonSqueezyEventKey(event, body), async () => {
			await dispatchEvent(webhookResult.type, webhookResult.data);
			return true;
		});

		// A concurrent redelivery of an in-flight event: ask LemonSqueezy to retry.
		if (outcome === 'retry') {
			return NextResponse.json({ error: 'Event is being processed' }, { status: 409 });
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error('LemonSqueezy webhook error:', error);
		return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
	}
}

async function dispatchEvent(lemonsqueezyEventType: string, data: any): Promise<void> {
	// Map LemonSqueezy event types to our generic types
	const eventType = mapLemonSqueezyEventType(lemonsqueezyEventType);

	switch (eventType) {
		case WebhookEventType.SUBSCRIPTION_CREATED:
			await handleSubscriptionCreated(data);
			break;
		case WebhookEventType.SUBSCRIPTION_UPDATED:
			await handleSubscriptionUpdated(data);
			break;
		case WebhookEventType.SUBSCRIPTION_CANCELLED:
			await handleSubscriptionCancelled(data);
			break;
		case WebhookEventType.PAYMENT_SUCCEEDED:
			await handlePaymentSucceeded(data);
			break;
		case WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED:
			await handleSubscriptionPaymentSucceeded(data);
			break;
		case WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED:
			await handleSubscriptionPaymentFailed(data);
			break;
		case WebhookEventType.PAYMENT_FAILED:
			await handlePaymentFailed(data);
			break;
		case WebhookEventType.SUBSCRIPTION_TRIAL_ENDING:
			await handleSubscriptionTrialEnding(data);
			break;
		default:
			console.log(`Unhandled webhook event: ${eventType}`);
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
async function handleSubscriptionCreated(data: any) {
	// Check if this is a sponsor ad subscription
	if (isSponsorAdSubscription(data)) {
		console.log('📢 LemonSqueezy sponsor ad subscription detected');
		await handleSponsorAdActivation(data);
		return;
	}

	try {
		const result = await webhookSubscriptionService.handleSubscriptionCreated(toSubscriptionServiceData(data));
		if (result.success) {
			console.log('✅ LemonSqueezy subscription created successfully');
		} else {
			console.error('❌ Failed to handle subscription created:', result.error);
		}
	} catch (error) {
		console.error('❌ Error handling subscription created:', error);
	}
}

async function handleSubscriptionUpdated(data: any) {
	try {
		const result = await webhookSubscriptionService.handleSubscriptionUpdated(toSubscriptionServiceData(data));
		if (result.success) {
			console.log('✅ LemonSqueezy subscription updated successfully');
		} else {
			console.error('❌ Failed to handle subscription updated:', result.error);
		}
	} catch (error) {
		console.error('❌ Error handling subscription updated:', error);
	}
}

async function handleSubscriptionCancelled(data: any) {
	// Check if this is a sponsor ad subscription
	if (isSponsorAdSubscription(data)) {
		console.log('📢 LemonSqueezy sponsor ad subscription cancellation detected');
		await handleSponsorAdCancellation(data);
		return;
	}

	try {
		const result = await webhookSubscriptionService.handleSubscriptionCancelled(toSubscriptionServiceData(data));
		if (result.success) {
			console.log('✅ LemonSqueezy subscription cancelled successfully');
		} else {
			console.error('❌ Failed to handle subscription cancelled:', result.error);
		}
	} catch (error) {
		console.error('❌ Error handling subscription cancelled:', error);
	}
}

async function handlePaymentSucceeded(resource: any) {
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
}

async function handlePaymentFailed(data: any) {
	console.log('LemonSqueezy payment failed:', data.id);
	// Add specific handling for failed payments if needed
}

async function handleSubscriptionPaymentSucceeded(data: any) {
	// Check if this is a sponsor ad subscription (for renewals)
	if (isSponsorAdSubscription(data)) {
		console.log('📢 LemonSqueezy sponsor ad payment succeeded (renewal)');
		await handleSponsorAdRenewal(data);
		return;
	}

	try {
		const result = await webhookSubscriptionService.handleSubscriptionPaymentSucceeded(
			toSubscriptionServiceData(data)
		);
		if (result.success) {
			console.log('✅ LemonSqueezy subscription payment processed successfully');
		} else {
			console.error('❌ Failed to handle subscription payment succeeded:', result.error);
		}
	} catch (error) {
		console.error('❌ Error handling subscription payment succeeded:', error);
	}
}

async function handleSubscriptionPaymentFailed(data: any) {
	try {
		const result = await webhookSubscriptionService.handleSubscriptionPaymentFailed(toSubscriptionServiceData(data));
		if (result.success) {
			console.log('✅ LemonSqueezy subscription payment failure handled successfully');
		} else {
			console.error('❌ Failed to handle subscription payment failed:', result.error);
		}
	} catch (error) {
		console.error('❌ Error handling subscription payment failed:', error);
	}
}

async function handleSubscriptionTrialEnding(data: any) {
	try {
		const result = await webhookSubscriptionService.handleSubscriptionTrialEnding(toSubscriptionServiceData(data));
		if (result.success) {
			console.log('✅ LemonSqueezy subscription trial ending handled successfully');
		} else {
			console.error('❌ Failed to handle subscription trial ending:', result.error);
		}
	} catch (error) {
		console.error('❌ Error handling subscription trial ending:', error);
	}
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
async function handleSponsorAdActivation(data: Record<string, unknown>): Promise<void> {
	const sponsorAdId = getSponsorAdId(data);

	if (!sponsorAdId) {
		console.error('❌ Sponsor ad ID not found in LemonSqueezy custom data');
		return;
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
	} catch (error) {
		console.error('❌ Error confirming sponsor ad payment:', error);
	}
}

/**
 * Handle sponsor ad subscription cancelled
 */
async function handleSponsorAdCancellation(data: Record<string, unknown>): Promise<void> {
	const sponsorAdId = getSponsorAdId(data);

	if (!sponsorAdId) {
		console.error('❌ Sponsor ad ID not found in LemonSqueezy custom data');
		return;
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
	} catch (error) {
		console.error('❌ Error cancelling sponsor ad:', error);
	}
}

/**
 * Handle sponsor ad subscription renewal
 */
async function handleSponsorAdRenewal(data: Record<string, unknown>): Promise<void> {
	const sponsorAdId = getSponsorAdId(data);

	if (!sponsorAdId) {
		console.error('❌ Sponsor ad ID not found in LemonSqueezy custom data');
		return;
	}

	try {
		console.log(`🔄 Renewing sponsor ad via LemonSqueezy: ${sponsorAdId}`);

		const renewedAd = await sponsorAdService.renewSponsorAd(sponsorAdId);

		if (renewedAd) {
			console.log(`✅ Sponsor ad renewed successfully: ${sponsorAdId}`);
		} else {
			console.error(`❌ Failed to renew sponsor ad: ${sponsorAdId}`);
		}
	} catch (error) {
		console.error('❌ Error renewing sponsor ad:', error);
	}
}
