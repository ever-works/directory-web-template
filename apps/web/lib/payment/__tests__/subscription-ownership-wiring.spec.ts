import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The cancel / reactivate / update routes import Next.js, auth and the database and
 * cannot be loaded under `tsx --test`, so these guards read the source instead. Each
 * handler must resolve the subscription through an ownership helper and return 404
 * before it calls a payment provider or writes to the database.
 */
const appDir = join(__dirname, '../../../app');
const read = (file: string) => readFileSync(join(appDir, file), 'utf8');
const squash = (text: string) =>
	text.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/,\)/g, ')');

/** The source of one exported handler, from its `export async function` to the next one. */
function handlerSource(file: string, method: string): string {
	const source = read(file);
	const start = source.indexOf(`export async function ${method}(`);
	assert.ok(start >= 0, `${file} has no ${method} handler`);
	const next = source.indexOf('export async function ', start + 1);
	return squash(source.slice(start, next === -1 ? undefined : next));
}

const STRIPE_CHECK =
	'findOwnedProviderSubscription(session.user.id, PaymentProvider.STRIPE, subscriptionId, getSubscriptionByProviderSubscriptionId)';
const LEMONSQUEEZY_CHECK =
	'findOwnedLemonSqueezySubscription(session.user.email, subscriptionId, (id) => lemonsqueezy.getSubscriptionOwner(id))';

type Guarded = {
	name: string;
	file: string;
	method: 'POST' | 'PUT' | 'DELETE';
	check: string;
	mutations: string[];
	/** Must also come after the 404, e.g. a development-mode early return. */
	alsoAfter?: string[];
	/** The handler validates its body with zod before the check. */
	validated?: boolean;
};

const guarded: Guarded[] = [
	{
		name: 'lemonsqueezy/cancel',
		file: 'api/lemonsqueezy/cancel/route.ts',
		method: 'POST',
		check: LEMONSQUEEZY_CHECK,
		mutations: ['lemonsqueezy.cancelSubscription('],
		validated: true
	},
	{
		name: 'lemonsqueezy/reactivate',
		file: 'api/lemonsqueezy/reactivate/route.ts',
		method: 'POST',
		check: LEMONSQUEEZY_CHECK,
		mutations: ['lemonsqueezy.updateSubscription('],
		validated: true
	},
	{
		name: 'lemonsqueezy/update-plan',
		file: 'api/lemonsqueezy/update-plan/route.ts',
		method: 'POST',
		check: LEMONSQUEEZY_CHECK,
		mutations: ['lemonsqueezy.updateSubscription('],
		validated: true
	},
	{
		name: 'lemonsqueezy/update',
		file: 'api/lemonsqueezy/update/route.ts',
		method: 'POST',
		check: LEMONSQUEEZY_CHECK,
		mutations: ['lemonsqueezy.updateSubscription('],
		alsoAfter: ["process.env.NODE_ENV === 'development'"],
		validated: true
	},
	{
		name: 'stripe/[subscriptionId]/cancel',
		file: 'api/stripe/subscription/[subscriptionId]/cancel/route.ts',
		method: 'POST',
		check: STRIPE_CHECK,
		mutations: ['stripeProvider.cancelSubscription(', 'updateSubscriptionBySubscriptionId({']
	},
	{
		name: 'stripe/[subscriptionId]/reactivate',
		file: 'api/stripe/subscription/[subscriptionId]/reactivate/route.ts',
		method: 'POST',
		check: STRIPE_CHECK,
		mutations: ['stripeProvider.updateSubscription(', 'updateSubscriptionBySubscriptionId({']
	},
	{
		name: 'PUT stripe/subscription',
		file: 'api/stripe/subscription/route.ts',
		method: 'PUT',
		check: STRIPE_CHECK,
		mutations: ['stripeProvider.updateSubscription(']
	},
	{
		name: 'DELETE stripe/subscription',
		file: 'api/stripe/subscription/route.ts',
		method: 'DELETE',
		check: STRIPE_CHECK,
		mutations: ['stripeProvider.cancelSubscription(']
	}
];

/**
 * Routes that change a subscription at a provider but check ownership their own way.
 * Adding a route here needs a reviewer to confirm its check.
 */
const ownCheck: Record<string, string> = {
	'api/stripe/subscription/[subscriptionId]/update/route.ts': 'Stripe-scoped row + userId compare',
	'api/polar/subscription/[subscriptionId]/cancel/route.ts': 'Polar customer id compare',
	'api/payment/[subscriptionId]/route.ts': 'provider-scoped row + userId compare',
	'api/stripe/subscriptions/route.ts': 'local row by id + userId compare (no provider call)'
};

describe('subscription ownership wiring', () => {
	for (const route of guarded) {
		describe(route.name, () => {
			const handler = handlerSource(route.file, route.method);
			const file = read(route.file);

			it('checks the owner with the provider-specific helper', () => {
				assert.ok(handler.includes(route.check), `${route.name} does not check the subscription owner`);
				assert.ok(
					/from ['"]@\/lib\/payment\/subscription-ownership['"]/.test(file),
					`${route.name} does not import the ownership helper`
				);
				assert.ok(
					!handler.includes('getSubscriptionByUserIdAndSubscriptionId'),
					`${route.name} looks the row up without the provider, so a row under another provider name passes`
				);
			});

			it('returns 404 right after the check, before any provider call or database write', () => {
				const checkAt = handler.indexOf(route.check);
				assert.ok(checkAt > 0, `${route.name} never calls the helper`);
				const rejection = /^[^;]*; if \(!\w+\) \{ return [^;]*?status: 404 \}/.exec(handler.slice(checkAt));
				assert.ok(rejection, `${route.name} does not return 404 right after the check`);
				const rejectedBy = checkAt + rejection[0].length;
				for (const later of [...route.mutations, ...(route.alsoAfter ?? [])]) {
					let at = handler.indexOf(later);
					assert.ok(at > 0, `${route.name}: ${later} not found`);
					while (at !== -1) {
						assert.ok(at > rejectedBy, `${route.name} reaches ${later} before rejecting a non-owner`);
						at = handler.indexOf(later, at + 1);
					}
				}
			});

			if (route.validated) {
				it('checks the owner after the request body is validated', () => {
					const parsedAt = handler.indexOf('.safeParse(');
					assert.ok(parsedAt > 0, `${route.name} lost body validation`);
					assert.ok(
						handler.indexOf(route.check) > parsedAt,
						`${route.name} checks the owner before validating`
					);
				});
			}
		});
	}

	it('the stripe reactivate route keeps its cancelAtPeriodEnd check', () => {
		const handler = handlerSource('api/stripe/subscription/[subscriptionId]/reactivate/route.ts', 'POST');
		assert.ok(handler.includes('!subscription.cancelAtPeriodEnd'), 'the cancelAtPeriodEnd check was dropped');
	});

	it('every route that cancels or updates a subscription is covered here', () => {
		const files: string[] = [];
		const walk = (dir: string) => {
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				const path = join(dir, entry.name);
				if (entry.isDirectory()) walk(path);
				else if (entry.name === 'route.ts') files.push(path);
			}
		};
		walk(join(appDir, 'api'));
		const covered = new Set([...guarded.map((route) => route.file), ...Object.keys(ownCheck)]);
		const missing = files
			.filter((path) => /\.(cancelSubscription|updateSubscription)\(/.test(readFileSync(path, 'utf8')))
			.map((path) => relative(appDir, path).split('\\').join('/'))
			.filter((file) => !covered.has(file));
		assert.deepEqual(missing, [], 'new subscription routes need an ownership check and an entry in this spec');
	});
});
