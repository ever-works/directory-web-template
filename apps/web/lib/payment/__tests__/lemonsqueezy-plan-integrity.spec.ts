import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { createLemonSqueezySubscriptionEvents, type SponsorAdRecord } from '../lemonsqueezy-subscription-events';
import {
	buildLemonSqueezyVariantCatalog,
	collectLemonSqueezyVariantSources,
	isLemonSqueezyPlanVariant,
	matchLemonSqueezyVariant
} from '../lemonsqueezy-variant-plan';
import type { SubscriptionServiceInput } from '../lemonsqueezy-webhook';

/**
 * Spec 060 R9-R11: the plan a LemonSqueezy subscription grants comes from the variant that was
 * paid for (server configuration), never from `meta.custom_data`, which the buyer controls (a
 * checkout link accepts `checkout[custom][...]`, and the checkout route used to copy client
 * metadata into it). Run with: `pnpm --filter @ever-works/web test:unit`.
 */

const STANDARD_VARIANT = 111;
const PREMIUM_VARIANT = 222;
const SPONSOR_WEEKLY_VARIANT = 301;
const SPONSOR_MONTHLY_VARIANT = 302;
const UNKNOWN_VARIANT = 999;

const catalog = buildLemonSqueezyVariantCatalog({
	plans: [
		{ planId: 'standard', variantIds: [String(STANDARD_VARIANT)] },
		{ planId: 'premium', variantIds: [String(PREMIUM_VARIANT)] }
	],
	sponsorAds: [
		{ interval: 'weekly', variantIds: [String(SPONSOR_WEEKLY_VARIANT)] },
		{ interval: 'monthly', variantIds: [String(SPONSOR_MONTHLY_VARIANT)] }
	]
});

type PlanCall = { method: string; data: SubscriptionServiceInput; options?: { createIfMissing?: boolean } };

function harness(ads: Record<string, SponsorAdRecord> = {}) {
	const planCalls: PlanCall[] = [];
	const sponsorCalls: Array<[string, ...unknown[]]> = [];
	const record =
		(method: string) => async (data: SubscriptionServiceInput, options?: { createIfMissing?: boolean }) => {
			planCalls.push({ method, data, options });
			return { success: true };
		};
	const quiet = { log() {}, warn() {}, error() {} };
	const events = createLemonSqueezySubscriptionEvents({
		plans: {
			handleSubscriptionCreated: record('created'),
			handleSubscriptionUpdated: record('updated'),
			handleSubscriptionCancelled: record('cancelled'),
			handleSubscriptionPaymentSucceeded: record('paymentSucceeded'),
			handleSubscriptionPaymentFailed: record('paymentFailed'),
			handleSubscriptionTrialEnding: record('trialEnding')
		},
		sponsorAds: {
			getSponsorAdById: async (id: string) => ads[id] ?? null,
			confirmPayment: async (id: string, subscriptionId?: string, customerId?: string) => {
				sponsorCalls.push(['confirmPayment', id, subscriptionId, customerId]);
				return ads[id];
			},
			cancelSponsorAd: async (id: string, reason?: string) => {
				sponsorCalls.push(['cancelSponsorAd', id, reason]);
				return ads[id];
			},
			renewSponsorAd: async (id: string) => {
				sponsorCalls.push(['renewSponsorAd', id]);
				return ads[id];
			}
		},
		loadVariantCatalog: async () => catalog,
		logger: quiet,
		now: () => Date.parse('2026-01-15T00:00:00Z')
	});
	return { events, planCalls, sponsorCalls };
}

const subscription = (variantId: unknown, customData: Record<string, unknown> = {}, id = '42') => ({
	id,
	type: 'subscriptions',
	attributes: {
		customer_id: 7,
		user_email: 'buyer@example.com',
		variant_id: variantId,
		status: 'active',
		cancelled: false,
		created_at: '2026-01-01T00:00:00Z',
		renews_at: '2026-02-01T00:00:00Z'
	},
	meta: { event_name: 'subscription_created', custom_data: customData }
});

