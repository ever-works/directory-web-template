import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
	createLemonSqueezyPriceLoader,
	mergeLemonSqueezyBillingDetails,
	toLemonSqueezyBillingDetails,
	type LemonSqueezyBillingDetails
} from '../lemonsqueezy-price';
import { createLemonSqueezySubscriptionEvents } from '../lemonsqueezy-subscription-events';
import {
	buildLemonSqueezyVariantCatalog,
	collectLemonSqueezyVariantSources,
	lemonSqueezyVariantInterval
} from '../lemonsqueezy-variant-plan';
import { toSubscriptionServiceData, type SubscriptionServiceInput } from '../lemonsqueezy-webhook';
import { updatedSubscriptionAmount } from '../stored-amount';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * LemonSqueezy subscription payloads carry no price or interval, so every LemonSqueezy plan row was
 * stored with `amount: null` and `interval: 'month'`, a yearly plan included. The webhook now reads
 * them from the subscription's price (Prices API), or the period from the variant catalog.
 */

/** `data.attributes` of `GET /v1/prices/{id}`, as LemonSqueezy documents it. */
const price = (extra: Record<string, unknown> = {}) => ({
	variant_id: 1002,
	category: 'subscription',
	scheme: 'standard',
	usage_aggregation: null,
	unit_price: 19900,
	unit_price_decimal: null,
	setup_fee_enabled: false,
	setup_fee: null,
	package_size: 1,
	tiers: null,
	renewal_interval_unit: 'year',
	renewal_interval_quantity: 1,
	trial_interval_unit: 'day',
	trial_interval_quantity: 30,
	min_price: null,
	suggested_price: null,
	tax_code: 'saas',
	...extra
});

describe('toLemonSqueezyBillingDetails', () => {
	it('reads the price in cents and the renewal period of a subscription price', () => {
		assert.deepEqual(toLemonSqueezyBillingDetails(price()), {
			interval: 'year',
			intervalCount: 1,
			unitAmount: 19900
		});
		assert.deepEqual(
			toLemonSqueezyBillingDetails(
				price({ renewal_interval_unit: 'month', renewal_interval_quantity: 3, unit_price: 0 })
			),
			{ interval: 'month', intervalCount: 3, unitAmount: 0 }
		);
		assert.deepEqual(
			toLemonSqueezyBillingDetails(price({ renewal_interval_unit: 'week', renewal_interval_quantity: null })),
			{
				interval: 'week',
				intervalCount: 1,
				unitAmount: 19900
			}
		);
	});

	it('says there is no flat amount (null) for usage-based or tiered prices, where unit_price is per unit', () => {
		for (const extra of [
			{ usage_aggregation: 'sum' },
			{ scheme: 'package' },
			{ scheme: 'graduated' },
			{ scheme: 'volume' }
		]) {
			assert.deepEqual(
				toLemonSqueezyBillingDetails(price(extra)),
				{ interval: 'year', intervalCount: 1, unitAmount: null },
				JSON.stringify(extra)
			);
		}
		assert.deepEqual(toLemonSqueezyBillingDetails(price({ unit_price: 19.5 })), {
			interval: 'year',
			intervalCount: 1,
			unitAmount: null
		});
	});

	it('returns null for anything that is not a subscription price', () => {
		for (const value of [null, undefined, 'x', price({ category: 'one_time' }), price({ category: 'pwyw' }), {}]) {
			assert.equal(toLemonSqueezyBillingDetails(value), null);
		}
		assert.deepEqual(toLemonSqueezyBillingDetails(price({ renewal_interval_unit: 'fortnight' })), {
			unitAmount: 19900
		});
	});
});

