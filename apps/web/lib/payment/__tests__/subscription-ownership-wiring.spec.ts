import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The cancel / reactivate / update routes import Next.js, auth and the database and
 * cannot be loaded under `tsx --test`, so these guards read the source instead. Each
 * route must resolve the subscription through the owner-scoped lookup before it calls
 * a payment provider or writes to the database.
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

const routes: Array<{ name: string; file: string; mutations: string[] }> = [
	{
		name: 'lemonsqueezy/cancel',
		file: '../../../app/api/lemonsqueezy/cancel/route.ts',
		mutations: ['lemonsqueezy.cancelSubscription(']
	},
	{
		name: 'lemonsqueezy/reactivate',
		file: '../../../app/api/lemonsqueezy/reactivate/route.ts',
		mutations: ['lemonsqueezy.updateSubscription(']
	},
	{
		name: 'lemonsqueezy/update-plan',
		file: '../../../app/api/lemonsqueezy/update-plan/route.ts',
		mutations: ['lemonsqueezy.updateSubscription(']
	},
	{
		name: 'lemonsqueezy/update',
		file: '../../../app/api/lemonsqueezy/update/route.ts',
		mutations: ['lemonsqueezy.updateSubscription(']
	},
	{
		name: 'stripe/cancel',
		file: '../../../app/api/stripe/subscription/[subscriptionId]/cancel/route.ts',
		mutations: ['stripeProvider.cancelSubscription(', 'updateSubscriptionBySubscriptionId({']
	},
	{
		name: 'stripe/reactivate',
		file: '../../../app/api/stripe/subscription/[subscriptionId]/reactivate/route.ts',
		mutations: ['stripeProvider.updateSubscription(', 'updateSubscriptionBySubscriptionId({']
	}
];

describe('subscription ownership wiring', () => {
	for (const { name, file, mutations } of routes) {
		describe(name, () => {
			const route = source(file);

			it('resolves the subscription through the owner-scoped lookup', () => {
				const normalised = route.replace(/\(\s+/g, '(').replace(/,\s+/g, ', ');
				assert.ok(
					normalised.includes(
						'findOwnedSubscription(session.user.id, subscriptionId, getSubscriptionByUserIdAndSubscriptionId'
					),
					`${name} does not check the subscription owner`
				);
				assert.ok(
					route.includes("from '@/lib/payment/subscription-ownership'") ||
						route.includes('from "@/lib/payment/subscription-ownership"'),
					`${name} does not import the ownership helper`
				);
			});

			it('answers 404 when the lookup finds nothing', () => {
				assert.ok(route.includes('SUBSCRIPTION_NOT_FOUND_MESSAGE'), `${name} lost the not-found message`);
				assert.ok(route.includes('status: 404'), `${name} does not return 404`);
			});

			it('checks ownership before any provider call or database write', () => {
				const handlerAt = route.indexOf('export async function POST');
				const lookupAt = route.indexOf('findOwnedSubscription(', handlerAt);
				assert.ok(lookupAt > 0, `${name} never calls the helper`);
				// The lookup must be followed straight away by `if (!row) { return ... status: 404 }`.
				const rejection = /findOwnedSubscription\([^;]*\); if \(!\w+\) \{ return [^;]*?status: 404 \}/.exec(
					route.slice(lookupAt)
				);
				assert.ok(rejection && rejection.index === 0, `${name} does not return 404 right after the lookup`);
				const rejectedBy = lookupAt + rejection[0].length;
				// Every provider call and every DB write (not just the first) comes after the early return.
				for (const mutation of mutations) {
					let at = route.indexOf(mutation, handlerAt);
					assert.ok(at > 0, `${name}: ${mutation} not found`);
					while (at !== -1) {
						assert.ok(at > rejectedBy, `${name} reaches ${mutation} before rejecting a non-owner`);
						at = route.indexOf(mutation, at + 1);
					}
				}
			});

			it('checks ownership after the request body is validated', () => {
				const handlerAt = route.indexOf('export async function POST');
				const parsedAt = route.indexOf('.safeParse(', handlerAt);
				assert.ok(parsedAt > 0 || name.startsWith('stripe/'), `${name} lost body validation`);
				assert.ok(
					route.indexOf('findOwnedSubscription(', handlerAt) > parsedAt,
					`${name} checks ownership before validating the request`
				);
			});
		});
	}

	it('the stripe reactivate route no longer loads the row by provider id alone', () => {
		const route = source('../../../app/api/stripe/subscription/[subscriptionId]/reactivate/route.ts');
		assert.ok(!route.includes('getSubscriptionByProviderSubscriptionId'));
		assert.ok(route.includes('!subscription.cancelAtPeriodEnd'), 'the cancelAtPeriodEnd check was dropped');
	});
});
