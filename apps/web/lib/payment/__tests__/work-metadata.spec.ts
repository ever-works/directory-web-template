import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { getWorkId, stampWorkId, withWorkMetadata, WORK_ID_METADATA_KEY } from '../work-metadata';

/**
 * The shared Stripe webhook relay routes an event to the owning directory using
 * `metadata.work_id`. If a created object lacks it, the relay cannot route the
 * event and the purchase is never fulfilled — so these assertions are the
 * contract that keeps the relay able to do its job.
 *
 * See `EVER_WORKS_STRIPE_WEBHOOK_RELAY.md` in `ever-works/workspace`.
 */

const originalPlatformWorkId = process.env.PLATFORM_WORK_ID;
const originalWorkId = process.env.WORK_ID;

function stubEnv(name: 'PLATFORM_WORK_ID' | 'WORK_ID', value: string): void {
	process.env[name] = value;
}

function restoreEnv(name: 'PLATFORM_WORK_ID' | 'WORK_ID', value: string | undefined): void {
	if (value === undefined) {
		delete process.env[name];
		return;
	}

	process.env[name] = value;
}

afterEach(() => {
	restoreEnv('PLATFORM_WORK_ID', originalPlatformWorkId);
	restoreEnv('WORK_ID', originalWorkId);
});

describe('work metadata stamping', () => {
	it('CONTROL: adds nothing when the site is not platform-provisioned', () => {
		stubEnv('PLATFORM_WORK_ID', '');
		stubEnv('WORK_ID', '');

		assert.equal(getWorkId(), null);
		// Must pass the params through untouched — a self-hosted fork keeps working.
		assert.deepEqual(stampWorkId({ mode: 'subscription' }), { mode: 'subscription' });
		assert.deepEqual(withWorkMetadata({ userId: 'u1' }), { userId: 'u1' });
	});

	it('stamps work_id on a params object', () => {
		stubEnv('PLATFORM_WORK_ID', 'work-abc');

		const out = stampWorkId({ mode: 'subscription', metadata: { userId: 'u1' } });

		assert.deepEqual(out.metadata, { [WORK_ID_METADATA_KEY]: 'work-abc', userId: 'u1' });
	});

	it('🛑 stamps the NESTED bags Stripe does not populate from session metadata', () => {
		stubEnv('PLATFORM_WORK_ID', 'work-abc');

		const out = stampWorkId({
			mode: 'subscription',
			metadata: { userId: 'u1' },
			subscription_data: { metadata: { sponsorAdId: 'ad1' } }
		}) as { subscription_data: { metadata: Record<string, string> } };

		// Without this, `customer.subscription.*` and `invoice.*` events — exactly
		// the ones the relay most needs to route — arrive with no routing key.
		assert.deepEqual(out.subscription_data.metadata, {
			[WORK_ID_METADATA_KEY]: 'work-abc',
			sponsorAdId: 'ad1'
		});
	});

	it('does NOT invent a nested bag the caller did not build', () => {
		stubEnv('PLATFORM_WORK_ID', 'work-abc');

		const out = stampWorkId({ mode: 'payment' }) as Record<string, unknown>;

		// Sending `subscription_data` on a `mode: 'payment'` session is a Stripe 400.
		assert.equal(out.subscription_data, undefined);
		assert.equal(out.payment_intent_data, undefined);
	});

	it('never clobbers a deliberate caller override', () => {
		stubEnv('PLATFORM_WORK_ID', 'work-abc');

		const out = stampWorkId({ metadata: { [WORK_ID_METADATA_KEY]: 'explicit-override' } });

		assert.deepEqual(out.metadata, { [WORK_ID_METADATA_KEY]: 'explicit-override' });
	});

	it('falls back to WORK_ID when PLATFORM_WORK_ID is unset', () => {
		stubEnv('PLATFORM_WORK_ID', '');
		stubEnv('WORK_ID', 'work-from-fallback');

		assert.equal(getWorkId(), 'work-from-fallback');
	});
});
