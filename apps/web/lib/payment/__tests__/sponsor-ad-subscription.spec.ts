import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
	isSubscriptionAlreadyEnded,
	stopSponsorAdSubscription,
	stopSubscriptionThenWrite,
	type SubscriptionCanceller
} from '../sponsor-ad-subscription';

// Billing audit 2026-10-03: cancelling a sponsor ad in the app (owner or admin), or rejecting a
// paid one, only changed the row; the Stripe subscription kept billing every cycle.

function fakeProviders(
	behaviour: (subscriptionId: string, atPeriodEnd?: boolean) => Promise<unknown> = async () => ({})
) {
	const resolved: string[] = [];
	const calls: Array<{ subscriptionId: string; atPeriodEnd?: boolean }> = [];
	const resolve = (name: string): SubscriptionCanceller => {
		resolved.push(name);
		return {
			cancelSubscription: (subscriptionId, atPeriodEnd) => {
				calls.push({ subscriptionId, atPeriodEnd });
				return behaviour(subscriptionId, atPeriodEnd);
			}
		};
	};
	return { resolve, resolved, calls };
}

test('an ad with a Stripe subscription has it cancelled immediately, not at period end', async () => {
	const p = fakeProviders();
	const outcome = await stopSponsorAdSubscription(
		{ paymentProvider: 'stripe', subscriptionId: 'sub_123' },
		p.resolve
	);
	assert.equal(outcome, 'cancelled');
	assert.deepEqual(p.resolved, ['stripe']);
	assert.deepEqual(p.calls, [{ subscriptionId: 'sub_123', atPeriodEnd: false }]);
});

test("the ad's own provider is used, and a missing provider means Stripe (the column default)", async () => {
	const polar = fakeProviders();
	await stopSponsorAdSubscription({ paymentProvider: 'polar', subscriptionId: 'pol_1' }, polar.resolve);
	assert.deepEqual(polar.resolved, ['polar']);

	const unset = fakeProviders();
	await stopSponsorAdSubscription({ paymentProvider: null, subscriptionId: 'sub_9' }, unset.resolve);
	await stopSponsorAdSubscription({ paymentProvider: '  ', subscriptionId: 'sub_9' }, unset.resolve);
	assert.deepEqual(unset.resolved, ['stripe', 'stripe']);
});

test('an ad without a subscription (checkout never completed) needs no provider call', async () => {
	for (const subscriptionId of [null, undefined, '', '   ']) {
		const p = fakeProviders();
		const outcome = await stopSponsorAdSubscription({ paymentProvider: 'stripe', subscriptionId }, p.resolve);
		assert.equal(outcome, 'no-subscription');
		assert.deepEqual(p.resolved, [], 'no provider should be built');
		assert.equal(p.calls.length, 0);
	}
});

test('a subscription the provider no longer has counts as stopped', async () => {
	const missing = Object.assign(new Error("No such subscription: 'sub_gone'"), {
		code: 'resource_missing',
		statusCode: 404
	});
	const p = fakeProviders(async () => {
		throw missing;
	});
	assert.equal(await stopSponsorAdSubscription({ subscriptionId: 'sub_gone' }, p.resolve), 'already-ended');
	assert.equal(isSubscriptionAlreadyEnded(new Error('This subscription has already been canceled.')), true);
	// A provider that wraps the SDK error (Lemon Squeezy, Polar) is searched through `cause`.
	assert.equal(isSubscriptionAlreadyEnded(new Error('Failed to cancel subscription', { cause: missing })), true);
});

test('any other provider failure is rethrown, so the caller never marks the ad ended while it still bills', async () => {
	const outage = Object.assign(new Error('Stripe is down'), { type: 'StripeAPIError', statusCode: 500 });
	const p = fakeProviders(async () => {
		throw outage;
	});
	await assert.rejects(stopSponsorAdSubscription({ subscriptionId: 'sub_123' }, p.resolve), outage);
	assert.equal(isSubscriptionAlreadyEnded(outage), false);
	assert.equal(isSubscriptionAlreadyEnded(null), false);
	assert.equal(isSubscriptionAlreadyEnded('resource_missing'), false);
	// A bare 404 or a generic wrapper is NOT proof the subscription is gone (a misconfigured
	// provider URL also answers 404); it must not let the app mark the ad ended.
	assert.equal(isSubscriptionAlreadyEnded(Object.assign(new Error('Not Found'), { statusCode: 404 })), false);
	assert.equal(isSubscriptionAlreadyEnded(new Error('Failed to cancel subscription', { cause: outage })), false);
});

