import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { createLemonSqueezySubscriptionEvents } from '../lemonsqueezy-subscription-events';
import { createVerifiedEmailUserFinder } from '../lemonsqueezy-verified-email-user';
import { buildLemonSqueezyVariantCatalog } from '../lemonsqueezy-variant-plan';
import type { EmailVerificationState } from '../subscription-ownership';
import type { SubscriptionServiceInput } from '../lemonsqueezy-webhook';

/**
 * Spec 060 R14-R15: a purchase with no user id in its custom data is matched to a user by a
 * verified email (LemonSqueezy only), and a payment failure with no subscription row is
 * acknowledged instead of being redelivered until LemonSqueezy gives up.
 * Run with: `pnpm --filter @ever-works/web test:unit`.
 */

const STANDARD_VARIANT = 111;
const catalog = buildLemonSqueezyVariantCatalog({
	plans: [{ planId: 'standard', variantIds: [String(STANDARD_VARIANT)] }],
	sponsorAds: []
});

type Call = { method: string; data: SubscriptionServiceInput; options?: { createIfMissing?: boolean } };

function harness(options: {
	findUserIdByVerifiedEmail?: (email: string) => Promise<string | null>;
	paymentFailed?: (data: SubscriptionServiceInput) => Promise<{ success: boolean; error?: string }>;
}) {
	const calls: Call[] = [];
	const record =
		(method: string, result?: (data: SubscriptionServiceInput) => Promise<{ success: boolean; error?: string }>) =>
		async (data: SubscriptionServiceInput, opts?: { createIfMissing?: boolean }) => {
			calls.push({ method, data, options: opts });
			return result ? result(data) : { success: true };
		};
	const events = createLemonSqueezySubscriptionEvents({
		plans: {
			handleSubscriptionCreated: record('created'),
			handleSubscriptionUpdated: record('updated'),
			handleSubscriptionCancelled: record('cancelled'),
			handleSubscriptionPaymentSucceeded: record('paymentSucceeded'),
			handleSubscriptionPaymentFailed: record('paymentFailed', options.paymentFailed),
			handleSubscriptionTrialEnding: record('trialEnding')
		},
		sponsorAds: {} as never,
		loadVariantCatalog: async () => catalog,
		findUserIdByVerifiedEmail: options.findUserIdByVerifiedEmail,
		logger: { log() {}, warn() {}, error() {} },
		now: () => Date.parse('2026-01-15T00:00:00Z')
	});
	return { events, calls };
}

const subscription = (customData: Record<string, unknown>, email: unknown = 'Buyer@Example.com') => ({
	id: '42',
	type: 'subscriptions',
	attributes: {
		customer_id: 7,
		user_email: email,
		variant_id: STANDARD_VARIANT,
		status: 'active',
		cancelled: false,
		created_at: '2026-01-01T00:00:00Z',
		renews_at: '2026-02-01T00:00:00Z'
	},
	meta: { event_name: 'subscription_created', custom_data: customData }
});

const failedInvoice = (subscriptionId = '42') => ({
	id: '555',
	type: 'subscription-invoices',
	attributes: { subscription_id: Number(subscriptionId), billing_reason: 'renewal', status: 'failed', total: 1900 },
	meta: { event_name: 'subscription_payment_failed', custom_data: {} }
});

test('a purchase with no user id is stored for the user found by verified email', async () => {
	const seen: string[] = [];
	const { events, calls } = harness({
		findUserIdByVerifiedEmail: async (email) => {
			seen.push(email);
			return 'user_by_email';
		}
	});

	assert.equal(await events.created(subscription({})), true);
	assert.deepEqual(seen, ['Buyer@Example.com']);
	assert.equal(calls[0].method, 'created');
	assert.equal(calls[0].data.metadata.userId, 'user_by_email');
	assert.equal(calls[0].data.metadata.planId, 'standard');
});

test('an update that has to create the row gets the same email match', async () => {
	const { events, calls } = harness({ findUserIdByVerifiedEmail: async () => 'user_by_email' });
	await events.updated(subscription({}));
	assert.equal(calls[0].method, 'updated');
	assert.equal(calls[0].data.metadata.userId, 'user_by_email');
});

test('a user id in the custom data is kept and the email is not looked up', async () => {
	let lookups = 0;
	const { events, calls } = harness({
		findUserIdByVerifiedEmail: async () => {
			lookups += 1;
			return 'someone_else';
		}
	});
	await events.created(subscription({ userId: 'user_1' }));
	assert.equal(lookups, 0);
	assert.equal(calls[0].data.metadata.userId, 'user_1');
});

test('no verified user for the email leaves the event as it was', async () => {
	const { events, calls } = harness({ findUserIdByVerifiedEmail: async () => null });
	await events.created(subscription({}));
	assert.equal(calls[0].data.metadata.userId, undefined);
});

