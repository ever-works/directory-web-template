import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * Spec 060 R10: `POST /api/lemonsqueezy/checkout` takes only the variant and the dark-mode flag
 * from the client. The price is the variant's own and the custom data the webhook reads is set
 * from the session. The route imports `auth` (database, NextAuth) and cannot be loaded under
 * `tsx --test`, so its wiring is checked in the source. Run with: `pnpm --filter @ever-works/web test:unit`.
 */

const user = { id: 'user_1', email: 'me@example.com', name: 'Me' };
// Loaded per test so the source guard below still runs when the helper is missing.
const loadBuilder = async () => (await import('../lemonsqueezy-checkout-params')).buildLemonSqueezyCheckoutParams;

test('the checkout ignores a client customPrice, planId, type, sponsorAdId and metadata', async () => {
	const buildLemonSqueezyCheckoutParams = await loadBuilder();
	const params = buildLemonSqueezyCheckoutParams(user, {
		variantId: '111',
		dark: true,
		customPrice: 1,
		planId: 'premium',
		type: 'sponsor_ad',
		sponsorAdId: 'ad_1',
		metadata: {
			planId: 'premium',
			type: 'sponsor_ad',
			sponsorAdId: 'ad_1',
			userId: 'victim',
			email: 'v@example.com'
		}
	});

	assert.deepEqual(params, {
		email: 'me@example.com',
		variantId: 111,
		dark: true,
		metadata: { userId: 'user_1', email: 'me@example.com', name: 'Me' }
	});
	assert.ok(!('customPrice' in params), 'a client price must never reach LemonSqueezy');
});

test('the session, not the body, names the buyer', async () => {
	const buildLemonSqueezyCheckoutParams = await loadBuilder();
	const params = buildLemonSqueezyCheckoutParams({ id: 'user_2', email: 'two@example.com' }, { variantId: 5 });
	assert.deepEqual(params.metadata, { userId: 'user_2', email: 'two@example.com', name: undefined });
	assert.equal(params.dark, undefined);
});

const route = readFileSync(join(__dirname, '../../../app/api/lemonsqueezy/checkout/route.ts'), 'utf8').replace(
	/\s+/g,
	' '
);

test('the checkout route forwards no client price or metadata to LemonSqueezy', () => {
	assert.ok(!route.includes('...body.metadata'), 'POST still copies client metadata into the custom data');
	assert.ok(!route.includes('customPrice: body.customPrice'), 'POST still forwards a client customPrice');
	assert.ok(
		!route.includes('createCustomCheckout(validation.data!)'),
		'GET still forwards the query customPrice and metadata'
	);
	assert.ok(!route.includes('validation.data!.customPrice'), 'GET still echoes the query customPrice');
	assert.ok(
		route.includes('buildLemonSqueezyCheckoutParams(session.user, body)'),
		'POST must build its LemonSqueezy parameters from the session'
	);
});