describe('mergeLemonSqueezyBillingDetails', () => {
	it("prefers the price's details and falls back to the catalog's period", () => {
		const fromPrice: LemonSqueezyBillingDetails = { interval: 'month', intervalCount: 1, unitAmount: 1900 };
		assert.deepEqual(mergeLemonSqueezyBillingDetails(fromPrice, 'year'), fromPrice);
		assert.deepEqual(mergeLemonSqueezyBillingDetails(null, 'year'), { interval: 'year', intervalCount: 1 });
		assert.deepEqual(mergeLemonSqueezyBillingDetails({ unitAmount: 500 }, 'month'), {
			unitAmount: 500,
			interval: 'month',
			intervalCount: 1
		});
		assert.equal(mergeLemonSqueezyBillingDetails(null, undefined), undefined);
		assert.equal(mergeLemonSqueezyBillingDetails({}, undefined), undefined);
	});
});

describe('createLemonSqueezyPriceLoader', () => {
	const counting = (answer: (id: string) => unknown = () => price()) => {
		const asked: string[] = [];
		return {
			asked,
			fetch: async (id: string) => {
				asked.push(id);
				return answer(id);
			}
		};
	};

	it('asks LemonSqueezy once per price within the TTL', async () => {
		let clock = 0;
		const { asked, fetch } = counting();
		const load = createLemonSqueezyPriceLoader(fetch, { ttlMs: 1000, now: () => clock });
		assert.deepEqual(await load('77'), { interval: 'year', intervalCount: 1, unitAmount: 19900 });
		await load('77');
		clock = 999;
		await load('77');
		assert.deepEqual(asked, ['77']);
		clock = 1000;
		await load('77');
		assert.deepEqual(asked, ['77', '77']);
	});

	it('keeps at most maxEntries prices, evicting the least recently used', async () => {
		const { asked, fetch } = counting();
		const load = createLemonSqueezyPriceLoader(fetch, { maxEntries: 2 });
		await load('1');
		await load('2');
		await load('1'); // 1 is now the most recent
		await load('3'); // evicts 2
		await load('1');
		await load('2');
		assert.deepEqual(asked, ['1', '2', '3', '2']);
	});

	it('does not cache a missing price, and lets an outage reach the caller', async () => {
		const { asked, fetch } = counting(() => null);
		const load = createLemonSqueezyPriceLoader(fetch);
		assert.equal(await load('5'), null);
		assert.equal(await load('5'), null);
		assert.deepEqual(asked, ['5', '5']);

		const failing = createLemonSqueezyPriceLoader(async () => {
			throw new Error('LemonSqueezy unreachable');
		});
		await assert.rejects(failing('5'), /unreachable/);
	});

	it('refuses an id that is not a LemonSqueezy id without asking', async () => {
		const { asked, fetch } = counting();
		const load = createLemonSqueezyPriceLoader(fetch);
		for (const id of ['', '0', 'abc', '12a', '-1', '1'.repeat(20)]) assert.equal(await load(id), null);
		assert.deepEqual(asked, []);
	});
});