const invoice = (subscriptionId: string, billingReason: string, customData: Record<string, unknown> = {}) => ({
	id: '555',
	type: 'subscription-invoices',
	attributes: { subscription_id: Number(subscriptionId), billing_reason: billingReason, status: 'paid', total: 1900 },
	meta: { event_name: 'subscription_payment_success', custom_data: customData }
});

test('a subscription paid on the Standard variant is stored as Standard even when custom data says premium', async () => {
	const { events, planCalls } = harness();
	const handled = await events.created(subscription(STANDARD_VARIANT, { userId: 'user_1', planId: 'premium' }));

	assert.equal(handled, true);
	assert.equal(planCalls.length, 1);
	assert.equal(planCalls[0].method, 'created');
	// WebhookSubscriptionService stores `metadata.planId` as the row's plan (formatData).
	assert.equal(planCalls[0].data.metadata.planId, 'standard');
	assert.equal(planCalls[0].data.metadata.userId, 'user_1');
});

test('the Premium variant is stored as Premium without any plan in the custom data', async () => {
	const { events, planCalls } = harness();
	await events.created(subscription(PREMIUM_VARIANT, { userId: 'user_1' }));
	assert.equal(planCalls[0].data.metadata.planId, 'premium');
});

test('a plan change to the cheaper variant stores the cheaper plan, whatever the custom data says', async () => {
	const { events, planCalls } = harness();
	await events.updated(subscription(STANDARD_VARIANT, { userId: 'user_1', planId: 'premium' }));
	assert.equal(planCalls.length, 1);
	assert.equal(planCalls[0].method, 'updated');
	assert.equal(planCalls[0].data.metadata.planId, 'standard');
	assert.notEqual(planCalls[0].options?.createIfMissing, false);
});

test('a variant no plan is configured for writes no subscription row and is acknowledged', async () => {
	const { events, planCalls, sponsorCalls } = harness();
	const handled = await events.created(subscription(UNKNOWN_VARIANT, { userId: 'user_1', planId: 'premium' }));

	assert.equal(handled, true, 'an unknown variant must be acknowledged, not retried');
	assert.deepEqual(planCalls, []);
	assert.deepEqual(sponsorCalls, []);
});

test('a missing variant id is treated as unknown', async () => {
	const { events, planCalls } = harness();
	assert.equal(await events.created(subscription(undefined, { planId: 'premium' })), true);
	assert.deepEqual(planCalls, []);
});

test('an update on an unknown variant never creates a row and never sets a plan', async () => {
	const { events, planCalls } = harness();
	assert.equal(await events.updated(subscription(UNKNOWN_VARIANT, { userId: 'user_1', planId: 'premium' })), true);

	assert.equal(planCalls.length, 1);
	assert.equal(planCalls[0].options?.createIfMissing, false, 'only an existing row may be updated');
	assert.equal(planCalls[0].data.metadata.planId, undefined, 'the stored plan must stay as it is');
});

test('an invoice cannot say which plan was bought, so it never creates a plan row', async () => {
	const { events, planCalls } = harness();
	await events.paymentSucceeded(invoice('42', 'renewal', { userId: 'user_1', planId: 'premium' }));

	assert.equal(planCalls.length, 1);
	assert.equal(planCalls[0].method, 'paymentSucceeded');
	assert.equal(planCalls[0].options?.createIfMissing, false);
	assert.equal(planCalls[0].data.metadata.planId, undefined);
});

test('a sponsor-ad marker in the custom data of a plan variant does not touch the sponsor ad', async () => {
	const ads = { ad_1: { id: 'ad_1', status: 'pending_payment', interval: 'monthly', subscriptionId: null } };
	const { events, planCalls, sponsorCalls } = harness(ads);
	await events.created(subscription(STANDARD_VARIANT, { userId: 'user_1', type: 'sponsor_ad', sponsorAdId: 'ad_1' }));

	assert.deepEqual(sponsorCalls, [], 'paying for a plan must not activate a sponsor ad');
	assert.equal(planCalls[0].data.metadata.planId, 'standard');
});

