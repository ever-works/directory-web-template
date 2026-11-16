import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

const EMAIL_CHECK = 'isEmailVerifiedForOwnership(session.user.id, session.user.email, loadEmailVerificationState)';

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
const ownCheck: Record<string, { why: string; check: string }> = {
	'api/stripe/subscription/[subscriptionId]/update/route.ts': {
		why: 'Stripe-scoped row + userId compare',
		check: 'userSubscription.userId !== session.user.id'
	},
	'api/polar/subscription/[subscriptionId]/cancel/route.ts': {
		why: 'Polar customer id compare',
		check: 'subscriptionCustomerId !== userPolarCustomerId'
	},
	'api/payment/[subscriptionId]/route.ts': {
		why: 'provider-scoped row + userId compare',
		check: 'subscription.userId !== session.user.id'
	},
	'api/stripe/subscriptions/route.ts': {
		why: 'local row by id + userId compare (no provider call)',
		check: 'subscription.userId !== session.user.id'
	}
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

	// LemonSqueezy matches by customer email, and credentials sign-up does not verify
	// the email, so the email must be verified (or OAuth-linked) before the lookup.
	for (const route of guarded.filter((r) => r.check === LEMONSQUEEZY_CHECK)) {
		it(`${route.name} requires a verified email before the owner lookup`, () => {
			const handler = handlerSource(route.file, route.method);
			const verifyAt = handler.indexOf(EMAIL_CHECK);
			assert.ok(verifyAt > 0, `${route.name} does not check that the email is verified`);
			assert.ok(
				verifyAt < handler.indexOf(route.check),
				`${route.name} looks up the owner before checking the email is verified`
			);
			assert.ok(
				/^[^;]*\)\)\) \{ return [^;]*?status: 403 \}/.test(handler.slice(verifyAt)),
				`${route.name} does not return 403 right after a failed email check`
			);
			assert.ok(
				!handler.slice(0, verifyAt).includes('getSubscriptionOwner('),
				`${route.name} reaches LemonSqueezy before the email check`
			);
		});
	}

	it('updateUser clears emailVerified when the address changes, so a verification never moves to a new address', () => {
		const source = squash(readFileSync(join(__dirname, '../../db/queries/user.queries.ts'), 'utf8'));
		const start = source.indexOf('export async function updateUser(');
		assert.ok(start >= 0, 'updateUser is missing');
		const body = source.slice(start, source.indexOf('export async function', start + 1));
		assert.ok(body.includes('emailVerified: null'), 'updateUser keeps emailVerified when the email changes');
		assert.ok(body.includes("inArray(accounts.type, ['oauth', 'oidc'])"), 'updateUser does not bind OAuth rows');
	});

	// An OAuth-only user's address counts as verified, so a password user must not be able
	// to delete their password row and become OAuth-only after linking their own account.
	it('the connected-accounts disconnect only deletes OAuth rows, never the password row', () => {
		const source = squash(read('api/auth/security/connected-accounts/[provider]/route.ts'));
		const start = source.indexOf('.delete(accounts)');
		assert.ok(start >= 0, 'the disconnect route no longer deletes from accounts');
		const statement = source.slice(start, source.indexOf('.returning(', start));
		assert.ok(
			statement.includes("inArray(accounts.type, ['oauth', 'oidc'])"),
			'the disconnect route can delete a credentials row'
		);
	});

	for (const [file, { why, check }] of Object.entries(ownCheck)) {
		it(`${file} keeps its own ownership check (${why})`, () => {
			assert.ok(
				existsSync(join(appDir, file)),
				`${file} is listed as checking ownership itself but no longer exists`
			);
			assert.ok(read(file).includes(check), `${file} no longer contains its ownership check: ${check}`);
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
