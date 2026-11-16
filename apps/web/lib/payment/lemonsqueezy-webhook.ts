import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Pure helpers for the LemonSqueezy webhook route.
 *
 * Kept free of app imports so they can be unit-tested without a database or
 * the payment SDK.
 *
 * Signature scheme (documented by LemonSqueezy): the `X-Signature` header is
 * the lowercase hex HMAC-SHA256 of the **raw request body**, keyed with the
 * webhook signing secret.
 */

/** Verify `X-Signature` over the exact bytes received, in constant time. */
export function verifyLemonSqueezySignature(rawBody: string, signature: string | null | undefined, secret: string): boolean {
	// An empty secret would make the HMAC computable by anyone: never accept.
	if (!secret || typeof rawBody !== 'string' || typeof signature !== 'string') return false;

	const provided = signature.trim();
	if (!/^[0-9a-fA-F]{64}$/.test(provided)) return false;

	const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest();
	return timingSafeEqual(Buffer.from(provided, 'hex'), expected);
}

export interface LemonSqueezyEvent {
	meta: { event_name: string; custom_data?: Record<string, unknown>; [key: string]: unknown };
	data: { id: string; type?: string; attributes: Record<string, any>; [key: string]: unknown };
}

/**
 * Parse an already-verified raw body. Returns `null` when it is not a
 * LemonSqueezy event envelope.
 */
export function parseLemonSqueezyEvent(rawBody: string): LemonSqueezyEvent | null {
	let parsed: any;
	try {
		parsed = JSON.parse(rawBody);
	} catch {
		return null;
	}
	const eventName = parsed?.meta?.event_name;
	const dataId = parsed?.data?.id;
	if (typeof eventName !== 'string' || !eventName) return null;
	if ((typeof dataId !== 'string' && typeof dataId !== 'number') || dataId === '') return null;

	return {
		meta: parsed.meta,
		data: { ...parsed.data, id: String(dataId), attributes: parsed.data.attributes ?? {} }
	};
}

/**
 * Stable key for one delivery. LemonSqueezy retries re-send the same body, so
 * event name + resource id + body hash identifies a delivery without relying
 * on a delivery id the payload may not carry.
 */
export function getLemonSqueezyEventKey(event: LemonSqueezyEvent, rawBody: string): string {
	const bodyHash = createHash('sha256').update(rawBody, 'utf8').digest('hex');
	return `${event.meta.event_name}:${event.data.id}:${bodyHash}`;
}

function toSeconds(value: unknown): number | undefined {
	if (typeof value !== 'string') return undefined;
	const ms = Date.parse(value);
	return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
}

function toId(value: unknown): string | undefined {
	return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function toNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export type WebhookResource = {
	id: string;
	type?: string;
	attributes?: Record<string, any>;
	meta?: LemonSqueezyEvent['meta'];
};

/**
 * The raw (pre-`formatData`) layout `WebhookSubscriptionService` reads:
 * timestamps in seconds, amounts in cents. Every field is optional because
 * the service tolerates missing ones; the index signature admits the other
 * fields it passes through.
 */
export interface SubscriptionServiceInput {
	id: string;
	status?: string;
	customer?: string;
	customer_email?: string;
	customer_name?: string;
	metadata: Record<string, unknown>;
	currency?: string;
	start_date?: number;
	period_end?: number;
	trial_end?: number;
	cancel_at_period_end?: boolean;
	amount_due?: number;
	amount_paid?: number;
	hosted_invoice_url?: string;
	parent?: { subscription_details: { subscription: string } };
	items?: { data: Array<{ price: { id?: string } }> };
	[key: string]: unknown;
}

/**
 * Map a LemonSqueezy subscription or subscription-invoice resource onto the
 * field layout `WebhookSubscriptionService` reads (timestamps in seconds,
 * amounts in cents). The service stores rows under the provider it was built
 * with, so this carries only the data.
 *
 * `planId` is the plan the paid variant stands for (spec 060 R9), resolved by
 * the caller from server configuration. `custom_data.planId` is never used: the
 * buyer controls the custom data. Without `planId` the result carries no plan,
 * so the service keeps the stored one.
 */
export function toSubscriptionServiceData(
	resource: WebhookResource,
	now: number = Date.now(),
	planId?: string
): SubscriptionServiceInput {
	const attrs = resource.attributes ?? {};
	const custom = (resource.meta?.custom_data ?? {}) as Record<string, unknown>;
	const metadata: Record<string, unknown> = { ...custom };
	delete metadata.planId;
	const userId = toId(custom.userId);
	if (userId) metadata.userId = userId;
	if (planId) metadata.planId = planId;

	const isInvoice = resource.type === 'subscription-invoices';
	const common = {
		customer: toId(attrs.customer_id),
		customer_email: attrs.user_email,
		customer_name: attrs.user_name,
		metadata
	};

	if (isInvoice) {
		const subscriptionId = toId(attrs.subscription_id) ?? resource.id;
		const total = toNumber(attrs.total);
		return {
			...common,
			// The service keys subscription rows on `id`; for an invoice that is the subscription.
			id: subscriptionId,
			parent: { subscription_details: { subscription: subscriptionId } },
			status: attrs.status === 'paid' ? 'active' : undefined,
			currency: typeof attrs.currency === 'string' ? attrs.currency.toLowerCase() : undefined,
			amount_due: total,
			amount_paid: attrs.status === 'paid' ? total : 0,
			hosted_invoice_url: attrs.urls?.invoice_url
		};
	}

	const cancelled = attrs.cancelled === true;
	const endsAt = toSeconds(attrs.ends_at);
	const priceId = toId(attrs.first_subscription_item?.price_id) ?? toId(attrs.variant_id);
	// A subscription cancelled with time left in the paid period stays usable until
	// `ends_at`; LemonSqueezy sends an expiry event when that date passes.
	const paidThroughEndsAt = cancelled && endsAt !== undefined && endsAt * 1000 > now;
	return {
		...common,
		id: resource.id,
		status: paidThroughEndsAt && attrs.status === 'cancelled' ? 'active' : attrs.status,
		start_date: toSeconds(attrs.created_at),
		// ends_at is set once cancelled; otherwise the next renewal is the period end.
		period_end: endsAt ?? toSeconds(attrs.renews_at),
		trial_end: toSeconds(attrs.trial_ends_at),
		// A cancelled subscription keeps access until `ends_at`.
		cancel_at_period_end: cancelled,
		items: { data: [{ price: { id: priceId } }] }
	};
}

/**
 * True for the first invoice of a subscription (`billing_reason: 'initial'`). It pays for
 * the period `subscription_created` already started, so it must not count as a renewal.
 */
export function isInitialSubscriptionInvoice(resource: Pick<WebhookResource, 'type' | 'attributes'>): boolean {
	return resource.type === 'subscription-invoices' && resource.attributes?.billing_reason === 'initial';
}

/**
 * Map a LemonSqueezy order onto the layout the payment-success email reads.
 * `total` stays in cents.
 */
export function toOrderEmailData(resource: WebhookResource): Record<string, any> {
	const attrs = resource.attributes ?? {};
	return {
		id: resource.id,
		total: toNumber(attrs.total),
		currency: attrs.currency,
		customer: { name: attrs.user_name, email: attrs.user_email },
		urls: attrs.urls
	};
}
