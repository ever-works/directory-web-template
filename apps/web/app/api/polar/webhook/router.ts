/**
 * Event router for Polar webhook events
 */

import { WebhookEventType } from '@/lib/payment/types/payment-types';
import { Logger } from '@/lib/logger';
import type { PolarWebhookData } from './types';
import {
	handlePaymentSucceeded,
	handlePaymentFailed,
	handleSubscriptionCreated,
	handleSubscriptionUpdated,
	handleSubscriptionCancelled,
	handleSubscriptionPaymentSucceeded,
	handleSubscriptionPaymentFailed
} from './handlers';

const logger = Logger.create('PolarWebhookRouter');

/**
 * Validates that the event type is a known, safe webhook event type
 * This prevents unvalidated dynamic method calls that could be exploited
 */
function isValidWebhookEventType(eventType: string): eventType is WebhookEventType {
	// Only allow known event types that we have handlers for
	const allowedEventTypes: Set<WebhookEventType> = new Set([
		WebhookEventType.SUBSCRIPTION_CREATED,
		WebhookEventType.SUBSCRIPTION_UPDATED,
		WebhookEventType.SUBSCRIPTION_CANCELLED,
		WebhookEventType.PAYMENT_SUCCEEDED,
		WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED,
		WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
		WebhookEventType.PAYMENT_FAILED
	]);
	
	return allowedEventTypes.has(eventType as WebhookEventType);
}

/**
 * Routes webhook events to appropriate handlers
 */
export async function routeWebhookEvent(
	eventType: string,
	data: PolarWebhookData
): Promise<void> {
	// Validate event type before using it to access handlers
	// This prevents unvalidated dynamic method calls
	if (!isValidWebhookEventType(eventType)) {
		logger.warn('Invalid or unhandled webhook event type', { 
			eventType, 
			dataId: data.id || 'unknown' 
		});
		return;
	}

	// Type-safe handler map - only includes handlers we actually implement
	const eventHandlers: Partial<Record<WebhookEventType, (data: PolarWebhookData) => Promise<void>>> = {
		[WebhookEventType.SUBSCRIPTION_CREATED]: handleSubscriptionCreated,
		[WebhookEventType.SUBSCRIPTION_UPDATED]: handleSubscriptionUpdated,
		[WebhookEventType.SUBSCRIPTION_CANCELLED]: handleSubscriptionCancelled,
		[WebhookEventType.PAYMENT_SUCCEEDED]: handlePaymentSucceeded,
		[WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED]: handleSubscriptionPaymentSucceeded,
		[WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED]: handleSubscriptionPaymentFailed,
		[WebhookEventType.PAYMENT_FAILED]: handlePaymentFailed
	};

	const handler = eventHandlers[eventType];

	if (handler) {
		await handler(data);
	} else {
		logger.warn('Handler not found for event type', { eventType, dataId: data.id || 'unknown' });
	}
}