describe('the subscription row gets the amount and the billing period', () => {
	const resource = (variantId: number, priceId: number | null = 77) => ({
		id: '42',
		type: 'subscriptions',
		attributes: {
			customer_id: 7,
			user_email: 'buyer@example.com',
			variant_id: variantId,
			status: 'active',
			cancelled: false,
			created_at: '2026-01-01T00:00:00Z',
			renews_at: '2027-01-01T00:00:00Z',
			first_subscription_item: priceId === null ? null : { id: 9, subscription_id: 42, price_id: priceId }
		},
		meta: { event_name: 'subscription_created', custom_data: { userId: 'user_1' } }
	});

	it('toSubscriptionServiceData puts them where the service reads them (Stripe price layout)', () => {
		const mapped = toSubscriptionServiceData(resource(1002), Date.now(), 'standard', {
			unitAmount: 19900,
			interval: 'year',
			intervalCount: 1
		});
		assert.deepEqual(mapped.items?.data[0]?.price, {
			id: '77',
			unit_amount: 19900,
			recurring: { interval: 'year', interval_count: 1 }
		});
		// A price with no flat amount clears the stored amount on a plan change (null, not missing).
		assert.deepEqual(
			toSubscriptionServiceData(resource(1002), Date.now(), 'standard', { unitAmount: null, interval: 'month' })
				.items?.data[0]?.price,
			{ id: '77', unit_amount: null, recurring: { interval: 'month', interval_count: 1 } }
		);
		// Without details the service keeps what it has.
		assert.deepEqual(toSubscriptionServiceData(resource(1002), Date.now(), 'standard').items?.data[0]?.price, {
			id: '77'
		});
	});

	it('formatData reads the amount and period from that layout', () => {
		const service = readFileSync(join(__dirname, '../../services/webhook-subscription.service.ts'), 'utf8');
		assert.ok(service.includes('amount: data.items?.data?.[0]?.price?.unit_amount,'));
		assert.ok(service.includes('interval: data.items?.data?.[0]?.price?.recurring?.interval,'));
		assert.ok(service.includes('intervalCount: data.items?.data?.[0]?.price?.recurring?.interval_count,'));
	});

	const catalog = buildLemonSqueezyVariantCatalog(
		collectLemonSqueezyVariantSources({
			billing: { standard: { productId: 'p', usd: { amount: { monthly: '1001', yearly: '1002' } } } },
			defaults: { premium: ['2099'] },
			sponsorAds: { weekly: '301' }
		})
	);

	function harness(loadBillingDetails?: (priceId: string) => Promise<LemonSqueezyBillingDetails | null>) {
		const written: SubscriptionServiceInput[] = [];
		const warnings: unknown[][] = [];
		const write = async (data: SubscriptionServiceInput) => {
			written.push(data);
			return { success: true };
		};
		const events = createLemonSqueezySubscriptionEvents({
			plans: {
				handleSubscriptionCreated: write,
				handleSubscriptionUpdated: write,
				handleSubscriptionCancelled: write,
				handleSubscriptionPaymentSucceeded: write,
				handleSubscriptionPaymentFailed: write,
				handleSubscriptionTrialEnding: write
			},
			sponsorAds: {} as never,
			loadVariantCatalog: async () => catalog,
			loadBillingDetails,
			logger: { log() {}, warn: (...args: unknown[]) => warnings.push(args), error() {} }
		});
		const priceOf = (i = 0) => written[i]?.items?.data[0]?.price;
		return { events, written, warnings, priceOf };
	}

	it('subscription_created stores the price and period read from LemonSqueezy', async () => {
		const asked: string[] = [];
		const { events, priceOf } = harness(async (id) => {
			asked.push(id);
			return { unitAmount: 19900, interval: 'year', intervalCount: 1 };
		});
		assert.equal(await events.created(resource(1002)), true);
		assert.deepEqual(asked, ['77']);
		assert.deepEqual(priceOf(), {
			id: '77',
			unit_amount: 19900,
			recurring: { interval: 'year', interval_count: 1 }
		});
	});

	it("a plan change (subscription_updated on a plan variant) stores the new price's details", async () => {
		const { events, priceOf } = harness(async () => ({ unitAmount: 1900, interval: 'month', intervalCount: 1 }));
		assert.equal(await events.updated(resource(1001)), true);
		assert.deepEqual(priceOf(), {
			id: '77',
			unit_amount: 1900,
			recurring: { interval: 'month', interval_count: 1 }
		});
	});

	it('falls back to the period the catalog names when LemonSqueezy cannot be asked, and still writes the row', async () => {
		const { events, priceOf, warnings } = harness(async () => {
			throw new Error('LemonSqueezy unreachable');
		});
		assert.equal(await events.created(resource(1002)), true);
		assert.deepEqual(priceOf(), { id: '77', recurring: { interval: 'year', interval_count: 1 } });
		assert.equal(warnings.length, 1);
	});

	it('uses the catalog period without a loader or a price id, and nothing for a variant it names no period for', async () => {
		const noLoader = harness();
		await noLoader.events.created(resource(1001, null));
		assert.deepEqual(noLoader.priceOf(), { id: '1001', recurring: { interval: 'month', interval_count: 1 } });

		// A built-in default id: the configuration does not say monthly or yearly.
		const premium = harness(async () => null);
		await premium.events.created(resource(2099));
		assert.deepEqual(premium.priceOf(), { id: '77' });
	});

	it('does not read prices for events that cannot set a plan', async () => {
		const asked: string[] = [];
		const { events } = harness(async (id) => {
			asked.push(id);
			return { unitAmount: 1, interval: 'month', intervalCount: 1 };
		});
		await events.updated(resource(9999)); // unknown variant: status-only update
		await events.cancelled(resource(1002));
		assert.deepEqual(asked, []);
	});
});

