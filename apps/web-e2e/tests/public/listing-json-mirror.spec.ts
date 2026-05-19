import { test, expect } from '@playwright/test';

// Spec 020 / 021 added a JSON peer for the listing API (/items.json,
// per-listing JSON). Consumers depend on the items.json being stable
// shape regardless of filter inputs. This spec exercises a few filter
// shapes and asserts the response stays JSON.

test.describe('Listing JSON mirror under filter combinations', () => {
	const FILTER_PROBES = [
		'?q=test',
		'?sort=newest',
		'?sort=oldest',
		'?page=1&limit=3',
		'?category=zz-fake&q=other',
		'?tag=zz-fake',
		'?q=' + encodeURIComponent('a b c d e f')
	];

	for (const qs of FILTER_PROBES) {
		test(`/api/items.json${qs} returns JSON, no 5xx`, async ({ request }) => {
			const resp = await request.get(`/api/items.json${qs}`);
			expect(resp.status(), `${qs}`).toBeLessThan(500);
			if (resp.status() < 400) {
				const ct = resp.headers()['content-type'] ?? '';
				expect(ct.toLowerCase()).toContain('json');
				const body = await resp.json();
				expect(body).toBeTruthy();
			}
		});
	}

	test('/api/items.json with HEAD only is tolerated', async ({ request }) => {
		const resp = await request.fetch('/api/items.json', { method: 'HEAD' });
		// Some setups disallow HEAD; just no 5xx.
		expect(resp.status()).toBeLessThan(500);
	});
});
