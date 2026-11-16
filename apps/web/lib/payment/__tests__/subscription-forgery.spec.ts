import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { IMMUTABLE_SUBSCRIPTION_FIELDS, omitImmutableSubscriptionFields } from '../subscription-identity';

// Review finding on the subscription routes: any signed-in user could insert a subscription row
// with any provider and provider id (POST /api/stripe/subscriptions), then PATCH
// /api/payment/[subscriptionId] passed its ownership lookup and cancelled the real customer's
// subscription at the provider. These specs cover the helper, and read the route sources the way
// the other wiring specs here do (the handlers need a database and a session to run).

const webRoot = join(__dirname, '..', '..', '..');
const read = (relative: string) => readFileSync(join(webRoot, relative), 'utf8');

/** Source of one exported handler, up to the next top-level `export` or the end of the file. */
function handlerSource(source: string, name: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'): string {
	const start = source.indexOf(`export async function ${name}(`);
	assert.notEqual(start, -1, `${name} handler not found`);
	const next = source.indexOf('\nexport ', start + 1);
	return source.slice(start, next === -1 ? undefined : next);
}

test('identity fields are removed from an update payload', () => {
	const cleaned = omitImmutableSubscriptionFields({
		userId: 'victim',
		paymentProvider: 'lemonsqueezy',
		subscriptionId: '1234567',
		customerId: 'cus_x',
		tenantId: 't',
		id: 'row',
		createdAt: '2020-01-01',
		planId: 'pro'
	});
	assert.deepEqual(cleaned, { planId: 'pro' });
});

test('ordinary update fields keep their value', () => {
	const input = { planId: 'pro', status: 'active', autoRenewal: false, cancelAtPeriodEnd: true, amount: 999 };
	assert.deepEqual(omitImmutableSubscriptionFields(input), input);
});

test('the input object is not modified', () => {
	const input = { userId: 'a', planId: 'pro' };
	omitImmutableSubscriptionFields(input);
	assert.deepEqual(input, { userId: 'a', planId: 'pro' });
});

test('non-object payloads give an empty update', () => {
	for (const bad of [null, undefined, 'x', 5, ['userId']]) {
		assert.deepEqual(omitImmutableSubscriptionFields(bad), {});
	}
});

test('the identity list covers owner, provider and provider ids', () => {
	for (const field of ['userId', 'paymentProvider', 'subscriptionId', 'customerId']) {
		assert.ok((IMMUTABLE_SUBSCRIPTION_FIELDS as readonly string[]).includes(field), field);
	}
});

test('POST /api/stripe/subscriptions checks for an admin before it reads the body or writes a row', () => {
	const post = handlerSource(read('app/api/stripe/subscriptions/route.ts'), 'POST');
	const guard = post.indexOf('requireAdminSession()');
	assert.ok(guard !== -1, 'POST must call requireAdminSession()');
	assert.ok(guard < post.indexOf('request.json()'), 'guard must run before the body is read');
	assert.ok(guard < post.indexOf('createSubscription('), 'guard must run before the row is written');
	assert.ok(!post.includes('await auth()'), 'POST must not fall back to a plain session check');
});

test('PUT /api/stripe/subscriptions strips identity fields before updating', () => {
	const put = handlerSource(read('app/api/stripe/subscriptions/route.ts'), 'PUT');
	assert.match(put, /updateSubscription\(\s*subscriptionId,\s*omitImmutableSubscriptionFields\(updateData\)\s*\)/);
});

test('updateSubscriptionBySubscriptionId matches on provider as well as id', () => {
	const source = read('lib/db/queries/subscription.queries.ts');
	const start = source.indexOf('export async function updateSubscriptionBySubscriptionId');
	assert.notEqual(start, -1);
	const body = source.slice(start, source.indexOf('\nexport ', start + 1));
	assert.match(body, /eq\(subscriptions\.paymentProvider, updateData\.paymentProvider\)/);
	assert.match(body, /eq\(subscriptions\.subscriptionId, updateData\.subscriptionId\)/);
});

test('the Stripe cancel and reactivate routes pass their provider to the update', () => {
	for (const route of ['cancel', 'reactivate']) {
		const source = read(`app/api/stripe/subscription/[subscriptionId]/${route}/route.ts`);
		const call = source.slice(source.indexOf('updateSubscriptionBySubscriptionId({'));
		assert.match(call.slice(0, 200), /paymentProvider: 'stripe'/, route);
	}
});

test('PATCH /api/payment/[subscriptionId] looks the row up by provider and id and checks the owner before any provider call', () => {
	const patch = handlerSource(read('app/api/payment/[subscriptionId]/route.ts'), 'PATCH');
	const lookup = patch.indexOf('getSubscriptionByProviderSubscriptionId(');
	const ownerCheck = patch.indexOf('subscription.userId !== session.user.id');
	const providerCall = patch.indexOf('.updateSubscription(');
	assert.ok(lookup !== -1 && ownerCheck !== -1 && providerCall !== -1);
	assert.ok(lookup < ownerCheck && ownerCheck < providerCall);
});