describe('lemonSqueezyVariantInterval', () => {
	const catalog = buildLemonSqueezyVariantCatalog(
		collectLemonSqueezyVariantSources({
			billing: {
				standard: {
					productId: 'p',
					usd: { amount: { monthly: '1001', yearly: '1002' } },
					eur: { amount: { monthly: '1011', yearly: '1001' } } // misconfigured: 1001 is monthly and yearly
				},
				premium: { productId: 'q', usd: { amount: { monthly: '2001', yearly: '2002' } } }
			},
			defaults: {},
			pricingPlans: { STANDARD: { id: 'standard', lemonVariantId: '1500' } },
			sponsorAds: { monthly: '302' }
		})
	);

	it('names the period of the monthly and yearly plan variants', () => {
		assert.equal(lemonSqueezyVariantInterval(catalog, 1002), 'year');
		assert.equal(lemonSqueezyVariantInterval(catalog, '2001'), 'month');
		assert.equal(lemonSqueezyVariantInterval(catalog, '2002'), 'year');
		assert.equal(lemonSqueezyVariantInterval(catalog, 1011), 'month');
	});

	it('names none for an ambiguous id, a works.yml card, a sponsor ad or an unknown variant', () => {
		for (const id of ['1001', '1500', '302', '9999', null])
			assert.equal(lemonSqueezyVariantInterval(catalog, id), undefined, String(id));
	});
});

it('the webhook route reads prices through the cached loader', () => {
	const route = readFileSync(join(__dirname, '../../../app/api/lemonsqueezy/webhook/route.ts'), 'utf8').replace(
		/\s+/g,
		''
	);
	assert.ok(
		route.includes(
			'loadBillingDetails:createLemonSqueezyPriceLoader((priceId)=>getOrCreateLemonsqueezyProvider().getPriceAttributes(priceId))'
		)
	);
});

describe('updatedSubscriptionAmount (the amount a subscription update stores)', () => {
	const stored = 199;
	const update = (minorAmount: unknown, planId: string | null = 'standard') =>
		updatedSubscriptionAmount({
			planId,
			minorAmount,
			currency: 'eur',
			provider: 'lemonsqueezy',
			storedAmount: stored
		});

	it("stores the new price's amount, a zero price included", () => {
		assert.equal(update(1900), 19);
		assert.equal(update(0), 0);
	});

	it('clears the amount for a price with no flat amount, instead of keeping the previous price', () => {
		assert.equal(update(null), null);
	});

	it('keeps the stored amount only when the event carries no price amount', () => {
		for (const missing of [undefined, Number.NaN, -1, '1900'])
			assert.equal(update(missing), stored, String(missing));
	});

	it('stores 0 for the free plan', () => {
		assert.equal(update(1900, 'free'), 0);
		assert.equal(update(undefined, 'free'), 0);
	});

	it('is what handleSubscriptionUpdated stores', () => {
		const service = readFileSync(join(__dirname, '../../services/webhook-subscription.service.ts'), 'utf8').replace(
			/\s+/g,
			' '
		);
		assert.ok(
			service.includes(
				'amount: updatedSubscriptionAmount({ planId: response.planId, minorAmount: response.amount,'
			)
		);
		assert.ok(!service.includes('response.amount > 0'));
	});
});
