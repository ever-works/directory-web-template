import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { requestsAnotherCustomer, resolveListCustomerEmail } from '../lemonsqueezy-list-access';
import { toStoredAmount } from '../stored-amount';
import { RelayEventCoordinator } from '../relay-event-coordinator';
import {
	getLemonSqueezyEventKey,
	isInitialSubscriptionInvoice,
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
	// The plan is the one the paid variant stands for (spec 060 R9), passed in by the caller.
	const mapped = toSubscriptionServiceData({ ...event.data, meta: event.meta }, Date.now(), 'standard');

	assert.equal(mapped.id, '42');
	assert.equal(mapped.customer, '7');
	assert.equal(mapped.customer_email, 'buyer@example.com');
	assert.equal(mapped.status, 'active');
	assert.equal(mapped.metadata.userId, 'user_1');
	assert.equal(mapped.metadata.planId, 'standard');
	assert.equal(mapped.period_end, Date.parse('2026-02-01T00:00:00Z') / 1000);
	assert.equal(mapped.start_date, Date.parse('2026-01-01T00:00:00Z') / 1000);
	assert.equal(mapped.cancel_at_period_end, false);
	assert.equal(mapped.items?.data[0]?.price.id, '99');
});

test('custom_data.planId never reaches the stored plan', () => {
	// The buyer controls the custom data (checkout links accept checkout[custom][planId]).
	const event = parseLemonSqueezyEvent(RAW_BODY)!;
	assert.equal(event.meta.custom_data?.planId, 'premium');

	const withoutPlan = toSubscriptionServiceData({ ...event.data, meta: event.meta });
	assert.equal(withoutPlan.metadata.planId, undefined);
	assert.equal(withoutPlan.metadata.userId, 'user_1');
});

const cancelledResource = {
	id: '42',
	type: 'subscriptions',
	attributes: {
		status: 'cancelled',
		cancelled: true,
		ends_at: '2026-03-01T00:00:00.000000Z',
		renews_at: '2026-02-01T00:00:00.000000Z'
	}
};

test('a cancelled subscription with paid time left stays active until ends_at', () => {
	const mapped = toSubscriptionServiceData(cancelledResource, Date.parse('2026-02-10T00:00:00Z'));
	assert.equal(mapped.status, 'active');
	assert.equal(mapped.cancel_at_period_end, true);
	assert.equal(mapped.period_end, Date.parse('2026-03-01T00:00:00Z') / 1000);
});

test('a cancelled subscription past ends_at stays cancelled', () => {
	const mapped = toSubscriptionServiceData(cancelledResource, Date.parse('2026-03-02T00:00:00Z'));
	assert.equal(mapped.status, 'cancelled');
	assert.equal(mapped.period_end, Date.parse('2026-03-01T00:00:00Z') / 1000);
});

test('an expired subscription keeps its status even if ends_at is still ahead of the clock', () => {
	const mapped = toSubscriptionServiceData(
		{ id: '42', type: 'subscriptions', attributes: { status: 'expired', cancelled: false, ends_at: '2026-03-01T00:00:00Z' } },
		Date.parse('2026-02-10T00:00:00Z')
	);
	assert.equal(mapped.status, 'expired');
});

test('stored amounts are whole numbers and never NaN', () => {
	assert.equal(toStoredAmount(1999), 20);
	assert.equal(toStoredAmount(2000), 20);
	assert.equal(toStoredAmount(0), 0);
	assert.equal(toStoredAmount(undefined), 0);
	assert.equal(toStoredAmount(Number.NaN), 0);
	assert.ok(Number.isInteger(toStoredAmount(1234)));
});

