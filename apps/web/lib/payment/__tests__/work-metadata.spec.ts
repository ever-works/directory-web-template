import { describe, it, expect, afterEach, vi } from 'vitest';

import { getWorkId, stampWorkId, withWorkMetadata, WORK_ID_METADATA_KEY } from '../work-metadata';

/**
 * The shared Stripe webhook relay routes an event to the owning directory using
 * `metadata.work_id`. If a created object lacks it, the relay cannot route the
 * event and the purchase is never fulfilled — so these assertions are the
 * contract that keeps the relay able to do its job.
 *
 * See `EVER_WORKS_STRIPE_WEBHOOK_RELAY.md` in `ever-works/workspace`.
 */

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('work metadata stamping', () => {
	it('CONTROL: adds nothing when the site is not platform-provisioned', () => {
		vi.stubEnv('PLATFORM_WORK_ID', '');
		vi.stubEnv('WORK_ID', '');

		expect(getWorkId()).toBeNull();
		// Must pass the params through untouched — a self-hosted fork keeps working.
		expect(stampWorkId({ mode: 'subscription' })).toEqual({ mode: 'subscription' });
		expect(withWorkMetadata({ userId: 'u1' })).toEqual({ userId: 'u1' });
	});

	it('stamps work_id on a params object', () => {
		vi.stubEnv('PLATFORM_WORK_ID', 'work-abc');

		const out = stampWorkId({ mode: 'subscription', metadata: { userId: 'u1' } });

		expect(out.metadata).toEqual({ [WORK_ID_METADATA_KEY]: 'work-abc', userId: 'u1' });
	});

	it('🛑 stamps the NESTED bags Stripe does not populate from session metadata', () => {
		vi.stubEnv('PLATFORM_WORK_ID', 'work-abc');

		const out = stampWorkId({
			mode: 'subscription',
			metadata: { userId: 'u1' },
			subscription_data: { metadata: { sponsorAdId: 'ad1' } }
		}) as { subscription_data: { metadata: Record<string, string> } };

		// Without this, `customer.subscription.*` and `invoice.*` events — exactly
		// the ones the relay most needs to route — arrive with no routing key.
		expect(out.subscription_data.metadata).toEqual({
			[WORK_ID_METADATA_KEY]: 'work-abc',
			sponsorAdId: 'ad1'
		});
	});

	it('does NOT invent a nested bag the caller did not build', () => {
		vi.stubEnv('PLATFORM_WORK_ID', 'work-abc');

		const out = stampWorkId({ mode: 'payment' }) as Record<string, unknown>;

		// Sending `subscription_data` on a `mode: 'payment'` session is a Stripe 400.
		expect(out.subscription_data).toBeUndefined();
		expect(out.payment_intent_data).toBeUndefined();
	});

	it('never clobbers a deliberate caller override', () => {
		vi.stubEnv('PLATFORM_WORK_ID', 'work-abc');

		const out = stampWorkId({ metadata: { [WORK_ID_METADATA_KEY]: 'explicit-override' } });

		expect(out.metadata).toEqual({ [WORK_ID_METADATA_KEY]: 'explicit-override' });
	});

	it('falls back to WORK_ID when PLATFORM_WORK_ID is unset', () => {
		vi.stubEnv('PLATFORM_WORK_ID', '');
		vi.stubEnv('WORK_ID', 'work-from-fallback');

		expect(getWorkId()).toBe('work-from-fallback');
	});
});
