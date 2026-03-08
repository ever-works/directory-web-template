import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getOrCreatePolarProvider } from '@/lib/auth';
import { Logger } from '@/lib/logger';
import { safeErrorResponse } from '@/lib/utils/api-error';
import { validateWebhookPayload } from './utils';
import { routeWebhookEvent } from './router';

const logger = Logger.create('PolarWebhook');
const WEBHOOK_SIGNATURE_HEADER = 'webhook-signature';
const WEBHOOK_TIMESTAMP_HEADER = 'webhook-timestamp';
const WEBHOOK_ID_HEADER = 'webhook-id';

/**
 * @swagger
 * /api/polar/webhook:
 *   post:
 *     tags: ["Polar - Webhooks"]
 *     summary: "Handle Polar webhooks"
 *     description: "Processes incoming Polar webhook events including subscription lifecycle, payment events, and checkout updates. Automatically handles email notifications, subscription management, and database updates. Requires valid Polar signature for security."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: "Polar webhook event payload"
 *             properties:
 *               id:
 *                 type: string
 *                 description: "Polar event ID"
 *                 example: "evt_1234567890abcdef"
 *               type:
 *                 type: string
 *                 description: "Webhook event type"
 *                 enum: [
 *                   "checkout.succeeded",
 *                   "checkout.failed",
 *                   "subscription.created",
 *                   "subscription.updated",
 *                   "subscription.canceled",
 *                   "invoice.paid",
 *                   "invoice.payment_failed"
 *                 ]
 *                 example: "subscription.created"
 *               data:
 *                 type: object
 *                 description: "Event data object"
 *               created:
 *                 type: integer
 *                 description: "Unix timestamp of event creation"
 *                 example: 1640995200
 *             required: ["id", "type", "data"]
 *     parameters:
 *       - name: "webhook-signature"
 *         in: "header"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Polar webhook signature for verification (HMAC SHA256, format: v1,<hex_signature>)"
 *       - name: "webhook-timestamp"
 *         in: "header"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Unix timestamp of the webhook event"
 *     responses:
 *       200:
 *         description: "Webhook processed successfully"
 *       400:
 *         description: "Bad request - Invalid signature or webhook processing failed"
 */
/**
 * Handle GET requests - return informative message
 * Webhooks should use POST method
 */

export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		// Get raw body text for signature verification
		// Polar calculates signature on the raw body, not the parsed JSON
		const bodyText = await request.text();
		let body: unknown;

		try {
			body = JSON.parse(bodyText);
		} catch (parseError) {
			logger.error('Invalid JSON payload', {
				error: parseError instanceof Error ? parseError.message : String(parseError),
				bodyLength: bodyText.length
			});
			return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
		}
		if (!validateWebhookPayload(body)) {
			const bodyData = body as any;
			logger.error('Invalid webhook payload structure', {
				hasId: typeof bodyData?.id === 'string',
				hasType: typeof bodyData?.type === 'string',
				hasData: typeof bodyData?.data === 'object',
				eventId: bodyData?.id || 'unknown',
				eventType: bodyData?.type || 'unknown'
			});
			return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
		}

		// Verify signature
		const headersList = await headers();
		const signatureHeader = headersList.get(WEBHOOK_SIGNATURE_HEADER);
		const timestampHeader = headersList.get(WEBHOOK_TIMESTAMP_HEADER);
		const webhookIdHeader = headersList.get(WEBHOOK_ID_HEADER);

		if (!signatureHeader) {
			logger.warn('Webhook request missing signature', {
				hasWebhookId: !!webhookIdHeader,
				hasTimestamp: !!timestampHeader,
				hasSignature: false
			});
			return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
		}

		// Pass full signature header (including "v1," prefix) to provider
		// validateEvent expects the complete header value with format "v1,<signature>"
		// Process webhook through provider
		// Pass raw body text, signature header (full value), timestamp, and webhook-id for signature verification
		const polarProvider = getOrCreatePolarProvider();
		const webhookResult = await polarProvider.handleWebhook(
			body,
			signatureHeader,
			bodyText,
			timestampHeader || undefined,
			webhookIdHeader || undefined
		);

		if (!webhookResult.received) {
			const eventId = (body as any).id || (body as any).data?.id || 'unknown';
			logger.warn('Webhook not processed by provider', { eventId });
			return NextResponse.json({ error: 'Webhook not processed' }, { status: 400 });
		}

		// Route event to appropriate handler
		await routeWebhookEvent(webhookResult.type, webhookResult.data);

		const eventId = (body as any).id || (body as any).data?.id || webhookResult.id || 'unknown';
		logger.info('Webhook processed successfully', {
			eventId,
			eventType: webhookResult.type
		});

		return NextResponse.json({ received: true });
	} catch (error) {
		return safeErrorResponse(error, 'Webhook processing failed', 400);
	}
}