test('stored amounts use the currency minor unit, so zero-decimal currencies are not divided by 100', () => {
	assert.equal(toStoredAmount(1999, 'usd'), 20);
	assert.equal(toStoredAmount(1999, 'EUR'), 20);
	// JPY and KRW have no minor unit: the provider's 1500 is already 1500 yen.
	assert.equal(toStoredAmount(1500, 'jpy'), 1500);
	assert.equal(toStoredAmount(25000, 'KRW'), 25000);
	// A missing currency is read as USD, as before.
	assert.equal(toStoredAmount(1999, null), 20);
	assert.equal(toStoredAmount(1999, ''), 20);
	assert.equal(toStoredAmount(Number.NaN, 'jpy'), 0);
});

test('stored amounts follow the provider units, not the display list (IDR is two-decimal at Stripe)', () => {
	// Rp10,000 arrives as unit_amount 1000000.
	assert.equal(toStoredAmount(1000000, 'idr'), 10000);
	assert.equal(toStoredAmount(1000000, 'HUF'), 10000);
	// Three-decimal currencies arrive in thousandths.
	assert.equal(toStoredAmount(12500, 'kwd'), 13);
	assert.equal(toStoredAmount(5000, 'VND'), 5000);
	// UGX is zero-decimal at Stripe but still sent in hundredths: 5 UGX arrives as 500.
	assert.equal(toStoredAmount(500, 'ugx'), 5);
});

test('LemonSqueezy amounts are cents in every currency', () => {
	// A JPY 1500 invoice arrives as total 150000.
	assert.equal(toStoredAmount(150000, 'JPY', 'lemonsqueezy'), 1500);
	assert.equal(toStoredAmount(1999, 'usd', 'lemonsqueezy'), 20);
	assert.equal(toStoredAmount(1500, 'jpy', 'stripe'), 1500);
});

test('the subscription service passes the currency to every stored amount', () => {
	const source = readFileSync(join(__dirname, '../../services/webhook-subscription.service.ts'), 'utf8');
	const calls = source.match(/toStoredAmount\([^)]*\)/g) ?? [];
	assert.ok(calls.length >= 4, 'expected the amount, amount_due and amount_paid writes');
	for (const call of calls) {
		assert.match(call, /, (currency|response\.currency), this\.paymentProvider\)$/, `${call} drops the currency or provider`);
	}

	// An invoice carries the charged currency, which a LemonSqueezy subscription event never does.
	const start = source.indexOf('async handleSubscriptionPaymentSucceeded(');
	const body = source.slice(start, source.indexOf('async handleSubscriptionPaymentFailed(', start));
	assert.ok(body.includes('const currency = response.currency || existingSubscription.currency;'));
	assert.ok(/updateData = \{[^}]*\bcurrency,/.test(body), 'the payment success does not store the invoice currency');
});