test('a sponsor-ad variant activates the named ad when its interval matches, and creates no plan row', async () => {
	const ads = { ad_1: { id: 'ad_1', status: 'pending_payment', interval: 'weekly', subscriptionId: null } };
	const { events, planCalls, sponsorCalls } = harness(ads);
	assert.equal(
		await events.created(subscription(SPONSOR_WEEKLY_VARIANT, { type: 'sponsor_ad', sponsorAdId: 'ad_1' })),
		true
	);

	assert.deepEqual(planCalls, []);
	assert.deepEqual(sponsorCalls, [['confirmPayment', 'ad_1', '42', '7']]);
});

test('a cheaper sponsor-ad interval does not activate an ad booked for a longer one', async () => {
	const ads = { ad_1: { id: 'ad_1', status: 'pending_payment', interval: 'monthly', subscriptionId: null } };
	const { events, planCalls, sponsorCalls } = harness(ads);
	assert.equal(
		await events.created(subscription(SPONSOR_WEEKLY_VARIANT, { type: 'sponsor_ad', sponsorAdId: 'ad_1' })),
		true
	);

	assert.deepEqual(sponsorCalls, []);
	assert.deepEqual(planCalls, []);
});

test('sponsor-ad updates and payment failures never create a plan row', async () => {
	const ads = { ad_1: { id: 'ad_1', status: 'active', interval: 'weekly', subscriptionId: '42' } };
	const { events, planCalls } = harness(ads);
	await events.updated(subscription(SPONSOR_WEEKLY_VARIANT, { type: 'sponsor_ad', sponsorAdId: 'ad_1' }));
	await events.paymentFailed(invoice('42', 'renewal', { type: 'sponsor_ad', sponsorAdId: 'ad_1' }));

	for (const call of planCalls) {
		assert.equal(call.options?.createIfMissing, false, `${call.method} could create a plan row`);
		assert.equal(call.data.metadata.planId, undefined);
	}
	assert.ok(
		!planCalls.some((call) => call.method === 'paymentFailed'),
		'a bound sponsor ad has no plan row to pause'
	);
});

test('a renewal invoice renews only the sponsor ad bound to that subscription', async () => {
	const ads = {
		ad_1: { id: 'ad_1', status: 'active', interval: 'weekly', subscriptionId: '42' },
		ad_2: { id: 'ad_2', status: 'active', interval: 'monthly', subscriptionId: '77' }
	};
	const { events, sponsorCalls, planCalls } = harness(ads);

	await events.paymentSucceeded(invoice('42', 'renewal', { type: 'sponsor_ad', sponsorAdId: 'ad_1' }));
	assert.deepEqual(sponsorCalls, [['renewSponsorAd', 'ad_1']]);
	assert.equal(planCalls.length, 0);

	// A plan subscription (43) whose custom data names someone else's ad must not extend it.
	await events.paymentSucceeded(invoice('43', 'renewal', { type: 'sponsor_ad', sponsorAdId: 'ad_2' }));
	assert.deepEqual(sponsorCalls, [['renewSponsorAd', 'ad_1']]);
	assert.equal(planCalls.length, 1);
	assert.equal(planCalls[0].options?.createIfMissing, false);
});

test('the first sponsor-ad invoice is acknowledged, not counted as a renewal', async () => {
	const ads = { ad_1: { id: 'ad_1', status: 'pending', interval: 'weekly', subscriptionId: '42' } };
	const { events, sponsorCalls, planCalls } = harness(ads);
	assert.equal(
		await events.paymentSucceeded(invoice('42', 'initial', { type: 'sponsor_ad', sponsorAdId: 'ad_1' })),
		true
	);
	assert.deepEqual(sponsorCalls, []);
	assert.deepEqual(planCalls, []);
});

