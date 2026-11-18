/**
 * The amount and billing period of a LemonSqueezy subscription, for its `subscriptions` row.
 *
 * LemonSqueezy subscription events carry no price or interval, only
 * `first_subscription_item.price_id`. The Prices API (`GET /v1/prices/{id}`) has both: `unit_price`
 * in cents (LemonSqueezy uses cents for every currency, see `toStoredAmount`) and
 * `renewal_interval_unit` / `renewal_interval_quantity`. When it cannot be asked, the variant catalog
 * still knows whether a configured plan variant is the monthly or the yearly one
 * (`lemonSqueezyVariantInterval`).
 *
 * Kept free of app imports so it can be unit-tested; the webhook route passes the API call in.
 */

/** What the subscription row needs; every field may be missing. */
export interface LemonSqueezyBillingDetails {
	/** Price per billing period in cents. Missing for usage-based, tiered or pay-what-you-want prices. */
	unitAmount?: number;
	interval?: 'day' | 'week' | 'month' | 'year';
	intervalCount?: number;
}

const INTERVALS = new Set(['day', 'week', 'month', 'year']);

/**
 * Reads the attributes of a LemonSqueezy price (`data.attributes` of `GET /v1/prices/{id}`).
 * Returns `null` for anything that is not a subscription price.
 *
 * The amount is kept only for a flat price (`scheme: 'standard'`, not usage-based): for package,
 * graduated or volume pricing and for usage-based billing `unit_price` is a per-unit price, not what
 * a period costs.
 */
export function toLemonSqueezyBillingDetails(attributes: unknown): LemonSqueezyBillingDetails | null {
	if (!attributes || typeof attributes !== 'object') return null;
	const attrs = attributes as Record<string, unknown>;
	if (attrs.category !== 'subscription') return null;

	const details: LemonSqueezyBillingDetails = {};
	const unit = attrs.renewal_interval_unit;
	if (typeof unit === 'string' && INTERVALS.has(unit)) {
		details.interval = unit as LemonSqueezyBillingDetails['interval'];
		const quantity = attrs.renewal_interval_quantity;
		details.intervalCount =
			typeof quantity === 'number' && Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1;
	}
	const flat = (attrs.scheme === undefined || attrs.scheme === 'standard') && !attrs.usage_aggregation;
	const unitPrice = attrs.unit_price;
	if (flat && typeof unitPrice === 'number' && Number.isSafeInteger(unitPrice) && unitPrice >= 0) {
		details.unitAmount = unitPrice;
	}
	return details;
}

/**
 * The details to store: the Prices API's when it answered, otherwise only the interval the variant
 * catalog names (the amount stays unknown). `undefined` when neither knows anything.
 */
export function mergeLemonSqueezyBillingDetails(
	fromPrice: LemonSqueezyBillingDetails | null | undefined,
	catalogInterval: 'month' | 'year' | undefined
): LemonSqueezyBillingDetails | undefined {
	const merged: LemonSqueezyBillingDetails = { ...(fromPrice ?? {}) };
	if (!merged.interval && catalogInterval) {
		merged.interval = catalogInterval;
		merged.intervalCount = 1;
	}
	return merged.interval || merged.unitAmount !== undefined ? merged : undefined;
}

/** Reads one price's attributes from LemonSqueezy: `null` when it has no such price, throws when it cannot be asked. */
export type LemonSqueezyPriceFetcher = (priceId: string) => Promise<unknown>;

export interface PriceLoaderOptions {
	/** Prices kept per process (default 64). */
	maxEntries?: number;
	/** How long a price is kept (default 1 hour). */
	ttlMs?: number;
	now?: () => number;
}

/**
 * Loads billing details by price id, keeping recent answers in a small bounded cache: every
 * `subscription_updated` (renewals included) needs the price, which rarely changes. Only details
 * that were found are cached; `null` and errors are asked again next time. Errors are thrown, so the
 * caller decides whether to fall back.
 */
export function createLemonSqueezyPriceLoader(fetchPrice: LemonSqueezyPriceFetcher, options: PriceLoaderOptions = {}) {
	const maxEntries = options.maxEntries ?? 64;
	const ttlMs = options.ttlMs ?? 60 * 60 * 1000;
	const now = options.now ?? Date.now;
	const cache = new Map<string, { details: LemonSqueezyBillingDetails; expires: number }>();

	return async function loadBillingDetails(priceId: string): Promise<LemonSqueezyBillingDetails | null> {
		const id = String(priceId).trim();
		if (!/^[1-9]\d{0,18}$/.test(id)) return null;
		const hit = cache.get(id);
		if (hit && hit.expires > now()) {
			// Refresh its place so the oldest entry is evicted first.
			cache.delete(id);
			cache.set(id, hit);
			return hit.details;
		}
		cache.delete(id);

		const details = toLemonSqueezyBillingDetails(await fetchPrice(id));
		if (details) {
			cache.set(id, { details, expires: now() + ttlMs });
			while (cache.size > maxEntries) cache.delete(cache.keys().next().value as string);
		}
		return details;
	};
}
