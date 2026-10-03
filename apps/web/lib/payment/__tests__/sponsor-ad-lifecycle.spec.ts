import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
	renewalStartDate,
	sponsorAdActivationDecision,
	sponsorAdCancellationDecision,
	sponsorAdRenewalDecision
} from '../sponsor-ad-lifecycle';

// CC05-04 review (2026-10-03): once sponsor invoices were classified correctly, every
// cycle invoice reached renewSponsorAd, which throws for a cancelled or rejected ad. Nothing
// cancels the Stripe subscription of such an ad, so it kept billing, and each cycle invoice
// became a 502 that the platform relays to Stripe as a retry for about three days.

test('a renewal extends only an active or expired ad', () => {
	assert.equal(sponsorAdRenewalDecision('active'), 'act');
	assert.equal(sponsorAdRenewalDecision('expired'), 'act');
});

test('a renewal paid for a cancelled or rejected ad is acknowledged, not retried', () => {
	assert.equal(sponsorAdRenewalDecision('cancelled'), 'acknowledge');
	assert.equal(sponsorAdRenewalDecision('rejected'), 'acknowledge');
});

test('a renewal paid while the ad is still pending stays retryable', () => {
	assert.equal(sponsorAdRenewalDecision('pending'), 'retry');
	assert.equal(sponsorAdRenewalDecision('pending_payment'), 'retry');
});

test('a missing ad or an unknown status is acknowledged, never retried', () => {
	for (const decide of [sponsorAdRenewalDecision, sponsorAdCancellationDecision, sponsorAdActivationDecision]) {
		assert.equal(decide(null), 'acknowledge');
		assert.equal(decide(undefined), 'acknowledge');
		assert.equal(decide('no-such-status'), 'acknowledge');
		// An inherited property name is not a status.
		assert.equal(decide('toString'), 'acknowledge');
	}
});

test('cancellation is idempotent: an ad that is already over is acknowledged', () => {
	assert.equal(sponsorAdCancellationDecision('pending_payment'), 'act');
	assert.equal(sponsorAdCancellationDecision('pending'), 'act');
	assert.equal(sponsorAdCancellationDecision('active'), 'act');
	assert.equal(sponsorAdCancellationDecision('cancelled'), 'acknowledge');
	assert.equal(sponsorAdCancellationDecision('expired'), 'acknowledge');
	assert.equal(sponsorAdCancellationDecision('rejected'), 'acknowledge');
});

test('activation confirms only an ad awaiting payment; a duplicate delivery is acknowledged', () => {
	assert.equal(sponsorAdActivationDecision('pending_payment'), 'act');
	for (const status of ['pending', 'active', 'expired', 'cancelled', 'rejected']) {
		assert.equal(sponsorAdActivationDecision(status), 'acknowledge', status);
	}
});

test('no sponsor-ad decision answers retry except a renewal on a pending ad', () => {
	const statuses = ['pending_payment', 'pending', 'active', 'expired', 'cancelled', 'rejected'];
	const retries = statuses.flatMap((status) =>
		[
			['renewal', sponsorAdRenewalDecision(status)],
			['cancellation', sponsorAdCancellationDecision(status)],
			['activation', sponsorAdActivationDecision(status)]
		]
			.filter(([, decision]) => decision === 'retry')
			.map(([action]) => `${action}:${status}`)
	);
	assert.deepEqual(retries, ['renewal:pending_payment', 'renewal:pending']);
});

test('a renewal starts at the current end date while it is still ahead', () => {
	const now = new Date('2026-10-03T12:00:00Z');
	const end = new Date('2026-10-05T12:00:00Z');
	assert.equal(renewalStartDate(end, now).toISOString(), end.toISOString());
});

test('a renewal of an ad that expired long ago starts now, not in the past', () => {
	const now = new Date('2026-10-03T12:00:00Z');
	const threeWeeksAgo = new Date('2026-09-12T12:00:00Z');
	assert.equal(renewalStartDate(threeWeeksAgo, now).toISOString(), now.toISOString());
	assert.equal(renewalStartDate(null, now).toISOString(), now.toISOString());
	assert.equal(renewalStartDate(undefined, now).toISOString(), now.toISOString());
});

test('renewalStartDate returns a copy, not the stored date', () => {
	const now = new Date('2026-10-03T12:00:00Z');
	const end = new Date('2026-10-05T12:00:00Z');
	const start = renewalStartDate(end, now);
	start.setDate(start.getDate() + 7);
	assert.equal(end.toISOString(), '2026-10-05T12:00:00.000Z');
});

// Source guards: the webhook handlers and the service must use these tables, and no
// sponsor-ad handler may throw for metadata a retry cannot change.
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8');

test('the webhook sponsor handlers consult the lifecycle tables before acting', () => {
	const dispatch = source('../webhook-dispatch.ts');
	for (const name of ['sponsorAdRenewalDecision', 'sponsorAdCancellationDecision', 'sponsorAdActivationDecision']) {
		assert.ok(dispatch.includes(`${name}(existing?.status)`), `${name} is not consulted`);
	}
	assert.ok(!/metadata missing/.test(dispatch), 'a sponsor handler still throws for missing metadata');
});

test('the service renews and cancels by the same tables and never renews into the past', () => {
	const service = source('../../services/sponsor-ad.service.ts');
	assert.ok(service.includes('sponsorAdRenewalDecision(sponsorAd.status) !== "act"'));
	assert.ok(service.includes('sponsorAdCancellationDecision(sponsorAd.status) !== "act"'));
	assert.ok(service.includes('renewalStartDate(sponsorAd.endDate)'));
	assert.ok(!service.includes('sponsorAd.endDate || new Date()'));
});
