import { test, expect } from '@playwright/test';

// Verify that JSON and text endpoints announce sensible content-type and
// don't blow up on Accept-Encoding mismatches.

const JSON_PROBES = ['/api/items.json', '/api/tenant', '/api/version', '/api/featured-items'];

test.describe('Content-Type announcements on public APIs', () => {
	for (const path of JSON_PROBES) {
		test(`${path} returns JSON content-type`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status()).toBeLessThan(500);
			if (resp.status() < 400) {
				const ct = (resp.headers()['content-type'] || '').toLowerCase();
				expect(ct, `${path} content-type`).toContain('application/json');
			}
		});
	}
});

test.describe('Accept-Encoding tolerance', () => {
	test('GET / with no accept-encoding still responds', async ({ request }) => {
		const resp = await request.get('/', { headers: { 'accept-encoding': '' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with bogus accept-encoding is tolerated', async ({ request }) => {
		const resp = await request.get('/', { headers: { 'accept-encoding': 'frobnitz' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with extremely long accept header is tolerated', async ({ request }) => {
		const resp = await request.get('/', { headers: { accept: 'text/html, ' + 'application/json, '.repeat(200) } });
		expect(resp.status()).toBeLessThan(500);
	});
});
