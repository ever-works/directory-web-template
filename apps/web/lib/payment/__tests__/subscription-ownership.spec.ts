import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findOwnedSubscription } from '../subscription-ownership';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The lookup is injected, so no database is needed. It mimics
 * `getSubscriptionByUserIdAndSubscriptionId`: a row is returned only when both the
 * owner and the provider subscription id match.
 */
const rows = [
	{ id: 'row-1', userId: 'user-a', subscriptionId: '101' },
	{ id: 'row-2', userId: 'user-b', subscriptionId: '102' }
];

const calls: Array<[string, string]> = [];
const lookup = async (userId: string, subscriptionId: string) => {
	calls.push([userId, subscriptionId]);
	return rows.find((row) => row.userId === userId && row.subscriptionId === subscriptionId) ?? null;
};

describe('findOwnedSubscription', () => {
	it('returns the row for its owner', async () => {
		assert.deepEqual(await findOwnedSubscription('user-a', '101', lookup), rows[0]);
	});

	it("returns null for another user's subscription id", async () => {
		assert.equal(await findOwnedSubscription('user-a', '102', lookup), null);
		assert.equal(await findOwnedSubscription('user-b', '101', lookup), null);
	});

	it('returns null for an unknown subscription id', async () => {
		assert.equal(await findOwnedSubscription('user-a', '999', lookup), null);
	});

	it('returns null for an empty or blank subscription id without querying', async () => {
		calls.length = 0;
		assert.equal(await findOwnedSubscription('user-a', '', lookup), null);
		assert.equal(await findOwnedSubscription('user-a', '   ', lookup), null);
		assert.equal(await findOwnedSubscription('user-a', undefined, lookup), null);
		assert.deepEqual(calls, []);
	});

	it('returns null for a missing user id without querying', async () => {
		calls.length = 0;
		assert.equal(await findOwnedSubscription(undefined, '101', lookup), null);
		assert.equal(await findOwnedSubscription('', '101', lookup), null);
		assert.deepEqual(calls, []);
	});

	it('passes the ids to the lookup unchanged', async () => {
		calls.length = 0;
		await findOwnedSubscription('user-a', '101', lookup);
		assert.deepEqual(calls, [['user-a', '101']]);
	});
});
