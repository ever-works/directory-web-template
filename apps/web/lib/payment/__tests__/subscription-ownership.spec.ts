import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	findOwnedLemonSqueezySubscription,
	findOwnedProviderSubscription,
	isEmailVerifiedForOwnership,
	isOwnStripeSubscription,
	SUBSCRIPTION_NOT_FOUND_MESSAGE,
	type EmailVerificationState
} from '../subscription-ownership';

describe('isEmailVerifiedForOwnership', () => {
	const verifiedAt = new Date('2026-01-01T00:00:00Z');
	const users: Record<string, EmailVerificationState> = {
		credentialsUnverified: {
			email: 'a@example.com',
			emailVerified: null,
			oauthAccounts: [],
			hasPasswordSignIn: true
		},
		credentialsVerified: {
			email: 'b@example.com',
			emailVerified: verifiedAt,
			oauthAccounts: [],
			hasPasswordSignIn: true
		},
		oauth: {
			email: 'c@example.com',
			emailVerified: null,
			oauthAccounts: [{ email: 'c@example.com' }],
			hasPasswordSignIn: false
		},
		// Linked before links were bound to the address their provider proved (no email recorded).
		oauthLegacyLink: {
			email: 'c2@example.com',
			emailVerified: null,
			oauthAccounts: [{ email: null }, { email: '  ' }],
			hasPasswordSignIn: false
		},
		// OAuth-only user who changed their address to the victim's, then linked a second provider
		// account of their own: Auth.js links it whatever its address, and sign-in binds it to the
		// address that provider proved (or none, if that write failed).
		oauthSwitchedThenLinked: {
			email: 'victim@example.com',
			emailVerified: null,
			oauthAccounts: [{ email: 'attacker@example.com' }, { email: 'attacker@other.example' }, { email: null }],
			hasPasswordSignIn: false
		},
		oauthTwoLinks: {
			email: 'h@example.com',
			emailVerified: null,
			oauthAccounts: [{ email: 'old@example.com' }, { email: 'H@Example.com' }],
			hasPasswordSignIn: false
		},
		oauthBoundHere: {
			email: 'd@example.com',
			emailVerified: null,
			oauthAccounts: [{ email: 'D@Example.com' }],
			hasPasswordSignIn: false
		},
		// Verified or OAuth-linked under an earlier address, then switched to another one.
		oauthBoundElsewhere: {
			email: 'victim@example.com',
			emailVerified: null,
			oauthAccounts: [{ email: 'old@example.com' }],
			hasPasswordSignIn: false
		},
		// Not verified, no OAuth row: credentials-only, address never proven.
		noOAuth: { email: 'e@example.com', emailVerified: null, oauthAccounts: [], hasPasswordSignIn: true },
		// Signed up with a password under someone else's address, then (while signed in)
		// linked their OWN Google account: Auth.js links it whatever its address.
		passwordThenLinkedOAuth: {
			email: 'victim@example.com',
			emailVerified: null,
			oauthAccounts: [{ email: null }],
			hasPasswordSignIn: true
		},
		passwordThenLinkedOAuthVerified: {
			email: 'f@example.com',
			emailVerified: verifiedAt,
			oauthAccounts: [{ email: null }],
			hasPasswordSignIn: true
		}
	};
	const lookupCalls: string[] = [];
	const lookup = async (userId: string) => {
		lookupCalls.push(userId);
		return users[userId] ?? null;
	};
	const check = (userId: string | null | undefined, email: string | null | undefined) =>
		isEmailVerifiedForOwnership(userId, email, lookup);

	it('refuses a credentials user whose email is not verified', async () => {
		assert.equal(await check('credentialsUnverified', 'a@example.com'), false);
		assert.equal(await check('noOAuth', 'e@example.com'), false);
	});

	it('accepts a user with a verified email', async () => {
		assert.equal(await check('credentialsVerified', 'b@example.com'), true);
	});

	it('accepts a user with a linked OAuth account bound to this address even though emailVerified is null', async () => {
		assert.equal(await check('oauth', 'c@example.com'), true);
		assert.equal(await check('oauthBoundHere', 'd@example.com'), true);
		// One of several links is enough.
		assert.equal(await check('oauthTwoLinks', 'h@example.com'), true);
	});

	it('refuses an OAuth link with no recorded address (a legacy link, or a provider that proved none)', async () => {
		assert.equal(await check('oauthLegacyLink', 'c2@example.com'), false);
	});

	it('refuses the change-address-then-link flow: a new link vouches only for the address its provider proved', async () => {
		assert.equal(await check('oauthSwitchedThenLinked', 'victim@example.com'), false);
	});

	it('compares addresses ignoring case and surrounding spaces', async () => {
		assert.equal(await check('credentialsVerified', '  B@EXAMPLE.com '), true);
	});

	it('refuses when the address being matched is not the address stored on the user', async () => {
		// The session still carries the address from sign-in; the stored one has changed.
		assert.equal(await check('credentialsVerified', 'victim@example.com'), false);
		assert.equal(await check('oauth', 'victim@example.com'), false);
	});

	it('refuses the email-change flow: register with the victim address, switch to your own, verify it', async () => {
		// The attacker signed up with the victim's address (the session keeps it), called
		// updateAccount to store their own address, then verified that address.
		users.attackerSwitched = {
			email: 'attacker@example.com',
			emailVerified: verifiedAt,
			oauthAccounts: [],
			hasPasswordSignIn: true
		};
		// The address LemonSqueezy would match against is the victim's, from the session.
		assert.equal(await check('attackerSwitched', 'victim@example.com'), false);
		// Matching the attacker's own address is fine: it is verified and it is theirs.
		assert.equal(await check('attackerSwitched', 'attacker@example.com'), true);
	});

	it('refuses an OAuth row that was bound to a different address', async () => {
		assert.equal(await check('oauthBoundElsewhere', 'victim@example.com'), false);
	});

	it('refuses a password user whose only proof is an OAuth account they linked later', async () => {
		assert.equal(await check('passwordThenLinkedOAuth', 'victim@example.com'), false);
	});

	it('accepts a password user with a linked OAuth account once the address is verified', async () => {
		assert.equal(await check('passwordThenLinkedOAuthVerified', 'f@example.com'), true);
	});

	it('fails closed when the lookup does not say whether the user has a password', async () => {
		const state = { email: 'g@example.com', emailVerified: null, oauthAccounts: [{ email: null }] };
		const partial = async () => state as unknown as EmailVerificationState;
		assert.equal(await isEmailVerifiedForOwnership('partial', 'g@example.com', partial), false);
	});

	it('refuses an unknown user', async () => {
		assert.equal(await check('ghost', 'x@example.com'), false);
	});

	it('refuses a missing or blank user id or email without calling the lookup', async () => {
		lookupCalls.length = 0;
		for (const id of [undefined, null, '', '   ']) {
			assert.equal(await check(id, 'b@example.com'), false);
		}
		for (const email of [undefined, null, '', '   ']) {
			assert.equal(await check('credentialsVerified', email), false);
		}
		assert.deepEqual(lookupCalls, []);
	});
});

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