test('a cancellation cancels only the sponsor ad bound to that subscription', async () => {
	const ads = { ad_1: { id: 'ad_1', status: 'active', interval: 'weekly', subscriptionId: '42' } };
	const bound = harness(ads);
	await bound.events.cancelled(subscription(SPONSOR_WEEKLY_VARIANT, { type: 'sponsor_ad', sponsorAdId: 'ad_1' }));
	assert.deepEqual(bound.sponsorCalls, [['cancelSponsorAd', 'ad_1', 'LemonSqueezy subscription cancelled']]);
	assert.deepEqual(bound.planCalls, []);

	// Someone else's subscription naming ad_1 cannot cancel it.
	const other = harness(ads);
	await other.events.cancelled(
		subscription(SPONSOR_WEEKLY_VARIANT, { type: 'sponsor_ad', sponsorAdId: 'ad_1' }, '99')
	);
	assert.deepEqual(other.sponsorCalls, []);
});

test('a variant catalog that cannot be loaded makes the event retry, not acknowledge', async () => {
	const failing = createLemonSqueezySubscriptionEvents({
		plans: {} as never,
		sponsorAds: {} as never,
		loadVariantCatalog: async () => {
			throw new Error('content unavailable');
		},
		logger: { log() {}, warn() {}, error() {} }
	});
	assert.equal(await failing.created(subscription(STANDARD_VARIANT)), false);
});

test('the variant catalog covers every variant the pricing page can check out', () => {
	const sources = collectLemonSqueezyVariantSources({
		billing: {
			standard: {
				productId: 'p_std',
				usd: { amount: { monthly: '1001', yearly: '1002', setupFee: '1003' } },
				eur: { amount: { monthly: '1011' } }
			},
			premium: { productId: 'p_pre', usd: { amount: { monthly: '2001', yearly: '2002' } } },
			free: { productId: undefined }
		},
		defaults: { free: ['3000'], standard: ['1001', '1099'], premium: ['', undefined, '2099'] },
		pricingPlans: {
			STANDARD: { id: 'standard', lemonVariantId: '1500' },
			PREMIUM: { id: 'premium', lemonVariantId: '2500' },
			CUSTOM: { id: 'enterprise', lemonVariantId: '9100' }
		},
		sponsorAds: { weekly: '301', monthly: ' 302 ' }
	});
	const built = buildLemonSqueezyVariantCatalog(sources);
	const planOf = (variant: unknown) => {
		const match = matchLemonSqueezyVariant(built, variant);
		return match.kind === 'plan' ? match.planId : match.kind;
	};

	for (const id of ['1001', '1002', '1011', '1099', '1500']) assert.equal(planOf(id), 'standard', id);
	for (const id of ['2001', '2002', '2099', '2500']) assert.equal(planOf(id), 'premium', id);
	assert.equal(planOf(3000), 'free');
	assert.equal(planOf(1001), 'standard', 'numeric variant ids from the event match string config');
	// A setup-fee id is not a checkout variant, and a plan id the pricing page cannot check out is ignored.
	assert.equal(planOf('1003'), 'unknown');
	assert.equal(planOf('9100'), 'unknown');
	assert.deepEqual(matchLemonSqueezyVariant(built, '302'), { kind: 'sponsor_ad', interval: 'monthly' });
	assert.equal(planOf(''), 'unknown');
	assert.equal(planOf(null), 'unknown');
});

test('a variant configured for two different plans is ambiguous and grants nothing', () => {
	const built = buildLemonSqueezyVariantCatalog({
		plans: [
			{ planId: 'standard', variantIds: ['500', '501'] },
			{ planId: 'premium', variantIds: ['500'] },
			{ planId: 'standard', variantIds: ['501'] }
		],
		sponsorAds: [{ interval: 'weekly', variantIds: ['501'] }]
	});
	assert.deepEqual(matchLemonSqueezyVariant(built, '500'), { kind: 'unknown' });
	assert.deepEqual(matchLemonSqueezyVariant(built, '501'), { kind: 'unknown' });
});

