import { test, expect } from '@playwright/test';

// UTM and tracking params should never crash listing pages.

const UTM_PROBES = [
	'/discover/1?utm_source=google&utm_medium=cpc&utm_campaign=launch',
	'/discover/1?gclid=GA1.2.123.456',
	'/discover/1?fbclid=IwAR_abc',
	'/discover/1?msclkid=abc',
	'/discover/1?yclid=123',
	'/discover/1?mc_eid=abc&mc_cid=def',
	'/discover/1?ref=newsletter&ref_source=email',
	'/about?utm_source=' + encodeURIComponent('NOT-REAL'),
	'/?gclid=' + 'a'.repeat(512)
];

test.describe('UTM / tracking param tolerance', () => {
	for (const path of UTM_PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