describe('isOwnStripeSubscription', () => {
	// `sub_NEW` was just created for the victim by POST /api/stripe/subscription; the webhook has not
	// written its row yet. Stripe bills it to the victim's own customer.
	const customers: Record<string, string> = { victim: 'cus_VICTIM', attacker: 'cus_ATTACKER' };
	const stripe: Record<string, string> = { sub_NEW: 'cus_VICTIM', sub_VICTIM: 'cus_VICTIM' };
	const stripeCalls: string[] = [];
	const lookups = {
		findRow: (id: string) => byProvider('stripe', id),
		findUserCustomerId: async (userId: string) => customers[userId] ?? null,
		fetchSubscriptionCustomerId: async (id: string) => {
			stripeCalls.push(id);
			return stripe[id] ?? null;
		}
	};

	it('lets the owner of the local row act, and nobody else, without asking Stripe', async () => {
		stripeCalls.length = 0;
		assert.equal(await isOwnStripeSubscription('victim', 'sub_VICTIM', lookups), true);
		assert.equal(await isOwnStripeSubscription('attacker', 'sub_VICTIM', lookups), false);
		assert.equal(await isOwnStripeSubscription('victim', 'sub_ATTACKER', lookups), false);
		assert.deepEqual(stripeCalls, []);
	});

	it("before the webhook writes the row, accepts the subscription Stripe bills to the user's own customer", async () => {
		assert.equal(await isOwnStripeSubscription('victim', 'sub_NEW', lookups), true);
		assert.equal(await isOwnStripeSubscription('attacker', 'sub_NEW', lookups), false);
	});

	it('refuses an id Stripe does not know, a user without a Stripe customer, or a malformed id', async () => {
		assert.equal(await isOwnStripeSubscription('victim', 'sub_UNKNOWN', lookups), false);
		assert.equal(await isOwnStripeSubscription('no_customer', 'sub_NEW', lookups), false);
		stripeCalls.length = 0;
		for (const id of ['', '   ', undefined, null, 42, 'sub_../../customers', 'cus_VICTIM']) {
			assert.equal(await isOwnStripeSubscription('victim', id, lookups), false);
		}
		assert.equal(await isOwnStripeSubscription(undefined, 'sub_NEW', lookups), false);
		assert.deepEqual(stripeCalls, []);
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
