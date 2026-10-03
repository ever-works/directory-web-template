import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { reportNotificationFailure } from '../relay-fulfilment';
import { isSponsorAdObject, readSponsorAdId, sponsorAdInvoiceAction } from '../sponsor-ad-event';

// CC05-04 (billing audit 2026-09-28): a sponsor-ad INVOICE carries the subscription's
// metadata only in subscription_details / parent.subscription_details / its lines, so the
// dispatch never recognised a sponsor renewal and booked it as a plan purchase.

const SPONSOR = { type: 'sponsor_ad', sponsorAdId: 'ad_123', itemSlug: 'some-item' };

test('a subscription event is recognised by its own metadata', () => {
	const subscription = { id: 'sub_1', metadata: SPONSOR };
	assert.equal(isSponsorAdObject(subscription), true);
	assert.equal(readSponsorAdId(subscription), 'ad_123');
});

test('a Checkout Session is recognised by subscription_data.metadata', () => {
	const session = { id: 'cs_1', subscription_data: { metadata: SPONSOR } };
	assert.equal(isSponsorAdObject(session), true);
	assert.equal(readSponsorAdId(session), 'ad_123');
});

test('an invoice is recognised by parent.subscription_details.metadata (API 2025-03-31+)', () => {
	const invoice = {
		id: 'in_1',
		subscription: null,
		metadata: {},
		parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_1', metadata: SPONSOR } }
	};
	assert.equal(isSponsorAdObject(invoice), true);
	assert.equal(readSponsorAdId(invoice), 'ad_123');
});

test('an invoice is recognised by subscription_details.metadata (earlier API versions)', () => {
	// `subscription` is a bare id in a webhook - it is never expanded - so the old
	// `data.subscription.metadata` lookup could not see anything here.
	const invoice = { id: 'in_2', subscription: 'sub_1', metadata: {}, subscription_details: { metadata: SPONSOR } };
	assert.equal(isSponsorAdObject(invoice), true);
	assert.equal(readSponsorAdId(invoice), 'ad_123');
});

test('an invoice is recognised by a subscription line item metadata', () => {
	const invoice = { id: 'in_3', subscription: 'sub_1', lines: { data: [{ metadata: {} }, { metadata: SPONSOR }] } };
	assert.equal(isSponsorAdObject(invoice), true);
	assert.equal(readSponsorAdId(invoice), 'ad_123');
});

test('a plan subscription invoice is not a sponsor ad', () => {
	const invoice = {
		id: 'in_plan',
		subscription: 'sub_plan',
		metadata: {},
		parent: { subscription_details: { metadata: { userId: 'u1', planId: 'premium', work_id: 'w1' } } },
		lines: { data: [{ metadata: { work_id: 'w1' } }] }
	};
	assert.equal(isSponsorAdObject(invoice), false);
	assert.equal(readSponsorAdId(invoice), null);
});

test('malformed payloads are not sponsor ads and do not throw', () => {
	for (const value of [null, undefined, 'in_1', 42, {}, { lines: { data: 'x' } }, { parent: 'x' }]) {
		assert.equal(isSponsorAdObject(value), false);
		assert.equal(readSponsorAdId(value), null);
	}
});

test('only a cycle invoice renews a sponsor ad', () => {
	assert.equal(sponsorAdInvoiceAction({ billing_reason: 'subscription_cycle' }), 'renew');
	// The first invoice is activation's job (customer.subscription.created -> confirmPayment);
	// renewing on it would fail for an ad still pending payment or review and retry forever.
	assert.equal(sponsorAdInvoiceAction({ billing_reason: 'subscription_create' }), 'initial');
	assert.equal(sponsorAdInvoiceAction({ billing_reason: 'subscription_update' }), 'other');
	assert.equal(sponsorAdInvoiceAction({ billing_reason: 'manual' }), 'other');
	assert.equal(sponsorAdInvoiceAction({}), 'other');
	assert.equal(sponsorAdInvoiceAction(null), 'other');
});

// CC05-03: an email that cannot be sent must not fail the webhook, or the relay answers
// 502 and Stripe retries an already-fulfilled event for days.

test('a notification failure is logged and does not throw', () => {
	const original = console.error;
	const logged: unknown[] = [];
	console.error = (...args: unknown[]) => void logged.push(args.join(' '));
	try {
		const line = reportNotificationFailure('new subscription email', 'Email service not configured');
		assert.match(line, /new subscription email not sent \(Email service not configured\)/);
		assert.match(line, /still acknowledged/);
		assert.equal(logged.length, 1);
		assert.doesNotThrow(() => reportNotificationFailure('trial ending email', new Error('timeout')));
		assert.doesNotThrow(() => reportNotificationFailure('payment success email', undefined));
	} finally {
		console.error = original;
	}
});

test('no email step in the webhook dispatch is a retry signal any more', () => {
	const source = readFileSync(join(__dirname, '..', 'webhook-dispatch.ts'), 'utf8');
	// Every assertRelayFulfilment call, whatever its label: none may be about an email.
	const asserted = [...source.matchAll(/assertRelayFulfilment\(\s*[^,]+,\s*(['"`])([^'"`]*)\1/g)].map(
		(match) => match[2]
	);
	assert.ok(asserted.length >= 3, 'control: the sponsor-ad fulfilment asserts are still found');
	assert.deepEqual(
		asserted.filter((label) => /email/i.test(label)),
		[]
	);
	// And every email send that can fail is reported instead.
	const sends = source.match(/await paymentEmailService\.send\w+\(/g) ?? [];
	const reports = source.match(/reportNotificationFailure\(/g) ?? [];
	assert.ok(sends.length > 0, 'control: the email sends are still found');
	assert.equal(reports.length, sends.length);
});
