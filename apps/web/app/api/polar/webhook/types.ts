/**
 * Types and interfaces for Polar webhook events
 */

/**
 * Polar webhook event payload structure
 * Note: Some Polar events (like customer.state_changed) don't have an id at root level
 */
export interface PolarWebhookEvent {
	id?: string; // Optional - some events don't have id at root level
	type: PolarWebhookEventType;
	data: PolarWebhookData;
	created?: number;
	timestamp?: string; // Some events use timestamp instead of created
}

export type PolarWebhookEventType =
	| 'checkout.succeeded'
	| 'checkout.failed'
	| 'subscription.created'
	| 'subscription.updated'
	| 'subscription.canceled'
	| 'invoice.paid'
	| 'invoice.payment_failed'
	| 'customer.state_changed'; // Add other Polar event types as needed

export interface PolarWebhookData {
	id?: string; // Optional - some events may not have id in data
	object?: any;
	product?: { id: string };
	product_id?: string;
	price?: {
		amount?: number;
		recurring?: { interval?: string };
	};
	amount?: number;
	amount_due?: number;
	amount_paid?: number;
	currency?: string;
	customer?: {
		id: string;
		name?: string;
		email?: string;
	};
	customer_id?: string;
	customer_name?: string;
	customer_email?: string;
	payment_method?: any;
	receipt_url?: string;
	last_payment_error?: { message?: string };
	current_period_end?: number;
	interval?: string;
	subscription?: PolarSubscriptionData;
	canceled_at?: number;
	cancellation_details?: { reason?: string };
	metadata?: Record<string, string>;
}

export interface PolarSubscriptionData {
	id: string;
	product?: { id: string };
	product_id?: string;
	price?: {
		recurring?: { interval?: string };
	};
	interval?: string;
	current_period_end?: number;
	customer?: {
		id: string;
		name?: string;
		email?: string;
	};
	customer_id?: string;
	customer_name?: string;
	customer_email?: string;
	metadata?: Record<string, string>;
}

export interface EmailConfig {
	companyName: string;
	companyUrl: string;
	supportEmail?: string;
}
