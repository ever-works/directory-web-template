import { test, expect } from '@playwright/test';

// Random cache-busting query params (analytics utm_*, fbclid, gclid, etc.)
// should NOT change page caching / rendering. Catches the class of "a
// random tracking param creates a new cache entry" misconfigurations.

const TRACKING_PARAMS = [
	'utm_source=test&utm_medium=email&utm_campaign=launch',
	'fbclid=fake-facebook-click-id',
	'gclid=fake-google-click-id',
	'ref=newsletter',
	'_=' + Date.now()
];

const PAGES_TO_PROBE = ['/', '/about', '/categories'];

test.describe('Tracking-param tolerance', () => {
	for (const page of PAGES_TO_PROBE) {
		for (const params of TRACKING_PARAMS) {
			test(`${page}?${params.slice(0, 30)} does not 5xx`, async ({ request }) => {
				const resp = await request.get(`${page}?${params}`);
				expect(resp.status(), `${page}?${params}`).toBeLessThan(500);
			});
		}
	}

	test('two different utm sources return SAME body length (cache-key stable)', async ({
		request
	}) => {
		const a = await request.get('/?utm_source=alpha');
		const b = await request.get('/?utm_source=beta');
		expect(a.status()).toBeLessThan(400);
		expect(b.status()).toBeLessThan(400);
		// Bodies should be nearly identical — small diffs allowed for any
		// nonce inputs. We use 5% tolerance.
		const aBody = await a.text();
		const bBody = await b.text();
		const sizeRatio = Math.abs(aBody.length - bBody.length) / aBody.length;
		expect(sizeRatio, 'body size delta between utm variants').toBeLessThan(0.05);
	});
});
