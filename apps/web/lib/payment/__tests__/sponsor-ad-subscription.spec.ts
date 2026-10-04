import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
	isSubscriptionAlreadyEnded,
	stopSponsorAdSubscription,
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
});

// Source guards: who stops the subscription, and who must not.
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8');

test('the service stops the subscription BEFORE it writes the cancelled or rejected row', () => {
	const service = source('../../services/sponsor-ad.service.ts');
	const stop = 'await stopSponsorAdSubscription(sponsorAd, getOrCreateProvider);';
	const cancelRow = 'return await sponsorAdRepo.cancelSponsorAd(id, cancelReason);';
	const rejectRow = 'return await sponsorAdRepo.rejectSponsorAd(id, adminUserId, rejectionReason);';
	const cancelGuard = service.indexOf('if (options.stopProviderSubscription) {');
	assert.ok(cancelGuard > 0, 'cancelSponsorAd has no opt-in subscription stop');
	assert.ok(service.indexOf(stop, cancelGuard) < service.indexOf(cancelRow), 'cancel writes the row first');
	const rejectAt = service.indexOf(rejectRow);
	const stopBeforeReject = service.lastIndexOf(stop, rejectAt);
	assert.ok(
		stopBeforeReject > 0 && stopBeforeReject > service.indexOf('async rejectSponsorAd('),
		'reject does not stop the subscription first'
	);
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
