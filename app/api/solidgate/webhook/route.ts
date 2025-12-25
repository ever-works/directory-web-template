import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getOrCreateSolidgateProvider } from '@/lib/auth';
import { WebhookEventType } from '@/lib/payment/types/payment-types';
import {
	handlePaymentSucceeded,
	handlePaymentFailed,
	handleSubscriptionCreated,
	handleSubscriptionUpdated,
	handleSubscriptionCancelled,
	handleSubscriptionPaymentSucceeded,
	handleSubscriptionPaymentFailed,
	handleSubscriptionTrialEnding
} from '@/lib/services/webhook-subscription.service';

/**
 * @swagger
 * /api/solidgate/webhook:
 *   post:
 *     tags: ["Solidgate - Webhooks"]
 *     summary: "Handle Solidgate webhooks"
 *     description: "Processes incoming Solidgate webhook events including payment events and subscription lifecycle. Automatically handles email notifications, subscription management, and database updates. Requires valid Solidgate signature for security."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: "Solidgate webhook event payload"
 *             properties:
 *               id:
 *                 type: string
 *                 description: "Solidgate event ID"
 *                 example: "evt_1234567890abcdef"
 *               type:
 *                 type: string
 *                 description: "Webhook event type"
 *                 enum: [
 *                   "payment.succeeded",
 *                   "payment.failed",
 *                   "subscription.created",
 *                   "subscription.updated",
 *                   "subscription.cancelled",
 *                   "refund.processed"
 *                 ]
 *                 example: "payment.succeeded"
 *               data:
 *                 type: object
 *                 description: "Event data object"
 *               created:
 *                 type: integer
 *                 description: "Unix timestamp of event creation"
 *                 example: 1640995200
 *             required: ["id", "type", "data"]
 *     parameters:
 *       - name: "x-signature"
 *         in: "header"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Solidgate webhook signature for verification"
 *         example: "sha256=abc123def456..."
 *     responses:
 *       200:
 *         description: "Webhook processed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *               required: ["received"]
 *             example:
 *               received: true
 *       400:
 *         description: "Bad request - Invalid signature or webhook processing failed"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     no_signature: "No signature provided"
 *                     not_processed: "Webhook not processed"
 *                     processing_failed: "Webhook processing failed"
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.text();
		const headersList = await headers();
		const signature = headersList.get('x-signature') || headersList.get('solidgate-signature');

		if (!signature) {
			return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
		}

		// Get or create Solidgate provider (singleton)
		const solidgateProvider = getOrCreateSolidgateProvider();
		const webhookResult = await solidgateProvider.handleWebhook(body, signature, body);

		if (!webhookResult.received) {
			return NextResponse.json({ error: 'Webhook not processed' }, { status: 400 });
		}

		// Route webhook events to appropriate handlers
		switch (webhookResult.type) {
			case WebhookEventType.PAYMENT_SUCCEEDED:
			case 'payment_succeeded':
				await handlePaymentSucceeded(webhookResult.data);
				break;
			case WebhookEventType.PAYMENT_FAILED:
			case 'payment_failed':
				await handlePaymentFailed(webhookResult.data);
				break;
			case WebhookEventType.SUBSCRIPTION_CREATED:
			case 'subscription_created':
				await handleSubscriptionCreated(webhookResult.data);
				break;
			case WebhookEventType.SUBSCRIPTION_UPDATED:
			case 'subscription_updated':
				console.log('Subscription updated:', webhookResult.data);
				await handleSubscriptionUpdated(webhookResult.data);
				break;
			case WebhookEventType.SUBSCRIPTION_CANCELLED:
			case 'subscription_cancelled':
				await handleSubscriptionCancelled(webhookResult.data);
				break;
			case WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED:
			case 'subscription_payment_succeeded':
				await handleSubscriptionPaymentSucceeded(webhookResult.data);
				break;
			case WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED:
			case 'subscription_payment_failed':
				await handleSubscriptionPaymentFailed(webhookResult.data);
				break;
			case WebhookEventType.SUBSCRIPTION_TRIAL_ENDING:
			case 'subscription_trial_ending':
				await handleSubscriptionTrialEnding(webhookResult.data);
				break;
			case WebhookEventType.REFUND_SUCCEEDED:
			case 'refund_succeeded':
			case 'refund_processed':
				console.log('Refund processed:', webhookResult.data);
				// Handle refund events if needed
				break;
			default:
				console.log(`Unhandled webhook event: ${webhookResult.type}`);
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error('Solidgate webhook error:', error);
		return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
	}
}

/**
 * Handle GET requests - return informative message
 * Webhooks should use POST method
 */
export async function GET() {
	return NextResponse.json(
		{
			message: 'Solidgate webhook endpoint',
			instructions: 'This endpoint accepts POST requests from Solidgate webhooks',
			method: 'POST'
		},
		{ status: 200 }
	);
}