test('events without a usable email, or a lookup that fails, never match a user', async () => {
	let lookups = 0;
	const lookup = async () => {
		lookups += 1;
		return 'user_by_email';
	};
	const noEmail = harness({ findUserIdByVerifiedEmail: lookup });
	await noEmail.events.created(subscription({}, undefined));
	await noEmail.events.created(subscription({}, '   '));
	assert.equal(lookups, 0);
	assert.equal(noEmail.calls[0].data.metadata.userId, undefined);

	// A lookup that throws makes the event retry rather than writing a row for nobody.
	const failing = harness({
		findUserIdByVerifiedEmail: async () => {
			throw new Error('database unavailable');
		}
	});
	assert.equal(await failing.events.created(subscription({})), false);
	assert.deepEqual(failing.calls, []);
});

test('the email match does not touch invoices, cancellations or an unknown variant', async () => {
	let lookups = 0;
	const { events, calls } = harness({
		findUserIdByVerifiedEmail: async () => {
			lookups += 1;
			return 'user_by_email';
		}
	});
	await events.paymentSucceeded(failedInvoice());
	await events.cancelled(subscription({}));
	await events.created({ ...subscription({}), attributes: { ...subscription({}).attributes, variant_id: 999 } });
	assert.equal(lookups, 0);
	assert.ok(calls.every((call) => call.data.metadata.userId === undefined));
});

function finder(state: EmailVerificationState | null, byEmail: Record<string, { id: string }> = {}) {
	const asked: string[] = [];
	const find = createVerifiedEmailUserFinder({
		getUserByEmail: async (email) => {
			asked.push(email);
			return byEmail[email] ?? null;
		},
		loadVerificationState: async () => state
	});
	return { find, asked };
}

const user = { 'buyer@example.com': { id: 'user_1' } };
const stored = (extra: Partial<EmailVerificationState>): EmailVerificationState => ({
	email: 'buyer@example.com',
	emailVerified: null,
	oauthAccounts: [],
	hasPasswordSignIn: true,
	...extra
});

test('only a verified email, or a password-less OAuth user, is matched', async () => {
	assert.equal(await finder(stored({ emailVerified: new Date() }), user).find('buyer@example.com'), 'user_1');
	assert.equal(
		await finder(stored({ hasPasswordSignIn: false, oauthAccounts: [{ email: 'buyer@example.com' }] }), user).find(
			'buyer@example.com'
		),
		'user_1'
	);

	// Credentials sign-up does not prove the address: registering someone else's email first must not win their purchase.
	assert.equal(await finder(stored({}), user).find('buyer@example.com'), null);
	// A linked provider account does not prove the address of a user who signed up with a password.
	assert.equal(
		await finder(stored({ oauthAccounts: [{ email: 'buyer@example.com' }] }), user).find('buyer@example.com'),
		null
	);
	// An OAuth row bound to another address proves nothing about this one.
	assert.equal(
		await finder(stored({ hasPasswordSignIn: false, oauthAccounts: [{ email: 'other@example.com' }] }), user).find(
			'buyer@example.com'
		),
		null
	);
});

test('the email lookup is case-insensitive and ignores blank or unknown emails', async () => {
	const { find, asked } = finder(stored({ emailVerified: new Date() }), user);
	assert.equal(await find('Buyer@Example.com'), 'user_1');
	assert.deepEqual(asked, ['Buyer@Example.com', 'buyer@example.com']);
	assert.equal(await find('nobody@example.com'), null);
	assert.equal(await find('   '), null);
	assert.equal(await find(undefined), null);
});

test('a payment failure with no subscription row is acknowledged, not retried', async () => {
	const { events, calls } = harness({
		paymentFailed: async () => ({ success: true })
	});
	assert.equal(await events.paymentFailed(failedInvoice()), true);
	// The writer is told it may not create the row, so a missing one is not an error.
	assert.equal(calls[0].method, 'paymentFailed');
	assert.equal(calls[0].options?.createIfMissing, false);
});

test('a failed write on an existing subscription row still answers for a redelivery', async () => {
	const { events } = harness({
		paymentFailed: async () => ({ success: false, error: 'Failed to update subscription after payment failure' })
	});
	assert.equal(await events.paymentFailed(failedInvoice()), false);

	const throwing = harness({
		paymentFailed: async () => {
			throw new Error('database unavailable');
		}
	});
	assert.equal(await throwing.events.paymentFailed(failedInvoice()), false);
});

test('the shared service skips a missing row only when asked, so the other providers keep their behaviour', () => {
	const source = readFileSync(join(__dirname, '../../services/webhook-subscription.service.ts'), 'utf8').replace(
		/\s+/g,
		' '
	);
	const start = source.indexOf('async handleSubscriptionPaymentFailed(');
	const end = source.indexOf('async handlePaymentSucceeded(');
	assert.ok(start >= 0 && end > start);
	const body = source.slice(start, end);
	assert.ok(body.includes('!existingSubscription && options.createIfMissing === false'));
	assert.ok(
		body.indexOf('options.createIfMissing === false') < body.indexOf('Subscription not found:'),
		'the missing-row exit must come before the error'
	);
	assert.ok(body.includes('throw new Error(`Subscription not found: ${data.subscriptionId}`)'));

	// The email fallback is LemonSqueezy's: the shared service must not look a user up by email on its own.
	const created = source.slice(
		source.indexOf('async handleSubscriptionCreated('),
		source.indexOf('async handleSubscriptionUpdated(')
	);
	assert.ok(created.includes('userId: response.userId'), 'the shared service still writes the metadata user id');
});
