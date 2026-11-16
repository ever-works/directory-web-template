import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';

import { resolveListCustomerEmail } from '../lemonsqueezy-list-access';
import {
	getLemonSqueezyEventKey,
	parseLemonSqueezyEvent,
	toOrderEmailData,
	toSubscriptionServiceData,
	verifyLemonSqueezySignature
} from '../lemonsqueezy-webhook';

const SECRET = 'whsec_test_secret';
const sign = (body: string, secret = SECRET) => createHmac('sha256', secret).update(body, 'utf8').digest('hex');

// Deliberately uses spacing and key order JSON.stringify would not reproduce.
const RAW_BODY = `{
  "meta": {"event_name": "subscription_created", "custom_data": {"userId": "user_1", "planId": "premium"}},
  "data": {"type": "subscriptions", "id": "42", "attributes": {
    "customer_id": 7, "user_email": "buyer@example.com", "user_name": "Buyer", "variant_id": 99,
    "status": "active", "cancelled": false, "created_at": "2026-01-01T00:00:00.000000Z",
    "renews_at": "2026-02-01T00:00:00.000000Z", "ends_at": null, "trial_ends_at": null
  }}
}`;

test('a payload signed over the raw body verifies', () => {
	assert.equal(verifyLemonSqueezySignature(RAW_BODY, sign(RAW_BODY), SECRET), true);
});

test('the body is verified as received, so re-serialising it would not matter to the signer', () => {
	// The re-serialised text differs from the wire bytes, so verifying it fails...
	const reserialised = JSON.stringify(JSON.parse(RAW_BODY));
	assert.notEqual(reserialised, RAW_BODY);
	assert.equal(verifyLemonSqueezySignature(reserialised, sign(RAW_BODY), SECRET), false);
	// ...while the raw text still verifies and parses to the same event.
	assert.equal(verifyLemonSqueezySignature(RAW_BODY, sign(RAW_BODY), SECRET), true);
	assert.deepEqual(parseLemonSqueezyEvent(RAW_BODY)?.data.id, '42');
});

test('a tampered body fails verification', () => {
	const tampered = RAW_BODY.replace('buyer@example.com', 'attacker@example.com');
	assert.equal(verifyLemonSqueezySignature(tampered, sign(RAW_BODY), SECRET), false);
});

test('a wrong secret, missing, malformed or wrong-length signature fails', () => {
	assert.equal(verifyLemonSqueezySignature(RAW_BODY, sign(RAW_BODY, 'other'), SECRET), false);
	assert.equal(verifyLemonSqueezySignature(RAW_BODY, null, SECRET), false);
	assert.equal(verifyLemonSqueezySignature(RAW_BODY, '', SECRET), false);
	assert.equal(verifyLemonSqueezySignature(RAW_BODY, 'not-hex', SECRET), false);
	assert.equal(verifyLemonSqueezySignature(RAW_BODY, sign(RAW_BODY).slice(0, 62), SECRET), false);
});

test('an empty secret never verifies, even with a matching HMAC', () => {
	assert.equal(verifyLemonSqueezySignature(RAW_BODY, sign(RAW_BODY, ''), ''), false);
});

test('uppercase hex signatures are accepted', () => {
	assert.equal(verifyLemonSqueezySignature(RAW_BODY, sign(RAW_BODY).toUpperCase(), SECRET), true);
});

test('parseLemonSqueezyEvent rejects non-events', () => {
	assert.equal(parseLemonSqueezyEvent('not json'), null);
	assert.equal(parseLemonSqueezyEvent('{}'), null);
	assert.equal(parseLemonSqueezyEvent('{"meta":{"event_name":"x"},"data":{}}'), null);
});

test('the event key is stable per delivery and differs per body', () => {
	const event = parseLemonSqueezyEvent(RAW_BODY)!;
	const again = parseLemonSqueezyEvent(RAW_BODY)!;
	assert.equal(getLemonSqueezyEventKey(event, RAW_BODY), getLemonSqueezyEventKey(again, RAW_BODY));

	const changed = RAW_BODY.replace('"active"', '"paused"');
	assert.notEqual(getLemonSqueezyEventKey(event, RAW_BODY), getLemonSqueezyEventKey(parseLemonSqueezyEvent(changed)!, changed));
});

test('a subscription event maps id, customer, user, plan, status and dates', () => {
	const event = parseLemonSqueezyEvent(RAW_BODY)!;
	const mapped = toSubscriptionServiceData({ ...event.data, meta: event.meta });

	assert.equal(mapped.id, '42');
	assert.equal(mapped.customer, '7');
	assert.equal(mapped.customer_email, 'buyer@example.com');
	assert.equal(mapped.status, 'active');
	assert.equal(mapped.metadata.userId, 'user_1');
	assert.equal(mapped.metadata.planId, 'premium');
	assert.equal(mapped.period_end, Date.parse('2026-02-01T00:00:00Z') / 1000);
	assert.equal(mapped.start_date, Date.parse('2026-01-01T00:00:00Z') / 1000);
	assert.equal(mapped.cancel_at_period_end, false);
	assert.equal(mapped.items.data[0].price.id, '99');
});

test('a cancelled subscription ends at ends_at and is flagged cancel-at-period-end', () => {
	const mapped = toSubscriptionServiceData({
		id: '42',
		type: 'subscriptions',
		attributes: {
			status: 'cancelled',
			cancelled: true,
			ends_at: '2026-03-01T00:00:00.000000Z',
			renews_at: '2026-02-01T00:00:00.000000Z'
		}
	});
	assert.equal(mapped.status, 'cancelled');
	assert.equal(mapped.cancel_at_period_end, true);
	assert.equal(mapped.period_end, Date.parse('2026-03-01T00:00:00Z') / 1000);
});

test('an invoice event is keyed on its subscription and carries cents', () => {
	const mapped = toSubscriptionServiceData({
		id: '555',
		type: 'subscription-invoices',
		attributes: { subscription_id: 42, customer_id: 7, status: 'paid', total: 1999, currency: 'USD' }
	});
	assert.equal(mapped.id, '42');
	assert.equal(mapped.parent.subscription_details.subscription, '42');
	assert.equal(mapped.amount_paid, 1999);
	assert.equal(mapped.currency, 'usd');
});

test('an order maps to the email layout without dividing the total', () => {
	const mapped = toOrderEmailData({
		id: '9',
		type: 'orders',
		attributes: { total: 2500, currency: 'USD', user_name: 'Buyer', user_email: 'buyer@example.com' }
	});
	assert.equal(mapped.total, 2500);
	assert.deepEqual(mapped.customer, { name: 'Buyer', email: 'buyer@example.com' });
});

test('the list endpoint ignores no email and the caller\'s own email', () => {
	const session = { email: 'me@example.com', isAdmin: false };
	assert.deepEqual(resolveListCustomerEmail(session), { allowed: true, email: 'me@example.com' });
	assert.deepEqual(resolveListCustomerEmail(session, 'ME@example.com'), { allowed: true, email: 'me@example.com' });
});

test('the list endpoint refuses another customer\'s email for non-admins', () => {
	assert.deepEqual(resolveListCustomerEmail({ email: 'me@example.com' }, 'victim@example.com'), { allowed: false });
	assert.deepEqual(resolveListCustomerEmail({ email: 'me@example.com', isAdmin: false }, 'victim@example.com'), {
		allowed: false
	});
});

test('the list endpoint lets admins list another customer', () => {
	assert.deepEqual(resolveListCustomerEmail({ email: 'admin@example.com', isAdmin: true }, 'victim@example.com'), {
		allowed: true,
		email: 'victim@example.com'
	});
});