test('an ad already past an event is acknowledged, not retried (sponsor-ad-lifecycle decisions)', async () => {
	const ads = {
		confirmed: { id: 'confirmed', status: 'pending', interval: 'weekly', subscriptionId: '42' },
		ended: { id: 'ended', status: 'cancelled', interval: 'weekly', subscriptionId: '42' },
		review: { id: 'review', status: 'pending', interval: 'weekly', subscriptionId: '42' }
	};
	const { events, sponsorCalls } = harness(ads);

	// A redelivered subscription_created for an ad whose payment is already confirmed.
	assert.equal(
		await events.created(subscription(SPONSOR_WEEKLY_VARIANT, { type: 'sponsor_ad', sponsorAdId: 'confirmed' })),
		true
	);
	// A cancellation or renewal of an ad that is already cancelled.
	assert.equal(
		await events.cancelled(subscription(SPONSOR_WEEKLY_VARIANT, { type: 'sponsor_ad', sponsorAdId: 'ended' })),
		true
	);
	assert.equal(await events.paymentSucceeded(invoice('42', 'renewal', { sponsorAdId: 'ended' })), true);
	assert.deepEqual(sponsorCalls, []);

	// A renewal while the ad still awaits admin review may succeed later: retried.
	assert.equal(await events.paymentSucceeded(invoice('42', 'renewal', { sponsorAdId: 'review' })), false);
	assert.deepEqual(sponsorCalls, []);
});

test('only a plan variant is a variant a subscription may move to (R12)', () => {
	assert.equal(isLemonSqueezyPlanVariant(catalog, STANDARD_VARIANT), true);
	assert.equal(isLemonSqueezyPlanVariant(catalog, String(PREMIUM_VARIANT)), true);
	assert.equal(isLemonSqueezyPlanVariant(catalog, SPONSOR_WEEKLY_VARIANT), false);
	assert.equal(isLemonSqueezyPlanVariant(catalog, UNKNOWN_VARIANT), false);
	assert.equal(isLemonSqueezyPlanVariant(catalog, undefined), false);
});

test('update-plan and update refuse a non-plan variant before calling LemonSqueezy (R12)', () => {
	// The routes import `auth` and cannot be loaded under `tsx --test`, so the wiring is checked in the source.
	const source = (path: string) => readFileSync(join(__dirname, path), 'utf8').replace(/\s+/g, ' ');
	const checks: Array<[string, string]> = [
		[
			'../../../app/api/lemonsqueezy/update-plan/route.ts',
			'isLemonSqueezyPlanVariant(await loadLemonSqueezyVariantCatalog(), variantId)'
		],
		[
			'../../../app/api/lemonsqueezy/update/route.ts',
			'isLemonSqueezyPlanVariant(await loadLemonSqueezyVariantCatalog(), validationResult.data.priceId)'
		]
	];
	for (const [path, check] of checks) {
		const route = source(path);
		const at = route.indexOf(check);
		assert.ok(at >= 0, `${path} does not check the variant`);
		assert.ok(at < route.indexOf('.updateSubscription('), `${path} checks the variant after calling LemonSqueezy`);
	}
});

test('a sponsor-ad confirmation that writes nothing is retried, as on the Stripe path', async () => {
	const failing = createLemonSqueezySubscriptionEvents({
		plans: {} as never,
		sponsorAds: {
			getSponsorAdById: async (id: string) => ({
				id,
				status: 'pending_payment',
				interval: 'weekly',
				subscriptionId: null
			}),
			confirmPayment: async () => null,
			cancelSponsorAd: async () => null,
			renewSponsorAd: async () => null
		},
		loadVariantCatalog: async () => catalog,
		logger: { log() {}, warn() {}, error() {} }
	});
	assert.equal(
		await failing.created(subscription(SPONSOR_WEEKLY_VARIANT, { type: 'sponsor_ad', sponsorAdId: 'ad_1' })),
		false
	);
});
