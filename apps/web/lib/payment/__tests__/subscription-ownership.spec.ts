import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	findOwnedLemonSqueezySubscription,
	findOwnedProviderSubscription,
	SUBSCRIPTION_NOT_FOUND_MESSAGE
} from '../subscription-ownership';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The lookups are injected, so no database or LemonSqueezy account is needed.
 */

// Rows obey the real unique index (payment_provider, subscription_id). The lookup mimics
// `getSubscriptionByProviderSubscriptionId`. Row `a1` is what `POST /api/stripe/subscriptions`
// lets any user insert: the victim's Stripe id under another provider name.
const rows = [
	{ id: 'v1', userId: 'victim', paymentProvider: 'stripe', subscriptionId: 'sub_VICTIM' },
	{ id: 'a1', userId: 'attacker', paymentProvider: 'lemonsqueezy', subscriptionId: 'sub_VICTIM' },
	{ id: 'a2', userId: 'attacker', paymentProvider: 'stripe', subscriptionId: 'sub_ATTACKER' }
];

const providerCalls: Array<[string, string]> = [];
const byProvider = async (paymentProvider: string, subscriptionId: string) => {
	providerCalls.push([paymentProvider, subscriptionId]);
	return rows.find((row) => row.paymentProvider === paymentProvider && row.subscriptionId === subscriptionId) ?? null;
};

describe('findOwnedProviderSubscription', () => {
	it('returns the row for its owner', async () => {
		assert.deepEqual(await findOwnedProviderSubscription('victim', 'stripe', 'sub_VICTIM', byProvider), rows[0]);
		assert.deepEqual(
			await findOwnedProviderSubscription('attacker', 'stripe', 'sub_ATTACKER', byProvider),
			rows[2]
		);
	});

	it("returns null for another user's subscription id", async () => {
		assert.equal(await findOwnedProviderSubscription('attacker', 'stripe', 'sub_VICTIM', byProvider), null);
		assert.equal(await findOwnedProviderSubscription('victim', 'stripe', 'sub_ATTACKER', byProvider), null);
	});

	it('ignores a row with the same id under another provider name', async () => {
		// a1 belongs to the attacker but is not the Stripe row, so it is no proof of ownership.
		assert.equal(await findOwnedProviderSubscription('attacker', 'stripe', 'sub_VICTIM', byProvider), null);
	});

	it('returns null for an unknown subscription id', async () => {
		assert.equal(await findOwnedProviderSubscription('victim', 'stripe', 'sub_UNKNOWN', byProvider), null);
	});

	it('returns null for a missing or non-string id without querying', async () => {
		providerCalls.length = 0;
		for (const id of ['', '   ', undefined, null, 42, { $ne: '' }]) {
			assert.equal(await findOwnedProviderSubscription('victim', 'stripe', id, byProvider), null);
		}
		assert.equal(await findOwnedProviderSubscription(undefined, 'stripe', 'sub_VICTIM', byProvider), null);
		assert.equal(await findOwnedProviderSubscription('', 'stripe', 'sub_VICTIM', byProvider), null);
		assert.equal(await findOwnedProviderSubscription('victim', '', 'sub_VICTIM', byProvider), null);
		assert.deepEqual(providerCalls, []);
	});

	it('passes the provider and id to the lookup unchanged', async () => {
		providerCalls.length = 0;
		await findOwnedProviderSubscription('victim', 'stripe', 'sub_VICTIM', byProvider);
		assert.deepEqual(providerCalls, [['stripe', 'sub_VICTIM']]);
	});
});

const lemonSqueezy = new Map([
	['101', { id: '101', userEmail: 'Owner@Example.com' }],
	['102', { id: '102', userEmail: 'other@example.com' }],
	['103', { id: '103', userEmail: null }]
]);
const fetchCalls: string[] = [];
const fetchLemonSqueezy = async (id: string) => {
	fetchCalls.push(id);
	return lemonSqueezy.get(id) ?? null;
};

describe('findOwnedLemonSqueezySubscription', () => {
	it('returns the subscription when its customer email is the signed-in email', async () => {
		assert.deepEqual(
			await findOwnedLemonSqueezySubscription('owner@example.com', '101', fetchLemonSqueezy),
			lemonSqueezy.get('101')
		);
		assert.deepEqual(
			await findOwnedLemonSqueezySubscription(' OWNER@example.COM ', '101', fetchLemonSqueezy),
			lemonSqueezy.get('101')
		);
	});

	it("returns null for another customer's subscription", async () => {
		assert.equal(await findOwnedLemonSqueezySubscription('owner@example.com', '102', fetchLemonSqueezy), null);
		assert.equal(await findOwnedLemonSqueezySubscription('other@example.com', '101', fetchLemonSqueezy), null);
	});

	it('returns null when LemonSqueezy has no email or no such subscription', async () => {
		assert.equal(await findOwnedLemonSqueezySubscription('owner@example.com', '103', fetchLemonSqueezy), null);
		assert.equal(await findOwnedLemonSqueezySubscription('owner@example.com', '999', fetchLemonSqueezy), null);
	});

	it('returns null when the fetched subscription is a different id', async () => {
		const wrongId = async () => ({ id: '101', userEmail: 'owner@example.com' });
		assert.equal(await findOwnedLemonSqueezySubscription('owner@example.com', '555', wrongId), null);
	});

	it('refuses non-numeric ids and a missing email without calling LemonSqueezy', async () => {
		fetchCalls.length = 0;
		for (const id of ['', ' 101', '101 ', '101abc', '0', '-1', '1e3', 'sub_123', undefined, 101]) {
			assert.equal(await findOwnedLemonSqueezySubscription('owner@example.com', id, fetchLemonSqueezy), null);
		}
		for (const email of [undefined, null, '', '   ']) {
			assert.equal(await findOwnedLemonSqueezySubscription(email, '101', fetchLemonSqueezy), null);
		}
		assert.deepEqual(fetchCalls, []);
	});

	it('lets a LemonSqueezy outage fail the request instead of passing the check', async () => {
		const down = async () => {
			throw new Error('LemonSqueezy unavailable');
		};
		await assert.rejects(findOwnedLemonSqueezySubscription('owner@example.com', '101', down), /unavailable/);
	});
});

it('keeps the 404 message the routes already returned', () => {
	assert.equal(SUBSCRIPTION_NOT_FOUND_MESSAGE, 'Subscription not found or access denied');
});