test('an invoice event is keyed on its subscription and carries cents', () => {
	const mapped = toSubscriptionServiceData({
		id: '555',
		type: 'subscription-invoices',
		attributes: { subscription_id: 42, customer_id: 7, status: 'paid', total: 1999, currency: 'USD' }
	});
	assert.equal(mapped.id, '42');
	// The row's invoice id is the invoice's own id, not the subscription it is keyed on.
	assert.equal(mapped.invoice_id, '555');
	assert.equal(mapped.parent?.subscription_details.subscription, '42');
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

test('a delivery whose handler reports failure is not remembered and can be retried', async () => {
	const events = new RelayEventCoordinator();
	let attempts = 0;
	const key = 'subscription_created:42:hash';
	const handler = (ok: boolean) => async () => {
		attempts += 1;
		return ok;
	};

	assert.equal(await events.process(key, handler(false)), 'retry');
	assert.equal(await events.process(key, handler(true)), 'processed');
	assert.equal(await events.process(key, handler(true)), 'duplicate');
	assert.equal(attempts, 2);
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

test('requestsAnotherCustomer is true only for a different, non-blank email', () => {
	assert.equal(requestsAnotherCustomer('me@example.com'), false);
	assert.equal(requestsAnotherCustomer('me@example.com', ''), false);
	assert.equal(requestsAnotherCustomer('me@example.com', '  ME@Example.com '), false);
	assert.equal(requestsAnotherCustomer('me@example.com', 'victim@example.com'), true);
	assert.equal(requestsAnotherCustomer('me@example.com', 'me@example.com.evil'), true);
});

test('only the initial subscription invoice is treated as the first payment', () => {
	assert.equal(
		isInitialSubscriptionInvoice({ type: 'subscription-invoices', attributes: { billing_reason: 'initial' } }),
		true
	);
	assert.equal(
		isInitialSubscriptionInvoice({ type: 'subscription-invoices', attributes: { billing_reason: 'renewal' } }),
		false
	);
	assert.equal(isInitialSubscriptionInvoice({ type: 'subscriptions', attributes: { billing_reason: 'initial' } }), false);
	assert.equal(isInitialSubscriptionInvoice({ type: 'subscription-invoices', attributes: {} }), false);
});

// Source guards: the route functions are not exported, so check the wiring in the file.
const routeSource = (path: string) => readFileSync(join(__dirname, path), 'utf8');
const functionBody = (source: string, name: string) => {
	const start = source.indexOf(`async function ${name}(`);
	assert.ok(start >= 0, `${name} not found`);
	const next = source.indexOf('\nasync function ', start + 1);
	return source.slice(start, next < 0 ? undefined : next);
};

test('the webhook route takes plan and sponsor-ad decisions from the variant, not the custom data', () => {
	const route = routeSource('../../../app/api/lemonsqueezy/webhook/route.ts');
	assert.ok(
		route.includes('createLemonSqueezySubscriptionEvents({'),
		'subscription events must go through the variant-checked handlers'
	);
	assert.ok(route.includes('loadVariantCatalog: loadLemonSqueezyVariantCatalog'));
	assert.ok(!route.includes('isSponsorAdSubscription('), 'the route still classifies sponsor ads by custom data');
	assert.ok(!route.includes('toSubscriptionServiceData('), 'the route must not map plan rows on its own');
	for (const name of ['created', 'updated', 'cancelled', 'paymentSucceeded', 'paymentFailed', 'trialEnding']) {
		assert.ok(route.includes(`subscriptionEvents.${name}(data)`), `${name} is not wired`);
	}
	assert.ok(
		functionBody(route, 'dispatchEvent').includes('subscriptionEvents.created(data)'),
		'dispatchEvent must route subscription_created to the variant-checked handler'
	);
});

test('the list route resolves admin access with a live role lookup, not the JWT claim', () => {
	const route = routeSource('../../../app/api/lemonsqueezy/list/route.ts');
	assert.ok(!route.includes('session.user.isAdmin'), 'list route still trusts the JWT isAdmin claim');
	// The route hands the live role lookup to `resolveListAccess`, which calls it with the user id.
	assert.ok(/import \{ isAdmin \} from ["']@\/lib\/db\/roles["']/.test(route), 'list route does not import isAdmin');
	assert.ok(
		/decideListAccess\(user, customerEmail, \{\s*isAdmin,/.test(route),
		'list route does not pass the live isAdmin lookup'
	);
	const helper = routeSource('../lemonsqueezy-list-access.ts');
	assert.ok(helper.includes('await checks.isAdmin(user.id)'), 'resolveListAccess does not run the live admin lookup');
	const call = 'await resolveListAccess({ id: session.user.id, email: session.user.email }, customerEmail)';
	assert.equal(route.split(call).length - 1, 2, 'GET and POST must both use the live admin lookup');
	// LemonSqueezy is only ever asked for the email the access decision returned.
	for (const method of ['GET', 'POST']) {
		const start = route.indexOf(`export async function ${method}(`);
		const end = route.indexOf('export async function ', start + 1);
		const handler = route.slice(start, end < 0 ? undefined : end).replace(/\s+/g, ' ');
		assert.ok(
			/const filterOptions = \{[^}]*customerEmail: access\.email,/.test(handler),
			`${method} does not list by the decided email`
		);
	}
});
