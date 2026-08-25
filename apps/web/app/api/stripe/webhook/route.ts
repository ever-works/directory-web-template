import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getOrCreateStripeProvider } from '@/lib/auth';
import { dispatchWebhookEvent } from '@/lib/payment/webhook-dispatch';

export async function POST(request: NextRequest) {
	try {
		const body = await request.text();
		const headersList = await headers();
		const signature = headersList.get('stripe-signature');

		if (!signature) {
			return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
		}

		// Get or create Stripe provider (singleton)
		const stripeProvider = getOrCreateStripeProvider();
		const webhookResult = await stripeProvider.handleWebhook(body, signature);

		if (!webhookResult.received) {
			return NextResponse.json({ error: 'Webhook not processed' }, { status: 400 });
		}
		await dispatchWebhookEvent(webhookResult);

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error('Webhook error:', error);
		return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
	}
}