test("the row is written only after the subscription is stopped, with the ad's own subscription", async () => {
	const order: string[] = [];
	const p = fakeProviders(async (subscriptionId) => {
		order.push(`stop:${subscriptionId}`);
		return {};
	});
	const result = await stopSubscriptionThenWrite(
		{ paymentProvider: 'stripe', subscriptionId: 'sub_owned_by_this_ad' },
		p.resolve,
		async () => {
			order.push('write');
			return 'row';
		}
	);
	assert.equal(result, 'row');
	assert.deepEqual(order, ['stop:sub_owned_by_this_ad', 'write']);
});

test('a failed stop leaves the row untouched and surfaces the error', async () => {
	const outage = new Error('Stripe is down');
	const p = fakeProviders(async () => {
		throw outage;
	});
	let written = false;
	await assert.rejects(
		stopSubscriptionThenWrite({ subscriptionId: 'sub_123' }, p.resolve, async () => {
			written = true;
			return 'row';
		}),
		outage
	);
	assert.equal(written, false, 'the ad must not be marked ended while its subscription still bills');
});

test('an already-ended subscription or an ad without one still gets its row written', async () => {
	for (const ad of [{ subscriptionId: null }, { subscriptionId: 'sub_gone' }]) {
		const p = fakeProviders(async () => {
			throw Object.assign(new Error('gone'), { code: 'resource_missing' });
		});
		let written = 0;
		await stopSubscriptionThenWrite(ad, p.resolve, async () => {
			written++;
			return 'row';
		});
		assert.equal(written, 1);
	}
});

// Source guards: who stops the subscription, and who must not.
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8');

test('the service routes the opt-in cancel and every reject through stopSubscriptionThenWrite', () => {
	const service = source('../../services/sponsor-ad.service.ts');
	const body = (name: string) => {
		const start = service.indexOf(`async ${name}(`);
		assert.ok(start > 0, `${name} not found`);
		const next = service.indexOf('\n\t/**', start);
		return service.slice(start, next > start ? next : undefined);
	};
	const squash = (text: string) => text.replace(/\s+/g, ' ');

	const cancel = squash(body('cancelSponsorAd'));
	const guarded =
		'if (options.stopProviderSubscription) { return await stopSubscriptionThenWrite(sponsorAd, getOrCreateProvider, () => sponsorAdRepo.cancelSponsorAd(id, cancelReason) ); }';
	assert.ok(cancel.includes(guarded), 'cancelSponsorAd does not stop the subscription before the row write');

	const reject = squash(body('rejectSponsorAd'));
	assert.ok(
		reject.includes(
			'return await stopSubscriptionThenWrite(sponsorAd, getOrCreateProvider, () => sponsorAdRepo.rejectSponsorAd(id, adminUserId, rejectionReason) );'
		),
		'rejectSponsorAd does not stop the subscription before the row write'
	);
	// No path in reject writes the row directly.
	assert.equal(reject.split('sponsorAdRepo.rejectSponsorAd(').length - 1, 1);
});

test('the in-app cancel routes opt in; the webhook-driven cancels do not', () => {
	for (const route of [
		'../../../app/api/sponsor-ads/user/[id]/cancel/route.ts',
		'../../../app/api/admin/sponsor-ads/[id]/cancel/route.ts'
	]) {
		assert.ok(/stopProviderSubscription:\s*true/.test(source(route)), `${route} does not stop the subscription`);
	}
	for (const webhook of [
		'../webhook-dispatch.ts',
		'../../../app/api/polar/webhook/handlers.ts',
		'../../../app/api/lemonsqueezy/webhook/route.ts'
	]) {
		const text = source(webhook);
		assert.ok(text.includes('sponsorAdService.cancelSponsorAd('), `${webhook} no longer cancels ads`);
		assert.ok(
			!text.includes('stopProviderSubscription'),
			`${webhook} must not cancel an already-deleted subscription`
		);
	}
});
